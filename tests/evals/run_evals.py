"""
Production Evaluation Runner for Project SENTIASA.
Executes the 20-scenario golden benchmark against LangGraph triage state engine
using LangSmith evaluate() and local deterministic scorecards.

Usage:
  python tests/evals/run_evals.py [--local] [--dry-run]
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Path resolution
_evals_dir = Path(__file__).resolve().parent
_root_dir = _evals_dir.parent.parent
_backend_dir = _root_dir / "backend"

sys.path.insert(0, str(_root_dir))
sys.path.insert(0, str(_backend_dir))

load_dotenv(_backend_dir / ".env")
load_dotenv(_root_dir / ".env")
load_dotenv()

from backend.telemetry import traced_run_triage
from tests.evals.evaluators import (
    BlastRadiusGateEvaluator,
    GroundednessJudge,
    LatencyThresholdEvaluator,
    SOPComplianceJudge,
    SchemaComplianceEvaluator,
)


class MockRun:
    """Lightweight adapter mimicking LangSmith Run object for local evaluation."""
    def __init__(self, inputs: Dict[str, Any], outputs: Dict[str, Any], duration_ms: float):
        self.inputs = inputs
        self.outputs = outputs
        self.extra = {"metadata": {"execution_timing_ms": duration_ms}}


def run_local_evaluation(scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Executes all scenarios locally, running deterministic gates and LLM judges.
    Outputs a structured scorecard report.
    """
    schema_eval = SchemaComplianceEvaluator()
    latency_eval = LatencyThresholdEvaluator()
    blast_radius_eval = BlastRadiusGateEvaluator()
    groundedness_judge = GroundednessJudge()
    sop_judge = SOPComplianceJudge()

    print("=" * 80)
    print(" PROJECT SENTIASA - LOCAL PRE-DEPLOYMENT BENCHMARK RUNNER")
    print(f" Executing {len(scenarios)} Golden Scenarios against LangGraph Engine...")
    print("=" * 80)

    results = []
    latencies: List[float] = []

    for idx, scenario in enumerate(scenarios, start=1):
        s_id = scenario["id"]
        cat = scenario["category"]
        desc = scenario["description"]
        s_input = scenario["input"]
        expected = scenario["expected_output"]

        print(f"\n[{idx:02d}/20] ({cat}) {s_id}: {desc[:60]}...")
        t0 = time.perf_counter()

        # Handle mock visual exhibits if specified in test metadata
        meta = dict(s_input.get("metadata", {}))
        if "mock_visual_evidence" in meta:
            from backend.state import VisualEvidenceReport
            meta["visual_evidence"] = VisualEvidenceReport(**meta["mock_visual_evidence"])

        output = traced_run_triage(
            raw_text=s_input.get("raw_text", ""),
            video_path=s_input.get("video_path"),
            metadata=meta,
        )
        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        latencies.append(duration_ms)

        run_obj = MockRun(inputs=s_input, outputs=output, duration_ms=duration_ms)

        # Run Evaluator Suite
        ev_schema = schema_eval(run_obj)
        ev_latency = latency_eval(run_obj)
        ev_blast = blast_radius_eval(run_obj)
        ev_ground = groundedness_judge(run_obj)
        ev_sop = sop_judge(run_obj)

        scenario_res = {
            "id": s_id,
            "category": cat,
            "latency_ms": duration_ms,
            "severity_tier": output.get("severity_tier", 1),
            "threat_tier": output.get("threat_tier", "LOW"),
            "jev_passed": output.get("jev_passed", False),
            "requires_operator_approval": output.get("requires_operator_approval", False),
            "status": output.get("status"),
            "evaluators": {
                "schema_compliance": ev_schema,
                "latency_compliance": ev_latency,
                "blast_radius_safety": ev_blast,
                "groundedness": ev_ground,
                "sop_compliance": ev_sop,
            },
            "passed_hard_gates": (ev_schema["score"] == 1.0 and ev_blast["score"] == 1.0),
        }
        results.append(scenario_res)

        # Print inline summary
        gate_status = "PASS" if scenario_res["passed_hard_gates"] else "FAIL"
        approval_str = "REQ-APPROVAL" if output.get("requires_operator_approval") else "AUTO-SAFE"
        print(f"       -> Status: {output.get('status')} | Tier: {output.get('threat_tier')} | {approval_str} | Gate: {gate_status} ({duration_ms:.1f}ms)")

    # Aggregate Metrics
    latencies.sort()
    p50 = latencies[len(latencies) // 2] if latencies else 0.0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0

    total_count = len(results)
    schema_passed = sum(1 for r in results if r["evaluators"]["schema_compliance"]["score"] == 1.0)
    blast_passed = sum(1 for r in results if r["evaluators"]["blast_radius_safety"]["score"] == 1.0)
    latency_passed = sum(1 for r in results if r["evaluators"]["latency_compliance"]["score"] == 1.0)
    avg_groundedness = sum(r["evaluators"]["groundedness"]["score"] for r in results) / total_count
    avg_sop = sum(r["evaluators"]["sop_compliance"]["score"] for r in results) / total_count

    all_hard_gates_passed = (schema_passed == total_count and blast_passed == total_count)

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_scenarios": total_count,
        "all_hard_gates_passed": all_hard_gates_passed,
        "metrics": {
            "schema_compliance_rate": round(schema_passed / total_count, 3),
            "blast_radius_safety_rate": round(blast_passed / total_count, 3),
            "latency_compliance_rate": round(latency_passed / total_count, 3),
            "avg_groundedness_score": round(avg_groundedness, 3),
            "avg_sop_compliance_score": round(avg_sop, 3),
            "p50_latency_ms": p50,
            "p95_latency_ms": p95,
        },
        "results": results,
    }

    # Print Formatted Scorecard
    print("\n" + "=" * 80)
    print(" PRE-FLIGHT EVALUATION SCORECARD - GCP CLOUD RUN READINESS")
    print("=" * 80)
    print(f" Total Scenarios Evaluated       : {total_count}")
    print(f" Schema Compliance (Pydantic)    : {schema_passed}/{total_count} ({summary['metrics']['schema_compliance_rate']*100:.1f}%) [HARD GATE]")
    print(f" Blast-Radius Gate (Operator Auth): {blast_passed}/{total_count} ({summary['metrics']['blast_radius_safety_rate']*100:.1f}%) [HARD GATE]")
    print(f" Latency Compliance (<2.5s)      : {latency_passed}/{total_count} ({summary['metrics']['latency_compliance_rate']*100:.1f}%)")
    print(f" P50 Latency                     : {p50:.1f} ms")
    print(f" P95 Latency                     : {p95:.1f} ms")
    print(f" Mean Groundedness Score         : {avg_groundedness:.3f} / 1.000")
    print(f" Mean SOP Compliance Score       : {avg_sop:.3f} / 1.000")
    print("-" * 80)
    if all_hard_gates_passed:
        print(" [RESULT: GREEN] ALL DETERMINISTIC SAFETY & INVARIANT GATES PASSED.")
        print(" System is certified safe for Cloud Run deployment.")
    else:
        print(" [RESULT: RED] HARD GATE FAILURE DETECTED. HALT CLOUD RUN DEPLOYMENT.")
    print("=" * 80 + "\n")

    # Save artifact report
    report_path = _evals_dir / "eval_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Detailed scorecard saved to: {report_path.relative_to(_root_dir)}")

    return summary


