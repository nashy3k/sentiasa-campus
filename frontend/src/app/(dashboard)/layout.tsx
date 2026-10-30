"use client";

import React, { useState, useEffect, useCallback } from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import {

  Network,

  Radio,

  Send,

  ShieldAlert,

  Lock,

  CheckCircle2,

  Sun,

  Moon,

  Bot,

} from "lucide-react";

import ConnectivityBadges from "../../components/ConnectivityBadges";

import AccessGate from "../../components/AccessGate";

import RoleSwitcher from "../../components/RoleSwitcher";

import CampusScopeSwitcher from "../../components/CampusScopeSwitcher";

import InstitutionalDirectoryModal from "../../components/InstitutionalDirectoryModal";

import TelemetryTickerRibbon from "../../components/TelemetryTickerRibbon";

import { DashboardProvider, useDashboard } from "../../context/DashboardContext";

function DashboardShell({ children }: { children: React.ReactNode }) {

  const pathname = usePathname();

  const {

    isUnlocked,

    isInitialized,

    setIsUnlocked,

    handleLockConsole,

    incidents,

    elements,

    latestVerdict,

    setLatestVerdict,

  } = useDashboard();

  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {

    try {

      const saved = localStorage.getItem("sentiasa_high_contrast");

      if (saved === "true") {

        setIsHighContrast(true);

        document.documentElement.classList.add("high-contrast");

      }

    } catch {

      // ignore

    }

  }, []);

  const toggleHighContrast = useCallback(() => {

    setIsHighContrast((prev) => {

      const next = !prev;

      try {

        localStorage.setItem("sentiasa_high_contrast", String(next));

      } catch {

        // ignore

      }

      if (next) {

        document.documentElement.classList.add("high-contrast");

      } else {

        document.documentElement.classList.remove("high-contrast");

      }

      return next;

    });

  }, []);

  const isTriageActive = pathname === "/" || pathname === "/triage" || pathname === "/classic";

  const isGraphActive = pathname.startsWith("/graph");

  const isIntakeActive = pathname.startsWith("/intake");

  const isHitlActive = pathname.startsWith("/hitl");

  return (

    <div

      className={`flex min-h-screen flex-col bg-[#0b0f17] cyber-grid text-slate-100 antialiased ${

        isHighContrast ? "high-contrast" : ""

      }`}

    >

      {/* Staging Access Barrier Overlay */}

      {!isUnlocked && isInitialized && (

        <AccessGate onUnlock={() => setIsUnlocked(true)} />

      )}

      {/* Elevated Top Navigation Bar */}

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0a0e17]/95 px-5 py-3.5 backdrop-blur-md">

        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Logo & Product Identity */}

          <Link href="/" className="flex items-center gap-3 group">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-950/40 transition group-hover:scale-105">

              <Network className="h-5 w-5" />

            </div>

            <div>

              <div className="flex items-center gap-2">

                <span className="font-mono text-base font-bold tracking-wider text-slate-100">

                  SENTIASA

                </span>

                <span className="text-slate-600">//</span>

                <span className="text-xs font-medium text-slate-300 hidden sm:inline">

                  Campus Safety Intelligence Engine

                </span>

                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">

                  v1.1.0 ELEVATED

                </span>

              </div>

              <p className="text-xs text-slate-400 hidden md:block">

                Malaysian Dialect Normalization • Sovereign Knowledge Graph • Sentinel Guard Invariants

              </p>

            </div>

          </Link>

          {/* Top Segmented View Switcher */}

          <nav

            aria-label="Application View Switcher"

            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner"

          >

            <Link

              href="/"

              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition ${

                isTriageActive

                  ? "bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-sm"

                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"

              }`}

            >

              <Radio className="h-3.5 w-3.5 text-rose-400" />

              <span>Live Triage</span>

              <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[11px] text-slate-300">

                {incidents.length}

              </span>

            </Link>

            <Link

              href="/graph"

              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition ${

                isGraphActive

                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm"

                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"

              }`}

            >

              <Network className="h-3.5 w-3.5 text-cyan-400" />

              <span>Ontology Graph</span>

              <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[11px] text-slate-300">

                {elements.length}

              </span>

            </Link>

            <Link

              href="/intake"

              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition ${

                isIntakeActive

                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm"

                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"

              }`}

            >

              <Send className="h-3.5 w-3.5 text-amber-400" />

              <span>Incident Ingest & OCR</span>

            </Link>

            <Link

              href="/hitl"

              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition ${

                isHitlActive

                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"

                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"

              }`}

            >

              <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />

              <span>HITL Review</span>

            </Link>

            <Link

              href="/copilot"

              title="Switch to CopilotKit CoAgent View (Port 3002 / Route /copilot)"

              className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 font-mono text-xs font-bold text-purple-200 transition hover:bg-purple-500/30 hover:border-purple-400 shadow-sm ml-1"

            >

              <Bot className="h-3.5 w-3.5 text-purple-300" />

              <span>CopilotKit View</span>

            </Link>

          </nav>

          {/* Role Switcher, Campus Scope, Connectivity Badges, High Contrast & Lock Console Controls */}

          <div className="flex items-center gap-2 sm:gap-3">

            <CampusScopeSwitcher />

            <RoleSwitcher />

            <ConnectivityBadges />

            {/* High Contrast / Sunlit Office Mode Toggle */}

            <button

              type="button"

              onClick={toggleHighContrast}

              title={

                isHighContrast

                  ? "Switch to Standard Dark Mode"

                  : "Enable High-Contrast Office Mode (WCAG AAA Glare Protection)"

              }

              aria-label="Toggle High-Contrast Mode"

              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold transition ${

                isHighContrast

                  ? "border-amber-400 bg-amber-400/20 text-amber-200 shadow-sm"

                  : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white"

              }`}

            >

              {isHighContrast ? (

                <Sun className="h-3.5 w-3.5 text-amber-300" />

              ) : (

                <Moon className="h-3.5 w-3.5 text-slate-300" />

              )}

              <span className="hidden xl:inline">

                {isHighContrast ? "High Contrast: ON" : "Office Mode"}

              </span>

            </button>

            {isUnlocked && (

              <button

                type="button"

                onClick={handleLockConsole}

                title="Lock Console and re-enable Access Gate"

                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-mono text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-950/40 hover:text-rose-200"

              >

                <Lock className="h-3.5 w-3.5" />

                <span className="hidden sm:inline">Lock Console</span>

              </button>

            )}

          </div>

        </div>

      </header>

      {/* World Monitor-Style Live Telemetry Ticker Ribbon */}

      <TelemetryTickerRibbon />

      {/* Global Status Verdict Banner */}

      {latestVerdict && (

        <div

          className={`flex items-center justify-between border-b px-6 py-2.5 font-mono text-xs transition ${

            latestVerdict.type === "passed"

              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"

              : "border-amber-500/40 bg-amber-500/10 text-amber-200"

          }`}

        >

          <div className="flex items-center gap-2">

            {latestVerdict.type === "passed" ? (

              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />

            ) : (

              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />

            )}

            <span className="font-semibold">{latestVerdict.text}</span>

          </div>

          <button

            type="button"

            onClick={() => setLatestVerdict(null)}

            className="text-slate-400 hover:text-white underline text-xs ml-4"

          >

            Dismiss

          </button>

        </div>

      )}

      {/* Main Spacious Viewport Container */}

      <main className="flex-1 p-5 lg:p-6">

        {children}

      </main>

      {/* Institutional Directory & Threat Matrix Modal */}

      <InstitutionalDirectoryModal />

    </div>

  );

}

export default function DashboardLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  return (

    <DashboardProvider>

      <DashboardShell>{children}</DashboardShell>

    </DashboardProvider>

  );

}

