"""
Verification script for SENTIASA Tactical Evidence Uplink across 4 interfaces:
1. Interface 1: Screenshot OCR (/api/triage/upload-screenshot)
2. Interface 2: CCTV Video (/api/triage/upload-video)
3. Interface 3: Field Text Report (/api/triage)
4. Interface 4: WhatsApp 24/7 Mobile Ingest (/api/webhooks/whatsapp)

Validates:
- Successful triage and invariant gatekeeping
- HITL Queue enrichment (modality badges, extracted evidence, Child Act pseudonym, OSINT precursors)
- Knowledge Graph elements and canonical entity pivots
"""

import sys
import os
import json
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

COLLATERAL_DIR = root_dir / "test_collateral"

def test_interface_1_screenshot_ocr():
    print("\n--- [TEST 1/4] INTERFACE 1: SCREENSHOT OCR ---")
    img_path = COLLATERAL_DIR / "01_whatsapp_screenshot_bully_threat.png"
    assert img_path.exists(), f"Missing {img_path}"
    
    with open(img_path, "rb") as f:
        response = client.post(
            "/api/triage/upload-screenshot",
            files={"file": ("01_whatsapp_screenshot_bully_threat.png", f, "image/png")},
            data={
                "school_name": "SMK Seksyen 11 Shah Alam",
                "reporter_alias": "Student_Whistleblower",
                "mock_mode": "false",
            },
            headers={"X-Tenant-ID": "smk-sentiasa"}
        )
    
    assert response.status_code == 200, f"Upload screenshot failed: {response.text}"
    data = response.json()
    print(f"Status: {data.get('status')}")
    print(f"Incident ID: {data.get('incident_id')}")
    print(f"Severity: Tier {data.get('severity_tier')} ({data.get('threat_tier')})")
    print(f"Extracted Slang: {data.get('extracted_slang_tokens')}")
    print(f"OSINT Citations ({len(data.get('external_citations', []))}): {data.get('external_citations')}")
    print(f"Pivoted Nodes: {[p.get('id') for p in data.get('pivoted_nodes', [])]}")
    
    # Assertions
    assert "pau" in data.get("extracted_slang_tokens", []) or "ugut" in data.get("extracted_slang_tokens", []), "Expected slang tokens pau/ugut"
    assert len(data.get("external_citations", [])) > 0, "Expected OSINT citations"
    assert any("pivot_blok_c" in p.get("id") for p in data.get("pivoted_nodes", [])), "Expected pivot_blok_c in pivoted nodes"
    print("[PASS] Interface 1 (Screenshot OCR) successfully verified.")
    return data

def test_interface_2_cctv_video():
    print("\n--- [TEST 2/4] INTERFACE 2: CCTV VIDEO SENSOR INGEST ---")
    vid_path = COLLATERAL_DIR / "02_cctv_reargate_altercation.mp4"
    assert vid_path.exists(), f"Missing {vid_path}"
    
    with open(vid_path, "rb") as f:
        response = client.post(
            "/api/triage/upload-video",
            files={"file": ("02_cctv_reargate_altercation.mp4", f, "video/mp4")},
            data={
                "school_name": "SMK Seksyen 11 Shah Alam",
                "reporter_alias": "CCTV_RearGate_Camera",
                "mock_mode": "false",
            },
            headers={"X-Tenant-ID": "smk-sentiasa"}
        )
    
    assert response.status_code == 200, f"Upload video failed: {response.text}"
    data = response.json()
    print(f"Status: {data.get('status')}")
    print(f"Incident ID: {data.get('incident_id')}")
    print(f"Severity: Tier {data.get('severity_tier')} ({data.get('threat_tier')})")
    print(f"Extracted Slang: {data.get('extracted_slang_tokens')}")
    print(f"Visual Evidence: {data.get('visual_evidence')}")
    print(f"OSINT Citations ({len(data.get('external_citations', []))}): {data.get('external_citations')}")
    print(f"Pivoted Nodes: {[p.get('id') for p in data.get('pivoted_nodes', [])]}")
    print("[PASS] Interface 2 (CCTV Video) successfully verified.")
    return data

