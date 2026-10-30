# RFC: Sovereign GEOINT & JKR-BIM Spatial Intelligence Engine

**Document ID:** `docs/geoint_and_bim_spatial_architecture_rfc.md`  
**Classification:** Foundational Architecture & Systems Specification  
**Project:** SENTIASA — Sovereign Multi-INT Campus Safety & Threat Correlation Engine  
**Standards Evaluated:** Palantir Maven Multi-INT (GEOINT), RustGIS / `geolibre-rust` WASM, JKR Standard Secondary School Archetypes, BIM (IFC / CityJSON), Evidence Act 1950 (Act 56) Section 90A  
**Date:** 13 October 2026  
**Status:** APPROVED ARCHITECTURAL RFC & IMPLEMENTATION ROADMAP  

---

## 1. Executive Summary & Strategic Rationale

Project SENTIASA currently operates three mature intelligence disciplines:
1. **HUMINT:** Whistleblower reports, student chats, counselor logs.
2. **OSINT / SIGINT:** Scraped web/forum chatter and news via Tavily & Exa.
3. **IMINT:** CCTV keyframe differencing, weapon bounding boxes, and visual exhibits via MiniCPM-V 4.5.

**The Missing Pillar:** **GEOINT (Geospatial Intelligence)** & **Indoor BIM (Building Information Modeling)**.

```
                           PALANTIR MAVEN MULTI-INT SENSORY FUSION
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
  [ HUMINT ]             [ OSINT ]                       [ IMINT ]              [ GEOINT / BIM ]
Whistleblower Report   Tavily Social Chatter          MiniCPM-V Vision       JKR Blueprint Geometries
(Slang & Polysemy)     (Reddit / Lowyat)              (Keyframe Evidence)    (CCTV FOV & Blindspots)
      │                      │                               │                      │
      └──────────────────────┼───────────────────────────────┴──────────────────────┘
                             ▼
              sensory_fusion_join_node (LangGraph)
                             │
              Deterministic Spatial Interceptor
           (geolibre-rust / WASM sub-15ms engine)
                • Point-in-Polygon containment
                • JKR Buffer & Blindspot evaluation
                • CCTV Wedge line-of-sight intersection
                             │
                             ▼
                    jev_gatekeeper_node
          (SHACL-SPATIAL-01 & SHACL-BIM-01 Gating)
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       [ APPROVED ]                  [ VETOED ]
    Sentinel-1 Battlespace HUD    Counselor HITL Review Queue
   (Cytoscape + RustGIS Layers)   (Tamper-evident GeoJSON Pack)
```

By integrating **RustGIS v0.1.0** and its underlying **`geolibre-rust`** compute engine with Malaysia's standard **JKR (Jabatan Kerja Raya) Secondary School architectural archetypes**, SENTIASA introduces **deterministic, sub-15ms spatial operations at zero cloud compute cost**.

---

## 2. First-Principles Spatial Engine: Why RustGIS / `geolibre-rust`

### The Problem with Conventional GIS
Standard enterprise stacks mandate **PostGIS / PostgreSQL** (\$80–\$200/mo) and heavy C++ runtimes (**GDAL, GEOS, PROJ**) that inflate Docker containers to 2.5 GB, slow cold-starts on Cloud Run to >10 seconds, and add operational fragility.

### The SENTIASA First-Principles Alternative
* **Zero Cloud Databases:** Campus boundaries and JKR architectural blocks are stored as lean static GeoJSON assets (`data/campuses/smk_sentiasa_jkr.geojson`, ~35 KB).
* **Pure Rust & WASM Engine:** `geolibre-rust` compiles into a standalone CLI binary and client-side WASM (`@bjorn3/browser_wasi_shim`), running spatial math in **< 10ms** on client browser GPUs or within our existing Cloud Run container.
* **Monthly Incremental Cost:** **RM 0.00 / $0.00**.

---

## 3. JKR Standard Secondary School Archetype & BIM Convergence

