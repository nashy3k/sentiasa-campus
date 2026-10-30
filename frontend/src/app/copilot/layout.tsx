"use client";

import React, { useState, useEffect, useCallback } from "react";

import Link from "next/link";

import {

  Network,

  Bot,

  ShieldAlert,

  Radio,

  Send,

  ArrowLeftRight,

  Sun,

  Moon,

  Sparkles,

  Lock,

} from "lucide-react";

import { CopilotKit } from "@copilotkit/react-core";

import "@copilotkit/react-ui/styles.css";

import ConnectivityBadges from "../../components/ConnectivityBadges";

import AccessGate from "../../components/AccessGate";

import RoleSwitcher from "../../components/RoleSwitcher";

import CampusScopeSwitcher from "../../components/CampusScopeSwitcher";

import InstitutionalDirectoryModal from "../../components/InstitutionalDirectoryModal";

import TelemetryTickerRibbon from "../../components/TelemetryTickerRibbon";

import { DashboardProvider, useDashboard } from "../../context/DashboardContext";

function CopilotShell({ children }: { children: React.ReactNode }) {

  const {

    isUnlocked,

    isInitialized,

    setIsUnlocked,

    handleLockConsole,

    incidents,

    elements,

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

  return (

    <div

      className={`flex min-h-screen flex-col bg-[#070b12] cyber-grid text-slate-100 antialiased ${

        isHighContrast ? "high-contrast" : ""

      }`}

    >

      {/* Staging Access Barrier Overlay */}

      {!isUnlocked && isInitialized && (

        <AccessGate onUnlock={() => setIsUnlocked(true)} />

      )}

      {/* CopilotKit Dedicated Header */}

      <header className="sticky top-0 z-30 border-b border-purple-900/30 bg-[#070b12]/95 px-5 py-3 backdrop-blur-md">

        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Logo & Product Identity */}

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-purple-950/50">

              <Bot className="h-5 w-5" />

            </div>

            <div>

              <div className="flex items-center gap-2">

                <span className="font-mono text-base font-bold tracking-wider text-slate-100">

                  SENTIASA

                </span>

                <span className="text-purple-500">//</span>

                <span className="text-xs font-semibold text-purple-300">

                  Autonomous Agentic Safety Workspace

                </span>

                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/35 px-2.5 py-0.5 font-mono text-[11px] font-bold text-cyan-200">

                  Sentinel-1 HUD Active

                </span>

              </div>

              <p className="text-xs text-slate-400 hidden md:block">

                Sovereign Agentic Graph • Real-time Threat Grounding • Natural Language Canvas Control

              </p>

            </div>

          </div>

          {/* Institutional Jurisdiction & Scope Selector */}
          <div className="flex items-center gap-3">
            <CampusScopeSwitcher />
            <RoleSwitcher />
            <ConnectivityBadges />

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Quick Switcher back to Classic Command Center */}
            <Link
              href="/classic"
              title="Switch to Classic Minimalist Command Center"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-1.5 font-mono text-[11px] font-bold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-900/30 shadow-sm"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-400" />
              <span>Classic Console</span>
            </Link>

            {/* Restore CopilotKit Dev Helper Button */}
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem("cpk:inspector:dismissed_until");
                  document.cookie = "cpk_inspector_dismissed_until=; Max-Age=0; path=/";
                  window.location.reload();
                } catch {
                  window.location.reload();
                }
              }}
              title="Restore CopilotKit Dev Helper & Web Inspector (Clears 1-day dismissal)"
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/30 px-2.5 py-1.5 font-mono text-[11px] font-bold text-purple-300 transition hover:border-purple-400 hover:bg-purple-900/40 shadow-sm"
            >
              <Bot className="h-3.5 w-3.5 text-purple-400" />
              <span>Restore Helper</span>
            </button>

            {/* High Contrast Toggle */}

            <button

              type="button"

              onClick={toggleHighContrast}

              title="Toggle High-Contrast Mode"

              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold transition ${

                isHighContrast

                  ? "border-amber-400 bg-amber-400/20 text-amber-200"

                  : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600"

              }`}

            >

              {isHighContrast ? (

                <Sun className="h-3.5 w-3.5 text-amber-300" />

              ) : (

                <Moon className="h-3.5 w-3.5 text-slate-300" />

              )}

            </button>

            {isUnlocked && (

              <button

                type="button"

                onClick={handleLockConsole}

                title="Lock Console"

                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:border-rose-500/40 hover:text-rose-200"

              >

                <Lock className="h-3.5 w-3.5" />

              </button>

            )}

          </div>

        </div>

      </header>

      {/* World Monitor-Style Live Telemetry Ticker Ribbon */}

      <TelemetryTickerRibbon />

      {/* Main Viewport */}

      <main className="flex-1 p-3 lg:p-4">

        {children}

      </main>

      {/* Institutional Directory & Threat Matrix Modal */}

      <InstitutionalDirectoryModal />

      <style jsx global>{`

        /* Suppress duplicate floating chat trigger button because CopilotChat is embedded in the telemetry panel */

        .copilotKitFloatingButton {

          display: none !important;

        }

        /* Cinematic Tactical Defense Styling for CopilotChat */

        .copilotKitChat {

          --copilot-kit-primary-color: #06b6d4;

          --copilot-kit-background-color: #060a12;

          --copilot-kit-muted-color: #1e293b;

          --copilot-kit-separator-color: #1e293b;

          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;

        }

        .copilotKitChat .copilotKitMessages {

          background-color: transparent !important;

          scrollbar-width: thin;

          scrollbar-color: #1e293b transparent;

        }

        .copilotKitChat .copilotKitInput {

          background-color: #0b1322 !important;

          border: 1px solid #1e293b !important;

          border-radius: 8px !important;

          color: #e2e8f0 !important;

        }

        .copilotKitChat .copilotKitInput:focus-within {

          border-color: #06b6d4 !important;

          box-shadow: 0 0 10px rgba(6, 182, 212, 0.25) !important;

        }

      `}</style>

    </div>

  );

}

export default function CopilotLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  return (

    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={true}>

      <DashboardProvider>

        <CopilotShell>{children}</CopilotShell>

      </DashboardProvider>

    </CopilotKit>

  );

}

