const EDGE_FUNCTION_BASE = 'https://api.opedd.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E';

export const API = {
  baseUrl: EDGE_FUNCTION_BASE,

  // Direct Edge Function endpoints
  licenses: EDGE_FUNCTION_BASE + '/licenses',
};

// Safely parse JSON response, handling empty bodies
async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  
  if (!text || !text.trim()) {
    return { success: true, data: [] };
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}

// Direct Edge Function fetch (bypasses proxy)
export async function edgeFetch<T>(
  url: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await safeParseJson(response) as { success?: boolean; data?: T; error?: { message: string } };

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}

// Variant of edgeFetch that throws a typed error carrying the backend's
// stable machine-readable `code` plus HTTP status. Used by wizardStateApi
// so callers can switch on err.code (STATE_MISMATCH, REGRESS_FORBIDDEN, etc.)
// rather than parsing message strings.
export class WizardStateError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  constructor(message: string, code: string, status: number, requestId?: string) {
    super(message);
    this.name = 'WizardStateError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

async function wizardFetch<T>(
  url: string,
  options: RequestInit,
  accessToken: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };
  if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let body: { success?: boolean; data?: T; error?: string; code?: string; request_id?: string } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new WizardStateError(
      'Invalid JSON response from wizard-state',
      'INTERNAL_ERROR',
      response.status
    );
  }
  if (!body.success) {
    throw new WizardStateError(
      body.error || 'wizard-state request failed',
      body.code || 'INTERNAL_ERROR',
      response.status,
      body.request_id
    );
  }
  return body.data as T;
}

// ─── Wizard state types ──────────────────────────────────────────────
//
// Mirror the contract in opedd-backend/supabase/functions/wizard-state/
// types.ts. Mapped to the 5-state vocabulary from migration 066 (see
// INVARIANTS.md "Publisher state machine vocabulary"). The matching
// transition rules are codified server-side; this module is purely the
// HTTP client.

export type SetupState =
  | 'prospect'
  | 'in_setup'
  | 'connected'
  | 'verified'
  | 'suspended';

// Wizard substep. The new wizard produces 1..5; the legacy migration-061
// CHECK constraint also accepts 6, and during the soak window the GET
// may surface setup_step=6 for legacy publishers who completed the old
// 6-step wizard before migration 066 backfilled them. The frontend
// tolerates 6 in the type so legacy values render without crashing —
// can_advance / can_regress / next_step / prev_step are all server-
// derived and resolve to false / null for step=6 (no forward path),
// keeping the UI safe. Drop the `6` arm post-Phase 3 cutover (Session
// 3.7) once legacy publishers are migrated through the new wizard or
// admin tooling.
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export type WizardAction = 'advance' | 'regress' | 'save_step_data';

export interface WizardStateView {
  publisher_id: string;
  setup_state: SetupState;
  setup_step: WizardStep;
  setup_data: Record<string, unknown>;
  setup_complete: boolean;
  dormant: boolean;
  verification_status: string | null;
  can_advance: boolean;
  can_regress: boolean;
  next_step: WizardStep | null;
  prev_step: WizardStep | null;
}

export interface AdvancePayload {
  expected_state: SetupState;
  expected_step: WizardStep;
  step_data?: Record<string, unknown>;
}

export interface RegressPayload {
  expected_state: SetupState;
  expected_step: WizardStep;
}

export interface SaveStepDataPayload {
  expected_state: SetupState;
  expected_step: WizardStep;
  step_data: Record<string, unknown>;
}

