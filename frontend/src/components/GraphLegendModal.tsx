"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Building2,
  User,
  Film,
  Globe,
  ArrowRight,
  GitCommit,
  Activity,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Radio,
  Smartphone,
} from "lucide-react";

interface GraphLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GraphLegendModal({ isOpen, onClose }: GraphLegendModalProps) {
  const [activeTab, setActiveTab] = useState<"ENTITIES" | "ANATOMY">("ENTITIES");

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto text-slate-100">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#060a12] px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
                  Ontology Graph Legend & Incident Anatomy Guide
                </h3>
                <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                  CAMPUS ONTOLOGY SPEC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Campus Safety Intelligence • Section 90A Evidence Act 1950 • Multi-INT Sensory Fusion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition active:scale-95"
            title="Close Guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-6 pt-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ENTITIES")}
            className={`flex items-center gap-2 pb-2.5 px-3 border-b-2 font-bold transition ${
              activeTab === "ENTITIES"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>1. Semantic Node Types & Visual Markers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ANATOMY")}
            className={`flex items-center gap-2 pb-2.5 px-3 border-b-2 font-bold transition ${
              activeTab === "ANATOMY"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>2. Where Nodes Fit in an Incident (Lifecycle Flow)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/90 text-xs">
          {activeTab === "ENTITIES" ? (
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed font-sans text-xs sm:text-sm">
                The SENTIASA Safety Intelligence Canvas models campus well-being using a <strong>Deterministic Semantic Triad Ontology</strong>. 
                Each shape and color represents a specialized legal, demographic, or sensory construct:
              </p>

              {/* Grid of Entity Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. SchoolNode */}
                <div className="rounded-xl border border-blue-500/40 bg-blue-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rotate-45 bg-blue-500 rounded flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Building2 className="h-3.5 w-3.5 -rotate-45 text-white" />
                      </div>
                      <span className="font-mono font-bold text-sm text-blue-300">SchoolNode</span>
                    </div>
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] text-blue-200 border border-blue-500/30">
                      BLUE DIAMOND
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Campus Anchor & Institutional Locus</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Represents the physical educational institution (e.g., <em>SMK Seksyen 11 Shah Alam</em>). 
                    Anchors GPS coordinates, administrative safety perimeters, and institutional emergency contact directories.
                  </p>
                  <div className="font-mono text-[11px] text-blue-300/80 bg-blue-950/40 rounded p-1.5 border border-blue-900/50">
                    Edges: <code>LOCATED_AT</code> from Incidents and Cameras.
                  </div>
                </div>

                {/* 2. PersonaNode */}
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <User className="h-3.5 w-3.5 text-slate-950 font-bold" />
                      </div>
                      <span className="font-mono font-bold text-sm text-amber-300">PersonaNode</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-200 border border-amber-500/30">
                      ORANGE CIRCLE
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Student Persona / Demographic Actor</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Zero-PII synthetic demographic handle compliant with the <strong>Malaysian PDPA 2010</strong>. 
                    Differentiates behavioral roles: <em>Target</em> (at-risk pupil), <em>Instigator</em> (threat carrier), <em>Bystander</em>, or <em>Reporter</em> (whistleblower).
                  </p>
                  <div className="font-mono text-[11px] text-amber-300/80 bg-amber-950/40 rounded p-1.5 border border-amber-900/50">
                    Edges: <code>COMMUNICATES</code>, <code>REPORTS_THREAT</code>, <code>TARGETS</code>.
                  </div>
                </div>

                {/* 2b. HUMINT Whistleblower Node */}
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Smartphone className="h-3.5 w-3.5 text-slate-950 font-bold" />
                      </div>
                      <span className="font-mono font-bold text-sm text-emerald-300">HUMINT Whistleblower</span>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-200 border border-emerald-500/30">
                      EMERALD CIRCLE
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Whistleblower / Mobile 24/7 HUMINT Ingest</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Student whistleblower or on-duty warden submitting intelligence via WhatsApp 24/7 or Tactical Uplink. 
                    Cryptographically protected under <strong>Child Act 2001</strong> with salted cryptographic pseudonyms (e.g., <code>WHISTLEBLOWER_ANON_69AF2D37</code>).
                  </p>
                  <div className="font-mono text-[11px] text-emerald-300/80 bg-emerald-950/40 rounded p-1.5 border border-emerald-900/50">
                    Edges: <code>REPORTS_THREAT</code> &bull; Direct encrypted uplink to incident.
                  </div>
                </div>

                {/* 3. ThreatEventNode */}
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-7 rounded-[4px] bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
                        <ShieldAlert className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-mono font-bold text-sm text-rose-300">ThreatEventNode</span>
                    </div>
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] text-rose-200 border border-rose-500/30">
                      RED RECTANGLE
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Incident Epicenter & Safety Anomaly</h4>
                  <p className="text-slate-400 leading-relaxed">
                    The core incident synthesized by the AI triage engine (e.g., <code>threat_64773be0</code>). 
                    Calculates Defcon severity tiers (Tier 1–5), dialect normalization, and initiates automated counselor intervention protocols.
                  </p>
                  <div className="font-mono text-[11px] text-rose-300/80 bg-rose-950/40 rounded p-1.5 border border-rose-900/50">
                    Video: Contains multi-clip switcher for 1s Probe Burst & 12s Archive.
                  </div>
                </div>

                {/* 4. EvidenceNode (CCTV Keyframe Exhibit) */}
                <div className="rounded-xl border border-amber-500/50 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]">
                        <Film className="h-3 w-3 text-slate-950" />
                      </div>
                      <span className="font-mono font-bold text-sm text-amber-300">EvidenceNode</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-200 border border-amber-500/30">
                      AMBER HEXAGON
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Section 90A Physical Forensic Exhibit</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Direct sensory exhibit captured from edge CCTV hardware (such as <code>EVI-...</code> or <code>evi-seed-cctv</code>). 
                    Cryptographically sealed with SHA-256 digests for statutory admissibility under <strong>Section 90A Evidence Act 1950</strong>.
                  </p>
                  <div className="font-mono text-[11px] text-amber-300/80 bg-amber-950/40 rounded p-1.5 border border-amber-900/50">
                    Edges: <code>CORROBORATES</code> ➔ Links physical camera burst to Incident.
                  </div>
                </div>

                {/* 5. EntityTransformNode (OSINT Pivot) */}
                <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-7 rounded-[4px] bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                        <Globe className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-mono font-bold text-sm text-purple-300">EntityTransformNode</span>
                    </div>
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] text-purple-200 border border-purple-500/30">
                      PURPLE PILL
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Open-Source Intelligence (OSINT) Pivot</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Public horizon intelligence corroborated across external community forums (Lowyat Kopitiam, Telegram groups, TikTok chatter). 
                    Validates whether on-campus tension is linked to broader inter-school gang rivalries or viral social media rumors.
                  </p>
                  <div className="font-mono text-[11px] text-purple-300/80 bg-purple-950/40 rounded p-1.5 border border-purple-900/50">
                    Content: Corroborated URLs, search queries, and external citations.
                  </div>
                </div>

                {/* 6. Relational Triple Edges */}
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center">
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-300" />
                      </div>
                      <span className="font-mono font-bold text-sm text-cyan-300">RelationalTriples</span>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-700">
                      DIRECTED EDGES
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">Causal & Spatial Ontological Links</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Directed edges connecting entities to form a traceable audit trail:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-300">
                    <div>• <code>LOCATED_AT</code>: Spatial locus</div>
                    <div>• <code>CORROBORATES</code>: Evidentiary proof</div>
                    <div>• <code>REPORTS_THREAT</code>: Whistleblower</div>
                    <div>• <code>TARGETS</code>: Hostility direction</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Incident Anatomy & Lifecycle Flow */
            <div className="space-y-6">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <h4 className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <span>The 4-Stage Multi-INT Fusion Workflow</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Every incident in SENTIASA moves through a deterministic chain-of-custody pipeline that unites 
                  physical sensors, human reports, and open-source chatter into a single verifiable graph:
                </p>
              </div>

              {/* Step-by-Step Anatomy Cards */}
              <div className="space-y-3 font-mono">
                {/* Step 1 */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs">
                    1
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">
                        Sensory Trigger (Edge CCTV / Whistleblower Ingest)
                      </span>
                      <span className="rounded bg-amber-500/20 px-2 py-0.2 text-[10px] text-amber-300 border border-amber-500/40">
                        HUMINT / VISINT
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      The edge campus camera (e.g., CCTV Rear Gate) detects rapid physical motion spikes or perimeter anomalies, 
                      or a student submits vernacular text via the intake portal. The edge creates an immediate <strong>1-second probe burst</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                    2
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">
                        Section 90A Cryptographic Hashing (EvidenceNode Created)
                      </span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.2 text-[10px] text-emerald-300 border border-emerald-500/40">
                        EVIDENCE ACT 1950
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      Before AI reasoning runs, the video burst is hashed with SHA-256 and registered into the media vault. 
                      An amber hexagon <strong>EvidenceNode</strong> (<code>EVI-...</code>) is instantiated to guarantee forensic non-repudiation.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 font-bold text-xs">
                    3
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">
                        Cognitive Triangulation & OSINT Pivoting
                      </span>
                      <span className="rounded bg-purple-500/20 px-2 py-0.2 text-[10px] text-purple-300 border border-purple-500/40">
                        NVIDIA NEMOTRON + OSINT
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      The reasoning model normalizes regional dialect, creates the orange <strong>PersonaNode</strong>, and 
                      triggers open-source search queries across community forums, generating purple <strong>EntityTransformNodes</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-950 border border-rose-500/40 text-rose-300 font-bold text-xs">
                    4
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">
                        Defcon Tiering & Automated Rolling Archive
                      </span>
                      <span className="rounded bg-rose-500/20 px-2 py-0.2 text-[10px] text-rose-300 border border-rose-500/40">
                        INTERVENTION
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      The red <strong>ThreatEventNode</strong> links to the blue <strong>SchoolNode</strong> locus. If Tier &gt;= 4, 
                      the edge sampler records a 12-second extended archive in the background and uploads it to complete the evidentiary record.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 bg-[#060a12] px-6 py-3 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-400">
            Tip: Click any node on the graph canvas to inspect its legal certificate or intelligence profile.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 font-bold text-white transition active:scale-95"
          >
            Got it (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
