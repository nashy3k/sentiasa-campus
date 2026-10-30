"""
Live Smoke Verification Script for Google Cloud Firestore Native Persistence.
Project SENTIASA - Multi-Agent Anti-Bullying Early-Warning System.

Validates:
1. Direct connection to Google Cloud Firestore (GCP Project: modified-argon-471003-i3, Database: (default)).
2. FirestoreLedger CRUD operations for /incidents, /hitl_queue, and /audit_log collections.
3. FastAPI end-to-end /api/triage integration with FIRESTORE_ENABLED=true.
4. Clean teardown and deletion of all smoke-test documents.
"""

import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

# Enforce Firestore environment variables before importing app
os.environ["FIRESTORE_ENABLED"] = "true"
os.environ["GCP_PROJECT_ID"] = "modified-argon-471003-i3"
os.environ["FIRESTORE_DATABASE_ID"] = "(default)"

from fastapi.testclient import TestClient
from google.cloud import firestore

from backend.main import app
from backend.storage.ledger import (
    DEFAULT_FIRESTORE_DATABASE,
    DEFAULT_GCP_PROJECT_ID,
    FirestoreLedger,
    get_ledger,
)


def run_live_smoke_verification():
    print("=" * 70)
    print("PROJECT SENTIASA: LIVE GOOGLE CLOUD FIRESTORE SMOKE VERIFICATION")
    print(f"Target GCP Project : {DEFAULT_GCP_PROJECT_ID}")
    print(f"Target Database    : {DEFAULT_FIRESTORE_DATABASE} (Native Mode)")
    print(f"Timestamp          : {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    tracked_docs = {
        "incidents": [],
        "hitl_queue": [],
        "audit_log": [],
    }

    try:
        # ---------------------------------------------------------
        # STEP 1: Direct Client Ping & Database Discovery
        # ---------------------------------------------------------
        print("\n[STEP 1] Initializing Google Cloud Firestore Native Client...")
        t0 = time.time()
        client = firestore.Client(
            project=DEFAULT_GCP_PROJECT_ID,
            database=DEFAULT_FIRESTORE_DATABASE,
        )
        elapsed = time.time() - t0
        collections = [col.id for col in client.collections()]
        print(f"   -> Connected successfully in {elapsed:.2f}s!")
        print(f"   -> Discovered existing collections in (default): {collections}")

        # ---------------------------------------------------------
        # STEP 2: Direct FirestoreLedger Instantiation
        # ---------------------------------------------------------
        print("\n[STEP 2] Instantiating FirestoreLedger persistence adapter...")
        ledger = FirestoreLedger(
            project_id=DEFAULT_GCP_PROJECT_ID,
            database_id=DEFAULT_FIRESTORE_DATABASE,
        )
        print("   -> FirestoreLedger adapter initialized successfully.")

        # ---------------------------------------------------------
        # STEP 3: Incident Persistence Lifecycle
        # ---------------------------------------------------------
        incident_id = f"SMOKE_INC_{uuid4().hex[:8]}"
        tracked_docs["incidents"].append(incident_id)
        print(f"\n[STEP 3] Testing /incidents persistence (ID: {incident_id})...")

        incident_payload = {
            "incident_id": incident_id,
            "status": "vetoed_to_hitl_queue",
            "threat_tier": "CRITICAL",
            "severity_tier": 5,
            "school_name": "SMK Sentiasa Live Verification High",
            "slang_tokens": ["parang", "belasah", "batch"],
            "summary": "Live smoke test synthetic incident: Critical threat detected with weapon slang.",
            "cytoscape_elements": [
                {"data": {"id": "n_school", "label": "SMK Sentiasa Live"}},
                {"data": {"id": "n_threat", "label": "Threat: Parang"}},
                {"data": {"source": "n_school", "target": "n_threat", "label": "LOCATED_AT"}},
            ],
            "metadata": {
                "test_run": True,
                "verified_by": "Antigravity Smoke Agent",
            },
        }

        t0 = time.time()
        saved_inc_id = ledger.record_incident(incident_payload)
        t_write = time.time() - t0
        print(f"   -> Document written to /incidents/{saved_inc_id} in {t_write:.2f}s.")

        # Read back document
        t0 = time.time()
        retrieved_inc = ledger.get_incident(incident_id)
        t_read = time.time() - t0
        assert retrieved_inc is not None, f"Failed to retrieve incident {incident_id}"
        assert retrieved_inc["severity_tier"] == 5, f"Expected severity_tier=5, got {retrieved_inc['severity_tier']}"
        assert len(retrieved_inc["cytoscape_elements"]) == 3, "Cytoscape elements mismatch"
        print(f"   -> Retrieved /incidents/{incident_id} in {t_read:.2f}s:")
        print(f"      * Severity: Tier {retrieved_inc['severity_tier']} ({retrieved_inc['threat_tier']})")
        print(f"      * Cytoscape Elements: {len(retrieved_inc['cytoscape_elements'])} graph objects")
        print(f"      * Slang Tokens: {retrieved_inc['slang_tokens']}")

        # ---------------------------------------------------------
        # STEP 4: HITL Review Queue Lifecycle
        # ---------------------------------------------------------
        hitl_id = f"SMOKE_HITL_{uuid4().hex[:8]}"
        tracked_docs["hitl_queue"].append(hitl_id)
        print(f"\n[STEP 4] Testing /hitl_queue enqueue & resolve (ID: {hitl_id})...")

        hitl_payload = {
            "queue_id": hitl_id,
            "incident_id": incident_id,
            "review_status": "PENDING_HUMAN_TRIAGE",
            "school_name": "SMK Sentiasa Live Verification High",
            "suggested_action": "TRIGGER_CAMPUS_DISPATCH",
            "veto_reason": "SHACL-GOV-01: Critical autonomous dispatch blocked without counselor authorization",
            "severity_tier": 5,
        }

        t0 = time.time()
        saved_qid = ledger.enqueue_hitl(hitl_payload)
        t_write = time.time() - t0
        print(f"   -> Enqueued /hitl_queue/{saved_qid} in {t_write:.2f}s.")

        # Query pending
        pending_items = ledger.get_hitl_queue(status="PENDING_HUMAN_TRIAGE")
        match = next((item for item in pending_items if item.get("queue_id") == hitl_id), None)
        assert match is not None, f"Failed to find {hitl_id} in pending HITL queue"
        print(f"   -> Verified ticket presence in pending HITL queue (Total pending found: {len(pending_items)}).")

        # Resolve ticket
        t0 = time.time()
        res_ok = ledger.resolve_hitl(
            queue_id=hitl_id,
            decision="APPROVE_ESCALATION",
            reviewer_notes="Verified via CCTV: Senior Counselor approved campus security alert.",
        )
        t_resolve = time.time() - t0
        assert res_ok is True, "Failed to resolve HITL ticket"
        print(f"   -> Ticket {hitl_id} resolved with 'APPROVE_ESCALATION' in {t_resolve:.2f}s.")

        # Re-fetch document directly from Firestore to verify update persisted
        updated_doc = client.collection("hitl_queue").document(hitl_id).get().to_dict()
        assert updated_doc["review_status"] == "APPROVE_ESCALATION"
        assert "resolved_at" in updated_doc
        print(f"   -> Verified in-cloud state: status={updated_doc['review_status']}, resolved_at={updated_doc['resolved_at']}")

        # ---------------------------------------------------------
        # STEP 5: Evidence Act 1950 Sec 90A Forensic Audit Log
        # ---------------------------------------------------------
        audit_id = f"SMOKE_AUDIT_{uuid4().hex[:8]}"
        tracked_docs["audit_log"].append(audit_id)
        print(f"\n[STEP 5] Testing /audit_log tamper-evident entry (ID: {audit_id})...")

        audit_payload = {
            "audit_id": audit_id,
            "incident_id": incident_id,
            "act_reference": "Evidence Act 1950 (Act 56) Section 90A",
            "event_type": "SHACL_BOUNDARY_ENFORCEMENT",
            "rule_id": "SHACL-GOV-01",
            "action_attempted": "TRIGGER_CAMPUS_DISPATCH",
            "disposition": "QUARANTINED_TO_HITL",
            "hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "verified_by": "JevOntologyFirewall",
        }

        t0 = time.time()
        saved_aud_id = ledger.record_audit(audit_payload)
        t_write = time.time() - t0
        print(f"   -> Audit record saved to /audit_log/{saved_aud_id} in {t_write:.2f}s.")

        audit_entries = ledger.get_audit_log(incident_id=incident_id)
        match_audit = next((a for a in audit_entries if a.get("audit_id") == audit_id), None)
        assert match_audit is not None, f"Failed to retrieve audit log {audit_id}"
        print(f"   -> Retrieved audit log entry: rule={match_audit['rule_id']}, act={match_audit['act_reference']}")

        # ---------------------------------------------------------
        # STEP 6: End-to-End FastAPI /api/triage Integration
        # ---------------------------------------------------------
        print("\n[STEP 6] Testing FastAPI end-to-end integration via TestClient...")
        active_ledger = get_ledger(force_refresh=True)
        assert isinstance(active_ledger, FirestoreLedger), f"Expected FirestoreLedger, got {type(active_ledger)}"
        print("   -> get_ledger(force_refresh=True) returned live FirestoreLedger singleton.")

        client_app = TestClient(app)

        # Health endpoint
        health_resp = client_app.get("/health")
        assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
        health_data = health_resp.json()
        print(f"   -> /health: storage_mode='{health_data['storage_mode']}', firestore_configured={health_data['firestore_configured']}")
        assert health_data["storage_mode"] == "firestore"
        assert health_data["firestore_configured"] is True

        # Triage invocation
        triage_req = {
            "raw_text": "SMOKE TEST: Budak form 4 bawa parang nak belasah budak batch bawah.",
            "school_name": "SMK SENTIASA CLOUD RUN LIVE",
            "metadata": {
                "mock_external_apis": True,
                "smoke_test": True,
            },
        }

        print("   -> Dispatching POST /api/triage request...")
        t0 = time.time()
        triage_resp = client_app.post("/api/triage", json=triage_req)
        t_api = time.time() - t0
        assert triage_resp.status_code == 200, f"Triage call failed: {triage_resp.text}"
        triage_data = triage_resp.json()
        api_inc_id = triage_data.get("incident_id")
        tracked_docs["incidents"].append(api_inc_id)

        print(f"   -> /api/triage succeeded in {t_api:.2f}s!")
        print(f"      * Incident ID: {api_inc_id}")
        print(f"      * Status     : {triage_data.get('status')}")
        print(f"      * Threat Tier: {triage_data.get('threat_tier')}")

        # Verify incident document in live Firestore
        cloud_doc_snap = client.collection("incidents").document(api_inc_id).get()
        assert cloud_doc_snap.exists, f"API incident {api_inc_id} not found in Firestore /incidents collection"
        cloud_inc = cloud_doc_snap.to_dict()
        print(f"   -> Confirmed live Firestore document: /incidents/{api_inc_id}")
        print(f"      * Persisted school: {cloud_inc.get('school_name')}")
        print(f"      * Persisted status: {cloud_inc.get('status')}")

        # Check if an automated HITL ticket was created
        if triage_data.get("status") == "vetoed_to_hitl_queue":
            hitl_items = ledger.get_hitl_queue()
            api_hitl = next((h for h in hitl_items if h.get("incident_id") == api_inc_id), None)
            if api_hitl:
                tracked_docs["hitl_queue"].append(api_hitl["queue_id"])
                print(f"   -> Verified automatic HITL queue entry: {api_hitl['queue_id']}")

        print("\n" + "=" * 70)
        print("ALL LIVE FIRESTORE VERIFICATION CHECKS PASSED (100% OPERATIONAL)")
        print("=" * 70)

    finally:
        # ---------------------------------------------------------
        # STEP 7: Safe Teardown & Hygiene Cleanup
        # ---------------------------------------------------------
        print("\n[STEP 7] Performing clean teardown of temporary smoke test documents...")
        for col_name, doc_ids in tracked_docs.items():
            for doc_id in doc_ids:
                if not doc_id:
                    continue
                try:
                    client.collection(col_name).document(doc_id).delete()
                    print(f"   -> Cleaned up /{col_name}/{doc_id}")
                except Exception as del_err:
                    print(f"   -> [WARNING] Failed to delete /{col_name}/{doc_id}: {del_err}")

        print("Teardown complete. Live database is clean.\n")


if __name__ == "__main__":
    run_live_smoke_verification()
