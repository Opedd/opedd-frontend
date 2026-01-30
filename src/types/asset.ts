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
  // New field from backend - links to publication if asset is part of a synced feed
  publication_id?: string;
  // Verification token returned when licensing a publication
  verification_token?: string;
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
}

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

  // Determine format based on publication_id presence (new logic)
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
  };
};

