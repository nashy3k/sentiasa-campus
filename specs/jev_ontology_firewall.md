# Architecture Blueprint: The Jev Ontology Firewall & Fail-Closed Gatekeeper
**Project:** SENTIASA (Campus Safety Intelligence Engine)  
**System Module:** `sentiasa/jev`  
**Architecture Pattern:** 5-Layer Semantic Stack & SHACL-Gated Routing  
**References:** 
- *The Civic Stack: Microsoft vs Palantir vs Google (The Missing Enforcement Layer)*
- *Pankaj Kumar: Ontology-RAG-Firewall & Fail-Closed Semantic Contracts*
- *W3C SHACL (Shapes Constraint Language) for Agentic State Gates*

---

## 1. Architectural Philosophy: The "Fail-Closed" Contract

> *"XSD guards document shape; OWL/SHACL guard meaning and graph constraints. Reinventing the habit XML had: write the check so a machine can fail closed."* — The Civic Stack

In SENTIASA, high-stakes safety decisions (threat escalations, campus patrol dispatches, entity flagging) must never rely on probabilistic LLM router discretion:
1. **Extraction is Probabilistic:** Nvidia Nemotron / Nebius parses unstructured Malay campus slang, OSINT feeds, and chatter.
2. **Reasoning is Grounded:** LangGraph coordinates multi-hop context retrieval.
3. **Execution is Deterministic:** `Jev` acts as an independent **Ontology Firewall**, intercepting all proposed state mutations and verifying them against formal domain constraints. If validation fails or conditions are uncertain, the system **fails closed** to a Human-in-the-Loop (HITL) review queue.

---

## 2. The 5-Layer Semantic Stack for SENTIASA

```
┌────────────────────────────────────────────────────────┐
│ Layer 5: Ontology Firewall & Veto Gates (Jev Engine)   │ <── Fail-Closed Runtime Guard
├────────────────────────────────────────────────────────┤
│ Layer 4: SHACL-Gated Rulebook (Domain Constraints)    │ <── Invariants & Precedence Rules
├────────────────────────────────────────────────────────┤
│ Layer 3: Cytoscape Graph State (Nodes & Edges)         │ <── Sensemaking & Investigation UI
├────────────────────────────────────────────────────────┤
│ Layer 2: Orchestration & Extraction (LangGraph/Nemotron│ <── Probabilistic Reasoners
├────────────────────────────────────────────────────────┤
│ Layer 1: Data Adapters & OSINT (Tavily, Feeds, Logs)   │ <── Raw Input Plane
└────────────────────────────────────────────────────────┘
```

---

## 3. Concrete Jev Implementation

### A. Semantic Shapes & Target Payload (`sentiasa/jev/shapes.py`)

```python
from enum import Enum
from datetime import datetime, timezone
from typing import Optional, List, Set
from pydantic import BaseModel, Field, field_validator

class ThreatTier(str, Enum):
    TIER_1_INFO = "INFO"
    TIER_2_MONITOR = "MONITOR"
    TIER_3_ELEVATED = "ELEVATED"
    TIER_4_CRITICAL = "CRITICAL"

class ActionVerb(str, Enum):
    LOG_TELEMETRY = "LOG_TELEMETRY"
    UPDATE_RELATIONSHIP = "UPDATE_RELATIONSHIP"
    ESCALATE_THREAT_TIER = "ESCALATE_THREAT_TIER"
    TRIGGER_CAMPUS_DISPATCH = "TRIGGER_CAMPUS_DISPATCH"
    BROADCAST_CAMPUS_ALERT = "BROADCAST_CAMPUS_ALERT"

class JevActionPayload(BaseModel):
    """Shape-constrained payload emitted by LangGraph agent."""
    action: ActionVerb
    incident_id: str
    current_tier: ThreatTier
    target_tier: ThreatTier
    actor_id: str
    target_entity_id: Optional[str] = None
    location_id: str
    evidence_ids: List[str] = Field(..., min_length=1)
    slang_ambiguity_score: float = Field(..., ge=0.0, le=1.0, description="0.0 = unambiguous, 1.0 = highly slang-ambiguous")
    event_timestamp: datetime
    policy_schema_version: str = "2026.09.v1"

    @field_validator("event_timestamp")
    def must_be_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("Timestamp must be timezone-aware (UTC).")
        return v
```

### B. The Jev Deterministic Firewall Engine (`sentiasa/jev/firewall.py`)

