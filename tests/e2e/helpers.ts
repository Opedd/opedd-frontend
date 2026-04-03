/**
 * E2E Test Helpers
 *
 * Shared auth injection and utility functions for Playwright E2E tests.
 * Builds on top of fixtures.ts (which handles user creation/deletion).
 *
 * These helpers are designed for tests that DON'T need a fresh user per suite
 * — they authenticate as the standing test user (test@example.com) via a real
 * Supabase sign-in, then inject the session into localStorage.
 */
import { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E";

const STORAGE_KEY = "sb-djdzcciayennqchjgybx-auth-token";

// ---------------------------------------------------------------------------
// injectAuth — sign in via Supabase REST and inject session into localStorage
// ---------------------------------------------------------------------------

interface InjectAuthOptions {
  email?: string;
  password?: string;
}

/**
 * Sign in to Supabase and inject the session into the page's localStorage
 * via `addInitScript` so the app sees the user as authenticated immediately.
 *
 * Call BEFORE `page.goto(...)`.
 */
export async function injectAuth(
  page: Page,
  opts: InjectAuthOptions = {}
): Promise<{
  access_token: string;
  refresh_token: string;
  user_id: string;
}> {
  const email = opts.email ?? "test@example.com";
  const password = opts.password ?? "test123456";

  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `injectAuth: sign-in failed for ${email}: ${res.status} ${body}`
    );
  }

  const data = await res.json();

  const sessionPayload = JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: data.user,
  });

  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: sessionPayload }
  );

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user.id,
  };
}

// ---------------------------------------------------------------------------
// dismissModal — close any overlay that might block UI interaction
// ---------------------------------------------------------------------------

/**
 * Dismiss any modal/dialog/banner that appears on page load (e.g. ReferralStep).
 */
export async function dismissModal(page: Page): Promise<void> {
  // Try the skip button first (ReferralStep uses aria-label="Skip")
  const skipBtn = page.locator("button[aria-label='Skip']");
  try {
    if (await skipBtn.isVisible({ timeout: 1500 })) {
      await skipBtn.click();
      await page.waitForTimeout(300);
      return;
    }
  } catch {
    // not present
  }

  // Try common dismiss patterns
  const selectors = [
    'button:has-text("Got it")',
    'button:has-text("Close")',
    'button:has-text("Dismiss")',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    try {
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click();
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // not present
    }
  }
}

// ---------------------------------------------------------------------------
// waitForAppReady — wait for the app to be past loading state
// ---------------------------------------------------------------------------

/**
 * Wait for the app to finish initial loading (spinners, skeletons).
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for any loading spinner to disappear
  try {
    await page
      .locator(".animate-spin")
      .first()
      .waitFor({ state: "hidden", timeout: 15_000 });
  } catch {
    // No spinner found or already hidden
  }

  // Brief settle time for React hydration
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// assertNoCrash — verify no ErrorBoundary triggered
// ---------------------------------------------------------------------------

/**
 * Assert the page did not hit the React ErrorBoundary.
 */
export async function assertNoCrash(
  page: Page,
  context: string
): Promise<void> {
  const errorCount = await page.locator("text=Something went wrong").count();
  if (errorCount > 0) {
    throw new Error(`[${context}] ErrorBoundary triggered — JS crash`);
  }
}
