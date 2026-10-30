"use client";

import { useMemo, useState, useCallback, useEffect } from "react";

import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import {

  Sparkles,

  Compass,

  ChevronRight,

  Search,

  Filter,

  X,

  Network,

  ExternalLink,

  ShieldAlert,

  Radio,

  FileText,

  Volume2,

  VolumeX,

  Receipt,

} from "lucide-react";

import GraphCanvas from "../../../components/GraphCanvas";

import TriageFeed, { type ThreatItem } from "../../../components/TriageFeed";

import EvidenceDossierModal from "../../../components/EvidenceDossierModal";

import PipelineReceiptsDrawer from "../../../components/PipelineReceiptsDrawer";

import { useDashboard } from "../../../context/DashboardContext";

type TierFilter = "all" | "critical" | "elevated" | "moderate";

export default function CounselorLiveTriagePage() {

  const router = useRouter();

  

  const {

    incidents,

    elements,

    selectedNodeId,

    setSelectedNodeId,

    handleEscalate,

  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState("");

  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [dossierIncident, setDossierIncident] = useState<ThreatItem | null>(null);

  const [isReceiptsDrawerOpen, setIsReceiptsDrawerOpen] = useState(false);

  // Audio/Visual Critical Alert Beacon State

  const [isBeaconDismissed, setIsBeaconDismissed] = useState(false);

  const [isAudioAlertEnabled, setIsAudioAlertEnabled] = useState(false);

  // Identify active Tier 5 Critical Incident

  const criticalIncident = useMemo(() => {

    return incidents.find((inc) => inc.severityTier === 5);

  }, [incidents]);

  // Professional dual-tone crisis command center chime (587Hz D5 -> 880Hz A5)

  const playWarningBeep = useCallback(() => {

    try {

      if (typeof window === "undefined") return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioCtx) return;

      const ctx = new AudioCtx();

      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5) - warm prompt tone

      const osc1 = ctx.createOscillator();

      const gain1 = ctx.createGain();

      osc1.type = "sine";

      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0.001, now);

      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);

      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);

      gain1.connect(ctx.destination);

      osc1.start(now);

      osc1.stop(now + 0.17);

      // Tone 2: 880.00 Hz (A5) - clear crisis chime

      const osc2 = ctx.createOscillator();

      const gain2 = ctx.createGain();

      osc2.type = "sine";

      osc2.frequency.setValueAtTime(880.00, now + 0.11);

      gain2.gain.setValueAtTime(0.001, now + 0.11);

      gain2.gain.linearRampToValueAtTime(0.15, now + 0.13);

      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc2.connect(gain2);

      gain2.connect(ctx.destination);

      osc2.start(now + 0.11);

      osc2.stop(now + 0.40);

    } catch {

      // Audio autoplay policy fallback

    }

  }, []);

  // Periodic reminder chime when audio beacon is active

  useEffect(() => {

    if (!isAudioAlertEnabled || !criticalIncident || isBeaconDismissed) return;

    playWarningBeep();

    const interval = setInterval(playWarningBeep, 9000);

    return () => clearInterval(interval);

  }, [isAudioAlertEnabled, criticalIncident, isBeaconDismissed, playWarningBeep]);

  // Filter incidents in real time based on search query and tier pill

  const filteredIncidents = useMemo(() => {

    return incidents.filter((incident) => {

      // Tier filtering

      if (tierFilter === "critical" && incident.severityTier < 4) return false;

      if (tierFilter === "elevated" && incident.severityTier !== 3) return false;

      if (tierFilter === "moderate" && incident.severityTier > 2) return false;

      // Query filtering

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();

      const matchSchool = incident.schoolName.toLowerCase().includes(query);

      const matchContext = incident.contextSummary.toLowerCase().includes(query);

      const matchTags = incident.slangTags.some((tag) =>

        tag.toLowerCase().includes(query)

      );

      const matchId = incident.id.toLowerCase().includes(query);

      const matchDialect = incident.ilmuCalibration?.verifiedDialect

        ?.toLowerCase()

        .includes(query);

      return matchSchool || matchContext || matchTags || matchId || matchDialect;

    });

  }, [incidents, searchQuery, tierFilter]);

  // Count incidents per tier for pill indicators

  const tierCounts = useMemo(() => {

    return {

      all: incidents.length,

      critical: incidents.filter((i) => i.severityTier >= 4).length,

      elevated: incidents.filter((i) => i.severityTier === 3).length,

      moderate: incidents.filter((i) => i.severityTier <= 2).length,

    };

  }, [incidents]);

  // Find currently selected incident

  const activeIncident = useMemo(() => {

    return (

      incidents.find((inc) => inc.id === selectedNodeId) ||

      filteredIncidents[0] ||

      incidents[0]

    );

  }, [incidents, filteredIncidents, selectedNodeId]);

  return (

    <div className="flex flex-col gap-4">

      {/* Tier 5 Critical Audio/Visual Alert Beacon */}

      {criticalIncident && !isBeaconDismissed && (

        <div className="relative overflow-hidden rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-rose-950/80 p-4 shadow-xl backdrop-blur-md">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <span className="relative flex h-3.5 w-3.5 shrink-0">

                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />

                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 shadow-[0_0_10px_#f43f5e]" />

              </span>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-200">

                    CRITICAL SAFETY BEACON // TIER 5 WEAPON ALERT

                  </span>

                  <span className="rounded bg-rose-500/20 px-2 py-0.2 font-mono text-[11px] font-bold text-rose-300 border border-rose-500/40">

                    {criticalIncident.schoolName}

                  </span>

                  <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">

                    {criticalIncident.id}

                  </span>

                </div>

                <p className="text-xs text-rose-100/90 font-medium line-clamp-1 mt-0.5">

                  {criticalIncident.contextSummary}

                </p>

              </div>

            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">

              {/* Audio Alert Toggle */}

              <button

                type="button"

                onClick={() => {

                  const next = !isAudioAlertEnabled;

                  setIsAudioAlertEnabled(next);

                  if (next) playWarningBeep();

                }}

                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition ${

                  isAudioAlertEnabled

                    ? "border-rose-400 bg-rose-500/30 text-rose-100"

                    : "border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"

                }`}

                title="Toggle Synthesized Web Audio Siren Beacon"

              >

                {isAudioAlertEnabled ? (

                  <Volume2 className="h-3.5 w-3.5 text-rose-300 animate-pulse" />

                ) : (

                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />

                )}

                <span>{isAudioAlertEnabled ? "Audio ON" : "Audio Muted"}</span>

              </button>

              {/* Focus Incident */}

              <button

                type="button"

                onClick={() => setSelectedNodeId(criticalIncident.id)}

                className="rounded-lg border border-rose-500/50 bg-rose-900/40 px-3 py-1.5 font-bold text-rose-200 hover:bg-rose-800/60 transition"

              >

                Focus T5

              </button>

              {/* Instant Legal Dossier */}

              <button

                type="button"

                onClick={() => {

                  setDossierIncident(criticalIncident);

                  setIsDossierOpen(true);

                }}

                className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-950/50 transition flex items-center gap-1.5"

              >

                <FileText className="h-3.5 w-3.5" />

                <span>Sec 90A Dossier</span>

              </button>

              {/* Dismiss Beacon */}

              <button

                type="button"

                onClick={() => setIsBeaconDismissed(true)}

                className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800/60"

                title="Dismiss Alert Beacon"

              >

                <X className="h-4 w-4" />

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Counselor Command Bar */}

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg backdrop-blur-md">

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

          {/* Real-time Search Input */}

          <div className="relative flex-1">

            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input

              type="text"

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              placeholder="Search school name, student alias, or dialect keyword ('parang', 'tapau', 'koyak', 'bahan')..."

              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-10 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-500/70 focus:outline-none focus:ring-1 focus:ring-rose-500/40"

            />

            {searchQuery && (

              <button

                type="button"

                onClick={() => setSearchQuery("")}

                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"

              >

                <X className="h-4 w-4" />

              </button>

            )}

          </div>

          {/* Tier Filter Pills */}

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">

            <span className="text-slate-400 flex items-center gap-1 mr-1 hidden lg:flex">

              <Filter className="h-3.5 w-3.5" />

              <span>Severity:</span>

            </span>

            <button

              type="button"

              onClick={() => setTierFilter("all")}

              className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${

                tierFilter === "all"

                  ? "bg-slate-700 text-white border border-slate-500"

                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"

              }`}

            >

              <span>All Tiers</span>

              <span className="rounded-full bg-slate-900 px-1.5 py-0.2 text-[11px] text-slate-300">

                {tierCounts.all}

              </span>

            </button>

            <button

              type="button"

              onClick={() => setTierFilter("critical")}

              className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${

                tierFilter === "critical"

                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm"

                  : "bg-slate-800/80 text-slate-400 hover:text-rose-300 hover:bg-slate-800"

              }`}

            >

              <span className="h-2 w-2 rounded-full bg-rose-400" />

              <span>Critical (T4/T5)</span>

              <span className="rounded-full bg-rose-950/60 px-1.5 py-0.2 text-[11px] text-rose-300 border border-rose-800/40">

                {tierCounts.critical}

              </span>

            </button>

            <button

              type="button"

              onClick={() => setTierFilter("elevated")}

              className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${

                tierFilter === "elevated"

                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"

                  : "bg-slate-800/80 text-slate-400 hover:text-amber-300 hover:bg-slate-800"

              }`}

            >

              <span className="h-2 w-2 rounded-full bg-amber-400" />

              <span>Elevated (T3)</span>

              <span className="rounded-full bg-amber-950/60 px-1.5 py-0.2 text-[11px] text-amber-300 border border-amber-800/40">

                {tierCounts.elevated}

              </span>

            </button>

            <button

              type="button"

              onClick={() => setTierFilter("moderate")}

              className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${

                tierFilter === "moderate"

                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm"

                  : "bg-slate-800/80 text-slate-400 hover:text-sky-300 hover:bg-slate-800"

              }`}

            >

              <span className="h-2 w-2 rounded-full bg-sky-400" />

              <span>Moderate/Info (T1/T2)</span>

              <span className="rounded-full bg-sky-950/60 px-1.5 py-0.2 text-[11px] text-sky-300 border border-sky-800/40">

                {tierCounts.moderate}

              </span>

            </button>

          </div>

        </div>

        {/* Filter Feedback Tag */}

        {(searchQuery || tierFilter !== "all") && (

          <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">

            <span>

              Showing {filteredIncidents.length} of {incidents.length} incidents

            </span>

            {(searchQuery || tierFilter !== "all") && (

              <button

                type="button"

                onClick={() => {

                  setSearchQuery("");

                  setTierFilter("all");

                }}

                className="text-rose-400 hover:text-rose-300 underline font-mono text-[11px]"

              >

                Reset filters

              </button>

            )}

          </div>

        )}

      </section>

      {/* Split Cockpit */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        {/* Primary Column: Live Triage Feed (7 cols) */}

        <div className="xl:col-span-7 h-[calc(100vh-235px)] min-h-[580px]">

          <TriageFeed

            incidents={filteredIncidents}

            selectedIncidentId={activeIncident?.id}

            onIncidentSelect={(nodeId) => setSelectedNodeId(nodeId)}

            onEscalate={handleEscalate}

          />

        </div>

        {/* Companion Column: Selected Incident Deep Inspector & Relationship Preview (5 cols) */}

        <div className="xl:col-span-5 flex flex-col gap-5 h-[calc(100vh-235px)] min-h-[580px] overflow-y-auto">

          {/* Incident Dossier Card */}

          {activeIncident ? (

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-md">

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">

                <div className="flex items-center gap-2">

                  <Sparkles className="h-4 w-4 text-rose-400" />

                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">

                    Selected Incident Intelligence Dossier

                  </h3>

                </div>

                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">

                  {activeIncident.id}

                </span>

              </div>

              <div className="mt-4 space-y-3">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-semibold text-slate-100">

                    {activeIncident.schoolName}

                  </span>

                  <span className="font-mono text-xs text-slate-400">

                    {activeIncident.timestamp}

                  </span>

                </div>

                <p className="text-sm leading-relaxed text-slate-200 bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">

                  {activeIncident.contextSummary}

                </p>

                {/* Dialect and Invariant Gating Grid */}

                <div className="grid grid-cols-2 gap-3 pt-1">

                  <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">

                    <span className="font-mono text-xs text-slate-400 block mb-1">

                      Sovereign Dialect

                    </span>

                    <span className="font-mono text-xs font-bold text-cyan-300">

                      {activeIncident.ilmuCalibration?.verifiedDialect || "Klang Valley Manglish"}

                    </span>

                    <span className="text-xs text-slate-400 block mt-0.5">

                      Fidelity: {((activeIncident.ilmuCalibration?.slangFidelity || 1.0) * 100).toFixed(0)}% • D_nuance:{" "}

                      {activeIncident.ilmuCalibration?.dNuance || 1.58}

                    </span>

                  </div>

                  <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">

                    <span className="font-mono text-xs text-slate-400 block mb-1">

                      Jev Invariant Gating

                    </span>

                    <span className="font-mono text-xs font-bold text-purple-300">

                      {activeIncident.jevVerdict?.passed ? "PASSED (VERIFIED)" : "VETOED"}

                    </span>

                    <span className="text-xs text-slate-400 block mt-0.5">

                      Danger Score: {((activeIncident.jevVerdict?.noulDangerScore || 0.94) * 100).toFixed(0)}%

                    </span>

                  </div>

                </div>

                {/* External Citations (Reddit / Lowyat) */}

                {activeIncident.externalCitations && activeIncident.externalCitations.length > 0 && (

                  <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">

                    <span className="font-mono text-xs text-slate-400 block mb-1.5">

                      OSINT Corroboration Citations

                    </span>

                    <div className="space-y-1.5">

                      {activeIncident.externalCitations.map((cit, idx) => (

                        <a

                          key={idx}

                          href={cit.url}

                          target="_blank"

                          rel="noopener noreferrer"

                          className="flex items-center justify-between text-xs text-cyan-300 hover:text-cyan-200 transition group"

                        >

                          <span className="truncate max-w-[85%]">

                            • [{cit.platform.toUpperCase()}] {cit.title}

                          </span>

                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />

                        </a>

                      ))}

                    </div>

                  </div>

                )}

                {/* Southbridge JIT Receipts & FinOps Sliding Drawer Button */}

                <button

                  type="button"

                  onClick={() => setIsReceiptsDrawerOpen(true)}

                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-4 py-2 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 active:scale-95 shadow-md shadow-cyan-950/30 transition"

                  title="Open sliding technical inspection drawer for Codon receipts, JIT schema, and FinOps budget"

                >

                  <Receipt className="h-4 w-4 text-cyan-400" />

                  <span>Inspect JIT Receipts & FinOps Drawer</span>

                </button>

                {/* Export Forensic Dossier (Section 90A Evidence Act) Button */}

                <button

                  type="button"

                  onClick={() => {

                    setDossierIncident(activeIncident);

                    setIsDossierOpen(true);

                  }}

                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/50 bg-rose-950/40 px-4 py-2.5 font-mono text-xs font-bold text-rose-200 hover:bg-rose-900/60 active:scale-95 shadow-md shadow-rose-950/40 transition"

                >

                  <FileText className="h-4 w-4 text-rose-400" />

                  <span>Export Evidence Dossier (Sec 90A Evidence Act 1950)</span>

                </button>

                {/* Quick Link to Graph view */}

                <Link

                  href="/graph"

                  className="mt-2 w-full flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-4 py-2.5 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"

                >

                  <span className="flex items-center gap-2">

                    <Network className="h-4 w-4 text-cyan-400" />

                    <span>Explore Full Relationship Graph in Cytoscape</span>

                  </span>

                  <ChevronRight className="h-4 w-4" />

                </Link>

              </div>

            </div>

          ) : (

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-400">

              <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-slate-500" />

              <p className="text-sm font-semibold">No incident matching filter criteria</p>

              <p className="text-xs text-slate-500 mt-1">Try resetting search filters above</p>

            </div>

          )}

          {/* Mini Sentinel Graph Preview for the selected neighborhood */}

          <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 min-h-[300px]">

            <div className="mb-2 flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Compass className="h-4 w-4 text-cyan-400" />

                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">

                  Ontology Graph Neighborhood

                </h4>

              </div>

              <Link

                href="/graph"

                className="font-mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline"

              >

                <span>Full View</span>

                <ChevronRight className="h-3 w-3" />

              </Link>

            </div>

            <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-800 bg-[#080c14]">

              <GraphCanvas

                elements={elements}

                selectedNodeId={activeIncident?.id || selectedNodeId}

                onNodeSelect={(nodeId) => setSelectedNodeId(nodeId)}

              />

            </div>

          </div>

        </div>

      </div>

      {/* Evidence Act 1950 Section 90A Forensic Certificate & PDF Dossier Modal */}

      <EvidenceDossierModal

        isOpen={isDossierOpen}

        incident={dossierIncident || activeIncident}

        onClose={() => {

          setIsDossierOpen(false);

          setDossierIncident(null);

        }}

        graphElements={elements}

      />

      {/* Southbridge JIT Pipeline Receipts & FinOps Sliding Drawer (Rule 09 & 10) */}

      <PipelineReceiptsDrawer

        isOpen={isReceiptsDrawerOpen}

        incident={dossierIncident || activeIncident}

        onClose={() => setIsReceiptsDrawerOpen(false)}

        onOpenSec90ADossier={() => {

          setDossierIncident(activeIncident);

          setIsDossierOpen(true);

        }}

      />

    </div>

  );

}