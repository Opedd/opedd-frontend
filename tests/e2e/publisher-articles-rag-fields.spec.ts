/**
 * Bug #4 regression guard (2026-05-18) — /api?action=publisher_articles
 * must expose all 7 Phase 11 M2 RAG-ready fields in its response.
 *
 * Founder Step 14 walk halt: fetched the opedd publisher's article list
 * via the public buyer-facing endpoint and saw `word_count: null` for
 * all 21 articles. Initial fear: ingestion bug — the M2 RAG fields
 * aren't being populated for Substack-ingested articles. DB probe
 * falsified: 20 of 21 articles had full RAG population
 * (content_body 7K-75K chars, word_count 300-2864, author set, lang
 * set, content_hash set, canonical_url set). The bug was purely in
 * the api/index.ts:980 SELECT projection — it included `id, title,
 * source_url, human_price, ai_price, category, created_at` only,
 * omitting all 7 RAG fields. The DB had the values; the endpoint
 * hid them.
 *
 * Per Rule 18: a response missing one RAG field is missing the whole
 * class. Fix ships all 7 (word_count, author, language, content_hash,
 * image_urls, canonical_url, tags) — not just word_count.
 *
 * This test asserts the endpoint's response shape includes all 7
 * RAG fields. Uses the production opedd publisher (slug=opedd, 20
 * articles with full RAG population per the diagnosis probe).
 *
 * Pre-fix-red (this commit shipping alone):
 *   - api/index.ts:980 SELECT omits the 7 RAG fields
 *   - Response items lack the fields entirely
 *   - Assertion #1 (`word_count` key present) FAILS — undefined
 *
 * Post-fix-green (follow-on commit lands the SELECT expansion):
 *   - All 7 fields present in response
 *   - For an article with content (word_count > 0), key non-null
 *     derivations confirmed (word_count, content_hash)
 *   - Optional fields (author, image_urls, tags, language,
 *     canonical_url) checked for presence-of-key, not non-nullness
 */

import { test, expect } from "@playwright/test";

const FORCE_FAIL = process.env.E2E_FORCE_FAIL;
const OPEDD_API_BASE = process.env.OPEDD_API_BASE ?? "https://api.opedd.com";

interface RagArticle {
  id: string;
  title: string;
  source_url: string;
  word_count: number | null;
  author: string | null;
  language: string | null;
  content_hash: string | null;
  image_urls: string[] | null;
  canonical_url: string | null;
  tags: string[] | null;
  created_at: string;
}

test.describe.serial("Bug #4 — publisher_articles must expose all 7 M2 RAG fields", () => {
  test("/api?action=publisher_articles&slug=opedd returns all 7 RAG fields", async () => {
    if (FORCE_FAIL === "publisher-articles-rag") {
      expect(false, "E2E_FORCE_FAIL=publisher-articles-rag").toBe(true);
    }

    const response = await fetch(
      `${OPEDD_API_BASE}/api?action=publisher_articles&slug=opedd&limit=20`,
    );
    expect(
      response.status,
      `/api?action=publisher_articles must respond 200; got ${response.status}`,
    ).toBe(200);

    const envelope = (await response.json()) as {
      success: boolean;
      data?: { articles?: RagArticle[]; total?: number };
    };
    expect(envelope.success, "Response envelope success=true").toBe(true);
    const articles = envelope.data?.articles ?? [];
    expect(
      articles.length,
      "opedd publisher must return at least 1 article (production state: 21 articles via slug=opedd)",
    ).toBeGreaterThan(0);

    // Pick the first article with word_count > 0 — the same deterministic
    // selector Step 14 of the walkthrough uses. Skips the "Coming soon"
    // ZIP-path placeholder (word_count=NULL, content_body=NULL — legacy
    // pre-M2 state debt, not a bug).
    const populated = articles.find(
      (a) => typeof a.word_count === "number" && a.word_count > 0,
    );
    expect(
      populated,
      "At least one opedd article must have word_count > 0 in the response. " +
        "Pre-fix bug: SELECT projection omits word_count entirely, so " +
        "all entries return undefined (or null when serialized via jq), " +
        "making this filter return nothing. " +
        "Post-fix: 20 of 21 opedd articles have word_count populated " +
        "(300-2864 range per DB probe).",
    ).toBeDefined();

    if (!populated) return;

    // Assertion #1 — all 7 RAG fields present as KEYS on the response
    // object. Some may legitimately be null (e.g. image_urls/tags for
    // an article with no images/tags); the assertion is presence-of-
    // key, not non-nullness.
    const ragKeys = [
      "word_count",
      "author",
      "language",
      "content_hash",
      "image_urls",
      "canonical_url",
      "tags",
    ] as const;
    for (const k of ragKeys) {
      expect(
        Object.prototype.hasOwnProperty.call(populated, k),
        `Response item must include RAG field '${k}'. Pre-fix the api/index.ts:980 ` +
          `SELECT projection omits all 7 M2 RAG fields; the response items lack the ` +
          `keys entirely. Post-fix the SELECT includes them and the response map ` +
          `surfaces them.`,
      ).toBe(true);
    }

    // Assertion #2 — for an article with content (word_count > 0),
    // the load-bearing M2 derivations MUST be non-null:
    //   - word_count: derived from html_body; > 0 iff body present
    //   - content_hash: derived from html_body; set iff body present
    // The other 5 fields are optional/upstream-dependent and can be
    // legitimately null even for populated articles.
    expect(
      populated.word_count,
      "Populated article (word_count > 0) must have non-null word_count.",
    ).toBeGreaterThan(0);
    expect(
      populated.content_hash,
      "Populated article must have content_hash set (derived from html_body at upsert).",
    ).not.toBeNull();

    // Assertion #3 — RAG field type sanity. Guards against future
    // response-shape drift (e.g. accidental Number(image_urls)
    // coercion).
    expect(
      typeof populated.word_count,
      "word_count must be number",
    ).toBe("number");
    if (populated.author !== null) {
      expect(typeof populated.author, "author must be string when set").toBe("string");
    }
    if (populated.image_urls !== null) {
      expect(
        Array.isArray(populated.image_urls),
        "image_urls must be array when set",
      ).toBe(true);
    }
    if (populated.tags !== null) {
      expect(Array.isArray(populated.tags), "tags must be array when set").toBe(true);
    }
  });
});
