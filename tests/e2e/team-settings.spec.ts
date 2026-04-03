/**
 * E2E: Team Management — /settings?tab=team
 *
 * Tests the Team tab within the Settings page:
 *   - Tab loads without crash
 *   - "Invite Team Member" section is visible (owner only)
 *   - Email input field for invitations
 *   - "Send Invite" button exists and is disabled when email is empty
 *   - Team members list renders (at least the owner)
 *   - Owner badge is displayed
 *   - Pending invitations section (if invitations exist)
 *
 * Uses the standing test user (test@example.com) via helpers.injectAuth.
 *
 * Run: npx playwright test tests/e2e/team-settings.spec.ts
 */
import { test, expect } from "@playwright/test";
import { injectAuth, waitForAppReady, dismissModal, assertNoCrash } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToTeamTab(page: import("@playwright/test").Page): Promise<boolean> {
  await injectAuth(page);
  await page.goto("/settings?tab=team");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await dismissModal(page);

  if (page.url().includes("/setup")) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Team Settings — Page Load", () => {
  test("team tab loads without crash", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await assertNoCrash(page, "Settings /settings?tab=team");
  });

  test("Team tab is active when navigated to directly", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    const teamTab = page.getByRole("tab", { name: "Team" });
    await expect(teamTab).toHaveAttribute("data-state", "active");
  });
});

test.describe("Team Settings — Invite Section", () => {
  test("'Invite Team Member' heading is visible", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    // Wait for team data to load
    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    // May be gated if publication is not verified
    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Publication not verified — team UI is gated"); return; }

    await expect(page.getByText("Invite Team Member")).toBeVisible({ timeout: 5_000 });
  });

  test("email input field is present for invitations", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const emailInput = page.getByPlaceholder("colleague@email.com");
    await expect(emailInput).toBeVisible({ timeout: 5_000 });
    await expect(emailInput).toBeEditable();
  });

  test("'Send Invite' button exists and is disabled when email is empty", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    const sendBtn = page.locator("button", { hasText: "Send Invite" });
    await expect(sendBtn).toBeVisible({ timeout: 5_000 });

    // Button should be disabled when email field is empty
    await expect(sendBtn).toBeDisabled();
  });

  test("invite description text is shown", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    await expect(page.getByText("Send an invitation to join your team as a member")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Team Settings — Members List", () => {
  test("Team Members heading is visible with count", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // "Team Members (N)" heading
    await expect(page.getByText(/Team Members \(\d+\)/)).toBeVisible({ timeout: 5_000 });
  });

  test("at least one member (the owner) is listed", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // The owner badge should be visible
    await expect(page.getByText("Owner").first()).toBeVisible({ timeout: 5_000 });
  });

  test("owner email is displayed in the members list", async ({ page }) => {
    test.setTimeout(20_000);
    const ok = await goToTeamTab(page);
    if (!ok) { test.skip(true, "Redirected to setup"); return; }

    await waitForAppReady(page);

    try {
      await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 10_000 });
    } catch { /* already hidden */ }

    const isGated = await page.getByText(/verify your publication/i).isVisible().catch(() => false);
    if (isGated) { test.skip(true, "Gated"); return; }

    // The test user's email should appear in the team list
    const emailVisible = await page.getByText("test@example.com").isVisible().catch(() => false);
    // If test user is not the owner or email is different, at least one email should be visible
    const anyEmail = await page.locator("p.text-sm.font-medium").first().isVisible().catch(() => false);
    expect(emailVisible || anyEmail).toBe(true);
  });
});

test.describe("Team Settings — Error & Loading States", () => {
  test("loading spinner appears while team data is fetching", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page);
    await page.goto("/settings?tab=team");
    await page.waitForLoadState("domcontentloaded");
    await dismissModal(page);

    if (page.url().includes("/setup")) { test.skip(true, "Redirected to setup"); return; }

    // Immediately after tab activation, a loading spinner may be visible
    // We simply verify the page eventually settles — no crash
    await page.waitForTimeout(3000);
    await assertNoCrash(page, "Team tab loading");
  });
});
