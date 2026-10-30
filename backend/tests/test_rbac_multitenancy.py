"""
Unit & Integration tests for Objective 1, 2, 3:
- Multi-Tenancy & RBAC Architecture
- Sovereign Operator Roles & Permission Boundaries
- OSINT Configuration Persistence & Dynamic Scoping
"""

import unittest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import (
    OperatorRole,
    Permission,
    ROLE_PERMISSIONS,
    Tenant,
    has_permission,
)
from backend.storage.ledger import InMemoryLedger, get_ledger


class TestRBACPermissions(unittest.TestCase):
    """Verifies strict operator role capability matrix."""

    def test_super_admin_has_all_permissions(self):
        for perm in Permission:
            self.assertTrue(
                has_permission(OperatorRole.SUPER_ADMIN, perm),
                f"SUPER_ADMIN should have {perm}",
            )

    def test_head_counselor_capabilities(self):
        # Allowed
        self.assertTrue(has_permission(OperatorRole.HEAD_COUNSELOR, Permission.TRIAGE_INCIDENT))
        self.assertTrue(has_permission(OperatorRole.HEAD_COUNSELOR, Permission.REVIEW_HITL_QUEUE))
        self.assertTrue(has_permission(OperatorRole.HEAD_COUNSELOR, Permission.VIEW_RADAR_GRAPH))
        # Restricted
        self.assertFalse(has_permission(OperatorRole.HEAD_COUNSELOR, Permission.MANAGE_OSINT))
        self.assertFalse(has_permission(OperatorRole.HEAD_COUNSELOR, Permission.REGISTER_SLANG))
        self.assertFalse(has_permission(OperatorRole.HEAD_COUNSELOR, Permission.DISPATCH_CRITICAL_ALERT))

    def test_discipline_master_capabilities(self):
        # Allowed
        self.assertTrue(has_permission(OperatorRole.DISCIPLINE_MASTER, Permission.DISPATCH_CRITICAL_ALERT))
        self.assertTrue(has_permission(OperatorRole.DISCIPLINE_MASTER, Permission.DEMERIT_RECORDS))
        self.assertTrue(has_permission(OperatorRole.DISCIPLINE_MASTER, Permission.VIEW_RADAR_GRAPH))
        # Restricted
        self.assertFalse(has_permission(OperatorRole.DISCIPLINE_MASTER, Permission.MANAGE_OSINT))
        self.assertFalse(has_permission(OperatorRole.DISCIPLINE_MASTER, Permission.REGISTER_SLANG))

    def test_campus_security_capabilities(self):
        # Allowed
        self.assertTrue(has_permission(OperatorRole.CAMPUS_SECURITY, Permission.CCTV_MONITORING))
        self.assertTrue(has_permission(OperatorRole.CAMPUS_SECURITY, Permission.PHYSICAL_ALERT_ACK))
        self.assertTrue(has_permission(OperatorRole.CAMPUS_SECURITY, Permission.VIEW_RADAR_GRAPH))
        # Restricted
        self.assertFalse(has_permission(OperatorRole.CAMPUS_SECURITY, Permission.MANAGE_OSINT))
        self.assertFalse(has_permission(OperatorRole.CAMPUS_SECURITY, Permission.DISPATCH_CRITICAL_ALERT))

    def test_student_reporter_strict_intake_only(self):
        # Allowed intake submission
        self.assertTrue(has_permission(OperatorRole.STUDENT_REPORTER, Permission.SUBMIT_INTAKE))
        # Locked radar/graph & admin controls
        self.assertFalse(has_permission(OperatorRole.STUDENT_REPORTER, Permission.VIEW_RADAR_GRAPH))
        self.assertFalse(has_permission(OperatorRole.STUDENT_REPORTER, Permission.MANAGE_OSINT))
        self.assertFalse(has_permission(OperatorRole.STUDENT_REPORTER, Permission.REGISTER_SLANG))
        self.assertFalse(has_permission(OperatorRole.STUDENT_REPORTER, Permission.DISPATCH_CRITICAL_ALERT))
        self.assertFalse(has_permission(OperatorRole.STUDENT_REPORTER, Permission.REVIEW_HITL_QUEUE))


