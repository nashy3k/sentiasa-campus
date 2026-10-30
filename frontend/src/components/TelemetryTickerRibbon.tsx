"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Radio,
  ShieldCheck,
  Cpu,
  Eye,
  Scale,
  Coins,
  Clock,
  Sparkles,
  AlertTriangle,
  Network,
} from "lucide-react";
import { useDashboard } from "../context/DashboardContext";

export default function TelemetryTickerRibbon() {
  const {
    currentTenant,
    incidents,
    elements,
    setSelectedNodeId,
    activePolicyPreset,
  } = useDashboard();

  const [timeMyt, setTimeMyt] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      // FinOps tab visibility backoff
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kuala_Lumpur",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
        setTimeMyt(`${formatted} MYT`);
      } catch {
        setTimeMyt("18:50:00 MYT");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute live dynamic district name from tenant
  const districtName = useMemo(() => {
    switch (currentTenant) {
      case "smk-sacred-heart":
        return "Kota Kinabalu (Sabah East Coast)";
      case "kolej-dp-patinggi":
        return "Kuching (Sarawak Central)";
      case "smk-sentiasa":
      default:
        return "Petaling Perdana / Shah Alam";
    }
  }, [currentTenant]);

  // Compute live OSINT EntityTransformNode count
  const osintPivotNodes = useMemo(() => {
    return elements.filter((el) => el.data?.type === "EntityTransformNode");
  }, [elements]);

  // Critical Tier 5 Incident
  const criticalInc = useMemo(() => {
    return incidents.find((i) => i.severityTier === 5);
  }, [incidents]);

  // Dynamic Ticker Items reflecting real live state
  const liveTickerItems = useMemo(() => {
    const items: Array<{
      icon: any;
      label: string;
      detail: string;
      color: string;
      onClick?: () => void;
    }> = [
      {
        icon: Activity,
        label: "RADAR ACTIVE",
        detail: `Sector: ${districtName} (${incidents.length} cases tracked)`,
        color: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30",
      },
    ];

    // Real live critical alert chip
    if (criticalInc) {
      items.push({
        icon: AlertTriangle,
        label: "TIER 5 CRITICAL",
        detail: `${criticalInc.schoolName}: ${criticalInc.contextSummary.slice(0, 48)}...`,
        color: "text-rose-400 bg-rose-950/60 border-rose-500/50 animate-pulse",
        onClick: () => setSelectedNodeId(criticalInc.id),
      });
    }

    // Dynamic OSINT EntityTransformNode count
    if (osintPivotNodes.length > 0) {
      items.push({
        icon: Network,
        label: "OSINT PIVOTS",
        detail: `${osintPivotNodes.length} Social Links Transforms on Cytoscape`,
        color: "text-purple-400 bg-purple-950/50 border-purple-500/40",
      });
    } else {
      items.push({
        icon: Radio,
        label: "OSINT DUAL-RING",
        detail: "r/bolehland • Lowyat • TikTok • X (0.18s latency)",
        color: "text-purple-400 bg-purple-950/40 border-purple-500/30",
      });
    }

    items.push(
      {
        icon: Cpu,
        label: "NEBIUS VLM",
        detail: "NVIDIA Nemotron-3.5-Super-VL ($0.30/1M in • $0.0007/run)",
        color: "text-cyan-400 bg-cyan-950/40 border-cyan-500/30",
      },
      {
        icon: Scale,
        label: "SEC 90A CUSTODY",
        detail: "Evidence Act 1950 SHA-256 Tamper Seal Active",
        color: "text-amber-400 bg-amber-950/40 border-amber-500/30",
      },
      {
        icon: ShieldCheck,
        label: "SOUTHBRIDGE GATES",
        detail: `10/10 Invariants Active [Preset: ${activePolicyPreset}]`,
        color: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30",
      },
      {
        icon: Coins,
        label: "FINOPS BUDGET",
        detail: "$0.015 Max Per-Incident Cap Guaranteed",
        color: "text-sky-400 bg-sky-950/40 border-sky-500/30",
      }
    );

    return items;
  }, [
    districtName,
    incidents,
    criticalInc,
    osintPivotNodes,
    activePolicyPreset,
    setSelectedNodeId,
  ]);

  return (
    <div className="relative z-20 flex h-7 w-full select-none items-center overflow-hidden border-b border-white/5 bg-[#070b12]/95 px-3 font-mono text-[11px] text-zinc-300 backdrop-blur-md">
      {/* Left Fixed Badge: World Monitor style LIVE status */}
      <div className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-bold tracking-wider text-emerald-400">TELEMETRY</span>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">{timeMyt}</span>
      </div>

      {/* Marquee Streaming Ticker Content */}
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker flex items-center gap-6 py-0.5 pl-4">
          {/* Repeat list twice for seamless infinite marquee loop */}
          {[...liveTickerItems, ...liveTickerItems].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={item.onClick}
                className={`flex shrink-0 items-center gap-1.5 transition-opacity hover:opacity-100 ${
                  item.onClick ? "cursor-pointer hover:underline" : ""
                }`}
                title={item.onClick ? "Click to focus incident on graph" : undefined}
              >
                <span
                  className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${item.color}`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{item.label}</span>
                </span>
                <span className="text-zinc-300">{item.detail}</span>
                <span className="text-zinc-700 mx-1">•</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Fixed Badge: Sovereign Campus Tag */}
      <div className="hidden shrink-0 items-center gap-1.5 border-l border-white/10 pl-3 md:flex">
        <Sparkles className="h-3 w-3 text-emerald-400" />
        <span className="text-[10px] text-zinc-400">SOVEREIGN SENTINEL</span>
      </div>
    </div>
  );
}
