"""
Deterministic incident triage StateGraph for Project SENTIASA.
Connects dialect normalization, Nemotron ontology extraction, Tavily OSINT,
Jev Gatekeeper invariant enforcement, Cytoscape graph sync, and HITL review queue routing.
"""

from typing import Any, Dict, Optional

from langgraph.graph import END, START, StateGraph

from backend.nodes import (
    alert_dispatch_node,
    cytoscape_sync_node,
    extract_ontology_node,
    hitl_review_queue_node,
    jev_gatekeeper_node,
    jev_validation_router,
    log_audit_node,
    normalize_slang_node,
    osint_discovery_node,
    route_by_jev,
    sensory_fusion_join_node,
    video_triage_node,
)
from backend.state import GraphState


def build_triage_graph() -> StateGraph:
    """
    Constructs the deterministic LangGraph workflow with VSS 3.3 Sensory Fusion & Concurrency:
    
    Fan-Out from START:
      |-- video_triage_node      (Role 2 scene reasoner & motion keyframe sampler)
      |-- normalize_slang_node   (Vernacular dialect normalization & polysemy disambiguation)
      |-- osint_discovery_node   (Dual-Funnel Tavily scoped search + Exa neural highlights)
      
    Deterministic Fan-In Join:
      |--> sensory_fusion_join_node (Zero-LLM Pydantic Barrier: FusedSensoryPayload)
      
    Cognitive & Safety Plane:
      |--> extract_ontology_node -> jev_gatekeeper_node
      |--> [conditional routing: route_by_jev]
           |-- "passed" -> cytoscape_sync_node -> alert_dispatch_node -> log_audit_node -> END
           |-- "vetoed" -> hitl_review_queue_node                     -> log_audit_node -> END
    """
    workflow = StateGraph(GraphState)

    # Register workflow nodes
    workflow.add_node("video_triage_node", video_triage_node)
    workflow.add_node("normalize_slang_node", normalize_slang_node)
    workflow.add_node("osint_discovery_node", osint_discovery_node)
    workflow.add_node("sensory_fusion_join_node", sensory_fusion_join_node)
    workflow.add_node("extract_ontology_node", extract_ontology_node)
    workflow.add_node("jev_gatekeeper_node", jev_gatekeeper_node)
    workflow.add_node("cytoscape_sync_node", cytoscape_sync_node)
    workflow.add_node("alert_dispatch_node", alert_dispatch_node)
    workflow.add_node("hitl_review_queue_node", hitl_review_queue_node)
    workflow.add_node("log_audit_node", log_audit_node)

    # Concurrent Fan-Out at START
    workflow.add_edge(START, "video_triage_node")
    workflow.add_edge(START, "normalize_slang_node")
    workflow.add_edge(START, "osint_discovery_node")

    # Deterministic Fan-In Join Barrier
    workflow.add_edge("video_triage_node", "sensory_fusion_join_node")
    workflow.add_edge("normalize_slang_node", "sensory_fusion_join_node")
    workflow.add_edge("osint_discovery_node", "sensory_fusion_join_node")

    # Downstream cognitive reasoning and safety gatekeeper
    workflow.add_edge("sensory_fusion_join_node", "extract_ontology_node")
    workflow.add_edge("extract_ontology_node", "jev_gatekeeper_node")

    # Conditional branching based on Jev Gatekeeper evaluation
    workflow.add_conditional_edges(
        "jev_gatekeeper_node",
        route_by_jev,
        {
            "passed": "cytoscape_sync_node",
            "vetoed": "hitl_review_queue_node",
        },
    )

    # Passed execution branch
    workflow.add_edge("cytoscape_sync_node", "alert_dispatch_node")
    workflow.add_edge("alert_dispatch_node", "log_audit_node")

    # Vetoed HITL branch
    workflow.add_edge("hitl_review_queue_node", "log_audit_node")

    # Terminal edge
    workflow.add_edge("log_audit_node", END)

    return workflow


# Compiled state graph application
triage_app = build_triage_graph().compile()


def run_triage(
    raw_text: str = "",
    video_path: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> GraphState:
    """
    Convenience runner executing a single triage request through the compiled LangGraph engine.
    Supports both text submissions and video surveillance keyframe sampling.
    """
    initial_state: GraphState = {
        "raw_text": raw_text,
        "video_path": video_path,
        "metadata": metadata or {},
        "audit_log": [],
        "hitl_queue": [],
        "cytoscape_elements": [],
    }
    result = triage_app.invoke(initial_state)
    return result


if __name__ == "__main__":
    print("=== Testing Project SENTIASA Jev-Gated Triage Graph ===")

    # Test Case 1: High Severity with Valid Elevated Pre-state (Passes Jev)
    valid_critical = "Budak form 4 bawa parang nak belasah budak batch bawah."
    print(f"\n[Test 1] Input: {valid_critical}")
    res_valid = run_triage(
        valid_critical,
        {
            "school_name": "SMK Sri Hartamas",
            "reporter_alias": "Whistleblower_X",
            "mock_external_apis": True,
        }
    )
    print(f"Jev Passed: {res_valid.get('jev_passed')}")
    print(f"Status: {res_valid.get('status')}")
    print(f"Cytoscape Elements Generated: {len(res_valid.get('cytoscape_elements', []))}")
    print(f"Counselor Alert: {res_valid.get('counselor_alert') is not None}")

    # Test Case 2: Illegal Jump from Tier 1 -> Tier 3 (Vetoed by Jev to HITL Queue)
    print(f"\n[Test 2] Illegal State Jump Veto Simulation")
    res_veto = run_triage(
        valid_critical,
        {
            "school_name": "SMK Sri Hartamas",
            "current_tier": "LOW",  # Illegal jump to CRITICAL!
            "mock_external_apis": True,
        }
    )
    print(f"Jev Passed: {res_veto.get('jev_passed')}")
    print(f"Status: {res_veto.get('status')}")
    print(f"HITL Enqueued: {len(res_veto.get('hitl_queue', [])) > 0}")
    if res_veto.get("hitl_queue"):
        print(f"Veto Reason: {res_veto['hitl_queue'][0].get('veto_reason')}")
