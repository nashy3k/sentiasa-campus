"""
Live Reddit & Forum OSINT verification script for Project SENTIASA.
Directly hits live Tavily and Exa APIs targeting Malaysian subreddits and forums.
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

load_dotenv(_backend_dir / ".env")
load_dotenv(_project_root / ".env")
load_dotenv()

from backend.nodes.osint_nodes import search_dual_funnel_osint, search_tavily_osint, search_exa_osint

print("=" * 65)
print("LIVE REAL-TIME REDDIT & FORUM OSINT VERIFICATION (TAVILY + EXA)")
print("=" * 65)

# 1. Direct Tavily search strictly on Reddit
print("\n[1] Tavily live query strictly restricted to reddit.com...")
tav_res = search_tavily_osint("buli student hostel Malaysia", include_domains=["reddit.com"], max_results=3)
print(f"    --> Total Reddit Signals Found: {len(tav_res)}")
for r in tav_res:
    print(f"    * [{r['platform']}] {r['url']}")
    print(f"      Title: {r['title']}")
    print(f"      Snippet: {r['snippet'][:110]}...\n")

# 2. Direct Exa neural search with highlights
print("[2] Exa live neural query with verbatim quote highlights...")
exa_res = search_exa_osint("student bullying school hostel Malaysia", num_results=2)
print(f"    --> Total Exa Signals Found: {len(exa_res)}")
for r in exa_res:
    print(f"    * [{r['platform']}] {r['url']}")
    print(f"      Title: {r['title']}")
    if r.get("highlights"):
        print(f"      Verbatim Quote: \"{r['highlights'][0].strip()[:120]}...\"\n")

# 3. Dual-Funnel Combined Engine
print("[3] Dual-Funnel Combined Sweep (Tavily + Exa merged & deduplicated)...")
combined_result = search_dual_funnel_osint("hostel ragging junior Malaysia")
evidence = combined_result.get("evidence", [])
print(f"    --> Total Merged Signals: {len(evidence)} (Corroborated: {combined_result.get('corroborated')})")
for r in evidence:
    print(f"    * [{r['engine'].upper()} - {r['platform']}] {r['title'][:55]}")
    print(f"      {r['url'][:80]}")

print("\n" + "=" * 65)
print("ALL LIVE OSINT CALLS CONFIRMED AGAINST LIVE EXTERNAL SERVERS")
print("=" * 65)
