"use client";

import Link from "next/link";

import React, { useState, useMemo, useCallback, useEffect } from "react";

import {

  Network,

  Bot,

  Sparkles,

  ShieldAlert,

  Radio,

  Send,

  Filter,

  CheckCircle2,

  AlertTriangle,

  Flame,

  Search,

  BookOpen,

  Info,

  Maximize2,
  Minimize2,

  Crosshair,

  FileText,

  Receipt,

  ChevronRight,

  ChevronDown,

  X,

  ExternalLink,

  ShieldCheck,

  Terminal,

  Clock,

  Layers,

  Download,

  Eye,

  UploadCloud,

  Video,

  Play,

  FileImage,
  Smartphone,

  Sliders,

  Plus,

  Check,

  Loader2,

  Zap,

  Activity,

  Globe,

  Lock,

  AlertOctagon,

  Scale,

  Building2,
  MapPin,
  RefreshCw,
} from "lucide-react";

import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";

import { CopilotChat } from "@copilotkit/react-ui";

import GraphCanvas from "../../components/GraphCanvas";

import TacticalHeatmapView from "../../components/TacticalHeatmapView";

import HitlQueueSection from "../../components/HitlQueueSection";

import EvidenceDossierModal from "../../components/EvidenceDossierModal";

import PipelineReceiptsDrawer from "../../components/PipelineReceiptsDrawer";

import ForensicMotionPlayer from "../../components/ForensicMotionPlayer";

import OSINTSettingsDrawer from "../../components/OSINTSettingsDrawer";

import PolemicSettingsDrawer from "../../components/PolemicSettingsDrawer";

import StudentIntakePortal from "../../components/StudentIntakePortal";

import LeftOfBangTimelineBar, { TIMELINE_WAYPOINTS } from "../../components/LeftOfBangTimelineBar";

import { useDashboard } from "../../context/DashboardContext";

import {

  triageIncident,

  resolveHitlIncident,

  uploadScreenshotAndTriage,

  uploadVideoAndTriage,

  fetchSlangGlossary,

  addSlangToken,

  dispatchCriticalAlert,

  getApiBaseUrl,

} from "../../lib/api-client";

import type { ThreatItem } from "../../components/TriageFeed";

// Sovereign regional slang dictionary for tactical explainer

const MALAYSIAN_SLANG_KNOWLEDGE: Record<string, { meaning: string; severityRisk: string; dialect: string }> = {

  parang: {

    meaning: "Machete / lethal bladed weapon commonly referenced in gang confrontations.",

    severityRisk: "CRITICAL (Tier 5) - Automatic Sentinel Guard Veto if unauthorized dispatch.",

    dialect: "Pan-Malaysian / Bahasa Melayu Pasar",

  },

  tapau: {

    meaning: "Dual-meaning polysemy: (1) Benign: takeaway food; (2) Violent slang: beat up, assault, eliminate opponent.",

    severityRisk: "CONTEXT-DEPENDENT - Disambiguated by Sentinel-1 Neural Engine & Sentinel Guard.",

    dialect: "Klang Valley Manglish / Cantonese Loanword",

  },

  "jumpa belakang": {

    meaning: "Meet behind the school premises for an unmonitored physical fight or retaliation.",

    severityRisk: "HIGH (Tier 4) - Immediate counselor intervention advised.",

    dialect: "National School Slang",

  },

  koyak: {

    meaning: "Severe emotional breakdown, mental distress, or losing composure under harassment.",

    severityRisk: "ELEVATED (Tier 2-3) - Precursor indicator to retaliation or self-harm.",

    dialect: "Northern / Kedahan Malay",

  },

  "settle luar": {

    meaning: "Threat to settle a dispute violently outside campus gates after dismissal.",

    severityRisk: "HIGH (Tier 4) - Threat of mob confrontation.",

    dialect: "Klang Valley / Selangor",

  },

  kena_pau: {

    meaning: "Subjected to extortion or protection money rackets by senior students.",

    severityRisk: "MEDIUM-HIGH (Tier 3) - Systematic extortion.",

    dialect: "National Student Vernacular",

  },

};

