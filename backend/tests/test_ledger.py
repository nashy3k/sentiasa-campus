"""
Unit and integration test suite for Section 9.4 & 9.5:
Dual-Mode Firestore Persistence Adapter and Multi-Turn Context Pruning.
"""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.main import (
    ChatMessage,
    app,
    prune_context_sliding_window,
)
from backend.storage.ledger import (
    FirestoreLedger,
    InMemoryLedger,
    _sanitize_for_firestore,
    get_ledger,
)


class TestInMemoryLedger(unittest.TestCase):
    """Verifies InMemoryLedger operations for local offline testing."""

    def setUp(self):
        self.ledger = InMemoryLedger()

    def test_record_and_get_incident(self):
        incident_id = self.ledger.record_incident({
            "incident_id": "inc_test_001",
            "status": "vetoed_to_hitl_queue",
            "severity_tier": 5,
            "threat_tier": "CRITICAL",
            "slang_tokens": ["parang", "belasah"],
        })
        self.assertEqual(incident_id, "inc_test_001")

        retrieved = self.ledger.get_incident("inc_test_001")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["severity_tier"], 5)
        self.assertEqual(retrieved["threat_tier"], "CRITICAL")
        self.assertIn("created_at", retrieved)

    def test_list_incidents_ordering(self):
        self.ledger.record_incident({"incident_id": "inc_1", "created_at": "2026-10-01T10:00:00Z"})
        self.ledger.record_incident({"incident_id": "inc_2", "created_at": "2026-10-01T11:00:00Z"})

        incidents = self.ledger.list_incidents(limit=10)
        self.assertEqual(len(incidents), 2)
        # Should be ordered descending (newest first)
        self.assertEqual(incidents[0]["incident_id"], "inc_2")
        self.assertEqual(incidents[1]["incident_id"], "inc_1")

    def test_enqueue_and_resolve_hitl(self):
        qid = self.ledger.enqueue_hitl({
            "queue_id": "hitl_001",
            "incident_id": "inc_test_001",
            "suggested_action": "TRIGGER_CAMPUS_DISPATCH",
            "veto_reason": "SHACL-GOV-01: Critical dispatch requires counselor approval",
        })
        self.assertEqual(qid, "hitl_001")

        queue = self.ledger.get_hitl_queue(status="PENDING_HUMAN_TRIAGE")
        self.assertEqual(len(queue), 1)
        self.assertEqual(queue[0]["queue_id"], "hitl_001")

        # Resolve
        success = self.ledger.resolve_hitl("hitl_001", decision="APPROVE_ESCALATION", reviewer_notes="Confirmed via CCTV")
        self.assertTrue(success)

        # Confirm updated status
        pending = self.ledger.get_hitl_queue(status="PENDING_HUMAN_TRIAGE")
        self.assertEqual(len(pending), 0)

        all_items = self.ledger.get_hitl_queue()
        self.assertEqual(len(all_items), 1)
        self.assertEqual(all_items[0]["review_status"], "APPROVE_ESCALATION")
        self.assertEqual(all_items[0]["reviewer_notes"], "Confirmed via CCTV")
        self.assertIn("resolved_at", all_items[0])

    def test_record_and_get_audit_log(self):
        self.ledger.record_audit({
            "audit_id": "aud_001",
            "incident_id": "inc_test_001",
            "event": "SHACL_INVARIANT_EVALUATED",
            "passed": False,
        })
        logs = self.ledger.get_audit_log(incident_id="inc_test_001")
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["audit_id"], "aud_001")
        self.assertEqual(logs[0]["passed"], False)

    def test_clear_resets_all_collections(self):
        self.ledger.record_incident({"incident_id": "inc_1"})
        self.ledger.enqueue_hitl({"queue_id": "hitl_1"})
        self.ledger.record_audit({"audit_id": "aud_1"})

        self.ledger.clear()
        self.assertIsNone(self.ledger.get_incident("inc_1"))
        self.assertEqual(len(self.ledger.get_hitl_queue()), 0)
        self.assertEqual(len(self.ledger.get_audit_log()), 0)


