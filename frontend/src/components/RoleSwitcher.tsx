"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Crosshair,
  Radio,
  ChevronDown,
  Check,
  UserCheck,
} from "lucide-react";
import { useDashboard } from "../context/DashboardContext";
import { OperatorRole, ROLE_CONFIGS } from "../types/auth";

const ROLE_ICONS: Record<OperatorRole, React.ComponentType<{ className?: string }>> = {
  SUPER_ADMIN: ShieldAlert,
  HEAD_COUNSELOR: Sparkles,
  DISCIPLINE_MASTER: ShieldCheck,
  CAMPUS_SECURITY: Crosshair,
  STUDENT_REPORTER: Radio,
};

export default function RoleSwitcher() {
  const { currentRole, setCurrentRole, setLatestVerdict } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const currentMeta = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.SUPER_ADMIN;
  const CurrentIcon = ROLE_ICONS[currentRole] || ShieldAlert;

  const handleRoleSelect = (role: OperatorRole) => {
    setCurrentRole(role);
    setIsOpen(false);
    setLatestVerdict({
      text: `Role Clearance Switched: ${ROLE_CONFIGS[role].label.toUpperCase()} active`,
      type: "passed",
    });
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Role Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition shadow-sm hover:brightness-110 ${currentMeta.colorScheme.bg} ${currentMeta.colorScheme.border} ${currentMeta.colorScheme.text}`}
        title={`Active Operator Role: ${currentMeta.label}. Click to switch role.`}
      >
        <div className="flex items-center gap-1.5">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline uppercase">{currentMeta.label}</span>
          <span className="sm:hidden">{currentMeta.badge}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Role Switcher Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-cyan-800/60 bg-[#090f1d] shadow-2xl z-50 p-2 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="font-bold text-slate-300 text-[11px] tracking-wider uppercase flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Select Sovereign Role (RBAC)</span>
            </span>
            <span className="text-[10px] text-cyan-400">5 Roles Scoped</span>
          </div>

          <div className="space-y-1">
            {(Object.keys(ROLE_CONFIGS) as OperatorRole[]).map((role) => {
              const meta = ROLE_CONFIGS[role];
              const Icon = ROLE_ICONS[role];
              const isSelected = currentRole === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full text-left rounded-lg p-2.5 transition flex items-start gap-2.5 ${
                    isSelected
                      ? `${meta.colorScheme.bg} ${meta.colorScheme.border} border`
                      : "hover:bg-slate-850/80 border border-transparent"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg border ${meta.colorScheme.bg} ${meta.colorScheme.border} ${meta.colorScheme.text} flex-shrink-0 mt-0.5`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isSelected ? meta.colorScheme.text : "text-slate-200"}`}>
                        {meta.label}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                      {meta.tagline}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                      {meta.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800/80 pt-2 px-2 mt-1 text-[10px] text-slate-400 flex justify-between">
            <span>Enforces UI &amp; API boundaries</span>
            <span className="text-cyan-400">SHACL-GOV-01</span>
          </div>
        </div>
      )}
    </div>
  );
}
