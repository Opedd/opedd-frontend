import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';

interface ActiveViewProps {
  name: string;
  onCancel: () => void;
}

const COPY_PROMPT_AT_MS = 500;
const COPY_SLOW_AT_MS = 2000;
const CANCEL_AT_MS = 3000;
const TICK_INTERVAL_MS = 100;

function loadingCopy(elapsedMs: number): string {
  if (elapsedMs < COPY_PROMPT_AT_MS) return 'Creating your API key...';
  if (elapsedMs < COPY_SLOW_AT_MS) return 'Creating your API key... (this usually takes a second)';
  return 'Still creating... hold tight';
}

export function ActiveView({ name, onCancel }: ActiveViewProps) {
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
            Create your API key
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Issuing your{' '}
            <span className="font-mono text-navy-deep">opedd_pub_</span>{' '}
            key{name ? ` "${name}"` : ''}…
          </p>
        </header>

        <div className="relative">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel key creation"
              className="absolute -top-2 right-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-navy-deep hover:bg-white focus:outline-none focus:ring-2 focus:ring-navy-deep/20"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ✕
              </span>
            </button>
          )}

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
