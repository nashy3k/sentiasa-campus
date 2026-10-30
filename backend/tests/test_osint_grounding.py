"""
Deterministic Unit & Integration Test Suite for Dual-Funnel OSINT Engine.
Verifies Tavily domain-scoping, Exa neural highlights, platform detection,
bi-temporal freshness validation, direct URL thread extraction, and FastAPI endpoints.
Runs 100% deterministically with mock modes (<1s execution).
"""

import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.graph import run_triage
from backend.main import app
from backend.nodes.osint_nodes import (
    DEFAULT_OSINT_TARGET_DOMAINS,
    TARGETED_YOUTH_FORUMS,
    TARGETED_YOUTH_SUBREDDITS,
    detect_platform,
    extract_thread_content_from_url,
    parse_publication_date,
    search_dual_funnel_osint,
    validate_bitemporal_freshness,
)


class TestOSINTDomainRegistryAndPlatformDetection(unittest.TestCase):
    """Verifies that targeted domain lists and platform classifiers correctly scope youth spaces."""

    def test_targeted_domains_include_core_youth_nodes(self):
        self.assertIn("reddit.com/r/malaysiauni", TARGETED_YOUTH_SUBREDDITS)
        self.assertIn("reddit.com/r/bolehland", TARGETED_YOUTH_SUBREDDITS)
        self.assertIn("reddit.com/r/malaysia", TARGETED_YOUTH_SUBREDDITS)
        self.assertIn("reddit.com/r/spm", TARGETED_YOUTH_SUBREDDITS)
        self.assertIn("forum.lowyat.net", TARGETED_YOUTH_FORUMS)
        self.assertIn("reddit.com/r/malaysiauni", DEFAULT_OSINT_TARGET_DOMAINS)
        self.assertIn("forum.lowyat.net", DEFAULT_OSINT_TARGET_DOMAINS)

    def test_detect_platform_reddit_subreddits(self):
        self.assertEqual(
            detect_platform("https://www.reddit.com/r/malaysiauni/comments/abc/ragging_complaint/"),
            "reddit_malaysiauni",
        )
        self.assertEqual(
            detect_platform("https://reddit.com/r/bolehland/comments/xyz/budak_asrama_gaduh/"),
            "reddit_bolehland",
        )
        self.assertEqual(
            detect_platform("https://www.reddit.com/r/spm/comments/123/sejarah_leak/"),
            "reddit_spm",
        )
        self.assertEqual(
            detect_platform("https://reddit.com/r/malaysians/comments/456/roommate_conflict/"),
            "reddit_malaysians",
        )

    def test_detect_platform_forums_and_news(self):
        self.assertEqual(
            detect_platform("https://forum.lowyat.net/topic/5432100"),
            "lowyat_forum",
        )
        self.assertEqual(
            detect_platform("https://www.hmetro.com.my/mutakhir/2026/09/buli-asrama"),
            "malaysian_press",
        )
        self.assertEqual(
            detect_platform("https://t.me/s/uitm_confessions/105"),
            "telegram",
        )
        self.assertEqual(
            detect_platform("https://example.com/some_article"),
            "web",
        )


class TestBiTemporalFreshnessValidation(unittest.TestCase):
    """Verifies that stale historical rumors are blocked from corroborating active emergency alerts."""

    def setUp(self):
        self.now = datetime.now(timezone.utc)

    def test_parse_publication_date_iso_and_ymd(self):
        iso_str = "2026-09-20T14:30:00Z"
        parsed = parse_publication_date(iso_str)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed.year, 2026)
        self.assertEqual(parsed.month, 9)
        self.assertEqual(parsed.day, 20)

        ymd_str = "2026-08-15"
        parsed_ymd = parse_publication_date(ymd_str)
        self.assertIsNotNone(parsed_ymd)
        self.assertEqual(parsed_ymd.month, 8)

    def test_fresh_post_within_90_days_passes(self):
        recent_date = (self.now - timedelta(days=5)).isoformat()
        is_fresh = validate_bitemporal_freshness(
            published_date_str=recent_date,
            reference_timestamp=self.now,
            max_age_days=90,
        )
        self.assertTrue(is_fresh)

    def test_stale_post_older_than_90_days_fails(self):
        stale_date = (self.now - timedelta(days=120)).isoformat()
        is_fresh = validate_bitemporal_freshness(
            published_date_str=stale_date,
            reference_timestamp=self.now,
            max_age_days=90,
        )
        self.assertFalse(is_fresh)

    def test_historical_post_from_2021_fails(self):
        ancient_date = "2021-03-15T08:00:00Z"
        is_fresh = validate_bitemporal_freshness(
            published_date_str=ancient_date,
            reference_timestamp=self.now,
            max_age_days=90,
        )
        self.assertFalse(is_fresh)