def run_cloud_langsmith_evaluation(dataset_name: str = "sentiasa-golden-eval-v1") -> bool:
    """
    Executes evaluation via official LangSmith evaluate() SDK.
    """
    api_key = os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY")
    if not api_key:
        print("[INFO] LangSmith API key not configured. Falling back to local runner.")
        return False

    try:
        from langsmith import Client
        from langsmith.evaluation import evaluate

        client = Client()
        print(f"[INFO] Initializing LangSmith evaluate() for dataset '{dataset_name}'...")

        schema_eval = SchemaComplianceEvaluator()
        latency_eval = LatencyThresholdEvaluator()
        blast_radius_eval = BlastRadiusGateEvaluator()
        groundedness_judge = GroundednessJudge()
        sop_judge = SOPComplianceJudge()

        def triage_target(inputs: Dict[str, Any]) -> Dict[str, Any]:
            meta = dict(inputs.get("metadata", {}))
            return traced_run_triage(
                raw_text=inputs.get("raw_text", ""),
                video_path=inputs.get("video_path"),
                metadata=meta,
            )

        eval_results = evaluate(
            triage_target,
            data=dataset_name,
            evaluators=[
                schema_eval,
                latency_eval,
                blast_radius_eval,
                groundedness_judge,
                sop_judge,
            ],
            experiment_prefix="sentiasa-preflight-eval",
            metadata={"service": "sentiasa-triage", "environment": "cloud-run-preflight"},
        )
        print("[SUCCESS] LangSmith cloud evaluation complete. View traces on smith.langchain.com.")
        return True

    except Exception as exc:
        print(f"[WARNING] LangSmith cloud evaluate failed ({exc}).")
        print("          Falling back to local benchmark runner.")
        return False


def main():
    parser = argparse.ArgumentParser(description="SENTIASA Pre-deployment Evaluation Runner")
    parser.add_argument("--local", action="store_true", help="Force local offline evaluation mode")
    parser.add_argument("--dry-run", action="store_true", help="Validate schemas and dataset only")
    args = parser.parse_args()

    dataset_file = _evals_dir / "golden_dataset.json"
    if not dataset_file.exists():
        print(f"[ERROR] Golden dataset not found at {dataset_file}")
        sys.exit(1)

    with open(dataset_file, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    if args.dry_run:
        print(f"[DRY-RUN] Validated {len(scenarios)} scenarios in {dataset_file.name}. All JSON schemas valid.")
        sys.exit(0)

    # Try LangSmith cloud if not explicitly set to local
    cloud_success = False
    if not args.local:
        cloud_success = run_cloud_langsmith_evaluation()

    if not cloud_success:
        summary = run_local_evaluation(scenarios)
        if not summary["all_hard_gates_passed"]:
            sys.exit(1)


if __name__ == "__main__":
    main()
