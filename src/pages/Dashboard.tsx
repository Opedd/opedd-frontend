import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus, Copy, ExternalLink, Check, Users, DollarSign, Activity, AlertTriangle as AlertTriangleIcon } from "lucide-react";

import { PageLoader } from "@/components/ui/PageLoader";
import { ImportProgressBanner } from "@/components/dashboard/ImportProgressBanner";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SourcesView } from "@/components/dashboard/SourcesView";
import { PublicationSetupFlow } from "@/components/dashboard/PublicationSetupFlow";
import { SetupBanner } from "@/components/dashboard/SetupBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { ReferralStep } from "@/components/dashboard/ReferralStep";
import { useToast } from "@/hooks/use-toast";
import { PaginatedResponse } from "@/types/asset";
import { DbAsset } from "@/types/asset";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Dashboard() {
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

  const ADMIN_EMAIL = "alexandre.n.bridi@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;

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
  const [addPubDrawerOpen, setAddPubDrawerOpen] = useState(false);

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
        .from("rss_sources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sync_status", "active");
      setHasActivePublication((count ?? 0) > 0);
    } catch {
      setHasActivePublication(false);
    }
  }, [user]);

  function deriveSlug(websiteUrl: string | null): string {
    if (!websiteUrl) return "";
    const domain = websiteUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0];
    return domain.split(".")[0].toLowerCase();
  }

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

  useEffect(() => { checkPublications(); }, [checkPublications]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { checkReferral(); }, [checkReferral]);

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
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Onboarding Checklist */}
        <OnboardingChecklist
          contentImported={contentImported}
          pricingConfigured={pricingConfigured}
          stripeConnected={stripeConnected}
          setupComplete={setupComplete}
          publisherSlug={publisherSlug}
          onRegisterContent={() => setAddPubDrawerOpen(true)}
        />

        {/* Compact Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Licensed Works</p>
            <p className="text-2xl font-bold text-[#111827] mt-1">{totalAssets}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-[#111827] mt-1">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Licensing Page Card */}
        <Card className="p-5 shadow-sm">
          {licensingHref ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Left: icon + text */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#4A26ED]/10 flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={18} className="text-[#4A26ED]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827]">Your Public Licensing Page</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">Share this link with buyers, media desks, and AI companies.</p>
                </div>
              </div>
              {/* Center: URL pill */}
              <div className="flex-1 min-w-0 sm:max-w-[280px]">
                <span className="block bg-[#F3F4F6] rounded-lg px-3 py-2 font-mono text-xs text-[#6B7280] truncate">
                  {licensingUrl}
                </span>
              </div>
              {/* Right: action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="h-8 px-3 text-xs font-medium gap-1.5"
                >
                  {urlCopied ? <Check size={13} /> : <Copy size={13} />}
                  {urlCopied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-8 px-3 text-xs font-medium bg-[#4A26ED] hover:bg-[#3B1ED1] text-white gap-1.5"
                >
                  <a href={licensingHref} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                    Preview
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                <ExternalLink size={18} className="text-[#9CA3AF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">Your Public Licensing Page</p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Set your website URL in{" "}
                  <Link to="/settings" className="text-[#4A26ED] hover:underline font-medium">Settings</Link>
                  {" "}to activate your page.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Import Progress Banner */}
        <ImportProgressBanner onComplete={fetchMetrics} />

        {/* Sources Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#111827]">Sources</h2>
            <Button
              size="sm"
              onClick={() => setAddPubDrawerOpen(true)}
              className="h-9 px-4 rounded-lg bg-[#4A26ED] hover:bg-[#3B1ED1] text-white text-sm font-medium"
            >
              <Plus size={15} className="mr-1.5 flex-shrink-0" />
              Register content
            </Button>
          </div>
          <SourcesView key={sourcesKey} onAddSource={() => setAddPubDrawerOpen(true)} />
        </div>
      </div>

      {/* Fix 5: Add Publication Drawer */}
      <Sheet open={addPubDrawerOpen} onOpenChange={setAddPubDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-[480px] w-full p-0 overflow-y-auto bg-white">
          <div className="px-6 py-5 border-b border-[#E5E7EB]">
            <SheetTitle className="text-[#111827] text-lg font-bold">Register your content</SheetTitle>
            <p className="text-sm text-[#6B7280] mt-0.5">Choose the type of content you want to protect and license.</p>
          </div>
          <PublicationSetupFlow
            onComplete={() => {
              setAddPubDrawerOpen(false);
              setHasActivePublication(true);
              fetchMetrics();
              setSourcesKey(k => k + 1);
              toast({
                title: "Content registered",
                description: "Your new content has been set up successfully",
              });
            }}
          />
        </SheetContent>
      </Sheet>

      {needsReferral && (
        <ReferralStep onComplete={() => setNeedsReferral(false)} />
      )}
    </DashboardLayout>
  );
}
