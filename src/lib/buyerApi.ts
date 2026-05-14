// Phase 5 Session 5.2.2 — typed client for the buyer-account edge function.
//
// Cross-repo contract (source of truth: opedd-backend/supabase/functions/
// buyer-account/index.ts shipped in Phase 5.2.1b commit dd9dfb2 + α-bis
// 401-vs-404 fix in c3ca680). When the backend response shape changes,
// update the TS interfaces in this file in the same PR cycle. KI #16
// tracks the eventual cross-repo type-sharing solution; KI #77 tracks
// the OpenAPI auto-gen migration that would auto-generate these.
//
// All calls go through edgeFetch from ./api.ts (single-prefix URL
// construction per KI #22 + KI #55 envelope handling). Authenticated
// calls require a Supabase JWT from useAuth().getAccessToken().

import { edgeFetch } from "./api";

const BUYER_ACCOUNT_URL = "https://api.opedd.com/buyer-account";

// ─── Types — mirror buyer-account index.ts response shapes ─────────

// Phase 5.2.3: buyer_type enum mirroring the backend CHECK constraint
// in migration 081. Single source of truth for the form select options.
export const BUYER_TYPES = [
  "ai_training",
  "ai_retrieval",
  "editorial_republish",
  "research_academic",
  "other",
] as const;

export type BuyerType = typeof BUYER_TYPES[number];

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  ai_training: "AI training",
  ai_retrieval: "AI retrieval (RAG)",
  editorial_republish: "Editorial republish",
  research_academic: "Research / academic",
  other: "Other",
};

export interface Buyer {
  id: string;
  // Legacy single-name + organization (pre-Phase-5.2.3; null for new
  // signups, populated for the row that pre-dates migration 081).
  name: string | null;
  organization: string | null;
  // Phase 5.2.3 — richer identity. Required at signup post-2026-05-02;
  // null for legacy rows pre-2026-05-02 (surfaced as "Complete profile"
  // prompt in BuyerAccount).
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  company_website: string | null;
  buyer_type: BuyerType | null;
  country_of_incorporation: string | null;  // ISO 3166-1 alpha-2
  contact_email: string;
  accepted_terms_at: string | null;
  terms_version: string | null;
  // Phase 5.3-attribution: privacy-by-default toggle. When true,
  // publishers whose content this buyer licenses see the buyer's
  // company_name in their /insights Licensees section.
  // When false (default), publishers see "AI Lab #N" mask only.
  public_attribution_consent: boolean;
  created_at: string;
}

