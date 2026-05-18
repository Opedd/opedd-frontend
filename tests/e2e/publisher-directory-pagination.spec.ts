/**
 * Bug #3 regression guard (2026-05-18) — publisher-directory paginate-then-filter defect.
 *
 * Founder Step 12 walk halt: GET /publisher-directory?min_articles=1&limit=5
 * returned publishers:[] full_count:24 even though 10 publishers existed
 * with >=1 licensing_enabled=true license. Root cause: the endpoint
 * paginated the publishers table FIRST (range 0..limit-1 ordered by
 * created_at desc), THEN post-filtered by article_count in JavaScript.
 * If the most-recent N publishers happened to have 0 articles (common
 * during integration-test stub-publisher accumulation), the post-filter
 * eliminated them all and the response was empty even when older
 * articled publishers existed.
 *
 * The fix is filter-then-paginate: pre-compute the eligible-publisher-ID
 * set from licenses GROUP BY publisher_id, then constrain the publishers
 * query with .in("id", eligibleIds) BEFORE the range pagination. This
 * makes full_count accurate and ensures the paginated window always
 * contains eligible publishers (when any exist).
 *
 * This test seeds 1 articled publisher + 6 empty publishers (all newer
 * than the articled one) and asserts that ?min_articles=1&limit=5 still
 * returns the articled publisher in the response. The 6-empty cushion
 * is large enough to push the articled publisher past position 5 in
 * created_at-desc order; without the fix the articled publisher cannot
 * enter the page-1 result; with the fix it does.
 *
 * Pre-fix-red (this commit shipping alone, before the backend fix):
 *   - Backend still has the paginate-then-filter bug
 *   - All 6 empty publishers occupy positions 0..5 in created_at order
 *   - Post-pagination filter drops them all (article_count=0 < 1)
 *   - Response: publishers=[] → articledPub.find() returns undefined → FAIL
 *
 * Post-fix-green (after backend fix deploys):
 *   - Eligible-IDs set built from licenses pre-pagination
 *   - Empty publishers excluded at the .in("id", eligibleIds) stage
 *   - Articled publisher survives + is returned at position 0 of page-1
 *   - Response: publishers=[articledPub] → assertions pass
 */

import { test, expect } from "@playwright/test";
import {
  createTestPublisher,
  cleanupTestPublisher,
  cleanupStaleE2EPublishers,
  getAdminClient,
  type TestPublisher,
} from "./fixtures/test-publisher";

const FORCE_FAIL = process.env.E2E_FORCE_FAIL;
const OPEDD_API_BASE = process.env.OPEDD_API_BASE ?? "https://api.opedd.com";

