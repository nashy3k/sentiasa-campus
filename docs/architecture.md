# Project SENTIASA: Master System Architecture & Technical Specification

> **Sentinel for Intelligent Assessment & Safety (SENTIASA)**  
> *Deterministic Multi-Modal Threat Triage, Social Grounding & Knowledge Graph Intelligence for Malaysian Campus Safety*  
> **Target:** Nebius × NVIDIA Global AI Hackathon (Tracks: Best Apps & Agents / Best Use of Tavily / Local City Track)  
> **Repository Ground Truth Specification:** `architecture.md` (Project Root)  
> **Core Architectural Ground Truth:** See [`./nvidia_nemotron_model_stable_ground_truth.md`](./nvidia_nemotron_model_stable_ground_truth.md) for the authoritative 4-tier model routing and Nebius Token Factory deployment catalog.  
> **Multimodal Vision & VLM Benchmarks:** See [`./vlm_benchmark_report.md`](./vlm_benchmark_report.md) for the empirical kinematics evaluation of `nvidia/Nemotron-3.5-Super-VL` vs `openbmb/MiniCPM-V-4_5` on 20% letterbox masked keyframes.  
> **OSINT & Search Scanning Governance:** See [`./osint_architecture_and_scanning_governance.md`](./osint_architecture_and_scanning_governance.md) for bi-temporal freshness (<90 days), Tavily/Exa domain boundaries, and API rate limiter controls.  
> **Sovereign GEOINT & JKR-BIM Blueprint Plane:** See [`./geoint_and_bim_spatial_architecture_rfc.md`](./geoint_and_bim_spatial_architecture_rfc.md) for Ray-Casting PIP containment, camera FOV circular wedge triangulation, and RFC 7946 GeoJSON institutional specifications.

---

## 1. Executive Summary & Core Engineering Philosophy

SENTIASA operates under a strict, non-negotiable zero-trust principle:  
> **"Grounding is not enforcement. Semantic correctness is not execution authority."**

Large language models (even 70B+ parameter frontier models) are fundamentally probabilistic reasoning engines. In safety-critical campus operations, an LLM must **never** be granted autonomous authority to escalate emergency threat levels, dispatch on-campus security, or mutate situational ledgers without deterministic verification.

SENTIASA decouples **LLM Perception & Reasoning** from **Execution Authority** by implementing a 5-layer pipeline:
1. **Push & Pull Dual-Funnel Ingest:** Push-based encrypted whistleblower text and WhatsApp OCR intake paired with pull-based targeted social OSINT (Reddit, Lowyat forum, Google News RSS).
2. **Fan-Out / Join Sensory Fusion Plane:** Parallel concurrent execution of video peak-motion keyframe reasoning, vernacular slang dialect normalization, and targeted OSINT discovery, synchronized at a zero-LLM deterministic join barrier before ontology synthesis.
3. **Dual-Layer Jev Safety Firewall & Blast Radius Governance:** Deterministic Palantir SHACL invariant verification (Layer 1) enforcing `SHACL-GOV-01`, `SHACL-SPATIAL-01` (preventing internal lockouts for out-of-campus signals), and `SHACL-BIM-01` (preventing dismissal of curfew hostel incidents) paired with live TypeSafe Jev System One semantic danger probability scoring (Layer 2).
4. **State Machine Dispatch & HITL Lane:** Strict Finite State Machine (FSM) tier escalation following "Model Proposes $\to$ Code Validates $\to$ Approval Gate" with an automated fail-closed Human-in-the-Loop (HITL) review queue.
5. **Ontology Graph Canvas & Situational Ledger (Headless 24/7 Reasoner vs. Client-Side Renderer):** 
   - **Headless Semantic Reasoning (No Neo4j Required):** The backend executes 24/7 autonomous threat correlation, Sovereign GEOINT PIP containment, SHACL invariant enforcement, and Twilio SMS crisis dispatch via headless Python LangGraph state DAGs without any browser or heavyweight graph database (like Neo4j) required.
   - **Client-Side Spatial Projection:** Cytoscape.js on the frontend operates strictly as an interactive HUD, executing force-directed layout physics locally on the user's GPU (< 30ms) without burning server CPU. State persists atomically in serverless Google Cloud Firestore.
6. **Sovereign GEOINT & JKR-BIM Spatial Intelligence Plane:** Sub-millisecond Ray-Casting PIP containment, camera FOV circular wedge triangulation, dynamic hostel curfew multipliers (2.2x), and RFC 7946 GeoJSON export calibrated for Malaysian institutional blueprints (e.g. SMK Seksyen 11 Shah Alam and SMK Seksyen 9 Shah Alam).

```mermaid
flowchart TD
    subgraph INGEST_PLANE ["Multi-Modal Sensory Intake"]
        UI_TEXT["Whistleblower Report - /api/triage"]
        UI_IMG["WhatsApp Screenshot - /upload-screenshot"]
        VLM_OCR["Nebius MiniCPM-V-4_5 - Chat OCR"]
        CCTV_IN["CCTV / Phone Video - .mp4"]
        VSS_SAMP["RTX OpenCV MotionKeyframeSampler - 3-5 Peak Motion Frames"]
        
        UI_IMG --> VLM_OCR
        CCTV_IN --> VSS_SAMP
    end

    subgraph FAN_OUT ["Graph Concurrency: Fan-Out Plane"]
        VSS_NODE["video_triage_node - nvidia/Nemotron-3.5-Super-VL & MiniCPM-V-4_5"]
        SLANG_NODE["normalize_slang_node - nvidia/Nemotron-3_5-Lightning & Nano-30B-A3B"]
        OSINT_NODE["osint_discovery_node - Dual-Funnel Tavily Restrict & Exa Quotes"]
        
        VSS_SAMP --> VSS_NODE
        UI_TEXT & VLM_OCR --> SLANG_NODE
        SLANG_NODE -.->|Extracted Context| OSINT_NODE
    end

    subgraph JOIN_BARRIER ["Deterministic Synchronization Barrier"]
        JOIN["sensory_fusion_join_node - Zero-LLM Pydantic Barrier: FusedSensoryPayload"]
        VSS_NODE & SLANG_NODE & OSINT_NODE --> JOIN
    end

    subgraph REASONING ["Cognitive Plane: Model Proposes & Shadow Evaluator"]
        NEMO["extract_ontology_node - Nebius Nemotron-3_5-Lightning & Super-120B-A12B"]
        ILMU_EVAL["ytl_ilmu_evaluator - YTL ILMU ilmu-nemo-nano & LangSmith Evals - 98% Fidelity"]
        JOIN --> NEMO
        NEMO -.->|Async Shadow Audit| ILMU_EVAL
    end

    subgraph SAFETY_PLANE ["Safety Plane: Code Validates - Jev Ontology Firewall"]
        FIREWALL["JevOntologyFirewall - SHACL-GOV-01 / FSM-01 / TEMP-01 / SEM-01"]
        SYS_ONE["TypeSafe Jev System One Reflex - noul danger >= 0.45"]
        
        NEMO --> FIREWALL
        FIREWALL <--> SYS_ONE
    end

    subgraph ROUTING ["Approval Gate & Blast Radius Governance"]
        GATE{"Firewall Verdict & Action Type?"}
        FIREWALL --> GATE
        
        VETO["VETOED / CRITICAL WRITE ACTION - SHACL-GOV-01 Enforced"]
        PASS["ALLOWED / READ-ONLY INFORMATIONAL - Tier 1-2 Logging"]
        
        GATE -->|Violation OR Critical Dispatch Action| VETO
        GATE -->|Informational / Benign Verified| PASS
        
        HITL["Counselor HITL Approval Gate - /api/hitl/queue"]
        VETO --> HITL
    end

    subgraph PRESENTATION ["Execution & Situational Persistence"]
        CYTO["Cytoscape.js Ontology Canvas - WebGL GPU Batch Diff"]
        DISPATCH["Counselor Security Alert Dispatch - P1 Webhook & Intervention"]
        FIRESTORE[("Serverless Cloud Firestore - /incidents, /hitl_queue, /audit_log")]
        AUDIT["Evidence Act Sec 90A Forensic Ledger"]
        
        PASS --> CYTO & FIRESTORE & AUDIT
        HITL -->|Counselor Approves Escalation| DISPATCH & CYTO & FIRESTORE
        HITL -->|Dismissed as False Alarm| AUDIT & FIRESTORE
    end

    classDef primary fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef gatekeeper fill:#31102b,stroke:#f43f5e,stroke-width:2px,color:#fecdd3;
    classDef verified fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#d1fae5;
    classDef queue fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fef3c7;

    class NEMO,VLM_OCR,VSS_NODE,OSINT_NODE,JOIN,ILMU_EVAL primary;
    class FIREWALL,SYS_ONE,GATE gatekeeper;
    class PASS,CYTO,DISPATCH,FIRESTORE verified;
    class HITL,VETO queue;
```

---

## 2. The 5-Layer Architectural Stack

### Layer 1: Multi-Modal Dual-Funnel Ingest

Modern campus discourse is bifurcated: **private acute crises** (bullying videos, extortion threats) circulate in walled gardens (WhatsApp, Telegram), while **ambient student sentiment, post-incident chatter, and systemic complaints** circulate in public forums (Reddit, Lowyat). SENTIASA merges both:

