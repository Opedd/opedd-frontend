import { useEffect, useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { licensesApi } from "@/lib/api";
import type { DbAsset, PaginatedResponse } from "@/types/asset";

/**
 * Phase 11 M1.c — "Recently ingested" Dashboard panel.
 *
 * Lower-emphasis ongoing-context surface. Wizard wow-moment animation
 * (WowMomentStep in SetupV2 Step 3) is the PRIMARY wow surface;
 * this panel exists so publishers returning to the dashboard later
 * see their content is being tracked. Per founder Correction 5
 * recommendation: "keep a small dashboard surface for the latest
 * 25 articles as ongoing context."
 *
 * Reads via licensesApi.list({ limit: 25 }) — same endpoint that
 * powers Content.tsx. Returns null when no articles (Dashboard
 * already has SetupBanner for empty state).
 */

const PANEL_LIMIT = 25;

export function RecentArticlesPanel() {
  const { getAccessToken } = useAuth();
  const [articles, setArticles] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await licensesApi.list<PaginatedResponse<DbAsset>>({ limit: PANEL_LIMIT }, token);
        if (!cancelled) {
          setArticles(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        /* silent — non-load-bearing surface */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  if (loading || articles.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-oxford" />
          <h2 className="text-sm font-semibold text-navy-deep">Recently ingested</h2>
        </div>
        <Link
          to="/content"
          className="text-xs font-medium text-navy-deep hover:text-oxford flex items-center gap-0.5"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>
      <ul className="divide-y divide-gray-100">
        {articles.slice(0, 5).map((a) => (
          <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
            <span className="flex-1 truncate text-gray-700">{a.title}</span>
            {a.published_at && (
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(a.published_at).toLocaleDateString()}
              </span>
            )}
          </li>
        ))}
      </ul>
      {articles.length > 5 && (
        <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-500">
          + {articles.length - 5} more
        </div>
      )}
    </div>
  );
}
