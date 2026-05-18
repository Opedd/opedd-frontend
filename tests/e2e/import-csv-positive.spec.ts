/**
 * Bug #2 positive case (2026-05-18) — multi-row CSV imports green.
 *
 * The most user-facing Custom API surface (Dashboard CSV upload) had
 * ZERO E2E coverage going into Walkthrough Step 9. Founder caught
 * Bug #2 because the suite had no test exercising "valid N-row CSV →
 * imported=N." This spec closes that gap.
 *
 * Pre-fix-red shape (post-migration-127 apply, pre-frontend-fix):
 *   - Backend accepts the CSV (migration 127 widened the
 *     licenses.ingestion_source CHECK to allow 'csv')
 *   - Backend INSERTs 5 rows into licenses
 *   - Backend response envelope: { success: true, data: { imported: 5,
 *     skipped: 0, total: 5, errors: [] } }
 *   - Frontend Import.tsx:73-91 reads body.imported (NOT body.data.imported)
 *     → undefined → falls back to 0
 *   - result = { imported: 0, skipped: 0, errors: 0 } → totalProcessed === 0
 *   - Bug #1's three-state pattern renders AMBER "No rows found"
 *     (semantically WRONG here — rows DID land in the DB)
 *   - Assertion #1 fails: green "Import complete" banner not visible
 *
 * Post-fix shape (envelope-unwrap landed):
 *   - Frontend reads body.data.imported → 5
 *   - result = { imported: 5, skipped: 0, errors: [] } → totalProcessed === 5
 *   - Renders GREEN "Import complete" banner with counts
 *   - Assertion #1 passes
 *   - Assertion #2 (DB has 5 licenses rows) — passes pre AND post fix
 *     (the INSERT itself works post-migration regardless of frontend state)
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

const FORCE_FAIL = process.env.E2E_FORCE_FAIL;

test.describe.serial("Bug #2 positive — multi-row CSV imports green", () => {
  let publisher: TestPublisher;
  let csvTimestamp: number;

  test.beforeAll(async () => {
    await cleanupStaleE2EPublishers();
    publisher = await createTestPublisher("import-csv-positive", {
      platform: "api",
    });
    csvTimestamp = Date.now();
    const admin = getAdminClient();
    await admin
      .from("publishers")
      .update({
        verification_status: "verified",
        setup_state: "in_setup",
        setup_step: 2,
        setup_data: { platform: "api", platform_choice: "api" },
      })
      .eq("id", publisher.publisherId);
  });

  test.afterAll(async () => {
    if (publisher) await cleanupTestPublisher(publisher);
  });

  test("5-row CSV imports green; UI shows imported=5; DB has 5 licenses rows", async ({
    page,
  }) => {
    if (FORCE_FAIL === "import-csv-positive") {
      expect(false, "E2E_FORCE_FAIL=import-csv-positive").toBe(true);
    }

    await injectSession(page, publisher);
    await page.goto("/dashboard/import");

    // 5-row CSV with unique source_urls (timestamp-suffixed so the test
    // is repeatable + doesn't collide with the upsert-merge on
    // (publisher_id, source_url) for re-runs against the same publisher).
    const csvRows = [
      "title,url,published_at,author,language,tags",
      `"E2E Positive Article 1","https://test.opedd-e2e.com/positive-1-${csvTimestamp}","2026-05-01T10:00:00Z","Bug #2 Test","en","positive;walkthrough"`,
      `"E2E Positive Article 2","https://test.opedd-e2e.com/positive-2-${csvTimestamp}","2026-05-02T10:00:00Z","Bug #2 Test","en","positive"`,
      `"E2E Positive Article 3","https://test.opedd-e2e.com/positive-3-${csvTimestamp}","2026-05-03T10:00:00Z","Bug #2 Test","en","positive"`,
      `"E2E Positive Article 4","https://test.opedd-e2e.com/positive-4-${csvTimestamp}","2026-05-04T10:00:00Z","Bug #2 Test","en","positive"`,
      `"E2E Positive Article 5","https://test.opedd-e2e.com/positive-5-${csvTimestamp}","2026-05-05T10:00:00Z","Bug #2 Test","en","positive"`,
    ].join("\n") + "\n";

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "positive-5-rows.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvRows),
    });

    // Assertion #1 — UI surfaces the COMPLETE state (green banner) for
    // a real multi-row import. Pre-fix this fails because Import.tsx
    // reads body.imported (undefined) instead of body.data.imported (5),
    // so totalProcessed evaluates to 0 and the amber empty-state banner
    // renders (semantically wrong: rows DID land).
    const completeBanner = page.locator('[data-testid="import-result-banner-complete"]');
    await expect(
      completeBanner,
      "Multi-row CSV must render the GREEN 'Import complete' banner " +
        "(data-testid='import-result-banner-complete'). Pre-fix bug: " +
        "Import.tsx envelope-unwrap reads body.X instead of body.data.X, " +
        "so counts arrive as all-zero and Bug #1's three-state fix renders " +
        "the amber empty-state banner — semantically wrong for a successful " +
        "import that actually landed rows.",
    ).toBeVisible({ timeout: 15_000 });

    // Assertion #2 — Imported count is shown correctly. The green banner
    // contains "5" as the imported count (rendered as <strong>{result.imported}</strong>).
    // This guards against a partial fix where the banner toggles green
    // but the count still shows 0.
    await expect(
      completeBanner.getByText(/5/),
      "Green banner must surface the actual imported count (5). Guards " +
        "against partial fix: banner state toggles green but count display " +
        "still reads from the buggy envelope-unwrap.",
    ).toBeVisible();

    // Assertion #3 — DB has 5 licenses rows for this publisher. Passes
    // pre AND post fix (the INSERT itself works post-migration-127);
    // anchors the end-to-end "rows actually land in the catalog" claim
    // independent of the UI rendering.
    const admin = getAdminClient();
    const { data: licenses, count } = await admin
      .from("licenses")
      .select("id, source_url, title, ingestion_source", { count: "exact" })
      .eq("publisher_id", publisher.publisherId);

    expect(
      count,
      "DB must contain exactly 5 licenses rows for this publisher post-import. " +
        "Pre-migration this would have failed at the CHECK constraint; " +
        "post-migration-127 the INSERT succeeds for ingestion_source='csv'.",
    ).toBe(5);

    // Verify every row has the expected ingestion_source='csv' (the value
    // that was previously rejected by the CHECK constraint).
    for (const row of licenses ?? []) {
      expect(
        (row as { ingestion_source: string }).ingestion_source,
        "Every row inserted by the CSV path must have ingestion_source='csv' — " +
          "the value migration 127 added to the allowlist.",
      ).toBe("csv");
    }
  });
});
