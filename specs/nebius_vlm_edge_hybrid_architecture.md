# Project SENTIASA: Nebius VLM & Edge-Cloud Hybrid Vision Architecture

> **Document ID:** `specs/nebius_vlm_edge_hybrid_architecture.md`  
> **Topic:** Practical Implementation Blueprint for Multimodal Video & CCTV Threat Triage using Nebius Token Factory, Local Edge Motion Keyframing, and Knowledge Graph Search  
> **Author:** Project SENTIASA Architecture Team  
> **Date:** September 30, 2026  
> **Status:** APPROVED & ACTIVE SPECIFICATION  

---

## 1. Executive Summary & The Core Architectural Insight

When deploying Video AI in safety-critical campus environments, teams often fall into two fatal traps:
1. **The RTSP / Continuous Streaming Trap:** Trying to pipe 24/7 high-bandwidth RTSP video streams across WAN to cloud APIs, resulting in extreme cloud egress costs, high latency, and network instability.
2. **The Upstream Dependency Trap:** Halting project development because an open cloud provider has not yet exposed a proprietary spatial video tokenizer or video-native container endpoint.

**SENTIASA’s Solution: The Edge-Cloud Hybrid Pattern.**  
By running lightweight motion peak extraction locally on campus edge hardware (e.g., local gateway or local RTX 4070 Ti) and routing only high-signal keyframe bursts to **Nebius Token Factory**, we eliminate bandwidth waste, stay 100% resilient to cloud endpoint limitations, and achieve sub-2-second threat classification for under **$0.003 per incident**.

```
                                SENTIASA EDGE-CLOUD HYBRID FLOW
                                
    ┌────────────────────────────────────────────────────────┐
    │ CAMPUS EDGE (Local Gateway / RTX 4070 Ti)              │
    │                                                        │
    │  [CCTV / Phone Video (.mp4)]                           │
    │               │                                        │
    │               ▼                                        │
    │  [OpenCV Motion Peak Sampler]                          │
    │  (Calculates frame difference spikes in <200ms)        │
    │               │                                        │
    │               ▼                                        │
    │  [3 to 5 Critical Keyframes (JPEG/Base64)]             │
    └───────────────────────┬────────────────────────────────┘
                            │ (Low-bandwidth HTTPS Burst)
                            ▼
    ┌────────────────────────────────────────────────────────┐
    │ CLOUD REASONING (Nebius Token Factory)                 │
    │                                                        │
    │  POST https://api.tokenfactory.nebius.com/v1           │
    │  Model: openbmb/MiniCPM-V-4_5 (or Cosmos hot-swap)     │
    │               │                                        │
    │               ▼                                        │
    │  [Pydantic Contract: VisualEvidenceReport]             │
    │  - has_threat_object: bool (parang, knives, batons)    │
    │  - physical_aggression_detected: bool                  │
    │  - scene_type: str (rear_gate, hostel_staircase)       │
    │  - visual_severity_tier: int (1 to 5)                  │
    └───────────────────────┬────────────────────────────────┘
                            │
                            ▼
    ┌────────────────────────────────────────────────────────┐
    │ DETERMINISTIC SAFETY & KNOWLEDGE GRAPH (LangGraph)     │
    │                                                        │
    │  [SHACL-EMERGENCY-BYPASS-01 Gate]                      │
    │  (Weapon Verified -> Immediate Tier 3 Dispatch)        │
    │               │                                        │
    │               ▼                                        │
    │  [Cytoscape.js Knowledge Graph: EvidenceNode & Edge]   │
    │  (Interactive thumbnails, conversational search via   │
    │   NVIDIA Nemotron-3_5-Lightning)                       │
    └────────────────────────────────────────────────────────┘
```

---

## 2. Solving Upstream Gaps: The 4 Strategic Workarounds

| Potential Cloud API Gap | Traditional Failure Mode | SENTIASA Deterministic Architecture |
| :--- | :--- | :--- |
| **1. No Native Video Ingest API** (Only image URLs accepted) | Stalled waiting for video container streaming endpoints. | **Local OpenCV Motion Sampler:** Samples 3–5 peak-motion frames on edge, base64 encodes them, and sends a single multi-image completion payload. |
| **2. NVIDIA Cosmos Not Yet Live on Endpoint** | Delayed waiting for Cosmos NIM rollout. | **Zero-Shot MiniCPM-V 4.5 Prompting:** Uses verified live `openbmb/MiniCPM-V-4_5` on Nebius with strict Pydantic system prompting; config hot-swappable to Cosmos via `.env`. |
| **3. No Multimodal Vector Embeddings on `/v1/embeddings`** | Stuck trying to build complex video vector RAG databases. | **Palantir Triad Knowledge Graph Correlation:** Converts visual detections into typed `EvidenceNode` entities linked to `ThreatEventNode`. Nemotron queries graph attributes for conversational video search. |
| **4. Lack of Server-Side JSON Schema Enforcement** | Runtime schema drift or conversational model chatter. | **Pydantic Validation & Fallback Parser:** Validates JSON locally; regex strips markdown fences; Jev firewall intercepts invalid payloads. |

---

## 3. Component Deep Dive

### A. Local Edge Motion Peak Sampler (`backend/nodes/vision_sampler.py`)
* **Technology:** Python `cv2` (OpenCV) with hardware acceleration.
* **Mechanism:**
  1. Computes absolute difference between consecutive grayscale frames: $D(t) = |F(t) - F(t-1)|$.
  2. Applies Gaussian blur and thresholding to filter sensor noise.
  3. Detects motion energy spikes corresponding to rapid movement (students running, shoving, falling, or brandishing objects).
  4. Extracts 3 to 5 peak keyframes with their exact video timestamps ($t_1, t_2, \dots$).