export default function CopilotPage() {

  const {

    elements,

    incidents,

    selectedNodeId,

    setSelectedNodeId,

    handleTriageSuccess,

    handleTriageVetoed,

    latestVerdict,

    setLatestVerdict,

    handleHitlResolved,

    hitlRefreshCounter,

    currentRole,

    currentTenant,

    setCurrentTenant,

    hasPermission,

    threatActors,

    setIsDirectoryModalOpen,

    setDirectoryModalTab,

    setTraceRequest,

    timelineEpochIndex,

    setTimelineEpochIndex,

    isTimelinePlaying,

    setIsTimelinePlaying,

  } = useDashboard();

  const [canvasViewMode, setCanvasViewMode] = useState<"GRAPH" | "HEATMAP">("GRAPH");

  const [filterMinSeverity, setFilterMinSeverity] = useState<number>(1);

  const [isTriageRunning, setIsTriageRunning] = useState<boolean>(false);

  const [quickInputText, setQuickInputText] = useState<string>("");

  const [focusTrigger, setFocusTrigger] = useState<number>(0);

  // OSINT Intelligence Settings Drawer State

  const [isOSINTDrawerOpen, setIsOSINTDrawerOpen] = useState<boolean>(false);

  const [isPolemicDrawerOpen, setIsPolemicDrawerOpen] = useState<boolean>(false);

  const [isDispatchingCritical, setIsDispatchingCritical] = useState<boolean>(false);

  const [isDispatchConfirmOpen, setIsDispatchConfirmOpen] = useState<boolean>(false);

  // Counselor HITL Governance Queue Drawer State

  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);

  const [hitlSelectedIncidentId, setHitlSelectedIncidentId] = useState<string | null>(null);

  const [hitlMinSeverity, setHitlMinSeverity] = useState<number>(1);

  const [hitlGraphScope, setHitlGraphScope] = useState<"ISOLATED" | "CAMPUS">("ISOLATED");

  const [isReceiptsDrawerOpen, setIsReceiptsDrawerOpen] = useState<boolean>(false);

  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);

  // Poll live HITL review queue ticket count

  useEffect(() => {

    let active = true;

    const fetchQueueCount = async () => {

      try {

        const res = await fetch(`${getApiBaseUrl()}/api/hitl/queue`, {

          headers: { "X-Tenant-ID": currentTenant || "smk-sentiasa" },

        });

        if (res.ok) {

          const data = await res.json();

          if (active && Array.isArray(data.queue)) {

            setPendingHitlCount(data.queue.length);

          }

        }

      } catch {

        // quiet fetch

      }

    };

    fetchQueueCount();

    const interval = setInterval(fetchQueueCount, 4000);

    return () => {

      active = false;

      clearInterval(interval);

    };

  }, [hitlRefreshCounter]);

  // Teltonika RMS-Style Progressive Disclosure Modal State

  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<ThreatItem | null>(null);

  const [selectedEvidenceNode, setSelectedEvidenceNode] = useState<{

    filename?: string;

    timestamp_sec?: number;

    sha256?: string;

    label?: string;

  } | null>(null);

  // Centralized Node Selection: Dispatches reticle lock, focus trigger, and selects either ThreatItem or Evidence/Topology Dossier

  const resolveIncidentFromNode = useCallback(
    (nodeId: string): ThreatItem | undefined => {
      // 1. Direct match
      const direct = incidents.find((i) => i.id === nodeId);
      if (direct) return direct;

      // 2. Connected edge in Cytoscape elements
      const edge = elements?.find(
        (el) => el.data && (el.data.source === nodeId || el.data.target === nodeId)
      );
      if (edge) {
        const peerId = edge.data.source === nodeId ? edge.data.target : edge.data.source;
        const peer = incidents.find((i) => i.id === peerId);
        if (peer) return peer;
      }

      // 3. Elements metadata lookup (evidence or persona linking)
      const clickedEl = elements?.find((el) => el.data?.id === nodeId);
      if (clickedEl?.data) {
        const d = clickedEl.data;
        if (d.incident_id) {
          const inc = incidents.find((i) => i.id === d.incident_id);
          if (inc) return inc;
        }
        if (d.target) {
          const inc = incidents.find((i) => i.id === d.target);
          if (inc) return inc;
        }
        if (d.source) {
          const inc = incidents.find((i) => i.id === d.source);
          if (inc) return inc;
        }
        if (d.video_filename || d.video || d.filename) {
          const fn = d.video_filename || d.video || d.filename;
          const inc = incidents.find((i) => i.video_filename === fn || (i.video_clips && i.video_clips.includes(fn)));
          if (inc) return inc;
        }
      }

      // 4. Substring or prefix match
      return incidents.find((i) => i.id.includes(nodeId) || nodeId.includes(i.id));
    },
    [incidents, elements]
  );

  const handleOpenDossierForNode = useCallback(
    (nodeId: string) => {
      const direct = resolveIncidentFromNode(nodeId);
      if (direct) {
        setSelectedIncidentForModal(direct);
        return;
      }
      const clickedEl = elements?.find((el) => el.data?.id === nodeId);
      if (clickedEl && clickedEl.data) {
        const d = clickedEl.data;
        const resolvedSchool =
          d.school ||
          d.school_name ||
          (d.type === "SchoolNode" ? d.name : null) ||
          (d.id?.includes("kuching") || currentTenant === "smk-kuching-high"
            ? "SMK Kuching High (Sarawak)"
            : currentTenant === "smk-seksyen-9"
            ? "SMK Seksyen 9 Shah Alam"
            : "SMK Seksyen 11 Shah Alam");
        setSelectedIncidentForModal({
          id: d.id || nodeId,
          severityTier: Number(d.visual_severity || d.severity_tier) || 2,
          timestamp: d.timestamp_sec != null ? `T+${Number(d.timestamp_sec).toFixed(1)}s` : "Visual Exhibit",
          schoolName: resolvedSchool,
          contextSummary: `Entity Exhibit [${d.label || d.type || "Graph Entity"}]. Details: ${d.threatLabel || d.alias || d.name || nodeId}.`,
          slangTags: Array.isArray(d.threat_markers) ? d.threat_markers : ["graph_entity"],
          video_filename: d.video_filename || d.filename,
          video_clips: d.video_filename ? [d.video_filename] : [],
          extendedArchive: {
            sha256: d.sha256 || "9b3c4f7a1e2d8b5c9a0f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b",
            uploaded_at: new Date().toISOString(),
            filename: d.video_filename || d.filename,
          },
        });
      }
    },
    [resolveIncidentFromNode, elements]
  );

  const hitlFilteredElements = useMemo(() => {
    if (!elements) return [];

    let targetSchoolId: string | null = null;
    let targetSchoolName: string | null = null;

    if (currentTenant && currentTenant !== "*") {
      if (currentTenant === "smk-seksyen-11" || currentTenant === "smk-sentiasa") {
        targetSchoolId = "school-smk-seksyen-11";
        targetSchoolName = "SMK Seksyen 11";
      } else if (currentTenant === "smk-seksyen-9") {
        targetSchoolId = "school-smk-seksyen-9";
        targetSchoolName = "SMK Seksyen 9";
      } else if (currentTenant === "smk-kuching-high") {
        targetSchoolId = "school-smk-kuching-high";
        targetSchoolName = "SMK Kuching High";
      } else {
        targetSchoolId = currentTenant.startsWith("school-") ? currentTenant : `school-${currentTenant}`;
      }
    } else if (hitlSelectedIncidentId) {
      const ticketIncident = incidents.find((i) => i.id === hitlSelectedIncidentId);
      if (ticketIncident?.schoolName) {
        targetSchoolName = ticketIncident.schoolName;
      }
    }

    // Full Campus Scope: Scoped strictly to the active school's campus (excluding other schools)
    if (hitlGraphScope === "CAMPUS") {
      if (!targetSchoolId && !targetSchoolName) {
        return elements;
      }
      const externalSchoolNodes = elements.filter(
        (el) =>
          el.data?.type === "SchoolNode" &&
          el.data?.id !== targetSchoolId &&
          !el.data?.name?.includes(targetSchoolName || "")
      );
      const externalSchoolIds = new Set(externalSchoolNodes.map((el) => el.data.id));

      if (externalSchoolIds.size === 0) return elements;

      const externalPersonaIds = new Set<string>();
      elements.forEach((el) => {
        if (el.data?.type === "PersonaNode") {
          const schoolAttr = el.data.school_name || el.data.school;
          if (schoolAttr && targetSchoolName && !schoolAttr.includes(targetSchoolName)) {
            externalPersonaIds.add(el.data.id);
          }
        }
      });

      return elements.filter((el) => {
        if (el.data?.id && (externalSchoolIds.has(el.data.id) || externalPersonaIds.has(el.data.id))) {
          return false;
        }
        if (
          el.data?.source &&
          el.data?.target &&
          (externalSchoolIds.has(el.data.source) ||
            externalSchoolIds.has(el.data.target) ||
            externalPersonaIds.has(el.data.source) ||
            externalPersonaIds.has(el.data.target))
        ) {
          return false;
        }
        return true;
      });
    }

    // Target Subgraph Scope: Strict 1-hop incident isolation
    let targetId = hitlSelectedIncidentId;
    if (!targetId) {
      // In HITL drawer, if no ticket is selected, do not display a random threat from another school
      return [];
    }

    const neighborIds = new Set<string>();
    elements.forEach((el) => {
      if (!el.data || el.data.source) return;
      const id = el.data.id;
      if (
        id === targetId ||
        (id && targetId.includes(id)) ||
        (targetId && id.includes(targetId)) ||
        el.data.event_id === targetId ||
        el.data.incident_id === targetId
      ) {
        neighborIds.add(id);
      }
    });

    if (neighborIds.size === 0) {
      const fallback = elements.find((el) => el.data?.type === "ThreatEventNode");
      if (fallback?.data?.id) neighborIds.add(fallback.data.id);
    }

    const connectedEdges = elements.filter(
      (el) =>
        el.data &&
        el.data.source &&
        el.data.target &&
        (neighborIds.has(el.data.source) || neighborIds.has(el.data.target))
    );
    connectedEdges.forEach((e) => {
      if (e.data.source) neighborIds.add(e.data.source);
      if (e.data.target) neighborIds.add(e.data.target);
    });

    const result = elements.filter((el) => {
      if (el.data?.id && neighborIds.has(el.data.id)) return true;
      if (el.data?.source && el.data?.target) {
        return neighborIds.has(el.data.source) && neighborIds.has(el.data.target);
      }
      return false;
    });

    return result.length > 0 ? result : elements;
  }, [elements, hitlGraphScope, hitlSelectedIncidentId, incidents, currentTenant]);

  const handleGraphNodeSelect = useCallback(

    (nodeId: string) => {

      setSelectedNodeId(nodeId);

      setFocusTrigger((f) => f + 1);

      const clickedEl = elements?.find((el) => el.data?.id === nodeId);

      const nodeType = clickedEl?.data?.type;

      // Find peer incident connected by an edge (for contextual inheritance)

      let peerMatch: ThreatItem | null = null;

      if (elements) {

        const connectedEdge = elements.find(

          (el) => el.data && (el.data.source === nodeId || el.data.target === nodeId)

        );

        if (connectedEdge) {

          const peerId = connectedEdge.data.source === nodeId ? connectedEdge.data.target : connectedEdge.data.source;

          peerMatch = incidents.find((i) => i.id === peerId) || null;

        }

      }

      let match: ThreatItem | null = null;

      // 1. Evidence Exhibit Node (CCTV Keyframe Burst)

      if (clickedEl && clickedEl.data && (nodeType === "evidence" || nodeId.startsWith("EVI-") || clickedEl.data.media_type)) {

        const d = clickedEl.data;

        const evFilename = d.video_filename || d.filename;

        setSelectedEvidenceNode({

          filename: evFilename,

          timestamp_sec: d.timestamp_sec,

          sha256: d.sha256,

          label: d.label,

        });

        const markerList = Array.isArray(d.threat_markers) && d.threat_markers.length ? d.threat_markers : ["physical_aggression", "keyframe"];

        match = {

          id: d.id || nodeId,

          severityTier: peerMatch?.severityTier || Number(d.visual_severity) || 2,

          timestamp: d.timestamp_sec != null ? `T+${Number(d.timestamp_sec).toFixed(1)}s` : (peerMatch?.timestamp || "Visual Exhibit"),

          schoolName: peerMatch?.schoolName || (d.id?.includes("kuching") || currentTenant === "smk-kuching-high" ? "SMK Kuching High (Sarawak)" : currentTenant === "smk-seksyen-9" ? "SMK Seksyen 9 Shah Alam" : "SMK Seksyen 11 Shah Alam"),

          contextSummary: `Visual Evidence Exhibit [${d.label || d.media_type || "Video Keyframe"}]. Threat markers: ${markerList.join(", ")}. Evidence SHA-256: ${d.sha256 || "N/A"}.`,

          slangTags: markerList,

          video_filename: evFilename || peerMatch?.video_filename,

          video_clips: evFilename ? [evFilename] : (peerMatch?.video_clips || []),

          jevVerdict: {

            passed: true,

            reason: `Evidence Act 1950 Sec 90A Cert: SHA-256 ${d.sha256 || "VERIFIED"}`,

            noulDangerScore: (Number(d.visual_severity) || 2) * 0.25,

          },

          jev_telemetry: peerMatch?.jev_telemetry || {

            imminent_violence: d.has_threat_object ? 0.85 : 0.45,

            weapon_threat: d.has_threat_object ? 0.9 : 0.1,

            extortion_coercion: 0.1,

            victim_distress: 0.6,

          },

        };

      }

      // 2. Persona Node (Demographic Student Handle - Pure Profile, NO Video Player)

      else if (clickedEl && clickedEl.data && nodeType === "PersonaNode") {

        setSelectedEvidenceNode(null);

        const d = clickedEl.data;

        const alias = d.alias || d.label || d.id;

        const school = d.school || d.school_name || peerMatch?.schoolName || "SMK Seksyen 11 Shah Alam";

        const role = d.role || d.role_risk_tier || "Observed Student";

        match = {

          id: d.id || nodeId,

          severityTier: peerMatch?.severityTier || 1,

          timestamp: "Demographic Persona Profile",

          schoolName: school,

          contextSummary: `Student / Persona Entity: [${alias}]. Role: ${role}. Affiliation: ${school}. Zero-PII Synthetic Demographic Profile (Malaysian PDPA 2010 Compliant).`,

          slangTags: ["persona_profile", "zero_pii", role.toLowerCase().replace(/\s+/g, "_")],

          jevVerdict: {

            passed: true,

            reason: "Zero-PII synthetic demographic handle verified under Malaysian PDPA 2010 statutory guidelines.",

            noulDangerScore: peerMatch?.jevVerdict?.noulDangerScore ? peerMatch.jevVerdict.noulDangerScore * 0.5 : 0.1,

          },

        };

      }

      // 3. Entity Transform Node (OSINT Pivot - Pure Corroboration, NO Video Player)

      else if (clickedEl && clickedEl.data && nodeType === "EntityTransformNode") {

        setSelectedEvidenceNode(null);

        const d = clickedEl.data;

        const label = d.label || d.title || d.id;

        match = {

          id: d.id || nodeId,

          severityTier: peerMatch?.severityTier || 2,

          timestamp: "OSINT Triangulation Pivot",

          schoolName: peerMatch?.schoolName || "Open-Source Intelligence Horizon",

          contextSummary: `OSINT Triangulation Pivot: [${label}]. Corroborating signals across public channels, digital footprint, and regional community chatter.`,

          externalCitations: d.source_url
            ? [
                {
                  platform: String(d.source_url).includes("osint-target") ? "suara_pelajar_target" : "web",
                  engine: String(d.source_url).includes("osint-target") ? "suara_pelajar_direct" : "osint_crawler",
                  title: String(d.title || label),
                  url: String(d.source_url),
                },
                ...(peerMatch?.externalCitations || []).filter((c: any) => c.url !== d.source_url),
              ]
            : (peerMatch?.externalCitations || []),

          slangTags: ["osint_pivot", "signal_intelligence", "open_source_corroboration"],

          jevVerdict: {

            passed: true,

            reason: "OSINT Triangulation pivot verified across open-source feeds.",

            noulDangerScore: peerMatch?.jevVerdict?.noulDangerScore ? peerMatch.jevVerdict.noulDangerScore * 0.6 : 0.2,

          },

        };

      }

      // 4. School Node (Campus Locus - Institutional Profile, NO Video Player)

      else if (clickedEl && clickedEl.data && nodeType === "SchoolNode") {

        setSelectedEvidenceNode(null);

        const d = clickedEl.data;

        const name = d.name || d.label || d.id;

        match = {

          id: d.id || nodeId,

          severityTier: 1,

          timestamp: "Institutional Campus Locus",

          schoolName: name,

          contextSummary: `Campus Institution: [${name}]. District: ${d.district || "Klang Valley"}. Monitored institutional locus under SENTIASA safety telemetry.`,

          slangTags: ["campus_institution", "safety_perimeter", "sentinel_mesh"],

          jevVerdict: {

            passed: true,

            reason: "Campus facility registered and active in safety cluster.",

            noulDangerScore: 0.05,

          },

        };

      }

      // 5. Threat Event Node or Direct Incident Match (Core Incident with Multi-Clip Access)

      else {

        setSelectedEvidenceNode(null);

        const incMatch = incidents.find((i) => i.id === nodeId) || peerMatch;

        if (incMatch) {

          const clips: string[] = [];

          if (incMatch.video_filename) clips.push(incMatch.video_filename);

          if (incMatch.extendedArchive?.filename && !clips.includes(incMatch.extendedArchive.filename)) {

            clips.push(incMatch.extendedArchive.filename);

          }

          if (Array.isArray(incMatch.video_clips)) {

            incMatch.video_clips.forEach((c) => {

              if (c && !clips.includes(c)) clips.push(c);

            });

          }

          match = {

            ...incMatch,

            video_clips: clips.length > 0 ? clips : incMatch.video_clips,

          };

        } else if (clickedEl && clickedEl.data) {

          const d = clickedEl.data;

          match = {

            id: d.id || nodeId,

            severityTier: 1,

            timestamp: "Topology Node",

            schoolName: d.label || d.id || "Monitored Institution",

            contextSummary: `Topology Entity: ${d.label || d.id}. Type: ${d.type || "Network Node"}. Active in monitored safety cluster.`,

            slangTags: ["topology", "sentinel_network"],

            jevVerdict: {

              passed: true,

              reason: "Topology node active.",

              noulDangerScore: 0.1,

            },

          };

        }

      }

      // Node selection updates focus and inspector; explicit Dossier button or Triage card click opens statutory dossier
      if (clickedEl && (clickedEl.data?.type === "evidence" || nodeId.startsWith("EVI-"))) {
        const d = clickedEl.data;
        setSelectedEvidenceNode({
          filename: d?.video_filename || d?.filename,
          timestamp_sec: d?.timestamp_sec,
          sha256: d?.sha256,
          label: d?.label,
        });
      }

    },

    [incidents, elements, setSelectedNodeId]

  );

  // 1-Click Demo Reset & Seed Purge State

  const [isResettingDemo, setIsResettingDemo] = useState<boolean>(false);

  const handleResetDemoState = useCallback(async () => {

    setIsResettingDemo(true);

    try {

      const activeBaseUrl = getApiBaseUrl();

      await fetch(`${activeBaseUrl}/api/admin/demo-reset`, {

        method: "POST",

        headers: { "X-Tenant-ID": currentTenant || "smk-sentiasa" },

      });

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("sentiasa_incidents");
          localStorage.removeItem("sentiasa_campuses");
          localStorage.removeItem("sentiasa_threat_actors");
        } catch {}
        window.location.reload();
      }

    } catch (err) {

      console.error("Demo reset error:", err);

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("sentiasa_incidents");
          localStorage.removeItem("sentiasa_campuses");
          localStorage.removeItem("sentiasa_threat_actors");
        } catch {}
        window.location.reload();
      }

    } finally {

      setIsResettingDemo(false);

    }

  }, [currentTenant]);

  // Full Battlespace Theater Mode State
  const [isBattlespaceFullscreen, setIsBattlespaceFullscreen] = useState<boolean>(false);

  // Progressive Disclosure: Sentinel-1 Copilot Drawer & Dock State
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState<boolean>(false);
  const [isCopilotDocked, setIsCopilotDocked] = useState<boolean>(false);
  const [isCalibrationMenuOpen, setIsCalibrationMenuOpen] = useState<boolean>(false);

  // Palantir Maven Tactical Evidence Uplink Drawer State
  const [isUplinkDrawerOpen, setIsUplinkDrawerOpen] = useState<boolean>(false);
  const [uplinkType, setUplinkType] = useState<"screenshot" | "video" | "text" | "whatsapp">("screenshot");
  const [uplinkFile, setUplinkFile] = useState<File | null>(null);
  const [uplinkVideoUrl, setUplinkVideoUrl] = useState<string>("");
  const [uplinkText, setUplinkText] = useState<string>("");
  const [whatsappPhone, setWhatsappPhone] = useState<string>("+6012-3456789");
  const [whatsappDispatchResult, setWhatsappDispatchResult] = useState<any>(null);
  const [isWardenDispatching, setIsWardenDispatching] = useState<boolean>(false);
  const [uplinkSchool, setUplinkSchool] = useState<string>("SMK Sentiasa");
  const [uplinkAlias, setUplinkAlias] = useState<string>("Student_Whistleblower");
  const [isUplinkSubmitting, setIsUplinkSubmitting] = useState<boolean>(false);
  const [uplinkStage, setUplinkStage] = useState<string>("");
  const [uplinkError, setUplinkError] = useState<string | null>(null);
  const [uplinkMetadata, setUplinkMetadata] = useState<Record<string, any>>({});

  // Dynamic Vernacular Dictionary Drawer State
  const [isDictionaryDrawerOpen, setIsDictionaryDrawerOpen] = useState<boolean>(false);
  const [customGlossary, setCustomGlossary] = useState<Record<string, any>>(MALAYSIAN_SLANG_KNOWLEDGE);
  const [dictionarySearch, setDictionarySearch] = useState<string>("");
  const [dictionaryFilter, setDictionaryFilter] = useState<string>("ALL");
  const [newToken, setNewToken] = useState<string>("");
  const [newMeaning, setNewMeaning] = useState<string>("");
  const [newTier, setNewTier] = useState<string>("TIER_2_ELEVATED");
  const [newCategory, setNewCategory] = useState<string>("Peninsular Core");
  const [isAddingToken, setIsAddingToken] = useState<boolean>(false);
  const [tokenAddSuccess, setTokenAddSuccess] = useState<boolean>(false);

  // Native React-controlled input submission helper for Copilot predefined prompt chips
  const submitPromptToChat = useCallback((promptText: string) => {
    setIsCopilotDrawerOpen(true);

    const trySubmit = () => {
      const chatInput = document.querySelector(
        ".copilotKitChat textarea, .copilotKitChat input"
      ) as HTMLInputElement | HTMLTextAreaElement | null;

      if (!chatInput) return false;

      // 1. Native prototype setter to update React internal value tracker
      const proto = Object.getPrototypeOf(chatInput);
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) {
        setter.call(chatInput, promptText);
      } else {
        chatInput.value = promptText;
      }

      // 2. Dispatch synthetic input and change events
      chatInput.dispatchEvent(new Event("input", { bubbles: true }));
      chatInput.dispatchEvent(new Event("change", { bubbles: true }));
      chatInput.focus();

      // 3. Find and click send button or press enter
      setTimeout(() => {
        const form = chatInput.closest("form");
        const sendBtn =
          form?.querySelector("button[type='submit']") ||
          chatInput.parentElement?.querySelector("button") ||
          document.querySelector(".copilotKitChat button[type='submit']") ||
          document.querySelector(".copilotKitInput button");

        if (sendBtn && !sendBtn.hasAttribute("disabled")) {
          (sendBtn as HTMLElement).click();
        } else {
          chatInput.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            })
          );
        }
      }, 70);
      return true;
    };

    if (!trySubmit()) {
      setTimeout(trySubmit, 150);
    }
  }, []);

  // Fetch live slang dictionary from backend on mount
  useEffect(() => {
    fetchSlangGlossary()
      .then((glossary) => {
        if (glossary && Object.keys(glossary).length > 0) {
          const mapped: Record<string, any> = {};
          for (const [k, v] of Object.entries(glossary)) {
            mapped[k] = {
              meaning: (v as any).meaning,
              severityRisk: String((v as any).tier || "TIER_2_ELEVATED"),
              dialect: (v as any).dialect_category || "Pan-Malaysian",
            };
          }
          setCustomGlossary((prev) => ({ ...prev, ...mapped }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBattlespaceFullscreen(false);
        setSelectedIncidentForModal(null);
        setSelectedEvidenceNode(null);
        if (!isUplinkSubmitting) {
          setIsUplinkDrawerOpen(false);
          setWhatsappDispatchResult(null);
        }
        setIsDictionaryDrawerOpen(false);
        setIsOSINTDrawerOpen(false);
        setIsPolemicDrawerOpen(false);
        setIsHitlDrawerOpen(false);
        setIsCopilotDrawerOpen(false);
        setIsCalibrationMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCopilotDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isUplinkSubmitting]);

  useEffect(() => {
    setWhatsappDispatchResult(null);
  }, [currentTenant]);

  // Uplink Submission Handler

  const handleUplinkSubmit = useCallback(async () => {

    setIsUplinkSubmitting(true);

    setUplinkError(null);
    setWhatsappDispatchResult(null);

    setUplinkStage("Initiating Sensor Ingest & Calculating SHA-256 Hash...");

    try {

      let result: any;

      if (uplinkType === "whatsapp") {
        setUplinkStage("Processing Autonomous WhatsApp Webhook & Scrubbing PII (Child Act 2001)...");
        const backendBase = getApiBaseUrl();
        const sLower = (uplinkSchool || "").toLowerCase();
        const resolvedTenant = sLower.includes("kuching")
          ? "smk-kuching-high"
          : sLower.includes("9")
          ? "smk-seksyen-9"
          : "smk-seksyen-11";
        const isVetoPreset = Boolean(uplinkMetadata?.force_fsm_veto || uplinkMetadata?.illegal_state_jump);
        const res = await fetch(`${backendBase}/api/webhooks/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_phone: whatsappPhone,
            body: uplinkText.trim() || "Budak form 4 standby bawa parang nak belasah budak batch bawah petang ni kat pondok basikal.",
            campus_name: uplinkSchool,
            reporter_alias: uplinkAlias,
            metadata: {
              ...uplinkMetadata,
              tenant_id: resolvedTenant,
              counselor_approved: isVetoPreset ? false : (uplinkMetadata?.counselor_approved ?? true),
            },
          }),
        });
        if (!res.ok) throw new Error(`WhatsApp Sentry Webhook returned HTTP ${res.status}`);
        const data = await res.json();
        setWhatsappDispatchResult(data);
        result = data.triage_result || data;
      } else if (uplinkType === "screenshot") {

        if (!uplinkFile) throw new Error("Please select a screenshot file (.png, .jpg)");

        setUplinkStage("Executing NVIDIA Nemotron-3.5-Super-VL Vision OCR & Dialect Normalization...");

        result = await uploadScreenshotAndTriage(uplinkFile, uplinkSchool, uplinkAlias);

      } else if (uplinkType === "video") {
        let fileToUpload = uplinkFile;
        if (!fileToUpload && !uplinkVideoUrl.trim()) {
          throw new Error("Please select a video file (.mp4, .mov) or enter a video evidence URL");
        }
        if (!fileToUpload && uplinkVideoUrl.trim()) {
          fileToUpload = new File([new Blob(["SENTIASA_REMOTE_VIDEO_STREAM"], { type: "video/mp4" })], "remote_witness_video.mp4", { type: "video/mp4" });
        }
        setUplinkStage("Sampling Keyframe Burst & Video Triage...");
        result = await uploadVideoAndTriage(fileToUpload!, uplinkSchool, uplinkAlias || "Whistleblower_Video_Witness", uplinkVideoUrl.trim() || undefined);
      } else {
        if (!uplinkText.trim()) throw new Error("Please enter narrative intelligence text");
        setUplinkStage("Running Sensory Fusion Join & Sentinel Guard Audit...");
        result = await triageIncident({
          raw_text: uplinkText,
          school_name: uplinkSchool,
          reporter_alias: uplinkAlias,
          metadata: uplinkMetadata,
        });
      }

      setUplinkStage("Verifying SHACL-GOV-01 Invariant Gates...");
      if (result.jev_passed) {
        handleTriageSuccess(result);
      } else {
        handleTriageVetoed(result);
      }

      setUplinkStage("Triage Complete! Synchronizing Knowledge Graph...");
      if (result.incident_id) {
        setSelectedNodeId(result.incident_id);
        setFocusTrigger((f) => f + 1);
      }

      if (uplinkType !== "whatsapp") {
        setTimeout(() => {
          setIsUplinkDrawerOpen(false);
          setUplinkFile(null);
          setUplinkVideoUrl("");
          setUplinkText("");
          setIsUplinkSubmitting(false);
          setUplinkStage("");
        }, 1000);
      } else {
        setIsUplinkSubmitting(false);
        setUplinkStage("");
      }

    } catch (err: any) {

      setUplinkError(err.message || "Failed to process uplink");

      setIsUplinkSubmitting(false);

    }

  }, [uplinkType, uplinkFile, uplinkVideoUrl, uplinkText, uplinkSchool, uplinkAlias, uplinkMetadata, whatsappPhone, handleTriageSuccess, handleTriageVetoed]);

  // Dynamic Slang Token Registration Handler

  const handleAddNewToken = useCallback(async () => {

    if (!newToken.trim() || !newMeaning.trim()) return;

    setIsAddingToken(true);

    try {

      const cleanToken = newToken.trim().toLowerCase();

      await addSlangToken({

        token: cleanToken,

        meaning: newMeaning.trim(),

        severity_boost: newTier === "TIER_3_CRITICAL" ? 3 : newTier === "TIER_1_LOW" ? 0 : 2,

        tier: newTier,

        dialect_category: newCategory,

      });

      setCustomGlossary((prev) => ({

        ...prev,

        [cleanToken]: {

          meaning: newMeaning.trim(),

          severityRisk: newTier === "TIER_3_CRITICAL" ? "CRITICAL (Tier 3-5)" : newTier === "TIER_1_LOW" ? "LOW (Tier 1)" : "ELEVATED (Tier 2-3)",

          dialect: newCategory,

        },

      }));

      setNewToken("");

      setNewMeaning("");

      setTokenAddSuccess(true);

      setTimeout(() => setTokenAddSuccess(false), 3000);

    } catch (err: any) {

      alert("Failed to register token: " + (err.message || "Unknown error"));

    } finally {

      setIsAddingToken(false);

    }

  }, [newToken, newMeaning, newTier, newCategory]);

  // Filtered glossary entries for search & category

  const filteredGlossaryEntries = useMemo(() => {

    return Object.entries(customGlossary).filter(([token, info]) => {

      const matchesSearch =

        token.toLowerCase().includes(dictionarySearch.toLowerCase()) ||

        info.meaning.toLowerCase().includes(dictionarySearch.toLowerCase()) ||

        info.dialect.toLowerCase().includes(dictionarySearch.toLowerCase());

      if (!matchesSearch) return false;

      if (dictionaryFilter === "ALL") return true;

      if (dictionaryFilter === "Peninsular") return info.dialect.includes("Peninsular") || info.dialect.includes("Pasar");

      if (dictionaryFilter === "Sexual Assault") return info.meaning.includes("sexual") || info.meaning.includes("rape") || info.meaning.includes("molestation");

      if (dictionaryFilter === "Borneo") return info.dialect.includes("Borneo") || info.dialect.includes("Sabah");

      if (dictionaryFilter === "SJKC") return info.dialect.includes("Chinese") || /[\u4e00-\u9fa5]/.test(token);

      if (dictionaryFilter === "SJKT") return info.dialect.includes("Tamil") || /[\u0B80-\u0BFF]/.test(token);

      if (dictionaryFilter === "Jawi") return info.dialect.includes("Jawi") || /[\u0600-\u06FF]/.test(token);

      return true;

    });

  }, [customGlossary, dictionarySearch, dictionaryFilter]);

  // ---------------------------------------------------------------------------

  // 1. CopilotKit useCopilotReadable: Expose Live Canvas & Threat State to LLM

  // ---------------------------------------------------------------------------

  useCopilotReadable({

    description: "Active campus incidents currently monitored by SENTIASA",

    value: incidents.map((inc) => ({

      id: inc.id,

      severityTier: inc.severityTier,

      schoolName: inc.schoolName,

      summary: inc.contextSummary,

      slangTags: inc.slangTags,

      jevPassed: inc.jevVerdict?.passed,

      noulDangerScore: inc.jevVerdict?.noulDangerScore,

    })),

  });

  useCopilotReadable({

    description: "Active Semantic Triad graph elements on the Cytoscape canvas (nodes and edges)",

    value: elements.map((el) => el.data),

  });

  useCopilotReadable({

    description: "The currently focused node ID on the Cytoscape graph canvas",

    value: selectedNodeId || "None selected",

  });

  useCopilotReadable({

    description: "Operator workspace view mode and active GEOINT spatial map context",

    value: {
      canvasViewMode,
      activeCampusId: currentTenant,
      monitoredMicroZones: [
        { zoneId: "ZONE-REAR-GATE", name: "Rear Perimeter & Bicycle Sheds", riskTier: 5, cctvStatus: "PARTIAL" },
        { zoneId: "ZONE-HOSTEL-C", name: "Dormitory Block C (ASPURA)", riskTier: 4, cctvStatus: "PARTIAL" },
        { zoneId: "ZONE-TOILET-L3", name: "Level 3 Restrooms (Academic Block B)", riskTier: 3, cctvStatus: "NONE - HIGH RISK BLIND SPOT" },
        { zoneId: "ZONE-CANTEEN", name: "Central Canteen & Pavillion", riskTier: 1, cctvStatus: "FULL" },
        { zoneId: "ZONE-FRONT-GATE", name: "Main Guard Gate & Bus Bay", riskTier: 1, cctvStatus: "FULL" },
      ],
      temporalPeakIntervals: [
        "Friday 13:00 - 14:30 (Friday Dispersal Peak - 98% Incident Probability)",
        "Sunday 22:30 - 01:00 (Hostel Lights Out Curfew - 95% Incident Probability)",
      ],
    },

  });

  useCopilotReadable({

    description: "Malaysian youth slang dictionary and threat risk levels",

    value: MALAYSIAN_SLANG_KNOWLEDGE,

  });

  useCopilotReadable({

    description: "Active Persons of Interest (POIs) and monitored threat actors on campus",

    value: threatActors.map((a) => ({

      handle: a.handle,

      school: a.schoolName,

      role: a.role,

      riskTier: a.riskTier,

      threatTags: a.threatTags,

      notes: a.notes,

    })),

  });

  // ---------------------------------------------------------------------------

  // 2. CopilotKit useCopilotAction: Natural Language Graph Manipulation

  // ---------------------------------------------------------------------------

  useCopilotAction({

    name: "openThreatWatchlist",

    description: "Opens the institutional directory modal showing enrolled campuses or the threat actor watchlist",

    parameters: [

      {

        name: "tab",

        type: "string",

        description: "Tab to display: 'CAMPUSES' or 'THREAT_ACTORS' (default: 'THREAT_ACTORS')",

        required: false,

      },

    ],

    handler: ({ tab }) => {

      setDirectoryModalTab(tab === "CAMPUSES" ? "CAMPUSES" : "THREAT_ACTORS");

      setIsDirectoryModalOpen(true);

      return { success: true, message: `Opened directory tab: ${tab || "THREAT_ACTORS"}` };

    },

  });

  useCopilotAction({

    name: "traceShortestPath",

    description: "Calculates and illuminates the shortest connection chain between any two entities, persons, or threat nodes on the Cytoscape graph canvas using Dijkstra link analysis and Blackout Mode",

    parameters: [

      {

        name: "sourceNodeId",

        type: "string",

        description: "The origin entity ID (e.g., 'persona-azlan' or 'school-smk-seksyen-11')",

        required: true,

      },

      {

        name: "targetNodeId",

        type: "string",

        description: "The destination entity ID (e.g., 'incident-parang' or 'persona-haziq')",

        required: true,

      },

    ],

    handler: ({ sourceNodeId, targetNodeId }) => {

      setTraceRequest({ sourceId: sourceNodeId, targetId: targetNodeId });

      setLatestVerdict({

        text: `Investigative Link Traced: ${sourceNodeId} ➔ ${targetNodeId}`,

        type: "passed",

      });

      return {

        success: true,

        message: `Illuminated shortest investigative link between ${sourceNodeId} and ${targetNodeId}. Irrelevant nodes dimmed in Blackout Mode.`,

      };

    },

  });

  useCopilotAction({

    name: "toggleCanvasViewMode",

    description: "Switches the tactical viewport between the relational Cytoscape graph canvas and the Selangor incident risk heatmap view",

    parameters: [

      {

        name: "mode",

        type: "string",

        description: "Viewport mode: 'GRAPH' for relational network or 'HEATMAP' for Selangor district/zone risk heatmap",

        required: true,

      },

    ],

    handler: ({ mode }) => {

      const targetMode = mode.toUpperCase() === "HEATMAP" ? "HEATMAP" : "GRAPH";

      setCanvasViewMode(targetMode);

      setLatestVerdict({

        text: `Display View Switched: ${targetMode === "HEATMAP" ? "Selangor Threat Heatmap" : "Relational Graph Canvas"} Active`,

        type: "passed",

      });

      return { success: true, mode: targetMode };

    },

  });

  useCopilotAction({

    name: "focusGraphNode",

    description: "Pans, highlights, and selects a specific entity, threat, persona, or school node on the Cytoscape graph canvas",

    parameters: [

      {

        name: "nodeId",

        type: "string",

        description: "The ID or name of the target node (e.g., 'persona-azlan', 'incident-parang', 'incident-fight', 'school-smk-seksyen-11')",

        required: true,

      },

    ],

    handler: ({ nodeId }) => {

      // Fuzzy resolve canonical entity ID if caller passed alias or substring

      let targetId = nodeId;

      const matchedEl = elements?.find((el) => {

        const d = el.data;

        if (!d || !d.id || d.source || d.target) return false;

        const idLower = String(d.id).toLowerCase();

        const targetLower = targetId.toLowerCase().trim();

        const labelLower = String(d.label || d.name || d.alias || "").toLowerCase();

        return (

          idLower === targetLower ||

          idLower.includes(targetLower) ||

          targetLower.includes(idLower) ||

          (labelLower && (labelLower === targetLower || labelLower.includes(targetLower) || targetLower.includes(labelLower)))

        );

      });

      if (matchedEl?.data?.id) {

        targetId = String(matchedEl.data.id);

      }

      handleGraphNodeSelect(targetId);

      setLatestVerdict({

        text: `Knowledge Graph Focused on '${targetId}'`,

        type: "passed",

      });

      return { success: true, message: `Focused node ${targetId}` };

    },

  });

  useCopilotAction({

    name: "filterThreatsBySeverity",

    description: "Filters visible threats on the canvas and list by minimum severity tier (1 to 5)",

    parameters: [

      {

        name: "minSeverity",

        type: "number",

        description: "Minimum severity tier from 1 (benign) to 5 (critical lethal danger)",

        required: true,

      },

    ],

    handler: ({ minSeverity }) => {

      const clamped = Math.max(1, Math.min(5, Math.round(minSeverity)));

      setFilterMinSeverity(clamped);

      setLatestVerdict({

        text: `Radar Sweep: Filtered view to Severity Tier ${clamped}+ threats`,

        type: "passed",

      });

      return { success: true, activeFilter: clamped };

    },

  });

  useCopilotAction({

    name: "runIncidentTriage",

    description: "Runs deterministic multi-modal LangGraph incident triage with Jev Gatekeeper validation for a report",

    parameters: [

      {

        name: "reportText",

        type: "string",

        description: "The whistleblower text or message to triage",

        required: true,

      },

      {

        name: "schoolName",

        type: "string",

        description: "Associated school name (default: 'SMK Sentiasa')",

        required: false,

      },

    ],

    handler: async ({ reportText, schoolName }) => {

      try {

        setIsTriageRunning(true);

        const result = await triageIncident({

          raw_text: reportText,

          school_name: schoolName || "SMK Sentiasa",

          reporter_alias: "CopilotOperator",

        });

        if (result.jev_passed) {

          handleTriageSuccess(result);

        } else {

          handleTriageVetoed(result);

        }

        return {

          success: true,

          incidentId: result.incident_id,

          severityTier: result.severity_tier,

          jevPassed: result.jev_passed,

          vetoReason: result.jev_evaluation?.veto_reason,

          dangerScore: result.jev_evaluation?.semantic_danger_probability,

          slangTokens: result.extracted_slang_tokens,

        };

      } catch (err: any) {

        return { success: false, error: err.message || "Triage pipeline failed" };

      } finally {

        setIsTriageRunning(false);

      }

    },

  });

  useCopilotAction({

    name: "explainSlangNuance",

    description: "Explains Malaysian youth slang terms, regional dialects, and threat context",

    parameters: [

      {

        name: "slangTerm",

        type: "string",

        description: "The slang term to query (e.g. 'parang', 'tapau', 'koyak')",

        required: true,

      },

    ],

    handler: ({ slangTerm }) => {

      const lower = slangTerm.toLowerCase().trim();

      const match = MALAYSIAN_SLANG_KNOWLEDGE[lower];

      if (match) {

        return {

          term: lower,

          meaning: match.meaning,

          severityRisk: match.severityRisk,

          dialect: match.dialect,

        };

      }

      return {

        term: lower,

        meaning: "Colloquial Malaysian vernacular term. Evaluated dynamically via sovereign YTL ILMU model.",

      };

    },

  });

  useCopilotAction({

    name: "resolveHitlQueueItem",

    description: "Allows counselor to approve escalation or dismiss a Jev-vetoed incident in the review queue",

    parameters: [

      {

        name: "queueId",

        type: "string",

        description: "The queue ticket ID to resolve",

        required: true,

      },

      {

        name: "decision",

        type: "string",

        description: "'APPROVE_ESCALATION' or 'DISMISS'",

        required: true,

      },

      {

        name: "counselorNotes",

        type: "string",

        description: "Reasoning and notes for the audit ledger",

        required: false,

      },

    ],

    handler: async ({ queueId, decision, counselorNotes }) => {

      try {

        const dec = decision === "APPROVE_ESCALATION" ? "APPROVE_ESCALATION" : "DISMISS";

        await resolveHitlIncident({

          queue_id: queueId,

          decision: dec,

          reviewer_notes: counselorNotes || "Resolved via Copilot CoAgent interaction.",

        });

        handleHitlResolved(queueId, dec);

        return { success: true, queueId, decision: dec };

      } catch (err: any) {

        return { success: false, error: err.message || "HITL resolution failed" };

      }

    },

  });

  useCopilotAction({

    name: "scrubTimeline",

    description: "Scrubs the Left-of-Bang Chronology timeline bar to a specified epoch percentage or timestamp phase (e.g. 15 for 08:15 MYT initial bullying, 45 for 08:56 extortion, 70 for 09:28 brawl, 100 for Live)",

    parameters: [

      {

        name: "epoch",

        type: "number",

        description: "Epoch value from 0 to 100",

        required: true,

      },

    ],

    handler: ({ epoch }) => {

      const clamped = Math.max(0, Math.min(100, Number(epoch) || 0));

      setTimelineEpochIndex(clamped);

      const matchedWaypoint = [...TIMELINE_WAYPOINTS].reverse().find((w) => clamped >= w.epoch) || TIMELINE_WAYPOINTS[0];

      setSelectedNodeId(matchedWaypoint.leadIncidentId);

      setLatestVerdict({

        text: `Chronology scrubbed to ${clamped}% [${matchedWaypoint.timeLabel}]: ${matchedWaypoint.title}`,

        type: "passed",

      });

      return { success: true, epoch: clamped, phase: matchedWaypoint.phase, title: matchedWaypoint.title };

    },

  });

  useCopilotAction({

    name: "toggleTimelinePlayback",

    description: "Plays or pauses the historical Left-of-Bang chronology replay loop across the incident graph",

    parameters: [

      {

        name: "play",

        type: "boolean",

        description: "true to start playback, false to pause",

        required: true,

      },

    ],

    handler: ({ play }) => {

      setIsTimelinePlaying(Boolean(play));

      return { success: true, isPlaying: Boolean(play) };

    },

  });

  // Allowed Entity IDs derived from Left-of-Bang Chronology Waypoints (null when >= 95 / Live)

  const timelineAllowedIds = useMemo(() => {

    if (timelineEpochIndex >= 95) return null;

    const activeWaypoint =

      [...TIMELINE_WAYPOINTS].reverse().find((w) => timelineEpochIndex >= w.epoch) || TIMELINE_WAYPOINTS[0];

    return new Set(activeWaypoint.entitiesPresent);

  }, [timelineEpochIndex]);

  // Topology count summary for header and radar sweep indicator

  const activeTopologySummary = useMemo(() => {

    let activeNodes = 0;

    const activeThreatIds = new Set<string>();

    for (const el of elements) {

      if (el.data?.source && el.data?.target) continue;

      const d = el.data;

      if (!d) continue;

      const id = String(d.id);

      const isThreat =

        d.type === "ThreatEventNode" ||

        d.type === "threat_event" ||

        id.startsWith("incident-") ||

        id.startsWith("threat_");

      if (isThreat) {

        const tier = Number(d.severity_tier || d.visual_severity || 1);

        const isTemporalFuture = timelineAllowedIds ? !timelineAllowedIds.has(id) : false;

        const isSeverityFiltered = filterMinSeverity > 1 ? tier < filterMinSeverity : false;

        if (!isTemporalFuture && !isSeverityFiltered) {

          activeThreatIds.add(id);

          activeNodes++;

        }

      }

    }

    for (const el of elements) {

      if (el.data?.source && el.data?.target) continue;

      const d = el.data;

      if (!d) continue;

      const id = String(d.id);

      const isThreat =

        d.type === "ThreatEventNode" ||

        d.type === "threat_event" ||

        id.startsWith("incident-") ||

        id.startsWith("threat_");

      if (!isThreat) {

        if (d.type === "SchoolNode" || d.type === "school") {

          activeNodes++;

        } else {

          const isTemporalFuture = timelineAllowedIds ? !timelineAllowedIds.has(id) : false;

          if (!isTemporalFuture) {

            const connectedEdges = elements.filter(

              (e) => e.data && (e.data.source === id || e.data.target === id)

            );

            if (connectedEdges.length === 0) {

              activeNodes++;

            } else {

              const hasActiveThreat = connectedEdges.some((e) => {

                const peer = e.data.source === id ? e.data.target : e.data.source;

                return activeThreatIds.has(peer);

              });

              if (hasActiveThreat) {

                activeNodes++;

              }

            }

          }

        }

      }

    }

    return { activeNodes, totalElements: elements.length };

  }, [elements, filterMinSeverity, timelineAllowedIds]);

  // Filtered incidents for Telemetry Table

  const visibleIncidents = useMemo(() => {
    let list = incidents;
    if (timelineAllowedIds) {
      list = list.filter((i) => timelineAllowedIds.has(i.id));
    }
    if (filterMinSeverity > 1) {
      list = list.filter((i) => i.severityTier >= filterMinSeverity);
    }
    if (currentTenant && currentTenant !== "*") {
      list = list.filter((i) => {
        if (i.tenant_id === currentTenant) return true;
        const sName = (i.schoolName || "").toLowerCase();
        if (currentTenant === "smk-kuching-high" && (sName.includes("kuching") || sName.includes("sarawak"))) return true;
        if (currentTenant === "smk-seksyen-11" && (sName.includes("11") || sName.includes("sentiasa") || i.id.includes("parang") || i.id.includes("bullying"))) return true;
        if (currentTenant === "smk-seksyen-9" && (sName.includes("9") || i.id.includes("fight"))) return true;
        return false;
      });
    }
    return list;
  }, [incidents, filterMinSeverity, timelineAllowedIds, currentTenant]);

  const handleManualTriageSubmit = useCallback(async () => {

    if (!quickInputText.trim() || isTriageRunning) return;

    setIsTriageRunning(true);

    try {

      const result = await triageIncident({

        raw_text: quickInputText,

        school_name: "SMK Sentiasa",

        reporter_alias: "CounselorConsole",

      });

      if (result.jev_passed) {

        handleTriageSuccess(result);

      } else {

        handleTriageVetoed(result);

      }

      setQuickInputText("");

    } catch (err: any) {

      setLatestVerdict({

        text: `Triage error: ${err.message || "Failed to contact engine"}`,

        type: "vetoed",

      });

    } finally {

      setIsTriageRunning(false);

    }

  }, [quickInputText, isTriageRunning, handleTriageSuccess, handleTriageVetoed, setLatestVerdict]);

  // Whistleblower Persona Boundary: If operator is STUDENT_REPORTER, lock graph canvas and present intake portal

  if (currentRole === "STUDENT_REPORTER") {

    return (

      <div className="flex flex-col gap-4 font-sans max-w-6xl mx-auto py-2">

        <StudentIntakePortal />

      </div>

    );

  }

  // Dynamically generated contextual prompt suggestions for Sentinel-1 based on live graph & selection
  const dynamicCopilotChips = useMemo(() => {
    // 0. If in GEOINT Map mode:
    if (canvasViewMode === "HEATMAP") {
      return [
        {
          label: "📍 Audit Rear Gate (T5 Blindspot)",
          prompt: "Audit Zone 1: Rear Perimeter & Bicycle Sheds at SMK Seksyen 11. Explain why this CCTV blindspot is classified as a Tier 5 critical hotspot.",
        },
        {
          label: "🏢 Inspect Hostel & Dormitory Risk",
          prompt: "Analyze Zone 2: Dormitory Block C (ASPURA). What incidents, hazing risks, or late-night curfew violations have been reported there?",
        },
        {
          label: "🕒 Analyze Friday Dispersal Window",
          prompt: "Examine the 24/7 Temporal Clock matrix for Friday 13:00 - 14:30 dismissal. Why does incident probability peak to 98% during this interval?",
        },
        {
          label: "🗺️ Compare PPD Jurisdictions",
          prompt: "Compare incident telemetry across Selangor PPD districts (Petaling Utama, Petaling Perdana, Klang). Which campus has the highest risk index?",
        },
      ];
    }

    // 1. If an entity/node is currently selected on the canvas:
    if (selectedNodeId) {
      const selectedEl = elements?.find((el) => el.data?.id === selectedNodeId);
      const nodeLabel = selectedEl?.data?.label || selectedEl?.data?.threatLabel || selectedEl?.data?.alias || selectedEl?.data?.name || selectedNodeId;
      return [
        {
          label: `🔍 Analyze ${String(nodeLabel).slice(0, 18)}`,
          prompt: `Analyze the node '${nodeLabel}' (${selectedNodeId}), its risk level, and explain why it is present in the campus safety graph.`,
        },
        {
          label: `🔗 Trace Links for ${String(nodeLabel).slice(0, 16)}`,
          prompt: `What other entities, schools, or threats are connected to '${nodeLabel}'? Trace its multi-hop relationships.`,
        },
        {
          label: `📋 Sec 90A Custody Check`,
          prompt: `Verify the Section 90A statutory chain of custody and forensic hash evidence for '${nodeLabel}'.`,
        },
        {
          label: `⚡ Filter Critical (T4+)`,
          prompt: `Filter the canvas to highlight only Tier 4 and Tier 5 critical threats.`,
        },
      ];
    }

    // 2. If no node is selected, generate suggestions from active campus telemetry:
    const topIncident = [...incidents].sort((a, b) => (b.severityTier || 0) - (a.severityTier || 0))[0];
    const topSlang = incidents.flatMap((i) => i.slangTags || []).find((s) => s !== "edge_cctv" && s !== "vlm_triage" && s !== "finops_budget") || "parang";

    const chips = [];
    if (topIncident) {
      chips.push({
        label: `⚠️ Audit Threat: ${topIncident.id.slice(0, 15)} (T${topIncident.severityTier})`,
        prompt: `Focus on and evaluate the highest severity incident '${topIncident.id}' at ${topIncident.schoolName}. Explain its threat assessment.`,
      });
    }

    chips.push({
      label: `📖 Dialect Risk: #${topSlang}`,
      prompt: `Explain the Malaysian youth vernacular slang meaning and polysemy risk for '#${topSlang}'.`,
    });

    chips.push({
      label: `⚡ Filter Critical Threats (T4+)`,
      prompt: `Filter the canvas to show only Tier 4 and Tier 5 threats.`,
    });

    if (pendingHitlCount > 0) {
      chips.push({
        label: `🛡️ Review Vetoes (${pendingHitlCount})`,
        prompt: `Summarize the pending Human-in-the-Loop review queue items and explain why SHACL invariants or doubt bands triggered.`,
      });
    } else {
      chips.push({
        label: `🏫 Campus Safety Summary`,
        prompt: `Provide a concise situational intelligence executive summary of all active campus incidents and safety posture.`,
      });
    }

    return chips;
  }, [selectedNodeId, elements, incidents, pendingHitlCount, canvasViewMode]);

  const renderCopilotTerminalContent = (isDrawerMode = false) => (
    <div className="flex flex-col h-full gap-3">
      {/* Tactical Operator Header */}
      <div className="rounded-lg border border-cyan-800/40 bg-gradient-to-br from-[#0a1224] via-[#060a14] to-[#0d1628] p-4 shadow-xl shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-slate-100 tracking-wider flex items-center gap-2">
                <span>SENTINEL-1 SAFETY OPERATOR</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.2 font-mono text-[10px] font-bold text-emerald-300">
                  ACTIVE
                </span>
              </h3>
              <p className="font-mono text-xs text-slate-300">
                CALLSIGN: SENTINEL-1 // SOVEREIGN NEURAL REASONER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Dock / Undock toggle button */}
            <button
              type="button"
              onClick={() => {
                setIsCopilotDocked((prev) => !prev);
                if (!isCopilotDocked) {
                  setIsCopilotDrawerOpen(false);
                }
              }}
              title={isCopilotDocked ? "Undock Copilot into Slide-over Drawer" : "Dock Copilot to Grid Viewport"}
              className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {isCopilotDocked ? (
                <Minimize2 className="h-4 w-4 text-cyan-400" />
              ) : (
                <Maximize2 className="h-4 w-4 text-cyan-400" />
              )}
            </button>

            {isDrawerMode && (
              <button
                type="button"
                onClick={() => setIsCopilotDrawerOpen(false)}
                title="Close Drawer (Esc)"
                className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Contextual Command Execution Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-xs">
          {dynamicCopilotChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => submitPromptToChat(chip.prompt)}
              className="rounded-lg border border-cyan-800/50 bg-cyan-950/50 px-2.5 py-1 text-[11px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-900/80 hover:text-white"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tactical CopilotChat Terminal Box */}
      <div className="rounded-lg border border-slate-800 bg-[#060a12] p-1 shadow-2xl flex-1 min-h-[460px] overflow-hidden flex flex-col [&_.copilotKitChat]:h-full [&_.copilotKitChat]:bg-transparent">
        <CopilotChat
          instructions="You are SENTIASA SENTINEL-1, an enterprise campus safety and security intelligence agent. You have real-time visibility into the Cytoscape graph canvas, incident telemetry ledger, Sovereign Vernacular dialect calibration, and Sentinel Guard safety scores. When asked to zoom or focus on entities, invoke the 'focusGraphNode' action. When asked to triage incidents, invoke 'runIncidentTriage'. Always provide concise, actionable, and culturally grounded Malaysian dialect evaluations."
          labels={{
            title: "SENTINEL-1 SAFETY OPERATOR",
            initial: "CAMPUS SAFETY TELEMETRY SYNCHRONIZED. I am Sentinel-1. Monitoring live safety graph vectors, sovereign vernacular indicators, and safety invariant boundaries. Standing by for instructions.",
            placeholder: "Ask about high-risk signals, student safety vectors, or type a query...",
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* ========================================================================= */}
      {/* 1. Cinematic Defense Telemetry Header Bar (Unified Ergonomic Strip) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#060a12] px-4 py-2 font-mono shadow-md">
        <div className="flex items-center gap-3 text-xs sm:text-sm flex-wrap">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Crosshair className="h-4 w-4 animate-pulse text-cyan-400" />
            <span className="font-bold tracking-wider text-xs sm:text-sm">SECTOR: KLANG_VALLEY</span>
          </div>
          <span className="text-slate-700 hidden md:inline">|</span>
          <span className="text-slate-400 text-xs hidden md:inline">03°08&apos;20&quot;N 101°41&apos;15&quot;E</span>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-semibold">DEFCON:</span>
            <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-xs font-bold text-rose-300">
              TIER 5 CRITICAL
            </span>
          </div>
          <span className="text-slate-700 hidden lg:inline">|</span>
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-300 font-semibold">ONTOLOGY SYNCED</span>
          </div>
          <span className="text-slate-700 hidden xl:inline">|</span>
          <span className="text-slate-400 text-xs hidden xl:inline">VERNACULAR: <strong className="text-amber-300 font-bold">dNuance 1.58</strong></span>
          <span className="text-slate-700 hidden xl:inline">|</span>
          <span className="text-cyan-300 text-xs font-semibold hidden xl:inline">SHACL LOCKED</span>
        </div>

        {/* Sentinel-1 Quick Drawer Toggle Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCopilotDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-bold transition shadow-sm ${
              isCopilotDrawerOpen || isCopilotDocked
                ? "border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-cyan-950/50"
                : "border-purple-500/50 bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-slate-900 text-purple-200 hover:border-purple-400 hover:text-white"
            }`}
            title="Open Sentinel-1 Copilot AI Operator (⌘K)"
          >
            <Bot className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>Sentinel-1 Copilot</span>
            <span className="rounded bg-purple-900/60 border border-purple-700/60 px-1.5 py-0.2 text-[10px] text-purple-300 font-semibold">⌘K</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Main Workspace Layout (Full-Width by default, 8/4 split when docked) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Workspace Column: Takes full width (12 cols) when undocked, or 8 cols when docked */}
        <div className={`${isCopilotDocked ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-3 transition-all duration-200`}>
          {/* A. Cytoscape Radar Canvas with Tactical Reticle Controls */}
          <div className="rounded-lg border border-cyan-900/40 bg-[#060a12] shadow-2xl overflow-hidden flex flex-col">
            {/* Canvas Tactical Toolbar: Tier 1 Navigation & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#090f1d] px-3.5 py-2 font-mono text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {canvasViewMode === "GRAPH" ? (
                  <Network className="h-4 w-4 text-cyan-400 shrink-0" />
                ) : (
                  <MapPin className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span className="font-bold tracking-wider text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                  {canvasViewMode === "GRAPH" ? "CAMPUS SITUATIONAL INTELLIGENCE GRAPH" : "CAMPUS GEOINT & BIM MAP"}
                </span>

                {/* View Mode Toggle Switcher */}
                <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => setCanvasViewMode("GRAPH")}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold transition ${
                      canvasViewMode === "GRAPH"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Network className="h-3 w-3" />
                    <span>Graph</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasViewMode("HEATMAP")}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold transition ${
                      canvasViewMode === "HEATMAP"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <MapPin className="h-3 w-3 text-rose-400" />
                    <span>GEOINT Map</span>
                  </button>
                </div>

                {selectedNodeId && canvasViewMode === "GRAPH" && (
                  <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[11px] text-cyan-300 font-semibold truncate max-w-[140px] hidden sm:inline">
                    LOCKED: {selectedNodeId}
                  </span>
                )}
              </div>

              {/* Tactical Drawer Triggers & Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsUplinkDrawerOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2 py-1 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400 hover:text-white transition shadow-sm"
                  title="Open Campus Evidence Uplink Drawer"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>+ Uplink</span>
                </button>

                {/* Counselor HITL Queue Button */}
                <button
                  type="button"
                  onClick={() => setIsHitlDrawerOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-950/60 px-2 py-1 font-mono text-xs font-bold text-rose-300 hover:bg-rose-900/80 hover:border-rose-400 hover:text-white transition shadow-sm relative"
                  title="Open Counselor Human-in-the-Loop (HITL) Review Queue"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>HITL</span>
                  {pendingHitlCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse">
                      {pendingHitlCount}
                    </span>
                  )}
                </button>

                {/* Codon JIT Micro-Settlement & FinOps Receipts */}
                <button
                  type="button"
                  onClick={() => setIsReceiptsDrawerOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2 py-1 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400 hover:text-white transition shadow-sm"
                  title="Inspect Codon JIT Micro-Settlement & FinOps Invariant Ledger"
                >
                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Receipts</span>
                </button>

                {/* Progressive Disclosure Popover: Calibration & Admin Overflow Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCalibrationMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 font-mono text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition shadow-sm"
                    title="Calibration, Lexicon & System Administration Tools"
                  >
                    <Sliders className="h-3.5 w-3.5 text-slate-400" />
                    <span>Setup &amp; Admin</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>

                  {isCalibrationMenuOpen && (
                    <div
                      className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-700 bg-[#070c18] p-1.5 shadow-2xl z-40 font-mono text-xs animate-in fade-in zoom-in-95 duration-100"
                      onClick={() => setIsCalibrationMenuOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={handleResetDemoState}
                        disabled={isResettingDemo}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-amber-300 hover:bg-amber-950/40 transition"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isResettingDemo ? "animate-spin" : ""}`} />
                        <span>Reset Demo Seeds</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDictionaryDrawerOpen(true)}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-purple-300 hover:bg-purple-950/40 transition"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Vernacular Lexicon</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDirectoryModalTab("CAMPUSES");
                          setIsDirectoryModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-cyan-300 hover:bg-cyan-950/40 transition"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Institutional Directory</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsOSINTDrawerOpen(true)}
                        disabled={!hasPermission("MANAGE_OSINT")}
                        className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition ${
                          hasPermission("MANAGE_OSINT")
                            ? "text-cyan-300 hover:bg-cyan-950/40"
                            : "text-slate-500 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>OSINT Engine Controller</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPolemicDrawerOpen(true)}
                        disabled={!hasPermission("MANAGE_OSINT")}
                        className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition ${
                          hasPermission("MANAGE_OSINT")
                            ? "text-rose-300 hover:bg-rose-950/40"
                            : "text-slate-500 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Polemic Red-Team Admin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Canvas Severity Filter Toolbar */}

            <div className="flex items-center justify-between border-b border-slate-800/60 bg-[#080d19] px-3.5 py-1.5 font-mono text-xs">

              <div className="flex items-center gap-2">

                <span className="text-[11px] text-slate-400 font-semibold tracking-wider">SEVERITY FILTER:</span>

                <div className="flex items-center gap-1">

                  {[1, 2, 3, 4, 5].map((tier) => (

                    <button

                      key={tier}

                      onClick={() => setFilterMinSeverity(tier)}

                      className={`rounded px-2 py-0.5 text-[11px] font-bold transition ${

                        filterMinSeverity === tier

                          ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"

                          : "bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700"

                      }`}

                    >

                      T{tier}

                    </button>

                  ))}

                  {filterMinSeverity > 1 && (

                    <button

                      onClick={() => setFilterMinSeverity(1)}

                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline ml-2"

                    >

                      Clear Filter

                    </button>

                  )}

                </div>

              </div>

              <div className="text-[11px] text-slate-400">

                <span>Active Topology: <strong className="text-cyan-300">{activeTopologySummary.activeNodes}</strong> / {elements.length} nodes</span>

              </div>

            </div>

            {/* Canvas Viewport */}

            <div id="cytoscape-radar-container" className={`relative ${canvasViewMode === "HEATMAP" ? "h-[640px]" : "h-[440px]"} bg-[radial-gradient(#152238_1px,transparent_1px)] [background-size:20px_20px]`}>

              {canvasViewMode === "GRAPH" ? (

                <>

                  <GraphCanvas

                    elements={elements}

                    onNodeSelect={handleGraphNodeSelect}

                    onOpenDossier={handleOpenDossierForNode}
                    onFocusMap={(nodeId) => {
                      const target = resolveIncidentFromNode(nodeId) || incidents.find((i) => i.id === nodeId);
                      const targetId = target ? target.id : nodeId;
                      setSelectedNodeId(targetId);
                      const nLower = (nodeId || "").toLowerCase();
                      if (nLower.includes("kuching") || nLower === "school-smk-kuching-high") {
                        setCurrentTenant("smk-kuching-high");
                      } else if (nLower.includes("seksyen-9") || nLower === "school-smk-seksyen-9") {
                        setCurrentTenant("smk-seksyen-9");
                      } else if (nLower.includes("seksyen-11") || nLower === "school-smk-seksyen-11") {
                        setCurrentTenant("smk-seksyen-11");
                      } else if (target) {
                        const targetSchool = (target.schoolName || "").toLowerCase();
                        const tid = (target.tenant_id || "").toLowerCase();
                        const zId = (target.matched_zone_id || "").toUpperCase();
                        if (targetSchool.includes("kuching") || tid === "smk-kuching-high") {
                          setCurrentTenant("smk-kuching-high");
                        } else if (targetSchool.includes("9") || tid === "smk-seksyen-9" || zId.includes("SK9") || zId.includes("BLOK_C") || target.id === "incident-fight") {
                          setCurrentTenant("smk-seksyen-9");
                        } else {
                          setCurrentTenant("smk-seksyen-11");
                        }
                      }
                      setCanvasViewMode("HEATMAP");
                      setLatestVerdict({
                        text: `GEOINT Map locked onto incident: ${targetId}`,
                        type: "passed",
                      });
                    }}
                    selectedNodeId={selectedNodeId}

                    focusTrigger={focusTrigger}

                    filterMinSeverity={filterMinSeverity}

                    timelineAllowedIds={timelineAllowedIds}

                    isFullscreen={isBattlespaceFullscreen}

                    onToggleFullscreen={() => setIsBattlespaceFullscreen(true)}

                  />

                  {/* HUD Crosshairs in Corners */}

                  <div className="absolute top-2.5 left-3 pointer-events-none text-slate-500 font-mono text-xs">

                    ┌ TOP_LEFT_SCAN

                  </div>

                  <div className="absolute bottom-2.5 right-3 pointer-events-none text-slate-500 font-mono text-xs">

                    BOTTOM_RIGHT_GRID ┘

                  </div>

                </>

              ) : (

                <TacticalHeatmapView
                  onOpenDossier={handleOpenDossierForNode}
                  onFocusOnGraph={(nodeId) => {
                    setCanvasViewMode("GRAPH");
                    setSelectedNodeId(nodeId);
                    setFocusTrigger((prev) => prev + 1);
                  }}
                  onDispatchAlert={(incId) => {
                    const target = incidents.find((i) => i.id === incId);
                    if (target) {
                      setSelectedIncidentForModal(target);
                      setIsDispatchConfirmOpen(true);
                    }
                  }}
                />

              )}

            </div>

          </div>

          {/* Left-of-Bang Chronology & Temporal Scrubbing Timeline Bar (Only for Graph Mode) */}

          {canvasViewMode === "GRAPH" && <LeftOfBangTimelineBar />}

          {/* B. Teltonika RMS-Style Progressive Disclosure Incident Ledger */}

          <div className="rounded-lg border border-slate-800 bg-[#060a12] shadow-xl overflow-hidden flex flex-col">

            {/* Table Header & Summary */}

            <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#090f1d] px-4 py-2.5">

              <div className="flex items-center gap-2.5">

                <Radio className="h-4 w-4 text-rose-400" />

                <span className="font-mono text-sm font-bold tracking-wider text-slate-100">

                  INCIDENT TELEMETRY LEDGER

                </span>

                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 font-mono text-xs text-slate-300">

                  {visibleIncidents.length} signals

                </span>

              </div>

              <span className="font-mono text-xs text-cyan-400">

                Click &quot;Open Dossier&quot; to inspect full forensic report

              </span>

            </div>

            {/* High-Density Data Matrix (Teltonika RMS Style, Readable on 32\" Display) */}

            <div className="overflow-x-auto max-h-[260px] overflow-y-auto">

              <table className="w-full text-left font-mono">

                <thead className="sticky top-0 bg-[#0b1322] border-b border-slate-800 text-xs uppercase tracking-wider text-slate-300">

                  <tr>

                    <th className="px-4 py-2.5">DEFCON</th>

                    <th className="px-4 py-2.5">CAMPUS TARGET</th>

                    <th className="px-4 py-2.5">DIALECT VECTOR</th>

                    <th className="px-4 py-2.5">SENTINEL GUARD</th>

                    <th className="px-4 py-2.5">TIMESTAMP</th>

                    <th className="px-4 py-2.5 text-right">ACTION</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-850 text-sm">

                  {visibleIncidents.map((incident) => {

                    const isSelected = selectedNodeId === incident.id;

                    return (

                      <tr

                        key={incident.id}

                        onClick={() => { handleGraphNodeSelect(incident.id); setSelectedIncidentForModal(incident); }}

                        className={`cursor-pointer transition hover:bg-slate-800/60 ${

                          isSelected ? "bg-cyan-950/40 border-l-4 border-cyan-400" : ""

                        }`}

                      >

                        {/* Threat Tier Badge */}

                        <td className="px-4 py-2.5 whitespace-nowrap">

                          <span

                            className={`rounded px-2.5 py-1 text-xs font-bold ${

                              incident.severityTier >= 5

                                ? "bg-rose-500/25 text-rose-300 border border-rose-500/50"

                                : incident.severityTier >= 4

                                ? "bg-amber-500/25 text-amber-300 border border-amber-500/50"

                                : "bg-cyan-500/25 text-cyan-300 border border-cyan-500/50"

                            }`}

                          >

                            T{incident.severityTier} // {incident.severityTier >= 5 ? "LETHAL" : incident.severityTier >= 4 ? "SEVERE" : "ALERT"}

                          </span>

                        </td>

                        {/* School Name */}

                        <td className="px-4 py-2.5 font-bold text-slate-100 whitespace-nowrap">

                          {incident.schoolName}

                        </td>

                        {/* Slang Tags */}

                        <td className="px-4 py-2.5 text-slate-300">

                          <div className="flex gap-1.5 flex-wrap">

                            {incident.slangTags.slice(0, 2).map((tag, idx) => (

                              <span

                                key={idx}

                                className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200 border border-slate-700"

                              >

                                #{tag}

                              </span>

                            ))}

                          </div>

                        </td>

                        {/* Sentinel Guard Score */}

                        <td className="px-4 py-2.5 whitespace-nowrap">

                          <span className="font-bold text-emerald-400 text-sm">

                            {Math.round((incident.jevVerdict?.noulDangerScore || 0) * 100)}%

                          </span>

                          <span className="text-xs text-slate-400 ml-1">invariant</span>

                        </td>

                        {/* Timestamp */}

                        <td className="px-4 py-2.5 text-slate-300 text-xs whitespace-nowrap">

                          {incident.timestamp}

                        </td>

                        {/* Action Button - Prominent & Directly Interactive */}

                        <td className="px-4 py-2.5 text-right whitespace-nowrap">

                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNodeId(incident.id);
                                const targetSchool = incident.schoolName?.toLowerCase() || "";
                                if (targetSchool.includes("kuching") || incident.tenant_id === "smk-kuching-high") {
                                  setCurrentTenant("smk-kuching-high");
                                } else if (targetSchool.includes("9") || incident.tenant_id === "smk-seksyen-9") {
                                  setCurrentTenant("smk-seksyen-9");
                                } else if (targetSchool.includes("11") || incident.tenant_id === "smk-seksyen-11") {
                                  setCurrentTenant("smk-seksyen-11");
                                }
                                setCanvasViewMode("HEATMAP");
                                setLatestVerdict({
                                  text: `GEOINT Map locked onto incident: ${incident.id}`,
                                  type: "passed",
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-950/60 px-2 py-1 font-mono text-xs font-bold text-rose-300 shadow-sm transition hover:bg-rose-900/80 hover:border-rose-400 hover:text-white"
                              title="Focus incident on Campus GEOINT & BIM Blueprint Map"
                            >
                              <MapPin className="h-3 w-3 text-rose-400" />
                              <span>Focus Map</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCanvasViewMode("GRAPH");
                                handleGraphNodeSelect(incident.id);
                                setFocusTrigger((prev) => prev + 1);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/50 bg-cyan-950/60 px-2 py-1 font-mono text-xs font-bold text-cyan-300 shadow-sm transition hover:bg-cyan-900/80 hover:border-cyan-400 hover:text-white"
                              title="Focus node in Knowledge Graph Canvas"
                            >
                              <Network className="h-3 w-3 text-cyan-400" />
                              <span>Focus Graph</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGraphNodeSelect(incident.id);
                                setSelectedIncidentForModal(incident);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-purple-500/50 bg-purple-950/60 px-2.5 py-1 font-mono text-xs font-bold text-purple-300 shadow-sm transition hover:bg-purple-900/80 hover:border-purple-400 hover:text-white"
                              title="Open full statutory Section 90A forensic dossier"
                            >
                              <Eye className="h-3 w-3 text-purple-400" />
                              <span>Dossier</span>
                            </button>
                          </div>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

            {/* Ledger Footer Status & Evidence Ingest Link (Consolidated with Evidence Uplink Drawer) */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-[#080e1a] px-4 py-2.5 font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Showing {visibleIncidents.length} active multi-INT campus incident records</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUplinkDrawerOpen(true)}
                className="flex items-center gap-1.5 rounded bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 hover:text-white transition shadow-sm"
                title="Open Campus Evidence Uplink Drawer to ingest video, images, or whistleblower text"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>+ Ingest Evidence via Uplink Drawer &raquo;</span>
              </button>
            </div>

          </div>

        </div>

        {/* Docked Sentinel-1 Terminal Column (Visible only when operator pins/docks Copilot) */}
        {isCopilotDocked && (
          <div className="lg:col-span-4 flex flex-col gap-3 animate-in fade-in duration-200">
            {renderCopilotTerminalContent(false)}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2.5. Sentinel-1 Slide-Over Assistant Drawer (Progressive Disclosure) */}
      {/* ========================================================================= */}
      {isCopilotDrawerOpen && !isCopilotDocked && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCopilotDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
            <div className="w-screen max-w-xl pointer-events-auto border-l border-cyan-800/60 bg-[#070c18] p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              {renderCopilotTerminalContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}

      {/* 3. Teltonika RMS-Style Progressive Disclosure Modal Dialog */}

      {/* ========================================================================= */}

      {/* Evidence Act 1950 Sec 90A Forensic Intelligence Dossier & Dual-Auth Dispatch */}

      <EvidenceDossierModal

        incident={selectedIncidentForModal}

        isOpen={!!selectedIncidentForModal}

        onClose={() => {

          setSelectedIncidentForModal(null);

          setSelectedEvidenceNode(null);

        }}

        graphElements={elements}

        onOpenReceipts={() => setIsReceiptsDrawerOpen(true)}

      />

      {/* ========================================================================= */}

      {/* 4. Full Battlespace Theater Mode (100% Fullscreen Viewport) */}

      {/* ========================================================================= */}

      {isBattlespaceFullscreen && (

        <div className="fixed inset-0 z-50 flex flex-col bg-[#060a12] p-4 gap-3 animate-in fade-in duration-150">

          {/* Top Fullscreen HUD Header */}

          <div className="flex flex-wrap items-center justify-between border-b border-cyan-800/50 bg-[#090f1d] px-5 py-3 rounded-lg font-mono text-sm shadow-xl">

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 text-cyan-400">

                <Network className="h-5 w-5 animate-pulse" />

                <span className="font-bold text-base tracking-wider text-slate-100">

                  CAMPUS SITUATIONAL INTELLIGENCE // THEATER VIEW

                </span>

              </div>

              <span className="text-slate-600">|</span>

              <span className="text-slate-300 text-xs">

                COORD: 03°08&apos;20&quot;N 101°41&apos;15&quot;E

              </span>

              {selectedNodeId && (

                <div className="flex items-center gap-2">

                  <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-xs text-cyan-300 font-semibold font-mono">

                    FOCUSED: {selectedNodeId}

                  </span>

                  <button

                    type="button"

                    onClick={() => handleOpenDossierForNode(selectedNodeId)}

                    className="rounded bg-rose-600/30 hover:bg-rose-500/50 border border-rose-500/60 px-2.5 py-0.5 text-xs text-rose-200 font-semibold flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer font-mono"

                    title="Open full statutory Section 90A evidence dossier for this node"

                  >

                    <FileText className="h-3.5 w-3.5" />

                    <span>Dossier Sec 90A</span>

                  </button>

                </div>

              )}

            </div>

            <div className="flex items-center gap-3">

              {/* Severity Tier Filters */}

              <div className="flex items-center gap-1.5">

                <span className="text-xs text-slate-400 font-semibold">SEVERITY FILTER:</span>

                {[1, 2, 3, 4, 5].map((tier) => (

                  <button

                    key={tier}

                    onClick={() => setFilterMinSeverity(tier)}

                    className={`rounded px-2.5 py-1 text-xs font-bold transition ${

                      filterMinSeverity === tier

                        ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"

                        : "bg-slate-800 text-slate-300 hover:text-white"

                    }`}

                  >

                    T{tier}

                  </button>

                ))}

                {filterMinSeverity > 1 && (

                  <button

                    type="button"

                    onClick={() => setFilterMinSeverity(1)}

                    className="text-xs text-cyan-400 hover:text-cyan-300 underline ml-1.5 font-mono"

                  >

                    Clear Filter

                  </button>

                )}

                <span className="text-xs text-slate-400 ml-2 border-l border-slate-700 pl-2">

                  Active: <strong className="text-cyan-300">{activeTopologySummary.activeNodes}</strong> / {elements.length} nodes

                </span>

              </div>

              <button

                type="button"

                onClick={() => {

                  setSelectedNodeId(null);

                  setFocusTrigger((f) => f + 1);

                }}

                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"

              >

                <span>Reset View (Fit All)</span>

              </button>

              <button

                type="button"

                onClick={() => setIsBattlespaceFullscreen(false)}

                className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white transition shadow-sm"

              >

                <X className="h-4 w-4" />

                <span>Exit Theater (Esc)</span>

              </button>

            </div>

          </div>

          {/* Fullscreen Canvas Viewport */}

          <div className="flex-1 w-full rounded-xl border border-cyan-900/40 bg-[#070b14] overflow-hidden shadow-2xl relative min-h-[500px]">

            <GraphCanvas

              elements={elements}

              onNodeSelect={handleGraphNodeSelect}

              onOpenDossier={handleOpenDossierForNode}
              onFocusMap={(nodeId) => {
                setIsBattlespaceFullscreen(false);
                const target = resolveIncidentFromNode(nodeId) || incidents.find((i) => i.id === nodeId);
                const targetId = target ? target.id : nodeId;
                setSelectedNodeId(targetId);
                const nLower = (nodeId || "").toLowerCase();
                if (nLower.includes("kuching") || nLower === "school-smk-kuching-high") {
                  setCurrentTenant("smk-kuching-high");
                } else if (nLower.includes("seksyen-9") || nLower === "school-smk-seksyen-9") {
                  setCurrentTenant("smk-seksyen-9");
                } else if (nLower.includes("seksyen-11") || nLower === "school-smk-seksyen-11") {
                  setCurrentTenant("smk-seksyen-11");
                } else if (target) {
                  const targetSchool = (target.schoolName || "").toLowerCase();
                  const tid = (target.tenant_id || "").toLowerCase();
                  const zId = (target.matched_zone_id || "").toUpperCase();
                  if (targetSchool.includes("kuching") || tid === "smk-kuching-high") {
                    setCurrentTenant("smk-kuching-high");
                  } else if (targetSchool.includes("9") || tid === "smk-seksyen-9" || zId.includes("SK9") || zId.includes("BLOK_C") || target.id === "incident-fight") {
                    setCurrentTenant("smk-seksyen-9");
                  } else {
                    setCurrentTenant("smk-seksyen-11");
                  }
                }
                setCanvasViewMode("HEATMAP");
                setLatestVerdict({
                  text: `GEOINT Map locked onto incident: ${targetId}`,
                  type: "passed",
                });
              }}
              selectedNodeId={selectedNodeId}

              focusTrigger={focusTrigger}

              filterMinSeverity={filterMinSeverity}

              timelineAllowedIds={timelineAllowedIds}

              isFullscreen={true}

              onToggleFullscreen={() => setIsBattlespaceFullscreen(false)}

            />

          </div>

          {/* Fullscreen Left-of-Bang Timeline Bar HUD */}

          <div className="shrink-0 rounded-lg border border-cyan-800/40 bg-[#090f1d] px-3 py-1.5 shadow-xl">

            <LeftOfBangTimelineBar />

          </div>

        </div>

      )}

      {/* ========================================================================= */}

      {/* 5. Palantir Maven Tactical Evidence Uplink Drawer (Slide-Over) */}

      {/* ========================================================================= */}

      {isUplinkDrawerOpen && (

        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">

          <div

            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"

            onClick={() => !isUplinkSubmitting && setIsUplinkDrawerOpen(false)}

          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">

            <div className="w-screen max-w-lg pointer-events-auto border-l border-cyan-800/60 bg-[#070c18] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">

              <div className="space-y-5">

                {/* Header */}

                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4">

                  <div className="flex items-center gap-2.5">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">

                      <UploadCloud className="h-5 w-5" />

                    </div>

                    <div>

                      <h3 className="font-mono text-sm font-bold text-slate-100 tracking-wider">

                        CAMPUS EVIDENCE UPLINK

                      </h3>

                      <p className="font-mono text-xs text-emerald-400">

                        CAMPUS SENSOR-TO-RADAR PIPELINE

                      </p>

                    </div>

                  </div>

                  <button

                    type="button"

                    disabled={isUplinkSubmitting}

                    onClick={() => {
                      setIsUplinkDrawerOpen(false);
                      setWhatsappDispatchResult(null);
                    }}

                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"

                  >

                    <X className="h-5 w-5" />

                  </button>

                </div>

                {/* Mode Selector Tabs */}

                <div className="flex rounded-lg bg-[#040810] p-1 border border-slate-800 text-xs font-mono">

                  <button

                    type="button"

                    onClick={() => { setUplinkType("screenshot"); setUplinkFile(null); setWhatsappDispatchResult(null); }}

                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 ${

                      uplinkType === "screenshot" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"

                    }`}

                  >

                    <FileImage className="h-3.5 w-3.5" />

                    <span>Screenshot OCR</span>

                  </button>

                  <button

                    type="button"

                    onClick={() => { setUplinkType("video"); setUplinkFile(null); setUplinkAlias("Whistleblower_Video_Witness"); setWhatsappDispatchResult(null); }}

                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 ${

                      uplinkType === "video" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"

                    }`}

                  >

                    <Video className="h-3.5 w-3.5" />

                    <span>Mobile Video</span>

                  </button>

                  <button
                    type="button"
                    onClick={() => { setUplinkType("text"); setUplinkFile(null); setUplinkAlias("Field_Patrol_Warden"); setWhatsappDispatchResult(null); }}
                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 ${
                      uplinkType === "text" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Field Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUplinkType("whatsapp"); setUplinkFile(null); setUplinkAlias("WHISTLEBLOWER_ANON"); setWhatsappDispatchResult(null); }}
                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 ${
                      uplinkType === "whatsapp" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>WhatsApp 24/7</span>
                  </button>
                </div>

                {/* File Upload Dropzone (for screenshot or video) */}
                {uplinkType === "screenshot" || uplinkType === "video" ? (

                  <div className="space-y-2">

                    <label className="block font-mono text-xs font-bold text-slate-300">

                      {uplinkType === "screenshot" ? "WhatsApp Screenshot File (Max 5MB)" : "Smartphone Recording or Video File (.mp4, .mov)"}

                    </label>

                    <div

                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${

                        uplinkFile

                          ? "border-emerald-500/60 bg-emerald-950/20"

                          : "border-cyan-800/50 bg-[#091122]/60 hover:border-cyan-500/60"

                      }`}

                    >

                      <input

                        type="file"

                        accept={uplinkType === "screenshot" ? "image/png,image/jpeg,image/jpg" : "video/mp4,video/quicktime,video/webm"}

                        onChange={(e) => {

                          if (e.target.files && e.target.files[0]) {

                            setUplinkFile(e.target.files[0]);

                          }

                        }}

                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"

                      />

                      {uplinkFile ? (

                        <div className="flex flex-col items-center gap-2 text-xs font-mono">

                          <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-bounce" />

                          <span className="font-bold text-emerald-300 text-sm">{uplinkFile.name}</span>

                          <span className="text-slate-400">({(uplinkFile.size / (1024 * 1024)).toFixed(2)} MB) - Ready for Ingest</span>

                          <span className="text-[11px] text-cyan-400 underline mt-1">Click to replace file</span>

                        </div>

                      ) : (

                        <div className="flex flex-col items-center gap-2 text-xs font-mono text-slate-400">

                          <UploadCloud className="h-8 w-8 text-cyan-400" />

                          <span className="text-slate-200 font-semibold text-sm">
                            {uplinkType === "screenshot"
                              ? "Drag & drop or browse WhatsApp screenshot"
                              : "Drag & drop or browse smartphone witness recording"}
                          </span>

                          <span>{uplinkType === "screenshot" ? "PNG, JPG accepted • EXIF stripped" : "MP4, MOV accepted • Mobile Video Witness"}</span>

                        </div>

                      )}

                    </div>

                    {uplinkType === "video" && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-slate-800" />
                          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                            or direct video URL (Telegram / Cloud / TikTok)
                          </span>
                          <div className="h-px flex-1 bg-slate-800" />
                        </div>
                        <input
                          type="url"
                          value={uplinkVideoUrl}
                          onChange={(e) => setUplinkVideoUrl(e.target.value)}
                          placeholder="https://t.me/whistleblower_bot/video_884.mp4"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    )}

                  </div>

                ) : uplinkType === "whatsapp" ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4" />
                        AUTONOMOUS WHATSAPP SENTRY
                      </span>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                        Zero-Dashboard 24/7 Loop
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-300 font-bold">Whistleblower Mobile Number</label>
                        <span className="text-[10px] text-emerald-400">Child Act 2001 SHA-256 Salted</span>
                      </div>
                      <input
                        type="text"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        placeholder="+6012-3456789"
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">WhatsApp Student Message</label>
                      <textarea
                        rows={3}
                        value={uplinkText}
                        onChange={(e) => setUplinkText(e.target.value)}
                        placeholder="e.g. Budak form 4 standby bawa parang nak belasah budak batch bawah petang ni kat pondok basikal."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Quick Simulation Presets:</span>
                      <div className="grid grid-cols-1 gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappDispatchResult(null);
                            setUplinkText("Budak form 4 standby bawa parang nak belasah budak batch bawah petang ni kat pondok basikal.");
                            setUplinkSchool("SMK Seksyen 11 Shah Alam");
                            setUplinkMetadata({ tenant_id: "smk-seksyen-11", counselor_approved: true });
                          }}
                          className="text-left px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 truncate transition"
                        >
                          🗡️ T5 Weapon: "Bawa parang nak belasah kat pondok basikal" (SMK 11)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappDispatchResult(null);
                            setUplinkText("Kamek nanggar nembiak form 4 embak parang barung nak tetak budak batch sia kat pagar belakang lorong Jalan Mathies.");
                            setUplinkSchool("SMK Kuching High (Sarawak)");
                            setUplinkMetadata({ tenant_id: "smk-kuching-high", include_news_osint: true, counselor_approved: true });
                          }}
                          className="text-left px-2.5 py-1.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 truncate font-semibold transition"
                        >
                          ⚡ T5 Kuching: Sarawak Dialect + Advanced Tavily Press OSINT
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappDispatchResult(null);
                            setUplinkText("Senior tahan budak junior mintak pau duit RM50 dalam tandas Blok C.");
                            setUplinkSchool("SMK Seksyen 11 Shah Alam");
                            setUplinkMetadata({ tenant_id: "smk-seksyen-11", counselor_approved: true });
                          }}
                          className="text-left px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 truncate transition"
                        >
                          ⚠️ T2 Extortion: "Senior mintak pau duit RM50 tandas Blok C" (SMK 11)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappDispatchResult(null);
                            const isKuching = currentTenant === "smk-kuching-high";
                            setUplinkText("Budak form 4 bawa parang nak bergaduh kat padang.");
                            setUplinkSchool(isKuching ? "SMK Kuching High (Sarawak)" : "SMK Seksyen 11 Shah Alam");
                            setUplinkMetadata({
                              tenant_id: isKuching ? "smk-kuching-high" : "smk-seksyen-11",
                              current_tier: "LOW",
                              force_fsm_veto: true,
                              illegal_state_jump: true,
                              previous_tier: "TIER_1_LOW",
                              target_tier: "TIER_3_CRITICAL",
                              counselor_approved: false,
                            });
                          }}
                          className="text-left px-2.5 py-1.5 rounded bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-600/60 truncate font-semibold transition"
                        >
                          🚫 FSM Invariant Veto: Illegal State Jump (Triggers HITL: 1)
                        </button>
                      </div>
                    </div>

                    {/* Live Mobile Outbound Dispatch / HITL Veto Card (shown after webhook execution) */}
                    {whatsappDispatchResult && (
                      <div className={`mt-3 p-3 rounded-xl border space-y-2 ${
                        whatsappDispatchResult.triage_result?.jev_passed === false || whatsappDispatchResult.jev_passed === false
                          ? "border-amber-500/60 bg-[#1a1105]"
                          : "border-emerald-500/50 bg-[#061812]"
                      }`}>
                        <div className="flex items-center justify-between text-[11px]">
                          {whatsappDispatchResult.triage_result?.jev_passed === false || whatsappDispatchResult.jev_passed === false ? (
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                              SHACL-GOV-01 / FSM INVARIANT VETO — QUARANTINED TO HITL: 1
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              AUTONOMOUS DISPATCH DELIVERED
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-slate-400">
                            {whatsappDispatchResult.outbound_p1_alert?.status || "LIVE_SENTIASA_LOOP"}
                          </span>
                        </div>

                        {/* Inbound Anonymized Receipt */}
                        <div className="p-2 rounded bg-black/40 border border-emerald-900/60 text-[11px]">
                          <div className="text-slate-400 text-[10px]">INBOUND WHISTLEBLOWER (Child Act 2001 Scrubbed):</div>
                          <div className="font-bold text-slate-200">{whatsappDispatchResult.inbound_humint?.anonymized_alias}</div>
                          <div className="text-slate-400 truncate mt-0.5">{uplinkText || "Signal received via WhatsApp Webhook"}</div>
                        </div>

                        {/* Outbound Warden Push Alert or HITL Quarantine Notice */}
                        {whatsappDispatchResult.outbound_p1_alert && (
                          <div className={`p-2.5 rounded border text-[11px] space-y-1.5 ${
                            whatsappDispatchResult.triage_result?.jev_passed === false || whatsappDispatchResult.jev_passed === false
                              ? "bg-amber-950/60 border-amber-600/60"
                              : "bg-emerald-950/70 border-emerald-600/60"
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-200">
                                {whatsappDispatchResult.triage_result?.jev_passed === false || whatsappDispatchResult.jev_passed === false
                                  ? "SHACL GATEKEEPER VETO RECEIPT:"
                                  : "OUTBOUND P1 TO DUTY WARDEN:"}
                              </span>
                              <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-800">
                                {whatsappDispatchResult.outbound_p1_alert.alert_tier}
                              </span>
                            </div>
                            <pre className="text-[10px] whitespace-pre-wrap text-emerald-300 font-mono bg-black/50 p-2 rounded max-h-36 overflow-y-auto">
                              {whatsappDispatchResult.outbound_p1_alert.message}
                            </pre>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const tr = whatsappDispatchResult.triage_result || {};
                                  const tid = tr.incident_id || tr.threat_event?.event_id;
                                  const direct = tid ? incidents.find(i => i.id === tid) : null;
                                  if (direct) {
                                    setSelectedIncidentForModal(direct);
                                  } else {
                                    const rawTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' MYT';
                                    const rawCits = (Array.isArray(tr.osint_evidence) && tr.osint_evidence.length > 0)
                                      ? tr.osint_evidence
                                      : (tr.external_citations || []);
                                    setSelectedIncidentForModal({
                                      id: tid || 'threat_whatsapp_' + Date.now().toString(36),
                                      severityTier: tr.severity_tier || 5,
                                      timestamp: rawTime,
                                      schoolName: tr.school?.name || uplinkSchool || 'SMK Kuching High (Sarawak)',
                                      contextSummary: tr.threat_event?.context_summary || tr.normalized_text || uplinkText,
                                      slangTags: tr.extracted_slang_tokens || ['parang', 'tetak'],
                                      externalCitations: rawCits,
                                      ilmuCalibration: { dNuance: 1.58, slangFidelity: 1.0, sovereignModel: 'ilmu-nemo-nano', verifiedDialect: 'Sarawak Dialect' },
                                      jevVerdict: { passed: tr.jev_passed, reason: tr.jev_evaluation?.veto_reason },
                                      jev_telemetry: tr.jev_telemetry || { imminent_violence: 0.95, weapon_threat: 0.98, extortion_coercion: 0.1, victim_distress: 0.8 },
                                      tenant_id: tr.tenant_id || currentTenant || 'smk-kuching-high',
                                      osint_custody_hash: tr.osint_custody_hash,
                                      osint_horizon_phase: tr.osint_horizon_phase || 'LEFT_OF_BANG_PRECURSOR',
                                      osint_ai_synthesis: tr.osint_ai_synthesis,
                                      attempt_history: tr.attempt_history,
                                      jit_decision_schema: tr.jit_decision_schema,
                                    });
                                  }
                                  setWhatsappDispatchResult(null);
                                  setIsUplinkDrawerOpen(false);
                                }}
                                className="flex-1 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-[10px] transition"
                              >
                                View Sec 90A Dossier
                              </button>
                              {whatsappDispatchResult.triage_result?.jev_passed === false || whatsappDispatchResult.jev_passed === false ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWhatsappDispatchResult(null);
                                    setIsUplinkDrawerOpen(false);
                                    setIsHitlDrawerOpen(true);
                                  }}
                                  className="flex-1 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] transition"
                                >
                                  Open HITL Review Queue
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isWardenDispatching}
                                  onClick={async () => {
                                    setIsWardenDispatching(true);
                                    try {
                                      const backendBase = getApiBaseUrl();
                                      await fetch(`${backendBase}/api/alerts/dispatch-critical`, {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          "X-Operator-Role": "SUPER_ADMIN",
                                        },
                                        body: JSON.stringify({
                                          incident_id: whatsappDispatchResult.triage_summary?.incident_id,
                                          action_type: "TRIGGER_CAMPUS_DISPATCH",
                                          officer_notes: "Autonomous Warden 1-Tap Mobile Authorization",
                                        }),
                                      });
                                      alert("Emergency Security Dispatch Authorized under SHACL-GOV-01!");
                                    } catch (e: any) {
                                      alert("Dispatch recorded in audit ledger.");
                                    } finally {
                                      setIsWardenDispatching(false);
                                    }
                                  }}
                                  className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition disabled:opacity-50"
                                >
                                  {isWardenDispatching ? "Authorizing..." : "Authorize Dispatch"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block font-mono text-xs font-bold text-slate-300">
                      Raw Intelligence Narrative
                    </label>
                    <textarea
                      rows={4}
                      value={uplinkText}
                      onChange={(e) => setUplinkText(e.target.value)}
                      placeholder="Paste unformatted whistleblower text, dialect messages, or witness account..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Metadata Parameters */}

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">

                  <div>

                    <label className="block text-slate-400 mb-1">Target Campus</label>

                    <input

                      type="text"

                      value={uplinkSchool}

                      onChange={(e) => setUplinkSchool(e.target.value)}

                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"

                    />

                  </div>

                  <div>

                    <label className="block text-slate-400 mb-1">Reporter Alias</label>

                    <input

                      type="text"

                      value={uplinkAlias}

                      onChange={(e) => setUplinkAlias(e.target.value)}

                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"

                    />

                  </div>

                </div>

                {/* Dynamic Pipeline Stage Indicator */}

                {uplinkStage && (

                  <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/30 p-3 font-mono text-xs text-cyan-300 space-y-1">

                    <div className="flex items-center gap-2 font-bold">

                      <Radio className="h-4 w-4 animate-pulse text-cyan-400" />

                      <span>PIPELINE TELEMETRY:</span>

                    </div>

                    <p className="text-slate-300 text-[11px]">{uplinkStage}</p>

                  </div>

                )}

                {/* Error Message */}

                {uplinkError && (

                  <div className="rounded-lg border border-rose-800/60 bg-rose-950/40 p-3 font-mono text-xs text-rose-300 flex items-center gap-2">

                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />

                    <span>{uplinkError}</span>

                  </div>

                )}

              </div>

              {/* Action Button */}

              <div className="pt-4 border-t border-slate-800 mt-6 space-y-2">

                <button

                  type="button"

                  disabled={
                    isUplinkSubmitting ||
                    (uplinkType === "screenshot" && !uplinkFile) ||
                    (uplinkType === "video" && !uplinkFile && !uplinkVideoUrl.trim()) ||
                    (uplinkType === "text" && !uplinkText.trim())
                  }

                  onClick={handleUplinkSubmit}

                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 py-3 font-mono text-xs font-bold text-white shadow-xl hover:from-emerald-500 hover:to-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-2"

                >

                  {isUplinkSubmitting ? (

                    <>

                      <Loader2 className="h-4 w-4 animate-spin" />

                      <span>ENGAGING SENSORY FUSION...</span>

                    </>

                  ) : (

                    <>

                      <Zap className="h-4 w-4 text-amber-300" />

                      <span>ENGAGE SENSORY FUSION & TRIAGE</span>

                    </>

                  )}

                </button>

                <p className="font-mono text-[11px] text-slate-500 text-center">

                  Evidence Act 1950 Sec 90A • SHA-256 Tamper-Evident Ingest Envelope

                </p>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ========================================================================= */}

      {/* 6. Dynamic Vernacular Slang Lexicon & Rule Settings Drawer (Slide-Over) */}

      {/* ========================================================================= */}

      {isDictionaryDrawerOpen && (

        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">

          <div

            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"

            onClick={() => setIsDictionaryDrawerOpen(false)}

          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">

            <div className="w-screen max-w-xl pointer-events-auto border-l border-purple-800/60 bg-[#070b14] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">

              <div className="space-y-4">

                {/* Header */}

                <div className="flex items-center justify-between border-b border-purple-900/40 pb-4">

                  <div className="flex items-center gap-2.5">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">

                      <Sliders className="h-5 w-5" />

                    </div>

                    <div>

                      <h3 className="font-mono text-sm font-bold text-slate-100 tracking-wider">

                        VERNACULAR SLANG LEXICON

                      </h3>

                      <p className="font-mono text-xs text-purple-400">

                        SOVEREIGN DIALECT TRIGGERS &amp; POLYSEMY MARKERS

                      </p>

                    </div>

                  </div>

                  <button

                    type="button"

                    onClick={() => setIsDictionaryDrawerOpen(false)}

                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"

                  >

                    <X className="h-5 w-5" />

                  </button>

                </div>

                {/* Search Filter */}

                <div className="flex gap-2">

                  <div className="relative flex-1">

                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />

                    <input

                      type="text"

                      value={dictionarySearch}

                      onChange={(e) => setDictionarySearch(e.target.value)}

                      placeholder="Search dialect token (e.g. parang, tapau, antam, 砍人)..."

                      className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"

                    />

                  </div>

                </div>

                {/* Cohort Category Pills */}

                <div className="flex flex-wrap gap-1 font-mono text-xs">

                  {["ALL", "Peninsular", "Sexual Assault", "Borneo", "SJKC", "SJKT", "Jawi"].map((cat) => (

                    <button

                      key={cat}

                      type="button"

                      onClick={() => setDictionaryFilter(cat)}

                      className={`rounded px-2.5 py-1 transition ${

                        dictionaryFilter === cat

                          ? "bg-purple-600 text-white font-bold"

                          : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"

                      }`}

                    >

                      {cat}

                    </button>

                  ))}

                </div>

                {/* Scrollable Token List */}

                <div className="h-[280px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">

                  {filteredGlossaryEntries.map(([token, info]: [string, any]) => (

                    <div

                      key={token}

                      className="rounded-lg border border-slate-800 bg-[#090f1d] p-3 font-mono text-xs flex flex-col gap-1 hover:border-purple-500/40 transition"

                    >

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          <span className="font-bold text-sm text-purple-300">#{token}</span>

                          <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[10px] text-slate-300">

                            {info.dialect || "Pan-Malaysian"}

                          </span>

                        </div>

                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${

                          String(info.severityRisk).includes("CRITICAL") || String(info.severityRisk).includes("Tier 3") || String(info.severityRisk).includes("Tier 5")

                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"

                            : String(info.severityRisk).includes("CONTEXT") || String(info.severityRisk).includes("Tier 2")

                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"

                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"

                        }`}>

                          {String(info.severityRisk).split(" - ")[0]}

                        </span>

                      </div>

                      <p className="text-slate-300 text-[11px] leading-relaxed mt-1">

                        {info.meaning}

                      </p>

                    </div>

                  ))}

                  {filteredGlossaryEntries.length === 0 && (

                    <p className="text-xs text-slate-500 font-mono text-center py-8">

                      No dialect tokens found matching &quot;{dictionarySearch}&quot;.

                    </p>

                  )}

                </div>

                {/* Add Custom Dialect Token Form */}

                {hasPermission("REGISTER_SLANG") ? (

                  <div className="rounded-xl border border-purple-900/40 bg-[#0c1222] p-4 space-y-3 font-mono text-xs">

                    <div className="flex items-center justify-between">

                      <span className="font-bold text-purple-300 flex items-center gap-1.5">

                        <Plus className="h-4 w-4" />

                        <span>Add Emerging Slang or Campus Code</span>

                      </span>

                      {tokenAddSuccess && (

                        <span className="text-emerald-400 font-bold flex items-center gap-1">

                          <Check className="h-3.5 w-3.5" /> Registered in Engine!

                        </span>

                      )}

                    </div>

                    <div className="grid grid-cols-2 gap-2">

                      <input

                        type="text"

                        placeholder="Token (e.g. gocoh, rempit, skibidi)"

                        value={newToken}

                        onChange={(e) => setNewToken(e.target.value)}

                        className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"

                      />

                      <select

                        value={newTier}

                        onChange={(e) => setNewTier(e.target.value)}

                        className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100 focus:border-purple-500 focus:outline-none"

                      >

                        <option value="TIER_1_LOW">Tier 1: Low (Benign/Banter)</option>

                        <option value="TIER_2_ELEVATED">Tier 2: Elevated Threat</option>

                        <option value="TIER_3_CRITICAL">Tier 3: Critical Assault/Weapon</option>

                      </select>

                    </div>

                    <input

                      type="text"

                      placeholder="Meaning / Disambiguation Context..."

                      value={newMeaning}

                      onChange={(e) => setNewMeaning(e.target.value)}

                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"

                    />

                    <div className="flex gap-2">

                      <select

                        value={newCategory}

                        onChange={(e) => setNewCategory(e.target.value)}

                        className="flex-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100 focus:border-purple-500 focus:outline-none"

                      >

                        <option value="Peninsular Core">Peninsular Core</option>

                        <option value="Borneo Cohort">Borneo Cohort</option>

                        <option value="Chinese Vernacular">Chinese Vernacular</option>

                        <option value="Tamil Vernacular">Tamil Vernacular</option>

                        <option value="Youth Digital Slang">Youth Digital Slang</option>

                      </select>

                      <button

                        type="button"

                        disabled={isAddingToken || !newToken.trim() || !newMeaning.trim()}

                        onClick={handleAddNewToken}

                        className="rounded bg-purple-600 px-4 py-1.5 font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition"

                      >

                        {isAddingToken ? "Saving..." : "Add Token"}

                      </button>

                    </div>

                  </div>

                ) : (

                  <div className="rounded-xl border border-slate-800 bg-[#0c1222]/60 p-4 space-y-2 font-mono text-xs">

                    <div className="flex items-center gap-2 text-amber-400 font-bold">

                      <Lock className="h-4 w-4" />

                      <span>Slang Calibration Locked</span>

                    </div>

                    <p className="text-slate-400 text-[11px] leading-relaxed">

                      Registering emerging slang tokens is restricted to the <strong className="text-purple-300">SUPER_ADMIN</strong> role. Your current role (<span className="text-cyan-300 font-semibold">{currentRole}</span>) operates in read-only audit mode for sovereign dialect markers.

                    </p>

                  </div>

                )}

              </div>

              <p className="font-mono text-[11px] text-slate-500 text-center pt-3 border-t border-slate-800">

                Syncs dynamically with Python LangGraph Dialect Engine &amp; Firestore Ledger

              </p>

            </div>

          </div>

        </div>

      )}

      {/* ========================================================================= */}

      {/* 7. OSINT Intelligence Settings Drawer (SUPER_ADMIN only) */}

      {/* ========================================================================= */}

      <OSINTSettingsDrawer

        isOpen={isOSINTDrawerOpen}

        onClose={() => setIsOSINTDrawerOpen(false)}

      />

      {/* ========================================================================= */}

      {/* 7b. Polemic Evaluation & Red-Team Control Drawer (SUPER_ADMIN only) */}

      {/* ========================================================================= */}

      <PolemicSettingsDrawer

        isOpen={isPolemicDrawerOpen}

        onClose={() => setIsPolemicDrawerOpen(false)}

      />

      {/* ========================================================================= */}

      {/* 7c. JIT Pipeline Receipts & FinOps Sliding Drawer */}

      {/* ========================================================================= */}

      <PipelineReceiptsDrawer
        isOpen={isReceiptsDrawerOpen}
        incident={selectedIncidentForModal || (selectedNodeId ? incidents.find(i => i.id === selectedNodeId) || null : null)}
        incidents={incidents}
        onSelectIncident={(inc) => setSelectedIncidentForModal(inc)}
        onClose={() => setIsReceiptsDrawerOpen(false)}
        onOpenSec90ADossier={(targetId) => {
          setIsReceiptsDrawerOpen(false);
          if (targetId) {
            handleOpenDossierForNode(targetId);
          } else if (selectedIncidentForModal) {
            // Already set
          } else if (selectedNodeId) {
            handleOpenDossierForNode(selectedNodeId);
          } else if (incidents.length > 0) {
            setSelectedIncidentForModal(incidents[0]);
          }
        }}
      />

      {/* ========================================================================= */}

      {/* 8. Counselor Human-In-The-Loop (HITL) Governance Queue Drawer */}

      {/* ========================================================================= */}

      {isHitlDrawerOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">

          <div className="relative w-full max-w-7xl h-[88vh] rounded-2xl border border-rose-500/40 bg-[#070b14] p-5 shadow-2xl flex flex-col justify-between overflow-hidden">

            {/* Header */}

            <div className="flex items-center justify-between border-b border-rose-900/50 pb-3 mb-3">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-inner">

                  <Scale className="h-5 w-5" />

                </div>

                <div>

                  <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">

                    <span>COUNSELOR HITL GOVERNANCE COCKPIT</span>

                    <span className="rounded bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 text-[10px] font-mono text-rose-300">

                      EVIDENCE ACT SEC 90A

                    </span>

                  </h3>

                  <p className="text-xs text-slate-400 mt-0.5">

                    Quarantined incidents awaiting verified counselor review &amp; signed override.

                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2">

                <Link

                  href="/hitl"

                  target="_blank"

                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center gap-1.5"

                  title="Open Dedicated Full-Page HITL Station"

                >

                  <ExternalLink className="h-3.5 w-3.5" />

                  <span>Open Full Station (/hitl)</span>

                </Link>

                <button

                  type="button"

                  onClick={() => setIsHitlDrawerOpen(false)}

                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"

                >

                  <X className="h-5 w-5" />

                </button>

              </div>

            </div>

            {/* Two-Column Cockpit Body */}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">

              {/* Left/Center: Live Cytoscape Graph Canvas */}

              <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#060a12] p-2.5 shadow-inner min-h-0 h-full">

                <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 mb-2 px-1 gap-2">

                  <div className="flex items-center gap-2">

                    <Network className="h-4 w-4 text-cyan-400" />

                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">

                      QUARANTINED INCIDENT ONTOLOGY TOPOLOGY

                    </span>

                  </div>

                  <div className="flex items-center gap-2.5">

                    {/* Scope Selector: Isolated Ticket Subgraph vs Full Campus */}

                    <div className="flex items-center rounded border border-slate-800 bg-slate-900/90 p-0.5 text-[10px] font-mono">

                      <button

                        type="button"

                        onClick={() => setHitlGraphScope("ISOLATED")}

                        className={`px-2 py-0.5 rounded transition ${

                          hitlGraphScope === "ISOLATED"

                            ? "bg-rose-500/30 text-rose-300 font-bold border border-rose-500/50"

                            : "text-slate-400 hover:text-slate-200"

                        }`}

                        title="Isolate only the nodes connected to this quarantined ticket"

                      >

                        Target Subgraph

                      </button>

                      <button

                        type="button"

                        onClick={() => setHitlGraphScope("CAMPUS")}

                        className={`px-2 py-0.5 rounded transition ${

                          hitlGraphScope === "CAMPUS"

                            ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/50"

                            : "text-slate-400 hover:text-slate-200"

                        }`}

                        title="View complete campus safety graph"

                      >

                        Full Campus

                      </button>

                    </div>

                    {/* Severity Tier Filter (Shown only in Full Campus mode to prevent filtering out target incident) */}
                    {hitlGraphScope === "CAMPUS" && (
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span className="text-slate-400 font-semibold mr-0.5 hidden sm:inline">TIER:</span>
                        {[1, 2, 3, 4, 5].map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setHitlMinSeverity(tier)}
                            className={`rounded px-1.5 py-0.5 font-bold transition ${
                              hitlMinSeverity === tier
                                ? "bg-cyan-500 text-slate-950 font-extrabold"
                                : "bg-slate-800/80 text-slate-300 hover:text-white"
                            }`}
                          >
                            {tier === 1 ? "ALL" : `T${tier}+`}
                          </button>
                        ))}
                      </div>
                    )}

                    {hitlSelectedIncidentId && (

                      <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">

                        FOCUSED: {hitlSelectedIncidentId}

                      </span>

                    )}

                  </div>

                </div>

                <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-800/60 bg-[#03060c]">

                  <GraphCanvas

                    elements={hitlFilteredElements}

                    selectedNodeId={hitlSelectedIncidentId}

                    onNodeSelect={(nodeId) => setHitlSelectedIncidentId(nodeId)}

                    onOpenDossier={handleOpenDossierForNode}

                    filterMinSeverity={hitlMinSeverity}

                  />

                </div>

              </div>

              {/* Right: HitlQueueSection */}

              <div className="lg:col-span-5 flex flex-col min-h-0 h-full overflow-y-auto">

                <HitlQueueSection

                  tenantId={currentTenant}

                  refreshSignal={hitlRefreshCounter}

                  selectedIncidentId={hitlSelectedIncidentId}

                  onResolved={handleHitlResolved}

                  onSelectIncident={(targetId) => {
                    setHitlSelectedIncidentId(targetId);
                    setSelectedNodeId(targetId);
                  }}
                  onOpenDossier={handleOpenDossierForNode}
                  onFocusMap={(targetId) => {
                    setIsHitlDrawerOpen(false);
                    const target = resolveIncidentFromNode(targetId) || incidents.find((i) => i.id === targetId);
                    const effectiveId = target ? target.id : targetId;
                    setSelectedNodeId(effectiveId);
                    const nLower = (targetId || "").toLowerCase();
                    if (nLower.includes("kuching") || nLower === "school-smk-kuching-high") {
                      setCurrentTenant("smk-kuching-high");
                    } else if (nLower.includes("seksyen-9") || nLower === "school-smk-seksyen-9") {
                      setCurrentTenant("smk-seksyen-9");
                    } else if (nLower.includes("seksyen-11") || nLower === "school-smk-seksyen-11") {
                      setCurrentTenant("smk-seksyen-11");
                    } else if (target) {
                      const targetSchool = (target.schoolName || "").toLowerCase();
                      const tid = (target.tenant_id || "").toLowerCase();
                      const zId = (target.matched_zone_id || "").toUpperCase();
                      if (targetSchool.includes("kuching") || tid === "smk-kuching-high") {
                        setCurrentTenant("smk-kuching-high");
                      } else if (targetSchool.includes("9") || tid === "smk-seksyen-9" || zId.includes("SK9") || zId.includes("BLOK_C") || target.id === "incident-fight") {
                        setCurrentTenant("smk-seksyen-9");
                      } else {
                        setCurrentTenant("smk-seksyen-11");
                      }
                    }
                    setCanvasViewMode("HEATMAP");
                    setLatestVerdict({
                      text: `GEOINT Map focused on HITL ticket: ${effectiveId}`,
                      type: "passed",
                    });
                  }}
                />

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}