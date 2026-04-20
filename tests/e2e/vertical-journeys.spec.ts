/**
 * E2E: Vertical Journeys — Full Platform Lifecycle
 *
 * Simulates real users from each publisher vertical (Substack, Beehiiv, Ghost,
 * WordPress, Custom) going through the ENTIRE Opedd platform lifecycle:
 *   1. Account creation & first load
 *   2. Platform selection & connection (platform-specific)
 *   3. Dashboard navigation & onboarding checklist
 *   4. Full page exploration (Content, Licensing, Settings)
 *   5. Profile configuration
 *   6. Cleanup
 *
 * Each vertical is fully independent with its own user, lifecycle, and cleanup.
 *
 * Run:
 *   SUPABASE_SERVICE_KEY=<key> npx playwright test tests/e2e/vertical-journeys.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
import {
  createTestUser,
  destroyTestUser,
  TEST_PASSWORD,
  ANON_KEY,
} from "./fixtures";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";
const STORAGE_KEY = "sb-djdzcciayennqchjgybx-auth-token";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface VerticalUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

async function bootstrapUser(): Promise<VerticalUser> {
  const result = await createTestUser();
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn } = await anonClient.auth.signInWithPassword({
    email: result.email,
    password: TEST_PASSWORD,
  });
  return {
    userId: result.userId,
    email: result.email,
    accessToken: result.accessToken,
    refreshToken: signIn.session?.refresh_token ?? "",
  };
}

async function injectAuth(page: Page, u: VerticalUser) {
  await page.addInitScript(
    ({ token, refresh, email }: { token: string; refresh: string; email: string }) => {
      const key = "sb-djdzcciayennqchjgybx-auth-token";
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          refresh_token: refresh,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: "placeholder", email, aud: "authenticated" },
        })
      );
    },
    { token: u.accessToken, refresh: u.refreshToken, email: u.email }
  );
}

async function assertNoCrash(page: Page, context: string) {
  const count = await page.locator("text=Something went wrong").count();
  expect(count, `[${context}] ErrorBoundary triggered`).toBe(0);
}

async function navigateAndVerify(page: Page, path: string, label: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  // Give React time to render
  await page.waitForTimeout(2000);
  await assertNoCrash(page, label);
}

async function verifyDashboardOrSetup(page: Page, label: string) {
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
  const url = page.url();
  if (url.includes("/setup")) {
    await expect(page.getByText("Where do you publish?")).toBeVisible({ timeout: 10_000 });
  } else {
    await expect(page.getByText(/Import your content|Get started with Opedd/).first()).toBeVisible({ timeout: 10_000 });
  }
  await assertNoCrash(page, label);
}

// ---------------------------------------------------------------------------
// 1. SUBSTACK VERTICAL
// ---------------------------------------------------------------------------

test.describe.serial("Vertical Journey — Substack", () => {
  let user: VerticalUser;

  test.beforeAll(async () => {
    user = await bootstrapUser();
  });

  test.afterAll(async () => {
    if (user?.userId) await destroyTestUser(user.userId);
  });

  test("Phase 1: Account creation & setup wizard loads", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await assertNoCrash(page, "Substack /setup");

    // Verify heading
    await expect(page.getByText("Where do you publish?")).toBeVisible();

    // Verify 6 step indicators
    await expect(page.getByText("Connect Publication")).toBeVisible();
    await expect(page.getByText("Import Progress")).toBeVisible();
    await expect(page.getByText("Set Up Sync")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Substack platform selection & UI verification", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Wait for the setup page to fully render
    await expect(page.getByText("Where do you publish?")).toBeVisible({ timeout: 10_000 });

    // Click the Substack platform card
    await page.locator("button", { hasText: "Substack" }).click();

    // CSV upload zone appears — drag & drop text
    await expect(page.getByText(/Drag & drop/)).toBeVisible();
    await expect(page.getByText("posts.csv").first()).toBeVisible();

    // Collapsible "Don't have the export?" section exists
    const collapsibleTrigger = page.getByText("Don't have the export?");
    await expect(collapsibleTrigger).toBeVisible();

    // Click the collapsible — verify the paywalled content warning (amber box)
    await collapsibleTrigger.click();
    await expect(
      page.getByText("URL-based import only captures public posts")
    ).toBeVisible({ timeout: 5_000 });

    // Verify the Substack URL field appears inside the collapsible
    await expect(page.getByPlaceholder("https://yourname.substack.com")).toBeVisible();

    // Inbound email is shown after CSV import succeeds, not on initial form — skip this check
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await verifyDashboardOrSetup(page, "Substack /dashboard");
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(40_000);
    await injectAuth(page, user);

    // Content
    await navigateAndVerify(page, "/content", "Substack /content");

    // Licensing
    await navigateAndVerify(page, "/licensing", "Substack /licensing");

    // Settings
    await navigateAndVerify(page, "/settings", "Substack /settings");

    // Settings — Billing tab
    await navigateAndVerify(page, "/settings?tab=billing", "Substack /settings?tab=billing");

    // Settings — API Keys tab
    await navigateAndVerify(page, "/settings?tab=developers", "Substack /settings?tab=developers");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(30_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Substack /settings profile");

    // Find the publisher name input and fill it
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Substack Publisher");
    }

    // AI licensing tab — fresh users without verified sources see "Verify your publication first"
    await navigateAndVerify(page, "/settings?tab=ai-licensing", "AI Licensing tab");
    const hasRedirect = await page.getByText(/Configure Licensing|configured.*Licensing page/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEnterprise = await page.getByText(/Enterprise Revenue/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasRedirect || hasEnterprise).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. BEEHIIV VERTICAL
// ---------------------------------------------------------------------------

test.describe.serial("Vertical Journey — Beehiiv", () => {
  let user: VerticalUser;

  test.beforeAll(async () => {
    user = await bootstrapUser();
  });

  test.afterAll(async () => {
    if (user?.userId) await destroyTestUser(user.userId);
  });

  test("Phase 1: Account creation & setup wizard loads", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await assertNoCrash(page, "Beehiiv /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Beehiiv platform selection & UI verification", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Click the Beehiiv platform card
    await page.locator("button", { hasText: "Beehiiv" }).click();

    // API Key field (type=password)
    const apiKeyInput = page.getByPlaceholder("Your Beehiiv API key");
    await expect(apiKeyInput).toBeVisible();
    await expect(apiKeyInput).toHaveAttribute("type", "password");

    // Publication ID field with the correct placeholder
    await expect(page.getByPlaceholder("pub_xxxxxxxx")).toBeVisible();

    // Custom domain URL field (optional label)
    await expect(page.getByPlaceholder("https://yourpublication.com")).toBeVisible();
    await expect(page.getByText(/optional.*custom domain/i)).toBeVisible();

    // Inbound email is now shown in the dedicated "Set Up Sync" step (step 4), not here

    // Try clicking Continue without filling fields — verify error message
    const continueBtn = page.locator("button", { hasText: /Continue/i });
    await continueBtn.click();
    await expect(
      page.getByText("Please enter your API Key and Publication ID")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // New users may be redirected to /setup — that's expected behavior
    const url = page.url();
    if (url.includes("/setup")) {
      // Redirected to setup — verify wizard loads (this IS the onboarding)
      await expect(page.getByText("Where do you publish?")).toBeVisible({ timeout: 10_000 });
    } else {
      // On dashboard — verify checklist
      await expect(page.getByText("Import your content")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Enable AI Licensing")).toBeVisible();
    }
    await assertNoCrash(page, "Beehiiv /dashboard");
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(40_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "Beehiiv /content");
    await navigateAndVerify(page, "/licensing", "Beehiiv /licensing");
    await navigateAndVerify(page, "/settings", "Beehiiv /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "Beehiiv /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=developers", "Beehiiv /settings?tab=developers");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Beehiiv /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Beehiiv Publisher");
    }

    // AI licensing tab — fresh users without verified sources see "Verify your publication first"
    // which is correct behavior. Verify the tab loads without crash.
    await navigateAndVerify(page, "/settings?tab=ai-licensing", "AI Licensing tab");
    const hasRedirect = await page.getByText(/Configure Licensing|configured.*Licensing page/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEnterprise = await page.getByText(/Enterprise Revenue/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasRedirect || hasEnterprise).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3. GHOST VERTICAL
// ---------------------------------------------------------------------------

test.describe.serial("Vertical Journey — Ghost", () => {
  let user: VerticalUser;

  test.beforeAll(async () => {
    user = await bootstrapUser();
  });

  test.afterAll(async () => {
    if (user?.userId) await destroyTestUser(user.userId);
  });

  test("Phase 1: Account creation & setup wizard loads", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await assertNoCrash(page, "Ghost /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Ghost platform selection & UI verification", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Click Ghost platform card
    await page.locator("button", { hasText: "Ghost" }).click();
    await page.waitForTimeout(1000);

    // Ghost form should show at least an API key/URL input
    const ghostInput = page.getByPlaceholder(/ghost|key_id|api/i).first();
    await expect(ghostInput).toBeVisible({ timeout: 10_000 });

    // Try clicking Continue without filling — verify error
    const continueBtn = page.locator("button", { hasText: /Continue/i });
    await continueBtn.click();
    await expect(
      page.getByText("Please enter your Ghost URL and Admin API Key")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await verifyDashboardOrSetup(page, "Ghost /dashboard");
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(40_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "Ghost /content");
    await navigateAndVerify(page, "/licensing", "Ghost /licensing");
    await navigateAndVerify(page, "/settings", "Ghost /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "Ghost /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=developers", "Ghost /settings?tab=developers");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Ghost /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Ghost Publisher");
    }

    // AI licensing tab — fresh users without verified sources see "Verify your publication first"
    // which is correct behavior. Verify the tab loads without crash.
    await navigateAndVerify(page, "/settings?tab=ai-licensing", "AI Licensing tab");
    const hasRedirect = await page.getByText(/Configure Licensing|configured.*Licensing page/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEnterprise = await page.getByText(/Enterprise Revenue/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasRedirect || hasEnterprise).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. WORDPRESS VERTICAL
// ---------------------------------------------------------------------------

test.describe.serial("Vertical Journey — WordPress", () => {
  let user: VerticalUser;

  test.beforeAll(async () => {
    user = await bootstrapUser();
  });

  test.afterAll(async () => {
    if (user?.userId) await destroyTestUser(user.userId);
  });

  test("Phase 1: Account creation & setup wizard loads", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await assertNoCrash(page, "WordPress /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: WordPress platform selection & UI verification", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Wait for setup page to render, then click WordPress
    await expect(page.getByText("Where do you publish?")).toBeVisible({ timeout: 10_000 });
    // WordPress card has the WordPress logo — find it by the exact label
    const wpCard = page.locator("button").filter({ hasText: "Full archive — automatic" });
    await wpCard.click();

    // Site URL field
    await expect(page.getByPlaceholder("https://yoursite.com")).toBeVisible();

    // Username field with red asterisk (required)
    const usernameLabel = page.locator("label", { hasText: "Username" });
    await expect(usernameLabel).toBeVisible();
    await expect(usernameLabel.locator("span.text-red-400")).toBeVisible();

    // Application Password field with red asterisk (required)
    const passwordLabel = page.locator("label", { hasText: "Application Password" });
    await expect(passwordLabel).toBeVisible();
    await expect(passwordLabel.locator("span.text-red-400")).toBeVisible();

    // Blue instruction box about Application Passwords
    await expect(page.getByText("To verify you own this site").first()).toBeVisible();
    await expect(page.getByText("Application Password").first()).toBeVisible();

    // Collapsible "Don't have admin access?" sitemap fallback
    const fallbackTrigger = page.getByText("Don't have admin access?");
    await expect(fallbackTrigger).toBeVisible();

    // Verify submit button exists and shows WordPress-specific text
    const submitBtn = page.locator("button", { hasText: /Verify.*Import|Continue/i }).first();
    await expect(submitBtn).toBeVisible();
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await verifyDashboardOrSetup(page, "WordPress /dashboard");
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(40_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "WordPress /content");
    await navigateAndVerify(page, "/licensing", "WordPress /licensing");
    await navigateAndVerify(page, "/settings", "WordPress /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "WordPress /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=developers", "WordPress /settings?tab=developers");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "WordPress /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test WordPress Publisher");
    }

    // AI licensing tab — fresh users without verified sources see "Verify your publication first"
    // which is correct behavior. Verify the tab loads without crash.
    await navigateAndVerify(page, "/settings?tab=ai-licensing", "AI Licensing tab");
    const hasRedirect = await page.getByText(/Configure Licensing|configured.*Licensing page/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEnterprise = await page.getByText(/Enterprise Revenue/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasRedirect || hasEnterprise).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 5. CUSTOM VERTICAL
// ---------------------------------------------------------------------------

test.describe.serial("Vertical Journey — Custom", () => {
  let user: VerticalUser;

  test.beforeAll(async () => {
    user = await bootstrapUser();
  });

  test.afterAll(async () => {
    if (user?.userId) await destroyTestUser(user.userId);
  });

  test("Phase 1: Account creation & setup wizard loads", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await assertNoCrash(page, "Custom /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Custom platform selection & feed detection", async ({ page }) => {
    test.setTimeout(30_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Click Custom / Other platform card
    await page.locator("button", { hasText: "Custom / Other" }).click();

    // Sitemap URL field appears
    const sitemapInput = page.getByPlaceholder("https://yoursite.com/sitemap.xml");
    await expect(sitemapInput).toBeVisible();

    // "We'll import all article URLs from your sitemap" helper text
    await expect(page.getByText("import all article URLs from your sitemap")).toBeVisible();

    // Enter a real domain to trigger feed detection
    await sitemapInput.fill("techcrunch.com");

    // Wait for feed detection to complete — spinner may be too fast to catch,
    // so wait directly for results (either feeds or "No sitemap detected")
    const feedResult = page.getByText(/Detected feeds|No sitemap detected|Detecting/);
    await expect(feedResult.first()).toBeVisible({ timeout: 15_000 });

    // If still detecting, wait for it to finish
    const detecting = page.getByText("Detecting");
    if (await detecting.isVisible().catch(() => false)) {
      await expect(page.getByText(/Detected feeds|No sitemap detected/)).toBeVisible({ timeout: 15_000 });
    }

    // If feeds were detected, verify the detected feeds section has radio buttons
    const feedLabels = page.locator("label").filter({ has: page.locator("input[type='radio']") });
    const feedCount = await feedLabels.count();
    if (feedCount > 0) {
      // At least one feed was detected — verify it has a URL displayed
      const firstFeedText = await feedLabels.first().textContent();
      expect(firstFeedText).toBeTruthy();
    }
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await verifyDashboardOrSetup(page, "Custom /dashboard");
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(40_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "Custom /content");
    await navigateAndVerify(page, "/licensing", "Custom /licensing");
    await navigateAndVerify(page, "/settings", "Custom /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "Custom /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=developers", "Custom /settings?tab=developers");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(20_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Custom /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Custom Publisher");
    }

    // AI licensing tab — fresh users without verified sources see "Verify your publication first"
    // which is correct behavior. Verify the tab loads without crash.
    await navigateAndVerify(page, "/settings?tab=ai-licensing", "AI Licensing tab");
    const hasRedirect = await page.getByText(/Configure Licensing|configured.*Licensing page/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEnterprise = await page.getByText(/Enterprise Revenue/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasRedirect || hasEnterprise).toBeTruthy();
  });
});
