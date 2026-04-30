/**
 * Phase 4.7.1 — Vercel-style publication card data shape.
 *
 * Composed from 3 parallel queries per OQ-G client-side strategy:
 *   - publishers row (branding_data, verification_status, setup_state, setup_complete, setup_data)
 *   - content_sources rows (sync state) — aggregated per OQ-E most-recent rule
 *   - licenses count (total per OQ-B; no content_complete filter)
 *
 * Note: not importing from `@/integrations/supabase/types` because the generated
 * Database type is stale (publishers + content_sources missing as of this writing).
 * Local interfaces below cover the surface this hook needs.
 */

export interface BrandingData {
  name?: string;
  logo_url?: string;
  primary_color?: string;
  banner_url?: string;
  source?: string;
  extracted_at?: string;
}

export interface OwnershipVerificationEvidence {
  publication_url?: string;
  final_url?: string;
  scraped_at?: string;
}

export interface OwnershipVerification {
  method?: string;
  status?: string;
  evidence?: OwnershipVerificationEvidence;
  verified_at?: string;
}

export interface SetupData {
  platform?: string;
  substack_url?: string;
  ownership_verification?: OwnershipVerification;
  [k: string]: unknown;
}

export interface ContentSourceSyncState {
  /** Most-recent last_sync_at across all content_sources rows for this publisher (OQ-E aggregation rule). */
  last_sync_at: string | null;
  /** Sync status of the row that won the most-recent tie-break. */
  sync_status: string | null;
  /** URL of the row that won the most-recent tie-break (used for card "Publication URL" if branding_data has no URL). */
  url: string | null;
  /** Number of content_sources rows for this publisher (informational; >1 surfaces KI #61). */
  rowCount: number;
}

export type PublicationCTA =
  | "import_content"
  | "view_licenses"
  | "continue_setup"
  | "get_started"
  | "contact_support";

export interface Publication {
  id: string;
  /** Canonical name. branding_data.name → URL-derived fallback → "Your publication". */
  name: string;
  /** Canonical logo. branding_data.logo_url OR null (caller falls back to Google favicon). */
  logoUrl: string | null;
  /** Display URL. content_sources.url → setup_data.ownership_verification.evidence.publication_url → null. */
  publicationUrl: string | null;
  /** Direct read of publishers.verification_status (per OQ.5). */
  verificationStatus: "pending" | "verified" | "failed" | "suspended";
  /** Wizard machine state. */
  setupState: "prospect" | "in_setup" | "connected" | "verified" | "suspended";
  setupStep: number | null;
  setupComplete: boolean;
  /** Total license count from licenses table (per OQ.5 / OQ-B). */
  licenseCount: number;
  /** Aggregated content_sources sync state per OQ-E. */
  contentSources: ContentSourceSyncState | null;
  /** Primary CTA per OQ-C state mapping (verified-but-incomplete-setup → continue_setup). */
  primaryCTA: PublicationCTA;
  /** Raw branding_data + setup_data for callers needing more detail. */
  brandingData: BrandingData | null;
}

export interface PublicationCardProps {
  publication: Publication;
  onImportContent?: () => void;
  onViewLicenses?: () => void;
  onContinueSetup?: () => void;
  onContactSupport?: () => void;
}