test.describe.serial("Bug #3 — directory paginate-then-filter regression guard", () => {
  let articledPub: TestPublisher;
  const emptyPubs: TestPublisher[] = [];
  const SPEC = "directory-pagination";

  test.beforeAll(async () => {
    await cleanupStaleE2EPublishers();
    const admin = getAdminClient();

    // 1. Create the articled publisher FIRST — its created_at must be
    //    OLDER than all the empty publishers we create after. Verified
    //    state + 1 licensing_enabled=true license is the minimum to
    //    satisfy ?min_articles=1.
    articledPub = await createTestPublisher(`${SPEC}-articled`, { platform: "api" });

    // Promote to a state the directory considers listable. The default
    // (no verified=true) path doesn't filter on these; the verified=true
    // path does. Setting both for forward-compat with future tests.
    await admin
      .from("publishers")
      .update({
        verification_status: "verified",
        setup_state: "in_setup",
        setup_step: 2,
        setup_complete: true,
        setup_data: { platform: "api", platform_choice: "api" },
        default_human_price: 100,
        default_ai_price: 200,
      })
      .eq("id", articledPub.publisherId);

    // Seed exactly 1 licensing_enabled=true license. The article_count
    // map sums every matching row, so even 1 row puts the publisher
    // past the min_articles=1 threshold.
    const { error: insertErr } = await admin.from("licenses").insert({
      publisher_id: articledPub.publisherId,
      title: "Bug #3 regression-guard test article",
      source_url: `https://test.opedd-e2e.com/bug3-article-${Date.now()}`,
      published_at: new Date().toISOString(),
      content_body: "Article body for Bug #3 directory regression guard test.",
      licensing_enabled: true,
      license_type: "both",
      ingestion_source: "manual",
    });
    if (insertErr) throw new Error(`[bug3] license insert failed: ${insertErr.message}`);

    // 2. Create 6 empty publishers AFTER the articled one. Sequential
    //    createTestPublisher calls naturally produce monotonically-
    //    increasing created_at timestamps; the 6 cushion is large
    //    enough to push the articled publisher past position 5 in
    //    created_at-desc ordering even when other recent test-stub
    //    publishers exist in production state.
    for (let i = 0; i < 6; i++) {
      const empty = await createTestPublisher(`${SPEC}-empty-${i}`, { platform: "api" });
      emptyPubs.push(empty);
    }
  });

  test.afterAll(async () => {
    // Cleanup is non-negotiable — these test publishers temporarily
    // appear in the production directory. Cleanup runs even if
    // assertions failed (Playwright afterAll semantics).
    if (articledPub) await cleanupTestPublisher(articledPub);
    for (const p of emptyPubs) await cleanupTestPublisher(p);
  });

  test("?min_articles=1&limit=5 returns articled publisher despite 6 more-recent empty publishers", async () => {
    if (FORCE_FAIL === "directory-pagination") {
      expect(false, "E2E_FORCE_FAIL=directory-pagination").toBe(true);
    }

    const response = await fetch(
      `${OPEDD_API_BASE}/publisher-directory?min_articles=1&limit=5`,
    );
    expect(
      response.status,
      `/publisher-directory must respond 200; got ${response.status}`,
    ).toBe(200);

    const body = (await response.json()) as {
      publishers?: Array<{ id: string; name: string; article_count: number }>;
      full_count?: number;
      total?: number;
    };

    // Assertion #1 — articled publisher MUST appear in the response.
    // Pre-fix this fails: empty publishers dominate positions 0..4 in
    // created_at-desc; their article_count=0 < 1 post-filter; response
    // is publishers:[] → find() returns undefined.
    const found = body.publishers?.find((p) => p.id === articledPub.publisherId);
    expect(
      found,
      "Articled publisher (created BEFORE 6 empty publishers, with 1 licensing_enabled=true license) MUST appear in /publisher-directory?min_articles=1&limit=5 response. " +
        "Pre-fix bug: directory paginates at range(0,4) BEFORE applying min_articles JS post-filter — if the 5 most-recent publishers have 0 articles, they get filtered out and the response is empty even when older articled publishers exist. " +
        "Post-fix: eligible-publisher-IDs set is built pre-pagination via licenses GROUP BY publisher_id, then .in('id', eligibleIds) constrains the publishers query BEFORE range, so the paginated window contains only eligible publishers.",
    ).toBeDefined();

    // Assertion #2 — its article_count must be the seeded count (1).
    expect(
      found?.article_count,
      "Articled publisher's reported article_count must equal the 1 license we seeded. Guards against article-count source drift.",
    ).toBe(1);

    // Assertion #3 — none of the 6 empty publishers should be in the
    // response. With the fix, empty publishers are excluded at the
    // eligible-IDs filter step (pre-pagination), so they cannot appear
    // in min_articles=1 results regardless of their created_at.
    for (const emptyPub of emptyPubs) {
      const emptyInResponse = body.publishers?.find((p) => p.id === emptyPub.publisherId);
      expect(
        emptyInResponse,
        `Empty publisher ${emptyPub.publisherId.slice(0, 8)} (0 articles) must NOT appear in min_articles=1 response. ` +
          "Guards against the filter being applied at the wrong layer (e.g., only client-side or only at sort).",
      ).toBeUndefined();
    }
  });
});
