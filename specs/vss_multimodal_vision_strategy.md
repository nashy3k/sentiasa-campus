# Project SENTIASA: Multimodal Vision, CCTV & NVIDIA VSS Integration Strategy

> **Document ID:** `specs/vss_multimodal_vision_strategy.md`  
> **Topic:** Integration of NVIDIA Metropolis Video Search & Summarization (VSS), NVIDIA Cosmos, and Multimodal VLMs into Project SENTIASA  
> **Author:** Pair Programming Session (Antigravity × Lead Architect)  
> **Date:** September 25, 2026  
> **Status:** Approved Architectural Specification (Ready for Sprint 2 Implementation & Gemini Context Sync)

---

## 1. Executive Summary & Industry Grounding

### The Catalyst: NVIDIA Day Singapore & ITMAX System Berhad
At NVIDIA Day Singapore (September 2026), Malaysian smart city infrastructure leader **ITMAX System Berhad** (operator of networked video surveillance for DBKL / Kuala Lumpur City Hall, Putrajaya, and Johor) showcased its deployment of:
1. **NVIDIA Metropolis Blueprint for Video Search and Summarization (VSS)**
2. **NVIDIA Cosmos** open-world physical AI models for spatial-temporal reasoning
3. **"SamurAI Shogun"**: An AI agent layer powered by **NVIDIA Nemotron** open models allowing city operations teams to query video archives and live feeds conversationally, cutting incident lookup by >90%.

### Official Grounding: NVIDIA VSS Blueprint 3.3 (Sept 30, 2026)
Following the official release of **NVIDIA VSS Blueprint 3.3** ("Build a Visual AI Agent in Under 30 Minutes with NVIDIA VSS Blueprint 3.3"), SENTIASA directly adopts two breakthrough architectural capabilities:
* **Adaptive Efficient Video Sampling:** Employs localized motion-difference peak detection (`MotionKeyframeSampler`) to sample 3–5 high-signal keyframes rather than uniform FPS frames, slashing runtime VLM token usage by >80%.
* **Sovereign Physical & Reasoning Multi-Model Stack:** Employs NVIDIA Cosmos for physical scene anomaly detection and NVIDIA Nemotron for contextual incident summarization and reporting.

### The SENTIASA Positioning: Macro City OS vs. Micro Campus Perimeter
* **ITMAX + DBKL (Macro Scale):** Monitors arterial highways, public roads, traffic, and municipal infrastructure.
* **SENTIASA (Micro & Perimeter Edge):** Solves the critical blind spot where bullying, gang extortion (*pau duit*), weapon possession (*parang*), and hostel violence occur:
  * Boarding school hostels (SBP/MRSM), school rear gates, blind corners, and campus corridors.
  * Municipal cameras cannot perceive youth slang, private WhatsApp groups, or subtle relational intimidation.
* **Hackathon Impact (Best Apps & Agents / Local City Track):** SENTIASA adopts the **exact sovereign NVIDIA VSS + Cosmos + Nemotron paradigm**, extending it to campus and youth safety with TypeSafe Jev & SHACL deterministic guardrails.

---

## 2. Dual-Role Vision Engine Architecture

Rather than treating Vision-Language Models (VLMs) as 1-dimensional OCR transcribers, SENTIASA implements a **Dual-Role Vision Engine**:

```
                                  MULTI-MODAL INTAKE PLANE
                                             │
             ┌───────────────────────────────┴──────────────────────────────┐
             ▼                                                              ▼
    [WhatsApp Screenshots]                                     [Incident Video (.mp4) / Photo Burst]
             │                                                              │
             ▼ (Role 1: Document/Chat OCR)                                  ▼ (Motion Filter)
    Nebius MiniCPM-V-4_5                                         RTX 4070 Ti Keyframe Sampler (OpenCV)
             │                                                    (3-5 peak motion frames)
             ▼                                                              │
    Transcribed Chat Bubbles & Timestamps                                   ▼ (Role 2: Spatial/Physical Scene AI)
             │                                                   Nebius Cosmos3-Super-Reasoner / VLM
             │                                                              │
             ▼                                                              ▼
    [normalize_slang_node]                                        [VisualEvidenceReport (Pydantic)]
             │                                                              │
             └───────────────────────────────┬──────────────────────────────┘
                                             ▼
                             [Sensory Fusion Node (LangGraph)]
                                             │
                                             ▼
                             [Dual-Layer Jev Safety Firewall]
                                 ├── Normal: SHACL-FSM-01 (Monotonic Escalation)
                                 └── Critical Weapon: SHACL-EMERGENCY-BYPASS-01
                                             │
                                             ▼
                             [Cytoscape Canvas: EvidenceNode & Edge]
```

