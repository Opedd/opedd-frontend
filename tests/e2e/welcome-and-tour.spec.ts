/**
 * Phase A E2E — /welcome referral capture + dashboard coach-mark tour.
 *
 * Verifies the post-verification first-run experience end-to-end:
 *   1. Fresh user → /welcome renders the referral modal
 *   2. Continue (with or without a referral) → /dashboard, stamps welcome_completed_at
 *   3. First dashboard visit → coach marks render
 *   4. Skip tour / Done → coach marks disappear, stamps tour_completed_at
 *   5. Reload dashboard → coach marks do NOT re-appear (persistence check)
 *   6. Revisit /welcome after stamping → silently redirects to /dashboard (gate check)
 *
 * Prereqs for a green run (in order):
 *   - supabase/migrations/063_publisher_welcome_and_tour.sql applied to prod
 *   - publisher-profile edge function deployed (accepts welcome_completed_at,
 *     tour_completed_at in PATCH allowlist, returns them in GET response)
 *
 * Until both are shipped, this test will fail on the GET-side assertions
 * because the profile object won't include the new timestamp fields.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, destroyTestUser, ANON_KEY } from "./fixtures";
import { injectAuth } from "./helpers";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://djdzcciayennqchjgybx.supabase.co";
const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

// Helper: read publisher profile via edge function to verify server-side state
async function getProfile(accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/publisher-profile`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  return json.data ?? null;
}

test.describe("Phase A: /welcome + dashboard coach marks", () => {
  let userId = "";
  let email = "";
  let password = "";
  let accessToken = "";

  test.beforeAll(async () => {
    // Fresh user, explicitly NOT verified — no content_source, no setup_complete
    const u = await createTestUser();
    userId = u.userId;
    email = u.email;
    accessToken = u.accessToken;
    password = "E2eTest1234!";
  });

  test.afterAll(async () => {
    if (userId) await destroyTestUser(userId);
  });

  test("1. fresh user → /welcome shows referral modal", async ({ page }) => {
    await injectAuth(page, { email, password });
    await page.goto(`${BASE}/welcome`);
    await expect(
      page.getByText(/how did you hear about opedd/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("2. Continue → /dashboard, welcome_completed_at is stamped", async ({ page }) => {
    await injectAuth(page, { email, password });
    await page.goto(`${BASE}/welcome`);
    await expect(
      page.getByText(/how did you hear about opedd/i)
    ).toBeVisible({ timeout: 10_000 });

    // Hit Continue without selecting a referral (skippable path)
    await page.getByRole("button", { name: /continue to dashboard/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

    const profile = await getProfile(accessToken);
    expect(profile).not.toBeNull();
    expect(profile.welcome_completed_at).toBeTruthy();
  });

  test("3. revisit /welcome after stamp → silent redirect to /dashboard", async ({ page }) => {
    await injectAuth(page, { email, password });
    await page.goto(`${BASE}/welcome`);
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    // Referral modal should never render because welcome_completed_at is set
    await expect(page.getByText(/how did you hear about opedd/i)).toHaveCount(0);
  });

  test("4. first dashboard visit → coach marks render, Skip stamps tour_completed_at", async ({ page }) => {
    await injectAuth(page, { email, password });
    await page.goto(`${BASE}/dashboard`);
    // Wait for dashboard to finish loading (skeleton gone, first coach mark visible)
    await expect(page.getByText(/start your setup/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click "Skip tour" on the popover
    await page.getByRole("button", { name: /skip tour/i }).first().click();

    await expect(page.getByText(/start your setup/i)).toHaveCount(0, {
      timeout: 5_000,
    });

    const profile = await getProfile(accessToken);
    expect(profile.tour_completed_at).toBeTruthy();
  });

  test("5. reload dashboard → coach marks do NOT re-appear", async ({ page }) => {
    await injectAuth(page, { email, password });
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000); // give dashboard time to render
    await expect(page.getByText(/start your setup/i)).toHaveCount(0);
  });
});
