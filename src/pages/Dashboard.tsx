import React, { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus, Copy, ExternalLink, Check, Users, DollarSign, Activity, AlertTriangle as AlertTriangleIcon, Link as LinkIcon, Mail, ArrowUp, ArrowDown, Bot, User as UserIcon, FileText, Tag, UserPlus, Eye, ChevronRight, Handshake, Coins } from "lucide-react";
import { IssueArchiveLicenseModal } from "@/components/dashboard/IssueArchiveLicenseModal";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { IngestionTracker } from "@/components/IngestionTracker";
import { SetupBanner } from "@/components/dashboard/SetupBanner";
import { useWizardState } from "@/hooks/useWizardState";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { deriveSlug } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SourcesView } from "@/components/dashboard/SourcesView";
// PublicationSetupFlow removed — "Add content" now routes to /setup
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { CoachMarks } from "@/components/dashboard/CoachMarks";
import { VerificationPendingBanner } from "@/components/dashboard/VerificationPendingBanner";
import { useToast } from "@/hooks/use-toast";
import { PaginatedResponse } from "@/types/asset";
import { DbAsset } from "@/types/asset";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { formatUSD } from "@/lib/formatNumber";
// Sheet imports removed — drawer replaced with /setup navigation

export default function Dashboard() {
  useDocumentTitle("Dashboard — Opedd");
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { licenses } = useAuthenticatedApi();
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalLicensesSold, setTotalLicensesSold] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [recentSales, setRecentSales] = useState<Array<{ id: string; asset_title: string; buyer_email?: string; buyer_name?: string; amount: number; created_at: string; license_type: string }>>([]);
  const [periodComparison, setPeriodComparison] = useState<{ percentChangeRevenue: number; percentChangeLicenses: number; previousRevenue: number; previousLicenses: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sourcesKey, setSourcesKey] = useState(0);
  const [publisherSlug, setPublisherSlug] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [contentImported, setContentImported] = useState(false);
  const [pricingConfigured, setPricingConfigured] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState<boolean | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [aiLicensingConfigured, setAiLicensingConfigured] = useState(false);
  const [aiLicenseTypes, setAiLicenseTypes] = useState<{ rag: boolean; training: boolean; inference: boolean } | null>(null);
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [inboundCopied, setInboundCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPendingVerification, setHasPendingVerification] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  // Session 1.8 — read setup_state for SetupBanner mounting AND for the
  // VerificationPendingBanner hide condition. SetupBanner becomes the
  // single source of truth for connected-state messaging once the wizard
  // hook resolves; VerificationPendingBanner is suppressed in any
  // non-verified resolved state to prevent double-banner overlap.
  const wizardState = useWizardState();
  const wizardSpeaks =
    !wizardState.isLoading &&
    !wizardState.error &&
    !!wizardState.setupState &&
    wizardState.setupState !== "verified";

  // Admin stats state
  interface AdminStats {
    total_publishers: number;
    total_transactions: number;
    total_revenue: number;
    transactions_today: number;
    revenue_today: number;
    failed_webhooks_24h: number;
  }
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  

  // Setup flow state
  const [hasActivePublication, setHasActivePublication] = useState<boolean | null>(null);
  const [setupDismissed, setSetupDismissed] = useState(false);
  // addPubDrawerOpen removed — now routes to /setup

  // Profile-loaded gate (replaces the old referralChecked loading flag)
  const [profileLoaded, setProfileLoaded] = useState(false);
  // Timestamp of the dashboard coach-mark tour dismissal. `null` = tour not yet
  // seen, which triggers the CoachMarks component to render on first paint.
  const [tourCompletedAt, setTourCompletedAt] = useState<string | null>(null);

  // Track incomplete setup steps for banner
  const [setupCompletion, setSetupCompletion] = useState<{ pricingDone: boolean; widgetDone: boolean }>({
    pricingDone: true,
    widgetDone: true,
  });


  const checkPublications = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await (supabase as any)
        .from("content_sources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("sync_status", ["active", "protected"]);
      setHasActivePublication((count ?? 0) > 0);
      const { count: pendingCount } = await (supabase as any)
        .from("content_sources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sync_status", "pending");
      setHasPendingVerification((pendingCount ?? 0) > 0);
    } catch {
      setHasActivePublication(false);
      setHasPendingVerification(false);
    }
  }, [user]);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // Article count — cheap HEAD-equivalent via list with limit=1
      const result = await licenses.list<PaginatedResponse<DbAsset>>({ page: 1, limit: 1 });
      setTotalAssets(result.total);

      // Revenue + trend + recent sales — all from /get-insights (last 30d default)
      const token = await getAccessToken();
      if (token) {
        const res = await fetch(`${EXT_SUPABASE_URL}/get-insights?days=30`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const d = json?.data;
          if (d) {
            setTotalRevenue(d.overview?.totalRevenue ?? 0);
            setTotalLicensesSold(d.overview?.totalLicenses ?? 0);
            setRevenueTrend((d.revenueByDay ?? []).map((r: { date: string; revenue: number }) => ({ date: r.date, revenue: r.revenue })));
            setRecentSales((d.recentActivity ?? []).slice(0, 5));
            setPeriodComparison(d.periodComparison ?? null);
          }
        }
      }
    } catch (err: unknown) {
      console.warn("[Dashboard] Fetch error:", err instanceof Error ? err.message : err);
    } finally {
      setIsLoading(false);
    }
  }, [user, licenses, getAccessToken]);

  function isPricingConfigured(pricingRules: any): boolean {
    if (!pricingRules?.license_types) return false;
    return Object.values(pricingRules.license_types).some(
      (t: any) => t?.enabled && (t.price_per_article || t.price_annual || t.price_monthly || t.price_onetime || t.quote_only)
    );
  }

  // Fetch publisher profile — populates checklist + sidebar state. No longer
  // force-redirects to /setup: publishers can explore the dashboard with a
  // pending publication. The "finish setup" banner below nudges them back.
  // Referral capture lives on /welcome; this page no longer prompts for it.
  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const profile = json.success ? json.data : null;
      if (profile?.website_url) {
        setPublisherSlug(deriveSlug(profile.website_url));
      }
      setContentImported(!!profile?.content_imported);
      setPricingConfigured(isPricingConfigured(profile?.pricing_rules));
      setStripeConnected(!!profile?.stripe_onboarding_complete);
      setStripeAccountId(profile?.stripe_account_id ?? null);
      setStripePayoutsEnabled(
        profile?.stripe_connect ? !!profile.stripe_connect.payouts_enabled : null
      );
      setSetupComplete(!!profile?.setup_complete);
      setTourCompletedAt(profile?.tour_completed_at ?? null);
      setAiLicensingConfigured(!!profile?.ai_license_types);
      setAiLicenseTypes(profile?.ai_license_types ?? null);
      if (profile?.inbound_email) setInboundEmail(profile.inbound_email);
      setIsAdmin(!!profile?.is_admin);
    } finally {
      setProfileLoaded(true);
    }
  }, [user, getAccessToken]);

  // Fetch all dashboard data in parallel (not sequentially)
  useEffect(() => {
    Promise.all([checkPublications(), fetchMetrics(), loadProfile()]);
  }, [checkPublications, fetchMetrics, loadProfile]);

  // Fetch admin stats
  const fetchAdminStats = useCallback(async () => {
    if (!isAdmin) return;
    setAdminStatsLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/admin?action=stats`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAdminStats(json.data ?? null);
    } catch {
      setAdminStats(null);
    } finally {
      setAdminStatsLoading(false);
    }
  }, [isAdmin, getAccessToken]);

  useEffect(() => { fetchAdminStats(); }, [fetchAdminStats]);

  if (!user) return null;
  if (hasActivePublication === null || !profileLoaded) return <DashboardSkeleton />;

  const showBanner = !setupCompletion.pricingDone || !setupCompletion.widgetDone;
  const licensingUrl = publisherSlug ? `opedd.com/p/${publisherSlug}` : null;
  const licensingHref = publisherSlug ? `https://opedd.com/p/${publisherSlug}` : null;

  // Priority banner: only the highest-priority banner renders.
  // 1. Stripe KYC pending (account exists but payouts disabled)
  // 2. Held Payments warning (revenue accruing but Stripe not connected)
  // 3. Verification Pending (a publication is pending verification)
  // 4. Onboarding Checklist (setup not complete)
  // 5. Pending Earnings card (already covered by #2 — kept distinct for the case
  //    where revenue is 0 but admin chooses to show. In MVP, #2 supersedes.)
  type BannerKind = "stripe-kyc" | "held-payments" | "verification" | "onboarding" | null;
  const activeBanner: BannerKind = (() => {
    const stripeKycPending =
      !!stripeAccountId && (!stripeConnected || stripePayoutsEnabled === false);
    if (stripeKycPending) return "stripe-kyc";
    const heldPayments = !stripeConnected && (totalRevenue > 0 || totalLicensesSold > 0);
    if (heldPayments) return "held-payments";
    if (totalAssets > 0 && !isLoading && hasPendingVerification) return "verification";
    if (!setupComplete) return "onboarding";
    return null;
  })();

  const showQuickActions = setupComplete && totalAssets > 0;

  const handleConnectStripe = async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "connect_stripe" }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch { /* ignore */ }
  };

  const handleCopyUrl = async () => {
    if (!licensingHref) return;
    try {
      await navigator.clipboard.writeText(licensingHref);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <DashboardLayout
      title="Dashboard"
      headerActions={<></>}
    >
      <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* SetupBanner (Session 1.8): truthful state surfaced from
            useWizardState. Visible for prospect / in_setup / connected /
            suspended; returns null for verified. Always rendered above
            the priority-banner switch so it can speak independently. */}
        <SetupBanner />

        {/* Priority banner — only the highest-priority banner renders. */}
        {activeBanner === "stripe-kyc" && (
          <div className="bg-white rounded-xl border-2 border-oxford/40 p-5 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <AlertTriangleIcon size={18} className="text-oxford mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy-deep">
                    Stripe identity verification required
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your Stripe account is connected but payouts are blocked until you finish identity verification.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleConnectStripe}
                className="bg-oxford hover:bg-oxford-dark text-white shrink-0"
              >
                Complete verification →
              </Button>
            </div>
          </div>
        )}

        {activeBanner === "held-payments" && (
          <div className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-lg font-bold text-navy-deep flex items-center gap-2">
                  <Coins size={18} className="text-amber-600" />
                  Pending Earnings: {formatUSD(totalRevenue)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Your earnings are accumulating. Connect your bank to start receiving payouts.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleConnectStripe}
                className="bg-oxford hover:bg-oxford-dark text-white shrink-0"
              >
                Connect Stripe →
              </Button>
            </div>
          </div>
        )}

        {/* Hide VerificationPendingBanner when SetupBanner can speak
            (wizard hook resolved, non-verified state). Avoids double-
            banner overlap on connected state. Refinement 1 from Session
            1.8 design review — VerificationPendingBanner kept in the
            codebase as legacy, suppressed at the call site. */}
        {activeBanner === "verification" && !wizardSpeaks && <VerificationPendingBanner />}

        {activeBanner === "onboarding" && (
          <div data-tour-target="onboarding-checklist">
            <OnboardingChecklist
            contentImported={contentImported}
            aiLicensingConfigured={aiLicensingConfigured}
            pricingConfigured={pricingConfigured}
            stripeConnected={stripeConnected}
            setupComplete={setupComplete}
            publisherSlug={publisherSlug}
            initialAiLicenseTypes={aiLicenseTypes}
            onRegisterContent={() => navigate("/setup?add=1")}
            onAiLicensingComplete={() => setAiLicensingConfigured(true)}
          />
          </div>
        )}


        {/* Compact Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card min-h-[120px]">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Articles</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-100 rounded-lg mt-1 animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalAssets}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalLicensesSold > 0 ? `${totalLicensesSold} licensed (last 30d)` : "Awaiting first license"}
                </p>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card min-h-[120px]">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Revenue (30d)</p>
            {isLoading ? (
              <div className="h-8 w-20 bg-gray-100 rounded-lg mt-1 animate-pulse" />
            ) : (
              <>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{formatUSD(totalRevenue)}</p>
                  {periodComparison && periodComparison.previousRevenue > 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${periodComparison.percentChangeRevenue >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {periodComparison.percentChangeRevenue >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {Math.abs(periodComparison.percentChangeRevenue).toFixed(0)}%
                    </span>
                  )}
                </div>
                {periodComparison && (
                  <p className="text-xs text-gray-400 mt-1">
                    vs {formatUSD(periodComparison.previousRevenue)} previous 30d
                  </p>
                )}
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card min-h-[120px]">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Trend</p>
            {isLoading ? (
              <div className="h-16 w-full bg-gray-100 rounded-lg mt-1 animate-pulse" />
            ) : revenueTrend.length > 0 && revenueTrend.some((r) => r.revenue > 0) ? (
              <div className="mt-1 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A26ED" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4A26ED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4A26ED"
                      strokeWidth={1.5}
                      fill="url(#miniGrad)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-6">No revenue yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions strip — only after onboarding, with content */}
        {showQuickActions && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Handshake, label: "Issue archive license", onClick: () => setArchiveModalOpen(true) },
              { icon: Tag, label: "Update pricing", onClick: () => navigate("/licensing") },
              { icon: UserPlus, label: "Invite team", onClick: () => navigate("/settings?tab=team") },
              {
                icon: Eye,
                label: "View public page",
                onClick: () => {
                  if (licensingHref) window.open(licensingHref, "_blank", "noreferrer");
                  else navigate("/settings");
                },
                disabled: !licensingHref,
              },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={a.disabled}
                aria-label={a.label}
                className="group flex items-center gap-3 bg-white rounded-xl border border-gray-200 hover:border-oxford/40 hover:shadow-popover shadow-popover transition-all px-4 py-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-9 h-9 rounded-lg bg-oxford-light text-oxford flex items-center justify-center shrink-0 group-hover:bg-oxford group-hover:text-white transition-colors">
                  <a.icon size={16} />
                </div>
                <span className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{a.label}</span>
                <ChevronRight size={14} className="text-gray-400 shrink-0 group-hover:text-oxford transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Recent Sales (last 5) */}
        {!isLoading && recentSales.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">Recent sales</h2>
              <Link to="/ledger" className="text-xs text-oxford hover:underline font-medium">
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {recentSales.map((sale) => {
                const isAi = sale.license_type === "ai" || sale.license_type === "ai_inference";
                const when = new Date(sale.created_at);
                const ago = (() => {
                  const mins = Math.floor((Date.now() - when.getTime()) / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days}d ago`;
                })();
                return (
                  <li key={sale.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAi ? "bg-oxford-light text-oxford" : "bg-pink-50 text-plum-magenta"}`}>
                      {isAi ? <Bot size={15} /> : <UserIcon size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{sale.asset_title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {sale.buyer_name || sale.buyer_email || "Buyer"} · {ago}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600 shrink-0">+{formatUSD(Number(sale.amount))}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Admin Platform Stats */}
        {isAdmin && (
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-gray-900">Platform</h2>
            {adminStatsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                    <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse mb-3" />
                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : adminStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-gray-500" />
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Publishers</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.total_publishers}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-gray-500" />
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Transactions</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.total_transactions}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={14} className="text-gray-500" />
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Platform Revenue</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatUSD(adminStats.total_revenue)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-gray-500" />
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Txns Today</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.transactions_today}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={14} className="text-gray-500" />
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Revenue Today</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatUSD(adminStats.revenue_today)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangleIcon size={14} className="text-amber-500" />
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Failed Webhooks</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.failed_webhooks_24h}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Failed to load platform stats.</p>
            )}
          </div>
        )}

        {licensingHref ? (
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-4">
            <LinkIcon className="w-4 h-4 shrink-0" />
            <span className="font-mono text-gray-700 truncate">{licensingUrl}</span>
            <button onClick={handleCopyUrl} className="shrink-0 text-oxford hover:underline text-xs font-medium">
              {urlCopied ? "Copied!" : "Copy"}
            </button>
            <a href={licensingHref} target="_blank" rel="noreferrer" className="shrink-0 text-oxford hover:underline text-xs font-medium">
              Preview ↗
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-4">
            Set your website URL in{" "}
            <Link to="/settings" className="text-oxford hover:underline font-medium">Settings</Link>
            {" "}to activate your licensing page.
          </p>
        )}

        {/* Inbound Email */}
        {inboundEmail && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="text-xs text-gray-500">Inbound email:</span>
            <code className="font-mono text-gray-700 text-xs truncate">{inboundEmail}</code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inboundEmail);
                  setInboundCopied(true);
                  setTimeout(() => setInboundCopied(false), 2000);
                } catch (err) { Sentry.captureException(err); }
              }}
              className="shrink-0 text-oxford hover:underline text-xs font-medium"
            >
              {inboundCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Ingestion progress (Session 1.6 IngestionTracker primitive,
            mounted on dashboard per Session 1.8 cleanup gate). Replaces
            the legacy ImportProgressBanner — see KNOWN_ISSUES #29. */}
        <IngestionTracker mode="dashboard" onComplete={fetchMetrics} />

        {/* Sources Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-900">Sources</h2>
            <Button
              size="sm"
              onClick={() => navigate("/setup?add=1")}
              className="h-9 px-4 rounded-lg bg-oxford hover:bg-oxford-dark text-white text-sm font-medium"
            >
              <Plus size={15} className="mr-1.5 flex-shrink-0" />
              Register content
            </Button>
          </div>
          <SourcesView key={sourcesKey} onAddSource={() => navigate("/setup?add=1")} />
        </div>
      </div>

      <IssueArchiveLicenseModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        onSuccess={() => { setArchiveModalOpen(false); fetchMetrics(); }}
      />

      {!tourCompletedAt && (
        <CoachMarks onComplete={() => setTourCompletedAt(new Date().toISOString())} />
      )}
    </DashboardLayout>
  );
}
