"""
Unit and integration tests for Section 5: CCTV & Multi-Modal Video Threat Sampling.
Grounded in specs/vss_multimodal_vision_strategy.md and NVIDIA Metropolis VSS blueprint.

Validates:
1. Peak-motion keyframe sampling & Evidence Act 1950 Sec 90A SHA-256 digests.
2. Nebius VLM physical threat classifier (weapons, scuffles, scene context).
3. SHACL-EMERGENCY-BYPASS-01: immediate authorization to jump to TIER_3_CRITICAL on verified lethal threat.
4. Cytoscape EvidenceNode & relational hyperedge exhibit generation.
5. End-to-end video triage LangGraph execution.
6. FastAPI POST /api/triage/upload-video endpoint.
"""

import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from backend.graph import run_triage
from backend.jev_contracts import (
    ActionType,
    IncidentActionContract,
    JevGatekeeper,
    ThreatTier,
)
from backend.main import app
from backend.nodes.video_nodes import (
    MotionKeyframeSampler,
    NebiusPhysicalThreatClassifier,
    extract_video_audio_track,
    video_triage_node,
)
from backend.state import GraphState, ThreatEventNode, VisualEvidenceReport

client = TestClient(app)


def test_motion_keyframe_sampler_synthetic():
    """Verify keyframe sampling extracts peak motion frames with valid SHA-256 digests."""
    keyframes = MotionKeyframeSampler.sample_peak_keyframes("cctv_hostel_scuffle.mp4", max_keyframes=3)
    assert len(keyframes) == 3
    for kf in keyframes:
        assert "frame_index" in kf
        assert "timestamp_sec" in kf
        assert "motion_score" in kf
        assert kf["image_base64"].startswith("data:image/jpeg;base64,")
        assert len(kf["sha256_hash"]) == 64  # Valid SHA-256 hexadecimal string


def test_visual_threat_classifier_lethal_weapon():
    """Verify Role 2 reasoner identifies weapon presence and assigns Severity 5."""
    keyframes = MotionKeyframeSampler.sample_peak_keyframes("cctv_rear_gate_parang.mp4")
    report: VisualEvidenceReport = NebiusPhysicalThreatClassifier.classify_keyframes(
        keyframes=keyframes,
        video_filename="cctv_rear_gate_parang.mp4",
        live_mode=False,
    )

    assert report.has_threat_object is True
    assert "machete_parang" in report.detected_objects
    assert report.physical_aggression_detected is True
    assert report.scene_type == "school_rear_gate"
    assert report.visual_severity_tier == 5
    assert report.confidence >= 0.90
    assert len(report.visual_description) > 0


def test_visual_threat_classifier_scuffle():
    """Verify Role 2 reasoner classifies dorm brawls as high physical aggression."""
    keyframes = MotionKeyframeSampler.sample_peak_keyframes("hostel_scuffle_brawl.mp4")
    report: VisualEvidenceReport = NebiusPhysicalThreatClassifier.classify_keyframes(
        keyframes=keyframes,
        video_filename="hostel_scuffle_brawl.mp4",
        live_mode=False,
    )

    assert report.has_threat_object is False
    assert report.physical_aggression_detected is True
    assert report.scene_type == "hostel_dorm"
    assert report.visual_severity_tier == 4
    assert report.confidence >= 0.90


def test_visual_threat_classifier_peaceful():
    """Verify Role 2 reasoner does not raise false alarms on peaceful canteen footage."""
    keyframes = MotionKeyframeSampler.sample_peak_keyframes("canteen_lunch_recess.mp4")
    report: VisualEvidenceReport = NebiusPhysicalThreatClassifier.classify_keyframes(
        keyframes=keyframes,
        video_filename="canteen_lunch_recess.mp4",
        live_mode=False,
    )

    assert report.has_threat_object is False
    assert report.physical_aggression_detected is False
    assert report.visual_severity_tier == 1
    assert report.confidence >= 0.90


