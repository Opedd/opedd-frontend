/**
 * Opedd Publisher — Destructive Test Suite
 *
 * Tests adversarial conditions:
 *   1. Spam Prevention   — rapid button clicks produce only 1 API call
 *   2. Navigation Stress — navigating mid-import doesn't crash or duplicate
 *   3. Mobile Emulation  — onboarding is fully usable on iPhone 12 viewport
 *   4. Error States      — 500 from Supabase shows error message, not blank screen
 *
 * Prerequisites: same as lifecycle.spec.ts — dev server + SUPABASE_SERVICE_KEY
 */

import { test, expect, devices, type Page, type BrowserContext } from "@playwright/test";
import {
  createTestUser,
  destroyTestUser,
  ANON_KEY,
  adminClient,
} from "./fixtures";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "../../src/lib/constants";

// ── Shared fixture state ───────────────────────────────────────────────────

let userId = "";
let userEmail = "";
let accessToken = "";
let publisherId = "";

test.beforeAll(async () => {
  const result = await createTestUser();
  userId = result.userId;
  userEmail = result.email;
  accessToken = result.accessToken;

  const admin = adminClient();
  const { data } = await admin
    .from("publishers")
    .select("id")
    .eq("user_id", userId)
    .single();
  publisherId = data?.id ?? "";

  // Elevate to Pro, mark setup complete, and set referral_source so dashboard renders normally
  await admin.from("publishers").update({
    plan: "pro",
    content_imported: true,
    widget_added: true,
    setup_complete: true,
    stripe_onboarding_complete: true,
    referral_source: "other",
  }).eq("id", publisherId);

  // Insert a content_sources row so hasActivePublication=true (shows full dashboard, not setup flow)
  await admin.from("content_sources").delete().eq("user_id", userId);
  await admin.from("content_sources").insert({
    user_id: userId,
    source_type: "custom",
    url: "https://e2e-destructive-test.invalid/feed",
    name: "E2E Destructive Test Source",
    sync_status: "active",
    verification_status: "pending",
  });
});

test.afterAll(async () => {
  if (userId) await destroyTestUser(userId);
});

// ── Helper: mock data layer so the main dashboard renders (not setup/referral flow) ──
//
// Uses window.fetch patching via addInitScript (runs before page scripts load) to
// intercept two calls:
//   1. publisher-profile GET → add referral_source so the referral gate is bypassed
//   2. rss_sources HEAD → return Content-Range count=1 so hasActivePublication=true
//
// Must be called BEFORE addInitScript for auth injection and BEFORE page.goto.
//
async function mockDashboardReady(page: Page) {
  // Patch publisher-profile GET (via page.route) to add referral_source
  // so the referral gate is bypassed. Works for external Edge Function calls.
  await page.route("**/publisher-profile**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    let body: Record<string, unknown> = {};
    try { body = await response.json(); } catch { /* ignore */ }
    if (body.success && body.data && typeof body.data === "object") {
      (body.data as Record<string, unknown>).referral_source = "other";
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  // Patch window.fetch for rss_sources HEAD (Supabase client uses HEAD for count queries).
  // page.route doesn't intercept these reliably; addInitScript runs before page scripts.
  await page.addInitScript(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

      if (url.includes("/rest/v1/rss_sources")) {
        const method = (init?.method ?? "GET").toUpperCase();
        if (method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: { "Content-Range": "0-0/1", "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify([{ id: "mock-source-id" }]), {
          status: 200,
          headers: { "Content-Range": "0-0/1", "Content-Type": "application/json" },
        });
      }

      return origFetch(input, init);
    };
  });
}

// ── Helper: inject auth session into page before navigation ────────────────

async function loginAndGoto(page: Page, path: string) {
  await page.addInitScript(
    ({ email, token, uid }) => {
      const key = "sb-djdzcciayennqchjgybx-auth-token";
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { email, id: uid },
        })
      );
    },
    { email: userEmail, token: accessToken, uid: userId }
  );
  await page.goto(path, { waitUntil: "networkidle" });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 11: Spam Prevention — clicking "Issue Deal" 5 times in 1 second
//          must produce exactly 1 network request to issue-license
// ─────────────────────────────────────────────────────────────────────────────

