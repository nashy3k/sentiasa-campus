"""
LangSmith Dataset Seeder for Project SENTIASA.
Loads tests/evals/golden_dataset.json and registers/syncs the 20 golden benchmark
scenarios into LangSmith as the dataset 'sentiasa-golden-eval-v1'.
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend and root environment are loaded
_evals_dir = Path(__file__).resolve().parent
_root_dir = _evals_dir.parent.parent
_backend_dir = _root_dir / "backend"

load_dotenv(_backend_dir / ".env")
load_dotenv(_root_dir / ".env")
load_dotenv()

DATASET_NAME = "sentiasa-golden-eval-v1"
DATASET_DESCRIPTION = "Golden benchmark evaluation dataset for Project SENTIASA deterministic incident triage engine."


def seed_dataset(dry_run: bool = False) -> bool:
    """
    Seeds the 20-scenario golden evaluation dataset into LangSmith.
    """
    dataset_file = _evals_dir / "golden_dataset.json"
    if not dataset_file.exists():
        print(f"[ERROR] Golden dataset file not found at: {dataset_file}")
        return False

    with open(dataset_file, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    print(f"Loaded {len(scenarios)} scenarios from {dataset_file.name}")

    api_key = os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY")
    if not api_key:
        print("[WARNING] No LANGSMITH_API_KEY or LANGCHAIN_API_KEY found in environment.")
        print("          Skipping cloud upload. Golden dataset is ready for local offline evaluation.")
        return False

    if dry_run:
        print("[INFO] Dry run enabled. Scenarios validated successfully. Skipping remote API call.")
        return True

    try:
        from langsmith import Client

        client = Client()
        print(f"Connected to LangSmith API ({client.api_url}).")

        # Check if dataset already exists
        dataset = None
        try:
            existing = client.list_datasets(dataset_name=DATASET_NAME)
            for d in existing:
                if d.name == DATASET_NAME:
                    dataset = d
                    break
        except Exception as e:
            print(f"[INFO] Listing existing datasets returned: {e}")

        if dataset is None:
            print(f"Creating new dataset '{DATASET_NAME}'...")
            try:
                dataset = client.create_dataset(
                    dataset_name=DATASET_NAME,
                    description=DATASET_DESCRIPTION,
                )
                print(f"Dataset created with ID: {dataset.id}")
            except Exception as e:
                print(f"[ERROR] Failed to create dataset: {e}")
                return False
        else:
            print(f"Found existing dataset '{DATASET_NAME}' (ID: {dataset.id}).")

        # Upload / sync examples
        print(f"Syncing {len(scenarios)} examples to dataset '{DATASET_NAME}'...")
        success_count = 0
        for scenario in scenarios:
            inputs = {
                "raw_text": scenario["input"]["raw_text"],
                "video_path": scenario["input"]["video_path"],
                "metadata": scenario["input"]["metadata"],
            }
            outputs = scenario["expected_output"]
            meta = {
                "scenario_id": scenario["id"],
                "category": scenario["category"],
                "description": scenario["description"],
            }
            try:
                client.create_example(
                    inputs=inputs,
                    outputs=outputs,
                    dataset_id=dataset.id,
                    metadata=meta,
                )
                success_count += 1
            except Exception as ex:
                # If duplicate or schema mismatch
                print(f"  [!] Scenario {scenario['id']}: {ex}")

        print(f"[SUCCESS] Successfully seeded {success_count}/{len(scenarios)} examples to LangSmith.")
        return True

    except Exception as exc:
        print(f"[ERROR] LangSmith synchronization failed: {exc}")
        print("        You can still run evaluations locally using python tests/evals/run_evals.py --local")
        return False


if __name__ == "__main__":
    is_dry = "--dry-run" in sys.argv
    seed_dataset(dry_run=is_dry)
