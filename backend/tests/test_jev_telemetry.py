"""
Unit and integration tests for Live TypeSafe Jev System One Telemetry & Polysemy Disambiguation.
Ensures deterministic offline testing for pytest with fast execution (< 2 seconds).
"""

import pytest
from fastapi.testclient import TestClient

from backend.jev_contracts import (
    ThreatTier,
    query_jev_multidimensional_telemetry,
    query_jev_polysemy,
)
from backend.main import app
from backend.nodes.triage_nodes import disambiguate_slang_polysemy, normalize_slang_node
from backend.state import GraphState
from backend.graph import run_triage

client = TestClient(app)


def test_query_jev_multidimensional_telemetry_offline_keys():
    """Verify query_jev_multidimensional_telemetry returns all 4 canonical keys within 0.0-1.0."""
    sample_threat = "Budak form 4 bawa parang nak belasah budak batch bawah malam ni."
    telemetry = query_jev_multidimensional_telemetry(api_key="", state_text=sample_threat, mock_mode=True)

    assert isinstance(telemetry, dict)
    expected_keys = ["imminent_violence", "weapon_threat", "extortion_coercion", "victim_distress"]
    for k in expected_keys:
        assert k in telemetry
        val = telemetry[k]
        assert isinstance(val, (int, float))
        assert 0.0 <= val <= 1.0

    # Weapon and violence markers should be high
    assert telemetry["weapon_threat"] >= 0.80
    assert telemetry["imminent_violence"] >= 0.75


def test_query_jev_multidimensional_telemetry_benign_food():
    """Verify benign food text yields low violence and weapon threat scores."""
    sample_benign = "Jom pergi kantin makan pau ayam panas lepas tu tapau nasi lemak sebungkus."
    telemetry = query_jev_multidimensional_telemetry(api_key="", state_text=sample_benign, mock_mode=True)

    assert telemetry["imminent_violence"] < 0.20
    assert telemetry["weapon_threat"] < 0.10
    assert telemetry["extortion_coercion"] < 0.10


def test_polysemy_disambiguation_tapau_food_vs_violence():
    """Verify tapau is disambiguated between food and physical assault."""
    # Food context (benign)
    meta_food = disambiguate_slang_polysemy("tapau", "jom tapau nasi lemak kat kantin", mock_mode=True)
    assert meta_food["is_threat"] is False
    assert meta_food["category"] == "food_takeaway"
    assert meta_food["tier"] == ThreatTier.TIER_1_LOW

    # Assault context (threat)
    meta_assault = disambiguate_slang_polysemy("tapau", "kitorang nak tapau budak hostel malam ni", mock_mode=True)
    assert meta_assault["is_threat"] is True
    assert meta_assault["tier"] == ThreatTier.TIER_2_ELEVATED
    assert meta_assault["severity_boost"] >= 2


def test_polysemy_disambiguation_pau_food_vs_extortion():
    """Verify pau is disambiguated between steamed bun and monetary extortion."""
    # Food context (benign)
    meta_food = disambiguate_slang_polysemy("pau", "beli pau ayam sedap kat kedai", mock_mode=True)
    assert meta_food["is_threat"] is False
    assert meta_food["category"] == "food_item"
    assert meta_food["tier"] == ThreatTier.TIER_1_LOW

    # Extortion context (threat)
    meta_extort = disambiguate_slang_polysemy("pau", "senior pau duit belanja budak form 1 hari-hari", mock_mode=True)
    assert meta_extort["is_threat"] is True
    assert meta_extort["category"] == "extortion"
    assert meta_extort["tier"] == ThreatTier.TIER_2_ELEVATED


def test_polysemy_disambiguation_koyak_material_vs_distress():
    """Verify koyak is disambiguated between torn material and mental distress."""
    # Material context (benign)
    meta_mat = disambiguate_slang_polysemy("koyak", "kertas nota saya terkoyak masa simpan beg", mock_mode=True)
    assert meta_mat["is_threat"] is False
    assert meta_mat["category"] == "material_damage"

    # Distress context (threat)
    meta_distress = disambiguate_slang_polysemy("koyak", "koyak parah kena kecam netizen sampai menangis stres", mock_mode=True)
    assert meta_distress["is_threat"] is True
    assert meta_distress["category"] == "emotional_distress"