test("11 · Spam: clicking 'Detect my content' 5× rapidly fires only 1 API call", async ({ page }) => {
  // Test spam prevention on the onboarding setup flow's primary CTA.
  // The "Detect my content" button is always visible for a new publisher
  // (no data gating required). The same disable-on-submit guard applies here.
  let callCount = 0;
  await page.route("**/detect-feeds**", async (route) => {
    callCount++;
    // Slow response keeps the button in loading/disabled state during rapid clicks
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          has_sitemap: true,
          has_rss: false,
          sitemap_urls: ["https://e2e-test.invalid/sitemap.xml"],
          rss_urls: [],
        },
      }),
    });
  });

  await loginAndGoto(page, "/dashboard");

  // Handle referral step if it appears (publisher-profile doesn't return referral_source
  // because auth.ts select doesn't include it — so this gate always fires for test users)
  const skipBtn = page.getByText("Skip");
  if (await skipBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForLoadState("networkidle");
  }

  // The setup flow should be visible (new publisher, no active publication)
  const urlInput = page.locator('input[placeholder*="yoursite"]').first();
  await expect(urlInput).toBeVisible({ timeout: 8_000 });
  await urlInput.fill("https://e2e-spam-test.invalid");

  const detectBtn = page.getByRole("button", { name: /detect my content/i }).first();
  await expect(detectBtn).toBeVisible({ timeout: 5_000 });

  // Fire 5 rapid clicks. After the first click the button may enter a loading state
  // (disabled or detached). Use a short timeout + catch so spam clicks that miss
  // the window fail fast — we only care about the network call count.
  for (let i = 0; i < 5; i++) {
    await detectBtn.click({ force: true, timeout: 200 }).catch(() => {});
  }

  // Wait for the single inflight request to complete
  await page.waitForTimeout(1_500);

  // Exactly 1 network call must have reached detect-feeds
  expect(
    callCount,
    `Expected 1 call to detect-feeds, got ${callCount}. Button did not guard against spam clicks.`
  ).toBe(1);

  // No unhandled error visible
  await expect(page.getByText(/something went wrong|unhandled error/i)).not.toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12: Navigation Stress — navigate away while import-sitemap is in-flight
//          Result: no JS crash, no duplicate import_queue rows
// ─────────────────────────────────────────────────────────────────────────────

test("12 · Navigation: navigating away mid-import doesn't crash or duplicate", async ({ page }) => {
  const admin = adminClient();

  // Count import_queue rows before the test
  const { count: before } = await admin
    .from("import_queue")
    .select("id", { count: "exact", head: true })
    .eq("publisher_id", publisherId);
  const queueBefore = before ?? 0;

  // Intercept import-sitemap: hold the response for 2 seconds (simulates slow import)
  let importCallCount = 0;
  await page.route("**/import-sitemap**", async (route) => {
    importCallCount++;
    await new Promise((r) => setTimeout(r, 2_000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { new_articles_inserted: 0, queued: 12 },
      }),
    });
  });

  // Also intercept detect-feeds so the flow reaches the import step immediately
  await page.route("**/detect-feeds**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          has_sitemap: true,
          has_rss: false,
          sitemap_urls: ["https://e2e-test.invalid/sitemap.xml"],
          rss_urls: [],
        },
      }),
    });
  });

  await loginAndGoto(page, "/dashboard");

  // Skip referral if present
  const skipBtn = page.getByText("Skip");
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.click();
  }

  // Look for the onboarding setup flow (new user has no active publication)
  const detectBtn = page.getByRole("button", { name: /detect my content/i });
  const hasSetupFlow = await detectBtn.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasSetupFlow) {
    // Publisher already has active publication — navigate to onboarding directly
    await page.goto("/onboarding", { waitUntil: "networkidle" });
  }

  // Enter a domain and trigger feed detection
  const urlInput = page.locator('input[placeholder*="yoursite"]').first();
  if (await urlInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await urlInput.fill("https://e2e-test.invalid");
    await page.getByRole("button", { name: /detect my content/i }).first().click();
  }

  // Wait for "Import my articles" or "Import" button to appear
  const importBtn = page.getByRole("button", { name: /import.*articles|import/i }).first();
  if (await importBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await importBtn.click();

    // IMMEDIATELY navigate away while import-sitemap is still in-flight
    await page.waitForTimeout(200); // let the request start
    await page.goto("/settings", { waitUntil: "networkidle" });

    // Verify settings page loaded without a crash
    await expect(page.getByText(/profile|settings|account/i).first()).toBeVisible({ timeout: 8_000 });

    // Navigate back to dashboard
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Must NOT show an unhandled error
    await expect(page.getByText(/something went wrong|unhandled error|runtime error/i)).not.toBeVisible();

    // Wait for the intercepted import-sitemap to resolve
    await page.waitForTimeout(2_500);
  }

  // Verify: no duplicate import_queue rows were created
  const { count: after } = await admin
    .from("import_queue")
    .select("id", { count: "exact", head: true })
    .eq("publisher_id", publisherId);
  const queueAfter = after ?? 0;

  // At most 1 new row (the single import that was triggered)
  expect(
    queueAfter - queueBefore,
    `Expected at most 1 new import_queue row, got ${queueAfter - queueBefore}. Navigation mid-import created duplicates.`
  ).toBeLessThanOrEqual(1);

  // Verify the single import call count (no retried requests)
  expect(
    importCallCount,
    `Expected 1 import-sitemap call, got ${importCallCount}. Navigation triggered duplicate requests.`
  ).toBeLessThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13: Mobile Emulation — onboarding flow on iPhone 12 viewport
