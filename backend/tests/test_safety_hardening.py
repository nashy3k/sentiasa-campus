"""
Unit and integration tests for Task 9.8:
Backend Pre-Flight Safety Hardening (CORS, OWASP Security Headers, Upload Size Limits, and In-Memory Rate Limiting).
"""

import io
import os
import time
import unittest
from fastapi.testclient import TestClient

from backend.main import (
    MAX_SCREENSHOT_BYTES,
    MAX_VIDEO_BYTES,
    SlidingWindowRateLimiter,
    app,
    rate_limiter,
)


class TestOWASPSecurityHeaders(unittest.TestCase):
    """Verifies that all responses inject the required OWASP defensive security headers."""

    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint_contains_security_headers(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(resp.headers.get("x-frame-options"), "DENY")
        self.assertEqual(resp.headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(resp.headers.get("referrer-policy"), "strict-origin-when-cross-origin")

    def test_health_endpoint_contains_security_headers(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(resp.headers.get("x-frame-options"), "DENY")
        self.assertEqual(resp.headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(resp.headers.get("referrer-policy"), "strict-origin-when-cross-origin")


class TestCORSSecurity(unittest.TestCase):
    """Verifies CORS origin filtering behavior."""

    def setUp(self):
        self.client = TestClient(app)

    def test_authorized_origin_allowed(self):
        resp = self.client.options(
            "/api/triage",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("access-control-allow-origin"), "http://localhost:3000")

    def test_unauthorized_origin_rejected(self):
        resp = self.client.options(
            "/api/triage",
            headers={
                "Origin": "http://malicious-attacker.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        # Unauthorized origin should not receive Access-Control-Allow-Origin
        self.assertNotEqual(resp.headers.get("access-control-allow-origin"), "http://malicious-attacker.com")


class TestUploadFileSizeEnforcement(unittest.TestCase):
    """Verifies that uploaded screenshots > 5MB and videos > 25MB are rejected with HTTP 413."""

    def setUp(self):
        self.client = TestClient(app)

    def test_oversized_screenshot_rejected_with_413(self):
        # Create an in-memory byte stream that exceeds 5MB
        oversized_bytes = b"0" * (MAX_SCREENSHOT_BYTES + 1024)
        files = {
            "file": ("giant_screenshot.png", io.BytesIO(oversized_bytes), "image/png"),
        }
        resp = self.client.post("/api/triage/upload-screenshot", files=files)
        self.assertEqual(resp.status_code, 413)
        self.assertIn("Screenshot file size exceeds maximum 5MB limit", resp.json()["detail"])

    def test_valid_size_screenshot_accepted_format(self):
        # Valid tiny PNG (1x1 transparent PNG)
        tiny_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
            b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {
            "file": ("valid_chat.png", io.BytesIO(tiny_png), "image/png"),
        }
        resp = self.client.post("/api/triage/upload-screenshot", files=files, data={"mock_mode": True})
        # Should NOT fail with 413
        self.assertNotEqual(resp.status_code, 413)

    def test_oversized_video_rejected_with_413(self):
        # Create an in-memory byte stream that exceeds 25MB
        oversized_video = b"0" * (MAX_VIDEO_BYTES + 2048)
        files = {
            "file": ("giant_surveillance.mp4", io.BytesIO(oversized_video), "video/mp4"),
        }
        resp = self.client.post("/api/triage/upload-video", files=files)
        self.assertEqual(resp.status_code, 413)
        self.assertIn("Video file size exceeds maximum 25MB limit", resp.json()["detail"])


class TestSlidingWindowRateLimiting(unittest.TestCase):
    """Verifies thread-safe sliding window rate limiting."""

    def setUp(self):
        self.client = TestClient(app)
        rate_limiter.reset()

    def tearDown(self):
        rate_limiter.reset()
        os.environ.pop("FORCE_RATE_LIMITER", None)

    def test_limiter_allows_up_to_max_and_blocks_excess(self):
        limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=2.0)
        ip = "192.168.1.50"

        # Bypass disabled for unit test
        self.assertTrue(limiter.is_allowed(ip, bypass_pytest=False))
        self.assertTrue(limiter.is_allowed(ip, bypass_pytest=False))
        self.assertTrue(limiter.is_allowed(ip, bypass_pytest=False))

        # 4th request within window must be rejected
        self.assertFalse(limiter.is_allowed(ip, bypass_pytest=False))

        # Different IP must still be allowed
        self.assertTrue(limiter.is_allowed("192.168.1.51", bypass_pytest=False))

    def test_limiter_resets_after_window_expires(self):
        limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=0.2)
        ip = "10.0.0.1"

        self.assertTrue(limiter.is_allowed(ip, bypass_pytest=False))
        self.assertTrue(limiter.is_allowed(ip, bypass_pytest=False))
        self.assertFalse(limiter.is_allowed(ip, bypass_pytest=False))

        # Sleep past window
        time.sleep(0.25)
        self.assertTrue(limiter.is_allowed(ip, bypass_pytest=False))

    def test_api_triage_enforces_429_when_rate_limited(self):
        os.environ["FORCE_RATE_LIMITER"] = "true"
        original_max = rate_limiter.max_requests
        rate_limiter.max_requests = 2
        rate_limiter.reset()

        try:
            payload = {
                "raw_text": "Triage request 1",
                "metadata": {"mock_external_apis": True},
            }
            # Request 1
            r1 = self.client.post("/api/triage", json=payload)
            self.assertEqual(r1.status_code, 200)

            # Request 2
            r2 = self.client.post("/api/triage", json=payload)
            self.assertEqual(r2.status_code, 200)

            # Request 3 -> Rate limit exceeded
            r3 = self.client.post("/api/triage", json=payload)
            self.assertEqual(r3.status_code, 429)
            self.assertIn("Rate limit exceeded", r3.json()["detail"])
        finally:
            rate_limiter.max_requests = original_max
            rate_limiter.reset()
            os.environ.pop("FORCE_RATE_LIMITER", None)


class TestDynamicSlangGlossaryEndpoints(unittest.TestCase):
    """Verifies retrieval and dynamic registration of slang terms."""

    def setUp(self):
        self.client = TestClient(app)

    def test_get_slang_glossary(self):
        resp = self.client.get("/api/slang-glossary")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("glossary", data)
        self.assertIn("parang", data["glossary"])

    def test_add_slang_token_dynamic(self):
        payload = {
            "token": "test_gocoh_paroh",
            "meaning": "extreme fist fight in Kelantanese dialect",
            "severity_boost": 3,
            "tier": "TIER_3_CRITICAL",
            "dialect_category": "Kelantan Regional",
        }
        resp = self.client.post("/api/slang-glossary", json=payload)
        self.assertEqual(resp.status_code, 200)
        res_data = resp.json()
        self.assertEqual(res_data["status"], "success")
        self.assertEqual(res_data["token"], "test_gocoh_paroh")

        # Verify it is now in the glossary
        get_resp = self.client.get("/api/slang-glossary")
        self.assertIn("test_gocoh_paroh", get_resp.json()["glossary"])


if __name__ == "__main__":
    unittest.main()
