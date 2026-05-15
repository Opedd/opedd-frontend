/**
 * Phase 11.5 — Ghost onboarding E2E behavioral test.
 *
 * Validates the Ghost path end-to-end against production. Same shape as
 * beehiiv.spec.ts; substitutes Ghost API credentials.
 *
 * Skips if TEST_GHOST_SITE_URL + TEST_GHOST_ADMIN_API_KEY env vars not set.
 *
 * The pre-fix Ghost first-batch fetch had the line-889 typo bug
 * (`fetchGhostArchive(apiUrl, jwt, 1)` with undefined vars). Bug #5 fixed
 * in Phase 11 close-validation Wave 1. This spec exercises that path
 * to guard against regression.
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

const TEST_GHOST_SITE_URL = process.env.TEST_GHOST_SITE_URL;
const TEST_GHOST_ADMIN_API_KEY = process.env.TEST_GHOST_ADMIN_API_KEY;
const API_BASE = process.env.OPEDD_API_BASE || "https://api.opedd.com";
const FORCE_FAIL = process.env.E2E_FORCE_FAIL;

test.describe.serial("Ghost onboarding E2E", () => {
  let publisher: TestPublisher;

  test.beforeAll(async () => {
    await cleanupStaleE2EPublishers();
    if (!TEST_GHOST_SITE_URL || !TEST_GHOST_ADMIN_API_KEY) {
      test.skip(true, "TEST_GHOST_SITE_URL + TEST_GHOST_ADMIN_API_KEY not set");
    }
    publisher = await createTestPublisher("ghost", { platform: "ghost" });
  });

  test.afterAll(async () => {
    if (publisher) await cleanupTestPublisher(publisher);
  });

  test("Ghost verify → archive → article in Dashboard", async ({ page }) => {
    if (FORCE_FAIL === "ghost") expect(false, "E2E_FORCE_FAIL=ghost").toBe(true);

    await injectSession(page, publisher);
    await page.goto("/dashboard?new=1");
    await expect(page).toHaveURL(/\/dashboard/);

    const verifyResp = await page.request.post(`${API_BASE}/verify-ownership`, {
      headers: {
        Authorization: `Bearer ${publisher.accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        method: "platform_native_api",
        platform: "ghost",
        credentials: {
          site_url: TEST_GHOST_SITE_URL,
          admin_api_key: TEST_GHOST_ADMIN_API_KEY,
        },
      },
    });
    expect(verifyResp.ok(), `verify-ownership returned ${verifyResp.status()}: ${await verifyResp.text()}`).toBe(true);

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

    expect(articleCount, "Ghost archive should have ingested at least 1 article within 4 min").toBeGreaterThan(0);

    const { data: source } = await admin
      .from("content_sources")
      .select("verification_status, url")
      .eq("user_id", publisher.userId)
      .single();
    expect(source?.verification_status).toBe("verified");
  });
});
