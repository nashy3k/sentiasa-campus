"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, Globe, ChevronDown, Check, Settings } from "lucide-react";
import { useDashboard, CampusTenant } from "../context/DashboardContext";

export interface CampusTenantOption {
  id: string;
  name: string;
  code: string;
  district: string;
  state: string;
}

export const CAMPUS_TENANTS: CampusTenantOption[] = [
  {
    id: "*",
    name: "All District Campuses (District Oversight)",
    code: "PPD-ALL",
    district: "Petaling Perdana",
    state: "Selangor",
  },
  {
    id: "smk-seksyen-11",
    name: "SMK Seksyen 11 Shah Alam",
    code: "BEA8616",
    district: "Petaling Perdana",
    state: "Selangor",
  },
  {
    id: "smk-seksyen-9",
    name: "SMK Seksyen 9 Shah Alam",
    code: "BEA8629",
    district: "Petaling Perdana",
    state: "Selangor",
  },
  {
    id: "smk-kuching-high",
    name: "SMK Kuching High (Sarawak)",
    code: "YEB1201",
    district: "Kuching",
    state: "Sarawak",
  },
];

export default function CampusScopeSwitcher() {
  const {
    currentRole,
    currentTenant,
    setCurrentTenant,
    setLatestVerdict,
    campuses,
    setIsDirectoryModalOpen,
    setDirectoryModalTab,
  } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCampusList: CampusTenantOption[] =
    campuses && campuses.length > 0
      ? campuses.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          district: c.district,
          state: c.state,
        }))
      : CAMPUS_TENANTS;

  // For non-Super-Admin roles, lock to their assigned local school
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const activeTenant =
    activeCampusList.find((t) => t.id === currentTenant) ||
    (isSuperAdmin ? activeCampusList[0] : activeCampusList[1] || CAMPUS_TENANTS[1]);

  const handleSelect = (tenantId: string) => {
    setCurrentTenant(tenantId);
    setIsOpen(false);
    const selected = activeCampusList.find((t) => t.id === tenantId);
    setLatestVerdict({
      text: `Campus Safety Scope: ${selected?.name || tenantId} active.`,
      type: "passed",
    });
  };

  if (!isSuperAdmin) {
    // School-bound roles see their assigned institution badge (no dropdown)
    return (
      <div
        className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-950/30 px-3 py-1.5 font-mono text-xs font-semibold text-blue-200"
        title="Assigned Institutional Scope: Bound to your campus jurisdiction"
      >
        <Building2 className="h-3.5 w-3.5 text-blue-400" />
        <span className="truncate max-w-[130px]">{activeTenant?.name || "SMK Seksyen 11 Shah Alam"}</span>
      </div>
    );
  }

  // Super-Admin gets full multi-campus toggle
  const isDistrictAll = currentTenant === "*";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition shadow-sm hover:brightness-110 ${
          isDistrictAll
            ? "border-purple-500/50 bg-purple-950/50 text-purple-200"
            : "border-cyan-500/40 bg-cyan-950/40 text-cyan-200"
        }`}
        title="Campus Institutional Safety Scope. Click to toggle between all district campuses or specific schools."
      >
        <div className="flex items-center gap-1.5">
          {isDistrictAll ? (
            <Globe className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
          )}
          <span className="truncate max-w-[150px]">
            {isDistrictAll ? "ALL DISTRICT CAMPUSES" : activeTenant?.name || "SMK Seksyen 11 Shah Alam"}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-700 bg-[#090f1d] shadow-2xl z-50 p-2 font-mono text-xs backdrop-blur-md">
          <div className="px-3 py-2 border-b border-slate-800 mb-1 flex items-center justify-between">
            <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
              Select Campus Monitoring Scope
            </span>
            <span className="text-[10px] text-purple-400">PPD / Multi-Campus</span>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {activeCampusList.map((tenant) => {
              const isSelected =
                (tenant.id === "*" && currentTenant === "*") ||
                tenant.id === currentTenant;

              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSelect(tenant.id)}
                  className={`w-full text-left rounded-lg p-2.5 transition flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-800 text-white border border-cyan-500/50"
                      : "text-slate-300 hover:bg-slate-850 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tenant.id === "*" ? (
                      <Globe className="h-4 w-4 text-purple-400 shrink-0" />
                    ) : (
                      <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">{tenant.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {tenant.code} • {tenant.district}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Super-Admin Institutional Management Trigger */}
          <div className="pt-2 mt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setDirectoryModalTab("CAMPUSES");
                setIsDirectoryModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 py-2 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition shadow-sm"
            >
              <Settings className="h-3.5 w-3.5 text-cyan-400" />
              <span>Manage Campuses & Threat Matrix</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