export interface MaskedBuyerKey {
  id: string;
  key_prefix: string; // 12-char hex
  name: string | null;
  environment: "live" | "test";
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface BuyerProfileResponse {
  buyer: Buyer;
  keys: MaskedBuyerKey[];
}

// One-time-display contract: full token returned ONLY in signup +
// create_key responses. The frontend MUST display the token in a
// one-time modal with "you won't see this again" warning. Storing
// outside the modal lifetime is forbidden — with one documented
// exception per KI #129 (2026-05-06): the BuyerSignup signup-time
// flow may persist `IssuedKeyResponse` to `sessionStorage` under
// key `opedd:buyer-signup:issued-key` to survive accidental refresh
// / back / tab-close BEFORE the user completes the OneTimeKeyModal
// checkbox-confirmed dismissal. sessionStorage is per-tab and
// auto-cleared on tab close; the BuyerSignup flow MUST also clear
// the key explicitly inside `handleKeyModalClose` (called only after
// the modal's checkbox-confirmed dismissal). localStorage / cookies
// / any cross-tab or persistent surface remain forbidden.
export interface IssuedKeyResponse {
  buyer: Buyer;
  key: string;             // full opedd_buyer_<env>_<32-hex> token
  key_id: string;
  key_prefix: string;
  environment: "live" | "test";
  _notice?: string;        // backend reminder of one-time-display contract
}

export interface CreateKeyResponse {
  key: string;
  key_id: string;
  key_prefix: string;
  environment: "live" | "test";
  name: string | null;
  _notice?: string;
}

export interface RevokeKeyResponse {
  key_id: string;
  revoked_at: string;
  effective_at: string;    // 24h grace OR same as revoked_at if immediate
  immediate: boolean;
}

// ─── Client ────────────────────────────────────────────────────────

/**
 * Fetch buyer profile + masked key list.
 * Returns null when the JWT is valid but no enterprise_buyers row exists
 * (the post-α-bis 404 path — caller should redirect to /buyer/signup).
 * Throws on 401 (invalid JWT — caller redirects to /login) or other errors.
 */
export async function getBuyerAccount(accessToken: string): Promise<BuyerProfileResponse | null> {
  try {
    return await edgeFetch<BuyerProfileResponse>(BUYER_ACCOUNT_URL, { method: "GET" }, accessToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // The backend collapses "JWT valid + no buyer row" into a 404 with the
    // canonical message: "No buyer account — POST { action: 'signup', ... } first"
    if (/no buyer account|signup/i.test(msg)) return null;
    throw err;
  }
}

// Phase 5.2.3 signup payload — replaces single name + optional organization
// with the 6-field richer identity. All fields are required at the
// validation-layer; the backend rejects partial payloads with field-specific
// 400 errors.
export interface SignupParams {
  first_name: string;
  last_name: string;
  company_name: string;
  company_website: string;
  buyer_type: BuyerType;
  country_of_incorporation: string;  // ISO 3166-1 alpha-2 (e.g. "US", "GB")
  contact_email: string;
  terms_version: string;
}

export async function signupBuyer(accessToken: string, params: SignupParams): Promise<IssuedKeyResponse> {
  return edgeFetch<IssuedKeyResponse>(
    BUYER_ACCOUNT_URL,
    {
      method: "POST",
      body: JSON.stringify({ action: "signup", ...params }),
    },
    accessToken,
  );
}

export interface CreateKeyParams {
  name?: string | null;
  environment?: "live" | "test";
}

export async function createBuyerKey(accessToken: string, params: CreateKeyParams = {}): Promise<CreateKeyResponse> {
  return edgeFetch<CreateKeyResponse>(
    BUYER_ACCOUNT_URL,
    {
      method: "POST",
      body: JSON.stringify({ action: "create_key", ...params }),
    },
    accessToken,
  );
}

export interface RevokeKeyParams {
  key_id: string;
  immediate?: boolean;
}

export async function revokeBuyerKey(accessToken: string, params: RevokeKeyParams): Promise<RevokeKeyResponse> {
  return edgeFetch<RevokeKeyResponse>(
    BUYER_ACCOUNT_URL,
    {
      method: "POST",
      body: JSON.stringify({ action: "revoke_key", ...params }),
    },
    accessToken,
  );
}

export interface PatchBuyerParams {
  // Legacy fields (pre-Phase-5.2.3; still updatable for backward compat).
  name?: string;
  organization?: string | null;
  // Phase 5.2.3 — richer identity. All accept null to allow clearing.
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  buyer_type?: BuyerType | null;
  country_of_incorporation?: string | null;
  public_attribution_consent?: boolean;
}

export async function patchBuyer(accessToken: string, params: PatchBuyerParams): Promise<{ buyer: Buyer }> {
  return edgeFetch<{ buyer: Buyer }>(
    BUYER_ACCOUNT_URL,
    {
      method: "PATCH",
      body: JSON.stringify(params),
    },
    accessToken,
  );
}

// ─── Phase 10 M3 — filter subscription management ───────────────

// Canonical 4-vocab license types (mirror of backend
// _shared/pricing.ts:LicenseType).
export const FILTER_LICENSE_TYPES = [
  "ai_retrieval",
  "ai_training",
  "human_per_article",
  "human_full_archive",
] as const;
export type FilterLicenseType = typeof FILTER_LICENSE_TYPES[number];

export const FILTER_LICENSE_TYPE_LABELS: Record<FilterLicenseType, string> = {
  ai_retrieval: "AI retrieval (RAG / inference)",
  ai_training: "AI training",
  human_per_article: "Human per-article",
  human_full_archive: "Human full archive",
};

// Mirror of opedd-frontend/src/components/setup-v2/categories.ts curated list
// (14 + Other). M3 buyer subscription filter editor uses the same set.
export const FILTER_CATEGORIES = [
  "Climate",
  "Culture",
  "Defense",
  "Energy",
  "Finance",
  "Geopolitics",
  "Health",
  "Legal",
  "Markets",
  "Pharma",
  "Politics",
  "Science",
  "Technology",
] as const;

export interface FilterRules {
  categories?: string[];
  license_types?: FilterLicenseType[];
  max_price_per_event?: number;
  excluded_publisher_ids?: string[];
  per_publisher_monthly_cap?: number;
  global_monthly_cap?: number;
}

export interface FilteredSubscription {
  id: string;
  status: "pending" | "active" | "expired" | "canceled";
  scope: "filtered";
  filter_rules: FilterRules;
  valid_from: string;
  valid_until: string;
}

export interface CreateFilteredSubscriptionResponse {
  license_id: string;
  access_key: string; // ent_filtered_<32-hex>; shown once
  status: "pending" | "active";
  scope: "filtered";
  filter_rules: FilterRules;
  valid_from: string;
  valid_until: string;
  duration_months: number;
  webhook_secret: string | null; // one-time if buyer_webhook_url passed
  pending_stripe_wiring: boolean; // true in M3; flips false in M4 ship
  message: string;
}

const ENTERPRISE_LICENSE_URL = "https://api.opedd.com/enterprise-license";

export interface CreateFilteredSubscriptionParams {
  buyer_email: string;
  buyer_name?: string;
  buyer_org?: string;
  filter_rules: FilterRules;
  duration_months?: number;
  buyer_webhook_url?: string;
}

/**
 * Phase 10 M3 — POST /enterprise-license { scope: 'filtered', ... }.
 * Creates the buyer's filter-based subscription. Returns access_key
 * once; buyer must persist it. M3 ships with status='pending' until
 * M4 Stripe Billing meter wiring lands.
 *
 * NOT JWT-authed — body-derived idempotency on buyer_email per
 * withIdempotency contract at enterprise-license POST handler.
 */
export async function createFilteredSubscription(
  params: CreateFilteredSubscriptionParams,
): Promise<CreateFilteredSubscriptionResponse> {
  return edgeFetch<CreateFilteredSubscriptionResponse>(
    ENTERPRISE_LICENSE_URL,
    {
      method: "POST",
      body: JSON.stringify({ scope: "filtered", ...params }),
    },
    // No JWT — enterprise-license POST is body-derived idempotency.
  );
}

/**
 * Phase 10 M3 — PATCH /buyer-account { filter_rules: {...} }.
 * Updates filter_rules on the buyer's active filtered subscription.
 * Returns 404 if no active subscription (caller must POST
 * /enterprise-license first via createFilteredSubscription).
 */
export async function updateFilterRules(
  accessToken: string,
  filter_rules: FilterRules,
): Promise<{ buyer: Buyer; filtered_subscription: FilteredSubscription }> {
  return edgeFetch<{ buyer: Buyer; filtered_subscription: FilteredSubscription }>(
    BUYER_ACCOUNT_URL,
    {
      method: "PATCH",
      body: JSON.stringify({ filter_rules }),
    },
    accessToken,
  );
}

// ─── Phase 5.5 — buyer audit log retrieval (reused in Phase 10 M3) ─

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  license_id: string | null;
  article_id: string;
  publisher_id: string;
  action_type: string;
  compliance_snapshot: Record<string, unknown> | null;
  contract_version: string;
  contract_hash: string;
  // Phase 10 M5 will add attestation block with merkle_root +
  // inclusion_proof + blockchain_tx_hash. Until M5 ships, field is
  // absent and frontend renders a 'pending Merkle batch (M5)' badge.
  attestation?: {
    merkle_root: string;
    inclusion_proof: string[];
    blockchain_chain: string;
    blockchain_tx_hash: string;
    verified_on_chain_at: string;
  } | null;
}

export interface AuditPage {
  events: AuditEvent[];
  pagination: {
    next_cursor: string | null;
    limit: number;
  };
}

const BUYER_AUDIT_URL = "https://api.opedd.com/buyer-audit";

export async function getBuyerAudit(
  accessToken: string,
  opts: { cursor?: string; limit?: number; from?: string; to?: string } = {},
): Promise<AuditPage> {
  const qs = new URLSearchParams();
  if (opts.cursor) qs.set("cursor", opts.cursor);
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.from) qs.set("from", opts.from);
  if (opts.to) qs.set("to", opts.to);
  const url = qs.toString() ? `${BUYER_AUDIT_URL}?${qs.toString()}` : BUYER_AUDIT_URL;
  return edgeFetch<AuditPage>(url, { method: "GET" }, accessToken);
}