class TestFirestoreLedgerMocked(unittest.TestCase):
    """Verifies FirestoreLedger schema mappings and document interactions via mock Firestore client."""

    def setUp(self):
        self.mock_client = MagicMock()
        self.mock_collection = MagicMock()
        self.mock_doc = MagicMock()

        self.mock_client.collection.return_value = self.mock_collection
        self.mock_collection.document.return_value = self.mock_doc

        self.ledger = FirestoreLedger(
            project_id="modified-argon-471003-i3",
            database_id="(default)",
            client=self.mock_client,
        )

    def test_record_incident_calls_firestore_set(self):
        data = {
            "incident_id": "inc_cloud_01",
            "severity_tier": 4,
            "threat_tier": "ELEVATED",
            "cytoscape_elements": [{"data": {"id": "node1"}}],
        }
        res_id = self.ledger.record_incident(data)
        self.assertEqual(res_id, "inc_cloud_01")
        self.mock_client.collection.assert_called_with("incidents")
        self.mock_collection.document.assert_called_with("inc_cloud_01")
        self.mock_doc.set.assert_called_once()
        saved_dict = self.mock_doc.set.call_args[0][0]
        self.assertEqual(saved_dict["severity_tier"], 4)
        self.assertEqual(saved_dict["threat_tier"], "ELEVATED")

    def test_enqueue_hitl_calls_firestore_set(self):
        data = {
            "queue_id": "hitl_cloud_01",
            "incident_id": "inc_cloud_01",
            "review_status": "PENDING_HUMAN_TRIAGE",
        }
        res_id = self.ledger.enqueue_hitl(data)
        self.assertEqual(res_id, "hitl_cloud_01")
        self.mock_client.collection.assert_called_with("hitl_queue")
        self.mock_collection.document.assert_called_with("hitl_cloud_01")
        self.mock_doc.set.assert_called_once()

    def test_resolve_hitl_updates_document(self):
        snapshot_mock = MagicMock()
        snapshot_mock.exists = True
        self.mock_doc.get.return_value = snapshot_mock

        success = self.ledger.resolve_hitl(
            queue_id="hitl_cloud_01",
            decision="APPROVE_ESCALATION",
            reviewer_notes="Approved by Counselor Siti",
        )
        self.assertTrue(success)
        self.mock_doc.update.assert_called_once()
        update_args = self.mock_doc.update.call_args[0][0]
        self.assertEqual(update_args["review_status"], "APPROVE_ESCALATION")
        self.assertEqual(update_args["reviewer_notes"], "Approved by Counselor Siti")

    def test_sanitize_for_firestore_handles_nested_types(self):
        from backend.state import EvidenceNode
        sample = {
            "time": datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc),
            "tags": {"weapon", "parang"},
            "evidence": EvidenceNode(
                evidence_id="EVI-01",
                media_type="CCTV_KEYFRAME",
                source_uri="/cctv.mp4",
                sha256_hash="f" * 64,
            ),
        }
        clean = _sanitize_for_firestore(sample)
        self.assertEqual(clean["time"], "2026-10-01T12:00:00+00:00")
        self.assertIsInstance(clean["tags"], list)
        self.assertIn("weapon", clean["tags"])
        self.assertEqual(clean["evidence"]["evidence_id"], "EVI-01")


class TestFastAPILedgerIntegration(unittest.TestCase):
    """Verifies that FastAPI endpoints correctly interact with the ledger."""

    def setUp(self):
        self.client = TestClient(app)
        self.ledger = get_ledger()
        self.ledger.clear()

    def test_health_reports_storage_mode(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("storage_mode", data)
        self.assertIn("firestore_configured", data)

    def test_triage_and_hitl_flow_persists_to_ledger(self):
        # Submit critical report to trigger HITL
        resp = self.client.post("/api/triage", json={
            "raw_text": "Budak form 4 bawa parang nak belasah budak batch bawah.",
            "school_name": "SMK Sentiasa",
            "metadata": {"mock_external_apis": True},
        })
        self.assertEqual(resp.status_code, 200)
        triage_data = resp.json()
        self.assertEqual(triage_data["status"], "vetoed_to_hitl_queue")

        # Verify incident in ledger
        incidents = self.ledger.list_incidents()
        self.assertGreaterEqual(len(incidents), 1)

        # Verify HITL queue endpoint
        queue_resp = self.client.get("/api/hitl/queue")
        self.assertEqual(queue_resp.status_code, 200)
        queue_data = queue_resp.json()
        self.assertGreaterEqual(queue_data["count"], 1)
        target_qid = queue_data["queue"][0]["queue_id"]

        # Resolve HITL incident
        resolve_resp = self.client.post("/api/hitl/resolve", json={
            "queue_id": target_qid,
            "decision": "APPROVE_ESCALATION",
            "reviewer_notes": "Counselor verified situation.",
        })
        self.assertEqual(resolve_resp.status_code, 200)

        # Confirm queue reflects resolution
        queue_resp_after = self.client.get("/api/hitl/queue")
        self.assertEqual(queue_resp_after.json()["count"], 0)


class TestPolemicSlidingWindowContextPruning(unittest.TestCase):
    """Verifies token-budgeted sliding window context pruning for Task 9.5."""

    def test_single_turn_returns_verbatim(self):
        messages = [ChatMessage(role="user", content="Budak bawa parang")]
        result = prune_context_sliding_window(messages)
        self.assertEqual(result, "Budak bawa parang")

    def test_multi_turn_under_budget_combines_chronologically(self):
        messages = [
            ChatMessage(role="user", content="Turn 1: Ada pergaduhan"),
            ChatMessage(role="assistant", content="Sila beri maklumat"),
            ChatMessage(role="user", content="Turn 2: Diorang guna parang"),
        ]
        result = prune_context_sliding_window(messages, max_words=50)
        self.assertEqual(result, "Turn 1: Ada pergaduhan | Prior Context: Turn 2: Diorang guna parang")

    def test_multi_turn_over_budget_prunes_older_turns(self):
        long_turn = "word " * 100
        messages = [
            ChatMessage(role="user", content=f"Ancient history {long_turn}"),
            ChatMessage(role="user", content="Recent turn A"),
            ChatMessage(role="user", content="Recent turn B"),
        ]
        # Set max_words to 10 so ancient history turn is pruned
        result = prune_context_sliding_window(messages, max_words=10)
        self.assertNotIn("Ancient history", result)
        self.assertEqual(result, "Recent turn A | Prior Context: Recent turn B")


if __name__ == "__main__":
    unittest.main()
