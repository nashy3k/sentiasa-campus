"use client";

import { useMemo, useState, useCallback } from "react";

import Link from "next/link";

import {

  Network,

  Send,

  Radio,

  Search,

  School,

  User,

  AlertTriangle,

  ArrowRight,

  X,

  ExternalLink,

  ShieldAlert,

  Sparkles,

  Layers,

  FileText,

  Video,

  Film,

  Hash,

  ShieldCheck,

} from "lucide-react";

import GraphCanvas from "../../../components/GraphCanvas";

import EvidenceDossierModal from "../../../components/EvidenceDossierModal";

import VideoScrubber, { type KeyframeTag } from "../../../components/video-scrubber";

import type { ThreatItem } from "../../../components/TriageFeed";

import { useDashboard } from "../../../context/DashboardContext";



export default function SentinelGraphPage() {

  const {

    elements,

    selectedNodeId,

    setSelectedNodeId,

    incidents,

    handleEscalate,

  } = useDashboard();



  const [nodeSearch, setNodeSearch] = useState("");

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [dossierIncident, setDossierIncident] = useState<ThreatItem | null>(null);



  const handleCloseInspector = useCallback((e?: React.MouseEvent | React.TouchEvent) => {

    if (e) {

      e.preventDefault();

      e.stopPropagation();

    }

    setIsInspectorOpen(false);

    setSelectedNodeId(null);

  }, [setSelectedNodeId]);



  // Extract all nodes (exclude edges) for search & quick selection

  const nodes = useMemo(() => {

    return elements.filter((el) => !("source" in el.data && "target" in el.data));

  }, [elements]);



  const edges = useMemo(() => {

    return elements.filter((el) => "source" in el.data && "target" in el.data);

  }, [elements]);



  // Find currently selected element

  const selectedElement = useMemo(() => {

    if (!selectedNodeId) return null;

    return elements.find((el) => el.data.id === selectedNodeId) || null;

  }, [elements, selectedNodeId]);



  // Find connected neighbors if a node is selected

  const connectedNeighbors = useMemo(() => {

    if (!selectedNodeId) return [];

    const connectedEdgeList = edges.filter(

      (e) => e.data.source === selectedNodeId || e.data.target === selectedNodeId

    );

    const neighborIds = new Set<string>();

    connectedEdgeList.forEach((e) => {

      if (e.data.source !== selectedNodeId) neighborIds.add(e.data.source as string);

      if (e.data.target !== selectedNodeId) neighborIds.add(e.data.target as string);

    });

    return nodes.filter((n) => neighborIds.has(n.data.id));

  }, [selectedNodeId, edges, nodes]);



  // Filtered nodes for the search dropdown/filter

  const filteredNodes = useMemo(() => {

    if (!nodeSearch.trim()) return [];

    const q = nodeSearch.toLowerCase().trim();

    return nodes.filter((n) => {

      const idMatch = n.data.id?.toLowerCase().includes(q);

      const nameMatch = n.data.name?.toLowerCase().includes(q);

      const aliasMatch = n.data.alias?.toLowerCase().includes(q);

      const typeMatch = n.data.type?.toLowerCase().includes(q);

      const labelMatch = n.data.threatLabel?.toLowerCase().includes(q);

      return idMatch || nameMatch || aliasMatch || typeMatch || labelMatch;

    });

  }, [nodes, nodeSearch]);



  // Correlating threat item from incidents if selected element is a threat event

  const correlatedIncident = useMemo(() => {

    if (!selectedNodeId) return null;

    return incidents.find((inc) => inc.id === selectedNodeId) || null;

  }, [selectedNodeId, incidents]);



  return (

    <div className="flex flex-col gap-4 h-[calc(100vh-140px)] min-h-[640px]">

      {/* Top Analyst Control Bar */}

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 shadow-lg backdrop-blur-md">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">

              <Network className="h-5 w-5" />

            </div>

            <div>

              <div className="flex items-center gap-2.5">

                <h1 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">

                  Sentinel Ontology Graph Canvas

                </h1>

                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">

                  {nodes.length} Nodes • {edges.length} Edges

                </span>

              </div>

              <p className="text-xs text-slate-400 hidden sm:block">

                Co-occurrence network linking Malaysian schools, student personas, weapon threats, and corroborating evidence

              </p>

            </div>

          </div>



          <div className="flex items-center gap-3">

            {/* Quick Node Finder / Search */}

            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

              <input

                type="text"

                value={nodeSearch}

                onChange={(e) => setNodeSearch(e.target.value)}

                placeholder="Find node by name or alias..."

                className="w-48 sm:w-64 rounded-lg border border-slate-700 bg-slate-950/80 pl-8 pr-7 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/70 focus:outline-none"

              />

              {nodeSearch && (

                <button

                  type="button"

                  onClick={() => setNodeSearch("")}

                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"

                >

                  <X className="h-3.5 w-3.5" />

                </button>

              )}



              {/* Node Search Dropdown */}

              {filteredNodes.length > 0 && (

                <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">

                  <div className="font-mono text-[11px] text-slate-400 px-2 py-1 border-b border-slate-800">

                    Matches ({filteredNodes.length})

                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pt-1">

                    {filteredNodes.map((n) => (

                      <button

                        key={n.data.id}

                        type="button"

                        onClick={() => {

                          setSelectedNodeId(n.data.id);

                          setNodeSearch("");

                          setIsInspectorOpen(true);

                        }}

                        className="w-full text-left rounded-lg p-2 text-xs hover:bg-slate-800 transition flex items-center justify-between"

                      >

                        <span className="font-semibold text-slate-200 truncate">

                          {n.data.name || n.data.alias || n.data.threatLabel || n.data.id}

                        </span>

                        <span className="font-mono text-[10px] text-slate-400 ml-2 uppercase">

                          {n.data.type?.replace("Node", "")}

                        </span>

                      </button>

                    ))}

                  </div>

                </div>

              )}

            </div>



            {/* Ingest to Graph Button */}

            <Link

              href="/intake"

              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition"

            >

              <Send className="h-3.5 w-3.5 text-amber-400" />

              <span className="hidden md:inline">Ingest New Incident</span>

            </Link>



            {/* Back to Live Triage */}

            <Link

              href="/"

              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:text-white transition"

            >

              <Radio className="h-3.5 w-3.5 text-rose-400" />

              <span className="hidden md:inline">Live Triage</span>

            </Link>

          </div>

        </div>

      </section>



      {/* Main Cytoscape Graph Canvas with Floating Inspector */}

      <div className="relative flex-1 rounded-xl border border-slate-800 bg-[#070b12] overflow-hidden shadow-2xl">

        <GraphCanvas

          elements={elements}

          selectedNodeId={selectedNodeId}

          onNodeSelect={(nodeId) => {

            if (nodeId) {

              setSelectedNodeId(nodeId);

              setIsInspectorOpen(true);

            } else {

              setSelectedNodeId(null);

              setIsInspectorOpen(false);

            }

          }}

        />



        {/* Dynamic Sync Status Pill (Bottom Left) */}

        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-md shadow-md">

          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

          <span>CYTOSCAPE SYNC ACTIVE</span>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400">{elements.length} elements</span>

        </div>



        {/* Selected Entity Inspector Drawer / Card (Right Side Overlay) */}

        {selectedElement && isInspectorOpen && (

          <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 max-h-[calc(100%-32px)] flex flex-col rounded-xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md overflow-y-auto">

            {/* Mobile/Tablet Drag Dismiss Bar */}

            <div

              className="w-12 h-1.5 bg-slate-700 hover:bg-slate-500 rounded-full mx-auto mb-2 md:hidden cursor-pointer active:scale-95"

              onTouchEnd={handleCloseInspector}

              onClick={handleCloseInspector}

              title="Tap to dismiss"

            />



            {/* Drawer Header */}

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">

              <div className="flex items-center gap-2">

                <Layers className="h-4 w-4 text-cyan-400" />

                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">

                  Ontology Entity Inspector

                </h3>

              </div>

              <button

                type="button"

                onClick={handleCloseInspector}

                onTouchEnd={handleCloseInspector}

                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition"

                title="Close Inspector"

                aria-label="Close Inspector"

              >

                <X className="h-5 w-5" />

              </button>

            </div>



            {/* Entity Badge & ID */}

            <div className="mt-3.5 space-y-3">

              <div className="flex items-center justify-between">

                <span className="font-mono text-xs text-slate-400">

                  {selectedElement.data.id}

                </span>

                <span

                  className={`rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${

                    selectedElement.data.type === "ThreatEventNode"

                      ? "border-rose-500/40 bg-rose-500/20 text-rose-300"

                      : selectedElement.data.type === "SchoolNode"

                      ? "border-blue-500/40 bg-blue-500/20 text-blue-300"

                      : selectedElement.data.type === "PersonaNode"

                      ? "border-amber-500/40 bg-amber-500/20 text-amber-300"

                      : selectedElement.data.type === "evidence" || selectedElement.data.media_type === "CCTV_KEYFRAME"

                      ? "border-cyan-500/40 bg-cyan-500/20 text-cyan-300"

                      : "border-slate-600 bg-slate-800 text-slate-300"

                  }`}

                >

                  {selectedElement.data.type === "evidence" ? "CCTV Exhibit" : selectedElement.data.type || "GraphElement"}

                </span>

              </div>



              {/* Title / Name */}

              <div>

                <h2 className="text-base font-bold text-slate-100">

                  {selectedElement.data.name ||

                    selectedElement.data.alias ||

                    selectedElement.data.threatLabel ||

                    selectedElement.data.incident_type ||

                    selectedElement.data.label ||

                    "Entity Detail"}

                </h2>

                {selectedElement.data.district && (

                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">

                    <School className="h-3 w-3 text-blue-400" />

                    <span>District: {selectedElement.data.district}</span>

                  </p>

                )}

              </div>



              {/* Threat Event Specifics */}

              {selectedElement.data.type === "ThreatEventNode" && (

                <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">

                  <div className="flex items-center justify-between text-xs font-mono">

                    <span className="text-slate-400">Severity Level:</span>

                    <span className="font-bold text-rose-400">

                      Tier {selectedElement.data.severity_tier || 5}

                    </span>

                  </div>

                  {selectedElement.data.context_summary && (

                    <p className="text-xs leading-relaxed text-slate-200 border-t border-slate-800/80 pt-2">

                      {selectedElement.data.context_summary}

                    </p>

                  )}

                  {correlatedIncident && (

                    <div className="pt-2 border-t border-slate-800">

                      <div className="flex flex-wrap gap-1 mb-2">

                        {correlatedIncident.slangTags.map((t, idx) => (

                          <span

                            key={idx}

                            className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 font-mono text-[11px] text-amber-300"

                          >

                            #{t}

                          </span>

                        ))}

                      </div>

                      {/* Export Evidence Dossier Button */}

                      <button

                        type="button"

                        onClick={() => {

                          const isPurplePivot = selectedElement.data.type === "EntityTransformNode";

                          const targetIncident: ThreatItem = correlatedIncident || {

                            id: selectedElement.data.id,

                            severityTier: selectedElement.data.severity_tier || 2,

                            timestamp: isPurplePivot ? "OSINT Triangulation Pivot" : (new Date().toLocaleTimeString("en-GB", { hour12: false }) + " MYT"),

                            schoolName: selectedElement.data.school_name || "Open-Source Intelligence Horizon",

                            contextSummary: selectedElement.data.context_summary || `OSINT Triangulation Pivot: [${selectedElement.data.label || selectedElement.data.id}]. Corroborating signals across public channels, digital footprint, and regional community chatter.`,

                            slangTags: isPurplePivot ? ["osint_pivot", "signal_intelligence", "open_source_corroboration"] : ["investigation", "graph-audit"],

                            externalCitations: [

                              { platform: "reddit", title: "r/malaysiauni - Campus Incident Corroboration Feed", url: "https://www.reddit.com/r/malaysiauni/comments/mock_incident", engine: "tavily_osint" },

                              { platform: "lowyat", title: "Kopitiam - Community Threat Telemetry Thread", url: "https://forum.lowyat.net/topic/mock_lowyat_thread", engine: "exa_osint" }

                            ],

                            jevVerdict: correlatedIncident?.jevVerdict || {

                              passed: true,

                              noulDangerScore: 0.88,

                            },

                          };

                          setDossierIncident(targetIncident);

                          setIsDossierOpen(true);

                        }}

                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/40 px-3 py-2 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-900/60 active:scale-95 transition mb-2"

                      >

                        <FileText className="h-3.5 w-3.5" />

                        <span>Export Evidence Dossier (Sec 90A)</span>

                      </button>



                      <Link

                        href="/"

                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition"

                      >

                        <Radio className="h-3.5 w-3.5" />

                        <span>View in Live Triage Console</span>

                      </Link>

                    </div>

                  )}

                </div>

              )}



              {/* Persona Node Specifics */}

              {selectedElement.data.type === "PersonaNode" && (

                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">

                  <div className="flex items-center justify-between font-mono">

                    <span className="text-slate-400">School Affiliation:</span>

                    <span className="font-semibold text-slate-200">

                      {selectedElement.data.school_name || "Unknown"}

                    </span>

                  </div>

                  <div className="flex items-center justify-between font-mono">

                    <span className="text-slate-400">Role Risk Tier:</span>

                    <span className="font-bold text-amber-300">

                      {selectedElement.data.role_risk_tier || "OBSERVED_STUDENT"}

                    </span>

                  </div>

                </div>

              )}



              {/* Evidence Node (CCTV Keyframe Exhibit) Specifics */}

              {(selectedElement.data.type === "evidence" || selectedElement.data.media_type === "CCTV_KEYFRAME") && (

                <div className="space-y-3 rounded-lg border border-cyan-500/30 bg-slate-950/70 p-3.5 text-xs">

                  <div className="flex items-center justify-between font-mono">

                    <span className="text-slate-400">Media Exhibit:</span>

                    <span className="font-bold text-cyan-300 flex items-center gap-1">

                      <Film className="h-3.5 w-3.5 text-cyan-400" />

                      <span>CCTV Keyframe Burst</span>

                    </span>

                  </div>



                  <div className="flex items-center justify-between font-mono">

                    <span className="text-slate-400">Timestamp Offset:</span>

                    <span className="font-semibold text-slate-200">

                      {selectedElement.data.timestamp_sec !== undefined ? `${Number(selectedElement.data.timestamp_sec).toFixed(1)}s` : "0.0s"}

                    </span>

                  </div>



                  <div className="flex items-center justify-between font-mono">

                    <span className="text-slate-400">Visual Threat Status:</span>

                    <span className={`font-bold ${selectedElement.data.has_threat_object ? "text-rose-400" : "text-amber-300"}`}>

                      {selectedElement.data.has_threat_object ? "Verified Threat Object" : "Physical Activity"}

                    </span>

                  </div>



                  {Array.isArray(selectedElement.data.threat_markers) && selectedElement.data.threat_markers.length > 0 && (

                    <div>

                      <span className="text-slate-400 block mb-1 font-mono">Detected Threat Markers:</span>

                      <div className="flex flex-wrap gap-1">

                        {selectedElement.data.threat_markers.map((marker: string, idx: number) => (

                          <span

                            key={idx}

                            className="rounded bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 font-mono text-[11px] text-rose-300 font-semibold"

                          >

                            {marker}

                          </span>

                        ))}

                      </div>

                    </div>

                  )}



                  {/* Evidence Act 1950 Sec 90A Cryptographic Digest */}

                  {selectedElement.data.sha256 && (

                    <div className="rounded border border-slate-800 bg-slate-900/60 p-2 font-mono text-[11px] space-y-1">

                      <div className="flex items-center justify-between text-slate-400">

                        <span className="flex items-center gap-1">

                          <Hash className="h-3 w-3 text-cyan-400" />

                          <span>FIPS 180-4 SHA-256 Digest:</span>

                        </span>

                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />

                      </div>

                      <p className="text-cyan-300 truncate font-semibold">

                        {selectedElement.data.sha256}

                      </p>

                    </div>

                  )}



                  {/* Embedded Video Scrubber for this Keyframe */}

                  <div className="pt-2 border-t border-slate-800">

                    <VideoScrubber

                      src={

                        selectedElement.data.has_threat_object

                          ? "/demo-videos/clip_weapon_threat.mp4"

                          : "/demo-videos/clip_physical_altercation.mp4"

                      }

                      title={selectedElement.data.label || "CCTV Surveillance Feed"}

                      initialTimestamp={selectedElement.data.timestamp_sec || 0}

                      keyframes={[

                        {

                          timestamp: selectedElement.data.timestamp_sec || 0,

                          label: "Sampled Frame",

                          sha256: selectedElement.data.sha256,

                          isThreat: selectedElement.data.has_threat_object,

                        },

                      ]}

                    />

                  </div>

                </div>

              )}



              {/* Connected Graph Neighbors */}

              {connectedNeighbors.length > 0 && (

                <div className="pt-2">

                  <span className="font-mono text-xs text-slate-400 block mb-2">

                    Connected Graph Neighbors ({connectedNeighbors.length})

                  </span>

                  <div className="space-y-1.5">

                    {connectedNeighbors.map((neighbor) => (

                      <button

                        key={neighbor.data.id}

                        type="button"

                        onClick={() => setSelectedNodeId(neighbor.data.id)}

                        className="w-full flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-left hover:border-slate-700 hover:bg-slate-800/60 transition group"

                      >

                        <div className="flex items-center gap-2 truncate">

                          {neighbor.data.type === "SchoolNode" ? (

                            <School className="h-3.5 w-3.5 text-blue-400 shrink-0" />

                          ) : neighbor.data.type === "PersonaNode" ? (

                            <User className="h-3.5 w-3.5 text-amber-400 shrink-0" />

                          ) : neighbor.data.type === "evidence" || neighbor.data.media_type === "CCTV_KEYFRAME" ? (

                            <Video className="h-3.5 w-3.5 text-cyan-400 shrink-0" />

                          ) : (

                            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />

                          )}

                          <span className="text-xs font-semibold text-slate-200 truncate">

                            {neighbor.data.name ||

                              neighbor.data.alias ||

                              neighbor.data.threatLabel ||

                              neighbor.data.id}

                          </span>

                        </div>

                        <ArrowRight className="h-3 w-3 text-slate-500 opacity-60 group-hover:opacity-100 shrink-0" />

                      </button>

                    ))}

                  </div>

                </div>

              )}



              {/* Bottom Dismiss Button */}

              <button

                type="button"

                onClick={handleCloseInspector}

                onTouchEnd={handleCloseInspector}

                className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 font-mono text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition"

              >

                <X className="h-4 w-4" />

                <span>Dismiss Inspector</span>

              </button>

            </div>

          </div>

        )}

      </div>



      {/* Evidence Act 1950 Section 90A Forensic Certificate & PDF Dossier Modal */}

      <EvidenceDossierModal

        isOpen={isDossierOpen}

        incident={dossierIncident}

        onClose={() => {

          setIsDossierOpen(false);

          setDossierIncident(null);

        }}

        graphElements={elements}

      />

    </div>

  );

}