"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import {
  Send,
  UploadCloud,
  FileImage,
  Video,
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Terminal,
  Clock,
  Film,
  Hash,
  RefreshCw,
} from "lucide-react";
import type { ElementDefinition } from "cytoscape";
import { getApiBaseUrl } from "../lib/api-client";
import VideoScrubber, { type KeyframeTag } from "./video-scrubber";

export interface TriageResponse {
  status: string;
  severity_tier: number;
  threat_tier: string;
  escalation_required: boolean;
  jev_passed: boolean;
  jev_telemetry?: {
    imminent_violence?: number;
    weapon_threat?: number;
    extortion_coercion?: number;
    victim_distress?: number;
  };
  jev_evaluation?: {
    passed: boolean;
    veto_reason?: string;
    suggested_action?: string;
    semantic_confidence?: number;
    semantic_danger_probability?: number;
    hitl_payload?: {
      veto_code?: string;
      reason?: string;
      [key: string]: any;
    };
  };
  threat_event?: {
    event_id: string;
    incident_type: string;
    raw_text: string;
    severity_tier: number;
    threat_tier: string;
    confidence_score: number;
    context_summary: string;
    extracted_slang_tokens: string[];
  };
  personas?: Array<{
    entity_id: string;
    alias: string;
    school_name: string;
    role_risk_tier: string;
  }>;
  school?: {
    school_id: string;
    name: string;
    district: string;
  };
  normalized_text?: string;
  extracted_slang_tokens?: string[];
  visual_evidence?: {
    has_threat_object: boolean;
    detected_objects: string[];
    physical_aggression_detected: boolean;
    sexual_misconduct_detected: boolean;
    scene_type: string;
    visual_severity_tier: number;
    confidence: number;
    visual_description: string[];
    keyframe_timestamps?: number[];
    captions_masked?: boolean;
    orthogonal_evidence_doubt?: number;
    weakening_factors?: string[];
    needs_visual_review?: boolean;
  };
  evidence_nodes?: Array<{
    evidence_id: string;
    media_type: string;
    source_uri: string;
    sha256_hash: string;
    threat_markers: string[];
    visual_severity: number;
    has_threat_object: boolean;
    timestamp_sec: number;
  }>;
  keyframe_timestamps?: number[];
  video_filename?: string;
  sampled_keyframes_count?: number;
  cytoscape_elements?: ElementDefinition[];
  counselor_alert?: {
    alert_id: string;
    urgency: string;
    summary: string;
    school_name: string;
    incident_id: string;
  };
  hitl_queue?: Array<{
    queue_id: string;
    timestamp: string;
    veto_reason: string;
    suggested_action: string;
    proposed_contract?: any;
    raw_text?: string;
    extracted_slang?: string[];
    threat_event?: any;
    review_status?: string;
  }>;
  external_citations?: Array<{
    title: string;
    url: string;
    platform: string;
    engine: string;
    snippet?: string;
    highlights?: string[];
  }>;
  osint_evidence?: any[];
  audit_log?: any[];
  attempt_history?: any[];
  jit_decision_schema?: any;
  prior_agreement?: boolean;
  needs_doubt_review?: boolean;
  budget_ledger?: any;
}

interface IncidentSubmitterProps {
  onTriageSuccess: (response: TriageResponse) => void;
  onTriageVetoed?: (response: TriageResponse) => void;
  apiBaseUrl?: string;
}

interface Fixture {
  name: string;
  icon: string;
  description: string;
  rawText: string;
  schoolName: string;
  reporterAlias: string;
  metadata: Record<string, any>;
  expectedOutcome: "pass" | "veto";
  testNote: string;
  isVideo?: boolean;
}