### Role 1: Document & Chat OCR Ingest
* **Model:** `openbmb/MiniCPM-V-4_5` via Nebius Token Factory.
* **Function:** Transcribes WhatsApp/Telegram screenshots, resolving timestamps, sender handles, and message text while preserving Malaysian youth slang.
* **Output:** Feeds directly into `normalize_slang_node` for dialect mapping.

### Role 2: Spatio-Temporal Physical Scene Reasoner
* **Model:** `nvidia/Cosmos3-Super-Reasoner` (or `Nemotron-Nano-V2-12b` / `openbmb/MiniCPM-V-4_5` fallback) via Nebius Token Factory.
* **Function:** Evaluates motion-sampled video frames or uploaded photos for physical threat signatures:
  * Presence of weapons (blades, *parang*, brass knuckles, blunt objects).
  * Physical aggression (shoving, cornering, swarming, posturing).
  * Scene classification (hostel room, staircase, rear gate, canteen, alley).

---

## 3. Video Modality Breakdown: CCTV vs. Social Media / Smartphone

Videos submitted to SENTIASA fall into two distinct physical profiles, unified under a single processing pipeline:

| Dimension | Campus CCTV Video | Social Media / Student Phone Clip |
| :--- | :--- | :--- |
| **Typical Ingest Source** | Direct export from school NVR/DVR or security room upload. | Whistleblower drop via WhatsApp bot, portal upload, or Tavily/Reddit post link. |
| **Visual Nature** | Wide-angle, fixed position, static background, low FPS (10–15 fps). | Vertical (9:16), shaky handheld camera, close-up on faces and victims. |
| **Audio Track** | **None** (Mute in 95% of campus installs due to privacy/noise). | **High-signal audio** (verbal threats, taunts, crying, impact thuds). |
| **Visual Focus** | **Spatial & Structural:** Crowd gathering, perimeter breach, brandishing weapons (*parang*, sticks), cornering. | **Interpersonal Violence:** Slaps, punching, hair-pulling, forced kneeling, humiliating rituals. |
| **Processing Path** | Motion Keyframes $\to$ Cosmos VLM. | Motion Keyframes $\to$ Cosmos VLM **PLUS** Audio Track $\to$ STT $\to$ Slang Normalizer. |

### Audio Ingestion Protocol
* For videos containing audio streams:
  1. `ffmpeg` / `pydub` extracts the audio channel (`audio.wav`).
  2. Local Whisper or Speech-To-Text transcribes colloquial dialogue.
  3. The transcribed text **feeds directly into `normalize_slang_node`**, seamlessly leveraging the existing Bahasa Rojak lexicon and Nemotron ontology engine without requiring a new audio architecture.

---

## 4. Strict Typed Contracts & Data Schemas

### A. Pydantic Contract: `VisualEvidenceReport`
Added to `backend/state.py`:
```python
from typing import List, Optional
from pydantic import BaseModel, Field

class VisualEvidenceReport(BaseModel):
    """Strict typed contract emitted by Role 2 Scene Reasoner (Cosmos/VLM)."""
    has_threat_object: bool = Field(
        description="Whether weapons (parang, knives, brass knuckles, blunt objects) are detected"
    )
    detected_objects: List[str] = Field(
        default_factory=list,
        description="List of detected object labels (e.g., 'machete_parang', 'metal_pipe', 'motorcycle_helmet')"
    )
    physical_aggression_detected: bool = Field(
        description="Whether active assault, posturing, cornering, or mob swarming is detected"
    )
    scene_type: str = Field(
        description="Physical location context: hostel_dorm, school_rear_gate, canteen, hallway, stairwell"
    )
    visual_severity_tier: int = Field(
        ge=1, le=5,
        description="Assigned visual severity tier: 1 (normal/peaceful) to 5 (active lethal violence)"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score of visual classification"
    )
    visual_description: List[str] = Field(
        default_factory=list,
        description="Factual, non-speculative descriptive markers observed in the frames"
    )
    keyframe_timestamps: List[float] = Field(
        default_factory=list,
        description="Video timestamps (seconds) corresponding to sampled peak-motion frames"
    )
```