def test_triage_flow_populates_jev_telemetry():
    """Verify run_triage flow attaches jev_telemetry to the graph execution state."""
    report = "Budak form 4 bawa parang nak belasah budak batch bawah."
    result = run_triage(
        raw_text=report,
        metadata={
            "school_name": "SMK Sri Hartamas",
            "reporter_alias": "Whistleblower_X",
            "mock_external_apis": True,
        },
    )
    assert "jev_telemetry" in result
    telemetry = result["jev_telemetry"]
    assert telemetry is not None
    assert "imminent_violence" in telemetry
    assert "weapon_threat" in telemetry
    assert "extortion_coercion" in telemetry
    assert "victim_distress" in telemetry
    assert telemetry["weapon_threat"] >= 0.80


def test_api_triage_endpoint_returns_jev_telemetry():
    """Verify POST /api/triage endpoint includes jev_telemetry in JSON response."""
    resp = client.post(
        "/api/triage",
        json={
            "raw_text": "Senior ugut pau duit budak junior dekat tangga",
            "school_name": "SMK Convent",
            "reporter_alias": "AnonStudent",
            "metadata": {"mock_external_apis": True},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "jev_telemetry" in data
    assert data["jev_telemetry"] is not None
    assert "extortion_coercion" in data["jev_telemetry"]
    assert data["jev_telemetry"]["extortion_coercion"] >= 0.70


def test_benchmark_results_and_fixtures():
    """Verify that 50-scenario benchmark results and fixtures are properly saved and structured."""
    from pathlib import Path
    import json

    project_root = Path(__file__).resolve().parent.parent.parent

    fixtures_paths = [
        project_root / "data" / "fixtures" / "malaysian_youth_slang_fixtures.json",
        project_root / "data" / "malaysian_youth_slang_fixtures.json",
        project_root / "backend" / "evals" / "malaysian_youth_slang_fixtures.json",
        project_root / "data" / "evals" / "ilmu_slang_benchmark.json",
        Path("data/fixtures/malaysian_youth_slang_fixtures.json"),
        Path("data/malaysian_youth_slang_fixtures.json"),
        Path("backend/evals/malaysian_youth_slang_fixtures.json"),
        Path("data/evals/ilmu_slang_benchmark.json"),
    ]
    found_fixtures = None
    for p in fixtures_paths:
        if p.exists():
            found_fixtures = p
            break
    assert found_fixtures is not None, "At least one benchmark fixture path must exist"

    # Mirror fixtures if not already present
    content = found_fixtures.read_text(encoding="utf-8")
    for target in [
        project_root / "data" / "malaysian_youth_slang_fixtures.json",
        project_root / "backend" / "evals" / "malaysian_youth_slang_fixtures.json",
    ]:
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")

    results_paths = [
        project_root / "data" / "jev_benchmark_results.json",
        Path("data/jev_benchmark_results.json"),
    ]
    results_path = next((p for p in results_paths if p.exists()), None)
    assert results_path is not None, "data/jev_benchmark_results.json must exist"
    with open(results_path, "r", encoding="utf-8") as f:
        res = json.load(f)
    assert res["metadata"]["total_scenarios"] == 50
    assert "typesafe_jev_system_one" in res["metrics_summary"]
    assert "ytl_ai_labs_ilmu" in res["metrics_summary"]
    assert "nebius_nemotron_3_5" in res["metrics_summary"]

    jev_metrics = res["metrics_summary"]["typesafe_jev_system_one"]
    assert jev_metrics["accuracy"] >= 0.90
    assert jev_metrics["recall"] >= 0.90
    assert jev_metrics["expected_calibration_error"] < 0.10

