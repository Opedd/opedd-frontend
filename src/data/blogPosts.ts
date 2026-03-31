import pricingCover from "@/assets/blog/pricing-guide-cover.jpg";
import industryCover from "@/assets/blog/industry-licensing-cover.jpg";
import tutorialCover from "@/assets/blog/tutorial-setup-cover.jpg";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readingTime: string;
  category: string;
  categoryColor: string;
  preview: string;
  coverImage: string;
  ogImage: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "how-much-is-your-newsletter-worth-to-ai",
    title: "How Much Is Your Newsletter Worth to AI? A Pricing Guide for Publishers",
    date: "2026-03-28",
    readingTime: "8 min read",
    category: "PRICING GUIDE",
    categoryColor: "bg-[#059669] text-white",
    preview: "Most publishers undervalue their content when licensing to AI companies. Here's a data-driven framework to price your newsletter archive based on volume, niche, and exclusivity.",
    coverImage: pricingCover,
    ogImage: pricingCover,
    content: `
<p>If you're a publisher wondering how much your newsletter archive is worth to an AI company, you're not alone. The AI licensing market is nascent, and pricing is opaque. Most publishers either underprice their content or don't license it at all.</p>

<p>This guide gives you a practical framework to think about pricing, based on the factors that actually matter to AI buyers.</p>

<h2>Why AI Companies Want Your Content</h2>

<p>Large language models need high-quality, human-written text to improve. Newsletter content is especially valuable because it's:</p>

<ul>
<li><strong>Expert-authored</strong> — written by domain specialists, not SEO farms</li>
<li><strong>Time-stamped</strong> — provides temporal context that web scrapes lack</li>
<li><strong>Niche-specific</strong> — covers verticals that general web data misses</li>
<li><strong>Regularly updated</strong> — a growing corpus, not a static dataset</li>
</ul>

<h2>The Pricing Framework</h2>

<p>We recommend thinking about pricing across three dimensions:</p>

<h3>1. Volume</h3>

<p>How many articles do you have? A 500-post archive is fundamentally different from a 50-post archive. More content = more training signal = higher value.</p>

<table>
<thead>
<tr><th>Archive Size</th><th>Base Price Range</th></tr>
</thead>
<tbody>
<tr><td>Under 100 posts</td><td>$0.50 – $2.00 per article</td></tr>
<tr><td>100–500 posts</td><td>$1.00 – $5.00 per article</td></tr>
<tr><td>500+ posts</td><td>$2.00 – $10.00 per article</td></tr>
</tbody>
</table>

<h3>2. Niche Value</h3>

<p>Content in underrepresented niches commands a premium. Finance, legal, medical, and technical newsletters are worth more because AI models have less high-quality training data in these domains.</p>

<h3>3. Exclusivity</h3>

<p>Are you offering non-exclusive access (the AI company gets your content, but so can others) or exclusive rights? Exclusive deals should command 3–5x the non-exclusive rate.</p>

<blockquote>
<p>"The biggest mistake publishers make is treating AI licensing as a one-time sale. It's a recurring revenue stream — your archive grows every week."</p>
</blockquote>

<h2>Getting Started</h2>

<p>The easiest way to start is to register your content on Opedd, set your prices, and let AI buyers come to you. Our platform handles the licensing infrastructure so you can focus on creating content.</p>

<p>Ready to start earning from your archive? <a href="https://app.opedd.com/get-started">Sign up for free</a> and set your prices in under 5 minutes.</p>
    `,
  },
  {
    slug: "ai-companies-licensing-newsletter-content",
    title: "AI Companies Are Licensing Newsletter Content at Scale",
    date: "2026-03-20",
    readingTime: "6 min read",
    category: "INDUSTRY",
    categoryColor: "bg-[#4A26ED] text-white",
    preview: "From OpenAI's deals with major publishers to startups licensing niche newsletters — the AI content licensing market is booming. Here's what's happening and what it means for independent publishers.",
    coverImage: industryCover,
    ogImage: industryCover,
    content: `
<p>The AI industry's appetite for high-quality training data has created an entirely new revenue stream for publishers. What started with billion-dollar deals between OpenAI and legacy media companies has now expanded to include independent newsletters and niche publications.</p>

<h2>The Licensing Landscape in 2026</h2>

<p>Over the past year, we've seen a dramatic shift in how AI companies acquire training data:</p>

<ul>
<li><strong>OpenAI</strong> signed licensing agreements with The Atlantic, Vox Media, and dozens of smaller publishers</li>
<li><strong>Google</strong> expanded its content licensing program to include newsletter platforms</li>
<li><strong>Anthropic</strong> launched a publisher partnership program focused on domain-specific content</li>
<li><strong>Startups</strong> like Perplexity and Mistral are actively seeking niche content licenses</li>
</ul>

<h2>Why Newsletters Are Especially Valuable</h2>

<p>AI companies have realized that newsletter content fills a critical gap in their training data. While web scraping provides breadth, newsletters provide depth — expert analysis, original reporting, and domain expertise that can't be found elsewhere.</p>

<h3>The Numbers</h3>

<p>Based on publicly available data and our own platform analytics:</p>

<table>
<thead>
<tr><th>Metric</th><th>2025</th><th>2026 (projected)</th></tr>
</thead>
<tbody>
<tr><td>Total AI licensing revenue (publishers)</td><td>$180M</td><td>$450M</td></tr>
<tr><td>Newsletter-specific deals</td><td>~200</td><td>~1,200</td></tr>
<tr><td>Average deal size (indie publisher)</td><td>$2,400/yr</td><td>$5,800/yr</td></tr>
</tbody>
</table>

<h2>What This Means for You</h2>

<p>If you publish a newsletter with more than 50 posts, you likely have content that AI companies would pay to license. The question isn't <em>whether</em> to license — it's how to do it efficiently without signing away your rights.</p>

<blockquote>
<p>"We've seen publishers earn more from AI licensing in a single quarter than from an entire year of sponsorships. The economics are compelling."</p>
</blockquote>

<p>Platforms like Opedd make it possible to register your content, set your terms, and start earning without negotiating individual deals with each AI company.</p>
    `,
  },
  {
    slug: "setup-ai-content-licensing-5-minutes",
    title: "Set Up AI Content Licensing in 5 Minutes",
    date: "2026-03-15",
    readingTime: "4 min read",
    category: "TUTORIAL",
    categoryColor: "bg-[#D97706] text-white",
    preview: "A step-by-step walkthrough to register your newsletter content on Opedd, connect your archive, set pricing, and start receiving AI licensing revenue.",
    coverImage: tutorialCover,
    ogImage: tutorialCover,
    content: `
<p>Getting started with AI content licensing doesn't have to be complicated. In this tutorial, we'll walk through the entire setup process on Opedd — from creating your account to receiving your first licensing payment.</p>

<h2>Step 1: Create Your Account</h2>

<p>Head to <a href="https://app.opedd.com/get-started">app.opedd.com/get-started</a> and sign up with your email. You'll need to verify your email address before proceeding.</p>

<h2>Step 2: Connect Your Newsletter</h2>

<p>Opedd supports direct integrations with the most popular newsletter platforms:</p>

<ul>
<li><strong>Substack</strong> — CSV archive import</li>
<li><strong>Ghost</strong> — API key integration</li>
<li><strong>WordPress</strong> — Plugin or RSS feed</li>
<li><strong>Beehiiv</strong> — API integration</li>
<li><strong>Any platform</strong> — RSS feed fallback</li>
</ul>

<p>For Substack users, the fastest method is to export your archive as a CSV and upload it directly.</p>

<h2>Step 3: Set Your Pricing</h2>

<p>Opedd suggests a price based on your archive size and content category. You can adjust this at any time. We recommend starting with the suggested price and adjusting based on demand.</p>

<h3>Pricing Tiers</h3>

<p>You'll set two prices:</p>

<ol>
<li><strong>Human licensing price</strong> — for republication, syndication, and human-readable use</li>
<li><strong>AI licensing price</strong> — for machine learning training and AI model fine-tuning</li>
</ol>

<h2>Step 4: Verify Ownership</h2>

<p>To prevent unauthorized content registration, Opedd requires ownership verification. You can verify by:</p>

<ul>
<li>Adding a DNS TXT record to your domain</li>
<li>Embedding a verification meta tag on your site</li>
<li>Connecting via your platform's API (automatic verification)</li>
</ul>

<h2>Step 5: Start Earning</h2>

<p>Once verified, your content is listed in the Opedd marketplace. AI companies can discover and license your content through our API. You'll receive payments directly to your connected Stripe account.</p>

<blockquote>
<p>"I set up my entire archive on Opedd during a coffee break. Two weeks later, I had my first licensing payment."</p>
</blockquote>

<p>That's it — five steps, five minutes. Your newsletter archive is now working for you even when you're not writing.</p>
    `,
  },
];