Almost all Malaysian national secondary schools follow standardized JKR public works architectural designs. SENTIASA bridges this physical archetype into digital geospatial intelligence:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               JKR STANDARD SECONDARY SCHOOL ARCHETYPE (JKR_STANDARD_SECONDARY)         │
├──────────────────┬─────────────────┬─────────────────┬─────────────────────────────────┤
│ JKR Block Code   │ Floor Levels    │ Operational Zone│ Threat Surface & Spatial Risk   │
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `BLOK_A_PENTADBIRAN`│ Level 1-2    │ Admin & Staff   │ Low. Principal, Counselor, Discipline.│
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `BLOK_B_AKADEMIK`│ Level 1-3       │ Classrooms      │ Medium. Aras 3 toilet blindspots.│
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `BLOK_C_MAKMAL`  │ Level 1-3       │ Science Labs    │ High. Chemical store, after-hours.│
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `BLOK_D_ASRAMA`  │ Level 1-4       │ Dormitories     │ Critical. Night roll-call, ragging.│
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `KANTIN_DEWAN`   │ Level 1         │ Dining & Assembly│ High student density transit zone.│
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `PADANG_SEKOLAH` │ Ground Exterior │ Sports & Track  │ Unmonitored tree lines & bleachers.│
├──────────────────┼─────────────────┼─────────────────┼─────────────────────────────────┤
│ `PINTU_BELAKANG` │ Perimeter Gate  │ Bicycle Shed    │ Critical. Extortion, weapon drop. │
└──────────────────┴─────────────────┴─────────────────┴─────────────────────────────────┘
```

---

## 4. Backend Pydantic Schema Extensions (`backend/state.py`)

To formally anchor spatial coordinates, JKR zones, and CCTV Field-of-View (FOV) calculations in LangGraph, we define the following models:

```python
# backend/state.py additions

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SpatialZoneType(str, Enum):
    PERIMETER_FENCE = "perimeter_fence"
    ACCESS_GATE = "access_gate"
    ACADEMIC_BLOCK = "academic_block"
    SCIENCE_LAB = "science_lab"
    DORMITORY_HOSTEL = "dormitory_hostel"
    SPORTS_FIELD = "sports_field"
    CANTEEN_HALL = "canteen_hall"
    SECLUDED_BLINDSPOT = "secluded_blindspot"

class CameraFOVModel(BaseModel):
    camera_id: str                      # e.g., "CCTV-04"
    name: str                           # e.g., "Pondok Basikal Pintu Belakang"
    coordinates: List[float]            # [longitude, latitude]
    azimuth_deg: float                  # Compass facing direction (0° - 360°)
    fov_angle_deg: float                # Horizontal viewing angle (e.g. 78.0°)
    range_meters: float                 # Effective detection range (e.g. 45.0m)
    floor_level: int = 1                # Vertical elevation level
    rtsp_stream_url: Optional[str] = None
    is_operational: bool = True

class JKRZoneFeature(BaseModel):
    zone_id: str                        # e.g., "ZONE-REAR-GATE"
    school_id: str                      # e.g., "school_smk_sentiasa"
    block_code: str                     # e.g., "PINTU BELAKANG"
    name: str                           # e.g., "Pintu Belakang & Pondok Basikal"
    zone_type: SpatialZoneType
    floor_level: int = 1                # 1 = Ground, 2 = Level 2, etc.
    risk_tier: int = Field(default=1, ge=1, le=5)
    threat_description: str
    is_indoor: bool = False
    is_restricted_area: bool = False
    polygon_coordinates: List[List[float]] # GeoJSON [[lng, lat], ...]
    cctv_coverage_ids: List[str] = Field(default_factory=list)

class ThreatEventNode(BaseModel):
    # Existing core fields...
    event_id: str
    incident_type: str
    severity_tier: int
    threat_tier: Any
    confidence_score: float
    raw_text: str
    context_summary: str
    extracted_slang_tokens: List[str]
    
    # GEOINT / BIM Schema Extensions:
    spatial_zone_id: Optional[str] = None
    block_code: Optional[str] = None
    floor_level: Optional[int] = 1
    coordinates: Optional[List[float]] = None # [longitude, latitude]
    is_spatial_blindspot: Optional[bool] = False
    cctv_in_range_ids: List[str] = Field(default_factory=list)
    distance_to_perimeter_meters: Optional[float] = None
    jkr_archetype_matched: Optional[str] = "JKR_STANDARD_SECONDARY"
