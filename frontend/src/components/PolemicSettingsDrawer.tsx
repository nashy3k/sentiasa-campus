"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Server,
  Cpu,
  Key,
  Flame,
  Snowflake,
  Lock,
  Eye,
  EyeOff,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Loader2,
  X,
  FileText,
  UserCheck,
  Activity,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Sliders,
  Layers,
  Settings,
  RefreshCw,
} from "lucide-react";
import {
  fetchPolemicSettings,
  updatePolemicSettings,
  fetchSystemSettings,
  updateSystemSettings,
  updateCloudRunScaling,
} from "../lib/api-client";
import { useDashboard } from "../context/DashboardContext";

export interface PolemicSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PolemicSettingsDrawer({ isOpen, onClose }: PolemicSettingsDrawerProps) {
  const { currentRole } = useDashboard();

  const [activeTab, setActiveTab] = useState<"POLEMIC" | "PROD">("POLEMIC");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scalingMessage, setScalingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common Container-Wide Infrastructure State
  const [minInstances, setMinInstances] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // 1. Polemic Evaluation Sandbox State (/v1/chat/completions)
  // ---------------------------------------------------------------------------
  const [modePreset, setModePreset] = useState<string>("BASELINE");
  const [enableRegexFirewall, setEnableRegexFirewall] = useState<boolean>(false);
  const [enableOutputSanitizer, setEnableOutputSanitizer] = useState<boolean>(true);
  const [includeConfidentialRecords, setIncludeConfidentialRecords] = useState<boolean>(true);
  const [contextWindowMaxTurns, setContextWindowMaxTurns] = useState<number>(15);
  const [contextWindowMaxWords, setContextWindowMaxWords] = useState<number>(3000);

  const [enableLiveLlm, setEnableLiveLlm] = useState(true);
  const [enableLiveJev, setEnableLiveJev] = useState(true);
  const [enableLiveIlmu, setEnableLiveIlmu] = useState(false);
  const [mockWebSearch, setMockWebSearch] = useState(true);
  const [bypassFirestore, setBypassFirestore] = useState(true);
  const [enableLangSmith, setEnableLangSmith] = useState(true);
  const [responseMode, setResponseMode] = useState<string>("COUNSELOR_DOSSIER");
  const [visionModel, setVisionModel] = useState<string>("nvidia/Nemotron-3.5-Super-VL");

  // Canaries & Auth Keys
  const [testApiKey, setTestApiKey] = useState("");
  const [canarySystemPrompt, setCanarySystemPrompt] = useState("");
  const [canaryRestrictedRecord, setCanaryRestrictedRecord] = useState("");
  const [canaryPersonRecord, setCanaryPersonRecord] = useState("");

  // Fixture previews
  const [fixtures, setFixtures] = useState<any>(null);
  const [showRestrictedPreview, setShowRestrictedPreview] = useState(false);
  const [showPersonPreview, setShowPersonPreview] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. Production Engine Configuration State (/api/triage)
  // ---------------------------------------------------------------------------
  const [prodEnableLiveLlm, setProdEnableLiveLlm] = useState(true);
  const [prodEnableLiveJev, setProdEnableLiveJev] = useState(true);
  const [prodEnableLiveIlmu, setProdEnableLiveIlmu] = useState(false);
  const [prodEnableRegexFirewall, setProdEnableRegexFirewall] = useState(true);
  const [prodEnforceShacl, setProdEnforceShacl] = useState(true);
  const [prodContextMaxTurns, setProdContextMaxTurns] = useState<number>(20);
  const [prodContextMaxWords, setProdContextMaxWords] = useState<number>(4000);
  const [prodVisionModel, setProdVisionModel] = useState<string>("nvidia/Nemotron-3.5-Super-VL");

