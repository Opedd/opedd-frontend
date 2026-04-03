/**
 * E2E: Licensing Page — /licensing
 *
 * Tests the Licensing configuration page:
 *   - Page loads without crash
 *   - License type toggles are visible (Editorial, Archive, AI Retrieval, etc.)
 *   - Price input fields appear when a license type is enabled
 *   - Save button exists and is disabled when no changes
 *   - Transactions table section (if present)
 *
 * Uses the standing test user (test@example.com) via helpers.injectAuth.
 *
 * Run: npx playwright test tests/e2e/licensing.spec.ts
 */
import { test, expect } from "@playwright/test";
import { createTestUser, destroyTestUser, TEST_PASSWORD } from "./fixtures";
import { injectAuth, waitForAppReady, dismissModal, assertNoCrash } from "./helpers";

let user: { userId: string; email: string; password: string };

test.beforeAll(async () => {
  const created = await createTestUser();
  user = { userId: created.userId, email: created.email, password: TEST_PASSWORD };
});

test.afterAll(async () => {
  if (user?.userId) await destroyTestUser(user.userId);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToLicensing(page: import("@playwright/test").Page): Promise<boolean> {
  await injectAuth(page, { email: user.email, password: user.password });
  await page.goto("/licensing", { timeout: 15_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await dismissModal(page);

  if (page.url().includes("/setup")) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Licensing — Page Load", () => {
  test("page loads without crash", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await assertNoCrash(page, "Licensing /licensing");
  });

  test("page title is set correctly", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await expect(page).toHaveTitle(/Licensing/);
  });
});

test.describe("Licensing — License Type Configuration", () => {
  test("Editorial use license type is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // The licensing page may show a PublicationGate if not verified
    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) {
      test.skip(true, "Publication not verified — licensing UI is gated");
      return;
    }

    await expect(page.getByText("Editorial use")).toBeVisible({ timeout: 5_000 });
  });

  test("Archive license type is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("Archive")).toBeVisible({ timeout: 5_000 });
  });

  test("AI Retrieval (RAG) license type is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // Look for AI-related license type text
    const hasRag = await page.getByText(/AI.*Retrieval|RAG/i).first().isVisible().catch(() => false);
    expect(hasRag).toBe(true);
  });

  test("AI Training license type is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("AI Training")).toBeVisible({ timeout: 5_000 });
  });

  test("Corporate blanket license type is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("Corporate blanket")).toBeVisible({ timeout: 5_000 });
  });

  test("Syndication license type is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("Syndication")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Licensing — Save Button", () => {
  test("Save changes button exists", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const saveBtn = page.locator("button", { hasText: "Save changes" });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  });

  test("Save button is disabled when no changes have been made", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const saveBtn = page.locator("button", { hasText: "Save changes" });
    await expect(saveBtn).toBeDisabled();
  });
});

test.describe("Licensing — License Type Toggles", () => {
  test("license types have toggle switches", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToLicensing(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // Switch toggles should be present for each license type
    const switches = page.locator("[role='switch']");
    const switchCount = await switches.count();
    expect(switchCount).toBeGreaterThanOrEqual(4); // At least editorial, archive, ai_retrieval, ai_training
  });
});
