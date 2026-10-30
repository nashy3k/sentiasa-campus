"use client";

import React, {

  createContext,

  useContext,

  useCallback,

  useEffect,

  useState,

  useMemo,

} from "react";

import type { GraphElements } from "../components/GraphCanvas";

import type { ThreatItem } from "../components/TriageFeed";

import type { TriageResponse } from "../components/IncidentSubmitter";

import { STAGING_STORAGE_KEY } from "../components/AccessGate";

import { OperatorRole, Permission, hasRolePermission } from "../types/auth";

import { getApiBaseUrl } from "../lib/api-client";

export const initialGraphElements: GraphElements = [

  { data: { id: "school-smk-seksyen-11", type: "SchoolNode", name: "SMK Seksyen 11 Shah Alam", district: "Petaling Perdana" } },

  { data: { id: "school-smk-seksyen-9", type: "SchoolNode", name: "SMK Seksyen 9 Shah Alam", district: "Petaling Perdana" } },

  { data: { id: "school-smk-kuching-high", type: "SchoolNode", name: "SMK Kuching High (Sarawak)", district: "Kuching" } },

  { data: { id: "persona-azlan", type: "PersonaNode", alias: "Azlan_17", school_name: "SMK Seksyen 11 Shah Alam", role_risk_tier: "SUSPECT_CARRIER" } },

  { data: { id: "persona-haziq", type: "PersonaNode", alias: "Haziq_R", school_name: "SMK Seksyen 9 Shah Alam", role_risk_tier: "INSTIGATOR" } },

  {

    data: {

      id: "incident-parang",

      type: "ThreatEventNode",

      incident_type: "Weapon Mention",

      severity_tier: 5,

      threatLabel: "Weapon Mention (T5)",

      context_summary: "Multiple messages indicate a possible weapon-related confrontation near the rear gate after class.",

    },

  },

  {

    data: {

      id: "incident-fight",

      type: "ThreatEventNode",

      incident_type: "Fight Escalation",

      severity_tier: 4,

      threatLabel: "Fight Escalation (T4)",

      context_summary: "Escalating argument between student groups. Language signals potential physical confrontation.",

    },

  },

  {

    data: {

      id: "incident-bullying",

      type: "ThreatEventNode",

      incident_type: "Harassment Signal",

      severity_tier: 2,

      threatLabel: "Harassment Signal (T2)",

      context_summary: "Repeated hostile messages directed at a student in a public group conversation.",

    },

  },

  {

    data: {

      id: "evi-seed-cctv",

      type: "evidence",

      media_type: "CCTV_KEYFRAME",

      label: "CCTV [Rear Gate]: Physical Altercation",

      color: "#f59e0b",

      video_filename: "clip_physical_altercation.mp4",

      timestamp_sec: 1.2,

      sha256: "9b3c4f7a1e2d...",

    },

  },

  {

    data: {

      id: "edge-evi-seed-incident-fight",

      source: "evi-seed-cctv",

      target: "incident-fight",

      label: "CORROBORATES",

    },

  },

  {

    data: {

      id: "evidence-1",

      source: "persona-azlan",

      target: "incident-parang",

      type: "EvidenceEdge",

      label: "REPORTS_THREAT",

    },

  },

  {

    data: {

      id: "evidence-2",

      source: "incident-parang",

      target: "school-smk-seksyen-11",

      type: "EvidenceEdge",

      label: "LOCATED_AT",

    },

  },

  {

    data: {

      id: "evidence-3",

      source: "persona-haziq",

      target: "incident-fight",

      type: "EvidenceEdge",

      label: "COMMUNICATES",

    },

  },

  {

    data: {

      id: "evidence-4",

      source: "incident-fight",

      target: "school-smk-seksyen-9",

      type: "EvidenceEdge",

      label: "LOCATED_AT",

    },

  },

  {
    data: {
      id: "evidence-5",
      source: "incident-bullying",
      target: "school-smk-seksyen-11",
      type: "EvidenceEdge",
      label: "LOCATED_AT",
    },
  },

  {
    data: {
      id: "pivot-smk-seksyen-11-bicycle-shed",
      type: "EntityTransformNode",
      label: "Pivot: Bicycle Shed",
      color: "#8b5cf6",
      source_url: "https://osint-target.sentiasasystems.com/threads/senjata-bahaya-pagar-belakang/",
      title: "URGENT: Nampak student bawak objek besi panjang berbalut kain hitam dekat bicycle shed",
      is_osint: true,
    },
  },
  {
    data: {
      id: "edge_pivot_bicycle_shed_incident_parang",
      source: "pivot-smk-seksyen-11-bicycle-shed",
      target: "incident-parang",
      type: "PivotCorroborationEdge",
      label: "TRANSFORM_CORROBORATES",
    },
  },
  {
    data: {
      id: "pivot-smk-seksyen-9-settle-luar-seksyen-9",
      type: "EntityTransformNode",
      label: "Pivot: Settle Luar (Seksyen 9)",
      color: "#8b5cf6",
      source_url: "https://osint-target.sentiasasystems.com/threads/pergaduhan-rendezvous-belakang-sekolah/",
      title: "Amaran: Group budak Seksyen 9 nak jumpa belakang petang ni (‘settle luar’)?",
      is_osint: true,
    },
  },
  {
    data: {
      id: "edge_pivot_settle_luar_incident_fight",
      source: "pivot-smk-seksyen-9-settle-luar-seksyen-9",
      target: "incident-fight",
      type: "PivotCorroborationEdge",
      label: "TRANSFORM_CORROBORATES",
    },
  },
  {
    data: {
      id: "pivot-smk-seksyen-11-blok-c",
      type: "EntityTransformNode",
      label: "Pivot: Blok C Asrama",
      color: "#8b5cf6",
      source_url: "https://osint-target.sentiasasystems.com/threads/extortion-block-c-smk-sentiasa/",
      title: "Ada senior mintak pau duit RM50 dekat tandas Blok C SMK Seksyen 11",
      is_osint: true,
    },
  },
  {
    data: {
      id: "edge_pivot_blok_c_incident_bullying",
      source: "pivot-smk-seksyen-11-blok-c",
      target: "incident-bullying",
      type: "PivotCorroborationEdge",
      label: "TRANSFORM_CORROBORATES",
    },
  },
];

