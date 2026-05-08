import type { GhostVerifyReason, FieldHighlight } from './types';

// Phase 7.5 — Inline failure banner for Step2Ghost URL_ENTRY view.
//
// Mirrors Step2Beehiiv/FailureBanner.tsx (Phase 6.5 ship at commit
// 4868d9e). Per locked UX spec: warning tone (yellow-amber), NOT
// error red — publisher-respectful, never alarming. Banner sits
// between the form fields and the primary button so it's in the
// publisher's eye-line as they prepare to retry.
//
// Failure shape is a discriminated union covering:
//   - { kind: 'verify_failed', reason: GhostVerifyReason } — backend
//     returned `verified: false` with one of 5 enum reasons (vs
//     Beehiiv's 4; INVALID_API_KEY rename + UNREACHABLE / BAD_KEY_
//     FORMAT / TIMEOUT additions per ghost.ts:18-23 source-verified).
//     Mapped to copy + field-highlight axis per design doc § 6.
//   - { kind: 'invalid_payload' } — backend 400 INVALID_PAYLOAD;
//     both fields highlighted.
//   - { kind: 'internal_error' } — our-side 500 / network throw;
//     generic copy, no field highlight.
//
// Phase 7.5 addition (vs Beehiiv): DNS TXT fallback link offered for
// UNREACHABLE + GHOST_SERVER_ERROR + TIMEOUT failures per founder
// routing 2026-05-08 OQ-7.5-C ("every failed attempt; one-line link
// is low-friction"). Link only renders when backend ALSO signals
// `fallback_available: 'dns_txt_record'` (custom-domain Ghost
// detected) — both conditions required so Ghost(Pro) `*.ghost.io`
// publishers without DNS control don't see a non-applicable option.
//
// Field-highlight axis surfaces via the `fieldHighlight` value the
// parent (URLEntryView) reads to apply warning border on the relevant
// Input.

export type UIFailure =
  | {
      kind: 'verify_failed';
      reason: GhostVerifyReason | string;
      fallback_available?: 'dns_txt_record' | 'manual_review';
    }
  | { kind: 'invalid_payload' }
  | { kind: 'internal_error' };

interface BannerCopy {
  message: string;
  fieldHighlight: FieldHighlight;
  showDnsFallback?: boolean;
}

export function deriveBannerCopy(failure: UIFailure): BannerCopy {
  if (failure.kind === 'invalid_payload') {
    return {
      message: 'Both the site URL and Admin API key are required.',
      fieldHighlight: 'both',
    };
  }
  if (failure.kind === 'internal_error') {
    return {
      message:
        "Something went wrong on our side. We've been notified — try again in a moment.",
      fieldHighlight: 'none',
    };
  }
  // kind === 'verify_failed' — discriminate on enum reason per
  // design doc § 6 + source-verified ghost.ts:18-23 enum.
  const dnsFallbackEligible = failure.fallback_available === 'dns_txt_record';
  switch (failure.reason) {
    case 'INVALID_API_KEY':
      return {
        message:
          "Your Ghost Admin API key wasn't accepted. Double-check it in Ghost → Settings → Integrations → Custom Integrations.",
        fieldHighlight: 'admin_api_key',
      };
    case 'BAD_KEY_FORMAT':
      return {
        message:
          "Your Ghost Admin API key isn't in the expected format. It should look like key_id:hex_secret (with a colon). Re-copy it from Ghost → Settings → Integrations.",
        fieldHighlight: 'admin_api_key',
      };
    case 'UNREACHABLE':
      return {
        message:
          "We couldn't reach your Ghost site. Verify it's publicly accessible.",
        fieldHighlight: 'site_url',
        showDnsFallback: dnsFallbackEligible,
      };
    case 'GHOST_SERVER_ERROR':
      return {
        message:
          'Ghost returned an error. This is usually a transient issue. Try again in a moment, or contact support if it persists.',
        fieldHighlight: 'none',
        showDnsFallback: dnsFallbackEligible,
      };
    case 'TIMEOUT':
      return {
        message:
          'Ghost took too long to respond. Try again — sometimes self-hosted instances or tunneled URLs are slow on the first request.',
        fieldHighlight: 'none',
        showDnsFallback: dnsFallbackEligible,
      };
    default:
      // Defensive fallback — backend returned a reason string outside
      // the locked enum (Phase 7.0 ship at commit 19eaa60 / f3784eb
      // ships only 5 values, but a future regression OR upstream
      // Ghost-API change could produce something else). Treat as
      // internal_error shape.
      return {
        message:
          "Something went wrong on our side. We've been notified — try again in a moment.",
        fieldHighlight: 'none',
      };
  }
}

interface FailureBannerProps {
  failure: UIFailure;
  /** Optional callback wired by the Step2Ghost container (commit 6) to
   *  dispatch the dns_txt_record method when DNS fallback is shown +
   *  clicked. Renders only when deriveBannerCopy returns
   *  showDnsFallback: true (UNREACHABLE / GHOST_SERVER_ERROR / TIMEOUT
   *  AND backend signals fallback_available='dns_txt_record'). */
  onFallbackClick?: () => void;
}

export function FailureBanner({ failure, onFallbackClick }: FailureBannerProps) {
  const { message, showDnsFallback } = deriveBannerCopy(failure);
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p>{message}</p>
      {showDnsFallback && onFallbackClick && (
        <button
          type="button"
          onClick={onFallbackClick}
          className="mt-2 text-amber-900 underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-300 rounded-sm"
        >
          Or verify by DNS TXT record instead →
        </button>
      )}
    </div>
  );
}
