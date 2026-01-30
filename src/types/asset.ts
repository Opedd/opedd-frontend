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
export const mapDbAssetToUiAsset = (dbAsset: DbAsset): Asset => {
  // Determine license type based on access_type, license_type, or pricing
  let licenseType: AccessType = "human";
  
  // Prefer access_type (new schema) if set
  if (dbAsset.access_type === "both" || dbAsset.access_type === "human" || dbAsset.access_type === "ai") {
    licenseType = dbAsset.access_type;
  }
  // Fall back to license_type (old schema)
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
  // If either exists, it's a "Publication Post" (part of a synced feed)
  // Otherwise, it's a "Single Work"
  const hasSourceId = !!(dbAsset.source_id || dbAsset.publication_id);
  
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    licenseType,
    status,
    revenue: dbAsset.total_revenue ?? 0,
    createdAt: dbAsset.created_at?.split("T")[0] ?? "",
    format: hasSourceId ? "publication" : "single",
    sourceUrl: dbAsset.source_url ?? undefined,
    source_id: dbAsset.source_id ?? dbAsset.publication_id ?? undefined, // Prefer source_id, fallback to publication_id
    verification_token: dbAsset.verification_token ?? undefined,
    verification_status: (dbAsset.verification_status as "pending" | "verified") ?? "pending",
    content_hash: dbAsset.content_hash ?? undefined,
    metadata: dbAsset.metadata ?? undefined,
    description: dbAsset.description ?? undefined,
  };
};
