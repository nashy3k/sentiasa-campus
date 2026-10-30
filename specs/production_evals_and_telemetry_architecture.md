# Context Transfer Block: Production Agent Evals & Telemetry Architecture

## Project Name
SENTIASA: Production Evaluation, Observability & Deployment Stage

## Executive Summary
This block captures the testing and evaluation discipline established in Google Cloud Tech's Agent Clinic (featuring LangGraph, OpenTelemetry, OpenInference, and Vertex AI/Gemini Enterprise evals). It establishes the evaluation pipeline required for Project SENTIASA prior to GCP deployment, detailing how to use LangSmith for automated regression testing and blind-spot detection.

---

## 1. The Core Eval Philosophy: Beyond the "Vibe Check"
* **The Blind Spot Risk:** Manual spot-checks fail to detect subtle quality erosion (e.g., DocsHound's 33% doc quality failure).
* **Quantified Scorecards:** System prompts, graph topologies, and model swaps must be judged against automated numerical benchmarks, not subjective feelings.
* **Trace-Driven Debugging:** Failures must be diagnosed at the span level (distinguishing between bad retrieval, tool argument malformation, and model reasoning divergence).

---

## 2. Telemetry Standardization
* **OpenTelemetry (OTel):** Standard transport layer for distributed traces, timings, and spans.
* **OpenInference:** AI-specific semantic conventions mapping LLM inputs/outputs, prompt templates, tool calls, and agent trajectories across frameworks (LangGraph, ADK, CrewAI).
* **LangSmith Integration:** Native telemetry collector for LangGraph. Enables direct trace inspection and dataset-backed eval replay.

---

## 3. The 3-Tier Metric Suite for SENTIASA
1. **Deterministic Evaluators (Code-Based):**
   * Pydantic schema validation on incident dispatch outputs.
   * Execution latency thresholds (e.g., Triage must complete in < 2.0s).
   * Blast-Radius Gate: Verification that critical actions enforce `requires_operator_approval == True`.
2. **LLM-as-a-Judge Evaluators (Semantic Rubrics):**
   * **Grounding & Factuality:** Zero hallucination of safety hazards not present in sensor payloads.
   * **Actionability:** Are tactical recommendations unambiguous and compliant with SOP guidelines?
3. **Operational Metrics:**
   * Token cost and latency overhead per graph execution path.

---

## 4. Next Implementation Objectives (Pre-GCP Deployment)
* **Objective 1:** Enable `LANGCHAIN_TRACING_V2=true` in SENTIASA runtime to stream execution traces to LangSmith.
* **Objective 2:** Seed a 20-case golden evaluation dataset in LangSmith covering happy paths, duress alarms, telemetry timeouts, and prompt injection attempts.
* **Objective 3:** Run an automated evaluation pass using the $100 LangSmith credit allotment before initiating Google Cloud deployment.