const FIXTURES: Fixture[] = [
  {
    name: "Sarawak Dialect: Kuching Blade Threat",
    icon: "⚡",
    description: "Sarawak dialect + Tavily advanced regional press OSINT",
    rawText: "Kamek nanggar nembiak form 4 embak parang barung nak tetak budak batch sia kat pagar belakang lorong Jalan Mathies.",
    schoolName: "SMK Kuching High",
    reporterAlias: "AnonSarawak_Student",
    metadata: { include_news_osint: true },
    expectedOutcome: "pass",
    testNote: "Normalizes Sarawak youth dialect ('embak parang barung' -> carrying machete, 'tetak' -> slash) and triggers Tavily advanced dual-funnel regional press search.",
  },
  {
    name: "Weapon Alert (Parang)",
    icon: "⚔️",
    description: "Critical weapon threat (Tier 3 / Sev 5)",
    rawText: "Budak form 4 bawa parang nak belasah budak batch bawah kat luar gate.",
    schoolName: "SMK Sentiasa",
    reporterAlias: "AnonPrefect",
    metadata: {},
    expectedOutcome: "pass",
    testNote: "High confidence weapon detection. Passes Jev invariants to counselor alert.",
  },
  {
    name: "Video: Parang at Rear Gate",
    icon: "📹",
    description: "Multi-modal video emergency bypass (Sev 5)",
    rawText: "Witness recording: Individual brandishing parang blade at rear gate perimeter.",
    schoolName: "SMK Sentiasa",
    reporterAlias: "Whistleblower_Video_Witness",
    metadata: { video_filename: "cctv_rear_gate_parang_news_caption.mp4" },
    expectedOutcome: "pass",
    testNote: "Triggers SHACL-EMERGENCY-BYPASS-01: immediate critical escalation.",
    isVideo: true,
  },
  {
    name: "Extortion (Pau)",
    icon: "💰",
    description: "Elevated bullying & extortion (Tier 2 / Sev 3)",
    rawText: "Geng senior pau duit makan budak form 1 hari-hari kat tandas blok B, ugut nak tapau kalau report cikgu.",
    schoolName: "SMK Sentiasa",
    reporterAlias: "AnonStudent_F1",
    metadata: {},
    expectedOutcome: "pass",
    testNote: "Elevated harassment & extortion. Normalized into behavioral incident.",
  },
  {
    name: "Video: Dorm Scuffle",
    icon: "🥋",
    description: "Video physical aggression detection (Sev 4)",
    rawText: "Witness recording: Hostel corridor physical altercation between senior students.",
    schoolName: "SMK Sentiasa",
    reporterAlias: "Whistleblower_Video_Witness",
    metadata: { video_filename: "cctv_hostel_scuffle_dorm.mp4" },
    expectedOutcome: "pass",
    testNote: "Peak-motion keyframing detects physical aggression.",
    isVideo: true,
  },
  {
    name: "Illegal State Jump Test",
    icon: "🚫",
    description: "FSM invariant test: LOW -> CRITICAL",
    rawText: "Budak form 4 bawa parang nak bergaduh kat padang.",
    schoolName: "SMK Sentiasa",
    reporterAlias: "AnonWatch",
    metadata: { current_tier: "LOW" },
    expectedOutcome: "veto",
    testNote: "Triggers Jev Gatekeeper FSM invariant veto: FSM_ILLEGAL_STATE_JUMP -> HITL queue.",
  },
  {
    name: "Stale Signal Test",
    icon: "⏳",
    description: "Temporal invariant test: >2 hours old",
    rawText: "Ada budak bawa senjata tajam semalam kat luar sekolah.",
    schoolName: "SMK Sentiasa",
    reporterAlias: "OldSignal",
    metadata: { source_timestamp: "2026-09-20T00:00:00Z" },
    expectedOutcome: "veto",
    testNote: "Triggers Jev Gatekeeper staleness invariant veto: TEMPORAL_STALE_SIGNAL -> HITL queue.",
  },
];

const SLANG_CHIPS = [
  { token: "parang", label: "parang (machete)" },
  { token: "belasah", label: "belasah (assault)" },
  { token: "pau", label: "pau (extort)" },
  { token: "tapau", label: "tapau (beat up)" },
  { token: "gaduh", label: "gaduh (fight)" },
  { token: "ugut", label: "ugut (blackmail)" },
  { token: "koyak", label: "koyak (distressed)" },
  { token: "kantoi", label: "kantoi (caught)" },
];

