/**
 * Phase 11.5 — E2E test publisher fixture.
 *
 * Service-role helper for creating + cleaning up test publishers in
 * production Supabase. Test publishers are isolated by email prefix
 * `+e2etest-<spec>-<timestamp>@<domain>` per founder ratification (safer
 * than blanket `@opedd-test.com` cleanup against any founder-created
 * manual test publishers using that domain).
 *
 * Lifecycle:
 *   - beforeAll: cleanupStaleE2EPublishers() — sweep rows older than 1 day
 *     matching the `+e2etest-` email prefix (idempotent recovery from
 *     failed prior runs)
 *   - per-test: createTestPublisher(spec) — fresh user + publisher row
 *   - afterAll: cleanupTestPublisher(userId) — cascade delete
 *
 * Auth bypass: Service-role creates the auth user with `email_confirm: true`
 * and provisions a session JWT. Playwright populates localStorage with the
 * Supabase session shape before navigating to /dashboard. This bypasses the
 * magic-link click step (which requires email-inbox access) while still
 * exercising the production auth path post-confirmation.
 *
 * Env required (set in GitHub Actions secrets):
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SUPABASE_ANON_KEY (for publishable client; used to populate session)
 *
 * Optional env (per-platform; absence skips the spec):
 *   - TEST_BEEHIIV_API_KEY + TEST_BEEHIIV_PUB_ID
 *   - TEST_GHOST_SITE_URL + TEST_GHOST_ADMIN_API_KEY
 *   - TEST_SUBSTACK_URL
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export interface TestPublisher {
  userId: string;
  publisherId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export function getAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Sweep stale E2E test publishers (older than 1 day). Idempotent recovery
 * from prior failed runs that didn't reach their afterAll cleanup.
 */
export async function cleanupStaleE2EPublishers(): Promise<{ deleted: number }> {
  const admin = getAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Step 1: find auth.users rows with +e2etest- email pattern older than 1 day
  const { data: usersData, error: userErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (userErr) {
    console.error("[e2e fixture] listUsers failed:", userErr.message);
    return { deleted: 0 };
  }

  const staleUsers = (usersData?.users ?? []).filter(
    (u) =>
      u.email?.includes("+e2etest-") &&
      u.created_at &&
      u.created_at < oneDayAgo,
  );

  let deleted = 0;
  for (const u of staleUsers) {
    try {
      // Step 2: cascade-delete publisher rows + content_sources rows + platform_archive_jobs
      const { data: pubs } = await admin
        .from("publishers")
        .select("id")
        .eq("user_id", u.id);

      const pubIds = (pubs ?? []).map((p) => p.id);

      if (pubIds.length > 0) {
        await admin.from("platform_archive_jobs").delete().in("publisher_id", pubIds);
        await admin.from("licenses").delete().in("publisher_id", pubIds);
        await admin.from("publishers").delete().in("id", pubIds);
      }
      await admin.from("content_sources").delete().eq("user_id", u.id);

      // Step 3: delete auth user (cascade-deletes anything else FK'd to user_id)
      await admin.auth.admin.deleteUser(u.id);
      deleted++;
    } catch (err) {
      console.warn(
        `[e2e fixture] cleanup failed for stale user ${u.id}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log(`[e2e fixture] cleaned up ${deleted} stale E2E publishers (>1 day old)`);
  return { deleted };
}

/**
 * Create a fresh test publisher: auth user + session + publisher row.
 * Returns access/refresh tokens for Playwright session-injection.
 */
export async function createTestPublisher(
  spec: string,
  options: { platform?: "beehiiv" | "ghost" | "substack" | "api" } = {},
): Promise<TestPublisher> {
  const admin = getAdminClient();
  const timestamp = Date.now();
  const email = `alexandre.n.bridi+e2etest-${spec}-${timestamp}@gmail.com`;
  const password = `E2eTest!${timestamp}#Secure`;

  // 1. Create auth user with email_confirm: true (skip magic-link)
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr || !userData.user) {
    throw new Error(`[e2e fixture] createUser failed: ${userErr?.message}`);
  }
  const userId = userData.user.id;

  // 2. Sign in to acquire session tokens (Playwright will inject these
  //    into localStorage so the browser session matches what magic-link
  //    confirmation would have produced).
  const sessionClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionData, error: sessionErr } =
    await sessionClient.auth.signInWithPassword({ email, password });
  if (sessionErr || !sessionData.session) {
    throw new Error(`[e2e fixture] signIn failed: ${sessionErr?.message}`);
  }

  // 3. Create publisher row via service-role (mimics post-signup trigger).
  //    setup_state = "prospect" matches fresh-signup state.
  const platform = options.platform;
  const setupData = platform
    ? { platform }
    : {};

  const { data: pubData, error: pubErr } = await admin
    .from("publishers")
    .insert({
      user_id: userId,
      name: `E2E ${spec} ${timestamp}`,
      contact_email: email,
      plan: "free",
      // setup_state must be "in_setup" — verify-ownership/index.ts:221
      // hard-fails with 422 WIZARD_STATE_INCOMPATIBLE on any other state.
      // "prospect" is the pre-wizard state; the wizard transitions to
      // "in_setup" after step 1 (platform selection). E2E specs skip the
      // wizard UI and call /verify-ownership directly, so the fixture must
      // pre-place state where verify-ownership expects it.
      setup_state: "in_setup",
      setup_step: 1,
      setup_complete: false,
      setup_data: setupData,
      is_test_seed: false,
    })
    .select("id")
    .single();
  if (pubErr || !pubData) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`[e2e fixture] publisher insert failed: ${pubErr?.message}`);
  }

  return {
    userId,
    publisherId: pubData.id,
    email,
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

/**
 * Inject Supabase session into Playwright browser localStorage so the page
 * loads in authenticated state without needing to click a magic link.
 * Call this BEFORE page.goto() — the storage key is read at app boot.
 */
export async function injectSession(page: Page, publisher: TestPublisher): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL + SUPABASE_ANON_KEY required for session injection");
  }
  // Supabase's storage key shape: sb-<project_ref>-auth-token
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const sessionValue = JSON.stringify({
    access_token: publisher.accessToken,
    refresh_token: publisher.refreshToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: publisher.userId, email: publisher.email },
  });

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: storageKey, value: sessionValue },
  );
}

/**
 * Per-test cleanup: cascade-delete publisher + content_sources + auth user.
 */
export async function cleanupTestPublisher(publisher: TestPublisher): Promise<void> {
  const admin = getAdminClient();
  try {
    await admin.from("platform_archive_jobs").delete().eq("publisher_id", publisher.publisherId);
    await admin.from("licenses").delete().eq("publisher_id", publisher.publisherId);
    await admin.from("publishers").delete().eq("id", publisher.publisherId);
    await admin.from("content_sources").delete().eq("user_id", publisher.userId);
    await admin.auth.admin.deleteUser(publisher.userId);
  } catch (err) {
    console.warn(
      `[e2e fixture] cleanup failed for ${publisher.email}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}
