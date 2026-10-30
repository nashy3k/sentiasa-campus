# Context Transfer Block: Project SENTIASA

## Project Identity
- **Name:** Project SENTIASA (Sentinel for Intelligent Assessment & Safety)
- **Concept:** Continuous, proactive campus safety intelligence & triage ontology.
- **Target Track:** Nebius × NVIDIA Global AI Hackathon (Best Apps & Agents / Best Use of Tavily / Local City Track)

## Architectural Blueprint
1. **Frontend / UI:** Next.js 16 App Router (Turbopack), Tailwind CSS, Cytoscape.js canvas with non-destructive `cy.batch()` delta syncing, Left-of-Bang temporal scrubbing bar, JKR standard Malaysian school architectural blueprint & GPS minimap, Palantir Maven Smart System (MSS) defense styling, and CopilotKit HUD terminal.
2. **Backend Engine:** Deterministic StateGraph in Python 3.12+ via UV, Pydantic v2 domain schemas (`PersonaNode`, `ThreatEventNode`, `SchoolNode`, `RelationalTriple`), 5-tier RBAC (`SUPER_ADMIN`, `HEAD_COUNSELOR`, `DISCIPLINE_MASTER`, `CAMPUS_SECURITY`, `STUDENT_REPORTER`), and fail-closed Jev Ontology Firewall (`SHACL-GOV-01`).
3. **Hero Model Inference (Nebius Token Factory):** `nvidia/Nemotron-3_5-Lightning` (Extraction & structured schema enforcement) + `openbmb/MiniCPM-V-4_5` (WhatsApp screenshot OCR & visual altercation detection) + OpenCV local motion keyframe sampler.
4. **Active Discovery (Tavily + Exa APIs):** Targeted OSINT queries across Malaysian student discussion nodes (`r/malaysiauni`, `r/bolehland`, Lowyat Kopitiam, regional news) with bi-temporal freshness checking and verbatim quote highlighting.
5. **Regional Normalization Layer & Linguistic Authority:** Dialect adapter decoding Malaysian youth slang (*Bahasa Rojak*, Manglish, Borneo, Tamil, CJK, Jawi) paired with an asynchronous YTL AI ILMU Shadow Judge Agent continuously auditing slang nuance preservation and threat calibration.
6. **Storage & Infrastructure (GCP Architecture):**
   - **GCP Cloud Run:** Containerized serverless FastAPI backend (`sentiasa-backend-staging`) and Next.js frontend (`sentiasa-frontend-staging`) deployed in `us-central1` with dynamic environment injection.
   - **Google Cloud Storage (GCS):** `gs://sentiasa-telemetry-vault-prod` partitioned into `/whatsapp/`, `/cctv/`, and `/derivatives/` (face-blurred/anonymized) with time-limited signed URLs.
   - **Google Cloud Firestore (Native Mode):** Operational document store partitioned by `/tenants/{tenant_id}/...` for multi-campus isolation, real-time reactive sync, and persistent HITL governance queue.
   - **Google BigQuery:** Immutable append-only audit trail and ILMU continuous evaluation telemetry vault.

## Malaysian Legal Grounding & Evidentiary Standards
1. **Evidence Act 1950 (Akta Keterangan 1950) - Section 90A, 90B, 90C:**
   - Regulates the admissibility of computer-generated documents and electronic records in Malaysian courts.
   - Requires proof of continuous system integrity, verifiable clock sources, SHA-256 media hashing at time of ingest, and automated Section 90A(2) Certificate of Integrity generation for PPD / court submission.
2. **Communications and Multimedia Act 1998 (CMA 1998) - Section 233 & Section 249:**
   - Enforces digital forensics chain of custody for threatening communications, extortion (*ugut*), cyberbullying, and menacing content. Requires capturing device hardware signatures, client user-agents, and transport routing hashes.
3. **Personal Data Protection Act 2010 (PDPA 2010) & Minor Protection:**
   - Enforces the Linus Torvalds separation of concerns: `IngestProvenanceEnvelope` (containing salted IP hashes and hardware fingerprints) is kept strictly isolated in secure backend audit tables and never exposed on public Cytoscape UI canvases. Student PII is deterministically hashed or pseudonymous. Dedicated `StudentIntakePortal.tsx` provides zero-knowledge isolation for student reporters.