### B. Knowledge Graph Schema: `EvidenceNode`
Added to `backend/state.py` and rendered in `components/CytoscapeCanvas.tsx`:
```python
class EvidenceNode(BaseModel):
    """Represents a physical media exhibit attached to an incident in Cytoscape."""
    evidence_id: str = Field(description="Unique identifier (e.g., EVI-CCTV-20260925-01)")
    media_type: str = Field(description="'CCTV_KEYFRAME', 'WHATSAPP_SCREENSHOT', 'PHONE_VIDEO'")
    source_uri: str = Field(description="Local asset path or GCS vault URL")
    sha256_hash: str = Field(description="Evidence Act 1950 Sec 90A forensic digest")
    threat_markers: List[str] = Field(default_factory=list)
    visual_severity: int = Field(ge=1, le=5)
```
* **Frontend Visualization:** Rendered in Cytoscape as a camera/exhibit icon with an amber border (pending review) or pulsing crimson halo (verified threat object). On-click opens a thumbnail preview and metadata drawer.

---

## 5. Deterministic Safety Plane: The Jev Emergency Bypass

In the existing architecture, invariant `SHACL-FSM-01` enforces monotonic step-by-step state escalation (`TIER_1_LOW` $\to$ `TIER_2_ELEVATED` $\to$ `TIER_3_CRITICAL`). 

To handle acute visual threats safely, we introduce:

$$\textbf{SHACL-EMERGENCY-BYPASS-01: } (\text{has\_threat\_object} = \text{True} \lor \text{visual\_severity\_tier} \ge 4) \land C_{\text{visual}} \ge 0.90 \implies \text{ALLOW JUMP TO TIER 3}$$

* **Safety Rationale:** If a CCTV keyframe verifies an active weapon (*parang*) or severe physical beating, waiting for ambiguous slang NLP or step-by-step FSM climbing creates dangerous operational latency. The visual verification acts as an authenticated physical override directly to on-campus security dispatch.

---

## 6. Resource & Credit Economics (Nebius & GCP)

### Nebius Token Factory ($150.00 Credits Available)
* **API Pricing:**
  * Nemotron text models: $\approx \$0.20$–$\$0.40$ per 1,000,000 tokens.
  * Vision models (MiniCPM-V / Cosmos): $\approx 1,200$ tokens per image frame ($\approx \$0.0005$ per frame).
* **Cost Per Multimodal Incident Triage:**
  * 3–5 motion keyframes: $\approx 5,000$ tokens.
  * Nemotron ontology extraction & summary: $\approx 1,000$ tokens.
  * Total cost per incident: **$\approx \$0.0025$ to $\$0.003$ (less than a third of one US cent)**.
* **Runway:** $150 credits provides over **45,000 complete multimodal triage runs**. The credits are currently vastly underutilized; running VLM vision triage puts trial credits to high-ROI use.

### Google Cloud Platform (RM 240 Accumulated + RM 40/month)
* **Zero Cloud GPU Costs:** Heavy model inference runs on Nebius Token Factory; video motion sampling runs locally on RTX 4070 Ti.
* **Cloud Run + Firestore Free Tier:** 
  * Cloud Run provides 2 million free requests/month.
  * Firestore provides 50,000 reads / 20,000 writes free daily.
* **Estimated GCP Spend:** $\le \text{RM } 10$ to $\text{RM } 15$ per month for hosting, well below the monthly RM 40 grant.

---

## 6.5 Edge Deployment Topology & Multi-Modal Ingestion Pipelines

### A. The CCTV Edge AI Box (Jetson Orin / Local RTX 4070 Ti Prototype)
* **Topology:** In production across 10,000+ Malaysian schools, we do **not** stream 100 raw 4K CCTV streams over slow campus bandwidth to a central cloud server.
* **Architecture:** 1 Edge AI Box per school (NVIDIA Jetson Orin Nano / Orin NX in the server room, prototyped by our local RTX 4070 Ti) connected to the local NVR/DVR.
* **Edge Filtering:** The box continuously runs `MotionKeyframeSampler`. It monitors local RTSP camera streams and discards the 95% of footage where nothing happens.
* **Cloud Burst:** Only when peak-motion intensity spikes occur does it extract 3–5 keyframes and transmit lightweight images ($\approx 150\text{ KB}$) to Nebius Token Factory for Cosmos/Nemotron reasoning.

