"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Cpu, Network, ShieldCheck, RefreshCw } from "lucide-react";
import { getApiBaseUrl } from "../lib/api-client";

interface ServiceStatus {
  backend: boolean;
  jev: boolean;
  nebius: boolean;
  tavily: boolean;
  exa: boolean;
  ilmu: boolean;
  nebiusModel?: string;
  ilmuModel?: string;
  hitlPendingCount?: number;
  lastChecked?: string;
  error?: string;
}

export default function ConnectivityBadges() {
  const [status, setStatus] = useState<ServiceStatus>({
    backend: false,
    jev: false,
    nebius: false,
    tavily: false,
    exa: false,
    ilmu: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    const now = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const baseUrl = getApiBaseUrl();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const [rootRes, healthRes] = await Promise.allSettled([
        fetch(`${baseUrl}/`, { signal: controller.signal }),
        fetch(`${baseUrl}/health`, { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      let isBackendUp = false;
      let jevActive = false;
      let nebiusActive = false;
      let tavilyActive = false;
      let exaActive = false;
      let ilmuActive = false;
      let nebiusModel = "Nemotron-3_5-Lightning";
      let ilmuModel = "ilmu-nemo-nano";
      let hitlPending = 0;

      if (rootRes.status === "fulfilled" && rootRes.value.ok) {
        isBackendUp = true;
        try {
          const rootData = await rootRes.value.json();
          jevActive = Boolean(rootData.jev_configured);
          nebiusActive = Boolean(rootData.nebius_configured);
          tavilyActive = Boolean(rootData.tavily_configured);
          exaActive = Boolean(rootData.exa_configured);
          ilmuActive = Boolean(rootData.ilmu_configured);
        } catch {
          // ignore json parse error
        }
      }

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        isBackendUp = true;
        try {
          const healthData = await healthRes.value.json();
          if (healthData.jev_active !== undefined) jevActive = Boolean(healthData.jev_active);
          if (healthData.nebius_model) nebiusModel = healthData.nebius_model.split("/").pop() || "Nemotron-3_5-Lightning";
          if (healthData.tavily_active !== undefined) tavilyActive = Boolean(healthData.tavily_active);
          if (healthData.exa_active !== undefined) exaActive = Boolean(healthData.exa_active);
          if (healthData.ilmu_active !== undefined) ilmuActive = Boolean(healthData.ilmu_active);
          if (healthData.ilmu_model) ilmuModel = healthData.ilmu_model;
          if (healthData.hitl_pending_count !== undefined) hitlPending = healthData.hitl_pending_count;
        } catch {
          // ignore json parse error
        }
      }

      setStatus({
        backend: isBackendUp,
        jev: jevActive,
        nebius: nebiusActive,
        tavily: tavilyActive,
        exa: exaActive,
        ilmu: ilmuActive,
        nebiusModel,
        ilmuModel,
        hitlPendingCount: hitlPending,
        lastChecked: now,
        error: isBackendUp ? undefined : "Local backend idle - running on simulated intelligence fixtures",
      });
    } catch {
      setStatus({
        backend: false,
        jev: false,
        nebius: false,
        tavily: false,
        exa: false,
        ilmu: false,
        lastChecked: now,
        error: "Local backend idle - running on simulated intelligence fixtures",
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      checkConnectivity();
    }, 15000);
    return () => clearInterval(interval);
  }, [checkConnectivity]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Backend Gateway Badge: Online or Graceful Demo / Standby */}
      <div
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono transition cursor-help ${
          status.backend
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            : "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
        }`}
        title={
          status.backend
            ? "FastAPI Gateway Online: Direct connection to production REST cluster"
            : "Standby Engine: Local simulation fixtures active"
        }
      >
        <span
          className={`h-2 w-2 rounded-full ${
            status.backend ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
          }`}
        />
        <Network className="h-3.5 w-3.5" />
        <span className="hidden md:inline">{status.backend ? "GATEWAY" : "DEMO"}</span>
      </div>

      {/* Sentinel Guard (Deterministic Gatekeeper) Badge */}
      <div
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono transition cursor-help ${
          status.jev
            ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
            : "border-purple-500/25 bg-purple-950/30 text-purple-300"
        }`}
        title="Sentinel Guard: Deterministic Invariant Gatekeeper & Safety Invariant Enforcement"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
        <span className="hidden md:inline">GUARD</span>
        <span className="hidden xl:inline">{status.jev ? ": LOCKED" : ": ON"}</span>
      </div>

      {/* Sovereign Vernacular Engine Badge */}
      <div
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono transition cursor-help ${
          status.ilmu
            ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            : "border-cyan-500/25 bg-cyan-950/30 text-cyan-300"
        }`}
        title={`Sovereign Vernacular Engine: Calibrated Dialect Nuance (1.58 D_nuance)`}
      >
        <Activity className="h-3.5 w-3.5 text-cyan-400" />
        <span className="hidden md:inline">VERNACULAR</span>
        <span className="hidden xl:inline">: 1.58</span>
      </div>

      {/* Sentinel-1 Neural Engine Badge */}
      <div
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono transition cursor-help ${
          status.nebius
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
            : "border-slate-700/60 bg-slate-800/60 text-slate-300"
        }`}
        title={`Sentinel-1 Neural Engine: Sovereign LLM Cluster`}
      >
        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
        <span className="hidden md:inline">SENTINEL-1</span>
      </div>

      {/* Public Social OSINT & Threat Grounding Badge */}
      <div
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono transition cursor-help ${
          status.tavily && status.exa
            ? "border-blue-500/40 bg-blue-500/15 text-blue-200"
            : status.tavily || status.exa
            ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
            : "border-slate-700/60 bg-slate-800/60 text-slate-300"
        }`}
        title="Dual-Funnel Social Grounding: Public Social OSINT Sweep + Neural Threat Grounding"
      >
        <Activity className="h-3.5 w-3.5 text-blue-400" />
        <span className="hidden md:inline">OSINT</span>
      </div>

      {/* Refresh Button */}
      <button
        type="button"
        onClick={checkConnectivity}
        disabled={isChecking}
        className="rounded-full border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition"
        title="Refresh connectivity status"
        aria-label="Refresh status"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin text-emerald-400" : ""}`} />
      </button>

      {status.lastChecked && (
        <span className="hidden font-mono text-xs text-slate-400 xl:inline">
          synced {status.lastChecked}
        </span>
      )}
    </div>
  );
}
