import React, { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus, Copy, ExternalLink, Check, Users, DollarSign, Activity, AlertTriangle as AlertTriangleIcon, Link as LinkIcon, Mail } from "lucide-react";

import { PageLoader } from "@/components/ui/PageLoader";
import { ImportProgressBanner } from "@/components/dashboard/ImportProgressBanner";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { deriveSlug } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SourcesView } from "@/components/dashboard/SourcesView";
// PublicationSetupFlow removed — "Add content" now routes to /setup
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { VerificationPendingBanner } from "@/components/dashboard/VerificationPendingBanner";
import { ReferralStep } from "@/components/dashboard/ReferralStep";
import { useToast } from "@/hooks/use-toast";
import { PaginatedResponse } from "@/types/asset";
import { DbAsset } from "@/types/asset";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
// Sheet imports removed — drawer replaced with /setup navigation

export default function Dashboard() {
  useDocumentTitle("Dashboard — Opedd");
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { licenses } = useAuthenticatedApi();
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sourcesKey, setSourcesKey] = useState(0);
  const [publisherSlug, setPublisherSlug] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [contentImported, setContentImported] = useState(false);
  const [pricingConfigured, setPricingConfigured] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [aiLicensingConfigured, setAiLicensingConfigured] = useState(false);
  const [aiLicenseTypes, setAiLicenseTypes] = useState<{ rag: boolean; training: boolean; inference: boolean } | null>(null);
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [inboundCopied, setInboundCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Referral step state
  const [referralChecked, setReferralChecked] = useState(false);
  const [needsReferral, setNeedsReferral] = useState(false);

  // Track incomplete setup steps for banner
  const [setupCompletion, setSetupCompletion] = useState<{ pricingDone: boolean; widgetDone: boolean }>({
    pricingDone: true,
    widgetDone: true,
  });


  const checkPublications = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from("rss_sources" as any)
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
      const result = await licenses.list<PaginatedResponse<DbAsset>>({ page: 1, limit: 1 });
      setTotalAssets(result.total);
      if (result.total > 0) {
        const fullResult = await licenses.list<PaginatedResponse<DbAsset>>({ page: 1, limit: 100 });
        const rev = (Array.isArray(fullResult.data) ? fullResult.data : []).reduce((sum: number, a: any) => sum + (a.total_revenue || 0), 0);
        setTotalRevenue(rev);
      }
    } catch (err: any) {
      console.warn("[Dashboard] Fetch error:", err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [user, licenses]);

  function isPricingConfigured(pricingRules: any): boolean {
    if (!pricingRules?.license_types) return false;
    return Object.values(pricingRules.license_types).some(
      (t: any) => t?.enabled && (t.price_per_article || t.price_annual || t.price_monthly || t.price_onetime || t.quote_only)
    );
  }

  // Fetch publisher profile — referral check + all checklist completion state
  const checkReferral = useCallback(async () => {
    if (!user) return;
    const skipReferralCheck = !!localStorage.getItem("opedd_referral_done");
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
      setSetupComplete(!!profile?.setup_complete);
      // Redirect to setup wizard if setup not complete
      if (!profile?.setup_complete) {
        navigate("/setup", { replace: true });
        return;
      }
      setAiLicensingConfigured(!!profile?.ai_license_types);
      setAiLicenseTypes(profile?.ai_license_types ?? null);
      if (profile?.inbound_email) setInboundEmail(profile.inbound_email);
      setIsAdmin(!!profile?.is_admin);
      if (!skipReferralCheck) {
        const hasReferral = !!profile?.referral_source;
        if (hasReferral) localStorage.setItem("opedd_referral_done", "1");
        setNeedsReferral(!hasReferral);
      } else {
        setNeedsReferral(false);
      }
    } catch {
      setNeedsReferral(false);
    } finally {
      setReferralChecked(true);
    }
  }, [user, getAccessToken]);

  // Fetch all dashboard data in parallel (not sequentially)
  useEffect(() => {
    Promise.all([checkPublications(), fetchMetrics(), checkReferral()]);
  }, [checkPublications, fetchMetrics, checkReferral]);

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
  if (hasActivePublication === null || !referralChecked) return <PageLoader />;

  const showBanner = !setupCompletion.pricingDone || !setupCompletion.widgetDone;
  const licensingUrl = publisherSlug ? `opedd.com/p/${publisherSlug}` : null;
  const licensingHref = publisherSlug ? `https://opedd.com/p/${publisherSlug}` : null;

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
        {/* Pending Earnings Card */}
        {!stripeConnected && (
          <div className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-sm" style={{ borderImage: "linear-gradient(135deg, #F59E0B, #D97706) 1" }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-lg font-bold text-[#040042] flex items-center gap-2">
                  💰 Pending Earnings: ${totalRevenue.toFixed(2)}
                </p>
                <p className="text-sm text-[#6B7280] mt-1">
                  {totalRevenue > 0
                    ? "Your earnings are accumulating. Connect your bank to start receiving payouts."
                    : "Once you make your first sale, your earnings will appear here."}
                </p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
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
                }}
                className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white shrink-0"
              >
                Connect Stripe →
              </Button>
            </div>
          </div>
        )}
        {/* Onboarding Checklist */}
        <OnboardingChecklist
          contentImported={contentImported}
          aiLicensingConfigured={aiLicensingConfigured}
          pricingConfigured={pricingConfigured}
          stripeConnected={stripeConnected}
          setupComplete={setupComplete}
          publisherSlug={publisherSlug}
          initialAiLicenseTypes={aiLicenseTypes}
          onRegisterContent={() => navigate("/setup")}
          onAiLicensingComplete={() => setAiLicensingConfigured(true)}
        />

        {/* Verification Pending Banner */}
        {totalAssets > 0 && !isLoading && (
          <VerificationPendingBanner />
        )}

        {/* Compact Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm min-h-[120px]">
            <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Licensed Works</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-[#F3F4F6] rounded-md mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-[#111827] mt-1">{totalAssets}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm min-h-[120px]">
            <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Total Revenue</p>
            {isLoading ? (
              <div className="h-8 w-20 bg-[#F3F4F6] rounded-md mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-[#111827] mt-1">${totalRevenue.toFixed(2)}</p>
            )}
          </div>
        </div>

        {/* Admin Platform Stats */}
        {isAdmin && (
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-[#111827]">Platform</h2>
            {adminStatsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                    <div className="h-3.5 w-20 bg-[#F3F4F6] rounded animate-pulse mb-3" />
                    <div className="h-8 w-16 bg-[#F3F4F6] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : adminStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-[#6B7280]" />
                    <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Publishers</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">{adminStats.total_publishers}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-[#6B7280]" />
                    <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Transactions</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">{adminStats.total_transactions}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={14} className="text-[#6B7280]" />
                    <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Platform Revenue</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">${adminStats.total_revenue.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-[#6B7280]" />
                    <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Txns Today</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">{adminStats.transactions_today}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={14} className="text-[#6B7280]" />
                    <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Revenue Today</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">${adminStats.revenue_today.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangleIcon size={14} className="text-amber-500" />
                    <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Failed Webhooks</p>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">{adminStats.failed_webhooks_24h}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#6B7280]">Failed to load platform stats.</p>
            )}
          </div>
        )}

        {licensingHref ? (
          <div className="flex items-center gap-3 text-sm text-[#6B7280] mt-4">
            <LinkIcon className="w-4 h-4 shrink-0" />
            <span className="font-mono text-[#374151] truncate">{licensingUrl}</span>
            <button onClick={handleCopyUrl} className="shrink-0 text-[#4A26ED] hover:underline text-xs font-medium">
              {urlCopied ? "Copied!" : "Copy"}
            </button>
            <a href={licensingHref} target="_blank" rel="noreferrer" className="shrink-0 text-[#4A26ED] hover:underline text-xs font-medium">
              Preview ↗
            </a>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280] mt-4">
            Set your website URL in{" "}
            <Link to="/settings" className="text-[#4A26ED] hover:underline font-medium">Settings</Link>
            {" "}to activate your licensing page.
          </p>
        )}

        {/* Inbound Email */}
        {inboundEmail && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="text-xs text-[#6B7280]">Inbound email:</span>
            <code className="font-mono text-[#374151] text-xs truncate">{inboundEmail}</code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inboundEmail);
                  setInboundCopied(true);
                  setTimeout(() => setInboundCopied(false), 2000);
                } catch (err) { Sentry.captureException(err); }
              }}
              className="shrink-0 text-[#4A26ED] hover:underline text-xs font-medium"
            >
              {inboundCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Import Progress Banner */}
        <ImportProgressBanner onComplete={fetchMetrics} />

        {/* Sources Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#111827]">Sources</h2>
            <Button
              size="sm"
              onClick={() => navigate("/setup")}
              className="h-9 px-4 rounded-lg bg-[#4A26ED] hover:bg-[#3B1ED1] text-white text-sm font-medium"
            >
              <Plus size={15} className="mr-1.5 flex-shrink-0" />
              Register content
            </Button>
          </div>
          <SourcesView key={sourcesKey} onAddSource={() => navigate("/setup")} />
        </div>
      </div>

      {needsReferral && (
        <ReferralStep onComplete={() => setNeedsReferral(false)} />
      )}
    </DashboardLayout>
  );
}