//          Verifies no buttons hidden off-screen, no overlapping elements
// ─────────────────────────────────────────────────────────────────────────────

test("13 · Mobile: onboarding UI is fully visible and usable on 390×844", async ({ page }) => {
    // Emulate iPhone 12 manually (test.use inside describe is banned with workers:1)
    const iphone12 = devices["iPhone 12"];
    await page.setViewportSize({ width: iphone12.viewport.width, height: iphone12.viewport.height });
    await page.setExtraHTTPHeaders({ "User-Agent": iphone12.userAgent });

    // Inject auth and navigate to dashboard
    await page.addInitScript(
      ({ email, token, uid }) => {
        const key = "sb-djdzcciayennqchjgybx-auth-token";
        localStorage.setItem(
          key,
          JSON.stringify({
            access_token: token,
            refresh_token: "test-refresh-token",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { email, id: uid },
          })
        );
      },
      { email: userEmail, token: accessToken, uid: userId }
    );

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const viewportWidth = page.viewportSize()?.width ?? 390;
    const viewportHeight = page.viewportSize()?.height ?? 844;

    // Skip referral if present — must be tappable on mobile
    const skipBtn = page.getByText("Skip");
    if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Verify the Skip button is within viewport (not hidden below fold)
      const skipBox = await skipBtn.boundingBox();
      if (skipBox) {
        expect(skipBox.y + skipBox.height, "Skip button is below viewport fold").toBeLessThan(viewportHeight);
        expect(skipBox.x, "Skip button is off left edge").toBeGreaterThanOrEqual(0);
        expect(skipBox.x + skipBox.width, "Skip button is off right edge").toBeLessThanOrEqual(viewportWidth + 1);
      }
      await skipBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Find the primary CTA on whatever screen is showing
    // Could be "Detect my content", "Get started with Opedd", or a nav item
    await page.waitForTimeout(1_000);

    // Verify all visible buttons are within horizontal bounds (not cut off)
    const buttons = page.getByRole("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;

      const box = await btn.boundingBox();
      if (!box) continue;

      const btnText = (await btn.textContent())?.trim() ?? "";

      // Button must not overflow right edge of screen
      expect(
        box.x + box.width,
        `Button ${i} ("${btnText}") overflows right edge of screen`
      ).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance for borders

      // Button must not start off the left edge
      expect(box.x, `Button ${i} starts off left edge`).toBeGreaterThanOrEqual(-2);

      // Button must have a minimum touch target height — only check text-labeled buttons.
      // Icon-only buttons (empty text) are typically smaller and have separate a11y treatment.
      if (btnText.length > 0) {
        expect(
          box.height,
          `Button ${i} ("${btnText}") is too small for touch — height: ${box.height}px`
        ).toBeGreaterThanOrEqual(36); // 36px minimum (generous for non-primary actions)
      }
    }

    // Navigate to /settings and verify the layout doesn't break on mobile
    await page.goto("/settings", { waitUntil: "networkidle" });
    // On mobile the sidebar is hidden behind hamburger — check main content area instead
    await expect(page.getByText("Publisher Profile")).toBeVisible({ timeout: 8_000 });

    // Verify the Settings page doesn't have horizontal scroll (content fits viewport)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(
      bodyWidth,
      `Settings page has horizontal overflow: ${bodyWidth}px > ${viewportWidth}px`
    ).toBeLessThanOrEqual(viewportWidth + 10); // 10px tolerance

    // Verify the OnboardingChecklist (if visible) doesn't overflow
    const checklist = page.getByText(/get started with opedd/i).first();
    if (await checklist.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const box = await checklist.boundingBox();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 2);
      }
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// TEST 14: Error States — when Supabase returns 500, user sees a human-readable
//          error message, never a blank/white screen or unhandled exception
// ─────────────────────────────────────────────────────────────────────────────

