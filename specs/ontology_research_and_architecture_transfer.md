# Project SENTIASA: Ontology, Deterministic Action Gates & Architecture Spec

**Document Purpose:** Context transfer and operational specification for subagent bootstrapping (AGY framework) and Grok Bot specialization teams.  
**Domain:** Campus Safety Intelligence, Multi-Source Threat Triage, Slang-Aware OSINT Correlation.  
**Core Thesis:** *Grounding is not enforcement. Semantic correctness is not execution authority.*

---

## 1. Executive Summary & Problem Context

Project **SENTIASA** processes unstructured multi-source signals (campus chatter, reports, OSINT feeds, localized Malay campus slang) to triage threats and orchestrate responses using LangGraph, Nemotron/Nebius, Tavily, and Cytoscape.js.

### The Fundamental Failure Mode of Naive RAG / LLM Agents
* An LLM agent can retrieve the exact right institutional policy chunk or knowledge graph node and still **misattribute it to the wrong entity, the wrong relationship, or an invalid temporal point**.
* Adding more chunks or increasing prompt context increases noise; it does not introduce relational discipline.
* Giving an agent a semantic domain model (grounding) does **not** ensure its outgoing API/tool calls honor business rules (enforcement).

---

## 2. Theoretical Foundations: Palantir Ontology Triad & Research Grounding

### 2.1 The Palantir Ontology Paradigm (Nouns, Verbs, Invariants)
A complete operational ontology is not a passive knowledge graph or an ER diagram. It consists of three inseparable pillars:
1. **Nouns (Data / Objects):** Real-world entities representing state (`Student`, `Venue`, `ThreatReport`, `IncidentCluster`).
2. **Logic (Rules / Invariants):** Deterministic models, heuristic bounds, and constraints defining valid domain states (threat thresholds, temporal validity, disambiguation bounds).
3. **Verbs (Actions / Write-backs):** Explicit, closed-schema operations that alter system reality (`DISPATCH_SECURITY`, `ESCALATE_TIER`, `MERGE_INCIDENT`).

### 2.2 Academic & Industry Benchmarks

| System / Paper | Citation | Core Finding Applicable to SENTIASA |
| :--- | :--- | :--- |
| **OG-RAG** | `arXiv:2412.15235` | Uses domain ontologies to structure facts into hypergraphs; retrieves compact hyperedges rather than flat text. Reported +55% factual recall, +40% precision. |
| **OntologyRAG** | `arXiv:2502.18992` | Bridges code/concept mapping using graph proximity explanations. Updates flow directly through graph relationships without requiring model fine-tuning. |
| **OaK** | `arXiv:2608.22974` | Task-oriented dynamic ontology and KG construction for multi-step agent reasoning with judge feedback loops. |
| **SAT-Graph RAG** | `arXiv:2505.00039` | Decouples static legal works from versioned expressions; handles temporal legislative queries (*"Which rule applied on Date X?"*). |
| **Agent-OM** | `arXiv:2312.00326` | Multi-agent concept alignment and ontology matching across disparate domain schemas. |

---

## 3. High-Value Architecture Insights for SENTIASA

### A. Decision-First Modeling (Invert the Pipeline)
* **Standard RAG (Fragile):** Raw documents $\rightarrow$ Chunks/Embeddings $\rightarrow$ Vector search $\rightarrow$ Agent hallucination on action.
* **SENTIASA Ontology-First:** Identify critical safety decisions $\rightarrow$ Define required entities and predicates $\rightarrow$ Map raw ingest (slang/OSINT) into typed triples $\rightarrow$ Run deterministic action checks.

### B. Bi-Temporal Validity & Audit Liability
* **Two Timestamps for Every Node/Edge:**
  * `event_timestamp`: When the physical or social event happened.
  * `policy_version_id` / `definition_timestamp`: The active version of system rules when the decision was executed.
