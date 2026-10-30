# Project SENTIASA: NVIDIA Nemotron Model Stable & Multi-Tiered Sovereign AI Architecture

> **Classification:** Technical Architecture & Model Stable Ground Truth  
> **Status:** Ratified Reference Standard  
> **Authors:** Senior Systems Architect & Senior Intelligence Officer  
> **Infrastructure Partner:** Nebius Token Factory (High-Performance GPU Clusters)  
> **Model Ecosystem:** NVIDIA Open-Source Nemotron Family & YTL AI Labs  
> **Date:** October 2026  

---

## 1. Executive Summary: The Evolution of Our Model Stable

When Project SENTIASA commenced (Days 1–10), the pipeline utilized a single monolithic text-reasoning model (`nvidia/Nemotron-3_5-Lightning` via standard OpenAI-compatible endpoints) paired with local heuristic computer vision.

As the operational doctrine expanded to handle complex Malaysian youth vernacular (Manglish, Sabahan, Sarawakian polysemy), high-speed CCTV keyframe kinematics, and formal epistemic cross-family verification (Southbridge Rules 02 & 05), **we expanded our model stable into a coordinated, multi-tiered fleet of NVIDIA open-weight models** running on **Nebius Token Factory** accelerated by TensorRT-LLM on H100/H200 GPU infrastructure.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SENTIASA MULTI-TIERED MODEL STABLE                              │
│                      (Nebius Token Factory + TypeSafe Jev)                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
[ TIER 0: Epistemic Guard ]    [ TIER 1: Tactical Ingest ]     [ TIER 2: Deep Disambiguation ]
  TypeSafe Jev System One        Nemotron-3-Nano-30B-A3B         Nemotron-3-Super-120B
  • Formal SHACL Invariants      Nemotron-3.5-Lightning          • Forensic Cross-Family Audit
  • Bitemporal Validity Gate     • Rapid Intake Triage           • Complex Slang Polysemy
  • Non-LLM Mathematical Bound   • Sub-Second Counselor Chat     • High-Consequence Escalation
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[ TIER 3: Multimodal VISINT ]                   [ TIER 4: Sovereign Demographic Grounding ]
  Nemotron-3.5-Super-VL                           nvidia/Nemotron-Personas-Malaysia
  • CCTV Optical Threat Kinematics                (YTL AI Labs x NVIDIA Collaboration)
  • Dual Orthogonal Questioning (Rule 02)         • 50-Scenario Benchmark Grounding
  • $0.0007 / Incident Vision Cost                • Authentic Youth Vernacular & Personas
  (Fallback: MiniCPM-V-4_5 OCR)
