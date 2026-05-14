import React, { useState, useEffect, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <pre className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-sm rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs bg-slate-200 hover:bg-slate-300 text-gray-600 rounded px-2 py-1 transition-colors"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function Connectors() {
  useDocumentTitle("Distribution — Opedd");
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab === "widget" || tab === "ai-policy" ? tab : "widget";
  });

  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const [publicationVerified, setPublicationVerified] = useState(false);
  const [pendingSources, setPendingSources] = useState<Array<{ id: string; name: string; url: string; verification_status: string; sync_status: string }>>([]);
  const [publisherIsAdmin, setPublisherIsAdmin] = useState(false);
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
          setPublisherIsAdmin(!!profileResult.data.is_admin);
          // If landing on widget tab and setup not yet complete, mark widget as viewed
          if (activeTab === "widget" && !profileResult.data.widget_added) {
            postAction("mark_widget_added").catch(() => {});
          }
        }
      } catch (err) {
        console.warn("[Connectors] Load failed:", err);
      }
    };
    load();
  }, [apiHeaders]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

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
    <DashboardLayout title="Distribution" subtitle="How buyers and AI systems discover and license your content">
      <PublicationGate
        isVerified={publicationVerified}
        pendingSources={pendingSources}
        onSourceDeleted={refetchProfile}
        isAdmin={publisherIsAdmin}
      >
      <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Global tab style */}
          <div className="border-b border-gray-200">
            <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0">
              {[
                { value: "widget", label: "Widget" },
                { value: "ai-policy", label: "AI Policy" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-[14px] font-normal tracking-tight text-gray-500 transition-colors data-[state=active]:border-oxford data-[state=active]:text-oxford data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-gray-800"
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

          {/* AI Policy Tab */}
          <TabsContent value="ai-policy" className="mt-6">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-oxford/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={20} className="text-oxford" />
                  </div>
                  <div>
                    <h2 className="font-bold text-navy-deep text-lg">AI Crawler Defense Policy</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically blocks 16 AI crawlers (GPTBot, Google-Extended, CCBot, etc.) from indexing your content without a license.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">robots.txt snippet</p>
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-slate-700 whitespace-pre leading-relaxed">{`User-agent: GPTBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /`}</pre>
                  </div>
                </div>

                {publisherId && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Your AI Policy URL</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                          <code className="text-xs text-navy-deep font-mono truncate block">
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
                          className="h-11 px-4 bg-oxford hover:bg-oxford-dark text-white rounded-lg font-medium flex-shrink-0"
                        >
                          <Copy size={14} className="mr-2" />Copy robots.txt URL
                        </Button>
                      </div>
                    </div>
                    <a
                      href={`${EXT_SUPABASE_URL}/ai-defense-policy?publisher_id=${publisherId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-oxford hover:underline"
                    >
                      View AI Policy →
                    </a>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Add this URL to your site's robots.txt.
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
