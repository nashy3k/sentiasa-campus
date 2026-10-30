"""
Unit and integration tests for Multilingual and Decoupled Semantic Triage in Project SENTIASA.
Validates:
1. Pure English physical assault / battery narratives with zero local slang tokens.
2. Borneo regional dialect bullying & battery (Sabah & Sarawak: antam, paloi).
3. Malaysian Chinese vernacular (SJKC: 围殴, 巴冷刀).
4. Malaysian Tamil vernacular (SJKT: கத்தி, தாக்குதல்).
5. Jawi script assault threats (ڤارڠ, بلاساه).
6. Robustness against false positives (polysemous food and casual banter).
"""

import unittest
from backend.graph import run_triage
from backend.jev_contracts import ThreatTier


class TestMultilingualSemanticTriage(unittest.TestCase):
    """Verifies that the decoupled semantic reasoner and multi-vernacular glossary protect against blindspots."""

    def test_pure_english_assault_without_slang_escalates_to_critical(self):
        """Pure English descriptive narrative with battery and choking must escalate to CRITICAL."""
        text = "Two seniors cornered a Form 1 student in the toilet, choked him until he could not breathe, and stole his wallet"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")

    def test_borneo_sabahan_sarawakian_slang_escalates(self):
        """Sabah/Sarawak vernacular ('antam budak paloi sampai patah') must resolve to severe battery."""
        text = "Budak tu paloi, petang ni kita antam dia sampai patah"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")

    def test_chinese_sjkc_machete_assault_escalates(self):
        """Malaysian Chinese vernacular ('放学后在后巷围殴他，带巴冷刀') must resolve to bladed assault."""
        text = "放学后在后巷围殴他，带巴冷刀"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")

    def test_tamil_sjkt_knife_attack_escalates(self):
        """Malaysian Tamil vernacular ('பள்ளிக்குப் பிறகு அவனைக் கத்தியால் தாக்குவோம்') must resolve to bladed assault."""
        text = "பள்ளிக்குப் பிறகு அவனைக் கத்தியால் தாக்குவோம்"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")

    def test_jawi_script_parang_threat_escalates(self):
        """Jawi script threat ('ڤارڠ دان بلاساه بودق ايت') must resolve to critical physical altercation."""
        text = "ڤارڠ دان بلاساه بودق ايت"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")

    def test_peninsular_malay_slang_tibai_escalates(self):
        """Peninsular slang 'tibai sampai renyuk' must resolve to critical physical altercation."""
        text = "Budak tu bikin panas, jom tibai dia sampai renyuk"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")

    def test_safe_food_takeaway_remains_low(self):
        """Colloquial 'tapau nasi lemak' must remain benign Tier 1 LOW."""
        text = "Lepas kelas jom bungkus tapau nasi lemak kat kafe."
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_1_LOW.value)
        self.assertEqual(res.get("severity_tier"), 1)
        self.assertEqual(res.get("incident_type"), "general_sentiment")

    def test_malay_molest_and_sextortion_escalates_to_critical(self):
        """Malay molestation ('raba') and sextortion ('sebar video bogel') must resolve to CRITICAL sexual_assault."""
        text_molest = "Senior raba budak tingkatan 1 dalam tandas perempuan"
        res_molest = run_triage(text_molest, metadata={"mock_external_apis": True})
        self.assertEqual(res_molest.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_molest.get("incident_type"), "sexual_assault")

        text_sextort = "Dia ugut nak sebar video bogel kalau tak bagi duit"
        res_sextort = run_triage(text_sextort, metadata={"mock_external_apis": True})
        self.assertEqual(res_sextort.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_sextort.get("severity_tier"), 5)
        self.assertEqual(res_sextort.get("incident_type"), "sexual_assault")

    def test_english_and_multilingual_rape_threat_escalates_to_critical(self):
        """English, Chinese, Tamil, and Jawi sexual assault threats must escalate to CRITICAL."""
        # English descriptive assault
        res_en = run_triage("A student was sexually assaulted behind the school hall", metadata={"mock_external_apis": True})
        self.assertEqual(res_en.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_en.get("incident_type"), "sexual_assault")

        # Chinese SJKC rape threat
        res_zh = run_triage("放学后威逼她脱衣服要强奸她", metadata={"mock_external_apis": True})
        self.assertEqual(res_zh.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_zh.get("severity_tier"), 5)
        self.assertEqual(res_zh.get("incident_type"), "sexual_assault")

        # Tamil SJKT sexual assault
        res_ta = run_triage("பள்ளி விடுதியில் பாலியல் துன்புறுத்தல் நடந்தது", metadata={"mock_external_apis": True})
        self.assertEqual(res_ta.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_ta.get("incident_type"), "sexual_assault")

        # Jawi rape
        res_jw = run_triage("روݢول بودق د بلاک بي", metadata={"mock_external_apis": True})
        self.assertEqual(res_jw.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_jw.get("severity_tier"), 5)
        self.assertEqual(res_jw.get("incident_type"), "sexual_assault")

    def test_tagalog_suluk_coastal_stabbing_and_brawl_threat_escalates(self):
        """Tagalog/Suluk East Sabah loanwords ('patay ka nanti ada baril nak saksak') must escalate to CRITICAL."""
        text = "Patay ka nanti, budak tu bawa baril mau saksak kat luar pagar"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("severity_tier"), 5)
        self.assertEqual(res.get("incident_type"), "physical_altercation")
        self.assertIn("saksak", res.get("extracted_slang_tokens", []))
        self.assertIn("baril", res.get("extracted_slang_tokens", []))

    def test_tagalog_suluk_fistfight_bugbog_escalates(self):
        """Tagalog/Suluk fistfight challenge ('geng sana ajak suntukan nak bugbog') must resolve to physical altercation."""
        text = "Geng blok C ajak suntukan nak bugbog budak baru petang ni"
        res = run_triage(text, metadata={"mock_external_apis": True})
        self.assertEqual(res.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res.get("incident_type"), "physical_altercation")
        self.assertIn("suntukan", res.get("extracted_slang_tokens", []))
        self.assertIn("bugbog", res.get("extracted_slang_tokens", []))

    def test_borneo_sarawakian_tetak_and_distress_escalates(self):
        """Sarawakian bladed weapon threat ('tetak parang') and distress ideation ('kelar tangan') must escalate."""
        text_weapon = "Mun sidak kacau lagik kamek tetak dengan parang barung"
        res_weapon = run_triage(text_weapon, metadata={"mock_external_apis": True})
        self.assertEqual(res_weapon.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_weapon.get("severity_tier"), 5)
        self.assertEqual(res_weapon.get("incident_type"), "physical_altercation")
        self.assertIn("tetak", res_weapon.get("extracted_slang_tokens", []))

        text_distress = "Kamek nang sik tahan dah rasa maok kelar tangan"
        res_distress = run_triage(text_distress, metadata={"mock_external_apis": True})
        self.assertEqual(res_distress.get("threat_tier"), ThreatTier.TIER_3_CRITICAL.value)
        self.assertEqual(res_distress.get("incident_type"), "self_harm")
        self.assertIn("kelar tangan", res_distress.get("extracted_slang_tokens", []))


if __name__ == "__main__":
    unittest.main()