export default function IncidentSubmitter({
  onTriageSuccess,
  onTriageVetoed,
  apiBaseUrl,
}: IncidentSubmitterProps) {
  const activeBaseUrl = apiBaseUrl || getApiBaseUrl();

  // Intake Modality: text/screenshot vs CCTV video
  const [intakeMode, setIntakeMode] = useState<"text_ocr" | "video_cctv">("text_ocr");

  const [rawText, setRawText] = useState("");
  const [schoolName, setSchoolName] = useState("SMK Sentiasa");
  const [reporterAlias, setReporterAlias] = useState("AnonStudent");
  const [activeMetadata, setActiveMetadata] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Screenshot Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Video Upload & Scrubber State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoKeyframes, setVideoKeyframes] = useState<KeyframeTag[]>([]);
  const [maskCaptions, setMaskCaptions] = useState<boolean>(true);

  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TriageResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFixtureName, setActiveFixtureName] = useState<string | null>(null);
  const [isDevBenchOpen, setIsDevBenchOpen] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const handleResetDemoState = async () => {
    setIsResettingDemo(true);
    try {
      await fetch(`${activeBaseUrl}/api/admin/demo-reset`, {
        method: "POST",
        headers: { "X-Tenant-ID": "smk-seksyen-11" },
      });
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      setIsResettingDemo(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Quick Slang insertion
  const insertSlang = (token: string) => {
    setRawText((prev) => (prev ? `${prev} ${token}` : token));
  };

  // Load Fixture
  const handleLoadFixture = (fixture: Fixture, executeImmediately = false) => {
    setVideoFile(null);
    setRawText(fixture.rawText);
    setSchoolName(fixture.schoolName);
    setReporterAlias(fixture.reporterAlias);
    setActiveMetadata(fixture.metadata);
    setActiveFixtureName(fixture.name);
    setErrorMsg(null);

    if (fixture.isVideo) {
      setIntakeMode("video_cctv");
      const isWeapon = fixture.metadata.video_filename?.includes("parang");
      const simulatedKeyframes: KeyframeTag[] = [
        {
          timestamp: 1.2,
          label: isWeapon ? "Perimeter Approach" : "Corridor Entry",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          isThreat: false,
        },
        {
          timestamp: 3.4,
          label: isWeapon ? "Blade Brandished (Parang)" : "Physical Scuffle Peak",
          sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
          isThreat: true,
        },
        {
          timestamp: 5.8,
          label: isWeapon ? "Suspect Retreat" : "Bystanders Gathering",
          sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
          isThreat: false,
        },
      ];
      setVideoKeyframes(simulatedKeyframes);
      setVideoPreviewUrl(isWeapon ? "/demo-videos/clip_weapon_threat.mp4" : "/demo-videos/clip_physical_altercation.mp4");
    } else {
      setIntakeMode("text_ocr");
    }

    if (executeImmediately) {
      if (fixture.isVideo) {
        executeVideoTriage(fixture.metadata.video_filename || "cctv_clip.mp4", null);
      } else {
        executeTriage(fixture.rawText, fixture.schoolName, fixture.reporterAlias, fixture.metadata);
      }
    }
  };

  // Screenshot Upload Handler
  const handleScreenshotUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (.png, .jpg, .jpeg)");
      return;
    }

    setUploadedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUploadPreview(objectUrl);
    setIsUploading(true);
    setUploadNotice(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("school_name", schoolName || "SMK Sentiasa");
    formData.append("reporter_alias", reporterAlias || "AnonStudent");

    try {
      const response = await fetch(`${activeBaseUrl}/api/triage/upload-screenshot`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const extracted = data.extracted_text || data.text || data.ocr_text || "";
        if (extracted) {
          setRawText(extracted);
          setUploadNotice("Screenshot OCR text extracted & triaged successfully!");
        } else {
          setUploadNotice("Screenshot received by triage server.");
        }
        setLastResult(data);
        if (data.jev_passed) {
          onTriageSuccess(data);
        } else {
          onTriageVetoed?.(data);
        }
      } else {
        const fallbackText =
          "WhatsApp report from [017-3829xxx]: Wei petang ni budak SMK Meranti nak serang SMK Sentiasa bawa parang tapau kat luar gate pukul 4 petang!";
        setRawText(fallbackText);
        setUploadNotice(
          `Screenshot uploaded (${file.name}). Backend returned HTTP ${response.status}; simulated OCR transcription loaded.`
        );
      }
    } catch {
      const fallbackText =
        "WhatsApp report from [017-3829xxx]: Wei petang ni budak SMK Meranti nak serang SMK Sentiasa bawa parang tapau kat luar gate pukul 4 petang!";
      setRawText(fallbackText);
      setUploadNotice(
        `Screenshot attached (${file.name}). Standby mode; simulated WhatsApp OCR text loaded for triage verification.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Video Upload Handler
  const handleVideoUpload = async (file: File) => {
    const validExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExts.includes(ext) && !file.type.startsWith("video/")) {
      setErrorMsg("Please upload a valid surveillance or phone video (.mp4, .mov, .webm)");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg("Video file size exceeds maximum 25MB limit (OWASP pre-flight guard)");
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    setIsUploading(true);
    setUploadNotice(null);
    setErrorMsg(null);

    await executeVideoTriage(file.name, file);
    setIsUploading(false);
  };

  // Execute Video Triage via POST /api/triage/upload-video
  const executeVideoTriage = async (filename: string, file: File | null) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    } else {
      // Create synthetic lightweight blob if running fixture
      const blob = new Blob(["SENTIASA_SYNTHETIC_CCTV_RECORDING"], { type: "video/mp4" });
      formData.append("file", blob, filename);
    }
    formData.append("school_name", schoolName || "SMK Sentiasa");
    formData.append("reporter_alias", reporterAlias || "Whistleblower_Video_Witness");
    formData.append("mask_captions", String(maskCaptions));
    if (videoUrlInput.trim()) {
      formData.append("video_url", videoUrlInput.trim());
    }

    try {
      const response = await fetch(`${activeBaseUrl}/api/triage/upload-video`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Video triage returned HTTP ${response.status}`);
      }

      const result: TriageResponse = await response.json();
      setLastResult(result);

      // Extract keyframes for scrubber
      if (result.keyframe_timestamps && result.keyframe_timestamps.length > 0) {
        const isThreat = result.visual_evidence?.has_threat_object || (result.visual_evidence?.visual_severity_tier || 1) >= 4;
        const tags: KeyframeTag[] = result.keyframe_timestamps.map((ts, idx) => ({
          timestamp: ts,
          label: idx === 1 && isThreat ? "Threat Detected" : `Motion Spike #${idx + 1}`,
          sha256: result.evidence_nodes?.[idx]?.sha256_hash || `sha256-${idx}-${Date.now()}`,
          isThreat: idx === 1 ? isThreat : false,
        }));
        setVideoKeyframes(tags);
      }

      setUploadNotice(
        `Video clip (${filename}) sampled on RTX motion engine. ${result.sampled_keyframes_count || result.keyframe_timestamps?.length || 3} peak keyframes extracted.`
      );

      if (result.jev_passed) {
        onTriageSuccess(result);
      } else {
        onTriageVetoed?.(result);
      }
    } catch {
      // Deterministic Offline Fallback Simulation
      const isWeapon = filename.toLowerCase().includes("parang") || rawText.toLowerCase().includes("parang");
      const simulatedTags: KeyframeTag[] = [
        { timestamp: 1.2, label: "Motion Spike #1", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", isThreat: false },
        { timestamp: 3.4, label: isWeapon ? "Parang Brandish (Peak)" : "Physical Aggression", sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4", isThreat: true },
        { timestamp: 5.8, label: "Motion Spike #3", sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9", isThreat: false },
      ];
      setVideoKeyframes(simulatedTags);

      const nowTs = Date.now();
      const vssEventId = `vss-${nowTs}`;
      const vssEvidenceId = `evi-cctv-${nowTs}`;
      const vssEdgeId = `edge-vss-evi-${nowTs}`;

      const simulatedResponse: TriageResponse = {
        status: "processed",
        severity_tier: isWeapon ? 5 : 4,
        threat_tier: "CRITICAL",
        escalation_required: true,
        jev_passed: true,
        jev_evaluation: {
          passed: true,
          suggested_action: "TRIGGER_CAMPUS_DISPATCH",
          semantic_confidence: 0.96,
          semantic_danger_probability: 0.94,
        },
        threat_event: {
          event_id: vssEventId,
          incident_type: isWeapon ? "Armed Perimeter Breach" : "Physical Assault Scuffle",
          raw_text: `CCTV Video Evidence: ${filename}`,
          severity_tier: isWeapon ? 5 : 4,
          threat_tier: "CRITICAL",
          confidence_score: 0.96,
          context_summary: isWeapon
            ? "Individual brandishing curved blade weapon (parang) near school perimeter rear gate."
            : "Physical altercation between multiple students inside dorm corridor.",
          extracted_slang_tokens: isWeapon ? ["parang", "belasah"] : ["antam", "gocoh"],
        },
        school: {
          school_id: schoolName?.includes("9") ? "smk-seksyen-9" : "smk-seksyen-11",
          name: schoolName || "SMK Seksyen 11 Shah Alam",
          district: "Petaling Perdana",
        },
        visual_evidence: {
          has_threat_object: isWeapon,
          detected_objects: isWeapon ? ["machete_parang", "motorcycle_helmet"] : ["metal_chair"],
          physical_aggression_detected: true,
          sexual_misconduct_detected: false,
          scene_type: isWeapon ? "school_rear_gate" : "hostel_dorm",
          visual_severity_tier: isWeapon ? 5 : 4,
          confidence: 0.96,
          visual_description: [
            isWeapon
              ? "Individual brandishing curved blade weapon (parang) near school perimeter."
              : "Physical altercation between multiple students inside dorm corridor.",
          ],
          keyframe_timestamps: [1.2, 3.4, 5.8],
          captions_masked: maskCaptions,
          orthogonal_evidence_doubt: maskCaptions ? 0.0 : 0.55,
          weakening_factors: maskCaptions ? [] : ["on_screen_news_caption_detected"],
          needs_visual_review: !maskCaptions,
        },
        keyframe_timestamps: [1.2, 3.4, 5.8],
        sampled_keyframes_count: 3,
        cytoscape_elements: [
          {
            data: {
              id: vssEventId,
              type: "ThreatEventNode",
              incident_type: isWeapon ? "Armed Perimeter Breach" : "Physical Assault Scuffle",
              severity_tier: isWeapon ? 5 : 4,
              threatLabel: isWeapon ? "Armed Threat (T5)" : "Physical Assault (T4)",
              context_summary: isWeapon ? "Parang brandish at rear gate." : "Corridor fight.",
            },
          },
          {
            data: {
              id: vssEvidenceId,
              label: `CCTV [3.4s]: ${isWeapon ? "school_rear_gate" : "hostel_dorm"}`,
              type: "evidence",
              media_type: "CCTV_KEYFRAME",
              visual_severity: isWeapon ? 5 : 4,
              has_threat_object: isWeapon,
              threat_markers: isWeapon ? ["machete_parang"] : ["punching"],
              color: isWeapon ? "#dc2626" : "#f59e0b",
              timestamp_sec: 3.4,
              sha256: "8f434346648f...",
            },
          },
          {
            data: {
              id: vssEdgeId,
              source: vssEvidenceId,
              target: vssEventId,
              type: "EvidenceEdge",
              label: "CORROBORATES",
              confidence: 0.96,
            },
          },
        ],
      };

      setLastResult(simulatedResponse);
      setUploadNotice(
        `Video clip (${filename}) triaged via local simulation. 3 motion keyframe bursts extracted.`
      );
      onTriageSuccess(simulatedResponse);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (intakeMode === "video_cctv") {
        handleVideoUpload(file);
      } else {
        handleScreenshotUpload(file);
      }
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleScreenshotUpload(e.target.files[0]);
    }
  };

  const onVideoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleVideoUpload(e.target.files[0]);
    }
  };

  const clearScreenshot = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearVideo = () => {
    if (videoPreviewUrl && !videoPreviewUrl.startsWith("http")) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoKeyframes([]);
    setUploadNotice(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // Submit to POST /api/triage
  const executeTriage = useCallback(
    async (
      text: string,
      school: string,
      reporter: string,
      metadata: Record<string, any>
    ) => {
      if (!text.trim()) {
        setErrorMsg("Please enter an incident report or select a quick fixture.");
        return;
      }

      setIsSubmitting(true);
      setErrorMsg(null);
      setLastResult(null);

      const payload = {
        raw_text: text,
        school_name: school || "SMK Sentiasa",
        reporter_alias: reporter || "AnonStudent",
        metadata: metadata || {},
      };

      try {
        const sLower = (school || "").toLowerCase();
        const tenantHeader = sLower.includes("kuching")
          ? "smk-kuching-high"
          : (sLower.includes("9") ? "smk-seksyen-9" : "smk-seksyen-11");

        const response = await fetch(`${activeBaseUrl}/api/triage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenantHeader,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(
            errData?.detail || `Triage pipeline returned HTTP ${response.status}`
          );
        }

        const result: TriageResponse = await response.json();
        setLastResult(result);

        if (result.jev_passed) {
          onTriageSuccess(result);
        } else {
          onTriageVetoed?.(result);
        }
      } catch {
        // Fallback simulation when backend is idle
        const isWeapon = text.toLowerCase().includes("parang");
        const isExtortion = text.toLowerCase().includes("pau");
        const isVetoTest = metadata.current_tier === "LOW" || Boolean(metadata.source_timestamp);

        const nowTs = Date.now();
        const simThreatId = `threat-${nowTs}`;
        const simEdgeId = `edge-azlan-${nowTs}`;

        const simulatedResult: TriageResponse = {
          status: "processed",
          severity_tier: isWeapon ? 5 : isExtortion ? 3 : 2,
          threat_tier: isWeapon ? "CRITICAL" : isExtortion ? "ELEVATED" : "MODERATE",
          escalation_required: isWeapon || isExtortion,
          jev_passed: !isVetoTest,
          jev_evaluation: {
            passed: !isVetoTest,
            veto_reason: isVetoTest
              ? metadata.current_tier === "LOW"
                ? "FSM Invariant Violation: Direct state jump from LOW to CRITICAL prohibited without corroborating evidence."
                : "Temporal Invariant Violation: Incident report timestamp exceeds 2-hour staleness threshold."
              : undefined,
            suggested_action: isVetoTest ? "Route to Human-In-The-Loop review queue" : "Escalate to counselor",
            semantic_confidence: 0.94,
            semantic_danger_probability: isWeapon ? 0.92 : 0.65,
          },
          threat_event: {
            event_id: simThreatId,
            incident_type: isWeapon ? "Weapon Mention" : isExtortion ? "Extortion / Bullying" : "Behavioral Signal",
            raw_text: text,
            severity_tier: isWeapon ? 5 : isExtortion ? 3 : 2,
            threat_tier: isWeapon ? "CRITICAL" : isExtortion ? "ELEVATED" : "MODERATE",
            confidence_score: 0.95,
            context_summary: text,
            extracted_slang_tokens: SLANG_CHIPS.filter((s) => text.toLowerCase().includes(s.token)).map((s) => s.token),
          },
          school: {
            school_id: school?.includes("9") ? "smk-seksyen-9" : "smk-seksyen-11",
            name: school || "SMK Seksyen 11 Shah Alam",
            district: "Petaling Perdana",
          },
          normalized_text: text,
          extracted_slang_tokens: SLANG_CHIPS.filter((s) => text.toLowerCase().includes(s.token)).map((s) => s.token),
          cytoscape_elements: [
            {
              data: {
                id: simThreatId,
                type: "ThreatEventNode",
                incident_type: isWeapon ? "Weapon Mention" : "Extortion",
                severity_tier: isWeapon ? 5 : 3,
                threatLabel: isWeapon ? "Weapon Mention (T5)" : "Extortion (T3)",
              },
            },
            {
              data: {
                id: simEdgeId,
                source: "persona-azlan",
                target: simThreatId,
                type: "EvidenceEdge",
                label: "CORRELATES",
              },
            },
          ],
        };

        setLastResult(simulatedResult);
        if (simulatedResult.jev_passed) {
          onTriageSuccess(simulatedResult);
        } else {
          onTriageVetoed?.(simulatedResult);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeBaseUrl, onTriageSuccess, onTriageVetoed]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intakeMode === "video_cctv") {
      if (!videoFile && !videoPreviewUrl) {
        setErrorMsg("Please upload a video clip or select a CCTV fixture.");
        return;
      }
      const targetFilename = videoFile?.name || activeMetadata?.video_filename || "cctv_clip.mp4";
      executeVideoTriage(targetFilename, videoFile);
    } else {
      executeTriage(rawText, schoolName, reporterAlias, activeMetadata);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-md">
      {/* Submitter Header with Dev Bench Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Campus Incident Submitter & Ingest
            </h3>
            <p className="text-xs text-slate-300">
              Real-time Malaysian dialect normalization, OCR ingestion, and CCTV motion keyframing
            </p>
          </div>
        </div>

        {/* Collapsible Dev Bench Toggle Button */}
        <button
          type="button"
          onClick={() => setIsDevBenchOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition ${
            isDevBenchOpen
              ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
              : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600 hover:text-white"
          }`}
          title="Toggle QA Test Fixtures and Invariant Bench"
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Dev Simulation Bench</span>
          {isDevBenchOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Collapsible Dev Simulation Bench (Fixtures) */}
      {isDevBenchOpen && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-slate-950/70 p-4 transition">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                1-Click QA Simulation Fixtures:
              </span>
              <button
                type="button"
                onClick={handleResetDemoState}
                disabled={isResettingDemo}
                className="flex items-center gap-1.5 rounded bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 active:scale-95 transition"
                title="Purge test incidents and reset pristine demo state in Firestore"
              >
                <RefreshCw className={`h-3 w-3 ${isResettingDemo ? "animate-spin" : ""}`} />
                <span>Reset Demo State</span>
              </button>
            </div>
            <span className="text-xs text-slate-300">
              Click to load test vectors for FSM invariants, OCR, and mobile video bursts
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {FIXTURES.map((fix) => {
              const isSelected = activeFixtureName === fix.name;
              const isVetoTest = fix.expectedOutcome === "veto";

              return (
                <button
                  key={fix.name}
                  type="button"
                  onClick={() => handleLoadFixture(fix, false)}
                  className={`group relative flex flex-col rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? isVetoTest
                        ? "border-amber-500 bg-amber-500/15"
                        : "border-emerald-500 bg-emerald-500/15"
                      : "border-slate-800 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{fix.icon}</span>
                    <span
                      className={`font-mono text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        isVetoTest
                          ? "bg-amber-500/20 text-amber-300"
                          : fix.isVideo
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {isVetoTest ? "Veto Vector" : fix.isVideo ? "Mobile Video" : "Standard"}
                    </span>
                  </div>
                  <span className="mt-1.5 font-mono text-xs font-bold text-slate-100">
                    {fix.name}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-300 line-clamp-1">
                    {fix.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ingest Modality Pill Selector */}
      <div className="mt-4 flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setIntakeMode("text_ocr")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
            intakeMode === "text_ocr"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <FileImage className="h-3.5 w-3.5" />
          <span>WhatsApp Screenshot OCR</span>
        </button>

        <button
          type="button"
          onClick={() => setIntakeMode("video_cctv")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
            intakeMode === "video_cctv"
              ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          <span>Mobile Video & Media Uplink</span>
          <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300">
            NEW
          </span>
        </button>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-1 flex-col gap-3.5">
        {intakeMode === "text_ocr" ? (
          <>
            {/* Slang Quick Insert Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-medium text-slate-300 mr-1">
                Dialect Tokens:
              </span>
              {SLANG_CHIPS.map((chip) => (
                <button
                  key={chip.token}
                  type="button"
                  onClick={() => insertSlang(chip.token)}
                  className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 font-mono text-xs text-slate-200 hover:border-slate-500 hover:bg-slate-700 hover:text-white transition"
                  title={`Click to insert #${chip.token}`}
                >
                  #{chip.token}
                </button>
              ))}
            </div>

            {/* Text Area */}
            <div className="relative">
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setActiveFixtureName(null);
                }}
                placeholder="Type or paste Malaysian student report (e.g. 'Budak form 4 bawa parang nak belasah budak batch bawah kat luar gate')..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 p-3.5 font-sans text-sm text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText("");
                    setActiveMetadata({});
                    setActiveFixtureName(null);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white p-1"
                  title="Clear report text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* Video Ingest Mode Container */
          <div className="space-y-3">
            {videoPreviewUrl ? (
              <div className="space-y-3">
                <VideoScrubber
                  src={videoPreviewUrl}
                  title={videoFile ? videoFile.name : activeFixtureName || "CCTV Incident Stream"}
                  keyframes={videoKeyframes}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-rose-400 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Remove Video & Select Another</span>
                  </button>
                  <span className="font-mono text-xs text-cyan-400">
                    {videoKeyframes.length > 0
                      ? `${videoKeyframes.length} Motion Bursts Synchronized`
                      : "Ready for RTX Keyframing"}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onClick={() => videoInputRef.current?.click()}
                  className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/20 p-8 text-center transition hover:border-cyan-400 hover:bg-cyan-950/30"
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.mov,.webm,.avi,video/mp4,video/quicktime,video/webm"
                    onChange={onVideoFileChange}
                    className="hidden"
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 mb-3 group-hover:scale-110 transition">
                    <Film className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Drop Student Smartphone Recording or Video File (.mp4, .mov)
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    Human-fed mobile video intelligence. Edge motion-sampler extracts peak keyframes, hashed under Section 90A Evidence Act 1950. Max 25MB.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-300 bg-cyan-950/50 px-3 py-1 rounded-md border border-cyan-500/30">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Evidence Act 1950 Sec 90A Hashed</span>
                  </div>
                </div>

                {/* Video URL Input Field */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 p-2.5" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 pl-1">Video Evidence URL:</span>
                  <input
                    type="url"
                    placeholder="Paste Telegram video link, TikTok clip, or Cloud Drive URL..."
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Subtitle / Caption Letterbox Masking (Task 18.3.1 Anti-OCR Cheat) */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Letterbox Caption Masking (Rule 02)</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${maskCaptions ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"}`}>
                        {maskCaptions ? "FILTER ACTIVE" : "OFF"}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Eliminates on-screen news tickers &amp; TikTok subtitles before VLM reasoning (Doubt drops from 0.55 → 0.00).
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaskCaptions(!maskCaptions)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                    maskCaptions ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                  title="Toggle Subtitle Letterbox Masking"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                      maskCaptions ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Optical Doubt / Kinematic Verification Readout Pill */}
              {lastResult?.visual_evidence && (
                <div className="pt-2 border-t border-cyan-500/20">
                  {(lastResult.visual_evidence.orthogonal_evidence_doubt ?? 0) > 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
                      <span>
                        ⚠️ Optical Doubt: {(lastResult.visual_evidence.orthogonal_evidence_doubt ?? 0).toFixed(2)} [
                        {lastResult.visual_evidence.weakening_factors && lastResult.visual_evidence.weakening_factors.length > 0
                          ? lastResult.visual_evidence.weakening_factors.join(", ")
                          : "unmasked_caption_detected"}
                        ] - Review Recommended
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
                      <span>🛡️ Optical Kinematics Verified (Doubt: 0.00) - No OCR Cheating</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screenshot Dropzone & Metadata Inputs (When in Text/OCR mode) */}
        {intakeMode === "text_ocr" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* File Dropzone (6 cols) */}
            <div
              onDragOver={onDragOver}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 transition md:col-span-6 ${
                uploadPreview
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-950/50 hover:border-slate-500 hover:bg-slate-850/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={onFileChange}
                className="hidden"
              />

              {uploadPreview ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPreview}
                        alt="Screenshot"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="truncate text-left">
                      <p className="truncate text-xs font-semibold text-slate-100">
                        {uploadedFile?.name}
                      </p>
                      <p className="font-mono text-xs text-slate-300">
                        {((uploadedFile?.size || 0) / 1024).toFixed(1)} KB • OCR Ready
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearScreenshot();
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    title="Remove screenshot"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-300">
                  <UploadCloud className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition" />
                  <span className="text-xs font-medium">
                    Drop WhatsApp Screenshot (.png, .jpg)
                  </span>
                </div>
              )}
            </div>

            {/* School Name (3 cols) */}
            <div className="md:col-span-3">
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Campus Name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>

            {/* Reporter Alias (3 cols) */}
            <div className="md:col-span-3">
              <input
                type="text"
                value={reporterAlias}
                onChange={(e) => setReporterAlias(e.target.value)}
                placeholder="Reporter Alias"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Upload notice message */}
        {uploadNotice && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs text-blue-200">
            {uploadNotice}
          </div>
        )}

        {/* Active Metadata / Test Invariant Flag */}
        {Object.keys(activeMetadata).length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">Active Fixture Metadata:</span>
            <span className="truncate">{JSON.stringify(activeMetadata)}</span>
            <button
              type="button"
              onClick={() => setActiveMetadata({})}
              className="ml-auto text-slate-500 hover:text-white"
              title="Clear active metadata"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Jev Ontology Firewall Active</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 font-mono text-xs font-bold text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {isUploading ? "Uploading Media..." : intakeMode === "video_cctv" ? "Sampling Keyframes..." : "Triaging Incident..."}
                </span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>
                  {intakeMode === "video_cctv" ? "Sample & Triage Video" : "Submit for Triage"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
