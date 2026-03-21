import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { deriveSlug } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Webhook,
  Trash2,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  Info,
  Code2,
  Download,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { WidgetEmbedCard } from "@/components/dashboard/WidgetEmbedCard";
import { PublicationGate } from "@/components/dashboard/PublicationGate";

function deriveDomain(websiteUrl: string | null): string {
  if (!websiteUrl) return "";
  return websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0];
}

interface CodeBlockProps {
  code: string;
}

function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-green-400 font-mono text-sm rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1 transition-colors"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
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
  attempts?: number;
  max_attempts?: number;
}



export default function Connectors() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab === "widget" || tab === "webhooks" || tab === "ai-policy" ? tab : "widget";
  });

  // Webhook state
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [webhookSecretCopied, setWebhookSecretCopied] = useState(false);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [isRemovingWebhook, setIsRemovingWebhook] = useState(false);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const [publicationVerified, setPublicationVerified] = useState(false);
  const [pendingSources, setPendingSources] = useState<Array<{ id: string; name: string; url: string; verification_status: string; sync_status: string }>>([]);
  const [publisherEmail, setPublisherEmail] = useState<string | null>(null);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [discoveryLinkCopied, setDiscoveryLinkCopied] = useState(false);
  const [discoveryDownloading, setDiscoveryDownloading] = useState(false);

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
          setPublisherId(profileResult.data.id);
          if (profileResult.data.api_key) setApiKey(profileResult.data.api_key);
          if (profileResult.data.website_url) setWebsiteUrl(profileResult.data.website_url);
          setPublicationVerified(!!profileResult.data.publication_verified);
          setPendingSources(profileResult.data.pending_sources || []);
          setPublisherEmail(profileResult.data.email || null);
          if (profileResult.data.webhook) {
            setWebhookStatus(profileResult.data.webhook);
          } else {
            setWebhookStatus({ configured: false, url: null });
          }
          // If landing on widget tab and setup not yet complete, mark widget as viewed
          if (activeTab === "widget" && !profileResult.data.widget_added) {
            postAction("mark_widget_added").catch(() => {});
          }
        }
      } catch (err) {
        console.warn("[Connectors] Load failed:", err);
        setWebhookStatus({ configured: false, url: null });
      }
    };
    load();
  }, [apiHeaders]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setIsSavingWebhook(true);
    try {
      const result = await postAction("set_webhook", { webhook_url: webhookUrl.trim() });
      if (result.success && result.data) {
        setWebhookStatus({ configured: true, url: webhookUrl.trim() });
        if (result.data.webhook_secret) setWebhookSecret(result.data.webhook_secret);
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
      console.warn("[Connectors] Deliveries fetch failed:", err);
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    setRetryingDeliveryId(deliveryId);
    try {
      const result = await postAction("retry_webhook", { delivery_id: deliveryId });
      if (result.success !== false && !result.error) {
        toast({ title: "Webhook retried", description: "The delivery has been queued for retry." });
        // Refresh deliveries list
        handleViewDeliveries();
      } else {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : result.error?.message || "Retry failed"
        );
      }
    } catch (err: unknown) {
      toast({
        title: "Retry failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setRetryingDeliveryId(null);
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

  const supportedWebhookEvents = ["license.issued", "license.paid", "license.verified", "license.revoked"];

  const refetchProfile = async () => {
    try {
      const headers = await apiHeaders();
      const profileRes = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, { headers });
      const profileResult = await profileRes.json();
      if (profileResult.success && profileResult.data) {
        setPublicationVerified(!!profileResult.data.publication_verified);
        setPendingSources(profileResult.data.pending_sources || []);
      }
    } catch { /* fail silently */ }
  };

  return (
    <DashboardLayout title="Connectors">
      <PublicationGate
        isVerified={publicationVerified}
        pendingSources={pendingSources}
        onSourceDeleted={refetchProfile}
        adminEmail={publisherEmail}
      >
      <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Global tab style */}
          <div className="border-b border-[#E5E7EB]">
            <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0">
              {[
                { value: "widget", label: "Widget" },
                { value: "webhooks", label: "Webhooks" },
                { value: "ai-policy", label: "AI Policy" },
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

          {/* Widget Tab */}
          <TabsContent value="widget" className="mt-6">
            <div className="space-y-6">
              <WidgetCustomizer publisherId={publisherId || user.id?.slice(0, 8) || "publisher"} />
              <WidgetEmbedCard publisherId={publisherId || user.id?.slice(0, 8) || "publisher"} />
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="mt-6">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm space-y-5">
                {webhookStatus?.configured ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#040042]">Endpoint URL</p>
                        <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-md">{webhookStatus.url || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={async () => {
                          setIsSendingTest(true);
                          try {
                            const result = await postAction("test_webhook");
                            if (result.success) {
                              toast({ title: "Test event delivered successfully", description: "Your endpoint returned a 2xx response." });
                            } else {
                              toast({ title: "Delivery failed", description: "Check your endpoint returns 2xx", variant: "destructive" });
                            }
                          } catch {
                            toast({ title: "Delivery failed", description: "Check your endpoint returns 2xx", variant: "destructive" });
                          } finally {
                            setIsSendingTest(false);
                          }
                        }} disabled={isSendingTest} className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          {isSendingTest ? <Loader2 size={12} className="animate-spin" /> : <Webhook size={12} />}
                          Send Test Event
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleViewDeliveries} disabled={isLoadingDeliveries} className="h-8 text-xs gap-1.5 border-[#4A26ED]/30 text-[#4A26ED] hover:bg-[#4A26ED]/5">
                          {isLoadingDeliveries ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                          View Deliveries
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isRemovingWebhook} className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                              {isRemovingWebhook ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-[#040042]">
                                <AlertTriangle size={20} className="text-amber-500" />Remove Webhook?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-600">
                                This will permanently remove your webhook endpoint. You'll stop receiving event notifications.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRemoveWebhook} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                Yes, Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {showDeliveries && (
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                          <p className="text-xs font-semibold text-[#040042]">Recent Deliveries</p>
                        </div>
                        {isLoadingDeliveries ? (
                          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                        ) : webhookDeliveries.length === 0 ? (
                          <div className="text-center py-8 text-sm text-slate-400">No deliveries yet</div>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-[1fr_80px_60px_140px_36px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium border-b border-slate-100">
                              <span>Event</span>
                              <span>Status</span>
                              <span>Attempts</span>
                              <span>Last attempt</span>
                              <span></span>
                            </div>
                            {webhookDeliveries.map((d, i) => (
                              <div key={d.id || i} className="grid grid-cols-[1fr_80px_60px_140px_36px] gap-2 items-center px-4 py-2.5 text-xs">
                                <code className="text-[#040042] font-mono truncate">{d.event_type}</code>
                                <Badge variant="outline" className={`text-[10px] w-fit ${d.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                  {d.status === "success" ? "Success" : "Failed"}
                                </Badge>
                                <span className="text-slate-500">{d.attempts ?? "—"}/{d.max_attempts ?? 3}</span>
                                <span className="text-slate-400">{new Date(d.timestamp).toLocaleString()}</span>
                                <div className="flex items-center justify-end">
                                  {d.status === "failed" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={retryingDeliveryId === d.id}
                                      onClick={() => handleRetryDelivery(d.id)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-[#4A26ED] hover:bg-[#4A26ED]/10"
                                      title="Retry delivery"
                                    >
                                      {retryingDeliveryId === d.id
                                        ? <Loader2 size={12} className="animate-spin" />
                                        : <RotateCcw size={12} />}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-[#040042] mb-1">Webhook URL</p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://yoursite.com/api/webhooks/opedd"
                          className="bg-slate-50 border-slate-200 h-11 rounded-lg flex-1 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                        />
                        <Button
                          onClick={handleSaveWebhook}
                          disabled={isSavingWebhook || !webhookUrl.trim()}
                          className="h-11 px-5 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium"
                        >
                          {isSavingWebhook ? <Loader2 size={14} className="animate-spin" /> : "Save Webhook"}
                        </Button>
                      </div>
                    </div>

                    {webhookSecret && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-amber-800 font-medium">Save this secret — it won't be shown again</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info size={12} className="text-amber-600 cursor-help flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-xs">
                                  This secret signs all webhook payloads. Rotate it here if compromised.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 overflow-hidden">
                            <code className="text-xs font-mono text-[#040042] truncate block">{webhookSecret}</code>
                          </div>
                          <Button size="sm" variant="outline" onClick={handleCopyWebhookSecret} className="h-9 px-3 border-amber-200 hover:bg-amber-100 rounded-lg">
                            {webhookSecretCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Supported Events</p>
                      <div className="flex flex-wrap gap-1.5">
                        {supportedWebhookEvents.map((evt) => (
                          <Badge key={evt} variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600 border-slate-200">{evt}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>


          {/* AI Policy Tab */}
          <TabsContent value="ai-policy" className="mt-6">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={20} className="text-[#4A26ED]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#040042] text-lg">AI Crawler Defense Policy</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Automatically blocks 16 AI crawlers (GPTBot, Google-Extended, CCBot, etc.) from indexing your content without a license.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">robots.txt snippet</p>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-green-400 whitespace-pre leading-relaxed">{`User-agent: GPTBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /`}</pre>
                  </div>
                </div>

                {publisherId && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Your AI Policy URL</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                          <code className="text-xs text-[#040042] font-mono truncate block">
                            {`${EXT_SUPABASE_URL}/ai-defense-policy?publisher_id=${publisherId}`}
                          </code>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`${EXT_SUPABASE_URL}/ai-defense-policy?publisher_id=${publisherId}`);
                              toast({ title: "Copied", description: "robots.txt URL copied to clipboard." });
                            } catch { toast({ title: "Copy Failed", variant: "destructive" }); }
                          }}
                          className="h-11 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium flex-shrink-0"
                        >
                          <Copy size={14} className="mr-2" />Copy robots.txt URL
                        </Button>
                      </div>
                    </div>
                    <a
                      href={`${EXT_SUPABASE_URL}/ai-defense-policy?publisher_id=${publisherId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A26ED] hover:underline"
                    >
                      View AI Policy →
                    </a>
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  Add this URL to your site's robots.txt or use the Opedd WordPress plugin to apply it automatically.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </PublicationGate>
    </DashboardLayout>
  );
}
