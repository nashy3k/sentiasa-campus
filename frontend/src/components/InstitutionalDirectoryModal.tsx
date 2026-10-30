"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Globe,
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  User,
  Users,
  Target,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  MapPin,
  Clock,
  Radio,
  Crosshair,
  Zap,
} from "lucide-react";
import { useDashboard, CampusTenant, ThreatActorPOI } from "../context/DashboardContext";
import CampusBlueprintMinimap from "./CampusBlueprintMinimap";

const SELANGOR_DISTRICTS = [
  "Petaling Utama",
  "Petaling Perdana",
  "Klang",
  "Hulu Langat",
  "Gombak",
  "Kuala Langat",
  "Sepang",
  "Kuala Selangor",
  "Hulu Selangor",
  "Sabak Bernam",
];

export default function InstitutionalDirectoryModal() {
  const {
    isDirectoryModalOpen,
    setIsDirectoryModalOpen,
    directoryModalTab,
    setDirectoryModalTab,
    campuses,
    addCampus,
    updateCampus,
    deleteCampus,
    threatActors,
    addThreatActor,
    updateThreatActor,
    deleteThreatActor,
    incidents,
    setCurrentTenant,
    setSelectedNodeId,
    setLatestVerdict,
    setTraceRequest,
  } = useDashboard();

  // Search & Filter States
  const [campusSearch, setCampusSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");

  const [poiSearch, setPoiSearch] = useState("");
  const [poiRoleFilter, setPoiRoleFilter] = useState("ALL");
  const [poiCampusFilter, setPoiCampusFilter] = useState("ALL");

  // Campus Inspection State (Blueprint Minimap)
  const [inspectedCampus, setInspectedCampus] = useState<CampusTenant | null>(null);

  // Campus Form State
  const [isAddingCampus, setIsAddingCampus] = useState(false);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [campusForm, setCampusForm] = useState({
    name: "",
    code: "",
    district: "Petaling Utama",
    state: "Selangor",
    latitude: 3.0738,
    longitude: 101.6067,
    address: "",
    contactPerson: "",
  });

  // POI Form State
  const [isAddingPoi, setIsAddingPoi] = useState(false);
  const [editingPoiId, setEditingPoiId] = useState<string | null>(null);
  const [poiForm, setPoiForm] = useState({
    handle: "",
    schoolId: "smk-sentiasa",
    role: "INSTIGATOR" as ThreatActorPOI["role"],
    riskTier: 4 as ThreatActorPOI["riskTier"],
    status: "ACTIVE_MONITORING" as ThreatActorPOI["status"],
    threatTags: "Weapon Carrier, Extortion",
    notes: "",
  });

  // Filtered Campuses
  const filteredCampuses = useMemo(() => {
    return campuses.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(campusSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(campusSearch.toLowerCase()) ||
        c.district.toLowerCase().includes(campusSearch.toLowerCase());
      const matchDistrict = districtFilter === "ALL" || c.district === districtFilter;
      return matchSearch && matchDistrict;
    });
  }, [campuses, campusSearch, districtFilter]);

  // Filtered Threat Actors
  const filteredActors = useMemo(() => {
    return threatActors.filter((a) => {
      const matchSearch =
        a.handle.toLowerCase().includes(poiSearch.toLowerCase()) ||
        a.schoolName.toLowerCase().includes(poiSearch.toLowerCase()) ||
        a.threatTags.some((t) => t.toLowerCase().includes(poiSearch.toLowerCase())) ||
        a.notes.toLowerCase().includes(poiSearch.toLowerCase());
      const matchRole = poiRoleFilter === "ALL" || a.role === poiRoleFilter;
      const matchCampus = poiCampusFilter === "ALL" || a.schoolId === poiCampusFilter;
      return matchSearch && matchRole && matchCampus;
    });
  }, [threatActors, poiSearch, poiRoleFilter, poiCampusFilter]);

  if (!isDirectoryModalOpen) return null;

  // Handle Save Campus
  const handleSaveCampus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusForm.name || !campusForm.code) return;

    if (editingCampusId) {
      updateCampus(editingCampusId, {
        name: campusForm.name,
        code: campusForm.code.toUpperCase(),
        district: campusForm.district,
        state: campusForm.state,
        latitude: Number(campusForm.latitude) || 3.0738,
        longitude: Number(campusForm.longitude) || 101.6067,
        address: campusForm.address,
        contactPerson: campusForm.contactPerson,
      });
      setEditingCampusId(null);
    } else {
      addCampus({
        name: campusForm.name,
        code: campusForm.code.toUpperCase(),
        district: campusForm.district,
        state: campusForm.state,
        latitude: Number(campusForm.latitude) || 3.0738,
        longitude: Number(campusForm.longitude) || 101.6067,
        address: campusForm.address,
        blueprintType: "JKR_STANDARD_SECONDARY",
        contactPerson: campusForm.contactPerson,
        status: "ACTIVE",
      });
      setIsAddingCampus(false);
    }

    setCampusForm({
      name: "",
      code: "",
      district: "Petaling Utama",
      state: "Selangor",
      latitude: 3.0738,
      longitude: 101.6067,
      address: "",
      contactPerson: "",
    });
  };

  // Handle Edit Campus Trigger
  const handleStartEditCampus = (c: CampusTenant) => {
    setCampusForm({
      name: c.name,
      code: c.code,
      district: c.district,
      state: c.state,
      latitude: c.latitude ?? 3.0738,
      longitude: c.longitude ?? 101.6067,
      address: c.address ?? "",
      contactPerson: c.contactPerson || "",
    });
    setEditingCampusId(c.id);
    setIsAddingCampus(true);
  };

  // Handle Save POI
  const handleSavePoi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poiForm.handle) return;

    const matchedSchool = campuses.find((c) => c.id === poiForm.schoolId);
    const schoolName = matchedSchool ? matchedSchool.name : "SMK Sentiasa";

    const tagsArray = poiForm.threatTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingPoiId) {
      updateThreatActor(editingPoiId, {
        handle: poiForm.handle,
        schoolId: poiForm.schoolId,
        schoolName,
        role: poiForm.role,
        riskTier: poiForm.riskTier,
        status: poiForm.status,
        threatTags: tagsArray,
        notes: poiForm.notes,
      });
      setEditingPoiId(null);
    } else {
      addThreatActor({
        handle: poiForm.handle,
        schoolId: poiForm.schoolId,
        schoolName,
        role: poiForm.role,
        riskTier: poiForm.riskTier,
        status: poiForm.status,
        threatTags: tagsArray,
        notes: poiForm.notes,
      });
      setIsAddingPoi(false);
    }

    setPoiForm({
      handle: "",
      schoolId: "smk-sentiasa",
      role: "INSTIGATOR",
      riskTier: 4,
      status: "ACTIVE_MONITORING",
      threatTags: "Weapon Carrier, Extortion",
      notes: "",
    });
  };

  // Handle Edit POI Trigger
  const handleStartEditPoi = (actor: ThreatActorPOI) => {
    setPoiForm({
      handle: actor.handle,
      schoolId: actor.schoolId,
      role: actor.role,
      riskTier: actor.riskTier,
      status: actor.status,
      threatTags: actor.threatTags.join(", "),
      notes: actor.notes,
    });
    setEditingPoiId(actor.id);
    setIsAddingPoi(true);
  };

  // Focus Threat Actor on Graph Canvas
  const handleFocusActor = (actor: ThreatActorPOI) => {
    const targetNodeId = `persona-${actor.id}`;
    setSelectedNodeId(targetNodeId);
    setLatestVerdict({
      text: `Focused on Monitored Student: ${actor.handle}`,
      type: "passed",
    });
    setIsDirectoryModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl border border-cyan-800/60 bg-[#080d1a] text-slate-200 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#060a14] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-2 text-cyan-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-wider text-white">
                  INSTITUTIONAL DIRECTORY & THREAT MATRIX
                </h2>
                <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  SELANGOR JURISDICTION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                School Tenant Provisioning • Persons of Interest Watchlist • MOE Registry Sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDirectoryModalOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0a1122] px-6 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDirectoryModalTab("CAMPUSES")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                directoryModalTab === "CAMPUSES"
                  ? "bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Enrolled Campuses ({campuses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDirectoryModalTab("THREAT_ACTORS")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                directoryModalTab === "THREAT_ACTORS"
                  ? "bg-rose-500/20 border border-rose-500/60 text-rose-300 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Threat Watchlist & Matrix ({threatActors.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Evidence Act 1950 Sec 90A Compliant • Zero-PII Protected
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ================================================================= */}
          {/* TAB 1: CAMPUSES & SCHOOL TENANTS */}
          {/* ================================================================= */}
          {directoryModalTab === "CAMPUSES" && (
            <div className="space-y-6">
              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search school by name, MOE code, or district..."
                      value={campusSearch}
                      onChange={(e) => setCampusSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ALL">All Districts</option>
                    {SELANGOR_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCampus(!isAddingCampus);
                    setEditingCampusId(null);
                    setCampusForm({
                      name: "",
                      code: "",
                      district: "Petaling Utama",
                      state: "Selangor",
                      latitude: 3.0738,
                      longitude: 101.6067,
                      address: "",
                      contactPerson: "",
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 hover:text-white transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAddingCampus ? "Cancel Form" : "Enrol New Campus"}</span>
                </button>
              </div>

              {/* Add / Edit Campus Form */}
              {isAddingCampus && (
                <form
                  onSubmit={handleSaveCampus}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      {editingCampusId ? "Update Campus Record" : "Enrol New School Campus"}
                    </span>
                    <span className="text-[10px] text-slate-400">MOE Institutional Enrolment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">School Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SMK Subang Utama"
                        value={campusForm.name}
                        onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">MOE School Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. BEA8655"
                        value={campusForm.code}
                        onChange={(e) => setCampusForm({ ...campusForm, code: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white uppercase focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">PPD Administrative District</label>
                      <select
                        value={campusForm.district}
                        onChange={(e) => setCampusForm({ ...campusForm, district: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {SELANGOR_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">State</label>
                      <input
                        type="text"
                        value={campusForm.state}
                        onChange={(e) => setCampusForm({ ...campusForm, state: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">GPS Latitude (°N)</label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="e.g. 3.0738"
                        value={campusForm.latitude}
                        onChange={(e) => setCampusForm({ ...campusForm, latitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">GPS Longitude (°E)</label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="e.g. 101.6067"
                        value={campusForm.longitude}
                        onChange={(e) => setCampusForm({ ...campusForm, longitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 mb-1">Campus Physical Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Jalan SS 17/1, 47500 Subang Jaya, Selangor"
                        value={campusForm.address}
                        onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Lead Contact / Counselor</label>
                      <input
                        type="text"
                        placeholder="e.g. En. Ahmad (Ketua Guru Disiplin)"
                        value={campusForm.contactPerson}
                        onChange={(e) => setCampusForm({ ...campusForm, contactPerson: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCampus(false)}
                      className="rounded-lg border border-slate-700 px-4 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-500 px-5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      {editingCampusId ? "Save Changes" : "Confirm Enrolment"}
                    </button>
                  </div>
                </form>
              )}

              {/* Inspected Campus Blueprint & Minimap Panel */}
              {inspectedCampus && (
                <div className="relative rounded-2xl border border-cyan-500/40 bg-[#090f1a] p-4 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-400" />
                      <span className="font-bold text-sm text-white">
                        {inspectedCampus.name} • Campus Blueprint & GPS Sensor Overlay
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedCampus(null)}
                      className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Close Blueprint</span>
                    </button>
                  </div>

                  <CampusBlueprintMinimap campus={inspectedCampus} />
                </div>
              )}

              {/* Campus Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCampuses.map((c) => {
                  const isAll = c.id === "*";
                  const campusIncidents = incidents.filter(
                    (inc) => inc.schoolName.toLowerCase() === c.name.toLowerCase()
                  );
                  const campusActors = threatActors.filter((a) => a.schoolId === c.id);

                  return (
                    <div
                      key={c.id}
                      className={`rounded-2xl border p-4.5 flex flex-col justify-between transition shadow-lg ${
                        isAll
                          ? "border-purple-500/40 bg-purple-950/20"
                          : "border-slate-800 bg-[#0b1220] hover:border-cyan-500/40"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {isAll ? (
                              <Globe className="h-5 w-5 text-purple-400" />
                            ) : (
                              <Building2 className="h-5 w-5 text-cyan-400" />
                            )}
                            <div>
                              <div className="font-bold text-sm text-white">{c.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {c.code} • {c.district}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        {c.contactPerson && (
                          <div className="text-xs text-slate-300 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.contactPerson}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                          <div className="rounded-lg bg-slate-900/80 p-2">
                            <span className="text-slate-400 block">Active Signals</span>
                            <span className="font-bold text-cyan-300">
                              {isAll ? incidents.length : campusIncidents.length}
                            </span>
                          </div>
                          <div className="rounded-lg bg-slate-900/80 p-2">
                            <span className="text-slate-400 block">Threat POIs</span>
                            <span className="font-bold text-rose-300">
                              {isAll ? threatActors.length : campusActors.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTenant(c.id);
                              setIsDirectoryModalOpen(false);
                            }}
                            className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
                          >
                            <span>Scope</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>

                          {!isAll && (
                            <button
                              type="button"
                              onClick={() => setInspectedCampus(inspectedCampus?.id === c.id ? null : c)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                                inspectedCampus?.id === c.id
                                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                                  : "border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-600"
                              }`}
                              title="Toggle Campus Blueprint & GPS Minimap"
                            >
                              <MapPin className="h-3 w-3 text-cyan-400" />
                              <span>Blueprint</span>
                            </button>
                          )}
                        </div>

                        {!isAll && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditCampus(c)}
                              className="rounded p-1 text-slate-400 hover:text-white transition"
                              title="Edit Campus"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove campus ${c.name} from directory?`)) {
                                  deleteCampus(c.id);
                                }
                              }}
                              className="rounded p-1 text-rose-400 hover:text-rose-300 transition"
                              title="Delete Campus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: THREAT WATCHLIST & RISK MATRIX */}
          {/* ================================================================= */}
          {directoryModalTab === "THREAT_ACTORS" && (
            <div className="space-y-6">
              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-xl">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search POI by handle, threat tag, campus, or notes..."
                      value={poiSearch}
                      onChange={(e) => setPoiSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={poiRoleFilter}
                    onChange={(e) => setPoiRoleFilter(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="INSTIGATOR">Instigators</option>
                    <option value="REPEAT_EXTORTIONIST">Extortionists</option>
                    <option value="GANG_AFFILIATE">Gang Affiliates</option>
                    <option value="AT_RISK_TARGET">At-Risk Targets</option>
                  </select>

                  <select
                    value={poiCampusFilter}
                    onChange={(e) => setPoiCampusFilter(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="ALL">All Campuses</option>
                    {campuses
                      .filter((c) => c.id !== "*")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPoi(!isAddingPoi);
                    setEditingPoiId(null);
                    setPoiForm({
                      handle: "",
                      schoolId: "smk-sentiasa",
                      role: "INSTIGATOR",
                      riskTier: 4,
                      status: "ACTIVE_MONITORING",
                      threatTags: "Weapon Carrier, Extortion",
                      notes: "",
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/60 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/80 hover:text-white transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAddingPoi ? "Cancel Form" : "Add Person of Interest"}</span>
                </button>
              </div>

              {/* Add / Edit POI Form */}
              {isAddingPoi && (
                <form
                  onSubmit={handleSavePoi}
                  className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                      {editingPoiId ? "Update Watchlist Dossier" : "Register Person of Interest (POI)"}
                    </span>
                    <span className="text-[10px] text-slate-400">Child Protection & PDPA Compliant</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Handle / Pseudonym *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Danial 'Botak' (Form 5)"
                        value={poiForm.handle}
                        onChange={(e) => setPoiForm({ ...poiForm, handle: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Campus Association *</label>
                      <select
                        value={poiForm.schoolId}
                        onChange={(e) => setPoiForm({ ...poiForm, schoolId: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                      >
                        {campuses
                          .filter((c) => c.id !== "*")
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Role Classification</label>
                      <select
                        value={poiForm.role}
                        onChange={(e) =>
                          setPoiForm({ ...poiForm, role: e.target.value as ThreatActorPOI["role"] })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                      >
                        <option value="INSTIGATOR">INSTIGATOR (Aggressor)</option>
                        <option value="REPEAT_EXTORTIONIST">REPEAT EXTORTIONIST</option>
                        <option value="GANG_AFFILIATE">GANG AFFILIATE</option>
                        <option value="AT_RISK_TARGET">AT-RISK TARGET (Victim)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        Risk Severity Tier: Tier {poiForm.riskTier}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() =>
                              setPoiForm({ ...poiForm, riskTier: tier as ThreatActorPOI["riskTier"] })
                            }
                            className={`flex-1 rounded py-1.5 font-bold text-xs transition ${
                              poiForm.riskTier === tier
                                ? tier >= 4
                                  ? "bg-rose-500 text-slate-950 font-extrabold"
                                  : "bg-cyan-500 text-slate-950 font-extrabold"
                                : "bg-slate-800 text-slate-300 hover:text-white"
                            }`}
                          >
                            T{tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Monitoring Status</label>
                      <select
                        value={poiForm.status}
                        onChange={(e) =>
                          setPoiForm({ ...poiForm, status: e.target.value as ThreatActorPOI["status"] })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                      >
                        <option value="ACTIVE_MONITORING">ACTIVE MONITORING</option>
                        <option value="INTERVENTION_PENDING">INTERVENTION PENDING</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Threat Matrix Tags (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Weapon Carrier, Extortion, Hazing"
                        value={poiForm.threatTags}
                        onChange={(e) => setPoiForm({ ...poiForm, threatTags: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-400 mb-1">Modus Operandi & Case Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Document behavioral flags, known locations on campus, or incident ties..."
                        value={poiForm.notes}
                        onChange={(e) => setPoiForm({ ...poiForm, notes: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPoi(false)}
                      className="rounded-lg border border-slate-700 px-4 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-rose-500 px-5 py-1.5 text-xs font-bold text-slate-950 hover:bg-rose-400 transition"
                    >
                      {editingPoiId ? "Save Dossier" : "Register to Watchlist"}
                    </button>
                  </div>
                </form>
              )}

              {/* Threat Actor Roster Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActors.map((actor) => {
                  const isCritical = actor.riskTier >= 4;

                  return (
                    <div
                      key={actor.id}
                      className={`rounded-2xl border p-4.5 flex flex-col justify-between transition shadow-lg ${
                        isCritical
                          ? "border-rose-500/40 bg-[#140810] hover:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.08)]"
                          : "border-slate-800 bg-[#0b1220] hover:border-cyan-500/40"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{actor.handle}</span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                  actor.riskTier === 5
                                    ? "bg-rose-600 text-white animate-pulse"
                                    : actor.riskTier === 4
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                }`}
                              >
                                T{actor.riskTier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3 text-slate-500" />
                              <span>{actor.schoolName}</span>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              actor.role === "INSTIGATOR"
                                ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                                : actor.role === "AT_RISK_TARGET"
                                ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                                : "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                            }`}
                          >
                            {actor.role.replace(/_/g, " ")}
                          </span>
                        </div>

                        {/* Threat Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {actor.threatTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-slate-900 border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Notes */}
                        <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-950/60 rounded-lg p-2 border border-slate-800">
                          &ldquo;{actor.notes}&rdquo;
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFocusActor(actor)}
                            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-900/80 hover:text-white transition"
                            title="Center Canvas and Focus Student Persona"
                          >
                            <Crosshair className="h-3.5 w-3.5" />
                            <span>Focus Persona</span>
                          </button>

                          {actor.lastIncidentId && (
                            <button
                              type="button"
                              onClick={() => {
                                setTraceRequest({
                                  sourceId: `persona-${actor.id}`,
                                  targetId: actor.lastIncidentId!,
                                });
                                setIsDirectoryModalOpen(false);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/60 px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-900/80 hover:text-white transition"
                              title="Trace Shortest Path to Linked Incident in Blackout Mode"
                            >
                              <Zap className="h-3 w-3" />
                              <span>Trace Link</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditPoi(actor)}
                            className="rounded p-1 text-slate-400 hover:text-white transition"
                            title="Edit Dossier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${actor.handle} from threat watchlist?`)) {
                                deleteThreatActor(actor.id);
                              }
                            }}
                            className="rounded p-1 text-rose-400 hover:text-rose-300 transition"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
