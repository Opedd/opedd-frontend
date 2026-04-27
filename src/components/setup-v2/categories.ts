/**
 * Phase 3 Session 3.4 — hardcoded category list for Step4Categorize.
 *
 * 12 top-level categories for v1. Selected with conscious eye toward
 * the Phase 2 Session 2.4a planned taxonomy spec (which will produce
 * a 12-15-top-level system). When Phase 2 ships
 * supabase/functions/_shared/taxonomy.ts, swap this import for the
 * canonical taxonomy constant — single-line edit, same string values
 * stay valid as long as the Phase 2 taxonomy uses string-equal names
 * for the same concepts.
 *
 * "Other" is the free-text escape hatch — selecting it reveals an
 * input that writes to the same publishers.category TEXT field with
 * whatever the publisher types. Buyer-side discovery filtering can
 * still operate on the typed string; just less discoverable than a
 * curated category.
 *
 * Names chosen to be (a) buyer-side-discoverable (consistent with
 * how AI lab procurement queries describe content domains), (b)
 * publisher-side-recognizable (most Indie Titan publishers should
 * find a fit on the first scan), (c) forward-compatible with the
 * Phase 2 taxonomy direction.
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 * - Category names are functional, not branded. Phase 10 can refine
 *   wording (e.g., "Markets" might become "Capital Markets" if buyer
 *   research suggests it scans better).
 * - Order is alphabetical for v1 (no ordering signal). Phase 10 may
 *   want to surface most-selected at top once data exists.
 * - Icons not included in v1; Lovable may add per-category iconography.
 */

export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: ReadonlyArray<Category> = [
  { id: "Climate", label: "Climate" },
  { id: "Culture", label: "Culture" },
  { id: "Energy", label: "Energy" },
  { id: "Finance", label: "Finance" },
  { id: "Geopolitics", label: "Geopolitics" },
  { id: "Health", label: "Health" },
  { id: "Markets", label: "Markets" },
  { id: "Politics", label: "Politics" },
  { id: "Science", label: "Science" },
  { id: "Technology", label: "Technology" },
  // Sentinel for free-text escape hatch — special-cased in Step4Categorize.
  { id: "__OTHER__", label: "Other (specify)" },
];

export const OTHER_CATEGORY_ID = "__OTHER__";
