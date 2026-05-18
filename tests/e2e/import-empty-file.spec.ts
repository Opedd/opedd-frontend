/**
 * Bug #1 regression guard (2026-05-18) — false-success state on empty CSV.
 *
 * Founder walkthrough Step 9 surfaced: when the import returns
 * imported=0 + skipped=0 + errors=[], the UI renders the green
 * "Import complete" success banner. That conflates "HTTP request
 * succeeded" with "user-meaningful work happened" — a publisher
 * dropping an empty CSV gets a thumbs-up that nothing was imported.
 *
 * Three-state invariant codified:
 *   - complete (imported + skipped + errors > 0): green "Import complete" banner
 *   - empty (all three === 0):                    amber "No rows found" banner
 *   - failed (HTTP non-2xx or network):           red "Import failed" banner (existing)
 *
 * This test drops a header-only CSV (no data rows) and asserts:
 *   1. The amber "No rows found" banner IS visible
 *   2. The green "Import complete" banner is NOT visible
 *
 * Pre-fix: assertion #2 fails (green banner renders for 0/0/0).
 * Post-fix: amber renders, green is absent. Both directions confirmed.
 *
 * Coverage gap closed: the Q3 E2E suite never tested the CSV import
 * surface end-to-end. Step 9 catching this is the canonical-test
 * working; this spec converts the founder's finding into a regression
 * guard.
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

test.describe.serial("Bug #1 — empty-file import false-success regression guard", () => {
  let publisher: TestPublisher;

  test.beforeAll(async () => {
    await cleanupStaleE2EPublishers();
    publisher = await createTestPublisher("import-empty-file", {
      platform: "api",
    });
    // Promote to a state where Import.tsx renders without the "wrong platform"
    // warning. isCustomApi at Import.tsx:131 is true for platform="api" OR
    // unset — the fixture sets platform="api" via createTestPublisher. We
    // also flip verification_status=verified so isGated checks elsewhere
    // don't redirect (defensive — Import.tsx itself doesn't gate on
    // verification, but the dashboard shell does).
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

  test("empty CSV (header only) renders amber 'No rows found', NOT green 'Import complete'", async ({
    page,
  }) => {
    if (FORCE_FAIL === "import-empty-file") {
      expect(false, "E2E_FORCE_FAIL=import-empty-file").toBe(true);
    }

    await injectSession(page, publisher);
    await page.goto("/dashboard/import");

    // Drop a header-only CSV — backend successfully processes (200 with
    // imported=0, skipped=0, errors=[]). Pre-fix the UI renders green
    // "Import complete" with the 0/0/0 counts. Post-fix it renders the
    // distinct amber "No rows found" state.
    const emptyCsv = "title,url,published_at\n";
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "empty.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(emptyCsv),
    });

    // Wait for the upload to complete and SOME result to render. The
    // surface is one of:
    //   - amber: "No rows found" heading
    //   - green: "Import complete" heading (pre-fix bug shape)
    //   - red:   "Import failed" banner (network or auth failure)
    await expect(async () => {
      const hasAnyResult = await page.evaluate(() => {
        const text = document.body.innerText;
        return (
          text.includes("No rows found") ||
          text.includes("Import complete") ||
          text.includes("Import failed")
        );
      });
      expect(hasAnyResult).toBe(true);
    }).toPass({ timeout: 15_000 });

    // Positive assertion: amber "No rows found" banner present.
    await expect(
      page.getByText(/No rows found/i),
      "Empty CSV must render the distinct 'No rows found' empty state — " +
        "the three-state invariant (complete / empty / failed) requires " +
        "0/0/0 to be visually distinct from non-empty success.",
    ).toBeVisible({ timeout: 5_000 });

    // Negative assertion: green "Import complete" banner ABSENT.
    // This is the load-bearing regression guard — pre-fix this assertion
    // fails because the green banner renders unconditionally when
    // `result` is truthy.
    await expect(
      page.getByText(/Import complete/i),
      "Empty CSV must NOT render the green 'Import complete' banner. " +
        "Pre-fix bug: Import.tsx:204-223 (and SubstackImportCard.tsx:199-213) " +
        "render success state unconditionally on a truthy result envelope, " +
        "even when imported+skipped+errors=0.",
    ).not.toBeVisible();
  });
});
