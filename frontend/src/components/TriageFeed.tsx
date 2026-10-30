"use client";

import { useState } from "react";
import { ShieldAlert, CheckCircle, Radio, ExternalLink } from "lucide-react";

export interface ThreatItem {
  id: string;
  severityTier: number;
  timestamp: string;
  schoolName: string;
  contextSummary: string;
  slangTags: string[];
  escalated?: boolean;
  externalCitations?: Array<{
    title: string;
    url: string;
    platform: string;
    engine: string;
    snippet?: string;
    highlights?: string[];
  }>;
  ilmuCalibration?: {
    dNuance?: number;
    slangFidelity?: number;
    sovereignModel?: string;
    verifiedDialect?: string;
  };
  jevVerdict?: {
    passed: boolean;
    reason?: string;
    noulDangerScore?: number;
  };
  jev_telemetry?: {
    imminent_violence?: number;
    weapon_threat?: number;
    extortion_coercion?: number;
    victim_distress?: number;
  };
  extendedArchive?: {
    filename: string;
    path?: string;
    sha256: string;
    uploaded_at?: string;
    filesize_bytes?: number;
  };
  video_filename?: string;
  reporter_alias?: string;
  video_clips?: string[];
  keyframe_timestamps?: number[];
  tenant_id?: string;
  source_url?: string;
  evidenceMetadata?: {
    model_used?: string;
    ocr_engine?: string;
    media_type?: string;
    filename?: string;
    sha256?: string;
  };
  attempt_history?: Array<{
    codon_id: string;
    node_name: string;
    model_family: string;
    hypothesis_tested: string;
    query_a?: Record<string, any>;
    query_b?: Record<string, any>;
    evidence_sufficiency_met: boolean;
    prior_agreement: boolean;
    reserved_cost: number;
    settled_cost: number;
    latency_ms: number;
    shacl_passed: boolean;
    created_at: string;
  }>;
  jit_decision_schema?: {
    hypothesis_id: string;
    threat_category: string;
    positive_sufficiency_criteria: string[];
    exclusion_criteria: string[];
    required_modalities: string[];
    policy_thresholds: {
      critical_action_floor: number;
      elevated_action_floor: number;
      doubt_band_margin: number;
      slang_polysemy_floor: number;
      max_temporal_freshness_seconds: number;
      max_clock_skew_seconds: number;
    };
  };
  prior_agreement?: boolean;
  needs_doubt_review?: boolean;
  budget_ledger?: {
    incident_id: string;
    total_reserved: number;
    total_settled: number;
    total_refunded: number;
    is_frozen: boolean;
    max_cap: number;
  };
  pivoted_nodes?: Array<{
    id: string;
    type: string;
    label: string;
    relation?: string;
    source_url?: string;
    title?: string;
  }>;
  codon_receipts?: any[];
  osint_custody_hash?: string;
  osint_horizon_phase?: string;
  osint_ai_synthesis?: string;
  matched_zone_id?: string;
  matched_zone_name?: string;
  spatial_coordinates?: [number, number];
}

interface TriageFeedProps {
  incidents: ThreatItem[];
  selectedIncidentId?: string | null;
  onIncidentSelect: (incidentId: string) => void;
  onEscalate?: (incident: ThreatItem) => void;
}

const severityTokens: Record<number, { badge: string; label: string }> = {
  1: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    label: "TIER 1 // INFORMATIONAL",
  },
  2: {
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    label: "TIER 2 // MODERATE",
  },
  3: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    label: "TIER 3 // ELEVATED",
  },
  4: {
    badge: "border-orange-500/50 bg-orange-500/20 text-orange-200",
    label: "TIER 4 // SEVERE THREAT",
  },
  5: {
    badge: "border-rose-500/60 bg-rose-500/25 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.3)]",
    label: "TIER 5 // CRITICAL WEAPON",
  },
};

