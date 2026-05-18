/**
 * Phase 11.5 Step 9 Q3 (2026-05-18) — Custom API key-reveal E2E.
 *
 * Three behavioral assertions:
 *
 *   1. Custom API SuccessView persists past the old auto-redirect window
 *      (assert visible at t=3500ms). Pre-Fix-B the SetupV2.tsx:72-76
 *      verified-redirect useEffect would unmount it in ~300-1000ms because
 *      the Phase 8.7 cascade flipped setup_state="verified" as a side
 *      effect of key creation. Post-Fix-B the cascade only flips
 *      verification_status; setup_state stays "in_setup"; the SuccessView
 *      persists until the publisher clicks Continue.
 *
 *   2. The opedd_pub_ key is retrievable + correct from Settings → Developer.
 *      Pre-fix: the reveal_api_key endpoint doesn't exist + the Reveal
 *      button doesn't render. Post-fix: backend decrypts key_encrypted
 *      (AES-GCM-256, PUBLISHER_API_KEY_MASTER_KEY) and returns plaintext;
 *      UI shows the same plaintext that was issued at create-time.
 *
 *   3. Skip — finish later CTA at Step 5 flips setup_complete=true for a
 *      Custom-API-origin publisher (founder-mandated behavioral check per
 *      Rule 14). Under Fix B this is now load-bearing: it's the only path
 *      by which a Custom API publisher who doesn't want Stripe Connect yet
 *      reaches setup_complete=true and exits the drip-nag + sitemap-
 *      exclusion state.
 *
 * Pre-fix-red / post-fix-green: Tests 1 and 2 fail pre-fix; pass post-fix.
 * Test 3 is a behavioral verification — passes both pre/post (the Skip
 * CTA itself doesn't change in this PR; verifying the wiring is what's
 * load-bearing).
 */

import { test, expect } from "@playwright/test";
import {
  createTestPublisher,
  cleanupTestPublisher,
  cleanupStaleE2EPublishers,
  injectSession,
  getAdminClient,
  type TestPublisher,
} from "./fixtures/test-publisher";

const FORCE_FAIL = process.env.E2E_FORCE_FAIL;

