# Context Transfer Block: End-to-End Agentic AI System Design Blueprint

## Project Name
SENTIASA & Enterprise Agent Systems Architecture

## Executive Summary
This transfer block synthesizes the research across Context Engineering (Write, Select, Compress, Isolate), Agent Harnesses, Loop vs. Graph Engineering, and Production System Design (Maddy Zhang's controls, compounding failure math, and blast-radius governance). It is structured as an authoritative architectural blueprint directly applicable to Project SENTIASA (Campus Safety Intelligence Engine) and extensible to future autonomous AI agent builds.

---

## 1. System Taxonomy: The Modern Agent Stack

$$\text{Production Agent} = \text{Model} + \text{Harness} + \text{Knowledge} + \text{Verification}$$

* **Model Layer (Cognition):** High-frequency, cost-effective inference for loops (e.g., Gemini Flash / Nemotron); frontier reasoning models reserved strictly for high-ambiguity judgment.
* **Harness Layer (Operating System):** Manages process lifecycles, sandbox execution, tool protocols (MCP/REST), rate limits, and trace-level observability.
* **Knowledge Layer (Context & Skills):** Curated domain packages (`SKILL.md`) loaded dynamically rather than statically stuffed into prompt headers.
* **Verification & Control Plane (Graph / Safety):** Deterministic state machines, typed schemas, and human-in-the-loop gates enforcing system reliability.

---

## 2. Context Engineering: The 4 Operational Primitives

To eliminate **context rot** and avoid paying token tax on redundant history, the harness applies four primitives across the 7-layer context stack (Instructions, Query, Tools, RAG, Short-Term Memory, Long-Term Memory, Schemas):

1. **Write (State Persistence):** Offload intermediate scratchpads, session trajectories, and raw tool outputs to external typed stores (Redis, Postgres, local JSON/state dicts) instead of keeping them in the prompt.
2. **Select (Information Filtering):** Dynamically inject only the tools and documentation slices relevant to the active node. Restrict the active tool surface to 3–5 tools per step to avoid tool confusion and hallucinated parameters.
3. **Compress (Token Compaction):** Summarize past conversation hops, extract semantic diffs from linter/test runs, and leverage prompt caching on invariant system instructions.
4. **Isolate (Domain Separation):** Enforce strict context boundaries between sub-agents and graph nodes. Sub-agents must not receive the entire parent trace, only their designated input slice.

---

## 3. Reliability Engineering & Compounding Failure Math

In an autonomous multi-step loop, total task reliability erodes with path length:

$$R_{\text{task}} = \prod_{i=1}^{n} P(\text{step}_i)$$

* **The Problem:** If an agent executes 8 sequential LLM reasoning steps with a 90% per-step success rate, the overall reliability drops to:
  $$0.90^8 \approx 43\%$$
* **The Architectural Fix:** Shift left by converting non-deterministic LLM hops into deterministic function nodes. Replacing 5 LLM planning steps with typed code functions reduces the probabilistic surface from $n=8$ to $n=3$, boosting reliability from $43\%$ to $\approx 73\%$.

---

## 4. Graph Engineering vs. Loop Engineering

* **Loop Engineering:** Single-agent ReAct cycles (`Reason → Act → Observe`). Best for bounded, open-ended tasks (e.g., deep research document scraping) where the topology cannot be anticipated.
* **Graph Engineering:** Explicit Directed Acyclic Graphs (DAGs) and state machines connecting agent nodes and function nodes:
  * **Function Nodes ($0 cost, 100% deterministic):** Run data extraction, format transformations, API fetch calls, and math.
  * **Agent Nodes:** Activated only when unstructured synthesis, qualitative assessment, or reasoning is required.
  * **Fan-Out Node:** Parallel asynchronous execution of independent tasks.
  * **Join Node:** Synchronization barrier that aggregates outputs into a typed dictionary without invoking an LLM.
  * **Deterministic Router:** Directs flow via closed boolean conditions (`if/else`) in code, bypassing non-deterministic LLM classifiers.

---

## 5. Production Security & Blast-Radius Governance

1. **Tool Classification:**
   * **Read Tools (Low Risk):** Idempotent queries (e.g., sensor telemetry, campus map lookup, log reads). Autonomous execution permitted.
   * **Write Tools (High Risk):** State-mutating or physical actions (e.g., triggering emergency alerts, dispatching officers, modifying access control).
2. **Execution Pattern:**
   $$\text{Model Proposes} \longrightarrow \text{Code Validates (Pydantic / Schema)} \longrightarrow \text{Policy / Human Approves} \longrightarrow \text{Harness Executes}$$
3. **Prompt Injection Defense:** Treat all external user submissions, telemetry strings, and retrieved RAG passages as untrusted data inputs, isolated from system instructions.
4. **Observability & Tracing:** Log full execution traces per run (model version, prompt hash, tool inputs/outputs, latency, token spend) to support regression evals.
