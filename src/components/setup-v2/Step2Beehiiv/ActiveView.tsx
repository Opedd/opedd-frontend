import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/Spinner';

// Phase 6.5 — ACTIVE view for Step2Beehiiv (validation in flight).
//
// Per locked UX spec:
//   - Same form layout as URL_ENTRY but locked + greyed (disabled inputs,
//     not hidden — publisher sees what they submitted).
//   - Primary button replaced with inline loading state with spinner.
//   - Loading copy progression keyed to elapsed time:
//       * 0-500ms:   "Verifying with Beehiiv..."
//       * 500ms-2s:  "Verifying with Beehiiv... (this can take a moment)"
//       * 2s+:       "Still verifying... Beehiiv is being slow"
//   - Cancel button (X icon, top-right of form area) appears at 3s
//     elapsed threshold; click triggers onCancel which (in the
//     container) aborts the in-flight fetch + returns to URL_ENTRY
//     with values preserved.
//
// HelperExpandables are intentionally omitted in ACTIVE — validation
// is in flight; surfacing help docs adds visual noise. They reappear
// in URL_ENTRY if the publisher returns there via cancel or failure.
//
// LOVABLE-POLISH (Phase 10): no transition animation between copy
// strings or between buttonless/cancel-visible states. Functional
// first.

interface ActiveViewProps {
  apiKey: string;
  pubId: string;
  onCancel: () => void;
}

const COPY_PROMPT_AT_MS = 500;
const COPY_SLOW_AT_MS = 2000;
const CANCEL_AT_MS = 3000;
const TICK_INTERVAL_MS = 100;

function loadingCopy(elapsedMs: number): string {
  if (elapsedMs < COPY_PROMPT_AT_MS) return 'Verifying with Beehiiv...';
  if (elapsedMs < COPY_SLOW_AT_MS) return 'Verifying with Beehiiv... (this can take a moment)';
  return 'Still verifying... Beehiiv is being slow';
}

export function ActiveView({ apiKey, pubId, onCancel }: ActiveViewProps) {
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
            Connect your Beehiiv newsletter
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
                htmlFor="beehiiv-api-key-active"
                className="block text-sm font-medium text-navy-deep mb-1.5"
              >
                Beehiiv API key
              </label>
              <Input
                id="beehiiv-api-key-active"
                type="password"
                value={apiKey}
                disabled
                readOnly
                aria-readonly="true"
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="beehiiv-pub-id-active"
                className="block text-sm font-medium text-navy-deep mb-1.5"
              >
                Publication ID
              </label>
              <Input
                id="beehiiv-pub-id-active"
                type="text"
                value={pubId}
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