export const wizardStateApi = {
  get: (token: string | null) =>
    wizardFetch<WizardStateView>(
      EDGE_FUNCTION_BASE + '/wizard-state',
      { method: 'GET' },
      token
    ),

  advance: (payload: AdvancePayload, token: string | null) =>
    wizardFetch<WizardStateView>(
      EDGE_FUNCTION_BASE + '/wizard-state',
      { method: 'POST', body: JSON.stringify({ action: 'advance', ...payload }) },
      token
    ),

  regress: (payload: RegressPayload, token: string | null) =>
    wizardFetch<WizardStateView>(
      EDGE_FUNCTION_BASE + '/wizard-state',
      { method: 'POST', body: JSON.stringify({ action: 'regress', ...payload }) },
      token
    ),

  saveStepData: (payload: SaveStepDataPayload, token: string | null) =>
    wizardFetch<WizardStateView>(
      EDGE_FUNCTION_BASE + '/wizard-state',
      {
        method: 'POST',
        body: JSON.stringify({ action: 'save_step_data', ...payload }),
      },
      token
    ),
};

// Direct Edge Function fetch returning full envelope (for paginated responses)
export async function edgeFetchPaginated<T>(
  url: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const result = await safeParseJson(response) as { success?: boolean; data?: unknown; total?: number; page?: number; limit?: number; protectedCount?: number; error?: { message: string } };

  if (!result.success) {
    throw new Error(result.error?.message || 'API request failed');
  }

  // Return the full envelope (data + total + page + limit + protectedCount)
  return { data: result.data, total: result.total, page: result.page, limit: result.limit, protectedCount: result.protectedCount } as T;
}

// Licenses API (direct Edge Function)
export const licensesApi = {
  list: <T>(params?: { page?: number; limit?: number; search?: string; status?: string; source_id?: string }, token?: string | null) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    if (params?.source_id && params.source_id !== "all") qs.set("source_id", params.source_id);
    const url = API.licenses + (qs.toString() ? "?" + qs.toString() : "");
    return edgeFetchPaginated<T>(url, { method: 'GET' }, token);
  },

  create: <T>(body: { title: string; description?: string; licenseType?: string; metadata?: Record<string, unknown> }, token?: string | null) =>
    edgeFetch<T>(API.licenses, { method: 'POST', body: JSON.stringify(body) }, token),

  delete: (id: string, token?: string | null) =>
    edgeFetch<{ message: string }>(API.licenses + '?id=' + encodeURIComponent(id), { method: 'DELETE' }, token),

  updatePrices: <T>(body: {
    articleIds?: string[];
    sourceId?: string;
    humanPrice?: number;
    aiPrice?: number;
    licensingEnabled?: boolean;
  }, token?: string | null) =>
    edgeFetch<T>(EDGE_FUNCTION_BASE + '/update-license-prices', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),
};

// Platform Connect API (direct Edge Function)
export interface DetectionResult {
  platform: "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
  confidence: "high" | "medium" | "low";
  name: string;
  feeds?: { url: string; type: string }[];
  article_count?: number;
}

export interface ConnectResult {
  source_id: string;
  job_id?: string;
  inbound_email?: string;
  status: string;
}

export interface ArchiveJob {
  id: string;
  status: "pending" | "running" | "complete" | "failed";
  processed_count: number;
  total_count: number;
  error?: string;
}

export interface SourceStatus {
  id: string;
  name: string;
  platform: string;
  sync_status: string;
  sync_method: string;
  article_count: number;
}

export interface PlatformStatusResult {
  job: ArchiveJob | null;
  source: SourceStatus;
  inbound_email: string;
}

export const platformApi = {
  detect: (url: string, token?: string | null) =>
    edgeFetch<DetectionResult>(
      `${EDGE_FUNCTION_BASE}/detect-platform?url=${encodeURIComponent(url)}`,
      { method: "GET" },
      token
    ),

  connect: (payload: {
    url?: string;
    source_id?: string;
    platform: string;
    credentials?: Record<string, string>;
  }, token?: string | null) =>
    edgeFetch<ConnectResult>(
      `${EDGE_FUNCTION_BASE}/platform-connect`,
      { method: "POST", body: JSON.stringify(payload) },
      token
    ),

  status: (sourceId: string, token?: string | null) =>
    edgeFetch<PlatformStatusResult>(
      `${EDGE_FUNCTION_BASE}/platform-connect?source_id=${encodeURIComponent(sourceId)}`,
      { method: "GET" },
      token
    ),
};
