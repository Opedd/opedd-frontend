/**
 * Phase 11.5 — Beehiiv onboarding E2E behavioral test.
 *
 * Validates the canonical Beehiiv path end-to-end against production:
 *   1. Create fresh test publisher (service-role auth user + publisher row)
 *   2. Inject session + load /dashboard (verifies post-signup landing per UX-1)
 *   3. POST /verify-ownership with platform_native_api + Beehiiv credentials
 *      (mimics what Step2Beehiiv does on submit)
 *   4. Wait for process-platform-archives cron to drain the queued job
 *   5. Assert at least 1 license row landed in licenses table for this publisher
 *   6. Assert content_sources row exists with verification_status='verified'
 *   7. Cleanup
 *
 * Skips if TEST_BEEHIIV_API_KEY + TEST_BEEHIIV_PUB_ID env vars not set.
 *
 * Force-fail mechanism for Phase 11.5 alert-pipeline validation:
 *   - E2E_FORCE_FAIL=beehiiv asserts false immediately. Used to confirm
 *     Sentry alert + GitHub issue auto-fire pipeline.
 */

import { test, expect } from "@playwright/test";
import {
  createTestPublisher,
  cleanupTestPublisher,
  cleanupStaleE2EPublishers,
  injectSession,
  getAdminClient,
  type TestPublisher,
} from "./fixtures/test-publisher";

const TEST_BEEHIIV_API_KEY = process.env.TEST_BEEHIIV_API_KEY;
const TEST_BEEHIIV_PUB_ID = process.env.TEST_BEEHIIV_PUB_ID;
const API_BASE = process.env.OPEDD_API_BASE || "https://api.opedd.com";
const FORCE_FAIL = process.env.E2E_FORCE_FAIL;

test.describe.serial("Beehiiv onboarding E2E", () => {
  let publisher: TestPublisher;

  test.beforeAll(async () => {
    await cleanupStaleE2EPublishers();
    if (!TEST_BEEHIIV_API_KEY || !TEST_BEEHIIV_PUB_ID) {
      test.skip(true, "TEST_BEEHIIV_API_KEY + TEST_BEEHIIV_PUB_ID not set");
    }
    publisher = await createTestPublisher("beehiiv", { platform: "beehiiv" });
  });

  test.afterAll(async () => {
    if (publisher) await cleanupTestPublisher(publisher);
  });

  test("Beehiiv verify → archive → article in Dashboard", async ({ page }) => {
    if (FORCE_FAIL === "beehiiv") expect(false, "E2E_FORCE_FAIL=beehiiv").toBe(true);

    // 1. Inject session + load Dashboard
    await injectSession(page, publisher);
    await page.goto("/dashboard?new=1");

    // Assert post-signup landing per UX-1 — Dashboard renders, not wizard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. POST /verify-ownership with platform_native_api (Beehiiv branch)
    const verifyResp = await page.request.post(`${API_BASE}/verify-ownership`, {
      headers: {
        Authorization: `Bearer ${publisher.accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        method: "platform_native_api",
        platform: "beehiiv",
        credentials: { api_key: TEST_BEEHIIV_API_KEY, pub_id: TEST_BEEHIIV_PUB_ID },
      },
    });
    expect(verifyResp.ok(), `verify-ownership returned ${verifyResp.status()}: ${await verifyResp.text()}`).toBe(true);

    // 3. Wait for cron to drain the archive job (max 4 minutes; cron fires
    //    every 2 min, so 2 ticks guaranteed)
    const admin = getAdminClient();
    let articleCount = 0;
    const maxWaitMs = 4 * 60 * 1000;
    const pollIntervalMs = 15_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const { count } = await admin
        .from("licenses")
        .select("id", { count: "exact", head: true })
        .eq("publisher_id", publisher.publisherId);
      if ((count ?? 0) > 0) {
        articleCount = count ?? 0;
        break;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    // 4. Assert article landed
    expect(articleCount, "Beehiiv archive should have ingested at least 1 article within 4 min").toBeGreaterThan(0);

    // 5. Assert content_sources verified
    const { data: source } = await admin
      .from("content_sources")
      .select("verification_status, platform_pub_id")
      .eq("user_id", publisher.userId)
      .single();
    expect(source?.verification_status).toBe("verified");
    expect(source?.platform_pub_id).toBe(TEST_BEEHIIV_PUB_ID);
  });
});