```python
from datetime import datetime, timezone
from typing import List, Dict, Any, Set
from .shapes import JevActionPayload, ThreatTier, ActionVerb

class SHACLViolation:
    def __init__(self, rule_id: str, focus_node: str, message: str, severity: str = "VIOLATION"):
        self.rule_id = rule_id
        self.focus_node = focus_node
        self.message = message
        self.severity = severity

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "focus_node": self.focus_node,
            "message": self.message,
            "severity": self.severity
        }

class JevOntologyFirewall:
    """Independent execution gatekeeper enforcing fail-closed invariants."""

    ALLOWED_TIER_STEP: Dict[ThreatTier, Set[ThreatTier]] = {
        ThreatTier.TIER_1_INFO: {ThreatTier.TIER_2_MONITOR, ThreatTier.TIER_3_ELEVATED},
        ThreatTier.TIER_2_MONITOR: {ThreatTier.TIER_3_ELEVATED, ThreatTier.TIER_4_CRITICAL},
        ThreatTier.TIER_3_ELEVATED: {ThreatTier.TIER_4_CRITICAL},
        ThreatTier.TIER_4_CRITICAL: set()
    }

    RESTRICTED_AUTONOMOUS_ACTIONS: Set[ActionVerb] = {
        ActionVerb.TRIGGER_CAMPUS_DISPATCH,
        ActionVerb.BROADCAST_CAMPUS_ALERT
    }

    @classmethod
    def evaluate_payload(
        cls,
        payload: JevActionPayload,
        active_graph_nodes: Set[str],
        now: Optional[datetime] = None
    ) -> List[SHACLViolation]:
        violations: List[SHACLViolation] = []
        current_time = now or datetime.now(timezone.utc)

        # Invariant 1: Fail-Closed on High-Stakes Autonomy
        if payload.action in cls.RESTRICTED_AUTONOMOUS_ACTIONS:
            violations.append(SHACLViolation(
                rule_id="SHACL-GOV-01",
                focus_node=payload.action.value,
                message=f"Action {payload.action} requires Dual-Approval Human Authorization. Autonomous execution blocked."
            ))

        # Invariant 2: Temporal Freshness & Clock Drift Check
        age_seconds = (current_time - payload.event_timestamp).total_seconds()
        if age_seconds > 1800:
            violations.append(SHACLViolation(
                rule_id="SHACL-TEMP-01",
                focus_node="event_timestamp",
                message=f"Temporal drift: Signal is {age_seconds:.1f}s old. Stale signals (>1800s) cannot auto-escalate."
            ))
        elif age_seconds < -30:
            violations.append(SHACLViolation(
                rule_id="SHACL-TEMP-02",
                focus_node="event_timestamp",
                message="Temporal invalidity: Event timestamp is in the future."
            ))

        # Invariant 3: State Machine Monotonicity
        if payload.target_tier != payload.current_tier:
            allowed = cls.ALLOWED_TIER_STEP.get(payload.current_tier, set())
            if payload.target_tier not in allowed:
                violations.append(SHACLViolation(
                    rule_id="SHACL-STATE-01",
                    focus_node=payload.incident_id,
                    message=f"Invalid state transition: Cannot transition from {payload.current_tier} to {payload.target_tier} directly."
                ))

        # Invariant 4: Slang Ambiguity Tripwire
        if payload.target_tier in {ThreatTier.TIER_3_ELEVATED, ThreatTier.TIER_4_CRITICAL}:
            if payload.slang_ambiguity_score > 0.20:
                violations.append(SHACLViolation(
                    rule_id="SHACL-SEM-01",
                    focus_node="slang_ambiguity_score",
                    message=f"High slang ambiguity ({payload.slang_ambiguity_score:.2f} > 0.20). Critical escalation prohibited without human verification."
                ))

        # Invariant 5: Relational Graph Grounding
        if payload.actor_id not in active_graph_nodes:
            violations.append(SHACLViolation(
                rule_id="SHACL-GRAPH-01",
                focus_node=payload.actor_id,
                message=f"Actor node '{payload.actor_id}' is not grounded in the current active graph topology."
            ))

        return violations
```

### C. LangGraph Interceptor Integration

```python
from typing import Dict, Any

def jev_validation_router(state: Dict[str, Any]) -> str:
    """Conditional router enforcing the Fail-Closed pattern in LangGraph."""
    payload: JevActionPayload = state["candidate_action"]
    active_nodes = state["cytoscape_active_node_ids"]

    violations = JevOntologyFirewall.evaluate_payload(payload, active_nodes)

    if not violations:
        return "commit_action_node"

    state["firewall_violations"] = [v.to_dict() for v in violations]
    return "hitl_review_lane"
```

---

## 4. AGY Subagent Tasks for Next Sprint

1. **Test-First SHACL Verification:**
   * Write unit tests in `tests/test_jev_firewall.py` for all 5 invariants.
   * Verify that any payload with `slang_ambiguity_score > 0.20` or stale timestamps fails closed.
2. **Cytoscape.js Event Binding:**
   * When an action is routed to `hitl_review_lane`, push a notification event to Cytoscape.js to highlight the unverified node with a yellow alert badge and list the exact `SHACL-` violation IDs in the sidebar.
