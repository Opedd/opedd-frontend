/**
 * Phase 11.5 — Multi-newsletter add-newsletter deep-link E2E behavioral test.
 *
 * Coverage-gap fix filed 2026-05-18 after the founder's Phase 11 walkthrough
 * caught a Rule-18-violation: the M7.1.1 invariant fix updated the
 * AddAnotherNewsletterCard visibility gate (Dashboard.tsx:362) from
 * `setupState === "verified"` to `verificationStatus === "verified"` but
 * missed the matched dispatch gate at SetupV2.tsx:89. A `connected` state
 * publisher (post-Stripe, pre-auto-verify-cron) saw the card but couldn't
 * click through — the dispatch fell through to TerminalState and bounced
 * them back to Dashboard. The 5/5 green Phase 11.5 suite had no test on
 * this path; first-time onboarding specs only.
 *
 * This spec parametrizes over beehiiv / ghost / substack (the 3 platforms
 * that show the AddAnotherNewsletterCard per M7.1) and asserts the
 * deep-link click-through renders the Step2 form, NOT TerminalState.
 * Each test sets up a `connected`-state publisher (the exact state the
 * walkthrough caught the bug in) and exercises the deep-link without
 * relying on a real Stripe Connect roundtrip.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 * (createTestPublisher prerequisites). No platform credentials required —
 * this test asserts ROUTING, not Step2-form-submission success.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  createTestPublisher,
  cleanupTestPublisher,
  cleanupStaleE2EPublishers,
  injectSession,
  getAdminClient,
  type TestPublisher,
} from "./fixtures/test-publisher";

const FORCE_FAIL = process.env.E2E_FORCE_FAIL;

type Platform = "beehiiv" | "ghost" | "substack";

const PLATFORMS: readonly Platform[] = ["beehiiv", "ghost", "substack"] as const;

// Per-platform Step2 form selector. We assert the Step2 form is visible
// (NOT TerminalState's "Your setup is complete" copy) — that proves the
// dispatch at SetupV2.tsx:89 caught the deep-link before the
// `setupState === "connected"` TerminalState branch at :112.
const STEP2_FORM_HEADING: Record<Platform, RegExp> = {
  // Step2Beehiiv renders an API-key form with a "Beehiiv" heading
  beehiiv: /Beehiiv/i,
  // Step2Ghost renders a site_url + admin_api_key form
  ghost: /Ghost/i,
  // Step2Substack renders a publication-url form
  substack: /Substack/i,
};

/**
 * Promote a freshly-created publisher to `setup_state="connected"` —
 * i.e., post-Stripe-Connect state where the auto-verify-publishers cron
 * has not yet promoted the row to "verified". Also seeds a verified
 * content_sources row so the AddAnotherNewsletterCard visibility gate
 * (Dashboard.tsx:362, gates on verificationStatus === "verified") would
 * pass for this publisher.
 *
 * This bypasses the real Stripe Connect roundtrip — it's a state probe,
 * not an end-to-end Stripe test. Stripe is covered by the existing
 * first-onboarding specs.
 */
async function promoteToConnected(
  publisher: TestPublisher,
  platform: Platform,
): Promise<void> {
  const admin = getAdminClient();

  await admin
    .from("publishers")
    .update({
      setup_state: "connected",
      setup_complete: true,
      verification_status: "verified",
      stripe_account_id: `acct_e2e_${platform}_${Date.now()}`,
      stripe_onboarding_complete: true,
    })
    .eq("id", publisher.publisherId);

  // Mark the content_sources row as verified so the publication shows
  // up under the publisher in Dashboard reads. The fixture's
  // createTestPublisher doesn't create a content_sources row by
  // default; insert one here.
  await admin.from("content_sources").insert({
    user_id: publisher.userId,
    source_type: platform,
    url: `${platform}:e2e-deeplink-${Date.now()}`,
    name: `E2E deep-link source ${platform}`,
    is_active: true,
    sync_status: "active",
    verification_status: "verified",
  });
}

async function assertStep2RendersNotTerminal(
  page: Page,
  platform: Platform,
): Promise<void> {
  // TerminalState renders the copy "Your setup is complete" (per
  // TerminalState.tsx:50). If that string is visible after navigating
  // to the deep-link, the dispatch fell through to TerminalState —
  // the exact pre-fix bug shape.
  const terminalStateLocator = page.getByText(/Your setup is complete/i);
  await expect(
    terminalStateLocator,
    `Pre-fix bug shape: TerminalState should NOT render on ` +
      `/setup-v2?mode=add-newsletter&platform=${platform}. ` +
      `If this assertion fails, the dispatch gate at SetupV2.tsx:89 ` +
      `is still setup_state-coupled and the add-newsletter deep-link ` +
      `is broken.`,
  ).not.toBeVisible({ timeout: 4000 });

  // Step2<Platform> form should render. We assert via the platform
  // heading (each Step2 component carries its platform name in a
  // visible heading). Loose regex match keeps the assertion resilient
  // to minor copy changes.
  const step2Heading = page.getByRole("heading", {
    name: STEP2_FORM_HEADING[platform],
  });
  await expect(
    step2Heading,
    `Step2${platform[0].toUpperCase()}${platform.slice(1)} form heading ` +
      `should be visible after the deep-link dispatches correctly.`,
  ).toBeVisible({ timeout: 4000 });
}

test.describe.parallel("Multi-newsletter add-newsletter deep-link", () => {
  for (const platform of PLATFORMS) {
    test.describe.serial(`${platform} path`, () => {
      let publisher: TestPublisher;

      test.beforeAll(async () => {
        await cleanupStaleE2EPublishers();
        publisher = await createTestPublisher(`multinewsletter-${platform}`, {
          platform,
        });
        await promoteToConnected(publisher, platform);
      });

      test.afterAll(async () => {
        if (publisher) await cleanupTestPublisher(publisher);
      });

      test(`${platform} deep-link renders Step2 form, not TerminalState`, async ({
        page,
      }) => {
        if (FORCE_FAIL === `multinewsletter-${platform}`) {
          expect(false, `E2E_FORCE_FAIL=multinewsletter-${platform}`).toBe(true);
        }

        await injectSession(page, publisher);
        await page.goto(`/setup-v2?mode=add-newsletter&platform=${platform}`);

        await assertStep2RendersNotTerminal(page, platform);
      });
    });
  }
});
