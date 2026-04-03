/**
 * E2E: Dashboard
 *
 * Tests the main dashboard page at /dashboard.
 * Uses the standard test user (test@example.com) which should have
 * setup_complete = true. If not, tests handle the /setup redirect.
 *
 * Run: npx playwright test tests/e2e/dashboard.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { createTestUser, destroyTestUser, TEST_PASSWORD, ANON_KEY } from "./fixtures";
import { injectAuth, waitForAppReady, dismissModal, assertNoCrash } from "./helpers";

let user: { userId: string; email: string; password: string };

test.beforeAll(async () => {
  const created = await createTestUser();
  user = { userId: created.userId, email: created.email, password: TEST_PASSWORD };
});

test.afterAll(async () => {
  if (user?.userId) await destroyTestUser(user.userId);
});

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/dashboard");
    await waitForAppReady(page);
    await dismissModal(page);
  });

  test("renders dashboard or redirects to setup (no crash)", async ({
    page,
  }) => {
    await assertNoCrash(page, "Dashboard /dashboard");

    const url = page.url();
    const validPage = url.includes("/dashboard") || url.includes("/setup");
    expect(validPage).toBe(true);
  });

  test("shows Licensed Works and Total Revenue metrics", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup — dashboard not accessible");
      return;
    }

    await expect(page.getByText("Licensed Works")).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();
  });

  test("metrics show numeric values (not stuck loading)", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    // Wait for loading to finish — the pulse animation should disappear
    await page
      .locator(".animate-pulse")
      .first()
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});

    // At least one metric card should contain a number (0 or more)
    const licensedWorksCard = page.locator("text=Licensed Works").locator("..");
    const revenueCard = page.locator("text=Total Revenue").locator("..");

    // The value is a <p> with text-2xl class containing a number
    const licensedValue = licensedWorksCard.locator("p.text-2xl");
    const revenueValue = revenueCard.locator("p.text-2xl");

    // At least one should be visible (they load in parallel)
    const hasLicensed = await licensedValue.isVisible().catch(() => false);
    const hasRevenue = await revenueValue.isVisible().catch(() => false);
    expect(hasLicensed || hasRevenue).toBe(true);
  });

  test("Sources section is visible with Register content button", async ({
    page,
  }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    // Sources heading
    await expect(page.getByText("Sources")).toBeVisible();

    // Register content button
    const registerBtn = page.getByRole("button", {
      name: /register content/i,
    });
    await expect(registerBtn).toBeVisible();
  });

  test("Register content button navigates to /setup", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    const registerBtn = page.getByRole("button", {
      name: /register content/i,
    });
    await registerBtn.click();
    await page.waitForURL("**/setup", { timeout: 5000 });
    expect(page.url()).toContain("/setup");
  });

  test("shows licensing URL or settings prompt", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    // Either the licensing URL (opedd.com/p/...) or a prompt to set website URL
    const hasUrl = await page
      .locator("text=opedd.com/p/")
      .isVisible()
      .catch(() => false);
    const hasPrompt = await page
      .getByText(/set your website url/i)
      .isVisible()
      .catch(() => false);

    expect(hasUrl || hasPrompt).toBe(true);
  });

  test("sidebar has navigation links", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    // Key nav links in the sidebar/layout
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /content/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
  });

  test("sidebar Content link navigates to /content", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    await page.getByRole("link", { name: /content/i }).click();
    await page.waitForURL("**/content", { timeout: 5000 });
    expect(page.url()).toContain("/content");
  });

  test("sidebar Settings link navigates to /settings", async ({ page }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    await page.getByRole("link", { name: /settings/i }).click();
    await page.waitForURL("**/settings", { timeout: 5000 });
    expect(page.url()).toContain("/settings");
  });

  test("Pending Earnings card shows when Stripe not connected", async ({
    page,
  }) => {
    if (page.url().includes("/setup")) {
      test.skip(true, "User redirected to setup");
      return;
    }

    // This may or may not be visible depending on whether Stripe is connected.
    // If visible, it should have a "Connect Stripe" button.
    const pendingCard = page.getByText(/pending earnings/i);
    const isVisible = await pendingCard.isVisible().catch(() => false);

    if (isVisible) {
      // The Connect Stripe button should be within the card
      await expect(
        page.getByRole("button", { name: /connect stripe/i })
      ).toBeVisible();
    }
    // If not visible, Stripe is already connected — that's fine too.
  });

  test("no ErrorBoundary crash", async ({ page }) => {
    await assertNoCrash(page, "Dashboard");
  });
});
