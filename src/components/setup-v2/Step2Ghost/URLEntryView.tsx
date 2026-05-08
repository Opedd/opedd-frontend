import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelperExpandable } from './HelperExpandable';
import { deriveBannerCopy, FailureBanner, type UIFailure } from './FailureBanner';

// Phase 7.5 — URL_ENTRY view for Step2Ghost.
//
// Mirrors Step2Beehiiv/URLEntryView.tsx (Phase 6.5 ship at commit
// 4868d9e). Single-screen layout: both fields visible, generous
// vertical spacing, no auto-detect / no two-step reveal. Per locked
// UX spec (design doc § 3 + § 4).
//
// Layout order:
//   1. Header h1 + subheader
//   2. Field 1: Ghost site URL (text, NOT password — site URL is
//      shareable, not sensitive) + helper expandable
//   3. Field 2: Admin API key (password-masked — sensitive) + helper
//      expandable
//   4. (optional) FailureBanner — between fields and primary button
//      (with optional DNS fallback link rendered for UNREACHABLE +
//      GHOST_SERVER_ERROR + TIMEOUT when backend signals fallback
//      available; commit 6 container will wire onFallbackClick)
//   5. Primary button "Connect Ghost" (disabled until both filled)
//   6. Secondary "Don't have a Ghost site?" link
//
// Field naming differs from Beehiiv: site_url + admin_api_key (vs
// Beehiiv's api_key + pub_id) per backend GhostCredentials shape
// source-verified at platform_native_api.ts:51-54.
//
// Field-highlight: when failure.fieldHighlight maps to a specific
// field, that input gets a warning border. The mapping comes from
// FailureBanner's deriveBannerCopy helper to keep the contract in
// one place.

interface URLEntryViewProps {
  siteUrl: string;
  adminApiKey: string;
  onSiteUrlChange: (value: string) => void;
  onAdminApiKeyChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  failure: UIFailure | null;
  /** Optional callback for DNS TXT fallback link (commit 6 container
   *  wires; FailureBanner renders the link conditionally). */
  onFallbackClick?: () => void;
}

export function URLEntryView({
  siteUrl,
  adminApiKey,
  onSiteUrlChange,
  onAdminApiKeyChange,
  onSubmit,
  isSubmitting,
  failure,
  onFallbackClick,
}: URLEntryViewProps) {
  const canSubmit =
    !isSubmitting && siteUrl.trim().length > 0 && adminApiKey.trim().length > 0;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  // Derive field highlight axis from failure shape (single source of
  // truth — banner copy + field highlight derived together).
  const fieldHighlight = failure ? deriveBannerCopy(failure).fieldHighlight : 'none';
  const siteUrlWarn = fieldHighlight === 'site_url' || fieldHighlight === 'both';
  const adminApiKeyWarn = fieldHighlight === 'admin_api_key' || fieldHighlight === 'both';

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

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label
              htmlFor="ghost-site-url"
              className="block text-sm font-medium text-navy-deep mb-1.5"
            >
              Ghost site URL
            </label>
            <Input
              id="ghost-site-url"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://yourblog.ghost.io"
              value={siteUrl}
              onChange={(e) => onSiteUrlChange(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={siteUrlWarn || undefined}
              className={siteUrlWarn ? 'border-amber-300 focus-visible:ring-amber-200' : undefined}
            />
            <HelperExpandable
              id="ghost-site-url-helper"
              label="Where do I find this?"
            >
              <p>
                Your Ghost site URL is the public URL where your site is
                hosted — for Ghost(Pro) it ends with{' '}
                <code className="font-mono">.ghost.io</code>; for self-
                hosted Ghost, it's whatever domain you've configured.
                Include the <code className="font-mono">https://</code>.
              </p>
            </HelperExpandable>
          </div>

          <div>
            <label
              htmlFor="ghost-admin-api-key"
              className="block text-sm font-medium text-navy-deep mb-1.5"
            >
              Admin API key
            </label>
            <Input
              id="ghost-admin-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="key_id:hex_secret"
              value={adminApiKey}
              onChange={(e) => onAdminApiKeyChange(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={adminApiKeyWarn || undefined}
              className={adminApiKeyWarn ? 'border-amber-300 focus-visible:ring-amber-200' : undefined}
            />
            <HelperExpandable
              id="ghost-admin-api-key-helper"
              label="Where do I find this?"
            >
              <p className="mb-2">Open Ghost in another tab, then:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Go to <strong>Settings</strong> → <strong>Integrations</strong>
                </li>
                <li>
                  Click <strong>Add custom integration</strong>
                </li>
                <li>Name it "Opedd"</li>
                <li>
                  Copy the <strong>Admin API Key</strong> (format{' '}
                  <code className="font-mono">key_id:hex_secret</code>) and
                  paste it above
                </li>
              </ol>
            </HelperExpandable>
          </div>

          {failure && (
            <FailureBanner failure={failure} onFallbackClick={onFallbackClick} />
          )}

          <div>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full"
            >
              Connect Ghost
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have a Ghost site yet?{' '}
          <a
            href="https://ghost.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-deep underline hover:no-underline"
          >
            Get started
          </a>
        </p>
      </div>
    </div>
  );
}