test.describe.serial("Custom API key-reveal + Skip-finish-later", () => {
  test("Custom API SuccessView persists past 3s after key creation (anti-bug)", async ({
    page,
  }) => {
    if (FORCE_FAIL === "customapi-reveal-persist") {
      expect(false, "E2E_FORCE_FAIL=customapi-reveal-persist").toBe(true);
    }

    await cleanupStaleE2EPublishers();
    const publisher = await createTestPublisher("customapi-keyreveal-persist", {
      platform: "api",
    });

    try {
      // Seed publisher at in_setup/2 with setup_data.platform="api" so
      // /setup-v2 dispatches directly to Step2Api/URLEntryView. The
      // fixture defaults to in_setup/1; we override to in_setup/2 with
      // the platform pre-selected.
      const admin = getAdminClient();
      await admin
        .from("publishers")
        .update({
          setup_state: "in_setup",
          setup_step: 2,
          setup_data: { platform: "api", platform_choice: "api" },
        })
        .eq("id", publisher.publisherId);

      await injectSession(page, publisher);
      await page.goto("/setup-v2");

      // Step2Api/URLEntryView renders the "Create key" form. Submit it
      // (name field is optional; fixture provides default "Onboarding key").
      await expect(
        page.getByRole("button", { name: /Create.*key|Issue.*key|Generate/i }),
      ).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: /Create.*key|Issue.*key|Generate/i }).click();

      // SuccessView heading "Your API key is ready" must be visible AND
      // remain visible past the pre-Fix-B auto-redirect window (~300-1000ms
      // in production telemetry). Sample at t=3500ms to give safe margin.
      await expect(
        page.getByRole("heading", { name: /Your API key is ready/i }),
        "Pre-fix bug shape: SuccessView would unmount via SetupV2.tsx:72 " +
          "redirect within ~1s of mount. If this assertion fails post-fix, " +
          "the Phase 8.7 cascade is still flipping setup_state and Fix B " +
          "didn't land correctly.",
      ).toBeVisible({ timeout: 10_000 });

      // The actual anti-bug assertion: still visible at 3500ms.
      await page.waitForTimeout(3500);
      await expect(
        page.getByRole("heading", { name: /Your API key is ready/i }),
      ).toBeVisible();

      // Also assert the plaintext code element renders (not just the heading).
      await expect(page.locator("#api-key-reveal")).toBeVisible();
    } finally {
      await cleanupTestPublisher(publisher);
    }
  });

  test("opedd_pub_ key retrievable from Settings → Developer matches issued plaintext", async ({
    page,
  }) => {
    if (FORCE_FAIL === "customapi-reveal-settings") {
      expect(false, "E2E_FORCE_FAIL=customapi-reveal-settings").toBe(true);
    }

    await cleanupStaleE2EPublishers();
    const publisher = await createTestPublisher("customapi-keyreveal-settings", {
      platform: "api",
    });

    try {
      const admin = getAdminClient();

      // Seed publisher at in_setup/2 so Step2Api dispatches.
      await admin
        .from("publishers")
        .update({
          setup_state: "in_setup",
          setup_step: 2,
          setup_data: { platform: "api", platform_choice: "api" },
        })
        .eq("id", publisher.publisherId);

      await injectSession(page, publisher);
      await page.goto("/setup-v2");

      await page.getByRole("button", { name: /Create.*key|Issue.*key|Generate/i }).click();

      // Capture the plaintext key from the SuccessView reveal element.
      const issuedPlaintext = await page
        .locator("#api-key-reveal")
        .innerText({ timeout: 10_000 });

      expect(
        issuedPlaintext.startsWith("opedd_pub_"),
        `Issued plaintext should start with opedd_pub_ prefix; got: ${issuedPlaintext.slice(0, 20)}…`,
      ).toBe(true);

      // Acknowledge + continue to advance out of Step2Api. The "I've saved
      // this key in a secure location" checkbox gates the Continue button
      // per SuccessView.tsx:271-298.
      await page.getByLabel(/I've saved this key/i).check();
      await page.getByRole("button", { name: /^Continue$/i }).click();

      // Navigate to Settings → Developers tab directly via the ?tab=developers
      // URL param. Settings.tsx:213-226 reads the query param on mount and
      // initializes activeTab to "developers", skipping the default "profile"
      // landing. Avoids a flaky conditional-tab-click race where isVisible()
      // returned falsy at the page-goto resolution moment (before React mounted
      // the TabsList), leaving activeTab="profile" and the API keys panel
      // unmounted. Captured 2026-05-18 from run 26045521047 page-snapshot
      // showing `tab "Profile" [selected]` post-test-navigation.
      await page.goto("/settings?tab=developers");

      // Find the "Reveal" button for the just-issued key. The button has
      // data-testid={`reveal-key-${k.id}`} per Settings.tsx (Phase 11.5
      // Q3 reveal UI). We don't know the key id in the test directly;
      // there should only be one non-revoked key for a fresh publisher,
      // so we match the first Reveal button.
      const revealButton = page.getByRole("button", { name: /^Reveal$/ }).first();
      await expect(
        revealButton,
        "Reveal button must be visible for the freshly-issued key on the " +
          "Settings → Developer panel. Pre-fix the Reveal button doesn't " +
          "exist; post-fix it renders next to Revoke for non-revoked keys.",
      ).toBeVisible({ timeout: 10_000 });

      await revealButton.click();

      // Revealed plaintext renders in the dialog at data-testid=
      // "revealed-key-plaintext" (Settings.tsx revealed-key dialog).
      await expect(
        page.locator("[data-testid='revealed-key-plaintext']"),
        "Revealed key dialog must render with the decrypted plaintext.",
      ).toBeVisible({ timeout: 10_000 });

      const revealedPlaintext = await page
        .locator("[data-testid='revealed-key-plaintext']")
        .innerText();

      expect(
        revealedPlaintext,
        "The plaintext revealed from Settings → Developer MUST exactly match " +
          "the plaintext issued at create-time. If they differ, the encrypt/" +
          "decrypt roundtrip has a bug.",
      ).toBe(issuedPlaintext);
    } finally {
      await cleanupTestPublisher(publisher);
    }
  });

  test("Step5 'Skip — finish later' flips setup_complete=true for Custom API publisher", async ({
    page,
  }) => {
    if (FORCE_FAIL === "customapi-skip-step5") {
      expect(false, "E2E_FORCE_FAIL=customapi-skip-step5").toBe(true);
    }

    await cleanupStaleE2EPublishers();
    const publisher = await createTestPublisher("customapi-skip-step5", {
      platform: "api",
    });

    try {
      const admin = getAdminClient();

      // Seed publisher at in_setup/5 with platform="api" and a verified
      // content_sources row + a previously-issued API key (matching the
      // canonical state of a Custom API publisher who has reached Step 5
      // under Fix B). This is a behavioral verification of the Skip-CTA
      // wiring per founder mandate — Rule 14 canonical-test.
      await admin
        .from("publishers")
        .update({
          setup_state: "in_setup",
          setup_step: 5,
          setup_complete: false,
          verification_status: "verified",
          setup_data: {
            platform: "api",
            platform_choice: "api",
            api_key_id: "00000000-0000-0000-0000-000000000000",
            api_key_prefix: "opedd_pub_t",
          },
        })
        .eq("id", publisher.publisherId);
      await admin.from("content_sources").insert({
        user_id: publisher.userId,
        source_type: "custom",
        url: `custom:e2e-skip-step5-${Date.now()}`,
        name: "E2E custom API source",
        is_active: true,
        sync_status: "active",
        verification_status: "verified",
      });

      await injectSession(page, publisher);
      await page.goto("/setup-v2");

      // Step5Stripe should render. The Skip button text per Step5Stripe.tsx:298
      // is "Skip — finish later".
      const skipButton = page.getByRole("button", { name: /Skip.*finish.*later/i });
      await expect(
        skipButton,
        "Step5Stripe must render the 'Skip — finish later' CTA for a Custom " +
          "API publisher in (in_setup, 5). Post-Fix-B this is the load-bearing " +
          "path for a Custom API publisher who doesn't want Stripe Connect yet.",
      ).toBeVisible({ timeout: 10_000 });

      await skipButton.click();

      // After Skip, wizard.advance() → (connected, 5) with setup_complete=true.
      // SetupV2 re-renders → TerminalState 'connected' → UX-2 auto-redirect
      // to /dashboard in 2.5s. Wait for the redirect.
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

      // Verify setup_complete=true in DB via service-role probe.
      const { data: pub } = await admin
        .from("publishers")
        .select("setup_complete, setup_state")
        .eq("id", publisher.publisherId)
        .single();

      expect(
        (pub as { setup_complete: boolean } | null)?.setup_complete,
        "Skip — finish later MUST flip setup_complete=true via the wizard CAS. " +
          "If false, the Custom API publisher is stranded — drip + sitemap " +
          "won't recognize them as completed. This is the founder's load-" +
          "bearing concern from the Q3 ratification.",
      ).toBe(true);
      expect(
        (pub as { setup_state: string } | null)?.setup_state,
        "setup_state must advance from in_setup → connected on Step 5 Skip.",
      ).toBe("connected");
    } finally {
      await cleanupTestPublisher(publisher);
    }
  });
});
