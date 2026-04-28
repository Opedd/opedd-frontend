import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import opeddIcon from "@/assets/opedd-icon.svg";
import { useAuth } from "@/contexts/AuthContext";
import { brandingApi, type PersistedBranding } from "@/lib/api";

/**
 * Phase 3 Session 3.6 — Dashboard partnership header.
 *
 * Renders the v2-spec personality band atop the Dashboard:
 *   [Opedd icon]  ×  [Publisher logo]   {Publisher name}
 *
 * Self-fetches publishers.branding_data via the extract-branding GET
 * endpoint (matches Step5Stripe / Step4Categorize self-fetch pattern).
 * branding_data is populated by extract-branding during Step 2 of any
 * platform's onboarding (Phase 1 Session 1.5 infrastructure; first
 * real Substack consumer wired in Phase 3 Session 3.3 / opedd-frontend
 * `7e650db`).
 *
 * Empty-state behavior (founder Decision OQ1, 2026-04-28):
 *   - branding_data missing both logo_url AND name → return null. The
 *     band is hidden entirely until extraction populates one of them.
 *     Avoids cluttering pre-Step-2 publishers' dashboards with a
 *     partnership header that has nothing to render.
 *   - Fetch error → also return null. Silent failure per v2 spec
 *     §"Primitive 2 — BrandingExtractor" ("Failures are silent").
 *     Sentry breadcrumb captured for observability.
 *   - Loading → compact 40px skeleton band (no layout shift on
 *     hydration; same height the rendered band would occupy).
 *
 * primary_color tint (founder Decision OQ2, 2026-04-28):
 *   Subtle flat background tint at ~10/255 (≈4%) alpha appended to
 *   the hex value. Demonstrates extract-branding's visible value
 *   without overwhelming the dashboard. Sanitized via hex regex —
 *   invalid values fall to default white bg silently. Phase 10 polish
 *   may upgrade to a gradient wash once cross-platform brand assets
 *   render reliably (current JSDOM-test environment doesn't parse
 *   linear-gradient, so v1 sticks to flat tint for testability).
 *
 * Substack publishers will NOT have branding_data.banner_url
 * (Substack RSS surfaces a single image asset used as logo_url; OG
 * fallback only fills primary_color from theme-color). v1 doesn't
 * render any banner image — header is a single-row band. Phase 10
 * polish handles banner imagery once cross-platform patterns are
 * clearer (Beehiiv / Ghost / WordPress paths may surface banners
 * differently, or not at all).
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 * - Typography weight + spacing pre-polish; v1 ships utility classes.
 * - "×" partnership separator is a literal Unicode multiplication
 *   sign; Phase 10 may want a custom partnership-icon treatment.
 * - Logo sizing fixed at 16px (Opedd) + 24px (publisher); responsive
 *   tuning in Phase 10.
 * - No banner image rendering — see paragraph above.
 * - Auth-name fallback for missing publication name (e.g. "Welcome,
 *   {first_name}") deferred per OQ1 founder decision; Phase 10 may
 *   add if "blank dashboard for prospects" feels stark in real-
 *   publisher review.
 * - "Preview your buyer-facing listing →" link from v2 spec NOT
 *   added; existing Dashboard licensingHref Preview button at line
 *   ~596 already provides this surface (founder Decision OQ3,
 *   2026-04-28). Phase 10 may bundle into a richer modal.
 */

// Validates colour values that are safe to inline-substitute into a
// CSS gradient. Accepts #rgb, #rrggbb, #rrggbbaa. Anything else falls
// to the default white background — including malformed strings,
// named colours, rgb(), and any HTML-injection attempts.
const SAFE_HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isSafeHexColor(value: unknown): value is string {
  return typeof value === "string" && SAFE_HEX_COLOR_RE.test(value);
}

type LoadState = "loading" | "ready" | "error";

export function PartnershipHeader() {
  const { getAccessToken } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [branding, setBranding] = useState<PersistedBranding | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const result = await brandingApi.get(token);
        if (cancelled) return;
        setBranding(result.branding_data ?? null);
        setLoadState("ready");
      } catch (err) {
        Sentry.addBreadcrumb({
          category: "partnership-header",
          level: "warning",
          message: "extract-branding GET failed",
          data: { error: String(err).slice(0, 120) },
        });
        if (cancelled) return;
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  // Loading: compact skeleton band, no layout shift.
  if (loadState === "loading") {
    return (
      <div
        data-testid="partnership-header-skeleton"
        className="h-10 rounded-xl bg-gray-100 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  // Error: silent. Per v2 spec, branding failures don't surface UI.
  if (loadState === "error") {
    return null;
  }

  const logoUrl = branding?.logo_url;
  const name = branding?.name;
  const primaryColor = branding?.primary_color;

  // Empty state: nothing extractable yet (pre-Step-2 publisher, or
  // extraction returned no usable fields). Hide entirely — founder
  // Decision OQ1, 2026-04-28.
  if (!logoUrl && !name) {
    return null;
  }

  // primary_color tint: subtle flat background if we have a safe hex
  // value, plain white otherwise. Inline style substitutes the colour
  // safely without going through Tailwind's static class scanner.
  // Hex+alpha pattern: append "10" to a 6-digit hex for ~6% intensity.
  // 3-digit and 8-digit hex values (already including alpha) get used
  // verbatim — design accepts the publisher's chosen alpha if they've
  // pre-baked one.
  const safeColor = isSafeHexColor(primaryColor) ? primaryColor : null;
  const tintColor = safeColor
    ? safeColor.length === 7
      ? `${safeColor}10` // #rrggbb → #rrggbb10 (~6% alpha)
      : safeColor
    : null;
  const bandStyle: React.CSSProperties | undefined = tintColor
    ? { backgroundColor: tintColor }
    : undefined;

  return (
    <header
      data-testid="partnership-header"
      className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-card"
      style={bandStyle}
    >
      <div className="flex items-center gap-3">
        <img
          src={opeddIcon}
          alt="Opedd"
          className="h-4 w-auto shrink-0"
        />
        <span
          aria-hidden="true"
          className="text-gray-300 text-sm font-light select-none"
        >
          ×
        </span>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={name ?? "Publisher logo"}
            className="h-6 w-6 rounded-md object-cover shrink-0"
            // Don't crash the band if the image 404s — render alt
            // text only. (Substack's logo URLs are CDN-hosted and
            // generally stable, but defensive is cheap.)
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {name && (
          <span className="text-sm font-semibold text-navy-deep truncate">
            {name}
          </span>
        )}
      </div>
    </header>
  );
}
