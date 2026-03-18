import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus } from "lucide-react";

import { PageLoader } from "@/components/ui/PageLoader";
import { ImportProgressBanner } from "@/components/dashboard/ImportProgressBanner";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
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
  const [protectedCount, setProtectedCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sourcesKey, setSourcesKey] = useState(0);
  

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

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const result = await licenses.list<PaginatedResponse<DbAsset>>({ page: 1, limit: 1 });
      setTotalAssets(result.total);
      setProtectedCount(result.protectedCount);
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

  // Check referral_source from publisher profile
  const checkReferral = useCallback(async () => {
    if (!user) return;
    // If the user already submitted referral this session/browser, skip the modal
    if (localStorage.getItem("opedd_referral_done")) {
      setNeedsReferral(false);
      setReferralChecked(true);
      return;
    }
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const profile = json.success ? json.data : null;
      const hasReferral = !!profile?.referral_source;
      if (hasReferral) localStorage.setItem("opedd_referral_done", "1");
      setNeedsReferral(!hasReferral);
    } catch {
      setNeedsReferral(false);
    } finally {
      setReferralChecked(true);
    }
  }, [user, getAccessToken]);

  useEffect(() => { checkPublications(); }, [checkPublications]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { checkReferral(); }, [checkReferral]);
  

  if (!user) return null;
  if (hasActivePublication === null || !referralChecked) return <PageLoader />;

  const showBanner = !setupCompletion.pricingDone || !setupCompletion.widgetDone;

  return (
    <DashboardLayout
      title="Dashboard"
      headerActions={<></>}
    >
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Fix 3: Incomplete setup banner */}
        {showBanner && (
          <SetupBanner
            pricingDone={setupCompletion.pricingDone}
            widgetDone={setupCompletion.widgetDone}
            onSetPricing={() => setAddPubDrawerOpen(true)}
            onEmbedWidget={() => navigate("/connectors")}
          />
        )}
        {/* Onboarding Checklist */}
        <OnboardingChecklist onRegisterContent={() => setAddPubDrawerOpen(true)} />

        {/* Compact Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wide">Total Assets</p>
            <p className="text-2xl font-bold text-[#040042] mt-1">{totalAssets}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-emerald-600 text-xs font-medium uppercase tracking-wide">Protected</p>
            <p className="text-2xl font-bold text-[#040042] mt-1">{protectedCount}</p>
          </div>
          <div className="bg-[#0A0066] rounded-xl p-4 shadow-sm">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Import Progress Banner */}
        <ImportProgressBanner onComplete={fetchMetrics} />

        {/* Sources Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#040042]">Sources</h2>
            <Button
              size="sm"
              onClick={() => setAddPubDrawerOpen(true)}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white text-sm font-semibold"
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
