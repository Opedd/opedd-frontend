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
// outside the modal lifetime is forbidden.
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
