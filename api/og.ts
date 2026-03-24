/**
 * Vercel Serverless Function: /api/og
 *
 * Handles OG meta tag injection for crawler/bot requests on /p/:slug routes.
 * Called by the rewrite rule in vercel.json when the request matches a bot UA.
 *
 * Flow:
 *   1. Extract publisher slug from ?slug= query param
 *   2. Fetch publisher data from the Supabase Edge Function
 *   3. Return the SPA's index.html with OG tags rewritten to publisher-specific values
 *
 * This allows Facebook, Twitter, Slack, LinkedIn, Google, and AI crawlers to see
 * the correct og:title, og:description, and og:image for each publisher page,
 * despite the frontend being a client-side SPA.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co/functions/v1";
const SITE_URL = "https://opedd.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface PublisherData {
  name: string;
  description: string | null;
  logo_url: string | null;
  article_count: number;
  slug: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = req.query.slug as string;
  if (!slug) {
    return res.redirect(302, "/");
  }

  let publisher: PublisherData | null = null;

  try {
    const apiRes = await fetch(`${SUPABASE_URL}/api?action=publisher&slug=${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(4000),
    });
    const json = await apiRes.json();
    if (json.success && json.data) {
      publisher = json.data;
    }
  } catch {
    // Fall through to default OG tags
  }

  const ogTitle = publisher
    ? `License content from ${publisher.name} — Opedd`
    : "Opedd – The Stripe for Content Licensing";

  const ogDescription = publisher
    ? publisher.description || `Browse and license ${publisher.article_count} articles from ${publisher.name} — powered by Opedd.`
    : "Programmatic licensing infrastructure for publishers. One embed. Set your prices. Get paid by AI companies and enterprises instantly.";

  const ogImage = publisher?.logo_url || DEFAULT_OG_IMAGE;
  const ogUrl = `${SITE_URL}/p/${slug}`;

  // Return minimal HTML with correct OG tags + a redirect for real browsers
  // Crawlers read the meta tags; real browsers get redirected to the SPA
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />

  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(ogUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Opedd" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@OpeddHQ" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <link rel="canonical" href="${escapeHtml(ogUrl)}" />

  <!-- Non-bot browsers: redirect to SPA -->
  <script>window.location.replace("/p/${escapeHtml(slug)}");</script>
  <noscript><meta http-equiv="refresh" content="0;url=/p/${escapeHtml(slug)}" /></noscript>
</head>
<body>
  <h1>${escapeHtml(ogTitle)}</h1>
  <p>${escapeHtml(ogDescription)}</p>
  <a href="/p/${escapeHtml(slug)}">View publisher page</a>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
