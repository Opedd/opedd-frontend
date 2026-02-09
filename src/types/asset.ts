// Shared Asset type for frontend components
// Aligned with backend naming conventions

export type AccessType = "human" | "ai" | "both";

export interface Asset {
  id: string;
  title: string;
  licenseType: AccessType; // UI field, derived from access_type or pricing
  status: "protected" | "syncing" | "pending";
  revenue: number;
  createdAt: string;
  format?: "single" | "publication";
  sourceUrl?: string;
  // Links to parent content source if asset is part of a synced feed
  source_id?: string;
  // Verification token for publication ownership verification
  verification_token?: string;
  // Verification status from backend: 'pending', 'verified', or 'auto-verified'
  verification_status?: "pending" | "verified" | "auto-verified";
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
export interface DbAsset {
  id: string;
  title: string;
  human_price: number | null;
  ai_price: number | null;
  license_type?: string | null;
  access_type?: string | null;
  licensing_enabled: boolean | null;
  total_revenue: number | null;
  created_at: string | null;
  source_url: string | null;
  description?: string | null;
  content?: string | null;
  user_id: string;
  publication_id?: string | null;
  source_id?: string | null;
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
  asset_id: string;
  amount: number;
  license_type: string;
  status: string;
  story_protocol_hash?: string | null;
  buyer_email?: string | null;
  publisher_id: string;
}

// Generate a content hash from content string
export const generateContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
};

// Map database asset to UI asset format
export const mapDbAssetToUiAsset = (dbAsset: DbAsset): Asset => {
  // Determine license type based on access_type, license_type, or pricing
  let licenseType: AccessType = "human";
  
  if (dbAsset.access_type === "both" || dbAsset.access_type === "human" || dbAsset.access_type === "ai") {
    licenseType = dbAsset.access_type;
  } else if (dbAsset.license_type === "both" || dbAsset.license_type === "human" || dbAsset.license_type === "ai") {
    licenseType = dbAsset.license_type;
  } else {
    const hasHuman = (dbAsset.human_price ?? 0) > 0;
    const hasAi = (dbAsset.ai_price ?? 0) > 0;
    if (hasHuman && hasAi) licenseType = "both";
    else if (hasHuman) licenseType = "human";
    else if (hasAi) licenseType = "ai";
  }

  // Determine status: Protected (licensed) or Syncing (pending)
  let status: Asset["status"] = "pending";
  if (dbAsset.licensing_enabled) {
    status = "protected";
  } else if (dbAsset.verification_status === "pending") {
    status = "syncing";
  }

  const sourceId = dbAsset.source_id ?? dbAsset.publication_id ?? undefined;
  
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    licenseType,
    status,
    revenue: dbAsset.total_revenue ?? 0,
    createdAt: dbAsset.created_at?.split("T")[0] ?? "",
    format: sourceId ? "publication" : "single",
    sourceUrl: dbAsset.source_url ?? undefined,
    source_id: sourceId,
    verification_token: dbAsset.verification_token ?? undefined,
    verification_status: (dbAsset.verification_status as "pending" | "verified" | "auto-verified") ?? "pending",
    content_hash: dbAsset.content_hash ?? undefined,
    metadata: dbAsset.metadata ?? undefined,
    description: dbAsset.description ?? undefined,
  };
};
