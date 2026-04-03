/**
 * E2E: Onboarding / Setup Wizard
 *
 * Tests the 6-step setup wizard at /setup.
 * Creates a fresh user (setup_complete = false) so the wizard renders.
 *
 * Run: SUPABASE_SERVICE_KEY=... npx playwright test tests/e2e/onboarding.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
import {
  createTestUser,
  destroyTestUser,
  TEST_PASSWORD,
  ANON_KEY,
} from "./fixtures";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";
const SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";

let userId = "";
let userEmail = "";
let accessToken = "";
let refreshToken = "";

// ── Setup: create a fresh user so setup_complete is false ───────────────────

test.beforeAll(async () => {
  const result = await createTestUser();
  userId = result.userId;
  userEmail = result.email;
  accessToken = result.accessToken;

  // Get refresh token via a second sign-in
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn } = await anonClient.auth.signInWithPassword({
    email: userEmail,
    password: TEST_PASSWORD,
  });
  refreshToken = signIn.session?.refresh_token ?? "";
});

test.afterAll(async () => {
  if (userId) await destroyTestUser(userId);
});

// ── Auth injection ──────────────────────────────────────────────────────────

async function injectAuth(page: Page) {
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
    { token: accessToken, refresh: refreshToken, email: userEmail }
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function assertNoCrash(page: Page, context: string) {
  const count = await page.locator("text=Something went wrong").count();
  expect(count, `[${context}] ErrorBoundary triggered`).toBe(0);
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Setup Wizard — Onboarding", () => {
  test("renders the 6-step wizard with step indicator", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "Setup /setup");

    // Step 1 heading
    await expect(page.getByText("Where do you publish?")).toBeVisible();

    // Step indicator should show the first step title
    await expect(page.getByText("Connect Publication")).toBeVisible();
  });

  test("shows all 5 platform options on step 1", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // All five platforms
    await expect(page.getByText("Substack")).toBeVisible();
    await expect(page.getByText("Beehiiv")).toBeVisible();
    await expect(page.getByText("Ghost")).toBeVisible();
    await expect(page.getByText("WordPress")).toBeVisible();
    await expect(page.getByText("Custom / Other")).toBeVisible();
  });

  test("platform descriptions are visible", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Each platform has a description
    await expect(page.getByText("Archive via data export")).toBeVisible();
    await expect(page.getByText("Full archive via API key")).toBeVisible();
    await expect(page.getByText("Full archive via Admin API")).toBeVisible();
    await expect(page.getByText("automatic, no credentials needed")).toBeVisible();
    await expect(page.getByText("Any CMS with a sitemap URL")).toBeVisible();
  });

  test("clicking Ghost shows Admin API key form", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click Ghost
    await page.locator("button", { hasText: "Ghost" }).click();

    // Ghost-specific fields
    await expect(page.getByPlaceholder("https://yourblog.ghost.io")).toBeVisible();
    await expect(page.getByText("Admin API Key").first()).toBeVisible();
    await expect(page.getByPlaceholder("key_id:hex_secret")).toBeVisible();

    // Read-only notice
    await expect(page.getByText("read access to your full archive")).toBeVisible();
  });

  test("clicking WordPress shows username + password fields with required markers", async ({
    page,
  }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click WordPress
    await page.locator("button", { hasText: "WordPress" }).click();

    // Site URL field
    await expect(page.getByPlaceholder("https://yoursite.com")).toBeVisible();

    // Username field with required marker (red asterisk)
    const usernameLabel = page.locator("label", { hasText: "Username" });
    await expect(usernameLabel).toBeVisible();
    await expect(usernameLabel.locator("span.text-red-400")).toBeVisible();
    await expect(page.getByPlaceholder("admin")).toBeVisible();

    // Application Password field with required marker
    const passwordLabel = page.locator("label", {
      hasText: "Application Password",
    });
    await expect(passwordLabel).toBeVisible();
    await expect(passwordLabel.locator("span.text-red-400")).toBeVisible();
    await expect(
      page.getByPlaceholder("xxxx xxxx xxxx xxxx xxxx xxxx")
    ).toBeVisible();

    // Informational box about Application Passwords
    await expect(
      page.getByText("To verify you own this site").first()
    ).toBeVisible();
  });

  test("WordPress shows sitemap fallback option", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    await page.locator("button", { hasText: "WordPress" }).click();

    // Collapsible for sitemap fallback
    await expect(
      page.getByText("Don't have admin access?")
    ).toBeVisible();
  });

  test("clicking Substack shows CSV upload zone and instructions", async ({
    page,
  }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click Substack
    await page.locator("button", { hasText: "Substack" }).click();

    // Export instructions (numbered list)
    await expect(page.getByText("Export data").first()).toBeVisible();
    await expect(page.getByText("posts.csv").first()).toBeVisible();

    // The drag & drop zone should be present
    // It renders text like "Drag" or contains the drop area
    await expect(
      page.getByText(/drag/i).first()
    ).toBeVisible();
  });

  test("clicking Beehiiv shows API key + Publication ID fields", async ({
    page,
  }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click Beehiiv
    await page.locator("button", { hasText: "Beehiiv" }).click();

    // Beehiiv-specific fields
    await expect(page.getByPlaceholder("Your Beehiiv API key")).toBeVisible();
    await expect(page.getByPlaceholder("pub_xxxxxxxx")).toBeVisible();

    // Optional custom domain field
    await expect(
      page.getByPlaceholder("https://yourpublication.com")
    ).toBeVisible();

    // Inbound email callout for new posts
    await expect(
      page.getByText("newsletter@inbound.opedd.com")
    ).toBeVisible();
  });

  test("clicking Custom / Other shows sitemap URL field", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Click Custom / Other
    await page.locator("button", { hasText: "Custom / Other" }).click();

    // Sitemap URL input
    await expect(
      page.getByPlaceholder(/sitemap/i)
    ).toBeVisible();
  });

  test("switching between platforms swaps form fields", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Start with Ghost
    await page.locator("button", { hasText: "Ghost" }).click();
    await expect(page.getByPlaceholder("https://yourblog.ghost.io")).toBeVisible();

    // Switch to WordPress — Ghost fields disappear, WP fields appear
    await page.locator("button", { hasText: "WordPress" }).click();
    await expect(
      page.getByPlaceholder("https://yourblog.ghost.io")
    ).not.toBeVisible();
    await expect(page.getByPlaceholder("admin")).toBeVisible();

    // Switch to Custom — WP fields disappear, sitemap field appears
    await page.locator("button", { hasText: "Custom / Other" }).click();
    await expect(page.getByPlaceholder("admin")).not.toBeVisible();
    await expect(page.getByPlaceholder(/sitemap/i)).toBeVisible();

    // Switch to Beehiiv
    await page.locator("button", { hasText: "Beehiiv" }).click();
    await expect(page.getByPlaceholder(/sitemap/i)).not.toBeVisible();
    await expect(page.getByPlaceholder("pub_xxxxxxxx")).toBeVisible();
  });

  test("Ghost webhook callout is collapsible", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    await page.locator("button", { hasText: "Ghost" }).click();

    // The webhook section should be collapsed by default
    const webhookTrigger = page.getByText("Live sync via Ghost webhook");
    await expect(webhookTrigger).toBeVisible();

    // Click to expand
    await webhookTrigger.click();

    // The webhook URL should now be visible
    await expect(
      page.getByText("platform-webhook")
    ).toBeVisible();
  });

  test("no ErrorBoundary crash on step 1", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await assertNoCrash(page, "Setup step 1");
  });
});
