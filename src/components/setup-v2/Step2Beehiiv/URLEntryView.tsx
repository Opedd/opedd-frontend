import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelperExpandable } from './HelperExpandable';
import { deriveBannerCopy, FailureBanner, type UIFailure } from './FailureBanner';

// Phase 6.5 — URL_ENTRY view for Step2Beehiiv.
//
// Single-screen layout: both fields visible, generous vertical spacing,
// no auto-detect / no two-step reveal. Per locked UX spec.
//
// Layout order:
//   1. Header h1 + subheader
//   2. Field 1: Beehiiv API key (password-masked) + helper expandable
//   3. Field 2: Publication ID (text) + helper expandable
//   4. (optional) FailureBanner — between fields and primary button
//   5. Primary button "Connect Beehiiv" (disabled until both filled)
//   6. Secondary "Don't have a Beehiiv account?" link
//
// Field-highlight: when failure.fieldHighlight maps to a specific
// field, that input gets a warning border. The mapping comes from
// FailureBanner's deriveBannerCopy helper to keep the contract in
// one place.

interface URLEntryViewProps {
  apiKey: string;
  pubId: string;
  onApiKeyChange: (value: string) => void;
  onPubIdChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  failure: UIFailure | null;
}

export function URLEntryView({
  apiKey,
  pubId,
  onApiKeyChange,
  onPubIdChange,
  onSubmit,
  isSubmitting,
  failure,
}: URLEntryViewProps) {
  const canSubmit =
    !isSubmitting && apiKey.trim().length > 0 && pubId.trim().length > 0;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  // Derive field highlight axis from failure shape (single source of
  // truth — banner copy + field highlight derived together).
  const fieldHighlight = failure ? deriveBannerCopy(failure).fieldHighlight : 'none';
  const apiKeyWarn = fieldHighlight === 'api_key' || fieldHighlight === 'both';
  const pubIdWarn = fieldHighlight === 'pub_id' || fieldHighlight === 'both';

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

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label
              htmlFor="beehiiv-api-key"
              className="block text-sm font-medium text-navy-deep mb-1.5"
            >
              Beehiiv API key
            </label>
            <Input
              id="beehiiv-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="bh_..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={apiKeyWarn || undefined}
              className={apiKeyWarn ? 'border-amber-300 focus-visible:ring-amber-200' : undefined}
            />
            <HelperExpandable
              id="beehiiv-api-key-helper"
              label="Where do I find this?"
            >
              <p className="mb-2">Open Beehiiv in another tab, then:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click your profile in the bottom-left</li>
                <li>
                  Go to <strong>Settings</strong> → <strong>Integrations</strong>
                </li>
                <li>
                  Under "API," click <strong>Create new API key</strong>
                </li>
                <li>Name it "Opedd," then copy the key here</li>
              </ol>
            </HelperExpandable>
          </div>

          <div>
            <label
              htmlFor="beehiiv-pub-id"
              className="block text-sm font-medium text-navy-deep mb-1.5"
            >
              Publication ID
            </label>
            <Input
              id="beehiiv-pub-id"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="pub_..."
              value={pubId}
              onChange={(e) => onPubIdChange(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={pubIdWarn || undefined}
              className={pubIdWarn ? 'border-amber-300 focus-visible:ring-amber-200' : undefined}
            />
            <HelperExpandable
              id="beehiiv-pub-id-helper"
              label="Where do I find this?"
            >
              <p className="mb-2">
                Your Publication ID is the part of your Beehiiv dashboard URL
                that starts with <code className="font-mono">pub_</code>:
              </p>
              <pre className="font-mono text-xs bg-white border border-gray-200 rounded px-3 py-2 overflow-x-auto">
                https://app.beehiiv.com/publications/<strong>pub_a1b2c3d4...</strong>
              </pre>
              <p className="mt-2">
                Copy everything starting with <code className="font-mono">pub_</code>{' '}
                and paste it above.
              </p>
            </HelperExpandable>
          </div>

          {failure && <FailureBanner failure={failure} />}

          <div>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full"
            >
              Connect Beehiiv
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have a Beehiiv account yet?{' '}
          <a
            href="https://www.beehiiv.com/sign-up"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-deep underline hover:no-underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
