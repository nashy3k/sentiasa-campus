"""
State definitions and Pydantic v2 schemas for the SENTIASA triage engine.
Integrates Palantir Triad models (Nouns, Verbs, Invariants) and Jev contracts.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel, Field

from backend.jev_contracts import (
    ActionType,
    IncidentActionContract,
    JevEvaluationResult,
    ThreatTier,
)


class SchoolNode(BaseModel):
    """Represents an educational institution or campus entity."""
    school_id: str = Field(description="Unique institutional identifier")
    name: str = Field(description="Display name of the school or campus")
    district: str = Field(default="Klang Valley", description="Administrative district")


class PersonaNode(BaseModel):
    """
    Represents an identified student, actor, or bystander in the incident context.
    Supports Indentia-pattern multi-attribute identity disambiguation to prevent
    spurious alias collisions across cohorts and school campuses.
    """
    entity_id: str = Field(description="Unique identifier for the persona node")
    alias: str = Field(description="Known handle, pseudonym, or alias of the individual")
    school_name: str = Field(description="Associated school or campus location")
    school_id: Optional[str] = Field(default=None, description="Scoped campus identifier (e.g. school_smk_sentiasa)")
    cohort_year: Optional[str] = Field(default=None, description="Academic cohort or form level (e.g. Form 4, Tingkatan 2)")
    class_tag: Optional[str] = Field(default=None, description="Specific classroom assignment (e.g. 4 Amanah, 2 Cekal)")
    role_risk_tier: str = Field(
        default="unknown",
        description="Assigned risk role tier (e.g., Target, Instigator, Bystander, High, Medium, Low)"
    )
    disambiguation_confidence: float = Field(
        default=0.85,
        ge=0.0,
        le=1.0,
        description="Identity grounding certainty based on corroborating attributes"
    )
    observed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when this persona was first observed/extracted in the session"
    )


class AnonymousReporterNode(BaseModel):
    """Represents an unauthenticated or anonymous whistleblower report intake."""
    reporter_id: str = Field(description="Unique hash identifier for anonymous reporter node")
    channel: str = Field(default="WHATSAPP", description="Submission channel")
    salted_ip_hash: Optional[str] = Field(default=None, description="Salted SHA-256 IP hash for anti-swatting")
    verified: bool = Field(default=False, description="Whether counselor has verified report legitimacy")


class ThreatEventNode(BaseModel):
    """
    Represents a categorized incident or threat event extracted from raw input.
    Implements Utopia-pattern bitemporal tracking:
    - valid_at: when the physical event occurred in reality.
    - observed_at: when the intelligence system ingested and processed the record.
    """
    event_id: str = Field(description="Unique identifier for the threat event")
    incident_type: str = Field(
        description="Type of incident (e.g., physical_altercation, cyberbullying, extortion, self_harm)"
    )
    raw_text: str = Field(description="Original report or post text")
    severity_tier: int = Field(
        ge=1,
        le=5,
        description="Incident severity tier evaluated on a 1 (low) to 5 (critical) scale"
    )
    threat_tier: ThreatTier = Field(
        default=ThreatTier.TIER_1_LOW,
        description="Canonical FSM threat tier (LOW, ELEVATED, CRITICAL)"
    )
    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Model confidence score for the threat classification (0.0 to 1.0)"
    )
    context_summary: str = Field(
        description="Synthesized summary of context, location, and potential imminent danger"
    )
    extracted_slang_tokens: List[str] = Field(
        default_factory=list,
        description="List of regional Malaysian youth slang tokens identified (Bahasa Rojak / Manglish)"
    )
    event_timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Bi-temporal physical occurrence timestamp (valid_at)"
    )
    valid_at: Optional[datetime] = Field(
        default=None,
        description="Bitemporal physical occurrence timestamp"
    )
    observed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Bitemporal intelligence intake and ingest timestamp"
    )

    # Sovereign GEOINT & JKR-BIM spatial parameters
    spatial_coordinates: Optional[List[float]] = Field(
        default=None,
        description="[longitude, latitude] or [longitude, latitude, elevation_m]"
    )
    matched_zone_id: Optional[str] = Field(
        default=None,
        description="Matched JKR / BIM spatial zone ID (e.g. HOTSPOT_BILIK_IRON, HOTSPOT_PINTU_BELAKANG)"
    )
    matched_zone_name: Optional[str] = Field(
        default=None,
        description="Human-readable zone name (e.g. Bilik Menggosok ASPURA)"
    )
    spatial_zone_type: Optional[str] = Field(
        default=None,
        description="Spatial zone classification: ACADEMIC, ADMINISTRATIVE, RESIDENTIAL_HOSTEL, BLIND_SPOT_HIGH_RISK, OFF_CAMPUS_PERIMETER"
    )
    is_blind_spot: bool = Field(
        default=False,
        description="True if incident occurred in a high-risk physical blind spot with 0% direct CCTV coverage"
    )
    is_curfew_violation: bool = Field(
        default=False,
        description="True if incident occurred during residential hostel curfew hours (22:30-05:00)"
    )
    intersecting_camera_ids: List[str] = Field(
        default_factory=list,
        description="List of CCTV camera IDs whose FOV cones intersect the incident coordinates"
    )
    spatial_risk_multiplier: float = Field(
        default=1.0,
        ge=0.5,
        le=3.0,
        description="Spatial-temporal multiplier (1.0 default, up to 2.5x for late-night hostel blind spots)"
    )


class SpatialZoneType(str):
    """Categorical classification of physical school zones under JKR/BIM standards."""
    ACADEMIC = "ACADEMIC"
    ADMINISTRATIVE = "ADMINISTRATIVE"
    RESIDENTIAL_HOSTEL = "RESIDENTIAL_HOSTEL"
    COMMUNAL = "COMMUNAL"
    RECREATIONAL = "RECREATIONAL"
    CONTROLLED_INGRESS = "CONTROLLED_INGRESS"
    BLIND_SPOT_HIGH_RISK = "BLIND_SPOT_HIGH_RISK"
    CAMPUS_PERIMETER = "CAMPUS_PERIMETER"
    OFF_CAMPUS_PERIMETER = "OFF_CAMPUS_PERIMETER"


class CameraFOVModel(BaseModel):
    """Calibrated CCTV camera sensor with directional line-of-sight cone geometry."""
    camera_id: str = Field(description="Unique sensor identifier (e.g. CAM-01-MAIN-GATE)")
    name: str = Field(description="Human-readable camera designation")
    stream_url: str = Field(description="Local RTSP or HLS stream URI")
    coordinates: List[float] = Field(description="[longitude, latitude] of camera mount")
    bearing_degrees: float = Field(ge=0.0, le=360.0, description="Azimuth pointing angle (0=North, 90=East, 180=South, 270=West)")
    fov_degrees: float = Field(default=75.0, ge=10.0, le=180.0, description="Horizontal angular field of view")
    range_meters: float = Field(default=35.0, ge=5.0, le=300.0, description="Effective detection range in meters")
    monitors_zone: Optional[str] = Field(default=None, description="Primary JKR zone monitored")
    resolution: str = Field(default="1080p_30fps", description="Stream resolution")
    active: bool = Field(default=True, description="Whether camera is currently online")


class JKRZoneFeature(BaseModel):
    """Parsed BIM/JKR building or sector zone feature from campus GeoJSON."""
    zone_id: str = Field(description="Unique zone code (e.g. HOTSPOT_BILIK_IRON)")
    name: str = Field(description="Standardized Malaysian zone name")
    zone_type: str = Field(description="SpatialZoneType string")
    block_code: str = Field(description="JKR block identifier (e.g. BLOK A, ASPURA)")
    floor_level: int = Field(default=0, description="0=Ground, 1=Level 1, etc.")
    is_sanctuary: bool = Field(default=False, description="True for private areas (sleeping dorms, toilets) where CCTV is forbidden")
    curfew_active: bool = Field(default=False, description="True for hostel residential areas subject to night curfew")
    cctv_coverage_status: str = Field(default="FULL", description="FULL, PARTIAL, CORRIDOR_ONLY, NONE")
    risk_tier: int = Field(default=1, ge=1, le=5)
    polygon_coordinates: List[List[List[float]]] = Field(description="GeoJSON Polygon coordinates [[[lng, lat], ...]]")


class SpatialTriageReport(BaseModel):
    """Deterministic output from pure-math spatial triage evaluation."""
    campus_id: str = Field(description="Target campus tenant identifier")
    incident_coordinates: List[float] = Field(description="[lng, lat]")
    matched_zone: Optional[Dict[str, Any]] = Field(default=None, description="Matched JKRZoneFeature dictionary if inside campus")
    is_inside_campus: bool = Field(default=True, description="True if within CAMPUS_PERIMETER")
    is_blind_spot: bool = Field(default=False, description="True if in designated unmonitored blind spot")
    is_curfew_violation: bool = Field(default=False, description="True if in hostel zone during curfew hours (22:30-05:00)")
    spatial_risk_multiplier: float = Field(default=1.0, description="Calculated spatial-temporal risk factor")
    intersecting_cameras: List[Dict[str, Any]] = Field(default_factory=list, description="Cameras whose FOV wedge covers coordinates")
    recommended_dispatches: List[str] = Field(default_factory=list, description="Disciplinary/Warden dispatch recommendations")
    execution_latency_ms: float = Field(default=0.0, description="Pure-math processing duration in milliseconds")



class RelationalTriple(BaseModel):
    """
    Palantir relational hyperedge connecting entities with typed predicates.
    Supports bitemporal validity and freshness decay styling.
    """
    subject_id: str = Field(description="Source entity ID (Persona or Threat)")
    predicate: str = Field(description="Relational verb (e.g., COMMUNICATES_THREAT, LOCATED_AT, INVOLVES)")
    object_id: str = Field(description="Target entity ID (Persona, Threat, or School)")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    bi_temporal_validity: str = Field(default="VALID", description="Audit validity status")
    valid_at: Optional[datetime] = Field(default=None, description="Physical occurrence validity timestamp")
    observed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Observation timestamp for freshness decay calculation"
    )


class OSINTEvidenceItem(BaseModel):
    """Corroborating social OSINT evidence from Reddit, forums, or regional monitors."""
    title: str = Field(description="Title of post or thread")
    url: str = Field(description="Source URL")
    platform: str = Field(default="web", description="Detected platform (reddit_malaysiauni, lowyat_forum, etc.)")
    engine: str = Field(default="tavily", description="Discovery engine: tavily or exa")
    snippet: Optional[str] = Field(default=None, description="Excerpt or snippet text")
    highlights: List[str] = Field(default_factory=list, description="Verbatim quote highlights extracted via Exa")
    published_date: Optional[str] = Field(default=None, description="Original publication timestamp if available")
    is_fresh: bool = Field(default=True, description="Whether the evidence satisfies bi-temporal freshness (<90 days)")
    relevance_score: Optional[float] = Field(default=None, description="Search relevance score")
    horizon_phase: str = Field(default="LEFT_OF_BANG_PRECURSOR", description="Bang horizon classification: LEFT_OF_BANG_PRECURSOR vs RIGHT_OF_BANG_CORROBORATION")
    sha256_custody: Optional[str] = Field(default=None, description="Evidence Act 1950 Sec 90A SHA-256 statutory digest of content")


class VisualEvidenceReport(BaseModel):
    """
    Strict typed contract emitted by Role 2 Scene Reasoner (Cosmos / MiniCPM-V).
    Detailed in specs/vss_multimodal_vision_strategy.md.
    """
    has_threat_object: bool = Field(
        default=False,
        description="Whether weapons (parang, knives, brass knuckles, blunt objects) are detected",
    )
    detected_objects: List[str] = Field(
        default_factory=list,
        description="List of detected object labels (e.g., 'machete_parang', 'metal_pipe', 'motorcycle_helmet')",
    )
    physical_aggression_detected: bool = Field(
        default=False,
        description="Whether active assault, posturing, cornering, or mob swarming is detected",
    )
    sexual_misconduct_detected: bool = Field(
        default=False,
        description="Whether forced stripping, unclothed victim, sexual assault, or voyeurism is detected",
    )
    scene_type: str = Field(
        default="unknown",
        description="Physical location context: hostel_dorm, school_rear_gate, canteen, hallway, stairwell, field",
    )
    visual_severity_tier: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Assigned visual severity tier: 1 (peaceful) to 5 (active lethal violence)",
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Confidence score of visual classification",
    )
    visual_description: List[str] = Field(
        default_factory=list,
        description="Factual, non-speculative descriptive markers observed in the frames",
    )
    keyframe_timestamps: List[float] = Field(
        default_factory=list,
        description="Video timestamps (seconds) corresponding to sampled peak-motion frames",
    )
    model_used: Optional[str] = Field(
        default=None,
        description="VLM model identifier used for inference (e.g. nvidia/Nemotron-3.5-Super-VL, openbmb/MiniCPM-V-4_5, deterministic_fallback)",
    )
    evidence_sufficiency_met: bool = Field(
        default=True,
        description="Southbridge Rule 01: Positive evidence sufficiency criteria met",
    )
    orthogonal_evidence_doubt: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Southbridge Rule 02: Evidence audit doubt score (reliance on captions/subtitles/occlusion)",
    )
    weakening_factors: List[str] = Field(
        default_factory=list,
        description="Observed factors that weaken visual claim (e.g. on_screen_news_caption_detected, severe_motion_blur)",
    )
    needs_visual_review: bool = Field(
        default=False,
        description="Southbridge Rule 02: Flagged if either primary classification or evidence audit indicates doubt",
    )
    captions_masked: bool = Field(
        default=False,
        description="Whether letterbox/caption masking filter was applied to eliminate OCR cheating bias",
    )


class EvidenceNode(BaseModel):
    """
    Represents a physical media exhibit attached to an incident in Cytoscape.
    Forensically audited under Evidence Act 1950 Sec 90A.
    """
    evidence_id: str = Field(description="Unique identifier (e.g., EVI-CCTV-20260925-01)")
    media_type: str = Field(description="'CCTV_KEYFRAME', 'CCTV_VIDEO', 'WHATSAPP_SCREENSHOT', 'PHONE_VIDEO'")
    source_uri: str = Field(description="Local asset path or GCS vault URL")
    sha256_hash: str = Field(description="Evidence Act 1950 Sec 90A forensic digest")
    threat_markers: List[str] = Field(default_factory=list)
    visual_severity: int = Field(default=1, ge=1, le=5)
    has_threat_object: bool = Field(default=False)
    timestamp_sec: Optional[float] = Field(default=None, description="Video timestamp in seconds")
    keyframe_timestamps: List[float] = Field(default_factory=list, description="All sampled peak motion timestamps in clip")
    filename: Optional[str] = Field(default=None, description="Resolved media filename")
    model_used: Optional[str] = Field(
        default=None,
        description="Model or engine used to process the evidence (e.g. nvidia/Nemotron-3.5-Super-VL, openbmb/MiniCPM-V-4_5, pil_heuristic_parser)",
    )


class FusedSensoryPayload(BaseModel):
    """
    Deterministic zero-LLM barrier aggregation emitted by sensory_fusion_join_node.
    Combines the parallel asynchronous outputs of video_triage_node, normalize_slang_node,
    and osint_discovery_node into a single verified multi-modal evidence contract.
    """
    raw_text: str = Field(default="", description="Original report or post text")
    normalized_text: str = Field(default="", description="Normalized text with slang explanations")
    extracted_slang_tokens: List[str] = Field(default_factory=list, description="Extracted regional youth slang tokens")
    slang_glossary_matches: Dict[str, str] = Field(default_factory=dict, description="Token to meaning mapping")
    slang_token_details: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Contextual polysemy disambiguation details")

    # Vision exhibits (from video_triage_node)
    video_path: Optional[str] = Field(default=None, description="Path to video file if provided")
    visual_evidence: Optional[VisualEvidenceReport] = Field(default=None, description="Role 2 scene reasoner visual report")
    sampled_keyframes: List[Dict[str, Any]] = Field(default_factory=list, description="Peak-motion sampled keyframe metadata")
    evidence_nodes: List[EvidenceNode] = Field(default_factory=list, description="Forensic EvidenceNode exhibits")

    # OSINT exhibits (from osint_discovery_node)
    osint_query: str = Field(default="", description="Synthesized social search query")
    osint_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Corroborating social OSINT evidence items")
    external_citations: List[str] = Field(default_factory=list, description="Verified domain citations")
    pivoted_nodes: List[Dict[str, Any]] = Field(default_factory=list, description="Social Links-style recursive entity transform nodes")
    osint_ai_synthesis: Optional[str] = Field(default=None, description="Tavily AI synthesized intelligence answer")
    osint_codons: List[Dict[str, Any]] = Field(default_factory=list, description="OSINT Codon attempt receipts")
    osint_custody_hash: Optional[str] = Field(default=None, description="Evidence Act 1950 Sec 90A SHA-256 custody digest")
    osint_horizon_phase: str = Field(default="LEFT_OF_BANG_PRECURSOR", description="Dominant Bang Horizon: LEFT_OF_BANG_PRECURSOR vs RIGHT_OF_BANG_CORROBORATION")
    osint_corroborated: bool = Field(default=False, description="Whether fresh social corroboration was found")

    # Zero-LLM deterministic fast-path threat flags
    preliminary_threat_flags: Dict[str, bool] = Field(
        default_factory=dict,
        description="Boolean flags (has_visual_weapon, has_physical_aggression, has_sexual_misconduct, has_critical_slang)",
    )
    # Multi-INT discipline modalities present in this fused payload
    active_modalities: List[str] = Field(
        default_factory=list,
        description="List of verified intelligence disciplines (HUMINT, OSINT, IMINT, GEOINT)",
    )
    fusion_timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Sensory synchronization timestamp",
    )


class IntelligenceModality(str):
    """Sovereign Multi-INT classification standards for campus defense."""
    HUMINT = "HUMINT"  # Whistleblower student reports, counselor notes, teacher statements
    OSINT = "OSINT"    # Scraped forum threads (Lowyat), subreddits (r/bolehland, r/malaysiauni), news
    IMINT = "IMINT"    # Visual imagery: CCTV keyframes, WhatsApp screenshots, phone video
    GEOINT = "GEOINT"  # Spatial location: JKR campus zones, GPS coordinates, physical boundary


class SentiasaIncidentDossier(BaseModel):
    """
    Unified multi-INT tactical incident package.
    Aggregates multi-source evidence, calibrated Jev danger telemetry,
    bitemporal timestamps, and statutory audit integrity for counselors.
    """
    dossier_id: str = Field(description="Unique package identifier (e.g. DOS-20261010-8F91)")
    incident_id: str = Field(description="Target threat event identifier")
    tenant_id: str = Field(default="smk-sentiasa", description="Educational campus partition")
    threat_tier: str = Field(description="Canonical FSM tier (LOW, ELEVATED, CRITICAL)")
    severity_tier: int = Field(ge=1, le=5, description="1 to 5 severity rating")
    incident_type: str = Field(description="Classification (physical_altercation, extortion, etc.)")
    corroborating_modalities: List[str] = Field(
        default_factory=list,
        description="Verified intelligence disciplines (e.g. ['HUMINT', 'IMINT'])"
    )
    is_multi_int_corroborated: bool = Field(
        default=False,
        description="Whether threat is corroborated across >= 2 distinct intelligence disciplines"
    )
    bitemporal_valid_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Physical occurrence timestamp in reality"
    )
    bitemporal_observed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Intelligence ingest timestamp"
    )
    jev_danger_probabilities: Dict[str, float] = Field(
        default_factory=dict,
        description="4-point TypeSafe Jev System One probabilities"
    )
    primary_actors: List[str] = Field(
        default_factory=list,
        description="List of persona aliases involved (Target, Instigator)"
    )
    visual_exhibits_count: int = Field(default=0, description="Count of attached EvidenceNode items")
    osint_citations_count: int = Field(default=0, description="Count of verified OSINT domain citations")
    summary: str = Field(description="Tactical incident summary for school counselors and leadership")
    evidence_act_hash: Optional[str] = Field(
        default=None,
        description="SHA-256 integrity hash compliant with Section 90A Evidence Act 1950"
    )


class GraphState(TypedDict, total=False):
    """Running execution state passed between LangGraph nodes during triage."""
    # Input payloads & audit metadata
    raw_text: str
    target_url: Optional[str]
    metadata: Dict[str, Any]

    policy_version_id: str
    ingest_timestamp: str

    # Video & Multimodal Keyframe Ingest (Section 5 / VSS Blueprint)
    video_path: Optional[str]
    sampled_keyframes: List[Dict[str, Any]]
    keyframe_timestamps: List[float]
    visual_evidence: Optional[VisualEvidenceReport]
    evidence_nodes: List[EvidenceNode]

    # Sensory fusion join barrier (Fan-In)
    fused_sensory: Optional[FusedSensoryPayload]
    osint_query: Optional[str]
    osint_corroborated: bool
    pivoted_nodes: List[Dict[str, Any]]
    osint_ai_synthesis: Optional[str]
    osint_codons: List[Dict[str, Any]]
    osint_custody_hash: Optional[str]
    osint_horizon_phase: Optional[str]

    # Slang normalization stage
    normalized_text: str
    extracted_slang_tokens: List[str]
    slang_glossary_matches: Dict[str, str]
    slang_token_details: Optional[Dict[str, Dict[str, Any]]]

    # Ontology extraction stage (Nebius + Tavily)
    threat_event: Optional[ThreatEventNode]
    personas: List[PersonaNode]
    school: Optional[SchoolNode]
    triples: List[RelationalTriple]
    osint_evidence: List[Dict[str, Any]]
    external_citations: List[str]
    llm_summary: Optional[str]

    # Jev Gatekeeper evaluation stage
    action_contract: Optional[IncidentActionContract]
    candidate_action: Optional[Any]  # JevActionPayload
    firewall_violations: List[Dict[str, Any]]
    cytoscape_active_node_ids: Any  # Set[str] or List[str]
    jev_evaluation: Optional[Dict[str, Any]]
    jev_passed: bool
    requires_operator_approval: bool
    jev_telemetry: Optional[Dict[str, float]]
    # Sovereign GEOINT & JKR-BIM spatial triage stage
    spatial_report: Optional[SpatialTriageReport]

    # Downstream disposition branches
    incident_type: str
    severity_tier: int
    threat_tier: str
    escalation_required: bool
    counselor_alert: Optional[Dict[str, Any]]
    hitl_queue: List[Dict[str, Any]]
    cytoscape_elements: List[Dict[str, Any]]
    audit_log: List[Dict[str, Any]]
    status: str

    # Southbridge AI JIT Ontology & Decision Pipeline Invariants
    attempt_history: List[Dict[str, Any]]
    budget_ledger: Dict[str, Any]
    jit_decision_schema: Optional[Dict[str, Any]]
    needs_doubt_review: bool
    prior_agreement: Optional[bool]
    policy_thresholds: Optional[Dict[str, Any]]
