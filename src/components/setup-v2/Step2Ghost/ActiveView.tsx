import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/Spinner';

// Phase 7.5 — ACTIVE view for Step2Ghost (validation in flight).
//
// Mirrors Step2Beehiiv/ActiveView.tsx (Phase 6.5 ship at commit
// a81bf22) with Ghost-specific copy + field names. Per locked UX
// spec (design doc § 4):
//   - Same form layout as URL_ENTRY but locked + greyed (disabled
//     inputs, not hidden — publisher sees what they submitted).
//   - Primary button replaced with inline loading state with spinner.
//   - Loading copy progression keyed to elapsed time:
//       * 0-500ms:   "Verifying with Ghost..."
//       * 500ms-2s:  "Verifying with Ghost... (this can take a moment)"
//       * 2s+:       "Still verifying... Ghost is being slow"
//   - Cancel button (X icon, top-right of form area) appears at 3s
//     elapsed threshold; click triggers onCancel which (in the
//     container) aborts the in-flight fetch + returns to URL_ENTRY
//     with values preserved.
//
// HelperExpandables are intentionally omitted in ACTIVE — validation
// is in flight; surfacing help docs adds visual noise. They reappear
// in URL_ENTRY if the publisher returns there via cancel or failure.
//
// Threshold timings identical to Phase 6.5 Beehiiv (500ms / 2s / 3s)
// per design doc § 4 + Phase 6.5 ActiveView precedent — Ghost(Pro)
// typical 2-4s wall-clock vs self-hosted-via-tunnel 3-5s; founder
// design intent was to surface "slow" framing at the same threshold
// regardless of platform so the UX is consistent.
//
// LOVABLE-POLISH (Phase 10): no transition animation between copy
// strings or between buttonless/cancel-visible states. Functional
// first.

interface ActiveViewProps {
  siteUrl: string;
  adminApiKey: string;
  onCancel: () => void;
}

const COPY_PROMPT_AT_MS = 500;
const COPY_SLOW_AT_MS = 2000;
const CANCEL_AT_MS = 3000;
const TICK_INTERVAL_MS = 100;

function loadingCopy(elapsedMs: number): string {
  if (elapsedMs < COPY_PROMPT_AT_MS) return 'Verifying with Ghost...';
  if (elapsedMs < COPY_SLOW_AT_MS) return 'Verifying with Ghost... (this can take a moment)';
  return 'Still verifying... Ghost is being slow';
}

export function ActiveView({ siteUrl, adminApiKey, onCancel }: ActiveViewProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const copy = loadingCopy(elapsedMs);
  const showCancel = elapsedMs >= CANCEL_AT_MS;

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-navy-deep mb-3">
            Connect your Ghost site
          </h1>
          <p className="text-gray-600 leading-relaxed">
            We'll fetch your archive and stay in sync as you publish.
          </p>
        </header>

        <div className="relative">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel verification"
              className="absolute -top-2 right-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-navy-deep hover:bg-white focus:outline-none focus:ring-2 focus:ring-navy-deep/20"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ✕
              </span>
            </button>
          )}

          <div className="space-y-6">
            <div>
              <label
                htmlFor="ghost-site-url-active"
                className="block text-sm font-medium text-navy-deep mb-1.5"
              >
                Ghost site URL
              </label>
              <Input
                id="ghost-site-url-active"
                type="text"
                value={siteUrl}
                disabled
                readOnly
                aria-readonly="true"
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="ghost-admin-api-key-active"
                className="block text-sm font-medium text-navy-deep mb-1.5"
              >
                Admin API key
              </label>
              <Input
                id="ghost-admin-api-key-active"
                type="password"
                value={adminApiKey}
                disabled
                readOnly
                aria-readonly="true"
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="mt-8 flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-700"
          >
            <Spinner />
            <span>{copy}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
