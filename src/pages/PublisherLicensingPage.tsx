import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Archive,
  Cpu,
  Brain,
  Share2,
  Building2,
  ExternalLink,
  Search,
  CheckCircle,
  Globe,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

// --- Interfaces ---

interface LicenseTypeConfig {
  enabled: boolean;
  price_per_article?: number | null;
  price_annual?: number | null;
  price_monthly?: number | null;
  price_onetime?: number | null;
  quote_only?: boolean;
}

interface PricingRules {
  license_types?: {
    editorial?: LicenseTypeConfig;
    archive?: LicenseTypeConfig;
    ai_retrieval?: LicenseTypeConfig;
    ai_training?: LicenseTypeConfig;
    corporate?: LicenseTypeConfig;
    syndication?: LicenseTypeConfig;
  };
}

interface PublisherData {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  slug: string;
  article_count: number;
  verified: boolean;
  stripe_connected: boolean;
  default_human_price: number | null;
  default_ai_price: number | null;
  pricing_rules: PricingRules | null;
}

interface Article {
  id: string;
  title: string;
  source_url: string;
  human_price: number | null;
  ai_price: number | null;
  category: string | null;
  created_at: string;
}

// --- Helpers ---

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getMailtoLink(websiteUrl: string | null, publisherName: string, contactEmail?: string | null): string {
  let address: string;
  if (contactEmail) {
    address = contactEmail;
  } else if (websiteUrl) {
    const raw = websiteUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0];
    address = `licensing@${raw}`;
  } else {
    address = "licensing@opedd.com";
  }
  return `mailto:${address}?subject=License%20Inquiry%20%E2%80%94%20${encodeURIComponent(publisherName)}`;
}

// --- Skeleton ---

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- License Card ---

interface LicenseCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  price: string | null;
  cta: string;
  href: string;
  colorClass: string;
  newTab?: boolean;
}

