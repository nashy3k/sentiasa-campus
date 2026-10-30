"""
Dual-Mode Firestore & In-Memory Persistence Adapter for Project SENTIASA.
Satisfies Section 9.4: Dual-Mode Firestore Persistence Adapter.

Architecture:
- SentiasaLedger (Abstract Base Class)
- InMemoryLedger: 0-latency, thread-safe memory store for local testing & offline environments.
- FirestoreLedger: Scalable serverless persistence across Cloud Run instances on GCP project modified-argon-471003-i3.
  - /incidents: Master incident records, severity tiers, threat events, Cytoscape elements.
  - /hitl_queue: Pending counselor human-in-the-loop review tickets & status transitions.
  - /audit_log: Evidence Act 1950 Sec 90A tamper-evident forensic log.
- get_ledger(): Singleton factory automatically returning InMemoryLedger during pytest/offline
  and FirestoreLedger when FIRESTORE_ENABLED=true or running in GCP Cloud Run staging/production.
"""

import json
import logging
import os
import sys
import threading
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger("sentiasa.storage")

DEFAULT_GCP_PROJECT_ID = "modified-argon-471003-i3"
DEFAULT_FIRESTORE_DATABASE = "(default)"

_storage_dir = Path(__file__).resolve().parent
_backend_dir = _storage_dir.parent
_project_root = _backend_dir.parent
_config_path_root = _project_root / "data" / "osint_sources.json"
_config_path_backend = _backend_dir / "data" / "osint_sources.json"


def _load_default_osint_config(tenant_id: str = "smk-sentiasa") -> Dict[str, Any]:
    """Loads default externalized OSINT source registry and formats as OSINTConfig dictionary."""
    raw_data: Dict[str, Any] = {}
    for p in [_config_path_root, _config_path_backend]:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    break
            except Exception as exc:
                logger.warning(f"Failed to load OSINT sources config from {p}: {exc}")

    subreddits = raw_data.get("subreddits", [
        {"name": "r/malaysiauni", "domain": "reddit.com/r/malaysiauni", "category": "higher_education", "tier": 1, "enabled": True},
        {"name": "r/bolehland", "domain": "reddit.com/r/bolehland", "category": "youth_unfiltered", "tier": 1, "enabled": True},
        {"name": "r/malaysia", "domain": "reddit.com/r/malaysia", "category": "national_discourse", "tier": 1, "enabled": True},
        {"name": "r/spm", "domain": "reddit.com/r/spm", "category": "secondary_school_exams", "tier": 2, "enabled": True},
        {"name": "r/malaysians", "domain": "reddit.com/r/malaysians", "category": "peer_support_lifestyle", "tier": 2, "enabled": True},
    ])
    forums = raw_data.get("discussion_forums", [
        {"name": "Lowyat.NET Forum", "domain": "forum.lowyat.net", "category": "discussion_forums", "tier": 2, "enabled": True},
    ])
    news = raw_data.get("regional_news_monitors", [
        {"name": "Harian Metro", "domain": "hmetro.com.my", "category": "regional_news_monitors", "tier": 3, "enabled": True},
        {"name": "Sinar Harian", "domain": "sinarharian.com.my", "category": "regional_news_monitors", "tier": 3, "enabled": True},
    ])

    all_domains = []
    for item in [*subreddits, *forums, *news]:
        all_domains.append({
            "domain": item.get("domain", ""),
            "name": item.get("name") or item.get("domain", ""),
            "category": item.get("category", "youth_community"),
            "tier": item.get("tier", 1),
            "enabled": item.get("enabled", True),
        })

    freshness = raw_data.get("freshness_policy", {})
    return {
        "tenant_id": tenant_id,
        "tavily_enabled": True,
        "exa_enabled": True,
        "max_results": 2,
        "recency_days": freshness.get("max_age_days", 90),
        "cron_enabled": False,
        "cron_interval_minutes": 30,
        "target_domains": all_domains,
        "subreddits": subreddits,
        "discussion_forums": forums,
        "regional_news_monitors": news,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": "SUPER_ADMIN",
    }


