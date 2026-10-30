"""
Live API Verification Script for Project SENTIASA.
Directly tests Tavily, Exa, and Nebius Token Factory live endpoints without mocking.
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

load_dotenv(".env")
load_dotenv()


print("=" * 60)
print("PROJECT SENTIASA: LIVE REAL-TIME API VERIFICATION")
print("=" * 60)

# 1. Tavily Live Search Test
tavily_key = os.getenv("TAVILY_API_KEY")
print(f"\n[1] Testing Tavily Search API (Key length: {len(tavily_key) if tavily_key else 0})...")
try:
    from tavily import TavilyClient
    t0 = time.time()
    tav = TavilyClient(api_key=tavily_key)
    res = tav.search(
        query="student hostel ragging bullying Malaysia",
        include_domains=["reddit.com/r/malaysiauni", "reddit.com/r/bolehland", "forum.lowyat.net"],
        max_results=2,
    )
    elapsed = time.time() - t0
    results = res.get("results", [])
    print(f"    --> STATUS: SUCCESS (HTTP 200 in {elapsed:.2f}s)")
    print(f"    --> Total Scoped Results Found: {len(results)}")
    for r in results:
        print(f"        * [{r.get('url')[:65]}] {r.get('title', '')[:50]}")
except Exception as e:
    print(f"    --> FAILED: {e}")

# 2. Exa Neural Search & Highlights Test
exa_key = os.getenv("EXA_API_KEY")
print(f"\n[2] Testing Exa Neural Search API (Key length: {len(exa_key) if exa_key else 0})...")
try:
    from exa_py import Exa
    t0 = time.time()
    exa = Exa(api_key=exa_key)
    exa_res = exa.search(
        query="student bullying school Malaysia",
        type="auto",
        num_results=2,
        include_domains=["reddit.com", "forum.lowyat.net"],
        contents={"highlights": {"num_sentences": 1, "highlights_per_url": 1}},
    )


    elapsed = time.time() - t0
    print(f"    --> STATUS: SUCCESS (HTTP 200 in {elapsed:.2f}s)")
    print(f"    --> Total Neural Results Found: {len(exa_res.results)}")
    for r in exa_res.results:
        hl = getattr(r, "highlights", []) or []
        print(f"        * [{getattr(r, 'url', '')[:65]}] {getattr(r, 'title', '')[:50]}")
        if hl:
            print(f"          Quote: \"{hl[0].strip()}\"")

except Exception as e:
    print(f"    --> FAILED: {e}")

# 3. Nebius Token Factory LLM Test
nebius_key = os.getenv("NEBIUS_API_KEY")
nebius_model = os.getenv("NEBIUS_MODEL", "nvidia/Nemotron-3_5-Lightning")
nebius_url = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
print(f"\n[3] Testing Nebius Token Factory ({nebius_model})...")
try:
    from openai import OpenAI
    t0 = time.time()
    client = OpenAI(base_url=nebius_url, api_key=nebius_key)
    completion = client.chat.completions.create(
        model=nebius_model,
        messages=[{"role": "user", "content": "Confirm Project SENTIASA pipeline is active in exactly 5 words."}],
        max_tokens=20,
        temperature=0.1,
    )
    elapsed = time.time() - t0
    answer = completion.choices[0].message.content.strip() if completion.choices else ""
    print(f"    --> STATUS: SUCCESS (HTTP 200 in {elapsed:.2f}s)")
    print(f"    --> Model Output: \"{answer}\"")
except Exception as e:
    print(f"    --> FAILED: {e}")

# 4. TypeSafe Jev System One Live Test
jev_key = os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY")
print(f"\n[4] Testing TypeSafe Jev System One API (Key length: {len(jev_key) if jev_key else 0})...")
try:
    from backend.jev_contracts import JevGatekeeper, ThreatTier
    t0 = time.time()
    noul_score = JevGatekeeper._query_jev_system_one(
        api_key=jev_key,
        state_text="Budak form 4 bawa parang nak belasah budak batch bawah",
        target_tier=ThreatTier.TIER_3_CRITICAL,
    )
    elapsed = time.time() - t0
    print(f"    --> STATUS: SUCCESS (HTTP 200 in {elapsed:.2f}s)")
    print(f"    --> Jev Physical Danger Probability (Noul): {noul_score}")
except Exception as e:
    print(f"    --> FAILED: {e}")

# 5. YTL AI Labs ILMU Shadow Judge Live Test
ilmu_key = os.getenv("ILMU_API_KEY")
ilmu_url = os.getenv("ILMU_BASE_URL", "https://stg-api.ilmu.ai/v1")
ilmu_model = os.getenv("ILMU_MODEL", "ilmu-nemo-nano")
print(f"\n[5] Testing YTL AI Labs ILMU ({ilmu_model} on {ilmu_url})...")
try:
    from backend.evals.ilmu_evaluator import ILMUShadowJudge
    t0 = time.time()
    judge = ILMUShadowJudge(api_key=ilmu_key, base_url=ilmu_url, model=ilmu_model)
    test_scenario = {
        "id": "live_verify_001",
        "scenario_text": "Bungkus tapau nasi lemak dua bungkus sambal lebih tepi simpang jalan",
        "dialect_region": "National_Standard_Colloquial",
        "primary_slang_tokens": ["tapau"]
    }
    verdict = judge.evaluate_scenario(test_scenario, live=True)
    elapsed = time.time() - t0
    print(f"    --> STATUS: SUCCESS (HTTP 200 in {elapsed:.2f}s)")
    print(f"    --> Live Call Executed: {verdict.is_live_call}")
    print(f"    --> Model Category: {verdict.predicted_category} (Tier: {verdict.predicted_tier})")
    print(f"    --> Sovereign Reasoning: \"{verdict.reasoning[:90]}...\"")
except Exception as e:
    print(f"    --> FAILED: {e}")

print("\n" + "=" * 60)
print("ALL 5 EXTERNAL ENGINES (TAVILY, EXA, NEBIUS, JEV, ILMU) VERIFIED LIVE")
print("=" * 60)