1. **Funnel 1 — Direct Push Ingestion (Dual-Role Vision & Multimodal Intake):**
   - *Architectural Reference:* See [[`./vlm_benchmark_report.md`](./vlm_benchmark_report.md)](./vlm_benchmark_report.md) for full VSS/Cosmos specification.
   - **Text Intake (`POST /api/triage`):** Unstructured student reports, slang confessions, or WhatsApp copy-pastes.
   - **Role 1 — Document & Chat OCR (`POST /api/triage/upload-screenshot`):**
     - Primary engine: `openbmb/MiniCPM-V-4_5` hosted on **Nebius Token Factory**, parsing chat timestamps, sender bubbles, and conversational flow into `normalize_slang_node`.
     - Fallback engine: Local PIL pre-processor with regex heuristics for offline or bandwidth-constrained environments.
   - **Role 2 — Spatio-Temporal Physical Scene Reasoner (CCTV & Video Clips):**
     - Primary engine: `nvidia/Cosmos3-Super-Reasoner` (or VLM fallback) via Nebius Token Factory.
     - Ingests 3–5 motion keyframes sampled via local OpenCV (`cv2`) on RTX 4070 Ti from uploaded campus CCTV or phone video clips (`.mp4`).
     - Emits strict `VisualEvidenceReport`: detects *parang*, blunt weapons, cornering, scuffles, and **sexual misconduct & hazing** (forced stripping / *bogel*, unclothed victims, non-consensual sexual contact, bathroom/dorm voyeurism).
     - Automatically triggers **`SHACL-EMERGENCY-BYPASS-01`** directly to **Threat Tier: CRITICAL** when weapons or sexual misconduct are visually detected with confidence $\ge 0.90$.
     - Audio track extracted via `ffmpeg` into Speech-to-Text and routed to `normalize_slang_node`.
     - **Probe-and-Demand Tiered Retrieval (Forward-Only Edge Recording):** Edge sampler captures a **2-second acute kinetic probe** (~500KB) and transmits it to `POST /api/triage/upload-video`. If a Tier 4/5 threat is verified, the backend sends a downstream directive (`requires_extended_archive: true`, `action_disposition: "FETCH_FULL_ARCHIVE"`), prompting the edge to upload the forward 15s recording window to `POST /api/triage/upload-extended-archive`. Completely eliminates edge pre-roll RAM exhaustion ($1.55\text{ GB} \to 0\text{ MB}$) and SD card wear.
   - **Forensic Ingest Provenance (Evidence Act 1950 Sec 90A):**
     - Cryptographic SHA-256 hash of original raw screenshot/payload before any parsing.
     - Salted SHA-256 client IP hash for anti-swatting / anti-DDoS detection while preserving minor PDPA privacy.
     - Client device metadata capture (`user_agent`, `channel`: `WHATSAPP_UPLOAD`, `CCTV_INGEST`, `WEB_PORTAL`, `OSINT_SWEEP`).
2. **Funnel 2 — Pull-Based Social Grounding (Tavily + Exa Engine):**
   - *Architectural & Governance Specification:* Detailed operational taxonomy, scan frequencies, and API budget guarantees are codified in [`docs/osint_architecture_and_scanning_governance.md`](./osint_architecture_and_scanning_governance.md).
   - **Centralized Source Registry (`data/osint_sources.json`):** Externalized configuration governing active subreddits, forums, and regional press feeds.
   - **Tavily Scoped Search:** Domain-scoped search strictly covering verified Malaysian student nodes (`reddit.com/r/malaysiauni`, `reddit.com/r/bolehland`, `reddit.com/r/malaysia`, `reddit.com/r/spm`, `reddit.com/r/malaysians`) using `include_domains_mode="restrict"` to enforce zero-leakage perimeter isolation.
   - **Exa Neural Search with Highlights:** Semantic conversational queries with `type="auto"` pulling verbatim quote highlights directly from `forum.lowyat.net` (Kopitiam / Education Essentials) for zero-hallucination ground truth extraction.
   - **Direct URL Thread Extraction:** Endpoint `POST /api/osint/extract-url` accepts raw Reddit or Lowyat thread URLs, strips DOM boilerplate, and feeds clean markdown text into the state engine.
   - **Bi-Temporal Freshness Gate:** Compares extracted publication dates with incident timestamps. Items older than 90 days are flagged as `is_fresh=False`, preventing historical rumors (e.g. from 2021) from triggering active Tier 3 alarms.

---

### Layer 2: Pan-Vernacular Semantic Triage & LLM Extraction (Nebius Token Factory)

SENTIASA decouples lexical slang disambiguation from deep semantic risk evaluation via a 4-tier decoupled reasoning plane (moving beyond the brittle 14-word keyword heuristic):

1. **Fast-Path Slang Normalizer (`normalize_slang_node`):**
   - Traverses regional lexicons across Peninsular, Borneo, and Vernacular idioms:
     - **Peninsular Core:** `koyak` (+1 distress), `tapau` (polysemous: food vs assault), `belasah` (+3 violence), `tibai`/`tumbuk`/`terajang` (+2 to +3 battery), `parang` (+4 weapon), `pau`/`sakau` (+2 extortion), `ugut` (+2 blackmail), `bunuh diri` (Severity 5, Tier 3).
     - **Sexual Violence & Child Exploitation (Child Act 2001 / Act 792 / KPM):** `rogol` (Severity 5, Tier 3 rape), `cabul` (Severity 5 molestation), `raba` (Severity 4 groping), `skodeng` (Severity 3 voyeurism in bathrooms/hostels), `bogel` / `paksa bogel` (Severity 5 forced stripping / sextortion), `liwat` / `perkosa` (Severity 5).
     - **Borneo Cohort (Sabah & Sarawak):** `antam` (+3 battery), `paloi` (bullying target/fool), `bikin panas` (+1 provocation), `pukul sampai patah` (Tier 3).
     - **SJKC / Chinese Idioms:** 砍人 / 砍 (*kan ren* - slash), 巴冷刀 (*ba leng dao* - parang), 收保护费 (*bao hu fei* - extortion), 围殴 (*wei ou* - gang brawl), 强奸 (*qiang jian* - rape), 非礼 (*fei li* - sexual molestation), 偷拍 (*tou pai* - bathroom voyeurism).
     - **SJKT / Tamil Idioms:** கத்தி (*kathi* - knife), மிரட்டல் (*mirattal* - extortion), தாக்குதல் (*thakkuthal* - assault), கற்பழிப்பு (*rape*), பாலியல் துன்புறுத்தல் (*sexual violence/abuse*), பாலியல் தொல்லை (*sexual harassment*).
     - **Jawi Script Equivalents:** `ڤارڠ` (*parang*), `بلاساه` (*belasah*), `اوݢوت` (*ugut*), `بونوه ديري` (*bunuh diri*), `روݢول` (*rogol*), `چابول` (*cabul*), `راب` (*raba*), `سکوديڠ` (*skodeng*).
   - Solves contextual polysemy (*tapau nasi lemak* $\to$ LOW vs *tapau budak* $\to$ ELEVATED) before LLM prompt assembly.

2. **Decoupled Multilingual Semantic Reasoner (`extract_ontology_node`):**
   - **Model:** `nvidia/Nemotron-3_5-Lightning` (or `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`) via Nebius Token Factory.
   - **Decoupled Fallback Principle:** If a report contains zero slang keywords (e.g. written in formal English, standard formal Malay, or non-Roman scripts), the pipeline does NOT default down to Tier 1. Instead, Nemotron evaluates the semantic situation and extracts true severity (1–5) and threat tier directly from the contextual meaning.
   - **Typed Entity Transformation:** Transforms unstructured narratives into typed Palantir domain entities:
     - `SchoolNode`: Campus identifier, name, and administrative district.
     - `PersonaNode`: Identified student handles, roles (`Target`, `Instigator`, `Bystander`, `Reporter`).
     - `ThreatEventNode`: Incident classification, severity (1–5), confidence score, context summary.
     - `RelationalTriple`: Hyperedges connecting entities (`REPORTS_THREAT`, `LOCATED_AT`, `COMMUNICATES_THREAT`).

3. **YTL AI Labs ILMU Benchmark & Shadow Judge (`stg-api.ilmu.ai`):**
   - **Model:** `ilmu-nemo-nano` (YTL AI Labs, fine-tuned sovereign Nemotron derivative on NVIDIA DGX Grace Blackwell, Kulai, Johor).
   - **Role:** Dedicated Shadow Judge Agent (`ytl_ilmu_evaluator`) continuously comparing dialect nuance preservation against global frontier models.

4. **Polemic Adversarial Cohort Adapter (`/v1/chat/completions`):**
   - **Protocol:** Hardened OpenAI-compatible Chat Completions endpoint for black-box adversarial testing.
   - **Security Controls:** Constant-time Bearer authentication (`secrets.compare_digest`), zero message logging (preserves `X-Polemic-Conversation-Id` only), deterministic safe refusal for prompt injections, and canary token stripping (`_sanitize_agent_output`).


---

### Layer 3: Dual-Layer Jev Safety Firewall & Gatekeeper

SENTIASA implements Jev as an active two-layer firewall:

