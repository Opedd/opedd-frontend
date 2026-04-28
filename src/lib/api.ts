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

// ─── Stripe Connect (Phase 3 Session 3.5) ──────────────────────────
//
// Wraps three publisher-profile actions that handle the publisher-side
// Stripe Express Connect lifecycle: connect_stripe (create account +
// onboarding link), stripe_status (force live retrieve + DB sync),
// stripe_dashboard (login link to Stripe-hosted dashboard).
//
// All three POST to /publisher-profile with action-dispatch shape;
// stripeApi encapsulates the action-name detail so callers don't need
// to know it.
//
// Encapsulating via edgeFetch (which reads the standard
// {success, data} envelope from _shared/cors.ts:successResponse)
// fixes the legacy Setup.tsx:494 bug where the caller read `json.url`
// instead of `json.data.onboarding_url`. Legacy was unreachable since
// Phase 3 Session 3.1 (App.tsx /setup → /setup-v2 redirect) so zero
// production impact, but the response-shape correction is now baked
// into the wrapper.

export interface StripeConnectResult {
  onboarding_url: string;
  stripe_account_id: string;
}

export interface StripeStatusResult {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

export interface StripeDashboardResult {
  dashboard_url: string;
}

export const stripeApi = {
  /**
   * Start Stripe Express onboarding. Returns an onboarding_url that
   * the caller should redirect the browser to (window.location.href).
   * Stripe will redirect back to ${returnPath}?stripe=success on
   * completion or ?stripe=refresh on link expiry.
   */
  connect: (returnPath: string, token: string | null) =>
    edgeFetch<StripeConnectResult>(
      EDGE_FUNCTION_BASE + '/publisher-profile',
      {
        method: 'POST',
        body: JSON.stringify({ action: 'connect_stripe', return_path: returnPath }),
      },
      token,
    ),

  /**
   * Force a live stripe.accounts.retrieve() and sync the result to
   * publishers.stripe_onboarding_complete + .stripe_disabled_reason.
   * Returns the live state. Use after returning from Stripe's hosted
   * onboarding form (?stripe=success path) to bridge the webhook-lag
   * gap — webhook may not have fired by the time the user lands
   * back, but stripe_status forces an immediate sync.
   */
  status: (token: string | null) =>
    edgeFetch<StripeStatusResult>(
      EDGE_FUNCTION_BASE + '/publisher-profile',
      { method: 'POST', body: JSON.stringify({ action: 'stripe_status' }) },
      token,
    ),

  /**
   * Returns a single-use Stripe-hosted dashboard URL for the
   * connected account. Used post-onboarding to let the publisher
   * manage their Express account (view payouts, update bank info,
   * etc.). Not used during Step 5 — included for Settings.tsx and
   * future post-onboarding surface symmetry.
   */
  dashboard: (token: string | null) =>
    edgeFetch<StripeDashboardResult>(
      EDGE_FUNCTION_BASE + '/publisher-profile',
      { method: 'POST', body: JSON.stringify({ action: 'stripe_dashboard' }) },
      token,
    ),
};

// ─── Ownership Verification (Phase 3 Session 3.3) ─────────────────
//
// Wraps the verify-ownership edge function (Phase 1 Session 1.4) for
// the email_to_publication method. Step2Substack is the first real
// caller — verify-ownership was dormant from Session 1.4 ship until
// 3.3.
//
// All three endpoints share the standard {success, data} envelope
// from _shared/cors.ts:successResponse. edgeFetch unwraps to .data.
//
// Backend contract:
//   GET  /verify-ownership                              → resume / read state
//   POST /verify-ownership { method, action: 'send_code', publication_url }
//   POST /verify-ownership { method, action: 'confirm_code', code }
// where method = 'email_to_publication' for Substack.
//
// State gate: backend requires setup_state='in_setup'. SetupV2 routing
// is the client-side gate (Step2Substack only mounts in that state).
// 422 WIZARD_STATE_INCOMPATIBLE on call → caller surfaces a reload.
//
// Rate limits per publisher (backend-enforced):
//   send_code:    5  per hour
//   confirm_code: 10 per hour

export interface VerifyOwnershipResult {
  verified: boolean;
  method: 'email_to_publication';
  reason?: string;
  awaiting_confirmation?: boolean;
  code_sent_to?: string;
  expires_in_seconds?: number;
  evidence?: Record<string, unknown>;
  fallback_available?: 'dns_txt_record';
}

export interface OwnershipVerificationChallenge {
  contact_email?: string;
  expires_at?: string;
  attempt_count?: number;
}

export interface OwnershipState {
  ownership_verification: {
    method?: string;
    status?: 'pending' | 'verified' | 'failed' | 'expired';
    challenge?: OwnershipVerificationChallenge;
    verified_at?: string;
    last_failure_reason?: string;
    fallback_offered?: string | null;
  } | null;
  is_verified: boolean;
}

export const verifyOwnershipApi = {
  get: (token: string | null) =>
    edgeFetch<OwnershipState>(
      EDGE_FUNCTION_BASE + '/verify-ownership',
      { method: 'GET' },
      token,
    ),

  sendCode: (publicationUrl: string, token: string | null) =>
    edgeFetch<VerifyOwnershipResult>(
      EDGE_FUNCTION_BASE + '/verify-ownership',
      {
        method: 'POST',
        body: JSON.stringify({
          method: 'email_to_publication',
          action: 'send_code',
          publication_url: publicationUrl,
        }),
      },
      token,
    ),

  confirmCode: (code: string, token: string | null) =>
    edgeFetch<VerifyOwnershipResult>(
      EDGE_FUNCTION_BASE + '/verify-ownership',
      {
        method: 'POST',
        body: JSON.stringify({
          method: 'email_to_publication',
          action: 'confirm_code',
          code,
        }),
      },
      token,
    ),
};

// ─── publisher-profile PATCH (Phase 3 Session 3.4) ─────────────────
//
// Writes whitelisted fields to the publishers row via the
// publisher-profile PATCH handler. Allowlist enforced server-side
// (supabase/functions/publisher-profile/index.ts:1544); known
// supported fields include category, default_human_price,
// default_ai_price, ai_annual_price, pricing_rules,
// content_delivery_enabled, expertise_summary, and others.
//
// Step4Categorize is the first SetupV2 caller. Future Settings.tsx
// pricing-edit flows etc. inherit the same wrapper. The broader
// publisherProfileApi.get() refactor (multiple components currently
// inline-fetch the GET) is a separate cleanup pass — out of scope
// for Session 3.4.

export interface PublisherProfilePatchPayload {
  category?: string | null;
  default_human_price?: number;
  default_ai_price?: number;
  ai_annual_price?: number | null;
  pricing_rules?: Record<string, unknown>;
  content_delivery_enabled?: boolean;
  expertise_summary?: string | null;
  [key: string]: unknown;
}

export const publisherProfileApi = {
  patch: (payload: PublisherProfilePatchPayload, token: string | null) =>
    edgeFetch<Record<string, unknown>>(
      EDGE_FUNCTION_BASE + '/publisher-profile',
      { method: 'PATCH', body: JSON.stringify(payload) },
      token,
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
