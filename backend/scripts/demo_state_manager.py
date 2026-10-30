"""
Demo State Manager for Project SENTIASA.
Allows 1-click purge, seed, and reset of Firestore and local state for live demonstrations.

Usage:
    python backend/scripts/demo_state_manager.py --reset
    python backend/scripts/demo_state_manager.py --purge
    python backend/scripts/demo_state_manager.py --seed
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

_backend_dir = Path(__file__).resolve().parent.parent
_project_root = _backend_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from backend.storage.ledger import get_ledger, FirestoreLedger, InMemoryLedger

DEFAULT_TENANT = "smk-seksyen-11"

PRISTINE_DEMO_INCIDENTS: List[Dict[str, Any]] = [
    {
        "incident_id": "incident-parang",
        "tenant_id": "smk-seksyen-11",
        "severity_tier": 5,
        "threat_tier": "CRITICAL",
        "school": {
            "school_id": "school-smk-seksyen-11",
            "name": "SMK Seksyen 11 Shah Alam",
            "district": "Petaling Perdana",
        },
        "matched_zone_id": "HOTSPOT_PINTU_BELAKANG",
        "matched_zone_name": "Pintu Belakang & Laluan Stadium",
        "spatial_coordinates": [101.5295, 3.0772],
        "threat_event": {
            "event_id": "incident-parang",
            "incident_type": "physical_altercation",
            "raw_text": "Budak form 4 bawa parang nak belasah budak batch bawah kat luar pintu pagar belakang.",
            "severity_tier": 5,
            "threat_tier": "CRITICAL",
            "confidence_score": 0.96,
            "context_summary": "Multiple student messages indicate acute weapon-related confrontation near rear gate after class.",
            "extracted_slang_tokens": ["parang", "belasah", "jumpa belakang"],
        },
        "jev_passed": True,
        "jev_evaluation": {
            "passed": True,
            "veto_reason": None,
            "suggested_action": "TRIGGER_CAMPUS_DISPATCH",
            "semantic_confidence": 0.96,
            "semantic_danger_probability": 0.94,
        },
        "jev_telemetry": {
            "imminent_violence": 0.95,
            "weapon_threat": 0.98,
            "extortion_coercion": 0.12,
            "victim_distress": 0.74,
        },
        "external_citations": [
            {
                "title": "Suara Pelajar: Senjata Bahaya Pagar Belakang (Bicycle Shed)",
                "url": "https://osint-target.sentiasasystems.com/threads/senjata-bahaya-pagar-belakang/",
                "platform": "suara_pelajar_target",
                "engine": "suara_pelajar_direct",
                "highlights": ["[Target Signal]: Watak rekaan melaporkan objek prop tumpul berbalut kain dekat shed basikal."],
            },
            {
                "title": "r/malaysiauni - Campus Security & Anti-Violence Community Portal",
                "url": "https://www.reddit.com/r/malaysiauni/",
                "platform": "reddit",
                "engine": "tavily",
                "highlights": ["Student community warnings and verification regarding perimeter threats near secondary school gates."],
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "incident_id": "incident-fight",
        "tenant_id": "smk-seksyen-9",
        "severity_tier": 4,
        "threat_tier": "ELEVATED",
        "school": {
            "school_id": "school-smk-seksyen-9",
            "name": "SMK Seksyen 9 Shah Alam",
            "district": "Petaling Perdana",
        },
        "matched_zone_id": "ZONE_BLOK_C_L3",
        "matched_zone_name": "Blok C Aras 3 (Tandas Belakang)",
        "spatial_coordinates": [101.5273, 3.0857],
        "threat_event": {
            "event_id": "incident-fight",
            "incident_type": "physical_altercation",
            "raw_text": "Dengar cerita budak asrama nak settle hal semalam dekat blok C petang ni.",
            "severity_tier": 4,
            "threat_tier": "ELEVATED",
            "confidence_score": 0.88,
            "context_summary": "Escalating tension between student cohorts. Vernacular indicates imminent scuffle after prep.",
            "extracted_slang_tokens": ["koyak", "settle luar", "asrama"],
        },
        "jev_passed": True,
        "jev_evaluation": {
            "passed": True,
            "veto_reason": None,
            "suggested_action": "ESCALATE_THREAT_TIER",
            "semantic_confidence": 0.88,
            "semantic_danger_probability": 0.82,
        },
        "jev_telemetry": {
            "imminent_violence": 0.88,
            "weapon_threat": 0.15,
            "extortion_coercion": 0.20,
            "victim_distress": 0.65,
        },
        "external_citations": [
            {
                "title": "Suara Pelajar: Amaran Group Budak Seksyen 9 Nak Jumpa Belakang ('Settle Luar')",
                "url": "https://osint-target.sentiasasystems.com/threads/pergaduhan-rendezvous-belakang-sekolah/",
                "platform": "suara_pelajar_target",
                "engine": "suara_pelajar_direct",
                "highlights": ["[Target Signal]: Nampak chat Telegram rekaan beredar pasal pelajar fiksyen Seksyen 9 nak turun naik motor petang ni dekat area pondok basikal."],
            },
            {
                "title": "Lowyat.NET Education - Student Welfare & Campus Discussions",
                "url": "https://forum.lowyat.net/Education",
                "platform": "lowyat",
                "engine": "exa",
                "highlights": ["Campus peer conflict and dorm tension escalated to physical confrontation threats."],
            }
        ],
        "video_filename": "clip_physical_altercation.mp4",
        "video_clips": ["clip_physical_altercation.mp4"],
        "keyframe_timestamps": [1.2, 3.4],
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "incident_id": "incident-bullying",
        "tenant_id": "smk-seksyen-11",
        "severity_tier": 2,
        "threat_tier": "LOW",
        "school": {
            "school_id": "school-smk-seksyen-11",
            "name": "SMK Seksyen 11 Shah Alam",
            "district": "Petaling Perdana",
        },
        "matched_zone_id": "HOTSPOT_BILIK_IRON",
        "matched_zone_name": "Bilik Menggosok & Dobi ASPURA Aras 2",
        "spatial_coordinates": [101.5287, 3.0788],
        "threat_event": {
            "event_id": "incident-bullying",
            "incident_type": "cyberbullying",
            "raw_text": "Member kelas koyak teruk kena bahan dalam group WhatsApp sampai tak nak datang sekolah.",
            "severity_tier": 2,
            "threat_tier": "LOW",
            "confidence_score": 0.91,
            "context_summary": "Repeated hostile mocking directed at a junior student causing classroom absenteeism.",
            "extracted_slang_tokens": ["bahan", "koyak", "malu"],
        },
        "jev_passed": True,
        "jev_evaluation": {
            "passed": True,
            "veto_reason": None,
            "suggested_action": "LOG_TELEMETRY",
            "semantic_confidence": 0.91,
            "semantic_danger_probability": 0.35,
        },
        "jev_telemetry": {
            "imminent_violence": 0.18,
            "weapon_threat": 0.04,
            "extortion_coercion": 0.82,
            "victim_distress": 0.79,
        },
        "external_citations": [
            {
                "title": "Suara Pelajar: Ada Senior Mintak Pau Duit RM50 Tandas Blok C",
                "url": "https://osint-target.sentiasasystems.com/threads/extortion-block-c-seksyen-11/",
                "platform": "suara_pelajar_target",
                "engine": "suara_pelajar_direct",
                "highlights": ["[Target Signal]: Dua pelajar senior tahan seorang pelajar junior dalam tandas Blok C ugut nak tapau kalau tak bayar RM50."],
            },
            {
                "title": "r/malaysia - National Student Well-Being & Anti-Bullying Portal",
                "url": "https://www.reddit.com/r/malaysia/",
                "platform": "reddit",
                "engine": "tavily",
                "highlights": ["Extortion and peer harassment incidents documented within school environments."],
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]


def purge_demo_state(tenant_id: str = DEFAULT_TENANT) -> Dict[str, Any]:
    """Purges all incidents and HITL tickets for the demo tenant."""
    ledger = get_ledger()
    purged_count = 0

    if isinstance(ledger, FirestoreLedger):
        # Purge tenant-scoped collection
        for col_name in ["incidents", "hitl_queue", "audit_log"]:
            col_ref = ledger.db.collection("tenants").document(tenant_id).collection(col_name)
            docs = list(col_ref.limit(100).stream())
            for d in docs:
                d.reference.delete()
                purged_count += 1

        # Also purge root incidents and root HITL queue
        root_col = ledger.db.collection("incidents")
        for d in root_col.limit(100).stream():
            d.reference.delete()
            purged_count += 1
        root_hitl = ledger.db.collection("hitl_queue")
        for d in root_hitl.limit(100).stream():
            d.reference.delete()
            purged_count += 1
    elif isinstance(ledger, InMemoryLedger):
        ledger.clear()
        purged_count = 1

    return {"status": "PURGED", "purged_count": purged_count, "tenant_id": tenant_id}


def seed_demo_state(tenant_id: str = DEFAULT_TENANT) -> Dict[str, Any]:
    """Seeds pristine baseline incidents into Firestore or memory ledger."""
    ledger = get_ledger()
    seeded_ids = []

    for inc in PRISTINE_DEMO_INCIDENTS:
        inc_copy = dict(inc)
        # Preserve specific school tenant partition if present, or assign target tenant
        assigned_tenant = inc.get("tenant_id") or tenant_id
        if tenant_id != "*" and tenant_id not in ["smk-seksyen-11", "smk-seksyen-9"]:
            assigned_tenant = tenant_id
        inc_copy["tenant_id"] = assigned_tenant
        inc_copy["created_at"] = datetime.now(timezone.utc).isoformat()
        rec_id = ledger.record_incident(inc_copy, tenant_id=assigned_tenant)
        seeded_ids.append(rec_id)

    return {"status": "SEEDED", "seeded_count": len(seeded_ids), "seeded_ids": seeded_ids, "tenant_id": tenant_id}


def reset_demo_state(tenant_id: str = DEFAULT_TENANT) -> Dict[str, Any]:
    """1-Click atomic Purge + Seed operation for live video presentation across canonical partitions."""
    tenants = list({tenant_id, "smk-seksyen-11", "smk-seksyen-9", "smk-sentiasa", "smk-kuching-high"})
    total_purged = 0
    all_seeded_ids = []
    for tid in tenants:
        purge_res = purge_demo_state(tenant_id=tid)
        total_purged += purge_res.get("purged_count", 0)
    
    # Seed across canonical partitions
    seed_res = seed_demo_state(tenant_id=tenant_id)
    all_seeded_ids.extend(seed_res.get("seeded_ids", []))

    return {
        "status": "RESET_COMPLETE",
        "purged_count": total_purged,
        "seeded_count": len(all_seeded_ids),
        "seeded_ids": list(set(all_seeded_ids)),
        "tenant_id": tenant_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SENTIASA Demo State Manager")
    parser.add_argument("--purge", action="store_true", help="Purge all incidents and HITL tickets")
    parser.add_argument("--seed", action="store_true", help="Seed pristine baseline demo incidents")
    parser.add_argument("--reset", action="store_true", help="Atomically purge and seed demo state")
    parser.add_argument("--tenant", default=DEFAULT_TENANT, help="Target tenant ID (default: smk-seksyen-11)")

    args = parser.parse_args()

    if args.reset or (not args.purge and not args.seed):
        print(f"[*] Resetting demo state for tenant '{args.tenant}'...")
        res = reset_demo_state(tenant_id=args.tenant)
        print(f"[+] Demo state reset successful: {res}")
    elif args.purge:
        print(f"[*] Purging demo state for tenant '{args.tenant}'...")
        res = purge_demo_state(tenant_id=args.tenant)
        print(f"[+] Purge complete: {res}")
    elif args.seed:
        print(f"[*] Seeding demo state for tenant '{args.tenant}'...")
        res = seed_demo_state(tenant_id=args.tenant)
        print(f"[+] Seed complete: {res}")