export const mockIncidents: ThreatItem[] = [

  {

    id: "incident-parang",

    tenant_id: "smk-seksyen-11",

    severityTier: 5,

    timestamp: "09:42 MYT",

    schoolName: "SMK Seksyen 11 Shah Alam",

    contextSummary:

      "Multiple messages indicate a possible weapon-related confrontation near the rear gate after class.",

    slangTags: ["parang", "tapau", "jumpa belakang"],

    ilmuCalibration: {

      dNuance: 1.58,

      slangFidelity: 1.0,

      sovereignModel: "ilmu-nemo-nano",

      verifiedDialect: "Klang_Valley_Manglish",

    },

    jevVerdict: {

      passed: true,

      noulDangerScore: 0.94,

    },

    jev_telemetry: {

      imminent_violence: 0.95,

      weapon_threat: 0.98,

      extortion_coercion: 0.12,

      victim_distress: 0.74,

    },

    pivoted_nodes: [
      {
        id: "pivot-smk-seksyen-11-bicycle-shed",
        type: "EntityTransformNode",
        label: "Pivot: Bicycle Shed",
        source_url: "https://osint-target.sentiasasystems.com/threads/senjata-bahaya-pagar-belakang/",
        title: "URGENT: Nampak student bawak objek besi panjang berbalut kain hitam dekat bicycle shed",
      },
    ],
    matched_zone_id: "HOTSPOT_PINTU_BELAKANG",
    matched_zone_name: "Pintu Belakang & Laluan Stadium",
    spatial_coordinates: [101.5295, 3.0772],
    osint_horizon_phase: "LEFT_OF_BANG_PRECURSOR",
    osint_custody_hash: "7f8b91a2c3d4e5f6890123456789abcdef0123456789abcdef0123456789abcd",
    externalCitations: [
      {
        title: "Suara Pelajar: Senjata Bahaya Pagar Belakang (Bicycle Shed)",
        url: "https://osint-target.sentiasasystems.com/threads/senjata-bahaya-pagar-belakang/",
        platform: "suara_pelajar_target",
        engine: "suara_pelajar_direct",
        highlights: ["[Target Signal]: Watak rekaan melaporkan objek prop tumpul berbalut kain dekat shed basikal."],
      },
      {
        title: "r/malaysiauni - Campus Security & Anti-Violence Community Portal",
        url: "https://www.reddit.com/r/malaysiauni/",
        platform: "reddit",
        engine: "tavily",
        highlights: ["Student community warnings and verification regarding perimeter threats near secondary school gates."],
      },
    ],

    evidenceMetadata: {

      model_used: "nvidia/Nemotron-3.5-Super-VL",

      ocr_engine: "nebius_vision",

      media_type: "WHATSAPP_SCREENSHOT",

    },

  },

  {

    id: "incident-fight",

    tenant_id: "smk-seksyen-9",

    severityTier: 4,

    timestamp: "09:28 MYT",

    schoolName: "SMK Seksyen 9 Shah Alam",

    contextSummary:

      "Escalating argument between student groups. Language signals potential physical confrontation.",

    slangTags: ["koyak", "settle luar", "gang"],

    ilmuCalibration: {

      dNuance: 1.45,

      slangFidelity: 0.96,

      sovereignModel: "ilmu-nemo-nano",

      verifiedDialect: "Northern_Kedah",

    },

    jevVerdict: {

      passed: true,

      noulDangerScore: 0.82,

    },

    jev_telemetry: {

      imminent_violence: 0.88,

      weapon_threat: 0.15,

      extortion_coercion: 0.20,

      victim_distress: 0.65,

    },

    pivoted_nodes: [
      {
        id: "pivot-smk-seksyen-9-settle-luar-seksyen-9",
        type: "EntityTransformNode",
        label: "Pivot: Settle Luar (Seksyen 9)",
        source_url: "https://osint-target.sentiasasystems.com/threads/pergaduhan-rendezvous-belakang-sekolah/",
        title: "Amaran: Group budak Seksyen 9 nak jumpa belakang petang ni (‘settle luar’)?",
      },
    ],
    matched_zone_id: "ZONE_BLOK_C_L3",
    matched_zone_name: "Blok C Aras 3 (Tandas Belakang)",
    spatial_coordinates: [101.5273, 3.0857],
    osint_horizon_phase: "AMPLIFICATION",
    osint_custody_hash: "a1c2e3f4b5d6e7f890123456789abcdef0123456789abcdef0123456789bcde",

    externalCitations: [
      {
        title: "Suara Pelajar: Amaran Group Budak Seksyen 9 Nak Jumpa Belakang ('Settle Luar')",
        url: "https://osint-target.sentiasasystems.com/threads/pergaduhan-rendezvous-belakang-sekolah/",
        platform: "suara_pelajar_target",
        engine: "suara_pelajar_direct",
        highlights: ["[Target Signal]: Nampak chat Telegram rekaan beredar pasal pelajar fiksyen Seksyen 9 nak turun naik motor petang ni dekat area pondok basikal."],
      },
      {
        title: "Lowyat.NET Education - Student Welfare & Campus Discussions",
        url: "https://forum.lowyat.net/Education",
        platform: "lowyat",
        engine: "exa",
        highlights: ["Campus peer conflict and dorm tension escalated to physical confrontation threats."],
      },
    ],

    video_filename: "clip_physical_altercation.mp4",

    video_clips: ["clip_physical_altercation.mp4"],

    keyframe_timestamps: [1.2, 3.4],

    evidenceMetadata: {

      model_used: "nvidia/Nemotron-3.5-Super-VL",

      ocr_engine: "nebius_vision",

      media_type: "CCTV_KEYFRAME",

      filename: "clip_physical_altercation.mp4",

    },

  },

  {

    id: "incident-bullying",

    tenant_id: "smk-seksyen-11",

    severityTier: 2,

    timestamp: "08:56 MYT",

    schoolName: "SMK Seksyen 11 Shah Alam",

    contextSummary:

      "Repeated hostile messages directed at a student in a public group conversation.",

    slangTags: ["bahan", "malu", "kacau"],

    ilmuCalibration: {

      dNuance: 1.20,

      slangFidelity: 0.92,

      sovereignModel: "ilmu-nemo-nano",

      verifiedDialect: "National_Standard",

    },

    jevVerdict: {

      passed: true,

      noulDangerScore: 0.35,

    },

    jev_telemetry: {

      imminent_violence: 0.18,

      weapon_threat: 0.04,

      extortion_coercion: 0.82,

      victim_distress: 0.79,

    },

    matched_zone_id: "HOTSPOT_BILIK_IRON",
    matched_zone_name: "Bilik Menggosok & Dobi Aras 2 ASPURA",
    spatial_coordinates: [101.5287, 3.0788],
    pivoted_nodes: [
      {
        id: "pivot-smk-seksyen-11-blok-c",
        type: "EntityTransformNode",
        label: "Pivot: Blok C Asrama",
        source_url: "https://osint-target.sentiasasystems.com/threads/extortion-block-c-smk-sentiasa/",
        title: "Ada senior mintak pau duit RM50 dekat tandas Blok C SMK Seksyen 11",
      },
    ],
    osint_horizon_phase: "LEFT_OF_BANG_EARLY",
    osint_custody_hash: "b2d3f4a5c6e7f890123456789abcdef0123456789abcdef0123456789cdef",
    externalCitations: [
      {
        title: "Suara Pelajar: Ada Senior Mintak Pau Duit RM50 Tandas Blok C",
        url: "https://osint-target.sentiasasystems.com/threads/extortion-block-c-smk-sentiasa/",
        platform: "suara_pelajar_target",
        engine: "suara_pelajar_direct",
        highlights: ["[Target Signal]: Dua pelajar senior tahan seorang pelajar junior dalam tandas Blok C ugut nak tapau kalau tak bayar RM50."],
      },
      {
        title: "r/malaysia - National Student Well-Being & Anti-Bullying Portal",
        url: "https://www.reddit.com/r/malaysia/",
        platform: "reddit",
        engine: "tavily",
        highlights: ["Extortion and peer harassment incidents documented within school environments."],
      },
    ],

  },

];

export type PolicyThresholdPreset = "BALANCED" | "STRICT" | "PERMISSIVE";

export interface PolicyThresholdValues {

  critical_action_floor: number;

  elevated_action_floor: number;

  doubt_band_margin: number;

  slang_polysemy_floor: number;

  max_temporal_freshness_seconds: number;

  max_clock_skew_seconds: number;

}

export const POLICY_PRESETS: Record<PolicyThresholdPreset, PolicyThresholdValues> = {

  BALANCED: {

    critical_action_floor: 0.88,

    elevated_action_floor: 0.70,

    doubt_band_margin: 0.05,

    slang_polysemy_floor: 0.50,

    max_temporal_freshness_seconds: 1800,

    max_clock_skew_seconds: 300,

  },

  STRICT: {

    critical_action_floor: 0.92,

    elevated_action_floor: 0.80,

    doubt_band_margin: 0.08,

    slang_polysemy_floor: 0.65,

    max_temporal_freshness_seconds: 900,

    max_clock_skew_seconds: 120,

  },

  PERMISSIVE: {

    critical_action_floor: 0.75,

    elevated_action_floor: 0.60,

    doubt_band_margin: 0.03,

    slang_polysemy_floor: 0.40,

    max_temporal_freshness_seconds: 3600,

    max_clock_skew_seconds: 600,

  },

};

export interface DashboardContextValue {

  elements: GraphElements;

  setElements: React.Dispatch<React.SetStateAction<GraphElements>>;

  incidents: ThreatItem[];

  setIncidents: React.Dispatch<React.SetStateAction<ThreatItem[]>>;

  selectedNodeId: string | null;

  setSelectedNodeId: (id: string | null) => void;

  handleTriageSuccess: (res: TriageResponse) => void;

  handleTriageVetoed: (res: TriageResponse) => void;

  handleEscalate: (incident: ThreatItem) => void;

  hitlRefreshCounter: number;

  incrementHitlRefresh: () => void;

  isUnlocked: boolean;

  setIsUnlocked: (val: boolean) => void;

  isInitialized: boolean;

  handleLockConsole: () => void;

