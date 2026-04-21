export const LEGAL_METADATA = {
  privacy: { lastUpdated: "2026-04-21" },
  terms: { lastUpdated: "2026-04-21" },
  dmca: { lastUpdated: "2026-04-21" },
} as const;

export function formatLegalDate(iso: string): string {
  // Parse as UTC to avoid timezone drift on the displayed day.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
