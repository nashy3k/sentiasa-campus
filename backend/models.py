"""
Domain models, Multi-Tenancy abstractions, and RBAC contracts for Project SENTIASA.
Satisfies Enterprise Security Requirements:
- 5 Sovereign Operator Roles with strict capability isolation
- Multi-Tenant Firestore partition schema: /tenants/{tenant_id}/...
- OSINT source registry and engine configuration schemas
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field


class OperatorRole(str, Enum):
    """
    Sovereign Operator Roles defining access boundaries across the SENTIASA campus safety engine.
    """
    SUPER_ADMIN = "SUPER_ADMIN"
    HEAD_COUNSELOR = "HEAD_COUNSELOR"
    DISCIPLINE_MASTER = "DISCIPLINE_MASTER"
    CAMPUS_SECURITY = "CAMPUS_SECURITY"
    STUDENT_REPORTER = "STUDENT_REPORTER"


class Permission(str, Enum):
    """Granular capabilities enforced at API and UI boundaries."""
    # Super Admin Exclusive Capabilities
    MANAGE_OSINT = "MANAGE_OSINT"
    REGISTER_SLANG = "REGISTER_SLANG"
    MANAGE_TENANT_SETTINGS = "MANAGE_TENANT_SETTINGS"
    EXPORT_SEC_90A = "EXPORT_SEC_90A"

    # Executive Dispatch & Discipline
    DISPATCH_CRITICAL_ALERT = "DISPATCH_CRITICAL_ALERT"  # Tier 4/5 dispatches under SHACL-GOV-01
    DEMERIT_RECORDS = "DEMERIT_RECORDS"

    # Counseling & Triage
    TRIAGE_INCIDENT = "TRIAGE_INCIDENT"
    REVIEW_HITL_QUEUE = "REVIEW_HITL_QUEUE"
    ADD_CASE_INTERVENTION = "ADD_CASE_INTERVENTION"

    # Tactical Intelligence & Reticle Monitoring
    VIEW_RADAR_GRAPH = "VIEW_RADAR_GRAPH"
    CCTV_MONITORING = "CCTV_MONITORING"
    PHYSICAL_ALERT_ACK = "PHYSICAL_ALERT_ACK"

    # Intake Submission (Open to all including whistleblowers)
    SUBMIT_INTAKE = "SUBMIT_INTAKE"


# Strict Capability Mapping Matrix
ROLE_PERMISSIONS: Dict[OperatorRole, Set[Permission]] = {
    OperatorRole.SUPER_ADMIN: {
        Permission.MANAGE_OSINT,
        Permission.REGISTER_SLANG,
        Permission.MANAGE_TENANT_SETTINGS,
        Permission.EXPORT_SEC_90A,
        Permission.DISPATCH_CRITICAL_ALERT,
        Permission.DEMERIT_RECORDS,
        Permission.TRIAGE_INCIDENT,
        Permission.REVIEW_HITL_QUEUE,
        Permission.ADD_CASE_INTERVENTION,
        Permission.VIEW_RADAR_GRAPH,
        Permission.CCTV_MONITORING,
        Permission.PHYSICAL_ALERT_ACK,
        Permission.SUBMIT_INTAKE,
    },
    OperatorRole.HEAD_COUNSELOR: {
        Permission.TRIAGE_INCIDENT,
        Permission.REVIEW_HITL_QUEUE,
        Permission.ADD_CASE_INTERVENTION,
        Permission.VIEW_RADAR_GRAPH,
        Permission.SUBMIT_INTAKE,
    },
    OperatorRole.DISCIPLINE_MASTER: {
        Permission.DISPATCH_CRITICAL_ALERT,
        Permission.DEMERIT_RECORDS,
        Permission.TRIAGE_INCIDENT,
        Permission.VIEW_RADAR_GRAPH,
        Permission.SUBMIT_INTAKE,
    },
    OperatorRole.CAMPUS_SECURITY: {
        Permission.CCTV_MONITORING,
        Permission.PHYSICAL_ALERT_ACK,
        Permission.VIEW_RADAR_GRAPH,
        Permission.SUBMIT_INTAKE,
    },
    OperatorRole.STUDENT_REPORTER: {
        # Strict zero-knowledge boundary: whistleblower intake submission only
        Permission.SUBMIT_INTAKE,
    },
}


def has_permission(role: OperatorRole | str, permission: Permission | str) -> bool:
    """Verifies whether a given role holds the specified permission capability."""
    try:
        if isinstance(role, str):
            role_enum = OperatorRole(role.upper())
        else:
            role_enum = role
    except ValueError:
        return False

    try:
        if isinstance(permission, str):
            perm_enum = Permission(permission)
        else:
            perm_enum = permission
    except ValueError:
        return False

    allowed_set = ROLE_PERMISSIONS.get(role_enum, set())
    return perm_enum in allowed_set


class Tenant(BaseModel):
    """
    Educational campus tenant context for multi-tenant Firestore partitioning.
    Firestore Partition Pattern: /tenants/{tenant_id}/...
    """
    tenant_id: str = Field(default="smk-sentiasa", description="Unique URL-safe tenant identifier (e.g., 'smk-sentiasa')")
    name: str = Field(default="SMK Sentiasa", description="Official name of the school or campus")
    school_code: str = Field(default="BEA8653", description="Ministry of Education official school code")
    district: str = Field(default="Petaling Utama", description="Administrative education district (PPD)")
    state: str = Field(default="Selangor", description="Malaysian state")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = Field(default=True)
    defcon_level: int = Field(default=5, ge=1, le=5, description="Institutional threat readiness posture")


class OperatorContext(BaseModel):
    """Identity context for incoming authenticated operator requests."""
    user_id: str = Field(description="Unique operator identifier")
    username: str = Field(description="Display handle or officer callsign")
    role: OperatorRole = Field(default=OperatorRole.SUPER_ADMIN)
    tenant_id: str = Field(default="smk-sentiasa", description="Associated tenant scope")


class OSINTDomainItem(BaseModel):
    """Targeted social, youth forum, or news monitor domain entry."""
    domain: str = Field(..., description="Target domain or subreddit (e.g. reddit.com/r/malaysiauni)")
    name: Optional[str] = Field(default=None, description="Human readable label")
    category: str = Field(default="youth_community", description="Domain classification")
    tier: int = Field(default=1, ge=1, le=3, description="Priority monitoring tier (1 = primary)")
    enabled: bool = Field(default=True, description="Whether actively searched during OSINT discovery")


class OSINTConfig(BaseModel):
    """
    Tenant-scoped or global OSINT engine configuration.
    Persisted to Firestore under /tenants/{tenant_id}/settings/osint_config or /settings/osint_config.
    """
    tenant_id: str = Field(default="smk-sentiasa")
    tavily_enabled: bool = Field(default=True, description="Enable Tavily keyword-scoped search")
    exa_enabled: bool = Field(default=True, description="Enable Exa neural semantic search with quote highlights")
    max_results: int = Field(default=2, ge=1, le=10, description="Max OSINT evidence items per engine query")
    recency_days: int = Field(default=90, ge=1, le=365, description="Bi-temporal freshness window threshold in days")
    target_domains: List[OSINTDomainItem] = Field(
        default_factory=lambda: [
            OSINTDomainItem(domain="reddit.com/r/malaysiauni", name="r/malaysiauni", category="higher_education", tier=1, enabled=True),
            OSINTDomainItem(domain="reddit.com/r/bolehland", name="r/bolehland", category="youth_unfiltered", tier=1, enabled=True),
            OSINTDomainItem(domain="reddit.com/r/malaysia", name="r/malaysia", category="national_discourse", tier=1, enabled=True),
            OSINTDomainItem(domain="reddit.com/r/spm", name="r/spm", category="secondary_school_exams", tier=2, enabled=True),
            OSINTDomainItem(domain="reddit.com/r/malaysians", name="r/malaysians", category="peer_support_lifestyle", tier=2, enabled=True),
            OSINTDomainItem(domain="forum.lowyat.net", name="Lowyat.NET", category="discussion_forums", tier=2, enabled=True),
            OSINTDomainItem(domain="hmetro.com.my", name="Harian Metro", category="regional_news_monitors", tier=3, enabled=True),
            OSINTDomainItem(domain="sinarharian.com.my", name="Sinar Harian", category="regional_news_monitors", tier=3, enabled=True),
        ]
    )
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: str = Field(default="SUPER_ADMIN")


def get_tenant_firestore_path(collection: str, tenant_id: str = "smk-sentiasa") -> str:
    """
    Constructs multi-tenant partitioned Firestore path:
    Format: tenants/{tenant_id}/{collection}
    """
    clean_tenant = tenant_id.strip() if tenant_id else "smk-sentiasa"
    clean_collection = collection.strip().lstrip("/")
    return f"tenants/{clean_tenant}/{clean_collection}"
