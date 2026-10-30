# OSINT Architecture & Scanning Governance

**Document ID:** `docs/osint_architecture_and_scanning_governance.md`  
**Classification:** Technical Architecture & Operational Governance  
**Author:** Project SENTIASA Core Engineering Team  
**Date:** 2 October 2026  
**Status:** APPROVED SPECIFICATION  

---

## 1. Executive Summary & API Credit Safety Guarantee

A natural concern when deploying to Google Cloud Run with external search APIs (Tavily, Exa) is whether the system is "passively draining credits" through autonomous background loops or continuous web scrapers.

> [!IMPORTANT]
> **Definitive Guarantee:** The live Cloud Run backend is **NOT** actively scanning or consuming Tavily or Exa API credits in the background.
> * Cloud Run is a **serverless, request-driven** container runtime that scales down to zero when idle.
> * There are **no continuous background worker threads, daemons, or unthrottled infinite loops** running in the backend.
> * Tavily and Exa are invoked **strictly on-demand** when an incident is actively submitted for triage.

---

## 2. The Two Operational Modalities of OSINT

SENTIASA cleanly decouples real-time crisis corroboration from ambient open-source environmental scanning:

```
                            SENTIASA OSINT TAXONOMY
                            
   ┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐
   │         MODE 1: EVENT-DRIVEN           │   │         MODE 2: AMBIENT RSS            │
   │      (In-Line Crisis Corroboration)    │   │      (Environmental Surveillance)      │
   ├────────────────────────────────────────┤   ├────────────────────────────────────────┤
   │ • Frequency: On-Demand per Incident    │   │ • Frequency: Every 15 minutes          │
   │ • Trigger: Incident Submission         │   │ • Trigger: Cloud Scheduler / Cron Spec │
   │ • APIs: Tavily (Search) + Exa (Neural) │   │ • APIs: Google News RSS (Public XML)   │
   │ • Credit Impact: 1 Tavily + 1 Exa / run│   │ • Credit Impact: ZERO API CREDITS      │
   │ • Purpose: Corroborate SHACL-ANON-01   │   │ • Purpose: Macro trend discovery       │
   └────────────────────────────────────────┘   └────────────────────────────────────────┘
```

### Modality 1: In-Line Event-Driven Scan (Tavily + Exa)
* **When it runs:** Only when a student, counselor, or whistleblower actively submits a report via:
  1. Whistleblower Web Intake (`/intake`)
  2. WhatsApp Screenshot OCR upload
  3. Counselor Manual Cockpit Submission (`POST /api/triage`)
* **Latency & Execution:** Runs in parallel inside the LangGraph Fan-Out plane ([`backend/graph.py`](../backend/graph.py)) at `osint_discovery_node` concurrently with video keyframe triage and Malay slang normalization ($\approx 1.2\text{s}$ execution time).
* **The Safety Invariant (`SHACL-ANON-01`):**
  Under the Jev Ontology Firewall ([`backend/jev/firewall.py`](../backend/jev/firewall.py)), an anonymous report cannot trigger an emergency physical dispatch (e.g. police or security team alert) without external corroboration. The in-line OSINT scan verifies whether the school or threat pattern is already actively being discussed in student peer communities.

