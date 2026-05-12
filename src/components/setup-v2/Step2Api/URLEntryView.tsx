import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelperExpandable } from './HelperExpandable';
import { deriveBannerCopy, FailureBanner, type UIFailure } from './FailureBanner';

// Phase 8.6 — URL_ENTRY view for Step2Api.
//
// Mirrors Step2Ghost/URLEntryView.tsx (Phase 7.5 ship) layout shape;
// fields swapped for Step2Api semantics:
//   - "Environment" radio (test/live; default test) instead of site URL
//   - "Key name" text input (optional; defaults to "Onboarding key")
//
// Layout order:
//   1. Header h1 + subheader
//   2. Field 1: Environment selector (radio group; Sandbox / Live)
//   3. Field 2: Key name (optional text)
//   4. (optional) FailureBanner — between fields and primary button
//   5. Primary button "Create API key" (always enabled if environment
//      selected; defaults to Sandbox so default state is submittable)
//   6. Secondary explainer link → docs

interface URLEntryViewProps {
  environment: 'live' | 'test';
  name: string;
  onEnvironmentChange: (value: 'live' | 'test') => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  failure: UIFailure | null;
}

export function URLEntryView({
  environment,
  name,
  onEnvironmentChange,
  onNameChange,
  onSubmit,
  isSubmitting,
  failure,
}: URLEntryViewProps) {
  const canSubmit = !isSubmitting && (environment === 'test' || environment === 'live');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  const fieldHighlight = failure ? deriveBannerCopy(failure).fieldHighlight : 'none';
  const environmentWarn = fieldHighlight === 'environment';

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-navy-deep mb-3">
            Create your API key
          </h1>
          <p className="text-gray-600 leading-relaxed">
            We'll issue an Opedd Publisher API key that lets your system push
            articles directly. You can start with a Sandbox key for testing —
            it never touches your live catalog.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <fieldset
            disabled={isSubmitting}
            aria-invalid={environmentWarn || undefined}
            className={
              environmentWarn
                ? 'rounded-lg border border-amber-300 p-4'
                : undefined
            }
          >
            <legend className="block text-sm font-medium text-navy-deep mb-2">
              Environment
            </legend>
            <div className="space-y-2">
              <label
                htmlFor="api-environment-test"
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:border-gray-300"
              >
                <input
                  id="api-environment-test"
                  type="radio"
                  name="api-environment"
                  value="test"
                  checked={environment === 'test'}
                  onChange={() => onEnvironmentChange('test')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-navy-deep">
                    Sandbox (recommended for setup)
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Key prefix <code className="font-mono">opedd_pub_test_</code>.
                    Articles you post land in a separate sandbox space —
                    safe to experiment with. 10× rate limits.
                  </div>
                </div>
              </label>

              <label
                htmlFor="api-environment-live"
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:border-gray-300"
              >
                <input
                  id="api-environment-live"
                  type="radio"
                  name="api-environment"
                  value="live"
                  checked={environment === 'live'}
                  onChange={() => onEnvironmentChange('live')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-navy-deep">
                    Live
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Key prefix <code className="font-mono">opedd_pub_</code>.
                    Articles you post land in your real catalog and become
                    licensable to AI buyers immediately.
                  </div>
                </div>
              </label>
            </div>
            <HelperExpandable
              id="api-environment-helper"
              label="Sandbox vs Live?"
            >
              <p className="mb-2">
                Sandbox is a separate space for testing — anything you push
                there is isolated from your live catalog and won't be served
                to buyers. Sandbox keys can be revoked + the sandbox data
                wiped with one call (see the docs).
              </p>
              <p>
                Live keys write to your real catalog. Articles become
                licensable as soon as they're posted.
              </p>
            </HelperExpandable>
          </fieldset>

          <div>
            <label
              htmlFor="api-name"
              className="block text-sm font-medium text-navy-deep mb-1.5"
            >
              Key name <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <Input
              id="api-name"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Onboarding key"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={isSubmitting}
              maxLength={64}
            />
            <HelperExpandable id="api-name-helper" label="What's this for?">
              <p>
                A human-readable label so you can identify this key later
                in your dashboard. We'll default to "Onboarding key" if you
                leave this blank. You can revoke + reissue keys anytime
                from Settings.
              </p>
            </HelperExpandable>
          </div>

          {failure && <FailureBanner failure={failure} />}

          <div>
            <Button type="submit" disabled={!canSubmit} className="w-full">
              Create API key
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Want the full API reference?{' '}
          <a
            href="https://docs.opedd.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-deep underline hover:no-underline"
          >
            docs.opedd.com
          </a>
        </p>
      </div>
    </div>
  );
}
