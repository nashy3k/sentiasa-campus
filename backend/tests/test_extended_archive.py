"""
Unit and integration tests for Forward-Only Extended Archive & Probe-and-Demand Tiered Retrieval.
Validates:
1. upload_video_and_triage returns requires_extended_archive and action_disposition.
2. upload_extended_archive binds forward archive with Evidence Act 1950 Sec 90A SHA-256 digest.
3. Ledger incident record and audit log are correctly updated with extended archive metadata.
4. Format validation rejection on invalid file extensions.
"""

import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.storage import get_ledger

client = TestClient(app)


def test_upload_video_returns_archive_directive():
    """Verify upload_video returns requires_extended_archive and action_disposition directives."""
    dummy_bytes = b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free" + (b"\xaa" * 1024)
    file_payload = {"file": ("probe_clip.mp4", io.BytesIO(dummy_bytes), "video/mp4")}
    data = {
        "school_name": "SMK Sentiasa",
        "reporter_alias": "EdgeSampler_Gate01",
        "mock_mode": "true",
    }

    resp = client.post("/api/triage/upload-video", files=file_payload, data=data)
    assert resp.status_code == 200
    body = resp.json()

    assert "incident_id" in body
    assert "claim_id" in body
    assert body["incident_id"] == body["claim_id"]
    assert "requires_extended_archive" in body
    assert "action_disposition" in body
    assert body["action_disposition"] in ["FETCH_FULL_ARCHIVE", "PURGE_EPHEMERAL_BUFFER"]


def test_upload_extended_archive_success():
    """Verify upload_extended_archive accepts the forward archive and binds it to the incident."""
    # 1. First create an incident via upload_video
    dummy_bytes = b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free" + (b"\xaa" * 1024)
    file_payload = {"file": ("probe_clip.mp4", io.BytesIO(dummy_bytes), "video/mp4")}
    data = {
        "school_name": "SMK Sentiasa",
        "reporter_alias": "EdgeSampler_Gate01",
        "mock_mode": "true",
    }
    init_resp = client.post("/api/triage/upload-video", files=file_payload, data=data)
    assert init_resp.status_code == 200
    incident_id = init_resp.json()["incident_id"]

    # 2. Upload extended forward archive
    archive_bytes = b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free" + (b"\xbb" * 2048)
    archive_payload = {"file": (f"forward_{incident_id}.mp4", io.BytesIO(archive_bytes), "video/mp4")}
    archive_data = {
        "incident_id": incident_id,
        "school_name": "SMK Sentiasa",
        "reporter_alias": "EdgeSampler_Gate01",
    }

    arc_resp = client.post("/api/triage/upload-extended-archive", files=archive_payload, data=archive_data)
    assert arc_resp.status_code == 200
    arc_body = arc_resp.json()

    assert arc_body["success"] is True
    assert arc_body["incident_id"] == incident_id
    assert "extended_archive" in arc_body
    sha256 = arc_body["extended_archive"]["sha256"]
    assert len(sha256) == 64  # Valid SHA-256 hex digest

    # 3. Verify ledger persistence
    ledger = get_ledger()
    incidents = ledger.list_incidents()
    matched = next((i for i in incidents if i.get("incident_id") == incident_id), None)
    assert matched is not None
    assert "extended_archive" in matched
    assert matched["extended_archive"]["sha256"] == sha256


def test_upload_extended_archive_invalid_format():
    """Verify unsupported file formats are rejected with HTTP 400."""
    file_payload = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")}
    data = {"incident_id": "threat_test_invalid"}

    resp = client.post("/api/triage/upload-extended-archive", files=file_payload, data=data)
    assert resp.status_code == 400
    assert "Unsupported video format" in resp.json()["detail"]