### B. Social Media & Whistleblower Push Ingestion (WhatsApp / Telegram / Web Drop)
* **Ingest Protocol:** Whistleblower smartphone clips or social media links (Reddit / TikTok via Tavily) are received directly by the FastAPI backend on Cloud Run.
* **Forensic Storage:** Videos are persisted to a private GCS bucket vault with immediate SHA-256 cryptographic hashing (admissible under Evidence Act 1950 Section 90A).
* **Dual Track Extraction:**
  1. **Visual Track:** Sampled via `MotionKeyframeSampler` $\to$ VLM for physical scene reasoning (`VisualEvidenceReport`).
  2. **Audio Track:** Audio is stripped via `ffmpeg` $\to$ Speech-to-Text $\to$ fed into `normalize_slang_node` to decipher colloquial slang and verbal threats.

### C. Unified Cytoscape Graph Canvas Emission
**YES:** The CCTV pipeline emits directly to the Cytoscape graph canvas:
* Every sampled keyframe becomes an `EvidenceNode` with:
  * Red badge (`#dc2626`) for weapons/sexual violence, or Amber badge (`#f59e0b`) for elevated physical altercations.
  * Exact video timestamp, detected scene type, and SHA-256 fingerprint.
* When associated with an existing school threat, it generates a typed `CORROBORATES` edge to the `ThreatEventNode`, visually unifying CCTV evidence with WhatsApp and OSINT chatter on the interactive canvas.

---

## 7. Anti-Pattern Warning: Roboflow & Voxel51 vs. Frontier VLMs


| Dimension | Classical Custom CV (Roboflow / Voxel51) | Zero-Shot Frontier VLM (NVIDIA Cosmos / MiniCPM-V) |
| :--- | :--- | :--- |
| **Workflow** | Label 5,000 bounding boxes, train custom YOLOv8 model. | Pass sampled keyframes directly with prompt to Nebius Token Factory. |
| **Time to Ship** | 2–3 weeks of data cleaning, labeling, and training. | **15 minutes** (OpenAI-compatible client call). |
| **Context** | Dumb bounding box (`knife: 0.85`). Cannot tell if a knife is in a canteen kitchen or being used in a fight. | **Full contextual reasoning** (understands posture, environment, and social dynamics). |
| **Hackathon Fit** | Misses the core scoring criteria (Nebius open models & agentic harness). | **Directly showcases NVIDIA's flagship open models on Nebius.** |

* **Decision:** We do **not** use Roboflow or Voxel51. We rely on zero-shot VLM reasoning backed by a deterministic test suite containing 2–3 curated benchmark fixtures (`test_canteen_recess.jpg`, `test_hostel_scuffle.mp4`).

---

## 8. Gemini Context Transfer Block

*Copy and paste the block below into Gemini sessions to instantly ground future design or code discussions:*

```markdown
### Context Transfer Block: SENTIASA VSS & Multimodal VLM Architecture

- **Project:** SENTIASA (Deterministic Campus Safety & Threat Intelligence Engine)
- **Hackathon:** Nebius × NVIDIA Global AI Hackathon (Best Apps & Agents / Local City Track)
- **Grounding Reference:** Inspired by NVIDIA Day Singapore announcement of ITMAX System Berhad (DBKL smart city operator) deploying NVIDIA Cosmos + Metropolis Video Search & Summarization (VSS) Blueprint + Nemotron "SamurAI Shogun" agent layer.
- **Hardware & Cloud:** Local RTX 4070 Ti (OpenCV keyframe motion sampler) + Nebius Token Factory (OpenAI-compatible endpoint at https://api.tokenfactory.nebius.com/v1) + GCP Cloud Run.
- **Dual-Role VLM Split:**
  1. Role 1 (Chat OCR): `openbmb/MiniCPM-V-4_5` for WhatsApp screenshot timestamps and message bubbles -> feeds `normalize_slang_node`.
  2. Role 2 (Physical Scene Reasoner): `nvidia/Cosmos3-Super-Reasoner` (or fallback) for weapon/scuffle detection -> emits `VisualEvidenceReport`.
- **Audio Strategy:** Video audio tracks are stripped via ffmpeg and transcribed to text, feeding directly into existing Malaysian slang normalizer without dedicated audio models.
- **Safety Plane:** Jev Gatekeeper implements `SHACL-EMERGENCY-BYPASS-01` allowing verified visual weapons/assault to immediately escalate to Tier 3 Critical dispatch, bypassing slower text-based FSM steps.
- **Knowledge Graph:** Cytoscape.js renders `EvidenceNode` (camera/thumbnail exhibit) connected to `ThreatEventNode` via `EvidenceEdge`.
- **Specification Source:** `specs/vss_multimodal_vision_strategy.md` in repository.
```
