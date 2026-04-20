/**
 * E2E: Settings Page
 *
 * Tests the settings page at /settings with its 4 tabs:
 * Profile, Billing, Team, Developers.
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

async function goToSettings(page: Page): Promise<boolean> {
  await injectAuth(page, { email: user.email, password: user.password });
  await page.goto("/settings");
  await waitForAppReady(page);
  await dismissModal(page);
  if (page.url().includes("/setup")) return false;
  return true;
}

test.describe("Settings — Tabs", () => {
  test("renders all 4 settings tabs", async ({ page }) => {
    const ok = await goToSettings(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }
    await assertNoCrash(page, "Settings /settings");

    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Billing" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Team" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Developers" })).toBeVisible();
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
    const emailInput = page.locator("input[disabled]").filter({ hasText: /.*/ }).first();
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
    await expect(page.getByPlaceholder("Tell us about yourself and your work...")).toBeVisible();
  });

  test("publisher name can be typed into", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Your display name");
    await nameInput.clear();
    await nameInput.fill("E2E Test Name");
    await expect(nameInput).toHaveValue("E2E Test Name");
    await nameInput.clear();
  });
});

test.describe("Settings — Tab Switching", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await goToSettings(page);
    if (!ok) test.skip(true, "Redirected to setup");
  });

  test("Team tab renders team management content", async ({ page }) => {
    await page.getByRole("tab", { name: "Team" }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute("data-state", "active");
    const hasTeam = await page.getByText(/team|member|invite|owner/i).first().isVisible().catch(() => false);
    expect(hasTeam).toBe(true);
  });

  test("Developers tab shows API key information", async ({ page }) => {
    await page.getByRole("tab", { name: "Developers" }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("tab", { name: "Developers" })).toHaveAttribute("data-state", "active");
    const hasApiKey = await page.getByText(/api key|op_|regenerate|publisher id/i).first().isVisible().catch(() => false);
    expect(hasApiKey).toBe(true);
  });

  test("Billing tab renders billing/plan info", async ({ page }) => {
    await page.getByRole("tab", { name: "Billing" }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("tab", { name: "Billing" })).toHaveAttribute("data-state", "active");
    const hasBilling = await page.getByText(/plan|billing|stripe|subscription|free|pro|enterprise/i).first().isVisible().catch(() => false);
    expect(hasBilling).toBe(true);
  });

  test("can switch from Billing to other tabs and back without crash", async ({ page }) => {
    const tabs = ["Profile", "Billing", "Team", "Developers"];
    for (const tabName of tabs) {
      await page.getByRole("tab", { name: tabName }).click();
      await page.waitForTimeout(500);
      await assertNoCrash(page, `Settings tab: ${tabName}`);
    }
  });
});

test.describe("Settings — Deep Links", () => {
  test("/settings?tab=billing opens Billing tab directly", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=billing");
    await waitForAppReady(page);
    await dismissModal(page);
    if (page.url().includes("/setup")) { test.skip(true, "Redirected to setup"); return; }
    await expect(page.getByRole("tab", { name: "Billing" })).toHaveAttribute("data-state", "active");
  });

  test("/settings?tab=team opens Team tab directly", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=team");
    await waitForAppReady(page);
    await dismissModal(page);
    if (page.url().includes("/setup")) { test.skip(true, "Redirected to setup"); return; }
    await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute("data-state", "active");
  });

  test("/settings?tab=developers opens Developers tab directly", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=developers");
    await waitForAppReady(page);
    await dismissModal(page);
    if (page.url().includes("/setup")) { test.skip(true, "Redirected to setup"); return; }
    await expect(page.getByRole("tab", { name: "Developers" })).toHaveAttribute("data-state", "active");
  });

  test("legacy /settings?tab=api-keys redirects to Developers tab", async ({ page }) => {
    await injectAuth(page, { email: user.email, password: user.password });
    await page.goto("/settings?tab=api-keys");
    await waitForAppReady(page);
    await dismissModal(page);
    if (page.url().includes("/setup")) { test.skip(true, "Redirected to setup"); return; }
    // Should redirect to developers tab
    await expect(page.getByRole("tab", { name: "Developers" })).toHaveAttribute("data-state", "active");
  });
});
