/**
 * E2E: Billing & Subscriptions — /settings?tab=billing
 *
 * Tests the Billing tab within the Settings page:
 *   - Tab loads without crash
 *   - Current plan is displayed (Free/Pro/Enterprise)
 *   - Upgrade button exists for non-enterprise users
 *   - Stripe Payouts section is visible
 *   - Connect Stripe button or connection status
 *
 * Uses the standing test user (test@example.com) via helpers.injectAuth.
 *
 * Run: npx playwright test tests/e2e/billing-settings.spec.ts
 */
import { test, expect } from "@playwright/test";
import { injectAuth, waitForAppReady, dismissModal, assertNoCrash } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToBillingTab(page: import("@playwright/test").Page): Promise<boolean> {
  await injectAuth(page);
  await page.goto("/settings?tab=billing");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await dismissModal(page);

  if (page.url().includes("/setup")) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Billing — Page Load", () => {
  test("billing tab loads without crash", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await assertNoCrash(page, "Settings /settings?tab=billing");
  });

  test("Billing tab is active when navigated to directly", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    const billingTab = page.getByRole("tab", { name: "Billing" });
    await expect(billingTab).toHaveAttribute("data-state", "active");
  });
});

test.describe("Billing — Current Plan", () => {
  test("'Current Plan' heading is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    await expect(page.getByText("Current Plan")).toBeVisible({ timeout: 5_000 });
  });

  test("plan badge is displayed (Free, Pro, or Enterprise)", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // One of the plan labels should be visible
    const hasFree = await page.getByText("Free").first().isVisible().catch(() => false);
    const hasPro = await page.getByText("Pro").first().isVisible().catch(() => false);
    const hasEnterprise = await page.getByText("Enterprise").first().isVisible().catch(() => false);

    expect(hasFree || hasPro || hasEnterprise).toBe(true);
  });

  test("plan description shows article limit and fee percentage", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // The plan description includes fee info like "500 articles · 15% fee" or "Unlimited articles · 8% fee"
    const hasPlanDesc = await page.getByText(/articles.*fee/i).first().isVisible().catch(() => false);
    expect(hasPlanDesc).toBe(true);
  });

  test("Upgrade button exists for non-enterprise plans", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // Upgrade button text depends on current plan
    const upgradeBtn = page.locator("button", { hasText: /Upgrade to/i });
    const isVisible = await upgradeBtn.isVisible().catch(() => false);

    // If the user is already on Enterprise, the button won't exist — that is acceptable
    const isEnterprise = await page.getByText("Enterprise").first().isVisible().catch(() => false);
    if (isEnterprise) {
      // Enterprise users may not see an upgrade button — acceptable
      expect(typeof isVisible).toBe("boolean");
    } else {
      expect(isVisible).toBe(true);
    }
  });
});

test.describe("Billing — Stripe Payouts", () => {
  test("'Stripe Payouts' heading is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    await expect(page.getByText("Stripe Payouts")).toBeVisible({ timeout: 5_000 });
  });

  test("Stripe payout description text is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    await expect(
      page.getByText("Connect your Stripe account to receive licensing revenue directly")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Stripe connection status or Connect button is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // Either "Stripe Connected" status or "Connect Stripe" button
    const isConnected = await page.getByText("Stripe Connected").isVisible().catch(() => false);
    const connectBtn = await page.locator("button", { hasText: "Connect Stripe" }).isVisible().catch(() => false);
    const manageLink = await page.getByText(/Manage in Stripe/i).isVisible().catch(() => false);

    expect(isConnected || connectBtn || manageLink).toBe(true);
  });
});

test.describe("Billing — Tab Switching", () => {
  test("can switch from Billing to other tabs and back without crash", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToBillingTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    // Switch to Profile tab
    await page.getByRole("tab", { name: "Profile" }).click();
    await page.waitForTimeout(500);
    await assertNoCrash(page, "Switch Billing -> Profile");

    // Switch back to Billing
    await page.getByRole("tab", { name: "Billing" }).click();
    await page.waitForTimeout(500);
    await assertNoCrash(page, "Switch Profile -> Billing");

    // Billing content should still be visible
    await expect(page.getByText("Current Plan")).toBeVisible({ timeout: 5_000 });
  });
});
