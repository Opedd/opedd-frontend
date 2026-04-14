import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deriveSlug(websiteUrl: string | null): string {
  if (!websiteUrl) return "";
  const domain = websiteUrl
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
  return domain.split(".")[0].toLowerCase();
}

export function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return null; }
}

/**
 * Extract the numeric value from a plan-price display string.
 * Examples: "$39" → 39, "$374/year" → 374, "$31" → 31.
 * Returns `fallback` if parsing fails.
 *
 * Used by Pricing.tsx / Settings.tsx / Ledger.tsx to derive numbers from the
 * `monthly_display` / `annual_total_display` strings returned by /plans.
 */
export function parsePriceDisplay(display: string | undefined | null, fallback: number): number {
  if (!display) return fallback;
  const num = Number(display.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

/**
 * Decode HTML entities and URL-encoded characters from article text.
 * Handles &amp; &#39; %21 %26 etc.
 */
export function decodeText(str: string | null | undefined): string {
  if (!str) return "";
  // First decode URL encoding
  let decoded = str;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // ignore malformed URIs
  }
  // Then decode HTML entities
  const el = document.createElement("textarea");
  el.innerHTML = decoded;
  return el.value;
}
