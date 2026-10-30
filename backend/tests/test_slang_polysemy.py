"""
Unit tests for Contextual Polysemy Disambiguation in Project SENTIASA (Phase 2.2).
Validates that double-entendre Malaysian youth slang words (tapau, pau, koyak)
are correctly disambiguated between benign colloquial context (food, stationery, banter)
and aggressive threat/distress context (assault, extortion, breakdown).
"""

import unittest
from backend.graph import run_triage
from backend.jev_contracts import ThreatTier
from backend.nodes.triage_nodes import disambiguate_slang_polysemy


class TestSlangPolysemyDisambiguation(unittest.TestCase):
    """Direct unit tests for the disambiguate_slang_polysemy heuristic engine."""

    def test_tapau_as_food_takeaway_is_benign(self):
        """'Bungkus tapau nasi lemak' must resolve to food takeaway with 0 severity boost."""
        res = disambiguate_slang_polysemy("tapau", "Bungkus tapau nasi lemak tepi jalan")
        self.assertFalse(res["is_threat"])
        self.assertEqual(res["category"], "food_takeaway")
        self.assertEqual(res["severity_boost"], 0)
        self.assertEqual(res["tier"], ThreatTier.TIER_1_LOW)
        self.assertIn("takeaway food", res["meaning"])

    def test_tapau_as_hostel_assault_is_threat(self):
        """'Budak hostel tapau budak form 2' must resolve to physical assault with elevated severity."""
        res = disambiguate_slang_polysemy("tapau", "Budak hostel tapau budak form 2")
        self.assertTrue(res["is_threat"])
        self.assertEqual(res["category"], "physical_altercation")
        self.assertGreaterEqual(res["severity_boost"], 2)
        self.assertEqual(res["tier"], ThreatTier.TIER_2_ELEVATED)
        self.assertIn("violently assaulted", res["meaning"])

    def test_pau_as_food_steamed_bun_is_benign(self):
        """'Makan pau ayam panas kat warung' must resolve to food with 0 severity boost."""
        res = disambiguate_slang_polysemy("pau", "Makan pau ayam panas kat warung")
        self.assertFalse(res["is_threat"])
        self.assertEqual(res["category"], "food_item")
        self.assertEqual(res["severity_boost"], 0)
        self.assertEqual(res["tier"], ThreatTier.TIER_1_LOW)

    def test_pau_as_extortion_is_threat(self):
        """'Senior pau duit belanja tiap hari kat pagar' must resolve to extortion."""
        res = disambiguate_slang_polysemy("pau", "Senior pau duit belanja tiap hari kat pagar sekolah")
        self.assertTrue(res["is_threat"])
        self.assertEqual(res["category"], "extortion")
        self.assertEqual(res["severity_boost"], 2)
        self.assertEqual(res["tier"], ThreatTier.TIER_2_ELEVATED)

    def test_koyak_as_material_tear_is_benign(self):
        """'Kertas soalan exam saya koyak' must resolve to material tear with 0 severity boost."""
        res = disambiguate_slang_polysemy("koyak", "Kertas soalan exam saya koyak cikgu")
        self.assertFalse(res["is_threat"])
        self.assertEqual(res["category"], "material_damage")
        self.assertEqual(res["severity_boost"], 0)
        self.assertEqual(res["tier"], ThreatTier.TIER_1_LOW)

    def test_koyak_as_mental_distress_is_threat(self):
        """'Koyak parah kena buli kat Twitter' must resolve to acute emotional distress."""
        res = disambiguate_slang_polysemy("koyak", "Koyak parah kena buli kat Twitter")
        self.assertTrue(res["is_threat"])
        self.assertEqual(res["category"], "emotional_distress")
        self.assertGreaterEqual(res["severity_boost"], 1)
        self.assertEqual(res["tier"], ThreatTier.TIER_2_ELEVATED)


class TestEndToEndPolysemyTriage(unittest.TestCase):
    """End-to-end integration tests verifying state graph triage with polysemous inputs."""

    def test_triage_food_tapau_keeps_tier_low(self):
        """Verifies that buying food does not trigger elevated incident escalation."""
        text = "Lepas kelas jom bungkus tapau nasi lemak kat kafe."
        result = run_triage(
            text,
            metadata={"school_name": "SMK Sentiasa", "mock_external_apis": True},
        )
        self.assertEqual(result["severity_tier"], 1)
        self.assertEqual(result["threat_tier"], "LOW")
        self.assertEqual(result["incident_type"], "general_sentiment")
        self.assertTrue(result["jev_passed"])
        # No urgent security alerts should be triggered for buying food
        self.assertIsNone(result.get("counselor_alert"))

    def test_triage_hostel_assault_tapau_escalates_properly(self):
        """Verifies that hostel assault using 'tapau' correctly escalates to elevated altercation."""
        text = "Budak hostel tapau budak form 2 semalam."
        result = run_triage(
            text,
            metadata={"school_name": "SMK Sentiasa", "mock_external_apis": True},
        )
        self.assertGreaterEqual(result["severity_tier"], 3)
        self.assertEqual(result["threat_tier"], "ELEVATED")
        self.assertEqual(result["incident_type"], "physical_altercation")
        self.assertTrue(result["jev_passed"])
        self.assertIsNotNone(result.get("counselor_alert"))

    def test_triage_canteen_pau_extortion_escalates(self):
        """Verifies that 'pau duit' correctly classifies as extortion and escalates."""
        text = "Budak senior asyik pau duit belanja aku kat belakang tandas."
        result = run_triage(
            text,
            metadata={"school_name": "SMK Sentiasa", "mock_external_apis": True},
        )
        self.assertGreaterEqual(result["severity_tier"], 3)
        self.assertEqual(result["threat_tier"], "ELEVATED")
        self.assertEqual(result["incident_type"], "extortion")
        self.assertTrue(result["jev_passed"])


if __name__ == "__main__":
    unittest.main()