class TestRBACAndOSINTEndpoints(unittest.TestCase):
    """Verifies FastAPI endpoints enforcing RBAC headers and multi-tenant partitioning."""

    def setUp(self):
        self.client = TestClient(app)
        self.ledger = get_ledger()
        self.ledger.clear()

    def test_get_roles_endpoint(self):
        res = self.client.get("/api/auth/roles")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        roles = data.get("roles", [])
        role_ids = [r["id"] for r in roles]
        self.assertIn("SUPER_ADMIN", role_ids)
        self.assertIn("HEAD_COUNSELOR", role_ids)
        self.assertIn("DISCIPLINE_MASTER", role_ids)
        self.assertIn("CAMPUS_SECURITY", role_ids)
        self.assertIn("STUDENT_REPORTER", role_ids)

    def test_get_tenants_endpoint(self):
        res = self.client.get("/api/tenants")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data.get("default_tenant"), ("smk-seksyen-11", "smk-sentiasa"))
        self.assertTrue(len(data.get("tenants", [])) >= 1)

    def test_get_osint_settings(self):
        res = self.client.get("/api/settings/osint?tenant_id=smk-sentiasa")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        settings = data.get("settings", {})
        self.assertTrue(settings.get("tavily_enabled"))
        self.assertTrue(settings.get("exa_enabled"))
        self.assertIn("target_domains", settings)

    def test_post_osint_settings_authorized_super_admin(self):
        payload = {
            "tenant_id": "smk-sentiasa",
            "tavily_enabled": False,
            "exa_enabled": True,
            "max_results": 5,
            "recency_days": 30,
            "target_domains": [
                {"domain": "reddit.com/r/malaysiauni", "name": "r/malaysiauni", "category": "higher_ed", "tier": 1, "enabled": True},
                {"domain": "reddit.com/r/bolehland", "name": "r/bolehland", "category": "youth", "tier": 1, "enabled": False},
            ],
        }
        res = self.client.post(
            "/api/settings/osint",
            json=payload,
            headers={"X-Operator-Role": "SUPER_ADMIN"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        saved = data.get("settings", {})
        self.assertFalse(saved.get("tavily_enabled"))
        self.assertEqual(saved.get("max_results"), 5)
        self.assertEqual(saved.get("recency_days"), 30)

    def test_post_osint_settings_forbidden_for_head_counselor(self):
        payload = {"tavily_enabled": False}
        res = self.client.post(
            "/api/settings/osint",
            json=payload,
            headers={"X-Operator-Role": "HEAD_COUNSELOR"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized", res.json().get("detail", ""))

    def test_post_osint_settings_forbidden_for_student_reporter(self):
        payload = {"tavily_enabled": False}
        res = self.client.post(
            "/api/settings/osint",
            json=payload,
            headers={"X-Operator-Role": "STUDENT_REPORTER"},
        )
        self.assertEqual(res.status_code, 403)

    def test_add_slang_token_restricted_to_super_admin(self):
        # 1. Non-super admin should fail with 403
        bad_res = self.client.post(
            "/api/slang-glossary",
            json={
                "token": "rempit_test",
                "meaning": "Motorcycle racer",
                "tier": "TIER_2_ELEVATED",
            },
            headers={"X-Operator-Role": "HEAD_COUNSELOR"},
        )
        self.assertEqual(bad_res.status_code, 403)

        # 2. Super admin succeeds
        good_res = self.client.post(
            "/api/slang-glossary",
            json={
                "token": "rempit_test",
                "meaning": "Motorcycle racer illegal stunt",
                "tier": "TIER_2_ELEVATED",
            },
            headers={"X-Operator-Role": "SUPER_ADMIN"},
        )
        self.assertEqual(good_res.status_code, 200)
        self.assertEqual(good_res.json()["token"], "rempit_test")

    def test_dispatch_critical_alert_rbac(self):
        # 1. Head counselor cannot dispatch critical alert
        denied_res = self.client.post(
            "/api/alerts/dispatch-critical",
            json={"incident_id": "inc_threat_01", "action_type": "TRIGGER_CAMPUS_DISPATCH"},
            headers={"X-Operator-Role": "HEAD_COUNSELOR"},
        )
        self.assertEqual(denied_res.status_code, 403)

        # 2. Student reporter cannot dispatch critical alert
        denied_res2 = self.client.post(
            "/api/alerts/dispatch-critical",
            json={"incident_id": "inc_threat_01", "action_type": "TRIGGER_CAMPUS_DISPATCH"},
            headers={"X-Operator-Role": "STUDENT_REPORTER"},
        )
        self.assertEqual(denied_res2.status_code, 403)

        # 3. Discipline Master CAN dispatch critical alert
        allowed_dm = self.client.post(
            "/api/alerts/dispatch-critical",
            json={"incident_id": "inc_threat_01", "action_type": "TRIGGER_CAMPUS_DISPATCH"},
            headers={"X-Operator-Role": "DISCIPLINE_MASTER"},
        )
        self.assertEqual(allowed_dm.status_code, 200)
        self.assertEqual(allowed_dm.json()["status"], "dispatched")

        # 4. Super Admin CAN dispatch critical alert
        allowed_sa = self.client.post(
            "/api/alerts/dispatch-critical",
            json={"incident_id": "inc_threat_02", "action_type": "TRIGGER_CAMPUS_DISPATCH"},
            headers={"X-Operator-Role": "SUPER_ADMIN"},
        )
        self.assertEqual(allowed_sa.status_code, 200)
        self.assertEqual(allowed_sa.json()["status"], "dispatched")

    def test_hitl_queue_multi_tenant_aggregation(self):
        from backend.storage.ledger import get_ledger
        ledger = get_ledger()

        # Enqueue item in tenant partition
        q1 = ledger.enqueue_hitl({
            "incident_id": "inc_tenant_test_1",
            "threat_summary": "Tenant test threat",
            "review_status": "PENDING_HUMAN_TRIAGE",
        }, tenant_id="smk-sentiasa")

        # Enqueue item in root/default
        q2 = ledger.enqueue_hitl({
            "incident_id": "inc_tenant_test_2",
            "threat_summary": "Root test threat",
            "review_status": "PENDING_HUMAN_TRIAGE",
        }, tenant_id="default")

        # Fetch via GET /api/hitl/queue with X-Tenant-ID header
        res = self.client.get(
            "/api/hitl/queue",
            headers={"X-Tenant-ID": "smk-sentiasa"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("queue", data)
        q_ids = [item.get("queue_id") for item in data["queue"]]
        self.assertIn(q1, q_ids)
        self.assertIn(q2, q_ids)

        # Test resolving with tenant header
        res_resolve = self.client.post(
            "/api/hitl/resolve",
            json={
                "queue_id": q1,
                "decision": "APPROVE_ESCALATION",
                "reviewer_notes": "Counselor verified aggregate ticket",
            },
            headers={"X-Tenant-ID": "smk-sentiasa"},
        )
        self.assertEqual(res_resolve.status_code, 200)
        self.assertEqual(res_resolve.json()["status"], "resolved")
        self.assertEqual(res_resolve.json()["tenant_id"], "smk-sentiasa")