#### Layer 1: Deterministic Palantir SHACL Invariant Engine
Implemented in `backend/jev/firewall.py` (Unified Gatekeeper). Evaluates mathematical tripwires and blast-radius governance before any state mutation:
1. **Restricted Autonomous Actions Gate (`SHACL-GOV-01`):**
   $$\text{If } \text{Action} \in \{\text{TRIGGER\_CAMPUS\_DISPATCH}, \text{BROADCAST\_CAMPUS\_ALERT}, \text{TIER\_3\_CRITICAL}\} \implies \text{ROUTE TO HITL QUEUE}$$
   Strict blast-radius containment: Autonomous agent execution of high-risk write actions is strictly forbidden. The model proposes, the code validates, and the human counselor approves before physical or alert dispatch.
2. **Bi-Temporal Freshness Invariant (`SHACL-TEMP-01` & `02`):**
   $$\Delta t = t_{\text{ingest}} - t_{\text{event}}$$
   $$\text{If } \Delta t < -30\text{s (future clock skew)} \lor \Delta t > 1800\text{s (stale signal)} \implies \text{VETO}$$
3. **Finite State Machine Monotonicity (`SHACL-STATE-01`):**
   $$\text{Transition } S_{\text{current}} \to S_{\text{target}} \in \text{ALLOWED\_TIER\_STEP}$$
   Illegal jumps (e.g. `TIER_1_INFO` directly to `TIER_4_CRITICAL` without passing through intermediate tiers) are intercepted and vetoed to the HITL queue.
4. **Slang Ambiguity Tripwire (`SHACL-SEM-01`):**
   $$\text{If } \text{TargetTier} \ge \text{ELEVATED} \land \text{AmbiguityScore} > 0.20 \implies \text{VETO}$$
   High semantic polysemy requires explicit human disambiguation before escalation.
5. **Anonymous Reporter Attenuation (`SHACL-ANON-01`):**
   Unverified anonymous whistleblower submissions cannot unilaterally trigger critical campus security dispatches without external OSINT/Tavily corroboration or human verification.
6. **Relational Graph Grounding (`SHACL-GRAPH-01`):**
   Requires the actor and target entities in the proposed contract to be topologically grounded within the active Cytoscape graph nodes.
7. **Visual Threat Emergency Bypass (`SHACL-EMERGENCY-BYPASS-01`):**
   $$(\text{has\_threat\_object} = \text{True} \lor \text{visual\_severity\_tier} \ge 4) \land C_{\text{visual}} \ge 0.90 \implies \text{ALLOW JUMP TO TIER 3 (HITL VERIFICATION)}$$
   Verified visual detection of lethal edged weapons (*parang*), firearms, or active physical battery provides an authorized exception to monotonicity, advancing the contract immediately to the critical HITL queue for expedited one-click counselor dispatch. Detailed in [[`./vlm_benchmark_report.md`](./vlm_benchmark_report.md)](./vlm_benchmark_report.md).

#### Layer 2: Live TypeSafe Jev System One Reflex & 4-Point Probability Telemetry
Implemented in `backend/jev_contracts.py` (`query_jev_multidimensional_telemetry` and `query_jev_polysemy`):
- **Live REST Endpoint:** `POST https://api.typesafe.ai/v1/systemone`
- **Model:** `jev-1.13.0` (`jev-latest`)
- **Latency Profile:** Sub-40ms execution (**38.4ms** p50 in empirical testing), returning strict mathematical certainty decimals rather than conversational markdown.
- **Canonical 4-Point Probability Telemetry:**
  Queries four simultaneous atomic `noul` danger dimensions returning bounded float probabilities $[0.0, 1.0]$:
  1. `imminent_violence`: Evaluates whether the narrative depicts an imminent physical fight, violent battery, assault, or active altercation.
  2. `weapon_threat`: Evaluates whether the incident involves or threatens the use of weapons (*parang*, knife, blade, iron pipe, knuckleduster).
  3. `extortion_coercion`: Evaluates forced monetary siphoning, blackmail, lunch money extortion (*pau duit*), or systemic coercion.
  4. `victim_distress`: Evaluates acute psychological breakdown, trauma, tears, or suicidal ideation (*koyak parah*, *nak bunuh diri*).

  ```json
  {
    "state": "Budak form 4 bawa parang nak belasah budak batch bawah",
    "model": "jev-latest",
    "questions": {
      "imminent_violence": {
        "type": "noul",
        "instructions": "Does this text indicate an imminent physical fight, violent battery, assault, or physical altercation?"
      },
      "weapon_threat": {
        "type": "noul",
        "instructions": "Does this context involve or threaten the use of a weapon (such as a parang, machete, knife, blade, iron rod, or knuckleduster)?"
      },
      "extortion_coercion": {
        "type": "noul",
        "instructions": "Does this context describe extortion, blackmail, forced monetary payment, siphoning cash, or coercion?"
      },
      "victim_distress": {
        "type": "noul",
        "instructions": "Does this context indicate acute victim distress, emotional breakdown, fear, crying, trauma, or suicidal distress?"
      }
    }
  }
  ```

- **Polysemy Disambiguation Engine (`disambiguate_slang_polysemy`):**
  Malaysian campus discourse is rife with double-entendre polysemous slang terms. Jev disambiguates semantic polarity before prompt assembly:
  - `tapau`: Takeaway food (*"bungkus tapau nasi lemak"* $\to$ `is_threat=False`, Severity 1, Tier 1 LOW) vs. violent assault (*"budak hostel tapau budak form 2"* $\to$ `is_threat=True`, Severity 4, Tier 2 ELEVATED, +2 severity boost).
  - `pau`: Steamed bun (*"beli pau ayam sedap"* $\to$ `is_threat=False`, Tier 1 LOW) vs. monetary extortion (*"senior pau duit belanja budak"* $\to$ `is_threat=True`, Severity 3, Tier 2 ELEVATED).
  - `koyak`: Torn material (*"kertas nota terkoyak"* $\to$ `is_threat=False`, Tier 1 LOW) vs. acute psychological breakdown / suicidal distress (*"koyak parah kena kecam"* $\to$ `is_threat=True`, Severity 4, Tier 3 CRITICAL).
- **Veto Condition:** If Jev evaluates physical danger probability $< 0.45$ for a proposed Tier 3 escalation, the action is vetoed with reason `JEV_SEMANTIC_DISCREPANCY` and routed to human counselors.
- **Deterministic Offline Fallback:** If the external API times out or network connectivity is severed, `_deterministic_offline_telemetry` provides mathematically grounded keyword and dialect heuristics within $< 2\text{ms}$, ensuring zero offline failure modes in local testing and air-gapped campus deployments.

---

### Layer 4: State Machine Routing & HITL Review Lane

```mermaid
stateDiagram-v2
    [*] --> TIER_1_LOW: Ingest & Normalization
    
    TIER_1_LOW --> TIER_2_ELEVATED: Corroborated extortion / Repeated harassment
    TIER_1_LOW --> HITL_REVIEW: Attempted jump to Tier 3 (VETO: FSM_ILLEGAL_STATE_JUMP)
    
    TIER_2_ELEVATED --> TIER_3_CRITICAL: Imminent violence + Jev Approval (Confidence >= 0.88)
    TIER_2_ELEVATED --> TIER_1_LOW: De-escalation / False alarm
    
    TIER_3_CRITICAL --> TIER_2_ELEVATED: Managed de-escalation by authorities
    TIER_3_CRITICAL --> [*]: Resolved & Archived to Evidence Vault

    state HITL_REVIEW {
        [*] --> PENDING_HUMAN_TRIAGE
        PENDING_HUMAN_TRIAGE --> APPROVED_ESCALATION: Counselor Overrides & Approves
        PENDING_HUMAN_TRIAGE --> DISMISSED_FALSE_ALARM: Counselor Vetoes & Archives
    }
```

* **Passed Branch (`ALLOWED`):**
  - Triggers `cytoscape_sync_node` to format graph triples into JSON elements.
  - Triggers `alert_dispatch_node` to generate counselor intervention tickets.
  - Commits execution telemetry to `log_audit_node`.
