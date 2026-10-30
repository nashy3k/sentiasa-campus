"""
Jev Deterministic Gatekeeper Contracts & Invariants for Project SENTIASA.

Core Thesis: "Grounding is not enforcement. Semantic correctness is not execution authority."

Enforces Palantir Triad (Nouns, Verbs, Invariants), bi-temporal validity,
strict Finite State Machine (FSM) tier transitions, and confidence tripwires
before real-world safety actions or counselor dispatches are permitted.
"""

import os
import urllib.request
import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ThreatTier(str, Enum):
    TIER_1_LOW = "LOW"
    TIER_2_ELEVATED = "ELEVATED"
    TIER_3_CRITICAL = "CRITICAL"

    @classmethod
    def from_severity_int(cls, severity: int) -> "ThreatTier":
        """Maps legacy integer 1..5 scale to canonical 3-tier FSM state."""
        if severity >= 4:
            return cls.TIER_3_CRITICAL
        elif severity >= 2:
            return cls.TIER_2_ELEVATED
        return cls.TIER_1_LOW

    def to_severity_int(self) -> int:
        """Maps canonical 3-tier FSM state back to 1..5 scale for badge styling."""
        if self == ThreatTier.TIER_3_CRITICAL:
            return 5
        elif self == ThreatTier.TIER_2_ELEVATED:
            return 3
        return 1


class ActionType(str, Enum):
    ESCALATE_TIER = "ESCALATE_TIER"
    DISPATCH_SECURITY = "DISPATCH_SECURITY"
    RESOLVE_INCIDENT = "RESOLVE_INCIDENT"
    REQUEST_HITL = "REQUEST_HITL"


class IncidentActionContract(BaseModel):
    """
    Typed Palantir operational action contract proposed by LLM reasoning.
    Carries bi-temporal anchors and candidate state mutations.
    """
    action: ActionType
    incident_id: str
    current_tier: ThreatTier
    target_tier: ThreatTier
    actor_id: str
    target_entity_id: Optional[str] = None
    location_id: str
    semantic_confidence: float = Field(..., ge=0.0, le=1.0)
    source_timestamp: datetime
    event_timestamp: Optional[datetime] = None
    policy_version_id: str = "2026.09.v1"
    raw_evidence_summary: str = ""
    slang_markers: List[str] = Field(default_factory=list)
    osint_citations: List[str] = Field(default_factory=list)
    has_threat_object: bool = False
    visual_severity_tier: Optional[int] = None
    visual_confidence: Optional[float] = None


