import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import {
  Users, DollarSign, Activity, AlertTriangle, Search, Copy, Check,
  ChevronLeft, ChevronRight, Loader2, ShieldAlert, ArrowUpDown, PartyPopper,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getLicenseTypeLabel, getLicenseTypeBadgeClass } from "@/lib/licenseTypes";

// --------------- Types ---------------

interface Stats {
  total_publishers: number;
  total_transactions: number;
  total_revenue: number;
  transactions_today: number;
  revenue_today: number;
  failed_webhooks_24h: number;
}

interface Publisher {
  id: string;
  display_name: string;
  website_url: string | null;
  plan: string;
  article_count: number;
  total_revenue: number;
  stripe_connected: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  created_at: string;
  buyer_email: string;
  amount: number;
  license_type: string;
  license_key: string;
  status: string;
}

interface FailedWebhook {
  id: string;
  publisher_name: string;
  event_type: string;
  attempts: number;
  last_attempt_at: string;
  status: string;
}

// --------------- Helpers ---------------

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "•••@" + domain;
}

function truncateKey(key: string) {
  if (key.length <= 12) return key;
  return key.slice(0, 8) + "…" + key.slice(-4);
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm min-h-[120px]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-oxford/10 flex items-center justify-center">
          <Icon size={18} className="text-oxford" />
        </div>
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400",
    pending: "bg-amber-500/10 text-amber-400",
    failed: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[status] || "bg-white/10 text-white/50"}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  // Canonical labels + colors — sourced from src/lib/licenseTypes.
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${getLicenseTypeBadgeClass(type)}`}>
      {getLicenseTypeLabel(type, "short")}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "bg-gray-100 text-gray-500",
    pro: "bg-oxford-light text-oxford",
    enterprise: "bg-amber-50 text-amber-600",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  );
}

// --------------- Main Component ---------------

export default function Admin() {
  useDocumentTitle("Admin — Opedd");
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"overview" | "publishers" | "transactions" | "webhooks" | "funnel">("overview");
  const TABS = ["overview", "publishers", "transactions", "webhooks", "funnel"] as const;
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Verify admin status server-side on mount
  useEffect(() => {
    getAccessToken().then(async (token) => {
      if (!token) { setAdminChecked(true); return; }
      try {
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setIsAdmin(!!json.data?.is_admin);
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminChecked(true);
      }
    });
  }, [getAccessToken]);

  if (!adminChecked) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-oxford" size={28} /></div>;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert size={24} className="text-navy-deep" />
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
            <TabsList className="mb-6 bg-transparent border-b border-gray-200 rounded-none p-0 h-auto w-full justify-start gap-1">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="capitalize px-4 py-2.5 text-sm font-medium text-gray-500 rounded-none border-b-2 border-transparent data-[state=active]:border-navy-deep data-[state=active]:text-navy-deep data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-gray-900 -mb-px"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-0"><OverviewTab getAccessToken={getAccessToken} /></TabsContent>
            <TabsContent value="publishers" className="mt-0"><PublishersTab getAccessToken={getAccessToken} /></TabsContent>
            <TabsContent value="transactions" className="mt-0"><TransactionsTab getAccessToken={getAccessToken} toast={toast} /></TabsContent>
            <TabsContent value="webhooks" className="mt-0"><WebhooksTab getAccessToken={getAccessToken} /></TabsContent>
            <TabsContent value="funnel" className="mt-0"><FunnelTab getAccessToken={getAccessToken} /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// --------------- Overview Tab ---------------

function OverviewTab({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${EXT_SUPABASE_URL}/admin?action=stats`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setStats(json.data ?? null);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [getAccessToken]);

  if (loading) return <LoadingState />;
  if (!stats) return <p className="text-sm text-gray-500">Failed to load stats.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Total Publishers" value={stats.total_publishers} icon={Users} />
      <StatCard label="Total Transactions" value={stats.total_transactions} icon={Activity} />
      <StatCard label="Total Revenue" value={`$${stats.total_revenue.toFixed(2)}`} icon={DollarSign} />
      <StatCard label="Transactions Today" value={stats.transactions_today} icon={Activity} />
      <StatCard label="Revenue Today" value={`$${stats.revenue_today.toFixed(2)}`} icon={DollarSign} />
      <StatCard label="Failed Webhooks (24h)" value={stats.failed_webhooks_24h} icon={AlertTriangle} />
    </div>
  );
}

// --------------- Publishers Tab ---------------

