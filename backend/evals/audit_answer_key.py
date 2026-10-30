"""
Audit Ground-Truth Answer Key & Dataset Leakage Scanner (Southbridge Rule 08).

Audits Malaysian youth slang fixtures, VLM annotations, and benchmark datasets for:
1. Label Contradictions & Ambiguities (e.g. tier mismatch, contradictory Jev expectations).
2. OCR / Subtitle Contamination (leakage where video subtitles or transcripts contain literal label strings).
3. Vernacular Polysemy Risk (slang terms with dual meanings that require orthogonal context).
4. Temporal Drift / Stale Timestamp bounds.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class AuditFinding:
    fixture_id: str
    category: str  # 'LABEL_AMBIGUITY' | 'OCR_LEAKAGE' | 'POLYSEMY_RISK' | 'TEMPORAL_DRIFT'
    severity: str  # 'INFO' | 'WARNING' | 'CRITICAL'
    message: str
    remediation: str


@dataclass
class DatasetAuditReport:
    total_fixtures: int
    clean_fixtures: int
    findings: List[AuditFinding] = field(default_factory=list)

    @property
    def has_critical_findings(self) -> bool:
        return any(f.severity == "CRITICAL" for f in self.findings)

    def summary(self) -> Dict[str, Any]:
        return {
            "total_fixtures": self.total_fixtures,
            "clean_fixtures": self.clean_fixtures,
            "flagged_count": len(self.findings),
            "findings": [
                {
                    "fixture_id": f.fixture_id,
                    "category": f.category,
                    "severity": f.severity,
                    "message": f.message,
                    "remediation": f.remediation,
                }
                for f in self.findings
            ],
        }


# High-polysemy Malaysian youth slang lexicon requiring disambiguation
POLYSEMIC_SLANG = {
    "pau": {
        "benign_meaning": "Steamed bun / traditional food",
        "threat_meaning": "Extortion / demanding money under duress",
    },
    "koyak": {
        "benign_meaning": "Torn or ripped material / paper",
        "threat_meaning": "Extreme emotional breakdown or distress under bullying",
    },
    "payung": {
        "benign_meaning": "Physical umbrella for rain protection",
        "threat_meaning": "Providing protective cover for illicit activity or illicit treats",
    },
    "tapau": {
        "benign_meaning": "Takeaway food",
        "threat_meaning": "Beating up / completely defeating someone in a brawl",
    },
    "parang": {
        "benign_meaning": "Agricultural clearing machete in rural settings",
        "threat_meaning": "Lethal edge weapon in student gang brawls",
    },
}


def audit_slang_fixtures(fixture_path: Optional[Path] = None) -> DatasetAuditReport:
    """Audits malaysian_youth_slang_fixtures.json against Southbridge Rule 08 criteria."""
    if fixture_path is None:
        fixture_path = Path(__file__).parent / "malaysian_youth_slang_fixtures.json"

    if not fixture_path.exists():
        report = DatasetAuditReport(total_fixtures=0, clean_fixtures=0)
        report.findings.append(
            AuditFinding(
                fixture_id="N/A",
                category="LABEL_AMBIGUITY",
                severity="CRITICAL",
                message=f"Fixture file not found at {fixture_path}",
                remediation="Ensure malaysian_youth_slang_fixtures.json is populated in backend/evals/",
            )
        )
        return report

    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    fixtures = data.get("fixtures", [])
    findings: List[AuditFinding] = []
    clean_count = 0

    for fix in fixtures:
        fid = fix.get("id", "unknown")
        raw_text = fix.get("raw_text", "").lower()
        slang_tokens = [tok.lower() for tok in fix.get("slang_tokens", [])]
        expected_type = fix.get("expected_incident_type", "")
        expected_tier = fix.get("expected_threat_tier", "")
        sev = fix.get("expected_severity_tier", 1)

        fixture_clean = True

        # 1. OCR / Subtitle literal string leakage audit
        # Flag if the raw prompt or text explicitly contains the machine-classified label name
        if expected_type and expected_type.replace("_", " ") in raw_text:
            findings.append(
                AuditFinding(
                    fixture_id=fid,
                    category="OCR_LEAKAGE",
                    severity="WARNING",
                    message=f"Raw text contains exact machine label '{expected_type}' causing synthetic answer leakage.",
                    remediation="Mask or paraphrase category names in test prompts to prevent prompt leakage.",
                )
            )
            fixture_clean = False

        # 2. Polysemy risk audit
        for tok in slang_tokens:
            if tok in POLYSEMIC_SLANG:
                poly = POLYSEMIC_SLANG[tok]
                findings.append(
                    AuditFinding(
                        fixture_id=fid,
                        category="POLYSEMY_RISK",
                        severity="INFO",
                        message=(
                            f"Token '{tok}' is highly polysemic (Benign: '{poly['benign_meaning']}' "
                            f"vs Threat: '{poly['threat_meaning']}'). Requires orthogonal IMINT/OSINT corroboration."
                        ),
                        remediation="Ensure Jev polysemy gate (SHACL-SEM-01) verifies surrounding syntactic context.",
                    )
                )

        # 3. Label Ambiguity / Contradiction audit
        if expected_tier == "CRITICAL" and sev < 4:
            findings.append(
                AuditFinding(
                    fixture_id=fid,
                    category="LABEL_AMBIGUITY",
                    severity="CRITICAL",
                    message=f"Expected threat tier is CRITICAL but severity tier is {sev} (< 4).",
                    remediation="Normalize severity tier to >= 4 for CRITICAL classification.",
                )
            )
            fixture_clean = False

        # 4. Temporal offset audit
        offset_hours = fix.get("source_timestamp_offset_hours", 0)
        if offset_hours < -2 and fix.get("expected_jev_pass") is True:
            findings.append(
                AuditFinding(
                    fixture_id=fid,
                    category="TEMPORAL_DRIFT",
                    severity="CRITICAL",
                    message=(
                        f"Fixture offset is {offset_hours}h (> 2h policy limit) but expected_jev_pass is True. "
                        "Violates SHACL-TEMP-01 freshness bound."
                    ),
                    remediation="Set expected_jev_pass=False and expected_veto_code='TEMPORAL_STALE_SIGNAL'.",
                )
            )
            fixture_clean = False

        if fixture_clean:
            clean_count += 1

    return DatasetAuditReport(
        total_fixtures=len(fixtures),
        clean_fixtures=clean_count,
        findings=findings,
    )


if __name__ == "__main__":
    rep = audit_slang_fixtures()
    print(f"Dataset Audit Complete: {rep.clean_fixtures}/{rep.total_fixtures} clean fixtures.")
    for f in rep.findings:
        print(f"[{f.severity}] {f.fixture_id} ({f.category}): {f.message}")
