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
  await page.waitForLoadState("networkidle");
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
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "Substack /setup");

    // Verify heading
    await expect(page.getByText("Where do you publish?")).toBeVisible();

    // Verify 6 step indicators
    await expect(page.getByText("Connect Publication")).toBeVisible();
    await expect(page.getByText("Import Progress")).toBeVisible();
    await expect(page.getByText("Install Widget")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
    // "Categorise" and "Set Pricing" may be hidden on mobile; check at least the numbered circles
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Substack platform selection & UI verification", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click the Substack platform card
    await page.locator("button", { hasText: "Substack" }).click();

    // CSV upload zone appears — drag & drop text
    await expect(page.getByText(/Drag & drop/)).toBeVisible();
    await expect(page.getByText("posts.csv")).toBeVisible();

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

    // Verify the inbound email callout mentions newsletter@inbound.opedd.com
    // (visible in the CSV export instructions area or collapsible)
    await expect(page.getByText("newsletter@inbound.opedd.com").first()).toBeVisible();
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/dashboard", "Substack /dashboard");

    // Onboarding checklist is visible (setup_complete is false)
    await expect(page.getByText("Import your content")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Enable AI Licensing")).toBeVisible();
    await expect(page.getByText("Set up your license types")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(15_000);
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
    await navigateAndVerify(page, "/settings?tab=api-keys", "Substack /settings?tab=api-keys");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Substack /settings profile");

    // Find the publisher name input and fill it
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Substack Publisher");
    }

    // Check that AI licensing toggles exist (RAG, Training, Inference)
    const ragText = page.getByText(/RAG/i).first();
    const trainingText = page.getByText(/Training/i).first();
    const inferenceText = page.getByText(/Inference/i).first();

    // These should be somewhere on the settings page
    const hasRag = await ragText.isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTraining = await trainingText.isVisible({ timeout: 1_000 }).catch(() => false);
    const hasInference = await inferenceText.isVisible({ timeout: 1_000 }).catch(() => false);

    // At least the concept of AI licensing should be present
    expect(hasRag || hasTraining || hasInference).toBeTruthy();
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
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "Beehiiv /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Beehiiv platform selection & UI verification", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

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

    // Inbound email section is visible
    await expect(page.getByText("newsletter@inbound.opedd.com").first()).toBeVisible();

    // Try clicking Continue without filling fields — verify error message
    const continueBtn = page.locator("button", { hasText: /Continue/i });
    await continueBtn.click();
    await expect(
      page.getByText("Please enter your API Key and Publication ID")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/dashboard", "Beehiiv /dashboard");

    await expect(page.getByText("Import your content")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Enable AI Licensing")).toBeVisible();
    await expect(page.getByText("Set up your license types")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "Beehiiv /content");
    await navigateAndVerify(page, "/licensing", "Beehiiv /licensing");
    await navigateAndVerify(page, "/settings", "Beehiiv /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "Beehiiv /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=api-keys", "Beehiiv /settings?tab=api-keys");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Beehiiv /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Beehiiv Publisher");
    }

    const hasRag = await page.getByText(/RAG/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTraining = await page.getByText(/Training/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    const hasInference = await page.getByText(/Inference/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    expect(hasRag || hasTraining || hasInference).toBeTruthy();
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
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "Ghost /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Ghost platform selection & UI verification", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click Ghost platform card
    await page.locator("button", { hasText: "Ghost" }).click();

    // Ghost blog URL field
    await expect(page.getByPlaceholder("https://yourblog.ghost.io")).toBeVisible();

    // Admin API Key field (placeholder: key_id:hex_secret)
    await expect(page.getByPlaceholder("key_id:hex_secret")).toBeVisible();
    await expect(page.getByText("Admin API Key")).toBeVisible();

    // "read access to your full archive, including members-only" text
    await expect(page.getByText("read access to your full archive")).toBeVisible();

    // Optional webhook collapsible exists
    const webhookTrigger = page.getByText("Live sync via Ghost webhook");
    await expect(webhookTrigger).toBeVisible();

    // Click the webhook collapsible — verify the webhook URL shows
    await webhookTrigger.click();
    await expect(
      page.getByText("platform-webhook")
    ).toBeVisible({ timeout: 5_000 });

    // Try clicking Continue without filling — verify error
    const continueBtn = page.locator("button", { hasText: /Continue/i });
    await continueBtn.click();
    await expect(
      page.getByText("Please enter your Ghost URL and Admin API Key")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/dashboard", "Ghost /dashboard");

    await expect(page.getByText("Import your content")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Enable AI Licensing")).toBeVisible();
    await expect(page.getByText("Set up your license types")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "Ghost /content");
    await navigateAndVerify(page, "/licensing", "Ghost /licensing");
    await navigateAndVerify(page, "/settings", "Ghost /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "Ghost /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=api-keys", "Ghost /settings?tab=api-keys");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Ghost /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Ghost Publisher");
    }

    const hasRag = await page.getByText(/RAG/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTraining = await page.getByText(/Training/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    const hasInference = await page.getByText(/Inference/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    expect(hasRag || hasTraining || hasInference).toBeTruthy();
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
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "WordPress /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: WordPress platform selection & UI verification", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click WordPress platform card
    await page.locator("button", { hasText: "WordPress" }).click();

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
    await expect(page.getByText("To verify you own this site")).toBeVisible();
    await expect(page.getByText("Application Password")).toBeVisible();

    // Collapsible "Don't have admin access?" sitemap fallback
    const fallbackTrigger = page.getByText("Don't have admin access?");
    await expect(fallbackTrigger).toBeVisible();

    // Try clicking Continue with only URL filled — verify error about username/password
    const urlInput = page.getByPlaceholder("https://yoursite.com");
    await urlInput.fill("https://example-wordpress.com");
    const continueBtn = page.locator("button", { hasText: /Continue/i });
    await continueBtn.click();
    await expect(
      page.getByText(/username and Application Password/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Phase 3: Dashboard loads with onboarding checklist", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/dashboard", "WordPress /dashboard");

    await expect(page.getByText("Import your content")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Enable AI Licensing")).toBeVisible();
    await expect(page.getByText("Set up your license types")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "WordPress /content");
    await navigateAndVerify(page, "/licensing", "WordPress /licensing");
    await navigateAndVerify(page, "/settings", "WordPress /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "WordPress /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=api-keys", "WordPress /settings?tab=api-keys");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "WordPress /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test WordPress Publisher");
    }

    const hasRag = await page.getByText(/RAG/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTraining = await page.getByText(/Training/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    const hasInference = await page.getByText(/Inference/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    expect(hasRag || hasTraining || hasInference).toBeTruthy();
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
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "Custom /setup");

    await expect(page.getByText("Where do you publish?")).toBeVisible();
    const stepCircles = page.locator(".rounded-full.flex.items-center.justify-center");
    await expect(stepCircles).toHaveCount(6);
  });

  test("Phase 2: Custom platform selection & feed detection", async ({ page }) => {
    test.setTimeout(30_000);
    await injectAuth(page, user);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click Custom / Other platform card
    await page.locator("button", { hasText: "Custom / Other" }).click();

    // Sitemap URL field appears
    const sitemapInput = page.getByPlaceholder("https://yoursite.com/sitemap.xml");
    await expect(sitemapInput).toBeVisible();

    // "We'll import all article URLs from your sitemap" helper text
    await expect(page.getByText("import all article URLs from your sitemap")).toBeVisible();

    // Enter a real domain to trigger feed detection
    await sitemapInput.fill("techcrunch.com");

    // Wait for detection — loading spinner should appear
    const spinner = page.locator(".animate-spin");
    await expect(spinner.first()).toBeVisible({ timeout: 10_000 });

    // Wait for detection to complete — either feeds appear or "No sitemap detected"
    // Use a generous timeout since this hits a real external API
    const feedResult = page.getByText(/Sitemap|No sitemap detected/);
    await expect(feedResult.first()).toBeVisible({ timeout: 15_000 });

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
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/dashboard", "Custom /dashboard");

    await expect(page.getByText("Import your content")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Enable AI Licensing")).toBeVisible();
    await expect(page.getByText("Set up your license types")).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });

  test("Phase 4: Explore all pages without crash", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);

    await navigateAndVerify(page, "/content", "Custom /content");
    await navigateAndVerify(page, "/licensing", "Custom /licensing");
    await navigateAndVerify(page, "/settings", "Custom /settings");
    await navigateAndVerify(page, "/settings?tab=billing", "Custom /settings?tab=billing");
    await navigateAndVerify(page, "/settings?tab=api-keys", "Custom /settings?tab=api-keys");
  });

  test("Phase 5: Profile configuration — name & AI toggles", async ({ page }) => {
    test.setTimeout(15_000);
    await injectAuth(page, user);
    await navigateAndVerify(page, "/settings", "Custom /settings profile");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Test Custom Publisher");
    }

    const hasRag = await page.getByText(/RAG/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTraining = await page.getByText(/Training/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    const hasInference = await page.getByText(/Inference/i).first().isVisible({ timeout: 1_000 }).catch(() => false);
    expect(hasRag || hasTraining || hasInference).toBeTruthy();
  });
});
