// Shared Asset type for frontend components
// Aligned with backend naming conventions

export type AccessType = "human" | "ai" | "both";

export interface Asset {
  id: string;
  title: string;
  licenseType: AccessType; // UI field, derived from access_type or pricing
  status: "active" | "pending" | "minted";
  revenue: number;
  createdAt: string;
  storyProtocolHash?: string;
  format?: "single" | "publication";
  sourceUrl?: string;
  // Links to parent content source if asset is part of a synced feed
  source_id?: string;
  // Verification token for publication ownership verification
  verification_token?: string;
  // Verification status from backend: 'pending' or 'verified'
  verification_status?: "pending" | "verified";
  // Content hash for license schema alignment
  content_hash?: string;
  // Additional metadata (JSONB)
  metadata?: Record<string, unknown>;
  // Description field
  description?: string;
  // Resolved source name for UI display in Library table
  source_name?: string;
}

// Database asset structure (matches current Supabase schema)
// Supports both old column names (publication_id, asset_id) and new (source_id, license_id)
export interface DbAsset {
  id: string;
  title: string;
  human_price: number | null;
  ai_price: number | null;
  license_type?: string | null; // Current DB column
  access_type?: string | null; // New schema column
  licensing_enabled: boolean | null;
  total_revenue: number | null;
  created_at: string | null;
  source_url: string | null;
  description?: string | null;
  content?: string | null;
  user_id: string;
  publication_id?: string | null; // Old DB column
  source_id?: string | null; // New DB column (preferred)
  verification_token?: string | null;
  verification_status?: string | null;
  content_hash?: string | null;
  metadata?: Record<string, unknown> | null;
}

// License registration payload (aligned with backend schema)
export interface LicensePayload {
  title: string;
  description?: string;
  accessType: AccessType;
  contentHash?: string;
  metadata?: {
    url?: string;
    type?: "article" | "publication" | "document";
    platform?: string;
    [key: string]: unknown;
  };
  human_price?: number;
  ai_price?: number;
}

// Database transaction structure
export interface DbTransaction {
  id: string;
  created_at: string;
  asset_id: string; // Current DB column (will become license_id)
  amount: number;
  license_type: string;
  status: string;
  story_protocol_hash?: string | null;
  buyer_email?: string | null;
  publisher_id: string;
}

// Generate a content hash from content string
export const generateContentHash = (content: string): string => {
  // Simple hash for demo - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
};

// Map database asset to UI asset format
// Field mapping: publication_id (DB) → source_id (UI), assets table represents licenses
export const mapDbAssetToUiAsset = (dbAsset: DbAsset): Asset => {
  // Determine license type based on access_type, license_type, or pricing
  let licenseType: AccessType = "human";
  
  // Prefer access_type (new schema) if set
  if (dbAsset.access_type === "both" || dbAsset.access_type === "human" || dbAsset.access_type === "ai") {
    licenseType = dbAsset.access_type;
  }
  // Fall back to license_type (current DB schema)
  else if (dbAsset.license_type === "both" || dbAsset.license_type === "human" || dbAsset.license_type === "ai") {
    licenseType = dbAsset.license_type;
  } else {
    // Fall back to pricing-based detection
    const hasHuman = (dbAsset.human_price ?? 0) > 0;
    const hasAi = (dbAsset.ai_price ?? 0) > 0;
    if (hasHuman && hasAi) licenseType = "both";
    else if (hasHuman) licenseType = "human";
    else if (hasAi) licenseType = "ai";
  }

  // Determine status
  let status: "active" | "pending" | "minted" = "pending";
  if (dbAsset.licensing_enabled) {
    status = (dbAsset.total_revenue ?? 0) > 0 ? "minted" : "active";
  }

  // Determine format based on source_id or publication_id presence
  // publication_id in DB maps to source_id in UI (content source reference)
  // If either exists, it's a "Publication Post" (part of a synced feed)
  // Otherwise, it's a "Single Work"
  const sourceId = dbAsset.source_id ?? dbAsset.publication_id ?? undefined;
  const hasSourceId = !!sourceId;
  
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    licenseType,
    status,
    revenue: dbAsset.total_revenue ?? 0,
    createdAt: dbAsset.created_at?.split("T")[0] ?? "",
    format: hasSourceId ? "publication" : "single",
    sourceUrl: dbAsset.source_url ?? undefined,
    // Map publication_id (DB) to source_id (UI) for consistency
    source_id: sourceId,
    verification_token: dbAsset.verification_token ?? undefined,
    verification_status: (dbAsset.verification_status as "pending" | "verified") ?? "pending",
    content_hash: dbAsset.content_hash ?? undefined,
    metadata: dbAsset.metadata ?? undefined,
    description: dbAsset.description ?? undefined,
  };
};