```

---

## 5. Deterministic Spatial Invariant Rules (`JevOntologyFirewall`)

We introduce two mathematical safety rules to prevent hallucinated spatial actions:

### `SHACL-SPATIAL-01`: Perimeter Boundary Enforcement
* **Rule:** If an incident claims an imminent lethal altercation (`TIER_4_CRITICAL`), but its resolved spatial coordinates fall $> 300\text{m}$ outside the legal school boundary polygon, autonomous emergency on-campus dispatch is **vetoed**.
* **Reasoning:** Prevents out-of-jurisdiction false alarms from hijacking school wardens when the altercation is located far off-campus.

### `SHACL-BIM-01`: Unmonitored Blindspot Patrol Trigger
* **Rule:** If an incident is verified within a high-risk zone (e.g. `PINTU_BELAKANG` or `ZONE-TOILET-L3`) and `is_spatial_blindspot == True` (no active CCTV camera FOV covers the coordinates), the system automatically flags:
  `ActionVerb.DISPATCH_PHYSICAL_WARDEN_PATROL` (Priority 1).

---

## 6. Frontend Architectural Integration

The frontend upgrades from our current static SVG blueprint into an interactive **Dual-Viewport Battlespace**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  SENTINEL-1 BATTLESPACE HUD: DUAL-VIEWPORT OVERVIEW                    │
├────────────────────────────────────────────┬───────────────────────────────────────────┤
│ Viewport 1: Cytoscape.js Relational Graph  │ Viewport 2: RustGIS Tactical Spatial Map  │
│ (Sociological / Actor Link Analysis)       │ (Physical Terrain / CCTV Line-of-Sight)   │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│ • Who is threatening whom?                 │ • Real-time satellite basemap (CartoDB)   │
│ • Slang disambiguation halos               │ • JKR building block polygons (Blok A-D)  │
│ • Bitemporal decaying edges                │ • Live camera FOV cones (green = covered) │
│ • Click node -> Synced reticle snap on map │ • Red hatched zone: Camera Blindspots     │
└────────────────────────────────────────────┴───────────────────────────────────────────┘
```

### Key Frontend Components to Upgrade:
1. **`CampusBlueprintMinimap.tsx`**: Add a toggle button `[ SVG Schematic | Live GIS Spatial ]`.
2. **`TacticalEvidenceUplinkDrawer.tsx`**: Add camera slice tab: Clicking a camera cone instantly pulls the recorded keyframe burst for that specific time window ($T \pm 5\text{ min}$).
3. **Forensic GIS Dossier Exporter**: In the Counselor HITL review modal, add a button:  
   **"Export Section 90A Forensic GeoJSON Package (`.geojson`)"** for 1-click loading into RustGIS Desktop or Web.

---

## 7. Implementation Roadmap & Next Steps

| Phase | Milestone | Deliverables | Target Timeline |
| :---: | :--- | :--- | :--- |
| **Phase 1** | **Spatial Data Registry** | Create `data/campuses/smk_sentiasa_jkr.geojson` with real GPS-anchored JKR building blocks and 6 camera FOV cones. | Day 1 |
| **Phase 2** | **Backend Schema & Nodes** | Extend `backend/state.py` with `JKRZoneFeature` and implement `spatial_triage_node` using pure-Python ray-casting or `geolibre` CLI wrapper. | Day 2 |
| **Phase 3** | **Firewall Invariant Rules** | Integrate `SHACL-SPATIAL-01` and `SHACL-BIM-01` into `JevOntologyFirewall`. | Day 2 |
| **Phase 4** | **Frontend Map & Export** | Update `CampusBlueprintMinimap.tsx` and add Section 90A GeoJSON export to the counselor dossier drawer. | Day 3 |

---

## 8. Conclusion

Integrating GEOINT with JKR-BIM archetypes completes the **Palantir Maven Multi-INT vision (HUMINT + OSINT + IMINT + GEOINT)**. It requires zero cloud infrastructure costs, leverages our existing JKR blueprint concepts, and equips school authorities and police with defense-grade spatial awareness.
