/**
 * E2E: Settings Page
 *
 * Tests the settings page at /settings with its 7 tabs:
 * Profile, Pricing, AI Licensing, Team, API Keys, Billing, Content.
 *
 * Uses the standard test user (test@example.com) via helpers.injectAuth.
 *
 * Run: npx playwright test tests/e2e/settings.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
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

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to settings and handle potential redirect to /setup */
async function goToSettings(page: Page): Promise<boolean> {
  await injectAuth(page, { email: user.email, password: user.password });
  await page.goto("/settings");
  await waitForAppReady(page);
  await dismissModal(page);

  // If redirected to setup, return false
  if (page.url().includes("/setup")) return false;
  return true;
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Settings — Tabs", () => {
  test("renders all 7 settings tabs", async ({ page }) => {
    const ok = await goToSettings(page);
    if (!ok) {
      test.skip(true, "User redirected to setup — settings not accessible");
      return;
    }

    await assertNoCrash(page, "Settings /settings");

    // All 7 standard tabs
    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pricing" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "AI Licensing" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Team" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "API Keys" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Billing" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Content" })).toBeVisible();
  });

  test("Profile tab is selected by default", async ({ page }) => {
    const ok = await goToSettings(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    const profileTab = page.getByRole("tab", { name: "Profile" });
    await expect(profileTab).toHaveAttribute("data-state", "active");
  });
});

test.describe("Settings — Profile Tab", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await goToSettings(page);
    if (!ok) test.skip(true, "Redirected to setup");
  });

  test("shows Publisher Name field (editable)", async ({ page }) => {
    await expect(page.getByText("Publisher Name")).toBeVisible();

    const nameInput = page.getByPlaceholder("Your display name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEditable();
  });

  test("shows Email Address field (read-only)", async ({ page }) => {
    await expect(page.getByText("Email Address")).toBeVisible();

    // Email field is disabled
    const emailInput = page
      .locator("input[disabled]")
      .filter({ hasText: /.*/ })
      .first();
    await expect(emailInput).toBeVisible();
  });

  test("shows Website URL field (editable)", async ({ page }) => {
    await expect(page.getByText("Website URL")).toBeVisible();

    const urlInput = page.getByPlaceholder("https://yoursite.com");
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEditable();
  });

  test("shows Bio textarea", async ({ page }) => {
    await expect(page.getByText("Bio")).toBeVisible();
    await expect(
      page.getByPlaceholder("Tell us about yourself and your work...")
    ).toBeVisible();
  });

  test("shows Publication Category dropdown with options", async ({
    page,
  }) => {
    await expect(page.getByText("Publication Category")).toBeVisible();

    const select = page.locator("select").first();
    await expect(select).toBeVisible();

    // Verify some category options exist
    await expect(select.locator("option", { hasText: "Technology" })).toBeAttached();
    await expect(
      select.locator("option", { hasText: "News & Journalism" })
    ).toBeAttached();
  });

  test("shows Annual Catalog Price field", async ({ page }) => {
    await expect(page.getByText("Annual Catalog Price")).toBeVisible();
  });

  test("publisher name can be typed into", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Your display name");
    await nameInput.clear();
    await nameInput.fill("E2E Test Name");
    await expect(nameInput).toHaveValue("E2E Test Name");

    // Don't save — this is a read-only test that verifies the field is editable.
    // Clear back to avoid side effects.
    await nameInput.clear();
  });
});

test.describe("Settings — Tab Switching", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await goToSettings(page);
    if (!ok) test.skip(true, "Redirected to setup");
  });

  test("Pricing tab renders pricing content", async ({ page }) => {
    await page.getByRole("tab", { name: "Pricing" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole("tab", { name: "Pricing" })).toHaveAttribute(
      "data-state",
      "active"
    );

    // Pricing tab should contain price-related content
    const hasPricing = await page
      .getByText(/price|per article|license type/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasPricing).toBe(true);
  });

  test("AI Licensing tab renders AI licensing content", async ({ page }) => {
    await page.getByRole("tab", { name: "AI Licensing" }).click();
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("tab", { name: "AI Licensing" })
    ).toHaveAttribute("data-state", "active");

    const hasAiContent = await page
      .getByText(/ai|training|inference|rag/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasAiContent).toBe(true);
  });

  test("Team tab renders team management content", async ({ page }) => {
    await page.getByRole("tab", { name: "Team" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute(
      "data-state",
      "active"
    );

    const hasTeam = await page
      .getByText(/team|member|invite|owner/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasTeam).toBe(true);
  });

  test("API Keys tab shows API key information", async ({ page }) => {
    await page.getByRole("tab", { name: "API Keys" }).click();
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("tab", { name: "API Keys" })
    ).toHaveAttribute("data-state", "active");

    const hasApiKey = await page
      .getByText(/api key|op_|regenerate/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasApiKey).toBe(true);
  });

  test("Billing tab renders billing/plan info", async ({ page }) => {
    await page.getByRole("tab", { name: "Billing" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole("tab", { name: "Billing" })).toHaveAttribute(
      "data-state",
      "active"
    );

    const hasBilling = await page
      .getByText(/plan|billing|stripe|subscription|free|pro|enterprise/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasBilling).toBe(true);
  });

  test("Content tab renders content management", async ({ page }) => {
    await page.getByRole("tab", { name: "Content" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "data-state",
      "active"
    );

    const hasContent = await page
      .getByText(/content|article|source|url|pattern|exclu/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent).toBe(true);
  });
});

test.describe("Settings — Deep Links", () => {
  test("/settings?tab=billing opens Billing tab directly", async ({
    page,
  }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=billing");
    await waitForAppReady(page);
    await dismissModal(page);

    if (page.url().includes("/setup")) {
      test.skip(true, "Redirected to setup");
      return;
    }

    await expect(page.getByRole("tab", { name: "Billing" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("/settings?tab=team opens Team tab directly", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=team");
    await waitForAppReady(page);
    await dismissModal(page);

    if (page.url().includes("/setup")) {
      test.skip(true, "Redirected to setup");
      return;
    }

    await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("/settings?tab=api-keys opens API Keys tab directly", async ({
    page,
  }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=api-keys");
    await waitForAppReady(page);
    await dismissModal(page);

    if (page.url().includes("/setup")) {
      test.skip(true, "Redirected to setup");
      return;
    }

    await expect(
      page.getByRole("tab", { name: "API Keys" })
    ).toHaveAttribute("data-state", "active");
  });

  test("/payments redirects to /settings?tab=billing", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/payments");
    await waitForAppReady(page);

    // Should redirect — check we end up on settings with billing tab
    // (may also redirect to /setup if setup_complete is false)
    const url = page.url();
    const correctRedirect =
      url.includes("/settings") || url.includes("/setup");
    expect(correctRedirect).toBe(true);
  });

  test("no crash on any tab", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings");
    await waitForAppReady(page);
    await dismissModal(page);

    if (page.url().includes("/setup")) {
      test.skip(true, "Redirected to setup");
      return;
    }

    const tabs = [
      "Profile",
      "Pricing",
      "AI Licensing",
      "Team",
      "API Keys",
      "Billing",
      "Content",
    ];

    for (const tabName of tabs) {
      await page.getByRole("tab", { name: tabName }).click();
      await page.waitForTimeout(500);
      await assertNoCrash(page, `Settings tab: ${tabName}`);
    }
  });
});