  latestVerdict: { text: string; type: "passed" | "vetoed" } | null;

  setLatestVerdict: (verdict: { text: string; type: "passed" | "vetoed" } | null) => void;

  handleHitlResolved: (queueId: string, decision: "APPROVE_ESCALATION" | "DISMISS") => void;

  // Southbridge JIT Policy Thresholds

  activePolicyPreset: PolicyThresholdPreset;

  setActivePolicyPreset: (preset: PolicyThresholdPreset) => void;

  activePolicyValues: PolicyThresholdValues;

  // RBAC & Multi-Tenancy Scope

  currentRole: OperatorRole;

  setCurrentRole: (role: OperatorRole) => void;

  currentTenant: string;

  setCurrentTenant: (tenant: string) => void;

  hasPermission: (permission: Permission) => boolean;

  // Institutional Directory & Threat Watchlist State

  campuses: CampusTenant[];

  addCampus: (campus: Omit<CampusTenant, "id"> & { id?: string }) => CampusTenant;

  updateCampus: (id: string, updates: Partial<CampusTenant>) => void;

  deleteCampus: (id: string) => void;

  threatActors: ThreatActorPOI[];

  addThreatActor: (actor: Omit<ThreatActorPOI, "id"> & { id?: string }) => ThreatActorPOI;

  updateThreatActor: (id: string, updates: Partial<ThreatActorPOI>) => void;

  deleteThreatActor: (id: string) => void;

  isDirectoryModalOpen: boolean;

  setIsDirectoryModalOpen: (open: boolean) => void;

  directoryModalTab: "CAMPUSES" | "THREAT_ACTORS";

  setDirectoryModalTab: (tab: "CAMPUSES" | "THREAT_ACTORS") => void;

  // Shortest Path Link Investigation

  traceRequest: { sourceId: string; targetId: string } | null;

  setTraceRequest: (req: { sourceId: string; targetId: string } | null) => void;

  // Left-of-Bang Chronology & Temporal Scrubbing

  timelineEpochIndex: number; // 0 = Beginning of observation window, 100 = Live (Now)

  setTimelineEpochIndex: (val: number | ((prev: number) => number)) => void;

  isTimelinePlaying: boolean;

  setIsTimelinePlaying: (val: boolean | ((prev: boolean) => boolean)) => void;

  timelinePlaybackSpeed: number; // e.g. 1x, 2x, 5x

  setTimelinePlaybackSpeed: (val: number) => void;

}

export interface CampusTenant {

  id: string;

  name: string;

  code: string;

  district: string;

  state: string;

  latitude?: number;

  longitude?: number;

  address?: string;

  blueprintType?: "JKR_STANDARD_SECONDARY" | "SBP_RESIDENTIAL_CAMPUS";

  contactPerson?: string;

  status: "ACTIVE" | "INACTIVE";

  enrolledDate?: string;

  zones?: {

    id: string;

    name: string;

    blockCode: string; // e.g. "BLOK A", "BLOK D", "PINTU BELAKANG"

    riskTier: 1 | 2 | 3 | 4 | 5;

    threatDescription: string;

    coords?: { x: number; y: number }; // relative SVG layout coordinate (0-100%)

  }[];

}

export interface ThreatActorPOI {

  id: string;

  handle: string;

  schoolId: string;

  schoolName: string;

  role: "INSTIGATOR" | "REPEAT_EXTORTIONIST" | "GANG_AFFILIATE" | "AT_RISK_TARGET";

  riskTier: 1 | 2 | 3 | 4 | 5;

  status: "ACTIVE_MONITORING" | "INTERVENTION_PENDING" | "RESOLVED";

  threatTags: string[];

  knownAliases?: string[];

  lastIncidentId?: string;

  notes: string;

}

export const defaultCampuses: CampusTenant[] = [

  {

    id: "*",

    name: "All District Campuses (District Oversight)",

    code: "PPD-ALL",

    district: "Petaling Perdana",

    state: "Selangor",

    latitude: 3.0733,

    longitude: 101.5185,

    address: "Pejabat Pendidikan Daerah Petaling Perdana, Kompleks PKNS, 40000 Shah Alam, Selangor Darul Ehsan",

    blueprintType: "JKR_STANDARD_SECONDARY",

    status: "ACTIVE",

    enrolledDate: "2026-01-15",

  },

  {

    id: "smk-seksyen-11",

    name: "SMK Seksyen 11 Shah Alam",

    code: "BEA8616",

    district: "Petaling Perdana",

    state: "Selangor",

    latitude: 3.074941,

    longitude: 101.529884,

    address: "Jalan Wau B 11/B, Seksyen 11, 40000 Shah Alam, Selangor Darul Ehsan",

    blueprintType: "SBP_RESIDENTIAL_CAMPUS",

    contactPerson: "En. Razak (PK HEM / Warden Asrama)",

    status: "ACTIVE",

    enrolledDate: "2026-02-01",

    zones: [

      {

        id: "HOTSPOT_BILIK_IRON",

        name: "Bilik Menggosok & Dobi ASPURA Aras 2",

        blockCode: "ASPURA-L2",

        riskTier: 5,

        threatDescription: "Hostel roll-call intimidation, hazing & physical coercion during curfew.",

        coords: { x: 82, y: 26 },

      },

      {

        id: "HOTSPOT_PINTU_BELAKANG",

        name: "Pintu Belakang & Laluan Stadium",

        blockCode: "PINTU BELAKANG",

        riskTier: 5,

        threatDescription: "Weapon intimidation signal (parang) & after-school extortion shake-downs.",

        coords: { x: 86, y: 88 },

      },

      {

        id: "HOTSPOT_BELAKANG_KANTIN",

        name: "Belakang Kantin & Rumah Sampah",

        blockCode: "KANTIN-REAR",

        riskTier: 4,

        threatDescription: "Extortion shake-down (pau duit), smoking & weapon concealment drop.",

        coords: { x: 44, y: 72 },

      },

      {

        id: "ZONE_PADANG_TREK",

        name: "Padang Sintetik & Trek Olahraga SSN",

        blockCode: "PADANG / TREK",

        riskTier: 2,

        threatDescription: "Sports complex perimeter monitoring during training hours.",

        coords: { x: 28, y: 35 },

      },

      {

        id: "ZONE_PINTU_UTAMA",

        name: "Pintu Utama & Pos Pengawal",

        blockCode: "PINTU UTAMA",

        riskTier: 1,

        threatDescription: "Main gate ingress, biometric check-in & visitor registration.",

        coords: { x: 16, y: 88 },

      },

    ],

  },

  {

    id: "smk-seksyen-9",

    name: "SMK Seksyen 9 Shah Alam",

    code: "BEA8629",

    district: "Petaling Perdana",

    state: "Selangor",

    latitude: 3.0857,

    longitude: 101.5273,

    address: "Jalan Tengku Ampuan Rahimah 9/20, Seksyen 9, 40100 Shah Alam, Selangor Darul Ehsan",

    blueprintType: "JKR_STANDARD_SECONDARY",

    contactPerson: "Pn. Halimah (Kaunselor)",

    status: "ACTIVE",

    enrolledDate: "2026-02-10",

    zones: [

      {

        id: "ZONE_ADJOINING_SK9",

        name: "Pagar Sempadan Bersambung SK Seksyen 9",

        blockCode: "PINTU SK9",

        riskTier: 3,

        threatDescription: "Shared inter-school perimeter walkway between primary and secondary school.",

        coords: { x: 85, y: 55 },

      },

      {

        id: "ZONE_BLOK_C_L3",

        name: "Blok C Aras 3 (Tandas Belakang)",

        blockCode: "BLOK C",

        riskTier: 4,

        threatDescription: "Upper floor stairwell isolation & verbal/physical intimidation.",

        coords: { x: 52, y: 32 },

      },

      {

        id: "ZONE_KANTIN_SK9",

        name: "Kantin & Foyer Murid",

        blockCode: "KANTIN",

        riskTier: 1,

        threatDescription: "Recess gathering area & prefect monitoring post.",

        coords: { x: 42, y: 68 },

      },

      {
        id: "ZONE_PINTU_UTAMA_SK9",
        name: "Pintu Utama & Dataran Seksyen 9",
        blockCode: "PINTU UTAMA",
        riskTier: 1,
        threatDescription: "Dispersal flow and parent pickup zone.",
        coords: { x: 18, y: 88 },
      },
    ],
  },
  {
    id: "smk-kuching-high",
    name: "SMK Kuching High (Sarawak)",
    code: "YEB1201",
    district: "Kuching",
    state: "Sarawak",
    latitude: 1.5533,
    longitude: 110.3592,
    address: "Jalan Padungan, 93100 Kuching, Sarawak",
    blueprintType: "JKR_STANDARD_SECONDARY",
    contactPerson: "Cikgu Ting (PK HEM)",
    status: "ACTIVE",
    enrolledDate: "2026-03-01",
    zones: [
      {
        id: "PINTU_PAGAR_BELAKANG",
        name: "Pintu Pagar Belakang & Lorong Jalan Mathies",
        blockCode: "PAGAR BELAKANG",
        riskTier: 5,
        threatDescription: "Perimeter blind spot, congregation point & external youth confrontation.",
        coords: { x: 80, y: 82 },
      },
      {
        id: "ZONE_PINTU_UTAMA_KUCHING",
        name: "Pintu Masuk Utama Jalan Padungan",
        blockCode: "PAGAR UTAMA",
        riskTier: 3,
        threatDescription: "Main campus entrance and visitor foyer.",
        coords: { x: 50, y: 88 },
      },
      {
        id: "BLOK_B_AKADEMIK",
        name: "Blok B Bilik Darjah & Makmal Sains",
        blockCode: "BLOK B",
        riskTier: 2,
        threatDescription: "Secondary academic wing and science labs.",
        coords: { x: 60, y: 40 },
      },
      {
        id: "MEDAN_SELERA_KANTIN",
        name: "Kantin Murid & Dataran Utama",
        blockCode: "KANTIN",
        riskTier: 2,
        threatDescription: "Central student gathering zone during recess.",
        coords: { x: 35, y: 45 },
      },
    ],
  },
];