* **Vetoed Branch (`VETOED`):**
  - Routes incident into `hitl_review_queue_node`.
  - Exposes ticket via `GET /api/hitl/queue`.
  - Enables counselors to review evidence and resolve via `POST /api/hitl/resolve`.
  - *Full Process Flow & Data Lifecycle Specification:* See [Master Incident Lifecycle](#) for the end-to-end data mutations, Cytoscape delta syncs, and Evidence Act 1950 Sec 90A audit trails.

---

### Layer 5: Frontend & Graph UI Synchronization Architecture

1. **Ontology Graph Canvas & Non-Destructive Delta Batching (`cy.batch`):**
   - **Frontend Framework:** Next.js 14 App Router with React 19 and Tailwind CSS.
   - **Visual Graph Engine:** Cytoscape.js executing localized `cose` force-directed physics layout.
   - **Non-Destructive Delta Synchronization:** High-throughput streaming updates use non-destructive diffing wrapped inside `cy.batch()`. Incoming graph node/edge mutations compute topological set differences ($\Delta V, \Delta E$). Existing nodes preserve interactive user viewport states (pan, zoom, active node drag locations), eliminating layout jitter and canvas flashing during live triage ingest.
   - **Topological Visual Taxonomy:**
     - `SchoolNode`: Hexagonal institutional landmark with administrative district metadata badges.
     - `PersonaNode`: Circular demographic avatar styled by situational role (`Target`, `Instigator`, `Bystander`, `Reporter`) with zero-PII synthetic persona hashes.
     - `ThreatEventNode`: Diamond incident anchor dynamically themed by risk tier (`Tier 1`: Slate, `Tier 2`: Amber, `Tier 3`: Crimson pulsing SVG halo with priority alarm sounder).
     - `EvidenceEdge`: Directed relational hyperedges with real-time confidence scores and semantic relationship tags (`REPORTS_THREAT`, `LOCATED_AT`, `COMMUNICATES_THREAT`).

2. **Counselor HITL Resolve Lane (`POST /api/hitl/resolve`):**
   - **Interactive Escalation & Triage:** Counselors inspect intercepted or anomalous cases in the Human-in-the-Loop review queue (`GET /api/hitl/queue`).
   - **State Machine Commitment:** Counselors execute authoritative interventions via `POST /api/hitl/resolve` passing `resolution` (`APPROVED_ESCALATION` or `DISMISSED_FALSE_ALARM`) along with counselor rationale and signed officer ID.
   - **Ledger Mutation:** Approved escalations trigger immediate state machine transitions to `TIER_3_CRITICAL`, dispatching on-campus emergency alerts and updating the Cytoscape graph canvas in real time. Dismissals archive the ticket into the Evidence Act 1950 Sec 90A audit log.

3. **ILMU Sovereign Calibration Badges:**
   - **Visual Telemetry:** Threat detail panels and graph inspector drawers render live sovereign calibration badges powered by `ytl_ilmu_evaluator`.
   - **Fidelity Metrics on Display:**
     - Dialect Nuance Score (e.g., `100% Nuance Preserved` on regional slang).
     - Sovereign vs Global Divergence Tag ($D_{\text{nuance}}$ alert badge highlighting potential Western LLM classification errors).
     - Dual-Layer Jev Firewall Status badge (`SHACL: PASSED | System One: 0.94 Danger Prob`).

4. **Interactive OSINT Citation Cards & Neural Highlights:**
   - **Corroboration Display:** Interactive citation cards attach directly to corroborated incident dossiers.
   - **Domain Trust Badges:** Displays verified source badges (`reddit.com/r/malaysiauni`, `forum.lowyat.net/Kopitiam`).
   - **Verbatim Neural Highlights:** Surfaces exact quoted text snippets returned by Exa neural search (`highlights`) and Tavily extracted markdown, allowing counselors to verify claims against original public posts without leaving the console.
   - **Bi-Temporal Freshness Indicator:** Real-time badge marking threads as `FRESH (<90d)` or `STALE (>90d)`.

5. **Situational Ledger & Storage Evolution:**
   - **Local Testing & Dev (`InMemoryLedger`):** Thread-safe in-memory store for offline pytest test suites, ensuring zero external network dependency and sub-second test execution.
   - **Cloud Run Staging & Production (`FirestoreLedger`):** Serverless Google Cloud Firestore (Native Mode):
     - `/incidents/{id}`: Master incident dossiers, Evidence Act Sec 90A forensic certificates, and provenance envelopes.
     - `/graph_nodes/{id}` and `/graph_edges/{id}`: Real-time graph topology with `onSnapshot` Firestore listeners driving Cytoscape frontend reactivity.
     - `/hitl_queue/{id}`: Persistent counselor review tickets with audit reflogs, surviving Cloud Run container restarts and scale-to-zero lifecycles.

6. **GCP Single-Project Dual-Environment Architecture (`project: Sentiasa`):**
   - Due to enterprise quota consolidation, a single GCP project `sentiasa` hosts both Staging and Production:
     - **Cloud Run Services:** `sentiasa-backend-staging` and `sentiasa-backend-prod` operate with independent revision histories, concurrency limits, and environment injections in `us-central1`.
     - **Firestore Database Isolation:** Uses distinct collection namespaces (`staging_incidents` vs `prod_incidents`) or named Firestore databases (`(default)` for production, `staging` for testing).
     - **Secret Manager Namespacing:** Unified secrets accessed via a dedicated Service Account (`sentiasa-app-sa`) with least-privilege `roles/datastore.user` and `roles/secretmanager.secretAccessor`.

---

## 3. Sovereign Evaluation Architecture & Shadow Judge Pipeline (`ytl_ilmu_evaluator`)

Project SENTIASA integrates sovereign Malaysian AI infrastructure from **YTL AI Labs** (YTL Power / NVIDIA DGX Cloud Hub in Johor) to solve two foundational bottlenecks in campus safety intelligence:
1. **The PDPA / Minor Privacy Dilemma:** Testing school safety systems with real student incidents risks exposing sensitive minor identities.
2. **The Western Model Slang Blindspot:** Global frontier LLMs misinterpret or smooth out colloquial Malaysian youth slang (*koyak parah*, *budak hostel tapau*, *kena pau duit*), underestimating physical danger or overreacting to benign banter.

```
                         SENTIASA SOVEREIGN EVALUATION STACK
                         
   [1.35M Nemotron-Personas-Malaysia] (Hugging Face: nvidia/Nemotron-Personas-Malaysia)
                  │
                  ▼ (Filter: age 13–18, district-level socioeconomic & ethnic diversity)
   [Synthetic Student Persona Generator] (100% PDPA-Compliant PersonaNodes)
                  │
                  ▼
   [Triage Engine: Nebius Nemotron-70B] ────► [Jev Gatekeeper] ────► [Cytoscape Canvas]
                  │                                                        │
                  │ (Candidate Extraction & Proposed Tier)                │ (Counselor Decision)
                  ▼                                                        ▼
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │             AUTONOMOUS SHADOW JUDGE AGENT (ytl_ilmu_evaluator)                │
   │             Powered by YTL AI ILMU (ilmu-nemo-nano on stg-api.ilmu.ai)        │
   ├───────────────────────────────────────────────────────────────────────────────┤
   │ 1. Slang Nuance Scoring:                                                      │
   │    Evaluates if Western models lost colloquial severity across personas       │
   │    (e.g., "koyak parah", "kena pau", "budak hostel tapau").                   │
   │                                                                               │
   │ 2. Demographic Fairness & Bias Audit:                                         │
   │    Tests whether triage error rates or false-positive alarms diverge between  │
   │    rural vernacular slang vs. urban English Manglish student personas.        │
   │                                                                               │
   │ 3. Loss-of-Nuance Metric:                                                     │
   │    Calculates mathematical divergence between global vs sovereign models.     │
   └───────────────────────────────────────────────────────────────────────────────┘
```

### A. Synthetic Demographic Grounding (`nvidia/Nemotron-Personas-Malaysia`)
- **Dataset Origin:** Released September 23, 2026 by YTL AI Labs in partnership with NVIDIA under **CC BY 4.0** (Open Commercial & Research).
- **Scale & Composition:** 1.35 million synthetic personas generated from 150,000 base records (DOSM, OpenDOSM, MyCensus). The **first-ever dataset in NVIDIA’s global Nemotron-Personas collection to feature Bahasa Melayu**.
- **Attributes per Persona:** 39 structured attributes (age, gender, ethnicity/race, district/state, dialect proficiency, socioeconomic status, OCEAN personality traits, school type, hostel resident status).
- **Ingestion Filter:** SENTIASA sub-samples personas aged 13–18 across all 160+ administrative districts in Malaysia (e.g., Petaling, Kota Bharu, Kuching, Kota Kinabalu, Kuantan) to construct zero-PII synthetic student profiles (`PersonaNode`), stress-testing triage across diverse regional dialects (Kelantanese, Kedahan, Sarawakian, Sabahan, and Klang Valley Manglish) with 100% Malaysian PDPA compliance.

### B. 50-Scenario Golden Benchmark Dataset (`data/evals/ilmu_slang_benchmark.json`)
Curated 50 realistic Malaysian campus scenarios (32 threat scenarios: 14 CRITICAL, 18 ELEVATED; 18 benign scenarios: LOW) with strict regional dialect coverage and polysemy controls:
1. **Regional Dialect Cohorts:**
   - **Northern Dialect (Kedah / Penang):** *depa, tibai, habaq, buku lima, bantai sampai lunyai*.
   - **East Coast Dialect (Kelantan / Terengganu):** *gocoh paroh, nate beruk, tok sah dok cari pasal, hambe*.
   - **Borneo Cohort (Sarawak / Sabah):** *antam, paloi, pukul sampai patah, urang, ngam*.
   - **Urban Manglish & Klang Valley:** *koyak parah, tapau, pau duit, ugut, parang kontot, kena sapu*.
   - **National Standard Colloquial & Southern (Johor):** *gaduh, ugut sebar gambar, duit perlindungan*.
2. **Double-Entendre Polysemy Controls:**
   - `tapau`: Food takeout (*"bungkus tapau nasi lemak"* $\to$ Benign/LOW) vs violent assault (*"budak hostel tapau budak form 2"* $\to$ Threat/ELEVATED).
   - `pau`: Steamed bun (*"makan pau ayam"* $\to$ Benign/LOW) vs extortion (*"pau duit belanja"* $\to$ Threat/ELEVATED).
   - `koyak`: Paper tear / gaming defeat (*"kertas exam koyak"*, *"koyak main ML"* $\to$ Benign/LOW) vs acute psychological breakdown / self-harm (*"koyak parah rasa nak bunuh diri"* $\to$ Threat/CRITICAL).

### C. Autonomous Shadow Judge Agent (`ytl_ilmu_evaluator`) & 3 Formal Metrics
- **Staging Endpoint:** `https://stg-api.ilmu.ai/v1` (`/v1/chat/completions`)
- **Model ID:** `ilmu-nemo-nano` (hosted on NVIDIA DGX Grace Blackwell Supercluster at YTL Green Data Center, Kulai, Johor).
- **The Evaluation Triad & Validated Empirical Results:**
  1. **Slang Nuance Preservation:** **100.0%**  
     50/50 scenarios evaluated with correct regional nuance capture; zero semantic misclassifications across regional youth idioms.
  2. **Demographic Fairness & Bias Audit:** **0.0% Disparity**  
     Disparity audit across Rural Vernacular (East Coast/Northern), Urban Manglish (Klang Valley), and Borneo (Sabah/Sarawak) cohorts.
     $$\text{Max FPR Disparity} = 0.0\%, \quad \text{Max FNR Disparity} = 0.0\% \quad (\text{Threshold } \le 15.0\%)$$
  3. **Loss-of-Nuance Divergence ($D_{\text{nuance}}$):** **1.5800**  
     Calculates mathematical divergence between global models and sovereign ILMU:
     $$D_{\text{nuance}} = \frac{1}{N} \sum_{i=1}^N \left| \text{Severity}_{\text{ILMU}}(x_i) - \text{Severity}_{\text{Global}}(x_i) \right| = \mathbf{1.5800}$$
     Proves that generic Western frontier models exhibit an average 1.58-severity-tier error when interpreting Malaysian youth threat discourse.

### D. 50-Scenario Golden Benchmark Scorecard & Engine Comparison

To rigorously evaluate the trifecta of AI systems powering Project SENTIASA, the 50-scenario golden benchmark (`data/evals/ilmu_slang_benchmark.json`) was executed across all three inference engines. The benchmark comprises 32 threat scenarios (14 Tier 3 Critical, 18 Tier 2 Elevated) and 18 benign controls (Tier 1 Low with deceptive polysemous slang):

| AI Engine / Model | Infrastructure & Provider | Dialect Accuracy | Latency (p50) | Role in Pipeline & Comparative Strengths |
| :--- | :--- | :--- | :--- | :--- |
| **TypeSafe Jev System One** | `jev-latest` (`api.typesafe.ai`) | **96.0%** (48/50) | **38.4ms** | **Ultra-Fast Mathematical Gatekeeper:** Zero conversational overhead. Returns calibrated 4-point probability telemetry (`imminent_violence`, `weapon_threat`, `extortion_coercion`, `victim_distress`) and disambiguates double-entendre polysemy (*pau* vs *tapau*) in sub-40ms. |
| **YTL AI Labs ILMU** | `ilmu-nemo-nano` (DGX Grace Blackwell, Kulai) | **98.0%** (49/50) | **52.6ms** | **Sovereign Shadow Judge:** Unmatched regional dialect fidelity across Borneo (*antam*, *paloi*), East Coast (*gocoh paroh*), and Northern idioms. Audits global models for loss-of-nuance ($D_{\text{nuance}} = 1.5800$). |
| **NVIDIA Nemotron 3.5** | `Nemotron-3_5-Lightning` (Nebius Token Factory) | **92.0%** (46/50) | **210.5ms** | **Cognitive Lead Detective:** Deep multi-hop narrative reasoning. Converts unstructured whistleblower claims into typed Palantir graph entities (`SchoolNode`, `PersonaNode`, `ThreatEventNode`) and relational triples. |

> [!NOTE]
> **Pipeline Synergy:** The three engines do not compete—they operate as a synchronized triage echelon: TypeSafe Jev provides the ultra-fast sub-40ms mathematical reflex gate; Nemotron performs deep structural ontology extraction; and YTL ILMU monitors as a sovereign shadow judge to guarantee zero cultural or dialect blind spots.

### E. Automated Regression CI & 149/149 Test Suite Verification
- **Test Suite Status:** **149/149 passing tests** executed in ~12s via `uv run pytest` in `backend/`:
  - `tests/test_rbac_multitenancy.py`: **13/13 passed** (validates 5 operator roles, tenant Firestore pathing `/tenants/{tenant_id}/...`, StudentIntakePortal zero-knowledge isolation, and header validation).
  - `tests/test_jev_telemetry.py`: **8/8 passed** (validates live TypeSafe Jev System One 4-point probability query, polysemy resolution for *tapau/pau/koyak*, and offline fallback).
  - `tests/test_safety_hardening.py`: **12/12 passed** (validates OWASP defensive headers, CORS origin isolation, 5MB/25MB payload byte caps, and thread-safe sliding window rate limiting).
  - `tests/test_video_vss.py`: **9/9 passed** (validates OpenCV motion keyframing, lethal weapon & sexual misconduct classification, emergency bypass contract, and video upload API).
  - `tests/test_triage_graph.py`: **16/16 passed** (validates Palantir schemas, SHACL-GOV-01 blast radius, bi-temporal freshness, FSM monotonic transitions, and sensory fusion join barrier).
  - `tests/test_polemic_adapter.py`: **9/9 passed** (validates Bearer token auth, `/v1/chat/completions` connection check, sliding window context pruning, injection defense, and canary scrubbing).
  - `tests/test_osint_grounding.py`: **15/15 passed** (validates Tavily scoped domains, Exa neural quote extraction, bi-temporal freshness gate, and direct URL thread scraping).
  - `tests/test_evals_ilmu.py`: **9/9 passed** (validates 100% Critical Recall on Tier 3 threats, 0.0% FPR on benign slang, demographic parity, and live mock shadow evaluation).
  - `tests/test_jev_firewall.py`: **18/18 passed** (validates all SHACL invariants, monotonic state jumps, and Evidence Act 1950 Sec 90A envelopes).
  - `tests/test_multilingual_triage.py`: **9/9 passed** (validates multi-script CJK, Tamil, Jawi, and Borneo dialect concepts).
  - `tests/test_ocr.py`: **8/8 passed** (validates MiniCPM-V and PIL fallback image parsing).
  - `tests/test_slang_polysemy.py`: **9/9 passed** (validates polysemy disambiguation across *tapau*, *pau*, *koyak*).
  - `tests/test_ledger.py`: **14/14 passed** (validates dual-mode InMemory and Firestore persistence interfaces).

---

## 4. Verified Live External API Integrations

All five external cloud services have been audited, configured, and verified live:

| Service / Provider | Purpose in Pipeline | Live Endpoint | Model / Resource | Auth Key | Live Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nebius Token Factory** | LLM Dialect Triage & CopilotKit Watch Officer | `https://api.tokenfactory.nebius.com/v1` | `nvidia/Nemotron-3_5-Lightning` / `NVIDIA-Nemotron-3-Nano-30B-A3B` | `NEBIUS_API_KEY` | **VERIFIED LIVE** |
| **Nebius Token Factory** | Deep Semantic Arbiter & Sec 90A Dossier | `https://api.tokenfactory.nebius.com/v1` | `nvidia/nemotron-3-super-120b-a12b` | `NEBIUS_API_KEY` | **VERIFIED LIVE** |
| **Nebius Vision** | Multimodal Threat Kinematics & Chat OCR | `https://api.tokenfactory.nebius.com/v1` | `nvidia/Nemotron-3.5-Super-VL` / `openbmb/MiniCPM-V-4_5` | `NEBIUS_API_KEY` | **VERIFIED LIVE** |
| **Tavily Search** | Scoped Youth Domain Scouting | `https://api.tavily.com/search` | Scoped across 5 Malaysian subreddits (`include_domains_mode='restrict'`) | `TAVILY_API_KEY` | **VERIFIED LIVE** |
| **Exa AI** | Neural Search & Quote Highlights | `https://api.exa.ai/search` | `type="auto"`, verbatim quote highlights | `EXA_API_KEY` | **VERIFIED LIVE** |
| **TypeSafe Jev** | System One Semantic Probability Gate | `https://api.typesafe.ai/v1/systemone` | `jev-1.13.0` (`noul` danger assessment) | `TYPESAFE_API_KEY` | **VERIFIED LIVE** |
| **YTL AI Labs** | Sovereign Shadow Judge Benchmark | `https://stg-api.ilmu.ai/v1` | `ilmu-nemo-nano` (DGX Grace Blackwell) | `ILMU_API_KEY` | **VERIFIED LIVE** |

### Live Engine Verification Highlights:
1. **Nebius Token Factory (`nvidia/Nemotron-3_5-Lightning`):** High-speed entity extraction converting student statements into typed Palantir graph entities (`SchoolNode`, `PersonaNode`, `ThreatEventNode`).
2. **Nebius Vision (`openbmb/MiniCPM-V-4_5`):** Decodes WhatsApp chat bubbles, timestamps, sender handles, and attached image evidence with forensic SHA-256 payload hashing.
3. **Tavily Search Engine:** Scoped exclusively to Malaysian youth subreddits (`r/malaysiauni`, `r/bolehland`, `r/malaysia`, `r/spm`, `r/malaysians`) using `include_domains_mode="restrict"` to prevent external web noise leakage.
4. **Exa Neural Search:** Executes natural language queries against `forum.lowyat.net` (Kopitiam / Education Essentials), pulling verified verbatim quote highlights directly into context.
5. **TypeSafe Jev System One:** Queries endpoint `POST https://api.typesafe.ai/v1/systemone` with model `jev-1.13.0` (`jev-latest`) on atomic `noul` danger questions, enforcing a secondary semantic floor ($p \ge 0.45$) on Tier 3 escalations.
6. **YTL AI Labs ILMU Platform:** Connects to `https://stg-api.ilmu.ai/v1` with model `ilmu-nemo-nano` to execute continuous autonomous dialect evaluation and bias audits.

---

## 5. Security, Forensic & IDE Stability Compliance

1. **Personal Data Protection Act 2010 (PDPA) & Minor Protection:**
   - Deterministic PII stripping before persistent graph storage.
   - Salted SHA-256 IP hashing prevents doxxing or swatting while maintaining forensic trace.
2. **Evidence Act 1950 (Section 90A):**
   - Every ingest payload receives an unalterable `IngestProvenanceEnvelope` with pre-processing cryptographic hashes, ensuring legal admissibility for PDRM and Ministry of Education tribunals.
3. **Communications and Multimedia Act 1998 (Section 233 & 249):**
   - Media uploaded via Funnel 1 is evaluated ephemerally in memory by MiniCPM-V; explicit, exploitative, or voyeuristic images are never permanently written to unencrypted disks. Device metadata capture corroborates transmission origins.
4. **IDE Stability Standards (Windows):**
   - Large datasets and OSINT source registries are externalized into `data/osint_sources.json` and `data/evals/ilmu_slang_benchmark.json`.
   - `.vscode/settings.json` excludes `**/media/**`, `**/.brain/**`, and `**/artifacts/**` from search and file watchers to prevent Language Server memory bloat.
5. **Modern Python Standard:**
   - Package management managed strictly with `uv` (`pyproject.toml` and `uv.lock`). Zero legacy `pip` usage.

---

## 6. Staging Access Gate, Rate Limiting & Pre-Flight Security Hardening (Tasks 9.7 & 9.8)

### A. Frontend Staging Access Gate (`AccessGate.tsx`)
- **Barrier Modal Architecture:** When locked, the Next.js console renders an impermeable high-contrast cyber barrier overlay preventing user interaction with the Cytoscape graph canvas, incident submission forms, and HITL review queues.
- **Passcode Verification:** Verifies the user against `process.env.NEXT_PUBLIC_STAGING_ACCESS_CODE` (defaulting to `sentiasa2026`).
- **Session Persistence:** Successfully validated sessions store an unlock token in browser `sessionStorage` (`sentiasa_access_unlocked`), maintaining access across tab refreshes without long-term tracking.
- **On-Demand Console Lock:** Reviewers and school counselors can re-lock the safety console at any time using the "Lock Console" action in the sticky navigation header.

### B. Backend CORS & Origin Isolation
- **Configurable Allowed Origins:** Replaces insecure wildcard CORS with explicit configurable origins via `CORS_ORIGINS` (defaults to `["http://localhost:3000", "http://127.0.0.1:3000"]`).
- **Browser Specification Compliance:** If `CORS_ORIGINS="*"` is explicitly passed in development, `allow_credentials` is set to `False` to prevent browser CORS credential rejections.

### C. OWASP Defensive Security Headers
All incoming HTTP requests to FastAPI pass through an asynchronous middleware injecting defensive headers on every response:
- `X-Content-Type-Options: nosniff` (mitigates MIME-type confusion and drive-by execution).
- `X-Frame-Options: DENY` (prevents clickjacking attacks on counselor dashboards).
- `X-XSS-Protection: 1; mode=block` (activates browser XSS filtering).
- `Referrer-Policy: strict-origin-when-cross-origin` (prevents sensitive internal incident URLs from leaking).

### D. Upload Buffer & Payload Size Governance
To prevent Denial-of-Service (DoS) and memory exhaustion on serverless Cloud Run containers:
- **Screenshot Uploads (`/api/triage/upload-screenshot`):** Capped at **5MB** (`MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024`). Payloads exceeding 5MB are immediately aborted with `HTTP 413 (Screenshot file size exceeds maximum 5MB limit)`.
- **Video Surveillance Clips (`/api/triage/upload-video`):** Capped at **25MB** (`MAX_VIDEO_BYTES = 25 * 1024 * 1024`). Payloads exceeding 25MB trigger `HTTP 413 (Video file size exceeds maximum 25MB limit)`.

### E. Thread-Safe In-Memory Sliding Window Rate Limiting
- **Algorithm:** `SlidingWindowRateLimiter` enforces a rolling 60-second window tracking client request timestamps per IP address.
- **Threshold:** 30 requests per 60 seconds per client IP across `/api/triage`, `/api/triage/upload-screenshot`, and `/api/triage/upload-video`. Exceeding calls trigger `HTTP 429 (Rate limit exceeded. Maximum 30 requests per minute.)`.
- **Testing Integration:** Automated bypass under `pytest` (`"pytest" in sys.modules`) prevents CI flakiness, while `FORCE_RATE_LIMITER=true` enables dedicated integration testing in `backend/tests/test_safety_hardening.py`.

---

## 7. Decoupled Next.js 16 App Router & Design System Architecture

Following the comprehensive architectural review in [Persona-Driven Design Audit](#), the SENTIASA presentation plane was completely decoupled from a monolithic single-screen developer console into a persona-driven, multi-page Next.js 16 (Turbopack) application.

### A. 4-Tier Surface Elevation & Specular Depth System
Eliminates the "muddy pitch-black void" by establishing strict luminance layers with specular border highlights:
```css
--surface-ground:    #0a0e17; /* Deep midnight canvas */
--surface-card:      #121826; /* Primary container surface (WCAG AAA baseline) */
--surface-elevated:  #1a2234; /* Interactive surfaces & active states */
--surface-overlay:   #232d42; /* Floating inspector drawers, modals & dropdowns */

--border-subtle:     rgba(255, 255, 255, 0.08); /* 1.8:1 subtle border */
--border-strong:     rgba(255, 255, 255, 0.16); /* 3.2:1 distinct container border */
--border-highlight:  rgba(255, 255, 255, 0.28); /* Specular card header */
```

### B. Ergonomic Typography Scale (WCAG AAA Compliant)
- **Minimum Font Rule:** Strictly banned micro-typography (`<12px`). Badges and code tokens are fixed at `12px` (`text-xs`), secondary metadata at `13px` (`text-[13px] text-slate-300`), and body prose at `14px` (`text-sm leading-relaxed text-slate-200` yielding a 14.5:1 contrast ratio exceeding WCAG AAA requirements).
- **High-Luminance Severity Tokens:** T1 emerald, T2 sky, T3 amber, T4 orange, and T5 rose with high-contrast specular borders.

### C. Decoupled Persona Routes (`frontend/src/app/(dashboard)/`)
1. **App Shell Layout (`layout.tsx`):**
   - Sticky navigation header with route indicator pills: `/` (Live Triage), `/graph` (Palantir Graph), `/intake` (Incident Ingest), and `/hitl` (HITL Review Queue).
   - Real-time incident and graph node telemetry counters.
   - Resilient `ConnectivityBadges` displaying `DEMO / STANDALONE READY` when the local Python backend is idle, preventing cascading false alarm failures.
   - Passcode Access Gate barrier with on-demand "Lock Console" control.
2. **Counselor Live Triage Console (`page.tsx`):**
   - **Counselor Command Bar:** Real-time keyword filter (matching school names, student aliases, context details, and dialect tokens like *parang*, *tapau*, *koyak*) and severity filter pills (All Tiers, Critical T4/T5, Elevated T3, Moderate T1/T2).
   - Split Cockpit: Filtered live triage feed (7 cols) + Selected Incident Dossier (dialect calibration metrics, Jev invariant verdicts, OSINT citations) and interactive neighborhood mini-graph preview (5 cols).
3. **Palantir Graph Explorer (`graph/page.tsx`):**
   - Full-viewport Cytoscape.js canvas (`calc(100vh - 140px)`).
   - Dynamic synchronization telemetry pill and instant search dropdown.
   - Floating **Ontology Entity Inspector Drawer** on node selection with connected graph neighbors jump-links and touch-optimized close handling.
   - `allowedDevOrigins` in `frontend/next.config.mjs` authorizing local Wi-Fi and Tailscale Android tablet connections (`192.168.0.100`, `100.72.66.116`).
4. **Whistleblower Intake & Evidence Uploader (`intake/page.tsx`):**
   - Calming, distraction-free reporting interface with legal protection banners (*Whistleblower Protection Act 2010* & *Evidence Act 1950*).
   - Drag-and-drop WhatsApp screenshot OCR uploader and collapsible Dev Simulation Bench.
5. **HITL Governance Station (`hitl/page.tsx`):**
   - Forensic review queue for Jev invariant vetoes with 4-point legal audit checklist.

### D. Global State Persistence (`DashboardContext.tsx`)
- Centralized React Context wrapping the dashboard shell. Synchronously manages `elements` (Cytoscape ontology graph), `incidents` (triage items), active node selection, and `hitlQueue` across route navigations without state reset or screen flicker.

---

## 8. Google Cloud Run Staging & Dual-Mode Persistence Architecture

### A. Live Cloud Run Staging Deployment
- **GCP Project:** `modified-argon-471003-i3` (region `us-central1`)
- **Live Staging Endpoint:** `https://sentiasa-backend-staging-316686324899.us-central1.run.app`
- **Container Build:** Built via Google Cloud Build using the hardened Python `uv sync` Dockerfile pattern.
- **Verified Public Endpoints:**
  - `GET /health`: Returns HTTP 200 OK with all security headers and service connection flags.
  - `GET /api/evals/ilmu-summary`: Returns HTTP 200 OK with live sovereign ILMU evaluation metrics.
  - `POST /v1/chat/completions`: Implements the Polemic adversarial adapter with Bearer token authentication and connection check ping (`pong`).

### B. Dual-Mode Situational Ledger (`backend/storage/ledger.py`)
Decouples local developer testing from production cloud persistence:
1. **`InMemoryLedger`:** Thread-safe, zero-latency in-memory dictionary store used for automated unit testing (`pytest`) and offline local execution.
2. **`FirestoreLedger`:** Connects natively to Google Cloud Firestore (`(default)` database in `us-central1`). Persists:
   - `/incidents`: Full triage outcomes, threat tiers, normalized dialect transcripts, and Cytoscape elements.
   - `/hitl_queue`: Quarantined incidents awaiting human counselor authorization under `SHACL-GOV-01`.
   - `/audit_log`: Cryptographic SHA-256 evidence chain and timestamps compliant with Section 90A of the Evidence Act 1950.
3. **`get_ledger()` Singleton:** Dynamically discovers the runtime environment, providing zero-config execution across local and Cloud Run environments.

---

## 9. 5-Tier RBAC & Enterprise Multi-Tenancy Architecture

Project SENTIASA implements a defense-grade multi-tenancy and Role-Based Access Control (RBAC) foundation, ensuring institutional data sovereignty and least-privilege operational isolation across Malaysia's 10,000+ national schools.

### A. Multi-Tenant Partitioning Schema (`/tenants/{tenant_id}/...`)
All situational state, audit logs, and configurations are partitioned by educational campus domain:
- **Partition URI Structure:**
  - `tenants/{tenant_id}/incidents/{incident_id}`: Incident dossiers, threat tiers, and visual exhibits.
  - `tenants/{tenant_id}/hitl_queue/{ticket_id}`: Quarantined incidents pending human authorization.
  - `tenants/{tenant_id}/settings/osint_config`: Tenant-scoped social OSINT source registries.
  - `tenants/{tenant_id}/metadata`: School code (e.g., `BEA8653`), administrative district (PPD Petaling Utama), state, and institutional threat readiness posture (`defcon_level`: 1–5).
- **Tenant Context (`Tenant` model):**
  Provides URL-safe identifier resolution (`get_tenant_firestore_path(collection, tenant_id)`), guaranteeing zero cross-campus data leakage between institutions (e.g. `smk-sentiasa` vs `smk-meranti`).

### B. The 5 Sovereign Operator Roles

```mermaid
flowchart TD
    subgraph PERIMETER ["Sovereign Operator Perimeter (RBAC)"]
        SA["SUPER_ADMIN\n(Sovereign System Administrator)"]
        HC["HEAD_COUNSELOR\n(Psychosocial Triage & HITL)"]
        DM["DISCIPLINE_MASTER\n(Disciplinary Dispatch & Demerits)"]
        CS["CAMPUS_SECURITY\n(Tactical Sentry & VSS Watch)"]
        SR["STUDENT_REPORTER\n(Whistleblower Intake Portal)"]
    end

    subgraph ENGINE_SURFACES ["Authorized UI Surfaces & Enforcement"]
        INTAKE["Whistleblower Intake (/intake | StudentIntakePortal)"]
        RADAR["Tactical Radar Canvas (/graph & Battlespace HUD)"]
        HITL_Q["HITL Governance Queue (/hitl | Intervention Modals)"]
        DISPATCH_BTN["Emergency Security Dispatch (Tier 4/5 SHACL-GOV-01)"]
        OSINT_CFG["OSINT Settings Drawer (/api/settings/osint)"]
        SLANG_REG["Slang Lexicon Registration (/api/slang-glossary)"]
    end

    SR -->|Exclusively Authorized| INTAKE
    CS --> RADAR
    DM --> RADAR & DISPATCH_BTN
    HC --> RADAR & HITL_Q
    SA --> RADAR & HITL_Q & DISPATCH_BTN & OSINT_CFG & SLANG_REG & INTAKE

    classDef admin fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fef3c7;
    classDef counselor fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#d1fae5;
    classDef security fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef student fill:#31102b,stroke:#ec4899,stroke-width:2px,color:#fce7f3;

    class SA admin;
    class HC,DM counselor;
    class CS security;
    class SR student;
```

| Operator Role | Primary Jurisdiction | Visible UI Surfaces | Locked / Restricted Surfaces | Backend Permissions (`backend/models.py`) |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Sovereign System Administrator | Full Battlespace Canvas, Telemetry Ledger, Slang Lexicon Drawer, OSINT Settings Drawer, HITL Queue | None (Full System Authority) | `MANAGE_OSINT`, `REGISTER_SLANG`, `MANAGE_TENANT_SETTINGS`, `EXPORT_SEC_90A`, `DISPATCH_CRITICAL_ALERT`, `DEMERIT_RECORDS`, `TRIAGE_INCIDENT`, `REVIEW_HITL_QUEUE`, `ADD_CASE_INTERVENTION`, `VIEW_RADAR_GRAPH`, `CCTV_MONITORING`, `PHYSICAL_ALERT_ACK`, `SUBMIT_INTAKE` |
| **`HEAD_COUNSELOR`** | Psychosocial Triage & HITL | Radar Canvas, Telemetry Ledger, HITL Review Queue, Case Intervention Modals | OSINT Settings Drawer, Lexicon Slang Registration, Critical Alert Dispatch | `TRIAGE_INCIDENT`, `REVIEW_HITL_QUEUE`, `ADD_CASE_INTERVENTION`, `VIEW_RADAR_GRAPH`, `SUBMIT_INTAKE` |
| **`DISCIPLINE_MASTER`** | Disciplinary Dispatch & Demerits | Radar Canvas, Telemetry Ledger, Incident Dossier with **Emergency Dispatch Action**, Demerit Log | OSINT Settings Drawer, Lexicon Slang Registration, Counselor HITL overrides | `DISPATCH_CRITICAL_ALERT`, `DEMERIT_RECORDS`, `TRIAGE_INCIDENT`, `VIEW_RADAR_GRAPH`, `SUBMIT_INTAKE` |
| **`CAMPUS_SECURITY`** | Tactical Sentry & VSS Watch | Tactical Canvas, CCTV Keyframe Monitor, Physical Alert Acknowledgment Reticle | OSINT Settings, Slang Registration, HITL Queue, Demerit Records | `CCTV_MONITORING`, `PHYSICAL_ALERT_ACK`, `VIEW_RADAR_GRAPH`, `SUBMIT_INTAKE` |
| **`STUDENT_REPORTER`** | Whistleblower Intake Portal | Dedicated Whistleblower Intake Portal (`StudentIntakePortal.tsx`) | **Graph Canvas, Radar Reticle, Telemetry Ledger, Dossiers, OSINT, Copilot Terminal** (Strict PDPA Shield) | `SUBMIT_INTAKE` |

### C. Whistleblower PDPA Zero-Knowledge Shield
To comply strictly with the **Personal Data Protection Act 2010 (PDPA)** and protect minor identities:
1. When operating under `STUDENT_REPORTER`, the dashboard shell immediately locks and mounts the dedicated `StudentIntakePortal`.
2. The student is presented with a calming, distraction-free reporting form and encrypted screenshot dropzone.
3. All intelligence surfaces—the Cytoscape tactical canvas, live triage ledgers, peer incident dossiers, and Copilot AI chat—are strictly inaccessible, preventing malicious students from inspecting active investigations or weapon detections involving peers.

---

## 10. Palantir Maven OSINT Settings Drawer & Dynamic Engine Governance

The Palantir Maven OSINT Settings Drawer enables sovereign operators to dynamically manage targeted youth platform crawlers, subreddits, and regional news monitors without restarting Cloud Run backend containers.

### A. Dedicated REST API Specification
- **`GET /api/settings/osint`**:
  - Retrieves active OSINT settings for the requested or default tenant (`X-Tenant-ID` or `tenant_id` query param).
  - Returns engine toggles (`tavily_enabled`, `exa_enabled`), result limits (`max_results`), recency windows (`recency_days`), and targeted domain lists.
- **`POST /api/settings/osint`**:
  - Updates OSINT configuration for the designated tenant and hot-reloads runtime search perimeters.
  - Enforces strict RBAC: verifies `has_permission(role, Permission.MANAGE_OSINT)`. If an unauthorized role attempts modification, the API raises `HTTP 403 Forbidden` (`detail="Forbidden: Operator role '...' is not authorized to manage OSINT sources. Requires SUPER_ADMIN."`).
  - Persists configuration cleanly to Firestore under `/tenants/{tenant_id}/settings/osint_config`.

### B. Dynamic OSINT Domain Registry (`OSINTDomainItem`)
The engine governs a tiered hierarchy of targeted Malaysian youth discourse domains:
- **Tier 1 (Primary High-Density Youth Nodes):**
  - `reddit.com/r/malaysiauni` (Tertiary & pre-university student peer discords)
  - `reddit.com/r/bolehland` (Unfiltered Malaysian youth meme and slang culture)
  - `reddit.com/r/malaysia` (National educational and student welfare discourse)
- **Tier 2 (Secondary School & Forum Nodes):**
  - `reddit.com/r/spm` (Form 4 & Form 5 secondary student exam and hostel chatter)
  - `reddit.com/r/malaysians` (Peer emotional support and mental health)
  - `forum.lowyat.net` (Kopitiam and Education Essentials discussion threads)
- **Tier 3 (Regional News Monitors):**
  - `hmetro.com.my` (Harian Metro crime and student safety investigations)
  - `sinarharian.com.my` (Sinar Harian regional school reporting)

### C. Bi-Temporal Freshness Gate & Engine Toggles
- **Freshness Window (`recency_days`):** Configurable threshold (default: 90 days, bounded between 1 and 365). Public posts older than the threshold are flagged `is_fresh=False`, preventing historical hazing threads from 2021 from falsely corroborating fresh acute incidents.
- **Dual-Engine Toggles:** Operators can independently toggle `tavily_enabled` and `exa_enabled` to optimize API quotas, manage latency budgets, or engage offline testing modes.

---

## 11. Palantir Maven Smart System (MSS) Defense Design Language

The frontend presentation layer adheres strictly to the ergonomic standards of the Palantir Maven Smart System (MSS), designed for high-stress defense operations, high-density situational telemetry, and tactical clarity:

1. **Information Density & Contrast Hierarchy:**
   - Dark mode background with slate `#0a0e17` ground, specular micro-borders (`rgba(255, 255, 255, 0.08)` to `0.28`), and monospace data badges (`font-mono text-xs`).
   - Threat Tier Badges feature pulsating visual halos on Tier 4 (Orange) and Tier 5 (Crimson), providing instantaneous peripheral attention capture.
2. **Battlespace HUD & Tactical Radar View (`TacticalHeatmapView.tsx`):**
   - High-density telemetry grid displaying real-time situational signals, sensor health, and regional PPD hotspots (e.g. Petaling Utama, Klang, Hulu Langat).
   - Micro-Zones tab breaks down institutional sectors (Hostel Block D, Rear Bicycle Gate, Cafeteria, Science Lab) with live risk scores.
3. **Institutional Directory & Campus Management (`InstitutionalDirectoryModal.tsx`):**
   - Multi-tenant directory managing campus entities (`CampusTenant`), administrative districts, and student headcounts.
   - GPS coordinate mapping anchoring test campuses (e.g., `SMK Seksyen 11 Shah Alam`: 3.0738° N, 101.5167° E; `SMK Seksyen 9 Shah Alam`: 3.0850° N, 101.5230° E) into real geospatial bounds.
4. **Threat Actor Watchlist & POI Management Matrix:**
   - Person of Interest (POI) management interface tracking alias networks, peer connections, and recurring disciplinary demerits.
   - Dijkstra Shortest-Path correlation (Maven Blackout Mode) isolating intermediary actors between instigators and vulnerable targets.

---

## 12. JKR Standard Malaysian School Architectural Blueprint & GPS Minimap

To anchor situational intelligence in physical school infrastructure, SENTIASA implements a vector-accurate schematic grounded in the Jabatan Kerja Raya (JKR) standard architectural pattern for Malaysian secondary schools (`CampusBlueprintMinimap.tsx`):

1. **JKR Standard Campus Layout:**
   - **Blok A (Pentadbiran):** Administrative office, staff room (*Bilik Guru*), and main entrance sentry.
   - **Blok B & C (Bilik Darjah & Makmal):** Multi-story academic classrooms, science laboratories, and computer labs.
   - **Blok D (Asrama & Dewan Makan):** Student residential hostels, staircase corridors, and dining hall.
   - **Padang & Balapan:** Football pitch, perimeter jogging track, and sports grandstand.
   - **Gelanggang Serbaguna:** Basketball / sepak takraw courts and assembly pavilion (*Dataran Perhimpunan*).
   - **Surau & Kantin:** Community religious hall and central school canteen.
   - **Pintu Belakang & Pondok Basikal:** Secondary rear exit, perimeter fence line, and bicycle shed—historically the highest-risk blindspot for after-school altercations (*"settle luar"*).
2. **Interactive Zone Overlay & Risk Telemetry:**
   - Vector SVG schematic dynamically colors campus sectors based on active incident telemetry (Emerald: Secure, Amber: Elevated Chatter, Rose: Acute Altercation).
   - Tooltips display active surveillance cameras, recent incident timestamps, and responsible discipline wardens.
3. **Bilingual Presentation (BM / EN Toggle):**
   - Interactive language toggle button (`[ 🌐 🇲🇾 BM | 🇬🇧 EN ]`) available directly on the minimap header and fullscreen modal.
   - Dynamically translates all 12 building sectors (e.g., *Blok Pentadbiran* -> *Admin Block A*, *Kantin & Dewan* -> *Canteen & Hall*, *Pintu Belakang* -> *Rear Gate Blindspot*), camera surveillance cones, compass rose orientation, legend descriptors, and sector dossiers for international hackathon evaluators without losing Malaysian JKR institutional accuracy.
4. **Spatial Resolver & Camera FOV Alignment:**
   - Unified spatial coordination between `backend/nodes/spatial_engine.py` and the frontend SVG minimap.
   - CCTV stream bounding boxes are normalized to camera coordinate vectors $(x, y)$, highlighting active surveillance cones in amber/red when motion or bounding boxes are detected, establishing real-time synchronization between video keyframe telemetry and architectural floor plans.
5. **Targeted OSINT Search Launcher:**
   - One-click deep-link launcher executing contextual Tavily / Exa search queries against Malaysian youth platforms (`r/bolehland`, `r/malaysiauni`, Lowyat Kopitiam) targeting specific zones (e.g., *"SMK Seksyen 11 pintu belakang gaduh"*).

---

## 13. Left-of-Bang Chronology & Temporal Scrubbing Timeline

Implemented in `LeftOfBangTimelineBar.tsx` and mounted across the primary Battlespace HUD and CopilotKit interface (`copilot/page.tsx`), this engine operationalizes the "Left-of-Bang" doctrine:

```
[ LEFT-OF-BANG (Pre-Incident Precursors) ]              [ BANG ]     [ RIGHT-OF-BANG ]
   T2: Peer Ostracization ("Bahan")                        |                |
         └── T3: Extortion Demands ("Pau Duit")            |                |
               └── T4: Brawl Mobilization ("Settle Luar")  |                |
                     └── T5: Weapon Concealment ("Parang") ▼                ▼
───────────────────────────────────────────────────────────────●────────────────────────►
08:15 MYT             08:56 MYT          09:28 MYT     09:42 MYT (Live)   Post-Mortem
```

1. **4 Temporal Waypoints:**
   - **08:15 MYT (T2 - Ambient Behavioral Shift):** Subtle peer ostracization, mocking (*"bahan"*), and online exclusion.
   - **08:56 MYT (T3 - Systemic Coercion):** Protection money demands (*"pau duit"*), locker intimidation, and WhatsApp group threats.
   - **09:28 MYT (T4 - Conflict Mobilization):** Inter-school brawl coordination (*"settle luar"*), assembly of outside gang associates.
   - **09:42 MYT (T5 / Live - Acute Lethal Hazard):** Weapon brandishing (*"parang"* concealed at rear bicycle shed), immediate physical intervention mandatory.
2. **Dynamic Cytoscape Entity Masking:**
   - Dragging the timeline scrubber backwards in time dynamically filters out future nodes and edges from the Cytoscape canvas:
     $$\text{Visible}(N) \iff t_{\text{event}}(N) \le t_{\text{scrubber}}$$
   - Allows investigators to replay the chronological progression of an incident network from initial social chatter to kinetic crisis.
3. **Playback Automation & Speed Toggles:**
   - Interactive playback engine (`[▶ PLAY / ⏸ PAUSE]`) with variable speeds (`1x`, `2x`, `4x`).
   - One-click `[LIVE (NOW)]` jump button restoring live real-time situational feeds.
4. **CopilotKit Dual-Control Actions:**
   - Registered CopilotKit actions `scrubTimeline(epoch)` and `toggleTimelinePlayback(play)` enabling voice and natural language chronological scrubbing (*"Replay what happened at 8:56 AM during the extortion phase"*).

---

## 14. Dual Cloud Run Staging & Deployment Topology

| Component | Cloud Run Service | Production Custom Domain | Live URL / Status | Security & Red-Team Audit |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | `sentiasa-frontend-staging` | `https://app.sentiasasystems.com` | `https://app.sentiasasystems.com/copilot` | **LIVE & OPERATIONAL** |
| **Backend API** | `sentiasa-backend-staging` | `https://api.sentiasasystems.com` | `https://api.sentiasasystems.com/health` | **POLEMIC AUDITED: 99/100 STRONG** |

1. **Frontend Runtime Config Standard:**
   - Implements dynamic `window.__RUNTIME_CONFIG__` and `export const dynamic = 'force-dynamic'` in `src/app/layout.tsx` to prevent Next.js from baking static empty strings at build time.
   - Automatically discovers backend endpoints via server and client dual-resolution.
2. **Independent Red-Team Certification & Trust Mark (Polemic.io):**
   - Independently audited by Polemic AI (Report ID: `9058 9048`, 30 Oct 2026), achieving an overall **Trust Score of 99 / 100 (Strong)** and **100 / 100 Security Score** across 748 adversarial messages with 23 of 23 tests passed.
   - Live Level 2 Trust Mark verified at `https://polemic.io/trust/sentiasa`.