class JevVetoException(Exception):
    """Raised when Jev blocks an unauthorized, stale, or illegal agent action."""
    def __init__(self, message: str, code: str = "JEV_VETO", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class JevEvaluationResult(BaseModel):
    """Structured evaluation verdict returned by the Jev Gatekeeper."""
    passed: bool
    veto_reason: Optional[str] = None
    suggested_action: str
    semantic_confidence: float
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    hitl_payload: Optional[Dict[str, Any]] = None


class JevGatekeeper:
    """
    .. deprecated:: 2026.10
       Legacy duplicate gatekeeper. Use :class:`backend.jev.firewall.JevOntologyFirewall` instead.
       Preserved for backwards compatibility with legacy callers.
    """
    ALLOWED_TRANSITIONS: Dict[ThreatTier, List[ThreatTier]] = {
        ThreatTier.TIER_1_LOW: [ThreatTier.TIER_2_ELEVATED],
        ThreatTier.TIER_2_ELEVATED: [ThreatTier.TIER_3_CRITICAL, ThreatTier.TIER_1_LOW],
        ThreatTier.TIER_3_CRITICAL: [ThreatTier.TIER_2_ELEVATED],
    }

    CONFIDENCE_FLOOR_CRITICAL = 0.88
    MAX_SIGNAL_AGE_SECONDS = 7200  # 2 hours
    MAX_FUTURE_CLOCK_SKEW_SECONDS = -30

    @classmethod
    def evaluate(
        cls,
        contract: IncidentActionContract,
        current_time: Optional[datetime] = None,
        query_system_one: bool = True,
    ) -> JevEvaluationResult:
        """
        Evaluates a candidate action against invariants.
        NOTE: Deprecated in favor of backend.jev.firewall.JevOntologyFirewall.
        """
        now = current_time or datetime.now(timezone.utc)

        # Normalize source timestamp to UTC if timezone is missing
        source_ts = contract.source_timestamp
        if source_ts.tzinfo is None:
            source_ts = source_ts.replace(tzinfo=timezone.utc)

        age_seconds = (now - source_ts).total_seconds()

        # Invariant 1: Temporal Skew Check (Reject future anomalies)
        if age_seconds < cls.MAX_FUTURE_CLOCK_SKEW_SECONDS:
            reason = f"Future timestamp anomaly: {age_seconds:.1f}s ahead of clock."
            return JevEvaluationResult(
                passed=False,
                veto_reason=reason,
                suggested_action="ROUTE_TO_HITL_QUEUE",
                semantic_confidence=contract.semantic_confidence,
                hitl_payload={
                    "veto_code": "TEMPORAL_FUTURE_ANOMALY",
                    "reason": reason,
                    "contract": contract.model_dump(mode="json"),
                },
            )

        # Invariant 2: Temporal Staleness Check (> 2 hours requires human review)
        if age_seconds > cls.MAX_SIGNAL_AGE_SECONDS:
            reason = f"Stale signal: {age_seconds:.0f}s old (exceeds {cls.MAX_SIGNAL_AGE_SECONDS}s policy limit). Requires manual triage."
            return JevEvaluationResult(
                passed=False,
                veto_reason=reason,
                suggested_action="ROUTE_TO_HITL_QUEUE",
                semantic_confidence=contract.semantic_confidence,
                hitl_payload={
                    "veto_code": "TEMPORAL_STALE_SIGNAL",
                    "reason": reason,
                    "contract": contract.model_dump(mode="json"),
                },
            )

        # Invariant 3: Strict Finite State Machine Transition Check
        allowed = cls.ALLOWED_TRANSITIONS.get(contract.current_tier, [])
        if contract.target_tier != contract.current_tier and contract.target_tier not in allowed:
            # SHACL-EMERGENCY-BYPASS-01:
            # (has_threat_object == True or visual_severity_tier >= 4) and visual_confidence >= 0.90
            # provides authorized physical bypass directly to TIER_3_CRITICAL (e.g. verified parang / lethal brawl)
            is_emergency_bypass = (
                contract.target_tier == ThreatTier.TIER_3_CRITICAL
                and (
                    contract.has_threat_object
                    or (contract.visual_severity_tier is not None and contract.visual_severity_tier >= 4)
                )
                and (contract.visual_confidence is not None and contract.visual_confidence >= 0.90)
            )
            if not is_emergency_bypass:
                reason = (
                    f"Illegal state jump: Cannot move from {contract.current_tier.value} "
                    f"directly to {contract.target_tier.value}. Must transition through intermediate tier or undergo HITL review."
                )
                return JevEvaluationResult(
                    passed=False,
                    veto_reason=reason,
                    suggested_action="ROUTE_TO_HITL_QUEUE",
                    semantic_confidence=contract.semantic_confidence,
                    hitl_payload={
                        "veto_code": "FSM_ILLEGAL_STATE_JUMP",
                        "reason": reason,
                        "contract": contract.model_dump(mode="json"),
                    },
                )

        # Invariant 4: Confidence Floor for Automated Critical Escalation
        effective_confidence = max(contract.semantic_confidence, contract.visual_confidence or 0.0)
        if contract.target_tier == ThreatTier.TIER_3_CRITICAL and effective_confidence < cls.CONFIDENCE_FLOOR_CRITICAL:
            reason = (
                f"Insufficient confidence ({effective_confidence:.2f} < {cls.CONFIDENCE_FLOOR_CRITICAL}) "
                f"for automated Tier 3 escalation."
            )
            return JevEvaluationResult(
                passed=False,
                veto_reason=reason,
                suggested_action="ROUTE_TO_HITL_QUEUE",
                semantic_confidence=contract.semantic_confidence,
                hitl_payload={
                    "veto_code": "LOW_CONFIDENCE_TRIPWIRE",
                    "reason": reason,
                    "contract": contract.model_dump(mode="json"),
                },
            )

        # Invariant 5: TypeSafe / Jev System One semantic grounding (if API key present)
        jev_key = os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY") or os.environ.get("JEV_API_KEY")
        if query_system_one and jev_key and contract.raw_evidence_summary:
            try:
                jev_res = cls._query_jev_system_one(
                    api_key=jev_key,
                    state_text=contract.raw_evidence_summary,
                    target_tier=contract.target_tier,
                )
                if jev_res is not None:
                    # If Jev evaluates low probability on physical danger for a Critical tier request
                    if contract.target_tier == ThreatTier.TIER_3_CRITICAL and jev_res < 0.45:
                        reason = f"Jev System One veto: Semantic danger probability ({jev_res:.2f}) does not support critical action."
                        return JevEvaluationResult(
                            passed=False,
                            veto_reason=reason,
                            suggested_action="ROUTE_TO_HITL_QUEUE",
                            semantic_confidence=contract.semantic_confidence,
                            hitl_payload={
                                "veto_code": "JEV_SEMANTIC_DISCREPANCY",
                                "reason": reason,
                                "jev_score": jev_res,
                                "contract": contract.model_dump(mode="json"),
                            },
                        )
            except Exception:
                # Network or endpoint errors do not crash evaluation; fall through to deterministic rules
                pass

        # All invariants passed
        return JevEvaluationResult(
            passed=True,
            veto_reason=None,
            suggested_action="DISPATCH_VALIDATED_ALERT",
            semantic_confidence=contract.semantic_confidence,
        )

    @staticmethod
    def _query_jev_system_one(api_key: str, state_text: str, target_tier: ThreatTier) -> Optional[float]:
        """
        Direct REST call to TypeSafe Jev System One endpoint (POST https://api.typesafe.ai/v1/systemone).
        Returns the probability score (0.0 to 1.0) of imminent physical danger.
        """
        url = "https://api.typesafe.ai/v1/systemone"
        payload = {
            "state": state_text[:500],
            "model": "jev-latest",
            "questions": {
                "danger_assessment": {
                    "type": "noul",
                    "instructions": "Does this context describe an imminent physical fight, weapon threat, or acute danger?",
                }
            },
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answer = data.get("answers", {}).get("danger_assessment", {})
            return answer.get("noul")


def _deterministic_offline_telemetry(state_text: str) -> Dict[str, float]:
    """
    Deterministic offline semantic danger assessment fallback.
    Calibrated against sovereign Malaysian youth slang benchmarks.
    """
    lowered = state_text.lower()

    # 1. Imminent violence heuristics
    violence_markers = [
        "belasah", "tibai", "tumbuk", "terajang", "gaduh", "antam", "gocoh",
        "pukul", "bantai", "fight", "brawl", "beat up", "bogel", "serang", "hajar"
    ]
    has_violence = any(m in lowered for m in violence_markers)
    if "tapau" in lowered and not any(f in lowered for f in ["nasi", "makan", "mee", "roti", "bungkus", "kedai", "gerai"]):
        has_violence = True

    # 2. Weapon threat heuristics
    weapon_markers = [
        "parang", "pisau", "blade", "machete", "buku lima", "senjata",
        "knuckleduster", "pedang", "iron pipe", "bat", "kayu hoki", "巴冷刀", "砍人", "கத்தி", "ڤارڠ"
    ]
    has_weapon = any(m in lowered for m in weapon_markers)

    # 3. Extortion / coercion heuristics
    extortion_markers = [
        "pau", "sakau", "ugut", "duit", "wang", "protection money",
        "blackmail", "paksa bagi", "peras", "curi", "收保护费", "மிரட்டல்", "اوݢوت"
    ]
    has_extortion = any(m in lowered for m in extortion_markers)
    if "pau" in lowered and any(f in lowered for f in ["ayam", "kacang", "daging", "kaya", "kukus", "makan pau", "beli pau", "warung"]):
        if not any(e in lowered for e in ["duit", "wang", "ugut", "paksa", "senior", "budak"]):
            has_extortion = False

    # 4. Victim distress heuristics
    distress_markers = [
        "koyak", "nangis", "menangis", "takut", "trauma", "distress", "mental",
        "stres", "stress", "bunuh diri", "nak mati", "kelar tangan", "depress", "tak tahan"
    ]
    has_distress = any(m in lowered for m in distress_markers)
    if "koyak" in lowered and any(mat in lowered for mat in ["kertas", "baju", "seluar", "buku", "plastik"]):
        if not any(d in lowered for d in ["mental", "nangis", "mati", "parah", "gila", "sedih"]):
            has_distress = False

    return {
        "imminent_violence": 0.88 if has_violence else (0.40 if "hostel" in lowered or "asrama" in lowered else 0.05),
        "weapon_threat": 0.94 if has_weapon else 0.02,
        "extortion_coercion": 0.86 if has_extortion else 0.04,
        "victim_distress": 0.92 if ("bunuh diri" in lowered or "nak mati" in lowered) else (0.78 if has_distress else 0.05),
    }


def query_jev_multidimensional_telemetry(
    api_key: str,
    state_text: str,
    timeout_sec: float = 6.0,
    mock_mode: bool = False,
) -> Dict[str, float]:
    """
    Direct REST call to TypeSafe Jev System One endpoint (POST https://api.typesafe.ai/v1/systemone).
    Computes multi-dimensional semantic danger assessment across 4 canonical dimensions:
    - imminent_violence: noul (0.0 to 1.0)
    - weapon_threat: noul (0.0 to 1.0)
    - extortion_coercion: noul (0.0 to 1.0)
    - victim_distress: noul (0.0 to 1.0)

    Gracefully falls back to deterministic offline semantic calibration if offline or mock_mode=True.
    """
    if mock_mode or not api_key or not api_key.strip():
        return _deterministic_offline_telemetry(state_text)

    url = "https://api.typesafe.ai/v1/systemone"
    payload = {
        "state": state_text[:1000],
        "model": "jev-latest",
        "questions": {
            "imminent_violence": {
                "type": "noul",
                "instructions": "Does this text indicate an imminent physical fight, violent battery, assault, or physical altercation?",
            },
            "weapon_threat": {
                "type": "noul",
                "instructions": "Does this context involve or threaten the use of a weapon (such as a parang, machete, knife, blade, iron rod, or knuckleduster)?",
            },
            "extortion_coercion": {
                "type": "noul",
                "instructions": "Does this context describe extortion, blackmail, forced monetary payment, siphoning cash, or coercion?",
            },
            "victim_distress": {
                "type": "noul",
                "instructions": "Does this context indicate acute victim distress, emotional breakdown, fear, crying, trauma, or suicidal distress?",
            },
        },
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answers = data.get("answers", {})
            result: Dict[str, float] = {}
            for dim in ["imminent_violence", "weapon_threat", "extortion_coercion", "victim_distress"]:
                ans = answers.get(dim, {})
                val = ans.get("noul")
                if val is not None:
                    try:
                        result[dim] = round(float(val), 4)
                    except (ValueError, TypeError):
                        result[dim] = 0.0
            if len(result) == 4:
                return result
    except Exception:
        # Fall through to deterministic offline heuristics on network failure/timeout
        pass

    return _deterministic_offline_telemetry(state_text)


def query_jev_polysemy(
    token: str,
    full_text: str,
    api_key: str,
    timeout_sec: float = 5.0,
) -> Optional[float]:
    """
    Direct REST call to TypeSafe Jev System One endpoint for disambiguating ambiguous Malaysian slang tokens
    ('tapau', 'pau', 'koyak'). Returns probability (noul 0.0 to 1.0) that the term is predatory/aggressive
    versus benign colloquial usage.
    Returns None on network failure or if key missing, allowing graceful regex fallback.
    """
    if not api_key or not api_key.strip():
        return None

    instruction_map = {
        "tapau": "In this Malaysian context, is 'tapau' used to mean physically beating up, assaulting, or overpowering someone (noul ~ 1.0), as opposed to food takeaway packaging (noul ~ 0.0)?",
        "pau": "In this Malaysian context, is 'pau' used to mean extorting money, financial shakedown, or coercive bullying (noul ~ 1.0), as opposed to eating a steamed bun (noul ~ 0.0)?",
        "koyak": "In this Malaysian context, is 'koyak' used to mean acute psychological distress, mental breakdown, cyberbullying depression, or severe emotional trauma (noul ~ 1.0), as opposed to physical tearing of material or light esports gaming banter (noul ~ 0.0)?",
    }

    instruction = instruction_map.get(
        token.lower(),
        f"In this Malaysian youth context, is the slang term '{token}' used with aggressive/predatory intent (noul ~ 1.0) versus benign colloquial meaning (noul ~ 0.0)?"
    )

    url = "https://api.typesafe.ai/v1/systemone"
    payload = {
        "state": full_text[:800],
        "model": "jev-latest",
        "questions": {
            "polysemy_threat_probability": {
                "type": "noul",
                "instructions": instruction,
            }
        },
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answer = data.get("answers", {}).get("polysemy_threat_probability", {})
            val = answer.get("noul")
            if val is not None:
                return float(val)
    except Exception:
        pass

    return None