export const defaultThreatActors: ThreatActorPOI[] = [

  {

    id: "poi-danial",

    handle: "Danial 'Botak' (Form 5)",

    schoolId: "smk-seksyen-11",

    schoolName: "SMK Seksyen 11 Shah Alam",

    role: "INSTIGATOR",

    riskTier: 5,

    status: "ACTIVE_MONITORING",

    threatTags: ["Weapon Carrier", "Pau Duit", "Rear Gate"],

    knownAliases: ["Botak Danial", "Danial 5 Setia"],

    lastIncidentId: "incident-parang",

    notes: "Identified in weapon intimidation signal near the rear gate. Reported demanding protection money from junior dorm students.",

  },

  {

    id: "poi-haziq",

    handle: "Haziq_R (Form 4)",

    schoolId: "smk-meranti",

    schoolName: "SMK Meranti",

    role: "REPEAT_EXTORTIONIST",

    riskTier: 4,

    status: "INTERVENTION_PENDING",

    threatTags: ["Hostel Hazing", "Koyak", "Geng 36 Affiliate"],

    knownAliases: ["Haziq Meranti"],

    lastIncidentId: "incident-fight",

    notes: "Hostel conflict escalating to physical confrontation threats. Linked to inter-school motorcycle brawls.",

  },

  {

    id: "poi-azlan",

    handle: "Azlan_17 (Form 1)",

    schoolId: "smk-seksyen-11",

    schoolName: "SMK Seksyen 11 Shah Alam",

    role: "AT_RISK_TARGET",

    riskTier: 2,

    status: "ACTIVE_MONITORING",

    threatTags: ["Vulnerable Junior", "Cyberbullying Target", "Hostel Junior"],

    knownAliases: ["Azlan Form 1"],

    lastIncidentId: "incident-bullying",

    notes: "Targeted repeatedly by senior hostel cohort. Protected whistleblower status applied under Child Protection protocol.",

  },

];

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {

  const [elements, setElements] = useState<GraphElements>(initialGraphElements);

  const [incidents, setIncidents] = useState<ThreatItem[]>(mockIncidents);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("incident-parang");

  const [hitlRefreshCounter, setHitlRefreshCounter] = useState(0);

  const [latestVerdict, setLatestVerdict] = useState<{

    text: string;

    type: "passed" | "vetoed";

  } | null>(null);

  // RBAC & Multi-Tenancy State

  const [currentRole, setCurrentRoleState] = useState<OperatorRole>("SUPER_ADMIN");

  const [currentTenant, setCurrentTenantState] = useState<string>("smk-seksyen-11");

  // Institutional Directory & Threat Watchlist State

  const [campuses, setCampuses] = useState<CampusTenant[]>(defaultCampuses);

  const [threatActors, setThreatActors] = useState<ThreatActorPOI[]>(defaultThreatActors);

  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState<boolean>(false);

  const [directoryModalTab, setDirectoryModalTab] = useState<"CAMPUSES" | "THREAT_ACTORS">("CAMPUSES");

  // Shortest Path Link Investigation State

  const [traceRequest, setTraceRequest] = useState<{ sourceId: string; targetId: string } | null>(null);

  // Left-of-Bang Chronology & Temporal Scrubbing State

  const [timelineEpochIndex, setTimelineEpochIndex] = useState<number>(100); // 100 = Live (Now)

  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);

  const [timelinePlaybackSpeed, setTimelinePlaybackSpeed] = useState<number>(1);

  // Southbridge JIT Policy Threshold Preset

  const [activePolicyPreset, setActivePolicyPreset] = useState<PolicyThresholdPreset>("BALANCED");

  const activePolicyValues = useMemo(() => POLICY_PRESETS[activePolicyPreset], [activePolicyPreset]);

  // Automated Timeline Playback Loop

  useEffect(() => {

    if (!isTimelinePlaying) return;

    const intervalMs = Math.max(200, 1000 / timelinePlaybackSpeed);

    const timer = setInterval(() => {

      setTimelineEpochIndex((prev) => {

        if (prev >= 100) {

          setIsTimelinePlaying(false);

          return 100;

        }

        return Math.min(100, prev + 5);

      });

    }, intervalMs);

    return () => clearInterval(timer);

  }, [isTimelinePlaying, timelinePlaybackSpeed]);

  useEffect(() => {

    try {

      const savedRole = localStorage.getItem("sentiasa_operator_role") as OperatorRole;

      if (

        savedRole &&

        [

          "SUPER_ADMIN",

          "HEAD_COUNSELOR",

          "DISCIPLINE_MASTER",

          "CAMPUS_SECURITY",

          "STUDENT_REPORTER",

        ].includes(savedRole)

      ) {

        setCurrentRoleState(savedRole);

      }

      let savedTenant = localStorage.getItem("sentiasa_tenant_id");

      // Auto-migrate legacy partition 'smk-sentiasa' to official 'smk-seksyen-11'
      if (!savedTenant || savedTenant === "smk-sentiasa") {
        savedTenant = "smk-seksyen-11";
        localStorage.setItem("sentiasa_tenant_id", "smk-seksyen-11");
      }
      setCurrentTenantState(savedTenant);

      const savedCampuses = localStorage.getItem("sentiasa_campuses");

      if (savedCampuses) {

        try {
          const parsed = JSON.parse(savedCampuses);

          if (Array.isArray(parsed) && parsed.length > 0) {
            // Strip out stale legacy partitions and merge fresh zones from defaultCampuses
            const cleaned = parsed
              .filter((c: any) => c.id !== "smk-sentiasa")
              .map((c: any) => {
                const fresh = defaultCampuses.find((dc) => dc.id === c.id);
                return fresh ? { ...c, zones: fresh.zones || c.zones, latitude: fresh.latitude || c.latitude, longitude: fresh.longitude || c.longitude } : c;
              });

            // Ensure newly added defaultCampuses (e.g. smk-kuching-high) are always merged in
            for (const dc of defaultCampuses) {
              if (!cleaned.some((c: any) => c.id === dc.id)) {
                cleaned.push(dc);
              }
            }

            if (cleaned.length > 0) {
              setCampuses(cleaned);
              localStorage.setItem("sentiasa_campuses", JSON.stringify(cleaned));
            } else {
              setCampuses(defaultCampuses);
              localStorage.setItem("sentiasa_campuses", JSON.stringify(defaultCampuses));
            }
          }
        } catch {}

      }

      const savedActors = localStorage.getItem("sentiasa_threat_actors");

      if (savedActors) {

        const parsed = JSON.parse(savedActors);

        if (Array.isArray(parsed) && parsed.length > 0) {

          setThreatActors(parsed);

        }

      }

    } catch {

      // ignore

    }

  }, []);

  const setCurrentRole = useCallback((role: OperatorRole) => {

    setCurrentRoleState(role);

    try {

      localStorage.setItem("sentiasa_operator_role", role);

    } catch {

      // ignore

    }

  }, []);

  const setCurrentTenant = useCallback((tenant: string) => {

    setCurrentTenantState(tenant);

    try {

      localStorage.setItem("sentiasa_tenant_id", tenant);

    } catch {

      // ignore

    }

  }, []);

  const hasPermission = useCallback(

    (permission: Permission) => {

      return hasRolePermission(currentRole, permission);

    },

    [currentRole]

  );

  // Staging Access Gate State

  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {

    try {

      if (typeof window !== "undefined") {

        const val = sessionStorage.getItem(STAGING_STORAGE_KEY) || localStorage.getItem(STAGING_STORAGE_KEY);

        if (val === "true") {

          setIsUnlocked(true);

        }

        const userStr = sessionStorage.getItem("sentiasa_auth_user") || localStorage.getItem("sentiasa_auth_user");
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            if (parsed.role) {
              setCurrentRole(parsed.role);
            }
          } catch {}
        }

      }

    } catch {

      // sessionStorage unavailable

    } finally {

      setIsInitialized(true);

    }

  }, []);

  const handleLockConsole = useCallback(() => {

    try {

      if (typeof window !== "undefined") {

        sessionStorage.removeItem(STAGING_STORAGE_KEY);

        localStorage.removeItem(STAGING_STORAGE_KEY);

        sessionStorage.removeItem("sentiasa_auth_user");

        localStorage.removeItem("sentiasa_auth_user");

      }

    } catch {

      // Ignore

    }

    setIsUnlocked(false);

  }, []);

  const incrementHitlRefresh = useCallback(() => {

    setHitlRefreshCounter((c) => c + 1);

  }, []);

  // Periodic background synchronization with backend /api/incidents

  useEffect(() => {

    let isMounted = true;

    const syncWithBackend = async () => {

      try {

        const baseUrl = getApiBaseUrl();

        const res = await fetch(`${baseUrl}/api/incidents?limit=25`, {
          headers: { "X-Tenant-ID": "*" },
        });

        if (!res.ok) return;

        const data = await res.json();

        const serverIncidents = data.incidents || [];

        if (!isMounted || !Array.isArray(serverIncidents) || serverIncidents.length === 0) return;

        // Merge server incidents into local state

        setIncidents((prev) => {

          const localIds = new Set(prev.map((i) => i.id));

          const newItems: ThreatItem[] = [];

          for (const inc of serverIncidents) {

            const incId = inc.incident_id || inc.threat_event?.event_id;

            if (incId && !localIds.has(incId)) {

              const rawSummary =

                inc.threat_event?.context_summary ||

                inc.normalized_text ||

                inc.threat_event?.raw_text ||

                "CCTV edge motion burst captured.";

              const cleanedSummary = rawSummary

                .replace(/<think>[\s\S]*?<\/think>/gi, "")

                .replace(/<thought>[\s\S]*?<\/thought>/gi, "")

                .replace(/^(Here'?s\s+a\s+thinking\s+process|Thinking\s+Process|Reasoning\s+Process):[\s\S]*?(?=(\n\s*\n|\bSummary:|\bRisk:|\bConclusion:|$))/gi, "")

                .replace(/^(#+\s*|\*\*)?(Summary|Risk\s+Summary|Assessment):\s*(\*\*)?/i, "")

                .trim() || rawSummary;

              const rawCitations = (inc.osint_evidence && inc.osint_evidence.length > 0) ? inc.osint_evidence : (inc.external_citations || []);

              const formattedCitations = rawCitations.map((c: any) => {

                let itemObj = typeof c === "string" ? {
                  title: "",
                  url: c,
                  platform: c.includes("reddit") ? "reddit" : (c.includes("lowyat") ? "lowyat" : "web"),
                  highlights: [] as string[],
                } : { ...c };

                let rawUrl = itemObj.url || "";
                // Sanitize legacy pre-fix search queries or fabricated forum topic IDs
                if (rawUrl.includes("reddit.com") && (rawUrl.includes("18m6v9j") || rawUrl.includes("gang_threat") || rawUrl.includes("/search"))) {
                  rawUrl = "https://www.reddit.com/r/malaysiauni/";
                  itemObj.title = "r/malaysiauni - Campus Security & Anti-Violence Community Portal";
                } else if (rawUrl.includes("lowyat.net") && (rawUrl.includes("5421890") || rawUrl.includes("5489211") || rawUrl.includes("Kopitiam"))) {
                  rawUrl = "https://forum.lowyat.net/Education";
                  itemObj.title = "Lowyat.NET Education - Student Welfare & Campus Discussions";
                }

                if (!itemObj.title) {
                  try { itemObj.title = new URL(rawUrl).hostname; } catch { itemObj.title = "OSINT Exhibit"; }
                }
                itemObj.url = rawUrl;
                return itemObj;
              });

              const rawTime = inc.created_at || inc.timestamp || inc.source_timestamp;

              let formattedTimestamp = "";

              if (rawTime) {

                try {

                  const d = new Date(rawTime);

                  if (!isNaN(d.getTime())) {

                    formattedTimestamp = d.toLocaleTimeString("en-GB", {

                      hour: "2-digit",

                      minute: "2-digit",

                    }) + " MYT";

                  } else {

                    formattedTimestamp = String(rawTime);

                  }

                } catch {

                  formattedTimestamp = String(rawTime);

                }

              }

              if (!formattedTimestamp) {

                formattedTimestamp = new Date().toLocaleTimeString("en-GB", {

                  hour: "2-digit",

                  minute: "2-digit",

                }) + " MYT";

              }

              const evidenceModel =

                inc.ocr_metadata?.model_used ||

                inc.visual_evidence?.model_used ||

                inc.extended_archive?.model_used ||

                (Array.isArray(inc.evidence_nodes) && inc.evidence_nodes[0]?.model_used) ||

                inc.evidence_metadata?.model_used;

              const ocrEngine = inc.ocr_metadata?.ocr_engine || inc.evidence_metadata?.ocr_engine;

              const evidenceMediaType = inc.ocr_metadata ? "WHATSAPP_SCREENSHOT" : (inc.visual_evidence ? "CCTV_KEYFRAME" : undefined);

              newItems.push({

                id: incId,

                tenant_id: (() => {
                  const sName = (inc.school?.name || inc.school_name || "").toLowerCase();
                  if (inc.tenant_id && inc.tenant_id !== "smk-sentiasa") return inc.tenant_id;
                  if (sName.includes("kuching")) return "smk-kuching-high";
                  if (sName.includes("9")) return "smk-seksyen-9";
                  return "smk-seksyen-11";
                })(),

                matched_zone_id: inc.matched_zone_id || inc.threat_event?.matched_zone_id,

                matched_zone_name: inc.matched_zone_name || inc.threat_event?.matched_zone_name,

                spatial_coordinates: inc.spatial_coordinates || inc.threat_event?.spatial_coordinates,

                reporter_alias: inc.reporter_alias,

                osint_horizon_phase: inc.osint_horizon_phase,

                osint_custody_hash: inc.osint_custody_hash,

                severityTier: inc.severity_tier || inc.threat_event?.severity_tier || 3,

                timestamp: formattedTimestamp,

                schoolName: inc.school?.name || inc.school_name || (
                  (inc.tenant_id === "smk-kuching-high" || (inc.school_name || "").toLowerCase().includes("kuching"))
                    ? "SMK Kuching High (Sarawak)"
                    : (inc.tenant_id === "smk-seksyen-9" ? "SMK Seksyen 9 Shah Alam" : "SMK Seksyen 11 Shah Alam")
                ),

                contextSummary: cleanedSummary,

                slangTags: inc.slang_tokens || inc.threat_event?.extracted_slang_tokens || ["edge-cctv"],

                escalated: inc.escalation_required || false,

                ilmuCalibration: {

                  dNuance: 1.58,

                  slangFidelity: 1.0,

                  sovereignModel: "Sovereign-Engine",

                  verifiedDialect: "Verified_Campus_Dialect",

                },

                jevVerdict: {

                  passed: inc.jev_passed ?? true,

                  reason: inc.jev_evaluation?.veto_reason,

                  noulDangerScore:

                    inc.jev_evaluation?.semantic_danger_probability ??

                    inc.jev_evaluation?.semantic_confidence ??

                    ((inc.severity_tier || 3) * 0.2),

                },

                jev_telemetry: inc.jev_telemetry || {

                  imminent_violence: (inc.severity_tier || 3) >= 4 ? 0.88 : 0.35,

                  weapon_threat: (inc.severity_tier || 3) >= 5 ? 0.92 : 0.1,

                  extortion_coercion: 0.12,

                  victim_distress: 0.65,

                },

                externalCitations: formattedCitations,

                extendedArchive: inc.extended_archive,

                video_filename: inc.video_filename,

                video_clips: inc.video_clips || (inc.video_filename ? [inc.video_filename] : []),

                keyframe_timestamps: inc.keyframe_timestamps || (inc.visual_evidence?.keyframe_timestamps),

                attempt_history: inc.attempt_history,

                jit_decision_schema: inc.jit_decision_schema,

                prior_agreement: inc.prior_agreement,

                needs_doubt_review: inc.needs_doubt_review,

                budget_ledger: inc.budget_ledger,

                evidenceMetadata: evidenceModel

                  ? {

                      model_used: evidenceModel,

                      ocr_engine: ocrEngine,

                      media_type: evidenceMediaType,

                    }

                  : undefined,

              });

            } else if (incId && localIds.has(incId)) {

              // Update existing incident if fresh clips or archives arrived

              const existingItem = prev.find((p) => p.id === incId);

              if (existingItem) {

                if (inc.video_clips) existingItem.video_clips = inc.video_clips;

                if (inc.video_filename) existingItem.video_filename = inc.video_filename;

                if (inc.extended_archive) existingItem.extendedArchive = inc.extended_archive;

                if (inc.keyframe_timestamps) existingItem.keyframe_timestamps = inc.keyframe_timestamps;

              }

            }

          }

          return newItems.length > 0 ? [...newItems, ...prev] : prev;

        });

        // Merge cytoscape elements

        for (const inc of serverIncidents) {

          if (Array.isArray(inc.cytoscape_elements) && inc.cytoscape_elements.length > 0) {

            setElements((prev) => {

              const existingIds = new Set(prev.map((el) => el.data.id));
              const existingSchools = prev.filter((el) => el.data.type === "SchoolNode");

              const remappedElements: any[] = [];
              for (const el of inc.cytoscape_elements) {
                const d = { ...el.data };
                // Deduplicate SchoolNode by name
                if (d.type === "SchoolNode") {
                  const match = existingSchools.find(
                    (s) => s.data.name?.toLowerCase().trim() === d.name?.toLowerCase().trim()
                  );
                  if (match) continue; // Skip duplicate school diamond
                }
                // Exclude any CCTV camera erroneously typed as PersonaNode
                if (d.type === "PersonaNode" && (d.id?.toLowerCase().includes("cctv") || d.alias?.toLowerCase().includes("cctv"))) {
                  continue;
                }
                // Exclude stale redundant school pivot nodes and their edges
                if (d.id?.startsWith("pivot_smk_seksyen_11") || d.label?.toLowerCase() === "pivot: smk seksyen 11 shah alam") {
                  continue;
                }
                if (d.source?.startsWith("pivot_smk_seksyen_11") || d.target?.startsWith("pivot_smk_seksyen_11")) {
                  continue;
                }
                // Rewire edge pointing to old school ID if alias exists
                if (d.source && d.source.startsWith("school_smk_seksyen_11")) {
                  d.source = "school-smk-seksyen-11";
                }
                if (d.target && d.target.startsWith("school_smk_seksyen_11")) {
                  d.target = "school-smk-seksyen-11";
                }
                if (!existingIds.has(d.id)) {
                  remappedElements.push({ ...el, data: d });
                }
              }

              return remappedElements.length > 0 ? [...prev, ...remappedElements] : prev;

            });

          }

        }

      } catch {

        // Standby mode

      }

    };

    const handleVisibilityChange = () => {

      if (typeof document !== "undefined" && !document.hidden && isMounted) {

        syncWithBackend();

      }

    };

    if (typeof document !== "undefined") {

      document.addEventListener("visibilitychange", handleVisibilityChange);

    }

    const interval = setInterval(() => {

      if (typeof document !== "undefined" && document.hidden) return;

      syncWithBackend();

    }, 5000);

    return () => {

      isMounted = false;

      clearInterval(interval);

      if (typeof document !== "undefined") {

        document.removeEventListener("visibilitychange", handleVisibilityChange);

      }

    };

  }, []);

  const handleEscalate = useCallback((incident: ThreatItem) => {

    setSelectedNodeId(incident.id);

  }, []);

  // Real-time Cytoscape Graph & Incident Feed Update when Triage Passes

  const handleTriageSuccess = useCallback((result: TriageResponse) => {
    if (result.school && result.school.name) {
      const sId = (result.school.school_id || result.school.name).toLowerCase().replace(/^school-/, "").replace(/[^a-z0-9]+/g, "-");
      const existingDefault = defaultCampuses.find((dc) => dc.id === sId || sId.includes(dc.id) || dc.id.includes(sId));
      if (!existingDefault) {
        addCampus({
          id: sId,
          name: result.school.name,
          code: (result.school as any).code || "SCH-" + Math.floor(1000 + Math.random() * 9000),
          district: result.school.district || "District",
          state: (result.school as any).state || "State",
          status: "ACTIVE",
          blueprintType: "JKR_STANDARD_SECONDARY",
          zones: [],
        });
      }
    }

    if (result.cytoscape_elements && result.cytoscape_elements.length > 0) {

      setElements((prev) => {

        const existingIds = new Set(prev.map((el) => el.data.id));

        const newElements = result.cytoscape_elements!.filter(

          (el) => !existingIds.has(el.data.id)

        );

        return [...prev, ...newElements];

      });

    }

    if (result.threat_event) {
      const sNameRaw = result.school?.name || (currentTenant === "smk-kuching-high" ? "SMK Kuching High (Sarawak)" : currentTenant === "smk-seksyen-9" ? "SMK Seksyen 9 Shah Alam" : "SMK Seksyen 11 Shah Alam");
      const resolvedTid = (result as any).tenant_id || (sNameRaw.toLowerCase().includes("kuching") ? "smk-kuching-high" : sNameRaw.toLowerCase().includes("9") ? "smk-seksyen-9" : "smk-seksyen-11");

      const newThreatItem: ThreatItem = {

        id: result.threat_event.event_id,

        tenant_id: resolvedTid,

        matched_zone_id: (result.threat_event as any).matched_zone_id || (result as any).matched_zone_id,

        matched_zone_name: (result.threat_event as any).matched_zone_name || (result as any).matched_zone_name,

        spatial_coordinates: (result.threat_event as any).spatial_coordinates || (result as any).spatial_coordinates,

        severityTier: result.threat_event.severity_tier || result.severity_tier || 3,

        timestamp:

          new Date().toLocaleTimeString("en-GB", {

            hour: "2-digit",

            minute: "2-digit",

          }) + " MYT",

        schoolName: sNameRaw,

        contextSummary:

          result.threat_event.context_summary ||

          result.normalized_text ||

          "Validated campus incident.",

        slangTags:

          result.threat_event.extracted_slang_tokens ||

          result.extracted_slang_tokens ||

          [],

        escalated: result.escalation_required,

        ilmuCalibration: {

          dNuance: 1.58,

          slangFidelity: 1.0,

          sovereignModel: "ilmu-nemo-nano",

          verifiedDialect: "Verified_Campus_Dialect",

        },

        jevVerdict: {

          passed: result.jev_passed,

          reason: result.jev_evaluation?.veto_reason,

          noulDangerScore:

            result.jev_evaluation?.semantic_danger_probability ??

            result.jev_evaluation?.semantic_confidence ??

            ((result.severity_tier || 3) * 0.2),

        },

        jev_telemetry: result.jev_telemetry || {

          imminent_violence: (result.severity_tier || 3) >= 4 ? 0.88 : 0.35,

          weapon_threat: (result.severity_tier || 3) >= 5 ? 0.92 : 0.1,

          extortion_coercion: 0.12,

          victim_distress: 0.65,

        },

        video_filename: (result as any).video_filename,
        externalCitations: Array.isArray((result as any).osint_evidence) && (result as any).osint_evidence.length > 0
          ? (result as any).osint_evidence
          : Array.isArray(result.external_citations) && result.external_citations.length > 0
          ? result.external_citations.map((c: any) =>
              typeof c === "string"
                ? {
                    title: "OSINT Corroboration Signal",
                    url: c,
                    platform: c.includes("osint-target") ? "suara_pelajar_target" : c.includes("reddit") ? "reddit" : "web",
                    engine: c.includes("osint-target") ? "suara_pelajar_direct" : "tavily",
                  }
                : c
            )
          : [],
        pivoted_nodes: (result as any).pivoted_nodes || [],
        osint_custody_hash: (result as any).osint_custody_hash,
        osint_horizon_phase: (result as any).osint_horizon_phase || "LEFT_OF_BANG_PRECURSOR",
        osint_ai_synthesis: (result as any).osint_ai_synthesis,
        codon_receipts: (result as any).codon_receipts || result.attempt_history || [],
        attempt_history: result.attempt_history,
        jit_decision_schema: result.jit_decision_schema,
        prior_agreement: result.prior_agreement,
        needs_doubt_review: result.needs_doubt_review,
        budget_ledger: (result as any).budget_ledger,

      };

      setIncidents((prev) => [newThreatItem, ...prev]);

      setSelectedNodeId(result.threat_event.event_id);

    }

    setLatestVerdict({

      text: `Sentinel Guard Enforced: Incident escalated & synchronized to Cytoscape canvas (Tier ${result.severity_tier}).`,

      type: "passed",

    });

  }, []);

  // When Triage is Vetoed by Sentinel Guard Gatekeeper

  const handleTriageVetoed = useCallback((result: TriageResponse) => {
    setHitlRefreshCounter((c) => c + 1);
    if (result.school && result.school.name) {
      const sId = (result.school.school_id || result.school.name).toLowerCase().replace(/^school-/, "").replace(/[^a-z0-9]+/g, "-");
      const existingDefault = defaultCampuses.find((dc) => dc.id === sId || sId.includes(dc.id) || dc.id.includes(sId));
      if (!existingDefault) {
        addCampus({
          id: sId,
          name: result.school.name,
          code: (result.school as any).code || "SCH-" + Math.floor(1000 + Math.random() * 9000),
          district: result.school.district || "District",
          state: (result.school as any).state || "State",
          status: "ACTIVE",
          blueprintType: "JKR_STANDARD_SECONDARY",
          zones: [],
        });
      }
    }

    if (result.cytoscape_elements && result.cytoscape_elements.length > 0) {
      setElements((prev) => {
        const existingIds = new Set(prev.map((el) => el.data.id));
        const existingSchools = prev.filter((el) => el.data.type === "SchoolNode");
        const remappedElements: any[] = [];
        for (const el of result.cytoscape_elements!) {
          const d = { ...el.data };
          if (d.type === "SchoolNode") {
            const match = existingSchools.find(
              (s) => s.data.name?.toLowerCase().trim() === d.name?.toLowerCase().trim()
            );
            if (match) continue;
          }
          if (d.type === "PersonaNode" && (d.id?.toLowerCase().includes("cctv") || d.alias?.toLowerCase().includes("cctv"))) {
            continue;
          }
          if (d.id?.startsWith("pivot_smk_seksyen_11") || d.label?.toLowerCase() === "pivot: smk seksyen 11 shah alam") {
            continue;
          }
          if (d.source?.startsWith("pivot_smk_seksyen_11") || d.target?.startsWith("pivot_smk_seksyen_11")) {
            continue;
          }
          if (d.source && d.source.startsWith("school_smk_seksyen_11")) d.source = "school-smk-seksyen-11";
          if (d.target && d.target.startsWith("school_smk_seksyen_11")) d.target = "school-smk-seksyen-11";
          if (d.source && d.source.startsWith("school_smk_seksyen_9")) d.source = "school-smk-seksyen-9";
          if (d.target && d.target.startsWith("school_smk_seksyen_9")) d.target = "school-smk-seksyen-9";
          if (!existingIds.has(d.id)) {
            remappedElements.push({ ...el, data: d });
          }
        }
        return remappedElements.length > 0 ? [...prev, ...remappedElements] : prev;
      });
    }

    if (result.threat_event) {
      const sNameRaw = result.school?.name || (currentTenant === "smk-kuching-high" ? "SMK Kuching High (Sarawak)" : currentTenant === "smk-seksyen-9" ? "SMK Seksyen 9 Shah Alam" : "SMK Seksyen 11 Shah Alam");
      const resolvedTid = (result as any).tenant_id || (sNameRaw.toLowerCase().includes("kuching") ? "smk-kuching-high" : sNameRaw.toLowerCase().includes("9") ? "smk-seksyen-9" : "smk-seksyen-11");

      const newThreatItem: ThreatItem = {
        id: result.threat_event.event_id,
        tenant_id: resolvedTid,
        matched_zone_id: (result.threat_event as any).matched_zone_id || (result as any).matched_zone_id,
        matched_zone_name: (result.threat_event as any).matched_zone_name || (result as any).matched_zone_name,
        spatial_coordinates: (result.threat_event as any).spatial_coordinates || (result as any).spatial_coordinates,
        severityTier: result.threat_event.severity_tier || result.severity_tier || 4,
        timestamp:
          new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }) + " MYT",
        schoolName: sNameRaw,
        contextSummary:
          result.threat_event.context_summary ||
          result.normalized_text ||
          "Quarantined incident under human counselor review.",
        slangTags:
          result.threat_event.extracted_slang_tokens ||
          result.extracted_slang_tokens ||
          [],
        escalated: false,
        ilmuCalibration: {
          dNuance: 1.58,
          slangFidelity: 1.0,
          sovereignModel: "ilmu-nemo-nano",
          verifiedDialect: "Verified_Campus_Dialect",
        },
        jevVerdict: {
          passed: false,
          reason: result.jev_evaluation?.veto_reason,
          noulDangerScore:
            result.jev_evaluation?.semantic_danger_probability ??
            result.jev_evaluation?.semantic_confidence ??
            ((result.severity_tier || 4) * 0.2),
        },
        jev_telemetry: result.jev_telemetry || {
          imminent_violence: (result.severity_tier || 4) >= 4 ? 0.88 : 0.35,
          weapon_threat: (result.severity_tier || 4) >= 5 ? 0.92 : 0.1,
          extortion_coercion: 0.12,
          victim_distress: 0.65,
        },
        video_filename: (result as any).video_filename,
        externalCitations: Array.isArray((result as any).osint_evidence) && (result as any).osint_evidence.length > 0
          ? (result as any).osint_evidence
          : Array.isArray(result.external_citations) && result.external_citations.length > 0
          ? result.external_citations.map((c: any) =>
              typeof c === "string"
                ? {
                    title: "OSINT Corroboration Signal",
                    url: c,
                    platform: c.includes("osint-target") ? "suara_pelajar_target" : c.includes("reddit") ? "reddit" : "web",
                    engine: c.includes("osint-target") ? "suara_pelajar_direct" : "tavily",
                  }
                : c
            )
          : [],
        pivoted_nodes: (result as any).pivoted_nodes || [],
        osint_custody_hash: (result as any).osint_custody_hash,
        osint_horizon_phase: (result as any).osint_horizon_phase || "LEFT_OF_BANG_PRECURSOR",
        osint_ai_synthesis: (result as any).osint_ai_synthesis,
        codon_receipts: (result as any).codon_receipts || result.attempt_history || [],
        attempt_history: result.attempt_history,
        jit_decision_schema: result.jit_decision_schema,
        prior_agreement: result.prior_agreement,
        needs_doubt_review: result.needs_doubt_review,
        budget_ledger: (result as any).budget_ledger,
      };

      setIncidents((prev) => [newThreatItem, ...prev.filter((p) => p.id !== newThreatItem.id)]);
      setSelectedNodeId(result.threat_event.event_id);
    }

    setLatestVerdict({

      text: `Sentinel Guard Intercepted: ${

        result.jev_evaluation?.veto_reason || "Invariant violation detected"

      }. Enqueued to HITL review queue.`,

      type: "vetoed",

    });

  }, []);

  // When counselor resolves an incident in HITL queue

  const handleHitlResolved = useCallback(

    (queueId: string, decision: "APPROVE_ESCALATION" | "DISMISS") => {

      setLatestVerdict({

        text: `HITL Incident ${queueId} ${

          decision === "APPROVE_ESCALATION" ? "approved for escalation" : "dismissed"

        }.`,

        type: "passed",

      });

    },

    []

  );

  const addCampus = useCallback((newCampusData: Omit<CampusTenant, "id"> & { id?: string }) => {

    const slug = newCampusData.id || newCampusData.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const campus: CampusTenant = {

      ...newCampusData,

      id: slug,

      enrolledDate: newCampusData.enrolledDate || new Date().toISOString().split("T")[0],

      status: newCampusData.status || "ACTIVE",

    };

    setCampuses((prev) => {
      const existing = prev.find((c) => c.id === slug);
      const defaultMatch = defaultCampuses.find((dc) => dc.id === slug || slug.includes(dc.id) || dc.id.includes(slug));
      const preservedZones =
        (campus.zones && campus.zones.length > 0)
          ? campus.zones
          : (existing?.zones && existing.zones.length > 0)
          ? existing.zones
          : (defaultMatch?.zones || []);
      const mergedCampus: CampusTenant = {
        ...(defaultMatch || {}),
        ...(existing || {}),
        ...campus,
        id: defaultMatch?.id || slug,
        zones: preservedZones,
        latitude: campus.latitude ?? existing?.latitude ?? defaultMatch?.latitude,
        longitude: campus.longitude ?? existing?.longitude ?? defaultMatch?.longitude,
        address: campus.address ?? existing?.address ?? defaultMatch?.address,
      };
      const updated = [...prev.filter((c) => c.id !== mergedCampus.id), mergedCampus];

      try {

        localStorage.setItem("sentiasa_campuses", JSON.stringify(updated));

      } catch {}

      return updated;

    });

    // Add SchoolNode to graph elements if not present

    setElements((prev) => {

      const schoolNodeId = `school-${slug}`;

      if (prev.some((el) => el.data.id === schoolNodeId)) return prev;

      return [

        ...prev,

        {

          data: {

            id: schoolNodeId,

            type: "SchoolNode",

            name: campus.name,

            district: campus.district,

          },

        },

      ];

    });

    return campus;

  }, []);

  const updateCampus = useCallback((id: string, updates: Partial<CampusTenant>) => {

    setCampuses((prev) => {

      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));

      try {

        localStorage.setItem("sentiasa_campuses", JSON.stringify(updated));

      } catch {}

      return updated;

    });

  }, []);

  const deleteCampus = useCallback((id: string) => {

    setCampuses((prev) => {

      const updated = prev.filter((c) => c.id !== id);

      try {

        localStorage.setItem("sentiasa_campuses", JSON.stringify(updated));

      } catch {}

      return updated;

    });

    setElements((prev) => prev.filter((el) => el.data.id !== `school-${id}` && el.data.target !== `school-${id}`));

  }, []);

  const addThreatActor = useCallback((newActorData: Omit<ThreatActorPOI, "id"> & { id?: string }) => {

    const id = newActorData.id || `poi-${Date.now().toString(36)}`;

    const actor: ThreatActorPOI = {

      ...newActorData,

      id,

    };

    setThreatActors((prev) => {

      const updated = [...prev.filter((a) => a.id !== id), actor];

      try {

        localStorage.setItem("sentiasa_threat_actors", JSON.stringify(updated));

      } catch {}

      return updated;

    });

    // Add PersonaNode to graph elements

    setElements((prev) => {

      const personaNodeId = `persona-${id}`;

      const schoolNodeId = `school-${actor.schoolId}`;

      const newNodes: GraphElements = [

        {

          data: {

            id: personaNodeId,

            type: "PersonaNode",

            alias: actor.handle,

            school_name: actor.schoolName,

            role_risk_tier: actor.role,

          },

        },

        {

          data: {

            id: `edge-${personaNodeId}-${schoolNodeId}`,

            source: personaNodeId,

            target: schoolNodeId,

            type: "EvidenceEdge",

            label: "ENROLLED_AT",

          },

        },

      ];

      const existingIds = new Set(prev.map((el) => el.data.id));

      const filteredNew = newNodes.filter((el) => !existingIds.has(el.data.id));

      return [...prev, ...filteredNew];

    });

    return actor;

  }, []);

  const updateThreatActor = useCallback((id: string, updates: Partial<ThreatActorPOI>) => {

    setThreatActors((prev) => {

      const updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));

      try {

        localStorage.setItem("sentiasa_threat_actors", JSON.stringify(updated));

      } catch {}

      return updated;

    });

  }, []);

  const deleteThreatActor = useCallback((id: string) => {

    setThreatActors((prev) => {

      const updated = prev.filter((a) => a.id !== id);

      try {

        localStorage.setItem("sentiasa_threat_actors", JSON.stringify(updated));

      } catch {}

      return updated;

    });

    const personaNodeId = `persona-${id}`;

    setElements((prev) => prev.filter((el) => el.data.id !== personaNodeId && el.data.source !== personaNodeId && el.data.target !== personaNodeId));

  }, []);

  const value = useMemo(

    () => ({

      elements,

      setElements,

      incidents,

      setIncidents,

      selectedNodeId,

      setSelectedNodeId,

      handleTriageSuccess,

      handleTriageVetoed,

      handleEscalate,

      hitlRefreshCounter,

      incrementHitlRefresh,

      isUnlocked,

      setIsUnlocked,

      isInitialized,

      handleLockConsole,

      latestVerdict,

      setLatestVerdict,

      handleHitlResolved,

      currentRole,

      setCurrentRole,

      currentTenant,

      setCurrentTenant,

      hasPermission,

      campuses,

      addCampus,

      updateCampus,

      deleteCampus,

      threatActors,

      addThreatActor,

      updateThreatActor,

      deleteThreatActor,

      isDirectoryModalOpen,

      setIsDirectoryModalOpen,

      directoryModalTab,

      setDirectoryModalTab,

      traceRequest,

      setTraceRequest,

      timelineEpochIndex,

      setTimelineEpochIndex,

      isTimelinePlaying,

      setIsTimelinePlaying,

      timelinePlaybackSpeed,

      setTimelinePlaybackSpeed,

      activePolicyPreset,

      setActivePolicyPreset,

      activePolicyValues,

    }),

    [

      elements,

      incidents,

      selectedNodeId,

      hitlRefreshCounter,

      isUnlocked,

      isInitialized,

      latestVerdict,

      handleTriageSuccess,

      handleTriageVetoed,

      handleEscalate,

      incrementHitlRefresh,

      handleLockConsole,

      handleHitlResolved,

      currentRole,

      setCurrentRole,

      currentTenant,

      setCurrentTenant,

      hasPermission,

      campuses,

      addCampus,

      updateCampus,

      deleteCampus,

      threatActors,

      addThreatActor,

      updateThreatActor,

      deleteThreatActor,

      isDirectoryModalOpen,

      setIsDirectoryModalOpen,

      directoryModalTab,

      setDirectoryModalTab,

      traceRequest,

      setTraceRequest,

      timelineEpochIndex,

      isTimelinePlaying,

      timelinePlaybackSpeed,

      activePolicyPreset,

      activePolicyValues,

    ]

  );

  return (

    <DashboardContext.Provider value={value}>

      {children}

    </DashboardContext.Provider>

  );

}

export function useDashboard(): DashboardContextValue {

  const context = useContext(DashboardContext);

  if (!context) {

    throw new Error("useDashboard must be used within a DashboardProvider");

  }

  return context;

}

