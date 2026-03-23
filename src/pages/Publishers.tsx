import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink, FileText, Award, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";

interface Publisher {
  id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  article_count: number;
  licenses_sold: number;
  logo_url?: string | null;
  category?: string | null;
}

export default function Publishers() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return publishers;
    const q = debouncedSearch.toLowerCase();
    return publishers.filter((p) => p.name.toLowerCase().includes(q));
  }, [publishers, debouncedSearch]);

  return (
    <div className="min-h-screen bg-[#040042] text-white">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
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
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative mb-8 max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search publishers…"
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-[#4A26ED]/40 focus-visible:border-[#4A26ED]"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#4A26ED]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/50 py-20">
              {publishers.length === 0
                ? "No publishers available yet."
                : "No publishers match your search."}
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pub) => (
                <div
                  key={pub.id}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-[#4A26ED]/40 transition-colors"
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
                        <div className="w-10 h-10 rounded-lg bg-[#4A26ED]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-[#4A26ED]">
                            {pub.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{pub.name}</h3>
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

                    {pub.category && (
                      <Badge variant="secondary" className="mb-4 bg-white/10 text-white/70 border-0 text-xs">
                        {pub.category}
                      </Badge>
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

                    <Link to={`/registry?publisher_id=${pub.id}`}>
                      <Button
                        size="sm"
                        className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
                      >
                        View Catalog
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