export default function TriageFeed({
  incidents,
  selectedIncidentId,
  onIncidentSelect,
  onEscalate,
}: TriageFeedProps) {
  const [escalatedMap, setEscalatedMap] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<"ALL" | "CRITICAL" | "DOUBT_BAND" | "ESCALATED">("ALL");

  const isDoubtBand = (item: ThreatItem) => {
    if (item.needs_doubt_review) return true;
    if (item.prior_agreement === false) return true;
    const score = item.jevVerdict?.noulDangerScore;
    if (score !== undefined && score >= 0.65 && score <= 0.88) return true;
    return false;
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (filterMode === "CRITICAL") return incident.severityTier >= 4;
    if (filterMode === "DOUBT_BAND") return isDoubtBand(incident);
    if (filterMode === "ESCALATED") return incident.escalated || escalatedMap[incident.id];
    return true;
  });

  const handleEscalateClick = (e: React.MouseEvent, incident: ThreatItem) => {
    e.stopPropagation();
    setEscalatedMap((prev) => ({ ...prev, [incident.id]: true }));
    onEscalate?.(incident);
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
      {/* Feed Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Live Triage Feed
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-slate-300">
            {incidents.length} active intelligence signals across campuses
          </p>
        </div>
        <span className="h-3 w-3 animate-ping rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]" />
      </div>

      {/* Southbridge Rule 07: Filter Control Bar with Doubt Band Tab */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 px-4 py-2 overflow-x-auto bg-slate-950/40 text-xs font-mono">
        <button
          type="button"
          onClick={() => setFilterMode("ALL")}
          className={`rounded-md px-2.5 py-1 transition ${
            filterMode === "ALL"
              ? "bg-slate-700 text-white font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          ALL ({incidents.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("CRITICAL")}
          className={`rounded-md px-2.5 py-1 transition ${
            filterMode === "CRITICAL"
              ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          CRITICAL ({incidents.filter((i) => i.severityTier >= 4).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("DOUBT_BAND")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
            filterMode === "DOUBT_BAND"
              ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>DOUBT BAND</span>
          <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] text-amber-200">
            {incidents.filter(isDoubtBand).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("ESCALATED")}
          className={`rounded-md px-2.5 py-1 transition ${
            filterMode === "ESCALATED"
              ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          ESCALATED ({incidents.filter((i) => i.escalated || escalatedMap[i.id]).length})
        </button>
      </div>

      {/* Feed List */}
      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-4">
        {filteredIncidents.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-slate-400">
            <p className="text-sm">No incidents match this filter view.</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isCritical = incident.severityTier >= 4;
            const isSelected = selectedIncidentId === incident.id;
            const isEscalated = escalatedMap[incident.id] || incident.escalated;
            const currentTier = severityTokens[incident.severityTier] || severityTokens[3];
            const inDoubt = isDoubtBand(incident);

            return (
              <article
                key={incident.id}
                onClick={() => onIncidentSelect(incident.id)}
                className={`cursor-pointer rounded-xl border p-4 transition duration-150 ${
                  isSelected
                    ? "border-rose-400/80 bg-slate-800/90 shadow-[0_0_20px_rgba(244,63,94,0.18)]"
                    : "border-slate-800/80 bg-slate-900/80 hover:border-slate-600/70 hover:bg-slate-850/80"
                }`}
              >
                {/* Header row: Tier badge & Timestamp */}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-md border px-2.5 py-1 font-mono text-xs font-bold tracking-wide ${currentTier.badge}`}
                  >
                    {currentTier.label}
                  </span>
                  <time className="font-mono text-right text-[13px] font-medium text-slate-300">
                    {incident.timestamp}
                  </time>
                </div>

                {/* Campus name & Counselor Dispatch status */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-100">
                    {incident.schoolName}
                  </h3>
                  {isEscalated && (
                    <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 font-medium">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      Counselor Dispatched
                    </span>
                  )}
                </div>

                {/* Context Summary / Body Prose */}
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  {incident.contextSummary}
                </p>

                {/* Slang / Dialect Chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {incident.slangTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-200 border border-slate-700/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Sovereign Vernacular & Sentinel Guard Telemetry Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="flex items-center gap-1.5 rounded-md bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-1 text-cyan-200">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>VERNACULAR {incident.ilmuCalibration?.sovereignModel || "Sovereign-Engine"}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-300 font-medium">
                      D_nuance: {incident.ilmuCalibration?.dNuance !== undefined ? incident.ilmuCalibration.dNuance.toFixed(2) : "1.58"}
                    </span>
                  </span>

                  <span
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium ${
                      incident.jevVerdict?.passed ?? true
                        ? "bg-purple-950/60 border-purple-500/40 text-purple-200"
                        : "bg-amber-950/60 border-amber-500/40 text-amber-200"
                    }`}
                  >
                    <span>SENTINEL GUARD: {incident.jevVerdict?.passed ?? true ? "PASSED" : "VETOED"}</span>
                    {incident.jevVerdict?.noulDangerScore !== undefined && (
                      <span className="text-slate-300">
                        ({incident.jevVerdict.noulDangerScore.toFixed(2)})
                      </span>
                    )}
                  </span>

                  {inDoubt && (
                    <span className="flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/20 px-2.5 py-1 font-mono text-xs font-bold text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                      <span>DOUBT BAND // DISAGREEMENT</span>
                    </span>
                  )}
                </div>

                {/* OSINT Citation Cards (Public Sweep & Neural Grounding) */}
                {incident.externalCitations && incident.externalCitations.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-300 mb-2 font-semibold">
                      <Radio className="h-3.5 w-3.5 text-blue-400" />
                      <span>CORROBORATING OSINT CITATIONS ({incident.externalCitations.length})</span>
                    </div>
                    <div className="space-y-2">
                      {incident.externalCitations.slice(0, 2).map((cit, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                              {cit.platform || cit.engine}
                            </span>
                            <a
                              href={cit.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-[220px] underline flex items-center gap-1 font-medium"
                            >
                              <span>{cit.title || cit.url}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                          {cit.highlights && cit.highlights.length > 0 && (
                            <p className="mt-1.5 text-xs italic text-slate-300 line-clamp-2 border-l-2 border-blue-400/50 pl-2">
                              &ldquo;{cit.highlights[0]}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalate CTA button */}
                <button
                  type="button"
                  onClick={(e) => handleEscalateClick(e, incident)}
                  disabled={isEscalated}
                  className={`mt-4 w-full rounded-lg px-4 py-2.5 font-mono text-xs font-bold transition flex items-center justify-center gap-2 ${
                    isEscalated
                      ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default"
                      : isCritical
                      ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:bg-rose-500"
                      : "border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {isEscalated ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Counselor Notified & Dispatched</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4" />
                      <span>Escalate Incident to Counselor</span>
                    </>
                  )}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
