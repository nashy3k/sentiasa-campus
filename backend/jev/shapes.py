"""
Jev Semantic Shapes & Typed Contracts for Project SENTIASA.
Defines 4-tier ThreatTier FSM, ActionVerbs, IngestProvenanceEnvelope,
and the shape-constrained JevActionPayload.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ThreatTier(str, Enum):
    TIER_1_INFO = "INFO"
    TIER_2_MONITOR = "MONITOR"
    TIER_3_ELEVATED = "ELEVATED"
    TIER_4_CRITICAL = "CRITICAL"

    @classmethod
    def from_severity_int(cls, severity: int) -> "ThreatTier":
        """Maps 1..5 scale to canonical 4-tier FSM state."""
        if severity >= 5:
            return cls.TIER_4_CRITICAL
        elif severity >= 3:
            return cls.TIER_3_ELEVATED
        elif severity == 2:
            return cls.TIER_2_MONITOR
        return cls.TIER_1_INFO

    def to_severity_int(self) -> int:
        """Maps canonical 4-tier FSM state to 1..5 scale for UI badge styling."""
        if self == ThreatTier.TIER_4_CRITICAL:
            return 5
        elif self == ThreatTier.TIER_3_ELEVATED:
            return 4
        elif self == ThreatTier.TIER_2_MONITOR:
            return 2
        return 1

    def to_badge_color(self) -> str:
        """Returns color theme for UI badges."""
        if self == ThreatTier.TIER_4_CRITICAL:
            return "red"       # Level 5 - Critical
        elif self == ThreatTier.TIER_3_ELEVATED:
            return "orange"    # Level 3-4 - Elevated
        elif self == ThreatTier.TIER_2_MONITOR:
            return "yellow"    # Level 2 - Monitor
        return "gray"          # Level 1 - Info


class ActionVerb(str, Enum):
    LOG_TELEMETRY = "LOG_TELEMETRY"
    UPDATE_RELATIONSHIP = "UPDATE_RELATIONSHIP"
    ESCALATE_THREAT_TIER = "ESCALATE_THREAT_TIER"
    TRIGGER_CAMPUS_DISPATCH = "TRIGGER_CAMPUS_DISPATCH"
    BROADCAST_CAMPUS_ALERT = "BROADCAST_CAMPUS_ALERT"


class IngestProvenanceEnvelope(BaseModel):
    """
    Forensic Ingest Provenance Envelope.
    Complies with Malaysian Evidence Act 1950 (Section 90A) and CMA 1998 (Sec 233/249).
    Stays strictly in private audit logs and is never projected onto public Cytoscape canvases.
    """
    submission_id: str
    channel: str = Field(description="WHATSAPP_UPLOAD, WEB_PORTAL, or OSINT_SWEEP")
    client_device_type: Optional[str] = Field(default=None, description="e.g. iPhone, Android, Headless script")
    user_agent: Optional[str] = Field(default=None, description="Client user-agent string")
    salted_ip_hash: Optional[str] = Field(default=None, description="Salted SHA-256 IP hash (PDPA compliant)")
    payload_sha256: Optional[str] = Field(default=None, description="Cryptographic SHA-256 hash of raw input/image")
    ingest_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("ingest_timestamp")
    def must_be_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


class JevActionPayload(BaseModel):
    """Shape-constrained candidate action payload emitted by LangGraph agent."""
    action: ActionVerb
    incident_id: str
    current_tier: ThreatTier
    target_tier: ThreatTier
    actor_id: str
    target_entity_id: Optional[str] = None
    location_id: str
    evidence_ids: List[str] = Field(..., min_length=1)
    semantic_confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Model certainty score (0.0 to 1.0)")
    slang_ambiguity_score: float = Field(..., ge=0.0, le=1.0, description="0.0 = unambiguous, 1.0 = highly slang-ambiguous")
    event_timestamp: datetime
    policy_schema_version: str = "2026.09.v1"
    is_anonymous_reporter: bool = False
    osint_corroborated: bool = False
    has_threat_object: bool = False
    visual_severity_tier: Optional[int] = None
    visual_confidence: Optional[float] = None
    is_reviewer_override: bool = False
    # Sovereign GEOINT & JKR-BIM attributes
    spatial_zone_type: Optional[str] = None
    is_off_campus: bool = False
    is_blind_spot: bool = False
    is_curfew_violation: bool = False

    @field_validator("event_timestamp")
    def must_be_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("Timestamp must be timezone-aware (UTC).")
        return v


# ------------------------------------------------------------------------------
# Southbridge AI JIT Ontology & Decision Pipeline Invariants (Sep 2026 Study)
# ------------------------------------------------------------------------------

class PolicyThresholdConfig(BaseModel):
    """
    Southbridge Rule 04: Thresholds are policy, not truth.
    Externalizes confidence and ambiguity thresholds per threat tier.
    """
    critical_floor: float = 0.88
    elevated_floor: float = 0.70
    doubt_band_low: float = 0.45
    doubt_band_high: float = 0.75
    max_slang_ambiguity: float = 0.20
    policy_name: str = "DEFAULT_STANDARD"


class CodonAttemptReceipt(BaseModel):
    """
    Southbridge Rule 09 & 10: Compose in code, keep every attempt & budget receipt.
    Immutable receipt capturing execution parameters, dual-questioning verdicts,
    cross-model agreement, and financial/latency costs.
    """
    codon_id: str = Field(description="Unique codon execution identifier")
    node_name: str = Field(description="LangGraph node name")
    model_family: str = Field(description="e.g. nebius/nemotron-vl, typesafe/jev-system-one, tavily/scoped-search")
    hypothesis_tested: str = Field(default="general_threat", description="Active JIT threat hypothesis")
    evidence_sufficiency_met: bool = Field(default=True, description="Rule 01 positive evidence sufficiency check")
    query_a_verdict: Dict[str, Any] = Field(default_factory=dict, description="Primary threat classification output")
    query_b_evidence_audit: Dict[str, Any] = Field(default_factory=dict, description="Rule 02 orthogonal doubt & artifact check")
    prior_agreement: Optional[bool] = Field(default=None, description="Rule 05 cross-model family agreement")
    reserved_cost_usd: float = Field(default=0.0, description="Rule 10 pre-call reserved budget")
    settled_cost_usd: float = Field(default=0.0, description="Rule 10 settled execution cost")
    latency_ms: float = Field(default=0.0, description="Wall-clock inference latency in ms")
    shacl_passed: bool = Field(default=True, description="Whether execution passed SHACL rig validation")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "codon_id": self.codon_id,
            "node_name": self.node_name,
            "model_family": self.model_family,
            "hypothesis_tested": self.hypothesis_tested,
            "evidence_sufficiency_met": self.evidence_sufficiency_met,
            "query_a_verdict": self.query_a_verdict,
            "query_b_evidence_audit": self.query_b_evidence_audit,
            "prior_agreement": self.prior_agreement,
            "reserved_cost_usd": self.reserved_cost_usd,
            "settled_cost_usd": self.settled_cost_usd,
            "latency_ms": self.latency_ms,
            "shacl_passed": self.shacl_passed,
            "timestamp": self.timestamp.isoformat(),
        }


class RawIngestSourceSchema(BaseModel):
    """
    JIT Ontology Layer 1: Ingest Source Schema.
    Preserves raw untransformed telemetry without forcing early convergence.
    """
    submission_id: str
    channel: str = Field(default="WHATSAPP_UPLOAD")
    raw_payload: str = Field(default="")
    media_type: Optional[str] = None
    media_uri: Optional[str] = None
    provenance: IngestProvenanceEnvelope


class BitemporalStorageSchema(BaseModel):
    """
    JIT Ontology Layer 2: Storage Schema.
    Stores immutable audit reality with explicit valid_at and observed_at dimensions.
    """
    record_id: str
    tenant_id: str = "smk-sentiasa"
    normalized_content: Dict[str, Any] = Field(default_factory=dict)
    valid_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evidence_hash: str = ""


class JITDecisionSchema(BaseModel):
    """
    JIT Ontology Layer 3: Decision Schema.
    Constructed just-in-time at the triage codon based on the evaluated threat hypothesis.
    """
    hypothesis_id: str = Field(description="e.g. physical_altercation, extortion, sexual_assault, self_harm")
    threat_category: str
    positive_sufficiency_criteria: List[str] = Field(
        default_factory=list,
        description="Rule 01: What counts as enough evidence to confirm this threat",
    )
    exclusion_criteria: List[str] = Field(
        default_factory=list,
        description="Negative constraints and false-alarm filters",
    )
    required_modalities: List[str] = Field(
        default_factory=list,
        description="Expected Multi-INT modalities (HUMINT, IMINT, OSINT, GEOINT)",
    )
    policy_thresholds: PolicyThresholdConfig = Field(default_factory=PolicyThresholdConfig)
    constructed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CodonRunner:
    """
    Harness helper executing bounded decision codons with receipt capture,
    budget enforcement, and type fencing.
    """
    @staticmethod
    def create_receipt(
        codon_id: str,
        node_name: str,
        model_family: str,
        hypothesis_tested: str,
        query_a: Dict[str, Any],
        query_b: Dict[str, Any],
        evidence_sufficiency_met: bool = True,
        prior_agreement: Optional[bool] = None,
        reserved_cost: float = 0.0,
        settled_cost: float = 0.0,
        latency_ms: float = 0.0,
        shacl_passed: bool = True,
    ) -> CodonAttemptReceipt:
        return CodonAttemptReceipt(
            codon_id=codon_id,
            node_name=node_name,
            model_family=model_family,
            hypothesis_tested=hypothesis_tested,
            evidence_sufficiency_met=evidence_sufficiency_met,
            query_a_verdict=query_a,
            query_b_evidence_audit=query_b,
            prior_agreement=prior_agreement,
            reserved_cost_usd=reserved_cost,
            settled_cost_usd=settled_cost,
            latency_ms=latency_ms,
            shacl_passed=shacl_passed,
        )

