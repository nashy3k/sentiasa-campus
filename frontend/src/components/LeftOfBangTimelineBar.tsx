"use client";

import React, { useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  ShieldAlert,
  Flame,
  Activity,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useDashboard } from "../context/DashboardContext";

export interface TimelineWaypoint {
  epoch: number; // 0 to 100
  timeLabel: string;
  phase: "LEFT_OF_BANG_EARLY" | "AMPLIFICATION" | "ACUTE_CRISIS" | "POST_BANG_STABILIZED";
  title: string;
  leadIncidentId: string;
  riskTier: 1 | 2 | 3 | 4 | 5;
  description: string;
  entitiesPresent: string[]; // Node IDs visible at this stage
}

export const TIMELINE_WAYPOINTS: TimelineWaypoint[] = [
  {
    epoch: 15,
    timeLabel: "08:15 MYT",
    phase: "LEFT_OF_BANG_EARLY",
    title: "Phase 1: Ambient Peer Ostracization ('Bahan')",
    leadIncidentId: "incident-bullying",
    riskTier: 2,
    description: "Repeated hostile Telegram chatter and disparaging stickers directed at junior students.",
    entitiesPresent: [
      "school-smk-seksyen-11",
      "school-smk-seksyen-9",
      "persona-azlan",
      "incident-bullying",
      "evidence-5",
      "pivot_blok_c",
      "edge_pivot_blok_c_incident_bullying",
    ],
  },
  {
    epoch: 45,
    timeLabel: "08:56 MYT",
    phase: "LEFT_OF_BANG_EARLY",
    title: "Phase 2: Systematic Protection Money Demands ('Pau Duit')",
    leadIncidentId: "incident-bullying",
    riskTier: 3,
    description: "Senior students demanding protection money inside L3 restrooms before morning recess.",
    entitiesPresent: [
      "school-smk-seksyen-11",
      "school-smk-seksyen-9",
      "persona-azlan",
      "incident-bullying",
      "evidence-5",
      "persona-haziq",
      "pivot_blok_c",
      "edge_pivot_blok_c_incident_bullying",
    ],
  },
  {
    epoch: 70,
    timeLabel: "09:28 MYT",
    phase: "AMPLIFICATION",
    title: "Phase 3: Inter-School Brawl Mobilization ('Settle Luar')",
    leadIncidentId: "incident-fight",
    riskTier: 4,
    description: "Cross-school motorcycle rendezvous chatter escalating between SMK Seksyen 11 and SMK Seksyen 9 cohorts.",
    entitiesPresent: [
      "school-smk-seksyen-11",
      "school-smk-seksyen-9",
      "persona-azlan",
      "persona-haziq",
      "incident-fight",
      "evi-seed-cctv",
      "evidence-3",
      "evidence-4",
      "incident-bullying",
      "evidence-5",
      "pivot_blok_c",
      "edge_pivot_blok_c_incident_bullying",
      "pivot_settle_luar",
      "edge_pivot_settle_luar_incident_fight",
    ],
  },
  {
    epoch: 100,
    timeLabel: "09:42 MYT (Live)",
    phase: "ACUTE_CRISIS",
    title: "Phase 4: Acute Weapon Concealment Signal ('Parang' at Rear Gate)",
    leadIncidentId: "incident-parang",
    riskTier: 5,
    description: "Critical weapon intimidation signal detected near rear bicycle shed during class dispersal.",
    entitiesPresent: [
      "school-smk-seksyen-11",
      "school-smk-seksyen-9",
      "persona-azlan",
      "persona-haziq",
      "incident-parang",
      "incident-fight",
      "incident-bullying",
      "evi-seed-cctv",
      "evidence-1",
      "evidence-2",
      "evidence-3",
      "evidence-4",
      "evidence-5",
      "pivot_blok_c",
      "edge_pivot_blok_c_incident_bullying",
      "pivot_settle_luar",
      "edge_pivot_settle_luar_incident_fight",
      "pivot_bicycle_shed",
      "edge_pivot_bicycle_shed_incident_parang",
    ],
  },
];

