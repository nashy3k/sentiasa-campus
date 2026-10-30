"""
Comprehensive unit test suite for Project SENTIASA.
Validates Palantir Triad schemas, Jev Deterministic Gatekeeper invariants,
LangGraph state transitions, Cytoscape graph sync, and HITL review queue routing.
Runs 100% deterministically with mocked external endpoints (<1 second execution).
"""

import unittest
from datetime import datetime, timedelta, timezone

from backend.graph import run_triage
from backend.jev_contracts import (
    ActionType,
    IncidentActionContract,
    JevGatekeeper,
    ThreatTier,
)
from backend.state import (
    PersonaNode,
    RelationalTriple,
    SchoolNode,
    ThreatEventNode,
)


class TestPalantirSchemas(unittest.TestCase):
    """Verifies core Palantir ontology models."""

    def test_school_node(self):
        school = SchoolNode(school_id="school_smk_sentiasa", name="SMK Sentiasa")
        self.assertEqual(school.school_id, "school_smk_sentiasa")
        self.assertEqual(school.district, "Klang Valley")

    def test_persona_node(self):
        persona = PersonaNode(
            entity_id="p_123",
            alias="Azlan_17",
            school_name="SMK Sentiasa",
            role_risk_tier="Target",
        )
        self.assertEqual(persona.entity_id, "p_123")
        self.assertEqual(persona.role_risk_tier, "Target")

    def test_threat_event_node_tier_mapping(self):
        threat = ThreatEventNode(
            event_id="t_456",
            incident_type="physical_altercation",
            raw_text="Budak bawa parang",
            severity_tier=5,
            threat_tier=ThreatTier.TIER_3_CRITICAL,
            confidence_score=0.95,
            context_summary="Armed altercation imminent",
            extracted_slang_tokens=["parang"],
        )
        self.assertEqual(threat.severity_tier, 5)
        self.assertEqual(threat.threat_tier, ThreatTier.TIER_3_CRITICAL)
        self.assertEqual(threat.threat_tier.to_severity_int(), 5)

    def test_relational_triple(self):
        triple = RelationalTriple(
            subject_id="p_123",
            predicate="COMMUNICATES_THREAT",
            object_id="t_456",
            confidence=0.95,
        )
        self.assertEqual(triple.predicate, "COMMUNICATES_THREAT")
        self.assertEqual(triple.bi_temporal_validity, "VALID")


