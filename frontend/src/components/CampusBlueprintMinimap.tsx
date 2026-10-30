"use client";

import React, { useState } from "react";
import {
  MapPin,
  Compass,
  Layers,
  Crosshair,
  ShieldAlert,
  AlertTriangle,
  Building,
  Building2,
  Navigation,
  Eye,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  FileText,
  Network,
  Radio,
} from "lucide-react";
import { CampusTenant } from "../context/DashboardContext";
import { ThreatItem } from "./TriageFeed";

interface CampusBlueprintMinimapProps {
  campus: CampusTenant;
  onSelectZone?: (zoneId: string) => void;
  selectedZoneId?: string | null;
  compact?: boolean;
  incidents?: ThreatItem[];
  onSelectIncident?: (incidentId: string) => void;
  onOpenDossier?: (incidentId: string) => void;
  onFocusGraph?: (nodeId: string) => void;
  language?: "BM" | "EN";
  onToggleLanguage?: (lang: "BM" | "EN") => void;
}

export const BLUEPRINT_STRINGS = {
  BM: {
    headerTitle: "Pelan Induk JKR & Tindanan GPS Kampus",
    perimeter: "PAGAR KESELAMATAN SEMPADAN SEKOLAH (PERIMETER FENCE)",
    fieldTitle: "PADANG SEKOLAH",
    fieldSub: "(ASTAKA & BALAPAN)",
    fieldFull: "PADANG SEKOLAH / TREK",
    blockATitle: "BLOK A (PENTADBIRAN & GURU)",
    blockASub: "Pejabat Pengetua, Bilik Disiplin & Bilik Kaunseling",
    blockAFull: "BLOK A: PENTADBIRAN & PEJABAT",
    kpmBadge: "ZON KPM DIAKUI",
    blockBCTitle: "BLOK B & C (AKADEMIK & MAKMAL)",
    blockBCSub: "Tingkatan 1-5, Makmal Fizik/Kimia & Bilik Komputer",
    blockBCFull: "BLOK B: KELAS & MAKMAL",
    blindspotWarn: "⚠ Aras 3: Tandas & Koridor Belakang (Zon Blindspot)",
    canteenTitle: "KANTIN & DEWAN SERBAGUNA",
    canteenSub: "Medan Selera Pelajar, Koperasi & Dewan Perhimpunan",
    canteenFull: "KANTIN & FOYER",
    blockDTitle: "BLOK D (ASRAMA KEDIAMAN)",
    blockDSub: "Dormitory Putera (Blok Kenanga/Cempaka)",
    blockDFull: "KOMPLEKS ASRAMA (ASPURA)",
    dormRoom: "Hostel Wing Tingkat 3 (Bilik 302)",
    dormWarn: "Teras Laporan Ragging & 'Roll Call' Malam",
    surauTitle: "SURAU",
    surauSub: "Solat & Disiplin",
    courtTitle: "GELANGGANG",
    courtSub: "Futsal / Serbaguna",
    rearGateTitle: "PINTU BELAKANG & PONDOK BASIKAL",
    rearGateSub: "Zon Merah: Settle Luar & Ancaman Senjata",
    rearGateFull: "PINTU BELAKANG",
    mainGateTitle: "PINTU UTAMA & POS PENGAWAL",
    mainGateSub: "Kawalan Masuk & Palang Keselamatan",
    mainGateFull: "PINTU UTAMA",
    camMain: "CAM-01 (Pintu Utama)",
    camAdmin: "CAM-02 (Blok A)",
    camRear: "CAM-04 (Pintu Belakang)",
    camDorm: "CAM-05 (Koridor ASPURA)",
    compassNorth: "U",
    legendLabel: "PETUNJUK:",
    legendT5: "T5 Pemerasan/Parang",
    legendT4: "T4 Ragging Asrama",
    legendGate: "Pintu Dipantau",
    activeZonesTitle: "Mikro-Zon Aktif & Titik Dipantau",
    tapMarkerHint: "Ketik penanda untuk periksa sektor",
    satelliteBtn: "🛰️ Satelit",
    fullscreenBtn: "⛶ Skrin Penuh",
    exitFullscreen: "Keluar Skrin Penuh (Esc)",
    schematicTitle: "SKEMATIK SENIBINA JKR • SENSOR TERCALIBRASI",
    layerAll: "SEMUA",
    layerHotspots: "HOTSPOT",
    layerBlueprint: "PELAN",
    sectorDossier: "Dossier Sektor & Insiden",
    allCampusZones: "Semua Zon Kampus",
    blockLabel: "Blok:",
    noIncidents: "Tiada insiden dilaporkan dalam sektor ini.",
  },
  EN: {
    headerTitle: "JKR Campus Blueprint & GPS Location Overlay",
    perimeter: "CAMPUS PERIMETER SECURITY FENCE (JKR SPEC)",
    fieldTitle: "SPORTS FIELD",
    fieldSub: "(PAVILION & RUNNING TRACK)",
    fieldFull: "SPORTS FIELD / TRACK",
    blockATitle: "BLOCK A (ADMINISTRATION & FACULTY)",
    blockASub: "Principal Office, Discipline & Counseling Room",
    blockAFull: "BLOCK A: ADMINISTRATION & OFFICES",
    kpmBadge: "MOE VERIFIED ZONE",
    blockBCTitle: "BLOCKS B & C (ACADEMIC & LABS)",
    blockBCSub: "Forms 1-5, Science Labs & Computer Room",
    blockBCFull: "BLOCK B: CLASSROOMS & LABS",
    blindspotWarn: "⚠ Level 3: Restrooms & Rear Corridor (Blindspot Zone)",
    canteenTitle: "CANTEEN & MULTIPURPOSE HALL",
    canteenSub: "Student Dining, Co-op Store & Assembly Hall",
    canteenFull: "CANTEEN & FOYER",
    blockDTitle: "BLOCK D (RESIDENTIAL DORMITORY)",
    blockDSub: "Boys' Dormitory (Kenanga/Cempaka Block)",
    blockDFull: "DORMITORY COMPLEX (ASPURA)",
    dormRoom: "Hostel Wing Level 3 (Room 302)",
    dormWarn: "Core Hazing Incident Area & Night 'Roll Call'",
    surauTitle: "SURAU (PRAYER HALL)",
    surauSub: "Worship & Student Guidance",
    courtTitle: "SPORTS COURTS",
    courtSub: "Futsal / Multipurpose",
    rearGateTitle: "REAR GATE & BICYCLE SHED",
    rearGateSub: "Red Zone: Confrontations & Weapon Threats",
    rearGateFull: "REAR GATE",
    mainGateTitle: "MAIN GATE & GUARD POST",
    mainGateSub: "Access Control & Security Barrier",
    mainGateFull: "MAIN GATE",
    camMain: "CAM-01 (Main Gate)",
    camAdmin: "CAM-02 (Block A)",
    camRear: "CAM-04 (Rear Gate)",
    camDorm: "CAM-05 (Dorm Corridor)",
    compassNorth: "N",
    legendLabel: "LEGEND:",
    legendT5: "T5 Extortion / Weapon Threat",
    legendT4: "T4 Hostel Ragging",
    legendGate: "Monitored Gate",
    activeZonesTitle: "Active Micro-Zones & Monitored Points",
    tapMarkerHint: "Tap marker to inspect sector",
    satelliteBtn: "🛰️ Satellite",
    fullscreenBtn: "⛶ Fullscreen",
    exitFullscreen: "Exit Fullscreen (Esc)",
    schematicTitle: "JKR ARCHITECTURAL SCHEMATIC • CALIBRATED SENSORS",
    layerAll: "ALL",
    layerHotspots: "HOTSPOTS",
    layerBlueprint: "BLUEPRINT",
    sectorDossier: "Sector & Event Dossiers",
    allCampusZones: "All Campus Zones",
    blockLabel: "Block:",
    noIncidents: "No active incidents recorded in this sector.",
  },
};

