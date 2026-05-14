// Phase 11 M1.c — Custom API publisher static sample fixture.
//
// Used by WowMomentStep when the wizard reaches Step 3 for a Custom API
// publisher (who hasn't POSTed any content yet) OR as a fallback for
// Beehiiv/Ghost/Substack paths when the M1.b inline first-batch fetch
// timed out / hit the Substack 100%-paid edge case.
//
// Realistic fintech-newsletter-shape sample with all 7 RAG-essential
// fields populated. Frontend frames it explicitly as "Example article."
// Per founder Adjustment 1 (2026-05-14): hardcoded static asset
// acceptable for v1; permissioned curated example deferred to follow-up.

export const CUSTOM_API_SAMPLE_PREVIEW = {
  id: "00000000-0000-0000-0000-000000000000",
  title: "Example: Quarterly Fintech Funding Review — Q3 2026",
  description:
    "A representative AI-deliverable article shape. Your real content will appear here once you POST your first batch.",
  source_url: "https://your-publication.example.com/q3-2026-funding-review",
  publisher_id: "00000000-0000-0000-0000-000000000000",
  content_body:
    "<p><strong>Series A funding in fintech</strong> recovered modestly in Q3 2026 after a six-quarter contraction.</p>" +
    "<p>Total deployed capital across the cohort reached $4.2B, up 12% sequentially, though still 38% below the 2024 peak.</p>" +
    "<p>Notable themes: <em>stablecoin infrastructure</em> outperformed expectations, with three nine-figure rounds clustered in payment-rails and merchant settlement. Embedded finance saw flat investor interest after two years of compressed valuations.</p>" +
    "<p>Geographically, LATAM continued to outpace MENA on early-stage activity. The five largest rounds split 3-1-1 across US/Brazil/Singapore.</p>" +
    "<p><em>(Continue reading for the full deal-by-deal breakdown, valuation comps, and the editor's three predictions for Q4.)</em></p>",
  author: "Example Byline",
  language: "en",
  word_count: 612,
  content_hash:
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  image_urls: ["https://example.com/q3-2026-chart.png"],
  canonical_url:
    "https://your-publication.example.com/q3-2026-funding-review",
  tags: ["Funding", "Series A", "Q3 2026", "Venture Capital"],
};
