import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { OnboardingCards } from "@/components/dashboard/OnboardingCards";
import { SourcesView } from "@/components/dashboard/SourcesView";
import { RegisterContentModal } from "@/components/dashboard/RegisterContentModal";
import { useToast } from "@/hooks/use-toast";
import { PaginatedResponse } from "@/types/asset";
import { DbAsset } from "@/types/asset";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { licenses } = useAuthenticatedApi();
  const [totalAssets, setTotalAssets] = useState(0);
  const [protectedCount, setProtectedCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"choice" | "publication" | "single" | "enterprise">("choice");

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

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (!user) return null;

  const openRegisterModal = () => {
    setModalInitialView("choice");
    setIsAddModalOpen(true);
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            onClick={openRegisterModal}
            className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white h-9 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Register Content
          </button>
        </div>

        {/* Onboarding Cards — show when no assets */}
        {!isLoading && totalAssets === 0 && (
          <OnboardingCards
            onSyncClick={() => { setModalInitialView("publication"); setIsAddModalOpen(true); }}
            onRegisterClick={() => { setModalInitialView("single"); setIsAddModalOpen(true); }}
            onEnterpriseClick={() => { setModalInitialView("enterprise"); setIsAddModalOpen(true); }}
          />
        )}

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

        {/* Sources Section */}
        <div>
          <h2 className="text-lg font-semibold text-[#040042] mb-4">Sources</h2>
          <SourcesView onAddSource={openRegisterModal} />
        </div>
      </div>

      {/* Register Content Modal */}
      <RegisterContentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
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
