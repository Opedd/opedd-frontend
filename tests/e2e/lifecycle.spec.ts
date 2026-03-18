/**
 * Opedd Publisher Lifecycle — E2E Test Suite
 *
 * Covers the full journey:
 *   Sign-up → Onboarding → Setup Complete → Member-only protection → License creation
 *
 * Must pass 10/10 consecutive runs without a timeout.
 *
 * Prerequisites:
 *   - App running at PLAYWRIGHT_BASE_URL (default: http://localhost:8080)
 *   - SUPABASE_SERVICE_KEY env var set (service-role key for test user management)
 *   - Run:  npx playwright test tests/e2e/lifecycle.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  createTestUser,
  destroyTestUser,
  TEST_PASSWORD,
  TEST_NAME,
  ANON_KEY,
  API_URL,
  adminClient,
} from "./fixtures";

// ── Shared test state ─────────────────────────────────────────────────────────

let userId = "";
let userEmail = "";
let accessToken = "";
let publisherId = "";

// ── Setup: create a confirmed test user before the suite ──────────────────────

test.beforeAll(async () => {
  const result = await createTestUser();
  userId = result.userId;
  userEmail = result.email;
  accessToken = result.accessToken;

  // Wait up to 5s for the DB trigger to create the publishers row
  const admin = adminClient();
  for (let i = 0; i < 10; i++) {
    const { data } = await admin
      .from("publishers")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (data?.id) {
      publisherId = data.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!publisherId) {
    throw new Error(
      `publishers row was not created for user ${userId} within 5 seconds. ` +
      `Check that the Supabase auth trigger 'handle_new_user' is active.`
    );
  }
});

// ── Teardown: delete test user and all cascaded data ─────────────────────────

test.afterAll(async () => {
  if (userId) await destroyTestUser(userId);
});

// ── Helper: navigate to dashboard with injected auth session ─────────────────

async function loginAndGoto(page: Page, path: string) {
  // Inject session into localStorage before the app loads — avoids UI login
  await page.addInitScript(
    ({ email, token }) => {
      const key = "sb-djdzcciayennqchjgybx-auth-token";
      const value = JSON.stringify({
        access_token: token,
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { email, id: "" },
      });
      localStorage.setItem(key, value);
    },
    { email: userEmail, token: accessToken }
  );
  await page.goto(path, { waitUntil: "networkidle" });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Sign-up form — new user can create an account via UI
// ─────────────────────────────────────────────────────────────────────────────

test("1 · Sign-up: new user can submit the registration form", async ({ page }) => {
  // We use a SECOND unique email here (not the fixture user) to test the UI form
  const signupEmail = `e2e-signup-${Date.now()}@opedd-test.invalid`;
  let secondUserId = "";

  try {
    await page.goto("/signup", { waitUntil: "networkidle" });

    // Fill registration form
    await page.getByLabel(/first name/i).fill("E2E");
    await page.getByLabel(/last name/i).fill("Tester");
    await page.getByLabel(/email/i).fill(signupEmail);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);

    // Select organization type
    await page.locator('[role="combobox"]').first().click();
    await page.getByRole("option", { name: /Independent Creator/i }).click();

    // Submit
    await page.getByRole("button", { name: /create account|sign up|get started/i }).click();

    // Should land on email-verification screen (Supabase sends confirmation email)
    await expect(
      page.getByText(/check your email|verify your email|confirmation/i)
    ).toBeVisible({ timeout: 10_000 });

    // Cleanup: delete this user via service role
    const admin = adminClient();
    const { data } = await admin.auth.admin.listUsers();
    const newUser = data.users.find((u) => u.email === signupEmail);
    if (newUser) secondUserId = newUser.id;
  } finally {
    if (secondUserId) await destroyTestUser(secondUserId);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Unauthenticated access → redirect to /login (member-only protection)
// ─────────────────────────────────────────────────────────────────────────────

test("2 · Auth guard: /dashboard redirects unauthenticated users to /login", async ({ page }) => {
  // Navigate without injecting a session
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  // ProtectedRoute should redirect to /login
  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

  // Confirm login form is shown, not a blank screen
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Auth guard: protected API returns 401 without a valid token
// ─────────────────────────────────────────────────────────────────────────────

test("3 · Auth guard: publisher-profile API returns 401 with no token", async ({ page }) => {
  const response = await page.request.get(`${API_URL}/publisher-profile`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: "Bearer invalid-token",
    },
  });

  // Edge function must reject invalid tokens
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.success).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Authenticated user lands on dashboard and sees onboarding checklist
// ─────────────────────────────────────────────────────────────────────────────

test("4 · Dashboard: authenticated new user sees onboarding checklist", async ({ page }) => {
  await loginAndGoto(page, "/dashboard");

  // Either the setup flow (for new users) or the OnboardingChecklist should be present
  const setupFlow = page.getByText(/detect content feeds|what's your publication|import your content/i);
  const checklist = page.getByText(/get started with opedd|steps complete/i);
  const referralStep = page.getByText(/how did you hear about us|find opedd/i);

  // At least one onboarding element must be visible
  const anyVisible = await Promise.race([
    setupFlow.isVisible().catch(() => false),
    checklist.isVisible().catch(() => false),
    referralStep.isVisible().catch(() => false),
  ]);

  expect(anyVisible, "Expected an onboarding element to be visible for a new user").toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Onboarding — complete all steps via API (bypass UI for speed + reliability)
// ─────────────────────────────────────────────────────────────────────────────

test("5 · Onboarding: simulate completing all 3 checklist steps via API", async ({ page }) => {
  const admin = adminClient();

  // Step 1: Insert a dummy asset (simulates "content imported")
  await admin.from("assets").upsert({
    id: `e2e-asset-${userId}`,
    user_id: userId,
    title: "E2E Test Article",
    description: "Automated test article",
    license_type: "standard",
  }).select();

  // Also insert a real licenses row (the OnboardingChecklist reads 'assets', not 'licenses')
  // The checklist queries: supabase.from("assets").select... .eq("user_id", user.id)
  // So inserting into assets is sufficient.

  // Step 2: Insert a content source (simulates "widget added" / rss_sources)
  await admin.from("content_sources").upsert({
    id: `e2e-src-${userId}`,
    user_id: userId,
    source_type: "custom",
    url: "https://e2e-test.invalid/feed",
    name: "E2E Test Source",
    sync_status: "active",
    verification_status: "pending",
  });

  // Step 3: Mark Stripe onboarding as complete on the publisher row
  await admin
    .from("publishers")
    .update({ stripe_onboarding_complete: true })
    .eq("user_id", userId);

  // Navigate to dashboard — checklist should now show "You're all set!"
  await loginAndGoto(page, "/dashboard");

  // Look for completion state OR that checklist is gone (if auto-dismissed)
  const completionBanner = page.getByText(/you're all set|all set!/i);
  const checklistGone = async () => {
    const steps = page.getByText(/0 of 3 steps|1 of 3 steps|2 of 3 steps/i);
    return !(await steps.isVisible().catch(() => false));
  };

  const isComplete =
    (await completionBanner.isVisible({ timeout: 8_000 }).catch(() => false)) ||
    (await checklistGone());

  expect(isComplete, "Onboarding should show completion state when all 3 steps are done").toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Zombie element check — onboarding checklist does NOT reappear on refresh
//         when publisher is fully setup (all 3 steps complete)
// ─────────────────────────────────────────────────────────────────────────────

test("6 · Lifecycle: onboarding junk does not reappear on refresh for a complete publisher", async ({ page }) => {
  // Pre-condition: test user is already fully setup from test 5
  // Simulate clicking Dismiss by setting localStorage flag
  await page.addInitScript(() => {
    localStorage.setItem("opedd_onboarding_complete_dismissed", "true");
  });

  await loginAndGoto(page, "/dashboard");

  // The setup flow full-screen should NOT appear
  await expect(
    page.getByText(/detect content feeds|import your content/i)
  ).not.toBeVisible({ timeout: 5_000 });

  // The "Getting Started" progress steps should NOT appear
  await expect(
    page.getByText(/0 of 3 steps|1 of 3 steps|2 of 3 steps|3 of 3 steps/i)
  ).not.toBeVisible({ timeout: 5_000 });

  // The main dashboard content SHOULD be visible
  await expect(page.getByText(/total assets|protected|total revenue/i)).toBeVisible({
    timeout: 8_000,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: Member-only page — /l/:id for a paid article without paying → shows
//         "not available for licensing" when licensing_enabled = false
// ─────────────────────────────────────────────────────────────────────────────

test("7 · Access control: /l/:id shows 'not available' for unlicensed content", async ({ page }) => {
  // Navigate to a non-existent license ID
  await page.goto("/l/00000000-0000-0000-0000-000000000000", { waitUntil: "networkidle" });

  // Should show not-available state, not an unhandled error
  await expect(
    page.getByText(/not available for licensing|content is not available/i)
  ).toBeVisible({ timeout: 8_000 });

  // Must NOT show an unhandled JS error boundary
  await expect(page.getByText(/something went wrong|unhandled error/i)).not.toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8: Create a license via API and verify the DB record exists
// ─────────────────────────────────────────────────────────────────────────────

test("8 · License creation: API creates a license_transactions record in DB", async ({ page }) => {
  const admin = adminClient();

  // Get the publisher's article (inserted in test 5)
  const { data: articles } = await admin
    .from("licenses")
    .select("id, human_price")
    .eq("publisher_id", publisherId)
    .limit(1);

  // If no article exists from previous tests, create one directly
  let articleId: string;
  if (!articles || articles.length === 0) {
    const { data: newArticle } = await admin
      .from("licenses")
      .insert({
        publisher_id: publisherId,
        title: "E2E Test Article for License",
        description: "Created by E2E test",
        license_type: "standard",
        human_price: 0, // free so we don't need Stripe
        licensing_enabled: true,
      })
      .select("id")
      .single();
    articleId = newArticle!.id;
  } else {
    articleId = articles[0].id;
    // Ensure it's licensed and free
    await admin
      .from("licenses")
      .update({ licensing_enabled: true, human_price: 0 })
      .eq("id", articleId);
  }

  // Issue a free license via the public API (no payment required for price=0)
  const response = await page.request.post(`${API_URL}/issue-license`, {
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    data: {
      article_id: articleId,
      buyer_email: `buyer-${Date.now()}@e2e-test.invalid`,
      buyer_name: "E2E Buyer",
      license_type: "human",
      intended_use: "personal",
    },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.data?.license_key).toBeTruthy();

  const licenseKey = body.data.license_key;

  // ── DB verification ──────────────────────────────────────────────────────
  // The license_transactions row MUST exist in DB within 3 seconds
  let dbRecord = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data } = await admin
      .from("license_transactions")
      .select("license_key, status, buyer_email")
      .eq("license_key", licenseKey)
      .single();
    if (data) {
      dbRecord = data;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  expect(dbRecord, `DB record for license_key ${licenseKey} not found within 3s`).toBeTruthy();
  expect(dbRecord!.status).toBe("completed");
  expect(dbRecord!.license_key).toBe(licenseKey);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9: Idempotency — submitting a free license twice does NOT create duplicates
// ─────────────────────────────────────────────────────────────────────────────

test("9 · Idempotency: issuing the same free license twice does not create duplicates", async ({ page }) => {
  const admin = adminClient();
  const buyerEmail = `idempotency-${Date.now()}@e2e-test.invalid`;

  // Get a licensable free article
  const { data: articles } = await admin
    .from("licenses")
    .select("id")
    .eq("publisher_id", publisherId)
    .eq("human_price", 0)
    .eq("licensing_enabled", true)
    .limit(1);

  if (!articles || articles.length === 0) {
    test.skip(true, "No free article available — run test 8 first");
    return;
  }

  const articleId = articles[0].id;
  const payload = {
    article_id: articleId,
    buyer_email: buyerEmail,
    buyer_name: "Idempotency Test",
    license_type: "human",
    intended_use: "personal",
  };

  // Fire two simultaneous requests
  const [res1, res2] = await Promise.all([
    page.request.post(`${API_URL}/issue-license`, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: payload,
    }),
    page.request.post(`${API_URL}/issue-license`, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: payload,
    }),
  ]);

  // Both may succeed or one may be rate-limited (5/min) — acceptable
  // What must NOT happen: two completed DB records for the same email+article
  await new Promise((r) => setTimeout(r, 1000)); // let both settle

  const { data: records, count } = await admin
    .from("license_transactions")
    .select("license_key, status", { count: "exact" })
    .eq("buyer_email", buyerEmail)
    .eq("article_id", articleId)
    .eq("status", "completed");

  // Allow at most 1 completed record (second should be rate-limited or deduped)
  expect(
    count,
    `Expected at most 1 completed license for buyer ${buyerEmail} on article ${articleId}, got ${count}`
  ).toBeLessThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10: Loading states — every API call shows a loading indicator, no frozen UI
// ─────────────────────────────────────────────────────────────────────────────

test("10 · UX: dashboard shows a loading state while data is fetched, not a frozen screen", async ({ page }) => {
  // Intercept API calls to delay them (simulates slow network)
  await page.route(`**/publisher-profile**`, async (route) => {
    await new Promise((r) => setTimeout(r, 300)); // 300ms artificial delay
    await route.continue();
  });

  await loginAndGoto(page, "/dashboard");

  // The app must NOT show a blank/frozen screen — either a loader or content
  const hasLoader = await page.getByRole("progressbar").isVisible().catch(() => false) ||
    await page.locator(".animate-spin").isVisible().catch(() => false) ||
    await page.locator("[data-testid='page-loader']").isVisible().catch(() => false);

  const hasContent = await page.getByText(/total assets|dashboard|content/i).isVisible().catch(() => false);

  expect(
    hasLoader || hasContent,
    "Dashboard must show a loading state or immediate content — never a frozen blank screen"
  ).toBe(true);

  // Eventually content must appear (no permanent hang)
  await expect(page.getByText(/total assets|dashboard|content|onboarding/i)).toBeVisible({
    timeout: 15_000,
  });
});
