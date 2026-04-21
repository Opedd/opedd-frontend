/**
 * Canonical numeric / currency formatting.
 * All product surfaces must render dollar amounts via `formatUSD`,
 * integer counts via `formatInteger`, and percentages via `formatPercent`.
 *
 * Rules of thumb:
 *  - `formatUSD(0)`            → "$0.00"
 *  - `formatUSD(null)`         → "—"     (per axis-3 audit)
 *  - `formatUSD(1234.5)`       → "$1,234.50"
 *  - `formatUSD(12, {sign})`   → "+$12.00"
 *  - `formatInteger(1234)`     → "1,234"
 *  - `formatPercent(0.1234)`   → "12.3%"
 */

export function formatUSD(
  amount: number | null | undefined,
  opts?: { emptyAs?: string; sign?: boolean },
): string {
  if (amount == null || !Number.isFinite(amount)) return opts?.emptyAs ?? "—";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: opts?.sign ? "exceptZero" : "auto",
  });
  return formatter.format(amount);
}

export function formatInteger(
  value: number | null | undefined,
  opts?: { emptyAs?: string },
): string {
  if (value == null || !Number.isFinite(value)) return opts?.emptyAs ?? "—";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatPercent(
  ratio: number | null | undefined,
  opts?: { decimals?: number; emptyAs?: string },
): string {
  if (ratio == null || !Number.isFinite(ratio)) return opts?.emptyAs ?? "—";
  return `${(ratio * 100).toFixed(opts?.decimals ?? 1)}%`;
}