class TestDualFunnelSearchAndURLExtraction(unittest.TestCase):
    """Verifies dual-engine search orchestration and URL content extraction."""

    def test_search_dual_funnel_osint_mock_mode(self):
        result = search_dual_funnel_osint(
            query="hostel senior intimidation",
            incident_type="physical_altercation",
            mock_mode=True,
        )
        self.assertTrue(result["fresh_corroboration"])
        evidence = result["evidence"]
        self.assertGreaterEqual(len(evidence), 2)

        platforms = [e["platform"] for e in evidence]
        self.assertIn("reddit_malaysiauni", platforms)
        self.assertIn("lowyat_forum", platforms)

        citations = result["citations"]
        self.assertIn("https://www.reddit.com/r/malaysiauni/comments/mock_incident", citations)

    def test_extract_thread_content_from_url_fallback(self):
        """When keys are absent or invalid, returns structured fallback without crashing."""
        fallback = extract_thread_content_from_url(
            "https://forum.lowyat.net/topic/12345",
            tavily_api_key="",
            exa_api_key="",
        )
        self.assertIn("url", fallback)
        self.assertEqual(fallback["platform"], "lowyat_forum")
        self.assertFalse(fallback["success"])


class TestLangGraphOSINTIntegration(unittest.TestCase):
    """Verifies end-to-end integration of OSINT evidence inside the LangGraph state engine."""

    def test_triage_graph_populates_osint_evidence_and_citations(self):
        raw_text = "Budak hostel tapau junior sebab tak hormat senior."
        result = run_triage(
            raw_text,
            metadata={
                "school_name": "Kolej Vokasional Sentiasa",
                "reporter_alias": "Whistleblower_99",
                "mock_external_apis": True,
            },
        )

        self.assertIn("osint_evidence", result)
        self.assertGreaterEqual(len(result["osint_evidence"]), 1)
        self.assertIn("external_citations", result)
        self.assertGreaterEqual(len(result["external_citations"]), 1)

        # Confirm citations point to youth social domains
        any_social_citation = any(
            "reddit.com" in c or "lowyat.net" in c for c in result["external_citations"]
        )
        self.assertTrue(any_social_citation)

    def test_triage_graph_with_target_url_extraction(self):
        """Passing a target_url augments raw_text with extracted thread content."""
        result = run_triage(
            "Check this thread out",
            metadata={
                "target_url": "https://www.reddit.com/r/malaysiauni/comments/harassment_case",
                "mock_external_apis": True,
            },
        )
        self.assertIsNotNone(result.get("status"))
        self.assertIsNotNone(result.get("normalized_text"))


class TestFastAPIOSINTEndpoints(unittest.TestCase):
    """Verifies REST API exposure of OSINT discovery and direct thread extraction."""

    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint_reports_targeted_domains(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("targeted_subreddits", data)
        self.assertIn("reddit.com/r/malaysiauni", data["targeted_subreddits"])
        self.assertIn("forum.lowyat.net", data["targeted_forums"])

    def test_health_endpoint_reports_osint_engines(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("tavily_active", data)
        self.assertIn("exa_active", data)

    def test_api_osint_search_endpoint_mock(self):
        resp = self.client.post(
            "/api/osint/search",
            json={
                "query": "senior buli junior asrama",
                "incident_type": "physical_altercation",
                "mock_mode": True,
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["fresh_corroboration"])
        self.assertGreaterEqual(len(data["evidence"]), 2)

    def test_api_osint_extract_url_endpoint(self):
        resp = self.client.post(
            "/api/osint/extract-url",
            json={"url": "https://forum.lowyat.net/topic/998877"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["platform"], "lowyat_forum")


if __name__ == "__main__":
    unittest.main()