function LicenseCard({
  icon,
  label,
  description,
  price,
  cta,
  href,
  colorClass,
  newTab,
}: LicenseCardProps) {
  const handleClick = () => {
    if (href.startsWith("mailto:") || href.startsWith("http") || newTab) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colorClass} text-white`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      {price && (
        <p className="text-xl font-bold text-gray-900">{price}</p>
      )}
      <Button
        size="sm"
        className="mt-auto w-full"
        onClick={handleClick}
      >
        {cta}
      </Button>
    </div>
  );
}

// --- Main Page ---

export default function PublisherLicensingPage() {
  const { publisherSlug } = useParams<{ publisherSlug: string }>();
  const navigate = useNavigate();

  const [publisher, setPublisher] = useState<PublisherData | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [pageState, setPageState] = useState<"loading" | "not_found" | "error" | "loaded">("loading");
  const [articlesLoading, setArticlesLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const slug = publisherSlug ?? "";

  const fetchPublisher = useCallback(async () => {
    try {
      const res = await fetch(
        `${EXT_SUPABASE_URL}/api?action=publisher&slug=${encodeURIComponent(slug)}`,
        { headers: { apikey: EXT_ANON_KEY } }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 404) {
          setPageState("not_found");
        } else {
          setPageState("error");
        }
        return null;
      }
      return json.data as PublisherData;
    } catch {
      setPageState("error");
      return null;
    }
  }, [slug]);

  const fetchArticles = useCallback(async (cursor?: string) => {
    const url = new URL(`${EXT_SUPABASE_URL}/api`);
    url.searchParams.set("action", "publisher_articles");
    url.searchParams.set("slug", slug);
    url.searchParams.set("limit", "20");
    if (cursor) url.searchParams.set("cursor", cursor);

    try {
      const res = await fetch(url.toString(), {
        headers: { apikey: EXT_ANON_KEY },
      });
      const json = await res.json();
      if (!res.ok || !json.success) return null;
      return json.data as { articles: Article[]; total: number; next_cursor: string | null };
    } catch {
      return null;
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setPageState("not_found");
      return;
    }

    let cancelled = false;

    async function load() {
      setPageState("loading");
      setArticlesLoading(true);

      const pub = await fetchPublisher();
      if (cancelled) return;
      if (!pub) return;

      setPublisher(pub);
      document.title = `License content from ${pub.name} — Opedd`;

      // Set OG meta tags for social sharing
      const setMeta = (property: string, content: string) => {
        let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
        if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
        el.setAttribute("content", content);
      };
      const setMetaName = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
        if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
        el.setAttribute("content", content);
      };
      const ogTitle = `License content from ${pub.name}`;
      const ogDesc = pub.description || `Browse and license ${pub.article_count} articles from ${pub.name} — powered by Opedd.`;
      setMeta("og:title", ogTitle);
      setMeta("og:description", ogDesc);
      setMeta("og:url", window.location.href);
      setMeta("og:type", "website");
      setMeta("og:site_name", "Opedd");
      if (pub.logo_url) setMeta("og:image", pub.logo_url);
      setMetaName("description", ogDesc);
      setMetaName("twitter:card", "summary");
      setMetaName("twitter:title", ogTitle);
      setMetaName("twitter:description", ogDesc);
      if (pub.logo_url) setMetaName("twitter:image", pub.logo_url);

      setPageState("loaded");

      const arts = await fetchArticles();
      if (cancelled) return;
      if (arts) {
        setArticles(arts.articles);
        setTotalArticles(arts.total);
        setNextCursor(arts.next_cursor);
      }
      setArticlesLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [slug, fetchPublisher, fetchArticles]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const arts = await fetchArticles(nextCursor);
    if (arts) {
      setArticles((prev) => [...prev, ...arts.articles]);
      setNextCursor(arts.next_cursor);
    }
    setLoadingMore(false);
  };

  // Build license cards
  const buildCards = (pub: PublisherData): LicenseCardProps[] => {
    const lt = pub.pricing_rules?.license_types;
    const mailto = getMailtoLink(pub.website_url, pub.name, pub.contact_email);
    const cards: LicenseCardProps[] = [];

    // Editorial
    const editorialPrice = lt?.editorial?.price_per_article ?? pub.default_human_price;
    if ((lt?.editorial?.enabled !== false) && editorialPrice && editorialPrice > 0) {
      cards.push({
        icon: <FileText size={20} />,
        label: "Editorial Use",
        description: "Reuse in articles, reports, analysis",
        price: `$${editorialPrice}/article`,
        cta: "Browse catalog",
        href: "#catalog",
        colorClass: "bg-indigo-600",
      });
    }

    // Archive
    if (lt?.archive?.enabled && lt.archive.price_annual && lt.archive.price_annual > 0) {
      cards.push({
        icon: <Archive size={20} />,
        label: "Archive License",
        description: `Full catalog access — all ${pub.article_count} articles`,
        price: `$${lt.archive.price_annual}/year`,
        cta: "License Archive",
        href: mailto,
        colorClass: "bg-blue-600",
        newTab: true,
      });
    }

    // AI / RAG
    if (lt?.ai_retrieval?.enabled && lt.ai_retrieval.price_monthly && lt.ai_retrieval.price_monthly > 0) {
      cards.push({
        icon: <Cpu size={20} />,
        label: "AI / RAG Access",
        description: "Structured API access for AI applications",
        price: `$${lt.ai_retrieval.price_monthly}/month`,
        cta: "Get API Access",
        href: mailto,
        colorClass: "bg-violet-600",
        newTab: true,
      });
    }

    // AI Training
    const aiTrainingPrice = lt?.ai_training?.price_onetime ?? pub.default_ai_price;
    if ((lt?.ai_training?.enabled !== false) && aiTrainingPrice && aiTrainingPrice > 0) {
      cards.push({
        icon: <Brain size={20} />,
        label: "AI Training",
        description: "License for model training & fine-tuning",
        price: lt?.ai_training?.price_onetime
          ? `$${lt.ai_training.price_onetime} one-time`
          : `$${pub.default_ai_price}`,
        cta: "License for Training",
        href: mailto,
        colorClass: "bg-purple-600",
        newTab: true,
      });
    }

    // Syndication
    if (lt?.syndication?.enabled) {
      const synPrice = lt.syndication.quote_only
        ? null
        : lt.syndication.price_per_article
          ? `$${lt.syndication.price_per_article}/article`
          : null;
      cards.push({
        icon: <Share2 size={20} />,
        label: "Syndication",
        description: "Republish in your publication",
        price: synPrice,
        cta: "Contact for Quote",
        href: mailto,
        colorClass: "bg-teal-600",
        newTab: true,
      });
    }

    // Corporate
    if (lt?.corporate?.enabled && lt.corporate.price_annual && lt.corporate.price_annual > 0) {
      cards.push({
        icon: <Building2 size={20} />,
        label: "Corporate Blanket",
        description: "Internal enterprise-wide reuse",
        price: `$${lt.corporate.price_annual}/year`,
        cta: "Contact for Quote",
        href: mailto,
        colorClass: "bg-slate-600",
        newTab: true,
      });
    }

    return cards;
  };

  // Derived: unique categories from articles
  const categories = Array.from(
    new Set(articles.map((a) => a.category).filter((c): c is string => !!c))
  );

  // Client-side filtering
  const filteredArticles = articles.filter((a) => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // --- Render states ---

  if (pageState === "loading") return <PageSkeleton />;

  if (pageState === "not_found") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-2xl font-semibold text-gray-800">Publisher not found</p>
        <p className="text-gray-500">This licensing page doesn't exist or hasn't been set up yet.</p>
        <a href="https://opedd.com" className="text-indigo-600 hover:underline text-sm font-medium">
          Go to Opedd →
        </a>
      </div>
    );
  }

  if (pageState === "error" || !publisher) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-2xl font-semibold text-gray-800">Unable to load publisher</p>
        <p className="text-gray-500">Something went wrong. Please try again.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const cards = buildCards(publisher);
  const mailto = getMailtoLink(publisher.website_url, publisher.name, publisher.contact_email);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar with Opedd branding */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex justify-end">
        <a
          href="https://opedd.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
        >
          Powered by <span className="font-bold text-gray-700">opedd</span>
        </a>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-10 flex-1 space-y-10">
        {/* SECTION 1 — Publisher Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Logo / Initials */}
          {publisher.logo_url ? (
            <img
              src={publisher.logo_url}
              alt={publisher.name}
              className="w-16 h-16 rounded-full object-cover shrink-0 border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-2xl font-bold">{getInitials(publisher.name)}</span>
            </div>
          )}

          {/* Publisher info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{publisher.name}</h1>
              {publisher.verified && (
                <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  <CheckCircle size={12} />
                  Verified
                </span>
              )}
            </div>
            {publisher.description && (
              <p className="text-gray-500 mt-1 text-sm leading-relaxed">{publisher.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
              {publisher.website_url && (
                <a
                  href={publisher.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors"
                >
                  <Globe size={13} />
                  {publisher.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              <span>{publisher.article_count.toLocaleString()} articles</span>
            </div>
          </div>
        </div>

        {/* SECTION 2 — License Type Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Licensing options</h2>
          {cards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="font-medium text-gray-600">Pricing coming soon</p>
              <p className="text-sm mt-1">Contact the publisher directly for licensing inquiries.</p>
              <a
                href={mailto}
                className="inline-block mt-3 text-sm text-indigo-600 hover:underline"
              >
                Contact {publisher.name} →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map((card) => (
                <LicenseCard key={card.label} {...card} />
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3 — Browse Catalog */}
        <div id="catalog">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Content catalog{" "}
              <span className="ml-1 text-xs font-normal bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {totalArticles.toLocaleString()} articles
              </span>
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search articles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Article list */}
          {articlesLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : publisher.article_count > 0 && articles.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              <p className="font-medium text-gray-600">Catalog importing…</p>
              <p className="text-sm mt-1">Articles are being indexed. Check back soon.</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="font-medium text-gray-600">No articles found</p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-sm mt-1 text-indigo-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1 inline-flex items-center gap-1"
                    >
                      {article.title}
                      <ExternalLink size={12} className="shrink-0 text-gray-400" />
                    </a>
                    <div className="flex items-center gap-2 mt-0.5">
                      {article.category && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {article.category}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(article.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {article.human_price != null && article.human_price > 0 && (
                      <span className="text-sm font-semibold text-gray-700">
                        ${article.human_price}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/l/${article.id}?type=editorial`)}
                    >
                      License →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {nextCursor && !articlesLoading && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4 — Footer strip */}
      <footer className="bg-gray-50 border-t border-gray-200 py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
          <span>
            Powered by{" "}
            <a
              href="https://opedd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gray-700 hover:text-indigo-600 transition-colors"
            >
              opedd
            </a>
          </span>
          <div className="flex items-center gap-4">
            <a
              href="/verify"
              className="hover:text-gray-700 transition-colors"
            >
              On-chain registry
            </a>
            <a
              href={`${EXT_SUPABASE_URL}/license-discovery?publisher_id=${publisher.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors inline-flex items-center gap-1"
            >
              Download opedd.json
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
