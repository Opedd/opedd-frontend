import type { ApiKeyCreateErrorCode, FieldHighlight } from './types';

// Phase 8.6 — Inline failure banner for Step2Api URL_ENTRY view.
//
// Mirrors Step2Ghost/FailureBanner.tsx (Phase 7.5 ship) — warning tone
// (yellow-amber), NOT error red. Banner sits between form fields and
// primary button so it's in the publisher's eye-line as they prepare
// to retry.
//
// Failure shape is a discriminated union covering:
//   - { kind: 'create_failed', code: ApiKeyCreateErrorCode } — backend
//     returned error envelope with a Phase 8 ErrorCode. Mapped to
//     publisher-facing copy + field-highlight axis.
//   - { kind: 'invalid_payload' } — defensive client-side guard for
//     missing environment selection (button is disabled when invalid;
//     this kind covers programmatic-submit edge cases).
//   - { kind: 'internal_error' } — our-side network throw / 5xx /
//     unexpected exception.

export type UIFailure =
  | { kind: 'create_failed'; code: ApiKeyCreateErrorCode | string }
  | { kind: 'invalid_payload' }
  | { kind: 'internal_error' };

interface BannerCopy {
  message: string;
  fieldHighlight: FieldHighlight;
}

export function deriveBannerCopy(failure: UIFailure): BannerCopy {
  if (failure.kind === 'invalid_payload') {
    return {
      message: 'Pick an environment (Sandbox or Live) before creating your key.',
      fieldHighlight: 'environment',
    };
  }
  if (failure.kind === 'internal_error') {
    return {
      message:
        "Something went wrong on our side. We've been notified — try again in a moment.",
      fieldHighlight: 'none',
    };
  }
  // kind === 'create_failed' — discriminate on Phase 8 error code
  switch (failure.code) {
    case 'VALIDATION_FAILED':
      return {
        message:
          'The form values weren\'t accepted. Double-check that you picked Sandbox or Live and that your key name (if provided) is under 64 characters.',
        fieldHighlight: 'environment',
      };
    case 'UNAUTHORIZED':
      return {
        message:
          'Your session expired while we were creating the key. Reload the page and sign in again.',
        fieldHighlight: 'none',
      };
    case 'RATE_LIMITED':
      return {
        message:
          'You\'ve created too many API keys recently. Wait a few minutes and try again.',
        fieldHighlight: 'none',
      };
    case 'INTERNAL':
    case 'INVALID_REQUEST':
    default:
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
      <p>{message}</p>
    </div>
  );
}
