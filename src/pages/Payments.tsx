import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Wallet,
  Lock,
  ExternalLink,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface StripeConnect {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

export default function Payments() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("stripe");

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState<StripeConnect | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(true);
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);

  const apiHeaders = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");
    return {
      apikey: EXT_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }, [getAccessToken]);

  const postAction = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    const headers = await apiHeaders();
    const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  }, [apiHeaders]);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await apiHeaders();
        const profileRes = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, { headers });
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data?.stripe_connect) {
          setStripeStatus(profileResult.data.stripe_connect);
        }
        const stripeResult = await postAction("stripe_status");
        if (stripeResult.success && stripeResult.data) {
          setStripeStatus(stripeResult.data);
        }
      } catch (err) {
        console.warn("[Payments] Load failed:", err);
      } finally {
        setIsStripeLoading(false);
      }
    };
    load();
  }, [apiHeaders, postAction]);

  if (!user) return null;

  const handleConnectStripe = async () => {
    setIsStripeConnecting(true);
    try {
      const result = await postAction("connect_stripe");
      if (result.success && result.data?.onboarding_url) {
        window.open(result.data.onboarding_url, "_blank");
      } else {
        throw new Error(result.error?.message || "Failed to start Stripe onboarding");
      }
    } catch (err: unknown) {
      toast({ title: "Stripe Connect Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsStripeConnecting(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const result = await postAction("stripe_dashboard");
      if (result.success && result.data?.dashboard_url) {
        window.open(result.data.dashboard_url, "_blank");
      } else {
        throw new Error(result.error?.message || "Failed to open dashboard");
      }
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    }
  };

  const isStripeFullyConnected = stripeStatus?.connected && stripeStatus?.onboarding_complete;
  const isStripePartial = stripeStatus?.connected && !stripeStatus?.onboarding_complete;

  return (
    <DashboardLayout title="Payments">
      <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Global tab style */}
          <div className="border-b border-[#E5E7EB]">
            <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0">
              {[
                { value: "stripe", label: "Stripe" },
                { value: "wallet", label: "Wallet" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-[14px] font-normal tracking-tight text-[#6B7280] transition-colors data-[state=active]:border-[#4A26ED] data-[state=active]:text-[#4A26ED] data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-[#1f2937]"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Stripe Tab */}
          <TabsContent value="stripe" className="mt-6">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-[#040042] text-lg">Stripe Connect</h2>
                    <p className="text-[#6B7280] text-sm mt-0.5">Receive payouts directly to your bank</p>
                  </div>
                  {isStripeLoading ? (
                    <Loader2 size={18} className="animate-spin text-[#6B7280]" />
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                        isStripeFullyConnected
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isStripePartial
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-white text-[#6B7280] border-[#E5E7EB]"
                      }`}
                    >
                      {isStripeFullyConnected ? "Connected" : isStripePartial ? "Setup Incomplete" : "Not Connected"}
                    </Badge>
                  )}
                </div>

                {isStripeFullyConnected ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
                        {stripeStatus?.charges_enabled ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-red-400" />}
                        <div>
                          <p className="text-sm font-medium text-[#040042]">Charges</p>
                          <p className="text-xs text-[#6B7280]">{stripeStatus?.charges_enabled ? "Enabled" : "Disabled"}</p>
                        </div>
                      </div>
                      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
                        {stripeStatus?.payouts_enabled ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-red-400" />}
                        <div>
                          <p className="text-sm font-medium text-[#040042]">Payouts</p>
                          <p className="text-xs text-[#6B7280]">{stripeStatus?.payouts_enabled ? "Enabled" : "Disabled"}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenStripeDashboard}
                      className="w-full h-12 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium text-sm"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Open Stripe Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Shield size={18} className="text-[#6B7280] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[#040042] text-sm">Secure Payment Processing</p>
                          <p className="text-xs text-[#6B7280] mt-1">
                            Connect your Stripe account to receive payouts from content licensing.
                            Your financial data is encrypted and never stored on our servers.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleConnectStripe}
                      disabled={isStripeConnecting}
                      className="w-full h-12 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium text-sm"
                    >
                      {isStripeConnecting ? (
                        <><Loader2 size={16} className="mr-2 animate-spin" />Connecting...</>
                      ) : (
                        <>
                          <Lock size={16} className="mr-2" />
                          {isStripePartial ? "Complete Stripe Setup" : "Connect Stripe Account"}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="mt-6">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 shadow-sm text-center">
              <Wallet size={40} className="mx-auto text-[#D1D5DB] mb-4" />
              <h3 className="text-base font-semibold text-[#111] mb-1">Wallet Connect</h3>
              <p className="text-sm text-[#6B7280] max-w-xs mx-auto mb-4">
                Coming soon — accept crypto payments directly from your audience.
              </p>
              <Button disabled className="bg-[#4A26ED]/20 text-[#4A26ED]/50 rounded-lg cursor-not-allowed">
                Connect Wallet
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