* **Audit Integrity:** Definitions change (e.g., what threshold constitutes "imminent physical threat" vs. "harassment"). If definitions change without temporal bounds, historical audits re-evaluate past actions under new definitions, corrupting liability trails.

### C. Triples over Embeddings
* Vector search risks blending bystander entities with perpetrators if they share a chunk.
* Extraction must force explicit triple generation: `[Actor] --(COMMUNICATES_THREAT)--> [Target]` at `[Location]` bounded by `[Timestamp]`.

### D. The Linus Torvalds Data Architecture (4-Layer Separation)
*"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."* — Linus Torvalds

To avoid state pollution, legal non-compliance, and graph leakage, the data model is strictly decoupled into 4 orthogonal layers:
1. **Layer 1: Ingest Provenance & Forensic Envelope (`IngestProvenanceEnvelope`):**
   - Transformed under Malaysian Evidence Act 1950 (Section 90A) and CMA 1998 (Section 233/249).
   - Captures: `client_device_type`, `user_agent`, `channel` (WhatsApp/Web/OSINT), `salted_ip_hash` (PDPA compliant), `payload_sha256`, and `server_ingest_timestamp`.
   - **Isolation Rule:** Stays in private backend audit logs; NEVER projected onto the public Cytoscape graph canvas.
2. **Layer 2: Domain Entities / Nouns (`backend/state.py`):**
   - Typed semantic nodes: `SchoolNode`, `PersonaNode`, `ThreatEventNode`.
3. **Layer 3: Relational Hyperedges (`RelationalTriple`):**
   - Bi-temporally anchored hyperedges: `(Subject) --[Predicate]--> (Object)` projected into Cytoscape.js.
4. **Layer 4: Invariant Action Contracts (`JevActionPayload` / `IncidentActionContract`):**
   - Candidate state mutations evaluated deterministically by Jev before committing to real-world alerts or database writes.

---

## 4. Jev Implementation Blueprint: The Type-Safe Gatekeeper

`Jev` sits between the **LangGraph Reasoning Node** (probabilistic) and the **Tool Execution Node** (deterministic), acting as Palantir's "Logic & Action" runtime barrier.

```
+-------------------------------------------------------------+
|               LangGraph Orchestration Pipeline              |
|                                                             |
|  [Ingest: Slang/OSINT]                                      |
|            |                                                |
|            v                                                |
|  [Reasoning Node: Nemotron Extraction]                      |
|  -> Emits: Candidate Action Payload                         |
|            |                                                |
|            v                                                |
|  +-------------------------------------------------------+  |
|  |           JEV GATEKEEPER (Deterministic Veto)         |  |
|  | - Bi-temporal check (signal staleness vs current time)|  |
|  | - Finite state machine transition check               |  |
|  | - Confidence & disambiguation tripwire                |  |
|  | - Entity existence verification                       |  |
|  +-------------------------------------------------------+  |
|            |                               |                |
|       (PASSED)                         (FAILED)             |
|            |                               |                |
|            v                               v                |
|  [Tool Execution Node]         [Human Review Queue (HITL)]  |
|  - Write to Cytoscape.js       - Logged with Veto Reason    |
|  - Dispatch Webhooks           - Alert Incident Commander   |
+-------------------------------------------------------------+
```

### Reference Implementation Contract (`jev_contracts.py`)

