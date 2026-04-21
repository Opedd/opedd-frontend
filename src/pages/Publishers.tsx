import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Search, ExternalLink, FileText, Award, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";
import { Spinner } from "@/components/ui/Spinner";

interface Publisher {
  id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  article_count: number;
  licenses_sold: number;
  logo_url?: string | null;
  category?: string | null;
  categories?: string[] | null;
  last_published_at?: string | null;
  created_at?: string | null;
}

type SortKey = "recent" | "articles" | "alpha";

const ALL = "__all__";

function getPrimaryCategory(p: Publisher): string | null {
  if (p.category && p.category.trim()) return p.category.trim();
  if (Array.isArray(p.categories) && p.categories.length > 0) {
    const first = p.categories.find((c) => typeof c === "string" && c.trim());
    return first ? first.trim() : null;
  }
  return null;
}

export default function Publishers() {
  useDocumentTitle("Publisher Directory — Opedd");
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${EXT_SUPABASE_URL}/functions/v1/publisher-directory?verified=true&limit=50`,
          { headers: { apikey: EXT_ANON_KEY } }
        );
        if (res.ok) {
          const data = await res.json();
          setPublishers(Array.isArray(data) ? data : data.publishers ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Categories actually present in data
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    publishers.forEach((p) => {
      const c = getPrimaryCategory(p);
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [publishers]);

  // Whether the data provides any signal usable for "Most articles" sort
  const hasArticleCounts = useMemo(
    () => publishers.some((p) => typeof p.article_count === "number" && p.article_count > 0),
    [publishers],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = publishers.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (activeCategory !== ALL) {
        if (getPrimaryCategory(p) !== activeCategory) return false;
      }
      return true;
    });

    list = [...list];
    if (sortKey === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "articles") {
      if (hasArticleCounts) {
        list.sort((a, b) => (b.article_count ?? 0) - (a.article_count ?? 0));
      }
    } else {
      // recent: prefer last_published_at, fall back to created_at; otherwise preserve fetch order
      const hasRecency = publishers.some((p) => p.last_published_at || p.created_at);
      if (hasRecency) {
        list.sort((a, b) => {
          const ta = new Date(a.last_published_at ?? a.created_at ?? 0).getTime();
          const tb = new Date(b.last_published_at ?? b.created_at ?? 0).getTime();
          return tb - ta;
        });
      }
    }
    return list;
  }, [publishers, debouncedSearch, activeCategory, sortKey, hasArticleCounts]);

  const showFilterBar = !loading && publishers.length > 0;

  return (
    <div className="min-h-screen bg-navy-deep text-white flex flex-col">
      <SEO
        title="Publisher Directory — Opedd"
        description="Browse verified publishers licensing their content through Opedd."
        path="/publishers"
      />
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Publisher Directory
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Browse verified publishers licensing their content through Opedd. Every publisher listed here has been ownership-verified.
          </p>
        </div>
      </section>

      {/* Search + Grid */}
      <section className="pb-24 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          {showFilterBar && (
            <div className="relative mb-6 max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search publishers…"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-oxford/40 focus-visible:border-oxford"
              />
            </div>
          )}

          {/* Filter + sort bar */}
          {showFilterBar && (availableCategories.length > 0 || true) && (
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {availableCategories.length > 0 ? (
                <div
                  role="tablist"
                  aria-label="Filter by category"
                  className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin"
                >
                  <CategoryChip
                    label="All"
                    active={activeCategory === ALL}
                    onClick={() => setActiveCategory(ALL)}
                  />
                  {availableCategories.map((cat) => (
                    <CategoryChip
                      key={cat}
                      label={cat}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                    />
                  ))}
                </div>
              ) : (
                <div />
              )}
              <div className="md:ml-auto self-end md:self-auto">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger
                    aria-label="Sort publishers"
                    className="w-[180px] bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently active</SelectItem>
                    {hasArticleCounts && <SelectItem value="articles">Most articles</SelectItem>}
                    <SelectItem value="alpha">Alphabetical (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="md" className="text-oxford" />
            </div>
          ) : publishers.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/50 py-20">
              No publishers match your filters.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pub) => {
                const cat = getPrimaryCategory(pub);
                return (
                  <div
                    key={pub.id}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-oxford/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {pub.logo_url ? (
                          <img
                            src={pub.logo_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-oxford/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-oxford">
                              {pub.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-white truncate">{pub.name}</h3>
                            {cat && (
                              <Badge
                                variant="secondary"
                                className="bg-white/10 text-white/70 border-0 text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0"
                              >
                                {cat}
                              </Badge>
                            )}
                          </div>
                          {pub.website_url && (
                            <a
                              href={pub.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 truncate"
                            >
                              {pub.website_url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>

                      {pub.description && (
                        <p className="text-sm text-white/50 line-clamp-2 mb-4">
                          {pub.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-4 text-xs text-white/40 mb-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {pub.article_count} articles
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5" />
                          {pub.licenses_sold} licenses
                        </span>
                      </div>

                      {pub.website_url && (
                        <a href={pub.website_url} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            className="w-full bg-oxford hover:bg-oxford-dark text-white"
                          >
                            Visit Site
                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold bg-oxford text-white border border-oxford whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxford/40"
          : "shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium bg-transparent text-white/70 border border-white/15 hover:bg-white/10 hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxford/40"
      }
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[55vh] py-12">
      <div className="text-center max-w-md mx-auto">
        {/* Inline SVG illustration — no extra deps */}
        <div className="mx-auto mb-6 w-32 h-32 relative">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pub-empty-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(243 100% 60% / 0.35)" />
                <stop offset="100%" stopColor="hsl(243 100% 60% / 0.05)" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="80" fill="url(#pub-empty-grad)" />
            <rect
              x="55"
              y="58"
              width="90"
              height="84"
              rx="10"
              fill="hsl(0 0% 100% / 0.05)"
              stroke="hsl(0 0% 100% / 0.2)"
              strokeWidth="1.5"
            />
            <line x1="68" y1="78" x2="132" y2="78" stroke="hsl(0 0% 100% / 0.3)" strokeWidth="2" strokeLinecap="round" />
            <line x1="68" y1="92" x2="118" y2="92" stroke="hsl(0 0% 100% / 0.2)" strokeWidth="2" strokeLinecap="round" />
            <line x1="68" y1="106" x2="124" y2="106" stroke="hsl(0 0% 100% / 0.2)" strokeWidth="2" strokeLinecap="round" />
            <line x1="68" y1="120" x2="100" y2="120" stroke="hsl(0 0% 100% / 0.2)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="148" cy="62" r="14" fill="hsl(243 100% 60% / 0.9)" />
            
            <path
              d="M148 56 L150 60 L154 62 L150 64 L148 68 L146 64 L142 62 L146 60 Z"
              fill="hsl(0 0% 100%)"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No publishers yet</h2>
        <p className="text-sm text-white/60 leading-relaxed mb-6">
          Be among the first. Claim your publisher profile and get discovered by AI companies, researchers, and media buyers.
        </p>
        <Link to="/signup">
          <Button className="bg-oxford hover:bg-oxford-dark text-white h-11 px-6 rounded-xl text-sm font-semibold">
            Create your publisher profile
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
