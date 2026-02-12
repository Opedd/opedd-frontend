import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { 
  Shield, 
  Plug,
  Palette,
  CreditCard,
  Wallet,
  Webhook,
  ExternalLink,
  CheckCircle,
  Circle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Trash2,
  Eye,
  Code2,
  AlertTriangle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { WidgetCustomizer } from "@/components/integrations/WidgetCustomizer";

interface StripeStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

interface WebhookStatus {
  configured: boolean;
  url: string | null;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status: "success" | "failed";
  status_code: number;
  timestamp: string;
}

interface EmbedSnippets {
  html_auto_detect: string;
  html_auto_detect_badge: string;
  wordpress_shortcode: string;
}

export default function Integrations() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  
  // Stripe state
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(true);
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);

  // Webhook state
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [webhookSecretCopied, setWebhookSecretCopied] = useState(false);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [isRemovingWebhook, setIsRemovingWebhook] = useState(false);

  // Embed snippets state
  const [embedSnippets, setEmbedSnippets] = useState<EmbedSnippets | null>(null);
  const [isLoadingSnippets, setIsLoadingSnippets] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState<string | null>(null);

  // AI Policy State
  const [aiDefenseEnabled, setAiDefenseEnabled] = useState(true);
  const [publisherId, setPublisherId] = useState<string | null>(null);

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

  // Initial data fetch
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch profile for webhook status + publisher ID
        const headers = await apiHeaders();
        const profileRes = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, { headers });
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          setPublisherId(profileResult.data.id);
          if (profileResult.data.webhook) {
            setWebhookStatus(profileResult.data.webhook);
          } else {
            setWebhookStatus({ configured: false, url: null });
          }
          if (profileResult.data.stripe_connect) {
            setStripeStatus(profileResult.data.stripe_connect);
          }
        }

        // Fetch Stripe status
        const stripeResult = await postAction("stripe_status");
        if (stripeResult.success && stripeResult.data) {
          setStripeStatus(stripeResult.data);
        }

        // Fetch embed snippets
        try {
          const snippetsResult = await postAction("generate_embed_snippets");
          if (snippetsResult.success && snippetsResult.data) {
            setEmbedSnippets(snippetsResult.data);
          }
        } catch { /* ignore */ }
      } catch (err) {
        console.warn("[Integrations] Load failed:", err);
        setWebhookStatus({ configured: false, url: null });
      } finally {
        setIsStripeLoading(false);
        setIsLoadingSnippets(false);
      }
    };
    setIsLoadingSnippets(true);
    load();
  }, [apiHeaders, postAction]);

  if (!user) return null;

  // --- Stripe handlers ---
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

  // --- Webhook handlers ---
  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setIsSavingWebhook(true);
    try {
      const result = await postAction("set_webhook", { webhook_url: webhookUrl.trim() });
      if (result.success && result.data) {
        setWebhookStatus({ configured: true, url: webhookUrl.trim() });
        if (result.data.webhook_secret) {
          setWebhookSecret(result.data.webhook_secret);
        }
        toast({ title: "Webhook Saved", description: "Your webhook endpoint has been configured." });
      } else {
        throw new Error(result.error?.message || "Failed to save webhook");
      }
    } catch (err: unknown) {
      toast({ title: "Save Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleRemoveWebhook = async () => {
    setIsRemovingWebhook(true);
    try {
      const result = await postAction("remove_webhook");
      if (result.success) {
        setWebhookStatus({ configured: false, url: null });
        setWebhookUrl("");
        setWebhookSecret(null);
        setShowDeliveries(false);
        setWebhookDeliveries([]);
        toast({ title: "Webhook Removed", description: "Your webhook endpoint has been removed." });
      } else {
        throw new Error(result.error?.message || "Failed to remove webhook");
      }
    } catch (err: unknown) {
      toast({ title: "Remove Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsRemovingWebhook(false);
    }
  };

  const handleViewDeliveries = async () => {
    setIsLoadingDeliveries(true);
    setShowDeliveries(true);
    try {
      const result = await postAction("webhook_deliveries");
      if (result.success && result.data) {
        setWebhookDeliveries(Array.isArray(result.data) ? result.data.slice(0, 20) : []);
      }
    } catch (err) {
      console.warn("[Integrations] Deliveries fetch failed:", err);
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  const handleCopyWebhookSecret = async () => {
    if (!webhookSecret) return;
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setWebhookSecretCopied(true);
      setTimeout(() => setWebhookSecretCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  // --- Embed Snippets ---
  const handleLoadSnippets = async () => {
    if (embedSnippets) return;
    setIsLoadingSnippets(true);
    try {
      const result = await postAction("generate_embed_snippets");
      if (result.success && result.data) {
        setEmbedSnippets(result.data);
      }
    } catch (err) {
      console.warn("[Integrations] Snippets fetch failed:", err);
    } finally {
      setIsLoadingSnippets(false);
    }
  };



  const handleCopySnippet = async (code: string, tab: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setSnippetCopied(tab);
      setTimeout(() => setSnippetCopied(null), 2000);
      toast({ title: "Copied!", description: "Snippet copied to clipboard." });
    } catch {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  // --- AI Defense ---
  const handlePreviewRobotsTxt = () => {
    if (!publisherId) return;
    window.open(
      `${EXT_SUPABASE_URL}/functions/v1/ai-defense-policy?publisher_id=${publisherId}&format=robots`,
      "_blank"
    );
  };

  // Stripe status helpers
  const isStripeFullyConnected = stripeStatus?.connected && stripeStatus?.onboarding_complete;
  const isStripePartial = stripeStatus?.connected && !stripeStatus?.onboarding_complete;

  const getStripeStatusBadge = () => {
    if (isStripeLoading) return <Loader2 size={14} className="animate-spin text-slate-400" />;
    if (isStripeFullyConnected) return (
      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle size={10} />Connected
      </Badge>
    );
    if (isStripePartial) return (
      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Circle size={10} />Pending
      </Badge>
    );
    return (
      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 gap-1">
        <XCircle size={10} />Not Connected
      </Badge>
    );
  };

  const getWebhookStatusBadge = () => {
    if (!webhookStatus) return <Loader2 size={14} className="animate-spin text-slate-400" />;
    if (webhookStatus.configured) return (
      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle size={10} />Configured
      </Badge>
    );
    return (
      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
        <Circle size={10} />Available
      </Badge>
    );
  };

  const supportedWebhookEvents = [
    "license.issued",
    "license.paid",
    "license.verified",
    "license.revoked",
  ];

  return (
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />

        <div className="p-8 pt-20 lg:pt-8 max-w-5xl w-full mx-auto space-y-10">
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A26ED] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
              <Plug size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Workflow Connectors</h1>
              <p className="text-[#040042]/60 text-sm">Connect external services to power your licensing workflows</p>
            </div>
          </div>

          {/* Section 1: Connectors Grid */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Plug size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">Connectors</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stripe Card */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <CreditCard size={22} className="text-[#635BFF]" />
                  </div>
                  {getStripeStatusBadge()}
                </div>
                <h3 className="font-semibold text-[#040042] text-sm">Stripe</h3>
                <p className="text-xs text-[#040042]/50 mt-1 flex-1">Receive payouts directly. Opedd charges a 10% platform fee.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isStripeFullyConnected ? handleOpenStripeDashboard : handleConnectStripe}
                  disabled={isStripeConnecting || isStripeLoading}
                  className="mt-4 w-full h-9 text-xs gap-1.5"
                >
                  {isStripeConnecting ? (
                    <><Loader2 size={12} className="animate-spin" /> Connecting...</>
                  ) : isStripeFullyConnected ? (
                    <><ExternalLink size={12} /> Open Dashboard</>
                  ) : isStripePartial ? (
                    <><ExternalLink size={12} /> Complete Setup</>
                  ) : (
                    <><ExternalLink size={12} /> Connect Stripe</>
                  )}
                </Button>
              </div>

              {/* Wallet Card — Coming Soon */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Wallet size={22} className="text-[#4A26ED]" />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">
                    Coming Soon
                  </Badge>
                </div>
                <h3 className="font-semibold text-[#040042] text-sm">Wallet Connect</h3>
                <p className="text-xs text-[#040042]/50 mt-1 flex-1">Link a crypto wallet for on-chain identity and IP registration</p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="mt-4 w-full h-9 text-xs gap-1.5"
                >
                  Notify Me
                </Button>
              </div>

              {/* Webhooks Card */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Webhook size={22} className="text-emerald-600" />
                  </div>
                  {getWebhookStatusBadge()}
                </div>
                <h3 className="font-semibold text-[#040042] text-sm">Webhooks</h3>
                <p className="text-xs text-[#040042]/50 mt-1 flex-1">Receive real-time events for licensing activity</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById("webhook-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-4 w-full h-9 text-xs gap-1.5"
                >
                  {webhookStatus?.configured ? "Manage" : "Configure"}
                </Button>
              </div>
            </div>
          </section>

          {/* Section 2: Webhook Configuration */}
          <section id="webhook-section" className="space-y-4">
            <div className="flex items-center gap-2">
              <Webhook size={18} className="text-emerald-600" />
              <h2 className="font-bold text-[#040042]">Webhooks</h2>
            </div>

            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm space-y-5">
              {webhookStatus?.configured ? (
                <>
                  {/* Configured state */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#040042]">Endpoint URL</p>
                      <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-md">
                        {webhookStatus.url || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewDeliveries}
                        disabled={isLoadingDeliveries}
                        className="h-8 text-xs gap-1.5"
                      >
                        {isLoadingDeliveries ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                        View Deliveries
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isRemovingWebhook}
                            className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            {isRemovingWebhook ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-[#040042]">
                              <AlertTriangle size={20} className="text-amber-500" />
                              Remove Webhook?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600">
                              This will permanently remove your webhook endpoint. You'll stop receiving event notifications.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRemoveWebhook}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            >
                              Yes, Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Deliveries table */}
                  {showDeliveries && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-[#040042]">Recent Deliveries</p>
                      </div>
                      {isLoadingDeliveries ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 size={20} className="animate-spin text-slate-400" />
                        </div>
                      ) : webhookDeliveries.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400">No deliveries yet</div>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                          {webhookDeliveries.map((d, i) => (
                            <div key={d.id || i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                              <div className="flex items-center gap-3">
                                <code className="text-[#040042] font-mono">{d.event_type}</code>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    d.status === "success"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-red-50 text-red-600 border-red-200"
                                  }`}
                                >
                                  {d.status === "success" ? "Success" : "Failed"}
                                </Badge>
                                <span className="text-slate-400">{d.status_code}</span>
                              </div>
                              <span className="text-slate-400">
                                {new Date(d.timestamp).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Not configured state */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-[#040042] mb-1">Webhook URL</p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://yoursite.com/api/webhooks/opedd"
                          className="bg-slate-50 border-slate-200 h-11 rounded-xl flex-1 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                        />
                        <Button
                          onClick={handleSaveWebhook}
                          disabled={isSavingWebhook || !webhookUrl.trim()}
                          className="h-11 px-5 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl font-medium"
                        >
                          {isSavingWebhook ? <Loader2 size={14} className="animate-spin" /> : "Save Webhook"}
                        </Button>
                      </div>
                    </div>

                    {/* Webhook secret display (shown once after creation) */}
                    {webhookSecret && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800 font-medium">Save this secret — it won't be shown again</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 overflow-hidden">
                            <code className="text-xs font-mono text-[#040042] truncate block">{webhookSecret}</code>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyWebhookSecret}
                            className="h-9 px-3 border-amber-200 hover:bg-amber-100 rounded-lg"
                          >
                            {webhookSecretCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Supported events */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Supported Events</p>
                      <div className="flex flex-wrap gap-1.5">
                        {supportedWebhookEvents.map((evt) => (
                          <Badge key={evt} variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600 border-slate-200">
                            {evt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Section 3: Widget Customizer */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-[#D1009A]" />
                <h2 className="font-bold text-[#040042]">Opedd Widget Customizer</h2>
              </div>
              <span className="text-xs text-[#040042]/50 bg-[#D1009A]/10 px-2 py-1 rounded-full">
                Embed on your site
              </span>
            </div>
            <p className="text-sm text-[#040042]/60 -mt-2">
              Design your licensing widget and get the embed code for your website.
            </p>
            
            <WidgetCustomizer publisherId={publisherId || user.id?.slice(0, 8) || "publisher"} />
          </section>

          {/* Section 4: Embed Snippets */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Code2 size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">Embed Snippets</h2>
            </div>

            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              {isLoadingSnippets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#4A26ED]" />
                </div>
              ) : embedSnippets ? (
                <Tabs defaultValue="html_auto" className="w-full">
                  <TabsList className="bg-slate-50 border border-slate-100 rounded-xl p-1 h-auto mb-4">
                    <TabsTrigger value="html_auto" className="text-xs rounded-lg px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      HTML (Auto-detect)
                    </TabsTrigger>
                    <TabsTrigger value="html_badge" className="text-xs rounded-lg px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      HTML (Badge)
                    </TabsTrigger>
                    <TabsTrigger value="wordpress" className="text-xs rounded-lg px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      WordPress
                    </TabsTrigger>
                  </TabsList>

                  {[
                    { value: "html_auto", code: embedSnippets.html_auto_detect },
                    { value: "html_badge", code: embedSnippets.html_auto_detect_badge },
                    { value: "wordpress", code: embedSnippets.wordpress_shortcode },
                  ].map(({ value, code }) => (
                    <TabsContent key={value} value={value}>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                          {code}
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopySnippet(code, value)}
                          className="absolute top-3 right-3 h-8 px-3 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-lg text-xs"
                        >
                          {snippetCopied === value ? <><Check size={12} className="mr-1" />Copied</> : <><Copy size={12} className="mr-1" />Copy</>}
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  <p>Could not load embed snippets.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadSnippets}
                    className="mt-3 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              )}

              <p className="text-xs text-slate-400 mt-4">
                Need per-article snippets? Find them on each article's detail page in your{" "}
                <a href="/dashboard" className="text-[#4A26ED] hover:underline">Registry</a>.
              </p>
            </div>
          </section>

          {/* Section 5: AI Defense Policy */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">AI Defense Policy</h2>
            </div>
            
            <div className="bg-gradient-to-br from-[#040042] via-[#0a0a5c] to-[#040042] rounded-xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#4A26ED] to-[#7C3AED] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#4A26ED]/30">
                    <Shield size={26} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Global AI Rights Enforcement</h3>
                    <p className="text-sm text-white/60 max-w-md leading-relaxed">
                      When enabled, Opedd automatically updates your headers and robots.txt to block scrapers that do not pay your required licensing fees.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Switch
                    checked={aiDefenseEnabled}
                    onCheckedChange={(checked) => {
                      setAiDefenseEnabled(checked);
                      toast({
                        title: checked ? "AI Defense Activated" : "AI Defense Disabled",
                        description: checked 
                          ? "Your content is now protected from unauthorized AI scraping."
                          : "AI crawlers can access your content freely.",
                      });
                    }}
                    className="data-[state=checked]:bg-emerald-500 scale-110"
                  />
                  <span className="text-xs text-white/40 mt-1">
                    {aiDefenseEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
              
              {aiDefenseEnabled && (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="text-xs text-white/40">robots.txt</div>
                        <div className="text-sm font-semibold text-white">Updated</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="text-xs text-white/40">ai.txt headers</div>
                        <div className="text-sm font-semibold text-white">Configured</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="text-xs text-white/40">Secure Rights Ledger</div>
                        <div className="text-sm font-semibold text-white">Registered</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview link */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviewRobotsTxt}
                      className="text-xs text-white/50 hover:text-white/80 hover:bg-white/5 gap-1.5"
                    >
                      <ExternalLink size={12} />
                      Preview robots.txt output
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
