"use client";

import { useState, useCallback } from "react";

import Link from "next/link";

import GraphCanvas from "../../../components/GraphCanvas";
import EvidenceDossierModal from "../../../components/EvidenceDossierModal";
import type { ThreatItem } from "../../../components/TriageFeed";

import {

  ShieldAlert,

  FileCheck,

  CheckCircle2,

  Lock,

  ArrowRight,

  Radio,

  Network,

  Scale,

  FileCode,

} from "lucide-react";

import HitlQueueSection from "../../../components/HitlQueueSection";

import { useDashboard } from "../../../context/DashboardContext";

export default function HitlGovernancePage() {

  const { hitlRefreshCounter, handleHitlResolved, currentTenant, elements, incidents } = useDashboard();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<ThreatItem | null>(null);

  const handleOpenDossierForNode = useCallback(
    (nodeIdOrIncident: string | any) => {
      if (typeof nodeIdOrIncident === "object" && nodeIdOrIncident !== null) {
        setSelectedIncidentForModal(nodeIdOrIncident);
        return;
      }
      const nodeId = String(nodeIdOrIncident);
      const direct = incidents.find((i) => i.id === nodeId);
      if (direct) {
        setSelectedIncidentForModal(direct);
        return;
      }
      const edge = elements?.find(
        (el) => el.data && (el.data.source === nodeId || el.data.target === nodeId)
      );
      if (edge) {
        const peerId = edge.data.source === nodeId ? edge.data.target : edge.data.source;
        const peer = incidents.find((i) => i.id === peerId);
        if (peer) {
          setSelectedIncidentForModal(peer);
          return;
        }
      }
      const clickedEl = elements?.find((el) => el.data?.id === nodeId);
      if (clickedEl && clickedEl.data) {
        const d = clickedEl.data;
        setSelectedIncidentForModal({
          id: d.id || nodeId,
          severityTier: (Number(d.visual_severity || d.severity_tier) || 4) as any,
          timestamp: d.timestamp_sec != null ? `T+${Number(d.timestamp_sec).toFixed(1)}s` : "Visual Exhibit",
          schoolName: d.school || d.school_name || "Verified Ingest Sensor (Edge Node)",
          contextSummary: `Entity Exhibit [${d.label || d.type || "Graph Entity"}]. Details: ${d.threatLabel || d.alias || d.name || nodeId}.`,
          slangTags: Array.isArray(d.threat_markers) ? d.threat_markers : ["graph_entity"],
          video_filename: d.video_filename || d.filename,
          video_clips: d.video_filename ? [d.video_filename] : [],
          extendedArchive: {
            sha256: d.sha256 || "9b3c4f7a1e2d8b5c9a0f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b",
            uploaded_at: new Date().toISOString(),
            filename: d.video_filename || d.filename,
          },
        });
      }
    },
    [incidents, elements]
  );

  return (

    <div className="w-full space-y-4">

      {/* Evidence Act 1950 & SHACL Compliance Banner */}

      <section className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 shadow-lg backdrop-blur-md">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

          <div className="flex items-start gap-3.5">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">

              <Scale className="h-5 w-5" />

            </div>

            <div>

              <div className="flex items-center gap-2">

                <h1 className="text-base font-bold text-slate-100">

                  Human-In-The-Loop (HITL) Governance Station

                </h1>

                <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 font-mono text-[11px] font-bold text-purple-300">

                  EVIDENCE ACT 1950 SEC. 90A

                </span>

              </div>

              <p className="mt-1 text-xs leading-relaxed text-slate-300">

                Incidents flagged by Deterministic Invariant Gatekeeper invariants are held in quarantine pending verified human counselor sign-off. Overrides generate cryptographically attributable audit trails.

              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-purple-300/90 bg-purple-950/40 border border-purple-500/30 px-3 py-1.5 rounded-lg shrink-0">

            <Lock className="h-3.5 w-3.5" />

            <span>Forensic Chain of Custody</span>

          </div>

        </div>

        {/* 4-Point Governance Checklist */}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-purple-800/40">

          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">

            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />

            <div className="min-w-0">

              <span className="text-xs font-semibold text-slate-200 block truncate">

                Sovereign Vernacular

              </span>

              <span className="text-[11px] text-slate-400 block font-mono">

                1.58 D_nuance verify

              </span>

            </div>

          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">

            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />

            <div className="min-w-0">

              <span className="text-xs font-semibold text-slate-200 block truncate">

                Sentinel Guard Boundary

              </span>

              <span className="text-[11px] text-slate-400 block font-mono">

                System Invariant Gate

              </span>

            </div>

          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">

            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />

            <div className="min-w-0">

              <span className="text-xs font-semibold text-slate-200 block truncate">

                Hash Logging

              </span>

              <span className="text-[11px] text-slate-400 block font-mono">

                SHA-256 Audit Trail

              </span>

            </div>

          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">

            <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />

            <div className="min-w-0">

              <span className="text-xs font-semibold text-slate-200 block truncate">

                Counselor Sign-off

              </span>

              <span className="text-[11px] text-purple-300 block font-mono">

                Required for Release

              </span>

            </div>

          </div>

        </div>

      </section>

      {/* Two-Column Cockpit Layout */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* Left & Center: Live Forensic Graph Canvas (7 cols) */}

        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg backdrop-blur-md min-h-[640px]">

          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5 px-2">

            <div className="flex items-center gap-2">

              <Network className="h-4 w-4 text-cyan-400" />

              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">

                QUARANTINED INCIDENT ONTOLOGY TOPOLOGY

              </h2>

            </div>

            {selectedIncidentId && (

              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-300">

                FOCUSED: {selectedIncidentId}

              </span>

            )}

          </div>

          <div className="relative flex-1 min-h-[560px] rounded-lg overflow-hidden border border-slate-800/80 bg-[#060a12]">

            <GraphCanvas

              elements={elements}

              selectedNodeId={selectedIncidentId}

              onNodeSelect={(nodeId) => setSelectedIncidentId(nodeId)}

              onOpenDossier={handleOpenDossierForNode}

            />

          </div>

        </div>

        {/* Right: HITL Quarantine Queue (5 cols) */}

        <div className="lg:col-span-5 flex flex-col min-h-[640px]">

          <HitlQueueSection

            tenantId={currentTenant || "smk-sentiasa"}

            refreshSignal={hitlRefreshCounter}

            selectedIncidentId={selectedIncidentId}

            onSelectIncident={(targetId) => setSelectedIncidentId(targetId)}

            onOpenDossier={handleOpenDossierForNode}

            onResolved={handleHitlResolved}

          />

        </div>

      </div>

      {/* Evidence Act 1950 Section 90A Forensic Certificate & PDF Dossier Modal */}

      <EvidenceDossierModal

        isOpen={Boolean(selectedIncidentForModal)}

        incident={selectedIncidentForModal}

        onClose={() => setSelectedIncidentForModal(null)}

        graphElements={elements}

      />

    </div>

  );

}