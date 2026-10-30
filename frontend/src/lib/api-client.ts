/**
 * Centralized SENTIASA API Client configuration.
 *
 * Resolves the active backend API URL across:
 * 1. Client-side runtime window config (Cloud Run dynamic injection)
 * 2. Next.js public environment variable (NEXT_PUBLIC_API_URL)
 * 3. Server environment variable (API_URL)
 * 4. Localhost fallback (http://localhost:8000)
 */

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
      [key: string]: any;
    };
  }
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Client-side dynamic runtime config (prevents static build inlining)
    const runtimeConfig = window.__RUNTIME_CONFIG__;
    if (runtimeConfig?.API_URL) {
      return runtimeConfig.API_URL.replace(/\/+$/, "");
    }

    // 2. Client-side public build-time env
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
    }

    // 3. Resilient production origin check: if running in a non-localhost browser environment
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "0.0.0.0") {
      return "https://api.sentiasasystems.com";
    }
  }

  // 4. Server-side environment variables or fallback
  const serverUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (serverUrl) {
    return serverUrl.replace(/\/+$/, "");
  }

  // 5. Default local development server
  return "http://localhost:8000";
}

export interface TriagePayload {
  raw_text: string;
  school_name?: string;
  reporter_alias?: string;
  target_url?: string;
  metadata?: Record<string, any>;
}

export async function triageIncident(payload: TriagePayload): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Triage API failed: ${res.statusText}`);
  }
  return res.json();
}

export async function resolveHitlIncident(payload: {
  queue_id: string;
  decision: "APPROVE_ESCALATION" | "DISMISS";
  reviewer_notes?: string;
}): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/hitl/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HITL resolve failed: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadScreenshotAndTriage(
  file: File,
  schoolName: string = "SMK Sentiasa",
  reporterAlias: string = "AnonStudent"
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("school_name", schoolName);
  formData.append("reporter_alias", reporterAlias);

  const res = await fetch(`${baseUrl}/api/triage/upload-screenshot`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Screenshot OCR upload failed: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadVideoAndTriage(
  file: File | Blob,
  schoolName: string = "SMK Sentiasa",
  reporterAlias: string = "Whistleblower_Video_Witness",
  videoUrl?: string
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("school_name", schoolName);
  formData.append("reporter_alias", reporterAlias);
  if (videoUrl) {
    formData.append("video_url", videoUrl);
  }

  const res = await fetch(`${baseUrl}/api/triage/upload-video`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Video triage upload failed: ${res.statusText}`);
  }
  return res.json();
}

export function getStoredRole(): string {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("sentiasa_operator_role") || "SUPER_ADMIN";
    } catch {
      return "SUPER_ADMIN";
    }
  }
  return "SUPER_ADMIN";
}

export function getStoredTenant(): string {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("sentiasa_tenant_id") || "smk-sentiasa";
    } catch {
      return "smk-sentiasa";
    }
  }
  return "smk-sentiasa";
}

export function getAuthHeaders(overrideRole?: string, overrideTenant?: string): Record<string, string> {
  const role = overrideRole || getStoredRole();
  const tenant = overrideTenant || getStoredTenant();
  return {
    "X-Operator-Role": role,
    "X-Tenant-ID": tenant,
  };
}

export async function fetchSlangGlossary(): Promise<Record<string, any>> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/slang-glossary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to load slang glossary");
  }
  const data = await res.json();
  return data.glossary || {};
}

export async function addSlangToken(tokenData: {
  token: string;
  meaning: string;
  severity_boost?: number;
  tier?: string;
  dialect_category?: string;
}): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/slang-glossary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(tokenData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to add slang token");
  }
  return res.json();
}

export async function fetchOSINTSettings(tenantId?: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const tid = tenantId || getStoredTenant();
  const res = await fetch(`${baseUrl}/api/settings/osint?tenant_id=${encodeURIComponent(tid)}`, {
    headers: getAuthHeaders(undefined, tid),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch OSINT settings");
  }
  const data = await res.json();
  return data.settings || {};
}

export async function updateOSINTSettings(
  settings: any,
  tenantId?: string,
  operatorRole?: string
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const tid = tenantId || getStoredTenant();
  const res = await fetch(`${baseUrl}/api/settings/osint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(operatorRole, tid),
    },
    body: JSON.stringify({ ...settings, tenant_id: tid }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update OSINT settings");
  }
  return res.json();
}

export async function dispatchCriticalAlert(
  payload: {
    incident_id: string;
    action_type?: string;
    demerit_points?: number;
    officer_notes?: string;
    tenant_id?: string;
  },
  operatorRole?: string
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const tid = payload.tenant_id || getStoredTenant();
  const res = await fetch(`${baseUrl}/api/alerts/dispatch-critical`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(operatorRole, tid),
    },
    body: JSON.stringify({ ...payload, tenant_id: tid }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Critical dispatch failed");
  }
  return res.json();
}

export async function fetchPolemicSettings(): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/settings/polemic`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch Polemic settings");
  }
  return res.json();
}

export async function updatePolemicSettings(settings: any, operatorRole?: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/settings/polemic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(operatorRole),
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update Polemic settings");
  }
  return res.json();
}

export async function updateCloudRunScaling(minInstances: number): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/settings/cloud-run-scaling`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ min_instances: minInstances }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update Cloud Run scaling");
  }
  return res.json();
}

export async function fetchSystemSettings(): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/settings/system`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch system settings");
  }
  return res.json();
}

export async function updateSystemSettings(settings: any, operatorRole?: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/settings/system`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(operatorRole),
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update system settings");
  }
  return res.json();
}



