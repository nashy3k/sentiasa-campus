"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

import cytoscape, { type Core, type ElementDefinition } from "cytoscape";

import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Info, Zap, X, ArrowRight, HelpCircle, ExternalLink, FileText, MapPin, Focus } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

import GraphLegendModal from "./GraphLegendModal";

export type GraphElements = ElementDefinition[];

interface GraphCanvasProps {
  elements: GraphElements;
  onNodeSelect?: (nodeId: string) => void;
  onOpenDossier?: (nodeId: string) => void;
  onFocusMap?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  focusTrigger?: number;
  filterMinSeverity?: number;
  timelineAllowedIds?: Set<string> | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function GraphCanvas({
  elements,
  onNodeSelect,
  onOpenDossier,
  onFocusMap,
  selectedNodeId,

  focusTrigger,

  filterMinSeverity = 1,

  timelineAllowedIds = null,

  isFullscreen = false,

  onToggleFullscreen,

}: GraphCanvasProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  const cyRef = useRef<Core | null>(null);

  const onNodeSelectRef = useRef(onNodeSelect);
  const onOpenDossierRef = useRef(onOpenDossier);

  const [isLoaded, setIsLoaded] = useState(false);

  const [initError, setInitError] = useState<string | null>(null);

  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);

  const [isTraceMode, setIsTraceMode] = useState(false);

  const [traceOriginId, setTraceOriginId] = useState<string>("");

  const [traceTargetId, setTraceTargetId] = useState<string>("");

  const [activePath, setActivePath] = useState<{

    originId: string;

    destId: string;

    steps: Array<{ id: string; label: string; type: "node" | "edge" }>;

    distance: number;

  } | null>(null);

  const debounceLayoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shortest Path Investigation State

  const dashboard = useDashboard();

  const traceRequest = dashboard?.traceRequest;

  const setTraceRequest = dashboard?.setTraceRequest;

  // Layer Filtering & Campus Threat Index (CTI) State
  const [selectedLayer, setSelectedLayer] = useState<"ALL" | "HUMINT" | "VISINT" | "OSINT" | "GEOINT">("ALL");

  const ctiData = useMemo(() => {

    let maxSeverity = 0;

    for (const el of elements) {

      const sev = el.data?.severity_tier || el.data?.visual_severity;

      if (typeof sev === "number" && sev > maxSeverity) {

        maxSeverity = sev;

      }

    }

    if (maxSeverity >= 5) {
      return {
        score: 88,
        status: "CRITICAL — URGENT",
        color: "text-rose-400 border-rose-500/40 bg-rose-950/50",
        dotColor: "bg-rose-500",
      };
    }

    if (maxSeverity >= 4) {

      return {

        score: 74,

        status: "ELEVATED — WATCH",

        color: "text-amber-400 border-amber-500/40 bg-amber-950/50",

        dotColor: "bg-amber-500",

      };

    }

    if (maxSeverity >= 3) {

      return {

        score: 52,

        status: "MONITORED",

        color: "text-yellow-400 border-yellow-500/40 bg-yellow-950/50",

        dotColor: "bg-yellow-500",

      };

    }

    return {

      score: 28,

      status: "NOMINAL",

      color: "text-emerald-400 border-emerald-500/40 bg-emerald-950/50",

      dotColor: "bg-emerald-500",

    };

  }, [elements]);

  const handleLayerSelect = useCallback(
    (layer: "ALL" | "HUMINT" | "VISINT" | "OSINT" | "GEOINT") => {
      setSelectedLayer(layer);
      const cy = cyRef.current;
      if (!cy) return;

      cy.batch(() => {
        cy.elements().removeClass("dimmed");
        if (layer === "ALL") return;

        let modalityNodes: any = cy.collection();

        if (layer === "HUMINT") {
          // Strictly Human Intelligence: human student personas, whistleblowers, and informants
          modalityNodes = cy.nodes().filter((n) => {
            const d = n.data();
            const isCctv =
              d.type === "evidence" ||
              d.type === "EvidenceNode" ||
              d.type === "camera" ||
              d.media_type === "CCTV_KEYFRAME" ||
              d.media_type === "VIDEO" ||
              typeof d.visual_severity === "number" ||
              Boolean(d.id && d.id.toLowerCase().includes("cctv")) ||
              Boolean(d.label && d.label.toLowerCase().includes("cctv"));
            const isOsint =
              d.type === "EntityTransformNode" ||
              Boolean(d.is_osint) ||
              d.source_type === "dual_funnel_osint" ||
              Boolean(d.label?.includes("OSINT")) ||
              d.type === "osint_entity";
            const isSchool = d.type === "SchoolNode" || Boolean(d.id && d.id.startsWith("school-"));
            return (d.type === "PersonaNode" || d.type === "student_actor") && !isCctv && !isOsint && !isSchool;
          });
        } else if (layer === "VISINT") {
          // Strictly Visual Intelligence: video evidence keyframes, exhibits, and optical sensor detections
          modalityNodes = cy.nodes().filter((n) => {
            const d = n.data();
            return (
              d.type === "evidence" ||
              d.type === "EvidenceNode" ||
              d.type === "camera" ||
              d.media_type === "CCTV_KEYFRAME" ||
              d.media_type === "VIDEO" ||
              typeof d.visual_severity === "number" ||
              Boolean(d.has_threat_object) ||
              Boolean(d.id && d.id.toLowerCase().includes("cctv")) ||
              Boolean(d.label && d.label.toLowerCase().includes("cctv")) ||
              Boolean(d.id && d.id.toLowerCase().includes("video"))
            );
          });
        } else if (layer === "OSINT") {
          // Strictly Open-Source Intelligence: Social Media / Forum / Web Transform Pivot nodes
          modalityNodes = cy.nodes().filter((n) => {
            const d = n.data();
            const isSchool = d.type === "SchoolNode" || Boolean(d.id && d.id.startsWith("school-"));
            const isPersona = d.type === "PersonaNode" || d.type === "student_actor";
            const isVisual =
              d.type === "evidence" ||
              d.type === "EvidenceNode" ||
              d.media_type === "VIDEO" ||
              d.media_type === "CCTV_KEYFRAME";
            if (isSchool || isPersona || isVisual) return false;

            return (
              d.type === "EntityTransformNode" ||
              Boolean(d.is_osint) ||
              d.source_type === "dual_funnel_osint" ||
              Boolean(d.label?.includes("OSINT")) ||
              d.type === "osint_entity" ||
              Boolean(d.source_url)
            );
          });
        } else if (layer === "GEOINT") {
          // Strictly Geospatial & Architectural Intelligence: School loci, campus perimeters, and physical location pivots
          modalityNodes = cy.nodes().filter((n) => {
            const d = n.data();
            const isSchool = d.type === "SchoolNode" || Boolean(d.id && d.id.startsWith("school-"));
            const hasSpatialCoords = Boolean(d.spatial_coordinates || d.matched_zone_name || d.matched_zone_id || d.is_blind_spot);
            const isLocationPivot = Boolean(
              d.type === "EntityTransformNode" &&
              !d.source_url &&
              (d.id?.includes("blok") ||
                d.id?.includes("asrama") ||
                d.id?.includes("shed") ||
                d.id?.includes("gate") ||
                d.id?.includes("luar") ||
                d.label?.toLowerCase().includes("block") ||
                d.label?.toLowerCase().includes("pondok") ||
                d.label?.toLowerCase().includes("hostel") ||
                d.label?.toLowerCase().includes("belakang") ||
                d.label?.toLowerCase().includes("seksyen"))
            );
            return isSchool || hasSpatialCoords || isLocationPivot;
          });
        }

        // Unified Multi-INT Invariant:
        // Spotlight the modality evidence nodes + the specific ThreatEventNodes (red boxes) corroborated by them + direct connecting edges
        if (modalityNodes.length > 0) {
          const connectedThreats = modalityNodes.neighborhood("node[type = 'ThreatEventNode']");
          const activeNodes = modalityNodes.union(connectedThreats);

          // Strictly keep edges where both endpoints belong to the active discipline set
          const activeEdges = cy.edges().filter((edge: any) => {
            return activeNodes.contains(edge.source()) && activeNodes.contains(edge.target());
          });

          const activeElements = activeNodes.union(activeEdges);

          cy.elements().addClass("dimmed");
          activeElements.removeClass("dimmed");
        } else {
          cy.nodes().addClass("dimmed");
          cy.edges().addClass("dimmed");
        }
      });
    },
    []
  );

