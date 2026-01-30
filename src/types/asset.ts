// Shared Asset type for frontend components
// Aligned with backend naming conventions: publication_id, human_price, ai_price

export interface Asset {
  id: string;
  title: string;
  licenseType: "human" | "ai" | "both";
  status: "active" | "pending" | "minted";
  revenue: number;
  createdAt: string;
  storyProtocolHash?: string;
  format?: "single" | "publication";
  sourceUrl?: string;
  // Links to parent publication if asset is part of a synced feed
  publication_id?: string;
  // Verification token for publication ownership verification
  verification_token?: string;
  // Verification status from backend: 'pending' or 'verified'
  verification_status?: "pending" | "verified";
  // Content hash for license schema alignment
  content_hash?: string;
  // Additional metadata (JSONB)
  metadata?: Record<string, unknown>;
  // Explicit license type
  license_type?: string;
  // Description field
  description?: string;
}

// Database asset structure (matches Supabase schema)
export interface DbAsset {
  id: string;
  title: string;
  human_price: number | null;
  ai_price: number | null;
  licensing_enabled: boolean | null;
  total_revenue: number | null;
  created_at: string | null;
  source_url: string | null;
  description?: string | null;
  content?: string | null;
  user_id: string;
  publication_id?: string | null;
  verification_token?: string | null;
  verification_status?: string | null;
  content_hash?: string | null;
  metadata?: Record<string, unknown> | null;
  license_type?: string | null;
}

// License registration payload (aligned with backend schema)
export interface LicensePayload {
  title: string;
  description?: string;
  licenseType: "human" | "ai" | "both";
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
  // Determine license type based on pricing
  let licenseType: "human" | "ai" | "both" = "human";
  const hasHuman = (dbAsset.human_price ?? 0) > 0;
  const hasAi = (dbAsset.ai_price ?? 0) > 0;
  if (hasHuman && hasAi) licenseType = "both";
  else if (hasHuman) licenseType = "human";
  else if (hasAi) licenseType = "ai";

  // Determine status
  let status: "active" | "pending" | "minted" = "pending";
  if (dbAsset.licensing_enabled) {
    status = (dbAsset.total_revenue ?? 0) > 0 ? "minted" : "active";
  }

  // Determine format based on publication_id presence
  // If publication_id exists, it's a "Publication Post" (part of a synced feed)
  // Otherwise, it's a "Single Work"
  const hasPublicationId = !!dbAsset.publication_id;
  
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    licenseType,
    status,
    revenue: dbAsset.total_revenue ?? 0,
    createdAt: dbAsset.created_at?.split("T")[0] ?? "",
    format: hasPublicationId ? "publication" : "single",
    sourceUrl: dbAsset.source_url ?? undefined,
    publication_id: dbAsset.publication_id ?? undefined,
    verification_token: dbAsset.verification_token ?? undefined,
    verification_status: (dbAsset.verification_status as "pending" | "verified") ?? "pending",
    content_hash: dbAsset.content_hash ?? undefined,
    metadata: dbAsset.metadata ?? undefined,
    license_type: dbAsset.license_type ?? undefined,
    description: dbAsset.description ?? undefined,
  };
};
