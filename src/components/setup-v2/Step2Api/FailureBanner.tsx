import type { ApiKeyCreateErrorCode, FieldHighlight } from './types';

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
      message: 'Your form values weren\'t accepted. Try again.',
      fieldHighlight: 'none',
    };
  }
  if (failure.kind === 'internal_error') {
    return {
      message:
        "Something went wrong on our side. We've been notified — try again in a moment.",
      fieldHighlight: 'none',
    };
  }
  switch (failure.code) {
    case 'VALIDATION_FAILED':
      return {
        message:
          'The form values weren\'t accepted. Your key name (if provided) must be under 64 characters.',
        fieldHighlight: 'name',
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
