"""
Live End-to-End Test for the 4 Tactical Evidence Uplink Interfaces against http://127.0.0.1:8000
"""
import sys
import json
import time
from pathlib import Path
import requests

BASE_URL = "http://127.0.0.1:8000"
root_dir = Path(__file__).resolve().parent.parent.parent
COLLATERAL_DIR = root_dir / "test_collateral"
TENANT = "smk-sentiasa"
HEADERS = {"X-Tenant-ID": TENANT}

def test_live_interfaces():
    print("==================================================================", flush=True)
    print(" LIVE TESTING TACTICAL EVIDENCE UPLINK (4 INTERFACES) ON PORT 8000", flush=True)
    print("==================================================================", flush=True)

    # 1. Interface 1: Screenshot OCR
    print("\n[1/4] Testing Interface 1: Screenshot OCR (/api/triage/upload-screenshot)...", flush=True)
    img_path = COLLATERAL_DIR / "01_whatsapp_screenshot_bully_threat.png"
    with open(img_path, "rb") as f:
        r1 = requests.post(
            f"{BASE_URL}/api/triage/upload-screenshot",
            files={"file": (img_path.name, f, "image/png")},
            data={"school_name": "SMK Seksyen 11 Shah Alam", "reporter_alias": "Student_Whistleblower"},
            headers=HEADERS,
            timeout=30,
        )
    print(f"Status Code: {r1.status_code}", flush=True)
    d1 = r1.json()
    print(f"  * Incident ID: {d1.get('incident_id')}", flush=True)
    print(f"  * Status: {d1.get('status')} (Tier {d1.get('severity_tier')})", flush=True)
    print(f"  * Extracted Slang: {d1.get('extracted_slang_tokens')}", flush=True)
    print(f"  * OSINT Citations ({len(d1.get('external_citations', []))}): {d1.get('external_citations')}", flush=True)
    print(f"  * Pivoted Nodes: {[p.get('id') for p in d1.get('pivoted_nodes', [])]}", flush=True)
    assert r1.status_code == 200, f"Upload screenshot failed: {r1.text}"

    # 2. Interface 2: Mobile Video Witness Ingest (HUMINT)
    print("\n[2/4] Testing Interface 2: Mobile Video Witness Ingest (/api/triage/upload-video)...", flush=True)
    vid_path = COLLATERAL_DIR / "02_cctv_reargate_altercation.mp4"
    with open(vid_path, "rb") as f:
        r2 = requests.post(
            f"{BASE_URL}/api/triage/upload-video",
            files={"file": (vid_path.name, f, "video/mp4")},
            data={"school_name": "SMK Seksyen 11 Shah Alam", "reporter_alias": "Whistleblower_Video_Witness"},
            headers=HEADERS,
            timeout=45,
        )
    print(f"Status Code: {r2.status_code}", flush=True)
    d2 = r2.json()
    print(f"  * Incident ID: {d2.get('incident_id')}", flush=True)
    print(f"  * Status: {d2.get('status')} (Tier {d2.get('severity_tier')})", flush=True)
    print(f"  * Visual Evidence: {d2.get('visual_evidence')}", flush=True)
    assert r2.status_code == 200, f"Upload video failed: {r2.text}"

    # 3. Interface 3: Field Text Report
    print("\n[3/4] Testing Interface 3: Field Text Report (/api/triage)...", flush=True)
    txt_path = COLLATERAL_DIR / "03_whistleblower_text_report.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        txt_content = f.read()
    r3 = requests.post(
        f"{BASE_URL}/api/triage",
        json={
            "raw_text": txt_content,
            "school_name": "SMK Seksyen 9 Shah Alam",
            "reporter_alias": "Field_Patrol_Warden",
            "metadata": {"ingest_channel": "FIELD_TEXT_REPORT"}
        },
        headers=HEADERS,
        timeout=30,
    )
    print(f"Status Code: {r3.status_code}", flush=True)
    d3 = r3.json()
    print(f"  * Incident ID: {d3.get('incident_id')}", flush=True)
    print(f"  * Status: {d3.get('status')} (Tier {d3.get('severity_tier')})", flush=True)
    print(f"  * Extracted Slang: {d3.get('extracted_slang_tokens')}", flush=True)
    print(f"  * OSINT Citations: {d3.get('external_citations')}", flush=True)
    print(f"  * Pivoted Nodes: {[p.get('id') for p in d3.get('pivoted_nodes', [])]}", flush=True)
    assert r3.status_code == 200, f"Field text triage failed: {r3.text}"

    # 4. Interface 4: WhatsApp 24/7 Mobile Ingest Flow
    print("\n[4/4] Testing Interface 4: WhatsApp 24/7 HUMINT Flow (/api/webhooks/whatsapp)...", flush=True)
    json_path = COLLATERAL_DIR / "04_whatsapp_webhook_payload.json"
    with open(json_path, "r", encoding="utf-8") as f:
        wa_json = json.load(f)
    r4 = requests.post(
        f"{BASE_URL}/api/webhooks/whatsapp",
        json=wa_json,
        headers=HEADERS,
        timeout=30,
    )
    print(f"Status Code: {r4.status_code}", flush=True)
    d4 = r4.json()
    print(f"  * Incident ID: {d4.get('incident_id')}", flush=True)
    print(f"  * Whistleblower Pseudonym: {d4.get('whistleblower_pseudonym')}", flush=True)
    print(f"  * Outbound Alert Dispatched: {d4.get('outbound_alert_dispatched')}", flush=True)
    assert r4.status_code == 200, f"WhatsApp webhook failed: {r4.text}"

    # 5. Audit Live HITL Review Queue on Server
    print("\n[5/5] Auditing Live HITL Review Queue (/api/hitl/queue)...", flush=True)
    rq = requests.get(f"{BASE_URL}/api/hitl/queue", headers=HEADERS, timeout=10)
    print(f"Status Code: {rq.status_code}", flush=True)
    dq = rq.json()
    queue = dq.get("queue", [])
    print(f"Total Live HITL Quarantined Items: {len(queue)}", flush=True)
    for it in queue[-4:]:
        print(f"  - [{it.get('queue_id')}] Channel: {it.get('ingest_channel')} | Media: {it.get('media_type')} | Pseudonym: {it.get('reporter_alias')} | OSINT Citations: {len(it.get('external_citations', []))}", flush=True)

    print("\n>>> ALL 4 INTERFACES ARE FULLY OPERATIONAL AND VERIFIED LIVE! <<<", flush=True)

if __name__ == "__main__":
    test_live_interfaces()
