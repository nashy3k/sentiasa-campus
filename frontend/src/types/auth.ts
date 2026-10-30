/**
 * Sovereign Operator Roles and Granular RBAC Permissions for Project SENTIASA.
 */

export type OperatorRole =
  | "SUPER_ADMIN"
  | "HEAD_COUNSELOR"
  | "DISCIPLINE_MASTER"
  | "CAMPUS_SECURITY"
  | "STUDENT_REPORTER";

export type Permission =
  | "MANAGE_OSINT"
  | "REGISTER_SLANG"
  | "MANAGE_TENANT_SETTINGS"
  | "EXPORT_SEC_90A"
  | "DISPATCH_CRITICAL_ALERT"
  | "DEMERIT_RECORDS"
  | "TRIAGE_INCIDENT"
  | "REVIEW_HITL_QUEUE"
  | "ADD_CASE_INTERVENTION"
  | "VIEW_RADAR_GRAPH"
  | "CCTV_MONITORING"
  | "PHYSICAL_ALERT_ACK"
  | "SUBMIT_INTAKE";

export interface RoleMetadata {
  id: OperatorRole;
  label: string;
  badge: string;
  iconName: string;
  tagline: string;
  description: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
  };
  permissions: Permission[];
}

export const ROLE_CONFIGS: Record<OperatorRole, RoleMetadata> = {
  SUPER_ADMIN: {
    id: "SUPER_ADMIN",
    label: "Super Administrator",
    badge: "SUPER_ADMIN",
    iconName: "ShieldAlert",
    tagline: "Full Sovereign Operations",
    description: "Manage OSINT sources, register slang lexicon, tenant settings, export Section 90A forensics, triage, and critical dispatch.",
    colorScheme: {
      bg: "bg-purple-950/40",
      border: "border-purple-500/50",
      text: "text-purple-300",
      badgeBg: "bg-purple-500/20 text-purple-200 border-purple-500/40",
    },
    permissions: [
      "MANAGE_OSINT",
      "REGISTER_SLANG",
      "MANAGE_TENANT_SETTINGS",
      "EXPORT_SEC_90A",
      "DISPATCH_CRITICAL_ALERT",
      "DEMERIT_RECORDS",
      "TRIAGE_INCIDENT",
      "REVIEW_HITL_QUEUE",
      "ADD_CASE_INTERVENTION",
      "VIEW_RADAR_GRAPH",
      "CCTV_MONITORING",
      "PHYSICAL_ALERT_ACK",
      "SUBMIT_INTAKE",
    ],
  },
  HEAD_COUNSELOR: {
    id: "HEAD_COUNSELOR",
    label: "Head Counselor",
    badge: "HEAD_COUNSELOR",
    iconName: "Sparkles",
    tagline: "Psychosocial Triage & HITL",
    description: "Triage reports, review HITL queue, add case interventions, view radar canvas. Restricted from OSINT/system config.",
    colorScheme: {
      bg: "bg-cyan-950/40",
      border: "border-cyan-500/50",
      text: "text-cyan-300",
      badgeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    },
    permissions: [
      "TRIAGE_INCIDENT",
      "REVIEW_HITL_QUEUE",
      "ADD_CASE_INTERVENTION",
      "VIEW_RADAR_GRAPH",
      "SUBMIT_INTAKE",
    ],
  },
  DISCIPLINE_MASTER: {
    id: "DISCIPLINE_MASTER",
    label: "Discipline Master",
    badge: "DISCIPLINE_MASTER",
    iconName: "ShieldCheck",
    tagline: "Disciplinary Dispatch & Demerits",
    description: "Review violent incidents, authorize Tier 4/5 dispatches under SHACL-GOV-01, manage student demerit records.",
    colorScheme: {
      bg: "bg-rose-950/40",
      border: "border-rose-500/50",
      text: "text-rose-300",
      badgeBg: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    },
    permissions: [
      "DISPATCH_CRITICAL_ALERT",
      "DEMERIT_RECORDS",
      "TRIAGE_INCIDENT",
      "VIEW_RADAR_GRAPH",
      "SUBMIT_INTAKE",
    ],
  },
  CAMPUS_SECURITY: {
    id: "CAMPUS_SECURITY",
    label: "Campus Security Officer",
    badge: "CAMPUS_SECURITY",
    iconName: "Crosshair",
    tagline: "VSS / CCTV Security Warden",
    description: "CCTV/VSS video monitoring, safety alert acknowledgment, keyframe threat inspection.",
    colorScheme: {
      bg: "bg-amber-950/40",
      border: "border-amber-500/50",
      text: "text-amber-300",
      badgeBg: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    },
    permissions: [
      "CCTV_MONITORING",
      "PHYSICAL_ALERT_ACK",
      "VIEW_RADAR_GRAPH",
      "SUBMIT_INTAKE",
    ],
  },
  STUDENT_REPORTER: {
    id: "STUDENT_REPORTER",
    label: "Student Reporter",
    badge: "STUDENT_REPORTER",
    iconName: "Radio",
    tagline: "Anonymous Whistleblower Intake",
    description: "Whistleblower intake submission only. Zero radar or graph access per PDPA and Child Protection mandates.",
    colorScheme: {
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/50",
      text: "text-emerald-300",
      badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    },
    permissions: [
      "SUBMIT_INTAKE",
    ],
  },
};

export function hasRolePermission(role: OperatorRole, permission: Permission): boolean {
  const meta = ROLE_CONFIGS[role];
  if (!meta) return false;
  return meta.permissions.includes(permission);
}
