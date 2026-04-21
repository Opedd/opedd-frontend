// ─────────────────────────────────────────────────────────────────────────────
// Canonical license-type vocabulary
// ─────────────────────────────────────────────────────────────────────────────
//
// Single source of truth for every display string and badge color used to
// render a "license type" anywhere in the product (marketing, dashboard,
// buyer flows, receipts, verification, admin, notifications).
//
// Backend writes are unchanged. Legacy tokens coming from the database
// ('human', 'ai', 'ai_inference', 'human_license', 'ai_ingestion', etc.)
// are normalized at the display boundary via `normalizeLegacyType()`.
//
// Canonical set (6):
//   editorial      Editorial
//   archive        Archive
//   ai_retrieval   AI Retrieval & Summarization
//   ai_training    AI Training
//   corporate      Corporate
//   syndication    Syndication
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalLicenseType =
  | "editorial"
  | "archive"
  | "ai_retrieval"
  | "ai_training"
  | "corporate"
  | "syndication";

export interface LicenseTypeMeta {
  /** Canonical display label — never rewrite ad-hoc. */
  label: string;
  /** Short label for tight badges. */
  shortLabel: string;
  /** One-line description for buyer/marketing surfaces. */
  description: string;
  /**
   * Tailwind classes for a pill/badge — single canonical color per type
   * so every surface (badge, filter chip, table cell) uses the same hue
   * for the same license type.
   */
  badgeClass: string;
  /** Color for icons/dots that need to match the type. */
  textColor: string;
}

export const LICENSE_TYPE_LABELS: Record<CanonicalLicenseType, LicenseTypeMeta> = {
  editorial: {
    label: "Editorial",
    shortLabel: "Editorial",
    description:
      "Republication and reuse in articles, reports, and analysis. For journalists, researchers, analysts.",
    badgeClass:
      "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-50",
    textColor: "text-indigo-600",
  },
  archive: {
    label: "Archive",
    shortLabel: "Archive",
    description:
      "Full catalog access, time-bounded. Site-wide license covering all content within a date range.",
    badgeClass:
      "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50",
    textColor: "text-amber-600",
  },
  ai_retrieval: {
    label: "AI Retrieval & Summarization",
    shortLabel: "AI Retrieval",
    description:
      "AI systems retrieve, summarize, and serve your content in real-time (RAG, chatbots, enterprise search).",
    badgeClass:
      "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-50",
    textColor: "text-violet-600",
  },
  ai_training: {
    label: "AI Training",
    shortLabel: "AI Training",
    description:
      "Model fine-tuning and pre-training datasets. One-time bulk license.",
    badgeClass:
      "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-50",
    textColor: "text-purple-600",
  },
  corporate: {
    label: "Corporate",
    shortLabel: "Corporate",
    description:
      "Internal enterprise-wide reuse — reports, presentations, training materials.",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50",
    textColor: "text-emerald-600",
  },
  syndication: {
    label: "Syndication",
    shortLabel: "Syndication",
    description:
      "Aggregators and platforms redistribute your content to enterprise clients.",
    badgeClass:
      "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-50",
    textColor: "text-teal-600",
  },
};

export const CANONICAL_LICENSE_TYPES: CanonicalLicenseType[] = [
  "editorial",
  "archive",
  "ai_retrieval",
  "ai_training",
  "corporate",
  "syndication",
];

// ─────────────────────────────────────────────────────────────────────────────
// Legacy → canonical normalizer (read-side only)
// ─────────────────────────────────────────────────────────────────────────────
//
// The DB still stores 'human', 'ai', 'ai_inference', 'human_license',
// 'ai_ingestion', 'archive_license', 'enterprise_license', etc. Map them
// all to the 6-item canonical set at the display boundary. Backend writes
// are unaffected — we never change the value sent to APIs.
//
// Mapping rationale:
//   human, human_license          → editorial
//   ai, ai_ingestion, ai_training → ai_training
//   ai_inference                  → ai_retrieval
//   archive, archive_license      → archive
//   corporate, enterprise,
//     enterprise_license          → corporate
//   syndication                   → syndication
// ─────────────────────────────────────────────────────────────────────────────

const LEGACY_MAP: Record<string, CanonicalLicenseType> = {
  // Editorial (formerly "human")
  human: "editorial",
  human_license: "editorial",
  editorial: "editorial",

  // AI Retrieval (formerly "ai_inference" / "RAG" / "inference")
  ai_inference: "ai_retrieval",
  ai_retrieval: "ai_retrieval",
  rag: "ai_retrieval",
  inference: "ai_retrieval",

  // AI Training (formerly "ai" / "ai_ingestion" / "training")
  ai: "ai_training",
  ai_ingestion: "ai_training",
  ai_training: "ai_training",
  training: "ai_training",

  // Archive
  archive: "archive",
  archive_license: "archive",

  // Corporate (formerly "enterprise")
  corporate: "corporate",
  enterprise: "corporate",
  enterprise_license: "corporate",

  // Syndication
  syndication: "syndication",
};

/**
 * Normalize any legacy or canonical license-type token to the canonical 6.
 * Returns null when the token is unrecognized — callers should fall back to
 * a sensible default ("editorial") or render the raw value.
 */
export function normalizeLegacyType(
  raw: string | null | undefined,
): CanonicalLicenseType | null {
  if (!raw) return null;
  return LEGACY_MAP[raw.toLowerCase().trim()] ?? null;
}

/**
 * Canonical display label for any license-type token (legacy or canonical).
 * Falls back to the raw string capitalized when truly unknown — never throws.
 */
export function getLicenseTypeLabel(
  raw: string | null | undefined,
  variant: "long" | "short" = "long",
): string {
  const canonical = normalizeLegacyType(raw);
  if (canonical) {
    return variant === "short"
      ? LICENSE_TYPE_LABELS[canonical].shortLabel
      : LICENSE_TYPE_LABELS[canonical].label;
  }
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Canonical badge classes for any license-type token. */
export function getLicenseTypeBadgeClass(
  raw: string | null | undefined,
): string {
  const canonical = normalizeLegacyType(raw);
  if (canonical) return LICENSE_TYPE_LABELS[canonical].badgeClass;
  return "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-100";
}

/** Canonical icon/text color for any license-type token. */
export function getLicenseTypeTextColor(
  raw: string | null | undefined,
): string {
  const canonical = normalizeLegacyType(raw);
  if (canonical) return LICENSE_TYPE_LABELS[canonical].textColor;
  return "text-gray-500";
}

/** Get canonical metadata or null. */
export function getLicenseTypeMeta(
  raw: string | null | undefined,
): LicenseTypeMeta | null {
  const canonical = normalizeLegacyType(raw);
  return canonical ? LICENSE_TYPE_LABELS[canonical] : null;
}