export default function LeftOfBangTimelineBar() {
  const {
    timelineEpochIndex,
    setTimelineEpochIndex,
    isTimelinePlaying,
    setIsTimelinePlaying,
    timelinePlaybackSpeed,
    setTimelinePlaybackSpeed,
    setSelectedNodeId,
    setLatestVerdict,
  } = useDashboard();

  // Find active phase waypoint
  const currentWaypoint = useMemo(() => {
    // Find highest waypoint <= current epoch
    const reversed = [...TIMELINE_WAYPOINTS].reverse();
    const match = reversed.find((w) => timelineEpochIndex >= w.epoch);
    return match || TIMELINE_WAYPOINTS[0];
  }, [timelineEpochIndex]);

  const getPhaseBadge = (phase: TimelineWaypoint["phase"]) => {
    switch (phase) {
      case "LEFT_OF_BANG_EARLY":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "AMPLIFICATION":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "ACUTE_CRISIS":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  const handleSeek = (newVal: number) => {
    setTimelineEpochIndex(newVal);
    const closest = [...TIMELINE_WAYPOINTS].reverse().find((w) => newVal >= w.epoch) || TIMELINE_WAYPOINTS[0];
    if (closest) {
      setSelectedNodeId(closest.leadIncidentId);
      setLatestVerdict({
        text: `Chronology Scrubbed to [${closest.timeLabel}]: ${closest.title}`,
        type: "passed",
      });
    }
  };

  return (
    <div className="rounded-lg border border-cyan-900/50 bg-[#070b14] p-3 font-mono text-xs shadow-xl flex flex-col gap-2.5 select-none">
      {/* Top Banner: Playback Controls & Temporal Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition shadow-sm ${
              isTimelinePlaying
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                : "bg-cyan-600 text-white hover:bg-cyan-500"
            }`}
            title={isTimelinePlaying ? "Pause Timeline Playback" : "Play Chronology Playback"}
          >
            {isTimelinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isTimelinePlaying ? "PAUSE" : "PLAY"}</span>
          </button>

          {/* Reset / Rewind */}
          <button
            type="button"
            onClick={() => handleSeek(0)}
            className="p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Rewind to Left-of-Bang Start (T-0)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => {
              const speeds = [1, 2, 4];
              const nextIdx = (speeds.indexOf(timelinePlaybackSpeed) + 1) % speeds.length;
              setTimelinePlaybackSpeed(speeds[nextIdx]);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-[11px]"
            title="Toggle playback speed"
          >
            <FastForward className="w-3 h-3 text-cyan-400" />
            <span>{timelinePlaybackSpeed}x</span>
          </button>

          {/* Jump to Live */}
          <button
            type="button"
            onClick={() => handleSeek(100)}
            className={`px-2 py-1 rounded border text-[11px] font-bold transition ${
              timelineEpochIndex >= 99
                ? "bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            LIVE (NOW)
          </button>
        </div>

        {/* Current Temporal Scrub State */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300">{currentWaypoint.timeLabel}</span>
          </div>

          <span
            className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wider ${getPhaseBadge(
              currentWaypoint.phase
            )}`}
          >
            {currentWaypoint.phase.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Scrubbing Slider Track with Waypoint Markers */}
      <div className="relative pt-1 pb-2">
        {/* Slider Input */}
        <input
          type="range"
          min={0}
          max={100}
          value={timelineEpochIndex}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
        />

        {/* Waypoint Tick Pins on Track */}
        <div className="relative w-full h-4 mt-1">
          {TIMELINE_WAYPOINTS.map((w) => {
            const isReached = timelineEpochIndex >= w.epoch;
            const isExact = Math.abs(timelineEpochIndex - w.epoch) < 10;

            return (
              <div
                key={w.epoch}
                onClick={() => handleSeek(w.epoch)}
                style={{ left: `${w.epoch}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full border transition-all ${
                    isExact
                      ? "bg-cyan-400 border-white scale-125 shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                      : isReached
                      ? "bg-cyan-600 border-cyan-300"
                      : "bg-slate-700 border-slate-600"
                  }`}
                />
                <span
                  className={`text-[9px] mt-0.5 whitespace-nowrap transition-colors ${
                    isExact ? "text-cyan-300 font-bold" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  {w.timeLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Waypoint Narrative Intel Summary */}
      <div className="rounded border border-slate-800/90 bg-[#09101d] px-3 py-2 flex items-start justify-between gap-3 text-xs">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                currentWaypoint.riskTier === 5
                  ? "bg-rose-500 text-white animate-pulse"
                  : currentWaypoint.riskTier === 4
                  ? "bg-orange-500 text-white"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              TIER {currentWaypoint.riskTier}
            </span>
            <span className="font-bold text-slate-100 text-[11px] truncate">{currentWaypoint.title}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{currentWaypoint.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[10px]">
          <span className="text-slate-500">Visible Entities:</span>
          <span className="font-bold text-cyan-300">
            {timelineEpochIndex < 30 ? "3 Nodes" : timelineEpochIndex < 60 ? "6 Nodes" : timelineEpochIndex < 85 ? "8 Nodes" : "12 Nodes (Full)"}
          </span>
        </div>
      </div>
    </div>
  );
}