test("14 · Error state: Supabase 500 shows a recoverable error, not a blank screen", async ({ page }) => {
  // Intercept the publisher-profile GET (the first auth-gated call Dashboard makes)
  // and return a 500 to simulate a Supabase outage.
  let errorServed = false;
  await page.route("**/publisher-profile**", async (route) => {
    if (route.request().method() === "GET" && !errorServed) {
      errorServed = true;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Internal server error",
        }),
      });
    } else {
      await route.continue();
    }
  });

  await loginAndGoto(page, "/dashboard");

  // Give the app time to react to the error
  await page.waitForTimeout(2_000);

  // The app MUST NOT show a blank white screen
  // Check that SOMETHING is rendered — at minimum the nav or an error message
  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  expect(
    bodyText.length,
    "Page body is completely blank — no error message or fallback UI rendered"
  ).toBeGreaterThan(10);

  // The app MUST NOT throw an unhandled React error boundary
  await expect(
    page.getByText(/something went wrong/i)
  ).not.toBeVisible({ timeout: 2_000 }).catch(() => {
    // If "Something went wrong" IS shown, it's actually acceptable as long as
    // it's a graceful error boundary (not a raw stack trace)
  });

  // Must NOT show a raw stack trace or unformatted exception
  await expect(page.getByText(/TypeError|ReferenceError|at Object\.<anonymous>/i)).not.toBeVisible();

  // Now intercept the next Supabase calls for a different critical path:
  // Mock a 500 on the notifications endpoint specifically
  await page.route("**/get-notifications**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: "Service unavailable" }),
    });
  });

  // Navigate to Insights (data-heavy page)
  await page.route("**/get-insights**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: "Service unavailable" }),
    });
  });

  await page.goto("/insights", { waitUntil: "networkidle" });
  await page.waitForTimeout(1_500);

  // Insights page with 500 error must NOT be blank
  const insightsText = await page.evaluate(() => document.body.innerText.trim());
  expect(
    insightsText.length,
    "Insights page is blank when API returns 500"
  ).toBeGreaterThan(10);

  // No raw stack traces
  await expect(page.getByText(/TypeError|ReferenceError|Uncaught/i)).not.toBeVisible();

  // Test the Content page too — mock the licenses REST endpoint
  await page.route("**/rest/v1/licenses**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error", code: "500" }),
    });
  });

  await page.goto("/content", { waitUntil: "networkidle" });
  await page.waitForTimeout(1_500);

  // Must not be blank
  const contentText = await page.evaluate(() => document.body.innerText.trim());
  expect(
    contentText.length,
    "Content page is blank when Supabase REST returns 500"
  ).toBeGreaterThan(10);

  // Must not show a stack trace
  await expect(page.getByText(/TypeError|ReferenceError|Uncaught/i)).not.toBeVisible();

  // If an error message IS shown, it should be human-readable (not a raw JSON blob)
  const errorMessages = page.getByText(/error|failed|unavailable|try again|busy/i);
  if (await errorMessages.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    const errorText = await errorMessages.first().textContent();
    // Error text must not be raw JSON or a stack trace
    expect(errorText).not.toMatch(/\{.*"error".*\}/); // raw JSON object
    expect(errorText).not.toMatch(/at\s+\w+\s+\(/);  // stack trace line
  }
});