const ZONE_TRANSLATIONS: Record<string, { name: string; desc: string }> = {
  HOTSPOT_PINTU_BELAKANG: {
    name: "Rear Gate & Bicycle Shed",
    desc: "Blind spot behind bicycle shed with no direct CCTV coverage. Primary conduit for weapon contraband and off-campus altercations.",
  },
  HOTSPOT_ASRAMA_BLOK_C: {
    name: "Hostel Block C (Level 3)",
    desc: "Senior dormitory wing and laundry room. High-risk zone for late-night curfew hazing and extortion.",
  },
  HOTSPOT_TANDAS_BLOK_B: {
    name: "Block B Restrooms & Rear Corridor",
    desc: "Unmonitored blind spot area prone to extortion and illicit substance exchanges.",
  },
  GATE_PINTU_UTAMA: {
    name: "Main Entrance & Security Post",
    desc: "Access control gate with active security guard post and 24/7 CCTV surveillance.",
  },
  ZONE_KANTIN_DEWAN: {
    name: "Canteen & Multipurpose Hall",
    desc: "High-density communal area during recess and assembly hours.",
  },
};

const getZoneDisplay = (zone: { id: string; name?: string; threatDescription?: string }, lang: "BM" | "EN") => {
  if (lang === "EN") {
    const upperId = (zone.id || "").toUpperCase().replace(/-/g, "_");
    for (const [key, trans] of Object.entries(ZONE_TRANSLATIONS)) {
      if (upperId.includes(key) || key.includes(upperId)) {
        return {
          name: trans.name,
          desc: trans.desc,
        };
      }
    }
    let translatedName = zone.name || zone.id;
    translatedName = translatedName
      .replace(/Pintu Pagar Belakang/gi, "Rear Gate")
      .replace(/Pintu Belakang/gi, "Rear Gate")
      .replace(/Pondok Basikal/gi, "Bicycle Shed")
      .replace(/Pintu Utama/gi, "Main Gate")
      .replace(/Pos Pengawal/gi, "Security Post")
      .replace(/Asrama/gi, "Dormitory")
      .replace(/Tandas/gi, "Restrooms")
      .replace(/Padang/gi, "Field")
      .replace(/Kantin/gi, "Canteen")
      .replace(/Tingkat/gi, "Level")
      .replace(/Blok/gi, "Block");
    return {
      name: translatedName,
      desc: zone.threatDescription || "",
    };
  }
  return {
    name: zone.name || zone.id,
    desc: zone.threatDescription || "",
  };
};