def test_shacl_emergency_bypass_contract():
    """
    Test SHACL-EMERGENCY-BYPASS-01:
    Standard FSM blocks a direct jump from TIER_1_LOW to TIER_3_CRITICAL with FSM_ILLEGAL_STATE_JUMP.
    When has_threat_object=True and visual_confidence >= 0.90, the emergency bypass permits it.
    """
    now = datetime.now(timezone.utc)

    # Standard contract without visual bypass (should be VETOED)
    standard_contract = IncidentActionContract(
        action=ActionType.DISPATCH_SECURITY,
        incident_id="inc_standard_01",
        current_tier=ThreatTier.TIER_1_LOW,
        target_tier=ThreatTier.TIER_3_CRITICAL,
        actor_id="actor_01",
        location_id="school_01",
        semantic_confidence=0.92,
        source_timestamp=now,
        raw_evidence_summary="Text rumor of weapon.",
        has_threat_object=False,
    )
    res_standard = JevGatekeeper.evaluate(standard_contract, current_time=now, query_system_one=False)
    assert res_standard.passed is False
    assert "FSM_ILLEGAL_STATE_JUMP" in res_standard.hitl_payload["veto_code"]

    # Emergency bypass contract with verified visual weapon (should PASS)
    bypass_contract = IncidentActionContract(
        action=ActionType.DISPATCH_SECURITY,
        incident_id="inc_bypass_01",
        current_tier=ThreatTier.TIER_1_LOW,
        target_tier=ThreatTier.TIER_3_CRITICAL,
        actor_id="actor_01",
        location_id="school_01",
        semantic_confidence=0.75,
        source_timestamp=now,
        raw_evidence_summary="CCTV verified parang weapon brandishing.",
        has_threat_object=True,
        visual_severity_tier=5,
        visual_confidence=0.96,
    )
    res_bypass = JevGatekeeper.evaluate(bypass_contract, current_time=now, query_system_one=False)
    assert res_bypass.passed is True
    assert res_bypass.veto_reason is None


def test_video_triage_node_cytoscape_elements():
    """Verify video_triage_node creates EvidenceNode exhibits and links to ThreatEventNode."""
    threat_event = ThreatEventNode(
        event_id="threat_evt_test_01",
        incident_type="physical_altercation",
        raw_text="Campus CCTV rear gate feed",
        severity_tier=1,
        threat_tier=ThreatTier.TIER_1_LOW,
        confidence_score=0.8,
        context_summary="Test event context",
    )

    state: GraphState = {
        "raw_text": "CCTV test",
        "video_path": "cctv_rear_gate_parang.mp4",
        "threat_event": threat_event,
        "cytoscape_elements": [],
        "triples": [],
        "metadata": {},
    }

    result = video_triage_node(state)
    assert "sampled_keyframes" in result
    assert "visual_evidence" in result
    assert "evidence_nodes" in result

    report: VisualEvidenceReport = result["visual_evidence"]
    assert report.has_threat_object is True
    assert result["threat_tier"] == ThreatTier.TIER_3_CRITICAL.value
    assert result["escalation_required"] is True

    # Check EvidenceNode objects
    evidence_nodes = result["evidence_nodes"]
    assert len(evidence_nodes) > 0
    assert evidence_nodes[0].media_type == "CCTV_KEYFRAME"
    assert len(evidence_nodes[0].sha256_hash) == 64

    # Check Cytoscape elements
    cy_elements = result["cytoscape_elements"]
    node_elements = [el for el in cy_elements if el["data"].get("type") == "evidence"]
    edge_elements = [el for el in cy_elements if "source" in el["data"]]
    assert len(node_elements) > 0
    assert len(edge_elements) > 0
    assert edge_elements[0]["data"]["target"] == threat_event.event_id


def test_end_to_end_video_triage():
    """Verify end-to-end execution of run_triage with a video source."""
    result = run_triage(
        raw_text="Footage from camera 4 rear gate",
        video_path="cctv_rear_gate_parang.mp4",
        metadata={"school_name": "SMK Sentiasa", "mock_external_apis": True},
    )

    assert result.get("threat_tier") == ThreatTier.TIER_3_CRITICAL.value
    # Under SHACL-GOV-01 blast radius governance, critical weapon detections
    # route strictly to HITL queue for counselor verification before dispatch
    assert result.get("jev_passed") is False
    assert result.get("status") == "vetoed_to_hitl_queue"
    assert len(result.get("hitl_queue", [])) > 0
    assert len(result.get("evidence_nodes", [])) > 0
    assert any(el["data"].get("type") == "evidence" for el in result.get("cytoscape_elements", []))