```python
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ThreatTier(str, Enum):
    TIER_1_LOW = "LOW"
    TIER_2_ELEVATED = "ELEVATED"
    TIER_3_CRITICAL = "CRITICAL"


class ActionType(str, Enum):
    ESCALATE_TIER = "ESCALATE_TIER"
    DISPATCH_SECURITY = "DISPATCH_SECURITY"
    RESOLVE_INCIDENT = "RESOLVE_INCIDENT"
    REQUEST_HITL = "REQUEST_HITL"


class IncidentActionContract(BaseModel):
    action: ActionType
    incident_id: str
    target_tier: ThreatTier
    current_tier: ThreatTier
    actor_id: str
    target_entity_id: Optional[str] = None
    location_id: str
    semantic_confidence: float = Field(..., ge=0.0, le=1.0)
    source_timestamp: datetime
    policy_version: str = "2026.09.v1"


class JevVetoException(Exception):
    """Raised when Jev blocks an unauthorized or invalid agent action."""
    pass


class JevGatekeeper:
    ALLOWED_TRANSITIONS = {
        ThreatTier.TIER_1_LOW: [ThreatTier.TIER_2_ELEVATED],
        ThreatTier.TIER_2_ELEVATED: [ThreatTier.TIER_3_CRITICAL, ThreatTier.TIER_1_LOW],
        ThreatTier.TIER_3_CRITICAL: [ThreatTier.TIER_2_ELEVATED],
    }

    @classmethod
    def evaluate(cls, contract: IncidentActionContract, current_time: Optional[datetime] = None) -> bool:
        now = current_time or datetime.now(timezone.utc)

        # 1. Temporal Boundary Check (Reject stale signals > 2 hrs or future timestamps)
        age_seconds = (now - contract.source_timestamp).total_seconds()
        if age_seconds < -30:
            raise JevVetoException(f"Future timestamp anomaly: {age_seconds}s ahead of clock.")
        if age_seconds > 7200:
            raise JevVetoException(f"Stale signal: {age_seconds}s old. Requires manual triage.")

        # 2. Strict State-Machine Transition Check
        allowed = cls.ALLOWED_TRANSITIONS.get(contract.current_tier, [])
        if contract.target_tier != contract.current_tier and contract.target_tier not in allowed:
            raise JevVetoException(
                f"Illegal state jump: Cannot move from {contract.current_tier} directly to {contract.target_tier}."
            )

        # 3. Confidence Floor for Autonomous Critical Escalation
        if contract.target_tier == ThreatTier.TIER_3_CRITICAL and contract.semantic_confidence < 0.88:
            raise JevVetoException(
                f"Insufficient confidence ({contract.semantic_confidence:.2f} < 0.88) for automated Tier 3 escalation."
            )

        return True
```

---

## 5. Subagent & Team Prompting Blueprints

### 5.1 AGY Subagent Specification: `ontology_architect`

```yaml
subagent_name: ontology_architect
role: SENTIASA Domain Model & Deterministic Invariant Engineer
responsibilities:
  - Design and update typed entity schemas (Nouns) for campus safety.
  - Define state transition constraints, temporal rules, and veto gates (Logic) for Jev.
  - Specify deterministic write-back tool contracts (Verbs) consumed by LangGraph.
  - Review all LLM prompt chains to ensure output format strictly maps to Jev action contracts.
key_mandates:
  - "Never let an LLM execute a state mutation without a typed Pydantic/Jev contract."
  - "Treat temporal validity as a state-boundary check, never as vector similarity."
  - "Decouple domain definition from reasoning models."
```

### 5.2 Grok Bot Team Persona: `SENTIASA-Ontologist`

```markdown
**System Persona:** You are SENTIASA-Ontologist, senior enterprise AI architect specializing in neuro-symbolic AI and Palantir-style operational ontologies.

**Mission:** You ensure that SENTIASA's campus intelligence engine bridges statistical reasoning (LLMs/Nemotron) and deterministic governance (`Jev`).

**Core Operating Directives:**
1. Grounding $\neq$ Enforcement: When discussing RAG or graph extraction, always separate how knowledge is retrieved from how actions are validated and committed.
2. Nouns, Verbs, Invariants: Frame every safety workflow around entities, permissible write-backs, and explicit transition rules.
3. Challenge all naive vector solutions: When team members suggest "adding more context chunks" for disambiguation or temporal rules, advocate for explicit relational schemas, hypergraphs, and runtime veto gates.
```