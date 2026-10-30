"""
Node implementations for the SENTIASA incident triage state engine.
Includes dialect normalization, Nebius-powered ontology extraction, Tavily OSINT discovery,
Jev Gatekeeper invariant enforcement, Cytoscape graph synchronization, and HITL queue routing.
"""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from backend.jev import (
    ActionVerb,
    CodonRunner,
    JITDecisionSchema,
    JevActionPayload,
    JevOntologyFirewall,
    PolicyThresholdConfig,
    ThreatTier as JevThreatTier,
)
from backend.jev_contracts import (
    ActionType,
    IncidentActionContract,
    JevGatekeeper,
    ThreatTier,
    query_jev_multidimensional_telemetry,
    query_jev_polysemy,
)
from backend.nodes.osint_nodes import (
    extract_high_signal_entities,
    extract_thread_content_from_url,
    search_dual_funnel_osint,
)
from backend.state import (
    EvidenceNode,
    FusedSensoryPayload,
    GraphState,
    PersonaNode,
    RelationalTriple,
    SchoolNode,
    ThreatEventNode,
    VisualEvidenceReport,
)

# Explicitly load backend/.env or root .env
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)
load_dotenv()

# Regional slang glossary: Bahasa Melayu / Bahasa Rojak / Manglish youth terms + Borneo & Vernacular Scripts
MALAYSIAN_SLANG_GLOSSARY: Dict[str, Dict[str, Any]] = {
    # Peninsular Core
    "koyak": {"meaning": "emotionally distressed / mentally broken", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "kantoi": {"meaning": "caught red-handed / exposed", "severity_boost": 0, "tier": ThreatTier.TIER_1_LOW},
    "tapau": {"meaning": "physically beat up / overwhelmed", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "belasah": {"meaning": "violently assaulted / beaten", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "tibai": {"meaning": "violently beaten / hammered", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "tumbuk": {"meaning": "punched / fisticuffs", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "terajang": {"meaning": "kicked violently", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "parang": {"meaning": "machete / edged weapon", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "gaduh": {"meaning": "physical fight / brawl", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "pau": {"meaning": "extorted for money / items", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "sakau": {"meaning": "siphoned / robbed", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "ugut": {"meaning": "threatened / blackmailed", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "kacau": {"meaning": "harassed / stalked", "severity_boost": 1, "tier": ThreatTier.TIER_1_LOW},
    "rempit": {"meaning": "reckless illegal racing / gang activity", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "budak": {"meaning": "kid / student", "severity_boost": 0, "tier": ThreatTier.TIER_1_LOW},
    "ponteng": {"meaning": "truancy / skipping school", "severity_boost": 0, "tier": ThreatTier.TIER_1_LOW},
    "bunuh diri": {"meaning": "self-harm / suicide intent", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    # Sexual Violence, Molestation & Harassment (Child Act 2001 / Act 792 / KPM)
    "rogol": {"meaning": "rape / acute sexual assault", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "cabul": {"meaning": "sexual molestation / indecent assault", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "raba": {"meaning": "sexual groping / unwanted touching", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "skodeng": {"meaning": "voyeurism / peeping in bathrooms/hostels", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "bogel": {"meaning": "forced stripping / non-consensual nude exploitation", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "liwat": {"meaning": "sodomy / non-consensual sexual assault", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "perkosa": {"meaning": "rape / sexual violation", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "gangguan seksual": {"meaning": "sexual harassment", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    # Borneo Cohort (Sabah & Sarawak Vernacular)
    "antam": {"meaning": "violently assaulted / beaten with brute force", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "paloi": {"meaning": "targeted bullying victim / fool", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "palui": {"meaning": "reckless fool / targeted victim", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "bikin panas": {"meaning": "provoking a fight / creating conflict", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "pukul sampai patah": {"meaning": "severe battery / bone fracture", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "bubut": {"meaning": "chasing down in hostile pursuit", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "tampung": {"meaning": "gang assault / group ambush", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "buyuk": {"meaning": "cheating / extortion deception", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "pilak": {"meaning": "derogatory provocation inciting fight", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "kondem": {"meaning": "severe verbal condemnation / bullying", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "tetak": {"meaning": "slash / hack with bladed weapon", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "kelar tangan": {"meaning": "self-harm / wrist slitting", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "sik tahan": {"meaning": "acute psychological distress / cannot endure", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "sidak": {"meaning": "hostile group / extortion gang", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "pukul curi": {"meaning": "sucker punch / coward ambush", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "parang barung": {"meaning": "traditional Sabahan bladed machete", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    # Tagalog & Suluk Cohort (East Sabah Coastal / Cross-Border Youth Slang)
    "patay": {"meaning": "death threat / killed", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "patayin": {"meaning": "murder / intentional homicide threat", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "saksak": {"meaning": "stabbing with knife or blade", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "suntok": {"meaning": "punch / fist assault", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "suntukan": {"meaning": "organized fistfight / brawl", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "bugbog": {"meaning": "severe gang beating / physical battery", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "baril": {"meaning": "firearm / gun threat", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "nakaw": {"meaning": "extortion / physical theft of items", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "holdup": {"meaning": "armed mugging / campus robbery", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "tarantado": {"meaning": "hostile provocateur / scoundrel", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "gago": {"meaning": "derogatory insult provoking brawl", "severity_boost": 1, "tier": ThreatTier.TIER_2_ELEVATED},
    "putang": {"meaning": "aggressive vulgar provocation", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    # Chinese Vernacular (SJKC / Malaysian Chinese)
    "砍人": {"meaning": "slashing with blade / attack", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "巴冷刀": {"meaning": "parang / machete", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "收保护费": {"meaning": "extorting protection money", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "打人": {"meaning": "physical assault / beating", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "围殴": {"meaning": "gang battery / mob assault", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "强奸": {"meaning": "rape / sexual assault", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "非礼": {"meaning": "sexual molestation / indecent assault", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "偷拍": {"meaning": "voyeurism / secret bathroom recording", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    # Tamil Vernacular (SJKT)
    "கத்தி": {"meaning": "knife / bladed weapon", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "மிரட்டல்": {"meaning": "extortion / intimidation threat", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "தாக்குதல்": {"meaning": "physical battery / violent assault", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "கற்பழிப்பு": {"meaning": "rape / sexual violence", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "பாலியல் துன்புறுத்தல்": {"meaning": "sexual assault / abuse", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "பாலியல் தொல்லை": {"meaning": "sexual harassment", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    # Jawi Script Equivalents
    "ڤارڠ": {"meaning": "machete / parang", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "بلاساه": {"meaning": "violent physical battery", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "اوݢوت": {"meaning": "blackmail / extortion", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
    "بونوه ديري": {"meaning": "suicide / acute self-harm", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "روݢول": {"meaning": "rape", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "چابول": {"meaning": "sexual molestation", "severity_boost": 4, "tier": ThreatTier.TIER_3_CRITICAL},
    "راب": {"meaning": "sexual groping", "severity_boost": 3, "tier": ThreatTier.TIER_3_CRITICAL},
    "سکوديڠ": {"meaning": "voyeurism / peeping", "severity_boost": 2, "tier": ThreatTier.TIER_2_ELEVATED},
}


def _strip_model_thinking_tags(text: str) -> str:
    """
    Strips LLM reasoning tags, chain-of-thought scratchpads, and Nemotron preambles.
    Handles:
    - <think>...</think>
    - <thought>...</thought>
    - Here's a thinking process:... (up to answer or double newline)
    - Thinking Process:...
    """
    if not text:
        return ""

    # 1. Strip xml-style thought blocks
    cleaned = re.sub(r"(?is)<think>.*?</think>", "", text)
    cleaned = re.sub(r"(?is)<thought>.*?</thought>", "", cleaned)

    # 2. Strip "Here's a thinking process: ..." up to the final answer or conclusion
    cleaned = re.sub(
        r"(?is)^(Here'?s\s+a\s+thinking\s+process|Thinking\s+Process|Reasoning\s+Process):.*?(?=(\n\s*\n|\bSummary:|\bRisk:|\bConclusion:|\Z))",
        "",
        cleaned,
    )

    # 3. If any residual thinking traces remain:
    cleaned = cleaned.strip()
    if not cleaned or "analyze user input" in cleaned.lower() or "thinking process" in cleaned.lower():
        return ""

    # Remove leading markdown headers like "### Summary:" or "**Summary:**"
    cleaned = re.sub(r"^(#+\s*|\*\*)?(Summary|Risk\s+Summary|Assessment):\s*(\*\*)?", "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned


def disambiguate_slang_polysemy(
    token: str,
    full_text: str,
    mock_mode: bool = False,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Contextually disambiguates Malaysian polysemous slang terms.
    Determines whether a word with multiple meanings (e.g. 'tapau', 'pau', 'koyak')
    is used in a benign colloquial context (food, stationery, banter)
    or in an aggressive threat/distress context (assault, extortion, breakdown).

    Upgraded with TypeSafe Jev System One probability query with graceful fallback
    to deterministic regex heuristics when offline or in mock mode.
    """
    lowered = full_text.lower()
    default_meta = MALAYSIAN_SLANG_GLOSSARY.get(token, {
        "meaning": "slang term",
        "severity_boost": 0,
        "tier": ThreatTier.TIER_1_LOW,
        "is_threat": False,
    })

    # Upgrade Polysemy Disambiguation with Jev System One (if active key available and not in mock mode)
    active_key = api_key or os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY")
    if not mock_mode and active_key and token in ("tapau", "pau", "koyak"):
        try:
            noul_prob = query_jev_polysemy(token=token, full_text=full_text, api_key=active_key)
            if noul_prob is not None:
                if noul_prob >= 0.50:
                    # Predatory / extortion / assault / distress classification from Jev
                    if token == "tapau":
                        boost = 3 if ("hostel" in lowered or "asrama" in lowered or "belasah" in lowered) else 2
                        return {
                            "meaning": "physically beat up / violently assaulted",
                            "severity_boost": boost,
                            "tier": ThreatTier.TIER_2_ELEVATED,
                            "is_threat": True,
                            "category": "physical_altercation",
                            "jev_polysemy_prob": noul_prob,
                            "disambiguation_source": "jev_system_one",
                        }
                    elif token == "pau":
                        return {
                            "meaning": "extorted for money / items",
                            "severity_boost": 2,
                            "tier": ThreatTier.TIER_2_ELEVATED,
                            "is_threat": True,
                            "category": "extortion",
                            "jev_polysemy_prob": noul_prob,
                            "disambiguation_source": "jev_system_one",
                        }
                    elif token == "koyak":
                        boost = 2 if ("parah" in lowered or "gila" in lowered or "mati" in lowered) else 1
                        return {
                            "meaning": "emotionally distressed / mentally broken",
                            "severity_boost": boost,
                            "tier": ThreatTier.TIER_2_ELEVATED,
                            "is_threat": True,
                            "category": "emotional_distress",
                            "jev_polysemy_prob": noul_prob,
                            "disambiguation_source": "jev_system_one",
                        }
                else:
                    # Benign classification from Jev
                    if token == "tapau":
                        return {
                            "meaning": "takeaway food / packaging (benign)",
                            "severity_boost": 0,
                            "tier": ThreatTier.TIER_1_LOW,
                            "is_threat": False,
                            "category": "food_takeaway",
                            "jev_polysemy_prob": noul_prob,
                            "disambiguation_source": "jev_system_one",
                        }
                    elif token == "pau":
                        return {
                            "meaning": "steamed bun / food (benign)",
                            "severity_boost": 0,
                            "tier": ThreatTier.TIER_1_LOW,
                            "is_threat": False,
                            "category": "food_item",
                            "jev_polysemy_prob": noul_prob,
                            "disambiguation_source": "jev_system_one",
                        }
                    elif token == "koyak":
                        return {
                            "meaning": "physically torn material (benign)",
                            "severity_boost": 0,
                            "tier": ThreatTier.TIER_1_LOW,
                            "is_threat": False,
                            "category": "material_damage",
                            "jev_polysemy_prob": noul_prob,
                            "disambiguation_source": "jev_system_one",
                        }
        except Exception:
            # Fall back to regex heuristics on any network / parsing exception
            pass

    # Graceful fallback: Deterministic regex heuristics
    if token == "tapau":
        # Benign food takeaway markers:
        food_keywords = [
            "nasi", "lemak", "makan", "makanan", "bungkus", "kedai", "gerai",
            "mee", "roti", "lauk", "minum", "order", "teh", "kopi", "kantin",
            "pasar", "bazar", "restoran", "bungkus tapau", "tapau nasi",
        ]
        # Violence markers:
        violence_keywords = [
            "hostel", "asrama", "belasah", "pukul", "gaduh", "batch",
            "junior", "senior", "budak hostel", "kitorang tapau", "kena tapau",
            "ramai", "parang", "ugut", "tumbuk", "sepak", "bogel", "bilik",
            "nak tapau budak", "tapau budak",
        ]
        has_food = any(w in lowered for w in food_keywords)
        has_violence = any(w in lowered for w in violence_keywords)

        if has_food and not has_violence:
            return {
                "meaning": "takeaway food / packaging (benign)",
                "severity_boost": 0,
                "tier": ThreatTier.TIER_1_LOW,
                "is_threat": False,
                "category": "food_takeaway",
                "disambiguation_source": "regex_heuristic",
            }
        else:
            # If hostel or explicit assault indicators present, assign high severity
            boost = 3 if ("hostel" in lowered or "asrama" in lowered or "belasah" in lowered) else 2
            tier = ThreatTier.TIER_2_ELEVATED
            return {
                "meaning": "physically beat up / violently assaulted",
                "severity_boost": boost,
                "tier": tier,
                "is_threat": True,
                "category": "physical_altercation",
                "disambiguation_source": "regex_heuristic",
            }

    elif token == "pau":
        # Benign food indicators:
        food_keywords = [
            "makan", "kedai", "kukus", "ayam", "kacang", "daging", "kaya",
            "sedap", "pau panas", "beli pau", "makan pau", "warung",
        ]
        # Extortion indicators:
        extortion_keywords = [
            "duit", "wang", "belanja", "rokok", "phone", "barang", "kena pau",
            "pau budak", "senior pau", "hari-hari", "tiap hari", "pagar", "ugut",
            "paksa bagi",
        ]
        has_food = any(w in lowered for w in food_keywords)
        has_extortion = any(w in lowered for w in extortion_keywords)

        if has_food and not has_extortion:
            return {
                "meaning": "steamed bun / food (benign)",
                "severity_boost": 0,
                "tier": ThreatTier.TIER_1_LOW,
                "is_threat": False,
                "category": "food_item",
                "disambiguation_source": "regex_heuristic",
            }
        else:
            return {
                "meaning": "extorted for money / items",
                "severity_boost": 2,
                "tier": ThreatTier.TIER_2_ELEVATED,
                "is_threat": True,
                "category": "extortion",
                "disambiguation_source": "regex_heuristic",
            }

    elif token == "koyak":
        # Benign material tearing:
        material_keywords = [
            "kertas", "baju", "seluar", "buku", "plastik", "beg", "tali",
            "kain", "nota", "koyak kertas", "koyak buku",
        ]
        # Mental distress / cyberbullying:
        distress_keywords = [
            "parah", "gila", "mental", "teruk", "hati", "sedih", "nangis",
            "menangis", "depress", "depression", "stress", "stres", "mati",
            "kecam", "netizen", "koyak parah", "koyak gila", "tak tahan",
        ]
        has_material = any(w in lowered for w in material_keywords)
        has_distress = any(w in lowered for w in distress_keywords)

        if has_material and not has_distress:
            return {
                "meaning": "physically torn material (benign)",
                "severity_boost": 0,
                "tier": ThreatTier.TIER_1_LOW,
                "is_threat": False,
                "category": "material_damage",
                "disambiguation_source": "regex_heuristic",
            }
        else:
            boost = 2 if ("parah" in lowered or "gila" in lowered or "mati" in lowered) else 1
            return {
                "meaning": "emotionally distressed / mentally broken",
                "severity_boost": boost,
                "tier": ThreatTier.TIER_2_ELEVATED,
                "is_threat": True,
                "category": "emotional_distress",
                "disambiguation_source": "regex_heuristic",
            }

    # For other tokens in glossary:
    return {
        "meaning": default_meta.get("meaning", "slang term"),
        "severity_boost": default_meta.get("severity_boost", 0),
        "tier": default_meta.get("tier", ThreatTier.TIER_1_LOW),
        "is_threat": default_meta.get("severity_boost", 0) > 0,
        "category": "slang",
        "disambiguation_source": "glossary_default",
    }


def normalize_slang_node(state: GraphState) -> Dict[str, Any]:
    """
    Decodes and normalizes Malaysian youth slang (Bahasa Rojak / Manglish).
    Identifies slang tokens, matches them with semantic meanings, and creates normalized text.
    Applies contextual polysemy disambiguation for terms with dual meanings.
    If target_url is provided, extracts thread content from Reddit or Lowyat forum first.
    """
    raw_text = state.get("raw_text", "")
    metadata = state.get("metadata", {})
    mock_mode = bool(metadata.get("mock_external_apis") or metadata.get("mock_mode"))
    jev_key = os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY")
    target_url = state.get("target_url") or metadata.get("target_url")
    url_evidence: Optional[Dict[str, Any]] = None

    if target_url:
        extracted = extract_thread_content_from_url(str(target_url))
        if extracted.get("success") and extracted.get("text"):
            if not raw_text or len(raw_text.strip()) < 10:
                raw_text = f"[{extracted.get('title', 'Extracted Thread')}]: {extracted['text']}"
            else:
                raw_text = f"{raw_text}\n\n[Thread Content - {target_url}]:\n{extracted['text']}"
            url_evidence = extracted

    lowered = raw_text.lower()

    extracted_tokens: List[str] = []
    glossary_matches: Dict[str, str] = {}
    disambiguated_meta: Dict[str, Dict[str, Any]] = {}
    normalized = raw_text

    for token, default_meta in MALAYSIAN_SLANG_GLOSSARY.items():
        is_non_latin = any(ord(char) > 0x024F for char in token)
        pattern = re.escape(token) if is_non_latin else r"\b" + re.escape(token) + r"\b"
        if re.search(pattern, lowered):
            extracted_tokens.append(token)
            resolved_meta = disambiguate_slang_polysemy(
                token,
                lowered,
                mock_mode=mock_mode,
                api_key=jev_key,
            )
            glossary_matches[token] = resolved_meta["meaning"]
            disambiguated_meta[token] = resolved_meta
            normalized = re.sub(
                pattern,
                f"{token} [{resolved_meta['meaning']}]",
                normalized,
                flags=re.IGNORECASE,
            )

    now_iso = datetime.now(timezone.utc).isoformat()
    result_dict: Dict[str, Any] = {
        "raw_text": raw_text,
        "normalized_text": normalized,
        "extracted_slang_tokens": extracted_tokens,
        "slang_glossary_matches": glossary_matches,
        "slang_token_details": disambiguated_meta,
        "policy_version_id": state.get("policy_version_id", "2026.09.v1"),
        "ingest_timestamp": state.get("ingest_timestamp", now_iso),
    }
    if url_evidence:
        result_dict["url_extracted_evidence"] = url_evidence
    return result_dict



# Semantic Threat Evaluators for Multilingual & Non-Slang Reports
_SEMANTIC_WEAPONS_VIOLENCE_PATTERN = re.compile(
    r"(?i)\b("
    r"choke|choked|choking|strangle|strangled|stab|stabbed|slit|slash|slashed|"
    r"broken\s+(rib|arm|leg|bone|jaw)|fracture|fractured|head\s+injury|bleeding|"
    r"hospital|unconscious|knif(e|es)|blade|box\s*cutter|machete|gun|firearm|"
    r"pistol|iron\s+pipe|baseball\s+bat|kayu\s+hoki|senjata|parang|pedang|tikam|"
    r"tetak|patah\s+(tulang|tangan|kaki)|pengsan|darah|masuk\s+wad|saksak|baril|parang\s+barung"
    r")\b"
)

_SEMANTIC_PHYSICAL_BATTERY_PATTERN = re.compile(
    r"(?i)\b("
    r"beat|beaten|punch|punched|kicked|cornered|mobbed|assault|assaulted|"
    r"attacked|gang\s+up|pukul|tumbuk|sepak|terajang|belasah|serang|kerumun|"
    r"antam|suntok|suntukan|bugbog|tampung|bubut|pukul\s+curi|patay|patayin"
    r")\b"
)

_SEMANTIC_EXTORTION_PATTERN = re.compile(
    r"(?i)\b("
    r"extort|extorted|extortion|stole|robbed|forced\s+to\s+(pay|give|hand\s+over)|"
    r"protection\s+money|blackmail|blackmailed|ugut|peras\s+ugut|rampas|curi|"
    r"ambil\s+duit|duit\s+perlindungan|nakaw|holdup|buyuk"
    r")\b"
)

_SEMANTIC_SELF_HARM_PATTERN = re.compile(
    r"(?i)\b("
    r"suicide|suicidal|kill\s+(my|him|her)self|end\s+(my|his|her)\s+life|"
    r"cut\s+wrist|slit\s+wrist|bunuh\s+diri|nak\s+mati|kelar\s+tangan|sik\s+tahan"
    r")\b"
)

_SEMANTIC_CYBERBULLYING_PATTERN = re.compile(
    r"(?i)\b("
    r"spread\s+(my|his|her)\s+photos|leak\s+(my|his|her)\s+photos|doxx|doxxed|"
    r"harass|harassed|cyberbully|sebar\s+gambar|ugut\s+sebar"
    r")\b"
)

_SEMANTIC_SEXUAL_VIOLENCE_PATTERN = re.compile(
    r"(?i)\b("
    r"rape|raped|raping|attempted\s+rape|gang\s+rape|"
    r"sexual\s+assault|sexually\s+assaulted|sexual\s+abuse|sexual\s+violence|"
    r"molest|molested|molesting|molestation|"
    r"grope|groped|groping|fondle|fondled|"
    r"inappropriately\s+touched|touched\s+(my|his|her|the)\s+(private|breast|chest|groin|butt|body)|"
    r"forced\s+to\s+strip|stripped\s+naked|strip\s+naked|"
    r"secretly\s+filmed|peeping\s+tom|upskirt|upskirting|"
    r"sextortion|nude\s+(video|photo|picture|leak)|leak(ed)?\s+nudes|"
    r"rogol|merogol|cuba\s+rogol|liwat|meliwat|perkosa|"
    r"cabul|mencabul|raba|meraba|pegang\s+(kemaluan|tempat\s+sulit|buah\s+dada)|"
    r"paksa\s+bogel|bogelkan|skodeng|rakam\s+(dalam\s+tandas|mandi)|"
    r"sebar\s+video\s+bogel|gambar\s+bogel|video\s+tak\s+senonoh|gangguan\s+seksual|"
    r"pengantunan|pedofil"
    r")\b"
)


def osint_discovery_node(state: GraphState) -> Dict[str, Any]:
    """
    Dedicated OSINT discovery node executing social grounding concurrently with video triage and slang normalization.
    Performs:
    1. Deterministic intent/topic classification on raw text or target URL.
    2. Contextual domain query synthesis (scoped to Malaysian youth subreddits and Lowyat forums).
    3. Dual-Funnel retrieval: Tavily scoped search + Exa neural search with verbatim quote highlights.
    4. Bi-temporal freshness verification (<90 days).
    5. URL thread extraction if target_url is provided.
    """
    raw_text = state.get("raw_text", "")
    metadata = state.get("metadata", {})
    target_url = state.get("target_url") or metadata.get("target_url")
    mock_mode = bool(metadata.get("mock_external_apis") or metadata.get("mock_mode", False))

    # Parse source timestamp early for bi-temporal freshness grounding
    source_ts_raw = metadata.get("source_timestamp")
    if source_ts_raw:
        if isinstance(source_ts_raw, datetime):
            source_ts = source_ts_raw
        else:
            try:
                source_ts = datetime.fromisoformat(str(source_ts_raw))
            except Exception:
                source_ts = datetime.now(timezone.utc)
    else:
        source_ts = datetime.now(timezone.utc)

    # Determine topic / incident category for focused social query
    lowered = raw_text.lower()
    topic = metadata.get("incident_type")
    if not topic:
        if _SEMANTIC_SEXUAL_VIOLENCE_PATTERN.search(raw_text) or any(
            k in lowered for k in ["rape", "rogol", "cabul", "bogel", "sexual", "liwat", "perkosa", "强奸", "கற்பழிப்பு", "روݢول", "چابول"]
        ):
            topic = "sexual_assault"
        elif _SEMANTIC_SELF_HARM_PATTERN.search(raw_text) or any(
            k in lowered for k in ["suicide", "bunuh diri", "kelar", "depress", "mati", "sik tahan", "بونوه ديري"]
        ):
            topic = "self_harm"
        elif _SEMANTIC_WEAPONS_VIOLENCE_PATTERN.search(raw_text) or _SEMANTIC_PHYSICAL_BATTERY_PATTERN.search(raw_text) or any(
            k in lowered for k in [
                "parang", "belasah", "tapau", "gaduh", "antam", "tibai", "tumbuk", "terajang",
                "fight", "brawl", "hostel", "asrama", "砍人", "巴冷刀", "打人", "围殴",
                "கத்தி", "தாக்குதல்", "ڤارڠ", "بلاساه", "pukul",
                "saksak", "baril", "patay", "patayin", "suntok", "suntukan", "bugbog", "tampung", "bubut", "tetak", "palui"
            ]
        ):
            topic = "physical_altercation"
        elif _SEMANTIC_EXTORTION_PATTERN.search(raw_text) or any(
            k in lowered for k in ["pau", "sakau", "ugut", "duit", "wang", "extort", "blackmail", "收保护费", "மிரட்டல்", "اوݢوت", "nakaw", "holdup", "buyuk"]
        ):
            topic = "extortion"
        elif _SEMANTIC_CYBERBULLYING_PATTERN.search(raw_text) or any(
            k in lowered for k in ["kacau", "koyak", "cyberbully", "harass", "paloi", "palui", "bikin panas", "kondem", "pilak"]
        ):
            topic = "cyberbullying"
        else:
            topic = "general_incident"

    # Synthesize Left-of-Bang bilingual query
    school_name_ctx = metadata.get("school_name", "") or metadata.get("campus_name", "")
    campus_tid_ctx = str(metadata.get("tenant_id") or "").lower()
    is_kuching_ctx = "kuching" in school_name_ctx.lower() or "kuching" in campus_tid_ctx or "kuching" in lowered or "sarawak" in lowered
    resolved_osint_tenant = "smk-kuching-high" if is_kuching_ctx else ("smk-seksyen-9" if ("9" in school_name_ctx.lower() or "9" in campus_tid_ctx) else "smk-seksyen-11")

    if metadata.get("osint_query"):
        osint_query = str(metadata["osint_query"])
    elif is_kuching_ctx:
        osint_query = "Kuching school student weapon attack police Borneo Post OR The Star"
    else:
        # Extract any specific institutional entities from raw text as well
        extracted_locus = extract_high_signal_entities(raw_text)
        if extracted_locus and (not school_name_ctx or school_name_ctx == "SMK Sentiasa"):
            school_name_ctx = extracted_locus[0]

        school_kw = f' "{school_name_ctx}"' if school_name_ctx and school_name_ctx != "SMK Sentiasa" else ""
        if topic == "sexual_assault":
            osint_query = f'Malaysia school (sexual assault OR harassment OR "gangguan seksual" OR cabul OR rogol){school_kw}'
        elif topic == "self_harm":
            osint_query = f'Malaysia student (spm OR uni OR asrama) ("penat hidup" OR "rasa nak mati" OR "tak tahan" OR "sik tahan" OR depress){school_kw}'
        elif topic == "physical_altercation":
            has_weapon = any(w in lowered for w in ["parang", "pisau", "knife", "stabbing", "tikam", "senjata", "kerambit", "pedang", "kelar", "砍人", "巴冷刀", "கத்தி", "saksak", "baril", "tetak", "parang barung"])
            if has_weapon:
                osint_query = f'Malaysia school (stabbing OR parang OR knife OR "pelajar ditikam" OR senjata OR saksak){school_kw}'
            else:
                osint_query = f'Malaysia school (asrama OR dorm OR senior) (buli OR "nak belasah" OR gaduh OR ugut OR antam OR suntukan){school_kw}'
        elif topic == "extortion":
            osint_query = f'Malaysia school ("pau duit" OR "mintak duit" OR extortion OR ugut){school_kw}'
        elif topic == "cyberbullying":
            osint_query = f'Malaysia school ("ugut sebar" OR cyberbully OR "aib" OR viral){school_kw}'
        else:
            osint_query = f'Malaysia student {topic.replace("_", " ")}{school_kw}'

    include_news_flag = metadata.get(
        "include_news_osint",
        True if (is_kuching_ctx or topic in ("physical_altercation", "weapon_threat", "gang_violence") or "parang" in lowered or "pisau" in lowered or "tikam" in lowered) else False
    )
    osint_result = search_dual_funnel_osint(
        query=osint_query,
        incident_type=topic,
        source_timestamp=source_ts,
        mock_mode=mock_mode,
        include_news=include_news_flag,
        tenant_id=resolved_osint_tenant,
    )
    osint_evidence: List[Dict[str, Any]] = list(osint_result.get("evidence", []))
    citations: List[str] = list(osint_result.get("citations", []))

    # Prepend direct thread URL evidence if target_url provided
    if target_url:
        extracted = extract_thread_content_from_url(str(target_url))
        if extracted.get("success") and extracted.get("url"):
            osint_evidence.insert(0, extracted)
            if extracted["url"] not in citations:
                citations.insert(0, extracted["url"])

    return {
        "osint_evidence": osint_evidence,
        "external_citations": citations,
        "osint_query": osint_query,
        "osint_corroborated": bool(citations),
        "pivoted_nodes": osint_result.get("pivoted_nodes", []),
        "osint_ai_synthesis": osint_result.get("osint_ai_synthesis"),
        "osint_custody_hash": osint_result.get("osint_custody_hash"),
        "osint_horizon_phase": osint_result.get("osint_horizon_phase", "LEFT_OF_BANG_PRECURSOR"),
        "osint_codons": osint_result.get("osint_codons", []),
    }


def sensory_fusion_join_node(state: GraphState) -> Dict[str, Any]:
    """
    Deterministic zero-LLM barrier aggregation uniting concurrent fan-out branches:
    - video_triage_node (CCTV keyframe motion sampling & Role 2 scene reasoner)
    - normalize_slang_node (dialect normalization & polysemy disambiguation)
    - osint_discovery_node (Tavily scoped search & Exa neural highlights)

    Combines all multi-modal exhibits into a typed FusedSensoryPayload, calculates
    deterministic fast-path threat flags, and passes cleanly to extract_ontology_node.
    """
    raw_text = state.get("raw_text", "")
    normalized_text = state.get("normalized_text", raw_text)
    extracted_slang_tokens = list(state.get("extracted_slang_tokens", []))
    slang_glossary_matches = dict(state.get("slang_glossary_matches", {}))
    slang_token_details = dict(state.get("slang_token_details", {}))

    # Vision exhibits
    video_path = state.get("video_path")
    visual_evidence = state.get("visual_evidence")
    sampled_keyframes = list(state.get("sampled_keyframes", []))
    evidence_nodes = list(state.get("evidence_nodes", []))

    # OSINT exhibits
    osint_query = state.get("osint_query", "")
    osint_evidence = list(state.get("osint_evidence", []))
    external_citations = list(state.get("external_citations", []))

    # Integrate url_extracted_evidence from normalize_slang_node if not already present
    url_ev = state.get("url_extracted_evidence")
    if url_ev and isinstance(url_ev, dict):
        url = url_ev.get("url")
        if url and not any(e.get("url") == url for e in osint_evidence):
            osint_evidence.insert(0, url_ev)
        if url and url not in external_citations:
            external_citations.insert(0, url)

    # Deduplicate citations preserving order
    seen_citations = set()
    deduped_citations = []
    for c in external_citations:
        if c not in seen_citations:
            seen_citations.add(c)
            deduped_citations.append(c)

    # Multi-INT Intelligence Classification
    active_modalities: List[str] = []
    if raw_text.strip():
        active_modalities.append("HUMINT")
    if visual_evidence or evidence_nodes or video_path:
        active_modalities.append("IMINT")
    if deduped_citations or osint_evidence:
        active_modalities.append("OSINT")
    if state.get("metadata", {}).get("zone_id") or state.get("metadata", {}).get("latitude"):
        active_modalities.append("GEOINT")

    # Preliminary fast-path threat flags
    has_visual_weapon = bool(visual_evidence and visual_evidence.has_threat_object)
    has_physical_aggression = bool(visual_evidence and visual_evidence.physical_aggression_detected)
    has_sexual_misconduct = bool(visual_evidence and visual_evidence.sexual_misconduct_detected)
    has_critical_slang = any(
        t in extracted_slang_tokens
        for t in ["parang", "belasah", "bunuh diri", "rogol", "cabul", "bogel", "砍人", "巴冷刀", "கத்தி", "ڤارڠ"]
    )
    preliminary_flags = {
        "has_visual_weapon": has_visual_weapon,
        "has_physical_aggression": has_physical_aggression,
        "has_sexual_misconduct": has_sexual_misconduct,
        "has_critical_slang": has_critical_slang,
        "has_osint_corroboration": bool(deduped_citations),
        "is_multi_int_corroborated": len(active_modalities) >= 2,
    }

    pivoted_nodes = list(state.get("pivoted_nodes", []))
    osint_ai_synthesis = state.get("osint_ai_synthesis")
    osint_codons = list(state.get("osint_codons", []))
    osint_custody_hash = state.get("osint_custody_hash")
    osint_horizon_phase = state.get("osint_horizon_phase", "LEFT_OF_BANG_PRECURSOR")

    fused_payload = FusedSensoryPayload(
        raw_text=raw_text,
        normalized_text=normalized_text,
        extracted_slang_tokens=extracted_slang_tokens,
        slang_glossary_matches=slang_glossary_matches,
        slang_token_details=slang_token_details,
        video_path=video_path,
        visual_evidence=visual_evidence,
        sampled_keyframes=sampled_keyframes,
        evidence_nodes=evidence_nodes,
        osint_query=osint_query,
        osint_evidence=osint_evidence,
        external_citations=deduped_citations,
        pivoted_nodes=pivoted_nodes,
        osint_ai_synthesis=osint_ai_synthesis,
        osint_codons=osint_codons,
        osint_custody_hash=osint_custody_hash,
        osint_horizon_phase=osint_horizon_phase,
        osint_corroborated=bool(deduped_citations and not state.get("metadata", {}).get("mock_external_apis", False)),
        preliminary_threat_flags=preliminary_flags,
        active_modalities=active_modalities,
    )

    return {
        "fused_sensory": fused_payload,
        "raw_text": raw_text,
        "normalized_text": normalized_text,
        "extracted_slang_tokens": extracted_slang_tokens,
        "slang_glossary_matches": slang_glossary_matches,
        "slang_token_details": slang_token_details,
        "osint_evidence": osint_evidence,
        "external_citations": deduped_citations,
        "osint_query": osint_query,
        "osint_corroborated": fused_payload.osint_corroborated,
        "pivoted_nodes": pivoted_nodes,
        "osint_ai_synthesis": osint_ai_synthesis,
        "osint_codons": osint_codons,
        "osint_custody_hash": osint_custody_hash,
        "osint_horizon_phase": osint_horizon_phase,
    }


def extract_ontology_node(state: GraphState) -> Dict[str, Any]:
    """
    Extracts structured incident ontology (SchoolNode, PersonaNode, ThreatEventNode, RelationalTriple)
    using Nebius LLM (Nemotron 30B Nano) and retrieves contextual OSINT signals via Tavily API.
    Assembles a candidate IncidentActionContract for Jev Gatekeeper evaluation.
    Decoupled 3-layer reasoning:
    1. Fast-Path Slang Normalizer (handles local polysemy like tapau/pau)
    2. Decoupled Semantic Reasoner (handles plain English, formal Malay, and non-Roman reports)
    3. LLM Deep Risk Extraction via Nemotron
    """
    nebius_api_key = os.getenv("NEBIUS_API_KEY", "").strip()
    tavily_api_key = os.getenv("TAVILY_API_KEY", "").strip()

    raw_text = state.get("raw_text", "")
    normalized_text = state.get("normalized_text", raw_text)
    slang_tokens = state.get("extracted_slang_tokens", [])
    slang_token_details = state.get("slang_token_details") or {}
    metadata = state.get("metadata", {})

    # Compute baseline severity and target threat tier using contextually disambiguated tokens
    base_severity = 1
    max_tier = ThreatTier.TIER_1_LOW
    active_threat_tokens: List[str] = []

    for token in slang_tokens:
        meta = slang_token_details.get(token) or disambiguate_slang_polysemy(token, raw_text)
        boost = meta.get("severity_boost", 0)
        base_severity += boost
        token_tier = meta.get("tier", ThreatTier.TIER_1_LOW)

        if meta.get("is_threat", True) and boost > 0:
            active_threat_tokens.append(token)

        if token_tier == ThreatTier.TIER_3_CRITICAL:
            max_tier = ThreatTier.TIER_3_CRITICAL
        elif token_tier == ThreatTier.TIER_2_ELEVATED and max_tier != ThreatTier.TIER_3_CRITICAL:
            max_tier = ThreatTier.TIER_2_ELEVATED

    # Categorize incident
    incident_type = "general_conflict"
    if (
        any(k in active_threat_tokens for k in [
            "rogol", "cabul", "raba", "skodeng", "bogel", "liwat", "perkosa", "gangguan seksual",
            "强奸", "非礼", "偷拍",
            "கற்பழிப்பு", "பாலியல் துன்புறுத்தல்", "பாலியல் தொல்லை",
            "روݢول", "چابول", "راب", "سکوديڠ"
        ])
        or _SEMANTIC_SEXUAL_VIOLENCE_PATTERN.search(raw_text)
    ):
        incident_type = "sexual_assault"
        # Acute sexual violence / non-consensual rape / child molestation / forced strip / child abuse
        if (
            re.search(r"(?i)\b(rape|raped|raping|attempted\s+rape|gang\s+rape|sexual\s+assault|rogol|cuba\s+rogol|liwat|perkosa|cabul|bogel|paksa\s+bogel|bogelkan|forced\s+to\s+strip|pedofil|pengantunan)\b", raw_text)
            or any(c in raw_text for c in ["强奸", "கற்பழிப்பு", "روݢول", "چابول"])
            or any(k in active_threat_tokens for k in ["rogol", "cabul", "liwat", "perkosa", "bogel", "强奸", "கற்பழிப்பு", "روݢول", "چابول"])
        ):
            base_severity = 5
            max_tier = ThreatTier.TIER_3_CRITICAL
        else:
            base_severity = max(base_severity, 4)
            max_tier = ThreatTier.TIER_3_CRITICAL
    elif any(k in active_threat_tokens for k in [
        "parang", "belasah", "tapau", "gaduh", "antam", "tibai", "tumbuk", "terajang",
        "砍人", "巴冷刀", "打人", "围殴",
        "கத்தி", "தாக்குதல்", "ڤارڠ", "بلاساه", "pukul sampai patah",
        "saksak", "baril", "patay", "patayin", "suntok", "suntukan", "bugbog",
        "tetak", "tampung", "bubut", "pukul curi", "parang barung"
    ]):
        incident_type = "physical_altercation"
    elif any(k in active_threat_tokens for k in [
        "pau", "sakau", "ugut", "收保护费", "மிரட்டல்", "اوݢوت",
        "nakaw", "holdup", "buyuk"
    ]):
        incident_type = "extortion"
    elif any(k in active_threat_tokens for k in ["kacau", "koyak", "paloi", "palui", "bikin panas", "kondem", "pilak"]):
        incident_type = "cyberbullying"
    elif any(k in active_threat_tokens or k in slang_tokens for k in [
        "bunuh diri", "suicide", "kelar tangan", "sik tahan", "بونوه ديري"
    ]) or "suicide" in raw_text.lower():
        incident_type = "self_harm"
        base_severity = 5
        max_tier = ThreatTier.TIER_3_CRITICAL
    elif not active_threat_tokens:
        # Decoupled Semantic Risk Reasoner:
        # Evaluates plain English, formal Malay, or descriptive narratives with zero slang words
        if _SEMANTIC_SEXUAL_VIOLENCE_PATTERN.search(raw_text):
            incident_type = "sexual_assault"
            base_severity = 5
            max_tier = ThreatTier.TIER_3_CRITICAL
        elif _SEMANTIC_SELF_HARM_PATTERN.search(raw_text):
            incident_type = "self_harm"
            base_severity = 5
            max_tier = ThreatTier.TIER_3_CRITICAL
        elif _SEMANTIC_WEAPONS_VIOLENCE_PATTERN.search(raw_text):
            incident_type = "physical_altercation"
            base_severity = 5
            max_tier = ThreatTier.TIER_3_CRITICAL
        elif _SEMANTIC_PHYSICAL_BATTERY_PATTERN.search(raw_text):
            incident_type = "physical_altercation"
            base_severity = 4
            max_tier = ThreatTier.TIER_2_ELEVATED
        elif _SEMANTIC_EXTORTION_PATTERN.search(raw_text):
            incident_type = "extortion"
            base_severity = 3
            max_tier = ThreatTier.TIER_2_ELEVATED
        elif _SEMANTIC_CYBERBULLYING_PATTERN.search(raw_text):
            incident_type = "cyberbullying"
            base_severity = 3
            max_tier = ThreatTier.TIER_2_ELEVATED
        else:
            incident_type = "general_sentiment"
            base_severity = 1
            max_tier = ThreatTier.TIER_1_LOW

    calculated_severity = max(1, min(5, base_severity))

    # Parse source timestamp early for bi-temporal freshness grounding
    source_ts_raw = metadata.get("source_timestamp")
    if source_ts_raw:
        if isinstance(source_ts_raw, datetime):
            source_ts = source_ts_raw
        else:
            try:
                source_ts = datetime.fromisoformat(str(source_ts_raw))
            except Exception:
                source_ts = datetime.now(timezone.utc)
    else:
        source_ts = datetime.now(timezone.utc)

    # 1. Access Pre-Fused Social & Sensory Grounding (Decoupled from extract_ontology_node)
    fused: Optional[FusedSensoryPayload] = state.get("fused_sensory")
    if fused:
        osint_evidence: List[Dict[str, Any]] = list(fused.osint_evidence)
        citations: List[str] = list(fused.external_citations)
    else:
        osint_evidence = list(state.get("osint_evidence", []))
        citations = list(state.get("external_citations", []))
        url_ev = state.get("url_extracted_evidence")
        if url_ev and isinstance(url_ev, dict):
            if not any(e.get("url") == url_ev.get("url") for e in osint_evidence):
                osint_evidence.insert(0, url_ev)
            if url_ev.get("url") and url_ev["url"] not in citations:
                citations.insert(0, url_ev["url"])


    # 2. Nebius Model Extraction (NVIDIA Nemotron-3_5-Lightning)
    nebius_model = os.getenv("NEBIUS_MODEL", "nvidia/Nemotron-3_5-Lightning")
    nebius_base_url = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")

    llm_summary: Optional[str] = None
    allow_live_llm = bool(metadata.get("enable_live_llm")) if "enable_live_llm" in metadata else not metadata.get("mock_external_apis", False)
    if allow_live_llm and nebius_api_key:
        try:
            from openai import OpenAI
            from backend.canary_fixtures import build_grounded_system_prompt
            nebius_client = OpenAI(base_url=nebius_base_url, api_key=nebius_api_key)

            system_canary = metadata.get("canary_system_prompt", "CANARY-SYSTEM-PROMPT-SENTIASA-2026")
            restricted_canary = metadata.get("canary_restricted_record", "CANARY-RESTRICTED-CASEFILE-BEA8653-CONFIDENTIAL")
            person_canary = metadata.get("canary_person_record", "CANARY-PERSON-STUDENT-SITI-NORHALIZA-991")
            include_records = metadata.get("include_confidential_records_in_context", True)

            system_content = build_grounded_system_prompt(
                system_canary=system_canary,
                restricted_canary=restricted_canary,
                person_canary=person_canary,
                include_records=include_records,
            )

            # Check if structured multi-turn chat messages were passed from Polemic
            chat_turns = metadata.get("chat_messages")
            if chat_turns and isinstance(chat_turns, list):
                llm_messages = [{"role": "system", "content": system_content}]
                for m in chat_turns:
                    role = getattr(m, "role", None) or (m.get("role") if isinstance(m, dict) else "user")
                    content = getattr(m, "content", None) or (m.get("content") if isinstance(m, dict) else str(m))
                    if role in ("user", "assistant") and content:
                        llm_messages.append({"role": role, "content": str(content)})
            else:
                user_msg = (
                    f"Student Incident Report: {normalized_text}\n"
                    f"Extracted Slang Markers: {', '.join(slang_tokens) if slang_tokens else 'None'}\n"
                    "Output a concise safety evaluation and summary for counselors:"
                )
                llm_messages = [
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": user_msg},
                ]

            completion = nebius_client.chat.completions.create(
                model=nebius_model,
                messages=llm_messages,
                max_tokens=250,
                temperature=0.2,
            )
            if completion.choices and completion.choices[0].message.content:
                raw_llm = completion.choices[0].message.content.strip()
                cleaned_llm = _strip_model_thinking_tags(raw_llm)
                llm_summary = cleaned_llm if cleaned_llm else None
        except Exception:
            llm_summary = None

    # Construct Domain Entities (Nouns)
    school_name = metadata.get("school_name", "SMK Sentiasa")
    school_slug = re.sub(r'[^a-zA-Z0-9]+', '-', school_name.lower()).strip('-')
    if "seksyen-11" in school_slug:
        school_id = "school-smk-seksyen-11"
    elif "seksyen-9" in school_slug:
        school_id = "school-smk-seksyen-9"
    elif "kuching" in school_slug:
        school_id = "school-smk-kuching-high"
    else:
        school_id = f"school-{school_slug}"
    school_node = SchoolNode(school_id=school_id, name=school_name)

    # Indentia-pattern identity disambiguation:
    # Extract candidate cohort (e.g. Form 4, Tingkatan 2) and class tag (e.g. 4 Amanah)
    # from report narrative or metadata to prevent false alias collisions across schools/classes.
    cohort_match = re.search(r"(?i)\b(form\s*[1-6]|tingkatan\s*[1-6]|f[1-6]|t[1-6])\b", raw_text)
    cohort_year = metadata.get("cohort_year") or (cohort_match.group(0).title() if cohort_match else None)

    class_match = re.search(r"(?i)\b([1-6]\s*(?:amanah|cekal|bestari|ikhlas|maju|arif|dedikasi|gemilang))\b", raw_text)
    class_tag = metadata.get("class_tag") or (class_match.group(0).upper() if class_match else None)

    persona_alias = metadata.get("reporter_alias", "AnonStudent_1")
    # Grounded persona ID with school and cohort scoping if known to prevent cross-campus alias collision
    clean_alias_slug = re.sub(r'[^a-zA-Z0-9]', '_', persona_alias.lower())
    if metadata.get("reporter_alias") and metadata.get("reporter_alias") != "AnonStudent_1":
        # Multi-attribute grounding: school + alias (+ cohort if available)
        scope_suffix = f"_{cohort_year.lower().replace(' ', '')}" if cohort_year else ""
        persona_id = f"persona_{clean_alias_slug}_{school_id[:12]}{scope_suffix}"
        disambiguation_conf = 0.95 if (cohort_year or class_tag) else 0.80
    else:
        persona_id = f"persona_{uuid.uuid4().hex[:8]}"
        disambiguation_conf = 0.70

    now_utc = datetime.now(timezone.utc)
    persona_node = PersonaNode(
        entity_id=persona_id,
        alias=persona_alias,
        school_name=school_name,
        school_id=school_id,
        cohort_year=cohort_year,
        class_tag=class_tag,
        role_risk_tier="Target" if calculated_severity >= 4 else "Reporter",
        disambiguation_confidence=disambiguation_conf,
        observed_at=now_utc,
    )

    event_id = f"threat_{uuid.uuid4().hex[:8]}"
    summary_text = llm_summary or (
        f"Detected {incident_type.replace('_', ' ')}: {normalized_text[:120]} "
        f"[Slang markers: {', '.join(slang_tokens) if slang_tokens else 'none'}]."
    )

    # Check for visual evidence from video node / sensory fusion
    visual_ev = (fused.visual_evidence if fused else None) or state.get("visual_evidence")
    if visual_ev and (
        (visual_ev.has_threat_object or visual_ev.visual_severity_tier >= 4 or getattr(visual_ev, "sexual_misconduct_detected", False))
        and visual_ev.confidence >= 0.90
    ):
        max_tier = ThreatTier.TIER_3_CRITICAL
        calculated_severity = max(calculated_severity, visual_ev.visual_severity_tier)
        if getattr(visual_ev, "sexual_misconduct_detected", False):
            incident_type = "sexual_assault"
            calculated_severity = max(calculated_severity, 5)

    # Set calculated confidence
    if max_tier == ThreatTier.TIER_3_CRITICAL:
        confidence = 0.92
    elif max_tier == ThreatTier.TIER_2_ELEVATED:
        confidence = 0.85
    else:
        confidence = 0.70
    if metadata.get("confidence_override") is not None:
        confidence = float(metadata["confidence_override"])

    # Sovereign GEOINT & JKR-BIM spatial evaluation
    from backend.nodes.spatial_engine import evaluate_spatial_triage, resolve_location_from_text
    spatial_coords = metadata.get("coordinates") or metadata.get("spatial_coordinates")
    if not spatial_coords and metadata.get("longitude") is not None and metadata.get("latitude") is not None:
        spatial_coords = [float(metadata["longitude"]), float(metadata["latitude"])]
    
    # If no coordinates provided, attempt zone lookup or dynamically resolve from report narrative text
    campus_tid = metadata.get("tenant_id") or metadata.get("school_id") or "smk-seksyen-11"
    spatial_report = None
    if spatial_coords and len(spatial_coords) >= 2:
        spatial_report = evaluate_spatial_triage(
            target_lon=float(spatial_coords[0]),
            target_lat=float(spatial_coords[1]),
            campus_id=campus_tid,
            timestamp=source_ts,
        )
    elif metadata.get("zone_id"):
        # Synthesize coordinate from zone if known
        zone_str = str(metadata["zone_id"]).upper()
        if "IRON" in zone_str or "ASRAMA" in zone_str:
            spatial_coords = [101.5287, 3.0788]
        elif "KANTIN" in zone_str:
            spatial_coords = [101.5275, 3.0773]
        elif "PINTU" in zone_str or "BELAKANG" in zone_str:
            spatial_coords = [101.5295, 3.0772]
        else:
            spatial_coords = [101.5284, 3.0782]
        spatial_report = evaluate_spatial_triage(
            target_lon=spatial_coords[0],
            target_lat=spatial_coords[1],
            campus_id=campus_tid,
            timestamp=source_ts,
        )
    else:
        # Dynamic Zero-Hardcode Resolution: Parse raw_text against campus GeoJSON topology
        inferred_coords, matched_feat = resolve_location_from_text(raw_text, campus_id=campus_tid)
        spatial_coords = inferred_coords
        spatial_report = evaluate_spatial_triage(
            target_lon=float(spatial_coords[0]),
            target_lat=float(spatial_coords[1]),
            campus_id=campus_tid,
            timestamp=source_ts,
        )

    # Apply spatial multiplier to severity and tier if high-risk blind spot or curfew violation
    if spatial_report:
        if spatial_report.is_curfew_violation or (spatial_report.is_blind_spot and calculated_severity >= 3):
            calculated_severity = min(5, int(round(calculated_severity * spatial_report.spatial_risk_multiplier)))
            if spatial_report.is_curfew_violation:
                max_tier = ThreatTier.TIER_3_CRITICAL

    threat_event = ThreatEventNode(
        event_id=event_id,
        incident_type=incident_type,
        raw_text=raw_text,
        severity_tier=calculated_severity,
        threat_tier=max_tier,
        confidence_score=confidence,
        context_summary=summary_text,
        extracted_slang_tokens=slang_tokens,
        event_timestamp=source_ts,
        valid_at=source_ts,
        observed_at=now_utc,
        spatial_coordinates=spatial_coords,
        matched_zone_id=spatial_report.matched_zone.get("properties", {}).get("zone_id") if spatial_report and spatial_report.matched_zone else None,
        matched_zone_name=spatial_report.matched_zone.get("properties", {}).get("name") if spatial_report and spatial_report.matched_zone else None,
        spatial_zone_type=spatial_report.matched_zone.get("properties", {}).get("zone_type") if spatial_report and spatial_report.matched_zone else None,
        is_blind_spot=spatial_report.is_blind_spot if spatial_report else False,
        is_curfew_violation=spatial_report.is_curfew_violation if spatial_report else False,
        intersecting_camera_ids=[c["camera_id"] for c in spatial_report.intersecting_cameras] if spatial_report else [],
        spatial_risk_multiplier=spatial_report.spatial_risk_multiplier if spatial_report else 1.0,
    )

    # Construct Relational Triples with bitemporal valid_at and observed_at
    triples = [
        RelationalTriple(
            subject_id=persona_id,
            predicate="REPORTS_THREAT",
            object_id=event_id,
            confidence=confidence,
            valid_at=source_ts,
            observed_at=now_utc,
        ),
        RelationalTriple(
            subject_id=event_id,
            predicate="LOCATED_AT",
            object_id=school_id,
            confidence=1.0,
            valid_at=source_ts,
            observed_at=now_utc,
        ),
    ]

    # Link EvidenceNode exhibits from sensory fusion to ThreatEventNode
    evi_nodes = (fused.evidence_nodes if fused else None) or state.get("evidence_nodes", [])
    for evi in evi_nodes:
        triples.append(
            RelationalTriple(
                subject_id=evi.evidence_id,
                predicate="CORROBORATES_THREAT",
                object_id=event_id,
                confidence=getattr(visual_ev, "confidence", 0.90) if visual_ev else 0.90,
            )
        )
    # Include any existing pre-formed triples
    for t in state.get("triples", []):
        if t not in triples:
            triples.append(t)

    # Candidate current tier (can be overridden by caller for state machine testing)
    current_tier_raw = metadata.get("current_tier", ThreatTier.TIER_2_ELEVATED if max_tier == ThreatTier.TIER_3_CRITICAL else ThreatTier.TIER_1_LOW)
    current_tier = ThreatTier(current_tier_raw) if isinstance(current_tier_raw, str) else current_tier_raw

    # Assemble candidate Action Contract
    action_contract = IncidentActionContract(
        action=ActionType.DISPATCH_SECURITY if max_tier == ThreatTier.TIER_3_CRITICAL else ActionType.ESCALATE_TIER,
        incident_id=event_id,
        current_tier=current_tier,
        target_tier=max_tier,
        actor_id=persona_id,
        target_entity_id=None,
        location_id=school_id,
        semantic_confidence=confidence,
        source_timestamp=source_ts,
        event_timestamp=threat_event.event_timestamp,
        policy_version_id=state.get("policy_version_id", "2026.09.v1"),
        raw_evidence_summary=summary_text,
        slang_markers=slang_tokens,
        osint_citations=citations,
        has_threat_object=bool(visual_ev.has_threat_object) if visual_ev else False,
        visual_severity_tier=visual_ev.visual_severity_tier if visual_ev else None,
        visual_confidence=visual_ev.confidence if visual_ev else None,
    )

    # Calculate slang ambiguity score (polysemy metric)
    if metadata.get("slang_ambiguity_override") is not None:
        ambiguity_score = float(metadata["slang_ambiguity_override"])
    elif any(t in slang_tokens for t in ["parang", "belasah", "bunuh diri"]):
        ambiguity_score = 0.05
    elif any(t in slang_tokens for t in ["tapau", "koyak", "pau"]):
        has_strong_markers = any(
            w in raw_text.lower()
            for w in ["hostel", "asrama", "belasah", "pukul", "duit", "wang", "kertas", "nasi", "makan", "buku"]
        )
        ambiguity_score = 0.08 if has_strong_markers else 0.30
    else:
        ambiguity_score = 0.10

    # Map current tier to JevThreatTier
    if current_tier == ThreatTier.TIER_3_CRITICAL:
        jev_curr_tier = JevThreatTier.TIER_4_CRITICAL
    elif current_tier == ThreatTier.TIER_2_ELEVATED:
        jev_curr_tier = JevThreatTier.TIER_3_ELEVATED
    else:
        jev_curr_tier = JevThreatTier.TIER_1_INFO

    jev_target_tier = (
        JevThreatTier.TIER_4_CRITICAL
        if max_tier == ThreatTier.TIER_3_CRITICAL
        else JevThreatTier.from_severity_int(calculated_severity)
    )

    # Shape-constrained JevActionPayload for Ontology Firewall
    candidate_action = JevActionPayload(
        action=(
            ActionVerb.TRIGGER_CAMPUS_DISPATCH
            if max_tier == ThreatTier.TIER_3_CRITICAL and metadata.get("trigger_dispatch", False)
            else ActionVerb.ESCALATE_THREAT_TIER
        ),
        incident_id=event_id,
        current_tier=jev_curr_tier,
        target_tier=jev_target_tier,
        actor_id=persona_id,
        target_entity_id=None,
        location_id=school_id,
        evidence_ids=[event_id],
        semantic_confidence=confidence,
        slang_ambiguity_score=ambiguity_score,
        event_timestamp=threat_event.event_timestamp,
        policy_schema_version=state.get("policy_version_id", "2026.09.v1"),
        is_anonymous_reporter=metadata.get("reporter_alias") in ["AnonStudent", "anonymous"],
        osint_corroborated=bool(citations and not metadata.get("mock_external_apis", False)),
        spatial_zone_type=threat_event.spatial_zone_type,
        is_off_campus=bool(spatial_report and not spatial_report.is_inside_campus),
        is_blind_spot=threat_event.is_blind_spot,
        is_curfew_violation=threat_event.is_curfew_violation,
    )
    if visual_ev:
        candidate_action.has_threat_object = bool(visual_ev.has_threat_object)
        candidate_action.visual_severity_tier = visual_ev.visual_severity_tier
        candidate_action.visual_confidence = visual_ev.confidence

    active_graph_node_ids = {school_id, persona_id, event_id}
    for evi in evi_nodes:
        active_graph_node_ids.add(evi.evidence_id)
    for p_node in state.get("pivoted_nodes", []):
        if p_node.get("id"):
            active_graph_node_ids.add(p_node["id"])

    # Live TypeSafe Jev System One Multi-Dimensional Telemetry (4-point danger assessment)
    jev_key = os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY")
    mock_mode = not bool(metadata.get("enable_live_jev")) and bool(metadata.get("mock_external_apis") or metadata.get("mock_mode"))
    jev_telemetry: Optional[Dict[str, float]] = None
    try:
        jev_telemetry = query_jev_multidimensional_telemetry(
            api_key=jev_key or "",
            state_text=raw_text,
            mock_mode=mock_mode,
        )
    except Exception:
        jev_telemetry = None

    # Southbridge Rule 05: Cross-Family Prior Intersection (VLM vs TypeSafe Jev System One)
    prior_agreement: Optional[bool] = None
    needs_doubt_review = bool(state.get("needs_doubt_review", False))

    if visual_ev and jev_telemetry:
        vis_high = bool(visual_ev.has_threat_object or visual_ev.visual_severity_tier >= 4 or getattr(visual_ev, "sexual_misconduct_detected", False))
        jev_high = bool(
            (jev_telemetry.get("imminent_violence", 0.0) >= 0.70)
            or (jev_telemetry.get("weapon_threat", 0.0) >= 0.70)
        )
        jev_low = bool(
            (jev_telemetry.get("imminent_violence", 0.0) <= 0.35)
            and (jev_telemetry.get("weapon_threat", 0.0) <= 0.35)
        )
        if vis_high and jev_high:
            prior_agreement = True
        elif vis_high and jev_low:
            prior_agreement = False
            needs_doubt_review = True
        elif not vis_high and jev_high:
            prior_agreement = False
            needs_doubt_review = True
        else:
            prior_agreement = True
    elif visual_ev:
        prior_agreement = not bool(getattr(visual_ev, "needs_visual_review", False))
        if not prior_agreement:
            needs_doubt_review = True

    # Southbridge JIT Ontology Construction (Layer 3: Decision Schema)
    policy_cfg = PolicyThresholdConfig()
    if state.get("policy_thresholds"):
        try:
            policy_cfg = PolicyThresholdConfig(**state["policy_thresholds"])
        except Exception:
            pass

    jit_decision_schema = JITDecisionSchema(
        hypothesis_id=incident_type,
        threat_category=incident_type,
        positive_sufficiency_criteria=[
            "Verified physical gesture / weapon kinematics (IMINT)",
            "Vernacular youth slang corroboration with polysemy score >= 0.50 (HUMINT)",
            "Bi-temporal freshness < 90 days from verified campus domains (OSINT)",
        ],
        exclusion_criteria=[
            "Colloquial benign food, stationery, or esports gaming banter context",
            "Stale signals exceeding 1800s policy window",
        ],
        required_modalities=fused.active_modalities if fused else ["HUMINT"],
        policy_thresholds=policy_cfg,
    )

    # Southbridge Rule 09: Capture immutable Codon attempt receipt
    attempt_history = list(state.get("attempt_history", []))
    ontology_receipt = CodonRunner.create_receipt(
        codon_id=f"codon_ontology_{uuid.uuid4().hex[:6]}",
        node_name="extract_ontology_node",
        model_family="nebius/nemotron-lightning+typesafe/jev",
        hypothesis_tested=incident_type,
        query_a={
            "incident_type": incident_type,
            "calculated_severity": calculated_severity,
            "threat_tier": max_tier.value,
            "confidence": confidence,
        },
        query_b={
            "prior_agreement": prior_agreement,
            "slang_ambiguity_score": ambiguity_score,
            "jev_telemetry": jev_telemetry or {},
            "needs_doubt_review": needs_doubt_review,
        },
        evidence_sufficiency_met=True,
        prior_agreement=prior_agreement,
        reserved_cost=0.005,
        settled_cost=0.005 if allow_live_llm else 0.0,
        latency_ms=95.0,
        shacl_passed=True,
    )
    attempt_history.append(ontology_receipt.to_dict())
    for c in state.get("osint_codons", []):
        if not any(a.get("codon_id") == c.get("codon_id") for a in attempt_history):
            attempt_history.insert(0, c)

    return {
        "threat_event": threat_event,
        "personas": [persona_node],
        "school": school_node,
        "triples": triples,
        "osint_evidence": osint_evidence,
        "external_citations": citations,
        "pivoted_nodes": state.get("pivoted_nodes", []),
        "osint_ai_synthesis": state.get("osint_ai_synthesis"),
        "osint_custody_hash": state.get("osint_custody_hash"),
        "osint_horizon_phase": state.get("osint_horizon_phase", "LEFT_OF_BANG_PRECURSOR"),
        "severity_tier": threat_event.severity_tier,
        "threat_tier": max_tier.value,
        "incident_type": incident_type,
        "action_contract": action_contract,
        "candidate_action": candidate_action,
        "cytoscape_active_node_ids": active_graph_node_ids,
        "jev_telemetry": jev_telemetry,
        "llm_summary": llm_summary,
        "spatial_report": spatial_report,
        "attempt_history": attempt_history,
        "jit_decision_schema": jit_decision_schema.model_dump(mode="json"),
        "prior_agreement": prior_agreement,
        "needs_doubt_review": needs_doubt_review,
    }


def jev_gatekeeper_node(state: GraphState) -> Dict[str, Any]:
    """
    Deterministic safety gatekeeper node sitting between Nemotron reasoning and tool execution.
    Unified directly with JevOntologyFirewall to enforce fail-closed domain invariants:
    - SHACL-GOV-01: Restricted autonomous actions & high-stakes critical write operations.
    - SHACL-TEMP-01 / 02: Bi-temporal freshness and clock skew bounds.
    - SHACL-STATE-01: Finite State Machine legal transitions with emergency bypass.
    - SHACL-SEM-01: Slang ambiguity polysemy thresholds.
    - SHACL-GRAPH-01: Relational Cytoscape graph topology grounding.
    - SHACL-ANON-01: Anonymous whistleblower corroboration requirements.
    - SHACL-CONF-01: Confidence floor tripwire for critical actions.
    """
    candidate_action = state.get("candidate_action")
    contract: Optional[IncidentActionContract] = state.get("action_contract")
    metadata = state.get("metadata", {})
    counselor_approved = bool(metadata.get("counselor_approved") or state.get("counselor_approved"))

    active_nodes = set(state.get("cytoscape_active_node_ids") or set())

    is_high_risk = bool(
        (
            candidate_action
            and (
                candidate_action.target_tier == JevThreatTier.TIER_4_CRITICAL
                or candidate_action.action in [ActionVerb.TRIGGER_CAMPUS_DISPATCH, ActionVerb.BROADCAST_CAMPUS_ALERT]
            )
        )
        or (contract and contract.target_tier == ThreatTier.TIER_3_CRITICAL)
        or state.get("severity_tier", 1) >= 4
        or state.get("threat_tier") == "CRITICAL"
    )

    policy_cfg = PolicyThresholdConfig()
    if state.get("policy_thresholds"):
        try:
            policy_cfg = PolicyThresholdConfig(**state["policy_thresholds"])
        except Exception:
            pass

    # If candidate_action is not present, evaluate contract via unified evaluate()
    if candidate_action:
        violations = JevOntologyFirewall.evaluate_payload(
            payload=candidate_action,
            active_graph_nodes=active_nodes,
            counselor_approved=counselor_approved,
            policy=policy_cfg,
        )
    elif contract:
        eval_dict = JevOntologyFirewall.evaluate(
            candidate=contract,
            active_graph_nodes=active_nodes,
            counselor_approved=counselor_approved,
            policy=policy_cfg,
        )
        is_passed = eval_dict["passed"]
        is_critical = contract.target_tier == ThreatTier.TIER_3_CRITICAL
        attempt_history = list(state.get("attempt_history", []))
        gatekeeper_receipt = CodonRunner.create_receipt(
            codon_id=f"codon_gatekeeper_{uuid.uuid4().hex[:6]}",
            node_name="jev_gatekeeper_node",
            model_family="deterministic/shacl-firewall",
            hypothesis_tested=str(contract.action),
            query_a={"passed": is_passed, "violations_count": len(eval_dict.get("violations", []))},
            query_b={"policy_thresholds": policy_cfg.model_dump(mode="json"), "needs_doubt_review": state.get("needs_doubt_review", False)},
            evidence_sufficiency_met=is_passed,
            prior_agreement=not state.get("needs_doubt_review", False),
            reserved_cost=0.001,
            settled_cost=0.001,
            latency_ms=12.0,
            shacl_passed=is_passed,
        )
        attempt_history.append(gatekeeper_receipt.to_dict())
        return {
            "jev_passed": eval_dict["passed"],
            "jev_evaluation": eval_dict,
            "firewall_violations": eval_dict["violations"],
            "escalation_required": (not eval_dict["passed"] and is_critical),
            "requires_operator_approval": is_high_risk,
            "jev_telemetry": state.get("jev_telemetry"),
            "attempt_history": attempt_history,
        }
    else:
        return {
            "jev_passed": False,
            "jev_evaluation": {"passed": False, "veto_reason": "No candidate action or contract provided for evaluation"},
            "firewall_violations": [{"rule_id": "MISSING_CONTRACT", "message": "No action contract provided"}],
            "escalation_required": False,
            "requires_operator_approval": is_high_risk,
            "jev_telemetry": state.get("jev_telemetry"),
        }

    is_passed = len(violations) == 0
    if is_passed:
        jev_evaluation = {
            "passed": True,
            "veto_reason": None,
            "suggested_action": "DISPATCH_VALIDATED_ALERT",
            "semantic_confidence": candidate_action.semantic_confidence,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "hitl_payload": None,
        }
    else:
        primary = violations[0]
        if metadata.get("force_fsm_veto") or metadata.get("illegal_state_jump"):
            state_viol = next((v for v in violations if v.rule_id == "SHACL-STATE-01"), None)
            if state_viol:
                reason = f"[{primary.rule_id} / SHACL-STATE-01] {state_viol.message} ({primary.message})"
            else:
                reason = f"[{primary.rule_id} / SHACL-STATE-01] Illegal state jump from {metadata.get('previous_tier', 'TIER_1_LOW')} directly to {metadata.get('target_tier', 'TIER_3_CRITICAL')} without intermediate corroboration. ({primary.message})"
        elif len(violations) > 1:
            rule_ids = " / ".join(dict.fromkeys(v.rule_id for v in violations))
            msgs = " | ".join(dict.fromkeys(v.message for v in violations))
            reason = f"[{rule_ids}] {msgs}"
        else:
            reason = f"[{primary.rule_id}] {primary.message}"
        jev_evaluation = {
            "passed": False,
            "veto_reason": reason,
            "suggested_action": "ROUTE_TO_HITL_QUEUE",
            "semantic_confidence": candidate_action.semantic_confidence,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "hitl_payload": {
                "veto_code": primary.rule_id,
                "reason": reason,
                "focus_node": primary.focus_node,
                "violations": [v.to_dict() for v in violations],
                "candidate_action": candidate_action.model_dump(mode="json"),
            },
        }

    is_critical = (
        candidate_action.target_tier == JevThreatTier.TIER_4_CRITICAL
        or (contract and contract.target_tier == ThreatTier.TIER_3_CRITICAL)
    )

    attempt_history = list(state.get("attempt_history", []))
    gatekeeper_receipt = CodonRunner.create_receipt(
        codon_id=f"codon_gatekeeper_{uuid.uuid4().hex[:6]}",
        node_name="jev_gatekeeper_node",
        model_family="deterministic/shacl-firewall",
        hypothesis_tested=str(candidate_action.action.value),
        query_a={"passed": is_passed, "violations_count": len(violations)},
        query_b={"policy_thresholds": policy_cfg.model_dump(mode="json"), "needs_doubt_review": state.get("needs_doubt_review", False)},
        evidence_sufficiency_met=is_passed,
        prior_agreement=not state.get("needs_doubt_review", False),
        reserved_cost=0.001,
        settled_cost=0.001,
        latency_ms=12.0,
        shacl_passed=is_passed,
    )
    attempt_history.append(gatekeeper_receipt.to_dict())

    return {
        "jev_passed": is_passed,
        "jev_evaluation": jev_evaluation,
        "firewall_violations": [v.to_dict() for v in violations],
        "escalation_required": (not is_passed and is_critical),
        "requires_operator_approval": is_high_risk,
        "jev_telemetry": state.get("jev_telemetry"),
        "attempt_history": attempt_history,
    }


def route_by_jev(state: GraphState) -> str:
    """
    Conditional router for LangGraph StateGraph.
    Enforces fail-closed routing:
    - 'passed' -> cytoscape_sync_node / alert_dispatch_node (only when JevOntologyFirewall passed)
    - 'vetoed' -> hitl_review_queue_node (when any SHACL violation or unapproved critical action is triggered)
    """
    if state.get("jev_passed", False):
        return "passed"
    return "vetoed"


def jev_validation_router(state: Dict[str, Any]) -> str:
    """
    Deterministic validation router enforcing fail-closed SHACL invariant gating.
    Evaluates candidate JevActionPayload against JevOntologyFirewall if not already evaluated.
    Returns:
    - 'commit_action_node' on clean pass
    - 'hitl_review_lane' on SHACL violation
    Populates state['firewall_violations'].
    """
    if "jev_passed" in state:
        return "commit_action_node" if state["jev_passed"] else "hitl_review_lane"

    payload = state.get("candidate_action")
    if not payload:
        return "hitl_review_lane"

    active_nodes = set(state.get("cytoscape_active_node_ids", set()))
    counselor_approved = bool(state.get("metadata", {}).get("counselor_approved") or state.get("counselor_approved"))
    violations = JevOntologyFirewall.evaluate_payload(payload, active_nodes, counselor_approved=counselor_approved)

    if not violations:
        return "commit_action_node"

    state["firewall_violations"] = [v.to_dict() for v in violations]
    return "hitl_review_lane"


def cytoscape_sync_node(state: GraphState) -> Dict[str, Any]:
    """
    Formats the validated Palantir ontology elements into Cytoscape.js compatible JSON nodes and edges.
    """
    metadata = state.get("metadata", {})
    threat = state.get("threat_event")
    personas = state.get("personas", [])
    school = state.get("school")
    triples = state.get("triples", [])

    # Preserve existing evidence elements (from video keyframes)
    elements: List[Dict[str, Any]] = [
        el for el in state.get("cytoscape_elements", [])
        if el.get("data", {}).get("type") == "evidence"
    ]

    # School Node
    if school:
        elements.append({
            "data": {
                "id": school.school_id,
                "type": "SchoolNode",
                "name": school.name,
                "district": school.district,
            }
        })

    # Persona Nodes (exclude cameras / edge sensors from being rendered as human student personas)
    for p in personas:
        if any(k in (p.alias or "").lower() or k in (p.entity_id or "").lower() for k in ["cctv", "camera", "sensor", "edge"]):
            continue
        alias_lower = (p.alias or "").lower()
        is_humint_whistleblower = (
            any(k in alias_lower for k in ["whistleblower", "anon", "warden", "patrol", "prefect", "sakshi", "witness"])
            or metadata.get("ingest_channel") in ["WHATSAPP_MOBILE_HUMINT", "HUMINT_VIDEO_UPLINK"]
            or (metadata.get("ingest_channel") in ["FIELD_TEXT_REPORT", "OCR_SCREENSHOT"] and any(k in alias_lower for k in ["whistleblower", "anon", "warden", "patrol", "prefect", "student"]))
        )
        elements.append({
            "data": {
                "id": p.entity_id,
                "type": "PersonaNode",
                "alias": p.alias,
                "school": p.school_name,
                "role": p.role_risk_tier,
                "is_whistleblower": "true" if is_humint_whistleblower else "false",
                "is_humint": "true" if is_humint_whistleblower else "false",
                "color": "#10b981" if is_humint_whistleblower else "#f59e0b",
            }
        })

    # Threat Event Node
    fused_sensory = state.get("fused_sensory")
    active_mods = fused_sensory.active_modalities if fused_sensory else ["HUMINT"]
    is_multi_int = len(active_mods) >= 2

    if threat:
        elements.append({
            "data": {
                "id": threat.event_id,
                "type": "ThreatEventNode",
                "incident_type": threat.incident_type,
                "severity_tier": threat.severity_tier,
                "threat_tier": threat.threat_tier.value,
                "threatLabel": f"{threat.incident_type.replace('_', ' ').title()} (T{threat.severity_tier})",
                "confidence": threat.confidence_score,
                "multi_int_corroborated": "true" if is_multi_int else "false",
                "corroborating_modalities": active_mods,
                "modality_badge": f"[{'+'.join(active_mods)}]" if is_multi_int else "",
                "spatial_coordinates": threat.spatial_coordinates,
                "matched_zone_id": threat.matched_zone_id,
                "matched_zone_name": threat.matched_zone_name,
                "is_blind_spot": threat.is_blind_spot,
                "is_curfew_violation": threat.is_curfew_violation,
            }
        })

    # Explicitly render any EvidenceNode objects attached to state
    for evi in state.get("evidence_nodes", []):
        if not any(el.get("data", {}).get("id") == evi.evidence_id for el in elements):
            badge_color = "#ef4444" if evi.has_threat_object else ("#f59e0b" if evi.visual_severity >= 3 else "#3b82f6")
            elements.append({
                "data": {
                    "id": evi.evidence_id,
                    "label": f"Exhibit [{evi.timestamp_sec or 0.0:.1f}s]: {evi.media_type}",
                    "type": "evidence",
                    "media_type": evi.media_type,
                    "visual_severity": evi.visual_severity,
                    "has_threat_object": evi.has_threat_object,
                    "threat_markers": evi.threat_markers,
                    "source_uri": evi.source_uri,
                    "color": badge_color,
                    "timestamp_sec": evi.timestamp_sec,
                    "sha256": evi.sha256_hash[:12] + "...",
                }
            })
            if threat:
                elements.append({
                    "data": {
                        "id": f"edge_{evi.evidence_id}_{threat.event_id}",
                        "source": evi.evidence_id,
                        "target": threat.event_id,
                        "type": "EvidenceEdge",
                        "label": "CORROBORATES",
                    }
                })

    # Social Links-style Entity Transform Nodes (recursive OSINT pivot elements)
    for p_node in state.get("pivoted_nodes", []):
        p_id = p_node.get("id")
        if p_id and not any(el.get("data", {}).get("id") == p_id for el in elements):
            elements.append({
                "data": {
                    "id": p_id,
                    "label": p_node.get("label", "OSINT Pivot"),
                    "type": "EntityTransformNode",
                    "source_url": p_node.get("source_url"),
                    "title": p_node.get("title"),
                    "color": "#8b5cf6",
                }
            })
            if threat:
                elements.append({
                    "data": {
                        "id": f"edge_{p_id}_{threat.event_id}",
                        "source": p_id,
                        "target": threat.event_id,
                        "type": "PivotCorroborationEdge",
                        "label": "TRANSFORM_CORROBORATES",
                    }
                })

    # Relational Evidence Edges with Bitemporal Freshness tagging
    now_ts = datetime.now(timezone.utc)
    for idx, tr in enumerate(triples):
        # Calculate freshness decay: if valid_at or observed_at is older than 24h, mark as stale
        edge_valid_at = getattr(tr, "valid_at", None) or getattr(tr, "observed_at", None)
        is_stale = False
        if edge_valid_at:
            age_hours = (now_ts - edge_valid_at).total_seconds() / 3600.0
            is_stale = age_hours > 24.0

        elements.append({
            "data": {
                "id": f"edge_{idx}_{tr.subject_id}_{tr.object_id}",
                "source": tr.subject_id,
                "target": tr.object_id,
                "type": "EvidenceEdge",
                "label": tr.predicate,
                "freshness": "stale" if is_stale else "fresh",
                "valid_at": edge_valid_at.isoformat() if edge_valid_at else None,
                "confidence": tr.confidence,
            }
        })

    # Ensure EVERY evidence element has a CORROBORATES edge to ThreatEventNode
    if threat:
        for el in elements:
            if el.get("data", {}).get("type") == "evidence":
                evi_id = el["data"]["id"]
                edge_id = f"edge_{evi_id}_{threat.event_id}"
                if not any(e.get("data", {}).get("id") == edge_id for e in elements):
                    elements.append({
                        "data": {
                            "id": edge_id,
                            "source": evi_id,
                            "target": threat.event_id,
                            "type": "EvidenceEdge",
                            "label": "CORROBORATES",
                        }
                    })

    return {"cytoscape_elements": elements}


def alert_dispatch_node(state: GraphState) -> Dict[str, Any]:
    """
    Dispatches validated on-campus counselor alert for approved tier escalations.
    BLAST-RADIUS GOVERNANCE:
    Autonomous security alerts or campus crisis dispatches must NEVER execute without
    human counselor sign-off. Executes strictly for verified read/informational events
    or post-HITL human approval.
    """
    threat = state.get("threat_event")
    personas = state.get("personas", [])
    contract = state.get("action_contract")
    now_iso = datetime.now(timezone.utc).isoformat()
    severity = state.get("severity_tier", 1)
    threat_tier_str = state.get("threat_tier", "LOW")
    metadata = state.get("metadata", {})
    is_human_approved = bool(metadata.get("counselor_approved") or state.get("counselor_approved"))

    is_actionable = threat_tier_str in ["ELEVATED", "CRITICAL"] or severity >= 2
    is_critical = threat_tier_str == "CRITICAL" or severity >= 5

    alert_payload = None
    if is_critical and is_human_approved:
        alert_payload = {
            "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
            "urgency": "CRITICAL_TRIAGE",
            "severity_tier": severity,
            "threat_tier": threat_tier_str,
            "timestamp": now_iso,
            "threat_event_id": threat.event_id if threat else "unknown",
            "incident_type": threat.incident_type if threat else "unknown",
            "summary": threat.context_summary if threat else "Action validated by Jev Gatekeeper and authorized by Counselor.",
            "involved_personas": [p.model_dump() for p in personas],
            "slang_markers": state.get("extracted_slang_tokens", []),
            "evidence_citations": state.get("external_citations", []),
            "recommended_action": "Counselor-authorized immediate on-campus dispatch & intervention protocol.",
            "jev_status": "APPROVED_POST_HITL",
        }
        action_name = "COUNSELOR_DISPATCH_TRIGGERED"
        status_name = "escalated_and_synced"
    elif is_actionable and not is_critical:
        alert_payload = {
            "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
            "urgency": "ELEVATED_TRIAGE",
            "severity_tier": severity,
            "threat_tier": threat_tier_str,
            "timestamp": now_iso,
            "threat_event_id": threat.event_id if threat else "unknown",
            "incident_type": threat.incident_type if threat else "unknown",
            "summary": threat.context_summary if threat else "Action validated by Jev Gatekeeper.",
            "involved_personas": [p.model_dump() for p in personas],
            "slang_markers": state.get("extracted_slang_tokens", []),
            "evidence_citations": state.get("external_citations", []),
            "recommended_action": "On-campus counselor monitoring & advisory check-in.",
            "jev_status": "APPROVED_BY_GATEKEEPER",
        }
        action_name = "COUNSELOR_NOTICE_DISPATCHED"
        status_name = "escalated_and_synced"
    else:
        action_name = "INFORMATIONAL_EVENT_LOGGED"
        status_name = "logged_and_synced"

    audit_entry = {
        "action": action_name,
        "timestamp": now_iso,
        "severity_tier": severity,
        "event_id": threat.event_id if threat else None,
        "jev_verdict": "PASSED",
        "human_approved": is_human_approved,
    }

    current_audit = state.get("audit_log", [])
    return {
        "counselor_alert": alert_payload,
        "audit_log": [*current_audit, audit_entry],
        "status": status_name,
        "requires_operator_approval": state.get("requires_operator_approval", False),
    }


def hitl_review_queue_node(state: GraphState) -> Dict[str, Any]:
    """
    Captures actions vetoed by Jev Gatekeeper or flagged for required human sign-off (SHACL-GOV-01).
    Enqueues the incident into the Human-in-the-Loop review queue with complete audit reasons.
    Also ensures cytoscape elements are formatted for counselor UI inspection.
    """
    threat = state.get("threat_event")
    jev_eval = state.get("jev_evaluation", {})
    contract = state.get("action_contract")
    candidate_act = state.get("candidate_action")
    now_iso = datetime.now(timezone.utc).isoformat()

    hitl_item = {
        "queue_id": f"hitl_{uuid.uuid4().hex[:8]}",
        "timestamp": now_iso,
        "veto_reason": jev_eval.get("veto_reason", "Action vetoed by Jev Gatekeeper"),
        "suggested_action": jev_eval.get("suggested_action", "ROUTE_TO_HITL_QUEUE"),
        "proposed_contract": contract.model_dump(mode="json") if contract else None,
        "candidate_action": candidate_act.model_dump(mode="json") if candidate_act else None,
        "firewall_violations": state.get("firewall_violations", []),
        "raw_text": state.get("raw_text"),
        "extracted_slang": state.get("extracted_slang_tokens", []),
        "threat_event": threat.model_dump(mode="json") if threat else None,
        "review_status": "PENDING_HUMAN_TRIAGE",
    }

    audit_entry = {
        "action": "JEV_VETO_ENQUEUED_HITL",
        "timestamp": now_iso,
        "veto_reason": jev_eval.get("veto_reason"),
        "event_id": threat.event_id if threat else None,
        "governance_rule": jev_eval.get("hitl_payload", {}).get("veto_code", "SHACL_GATE"),
    }

    # Format Cytoscape elements so counselor has complete visual topology regardless of Jev veto status
    cy_elements = cytoscape_sync_node(state).get("cytoscape_elements", [])

    current_hitl = state.get("hitl_queue", [])
    current_audit = state.get("audit_log", [])
    return {
        "hitl_queue": [*current_hitl, hitl_item],
        "audit_log": [*current_audit, audit_entry],
        "cytoscape_elements": cy_elements,
        "status": "vetoed_to_hitl_queue",
        "requires_operator_approval": state.get("requires_operator_approval", False),
    }



def log_audit_node(state: GraphState) -> Dict[str, Any]:
    """
    Terminal logging node for incidents requiring audit trail persistence.
    """
    threat = state.get("threat_event")
    now_iso = datetime.now(timezone.utc).isoformat()

    audit_entry = {
        "action": "TRIAGE_PIPELINE_COMPLETE",
        "timestamp": now_iso,
        "status": state.get("status", "completed"),
        "event_id": threat.event_id if threat else None,
    }

    current_audit = state.get("audit_log", [])
    return {
        "audit_log": [*current_audit, audit_entry],
    }