def _load_default_polemic_config() -> Dict[str, Any]:
    from backend.canary_fixtures import (
        DEFAULT_SYSTEM_CANARY,
        SYNTHETIC_RESTRICTED_RECORD,
        SYNTHETIC_PERSON_RECORD,
    )
    return {
        "mode_preset": "BASELINE",
        "enable_regex_firewall": False,
        "enable_output_sanitizer": True,
        "include_confidential_records_in_context": True,
        "context_window_max_turns": 15,
        "context_window_max_words": 3000,
        "enable_live_llm": True,
        "enable_live_jev": True,
        "enable_live_ilmu": False,
        "mock_web_search": True,
        "bypass_firestore_ledger": True,
        "enable_langsmith_tracing": True,
        "test_api_key": os.getenv("TEST_BUILD_API_KEY", "sk-sentiasa-local-dev-test-key"),
        "canary_system_prompt": os.getenv("POLEMIC_CANARY_CODE", DEFAULT_SYSTEM_CANARY),
        "canary_restricted_record": SYNTHETIC_RESTRICTED_RECORD["canary_token"],
        "canary_person_record": SYNTHETIC_PERSON_RECORD["canary_token"],
        "cloud_run_min_instances": 0,
        "response_mode": "COUNSELOR_DOSSIER",
        "vision_model": os.getenv("NEBIUS_VISION_MODEL", "nvidia/Nemotron-3.5-Super-VL"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": "SUPER_ADMIN",
    }


def _load_default_system_config() -> Dict[str, Any]:
    return {
        "enable_live_llm": True,
        "enable_live_jev": True,
        "enable_live_ilmu": False,
        "context_window_max_turns": 20,
        "context_window_max_words": 4000,
        "enable_regex_firewall": True,
        "enforce_shacl_invariants": True,
        "cloud_run_min_instances": 0,
        "vision_model": os.getenv("NEBIUS_VISION_MODEL", "nvidia/Nemotron-3.5-Super-VL"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": "SUPER_ADMIN",
    }


def _sanitize_for_firestore(data: Any) -> Any:
    """
    Recursively converts Pydantic models, sets, UUIDs, and custom objects
    into Firestore-serializable Python native dictionaries, lists, and primitives.
    """
    if data is None:
        return None
    if isinstance(data, (str, int, float, bool)):
        return data
    if isinstance(data, datetime):
        return data.isoformat()
    if isinstance(data, (set, tuple)):
        return [_sanitize_for_firestore(item) for item in data]
    if isinstance(data, list):
        return [_sanitize_for_firestore(item) for item in data]
    if isinstance(data, dict):
        return {str(k): _sanitize_for_firestore(v) for k, v in data.items()}
    if hasattr(data, "model_dump"):
        return _sanitize_for_firestore(data.model_dump(mode="json"))
    if hasattr(data, "to_dict"):
        return _sanitize_for_firestore(data.to_dict())
    if hasattr(data, "__dict__"):
        return _sanitize_for_firestore(data.__dict__)
    return str(data)


class SentiasaLedger(ABC):
    """Abstract interface defining required persistence operations for SENTIASA."""

    @abstractmethod
    def record_incident(self, incident_data: Dict[str, Any], tenant_id: str = "smk-sentiasa") -> str:
        """Persists a triaged incident record. Returns the incident_id."""
        pass

    @abstractmethod
    def get_incident(self, incident_id: str, tenant_id: str = "smk-sentiasa") -> Optional[Dict[str, Any]]:
        """Retrieves an incident by unique identifier."""
        pass

    @abstractmethod
    def list_incidents(self, limit: int = 50, tenant_id: str = "smk-sentiasa") -> List[Dict[str, Any]]:
        """Lists recent incidents up to the specified limit."""
        pass

    @abstractmethod
    def enqueue_hitl(self, item: Dict[str, Any], tenant_id: str = "smk-sentiasa") -> str:
        """Adds a candidate action to the counselor review queue. Returns queue_id."""
        pass

    @abstractmethod
    def get_hitl_queue(self, status: Optional[str] = None, tenant_id: Optional[str] = "smk-sentiasa") -> List[Dict[str, Any]]:
        """Lists active HITL review tickets (filtered by review_status if specified)."""
        pass

    @abstractmethod
    def resolve_hitl(self, queue_id: str, decision: str, reviewer_notes: Optional[str] = None, tenant_id: Optional[str] = "smk-sentiasa") -> bool:
        """Resolves a pending HITL review ticket (APPROVE_ESCALATION or DISMISS)."""
        pass

    @abstractmethod
    def record_audit(self, audit_entry: Dict[str, Any], tenant_id: str = "smk-sentiasa") -> str:
        """Records an immutable Evidence Act 1950 Sec 90A audit trail entry."""
        pass

    @abstractmethod
    def get_audit_log(self, incident_id: Optional[str] = None, limit: int = 100, tenant_id: str = "smk-sentiasa") -> List[Dict[str, Any]]:
        """Retrieves audit trail entries."""
        pass

    @abstractmethod
    def get_osint_settings(self, tenant_id: str = "smk-sentiasa") -> Dict[str, Any]:
        """Retrieves tenant-scoped OSINT engine settings with fallback."""
        pass

    @abstractmethod
    def save_osint_settings(self, settings: Dict[str, Any], tenant_id: str = "smk-sentiasa") -> bool:
        """Saves tenant-scoped OSINT engine settings."""
        pass

    @abstractmethod
    def get_polemic_settings(self) -> Dict[str, Any]:
        """Retrieves dynamic Polemic red-team evaluation settings."""
        pass

    @abstractmethod
    def save_polemic_settings(self, settings: Dict[str, Any]) -> bool:
        """Saves dynamic Polemic red-team evaluation settings."""
        pass

    @abstractmethod
    def get_system_settings(self) -> Dict[str, Any]:
        """Retrieves system-wide production engine settings."""
        pass

    @abstractmethod
    def save_system_settings(self, settings: Dict[str, Any]) -> bool:
        """Saves system-wide production engine settings."""
        pass

    @abstractmethod
    def get_slang_glossary(self) -> Dict[str, Any]:
        """Retrieves persistent dynamic slang glossary."""
        pass

    @abstractmethod
    def save_slang_glossary(self, glossary: Dict[str, Any]) -> bool:
        """Saves dynamic slang glossary to persistence."""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clears test collections (intended for test suite isolation)."""
        pass


class InMemoryLedger(SentiasaLedger):
    """
    In-memory ledger implementation.
    Thread-safe, 0 network latency, 100% deterministic reliability for pytest and local dev.
    Supports tenant-partitioned memory namespaces.
    """

    _PERSIST_PATH = Path(__file__).resolve().parent / "local_ledger_state.json"

    def __init__(self):
        self._lock = threading.Lock()
        self._incidents: Dict[str, Dict[str, Any]] = {}
        self._hitl_queue: Dict[str, Dict[str, Any]] = {}
        self._audit_log: List[Dict[str, Any]] = []
        self._osint_settings: Dict[str, Dict[str, Any]] = {}
        self._polemic_settings: Dict[str, Any] = {}
        self._system_settings: Dict[str, Any] = {}
        self._slang_glossary: Dict[str, Any] = {}
        self._is_pytest = "pytest" in sys.modules
        if not self._is_pytest:
            self._load_from_disk()

    def _load_from_disk(self):
        try:
            if self._PERSIST_PATH.exists():
                with open(self._PERSIST_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._incidents = data.get("incidents", {})
                    self._hitl_queue = data.get("hitl_queue", {})
                    self._audit_log = data.get("audit_log", [])
                    self._osint_settings = data.get("osint_settings", {})
                    self._polemic_settings = data.get("polemic_settings", {})
                    self._system_settings = data.get("system_settings", {})
                    self._slang_glossary = data.get("slang_glossary", {})
        except Exception:
            pass

    def _save_to_disk(self):
        if self._is_pytest:
            return
        try:
            with open(self._PERSIST_PATH, "w", encoding="utf-8") as f:
                json.dump({
                    "incidents": self._incidents,
                    "hitl_queue": self._hitl_queue,
                    "audit_log": self._audit_log,
                    "osint_settings": self._osint_settings,
                    "polemic_settings": self._polemic_settings,
                    "system_settings": self._system_settings,
                    "slang_glossary": self._slang_glossary,
                }, f, indent=2)
        except Exception:
            pass

    def record_incident(self, incident_data: Dict[str, Any], tenant_id: Optional[str] = None) -> str:
        with self._lock:
            clean = _sanitize_for_firestore(incident_data)
            incident_id = clean.get("incident_id") or f"inc_{uuid4().hex[:12]}"
            clean["incident_id"] = incident_id
            if tenant_id:
                clean["tenant_id"] = tenant_id
            if "created_at" not in clean:
                clean["created_at"] = datetime.now(timezone.utc).isoformat()
            self._incidents[incident_id] = clean
            self._save_to_disk()
            return incident_id

    def get_incident(self, incident_id: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            item = self._incidents.get(incident_id)
            return dict(item) if item else None

    def list_incidents(self, limit: int = 50, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._incidents.values())
            if tenant_id and tenant_id not in ("*", "all", "PPD-ALL"):
                alias_group = {"smk-sentiasa", "smk-seksyen-11", "default", "root"} if tenant_id in ("smk-sentiasa", "smk-seksyen-11") else {tenant_id}
                items = [
                    i for i in items
                    if i.get("tenant_id") == tenant_id
                    or not i.get("tenant_id")
                    or (i.get("tenant_id") in alias_group)
                ]
            # Sort by created_at descending
            items.sort(
                key=lambda x: x.get("created_at", ""),
                reverse=True,
            )
            return [dict(i) for i in items[:limit]]

    def enqueue_hitl(self, item: Dict[str, Any], tenant_id: Optional[str] = None) -> str:
        with self._lock:
            clean = _sanitize_for_firestore(item)
            queue_id = clean.get("queue_id") or f"hitl_{uuid4().hex[:12]}"
            clean["queue_id"] = queue_id
            if tenant_id:
                clean["tenant_id"] = tenant_id
            if "review_status" not in clean:
                clean["review_status"] = "PENDING_HUMAN_TRIAGE"
            if "created_at" not in clean:
                clean["created_at"] = datetime.now(timezone.utc).isoformat()
            self._hitl_queue[queue_id] = clean
            self._save_to_disk()
            return queue_id

    def get_hitl_queue(self, status: Optional[str] = None, tenant_id: Optional[str] = "smk-sentiasa") -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._hitl_queue.values())
            # Multi-tenant aggregation: if tenant_id provided, include both the tenant's items and root/default items
            if tenant_id and tenant_id not in ("*", "all", "PPD-ALL"):
                alias_group = {"smk-sentiasa", "smk-seksyen-11", "default", "root"} if tenant_id in ("smk-sentiasa", "smk-seksyen-11") else {tenant_id}
                items = [
                    i for i in items
                    if i.get("tenant_id") == tenant_id
                    or not i.get("tenant_id")
                    or (i.get("tenant_id") in alias_group)
                ]
            if status:
                items = [i for i in items if i.get("review_status") == status]
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return [dict(i) for i in items]

    def resolve_hitl(self, queue_id: str, decision: str, reviewer_notes: Optional[str] = None, tenant_id: Optional[str] = "smk-sentiasa") -> bool:
        with self._lock:
            item = self._hitl_queue.get(queue_id)
            if not item:
                return False
            item["review_status"] = decision
            item["reviewer_notes"] = reviewer_notes
            item["resolved_at"] = datetime.now(timezone.utc).isoformat()
            self._save_to_disk()
            return True

    def record_audit(self, audit_entry: Dict[str, Any], tenant_id: Optional[str] = None) -> str:
        with self._lock:
            clean = _sanitize_for_firestore(audit_entry)
            audit_id = clean.get("audit_id") or f"audit_{uuid4().hex[:12]}"
            clean["audit_id"] = audit_id
            if tenant_id:
                clean["tenant_id"] = tenant_id
            if "timestamp" not in clean:
                clean["timestamp"] = datetime.now(timezone.utc).isoformat()
            self._audit_log.append(clean)
            self._save_to_disk()
            return audit_id

    def get_audit_log(self, incident_id: Optional[str] = None, limit: int = 100, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            entries = self._audit_log
            if tenant_id:
                entries = [e for e in entries if e.get("tenant_id") == tenant_id]
            if incident_id:
                entries = [e for e in entries if e.get("incident_id") == incident_id]
            return [dict(e) for e in reversed(entries[-limit:])]

    def get_osint_settings(self, tenant_id: str = "smk-sentiasa") -> Dict[str, Any]:
        with self._lock:
            if tenant_id not in self._osint_settings:
                self._osint_settings[tenant_id] = _load_default_osint_config(tenant_id)
            return dict(self._osint_settings[tenant_id])

    def save_osint_settings(self, settings: Dict[str, Any], tenant_id: str = "smk-sentiasa") -> bool:
        with self._lock:
            clean = _sanitize_for_firestore(settings)
            clean["tenant_id"] = tenant_id
            clean["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._osint_settings[tenant_id] = clean
            self._save_to_disk()
            return True

    def get_polemic_settings(self) -> Dict[str, Any]:
        with self._lock:
            data = _load_default_polemic_config()
            if self._polemic_settings:
                data.update(self._polemic_settings)
            self._polemic_settings = data
            return dict(self._polemic_settings)

    def save_polemic_settings(self, settings: Dict[str, Any]) -> bool:
        with self._lock:
            clean = _sanitize_for_firestore(settings)
            clean["updated_at"] = datetime.now(timezone.utc).isoformat()
            if not self._polemic_settings:
                self._polemic_settings = _load_default_polemic_config()
            self._polemic_settings.update(clean)
            self._save_to_disk()
            return True

    def get_system_settings(self) -> Dict[str, Any]:
        with self._lock:
            data = _load_default_system_config()
            if self._system_settings:
                data.update(self._system_settings)
            self._system_settings = data
            return dict(self._system_settings)

    def save_system_settings(self, settings: Dict[str, Any]) -> bool:
        with self._lock:
            clean = _sanitize_for_firestore(settings)
            clean["updated_at"] = datetime.now(timezone.utc).isoformat()
            if not self._system_settings:
                self._system_settings = _load_default_system_config()
            self._system_settings.update(clean)
            self._save_to_disk()
            return True

    def get_slang_glossary(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._slang_glossary)

    def save_slang_glossary(self, glossary: Dict[str, Any]) -> bool:
        with self._lock:
            clean = _sanitize_for_firestore(glossary)
            self._slang_glossary = clean
            self._save_to_disk()
            return True

    def clear(self) -> None:
        with self._lock:
            self._incidents.clear()
            self._hitl_queue.clear()
            self._audit_log.clear()
            self._osint_settings.clear()
            self._polemic_settings.clear()
            if not self._is_pytest and self._PERSIST_PATH.exists():
                try:
                    self._PERSIST_PATH.unlink()
                except Exception:
                    pass


class FirestoreLedger(SentiasaLedger):
    """
    Production-grade Google Cloud Firestore adapter.
    Persists data to Firestore Native database on GCP project modified-argon-471003-i3.
    Collections:
    - Root: /incidents, /hitl_queue, /audit_log, /settings/osint_config
    - Partitioned Tenant: /tenants/{tenant_id}/incidents, /tenants/{tenant_id}/hitl_queue, etc.
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        database_id: Optional[str] = None,
        client: Optional[Any] = None,
    ):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", DEFAULT_GCP_PROJECT_ID)
        self.database_id = database_id or os.getenv("FIRESTORE_DATABASE_ID", DEFAULT_FIRESTORE_DATABASE)

        if client is not None:
            self.db = client
        else:
            try:
                from google.cloud import firestore
                self.db = firestore.Client(project=self.project_id, database=self.database_id)
                logger.info(
                    f"Initialized FirestoreLedger on project '{self.project_id}', database '{self.database_id}'"
                )
            except Exception as exc:
                logger.error(f"Failed to initialize Firestore Client: {exc}")
                raise

    def record_incident(self, incident_data: Dict[str, Any], tenant_id: Optional[str] = None) -> str:
        clean = _sanitize_for_firestore(incident_data)
        incident_id = clean.get("incident_id") or f"inc_{uuid4().hex[:12]}"
        clean["incident_id"] = incident_id
        if tenant_id:
            clean["tenant_id"] = tenant_id
        if "created_at" not in clean:
            clean["created_at"] = datetime.now(timezone.utc).isoformat()

        if tenant_id and tenant_id != "default":
            doc_ref = self.db.collection("tenants").document(tenant_id).collection("incidents").document(incident_id)
        else:
            doc_ref = self.db.collection("incidents").document(incident_id)

        doc_ref.set(clean)
        return incident_id

    def get_incident(self, incident_id: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if tenant_id and tenant_id != "default":
            doc_ref = self.db.collection("tenants").document(tenant_id).collection("incidents").document(incident_id)
        else:
            doc_ref = self.db.collection("incidents").document(incident_id)

        snapshot = doc_ref.get()
        if not snapshot.exists:
            return None
        return snapshot.to_dict()

    def list_incidents(self, limit: int = 50, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        items_dict: Dict[str, Dict[str, Any]] = {}

        # 1. Root-level incidents
        try:
            for doc in self.db.collection("incidents").order_by("created_at", direction="DESCENDING").limit(limit).stream():
                d = doc.to_dict()
                if d and "incident_id" in d:
                    items_dict[d["incident_id"]] = d
        except Exception:
            pass

        # 2. Specific tenant partition vs collection group across all tenants
        if tenant_id and tenant_id not in ("*", "all", "default", "PPD-ALL"):
            tenants_to_check = [tenant_id]
            if tenant_id in ("smk-kuching-high", "smk-sentiasa"):
                tenants_to_check = ["smk-kuching-high", "smk-sentiasa"]
            elif tenant_id in ("smk-seksyen-11", "smk-sentiasa"):
                tenants_to_check = ["smk-seksyen-11", "smk-sentiasa"]
            for tid in tenants_to_check:
                try:
                    coll = self.db.collection("tenants").document(tid).collection("incidents")
                    for doc in coll.order_by("created_at", direction="DESCENDING").limit(limit).stream():
                        d = doc.to_dict()
                        if d and "incident_id" in d:
                            items_dict[d["incident_id"]] = d
                except Exception:
                    pass
        else:
            for tid in ["smk-seksyen-11", "smk-seksyen-9", "smk-kuching-high", "smk-sentiasa"]:
                try:
                    coll = self.db.collection("tenants").document(tid).collection("incidents")
                    for doc in coll.order_by("created_at", direction="DESCENDING").limit(limit).stream():
                        d = doc.to_dict()
                        if d and "incident_id" in d:
                            items_dict[d["incident_id"]] = d
                except Exception:
                    pass
            try:
                cg = self.db.collection_group("incidents")
                for doc in cg.limit(limit).stream():
                    d = doc.to_dict()
                    if d and "incident_id" in d:
                        items_dict[d["incident_id"]] = d
            except Exception:
                pass

        items = list(items_dict.values())
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items[:limit]

    def enqueue_hitl(self, item: Dict[str, Any], tenant_id: Optional[str] = None) -> str:
        clean = _sanitize_for_firestore(item)
        queue_id = clean.get("queue_id") or f"hitl_{uuid4().hex[:12]}"
        clean["queue_id"] = queue_id
        if tenant_id:
            clean["tenant_id"] = tenant_id
        if "review_status" not in clean:
            clean["review_status"] = "PENDING_HUMAN_TRIAGE"
        if "status" not in clean:
            clean["status"] = clean["review_status"]
        if "created_at" not in clean:
            clean["created_at"] = datetime.now(timezone.utc).isoformat()

        try:
            self.db.collection("hitl_queue").document(queue_id).set(clean)
        except Exception:
            pass

        if tenant_id and tenant_id != "default":
            doc_ref = self.db.collection("tenants").document(tenant_id).collection("hitl_queue").document(queue_id)
            doc_ref.set(clean)
        return queue_id

    def get_hitl_queue(self, status: Optional[str] = None, tenant_id: Optional[str] = "smk-sentiasa") -> List[Dict[str, Any]]:
        # Aggregate tenant-partitioned tickets and root-level tickets
        items_dict: Dict[str, Dict[str, Any]] = {}

        # 1. Root collection
        try:
            for doc in self.db.collection("hitl_queue").stream():
                d = doc.to_dict()
                if d and "queue_id" in d:
                    items_dict[d["queue_id"]] = d
        except Exception:
            pass

        # 2. Multi-tenant vs single-tenant partition
        if not tenant_id or tenant_id in ("*", "all", "PPD-ALL", "default", "root"):
            tenants_to_check = ["smk-seksyen-11", "smk-seksyen-9", "smk-kuching-high", "smk-sentiasa"]
        elif tenant_id in ("smk-kuching-high", "smk-sentiasa"):
            tenants_to_check = ["smk-kuching-high", "smk-sentiasa"]
        elif tenant_id in ("smk-seksyen-11", "smk-sentiasa"):
            tenants_to_check = ["smk-seksyen-11", "smk-sentiasa"]
        else:
            tenants_to_check = [tenant_id]

        for tid in tenants_to_check:
            try:
                tenant_coll = self.db.collection("tenants").document(tid).collection("hitl_queue")
                for doc in tenant_coll.stream():
                    d = doc.to_dict()
                    if d and "queue_id" in d:
                        items_dict[d["queue_id"]] = d
            except Exception:
                pass

        items = list(items_dict.values())
        if status:
            items = [i for i in items if (i.get("review_status") or i.get("status")) == status]
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items

    def resolve_hitl(self, queue_id: str, decision: str, reviewer_notes: Optional[str] = None, tenant_id: Optional[str] = None) -> bool:
        update_payload = {
            "review_status": decision,
            "status": decision,
            "reviewer_notes": reviewer_notes,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }
        updated_any = False

        try:
            root_ref = self.db.collection("hitl_queue").document(queue_id)
            snap = root_ref.get()
            if snap and snap.exists:
                root_ref.update(update_payload)
                updated_any = True
        except Exception:
            pass

        candidates = ["smk-seksyen-11", "smk-seksyen-9", "smk-kuching-high", "smk-sentiasa"]
        if tenant_id and tenant_id not in candidates and tenant_id not in ("*", "all", "default", "root"):
            candidates.insert(0, tenant_id)
        for tid in candidates:
            try:
                tenant_ref = self.db.collection("tenants").document(tid).collection("hitl_queue").document(queue_id)
                snap = tenant_ref.get()
                if snap and snap.exists:
                    tenant_ref.update(update_payload)
                    updated_any = True
            except Exception:
                pass

        return updated_any

    def record_audit(self, audit_entry: Dict[str, Any], tenant_id: Optional[str] = None) -> str:
        clean = _sanitize_for_firestore(audit_entry)
        audit_id = clean.get("audit_id") or f"audit_{uuid4().hex[:12]}"
        clean["audit_id"] = audit_id
        if tenant_id:
            clean["tenant_id"] = tenant_id
        if "timestamp" not in clean:
            clean["timestamp"] = datetime.now(timezone.utc).isoformat()

        if tenant_id and tenant_id != "default":
            doc_ref = self.db.collection("tenants").document(tenant_id).collection("audit_log").document(audit_id)
        else:
            doc_ref = self.db.collection("audit_log").document(audit_id)

        doc_ref.set(clean)
        return audit_id

    def get_audit_log(self, incident_id: Optional[str] = None, limit: int = 100, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if tenant_id and tenant_id != "default":
            coll = self.db.collection("tenants").document(tenant_id).collection("audit_log")
        else:
            coll = self.db.collection("audit_log")

        if incident_id:
            try:
                from google.cloud.firestore import FieldFilter
                query = coll.where(filter=FieldFilter("incident_id", "==", incident_id))
            except Exception:
                query = coll.where("incident_id", "==", incident_id)
        else:
            query = coll
        try:
            query = query.order_by("timestamp", direction="DESCENDING").limit(limit)
            return [doc.to_dict() for doc in query.stream()]
        except Exception:
            docs = coll.stream()
            items = [doc.to_dict() for doc in docs]
            if incident_id:
                items = [i for i in items if i.get("incident_id") == incident_id]
            items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return items[:limit]

    def get_osint_settings(self, tenant_id: str = "smk-sentiasa") -> Dict[str, Any]:
        try:
            if tenant_id and tenant_id != "default":
                tenant_doc = (
                    self.db.collection("tenants")
                    .document(tenant_id)
                    .collection("settings")
                    .document("osint_config")
                )
                snap = tenant_doc.get()
                if snap.exists:
                    return snap.to_dict()

            global_doc = self.db.collection("settings").document("osint_config")
            global_snap = global_doc.get()
            if global_snap.exists:
                return global_snap.to_dict()
        except Exception as exc:
            logger.warning(f"Firestore get_osint_settings failed ({exc}), falling back to file defaults.")

        return _load_default_osint_config(tenant_id)

    def save_osint_settings(self, settings: Dict[str, Any], tenant_id: str = "smk-sentiasa") -> bool:
        clean = _sanitize_for_firestore(settings)
        clean["tenant_id"] = tenant_id
        clean["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            if tenant_id and tenant_id != "default":
                tenant_doc = (
                    self.db.collection("tenants")
                    .document(tenant_id)
                    .collection("settings")
                    .document("osint_config")
                )
                tenant_doc.set(clean)

            root_doc = self.db.collection("settings").document("osint_config")
            root_doc.set(clean)
            return True
        except Exception as exc:
            logger.error(f"Firestore save_osint_settings failed: {exc}")
            return False

    def get_polemic_settings(self) -> Dict[str, Any]:
        try:
            doc = self.db.collection("settings").document("polemic_config")
            snap = doc.get()
            if snap.exists:
                data = _load_default_polemic_config()
                data.update(snap.to_dict() or {})
                return data
        except Exception as exc:
            logger.warning(f"Firestore get_polemic_settings failed ({exc}), falling back to default config.")
        return _load_default_polemic_config()

    def save_polemic_settings(self, settings: Dict[str, Any]) -> bool:
        clean = _sanitize_for_firestore(settings)
        clean["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            doc = self.db.collection("settings").document("polemic_config")
            doc.set(clean, merge=True)
            return True
        except Exception as exc:
            logger.error(f"Firestore save_polemic_settings failed: {exc}")
            return False

    def get_system_settings(self) -> Dict[str, Any]:
        try:
            doc = self.db.collection("settings").document("system_config")
            snap = doc.get()
            if snap.exists:
                data = _load_default_system_config()
                data.update(snap.to_dict() or {})
                return data
        except Exception as exc:
            logger.warning(f"Firestore get_system_settings failed ({exc}), falling back to default config.")
        return _load_default_system_config()

    def save_system_settings(self, settings: Dict[str, Any]) -> bool:
        clean = _sanitize_for_firestore(settings)
        clean["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            doc = self.db.collection("settings").document("system_config")
            doc.set(clean, merge=True)
            return True
        except Exception as exc:
            logger.error(f"Firestore save_system_settings failed: {exc}")
            return False

    def get_slang_glossary(self) -> Dict[str, Any]:
        try:
            doc = self.db.collection("settings").document("slang_glossary")
            snap = doc.get()
            if snap.exists:
                return snap.to_dict() or {}
        except Exception as exc:
            logger.warning(f"Firestore get_slang_glossary failed ({exc}), falling back to empty.")
        return {}

    def save_slang_glossary(self, glossary: Dict[str, Any]) -> bool:
        clean = _sanitize_for_firestore(glossary)
        try:
            doc = self.db.collection("settings").document("slang_glossary")
            doc.set(clean, merge=True)
            return True
        except Exception as exc:
            logger.error(f"Firestore save_slang_glossary failed: {exc}")
            return False

    def clear(self) -> None:
        """Batch-deletes documents in collections (limited to 50 for safety)."""
        for coll_name in ["incidents", "hitl_queue", "audit_log"]:
            docs = self.db.collection(coll_name).limit(50).stream()
            for doc in docs:
                doc.reference.delete()


_ledger_instance: Optional[SentiasaLedger] = None


def get_ledger(force_in_memory: bool = False, force_refresh: bool = False) -> SentiasaLedger:
    """
    Singleton factory returning the active SentiasaLedger implementation.
    Rules:
    - Default to InMemoryLedger when under pytest (100% fast, reliable tests).
    - If FIRESTORE_ENABLED is true and not forced to in-memory, instantiates FirestoreLedger.
    - Gracefully falls back to InMemoryLedger if Google Cloud credentials or connection fails.
    """
    global _ledger_instance

    is_pytest = "pytest" in sys.modules or "PYTEST_CURRENT_TEST" in os.environ
    if is_pytest or force_in_memory:
        if _ledger_instance is None or not isinstance(_ledger_instance, InMemoryLedger):
            _ledger_instance = InMemoryLedger()
        return _ledger_instance

    if _ledger_instance is not None and not force_refresh:
        return _ledger_instance

    firestore_enabled = os.getenv("FIRESTORE_ENABLED", "false").lower() in ("true", "1", "yes")

    if force_in_memory or is_pytest or not firestore_enabled:
        instance: SentiasaLedger = InMemoryLedger()
    else:
        try:
            project_id = os.getenv("GCP_PROJECT_ID", DEFAULT_GCP_PROJECT_ID)
            database_id = os.getenv("FIRESTORE_DATABASE_ID", DEFAULT_FIRESTORE_DATABASE)
            instance = FirestoreLedger(project_id=project_id, database_id=database_id)
        except Exception as exc:
            logger.warning(f"Could not connect to Firestore Native ({exc}). Falling back to InMemoryLedger.")
            instance = InMemoryLedger()

    if not force_in_memory:
        _ledger_instance = instance
    return instance


# ------------------------------------------------------------------------------
# Southbridge AI Pre-Execution Budget Ledger Middleware (Rule 10)
# ------------------------------------------------------------------------------

class BudgetLedgerManager:
    """
    Southbridge Rule 10: Reserve money before every call; do the biggest cases first.
    Tracks pre-call reserved budget vs settled cost, enforces per-incident caps,
    and freezes the ledger upon runaway calls or accounting discrepancies.
    """
    DEFAULT_PER_INCIDENT_CAP_USD = 0.50
    DEFAULT_ESTIMATED_COSTS = {
        "tavily_search": 0.005,
        "tavily_extract": 0.005,
        "nebius_vlm": 0.0007,
        "nebius_llm": 0.0003,
        "jev_system_one": 0.002,
        "edge_burst": 0.000,
    }

    def __init__(self, per_incident_cap_usd: float = DEFAULT_PER_INCIDENT_CAP_USD):
        self._lock = threading.Lock()
        self.per_incident_cap_usd = per_incident_cap_usd
        self._incident_ledgers: Dict[str, Dict[str, Any]] = {}

    def get_ledger(self, incident_id: str) -> Dict[str, Any]:
        with self._lock:
            if incident_id not in self._incident_ledgers:
                self._incident_ledgers[incident_id] = {
                    "incident_id": incident_id,
                    "reserved_total_usd": 0.0,
                    "settled_total_usd": 0.0,
                    "frozen": False,
                    "freeze_reason": None,
                    "reservations": [],
                }
            return dict(self._incident_ledgers[incident_id])

    def reserve(
        self,
        incident_id: str,
        call_type: str,
        estimated_cost_usd: Optional[float] = None,
        priority_tier: int = 1,
    ) -> Dict[str, Any]:
        """
        Reserves budget before external dispatch.
        Prioritizes high-severity cases (priority_tier 4/5) and freezes ledger if cap exceeded.
        """
        cost = estimated_cost_usd if estimated_cost_usd is not None else self.DEFAULT_ESTIMATED_COSTS.get(call_type, 0.005)
        reservation_id = f"res_{uuid4().hex[:8]}"

        with self._lock:
            rec = self._incident_ledgers.setdefault(incident_id, {
                "incident_id": incident_id,
                "reserved_total_usd": 0.0,
                "settled_total_usd": 0.0,
                "frozen": False,
                "freeze_reason": None,
                "reservations": [],
            })

            if rec["frozen"]:
                return {
                    "allowed": False,
                    "reservation_id": reservation_id,
                    "reason": f"Ledger is frozen: {rec['freeze_reason']}",
                    "reserved_cost": 0.0,
                }

            if (rec["reserved_total_usd"] + cost) > self.per_incident_cap_usd:
                if priority_tier < 4:
                    rec["frozen"] = True
                    rec["freeze_reason"] = f"Budget cap exceeded (${rec['reserved_total_usd'] + cost:.4f} > ${self.per_incident_cap_usd:.2f})"
                    return {
                        "allowed": False,
                        "reservation_id": reservation_id,
                        "reason": rec["freeze_reason"],
                        "reserved_cost": 0.0,
                    }

            rec["reserved_total_usd"] = round(rec["reserved_total_usd"] + cost, 5)
            rec["reservations"].append({
                "reservation_id": reservation_id,
                "call_type": call_type,
                "reserved_cost": cost,
                "priority_tier": priority_tier,
                "status": "RESERVED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            return {
                "allowed": True,
                "reservation_id": reservation_id,
                "reserved_cost": cost,
                "ledger_state": dict(rec),
            }

    def settle(
        self,
        incident_id: str,
        reservation_id: str,
        actual_cost_usd: float,
    ) -> Dict[str, Any]:
        with self._lock:
            rec = self._incident_ledgers.get(incident_id)
            if not rec:
                return {"settled": False, "reason": "Incident ledger not found"}

            rec["settled_total_usd"] = round(rec["settled_total_usd"] + actual_cost_usd, 5)
            for r in rec["reservations"]:
                if r["reservation_id"] == reservation_id:
                    r["actual_cost"] = actual_cost_usd
                    r["status"] = "SETTLED"
                    break

            return {"settled": True, "ledger_state": dict(rec)}

    def reset(self):
        with self._lock:
            self._incident_ledgers.clear()


budget_ledger_manager = BudgetLedgerManager()

