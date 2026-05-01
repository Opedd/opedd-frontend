// Phase 5 Session 5.3-attribution — typed client for the
// publisher-licensees edge function.
//
// Cross-repo contract (source of truth: opedd-backend/supabase/
// functions/publisher-licensees/index.ts shipped 2026-05-01). When
// the backend response shape changes, update the TS interfaces in
// this file in the same PR cycle. KI #16 tracks the eventual
// cross-repo type-sharing solution; KI #77 the OpenAPI auto-gen.
//
// Authenticated via the publisher's existing Supabase JWT —
// useAuth().getAccessToken().

import { edgeFetch } from "./api";

const PUBLISHER_LICENSEES_URL = "https://api.opedd.com/publisher-licensees";

// Privacy-by-default per Phase 5.3-attribution OQ-1: when
// `attribution_status === "pending"` OR the buyer's
// public_attribution_consent is false, the backend returns a
// server-computed `display_name` (e.g. "AI Lab #N") and SUPPRESSES
// the raw fields from the response. The frontend only ever sees
// what the backend allows — there's no client-side bypass surface.
export interface Licensee {
  display_name: string;
  organization: string | null;
  contact_email: string | null;
  license_count: number;
  license_types: string[];           // distinct enterprise tiers (rag/training/inference/full_ai/legacy)
  articles_licensed: number | null;  // null in v1; populated when per-article aggregation lands
  calls_count: number;
  revenue_cents_pro_rated: number;
  attribution_status: "linked" | "pending";
  earliest_license_at: string;
}

export interface PublisherLicenseesResponse {
  publisher_id: string;
  licensees: Licensee[];
  generated_at: string;
}

export async function getPublisherLicensees(accessToken: string): Promise<PublisherLicenseesResponse> {
  return edgeFetch<PublisherLicenseesResponse>(
    PUBLISHER_LICENSEES_URL,
    { method: "GET" },
    accessToken,
  );
}
