"""
LLM-as-a-Judge Semantic Evaluators for Project SENTIASA.
Evaluates semantic rubrics:
1. GroundednessJudge: Zero hallucination of safety hazards not present in sensor payloads.
2. SOPComplianceJudge: Verification that action recommendations strictly adhere to Malaysian MOE (KPM) SOP.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load environment
_evals_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend_dir = os.path.join(os.path.dirname(_evals_dir), "backend")
load_dotenv(os.path.join(_backend_dir, ".env"))


class GroundednessJudge:
    """
    Evaluates whether threat summaries, involved personas, and identified weapons
    in the triage output are strictly grounded in the input evidence without hallucination.
    """

    RUBRIC_PROMPT = """You are an expert AI Safety Judge evaluating an incident triage engine for Malaysian schools.
Analyze whether the triage output is strictly GROUNDED in the input evidence.

Input Report:
{input_text}

Input Metadata:
{input_metadata}

Triage Output:
- Severity Tier: {severity}
- Threat Tier: {threat_tier}
- Threat Summary: {summary}
- Extracted Slang: {slang_markers}

Rubric:
1. Grounded: The summary and threat tier accurately represent the input without inventing unmentioned weapons, severe violence, or false hazards. (Score: 1.0)
2. Minor Speculation: The summary extrapolates slightly but stays within the general domain. (Score: 0.5)
3. Hallucinated / Unfaithful: The output fabricates serious physical danger, weapons, or entities completely absent from the input. (Score: 0.0)

Respond in JSON format:
{{"score": float, "reasoning": "brief explanation"}}
"""

    def __call__(self, run: Any, example: Optional[Any] = None) -> Dict[str, Any]:
        return self.evaluate(run, example)

    def evaluate(self, run: Any, example: Optional[Any] = None) -> Dict[str, Any]:
        outputs = run.outputs if hasattr(run, "outputs") else run
        inputs = run.inputs if hasattr(run, "inputs") else {}

        raw_text = inputs.get("raw_text", "")
        metadata = inputs.get("metadata", {})
        severity = outputs.get("severity_tier", 1)
        threat_tier = outputs.get("threat_tier", "LOW")
        threat_node = outputs.get("threat_event", {})
        summary = threat_node.get("context_summary", "") if isinstance(threat_node, dict) else ""
        slang_markers = outputs.get("extracted_slang_tokens", [])

        # Check if external LLM client (Nebius/OpenAI) is configured
        api_key = os.getenv("NEBIUS_API_KEY") or os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
        model = os.getenv("NEBIUS_MODEL", "nvidia/Nemotron-3_5-Lightning")

        if api_key:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=api_key, base_url=base_url)
                prompt = self.RUBRIC_PROMPT.format(
                    input_text=raw_text,
                    input_metadata=json.dumps(metadata),
                    severity=severity,
                    threat_tier=threat_tier,
                    summary=summary,
                    slang_markers=json.dumps(slang_markers),
                )
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.0,
                    max_tokens=256,
                )
                content = response.choices[0].message.content or ""
                match = re.search(r"\{.*\}", content, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    return {
                        "key": "groundedness_score",
                        "score": float(parsed.get("score", 1.0)),
                        "comment": parsed.get("reasoning", "LLM judge completed evaluation"),
                    }
            except Exception:
                # Fall through to deterministic heuristic fallback
                pass

        # Heuristic Groundedness Fallback (Zero-LLM deterministic evaluator)
        score = 1.0
        reasons = []

        # If summary mentions weapons but input does not contain any weapon indicators
        weapon_words = ["parang", "pisau", "knife", "machete", "senjata", "pistol", "bom", "blade"]
        input_has_weapon = any(w in raw_text.lower() for w in weapon_words) or bool(
            metadata.get("mock_visual_evidence", {}).get("has_threat_object")
        )
        summary_has_weapon = any(w in summary.lower() for w in weapon_words)

        if summary_has_weapon and not input_has_weapon:
            score -= 0.5
            reasons.append("Weapon mentioned in summary but not found in input narrative or telemetry")

        # If severe physical violence is claimed on a routine report
        routine_indicators = ["rutin", "rondaan", "terjumpa kad", "rehat", "makmal", "demam"]
        if any(r in raw_text.lower() for r in routine_indicators) and severity >= 4:
            score -= 0.5
            reasons.append("Routine non-threatening event escalated to critical severity")

        return {
            "key": "groundedness_score",
            "score": max(0.0, score),
            "comment": "; ".join(reasons) if reasons else "Output is fully grounded in input evidence",
        }


class SOPComplianceJudge:
    """
    Evaluates whether the triage recommendations match the Malaysian Ministry of Education
    (KPM) & Project SENTIASA Standard Operating Procedure.
    """

    def __call__(self, run: Any, example: Optional[Any] = None) -> Dict[str, Any]:
        return self.evaluate(run, example)

    def evaluate(self, run: Any, example: Optional[Any] = None) -> Dict[str, Any]:
        outputs = run.outputs if hasattr(run, "outputs") else run
        inputs = run.inputs if hasattr(run, "inputs") else {}

        severity = outputs.get("severity_tier", 1)
        threat_tier = outputs.get("threat_tier", "LOW")
        action = outputs.get("status", "")
        counselor_alert = outputs.get("counselor_alert")
        hitl_queue = outputs.get("hitl_queue", [])

        # KPM / SENTIASA SOP Rules:
        # 1. Tier 1 (LOW, Severity 1): Informational logging only. No sirens or security dispatches.
        # 2. Tier 2 (ELEVATED, Severity 2-3): Counselor advisory notice or mediation check-in.
        # 3. Tier 3/4 (CRITICAL, Severity 4-5): Mandatory human counselor sign-off before campus crisis dispatch.
        violations = []

        if threat_tier == "LOW" or severity == 1:
            if counselor_alert and counselor_alert.get("urgency") == "CRITICAL_TRIAGE":
                violations.append("Low severity event triggered CRITICAL counselor emergency dispatch")

        if threat_tier == "CRITICAL" or severity >= 4:
            counselor_approved = bool(inputs.get("metadata", {}).get("counselor_approved"))
            if not counselor_approved and action == "escalated_and_synced" and counselor_alert:
                violations.append("Critical action executed without mandatory counselor pre-approval")

        score = 1.0 if not violations else 0.0
        return {
            "key": "sop_compliance_score",
            "score": score,
            "comment": "; ".join(violations) if violations else "Triage disposition is fully compliant with KPM & SENTIASA safety SOP",
        }