### Modality 2: Ambient RSS Monitoring (Zero-Credit Public XML)
* **Configuration:** Defined in [`data/osint_sources.json`](../data/osint_sources.json#L104-L112) under `open_syndication_feeds`.
* **Feed URL:** Google News National Campus Incident Monitor:
  ```
  https://news.google.com/rss/search?q=(buli+OR+ragging+OR+asrama+OR+mahasiswa+OR+pelajar+OR+gangguan+seksual+OR+cabul)+(malaysia)&hl=ms&gl=MY&ceid=MY:ms
  ```
* **Protocol:** Standard HTTP GET requesting public RSS XML. **This does not hit Tavily or Exa APIs and incurs zero API billing.**
* **Interval:** 15 minutes (`refresh_interval_minutes: 15`). Designed as an adapter specification for Cloud Scheduler / PubSub ingestion workers.

---

## 3. Dual-Funnel Search Architecture: Tavily + Exa

Rather than performing a broad, unconstrained Google search that returns millions of irrelevant global pages, SENTIASA implements a **Dual-Funnel Strategy** targeting specific Malaysian student spaces:

```
                            DUAL-FUNNEL OSINT ENGINE
                            
                                 Incoming Threat
                                (e.g., "Parang SMK")
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
            FUNNEL 1: TAVILY                          FUNNEL 2: EXA
        (Structured Domain Scoping)             (Neural Semantic Search)
                    │                                         │
        • Query: "{topic} Malaysia"               • Query: "Malaysian student
        • Mode: "restrict"                          confession about {topic}..."
        • max_results = 2                         • num_results = 2
        • Target: Scoped Domains                  • Features: 2 Verbatim Highlights
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         ▼
                             URL Deduplication Engine
                                         │
                                         ▼
                             Bi-Temporal Freshness Gate
                               (Max Age: 90 Days)
                                         │
                                         ▼
                             Cytoscape Evidence Nodes
```

### Funnel 1: Tavily (Domain-Scoped Keyword Search)
* **File:** [`backend/nodes/osint_nodes.py`](../backend/nodes/osint_nodes.py#L169-L212) (`search_tavily_osint`)
* **Scoping:** Strictly locked to verified youth discourse domains loaded from [`data/osint_sources.json`](../data/osint_sources.json):
  - **Tier 1 Subreddits:** `r/malaysiauni` (university/hostel ragging), `r/bolehland` (raw youth slang, brawls, hostel fights), `r/malaysia` (national discourse).
  - **Tier 2 Subreddits:** `r/spm` (secondary school despair), `r/malaysians` (peer disputes).
  - **Youth Forums:** Lowyat.NET (`forum.lowyat.net` Kopitiam / Education Essentials).
  - **Regional Crime News:** `hmetro.com.my`, `sinarharian.com.my`, `bernama.com`, `freemalaysiatoday.com`.
* **Consumption:** Exactly **2 search results** per incident (`max_results = 2`).

### Funnel 2: Exa (Neural Semantic Search with Verbatim Highlights)
* **File:** [`backend/nodes/osint_nodes.py`](../backend/nodes/osint_nodes.py#L215-L268) (`search_exa_osint`)
* **Objective:** Uncovers student confessions and colloquial descriptions that don't match formal keywords.
* **Verbatim Highlights:** Exa extracts the 2 most relevant sentences directly from forum posts without needing to crawl or re-parse the full HTML tree:
  ```json
  "contents": {
    "highlights": { "num_sentences": 2, "highlights_per_url": 2 }
  }
  ```
* **Consumption:** Exactly **2 search results** per incident (`num_results = 2`).

---

## 4. Rigorous Credit & Quota Protection Controls

To safeguard API budgets during hackathon demonstrations and live deployments, four independent guardrails are enforced:

### 1. Minimal Result Ceilings
* Both Tavily and Exa are capped at **2 results each** per query.
* A single incident triage consumes exactly:
  $$\text{Incident Cost} = 1\text{ Tavily Search Request} + 1\text{ Exa Search Request}$$
* No recursive search loops or pagination calls are ever executed.

### 2. Bi-Temporal Freshness Gate
* Defined in [`backend/nodes/osint_nodes.py`](../backend/nodes/osint_nodes.py#L143-L166) (`validate_bitemporal_freshness`).
* Rejects or flags any post older than **90 days** (`max_age_days: 90`).
* Prevents stale social media viral posts (e.g., a viral hostel fight video from 2022) from falsely corroborating an active 2026 emergency dispatch.

### 3. Sliding Window Rate Limiter
* Defined in [`backend/main.py`](../backend/main.py#L86-L96) (`SlidingWindowRateLimiter`).
* Implements a thread-safe sliding window capped at **30 requests per 60 seconds per client IP**.
* Protects the backend from denial-of-wallet (DoW) attacks or spam submissions draining search credits.

### 4. Deterministic Mock Mode Fallback
* When running automated test suites (`pytest`), offline demonstrations, or when API keys are absent, `search_dual_funnel_osint` instantly falls back to deterministic fixtures:
  - Returns synthetic `r/malaysiauni` and Lowyat forum evidence without making any network calls.
  - Guarantees 100% test reproducibility with \$0.00 spend.

---

## 5. Direct Thread Extraction (`extract_thread_content_from_url`)

When a whistleblower or counselor pastes a direct link to a suspicious Reddit thread or Lowyat topic:
1. **Primary Strategy (Exa Content Extraction):** Calls `exa.get_contents([url], text=True)` to strip DOM boilerplate, ads, and cookies, extracting clean readable Markdown text.
2. **Fallback Strategy (Tavily Extract):** If Exa fails, falls back to `tavily.extract(urls=[url])`.
3. **Offline Fallback:** If both fail or keys are absent, returns a clean raw URL reference without crashing.

---

## 6. Summary: Operational Rules of Thumb

| Question | Answer |
| :--- | :--- |
| **Is Cloud Run scanning right now?** | **No.** The container is idle/scaled-down until an HTTP request arrives. |
| **How many Tavily credits per report?** | **1 search call** (`max_results=2`). |
| **How many Exa credits per report?** | **1 search call** (`num_results=2`). |
| **How is the RSS feed billed?** | **$0.00 (Free)**. Public Google News RSS XML via standard HTTP GET. |
| **Can spam drain credits?** | **No.** Capped by IP rate limiter (30 req/min) and single-pass LangGraph fan-out. |
