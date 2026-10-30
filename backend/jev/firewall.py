"""
Jev Deterministic Ontology Firewall Engine for Project SENTIASA.
Enforces fail-closed SHACL-style domain invariants and governance gates:
- SHACL-GOV-01: Restricted Autonomous Actions (Dual-Approval Sign-off required)
- SHACL-TEMP-01: Stale Signal Check (> 1800s policy limit)
- SHACL-TEMP-02: Future Clock Skew Anomaly (< -30s)
- SHACL-STATE-01: State Machine Monotonicity (Legal tier transitions)
- SHACL-SEM-01: Slang Ambiguity Tripwire (Ambiguity > 0.20 blocks automated escalation)
- SHACL-GRAPH-01: Relational Graph Grounding against active Cytoscape topology
- SHACL-ANON-01: Unilateral Anonymous Escalation Gate
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from .shapes import ActionVerb, JevActionPayload, PolicyThresholdConfig, ThreatTier


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
            "severity": self.severity,
        }

    def __repr__(self) -> str:
        return f"<SHACLViolation [{self.rule_id}] focus={self.focus_node}: {self.message}>"


class JevOntologyFirewall:
    """
    Independent execution gatekeeper enforcing fail-closed invariants
    between probabilistic LLM extraction and deterministic tool execution.
    """

    ALLOWED_TIER_STEP: Dict[ThreatTier, Set[ThreatTier]] = {
        ThreatTier.TIER_1_INFO: {ThreatTier.TIER_2_MONITOR, ThreatTier.TIER_3_ELEVATED},
        ThreatTier.TIER_2_MONITOR: {ThreatTier.TIER_3_ELEVATED, ThreatTier.TIER_4_CRITICAL},
        ThreatTier.TIER_3_ELEVATED: {ThreatTier.TIER_4_CRITICAL},
        ThreatTier.TIER_4_CRITICAL: set(),
    }

    RESTRICTED_AUTONOMOUS_ACTIONS: Set[ActionVerb] = {
        ActionVerb.TRIGGER_CAMPUS_DISPATCH,
        ActionVerb.BROADCAST_CAMPUS_ALERT,
    }

    CONFIDENCE_FLOOR_CRITICAL = 0.88

    @classmethod
    def evaluate_payload(
        cls,
        payload: JevActionPayload,
        active_graph_nodes: Set[str],
        now: Optional[datetime] = None,
        counselor_approved: bool = False,
        policy: Optional[PolicyThresholdConfig] = None,
    ) -> List[SHACLViolation]:
        """
        Evaluates a candidate JevActionPayload against all SHACL invariants and blast-radius governance.
        Returns a list of SHACLViolation instances. If empty, the payload passed all checks.
        Southbridge Rule 04: Supports optional PolicyThresholdConfig for decoupled policy evaluation.
        """
        violations: List[SHACLViolation] = []
        current_time = now or datetime.now(timezone.utc)
        critical_floor = policy.critical_floor if policy else cls.CONFIDENCE_FLOOR_CRITICAL
        max_ambiguity = policy.max_slang_ambiguity if policy else 0.20

        # Invariant 1: Fail-Closed on High-Stakes Autonomy & Critical Write Actions (SHACL-GOV-01)
        # Any candidate action proposing a critical/high-stakes write action (TIER_4_CRITICAL,
        # TRIGGER_CAMPUS_DISPATCH, or BROADCAST_CAMPUS_ALERT) MUST be flagged with SHACL-GOV-01
        # and routed strictly to HITL review queue by default, unless counselor sign-off is present.
        is_restricted_action = payload.action in cls.RESTRICTED_AUTONOMOUS_ACTIONS
        is_critical_tier = payload.target_tier == ThreatTier.TIER_4_CRITICAL

        if (is_restricted_action or is_critical_tier) and not counselor_approved:
            focus_target = payload.action.value if is_restricted_action else payload.target_tier.value
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-GOV-01",
                    focus_node=focus_target,
                    message=(
                        f"Action or target tier '{focus_target}' proposes critical/high-stakes autonomy. "
                        f"Requires Dual-Approval Human Authorization (SHACL-GOV-01). Autonomous execution blocked."
                    ),
                )
            )

        # Invariant 2: Temporal Freshness & Clock Drift Check (SHACL-TEMP-01 & 02)
        event_ts = payload.event_timestamp
        if event_ts.tzinfo is None:
            event_ts = event_ts.replace(tzinfo=timezone.utc)

        age_seconds = (current_time - event_ts).total_seconds()
        if age_seconds > 1800:
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-TEMP-01",
                    focus_node="event_timestamp",
                    message=f"Temporal drift: Signal is {age_seconds:.1f}s old. Stale signals (>1800s) cannot auto-escalate.",
                )
            )
        elif age_seconds < -30:
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-TEMP-02",
                    focus_node="event_timestamp",
                    message="Temporal invalidity: Event timestamp is in the future.",
                )
            )

        # Invariant 3: State Machine Monotonicity (SHACL-STATE-01)
        if payload.target_tier != payload.current_tier:
            allowed = cls.ALLOWED_TIER_STEP.get(payload.current_tier, set())
            if payload.target_tier not in allowed:
                # Check for emergency bypass (SHACL-EMERGENCY-BYPASS-01)
                has_threat_obj = getattr(payload, "has_threat_object", False)
                vis_sev = getattr(payload, "visual_severity_tier", None)
                vis_conf = getattr(payload, "visual_confidence", None)
                is_emergency_bypass = (
                    payload.target_tier == ThreatTier.TIER_4_CRITICAL
                    and (has_threat_obj or (vis_sev is not None and vis_sev >= 4))
                    and (vis_conf is not None and vis_conf >= 0.90)
                )
                if not is_emergency_bypass:
                    violations.append(
                        SHACLViolation(
                            rule_id="SHACL-STATE-01",
                            focus_node=payload.incident_id,
                            message=f"Invalid state transition: Cannot transition from {payload.current_tier} to {payload.target_tier} directly.",
                        )
                    )

        # Invariant 4: Slang Ambiguity Tripwire (SHACL-SEM-01)
        if payload.target_tier in {ThreatTier.TIER_3_ELEVATED, ThreatTier.TIER_4_CRITICAL}:
            if payload.slang_ambiguity_score > max_ambiguity:
                violations.append(
                    SHACLViolation(
                        rule_id="SHACL-SEM-01",
                        focus_node="slang_ambiguity_score",
                        message=f"High slang ambiguity ({payload.slang_ambiguity_score:.2f} > {max_ambiguity:.2f}). Critical escalation prohibited without human verification.",
                    )
                )

        # Invariant 5: Relational Graph Grounding (SHACL-GRAPH-01)
        if active_graph_nodes and payload.actor_id not in active_graph_nodes:
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-GRAPH-01",
                    focus_node=payload.actor_id,
                    message=f"Actor node '{payload.actor_id}' is not grounded in the current active graph topology.",
                )
            )

        # Invariant 6: Anonymous Whistleblower Unilateral Escalation Rule (SHACL-ANON-01)
        if payload.is_anonymous_reporter and payload.target_tier == ThreatTier.TIER_4_CRITICAL:
            if not payload.osint_corroborated:
                violations.append(
                    SHACLViolation(
                        rule_id="SHACL-ANON-01",
                        focus_node=payload.actor_id,
                        message="Anonymous report cannot unilaterally trigger CRITICAL actions without OSINT/Tavily corroboration or human verification.",
                    )
                )

        # Invariant 7: Confidence Floor for Automated Critical Escalation (SHACL-CONF-01)
        if payload.target_tier == ThreatTier.TIER_4_CRITICAL and payload.semantic_confidence < critical_floor:
            violations.append(
                SHACLViolation(
                    rule_id="LOW_CONFIDENCE_TRIPWIRE",
                    focus_node="semantic_confidence",
                    message=(
                        f"Insufficient confidence ({payload.semantic_confidence:.2f} < {critical_floor:.2f}) "
                        f"for Tier 4 Critical escalation."
                    ),
                )
            )

        # Invariant 8: Sovereign GEOINT Perimeter Boundary Rule (SHACL-SPATIAL-01)
        # Off-campus incidents cannot trigger on-campus internal room lockdowns; they require external PDRM liaison.
        if payload.is_off_campus and payload.action == ActionVerb.TRIGGER_CAMPUS_DISPATCH:
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-SPATIAL-01",
                    focus_node=payload.location_id,
                    message=(
                        "Incident coordinates fall outside official campus perimeter (OFF_CAMPUS_PERIMETER). "
                        "Autonomous internal campus dispatch blocked; route to PDRM Community Liaison & External Gate Patrol."
                    ),
                )
            )

        # Invariant 9: Dormitory Blind-Spot Curfew Invariant (SHACL-BIM-01)
        # Hostel incidents during curfew (22:30-05:00) cannot be downgraded or dismissed as low-risk info.
        if payload.is_curfew_violation and payload.target_tier == ThreatTier.TIER_1_INFO:
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-BIM-01",
                    focus_node=payload.location_id,
                    message=(
                        "Residential hostel incident reported during curfew hours (22:30-05:00) "
                        "cannot be triaged as TIER_1_INFO. Must escalate to residential warden review."
                    ),
                )
            )

        # Invariant 10: Guardrailed Escalation Reviewer (SHACL-REV-01 / Southbridge Rule 06)
        # Prevents a fallback reviewer or text summary from overruling high-confidence verified
        # physical weapon or assault detections unless human counselor sign-off is provided.
        is_reviewer_overrule = getattr(payload, "is_reviewer_override", False)
        has_verified_physical = getattr(payload, "has_threat_object", False) or (
            (getattr(payload, "visual_severity_tier", None) or 1) >= 4
            and (getattr(payload, "visual_confidence", None) or 0.0) >= 0.90
        )
        if is_reviewer_overrule and has_verified_physical and not counselor_approved:
            violations.append(
                SHACLViolation(
                    rule_id="SHACL-REV-01",
                    focus_node=payload.incident_id,
                    message=(
                        "Fallback reviewer or text summary cannot unilaterally overrule verified physical weapon/assault detection "
                        "without human counselor sign-off (SHACL-REV-01 / Southbridge Rule 06)."
                    ),
                )
            )

        return violations

    @classmethod
    def evaluate(
        cls,
        candidate: Any,
        active_graph_nodes: Optional[Set[str]] = None,
        now: Optional[datetime] = None,
        counselor_approved: bool = False,
        policy: Optional[PolicyThresholdConfig] = None,
    ) -> Dict[str, Any]:
        """
        Unified evaluation endpoint for JevOntologyFirewall.
        Accepts JevActionPayload or IncidentActionContract and returns a structured verdict.
        """
        active_nodes = active_graph_nodes or set()
        if hasattr(candidate, "action") and hasattr(candidate, "slang_ambiguity_score"):
            payload = candidate
        else:
            from .shapes import ActionVerb, ThreatTier as JevTier
            contract = candidate
            curr_str = str(contract.current_tier.value if hasattr(contract.current_tier, "value") else contract.current_tier).upper()
            target_str = str(contract.target_tier.value if hasattr(contract.target_tier, "value") else contract.target_tier).upper()

            curr_t = (
                JevTier.TIER_4_CRITICAL if curr_str == "CRITICAL"
                else (JevTier.TIER_3_ELEVATED if curr_str == "ELEVATED" else JevTier.TIER_1_INFO)
            )
            target_t = (
                JevTier.TIER_4_CRITICAL if target_str == "CRITICAL"
                else (JevTier.TIER_3_ELEVATED if target_str == "ELEVATED" else JevTier.TIER_1_INFO)
            )

            act = ActionVerb.TRIGGER_CAMPUS_DISPATCH if target_t == JevTier.TIER_4_CRITICAL else ActionVerb.ESCALATE_THREAT_TIER

            ts = (
                getattr(contract, "event_timestamp", None)
                or getattr(contract, "source_timestamp", None)
                or datetime.now(timezone.utc)
            )
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)

            payload = JevActionPayload(
                action=act,
                incident_id=getattr(contract, "incident_id", "incident_unknown"),
                current_tier=curr_t,
                target_tier=target_t,
                actor_id=getattr(contract, "actor_id", "unknown_actor"),
                target_entity_id=getattr(contract, "target_entity_id", None),
                location_id=getattr(contract, "location_id", "campus_default"),
                evidence_ids=[getattr(contract, "incident_id", "ev_01")],
                semantic_confidence=getattr(contract, "semantic_confidence", 0.90),
                slang_ambiguity_score=0.10,
                event_timestamp=ts,
            )
            if hasattr(contract, "has_threat_object"):
                payload.has_threat_object = contract.has_threat_object
            if hasattr(contract, "visual_severity_tier"):
                payload.visual_severity_tier = contract.visual_severity_tier
            if hasattr(contract, "visual_confidence"):
                payload.visual_confidence = contract.visual_confidence

        violations = cls.evaluate_payload(payload, active_nodes, now=now, counselor_approved=counselor_approved, policy=policy)

        if not violations:
            return {
                "passed": True,
                "veto_reason": None,
                "suggested_action": "DISPATCH_VALIDATED_ALERT",
                "semantic_confidence": payload.semantic_confidence,
                "evaluated_at": (now or datetime.now(timezone.utc)).isoformat(),
                "hitl_payload": None,
                "violations": [],
            }

        primary = violations[0]
        reason = f"[{primary.rule_id}] {primary.message}"
        return {
            "passed": False,
            "veto_reason": reason,
            "suggested_action": "ROUTE_TO_HITL_QUEUE",
            "semantic_confidence": payload.semantic_confidence,
            "evaluated_at": (now or datetime.now(timezone.utc)).isoformat(),
            "hitl_payload": {
                "veto_code": primary.rule_id,
                "reason": primary.message,
                "focus_node": primary.focus_node,
                "violations": [v.to_dict() for v in violations],
            },
            "violations": [v.to_dict() for v in violations],
        }

