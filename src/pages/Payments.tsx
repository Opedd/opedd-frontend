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
  AlertTriangle,
  Check,
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

interface PlanFeature {
  text: string;
}

interface Plan {
  key: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For publishers getting started",
    features: [
      { text: "Up to 500 articles" },
      { text: "Widget embedding" },
      { text: "Basic analytics" },
      { text: "Email support" },
    ],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "For growing independent publishers",
    features: [
      { text: "Unlimited articles" },
      { text: "Custom webhooks" },
      { text: "Team members (up to 3)" },
      { text: "Priority support" },
      { text: "Advanced analytics" },
    ],
    highlighted: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "$249",
    period: "/month",
    description: "For media organisations & large catalogs",
    features: [
      { text: "Everything in Pro" },
      { text: "Unlimited team members" },
      { text: "Custom integrations" },
      { text: "Dedicated support" },
      { text: "SLA guarantee" },
    ],
    highlighted: false,
  },
];

export default function Payments() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("plan");

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState<StripeConnect | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(true);
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);

  // Plan state
  const [publisherPlan, setPublisherPlan] = useState<string>("free");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isBillingPortalLoading, setIsBillingPortalLoading] = useState(false);

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
    const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
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
        const profileRes = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, { headers });
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          const d = profileResult.data;
          if (d.stripe_connect) setStripeStatus(d.stripe_connect);
          if (d.plan) setPublisherPlan(d.plan);
          if (d.stripe_customer_id) setStripeCustomerId(d.stripe_customer_id);
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
        window.location.href = result.data.onboarding_url;
      } else {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to start Stripe onboarding");
      }
    } catch (err: unknown) {
      toast({ title: "Stripe Connect Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
      setIsStripeConnecting(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    const newWindow = window.open("", "_blank");
    try {
      const result = await postAction("stripe_dashboard");
      if (result.success && result.data?.dashboard_url) {
        if (newWindow) newWindow.location.href = result.data.dashboard_url;
      } else {
        if (newWindow) newWindow.close();
        throw new Error(typeof result.error === "string" ? result.error : "Failed to open dashboard");
      }
    } catch (err: unknown) {
      if (newWindow) newWindow.close();
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    }
  };

  const handleUpgrade = async (plan: "pro" | "enterprise") => {
    setIsUpgrading(plan);
    try {
      const result = await postAction("create_subscription", { plan });
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to start checkout");
      }
    } catch (err: unknown) {
      toast({ title: "Upgrade Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
      setIsUpgrading(null);
    }
  };

  const handleBillingPortal = async () => {
    setIsBillingPortalLoading(true);
    const newWindow = window.open("", "_blank");
    try {
      const result = await postAction("billing_portal");
      if (result.success && result.data?.url) {
        if (newWindow) newWindow.location.href = result.data.url;
      } else {
        if (newWindow) newWindow.close();
        throw new Error(typeof result.error === "string" ? result.error : "Failed to open billing portal");
      }
    } catch (err: unknown) {
      if (newWindow) newWindow.close();
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsBillingPortalLoading(false);
    }
  };

  const isStripeFullyConnected = stripeStatus?.connected && stripeStatus?.onboarding_complete;
  const isStripePartial = stripeStatus?.connected && !stripeStatus?.onboarding_complete;

  return (
    <DashboardLayout title="Payments">
      <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-[#E5E7EB]">
            <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0">
              {[
                { value: "plan", label: "Plan" },
                { value: "stripe", label: "Stripe Connect" },
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

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[#040042] text-lg">Subscription Plan</h2>
                  <p className="text-[#6B7280] text-sm mt-0.5">
                    Current plan: <span className="font-semibold text-[#040042] capitalize">{publisherPlan}</span>
                  </p>
                </div>
                {stripeCustomerId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBillingPortal}
                    disabled={isBillingPortalLoading}
                    className="h-9 px-4 text-sm font-medium border-[#E5E7EB] text-[#040042] hover:bg-[#F9FAFB] rounded-lg"
                  >
                    {isBillingPortalLoading ? (
                      <Loader2 size={14} className="animate-spin mr-2" />
                    ) : (
                      <CreditCard size={14} className="mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}
              </div>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const isActive = publisherPlan === plan.key;
                  const isLoadingThis = isUpgrading === plan.key;
                  const anyUpgrading = isUpgrading !== null;

                  return (
                    <div
                      key={plan.key}
                      className={`relative rounded-xl border p-6 flex flex-col gap-4 transition-all ${
                        isActive
                          ? "border-[#4A26ED] bg-[#4A26ED]/[0.03] shadow-sm"
                          : plan.highlighted
                          ? "border-[#E5E7EB] bg-white shadow-sm"
                          : "border-[#E5E7EB] bg-white"
                      }`}
                    >
                      {/* Active badge */}
                      {isActive && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-[#4A26ED] text-white text-xs font-semibold px-3 py-0.5 rounded-full border-0">
                            Current plan
                          </Badge>
                        </div>
                      )}

                      {/* Most popular badge */}
                      {plan.highlighted && !isActive && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-[#040042] text-white text-xs font-semibold px-3 py-0.5 rounded-full border-0">
                            Most popular
                          </Badge>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{plan.name}</p>
                        <div className="flex items-end gap-1 mb-1">
                          <span className="text-3xl font-bold text-[#040042]">{plan.price}</span>
                          <span className="text-sm text-[#6B7280] mb-1">{plan.period}</span>
                        </div>
                        <p className="text-xs text-[#6B7280]">{plan.description}</p>
                      </div>

                      <ul className="space-y-2 flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-[#374151]">
                            <Check size={14} className={isActive ? "text-[#4A26ED]" : "text-emerald-500"} />
                            {feature.text}
                          </li>
                        ))}
                      </ul>

                      {isActive ? (
                        <div className="h-10 flex items-center justify-center rounded-lg border border-[#4A26ED]/30 bg-[#4A26ED]/5">
                          <CheckCircle2 size={14} className="text-[#4A26ED] mr-2" />
                          <span className="text-sm font-medium text-[#4A26ED]">Active</span>
                        </div>
                      ) : plan.key === "free" ? (
                        <div className="h-10 flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                          <span className="text-sm text-[#9CA3AF]">Downgrade</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan.key as "pro" | "enterprise")}
                          disabled={anyUpgrading}
                          className={`w-full h-10 text-sm font-semibold rounded-lg ${
                            plan.highlighted
                              ? "bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
                              : "bg-[#040042] hover:bg-[#0A0066] text-white"
                          }`}
                        >
                          {isLoadingThis ? (
                            <Loader2 size={14} className="animate-spin mr-2" />
                          ) : null}
                          {isLoadingThis ? "Redirecting..." : `Upgrade to ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Billing note */}
              <p className="text-xs text-[#9CA3AF] text-center">
                All plans billed monthly. Cancel anytime from the billing portal. Prices in USD.
              </p>
            </div>
          </TabsContent>

          {/* Stripe Connect Tab */}
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

                {isStripePartial && (
                  <div className="mb-4 rounded-lg border border-[#4A26ED]/20 bg-[#EEF0FF] p-4 flex items-center gap-3">
                    <AlertTriangle size={18} className="text-[#4A26ED] flex-shrink-0" />
                    <p className="flex-1 text-sm text-[#040042]">
                      Your Stripe account is connected but onboarding is incomplete. You won't receive payouts until you finish setup.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleConnectStripe}
                      disabled={isStripeConnecting}
                      className="flex-shrink-0 h-8 px-3 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white text-xs font-semibold rounded-lg"
                    >
                      {isStripeConnecting ? <Loader2 size={12} className="animate-spin" /> : "Complete Setup"}
                    </Button>
                  </div>
                )}

                {isStripeFullyConnected ? (
                  <div className="space-y-4">
                    {!stripeStatus?.payouts_enabled && (
                      <div className="rounded-lg border border-[#4A26ED]/20 bg-[#EEF0FF] p-4 flex items-center gap-3">
                        <AlertTriangle size={18} className="text-[#4A26ED] flex-shrink-0" />
                        <p className="flex-1 text-sm text-[#040042]">
                          Your Stripe account is connected but payouts are not yet enabled. Complete your Stripe identity verification to receive payments.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleOpenStripeDashboard}
                          className="flex-shrink-0 h-8 px-3 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white text-xs font-semibold rounded-lg"
                        >
                          Complete verification
                        </Button>
                      </div>
                    )}
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
