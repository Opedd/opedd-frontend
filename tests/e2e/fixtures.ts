/**
 * Shared test fixtures for Opedd E2E suite.
 *
 * Uses Supabase service-role key to create/destroy test users programmatically,
 * bypassing the email-confirmation step that would otherwise block automation.
 *
 * Required environment variables (set in .env.test or CI secrets):
 *   SUPABASE_URL            = https://djdzcciayennqchjgybx.supabase.co
 *   SUPABASE_SERVICE_KEY    = <service_role_key>
 *   PLAYWRIGHT_BASE_URL     = http://localhost:8080 (or your preview URL)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://djdzcciayennqchjgybx.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// Public anon key — safe to embed in test code (already in frontend source)
export const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E";

export const API_URL = "https://api.opedd.com";

/** Service-role client — can create/delete users, bypass RLS */
export function adminClient() {
  if (!SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_KEY is not set. E2E tests require a service-role key to manage test users."
    );
  }
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Generate a unique test email to avoid collisions between runs */
export function testEmail(): string {
  const ts = Date.now();
  return `e2e-test-${ts}@opedd-test.invalid`;
}

export const TEST_PASSWORD = "E2eTest1234!";
export const TEST_NAME = "E2E Test Publisher";

/**
 * Creates a confirmed (no email verification needed) test user AND a
 * corresponding publishers row (since there is no DB trigger — the app
 * creates the row via the Express backend on first sign-up).
 * Returns the user id, publisher id, and a fresh access token.
 */
export async function createTestUser(): Promise<{
  userId: string;
  email: string;
  accessToken: string;
}> {
  const admin = adminClient();
  const email = testEmail();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true, // bypass email verification
    user_metadata: { full_name: TEST_NAME },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  const userId = data.user.id;

  // No DB trigger exists — create the publishers row directly with the service-role client
  const { error: pubError } = await admin.from("publishers").insert({
    user_id: userId,
    name: TEST_NAME,
  });

  if (pubError) {
    // Clean up auth user before throwing
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create publishers row: ${pubError.message}`);
  }

  // Sign in to get an access token
  const { data: session, error: loginError } = await admin.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (loginError || !session.session) {
    throw new Error(`Failed to sign in test user: ${loginError?.message}`);
  }

  return {
    userId,
    email,
    accessToken: session.session.access_token,
  };
}

/** Removes the test user and all associated data (publishers row cascades) */
export async function destroyTestUser(userId: string): Promise<void> {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(userId);
}

/**
 * Injects a Supabase session into the browser's localStorage so the app
 * treats the page as already authenticated — avoids UI-level login flows.
 *
 * Call this via page.addInitScript() or page.evaluate() before navigation.
 */
export function buildStorageState(email: string, accessToken: string, refreshToken: string) {
  return {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:8080",
        localStorage: [
          {
            name: "sb-djdzcciayennqchjgybx-auth-token",
            value: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              token_type: "bearer",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              user: { email },
            }),
          },
        ],
      },
    ],
  };
}