class TestJevDeterministicGatekeeper(unittest.TestCase):
    """Verifies Invariants enforced by unified safety gatekeeper."""

    def setUp(self):
        self.now = datetime.now(timezone.utc)

    def test_jev_passes_valid_escalation(self):
        """Non-critical elevated escalation within FSM limits passes gatekeeper."""
        contract = IncidentActionContract(
            action=ActionType.ESCALATE_TIER,
            incident_id="inc_valid_01",
            current_tier=ThreatTier.TIER_1_LOW,
            target_tier=ThreatTier.TIER_2_ELEVATED,
            actor_id="actor_01",
            location_id="school_sentiasa",
            semantic_confidence=0.95,
            source_timestamp=self.now,
            raw_evidence_summary="Budak form 2 kena pau duit",
        )
        res = JevGatekeeper.evaluate(contract, query_system_one=False)
        self.assertTrue(res.passed)
        self.assertIsNone(res.veto_reason)
        self.assertEqual(res.suggested_action, "DISPATCH_VALIDATED_ALERT")

    def test_jev_firewall_vetoes_unauthorized_critical_dispatch_under_shacl_gov_01(self):
        """Unified firewall rejects autonomous Tier 3 Critical dispatch under SHACL-GOV-01."""
        from backend.jev import JevOntologyFirewall
        contract = IncidentActionContract(
            action=ActionType.DISPATCH_SECURITY,
            incident_id="inc_crit_01",
            current_tier=ThreatTier.TIER_2_ELEVATED,
            target_tier=ThreatTier.TIER_3_CRITICAL,
            actor_id="actor_01",
            location_id="school_sentiasa",
            semantic_confidence=0.95,
            source_timestamp=self.now,
            raw_evidence_summary="Budak form 4 bawa parang",
        )
        res = JevOntologyFirewall.evaluate(contract)
        self.assertFalse(res["passed"])
        self.assertIn("SHACL-GOV-01", res["veto_reason"])
        self.assertEqual(res["suggested_action"], "ROUTE_TO_HITL_QUEUE")

    def test_jev_vetoes_illegal_state_jump(self):
        """Illegal jump from TIER_1_LOW directly to TIER_3_CRITICAL must be vetoed."""
        contract = IncidentActionContract(
            action=ActionType.DISPATCH_SECURITY,
            incident_id="inc_jump_02",
            current_tier=ThreatTier.TIER_1_LOW,
            target_tier=ThreatTier.TIER_3_CRITICAL,
            actor_id="actor_02",
            location_id="school_sentiasa",
            semantic_confidence=0.95,
            source_timestamp=self.now,
        )
        res = JevGatekeeper.evaluate(contract, query_system_one=False)
        self.assertFalse(res.passed)
        self.assertIn("Illegal state jump", res.veto_reason)
        self.assertEqual(res.suggested_action, "ROUTE_TO_HITL_QUEUE")
        self.assertEqual(res.hitl_payload["veto_code"], "FSM_ILLEGAL_STATE_JUMP")

    def test_jev_vetoes_stale_signal(self):
        """Signals older than 2 hours (7200s) require human review."""
        contract = IncidentActionContract(
            action=ActionType.ESCALATE_TIER,
            incident_id="inc_stale_03",
            current_tier=ThreatTier.TIER_2_ELEVATED,
            target_tier=ThreatTier.TIER_3_CRITICAL,
            actor_id="actor_03",
            location_id="school_sentiasa",
            semantic_confidence=0.95,
            source_timestamp=self.now - timedelta(hours=3),
        )
        res = JevGatekeeper.evaluate(contract, query_system_one=False)
        self.assertFalse(res.passed)
        self.assertIn("Stale signal", res.veto_reason)
        self.assertEqual(res.hitl_payload["veto_code"], "TEMPORAL_STALE_SIGNAL")

    def test_jev_vetoes_future_clock_anomaly(self):
        """Signals with future timestamps ahead of clock skew limit must be vetoed."""
        contract = IncidentActionContract(
            action=ActionType.ESCALATE_TIER,
            incident_id="inc_future_04",
            current_tier=ThreatTier.TIER_1_LOW,
            target_tier=ThreatTier.TIER_2_ELEVATED,
            actor_id="actor_04",
            location_id="school_sentiasa",
            semantic_confidence=0.90,
            source_timestamp=self.now + timedelta(minutes=5),
        )
        res = JevGatekeeper.evaluate(contract, query_system_one=False)
        self.assertFalse(res.passed)
        self.assertIn("Future timestamp anomaly", res.veto_reason)
        self.assertEqual(res.hitl_payload["veto_code"], "TEMPORAL_FUTURE_ANOMALY")

    def test_jev_vetoes_low_confidence_critical(self):
        """Tier 3 Critical escalation with semantic confidence < 0.88 must be vetoed."""
        contract = IncidentActionContract(
            action=ActionType.DISPATCH_SECURITY,
            incident_id="inc_low_conf_05",
            current_tier=ThreatTier.TIER_2_ELEVATED,
            target_tier=ThreatTier.TIER_3_CRITICAL,
            actor_id="actor_05",
            location_id="school_sentiasa",
            semantic_confidence=0.74,  # Below 0.88 floor
            source_timestamp=self.now,
        )
        res = JevGatekeeper.evaluate(contract, query_system_one=False)
        self.assertFalse(res.passed)
        self.assertIn("Insufficient confidence", res.veto_reason)
        self.assertEqual(res.hitl_payload["veto_code"], "LOW_CONFIDENCE_TRIPWIRE")


