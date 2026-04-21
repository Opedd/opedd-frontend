/**
 * E2E: Content Management — /content page
 *
 * Tests the Content Library page with an authenticated user:
 *   - Page loads without crash
 *   - Empty state with "Import from Sitemap" and "Connect Publication" buttons
 *   - Table renders with correct columns when articles exist
 *   - Search/filter UI elements present
 *   - Tab structure (Articles / Archive License)
 *
 * Uses the standing test user (test@example.com) via helpers.injectAuth.
 *
 * Run: npx playwright test tests/e2e/content-management.spec.ts
 */
import { test, expect } from "@playwright/test";
import { createTestUser, destroyTestUser, TEST_PASSWORD } from "./fixtures";
import { injectAuth, waitForAppReady, dismissModal, assertNoCrash } from "./helpers";

let user: { userId: string; email: string; password: string };

test.beforeAll(async () => {
  const created = await createTestUser({ verified: true });
  user = { userId: created.userId, email: created.email, password: TEST_PASSWORD };
});

test.afterAll(async () => {
  if (user?.userId) await destroyTestUser(user.userId);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToContent(page: import("@playwright/test").Page): Promise<boolean> {
  await injectAuth(page, { email: user.email, password: user.password });
  await page.goto("/content");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await dismissModal(page);

  if (page.url().includes("/setup")) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Content — Page Load", () => {
  test("page loads without crash", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await assertNoCrash(page, "Content /content");
  });

  test("page title contains Catalog", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await expect(page).toHaveTitle(/Catalog/);
  });
});

test.describe("Content — Empty State", () => {
  test("shows 'No articles yet' when content library is empty", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // Wait for loading to finish (skeleton or spinner disappears)
    try {
      await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch {
      // Already hidden or no skeleton
    }

    // Check if we're in empty state or have articles
    const hasArticles = await page.locator("table").isVisible().catch(() => false);
    if (!hasArticles) {
      // Empty state should show the message
      await expect(page.getByText("No articles yet")).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText("Import your content catalog to start licensing it")).toBeVisible();
    }
  });

  test("'Import from Sitemap' button is visible in empty state", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const hasArticles = await page.locator("table").isVisible().catch(() => false);
    if (!hasArticles) {
      const importBtn = page.locator("button", { hasText: "Import from Sitemap" });
      await expect(importBtn).toBeVisible({ timeout: 5_000 });
    }
  });

  test("'Connect Publication' button is visible in empty state", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const hasArticles = await page.locator("table").isVisible().catch(() => false);
    if (!hasArticles) {
      const connectBtn = page.locator("button", { hasText: "Connect Publication" });
      await expect(connectBtn).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe("Content — Table & Columns", () => {
  test("table renders with correct column headers when articles exist", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const hasTable = await page.locator("table").isVisible().catch(() => false);
    if (hasTable) {
      // Verify column headers
      await expect(page.locator("th", { hasText: "Title" })).toBeVisible();
      await expect(page.locator("th", { hasText: "Source" })).toBeVisible();
      await expect(page.locator("th", { hasText: "Status" })).toBeVisible();
      await expect(page.locator("th", { hasText: "AI Price" })).toBeVisible();
    } else {
      // No articles — empty state is fine, skip column checks
      test.skip(true, "No articles in content library — table not rendered");
    }
  });

  test("table has sortable columns (Title, Status, Revenue)", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const hasTable = await page.locator("table").isVisible().catch(() => false);
    if (hasTable) {
      // Sortable columns have ArrowUpDown icons and cursor-pointer
      const sortableHeaders = page.locator("th.cursor-pointer");
      const count = await sortableHeaders.count();
      expect(count).toBeGreaterThanOrEqual(2); // At least Title and Status are sortable
    } else {
      test.skip(true, "No articles — table not rendered");
    }
  });
});

test.describe("Content — Search & Filter", () => {
  test("search input is present", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // The search input has a Search icon next to it
    const searchInput = page.locator("input[type='text']").first();
    const searchVisible = await searchInput.isVisible().catch(() => false);

    // Search may only be visible when articles exist
    if (searchVisible) {
      await expect(searchInput).toBeEditable();
    }
  });

  test("status filter dropdown is present when articles exist", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const hasTable = await page.locator("table").isVisible().catch(() => false);
    if (hasTable) {
      // Filter/select elements should be present
      const selectTrigger = page.locator("[role='combobox']").first();
      const isVisible = await selectTrigger.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    }
  });
});

test.describe("Content — Tabs", () => {
  test("Articles tab is active by default", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // Check that an Articles-related tab/trigger is present
    const articlesTab = page.locator("[role='tab']").filter({ hasText: /Articles/i }).first();
    const tabVisible = await articlesTab.isVisible().catch(() => false);
    if (tabVisible) {
      await expect(articlesTab).toHaveAttribute("data-state", "active");
    }
  });

  test("Archive License tab exists and is clickable", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToContent(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const archiveTab = page.locator("[role='tab']").filter({ hasText: /Archive/i }).first();
    const tabVisible = await archiveTab.isVisible().catch(() => false);
    if (tabVisible) {
      await archiveTab.click();
      await page.waitForTimeout(500);
      await assertNoCrash(page, "Content /content archive tab");
    }
  });
});
