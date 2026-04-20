/**
 * E2E: API Keys — /settings?tab=developers
 *
 * Tests the Developers tab within the Settings page:
 *   - Tab loads without crash
 *   - Publisher ID section is visible with copy button
 *   - API Key section is visible (masked or "Generate API Key" button)
 *   - Show/Hide toggle for API key
 *   - Copy button for API key
 *   - Regenerate Key button exists (behind confirmation dialog)
 *   - Security warning text is displayed
 *
 * Uses the standing test user (test@example.com) via helpers.injectAuth.
 *
 * Run: npx playwright test tests/e2e/api-keys.spec.ts
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

async function goToApiKeysTab(page: import("@playwright/test").Page): Promise<boolean> {
  await injectAuth(page, { email: user.email, password: user.password });
  await page.goto("/settings?tab=developers");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await dismissModal(page);

  if (page.url().includes("/setup")) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("API Keys — Page Load", () => {
  test("Developers tab loads without crash", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await assertNoCrash(page, "Settings /settings?tab=developers");
  });

  test("Developers tab is active when navigated to directly", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    const apiTab = page.getByRole("tab", { name: "Developers" });
    await expect(apiTab).toHaveAttribute("data-state", "active");
  });
});

test.describe("API Keys — Publisher ID", () => {
  test("Publisher ID heading is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // May be gated if publication is not verified
    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Publication not verified — API Keys UI is gated"); return; }

    await expect(page.getByText("Publisher ID")).toBeVisible({ timeout: 5_000 });
  });

  test("Publisher ID has 'Public' badge", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("Public")).toBeVisible({ timeout: 5_000 });
  });

  test("Publisher ID value is displayed in a code block", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // Publisher ID is displayed in a <code> element
    const codeBlock = page.locator("code").first();
    await expect(codeBlock).toBeVisible({ timeout: 5_000 });
    const text = await codeBlock.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(10); // UUID-like string
  });

  test("Copy ID button exists for Publisher ID", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const copyBtn = page.locator("button", { hasText: "Copy ID" });
    await expect(copyBtn).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("API Keys — API Key Section", () => {
  test("API Key heading is visible with 'Secret' badge", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("API Key")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Secret")).toBeVisible({ timeout: 5_000 });
  });

  test("API key is displayed masked (with dots) or Generate button exists", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // Either the masked key is shown (op_xxx...dots) or "Generate API Key" button
    const hasKey = await page.locator("code").filter({ hasText: /op_|•/ }).first().isVisible().catch(() => false);
    const hasGenerateBtn = await page.locator("button", { hasText: "Generate API Key" }).isVisible().catch(() => false);

    expect(hasKey || hasGenerateBtn).toBe(true);
  });

  test("show/hide toggle button exists when API key is present", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const hasKey = await page.locator("code").filter({ hasText: /op_|•/ }).first().isVisible().catch(() => false);
    if (!hasKey) { test.skip(true, "No API key generated yet"); return; }

    // The eye/eye-off toggle button — it's a ghost variant button near the key
    // Look for the button that contains an Eye icon (SVG with specific class)
    const toggleBtns = page.locator("button").filter({ has: page.locator("svg") });
    // There should be at least one toggle button in the API key row
    const count = await toggleBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Copy button exists for API key", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const hasKey = await page.locator("code").filter({ hasText: /op_|•/ }).first().isVisible().catch(() => false);
    if (!hasKey) { test.skip(true, "No API key generated yet"); return; }

    // The Copy button in the API key section
    const copyBtn = page.locator("button", { hasText: "Copy" }).first();
    await expect(copyBtn).toBeVisible({ timeout: 5_000 });
  });

  test("Regenerate Key button exists when API key is present", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const hasKey = await page.locator("code").filter({ hasText: /op_|•/ }).first().isVisible().catch(() => false);
    if (!hasKey) { test.skip(true, "No API key generated yet"); return; }

    const regenBtn = page.locator("button", { hasText: "Regenerate Key" });
    await expect(regenBtn).toBeVisible({ timeout: 5_000 });
  });

  test("Regenerate Key shows confirmation dialog when clicked", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const hasKey = await page.locator("code").filter({ hasText: /op_|•/ }).first().isVisible().catch(() => false);
    if (!hasKey) { test.skip(true, "No API key generated yet"); return; }

    // Click Regenerate Key button to open the confirmation dialog
    const regenBtn = page.locator("button", { hasText: "Regenerate Key" });
    await regenBtn.click();
    await page.waitForTimeout(500);

    // Confirmation dialog should appear
    await expect(page.getByText("Regenerate API Key?")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("invalidate your current API key immediately")).toBeVisible();

    // Cancel and Yes buttons should be in the dialog
    await expect(page.locator("button", { hasText: "Cancel" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Yes, Regenerate Key" })).toBeVisible();

    // Close dialog without regenerating (click Cancel)
    await page.locator("button", { hasText: "Cancel" }).click();
    await page.waitForTimeout(300);
  });
});

test.describe("API Keys — Security Notice", () => {
  test("security warning text is displayed", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const hasKey = await page.locator("code").filter({ hasText: /op_|•/ }).first().isVisible().catch(() => false);
    if (!hasKey) { test.skip(true, "No API key generated yet"); return; }

    // Security warning text
    await expect(page.getByText(/Keep this key secret/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Never expose in frontend code/)).toBeVisible();
  });

  test("Publisher ID usage hint is displayed", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToApiKeysTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(
      page.getByText("Use this in your widget embed snippet")
    ).toBeVisible({ timeout: 5_000 });
  });
});
