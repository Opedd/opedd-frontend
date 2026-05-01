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

export interface Buyer {
  id: string;
  name: string;
  organization: string | null;
  contact_email: string;
  accepted_terms_at: string | null;
  terms_version: string | null;
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

export interface SignupParams {
  name: string;
  organization?: string | null;
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
  name?: string;
  organization?: string | null;
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