function PublishersTab({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"display_name" | "total_revenue" | "article_count">("display_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${EXT_SUPABASE_URL}/admin?action=publishers`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setPublishers(json.data?.publishers ?? []);
      } catch {
        setPublishers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [getAccessToken]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = publishers
    .filter(p => p.display_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search publishers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-10 border-gray-200"
        />
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <SortTh label="Name" active={sortKey === "display_name"} dir={sortDir} onClick={() => handleSort("display_name")} />
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Website</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <SortTh label="Articles" active={sortKey === "article_count"} dir={sortDir} onClick={() => handleSort("article_count")} />
                <SortTh label="Revenue" active={sortKey === "total_revenue"} dir={sortDir} onClick={() => handleSort("total_revenue")} />
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Stripe</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">No publishers found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{p.display_name || "—"}</td>
                  <td className="py-3 px-4 text-gray-500 truncate max-w-[180px]">{p.website_url || "—"}</td>
                  <td className="py-3 px-4"><PlanBadge plan={p.plan} /></td>
                  <td className="py-3 px-4 text-gray-900">{p.article_count}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">${p.total_revenue.toFixed(2)}</td>
                  <td className="py-3 px-4">{p.stripe_connected ? <span className="text-emerald-500">✓</span> : <span className="text-gray-300">✗</span>}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: string; onClick: () => void }) {
  return (
    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none" onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={active ? "text-navy-deep" : "text-gray-300"} />
      </span>
    </th>
  );
}

// --------------- Transactions Tab ---------------

function TransactionsTab({ getAccessToken, toast }: { getAccessToken: () => Promise<string | null>; toast: ReturnType<typeof useToast>["toast"] }) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const LIMIT = 50;

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/admin?action=transactions&limit=${LIMIT}&offset=${p * LIMIT}`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const rows = json.data?.transactions ?? [];
      setTxns(rows);
      setHasMore(rows.length === LIMIT);
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => { fetchPage(page); }, [page, fetchPage]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Buyer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">License Key</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No transactions found.</td></tr>
              ) : txns.map(tx => (
                <tr key={tx.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-500">{maskEmail(tx.buyer_email)}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">${tx.amount.toFixed(2)}</td>
                  <td className="py-3 px-4"><TypeBadge type={tx.license_type} /></td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5">
                      <code className="text-xs font-mono text-gray-500">{truncateKey(tx.license_key)}</code>
                      <button onClick={() => handleCopy(tx.license_key)} aria-label="Copy license key" className="text-gray-400 hover:text-navy-deep transition-colors">
                        {copiedKey === tx.license_key ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </span>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className={`text-sm flex items-center gap-1 transition-colors ${page === 0 ? "text-gray-300 cursor-default" : "text-navy-deep hover:underline"}`}
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span className="text-xs text-gray-400">Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          className={`text-sm flex items-center gap-1 transition-colors ${!hasMore ? "text-gray-300 cursor-default" : "text-navy-deep hover:underline"}`}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// --------------- Webhooks Tab ---------------

function WebhooksTab({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [webhooks, setWebhooks] = useState<FailedWebhook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${EXT_SUPABASE_URL}/admin?action=failed_webhooks`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setWebhooks(json.data?.failed_webhooks ?? []);
      } catch {
        setWebhooks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [getAccessToken]);

  if (loading) return <LoadingState />;

  if (webhooks.length === 0) {
    return (
      <div className="py-16 text-center">
        <PartyPopper size={28} className="mx-auto text-emerald-500 mb-2" />
        <p className="text-sm font-medium text-gray-500">No failed webhooks</p>
        <p className="text-xs text-gray-400 mt-1">All webhook deliveries are healthy.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Publisher</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Event Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Attempts</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Try</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map(wh => (
              <tr key={wh.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{wh.publisher_name}</td>
                <td className="py-3 px-4 text-gray-500">{wh.event_type}</td>
                <td className="py-3 px-4 text-gray-900">{wh.attempts}</td>
                <td className="py-3 px-4 text-gray-500">{new Date(wh.last_attempt_at).toLocaleString()}</td>
                <td className="py-3 px-4"><StatusBadge status={wh.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------- Funnel Tab ---------------

type FunnelRow = { step: number; name: string; reached: number };
interface FunnelPayload {
  funnel: FunnelRow[];
  completed: number;
  total_events: number;
  since: string;
}

function FunnelTab({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [data, setData] = useState<FunnelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          method: "POST",
          headers: {
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "admin_onboarding_funnel" }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!json?.success || !json?.data) throw new Error();
        setData(json.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [getAccessToken]);

  if (loading) return <LoadingState />;
  if (error || !data) {
    return <p className="text-sm text-[#6B7280]">Failed to load funnel data.</p>;
  }

  const top = data.funnel[0]?.reached || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold text-navy-deep text-lg">Onboarding Funnel</h2>
        <p className="text-xs text-[#9CA3AF]">
          Last 90 days · {data.total_events} events · {data.completed} completed
        </p>
      </div>
      <div className="border border-[#E5E7EB] rounded-xl bg-white p-5 space-y-3">
        {data.funnel.map((row, idx) => {
          const pct = top > 0 ? Math.round((row.reached / top) * 100) : 0;
          const prev = idx > 0 ? data.funnel[idx - 1].reached : null;
          const dropFromPrev = prev && prev > 0 ? Math.round(((prev - row.reached) / prev) * 100) : null;
          return (
            <div key={row.step} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-navy-deep">
                  {row.step}. {row.name}
                </span>
                <span className="text-[#6B7280] text-xs">
                  {row.reached} publishers
                  {dropFromPrev !== null && dropFromPrev > 0 && (
                    <span className="text-amber-600 ml-2">-{dropFromPrev}%</span>
                  )}
                </span>
              </div>
              <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-oxford to-plum-magenta rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --------------- Shared ---------------

function LoadingState() {
  return (
    <div className="py-16 flex justify-center">
      <Loader2 size={24} className="animate-spin text-navy-deep" />
    </div>
  );
}
