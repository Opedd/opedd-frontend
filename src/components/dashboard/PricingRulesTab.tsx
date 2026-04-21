import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_SUPABASE_REST, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, DollarSign, Info, XCircle } from "lucide-react";

export function PricingRulesTab() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [excludedPatterns, setExcludedPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [categoryRules, setCategoryRules] = useState<Array<{ category: string; human: string; ai: string }>>([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultHumanPrice, setDefaultHumanPrice] = useState("5.00");
  const [defaultAiPrice, setDefaultAiPrice] = useState("10.00");

  const apiHeaders = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");
    return {
      "Content-Type": "application/json",
      apikey: EXT_ANON_KEY,
      Authorization: `Bearer ${token}`,
    };
  }, [getAccessToken]);

  // Load profile data (pricing rules, exclusions)
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const headers = await apiHeaders();
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, { headers });
        const json = await res.json();
        const d = json.success ? json.data : null;
        if (d) {
          setProfileId(d.id);
          setExcludedPatterns(d.excluded_url_patterns || []);
          setDefaultHumanPrice(d.default_human_price != null ? String(d.default_human_price) : "5.00");
          setDefaultAiPrice(d.default_ai_price != null ? String(d.default_ai_price) : "25.00");
          const cats = (d.pricing_rules as any)?.categories || {};
          const catArray = Object.entries(cats).map(([category, prices]: [string, any]) => ({
            category,
            human: String(prices.human ?? ""),
            ai: String(prices.ai ?? ""),
          }));
          setCategoryRules(catArray);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, apiHeaders]);

  // Fetch distinct categories from licenses
  useEffect(() => {
    if (!profileId || categoriesFetched) return;
    const fetchCategories = async () => {
      setIsFetchingCategories(true);
      try {
        const headers = await apiHeaders();
        const res = await fetch(
          `${EXT_SUPABASE_REST}/rest/v1/licenses?select=category&publisher_id=eq.${profileId}&category=not.is.null`,
          { headers }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          const unique = [...new Set(data.map((r: any) => r.category).filter(Boolean))] as string[];
          setCategoryRules(prev => {
            const existingMap = new Map(prev.map(r => [r.category.toLowerCase(), r]));
            return unique.map(cat => {
              const key = cat.toLowerCase();
              if (existingMap.has(key)) return existingMap.get(key)!;
              return { category: cat, human: defaultHumanPrice, ai: defaultAiPrice };
            });
          });
        }
      } catch (err) {
        console.warn("[PricingRulesTab] Failed to fetch categories:", err);
      } finally {
        setIsFetchingCategories(false);
        setCategoriesFetched(true);
      }
    };
    fetchCategories();
  }, [profileId, categoriesFetched, apiHeaders, defaultHumanPrice, defaultAiPrice]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers = await apiHeaders();
      const categories: Record<string, any> = {};
      for (const rule of categoryRules) {
        if (rule.category) {
          categories[rule.category] = {
            human: parseFloat(rule.human) || 0,
            ai: parseFloat(rule.ai) || 0,
          };
        }
      }
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          excluded_url_patterns: excludedPatterns,
          pricing_rules: { categories },
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Save failed");
      toast({ title: "Pricing rules saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-oxford" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Pricing */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-navy-deep">Category Pricing</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-gray-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px] text-xs">
                  Category prices override your global defaults for articles in that category.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Override default prices for specific content categories. Articles without a category use your default prices.</p>
        </div>
        {isFetchingCategories ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-oxford" size={20} />
          </div>
        ) : categoryRules.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-[#111] mb-1">No categories yet</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">Your article categories will appear here automatically after your first content sync.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categoryRules.map((rule, i) => (
              <div key={rule.category} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-medium text-navy-deep flex-1 capitalize">{rule.category}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Human</span>
                  <div className="relative w-20">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number" min="0" step="1"
                      value={rule.human}
                      onChange={e => setCategoryRules(prev => prev.map((r, j) => j === i ? { ...r, human: e.target.value } : r))}
                      className="w-full border border-slate-200 rounded-lg pl-5 pr-2 py-1.5 text-xs text-navy-deep focus:outline-none focus:ring-1 focus:ring-oxford/30"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">AI</span>
                  <div className="relative w-20">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number" min="0" step="1"
                      value={rule.ai}
                      onChange={e => setCategoryRules(prev => prev.map((r, j) => j === i ? { ...r, ai: e.target.value } : r))}
                      className="w-full border border-slate-200 rounded-lg pl-5 pr-2 py-1.5 text-xs text-navy-deep focus:outline-none focus:ring-1 focus:ring-oxford/30"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL Exclusion Rules */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-navy-deep">URL Exclusion Rules</h3>
          <p className="text-sm text-gray-500 mt-0.5">URLs matching these patterns will be skipped during sitemap import and widget auto-registration. Use * as wildcard.</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Built-in exclusions (always active)</p>
          <div className="flex flex-wrap gap-2">
            {["/about*", "/careers*", "/contact*", "/advertise*", "/privacy*", "/terms*", "/subscribe*", "/tag*", "/author*", "/search*", "/login*", "/rss*"].map(p => (
              <span key={p} className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-lg font-mono">{p}</span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your custom exclusions</p>
          {excludedPatterns.length === 0 && (
            <p className="text-sm text-slate-400 italic">No custom exclusions.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {excludedPatterns.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-oxford/5 border border-oxford/15 text-oxford text-xs rounded-lg font-mono">
                {p}
                <button onClick={() => setExcludedPatterns(prev => prev.filter((_, j) => j !== i))} aria-label={`Remove exclusion pattern ${p}`} className="hover:text-red-500">
                  <XCircle size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="/section-to-exclude/*"
              value={newPattern}
              onChange={e => setNewPattern(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newPattern.trim()) {
                  const pat = newPattern.trim();
                  if (!excludedPatterns.includes(pat)) setExcludedPatterns(prev => [...prev, pat]);
                  setNewPattern("");
                }
              }}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-navy-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-oxford/20"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const pat = newPattern.trim();
                if (pat && !excludedPatterns.includes(pat)) setExcludedPatterns(prev => [...prev, pat]);
                setNewPattern("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          disabled={isSaving}
          onClick={handleSave}
          className="bg-oxford hover:bg-oxford-dark text-white px-6"
        >
          {isSaving ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving...</> : "Save Pricing Rules"}
        </Button>
      </div>
    </div>
  );
}
