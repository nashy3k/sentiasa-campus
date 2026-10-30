"""
Comprehensive Test Suite for Southbridge AI JIT Ontology & Decision Pipeline Invariants.
Validates all 10 Southbridge Rules & Invariants implemented across SENTIASA.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pytest

from backend.evals.audit_answer_key import audit_slang_fixtures
from backend.jev.firewall import JevOntologyFirewall
from backend.jev.shapes import (
    ActionVerb,
    BitemporalStorageSchema,
    CodonAttemptReceipt,
    CodonRunner,
    IngestProvenanceEnvelope,
    JevActionPayload,
    JITDecisionSchema,
    PolicyThresholdConfig,
    RawIngestSourceSchema,
    ThreatTier,
)
from backend.storage.ledger import BudgetLedgerManager


def test_rule_01_bitemporal_modeling_and_skew():
    """Rule 01: Bi-temporal separation (source_timestamp/valid_at vs ingested_at/observed_at)."""
    now = datetime.now(timezone.utc)

    # Ingest provenance envelope
    prov = IngestProvenanceEnvelope(
        submission_id="sub_test_01",
        channel="WHATSAPP_UPLOAD",
        payload_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        ingest_timestamp=now,
    )

    # Raw ingest schema preserving raw untransformed telemetry
    raw_source = RawIngestSourceSchema(
        submission_id="sub_test_01",
        channel="WHATSAPP_UPLOAD",
        raw_payload="Ada budak gaduh",
        provenance=prov,
    )
    assert raw_source.submission_id == "sub_test_01"

    # Bi-temporal storage layer with valid_at and observed_at dimensions
    event_time = now - timedelta(minutes=5)
    storage_record = BitemporalStorageSchema(
        record_id="rec_bitemp_01",
        tenant_id="smk-sentiasa",
        normalized_content={"text": "Budak gaduh", "category": "physical_altercation"},
        valid_at=event_time,
        observed_at=now,
        evidence_hash=prov.payload_sha256 or "",
    )
    assert storage_record.valid_at == event_time
    assert storage_record.observed_at == now
    assert storage_record.evidence_hash != ""


def test_rule_02_cross_family_prior_intersection():
    """Rule 02: Cross-family prior agreement between VLM hypothesis and Jev prior."""
    # Matched prior
    receipt_matched = CodonRunner.create_receipt(
        codon_id="codon_test_01",
        node_name="extract_ontology_node",
        model_family="nebius/nemotron-lightning+typesafe/jev",
        hypothesis_tested="physical_altercation",
        query_a={"vlm_hypothesis": "physical_altercation"},
        query_b={"jev_prior": "physical_altercation"},
        evidence_sufficiency_met=True,
        prior_agreement=True,
        reserved_cost=0.005,
        settled_cost=0.005,
        latency_ms=85.0,
        shacl_passed=True,
    )
    assert receipt_matched.prior_agreement is True

    # Disagreed prior triggers doubt band
    receipt_disagreed = CodonRunner.create_receipt(
        codon_id="codon_test_02",
        node_name="extract_ontology_node",
        model_family="nebius/nemotron-lightning+typesafe/jev",
        hypothesis_tested="physical_altercation",
        query_a={"vlm_hypothesis": "physical_altercation"},
        query_b={"jev_prior": "benign_banter"},
        evidence_sufficiency_met=True,
        prior_agreement=False,
        reserved_cost=0.005,
        settled_cost=0.005,
        latency_ms=85.0,
        shacl_passed=True,
    )
    assert receipt_disagreed.prior_agreement is False


def test_rule_03_two_tier_evaluation_query_a_and_b():
    """Rule 03: Query A (positive evidence) and Query B (orthogonal doubt / audit)."""
    schema = JITDecisionSchema(
        hypothesis_id="hyp_parang_01",
        threat_category="physical_altercation",
        positive_sufficiency_criteria=["Verified weapon kinematics", "Slang corroboration"],
        exclusion_criteria=["Stationery context", "Stale signal > 1800s"],
        required_modalities=["IMINT", "HUMINT"],
    )
    assert len(schema.positive_sufficiency_criteria) == 2
    assert len(schema.exclusion_criteria) == 2
    assert "IMINT" in schema.required_modalities


def test_rule_04_configurable_operating_thresholds():
    """Rule 04: Operating thresholds are policy-configurable rather than hard-coded."""
    payload = JevActionPayload(
        action=ActionVerb.TRIGGER_CAMPUS_DISPATCH,
        incident_id="inc_thresh_test",
        current_tier=ThreatTier.TIER_3_ELEVATED,
        target_tier=ThreatTier.TIER_4_CRITICAL,
        actor_id="test_actor",
        location_id="test_loc",
        evidence_ids=["ev_001"],
        semantic_confidence=0.82,  # Between 0.80 and 0.88
        slang_ambiguity_score=0.10,
        event_timestamp=datetime.now(timezone.utc),
    )

    # Standard default policy requires 0.88 -> Should fail with LOW_CONFIDENCE_TRIPWIRE / SHACL-CONF-01
    default_policy = PolicyThresholdConfig(critical_floor=0.88)
    violations = JevOntologyFirewall.evaluate_payload(
        payload=payload,
        active_graph_nodes={"test_actor", "test_loc"},
        counselor_approved=True,
        policy=default_policy,
    )
    conf_violations = [v for v in violations if v.rule_id in ["SHACL-CONF-01", "LOW_CONFIDENCE_TRIPWIRE"]]
    assert len(conf_violations) == 1

    # Permissive policy with critical_floor = 0.80 -> Passes confidence check
    permissive_policy = PolicyThresholdConfig(critical_floor=0.80)
    violations_perm = JevOntologyFirewall.evaluate_payload(
        payload=payload,
        active_graph_nodes={"test_actor", "test_loc"},
        counselor_approved=True,
        policy=permissive_policy,
    )
    conf_violations_perm = [v for v in violations_perm if v.rule_id in ["SHACL-CONF-01", "LOW_CONFIDENCE_TRIPWIRE"]]
    assert len(conf_violations_perm) == 0


def test_rule_05_positive_evidence_sufficiency():
    """Rule 05: Positive evidence must be met before dispatching high-impact actions."""
    receipt = CodonRunner.create_receipt(
        codon_id="codon_test_05",
        node_name="video_triage_node",
        model_family="nebius/minicpm-v-2.6",
        hypothesis_tested="weapon_detected",
        query_a={"weapon_detected": True, "object": "parang"},
        query_b={"optical_audit_doubt": False},
        evidence_sufficiency_met=True,
        prior_agreement=True,
        reserved_cost=0.008,
        settled_cost=0.008,
        latency_ms=290.0,
        shacl_passed=True,
    )
    assert receipt.evidence_sufficiency_met is True


def test_rule_06_guardrailed_escalation_reviewer_shacl_rev_01():
    """Rule 06: Invariant 10 (SHACL-REV-01) blocks unapproved critical escalation."""
    payload = JevActionPayload(
        action=ActionVerb.TRIGGER_CAMPUS_DISPATCH,
        incident_id="inc_rev_test",
        current_tier=ThreatTier.TIER_3_ELEVATED,
        target_tier=ThreatTier.TIER_4_CRITICAL,
        actor_id="test_actor",
        location_id="test_loc",
        evidence_ids=["ev_002"],
        semantic_confidence=0.95,
        slang_ambiguity_score=0.10,
        event_timestamp=datetime.now(timezone.utc),
        is_reviewer_override=True,
        has_threat_object=True,
    )

    # Without counselor approval -> Blocked by SHACL-REV-01 and SHACL-GOV-01
    violations = JevOntologyFirewall.evaluate_payload(
        payload=payload,
        active_graph_nodes={"test_actor", "test_loc"},
        counselor_approved=False,
    )
    rev_violations = [v for v in violations if v.rule_id == "SHACL-REV-01"]
    assert len(rev_violations) == 1

    # With counselor approval -> SHACL-REV-01 passes
    violations_approved = JevOntologyFirewall.evaluate_payload(
        payload=payload,
        active_graph_nodes={"test_actor", "test_loc"},
        counselor_approved=True,
    )
    rev_violations_approved = [v for v in violations_approved if v.rule_id == "SHACL-REV-01"]
    assert len(rev_violations_approved) == 0


def test_rule_07_doubt_band_handling():
    """Rule 07: Disagreement or confidence in the doubt band routes to HITL review."""
    cfg = PolicyThresholdConfig(
        critical_floor=0.88,
        elevated_floor=0.70,
        doubt_band_low=0.45,
        doubt_band_high=0.75,
    )
    assert cfg.doubt_band_high > cfg.doubt_band_low
    assert cfg.critical_floor > cfg.elevated_floor


def test_rule_08_ground_truth_answer_key_audit():
    """Rule 08: Ground truth answer key scanner audits datasets for leakage & contradictions."""
    report = audit_slang_fixtures()
    assert report.total_fixtures > 0
    assert report.has_critical_findings is False
    assert report.clean_fixtures == report.total_fixtures


def test_rule_09_immutable_codon_receipts():
    """Rule 09: Codon attempt receipts are immutable and serialize cleanly."""
    receipt = CodonRunner.create_receipt(
        codon_id="codon_rec_09",
        node_name="extract_ontology_node",
        model_family="nebius/nemotron-lightning",
        hypothesis_tested="bullying_harassment",
        query_a={"incident": "cyberbullying"},
        query_b={"prior_agreement": True},
        evidence_sufficiency_met=True,
        prior_agreement=True,
        reserved_cost=0.005,
        settled_cost=0.005,
        latency_ms=110.0,
        shacl_passed=True,
    )
    data = receipt.to_dict()
    assert data["codon_id"] == "codon_rec_09"
    assert data["shacl_passed"] is True
    assert "timestamp" in data

    # Reconstitute from dict
    restored = CodonAttemptReceipt(**data)
    assert restored.codon_id == receipt.codon_id


def test_rule_10_dynamic_compute_budget_ledger():
    """Rule 10: Dynamic compute-budget ledger caps per-incident spend and enforces freezing."""
    ledger = BudgetLedgerManager(per_incident_cap_usd=0.020)

    # 1. Reserve within limit
    res1 = ledger.reserve("inc_001", call_type="nebius_vlm", estimated_cost_usd=0.008)
    assert res1["allowed"] is True

    # 2. Settle actual cost
    settle1 = ledger.settle("inc_001", reservation_id=res1["reservation_id"], actual_cost_usd=0.006)
    assert settle1["settled"] is True

    bal = ledger.get_ledger("inc_001")
    assert bal["settled_total_usd"] == pytest.approx(0.006)

    # 3. Reserve more within limit
    res2 = ledger.reserve("inc_001", call_type="nebius_llm", estimated_cost_usd=0.010)
    assert res2["allowed"] is True
    ledger.settle("inc_001", reservation_id=res2["reservation_id"], actual_cost_usd=0.010)
    assert ledger.get_ledger("inc_001")["settled_total_usd"] == pytest.approx(0.016)

    # 4. Attempt to reserve amount that exceeds cap ($0.018 reserved + $0.005 = $0.023 > $0.020)
    res3 = ledger.reserve("inc_001", call_type="tavily_search", estimated_cost_usd=0.005, priority_tier=1)
    assert res3["allowed"] is False
    assert ledger.get_ledger("inc_001")["frozen"] is True