* **Performance:** Executes in $\le 250\text{ms}$ on a 30-second 1080p clip on local RTX hardware.

### B. Nebius VLM Scene Perception (`backend/nodes/vision_nodes.py`)
* **Endpoint:** `https://api.tokenfactory.nebius.com/v1/chat/completions`
* **Model Configuration:**
  ```python
  NEBIUS_VISION_MODEL = os.getenv("NEBIUS_VISION_MODEL", "openbmb/MiniCPM-V-4_5")
  ```
* **Payload Structure:**
  ```json
  {
    "model": "openbmb/MiniCPM-V-4_5",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Analyze these CCTV keyframes for school safety threats. Output strictly valid JSON matching the VisualEvidenceReport schema."},
          {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,...frame_1..."}},
          {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,...frame_2..."}},
          {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,...frame_3..."}}
        ]
      }
    ],
    "temperature": 0.1,
    "max_tokens": 500
  }
  ```

### C. Strict Pydantic Contract: `VisualEvidenceReport`
Defined in `backend/state.py`:
```python
from typing import List, Optional
from pydantic import BaseModel, Field

class VisualEvidenceReport(BaseModel):
    """Strict typed contract emitted by Nebius VLM scene classification."""
    has_threat_object: bool = Field(
        description="Whether weapons (parang, knives, brass knuckles, blunt objects) are detected"
    )
    detected_objects: List[str] = Field(
        default_factory=list,
        description="Labels of detected physical objects (e.g. 'parang', 'metal_rod', 'helmet')"
    )
    physical_aggression_detected: bool = Field(
        description="Whether active brawl, pushing, cornering, or mob swarming is visible"
    )
    scene_type: str = Field(
        description="Location classification: 'hostel_dorm', 'school_rear_gate', 'hallway', 'canteen'"
    )
    visual_severity_tier: int = Field(
        ge=1, le=5,
        description="Assigned visual severity: 1 (peaceful) to 5 (active lethal violence)"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Visual classification confidence score"
    )
    visual_description: List[str] = Field(
        default_factory=list,
        description="Factual, non-speculative descriptive markers"
    )
    keyframe_timestamps: List[float] = Field(
        default_factory=list,
        description="Source video timestamps (seconds) of analyzed frames"
    )
```

### D. The Deterministic Emergency Bypass (`SHACL-EMERGENCY-BYPASS-01`)
* **The Rule:** Under normal operations, invariant `SHACL-FSM-01` forces step-by-step tier escalation (`TIER_1_LOW` $\to$ `TIER_2_ELEVATED` $\to$ `TIER_3_CRITICAL`).
* **The Override:**
  $$\text{IF } (\text{has\_threat\_object} = \text{True} \lor \text{visual\_severity\_tier} \ge 4) \land \text{confidence} \ge 0.90 \implies \text{INSTANT TIER 3 ESCALATION}$$
* **Operational Value:** If a parang is brandished behind the hostel, the system dispatches security immediately without waiting for ambiguous slang text parsing.

---

## 4. Knowledge Graph Video Search: The "SamurAI Shogun" Alternative

Instead of requiring expensive visual embedding models for Video RAG, SENTIASA maps visual evidence into the **Palantir Triad Knowledge Graph**:

1. **Graph Entity Injection:**
   * Emits an `EvidenceNode`:
     * `id`: `evi_cctv_reargate_01`
     * `media_type`: `CCTV_BURST`
     * `scene_type`: `school_rear_gate`
     * `threat_markers`: `["parang", "cornering"]`
     * `severity`: `4`
   * Emits an `EvidenceEdge` connecting `EvidenceNode` $\to$ `ThreatEventNode` $\to$ `SchoolNode`.
2. **Conversational Video Search:**
   * School Counselor asks: *"Show me all video evidence from the rear gate involving weapons after 10 PM."*
   * **NVIDIA Nemotron-3_5-Lightning** translates this natural language request into a Cytoscape graph filter (`scene_type == 'school_rear_gate' && threat_markers.includes('parang')`).
   * The UI highlights the exact nodes and pulls up the high-resolution keyframe thumbnails in the side drawer.

---

## 5. Token & Infrastructure Economics

* **Nebius Token Usage per Video Triage:**
  * 3 keyframes $\times \approx 1,200$ tokens/frame $= 3,600$ tokens.
  * Nemotron graph extraction & summary $= 1,000$ tokens.
  * Total tokens $= 4,600$ tokens ($\approx \$0.0025$ USD).
* **Credit Safety:**
  * **$150 Nebius Credit Balance:** Supports **$>45,000$ complete multimodal video triage cycles**.
  * **Local Compute:** Zero cloud GPU rental costs; motion filtering runs on local hardware.
  * **GCP Hosting:** Cloud Run and Firestore operate within permanent free tiers ($<\text{RM } 15$/month).

---

## 6. Hackathon Pitch Positioning

When presenting to judges:
> *"While traditional smart city deployments stream continuous heavy video to the cloud, Project SENTIASA implements an **Edge-Cloud Hybrid Architecture** directly inspired by the NVIDIA Metropolis VSS blueprint. 
> 
> By running lightweight motion peak filtering at the campus edge and offloading multi-frame visual reasoning to **Nebius Token Factory** (`openbmb/MiniCPM-V-4_5` and `nvidia/Nemotron-3_5-Lightning`), we achieve sub-2-second threat detection for under **$0.003 per incident**. 
> 
> Our architecture provides zero vendor lock-in, integrates with Malaysian Evidence Act 1950 forensic standards, and is hot-swappable to NVIDIA Cosmos NIMs via a single environment variable."*
