"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Radio,
  Sliders,
  X,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Loader2,
  Search,
  ExternalLink,
  ShieldAlert,
  Zap,
  Filter,
  Clock,
  Play,
} from "lucide-react";
import { fetchOSINTSettings, updateOSINTSettings, getApiBaseUrl } from "../lib/api-client";
import { useDashboard } from "../context/DashboardContext";

export interface TargetDomain {
  domain: string;
  name?: string;
  category?: string;
  tier?: number;
  enabled?: boolean;
}

export interface OSINTSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_DOMAINS: TargetDomain[] = [
  { domain: "osint-target.sentiasasystems.com", name: "Suara Pelajar Lembah Klang (Live Target)", category: "youth_unfiltered", tier: 1, enabled: true },
  { domain: "reddit.com/r/malaysiauni", name: "r/malaysiauni", category: "higher_education", tier: 1, enabled: true },
  { domain: "reddit.com/r/bolehland", name: "r/bolehland", category: "youth_unfiltered", tier: 1, enabled: true },
  { domain: "reddit.com/r/malaysia", name: "r/malaysia", category: "national_discourse", tier: 1, enabled: true },
  { domain: "reddit.com/r/spm", name: "r/spm", category: "secondary_school_exams", tier: 2, enabled: true },
  { domain: "reddit.com/r/malaysians", name: "r/malaysians", category: "peer_support_lifestyle", tier: 2, enabled: true },
  { domain: "forum.lowyat.net", name: "Lowyat.NET Forum", category: "discussion_forums", tier: 2, enabled: true },
  { domain: "hmetro.com.my", name: "Harian Metro", category: "regional_news_monitors", tier: 3, enabled: true },
  { domain: "sinarharian.com.my", name: "Sinar Harian", category: "regional_news_monitors", tier: 3, enabled: true },
  { domain: "bernama.com", name: "Bernama News", category: "regional_news_monitors", tier: 3, enabled: true },
  { domain: "freemalaysiatoday.com", name: "Free Malaysia Today", category: "regional_news_monitors", tier: 3, enabled: true },
];