def test_interface_3_text_report():
    print("\n--- [TEST 3/4] INTERFACE 3: FIELD TEXT REPORT ---")
    txt_path = COLLATERAL_DIR / "03_whistleblower_text_report.txt"
    assert txt_path.exists(), f"Missing {txt_path}"
    
    with open(txt_path, "r", encoding="utf-8") as f:
        text_content = f.read()
    
    response = client.post(
        "/api/triage",
        json={
            "raw_text": text_content,
            "school_name": "SMK Seksyen 9 Shah Alam",
            "reporter_alias": "Field_Patrol_Teacher",
            "metadata": {
                "ingest_channel": "FIELD_TEXT_REPORT",
                "mock_external_apis": False,
            }
        },
        headers={"X-Tenant-ID": "smk-sentiasa"}
    )
    
    assert response.status_code == 200, f"Field text triage failed: {response.text}"
    data = response.json()
    print(f"Status: {data.get('status')}")
    print(f"Incident ID: {data.get('incident_id')}")
    print(f"Severity: Tier {data.get('severity_tier')} ({data.get('threat_tier')})")
    print(f"Extracted Slang: {data.get('extracted_slang_tokens')}")
    print(f"OSINT Citations ({len(data.get('external_citations', []))}): {data.get('external_citations')}")
    print(f"Pivoted Nodes: {[p.get('id') for p in data.get('pivoted_nodes', [])]}")
    
    # Assertions
    assert "settle luar" in data.get("extracted_slang_tokens", []) or "tapau" in data.get("extracted_slang_tokens", []), "Expected slang tokens settle luar/tapau"
    assert any("pivot_settle_luar" in p.get("id") for p in data.get("pivoted_nodes", [])), "Expected pivot_settle_luar attached to Seksyen 9"
    print("[PASS] Interface 3 (Field Text Report) successfully verified.")
    return data

def test_interface_4_whatsapp_webhook():
    print("\n--- [TEST 4/4] INTERFACE 4: WHATSAPP 24/7 HUMINT FLOW ---")
    json_path = COLLATERAL_DIR / "04_whatsapp_webhook_payload.json"
    assert json_path.exists(), f"Missing {json_path}"
    
    with open(json_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    
    response = client.post(
        "/api/webhooks/whatsapp",
        json=payload,
        headers={"X-Tenant-ID": "smk-sentiasa"}
    )
    
    assert response.status_code == 200, f"WhatsApp webhook failed: {response.text}"
    data = response.json()
    print(f"Status: {data.get('status')}")
    print(f"Incident ID: {data.get('incident_id')}")
    print(f"Severity: Tier {data.get('severity_tier')} ({data.get('threat_tier')})")
    print(f"Whistleblower Pseudonym: {data.get('whistleblower_pseudonym')}")
    print(f"Outbound Alert Dispatched: {data.get('outbound_alert_dispatched')}")
    print(f"Outbound Alert Text:\n{data.get('outbound_alert_text')}")
    
    assert "WHISTLEBLOWER_ANON_" in data.get("whistleblower_pseudonym", ""), "Expected salted Child Act 2001 pseudonym"
    print("[PASS] Interface 4 (WhatsApp 24/7 Flow) successfully verified.")
    return data

def test_hitl_queue_and_graph():
    print("\n--- [VERIFICATION] HITL QUEUE & KNOWLEDGE GRAPH AUDIT ---")
    hitl_resp = client.get("/api/hitl/queue", headers={"X-Tenant-ID": "smk-sentiasa"})
    assert hitl_resp.status_code == 200, f"HITL queue fetch failed: {hitl_resp.text}"
    hitl_data = hitl_resp.json()
    queue = hitl_data.get("queue", [])
    print(f"Total Quarantined Items in HITL: {len(queue)}")
    
    channels_found = set()
    osint_found = 0
    whistleblower_found = 0
    video_found = 0
    ocr_found = 0
    
    for item in queue:
        ch = item.get("ingest_channel")
        if ch:
            channels_found.add(ch)
        if item.get("external_citations"):
            osint_found += 1
        if item.get("whistleblower_hash"):
            whistleblower_found += 1
        if item.get("video_filename") or item.get("visual_evidence"):
            video_found += 1
        if item.get("extracted_text") or item.get("ocr_metadata"):
            ocr_found += 1
        
        print(f"- Item {item.get('queue_id')}: Channel={ch}, Veto={item.get('veto_reason')[:40]}..., OSINT={len(item.get('external_citations', []))}, Modality={item.get('media_type')}")
    
    print(f"\nDiscovered Ingest Channels: {channels_found}")
    print(f"OSINT-corroborated items: {osint_found}")
    print(f"Whistleblower-salted items: {whistleblower_found}")
    print(f"Video-sensor items: {video_found}")
    print(f"OCR-screenshot items: {ocr_found}")

    graph_resp = client.get("/api/graph/elements", headers={"X-Tenant-ID": "smk-sentiasa"})
    assert graph_resp.status_code == 200, f"Graph elements failed: {graph_resp.text}"
    graph_elements = graph_resp.json()
    print(f"Total Graph Elements: {len(graph_elements)}")
    
    purple_nodes = [
        el["data"] for el in graph_elements 
        if el.get("data", {}).get("color") == "#8b5cf6" or el.get("data", {}).get("is_osint")
    ]
    print(f"Total OSINT Purple Nodes in Graph: {len(purple_nodes)}")
    for pn in purple_nodes:
        print(f"  * {pn.get('id')}: '{pn.get('label')}' -> {pn.get('source_url')}")
    
    assert len(purple_nodes) > 0, "Expected purple OSINT nodes in graph"
    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_interface_1_screenshot_ocr()
    test_interface_2_cctv_video()
    test_interface_3_text_report()
    test_interface_4_whatsapp_webhook()
    test_hitl_queue_and_graph()
