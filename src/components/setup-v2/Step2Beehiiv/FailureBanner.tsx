import type { BeehiivVerifyReason, FieldHighlight } from './types';

// Phase 6.5 — Inline failure banner for Step2Beehiiv URL_ENTRY view.
//
// Per locked UX spec: warning tone (yellow-amber), NOT error red —
// publisher-respectful, never alarming. Banner sits between the form
// fields and the primary button so it's in the publisher's eye-line
// as they prepare to retry.
//
// Failure shape is a discriminated union covering:
//   - { kind: 'verify_failed', reason: BeehiivVerifyReason } — backend
//     returned `verified: false` with one of 4 enum reasons. Mapped to
//     copy + field-highlight axis per the locked failure table.
//   - { kind: 'invalid_payload' } — backend 400 INVALID_PAYLOAD; both
//     fields highlighted.
//   - { kind: 'internal_error' } — our-side 500 / network throw;
//     generic copy, no field highlight.
//
// Field-highlight axis surfaces via the `fieldHighlight` value the
// parent (URLEntryView) reads to apply warning border on the relevant
// Input.

export type UIFailure =
  | { kind: 'verify_failed'; reason: BeehiivVerifyReason | string }
  | { kind: 'invalid_payload' }
  | { kind: 'internal_error' };

interface BannerCopy {
  message: string;
  fieldHighlight: FieldHighlight;
}

export function deriveBannerCopy(failure: UIFailure): BannerCopy {
  if (failure.kind === 'invalid_payload') {
    return {
      message: 'Both the API key and Publication ID are required.',
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
  // kind === 'verify_failed' — discriminate on enum reason
  switch (failure.reason) {
    case 'BAD_API_KEY':
      return {
        message:
          "We couldn't verify your API key. Double-check you copied it from Beehiiv → Settings → API.",
        fieldHighlight: 'api_key',
      };
    case 'PUBLICATION_NOT_FOUND':
      return {
        message:
          "We couldn't find that publication. Make sure your Publication ID matches the newsletter you're connecting.",
        fieldHighlight: 'pub_id',
      };
    case 'BEEHIIV_API_ERROR':
      return {
        message: 'Beehiiv is having trouble responding. Try again in a moment.',
        fieldHighlight: 'none',
      };
    case 'BEEHIIV_UNREACHABLE':
      return {
        message: "We couldn't reach Beehiiv. Check your connection and try again.",
        fieldHighlight: 'none',
      };
    default:
      // Defensive fallback — backend returned a reason string outside
      // the locked enum (Phase 6.0 commit d9c7aec ships only 4 values,
      // but a future regression OR upstream Beehiiv-API change could
      // produce something else). Treat as internal_error shape.
      return {
        message:
          "Something went wrong on our side. We've been notified — try again in a moment.",
        fieldHighlight: 'none',
      };
  }
}

interface FailureBannerProps {
  failure: UIFailure;
}

export function FailureBanner({ failure }: FailureBannerProps) {
  const { message } = deriveBannerCopy(failure);
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {message}
    </div>
  );
}