const matchIncidentToZone = (
  inc: ThreatItem,
  zone: { id: string; name?: string; blockCode?: string; threatDescription?: string }
): boolean => {
  if (!inc || !zone) return false;
  const incZone = (inc.matched_zone_id || "").toUpperCase().trim();
  const zId = (zone.id || "").toUpperCase().trim();

  // 1. Direct Zone ID equivalence
  if (incZone && (incZone === zId || incZone.includes(zId) || zId.includes(incZone))) return true;

  // 2. Canonical Mock Incident to Zone Bindings
  if (inc.id === "incident-fight" && (zId.includes("BLOK_C") || zId.includes("ASPURA") || zId.includes("HOSTEL"))) return true;
  if (inc.id === "incident-parang" && (zId.includes("PINTU_BELAKANG") || zId.includes("REAR"))) return true;
  if (inc.id === "incident-bullying" && (zId.includes("BILIK_IRON") || zId.includes("TOILET"))) return true;

  // 3. Text and Semantic Token Matching
  const txt = (
    (inc.contextSummary || "") + " " +
    (inc.slangTags || []).join(" ") + " " +
    (inc.id || "")
  ).toLowerCase();

  if (
    (zId.includes("REAR") || zId.includes("PINTU_BELAKANG") || zId.includes("PINTU-BELAKANG") || zId.includes("PINTU_PAGAR_BELAKANG")) &&
    (txt.includes("parang") || txt.includes("belakang") || txt.includes("bicycle") || txt.includes("pagar") || txt.includes("mathies") || txt.includes("barung") || txt.includes("kuching") || txt.includes("padang"))
  ) {
    return true;
  }

  if (
    zId.includes("PINTU_UTAMA_KUCHING") &&
    (txt.includes("mathies") || txt.includes("pintu utama") || txt.includes("pos pengawal") || txt.includes("kuching"))
  ) {
    return true;
  }

  if (
    (zId.includes("BLOK_C") || zId.includes("HOSTEL") || zId.includes("ASPURA")) &&
    (txt.includes("blok c") || txt.includes("asrama") || txt.includes("settle luar") || txt.includes("hostel") || txt.includes("seksyen 9") || txt.includes("ragging"))
  ) {
    return true;
  }

  if (
    (zId.includes("BILIK_IRON") || zId.includes("TOILET")) &&
    (txt.includes("iron") || txt.includes("tandas") || txt.includes("pau") || txt.includes("duit") || txt.includes("rm50") || txt.includes("bahan") || txt.includes("malu"))
  ) {
    return true;
  }

  return false;
};