  useEffect(() => {

    onNodeSelectRef.current = onNodeSelect;
    onOpenDossierRef.current = onOpenDossier;

  }, [onNodeSelect, onOpenDossier]);

  // Initial Cytoscape Canvas Instantiation with resilient DOM readiness

  useEffect(() => {

    let active = true;

    let cyInstance: Core | null = null;

    let resizeObserver: ResizeObserver | null = null;

    const initCy = () => {

      if (!active) return;

      if (!containerRef.current) {

        // Retry next animation frame if DOM node is still being attached

        requestAnimationFrame(initCy);

        return;

      }

      try {

        const cyFactory = typeof cytoscape === "function" ? cytoscape : (cytoscape as any).default;

        if (!cyFactory) {

          throw new Error("Cytoscape library factory could not be resolved.");

        }

        // Clone elements to prevent in-place mutation by Cytoscape

        const clonedElements: ElementDefinition[] = JSON.parse(JSON.stringify(elements));

        // Defensive validation: Collect valid node IDs and discard orphaned edges to prevent fatal Cytoscape init crash

        const availableNodeIds = new Set<string>();

        for (const el of clonedElements) {

          if (el?.data?.id && !el.data.source && !el.data.target) {

            availableNodeIds.add(String(el.data.id));

          }

        }

        const sanitizedElements = clonedElements.filter((el) => {

          if (el?.data?.source || el?.data?.target) {

            const hasSource = el.data.source && availableNodeIds.has(String(el.data.source));

            const hasTarget = el.data.target && availableNodeIds.has(String(el.data.target));

            if (!hasSource || !hasTarget) {

              console.warn(

                `[GraphCanvas] Discarded edge '${el.data.id}' due to missing node (source: '${el.data.source}', target: '${el.data.target}')`

              );

              return false;

            }

          }

          return Boolean(el?.data?.id);

        });

        cyInstance = cyFactory({

          container: containerRef.current,

          elements: sanitizedElements,

          layout: {

            name: "cose",

            animate: false,

            padding: 40,

            idealEdgeLength: 110,

            nodeRepulsion: 6000,

            randomize: false,

          },

          style: [

            {

              selector: "core",

              style: { "background-color": "#070b12" },

            },

            {

              selector: "node",

              style: {

                label: "data(label)",

                color: "#f4f4f5",

                "font-size": "11px",

                "font-family": "monospace",

                "font-weight": 600,

                "text-wrap": "wrap",

                "text-max-width": "120px",

                "text-valign": "bottom",

                "text-margin-y": 8,

                width: 46,

                height: 46,

                "border-width": 2,

                "border-color": "#27272a",

              },

            },

            {

              selector: 'node[type = "PersonaNode"]',

              style: {

                shape: "ellipse",

                "background-color": "#f59e0b",

                label: "data(alias)",

                width: 48,

                height: 48,

                "border-color": "#b45309",

              },

            },

            {

              // Tactical Uplink Mobile HUMINT Whistleblower: Protected Emerald Green styling
              selector: 'node[type = "PersonaNode"][is_whistleblower = "true"], node[type = "PersonaNode"][is_humint = "true"], node[alias ^= "WHISTLEBLOWER"], node[alias *= "Whistleblower"], node[alias *= "whistleblower"], node[alias *= "Warden"], node[alias *= "warden"], node[alias *= "Patrol"], node[alias *= "patrol"], node[alias *= "Prefect"], node[alias *= "prefect"]',

              style: {

                shape: "ellipse",

                "background-color": "#059669",

                "border-color": "#34d399",

                "border-width": 3,

                label: "data(alias)",

                color: "#ecfdf5",

                width: 52,

                height: 52,

                "text-background-color": "#064e3b",

                "text-background-opacity": 0.9,

                "text-background-padding": "2px",

              },

            },

            {

              selector: 'node[type = "ThreatEventNode"]',

              style: {

                shape: "round-rectangle",

                "background-color": "#ef4444",

                width: 80,

                height: 48,

                label: "data(threatLabel)",

                "border-color": "#b91c1c",

              },

            },

            {

              // Multi-INT Corroboration styling: double-border & golden/cyan glow

              selector: 'node[type = "ThreatEventNode"][multi_int_corroborated = "true"]',

              style: {

                "border-width": 4,

                "border-color": "#f59e0b",

                "border-style": "double",

                width: 90,

                height: 52,

              },

            },

            {

              selector: 'node[type = "SchoolNode"]',

              style: {

                shape: "diamond",

                "background-color": "#3b82f6",

                width: 56,

                height: 56,

                label: "data(name)",

                "border-color": "#1d4ed8",

              },

            },

            {

              selector: 'node[type = "evidence"], node[type = "EvidenceNode"], node[media_type = "CCTV_KEYFRAME"]',

              style: {

                shape: "hexagon",

                "background-color": "#06b6d4",

                width: 54,

                height: 54,

                label: "data(label)",

                color: "#67e8f9",

                "font-size": "10px",

                "border-width": 2.5,

                "border-color": "#0891b2",

              },

            },

            {

              selector: 'node[type = "EntityTransformNode"]',

              style: {

                "background-color": "#8b5cf6",

                "border-color": "#c4b5fd",

                "border-width": 2.5,

                shape: "round-rectangle",

                color: "#ede9fe",

                label: "data(label)",

                "font-size": "10px",

                "font-weight": "bold",

                "text-background-color": "#1e1b4b",

                "text-background-opacity": 0.85,

                "text-background-padding": "2px",

              },

            },

            {

              selector: 'edge[label = "TRANSFORM_CORROBORATES"], edge[relation = "corroborates_institutional_locus"]',

              style: {

                "line-color": "#8b5cf6",

                "target-arrow-color": "#a78bfa",

                width: 2.5,

                "line-style": "dashed",

                opacity: 0.95,

              },

            },

            {

              selector: 'node[color]',

              style: {

                "background-color": "data(color)",

              },

            },

            {

              selector: 'node[type = "evidence"][has_threat_object = "true"], node[type = "evidence"][visual_severity >= 4]',

              style: {

                "background-color": "#dc2626",

                "border-color": "#ef4444",

                "border-width": 3,

                color: "#fca5a5",

              },

            },

            {

              selector: "edge",

              style: {

                width: 2,

                "line-style": "dashed",

                "line-color": "#64748b",

                "target-arrow-color": "#94a3b8",

                "target-arrow-shape": "triangle",

                "curve-style": "bezier",

                opacity: 0.8,

                label: "data(label)",

                color: "#94a3b8",

                "font-size": "9px",

                "font-family": "monospace",

                "text-rotation": "autorotate",

                "text-background-color": "#070b12",

                "text-background-opacity": 0.85,

                "text-background-padding": "2px",

              },

            },

            {

              selector: 'edge[label = "CORROBORATES"]',

              style: {

                "line-color": "#06b6d4",

                "target-arrow-color": "#06b6d4",

                width: 2.5,

                "line-style": "solid",

                opacity: 0.95,

              },

            },

            {

              selector: 'edge[type = "EvidenceEdge"]',

              style: {

                "line-color": "#94a3b8",

                "target-arrow-color": "#94a3b8",

              },

            },

            {

              // Bitemporal decay styling (Utopia / Helix pattern)

              selector: 'edge[freshness = "fresh"]',

              style: {

                "line-style": "solid",

                width: 2.5,

                opacity: 0.95,

                "line-color": "#38bdf8",

                "target-arrow-color": "#38bdf8",

              },

            },

            {

              selector: 'edge[freshness = "stale"]',

              style: {

                "line-style": "dashed",

                width: 1.5,

                opacity: 0.35,

                "line-color": "#475569",

                "target-arrow-color": "#475569",

              },

            },

            {

              selector: ".selected",

              style: {

                "border-width": 4,

                "border-color": "#38bdf8",

                "overlay-color": "#06b6d4",

                "overlay-opacity": 0.35,

                "overlay-padding": 12,

              },

            },

            {

              selector: ".pulse-flash",

              style: {

                "border-width": 6,

                "border-color": "#f43f5e",

                "overlay-color": "#f43f5e",

                "overlay-opacity": 0.5,

                "overlay-padding": 18,

              },

            },

            {

              selector: "node.path-highlight",

              style: {

                "border-width": 5,

                "border-color": "#f59e0b",

                "overlay-color": "#f59e0b",

                "overlay-opacity": 0.45,

                "overlay-padding": 12,

                "z-index": 1000,

              },

            },

            {

              selector: "edge.path-highlight",

              style: {

                width: 5,

                "line-color": "#f59e0b",

                "target-arrow-color": "#f59e0b",

                opacity: 1,

                "line-style": "solid",

                "z-index": 999,

              },

            },

            {

              selector: ".dimmed",

              style: {

                opacity: 0.12,

                "text-opacity": 0.1,

              },

            },

            {

              selector: ".filtered-out",

              style: {

                opacity: 0.08,

                "text-opacity": 0,

                events: "no",

              },

            },

            {

              selector: ".temporal-future",

              style: {

                opacity: 0,

                "text-opacity": 0,

                events: "no",

              },

            },

          ],

          userZoomingEnabled: true,

          userPanningEnabled: true,

          boxSelectionEnabled: false,

        });

        cyRef.current = cyInstance;

        cyInstance.on("tap taphold", "node", (event: any) => {

          const node = event.target;

          const id = node.id();

          setSelectedNodeData(node.data());

          onNodeSelectRef.current?.(id);

        });

        cyInstance.on("dbltap dblclick", "node", (event: any) => {

          const node = event.target;

          const id = node.id();

          onOpenDossierRef.current?.(id);

        });

        cyInstance.on("tap", (event: any) => {

          if (event.target === cyInstance) {

            // tapped background

            setSelectedNodeData(null);

            onNodeSelectRef.current?.("");

          }

        });

        // Ensure canvas layout settles and fits container

        cyInstance.on("layoutstop", () => {
          if (!active || !cyInstance) return;
          try {
            cyInstance.resize();
            cyInstance.fit(undefined, 65);
          } catch {
            // ignore fit edge cases
          }
          setIsLoaded(true);
        });

        // Safe immediate/RAF resize & fit
        requestAnimationFrame(() => {
          if (!active || !cyInstance) return;
          try {
            cyInstance.resize();
            cyInstance.fit(undefined, 65);
            if (selectedNodeId) {
              const selectedNode = cyInstance.$id(selectedNodeId);
              if (selectedNode.length) {
                selectedNode.addClass("selected");
                setSelectedNodeData(selectedNode.data());
                cyInstance.center(selectedNode);
              }
            }
          } catch {
            // ignore
          }
          setIsLoaded(true);
        });

        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (cyRef.current) {
              cyRef.current.resize();
              cyRef.current.fit(undefined, 65);
            }
          });
          resizeObserver.observe(containerRef.current);
        }

        setIsLoaded(true);

        setInitError(null);

      } catch (err: any) {

        console.error("Cytoscape initialization error:", err);

        setInitError(err?.message || "Failed to initialize Cytoscape canvas");

      }

    };

    const timer = setTimeout(initCy, 30);

    return () => {

      active = false;

      clearTimeout(timer);

      if (resizeObserver) {

        resizeObserver.disconnect();

      }

      if (cyInstance) {

        cyInstance.destroy();

      }

      cyRef.current = null;

    };

    // Initialize once on mount

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  // Smooth Dynamic Graph Element Synchronization (Without Reloading) with Batched Auto-Fit

  useEffect(() => {

    const cy = cyRef.current;

    if (!cy || !isLoaded) return;

    let topologyChanged = false;

    cy.batch(() => {

      const incomingIds = new Set(elements.map((el) => el.data?.id).filter(Boolean) as string[]);

      const existingIds = new Set(cy.elements().map((el) => el.id()));

      // 1. Remove elements that are no longer in elements prop (e.g. on demo reset or purge)

      const elementsToRemove = cy.elements().filter((el) => !incomingIds.has(el.id()));

      if (elementsToRemove.length > 0) {

        cy.remove(elementsToRemove);

        topologyChanged = true;

      }

      // Collect all node IDs present in the graph or incoming in this batch

      const allKnownNodeIds = new Set<string>();

      cy.nodes().forEach((n) => {

        allKnownNodeIds.add(n.id());

      });

      for (const el of elements) {

        if (el?.data?.id && !el.data.source && !el.data.target) {

          allKnownNodeIds.add(String(el.data.id));

        }

      }

      const elementsToAdd: ElementDefinition[] = [];

      for (const el of elements) {

        const id = el.data?.id;

        if (!id) continue;

        if (existingIds.has(id)) {

          // Update existing element data

          const existingEl = cy.$id(id);

          if (existingEl.length) {

            existingEl.data(el.data);

          }

        } else {

          // If this is an edge, verify both endpoints exist

          if (el.data?.source || el.data?.target) {

            const hasSource = el.data.source && allKnownNodeIds.has(String(el.data.source));

            const hasTarget = el.data.target && allKnownNodeIds.has(String(el.data.target));

            if (!hasSource || !hasTarget) {

              continue;

            }

          }

          // Brand new node or verified edge

          elementsToAdd.push(JSON.parse(JSON.stringify(el)));

        }

      }

      if (elementsToAdd.length > 0) {

        cy.add(elementsToAdd);

        topologyChanged = true;

      }

    });

    // 2. Batched Auto-Resize & Fit View: Debounce rapid consecutive node arrivals into 1 smooth glide

    if (topologyChanged) {

      if (debounceLayoutRef.current) {

        clearTimeout(debounceLayoutRef.current);

      }

      debounceLayoutRef.current = setTimeout(() => {

        if (!cyRef.current) return;

        const activeCy = cyRef.current;

        const layout = activeCy.layout({

          name: "cose",

          animate: true,

          animationDuration: 550,

          padding: 48,

          idealEdgeLength: 120,

          nodeRepulsion: 8500,

          nodeOverlap: 20,

          gravity: 0.25,

          numIter: 350,

          initialTemp: 200,

          coolingFactor: 0.95,

          minTemp: 1.0,

          randomize: false,

        });

        layout.on("layoutstop", () => {

          try {

            activeCy.resize();

            activeCy.animate({

              fit: {

                eles: activeCy.elements(":visible"),

                padding: 44,

              },

              duration: 400,

            });

          } catch {

            // ignore fit edge cases

          }

        });

        layout.run();

      }, 300); // 300ms batching window

    }

  }, [elements, isLoaded]);

  const prevVisibleNodeIdsRef = useRef<Set<string>>(new Set());

  // Unified Reactive Subgraph Filter Effect: Radar Sweep Severity + Left-of-Bang Temporal Visibility

  useEffect(() => {

    const cy = cyRef.current;

    if (!cy || !isLoaded) return;

    cy.batch(() => {

      // 1. Identify ThreatEventNodes and their temporal + severity status

      const threatNodes = cy.nodes().filter((n) => {

        const d = n.data();

        return (

          d.type === "ThreatEventNode" ||

          d.type === "threat_event" ||

          (d.id && String(d.id).startsWith("incident-")) ||

          (d.id && String(d.id).startsWith("threat_"))

        );

      });

      const newlyVisibleIds: string[] = [];

      const currentVisibleIds = new Set<string>();

      // First pass: ThreatEventNodes

      threatNodes.forEach((n) => {

        const id = n.id();

        const d = n.data();

        const tier = Number(d.severity_tier || d.visual_severity || 1);

        // Temporal check (null or undefined means live/all allowed)

        const isTemporalFuture = timelineAllowedIds ? !timelineAllowedIds.has(id) : false;

        if (isTemporalFuture) {

          n.addClass("temporal-future");

          n.removeClass("filtered-out");

        } else {

          n.removeClass("temporal-future");

          // Severity check

          const isSeverityFiltered = filterMinSeverity > 1 ? tier < filterMinSeverity : false;

          if (isSeverityFiltered) {

            n.addClass("filtered-out");

          } else {

            n.removeClass("filtered-out");

            currentVisibleIds.add(id);

            if (prevVisibleNodeIdsRef.current.size > 0 && !prevVisibleNodeIdsRef.current.has(id)) {

              newlyVisibleIds.push(id);

            }

          }

        }

      });

      // Second pass: Peripheral nodes (EvidenceNode, PersonaNode, OSINT)

      const peripheralNodes = cy.nodes().not(threatNodes).filter((n) => {

        const d = n.data();

        return d.type !== "SchoolNode" && d.type !== "school";

      });

      peripheralNodes.forEach((n) => {

        const id = n.id();

        // Check connected threat event neighbors

        const connectedThreats = n.neighborhood("node").filter((nbr) => {

          const d = nbr.data();

          return (

            d.type === "ThreatEventNode" ||

            d.type === "threat_event" ||

            (d.id && String(d.id).startsWith("incident-")) ||

            (d.id && String(d.id).startsWith("threat_"))

          );

        });

        if (connectedThreats.length > 0) {

          // If all connected threats are in temporal future, peripheral is temporal future

          const allThreatsFuture = connectedThreats.every((t: any) => t.hasClass("temporal-future"));

          if (allThreatsFuture && (!timelineAllowedIds || !timelineAllowedIds.has(id))) {

            n.addClass("temporal-future");

            n.removeClass("filtered-out");

            return;

          }

          n.removeClass("temporal-future");

          // If all connected threats are filtered-out by severity, peripheral is filtered out

          const allThreatsFiltered = connectedThreats.every((t: any) => t.hasClass("filtered-out") || t.hasClass("temporal-future"));

          if (allThreatsFiltered) {

            n.addClass("filtered-out");

            return;

          }

          n.removeClass("filtered-out");

          currentVisibleIds.add(id);

          if (prevVisibleNodeIdsRef.current.size > 0 && !prevVisibleNodeIdsRef.current.has(id)) {

            newlyVisibleIds.push(id);

          }

        } else {

          // Autonomous entity (e.g. standalone Persona without active incident link)

          const isTemporalFuture = timelineAllowedIds ? !timelineAllowedIds.has(id) : false;

          if (isTemporalFuture) {

            n.addClass("temporal-future");

            n.removeClass("filtered-out");

          } else {

            n.removeClass("temporal-future");

            n.removeClass("filtered-out");

            currentVisibleIds.add(id);

          }

        }

      });

      // Third pass: School nodes (always present loci)

      const schoolNodes = cy.nodes().filter((n) => {

        const d = n.data();

        return d.type === "SchoolNode" || d.type === "school";

      });

      schoolNodes.forEach((s) => {

        s.removeClass("temporal-future");

        s.removeClass("filtered-out");

        currentVisibleIds.add(s.id());

      });

      // Fourth pass: Edges

      cy.edges().forEach((edge) => {

        const src = edge.source();

        const tgt = edge.target();

        if (src.hasClass("temporal-future") || tgt.hasClass("temporal-future")) {

          edge.addClass("temporal-future");

          edge.removeClass("filtered-out");

        } else if (src.hasClass("filtered-out") || tgt.hasClass("filtered-out")) {

          edge.addClass("filtered-out");

          edge.removeClass("temporal-future");

        } else {

          edge.removeClass("temporal-future");

          edge.removeClass("filtered-out");

        }

      });

      // Trigger subtle pulse-flash on newly revealed nodes

      if (newlyVisibleIds.length > 0) {

        newlyVisibleIds.forEach((nid) => {

          const el = cy.$id(nid);

          if (el.length) {

            el.addClass("pulse-flash");

            setTimeout(() => {

              if (cyRef.current) {

                cyRef.current.$id(nid).removeClass("pulse-flash");

              }

            }, 900);

          }

        });

      }

      prevVisibleNodeIdsRef.current = currentVisibleIds;

    });

  }, [filterMinSeverity, timelineAllowedIds, elements, isLoaded]);

  // Deselect if active node becomes filtered out or hidden in future epoch

  useEffect(() => {

    if (selectedNodeId && cyRef.current) {

      const node = cyRef.current.$id(selectedNodeId);

      if (node.length && (node.hasClass("filtered-out") || node.hasClass("temporal-future"))) {

        setSelectedNodeData(null);

      }

    }

  }, [filterMinSeverity, timelineAllowedIds, selectedNodeId]);

  // Selected Node Zoom & Center with Neighborhood Context & Pulse Flash

  useEffect(() => {

    const cy = cyRef.current;

    if (!cy || !isLoaded) return;

    cy.nodes().removeClass("selected");

    cy.nodes().removeClass("pulse-flash");

    if (!selectedNodeId) {

      setSelectedNodeData(null);

      return;

    }

    let selectedNode: any = cy.$id(selectedNodeId);

    if (!selectedNode.length) {

      // Fuzzy search across node attributes: id, event_id, incident_id, label, or substring match

      const matched = cy.nodes().filter((n: any) => {

        const d = n.data();

        if (!d) return false;

        return (

          d.id === selectedNodeId ||

          d.event_id === selectedNodeId ||

          d.incident_id === selectedNodeId ||

          (d.id && selectedNodeId.includes(d.id)) ||

          (selectedNodeId && d.id.includes(selectedNodeId)) ||

          (d.label && d.label.toLowerCase().includes(selectedNodeId.toLowerCase()))

        );

      });

      if (matched.length) {

        selectedNode = matched.slice(0, 1);

      }

    }

    if (selectedNode.length) {

      // If node was hidden by a scope or tier filter, unhide it and its immediate triad upon explicit focus
      if (selectedNode.hasClass("filtered-out")) {
        selectedNode.removeClass("filtered-out");
        selectedNode.closedNeighborhood().removeClass("filtered-out");
      }
      if (selectedNode.hasClass("temporal-future")) {
        selectedNode.removeClass("temporal-future");
      }

      selectedNode.addClass("selected");

      setSelectedNodeData(selectedNode.data());

      const neighborhood = selectedNode.closedNeighborhood();

      cy.stop();

      const elesToFit = neighborhood.length > 1 ? neighborhood : selectedNode;

      const bb = elesToFit.boundingBox();

      const w = cy.width() || 600;

      const h = cy.height() || 400;

      const padding = 120;

      const naturalZoom = Math.min((w - padding * 2) / (bb.w || 60), (h - padding * 2) / (bb.h || 60));

      // Clamp zoom to comfortable bounds (never over-zoom beyond 1.15x, and at least 0.7x)

      const targetZoom = Math.min(Math.max(naturalZoom, 0.7), 1.15);

      const pos = selectedNode.position();

      const hasPos = pos && typeof pos.x === "number" && !isNaN(pos.x) && !isNaN(pos.y);

      if (hasPos) {

        const targetPan = {

          x: w / 2 - pos.x * targetZoom,

          y: h / 2 - pos.y * targetZoom,

        };

        cy.animate(

          {

            pan: targetPan,

            zoom: targetZoom,

          },

          {

            duration: 650,

            easing: "ease-out-cubic",

          }

        );

      } else {

        cy.animate(

          {

            fit: { eles: elesToFit, padding: 90 },

          },

          {

            duration: 650,

            easing: "ease-out-cubic",

          }

        );

      }

      try {

        selectedNode.flashClass("pulse-flash", 1500);

      } catch {

        // fallback

      }

    }

  }, [selectedNodeId, focusTrigger, isLoaded]);

  const availableNodes = useMemo(() => {

    return elements

      .filter((el) => !el.data.source && !el.data.target)

      .map((el) => ({

        id: el.data.id,

        label: el.data.alias || el.data.name || el.data.threatLabel || el.data.id,

        type: el.data.type || "node",

      }));

  }, [elements]);

  // Shortest Path Link Analysis (Dijkstra Traversal)

  const executeShortestPath = useCallback((originId: string, destId: string) => {

    const cy = cyRef.current;

    if (!cy) return;

    const src = cy.$id(originId);

    const tgt = cy.$id(destId);

    if (src.empty() || tgt.empty()) return;

    const dijkstra = cy.elements().dijkstra({

      root: src,

      directed: false,

    });

    const pathToTarget = dijkstra.pathTo(tgt);

    if (pathToTarget && pathToTarget.length > 0) {

      // Focus Protocol: Dim all non-pertinent entities to 12% opacity

      cy.elements().removeClass("path-highlight").removeClass("dimmed");

      cy.elements().not(pathToTarget).addClass("dimmed");

      pathToTarget.addClass("path-highlight");

      const steps: Array<{ id: string; label: string; type: "node" | "edge" }> = [];

      pathToTarget.forEach((ele: any) => {

        const data = ele.data();

        steps.push({

          id: ele.id(),

          label: data.label || data.alias || data.name || data.threatLabel || ele.id(),

          type: ele.isNode() ? "node" : "edge",

        });

      });

      setActivePath({

        originId,

        destId,

        steps,

        distance: dijkstra.distanceTo(tgt),

      });

      setTraceOriginId(originId);

      setTraceTargetId(destId);

      try {

        cy.animate(

          { fit: { eles: pathToTarget, padding: 80 } },

          { duration: 600, easing: "ease-out-cubic" }

        );

      } catch {}

    } else {
      alert(`No investigation connection path found between '${originId}' and '${destId}'.`);
    }
  }, []);

  const handleClearPath = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.elements().removeClass("path-highlight").removeClass("dimmed");
    }
    setActivePath(null);
    setIsTraceMode(false);
    setTraceOriginId("");
    setTraceTargetId("");
    if (setTraceRequest) setTraceRequest(null);
  }, [setTraceRequest]);

  // Listen to external trace requests (from CopilotKit or Threat Watchlist)
  useEffect(() => {
    if (traceRequest && traceRequest.sourceId && traceRequest.targetId && isLoaded) {
      executeShortestPath(traceRequest.sourceId, traceRequest.targetId);
    }
  }, [traceRequest, isLoaded, executeShortestPath]);

  // Controls
  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  const handleFit = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.fit(undefined, 65);
  }, []);

  const handleResetLayout = useCallback(() => {

    const cy = cyRef.current;

    if (cy) {

      const layout = cy.layout({

        name: "cose",

        animate: true,

        animationDuration: 450,

        padding: 40,

        idealEdgeLength: 110,

        nodeRepulsion: 6000,

      });

      layout.run();

    }

  }, []);

  return (

    <div className="relative h-full h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-[#070b12]">

      {/* Loading Indicator */}

      {!isLoaded && !initError && (

        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center font-mono text-xs text-slate-400 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300">

          <span className="inline-block h-2 w-2 mr-2 animate-ping rounded-full bg-cyan-400" />

          Initializing Cytoscape Canvas...

        </div>

      )}

      {/* Error Message */}

      {initError && (

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 font-mono text-xs text-red-400 bg-zinc-950/90">

          <span className="font-bold">Canvas Initialization Error</span>

          <span className="mt-1 text-zinc-400 text-[11px] max-w-sm text-center">{initError}</span>

        </div>

      )}

      {/* LEFT VERTICAL RAIL: Risk Score Badge & Multi-INT Filter Stack */}
      <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2 pointer-events-none">
        {/* Risk Badge */}
        <div
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs backdrop-blur-md shadow-lg transition pointer-events-auto ${ctiData.color}`}
          title="Campus Safety Risk Index (CTI)"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ctiData.dotColor}`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${ctiData.dotColor}`}
            />
          </span>
          <span className="font-bold tracking-wider">Risk: {ctiData.score}/100</span>
          <span className="hidden sm:inline text-[10px] opacity-90 uppercase tracking-wide">
            [{ctiData.status}]
          </span>
        </div>

        {/* Vertical Multi-INT Discipline Filter Rail */}
        <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-md text-[11px] font-mono shadow-md gap-0.5 pointer-events-auto">
          <span className="text-[9px] text-slate-500 uppercase px-1.5 py-0.5 font-bold tracking-wider">
            Discipline
          </span>
          {(["ALL", "HUMINT", "VISINT", "OSINT", "GEOINT"] as const).map((layer) => {
            const active = selectedLayer === layer;
            return (
              <button
                key={layer}
                type="button"
                onClick={() => handleLayerSelect(layer)}
                className={`px-2 py-1 rounded-md transition text-left flex items-center gap-1.5 ${
                  active
                    ? layer === "OSINT"
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/50 font-bold"
                      : layer === "VISINT"
                      ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 font-bold"
                      : layer === "HUMINT"
                      ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 font-bold"
                      : layer === "GEOINT"
                      ? "bg-blue-600/30 text-blue-300 border border-blue-500/50 font-bold"
                      : "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title={
                  layer === "ALL"
                    ? "Show all multi-int intelligence nodes"
                    : layer === "HUMINT"
                    ? "Focus on student personas and whistleblower nodes"
                    : layer === "VISINT"
                    ? "Focus on video keyframes and optical evidence exhibits"
                    : layer === "OSINT"
                    ? "Focus on social media OSINT pivot transforms"
                    : "Focus on geospatial campus loci, physical school perimeters, and zone anchors"
                }
              >
                {layer === "ALL"
                  ? "All"
                  : layer === "HUMINT"
                  ? "🟢 HUMINT"
                  : layer === "VISINT"
                  ? "🔷 VISINT"
                  : layer === "OSINT"
                  ? "🟣 OSINT"
                  : "📍 GEOINT"}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT VERTICAL RAIL: Controls Dock & Compact Legend */}
      <div className="absolute top-3 right-3 bottom-3 z-20 flex flex-col justify-between items-end pointer-events-none">
        {/* Top-Right Vertical Icon Toolbar */}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-xl backdrop-blur-md shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95 transition"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95 transition"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <div className="h-px w-5 bg-slate-700 my-0.5" />

          <button
            type="button"
            onClick={handleFit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-cyan-300 hover:bg-slate-800 active:scale-95 transition"
            title="Reset View to Fit All Entities"
            aria-label="Reset View"
          >
            <Focus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleResetLayout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-95 transition"
            title="Re-run CoSE Physics Layout"
            aria-label="Re-layout Graph"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <div className="h-px w-5 bg-slate-700 my-0.5" />

          <button
            type="button"
            onClick={() => {
              const nextMode = !isTraceMode;
              setIsTraceMode(nextMode);
              if (nextMode && selectedNodeId && !traceOriginId) {
                setTraceOriginId(selectedNodeId);
              }
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              isTraceMode || activePath
                ? "bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold"
                : "text-amber-400/90 hover:bg-slate-800 hover:text-amber-300"
            }`}
            title="Trace Shortest Investigation Link (Dijkstra Analysis)"
            aria-label="Trace Link"
          >
            <Zap className="h-4 w-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={() => setIsLegendModalOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-300 hover:bg-amber-950/60 active:scale-95 transition"
            title="Open Graph Legend & Incident Anatomy Guide"
            aria-label="Graph Legend"
          >
            <HelpCircle className="h-4 w-4 text-amber-400" />
          </button>

          {onToggleFullscreen && (
            <>
              <div className="h-px w-5 bg-slate-700 my-0.5" />
              <button
                type="button"
                onClick={onToggleFullscreen}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isFullscreen
                    ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold hover:bg-rose-900/40"
                    : "text-cyan-400/90 hover:bg-slate-800 hover:text-cyan-300"
                }`}
                title={isFullscreen ? "Exit Full Theater View (Esc)" : "Expand to Full Theater View (100% Screen)"}
                aria-label={isFullscreen ? "Exit Theater View" : "Theater View"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>

        {/* Bottom-Right Compact Legend Dock */}
        <button
          type="button"
          onClick={() => setIsLegendModalOpen(true)}
          className="flex flex-col items-start gap-1 rounded-lg border border-slate-800/90 bg-slate-950/90 px-2.5 py-1.5 font-mono text-[10px] text-slate-300 backdrop-blur hover:border-cyan-500/60 hover:bg-slate-900/95 transition shadow-lg group cursor-pointer pointer-events-auto"
          title="Click to view detailed Graph Legend and Incident Anatomy Guide"
        >
          <div className="flex items-center gap-1 font-bold text-cyan-400 group-hover:text-cyan-300 pb-0.5 border-b border-slate-800/80 w-full justify-between">
            <div className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span className="tracking-wider">LEGEND</span>
            </div>
            <span className="text-[9px] text-cyan-400 underline group-hover:text-cyan-300">&raquo;</span>
          </div>
          <div className="grid grid-cols-3 gap-x-2.5 gap-y-1 pt-0.5 whitespace-nowrap">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rotate-45 bg-blue-500 rounded-[1px] shrink-0" />
              <span>School</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span>Persona</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] shrink-0" />
              <span className="text-emerald-400 font-semibold">HUMINT</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-[2px] bg-red-500 shrink-0" />
              <span>Threat</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 bg-amber-500 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] shrink-0" />
              <span>Evidence</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-[2px] bg-purple-500 shrink-0" />
              <span className="text-purple-300">OSINT</span>
            </div>
          </div>
        </button>
      </div>

      {/* Shortest Path Link Investigation HUD Overlay */}
      {(isTraceMode || activePath) && (
        <div className="absolute top-14 right-14 z-30 max-w-sm w-full rounded-xl border border-amber-500/40 bg-[#0c0d16]/95 p-3.5 shadow-2xl font-mono text-xs backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                INVESTIGATION LINK TRACER
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearPath}
              className="rounded p-1 text-slate-400 hover:text-white"
              title="Close and Clear Trace"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Node Selectors */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block mb-1">Origin Node:</span>
              <select
                value={traceOriginId}
                onChange={(e) => setTraceOriginId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Select Origin...</option>
                {availableNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Target Node:</span>
              <select
                value={traceTargetId}
                onChange={(e) => setTraceTargetId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Select Target...</option>
                {availableNodes
                  .filter((n) => n.id !== traceOriginId)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {activePath && (
              <button
                type="button"
                onClick={handleClearPath}
                className="rounded border border-slate-700 px-3 py-1 text-[11px] text-slate-400 hover:text-white"
              >
                Clear Highlight
              </button>
            )}
            <button
              type="button"
              disabled={!traceOriginId || !traceTargetId}
              onClick={() => executeShortestPath(traceOriginId, traceTargetId)}
              className="rounded bg-amber-500 px-3.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition"
            >
              Trace Connection
            </button>
          </div>

          {/* Path Steps Breadcrumb */}
          {activePath && (
            <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
              <span className="text-[10px] text-amber-400 font-bold uppercase block">
                Connecting Path ({Math.ceil(activePath.steps.length / 2)} Hops):
              </span>
              <div className="flex flex-wrap items-center gap-1 max-h-24 overflow-y-auto p-1.5 rounded bg-slate-950/80 border border-slate-800 text-[10px]">
                {activePath.steps.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        s.type === "node"
                          ? "bg-amber-500/20 text-amber-200 font-bold border border-amber-500/40"
                          : "text-slate-400 italic"
                      }`}
                    >
                      {s.label}
                    </span>
                    {idx < activePath.steps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-amber-400/80 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Graph Legend & Incident Anatomy Guide Modal */}
      <GraphLegendModal
        isOpen={isLegendModalOpen}
        onClose={() => setIsLegendModalOpen(false)}
      />

      {/* CENTER-BOTTOM: Selected Node Inspector Pill */}
      {selectedNodeData && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-slate-950/95 px-3 py-2 font-mono text-xs shadow-2xl backdrop-blur-md max-w-[calc(100%-260px)] pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">{selectedNodeData.type}:</span>
          <span className="font-bold text-slate-100 truncate max-w-[200px]">
            {selectedNodeData.threatLabel ||
              selectedNodeData.alias ||
              selectedNodeData.name ||
              selectedNodeData.id}
          </span>
          {selectedNodeData.severity_tier && (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
              T{selectedNodeData.severity_tier}
            </span>
          )}
          {selectedNodeData.model_used && (
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
              {selectedNodeData.model_used}
            </span>
          )}
          {selectedNodeData.role_risk_tier && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30">
              {selectedNodeData.role_risk_tier}
            </span>
          )}
          {selectedNodeData.context_summary && (
            <span className="hidden xl:inline text-[11px] text-slate-300 max-w-[280px] truncate border-l border-slate-700/80 pl-2">
              {selectedNodeData.context_summary}
            </span>
          )}
          {selectedNodeData.title && (
            <span className="hidden xl:inline text-[11px] text-slate-300 max-w-[280px] truncate border-l border-slate-700/80 pl-2">
              {selectedNodeData.title}
            </span>
          )}
          {selectedNodeData.source_url && (
            <a
              href={selectedNodeData.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 rounded bg-purple-900/40 border border-purple-500/40 px-2 py-0.5 text-[10px] text-purple-200 hover:text-white hover:bg-purple-800/60 transition font-mono"
              title="Open targeted OSINT public thread"
            >
              <span>Thread Signal</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {onFocusMap && (
            <button
              type="button"
              onClick={() => {
                let targetId = selectedNodeData.id;
                if (cyRef.current) {
                  const cyNode = cyRef.current.$id(selectedNodeData.id);
                  if (cyNode.length) {
                    const nType = cyNode.data("type");
                    const nId = cyNode.id();
                    if (nType !== "ThreatEventNode" && !nId.startsWith("inc_") && !nId.startsWith("threat_") && !nId.startsWith("incident-")) {
                      const parentThreat = cyNode.closedNeighborhood('node[type="ThreatEventNode"], node[id^="inc_"], node[id^="threat_"], node[id^="incident-"]');
                      if (parentThreat.length) {
                        targetId = parentThreat.first().id();
                      }
                    }
                  }
                }
                onFocusMap(targetId);
              }}
              className="ml-1 flex items-center gap-1.5 rounded bg-cyan-600/40 border border-cyan-500/70 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500 hover:text-white transition active:scale-95 cursor-pointer shadow"
              title="View this incident location on Campus GEOINT & Blueprint Map"
            >
              <MapPin className="h-3 w-3" />
              <span>Focus Map</span>
            </button>
          )}
          {onOpenDossier && (
            <button
              type="button"
              onClick={() => onOpenDossier(selectedNodeData.id)}
              className="ml-1 flex items-center gap-1.5 rounded bg-rose-600/40 border border-rose-500/70 px-2.5 py-0.5 text-[11px] font-bold text-rose-200 hover:bg-rose-500 hover:text-white transition active:scale-95 cursor-pointer shadow"
              title="Open full statutory Section 90A evidence dossier for this node"
            >
              <FileText className="h-3 w-3" />
              <span>Dossier Sec 90A</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedNodeData(null)}
            className="text-slate-500 hover:text-slate-300 ml-1 p-0.5"
            title="Dismiss Inspector"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Cytoscape DOM container with touch-action: none */}

      <div

        ref={containerRef}

        style={{

          width: "100%",

          height: "100%",

          minHeight: "100%",

          touchAction: "none",

        }}

        aria-label="Campus safety intelligence graph"

      />

    </div>

  );

}

