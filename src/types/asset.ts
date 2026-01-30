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
// Note: Uses publication_id until DB migration renames to source_id
export interface DbAsset {
  id: string;
  title: string;
  human_price: number | null;
  ai_price: number | null;
  license_type?: string | null; // Current DB column
  licensing_enabled: boolean | null;
  total_revenue: number | null;
  created_at: string | null;
  source_url: string | null;
  description?: string | null;
  content?: string | null;
  user_id: string;
  publication_id?: string | null; // Current DB column (will become source_id)
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
  // Determine license type based on license_type or pricing
  let licenseType: AccessType = "human";
  
  // Prefer license_type if set
  if (dbAsset.license_type === "both" || dbAsset.license_type === "human" || dbAsset.license_type === "ai") {
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

  // Determine format based on publication_id presence (maps to source_id in UI)
  // If publication_id exists, it's a "Publication Post" (part of a synced feed)
  // Otherwise, it's a "Single Work"
  const hasSourceId = !!dbAsset.publication_id;
  
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    licenseType,
    status,
    revenue: dbAsset.total_revenue ?? 0,
    createdAt: dbAsset.created_at?.split("T")[0] ?? "",
    format: hasSourceId ? "publication" : "single",
    sourceUrl: dbAsset.source_url ?? undefined,
    source_id: dbAsset.publication_id ?? undefined, // Map publication_id to source_id
    verification_token: dbAsset.verification_token ?? undefined,
    verification_status: (dbAsset.verification_status as "pending" | "verified") ?? "pending",
    content_hash: dbAsset.content_hash ?? undefined,
    metadata: dbAsset.metadata ?? undefined,
    description: dbAsset.description ?? undefined,
  };
};
