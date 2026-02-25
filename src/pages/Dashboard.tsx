import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus, Sparkles } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { ImportProgressBanner } from "@/components/dashboard/ImportProgressBanner";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SourcesView } from "@/components/dashboard/SourcesView";
import { RegisterContentModal } from "@/components/dashboard/RegisterContentModal";
import { PublicationSetupFlow } from "@/components/dashboard/PublicationSetupFlow";
import { useToast } from "@/hooks/use-toast";
import { PaginatedResponse } from "@/types/asset";
import { DbAsset } from "@/types/asset";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { licenses } = useAuthenticatedApi();
  const [totalAssets, setTotalAssets] = useState(0);
  const [protectedCount, setProtectedCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"choice" | "publication" | "single" | "enterprise">("choice");
  const [modalKey, setModalKey] = useState(0);
  const [sourcesKey, setSourcesKey] = useState(0);

  // Check if user has any active publications (for setup flow vs dashboard)
  const [hasActivePublication, setHasActivePublication] = useState<boolean | null>(null);
  const [setupDismissed, setSetupDismissed] = useState(false);

  const checkPublications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, count } = await supabase
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

  useEffect(() => { checkPublications(); }, [checkPublications]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (!user) return null;
  if (hasActivePublication === null || (isLoading && totalAssets === 0)) return <PageLoader />;

  // Show setup flow if no active publications and not dismissed
  const showSetupFlow = !hasActivePublication && !setupDismissed;

  if (showSetupFlow) {
    return (
      <DashboardLayout title="Dashboard">
        <PublicationSetupFlow
          onComplete={() => {
            setSetupDismissed(true);
            setHasActivePublication(true);
            fetchMetrics();
            setSourcesKey(k => k + 1);
          }}
        />
      </DashboardLayout>
    );
  }

  const openRegisterModal = () => {
    setModalKey(k => k + 1);
    setModalInitialView("choice");
    setIsAddModalOpen(true);
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
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
          <h2 className="text-lg font-semibold text-[#040042] mb-4">Sources</h2>
          <SourcesView key={sourcesKey} onAddSource={openRegisterModal} />
        </div>
      </div>

      {/* Register Content Modal (for adding additional publications) */}
      <RegisterContentModal
        key={modalKey}
        open={isAddModalOpen}
        onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) setSourcesKey(k => k + 1); }}
        initialView={modalInitialView}
        onSuccess={() => {
          fetchMetrics();
          toast({
            title: "Content Protected",
            description: "Your content has been registered and synced to your library",
          });
        }}
      />
    </DashboardLayout>
  );
}
