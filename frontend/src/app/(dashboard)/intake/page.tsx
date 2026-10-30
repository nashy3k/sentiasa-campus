"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Network,
  ShieldAlert,
  Info,
} from "lucide-react";
import IncidentSubmitter, { type TriageResponse } from "../../../components/IncidentSubmitter";
import { useDashboard } from "../../../context/DashboardContext";

export default function WhistleblowerIntakePage() {
  const { handleTriageSuccess, handleTriageVetoed } = useDashboard();
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: "passed" | "vetoed";
    res: TriageResponse;
  } | null>(null);

  const onSuccess = (res: TriageResponse) => {
    handleTriageSuccess(res);
    setSubmissionFeedback({ type: "passed", res });
    // Smooth scroll to top of window to see feedback banner
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onVetoed = (res: TriageResponse) => {
    handleTriageVetoed(res);
    setSubmissionFeedback({ type: "vetoed", res });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Whistleblower Legal & Privacy Banner */}
      <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100">
                  Whistleblower Intake & Evidence Ingest
                </h1>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                  ACT 711 PROTECTED
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Submissions are safeguarded under the Whistleblower Protection Act 2010 (Act 711) and Evidence Act 1950 Section 90A. Metadata is pseudonymized prior to LLM calibration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center font-mono text-xs text-emerald-300/80 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-lg shrink-0">
            <Lock className="h-3.5 w-3.5" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>
      </section>

      {/* Post-Submission Quick Navigation Banner */}
      {submissionFeedback && (
        <section
          className={`rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all ${
            submissionFeedback.type === "passed"
              ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-200"
              : "border-amber-500/50 bg-amber-950/40 text-amber-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {submissionFeedback.type === "passed" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {submissionFeedback.type === "passed"
                    ? `Incident Triaged & Synchronized (Tier ${
                        submissionFeedback.res.severity_tier || 3
                      })`
                    : "Incident Vetoed by Jev Gatekeeper — Diverted to HITL Review"}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {submissionFeedback.type === "passed"
                    ? "Ontology nodes and threat intelligence have been updated in real-time."
                    : (submissionFeedback.res.jev_evaluation?.veto_reason ||
                      "Invariant condition violated. Counselor review required under Evidence Act 1950.")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              {submissionFeedback.type === "passed" ? (
                <>
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <Radio className="h-3.5 w-3.5 text-rose-400" />
                    <span>View in Triage Feed</span>
                  </Link>
                  <Link
                    href="/graph"
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition"
                  >
                    <Network className="h-3.5 w-3.5 text-cyan-400" />
                    <span>View in Graph</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/hitl"
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-purple-300 hover:bg-purple-900/50 transition"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                  <span>Open HITL Queue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main Incident Submitter with File Dropzone & Collapsible Dev Simulation Bench */}
      <IncidentSubmitter
        onTriageSuccess={onSuccess}
        onTriageVetoed={onVetoed}
      />
    </div>
  );
}