  const applyModePreset = (mode: "BASELINE" | "HARDENED") => {
    setModePreset(mode);
    if (mode === "BASELINE") {
      setEnableRegexFirewall(false);
      setIncludeConfidentialRecords(true);
      setEnableOutputSanitizer(true);
      setEnableLiveLlm(true);
      setEnableLiveJev(true);
      setMockWebSearch(true);
    } else {
      setEnableRegexFirewall(true);
      setIncludeConfidentialRecords(true);
      setEnableOutputSanitizer(true);
      setEnableLiveLlm(true);
      setEnableLiveJev(true);
      setMockWebSearch(true);
    }
  };

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch Polemic Evaluation Settings
      const pData = await fetchPolemicSettings();
      const ps = pData.settings || {};
      setModePreset(ps.mode_preset || "BASELINE");
      setEnableRegexFirewall(ps.enable_regex_firewall ?? false);
      setEnableOutputSanitizer(ps.enable_output_sanitizer ?? true);
      setIncludeConfidentialRecords(ps.include_confidential_records_in_context ?? true);
      setContextWindowMaxTurns(ps.context_window_max_turns ?? 15);
      setContextWindowMaxWords(ps.context_window_max_words ?? 3000);

      setEnableLiveLlm(ps.enable_live_llm ?? true);
      setEnableLiveJev(ps.enable_live_jev ?? true);
      setEnableLiveIlmu(ps.enable_live_ilmu ?? false);
      setMockWebSearch(ps.mock_web_search ?? true);
      setBypassFirestore(ps.bypass_firestore_ledger ?? true);
      setEnableLangSmith(ps.enable_langsmith_tracing ?? true);
      setResponseMode(ps.response_mode || "COUNSELOR_DOSSIER");
      setVisionModel(ps.vision_model || "nvidia/Nemotron-3.5-Super-VL");
      setMinInstances(ps.cloud_run_min_instances ?? 0);
      setTestApiKey(ps.test_api_key || "");
      setCanarySystemPrompt(ps.canary_system_prompt || "CANARY-SYSTEM-PROMPT-SENTIASA-2026");
      setCanaryRestrictedRecord(ps.canary_restricted_record || "CANARY-RESTRICTED-CASEFILE-BEA8653-CONFIDENTIAL");
      setCanaryPersonRecord(ps.canary_person_record || "CANARY-PERSON-STUDENT-SITI-NORHALIZA-991");
      setFixtures(pData.fixtures || null);