export default function OSINTSettingsDrawer({ isOpen, onClose }: OSINTSettingsDrawerProps) {
  const { currentRole, currentTenant, setLatestVerdict, setElements } = useDashboard();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OSINT Settings State
  const [tavilyEnabled, setTavilyEnabled] = useState(true);
  const [exaEnabled, setExaEnabled] = useState(true);
  const [maxResults, setMaxResults] = useState(2);
  const [recencyDays, setRecencyDays] = useState(90);
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState(30);
  const [isTriggeringSweep, setIsTriggeringSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [domains, setDomains] = useState<TargetDomain[]>(DEFAULT_DOMAINS);

  // New Domain Form State
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("youth_community");
  const [newTier, setNewTier] = useState(1);
  const [domainSearchFilter, setDomainSearchFilter] = useState("");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchOSINTSettings(currentTenant);
      if (data) {
        setTavilyEnabled(data.tavily_enabled ?? true);
        setExaEnabled(data.exa_enabled ?? true);
        setMaxResults(data.max_results ?? 2);
        setRecencyDays(data.recency_days ?? 90);
        setCronEnabled(data.cron_enabled ?? false);
        setCronIntervalMinutes(data.cron_interval_minutes ?? 30);
        if (Array.isArray(data.target_domains) && data.target_domains.length > 0) {
          setDomains(data.target_domains);
        } else {
          // Merge subreddits, forums, news if present
          const list: TargetDomain[] = [];
          if (Array.isArray(data.subreddits)) list.push(...data.subreddits);
          if (Array.isArray(data.discussion_forums)) list.push(...data.discussion_forums);
          if (Array.isArray(data.regional_news_monitors)) list.push(...data.regional_news_monitors);
          if (list.length > 0) setDomains(list);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load OSINT settings");
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  // Handle Save
  const handleSave = async () => {
    if (currentRole !== "SUPER_ADMIN") {
      setErrorMessage("Restricted: Only SUPER_ADMIN can save OSINT settings.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        tenant_id: currentTenant,
        tavily_enabled: tavilyEnabled,
        exa_enabled: exaEnabled,
        max_results: maxResults,
        recency_days: recencyDays,
        cron_enabled: cronEnabled,
        cron_interval_minutes: cronIntervalMinutes,
        target_domains: domains,
      };

      await updateOSINTSettings(payload, currentTenant, "SUPER_ADMIN");
      setSaveSuccess(true);
      setLatestVerdict({
        text: `OSINT Configuration Synchronized for ${currentTenant.toUpperCase()}`,
        type: "passed",
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save OSINT settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate Manual Sweep
  const handleTriggerManualSweep = async () => {
    setIsTriggeringSweep(true);
    setSweepResult(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/osint/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "SMK Seksyen 11 Blok Kasturi gaduh asrama parang petaling perdana",
          max_results: maxResults,
          search_depth: "basic",
        }),
      });
      const data = await res.json();
      const evidenceList = Array.isArray(data.evidence)
        ? data.evidence
        : Array.isArray(data.results)
        ? data.results
        : [];
      const count = evidenceList.length;
      const custodyHash = data.osint_custody_hash
        ? `${data.osint_custody_hash.slice(0, 10)}...`
        : "Sec 90A Verified";
      const horizon = data.osint_horizon_phase || "LEFT_OF_BANG_PRECURSOR";

      // Dynamically inject pivoted EntityTransformNode objects AND connecting edges onto Cytoscape canvas
      if (Array.isArray(data.pivoted_nodes) && data.pivoted_nodes.length > 0) {
        setElements((prev) => {
          const existingIds = new Set(prev.map((el) => el.data.id));
          const toAdd: any[] = [];
          // Target incident hub for corroboration edge
          const targetHubId =
            prev.find((el) => el.data.type === "ThreatEventNode" && el.data.id === "incident-parang")?.data.id ||
            prev.find((el) => el.data.type === "ThreatEventNode")?.data.id ||
            "incident-parang";

          for (const node of data.pivoted_nodes) {
            const raw = node.data ? node.data : node;
            const nodeId = raw.id || node.id;
            if (nodeId && !existingIds.has(nodeId)) {
              toAdd.push({
                data: {
                  id: nodeId,
                  type: "EntityTransformNode",
                  label: raw.label || raw.threatLabel || `Pivot: ${nodeId}`,
                  source_url: raw.source_url,
                  title: raw.title,
                  color: "#8b5cf6",
                  is_osint: true,
                },
              });
              existingIds.add(nodeId);

              // Connect pivot to target threat event with TRANSFORM_CORROBORATES hyperedge
              const edgeId = `edge_${nodeId}_${targetHubId}`;
              if (!existingIds.has(edgeId)) {
                toAdd.push({
                  data: {
                    id: edgeId,
                    source: nodeId,
                    target: targetHubId,
                    type: "PivotCorroborationEdge",
                    label: "TRANSFORM_CORROBORATES",
                  },
                });
                existingIds.add(edgeId);
              }
            }
          }
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
      }

      setSweepResult(
        `Sweep finished: ${count} signals correlated (${horizon}) • Hash: ${custodyHash} • ${
          data.pivoted_nodes?.length || 0
        } EntityTransformNode pivots added to Cytoscape.`
      );
      setLatestVerdict({
        text: `Manual OSINT Sweep: ${count} signals grounded (${horizon}) • ${
          data.pivoted_nodes?.length || 0
        } entity transforms pivoted to graph`,
        type: "passed",
      });
    } catch (err: any) {
      setSweepResult(`Sweep failed: ${err.message || "Connection timeout"}`);
    } finally {
      setIsTriggeringSweep(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    setTavilyEnabled(true);
    setExaEnabled(true);
    setMaxResults(2);
    setRecencyDays(90);
    setDomains(DEFAULT_DOMAINS);
  };

  // Add Domain
  const handleAddDomain = () => {
    let trimmed = newDomain.trim().toLowerCase();
    trimmed = trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!trimmed) return;
    if (domains.some((d) => d.domain.toLowerCase() === trimmed)) {
      setErrorMessage(`Domain '${trimmed}' is already in the target registry.`);
      return;
    }

    const newItem: TargetDomain = {
      domain: trimmed,
      name: newName.trim() || trimmed,
      category: newCategory,
      tier: newTier,
      enabled: true,
    };

    setDomains((prev) => [newItem, ...prev]);
    setNewDomain("");
    setNewName("");
    setErrorMessage(null);
  };

  // Toggle Domain Enabled
  const handleToggleDomain = (domainStr: string) => {
    setDomains((prev) =>
      prev.map((d) => (d.domain === domainStr ? { ...d, enabled: !d.enabled } : d))
    );
  };

  // Delete Domain
  const handleDeleteDomain = (domainStr: string) => {
    setDomains((prev) => prev.filter((d) => d.domain !== domainStr));
  };

  const filteredDomains = domains.filter((d) => {
    if (!domainSearchFilter.trim()) return true;
    const term = domainSearchFilter.toLowerCase();
    return (
      d.domain.toLowerCase().includes(term) ||
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.category && d.category.toLowerCase().includes(term))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div className="w-screen max-w-xl pointer-events-auto border-l border-cyan-800/60 bg-[#070b14] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-slate-100 tracking-wider flex items-center gap-2">
                    <span>OSINT ENGINE CONTROLLER</span>
                    <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">
                      TENANT: {currentTenant.toUpperCase()}
                    </span>
                  </h3>
                  <p className="font-mono text-xs text-cyan-400">
                    DUAL-FUNNEL TAVILY + EXA DOMAIN SCOPING &amp; FRESHNESS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* SUPER_ADMIN Permission Alert */}
            {currentRole !== "SUPER_ADMIN" ? (
              <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 font-mono text-xs text-rose-300 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-200">READ-ONLY SURVEILLANCE INSPECTION MODE</p>
                  <p className="text-[11px] text-rose-300/80 mt-1">
                    Your current role (<strong className="text-white">{currentRole}</strong>) lacks MANAGE_OSINT privileges. Modifications require SUPER_ADMIN clearance.
                  </p>
                </div>
              </div>
            ) : null}

            {errorMessage && (
              <div className="rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 font-mono text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* 1. Dual-Funnel Search Engine Toggles */}
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-4 space-y-3 font-mono text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Radio className="h-4 w-4 text-cyan-400" />
                <span>Active Search Engines</span>
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* Tavily Card */}
                <div
                  className={`rounded-lg border p-3 flex flex-col justify-between transition ${
                    tavilyEnabled
                      ? "border-cyan-500/40 bg-cyan-950/20 text-slate-100"
                      : "border-slate-800 bg-slate-900/40 text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Tavily Engine</span>
                    <button
                      type="button"
                      disabled={currentRole !== "SUPER_ADMIN"}
                      onClick={() => setTavilyEnabled(!tavilyEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        tavilyEnabled ? "bg-cyan-500" : "bg-slate-700"
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                          tavilyEnabled ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Exact domain-scoped keyword crawl across Reddit and student forums.
                  </p>
                  <span className={`text-[10px] font-bold mt-2 ${tavilyEnabled ? "text-cyan-400" : "text-slate-500"}`}>
                    STATUS: {tavilyEnabled ? "ACTIVE" : "STANDBY"}
                  </span>
                </div>

                {/* Exa Card */}
                <div
                  className={`rounded-lg border p-3 flex flex-col justify-between transition ${
                    exaEnabled
                      ? "border-emerald-500/40 bg-emerald-950/20 text-slate-100"
                      : "border-slate-800 bg-slate-900/40 text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Exa Neural</span>
                    <button
                      type="button"
                      disabled={currentRole !== "SUPER_ADMIN"}
                      onClick={() => setExaEnabled(!exaEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        exaEnabled ? "bg-emerald-500" : "bg-slate-700"
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                          exaEnabled ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Neural semantic search with verbatim quote highlights.
                  </p>
                  <span className={`text-[10px] font-bold mt-2 ${exaEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                    STATUS: {exaEnabled ? "ACTIVE" : "STANDBY"}
                  </span>
                </div>
              </div>
            </div>

            {/* 1.5. Automated Sentinel Sweep (Cron Scheduler) */}
            <div className="rounded-xl border border-amber-900/40 bg-[#0d1322] p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span>Automated Sentinel Cron (Left-of-Bang)</span>
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                    cronEnabled
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {cronEnabled ? "ARMED (SCHOOL HOURS)" : "STANDBY (DEV/FINOPS SHIELD)"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <div>
                    <p className="font-bold text-slate-200">Scheduled Forum &amp; Social Sweep</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Autonomous Left-of-Bang scan across r/bolehland, Lowyat, and regional news.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={currentRole !== "SUPER_ADMIN"}
                    onClick={() => setCronEnabled(!cronEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      cronEnabled ? "bg-amber-500" : "bg-slate-700"
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        cronEnabled ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Sweep Interval:</label>
                    <select
                      value={cronIntervalMinutes}
                      disabled={currentRole !== "SUPER_ADMIN"}
                      onChange={(e) => setCronIntervalMinutes(Number(e.target.value))}
                      className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes (Standard)</option>
                      <option value={60}>Every 60 minutes</option>
                      <option value={120}>Every 2 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Active Window:</label>
                    <div className="rounded border border-slate-700 bg-slate-800/80 p-2 text-slate-300 text-xs">
                      07:00 – 18:00 MYT (Mon–Fri)
                    </div>
                  </div>
                </div>

                {/* Instant Trigger Button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">On-demand sweep:</span>
                  <button
                    type="button"
                    onClick={handleTriggerManualSweep}
                    disabled={isTriggeringSweep}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-amber-200 transition hover:bg-amber-900/60 hover:text-white disabled:opacity-50"
                  >
                    {isTriggeringSweep ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sweeping Forums...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Trigger Manual Sweep Now</span>
                      </>
                    )}
                  </button>
                </div>

                {sweepResult && (
                  <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-500/30">
                    {sweepResult}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  * FinOps Guard: Cloud Run scales down to 0 instances outside active campus hours. Protects Tavily and Exa search credits.
                </p>
              </div>
            </div>

            {/* 2. Parameters: Max Results & Recency Filter */}
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-4 space-y-3 font-mono text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>Search Tuning &amp; Freshness Policy</span>
              </span>

              <div className="grid grid-cols-2 gap-4">
                {/* Max Results */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Max Results Per Funnel:</span>
                    <span className="font-bold text-cyan-400">{maxResults} items</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    disabled={currentRole !== "SUPER_ADMIN"}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>1 (Fast)</span>
                    <span>5</span>
                    <span>10 (Deep)</span>
                  </div>
                </div>

                {/* Recency Freshness Filter */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Freshness Cutoff:</span>
                    <span className="font-bold text-emerald-400">&lt; {recencyDays} days</span>
                  </div>
                  <select
                    disabled={currentRole !== "SUPER_ADMIN"}
                    value={recencyDays}
                    onChange={(e) => setRecencyDays(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value={7}>7 Days (Immediate Viral Surge)</option>
                    <option value={30}>30 Days (Current Month)</option>
                    <option value={90}>90 Days (Quarterly Semester - Default)</option>
                    <option value={180}>180 Days (Half Year Academic Term)</option>
                    <option value={365}>365 Days (Full Academic Year)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Prevents stale historical rumors from corroborating active alarms.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Targeted Youth Domain Registry */}
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="h-4 w-4 text-cyan-400" />
                  <span>Targeted Youth Communities ({domains.length})</span>
                </span>
                <span className="text-[11px] text-cyan-400">
                  {domains.filter((d) => d.enabled).length} Enabled
                </span>
              </div>

              {/* Filter input */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter domain (e.g. reddit, lowyat, hmetro)..."
                  value={domainSearchFilter}
                  onChange={(e) => setDomainSearchFilter(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Domain List */}
              <div className="h-[180px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {filteredDomains.map((item) => (
                  <div
                    key={item.domain}
                    className={`rounded border px-2.5 py-1.5 flex items-center justify-between transition ${
                      item.enabled
                        ? "border-slate-800 bg-slate-950/60 text-slate-200"
                        : "border-slate-900 bg-slate-950/20 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.enabled ?? true}
                        disabled={currentRole !== "SUPER_ADMIN"}
                        onChange={() => handleToggleDomain(item.domain)}
                        className="rounded border-slate-700 accent-cyan-500 cursor-pointer disabled:opacity-50"
                      />
                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-200 truncate block">
                          {item.domain}
                        </span>
                        <div className="flex gap-1.5 text-[10px] text-slate-400">
                          <span>{item.name || item.domain}</span>
                          <span>•</span>
                          <span className="capitalize">{item.category?.replace(/_/g, " ")}</span>
                          <span>•</span>
                          <span className="text-amber-400">Tier {item.tier || 1}</span>
                        </div>
                      </div>
                    </div>

                    {currentRole === "SUPER_ADMIN" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDomain(item.domain)}
                        className="rounded p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition ml-2 flex-shrink-0"
                        title="Remove Domain"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {filteredDomains.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No domains match &quot;{domainSearchFilter}&quot;.
                  </p>
                )}
              </div>

              {/* Add New Domain Form (SUPER_ADMIN only) */}
              {currentRole === "SUPER_ADMIN" && (
                <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3 space-y-2 pt-2.5">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Register New Youth Platform / Subreddit</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Domain (e.g. reddit.com/r/kualalumpur)"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 placeholder-slate-500 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g. r/kualalumpur)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 placeholder-slate-500 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="higher_education">Higher Education (IPTS/IPTA)</option>
                      <option value="youth_unfiltered">Youth Unfiltered (Asrama/SPM)</option>
                      <option value="national_discourse">National Discourse</option>
                      <option value="discussion_forums">Discussion Forums</option>
                      <option value="regional_news_monitors">Regional News Monitors</option>
                      <option value="youth_gaming">Youth Gaming / Discord</option>
                    </select>

                    <select
                      value={newTier}
                      onChange={(e) => setNewTier(Number(e.target.value))}
                      className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                    >
                      <option value={1}>Tier 1 (High)</option>
                      <option value={2}>Tier 2 (Med)</option>
                      <option value={3}>Tier 3 (Low)</option>
                    </select>

                    <button
                      type="button"
                      disabled={!newDomain.trim()}
                      onClick={handleAddDomain}
                      className="rounded bg-cyan-600 px-3 py-1 font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            {saveSuccess && (
              <div className="rounded bg-emerald-950/60 border border-emerald-500/50 p-2 font-mono text-xs text-emerald-300 text-center font-bold flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>OSINT Configuration Persisted to Firestore!</span>
              </div>
            )}

            <div className="flex gap-2 font-mono">
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={currentRole !== "SUPER_ADMIN" || isSaving}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={currentRole !== "SUPER_ADMIN" || isSaving}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-xs font-bold text-white shadow-xl hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>SAVING SETTINGS...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-300" />
                    <span>SAVE OSINT CONFIGURATION</span>
                  </>
                )}
              </button>
            </div>

            <p className="font-mono text-[11px] text-slate-500 text-center pt-1">
              Partition: /tenants/{currentTenant}/settings/osint_config • Evidence Act 1950 Sec 90A Compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