class TestStateGraphWorkflow(unittest.TestCase):
    """Verifies end-to-end execution through the LangGraph StateGraph engine."""

    def test_end_to_end_critical_threat_triggers_shacl_gov_01_and_enqueues_to_hitl(self):
        """
        Critical threats (parang + belasah) proposing emergency dispatch MUST trigger
        SHACL-GOV-01 and route to HITL review queue without autonomous dispatch execution.
        """
        raw_text = "Budak form 4 bawa parang nak belasah budak batch bawah."
        result = run_triage(
            raw_text,
            metadata={
                "school_name": "SMK Sentiasa",
                "reporter_alias": "AnonPrefect",
                "mock_external_apis": True,
            },
        )

        # Gatekeeper fail-closed verdict
        self.assertFalse(result["jev_passed"])
        self.assertEqual(result["status"], "vetoed_to_hitl_queue")
        self.assertIsNone(result.get("counselor_alert"))  # No autonomous dispatch!

        # Enqueued in HITL review queue with SHACL-GOV-01 reason
        hitl_queue = result.get("hitl_queue", [])
        self.assertGreaterEqual(len(hitl_queue), 1)
        self.assertEqual(hitl_queue[0]["review_status"], "PENDING_HUMAN_TRIAGE")
        self.assertIn("SHACL-GOV-01", hitl_queue[0]["veto_reason"])

        # Cytoscape elements are rendered so human counselor can inspect graph topology
        cy_elements = result.get("cytoscape_elements", [])
        self.assertGreaterEqual(len(cy_elements), 4)
        node_types = [el["data"].get("type") for el in cy_elements]
        self.assertIn("SchoolNode", node_types)
        self.assertIn("PersonaNode", node_types)
        self.assertIn("ThreatEventNode", node_types)

    def test_end_to_end_passed_branch_for_informational_event(self):
        """Benign/informational reports pass the gatekeeper and log without dispatching alerts."""
        raw_text = "Budak lepak tepi padang waktu rehat."
        result = run_triage(
            raw_text,
            metadata={
                "school_name": "SMK Sentiasa",
                "reporter_alias": "AnonPrefect",
                "mock_external_apis": True,
            },
        )

        self.assertTrue(result["jev_passed"])
        self.assertEqual(result["status"], "logged_and_synced")
        self.assertIsNone(result.get("counselor_alert"))

        # Cytoscape elements check
        cy_elements = result.get("cytoscape_elements", [])
        self.assertGreaterEqual(len(cy_elements), 3)

    def test_end_to_end_counselor_approved_critical_escalation_dispatches(self):
        """When human counselor sign-off is provided, critical dispatch is authorized."""
        raw_text = "Budak form 4 bawa parang nak belasah budak batch bawah."
        result = run_triage(
            raw_text,
            metadata={
                "school_name": "SMK Sentiasa",
                "reporter_alias": "AnonPrefect",
                "mock_external_apis": True,
                "counselor_approved": True,  # Explicit human sign-off
            },
        )

        self.assertTrue(result["jev_passed"])
        self.assertEqual(result["status"], "escalated_and_synced")
        self.assertIsNotNone(result.get("counselor_alert"))
        self.assertEqual(result["counselor_alert"]["urgency"], "CRITICAL_TRIAGE")
        self.assertEqual(result["counselor_alert"]["jev_status"], "APPROVED_POST_HITL")

    def test_end_to_end_vetoed_branch_enqueues_to_hitl(self):
        """Simulate an illegal jump: current state LOW, jumping to CRITICAL."""
        raw_text = "Budak form 4 bawa parang."
        result = run_triage(
            raw_text,
            metadata={
                "school_name": "SMK Sentiasa",
                "current_tier": "LOW",  # Illegal jump triggers Jev veto
                "mock_external_apis": True,
            },
        )

        self.assertFalse(result["jev_passed"])
        self.assertEqual(result["status"], "vetoed_to_hitl_queue")
        self.assertIsNone(result.get("counselor_alert"))

        hitl_queue = result.get("hitl_queue", [])
        self.assertGreaterEqual(len(hitl_queue), 1)
        self.assertEqual(hitl_queue[0]["review_status"], "PENDING_HUMAN_TRIAGE")
        self.assertIn("SHACL-GOV-01", hitl_queue[0]["veto_reason"])

    def test_end_to_end_sensory_fusion_payload_and_concurrency(self):
        """
        Verify that concurrent fan-out at START properly merges into FusedSensoryPayload:
        - video_triage_node (keyframes & visual exhibits)
        - normalize_slang_node (normalized text & slang tokens)
        - osint_discovery_node (OSINT evidence & citations)
        All merged deterministically at sensory_fusion_join_node barrier.
        """
        raw_text = "Budak hostel tapau budak form 2 bawa parang."
        result = run_triage(
            raw_text,
            video_path="cctv_rear_gate_parang.mp4",
            metadata={
                "school_name": "SMK Sentiasa",
                "reporter_alias": "AnonPrefect",
                "mock_external_apis": True,
            },
        )

        # Sensory fusion barrier output validation
        self.assertIn("fused_sensory", result)
        fused = result["fused_sensory"]
        self.assertIsNotNone(fused)
        self.assertEqual(fused.raw_text, raw_text)
        self.assertIn("parang", fused.extracted_slang_tokens)
        self.assertIn("tapau", fused.extracted_slang_tokens)

        # Video exhibits merged
        self.assertIsNotNone(fused.visual_evidence)
        self.assertTrue(fused.visual_evidence.has_threat_object)
        self.assertGreater(len(fused.evidence_nodes), 0)

        # OSINT exhibits merged
        self.assertGreater(len(fused.osint_evidence), 0)
        self.assertGreater(len(fused.external_citations), 0)

        # Preliminary fast-path threat flags
        flags = fused.preliminary_threat_flags
        self.assertTrue(flags["has_visual_weapon"])
        self.assertTrue(flags["has_critical_slang"])
        self.assertTrue(flags["has_osint_corroboration"])

    def test_sensory_fusion_join_node_isolated(self):
        """Verify sensory_fusion_join_node operates as a zero-LLM deterministic barrier."""
        from backend.nodes import sensory_fusion_join_node
        from backend.state import EvidenceNode, VisualEvidenceReport

        fake_evidence = [
            EvidenceNode(
                evidence_id="EVI-001",
                media_type="CCTV_KEYFRAME",
                source_uri="test.mp4",
                sha256_hash="a" * 64,
                has_threat_object=True,
            )
        ]
        fake_visual = VisualEvidenceReport(
            has_threat_object=True,
            detected_objects=["machete_parang"],
            visual_severity_tier=5,
            confidence=0.95,
        )

        mock_state = {
            "raw_text": "Kena belasah kat asrama",
            "normalized_text": "Kena belasah [violently assaulted] kat asrama",
            "extracted_slang_tokens": ["belasah"],
            "slang_glossary_matches": {"belasah": "violently assaulted"},
            "slang_token_details": {},
            "visual_evidence": fake_visual,
            "evidence_nodes": fake_evidence,
            "osint_query": "Malaysia student fight hostel",
            "osint_evidence": [{"title": "Hostel scuffle thread", "url": "https://reddit.com/r/malaysiauni/123"}],
            "external_citations": ["https://reddit.com/r/malaysiauni/123"],
            "metadata": {"mock_external_apis": True},
        }

        output = sensory_fusion_join_node(mock_state)
        self.assertIn("fused_sensory", output)
        fused = output["fused_sensory"]
        self.assertTrue(fused.preliminary_threat_flags["has_visual_weapon"])
        self.assertTrue(fused.preliminary_threat_flags["has_critical_slang"])
        self.assertTrue(fused.preliminary_threat_flags["has_osint_corroboration"])
        self.assertEqual(len(fused.evidence_nodes), 1)


if __name__ == "__main__":
    unittest.main()