def test_upload_video_api():
    """Verify FastAPI POST /api/triage/upload-video handles video file uploads."""
    simulated_video_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42" + (b"\x00" * 200)
    files = {
        "file": ("cctv_hostel_scuffle.mp4", io.BytesIO(simulated_video_bytes), "video/mp4"),
    }
    data = {
        "school_name": "SMK Victoria",
        "reporter_alias": "Security_Guard_01",
        "mock_mode": "true",
    }

    response = client.post("/api/triage/upload-video", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()

    assert "threat_tier" in res_json
    assert "visual_evidence" in res_json
    assert res_json["visual_evidence"]["scene_type"] == "hostel_dorm"
    assert res_json["visual_evidence"]["physical_aggression_detected"] is True
    assert "evidence_nodes" in res_json
    assert len(res_json["evidence_nodes"]) > 0
    assert "cytoscape_elements" in res_json


def test_visual_threat_classifier_sexual_misconduct():
    """Verify Role 2 reasoner classifies forced undressing / sexual abuse as Severity 5 sexual_assault."""
    keyframes = MotionKeyframeSampler.sample_peak_keyframes("hostel_forced_bogel_strip.mp4")
    report: VisualEvidenceReport = NebiusPhysicalThreatClassifier.classify_keyframes(
        keyframes=keyframes,
        video_filename="hostel_forced_bogel_strip.mp4",
        live_mode=False,
    )

    assert report.sexual_misconduct_detected is True
    assert report.visual_severity_tier == 5
    assert report.confidence >= 0.90
    assert "forced_undressing" in report.detected_objects

    # Test end-to-end integration into triage graph
    res = run_triage(
        raw_text="Footage uploaded from dorm camera",
        video_path="hostel_forced_bogel_strip.mp4",
        metadata={"mock_external_apis": True},
    )
    assert res.get("threat_tier") == ThreatTier.TIER_3_CRITICAL.value
    assert res.get("severity_tier") == 5
    assert res.get("incident_type") == "sexual_assault"
    # Under SHACL-GOV-01, critical sexual violence routes to HITL queue by default
    assert res.get("jev_passed") is False
    assert res.get("status") == "vetoed_to_hitl_queue"
    assert len(res.get("hitl_queue", [])) > 0


def test_caption_masking_filter_eliminates_ocr_cheating_doubt():
    """
    Task 18.3.1: Verify letterbox caption masking filter.
    When news/subtitle text is present, unmasked evaluation flags orthogonal doubt (0.55).
    Applying mask_captions=True eliminates caption reliance doubt (0.0).
    """
    video_fn = "cctv_news_caption_parang.mp4"

    # 1. Unmasked evaluation (detects on-screen caption cheat)
    keyframes_unmasked = MotionKeyframeSampler.sample_peak_keyframes(video_fn, mask_captions=False)
    assert keyframes_unmasked[0]["captions_masked"] is False
    report_unmasked = NebiusPhysicalThreatClassifier.classify_keyframes(
        keyframes=keyframes_unmasked,
        video_filename=video_fn,
        live_mode=False,
    )
    assert report_unmasked.orthogonal_evidence_doubt == 0.55
    assert "on_screen_news_caption_detected" in report_unmasked.weakening_factors
    assert report_unmasked.needs_visual_review is True

    # 2. Masked evaluation (letterbox filter applied)
    keyframes_masked = MotionKeyframeSampler.sample_peak_keyframes(
        video_fn,
        mask_captions=True,
        mask_bottom_ratio=0.25,
    )
    assert keyframes_masked[0]["captions_masked"] is True
    assert keyframes_masked[0]["masked_ratio"] == 0.25
    report_masked = NebiusPhysicalThreatClassifier.classify_keyframes(
        keyframes=keyframes_masked,
        video_filename=video_fn,
        live_mode=False,
        captions_masked=True,
    )
    assert report_masked.orthogonal_evidence_doubt == 0.0
    assert report_masked.needs_visual_review is False
    assert report_masked.captions_masked is True