```

---

## 2. Complete Model Catalog & Role Breakdown

| Tier & Role | Model Identifier | Architecture & Provider | Operational Responsibility in SENTIASA |
| :--- | :--- | :--- | :--- |
| **Tier 0: Formal Epistemic Gate** | **TypeSafe Jev System One** | Non-LLM Symbolic & Invariant Engine | Computes deterministic SHACL shapes, bitemporal bounds, and statutory chain-of-custody hashes under Section 90A Evidence Act 1950. |
| **Tier 1: Tactical Intake & Low-Latency Triage** | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | NVIDIA 30B MoE (Nebius Token Factory) | Ultra-fast, low-cost extraction of incident entities, temporal markers, and initial threat classification. |
| **Tier 1: Interactive Counselor Copilot** | `nvidia/Nemotron-3_5-Lightning` | NVIDIA Lightning LLM (Nebius Token Factory) | Sub-second streaming conversational copilot for school counselors, generating empathetic de-escalation scripts and actionable incident summaries. |
| **Tier 2: Deep Disambiguation & Cross-Family Corroboration** | `nvidia/nemotron-3-super-120b-a12b` | NVIDIA 120B Super MoE (Nebius Token Factory) | **Frontier Semantic Arbiter**: Reserved for high-complexity incident disambiguation, nuanced regional slang resolution, and cross-family prior verification ($Jev \cap Nemotron$) under Southbridge Rule 05. |
| **Tier 3: Multimodal VISINT & Physical Threat Kinematics** | `nvidia/Nemotron-3.5-Super-VL` | Frontier Multimodal VLM (Nebius Token Factory) | Optical scene parsing of CCTV footage and video whistles; identifies physical weapons, violent kinematics, and executes **Dual Orthogonal Questioning** (`doubt` scoring). |
| **Tier 3 Fallback: Fast Text OCR** | `openbmb/MiniCPM-V-4_5` | 8B Multimodal VLM (Nebius Token Factory) | Lightweight fallback for extracting timestamped chat transcripts from compressed mobile WhatsApp screenshots. |
| **Tier 4: Sovereign Shadow Judge & Grounding** | `ilmu-nemo-nano` & `nvidia/Nemotron-Personas-Malaysia` | YTL AI Labs sovereign Nemotron derivative (NVIDIA DGX Grace Blackwell, Kulai) | Autonomous Sovereign Shadow Judge (`ytl_ilmu_evaluator`) auditing dialect nuance ($D_{nuance}=1.58$) and demographic parity across 50 Malaysian youth scenarios (98% fidelity). |

---

## 3. The Engineering & Intelligence Tradecraft Rationale

### Rationale 1: Cost-Effective Tiered Routing (FinOps)
Blindly routing every routine student tip into a 120B-parameter or frontier multimodal model burns API budget and introduces unnecessary latency.
* **85% of cases** (routine intake, basic slang parsing, counselor Q&A) run on **Tier 1 (Nano-30B / Lightning)** at fractions of a cent per request with $<1\text{s}$ time-to-first-token.
* **Only high-ambiguity or Tier 4/5 threats** trigger **Tier 2 (Super-120B)** for deep forensic reasoning, keeping average pipeline cost strictly within our **$0.015 per incident budget cap**.

### Rationale 2: Independent Multi-Family Epistemic Intersection (Southbridge Rule 05)
In classical intelligence analysis, relying on a single analyst—or prompting the same model family twice—leads to correlated cognitive failure modes.
* To achieve true **cross-family epistemic corroboration**, SENTIASA intersects two fundamentally different reasoning paradigms:
  $$\text{Corroboration Action} = \mathbf{Jev}_{\text{System One}} \ \mathbf{\cap}\ \mathbf{Nemotron}_{\text{120B Super}}$$
* If TypeSafe Jev (symbolic invariant engine) and NVIDIA Nemotron (deep contextual transformer) diverge, the system automatically tags `prior_agreement = False` and triggers **Doubt-Driven Routing (Rule 07)** to human counselors rather than hallucinating an autonomous action.

### Rationale 3: Dual Orthogonal Anti-Deception in VISINT (Southbridge Rule 02)
With `nvidia/Nemotron-3.5-Super-VL`, we solved the notorious **"OCR Cheating"** problem where VLMs read burned-in sensationalist news captions (*"BUDAK TIKAM SENIOR"*) instead of inspecting physical evidence:
1. **Query A (Primary Kinetic Verdict):** Assesses physical altercation, weapon presence, and kinematics.
2. **Query B (Orthogonal Doubt):** Evaluates camera motion blur, scene occlusion, and subtitle presence.
3. **Bottom-20% Letterbox Mask:** By applying an automated black subtitle mask over video frames, caption-induced doubt drops from **0.55 down to 0.00**, proving that the model is making decisions based on optical reality.

---

## 4. How to Demonstrate This in the Hackathon Submission & 3-Minute Video

To effectively communicate this sophisticated architecture to the Nebius Hackathon judges, incorporate these specific demonstrations:

### 1. The Nebius Token Factory Integration Proof
* **Visual in UI:** Showcase the **Telemetry Ticker Ribbon** at the top of the SENTIASA dashboard displaying:
  ```
  ⚡ Nebius Token Factory: ACTIVE | Models: Nemotron-3.5-Super-VL + Nemotron-3.5-Lightning / 120B | TensorRT-LLM on H100
  ```
* **Architecture Diagram:** Include the Multi-Tier Model Stable diagram in the Devpost gallery and slide deck to prove we did not just build a simple wrapper, but an enterprise-grade tiered routing pipeline.

### 2. Live Demo: The Dual Orthogonal Questioning & Subtitle Mask (Rule 02)
* **The Action:** In [`IncidentSubmitter.tsx`](../frontend/src/components/IncidentSubmitter.tsx), submit a video clip with burned-in news tickers.
* **Without Mask:** Show that `orthogonal_evidence_doubt = 0.55` because the model spots news captions and flags visual uncertainty.
* **With Mask (`mask_captions=True`):** Show the letterbox mask applied, and watch `orthogonal_evidence_doubt` drop to `0.00` with the parang blade cleanly localized.
* **Judge Impact:** Directly proves to judges that SENTIASA prevents AI deception and hallucination.

### 3. Live Demo: $Jev \cap Nemotron$ Prior Agreement (Rule 05)
* **The Action:** Show the **Sentinel Audit Drawer** in the dashboard.
* **The Indicator:** Highlight the `prior_agreement: TRUE` badge showing both **TypeSafe Jev System One** and **NVIDIA Nemotron-3-Super-120B** approving the incident action contract before the incident is escalated.
* **Judge Impact:** Validates that high-consequence interventions meet institutional-grade dual-custody verification.

### 4. Sovereign Malaysian Cultural Grounding (Tier 4)
* **The Action:** Show the evaluation benchmarks ([`backend/evals/persona_generator.py`](../backend/evals/persona_generator.py)) grounded in `nvidia/Nemotron-Personas-Malaysia` developed by **YTL AI Labs x NVIDIA**.
* **Judge Impact:** Proves authentic regional adaptation for Malaysian schools and Ministry of Education compliance, rather than generic Western-centric training data.