export default function CampusBlueprintMinimap({
  campus,
  onSelectZone,
  selectedZoneId,
  compact = false,
  incidents = [],
  onSelectIncident,
  onOpenDossier,
  onFocusGraph,
  language: propLanguage,
  onToggleLanguage,
}: CampusBlueprintMinimapProps) {
  const [activeLayer, setActiveLayer] = useState<"ALL" | "HOTSPOTS" | "BLUEPRINT">("ALL");
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localLang, setLocalLang] = useState<"BM" | "EN">("BM");
  const lang = propLanguage || localLang;
  const toggleLanguage = () => {
    const next = lang === "BM" ? "EN" : "BM";
    setLocalLang(next);
    onToggleLanguage?.(next);
  };
  const t = BLUEPRINT_STRINGS[lang];

  const cleanCampusName = (campus.name || "").replace(/\s*\([^)]*\)/g, "").trim();
  const effectiveLat = campus.latitude ?? 3.074941;
  const effectiveLng = campus.longitude ?? 101.529884;
  const address = campus.address ?? "Selangor Darul Ehsan, Malaysia";
  const zones = campus.zones ?? [];

  // Verified Google Maps Satellite link with t=k & z=18 directly over campus
  const osmUrl = `https://www.openstreetmap.org/?mlat=${effectiveLat}&mlon=${effectiveLng}#map=17/${effectiveLat}/${effectiveLng}`;
  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(cleanCampusName)}+@${effectiveLat},${effectiveLng}&t=k&z=18`;

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 5:
        return {
          bg: "bg-rose-500",
          border: "border-rose-400",
          text: "text-rose-300",
          glow: "rgba(244, 63, 94, 0.7)",
        };
      case 4:
        return {
          bg: "bg-orange-500",
          border: "border-orange-400",
          text: "text-orange-300",
          glow: "rgba(249, 115, 22, 0.6)",
        };
      case 3:
        return {
          bg: "bg-amber-500",
          border: "border-amber-400",
          text: "text-amber-300",
          glow: "rgba(245, 158, 11, 0.5)",
        };
      case 2:
        return {
          bg: "bg-yellow-500",
          border: "border-yellow-400",
          text: "text-yellow-300",
          glow: "rgba(234, 179, 8, 0.4)",
        };
      default:
        return {
          bg: "bg-cyan-500",
          border: "border-cyan-400",
          text: "text-cyan-300",
          glow: "rgba(6, 182, 212, 0.4)",
        };
    }
  };

  return (
    <div className="bg-[#0b1118] border border-cyan-500/20 rounded-lg overflow-hidden flex flex-col font-mono text-xs">
      {/* Header bar */}
      <div className="px-3 py-2 bg-[#06090e] border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            {t.headerTitle}
          </span>
          <span className="px-1.5 py-0.2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded text-[9px]">
            {campus.blueprintType || "JKR_STANDARD_SECONDARY"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="font-mono text-cyan-300">
            LAT {effectiveLat.toFixed(4)}°N, LNG {effectiveLng.toFixed(4)}°E
          </span>
          <div className="flex items-center gap-1.5 bg-[#101826] px-2 py-0.5 rounded border border-slate-800 text-[9px]">
            <a
              href="https://osint-target.sentiasasystems.com"
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 font-bold hover:text-violet-200 transition-colors flex items-center gap-1"
              title="Open Suara Pelajar Lembah Klang live student whistleblowing forum"
            >
              🌐 Suara Pelajar Target
            </a>
            <span className="text-slate-600">|</span>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`(site:reddit.com/r/malaysia OR site:reddit.com/r/malaysiauni OR site:forum.lowyat.net) "${cleanCampusName}" asrama buli`)}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-cyan-300 transition-colors"
              title="Search targeted Malaysian youth communities (Reddit r/malaysia, r/malaysiauni, Lowyat)"
            >
              Forum Search
            </a>
          </div>
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 hover:text-white hover:bg-cyan-900 transition-colors ml-1 font-bold text-[9px] shadow-sm cursor-pointer"
            title="Toggle Blueprint Language: Bahasa Melayu / English"
          >
            <span>🌐</span>
            <span>{lang === "BM" ? "🇲🇾 BM" : "🇬🇧 EN"}</span>
          </button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 hover:text-white hover:bg-cyan-900/80 transition-colors ml-1 font-bold text-[9px]"
            title={`Open real satellite view of ${cleanCampusName} in Google Maps`}
          >
            <span>{t.satelliteBtn}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 hover:text-white hover:bg-indigo-900/80 transition-colors ml-1 font-bold text-[9px] cursor-pointer"
            title="Open Fullscreen Interactive School Blueprint with Sector & Event Details"
          >
            <span>{t.fullscreenBtn}</span>
          </button>
        </div>
      </div>

      {/* Address & PPD Coordinate Banner */}
      <div className="px-3 py-1.5 bg-[#0e1622] border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500">PPD:</span>
          <span className="text-slate-300 font-bold">{campus.district}</span>
        </div>
      </div>

      {/* Schematic Layout Blueprint Canvas */}
      <div className="relative w-full aspect-[16/9] bg-[#05080c] overflow-hidden select-none border-b border-cyan-500/20">
        {/* Architectural Grid & Radar sweep lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #00f0ff 1px, transparent 1px),
              linear-gradient(to bottom, #00f0ff 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Blueprint SVG Schematic Layout (JKR Standard Malaysian Secondary School) */}
        <svg
          viewBox="0 0 1000 550"
          className="w-full h-full absolute inset-0"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#00f0ff" strokeWidth="1" strokeOpacity="0.15" />
            </pattern>
            <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* School Boundary Perimeter Fence */}
          <rect
            x="40"
            y="30"
            width="920"
            height="490"
            fill="none"
            stroke="#1e293b"
            strokeWidth="3"
            strokeDasharray="8 4"
          />
          <text x="55" y="52" fill="#475569" fontSize="11" fontFamily="monospace">
            {t.perimeter}
          </text>

          {/* Padang Sekolah (Football / Sports Field) */}
          <g>
            <rect
              x="80"
              y="70"
              width="240"
              height="340"
              rx="6"
              fill="#061c14"
              stroke="#059669"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
            <rect
              x="100"
              y="110"
              width="200"
              height="260"
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="4 2"
            />
            <circle cx="200" cy="240" r="30" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.3" />
            <text x="140" y="245" fill="#10b981" fontSize="12" fontWeight="bold" opacity="0.6">
              {t.fieldTitle}
            </text>
            <text x="140" y="262" fill="#059669" fontSize="9" opacity="0.6">
              {t.fieldSub}
            </text>
          </g>

          {/* Blok A (Pentadbiran / Pejabat Guru / Dewan) */}
          <g>
            <rect
              x="360"
              y="70"
              width="260"
              height="80"
              rx="3"
              fill="#091b29"
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <rect x="360" y="70" width="260" height="80" fill="url(#diagonalHatch)" />
            <text x="375" y="100" fill="#38bdf8" fontSize="12" fontWeight="bold">
              {t.blockATitle}
            </text>
            <text x="375" y="120" fill="#94a3b8" fontSize="9">
              {t.blockASub}
            </text>
            <rect x="375" y="130" width="90" height="12" fill="#0284c7" rx="2" />
            <text x="382" y="139" fill="#ffffff" fontSize="8" fontWeight="bold">
              {t.kpmBadge}
            </text>
          </g>

          {/* Blok B & C (Akademik, Bilik Darjah & Makmal Sains) */}
          <g>
            <rect
              x="360"
              y="180"
              width="260"
              height="100"
              rx="3"
              fill="#0c1724"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            <text x="375" y="210" fill="#e2e8f0" fontSize="12" fontWeight="bold">
              {t.blockBCTitle}
            </text>
            <text x="375" y="230" fill="#94a3b8" fontSize="9">
              {t.blockBCSub}
            </text>
            <line x1="360" y1="245" x2="620" y2="245" stroke="#1e293b" strokeWidth="1" />
            <text x="375" y="265" fill="#f59e0b" fontSize="9">
              {t.blindspotWarn}
            </text>
          </g>

          {/* Kantin & Dewan Serbaguna */}
          <g>
            <rect
              x="360"
              y="310"
              width="260"
              height="90"
              rx="4"
              fill="#131e2b"
              stroke="#0ea5e9"
              strokeWidth="1.2"
            />
            <text x="375" y="340" fill="#7dd3fc" fontSize="12" fontWeight="bold">
              {t.canteenTitle}
            </text>
            <text x="375" y="360" fill="#94a3b8" fontSize="9">
              {t.canteenSub}
            </text>
            <circle cx="590" cy="355" r="14" fill="#0369a1" opacity="0.3" />
            <text x="584" y="359" fill="#38bdf8" fontSize="10">
              ☕
            </text>
          </g>

          {/* Blok D (Asrama Putera / Puteri - Dormitories) */}
          <g>
            <rect
              x="660"
              y="70"
              width="260"
              height="210"
              rx="4"
              fill="#1a1118"
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />
            <text x="675" y="100" fill="#fda4af" fontSize="12" fontWeight="bold">
              {t.blockDTitle}
            </text>
            <text x="675" y="120" fill="#fca5a5" fontSize="9">
              {t.blockDSub}
            </text>
            <rect x="675" y="135" width="230" height="60" fill="#2d121c" rx="2" stroke="#e11d48" strokeWidth="1" />
            <text x="685" y="155" fill="#fecdd3" fontSize="10" fontWeight="bold">
              {t.dormRoom}
            </text>
            <text x="685" y="175" fill="#f43f5e" fontSize="9">
              {t.dormWarn}
            </text>
          </g>

          {/* Surau & Kemudahan Kerohanian */}
          <g>
            <rect
              x="660"
              y="310"
              width="130"
              height="90"
              rx="3"
              fill="#081e18"
              stroke="#10b981"
              strokeWidth="1"
            />
            <text x="675" y="340" fill="#6ee7b7" fontSize="11" fontWeight="bold">
              {t.surauTitle}
            </text>
            <text x="675" y="360" fill="#94a3b8" fontSize="8">
              {t.surauSub}
            </text>
          </g>

          {/* Gelanggang Bola Keranjang / Futsal */}
          <g>
            <rect
              x="810"
              y="310"
              width="110"
              height="90"
              rx="3"
              fill="#18181b"
              stroke="#52525b"
              strokeWidth="1"
            />
            <text x="820" y="340" fill="#a1a1aa" fontSize="10" fontWeight="bold">
              {t.courtTitle}
            </text>
            <text x="820" y="360" fill="#71717a" fontSize="8">
              {t.courtSub}
            </text>
          </g>

          {/* Pintu Belakang & Pondok Basikal (CRITICAL HOTSPOT) */}
          <g>
            <rect
              x="720"
              y="440"
              width="200"
              height="60"
              rx="4"
              fill="#31131a"
              stroke="#f43f5e"
              strokeWidth="2"
            />
            <circle cx="820" cy="470" r="45" fill="url(#hotspotGlow)" />
            <text x="735" y="465" fill="#ff4d4f" fontSize="11" fontWeight="extrabold">
              {t.rearGateTitle}
            </text>
            <text x="735" y="485" fill="#fca5a5" fontSize="9">
              {t.rearGateSub}
            </text>
          </g>

          {/* Pintu Utama & Pondok Keselamatan */}
          <g>
            <rect
              x="120"
              y="440"
              width="200"
              height="60"
              rx="4"
              fill="#081826"
              stroke="#0ea5e9"
              strokeWidth="1.5"
            />
            <text x="135" y="465" fill="#38bdf8" fontSize="11" fontWeight="bold">
              {t.mainGateTitle}
            </text>
            <text x="135" y="485" fill="#94a3b8" fontSize="9">
              {t.mainGateSub}
            </text>
          </g>

          {/* Covered Walkways connecting Blocks */}
          <path
            d="M 220 440 L 220 410 L 490 410 L 490 400"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.4"
          />
          <path
            d="M 490 310 L 490 280 M 490 180 L 490 150"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.4"
          />
          <path
            d="M 620 110 L 660 110"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.4"
          />
          <path
            d="M 790 280 L 790 440"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeDasharray="3 3"
            opacity="0.5"
          />

          {/* Compass Rose Reticle */}
          <g transform="translate(900, 70)">
            <circle cx="0" cy="0" r="22" fill="#0b1118" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />
            <polygon points="0,-18 5,-4 -5,-4" fill="#f43f5e" />
            <polygon points="0,18 5,4 -5,4" fill="#64748b" />
            <text x="-4" y="-22" fill="#f43f5e" fontSize="9" fontWeight="bold">
              {t.compassNorth}
            </text>
            <text x="-3" y="7" fill="#64748b" fontSize="8">
              JKR
            </text>
          </g>

          {/* Calibrated CCTV Camera Sensor Arrays with Sweeping FOV Cones */}
          <g id="cctv-fov-layer" opacity={activeLayer === "BLUEPRINT" ? 0.3 : 0.85}>
            {/* Cam 01: Pintu Utama (cx: 220, cy: 440, angle: 45) */}
            <g className="cursor-pointer">
              <path
                d="M 220 440 L 160 360 A 90 90 0 0 1 290 370 Z"
                fill="rgba(6, 182, 212, 0.18)"
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <circle cx="220" cy="440" r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
              <text x="230" y="445" fill="#38bdf8" fontSize="8" fontWeight="bold">{t.camMain}</text>
            </g>

            {/* Cam 02: Foyer Blok A (cx: 490, cy: 110, angle: 90) */}
            <g className="cursor-pointer">
              <path
                d="M 490 110 L 580 80 A 100 100 0 0 1 580 150 Z"
                fill="rgba(6, 182, 212, 0.15)"
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <circle cx="490" cy="110" r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
              <text x="500" y="115" fill="#38bdf8" fontSize="8" fontWeight="bold">{t.camAdmin}</text>
            </g>

            {/* Cam 04: Pintu Belakang & Basikal (cx: 860, cy: 440, angle: 270) */}
            <g className="cursor-pointer">
              <path
                d="M 860 440 L 770 410 A 100 100 0 0 0 780 480 Z"
                fill="rgba(244, 63, 94, 0.20)"
                stroke="#f43f5e"
                strokeWidth="1.2"
                strokeDasharray="4 2"
              />
              <circle cx="860" cy="440" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
              <text x="760" y="495" fill="#f43f5e" fontSize="8" fontWeight="bold">{t.camRear}</text>
            </g>

            {/* Cam 05: Asrama ASPURA Outer Corridor (cx: 790, cy: 140, angle: 0) */}
            <g className="cursor-pointer">
              <path
                d="M 790 140 L 740 60 A 90 90 0 0 1 840 60 Z"
                fill="rgba(249, 115, 22, 0.20)"
                stroke="#f97316"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <circle cx="790" cy="140" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
              <text x="800" y="145" fill="#f97316" fontSize="8" fontWeight="bold">{t.camDorm}</text>
            </g>
          </g>

          {/* Dynamic Tactical Hotspot Ping Markers & Live Incident Badges */}
          {zones.map((zone) => {
            const cx = (zone.coords?.x ?? 50) * 10;
            const cy = (zone.coords?.y ?? 50) * 5.5;
            const isSelected = selectedZoneId === zone.id || hoveredZone === zone.id;
            const isHighRisk = zone.riskTier >= 4;

            // Resolve live incidents mapped to this zone and belonging to this campus
            const matchingIncidents = incidents.filter((inc) => {
              const incTenant = (inc.tenant_id || "").toLowerCase();
              const school = (inc.schoolName || "").toLowerCase();
              const campusId = (campus.id || "").toLowerCase();
              if (campusId.includes("kuching")) {
                if (!incTenant.includes("kuching") && !school.includes("kuching")) return false;
              } else if (campusId.includes("seksyen-9") || campusId.includes("seksyen 9")) {
                if (!incTenant.includes("seksyen-9") && !school.includes("seksyen 9") && inc.id !== "incident-fight") return false;
              } else if (campusId.includes("seksyen-11") || campusId.includes("seksyen 11")) {
                if (incTenant.includes("kuching") || school.includes("kuching") || incTenant.includes("seksyen-9") || school.includes("seksyen 9") || inc.id === "incident-fight") return false;
              }
              return matchIncidentToZone(inc, zone);
            });

            return (
              <g
                key={zone.id}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => onSelectZone?.(zone.id)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Ping wave animation for high risk */}
                {isHighRisk && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? "26" : "18"}
                    fill="none"
                    stroke={zone.riskTier === 5 ? "#f43f5e" : "#f97316"}
                    strokeWidth="1.5"
                    className="animate-ping origin-center"
                    opacity="0.6"
                  />
                )}
                {/* Core Pin Reticle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? "14" : "10"}
                  fill={zone.riskTier === 5 ? "#f43f5e" : zone.riskTier === 4 ? "#ea580c" : "#eab308"}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? "2" : "1"}
                  className="shadow-lg"
                />
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                >
                  T{zone.riskTier}
                </text>

                {/* Live Incident Badge Pin */}
                {matchingIncidents.length > 0 && (
                  <g
                    transform={`translate(${cx + 14}, ${cy - 12})`}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectZone?.(zone.id);
                      if (matchingIncidents[0]?.id) {
                        onSelectIncident?.(matchingIncidents[0].id);
                      }
                    }}
                  >
                    <rect
                      x="0"
                      y="0"
                      width={Math.min(135, matchingIncidents[0].id.length * 7 + 38)}
                      height="18"
                      rx="3"
                      fill="#090f1d"
                      stroke={matchingIncidents[0].severityTier >= 4 ? "#f43f5e" : "#06b6d4"}
                      strokeWidth="1.2"
                    />
                    <text x="6" y="12" fill={matchingIncidents[0].severityTier >= 4 ? "#fecdd3" : "#67e8f9"} fontSize="8" fontWeight="bold">
                      ⚡ {matchingIncidents[0].id} (T{matchingIncidents[0].severityTier})
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend / Overlay Controls */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-[#06090e]/90 border border-slate-700/80 rounded px-2.5 py-1 text-[9px] backdrop-blur-sm">
          <span className="text-slate-400 font-bold">{t.legendLabel}</span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" /> {t.legendT5}
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> {t.legendT4}
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> {t.legendGate}
          </span>
        </div>
      </div>

      {/* Zone Hotspot Cards Footer (Only in standalone mini mode, hidden in compact mode) */}
      {!compact && (
        <div className="p-2.5 bg-[#080d14] flex flex-col gap-1.5 border-t border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>{t.activeZonesTitle} ({zones.length})</span>
            <span className="text-slate-500 text-[9px]">{t.tapMarkerHint}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
            {zones.map((zone) => {
              const colors = getTierColor(zone.riskTier);
              const isSelected = selectedZoneId === zone.id || hoveredZone === zone.id;
              const display = getZoneDisplay(zone, lang);

              return (
                <div
                  key={zone.id}
                  onClick={() => onSelectZone?.(zone.id)}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  className={`p-2 rounded border transition-all cursor-pointer flex items-start gap-2 ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      : "bg-[#0c1420]/70 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${colors.bg} text-white shrink-0`}
                  >
                    T{zone.riskTier}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate text-[10px]">
                        {display.name}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        {zone.blockCode}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                      {display.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Interactive School Blueprint & Sector Event Inspector Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#060a12]/95 backdrop-blur-md p-4 sm:p-6 flex flex-col font-mono text-xs overflow-hidden">
          {/* Header Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/50 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 shadow">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-white tracking-wide">{cleanCampusName}</h2>
                  <span className="rounded bg-cyan-950 border border-cyan-700 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">
                    {campus.code}
                  </span>
                  <span className="rounded bg-purple-950 border border-purple-700/60 px-2 py-0.5 text-[10px] text-purple-300 font-bold">
                    PPD {campus.district}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {address} • Lat/Lng: <strong className="text-cyan-300">{effectiveLat}, {effectiveLng}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500 text-cyan-200 hover:bg-cyan-900 font-bold transition text-xs shadow-sm cursor-pointer"
                title="Toggle Blueprint Language: Bahasa Melayu / English"
              >
                <span>🌐</span>
                <span>{lang === "BM" ? "🇲🇾 BM" : "🇬🇧 EN"}</span>
              </button>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-600 text-cyan-200 hover:bg-cyan-900 font-bold transition text-xs shadow-sm"
              >
                <span>{t.satelliteBtn}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-600 text-rose-200 hover:bg-rose-900 font-bold transition text-xs shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>{t.exitFullscreen}</span>
              </button>
            </div>
          </div>

          {/* Tactical Grid: 8 Cols Map + 4 Cols Live Event Details */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
            {/* Left Blueprint Map Area (8 cols) */}
            <div className="lg:col-span-8 rounded-xl border border-cyan-900/40 bg-[#05080c] relative flex flex-col overflow-hidden">
              {/* Map Layer Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#090f1d] px-3 py-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-bold text-slate-300 text-[11px]">{t.schematicTitle}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-0.5">
                  {(["ALL", "HOTSPOTS", "BLUEPRINT"] as const).map((layer) => {
                    const label = layer === "ALL" ? t.layerAll : layer === "HOTSPOTS" ? t.layerHotspots : t.layerBlueprint;
                    return (
                      <button
                        key={layer}
                        type="button"
                        onClick={() => setActiveLayer(layer)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          activeLayer === layer
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blueprint Canvas SVG */}
              <div className="relative flex-1 w-full bg-[#05080c] overflow-hidden select-none">
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #00f0ff 1px, transparent 1px),
                      linear-gradient(to bottom, #00f0ff 1px, transparent 1px)
                    `,
                    backgroundSize: "28px 28px",
                  }}
                />

                <svg
                  viewBox="0 0 1000 550"
                  className="w-full h-full absolute inset-0"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <pattern id="diagonalHatchFull" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="#00f0ff" strokeWidth="1" strokeOpacity="0.15" />
                    </pattern>
                  </defs>

                  {/* School Boundary Fence */}
                  <rect
                    x="40"
                    y="30"
                    width="920"
                    height="490"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="3"
                    strokeDasharray="8 4"
                  />

                  {/* Padang Sekolah */}
                  <rect x="80" y="80" width="300" height="200" rx="8" fill="#04121a" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="6 3" />
                  <ellipse cx="230" cy="180" rx="45" ry="30" fill="none" stroke="#0284c7" strokeWidth="1" opacity="0.4" />
                  <text x="140" y="185" fill="#0284c7" fontSize="12" fontWeight="bold">{t.fieldFull}</text>

                  {/* Blok Pentadbiran & Foyer */}
                  <rect x="420" y="70" width="220" height="80" rx="4" fill="#0a192f" stroke="#00f0ff" strokeWidth="1.5" />
                  <text x="440" y="115" fill="#00f0ff" fontSize="11" fontWeight="bold">{t.blockAFull}</text>

                  {/* Blok Akademik */}
                  <rect x="420" y="180" width="220" height="110" rx="4" fill="#0c1e38" stroke="#0284c7" strokeWidth="1.5" />
                  <text x="440" y="240" fill="#38bdf8" fontSize="11" fontWeight="bold">{t.blockBCFull}</text>

                  {/* Blok C Asrama & ASPURA */}
                  <rect x="700" y="80" width="200" height="180" rx="4" fill="#1f1325" stroke="#a855f7" strokeWidth="1.5" />
                  <text x="730" y="170" fill="#c084fc" fontSize="12" fontWeight="bold">{t.blockDFull}</text>

                  {/* Kantin */}
                  <rect x="380" y="340" width="180" height="80" rx="4" fill="#131b2e" stroke="#eab308" strokeWidth="1.5" />
                  <text x="420" y="385" fill="#facc15" fontSize="11" fontWeight="bold">{t.canteenFull}</text>

                  {/* Pintu Belakang */}
                  <line x1="840" y1="520" x2="940" y2="520" stroke="#f43f5e" strokeWidth="6" />
                  <text x="820" y="510" fill="#f43f5e" fontSize="10" fontWeight="bold">{t.rearGateFull}</text>

                  {/* Pintu Utama */}
                  <line x1="140" y1="520" x2="260" y2="520" stroke="#00f0ff" strokeWidth="6" />
                  <text x="160" y="510" fill="#00f0ff" fontSize="10" fontWeight="bold">{t.mainGateFull}</text>

                  {/* Zone Pins and Markers */}
                  {zones.map((zone) => {
                    const cx = (zone.coords?.x ?? 50) * 10;
                    const cy = (zone.coords?.y ?? 50) * 5.5;
                    const isSelected = selectedZoneId === zone.id || hoveredZone === zone.id;
                    const isHighRisk = zone.riskTier >= 4;

                    const matchingIncidents = incidents.filter((inc) => {
                      return matchIncidentToZone(inc, zone);
                    });

                    return (
                      <g
                        key={zone.id}
                        className="cursor-pointer transition-transform hover:scale-110"
                        onClick={() => onSelectZone?.(zone.id)}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                      >
                        {isHighRisk && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isSelected ? "28" : "20"}
                            fill="none"
                            stroke={zone.riskTier === 5 ? "#f43f5e" : "#f97316"}
                            strokeWidth="2"
                            className="animate-ping origin-center"
                            opacity="0.6"
                          />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? "16" : "12"}
                          fill={zone.riskTier === 5 ? "#f43f5e" : zone.riskTier === 4 ? "#ea580c" : "#eab308"}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                        />
                        <text x={cx} y={cy + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          T{zone.riskTier}
                        </text>

                        {/* Live Incident Badge */}
                        {matchingIncidents.length > 0 && (
                          <g transform={`translate(${cx + 16}, ${cy - 14})`}>
                            <rect
                              x="0"
                              y="0"
                              width={Math.min(145, matchingIncidents[0].id.length * 7 + 42)}
                              height="20"
                              rx="4"
                              fill="#090f1d"
                              stroke={matchingIncidents[0].severityTier >= 4 ? "#f43f5e" : "#06b6d4"}
                              strokeWidth="1.5"
                            />
                            <text x="6" y="14" fill={matchingIncidents[0].severityTier >= 4 ? "#fecdd3" : "#67e8f9"} fontSize="9" fontWeight="bold">
                              ⚡ {matchingIncidents[0].id}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-[#06090e]/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-[10px] backdrop-blur-sm">
                  <span className="text-slate-400 font-bold">{t.legendLabel}</span>
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" /> {t.legendT5}
                  </span>
                  <span className="flex items-center gap-1.5 text-orange-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> {t.legendT4}
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> {t.legendGate}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Live Sector & Event Details Inspector (4 cols) */}
            <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#080d19] p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    {t.sectorDossier}
                  </span>
                </div>
                <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">
                  {selectedZoneId ? `Locked: ${selectedZoneId}` : t.allCampusZones}
                </span>
              </div>

              {/* Sector Summary */}
              {(() => {
                const activeZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
                if (!activeZone) return null;

                const matchingIncs = incidents.filter((inc) => {
                  return matchIncidentToZone(inc, activeZone);
                });
                const display = getZoneDisplay(activeZone, lang);

                return (
                  <div className="flex-1 flex flex-col space-y-3 overflow-hidden min-h-0">
                    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-1.5 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{display.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          activeZone.riskTier === 5 ? "bg-rose-600 text-white animate-pulse" : "bg-amber-600 text-white"
                        }`}>
                          TIER {activeZone.riskTier}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.blockLabel} <strong className="text-cyan-300">{activeZone.blockCode}</strong>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {display.desc}
                      </p>
                    </div>

                    {/* Sector Incidents List */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase mb-2">
                        <span>Active Threat Signals ({matchingIncs.length})</span>
                        <span className="text-cyan-400">Sec 90A Evidentiary</span>
                      </div>

                      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                        {matchingIncs.length > 0 ? (
                          matchingIncs.map((inc) => (
                            <div key={inc.id} className="rounded-lg border border-slate-800 bg-[#0b1322] p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs font-mono">{inc.id}</span>
                                  <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 text-[9px] text-rose-300 font-bold">
                                    T{inc.severityTier}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">{inc.timestamp}</span>
                              </div>

                              <p className="text-xs text-slate-300 line-clamp-3">{inc.contextSummary}</p>

                              {/* Section 90A Hash */}
                              {inc.extendedArchive?.sha256 && (
                                <div className="text-[9px] text-slate-500 font-mono truncate">
                                  SHA-256: <span className="text-cyan-400">{inc.extendedArchive.sha256.slice(0, 24)}...</span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                                {onOpenDossier && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDossier(inc.id)}
                                    className="flex-1 flex items-center justify-center gap-1 rounded bg-rose-950/80 border border-rose-700/60 hover:bg-rose-900 px-2.5 py-1 text-[11px] text-rose-200 font-bold transition shadow-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Section 90A Dossier</span>
                                  </button>
                                )}

                                {onFocusGraph && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onFocusGraph(inc.id);
                                      setIsFullscreen(false);
                                    }}
                                    className="flex items-center justify-center gap-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-cyan-300 font-bold transition"
                                  >
                                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Focus Graph</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded border border-dashed border-slate-800 p-6 text-center text-slate-500 text-xs">
                            {t.noIncidents}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
