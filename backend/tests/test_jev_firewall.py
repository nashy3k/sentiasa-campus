"""
Deterministic Unit Test Suite for Jev Ontology Firewall & Fail-Closed Gatekeeper.
Verifies all 5 core SHACL invariants, anonymous whistleblower governance,
and the LangGraph jev_validation_router.
"""

import unittest
from datetime import datetime, timedelta, timezone
from typing import Set

from backend.jev.shapes import (
    ActionVerb,
    IngestProvenanceEnvelope,
    JevActionPayload,
    ThreatTier,
)
from backend.jev.firewall import (
    JevOntologyFirewall,
    SHACLViolation,
)
from backend.nodes.triage_nodes import jev_validation_router


class TestJevOntologyFirewall(unittest.TestCase):
    """Unit tests verifying fail-closed SHACL invariant enforcement."""

    def setUp(self):
        self.now = datetime.now(timezone.utc)
        self.active_nodes: Set[str] = {"actor_grounded_123", "school_smk_sentiasa", "threat_event_456"}

    def _create_valid_payload(self, **kwargs) -> JevActionPayload:
        """Helper generating a baseline valid payload that passes all invariants."""
        params = {
            "action": ActionVerb.ESCALATE_THREAT_TIER,
            "incident_id": "threat_event_456",
            "current_tier": ThreatTier.TIER_2_MONITOR,
            "target_tier": ThreatTier.TIER_3_ELEVATED,
            "actor_id": "actor_grounded_123",
            "target_entity_id": None,
            "location_id": "school_smk_sentiasa",
            "evidence_ids": ["ev_screenshot_001"],
            "semantic_confidence": 0.95,
            "slang_ambiguity_score": 0.08,
            "event_timestamp": self.now - timedelta(minutes=5),
            "policy_schema_version": "2026.09.v1",
            "is_anonymous_reporter": False,
            "osint_corroborated": False,
        }
        params.update(kwargs)
        return JevActionPayload(**params)

    def test_clean_payload_passes_all_invariants(self):
        """A valid payload within bounds must produce zero SHACL violations."""
        payload = self._create_valid_payload()
        violations = JevOntologyFirewall.evaluate_payload(payload, self.active_nodes, now=self.now)
        self.assertEqual(len(violations), 0)

    # Invariant 1: SHACL-GOV-01 (Restricted Autonomous Actions & Critical Write Actions)
    def test_invariant_1_restricted_autonomous_actions(self):
        """TRIGGER_CAMPUS_DISPATCH and BROADCAST_CAMPUS_ALERT must fail closed with SHACL-GOV-01."""
        for restricted_action in [ActionVerb.TRIGGER_CAMPUS_DISPATCH, ActionVerb.BROADCAST_CAMPUS_ALERT]:
            payload = self._create_valid_payload(action=restricted_action)
            violations = JevOntologyFirewall.evaluate_payload(payload, self.active_nodes, now=self.now)
            rule_ids = [v.rule_id for v in violations]
            self.assertIn("SHACL-GOV-01", rule_ids)
            gov_violation = next(v for v in violations if v.rule_id == "SHACL-GOV-01")
            self.assertIn("Dual-Approval Human Authorization", gov_violation.message)

        # Non-restricted elevated actions must not trip SHACL-GOV-01
        for safe_action in [ActionVerb.LOG_TELEMETRY, ActionVerb.UPDATE_RELATIONSHIP, ActionVerb.ESCALATE_THREAT_TIER]:
            payload = self._create_valid_payload(action=safe_action, target_tier=ThreatTier.TIER_3_ELEVATED)
            violations = JevOntologyFirewall.evaluate_payload(payload, self.active_nodes, now=self.now)
            rule_ids = [v.rule_id for v in violations]
            self.assertNotIn("SHACL-GOV-01", rule_ids)

    def test_invariant_1_critical_threat_tier_triggers_shacl_gov_01_by_default(self):
        """Any candidate action proposing TIER_4_CRITICAL must trip SHACL-GOV-01 without human sign-off."""
        critical_payload = self._create_valid_payload(
            action=ActionVerb.ESCALATE_THREAT_TIER,
            current_tier=ThreatTier.TIER_3_ELEVATED,
            target_tier=ThreatTier.TIER_4_CRITICAL,
        )
        violations = JevOntologyFirewall.evaluate_payload(critical_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-GOV-01", rule_ids)
        gov_v = next(v for v in violations if v.rule_id == "SHACL-GOV-01")
        self.assertEqual(gov_v.focus_node, "CRITICAL")
        self.assertIn("Requires Dual-Approval Human Authorization", gov_v.message)

    def test_invariant_1_counselor_approval_satisfies_shacl_gov_01(self):
        """When human counselor sign-off is confirmed, SHACL-GOV-01 does not block execution."""
        approved_critical = self._create_valid_payload(
            action=ActionVerb.TRIGGER_CAMPUS_DISPATCH,
            current_tier=ThreatTier.TIER_3_ELEVATED,
            target_tier=ThreatTier.TIER_4_CRITICAL,
        )
        violations = JevOntologyFirewall.evaluate_payload(
            approved_critical,
            self.active_nodes,
            now=self.now,
            counselor_approved=True,
        )
        rule_ids = [v.rule_id for v in violations]
        self.assertNotIn("SHACL-GOV-01", rule_ids)

    def test_invariant_7_low_confidence_critical_trips_tripwire(self):
        """Critical tier with confidence < 0.88 trips LOW_CONFIDENCE_TRIPWIRE."""
        low_conf_payload = self._create_valid_payload(
            current_tier=ThreatTier.TIER_3_ELEVATED,
            target_tier=ThreatTier.TIER_4_CRITICAL,
            semantic_confidence=0.75,
        )
        violations = JevOntologyFirewall.evaluate_payload(low_conf_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("LOW_CONFIDENCE_TRIPWIRE", rule_ids)

    # Invariant 2: SHACL-TEMP-01 & 02 (Temporal Freshness & Future Anomaly)
    def test_invariant_2_stale_signal_trips_shacl_temp_01(self):
        """Signals older than 1800s (30 mins) must fail closed with SHACL-TEMP-01."""
        stale_payload = self._create_valid_payload(
            event_timestamp=self.now - timedelta(seconds=1801)
        )
        violations = JevOntologyFirewall.evaluate_payload(stale_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-TEMP-01", rule_ids)
        temp_violation = next(v for v in violations if v.rule_id == "SHACL-TEMP-01")
        self.assertIn("Temporal drift", temp_violation.message)

    def test_invariant_2_future_clock_drift_trips_shacl_temp_02(self):
        """Signals with timestamps in the future (< -30s) must trip SHACL-TEMP-02."""
        future_payload = self._create_valid_payload(
            event_timestamp=self.now + timedelta(seconds=45)
        )
        violations = JevOntologyFirewall.evaluate_payload(future_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-TEMP-02", rule_ids)
        temp_violation = next(v for v in violations if v.rule_id == "SHACL-TEMP-02")
        self.assertIn("in the future", temp_violation.message)

    # Invariant 3: SHACL-STATE-01 (State Machine Monotonicity)
    def test_invariant_3_illegal_state_jump_trips_shacl_state_01(self):
        """Illegal jumps (e.g. INFO -> CRITICAL) must fail closed with SHACL-STATE-01."""
        illegal_jump = self._create_valid_payload(
            current_tier=ThreatTier.TIER_1_INFO,
            target_tier=ThreatTier.TIER_4_CRITICAL,
        )
        violations = JevOntologyFirewall.evaluate_payload(illegal_jump, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-STATE-01", rule_ids)
        state_violation = next(v for v in violations if v.rule_id == "SHACL-STATE-01")
        self.assertIn("Invalid state transition", state_violation.message)

    def test_invariant_3_autonomous_deescalation_from_critical_blocked(self):
        """CRITICAL tier has no autonomous transitions; de-escalation must go through counselor."""
        deescalate_payload = self._create_valid_payload(
            current_tier=ThreatTier.TIER_4_CRITICAL,
            target_tier=ThreatTier.TIER_3_ELEVATED,
        )
        violations = JevOntologyFirewall.evaluate_payload(deescalate_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-STATE-01", rule_ids)

    # Invariant 4: SHACL-SEM-01 (Slang Ambiguity Tripwire)
    def test_invariant_4_high_slang_ambiguity_blocks_escalation(self):
        """High slang ambiguity (> 0.20) for ELEVATED or CRITICAL must trip SHACL-SEM-01."""
        ambiguous_payload = self._create_valid_payload(
            target_tier=ThreatTier.TIER_4_CRITICAL,
            current_tier=ThreatTier.TIER_3_ELEVATED,
            slang_ambiguity_score=0.45,  # > 0.20 tripwire
        )
        violations = JevOntologyFirewall.evaluate_payload(ambiguous_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-SEM-01", rule_ids)
        sem_violation = next(v for v in violations if v.rule_id == "SHACL-SEM-01")
        self.assertIn("High slang ambiguity", sem_violation.message)

    def test_invariant_4_low_slang_ambiguity_allowed_to_escalate(self):
        """Slang ambiguity <= 0.20 must not trip SHACL-SEM-01."""
        clear_payload = self._create_valid_payload(
            target_tier=ThreatTier.TIER_4_CRITICAL,
            current_tier=ThreatTier.TIER_3_ELEVATED,
            slang_ambiguity_score=0.08,
        )
        violations = JevOntologyFirewall.evaluate_payload(clear_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertNotIn("SHACL-SEM-01", rule_ids)

    # Invariant 5: SHACL-GRAPH-01 (Relational Graph Grounding)
    def test_invariant_5_ungrounded_actor_trips_shacl_graph_01(self):
        """An actor not in the active Cytoscape graph topology must trip SHACL-GRAPH-01."""
        ungrounded_payload = self._create_valid_payload(
            actor_id="ghost_phantom_actor_999"  # Not in self.active_nodes
        )
        violations = JevOntologyFirewall.evaluate_payload(ungrounded_payload, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-GRAPH-01", rule_ids)
        graph_violation = next(v for v in violations if v.rule_id == "SHACL-GRAPH-01")
        self.assertIn("not grounded in the current active graph topology", graph_violation.message)

    # Invariant 6: SHACL-ANON-01 (Anonymous Whistleblower Governance)
    def test_invariant_6_anonymous_unilateral_critical_blocked(self):
        """Anonymous report cannot trigger CRITICAL actions without OSINT corroboration."""
        anon_critical = self._create_valid_payload(
            target_tier=ThreatTier.TIER_4_CRITICAL,
            current_tier=ThreatTier.TIER_3_ELEVATED,
            is_anonymous_reporter=True,
            osint_corroborated=False,
        )
        violations = JevOntologyFirewall.evaluate_payload(anon_critical, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-ANON-01", rule_ids)

    def test_invariant_6_anonymous_with_osint_corroboration_passes(self):
        """Anonymous report WITH OSINT corroboration does not trip SHACL-ANON-01."""
        anon_corroborated = self._create_valid_payload(
            target_tier=ThreatTier.TIER_4_CRITICAL,
            current_tier=ThreatTier.TIER_3_ELEVATED,
            is_anonymous_reporter=True,
            osint_corroborated=True,
        )
        violations = JevOntologyFirewall.evaluate_payload(anon_corroborated, self.active_nodes, now=self.now)
        rule_ids = [v.rule_id for v in violations]
        self.assertNotIn("SHACL-ANON-01", rule_ids)

    # LangGraph Edge Router Test
    def test_jev_validation_router_routes_to_commit_when_clean(self):
        """Router returns commit_action_node when zero violations are found."""
        payload = self._create_valid_payload()
        state = {
            "candidate_action": payload,
            "cytoscape_active_node_ids": self.active_nodes,
        }
        route = jev_validation_router(state)
        self.assertEqual(route, "commit_action_node")
        self.assertNotIn("firewall_violations", state)

    def test_jev_validation_router_routes_to_hitl_when_violations_exist(self):
        """Router returns hitl_review_lane and populates state['firewall_violations']."""
        stale_payload = self._create_valid_payload(
            event_timestamp=self.now - timedelta(hours=2)
        )
        state = {
            "candidate_action": stale_payload,
            "cytoscape_active_node_ids": self.active_nodes,
        }
        route = jev_validation_router(state)
        self.assertEqual(route, "hitl_review_lane")
        self.assertIn("firewall_violations", state)
        self.assertGreaterEqual(len(state["firewall_violations"]), 1)
        self.assertEqual(state["firewall_violations"][0]["rule_id"], "SHACL-TEMP-01")

    # Ingest Provenance Envelope Test (Evidence Act 1950 Sec 90A)
    def test_ingest_provenance_envelope_model(self):
        """Verifies IngestProvenanceEnvelope retains hardware/channel telemetry."""
        envelope = IngestProvenanceEnvelope(
            submission_id="sub_987",
            channel="WHATSAPP_UPLOAD",
            client_device_type="iPhone 17 Pro",
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_2)",
            salted_ip_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            payload_sha256="4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        )
        self.assertEqual(envelope.submission_id, "sub_987")
        self.assertEqual(envelope.channel, "WHATSAPP_UPLOAD")
        self.assertIsNotNone(envelope.ingest_timestamp.tzinfo)

    # Canonical Package Exports Test
    def test_canonical_package_exports(self):
        """Verifies that backend.jev exports all core shapes and firewall classes cleanly."""
        from backend.jev import (
            ActionVerb as CanonicalActionVerb,
            IngestProvenanceEnvelope as CanonicalEnvelope,
            JevActionPayload as CanonicalPayload,
            JevOntologyFirewall as CanonicalFirewall,
            SHACLViolation as CanonicalViolation,
            ThreatTier as CanonicalThreatTier,
        )
        self.assertIs(CanonicalThreatTier, ThreatTier)
        self.assertIs(CanonicalPayload, JevActionPayload)
        self.assertIs(CanonicalFirewall, JevOntologyFirewall)
        self.assertIs(CanonicalActionVerb, ActionVerb)
        self.assertIs(CanonicalEnvelope, IngestProvenanceEnvelope)
        self.assertIs(CanonicalViolation, SHACLViolation)


if __name__ == "__main__":
    unittest.main()
