import React, { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus, Copy, ExternalLink, Check, Users, DollarSign, Activity, AlertTriangle as AlertTriangleIcon, Link as LinkIcon, Mail, ArrowUp, ArrowDown, Bot, User as UserIcon, FileText, UserPlus, Eye, ChevronRight, Handshake, Coins } from "lucide-react";
import { IssueArchiveLicenseModal } from "@/components/dashboard/IssueArchiveLicenseModal";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { IngestionTracker } from "@/components/IngestionTracker";
import { PartnershipHeader } from "@/components/dashboard/PartnershipHeader";
import { SetupBanner } from "@/components/dashboard/SetupBanner";
import { useWizardState } from "@/hooks/useWizardState";
import { shouldRedirectToWelcome } from "./welcome-redirect";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { stripeApi } from "@/lib/api";
import { derivePricingGaps, type PricingGap } from "@/lib/pricing-gaps";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SourcesView } from "@/components/dashboard/SourcesView";
// PublicationSetupFlow removed — "Add content" now routes to /setup
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
  const [pricingGaps, setPricingGaps] = useState<PricingGap[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState<boolean | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [inboundCopied, setInboundCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const wizardState = useWizardState();

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
  // Timestamp of the post-verification welcome screen completion. `null` = the
  // publisher has never seen Welcome (or its referral capture). Drives the
  // Session 1.9 redirect: when the wizard hook resolves with setup_state=
  // 'verified' AND welcomeCompletedAt is null AND profile loaded, Dashboard
  // navigates the publisher to /welcome before they ever see the dashboard
  // surface. ReferralStep's PATCH stamps welcome_completed_at server-side, so
  // a refresh after Welcome closes naturally returns truthy and skips the
  // redirect on the next mount.
  const [welcomeCompletedAt, setWelcomeCompletedAt] = useState<string | null>(null);

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
    } catch {
      setHasActivePublication(false);
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
      // KI #149 (closed 2026-05-06): read canonical publishers.slug
      // directly from the API response (post-tandem opedd-backend slice).
      // Pre-fix: derived client-side via deriveSlug(profile.website_url).
      // Backend `publisher-profile` GET now exposes the column populated
      // by migration 096 (KI #125 closure) so the publisher's licensing
      // URL preview matches the canonical slug used by sitemap/api routes.
      setPublisherSlug(profile?.slug ?? null);
      setContentImported(!!profile?.content_imported);
      setPricingConfigured(isPricingConfigured(profile?.pricing_rules));
      setPricingGaps(
        derivePricingGaps({
          pricing_rules: profile?.pricing_rules ?? null,
          default_human_price: profile?.default_human_price ?? null,
          default_ai_price: profile?.default_ai_price ?? null,
        })
      );
      setStripeConnected(!!profile?.stripe_onboarding_complete);
      setStripeAccountId(profile?.stripe_account_id ?? null);
      setVerificationStatus(profile?.verification_status ?? null);
      setStripePayoutsEnabled(
        profile?.stripe_connect ? !!profile.stripe_connect.payouts_enabled : null
      );
      setWelcomeCompletedAt(profile?.welcome_completed_at ?? null);
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

  // Session 1.9 — Welcome trigger rewire. When the wizard hook AND the
  // profile have both resolved, AND the publisher is in setup_state=
  // 'verified' AND has not yet completed Welcome, redirect to /welcome.
  // ReferralStep PATCHes welcome_completed_at server-side; on the next
  // dashboard mount profile loads with welcome_completed_at set, so this
  // effect short-circuits and the publisher proceeds straight to the
  // dashboard.
  //
  // Idempotency: replace:true on navigate prevents a back-button loop;
  // Welcome.tsx itself also gates on welcome_completed_at server-side
  // and redirects back to /dashboard if already set, so a stale
  // welcomeCompletedAt=null in this useEffect (right after Welcome
  // PATCHes but before Dashboard re-fetches) would land on /welcome,
  // see the truthy server value, and immediately redirect back. No loop.
  useEffect(() => {
    if (
      shouldRedirectToWelcome({
        isLoading: wizardState.isLoading,
        hasError: !!wizardState.error,
        setupState: wizardState.setupState,
        profileLoaded,
        welcomeCompletedAt,
      })
    ) {
      navigate("/welcome", { replace: true });
    }
  }, [
    wizardState.isLoading,
    wizardState.error,
    wizardState.setupState,
    profileLoaded,
    welcomeCompletedAt,
    navigate,
  ]);

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
  type BannerKind = "stripe-kyc" | "held-payments" | "not-payable" | "pricing-gap" | null;
  const activeBanner: BannerKind = (() => {
    const stripeKycPending =
      !!stripeAccountId && (!stripeConnected || stripePayoutsEnabled === false);
    if (stripeKycPending) return "stripe-kyc";
    const heldPayments = !stripeConnected && (totalRevenue > 0 || totalLicensesSold > 0);
    if (heldPayments) return "held-payments";
    // Phase 5.10-α: verified publisher hasn't started Stripe + has no
    // earnings yet. Buyers attempting purchases hard-fail at request
    // time with 422 PUBLISHER_NOT_PAYABLE per
    // _shared/stripe-eligibility.ts. Banner closes the publisher-side
    // nudge gap (we don't run a separate admin queue; this banner +
    // Sentry warning-level events are the entire surface).
    //
    // KI #115 fix: gate on `verification_status === 'verified'` (legacy
    // marketplace gate, load-bearing during 2-column soak window per
    // backend INVARIANTS) — NOT `wizardState.setupState === 'verified'`
    // (new 5-state machine, admin-approval-strict; empty-set in current
    // production state because admin hasn't transitioned soft-verified
    // publishers through the new machine yet). Soak-window soft-verified
    // publishers (verification_status='verified' + setup_state='connected')
    // ARE in publishers_public and ARE soliciting buyers — they're the
    // exact cohort that needs this banner.
    if (verificationStatus === "verified" && !stripeConnected) return "not-payable";
    // KI #126: post-KI-130 (license_type 4-vocab matrix accepted at
    // create-checkout / agent-purchase / api ?action=purchase|batch),
    // a wizard-onboarded publisher's enabled tiers can be reached by
    // buyers via combinations the wizard never priced. Resolver throws
    // PRICING_RULE_NOT_CONFIGURED at checkout. Banner nudges the
    // publisher to Settings/Pricing (Phase 5.4-β editor) before that
    // happens. Lowest priority — Stripe-side gates supersede.
    if (pricingGaps.length > 0) return "pricing-gap";
    return null;
  })();

  // Session 1.9 commit 3: rewired from `setupComplete && totalAssets > 0`
  // to use the wizard hook's setup_state directly. setupComplete was a
  // legacy boolean that paired 1:1 with setup_state==='verified' in the
  // 5-state machine; the wizard hook is now the canonical reader.
  const showQuickActions = wizardState.setupState === "verified" && totalAssets > 0;

  // KI #114 fix: migrated from inline raw-fetch + legacy `json.url` access
  // pattern to canonical `stripeApi.connect()` wrapper. Pre-fix bug:
  // backend returns `{ success: true, data: { onboarding_url, stripe_account_id } }`
  // (standard envelope per `_shared/cors.ts:successResponse`); inline handler
  // read `json.url` (always undefined) so `window.location.href` never fired.
  // Same bug class as the former `Setup.tsx:494` (migrated to wrapper at
  // Phase 3 Session 3.1). Affected 3 onClick sites sharing this handler:
  // stripe-kyc banner (KI #114), held-payments banner (untriggered in
  // production), not-payable banner (Phase 5.10-α). edgeFetch unwraps the
  // envelope to `StripeConnectResult` directly and throws on !success;
  // catch routes to Sentry instead of the prior silent `/* ignore */`.
  const handleConnectStripe = async () => {
    try {
      const token = await getAccessToken();
      const result = await stripeApi.connect("/dashboard", token);
      if (result.onboarding_url) {
        window.location.href = result.onboarding_url;
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { surface: "dashboard-connect-stripe" } });
    }
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
        {/* PartnershipHeader (Session 3.6): Opedd × publisher logo +
            name band, populated from publishers.branding_data
            (extract-branding output). Returns null until at least one
            of {logo_url, name} is populated, so pre-Step-2 publishers
            see no header band — keeps Dashboard quiet for prospects. */}
        <PartnershipHeader />

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

        {/* Phase 5.10-α: not-payable banner. Verified publisher who
            hasn't started Stripe Connect; no earnings accrued yet.
            Buyers hitting purchase endpoints currently get 422
            PUBLISHER_NOT_PAYABLE; this banner is the publisher-side
            nudge surface so the gap is visible without standing up
            an admin queue. Self-interest copy framing per founder
            direction (subject = publisher, impact = revenue). */}
        {activeBanner === "not-payable" && (
          <div className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <AlertTriangleIcon size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy-deep">
                    Connect Stripe to receive buyer payments.
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Buyers attempting to purchase your content currently receive an error. Complete Stripe Connect onboarding to start receiving payments.
                  </p>
                </div>
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

        {/* KI #126 (Phase 5.12 Cluster A): pricing-gap banner. Wizard's
            Step4Categorize collects only `default_human_price` /
            `default_ai_price` (legacy fallbacks for the 2 pre-Phase-5.4
            combos: human_per_article one_time + ai_retrieval subscription)
            plus `human_full_archive.price_annual`. Post-KI-130, buyers
            can hit create-checkout with the full 4-vocab matrix; the
            other combinations have no resolver-reachable price for a
            wizard-only publisher and throw PRICING_RULE_NOT_CONFIGURED.
            Banner CTA → Settings/Pricing (Phase 5.4-β editor) which
            covers the per-tier × per-payment-model surface in full. */}
        {activeBanner === "pricing-gap" && (
          <div className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <AlertTriangleIcon size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy-deep">
                    Some buyer payment options aren't priced yet.
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Buyers selecting these will see an error at checkout. Set the missing prices in Settings to open every payment path.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/settings/pricing")}
                className="bg-oxford hover:bg-oxford-dark text-white shrink-0"
              >
                Set prices →
              </Button>
            </div>
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
              // Phase 5.1 (2026-04-30): "Update pricing" quick action
              // dropped — /licensing now serves a placeholder while the
              // legacy editor is rebuilt against the canonical 4-type
              // vocab. Restore when the Settings page revision ships
              // (KI #66, Phase 4.7 OQ-D deferral).
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

        {/* Sources Section — Phase 4.7.3: section-heading "Register content" button
            removed per OQ.4 (single CTA via PublicationCard's "Import content" inside
            SourcesView). Section heading kept for layout structure. */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-900">Sources</h2>
          </div>
          <SourcesView key={sourcesKey} />
        </div>
      </div>

      <IssueArchiveLicenseModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        onSuccess={() => { setArchiveModalOpen(false); fetchMetrics(); }}
      />

    </DashboardLayout>
  );
}