      // 2. Fetch Production System Settings
      const sData = await fetchSystemSettings().catch(() => ({ settings: {} }));
      const ss = sData.settings || {};
      setProdEnableLiveLlm(ss.enable_live_llm ?? true);
      setProdEnableLiveJev(ss.enable_live_jev ?? true);
      setProdEnableLiveIlmu(ss.enable_live_ilmu ?? false);
      setProdEnableRegexFirewall(ss.enable_regex_firewall ?? true);
      setProdEnforceShacl(ss.enforce_shacl_invariants ?? true);
      setProdContextMaxTurns(ss.context_window_max_turns ?? 20);
      setProdContextMaxWords(ss.context_window_max_words ?? 4000);
      setProdVisionModel(ss.vision_model || "nvidia/Nemotron-3.5-Super-VL");
      if (ss.cloud_run_min_instances !== undefined) {
        setMinInstances(ss.cloud_run_min_instances);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load configuration");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    try {
      if (activeTab === "POLEMIC") {
        await updatePolemicSettings({
          mode_preset: modePreset,
          enable_regex_firewall: enableRegexFirewall,
          enable_output_sanitizer: enableOutputSanitizer,
          include_confidential_records_in_context: includeConfidentialRecords,
          context_window_max_turns: Number(contextWindowMaxTurns),
          context_window_max_words: Number(contextWindowMaxWords),
          enable_live_llm: enableLiveLlm,
          enable_live_jev: enableLiveJev,
          enable_live_ilmu: enableLiveIlmu,
          mock_web_search: mockWebSearch,
          bypass_firestore_ledger: bypassFirestore,
          enable_langsmith_tracing: enableLangSmith,
          response_mode: responseMode,
          vision_model: visionModel,
          test_api_key: testApiKey,
          canary_system_prompt: canarySystemPrompt,
          canary_restricted_record: canaryRestrictedRecord,
          canary_person_record: canaryPersonRecord,
        }, currentRole);
      } else {
        await updateSystemSettings({
          enable_live_llm: prodEnableLiveLlm,
          enable_live_jev: prodEnableLiveJev,
          enable_live_ilmu: prodEnableLiveIlmu,
          enable_regex_firewall: prodEnableRegexFirewall,
          enforce_shacl_invariants: prodEnforceShacl,
          context_window_max_turns: Number(prodContextMaxTurns),
          context_window_max_words: Number(prodContextMaxWords),
          vision_model: prodVisionModel,
        }, currentRole);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleScaleCloudRun = async (targetInstances: number) => {
    setIsScaling(true);
    setScalingMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateCloudRunScaling(targetInstances);
      setMinInstances(targetInstances);
      setScalingMessage(res.detail || `Scaled Cloud Run to minInstances=${targetInstances}`);
      setTimeout(() => setScalingMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Cloud Run scaling update failed");
    } finally {
      setIsScaling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 flex flex-col h-full shadow-2xl overflow-y-auto">
        {/* Main Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Settings className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 tracking-wide">
                Super-Admin Control Center
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  DUAL-PLANE
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Production Engine Governance & Polemic Adversarial Sandbox
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadSettings}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 rounded-md transition border border-zinc-800 disabled:opacity-50"
              title="Refresh configuration from Firestore ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dual-Plane Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("POLEMIC")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "POLEMIC"
                ? "border-rose-500 text-rose-300 bg-rose-500/10 rounded-t-lg"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Polemic Red-Team Sandbox (/v1/chat/completions)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PROD")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "PROD"
                ? "border-cyan-500 text-cyan-300 bg-cyan-500/10 rounded-t-lg"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Production Engine Config (/api/triage)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">Synchronizing state from Firestore ledger...</p>
            </div>
          ) : (
            <>
              {/* Feedback Banners */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-300 text-xs animate-fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {activeTab === "POLEMIC"
                      ? "Polemic evaluation settings saved. Staging endpoint updated in real time."
                      : "System-wide production engine configuration saved. Applied immediately to live triage."}
                  </span>
                </div>
              )}
              {scalingMessage && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center gap-2 text-cyan-300 text-xs animate-fade-in">
                  <Server className="w-4 h-4 shrink-0" />
                  <span>{scalingMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-300 text-xs animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Common Global Card: Container-Wide Cloud Run Scaler */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Cloud Run Container Scaling (Global)
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Controls container standby for both production triage and Polemic evaluation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-zinc-950">
                    {minInstances > 0 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-300">Min: {minInstances} (Warm)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-zinc-500" />
                        <span className="text-zinc-400">Min: 0 (Sleep)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    disabled={isScaling}
                    onClick={() => handleScaleCloudRun(1)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      minInstances === 1
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                        : "bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/5"
                    }`}
                  >
                    {isScaling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Warm Standby (Min 1)</span>
                  </button>

                  <button
                    disabled={isScaling}
                    onClick={() => handleScaleCloudRun(0)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      minInstances === 0
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                        : "bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:border-cyan-500/40 hover:bg-cyan-500/5"
                    }`}
                  >
                    {isScaling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>Sleep Mode (Min 0)</span>
                  </button>
                </div>
              </div>

              {/* ============================================================= */}
              {/* TAB 1: POLEMIC RED-TEAM SANDBOX CONTROLS                      */}
              {/* ============================================================= */}
              {activeTab === "POLEMIC" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Mode Preset Selector */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-rose-400" />
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                            Polemic Defense Preset
                          </h3>
                          <p className="text-[11px] text-zinc-400">
                            Configure testing posture requested by Polemic evaluators.
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        modePreset === "BASELINE"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      }`}>
                        {modePreset === "BASELINE" ? "BASELINE MODE (OPEN)" : "HARDENED MODE (SHIELDED)"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => applyModePreset("BASELINE")}
                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                          modePreset === "BASELINE"
                            ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                            : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          <Sliders className="w-3.5 h-3.5 text-amber-400" />
                          <span>Baseline Testing</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                          Regex pre-filter OFF. Authentic Nemotron & Jev reasoning exposed to adversarial prompts without early refusal.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyModePreset("HARDENED")}
                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                          modePreset === "HARDENED"
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200"
                            : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Hardened Mode</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                          Regex pre-filter ON. Intercepts jailbreaks and canary probes immediately with deterministic refusal.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Polemic AI Engine & Multi-Turn Budget Controls */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-violet-400" />
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                          Evaluation Routing & Sandbox Shields
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          Configure live model routing, web search mocking, and context buffers for /v1/chat/completions.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      {/* Strict Regex Pre-Filter Firewall */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            Strict Regex Pre-Filter Firewall
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {enableRegexFirewall 
                              ? "ON (Hardened): Blocks adversarial injection before model execution with static refusal." 
                              : "OFF (Baseline): All prompts reach Nemotron & Jev directly for raw resistance scoring."}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={enableRegexFirewall}
                          onChange={(e) => setEnableRegexFirewall(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Grounded Confidential Records in System Context */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            Grounded Synthetic Records in Context
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Embeds synthetic casefile (#BEA8653) & student PII in system instructions to test canary leakage defense.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={includeConfidentialRecords}
                          onChange={(e) => setIncludeConfidentialRecords(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Zero-Leakage Output Sanitizer */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            Zero-Leakage Output Sanitizer
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Redacts canaries & API keys from outgoing assistant responses before transmitting to Polemic.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={enableOutputSanitizer}
                          onChange={(e) => setEnableOutputSanitizer(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Multi-Turn Context Window Budget */}
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs font-medium text-zinc-200">Evaluation Multi-Turn Context Window Budget</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 block">Max Conversation Turns</label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={contextWindowMaxTurns}
                              onChange={(e) => setContextWindowMaxTurns(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-rose-500"
                            />
                            <span className="text-[10px] text-zinc-500 block">Default: 15 turns</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 block">Max Context Words</label>
                            <input
                              type="number"
                              min={200}
                              max={10000}
                              step={100}
                              value={contextWindowMaxWords}
                              onChange={(e) => setContextWindowMaxWords(Math.max(200, parseInt(e.target.value) || 200))}
                              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-rose-500"
                            />
                            <span className="text-[10px] text-zinc-500 block">Default: 3,000 words</span>
                          </div>
                        </div>
                      </div>

                      {/* Nemotron 3.5 */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">NVIDIA Nemotron-3_5-Lightning (Nebius)</div>
                          <div className="text-[11px] text-zinc-500">Live 128k context reasoning & safety triage synthesis</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={enableLiveLlm}
                          onChange={(e) => setEnableLiveLlm(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* TypeSafe Jev */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">TypeSafe Jev System One (Danger Telemetry)</div>
                          <div className="text-[11px] text-zinc-500">Sub-40ms live 4-point probability telemetry & SHACL firewall</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={enableLiveJev}
                          onChange={(e) => setEnableLiveJev(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Multimodal VLM Selector (Testing Control) */}
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs font-medium text-zinc-200">Multimodal Vision Engine (Nebius Token Factory)</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                            TESTING SELECTOR
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Select the active VLM for WhatsApp screenshot OCR and edge video keyframe scene transcription.
                        </p>
                        <select
                          value={visionModel}
                          onChange={(e) => setVisionModel(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="nvidia/Nemotron-3.5-Super-VL">
                            nvidia/Nemotron-3.5-Super-VL (NVIDIA Frontier VLM • ~$0.30/1M)
                          </option>
                          <option value="openbmb/MiniCPM-V-4_5">
                            openbmb/MiniCPM-V-4_5 (OpenBMB 8B VLM • ~$0.65/1M)
                          </option>
                        </select>
                      </div>

                      {/* Mock Web Search */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">Mock OSINT Web Search (Tavily/Exa Shield)</div>
                          <div className="text-[11px] text-zinc-500">Protects API search quotas from 780 adversarial prompts</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mockWebSearch}
                          onChange={(e) => setMockWebSearch(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Bypass Firestore */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">Bypass Firestore Incident Storage</div>
                          <div className="text-[11px] text-zinc-500">Stateless in-memory execution; keeps attack text out of school ledger</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={bypassFirestore}
                          onChange={(e) => setBypassFirestore(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* LangSmith Tracing */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" />
                            LangSmith APM Tracing
                          </div>
                          <div className="text-[11px] text-zinc-500">Stream attack execution traces live to smith.langchain.com on your phone</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={enableLangSmith}
                          onChange={(e) => setEnableLangSmith(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Response Mode */}
                      <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300 block">Response Output Format</label>
                        <select
                          value={responseMode}
                          onChange={(e) => setResponseMode(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="COUNSELOR_DOSSIER">Counselor Triage Dossier (Threat Tier, Severity, Dialect)</option>
                          <option value="STUDENT_FACING">Student-Facing Whistleblower Reassurance</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* OWASP 3-Canary Management */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                            OWASP 3-Canary Tokens & Fixtures
                          </h3>
                          <p className="text-[11px] text-zinc-400">
                            Canary strings evaluated by Polemic across system prompt, casefile, and person PII.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3.5 pt-1">
                      {/* Canary 1: System Prompt */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                          <span>1. System Prompt Canary Token</span>
                          <span className="text-[10px] font-mono text-zinc-500">Injected into system instructions</span>
                        </label>
                        <input
                          type="text"
                          value={canarySystemPrompt}
                          onChange={(e) => setCanarySystemPrompt(e.target.value)}
                          placeholder="CANARY-SYSTEM-PROMPT-..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:border-rose-500 focus:outline-none"
                        />
                      </div>

                      {/* Canary 2: Synthetic Restricted Record */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            2. Synthetic Restricted Record Canary
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowRestrictedPreview(!showRestrictedPreview)}
                            className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            {showRestrictedPreview ? "Hide Fixture" : "View Confidential Fixture"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={canaryRestrictedRecord}
                          onChange={(e) => setCanaryRestrictedRecord(e.target.value)}
                          placeholder="CANARY-RESTRICTED-CASEFILE-..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:border-rose-500 focus:outline-none"
                        />
                        {showRestrictedPreview && fixtures?.restricted_record && (
                          <div className="p-3 rounded-lg bg-zinc-950 border border-amber-500/30 text-[11px] text-zinc-300 font-mono space-y-1 animate-fade-in">
                            <div className="text-amber-400 font-semibold">{fixtures.restricted_record.classification}</div>
                            <div className="text-zinc-400">File ID: {fixtures.restricted_record.record_id}</div>
                            <div>Title: {fixtures.restricted_record.case_title}</div>
                            <div className="text-zinc-500 pt-1 leading-relaxed">{fixtures.restricted_record.summary}</div>
                          </div>
                        )}
                      </div>

                      {/* Canary 3: Synthetic Student PII Record */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                            3. Synthetic Person Record (PII) Canary
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPersonPreview(!showPersonPreview)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {showPersonPreview ? "Hide Fixture" : "View Person Fixture"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={canaryPersonRecord}
                          onChange={(e) => setCanaryPersonRecord(e.target.value)}
                          placeholder="CANARY-PERSON-STUDENT-..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 focus:border-rose-500 focus:outline-none"
                        />
                        {showPersonPreview && fixtures?.person_record && (
                          <div className="p-3 rounded-lg bg-zinc-950 border border-indigo-500/30 text-[11px] text-zinc-300 font-mono space-y-1 animate-fade-in">
                            <div className="text-indigo-400 font-semibold">{fixtures.person_record.classification}</div>
                            <div className="text-zinc-400">Person ID: {fixtures.person_record.person_id}</div>
                            <div>Alias: {fixtures.person_record.student_alias}</div>
                            <div className="text-zinc-500 pt-1 leading-relaxed">{fixtures.person_record.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Bearer Key Manager */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-rose-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                          Evaluation Bearer API Key
                        </h3>
                      </div>
                      <a
                        href="https://onetimesecret.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        <span>OneTimeSecret.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-20 py-2 text-xs font-mono text-zinc-200 focus:border-rose-500 focus:outline-none"
                      />
                      <div className="absolute right-2 top-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(testApiKey)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 2: SYSTEM-WIDE PRODUCTION ENGINE CONTROLS                 */}
              {/* ============================================================= */}
              {activeTab === "PROD" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                          Production AI Engines & Invariants (/api/triage)
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          These settings govern live student whistleblower reports, counselor copilot triage, and radar canvas updates.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      {/* Production Nemotron 3.5 */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">Live NVIDIA Nemotron Reasoning</div>
                          <div className="text-[11px] text-zinc-500">Performs live multi-modal triage and Malaysian context extraction</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={prodEnableLiveLlm}
                          onChange={(e) => setProdEnableLiveLlm(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Production TypeSafe Jev */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">TypeSafe Jev System One (4-Point Danger Probabilities)</div>
                          <div className="text-[11px] text-zinc-500">Live danger, physical harm, self harm, and illicit drug assessment</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={prodEnableLiveJev}
                          onChange={(e) => setProdEnableLiveJev(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Production YTL ILMU */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">YTL ILMU Shadow Judge (Dialect Nuance)</div>
                          <div className="text-[11px] text-zinc-500">Monitors demographic parity and regional Malaysian dialect divergence</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={prodEnableLiveIlmu}
                          onChange={(e) => setProdEnableLiveIlmu(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Production Vision-Language Model (VLM) Selector */}
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            Production Vision-Language Model (VLM) A/B Engine
                          </label>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                            Live Staging / Prod
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Controls the active multi-modal model for live CCTV peak keyframing, WhatsApp screenshot OCR, and physical weapon detection across all campuses.
                        </p>
                        <select
                          value={prodVisionModel}
                          onChange={(e) => setProdVisionModel(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="nvidia/Nemotron-3.5-Super-VL">
                            nvidia/Nemotron-3.5-Super-VL (NVIDIA Frontier VLM • ~$0.30/1M • 50% Cheaper)
                          </option>
                          <option value="openbmb/MiniCPM-V-4_5">
                            openbmb/MiniCPM-V-4_5 (OpenBMB 8B VLM • ~$0.65/1M)
                          </option>
                        </select>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                          <span>Model Provenance: Preserved in Section 90A Evidence Dossier</span>
                          <span>Inference: Nebius Token Factory</span>
                        </div>
                      </div>

                      {/* Production Strict Regex Pre-Filter */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">Production Strict Prompt Injection Firewall</div>
                          <div className="text-[11px] text-zinc-500">Enforces zero-trust pre-filtering on incoming student reports (Always ON in production)</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={prodEnableRegexFirewall}
                          onChange={(e) => setProdEnableRegexFirewall(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Production SHACL Invariants */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700">
                        <div>
                          <div className="text-xs font-medium text-zinc-200">SHACL Ontology Invariant Gatekeeper</div>
                          <div className="text-[11px] text-zinc-500">Vetoes ungrounded critical actions, clock anomalies, and illegal state jumps</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={prodEnforceShacl}
                          onChange={(e) => setProdEnforceShacl(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
                        />
                      </label>

                      {/* Production Context Window Budget */}
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs font-medium text-zinc-200">Production Multi-Turn Dialogue Budget</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 block">Max Conversation Turns</label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={prodContextMaxTurns}
                              onChange={(e) => setProdContextMaxTurns(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-cyan-500"
                            />
                            <span className="text-[10px] text-zinc-500 block">Default: 20 turns</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 block">Max Context Words</label>
                            <input
                              type="number"
                              min={200}
                              max={10000}
                              step={100}
                              value={prodContextMaxWords}
                              onChange={(e) => setProdContextMaxWords(Math.max(200, parseInt(e.target.value) || 200))}
                              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-cyan-500"
                            />
                            <span className="text-[10px] text-zinc-500 block">Default: 4,000 words</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 sticky bottom-0 z-10 backdrop-blur-md flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading || isSaving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Active Tab</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || isSaving}
              onClick={handleSaveSettings}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-white text-xs font-medium shadow-lg transition-all ${
                activeTab === "POLEMIC"
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20"
                  : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20"
              }`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{activeTab === "POLEMIC" ? "Save Polemic Evaluation Config" : "Save Production Engine Config"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
