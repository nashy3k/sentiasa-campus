"""
Unit and integration tests for WhatsApp Screenshot OCR Ingest and Triage.
Verifies:
1. Synthetic PIL PNG image generation and decoding.
2. Parsing of chat bubbles into structured text, sender handles, and timestamps.
3. Successful execution through deterministic LangGraph run_triage() state engine.
4. FastAPI /api/triage/upload-screenshot endpoint functionality.
"""

import io
import unittest
from fastapi.testclient import TestClient
from PIL import Image

from backend.graph import run_triage
from backend.main import app
from backend.nodes.ocr_nodes import (
    create_synthetic_whatsapp_screenshot,
    extract_whatsapp_screenshot_text,
    parse_whatsapp_transcript,
)


class TestWhatsAppOCR(unittest.TestCase):
    """Verifies OCR image handling, transcript parsing, and triage execution."""

    def setUp(self):
        self.client = TestClient(app)
        self.sample_messages = [
            ("Azlan_Form4", "10:14 PM", "Budak form 4 bawa parang nak belasah budak batch bawah kat belakang kantin."),
            ("Anon_Prefect", "10:15 PM", "Diorang dah standby pau duit budak form 1 sekali."),
        ]
        self.synthetic_png_bytes = create_synthetic_whatsapp_screenshot(
            messages=self.sample_messages,
            contact_name="Batch Form 4 Alert Group",
            embed_metadata=True,
        )

    def test_parse_chat_bubbles_into_structured_data(self):
        """Verifies parsing of chat transcript strings into structured components."""
        transcript = (
            "[10:14 PM] Azlan_Form4: Budak form 4 bawa parang nak belasah budak batch bawah.\n"
            "[10:15 PM] Anon_Prefect: Diorang standby pau budak form 1."
        )
        parsed = parse_whatsapp_transcript(transcript)

        self.assertIn("extracted_text", parsed)
        self.assertEqual(len(parsed["messages"]), 2)
        self.assertEqual(parsed["senders"], ["Azlan_Form4", "Anon_Prefect"])
        self.assertEqual(parsed["timestamps"], ["10:14 PM", "10:15 PM"])

        msg_1 = parsed["messages"][0]
        self.assertEqual(msg_1["sender"], "Azlan_Form4")
        self.assertEqual(msg_1["timestamp"], "10:14 PM")
        self.assertIn("parang", msg_1["text"])

        msg_2 = parsed["messages"][1]
        self.assertEqual(msg_2["sender"], "Anon_Prefect")
        self.assertEqual(msg_2["timestamp"], "10:15 PM")
        self.assertIn("pau", msg_2["text"])

    def test_synthetic_pil_image_creation_and_ocr_extraction(self):
        """Verifies synthetic PIL image generation and extraction via extract_whatsapp_screenshot_text."""
        # Verify valid PIL image format and dimensions
        img = Image.open(io.BytesIO(self.synthetic_png_bytes))
        self.assertEqual(img.format, "PNG")
        self.assertEqual(img.size, (420, 600))

        # Run extraction
        ocr_result = extract_whatsapp_screenshot_text(
            image_bytes=self.synthetic_png_bytes,
            filename="whatsapp_batch_evidence.png",
            mock_mode=True,
        )

        self.assertIn("extracted_text", ocr_result)
        self.assertIn("parang", ocr_result["extracted_text"])
        self.assertIn("belasah", ocr_result["extracted_text"])
        self.assertIn("Azlan_Form4", ocr_result["senders"])
        self.assertEqual(ocr_result["image_metadata"]["filename"], "whatsapp_batch_evidence.png")
        self.assertEqual(ocr_result["image_metadata"]["format"], "PNG")
        self.assertEqual(ocr_result["image_metadata"]["width"], 420)
        self.assertEqual(ocr_result["image_metadata"]["height"], 600)
        self.assertGreater(ocr_result["image_metadata"]["size_bytes"], 0)

    def test_ocr_extraction_without_embedded_metadata_fallback(self):
        """Verifies deterministic fallback when image has no embedded PNG metadata."""
        clean_bytes = create_synthetic_whatsapp_screenshot(embed_metadata=False)
        ocr_result = extract_whatsapp_screenshot_text(
            image_bytes=clean_bytes,
            filename="clean_chat.png",
            mock_mode=True,
        )
        self.assertIn("extracted_text", ocr_result)
        self.assertEqual(ocr_result["ocr_engine"], "deterministic_fallback")
        self.assertGreater(len(ocr_result["messages"]), 0)

    def test_invalid_image_raises_value_error(self):
        """Verifies corrupted or invalid image bytes raise descriptive ValueError."""
        with self.assertRaises(ValueError):
            extract_whatsapp_screenshot_text(b"not-an-image-data", filename="bad.png")

        with self.assertRaises(ValueError):
            extract_whatsapp_screenshot_text(b"", filename="empty.png")

    def test_end_to_end_ocr_to_triage_execution(self):
        """Feeds OCR extracted text and metadata directly into run_triage()."""
        ocr_result = extract_whatsapp_screenshot_text(
            image_bytes=self.synthetic_png_bytes,
            filename="threat_screenshot.png",
            mock_mode=True,
        )

        triage_result = run_triage(
            raw_text=ocr_result["extracted_text"],
            metadata={
                "school_name": "SMK Sentiasa",
                "reporter_alias": "AnonPrefect",
                "mock_external_apis": True,
                "ocr_evidence": ocr_result["image_metadata"],
            },
        )

        # Under SHACL-GOV-01 blast radius governance, weapon threats (parang) route to HITL queue
        self.assertFalse(triage_result.get("jev_passed"))
        self.assertEqual(triage_result.get("status"), "vetoed_to_hitl_queue")
        self.assertIsNotNone(triage_result.get("threat_event"))
        self.assertGreaterEqual(len(triage_result.get("cytoscape_elements", [])), 4)

        # Ensure Malaysian slang tokens were identified in OCR text
        slang_tokens = triage_result.get("extracted_slang_tokens", [])
        self.assertIn("parang", slang_tokens)
        self.assertIn("belasah", slang_tokens)

    def test_api_upload_screenshot_success(self):
        """Verifies POST /api/triage/upload-screenshot returns 200 with full triage & OCR payload."""
        files = {
            "file": ("whatsapp_evidence.png", self.synthetic_png_bytes, "image/png"),
        }
        data = {
            "school_name": "SMK Sentiasa",
            "reporter_alias": "Prefect_Haris",
            "mock_mode": "true",
        }

        response = self.client.post("/api/triage/upload-screenshot", files=files, data=data)
        self.assertEqual(response.status_code, 200)

        json_data = response.json()
        # Verify required keys specified in task instructions
        self.assertIn("jev_passed", json_data)
        self.assertIn("cytoscape_elements", json_data)
        self.assertIn("extracted_text", json_data)
        self.assertIn("ocr_metadata", json_data)

        # Functional assertions: Under SHACL-GOV-01, parang threat routes to HITL review queue
        self.assertFalse(json_data["jev_passed"])
        self.assertEqual(json_data["status"], "vetoed_to_hitl_queue")
        self.assertGreaterEqual(len(json_data["cytoscape_elements"]), 4)
        self.assertIn("parang", json_data["extracted_text"])
        self.assertEqual(json_data["ocr_metadata"]["filename"], "whatsapp_evidence.png")
        self.assertEqual(json_data["ocr_metadata"]["image_metadata"]["width"], 420)
        self.assertIn("Azlan_Form4", json_data["ocr_metadata"]["detected_senders"])

    def test_api_upload_screenshot_invalid_extension(self):
        """Verifies rejection of unsupported file types."""
        files = {
            "file": ("malicious_payload.exe", b"binary content", "application/x-msdownload"),
        }
        response = self.client.post("/api/triage/upload-screenshot", files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json()["detail"])

    def test_api_upload_screenshot_corrupted_image(self):
        """Verifies rejection of corrupted image files."""
        files = {
            "file": ("corrupt.png", b"corrupted bytes that are not PNG", "image/png"),
        }
        response = self.client.post("/api/triage/upload-screenshot", files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid or corrupted image", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
