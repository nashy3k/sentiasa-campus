"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Send,
  Lock,
  UploadCloud,
  CheckCircle2,
  FileImage,
  AlertTriangle,
  Loader2,
  EyeOff,
  Radio,
} from "lucide-react";
import { triageIncident, uploadScreenshotAndTriage } from "../lib/api-client";
import { useDashboard } from "../context/DashboardContext";

export default function StudentIntakePortal() {
  const { currentTenant, setLatestVerdict, handleTriageSuccess, handleTriageVetoed } = useDashboard();

  const [rawText, setRawText] = useState("");
  const [schoolName, setSchoolName] = useState("SMK Sentiasa");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() && !selectedFile) {
      setErrorMsg("Please provide an incident description or upload a screenshot.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      let result: any;
      if (selectedFile) {
        result = await uploadScreenshotAndTriage(selectedFile, schoolName, "AnonymousStudentReporter");
      } else {
        result = await triageIncident({
          raw_text: rawText,
          school_name: schoolName,
          reporter_alias: "AnonymousStudentReporter",
          metadata: {
            intake_channel: "STUDENT_WHISTLEBLOWER_PORTAL",
            anonymous_shield_active: true,
          },
        });
      }

      if (result.jev_passed) {
        handleTriageSuccess(result);
      } else {
        handleTriageVetoed(result);
      }

      setSubmittedIncidentId(result.incident_id || "SEALED-INCIDENT");
      setLatestVerdict({
        text: `Anonymous Whistleblower Report Received: ${result.incident_id || "Intake Logged"}`,
        type: "passed",
      });
      setRawText("");
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit anonymous report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-mono animate-in fade-in duration-200">
      {/* 1. Mandatory Privacy & Legal Protection Banner */}
      <div className="rounded-xl border border-emerald-500/50 bg-[#061410] p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex-shrink-0">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-emerald-200 uppercase tracking-wider">
                STUDENT_REPORTER CLEARANCE // SAFE INTAKE PORTAL
              </span>
              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                RADAR &amp; GRAPH LOCKED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Whistleblower intake interface. In accordance with the <strong>Personal Data Protection Act (PDPA)</strong> and <strong>Child Protection Act 2001</strong>, student reporters have zero access to campus surveillance feeds, Cytoscape relationship graphs, or telemetry dossiers.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-emerald-400 font-semibold mt-2.5">
              <span className="flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> Identity Cryptographically Shielded
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Salted SHA-256 Anti-Retaliation Digest
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Submission Success Confirmation */}
      {submittedIncidentId && (
        <div className="rounded-xl border border-emerald-500/60 bg-emerald-950/40 p-4 font-mono text-xs text-emerald-200 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-emerald-300">
              REPORT RECEIVED &amp; SAFELY TRANSMITTED TO COUNSELING TEAM
            </h4>
            <p className="mt-1 text-slate-300">
              Your report tracking reference is <strong className="text-cyan-300">{submittedIncidentId}</strong>. The report has been evaluated through the sovereign Jev Gatekeeper and dispatched to the certified school counselor on duty.
            </p>
            <button
              type="button"
              onClick={() => setSubmittedIncidentId(null)}
              className="mt-3 rounded bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500 transition text-xs"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      )}

      {/* 3. Whistleblower Submission Form */}
      <div className="rounded-xl border border-cyan-900/40 bg-[#070c18] p-6 shadow-2xl space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-cyan-400" />
              <span>Submit Whistleblower Report</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reports of bullying, gang threats, weapon possession, extortion, or sexual harassment
            </p>
          </div>
          <span className="text-[11px] rounded bg-slate-800 px-2 py-0.5 text-slate-300 border border-slate-700">
            Sector: Klang Valley
          </span>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-rose-500/50 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Campus Institution Selector */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Select Campus / Institution:
            </label>
            <select
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="SMK Sentiasa">SMK Sentiasa (Petaling Utama)</option>
              <option value="SMK Meranti">SMK Meranti (Klang)</option>
              <option value="SMK Taman Desa">SMK Taman Desa (Bangsar / Pudu)</option>
              <option value="Kolej Vokasional Klang">Kolej Vokasional Klang</option>
            </select>
          </div>

          {/* Incident Narrative */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Incident Description or Threat Intelligence:
            </label>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Describe what occurred, who was targeted, location on campus (e.g. toilet, hostel, rear gate), and any slang/weapons mentioned (e.g. parang, tapau, jumpa belakang)..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Optional Screenshot / Evidence Attachment */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Attach Screenshot or Evidence (Optional - WhatsApp, Telegram, Photo):
            </label>
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                selectedFile
                  ? "border-emerald-500/60 bg-emerald-950/20"
                  : "border-slate-800 bg-[#091122]/40 hover:border-cyan-500/50"
              }`}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 text-emerald-300">
                  <FileImage className="h-5 w-5" />
                  <span className="font-bold">{selectedFile.name}</span>
                  <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  <span className="text-cyan-400 underline text-[11px] ml-2">Replace</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <UploadCloud className="h-5 w-5 text-cyan-400" />
                  <span>Click or drag WhatsApp screenshot (.png, .jpg) to attach</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!rawText.trim() && !selectedFile)}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 py-3 font-bold text-white shadow-xl hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>CRYPTOGRAPHICALLY ENCRYPTING &amp; SUBMITTING...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>SUBMIT ANONYMOUS WHISTLEBLOWER REPORT</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
