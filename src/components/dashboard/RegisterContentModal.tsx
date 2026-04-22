import React, { useState, useEffect, ReactNode } from "react";
import * as Sentry from "@sentry/react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  X,
  Link2,
  Code,
  Clipboard,
  Check,
  CheckCircle,
  CheckCircle2,
  Upload,
  File,
  FileUp,
  Globe,
  Copy,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";

const PLATFORM_LOGOS = {
  substack: substackLogo,
  ghost: ghostLogo,
  beehiiv: beehiivLogo,
  wordpress: wordpressLogo,
};

interface RegisterContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialView?: "choice" | "publication" | "single" | "enterprise";
  checkIntegrations?: boolean;
}

type ModalView = "choice" | "publication" | "single" | "enterprise" | "success";

function RegisterContentSubView({
  title,
  eyebrow,
  description,
  children,
  footer,
  showBack = false,
  onBack,
}: {
  title: string;
  eyebrow?: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col max-h-[90vh]">
      <div className="px-8 pt-8 pb-6 flex-shrink-0">
        {showBack && onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="-ml-1 mb-4 inline-flex h-8 items-center gap-1.5 rounded-lg pl-1 pr-2 text-xs font-medium text-gray-500 hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h2 className="text-[22px] font-semibold text-foreground leading-tight tracking-[-0.01em]">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-[44ch]">{description}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">{children}</div>

      {footer && (
        <div className="flex-shrink-0 px-8 py-5 bg-white border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
}

// Premium code surface — warm near-black, generous padding, monospace
function CodeSurface({
  code,
  onCopy,
  copied,
  ariaLabel,
  multiline = false,
}: {
  code: string;
  onCopy: () => void;
  copied: boolean;
  ariaLabel: string;
  multiline?: boolean;
}) {
  return (
    <div className="group relative rounded-xl bg-[#0F0E1A] border border-[#1F1D33] overflow-hidden">
      <div className={`px-5 py-4 ${multiline ? "pr-24" : "pr-20"}`}>
        <code className={`text-[13px] text-[#E4E2F5] font-mono leading-relaxed ${multiline ? "break-all block" : "truncate block"}`}>
          {code}
        </code>
      </div>
      <button
        onClick={onCopy}
        aria-label={ariaLabel}
        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-[#A8A4C7] bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95"
      >
        {copied ? (
          <><Check size={12} /> Copied</>
        ) : (
          <><Copy size={12} /> Copy</>
        )}
      </button>
    </div>
  );
}

// Quiet inline note — replaces traffic-light amber boxes
function InlineNote({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-gray-200 pl-3 py-0.5">
      <p className="text-xs text-gray-500 leading-relaxed italic">{children}</p>
    </div>
  );
}

const deriveFeedUrl = (siteUrl: string, platform: string): string => {
  const base = siteUrl.replace(/\/+$/, "");
  switch (platform) {
    case "ghost": return base + "/rss";
    case "wordpress": return base + "/feed";
    case "beehiiv": return base + "/feed";
    default: return base + "/feed";
  }
};

const detectPlatform = (url: string): { name: string; logo: string; supportsWidget: boolean } | null => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("substack.com")) return { name: "Substack", logo: PLATFORM_LOGOS.substack, supportsWidget: false };
  if (lowerUrl.includes("ghost.io") || lowerUrl.includes("ghost.org")) return { name: "Ghost", logo: PLATFORM_LOGOS.ghost, supportsWidget: true };
  if (lowerUrl.includes("beehiiv.com")) return { name: "Beehiiv", logo: PLATFORM_LOGOS.beehiiv, supportsWidget: true };
  if (lowerUrl.includes("wordpress.com") || lowerUrl.includes("wp.com")) return { name: "WordPress", logo: PLATFORM_LOGOS.wordpress, supportsWidget: true };
  return null;
};

const generateVerificationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const code = Array.from(bytes).map(b => chars[b % chars.length]).join("");
  return `OPEDD-${code}`;
};

const generateContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
};

export function RegisterContentModal({ open, onOpenChange, onSuccess, initialView = "choice", checkIntegrations = false }: RegisterContentModalProps) {
  const { toast } = useToast();
  const { user, getAccessToken } = useAuth();
  const { contentSources } = useAuthenticatedApi();
  const navigate = useNavigate();

  const [view, setView] = useState<ModalView>(initialView);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedVerification, setCopiedVerification] = useState(false);

  const [publisherProfileId, setPublisherProfileId] = useState<string | null>(null);
  const [publisherPlan, setPublisherPlan] = useState<string>("free");

  const [hasActiveIntegrations, setHasActiveIntegrations] = useState(true);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setView(initialView);
      setVerificationCode(generateVerificationCode());

      if (checkIntegrations && initialView === "publication" && user) {
        setIntegrationsLoading(true);
        (supabase as any)
          .from("content_sources")
          .select("id")
          .eq("user_id", user.id)
          .eq("sync_status", "active")
          .then(({ data }: { data: { id: string }[] | null }) => {
            setHasActiveIntegrations((data?.length || 0) > 0);
            setIntegrationsLoading(false);
          });
      }
    }
  }, [open, initialView, checkIntegrations, user]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: {
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const result = await res.json();
        if (result.success && result.data) {
          const pub = result.data.publisher || result.data;
          setPublisherProfileId(pub.id);
          if (pub.plan) setPublisherPlan(pub.plan);
        }
      } catch {
        // Profile fetch is best-effort for display only; render with defaults on failure
      }
    })();
  }, [open, user, getAccessToken]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAssetId, setRegisteredAssetId] = useState<string | null>(null);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [feedUrl, setFeedUrl] = useState("");
  const [pubHumanPrice, setPubHumanPrice] = useState("5.00");
  const [pubAiPrice, setPubAiPrice] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [humanPrice, setHumanPrice] = useState("5.00");
  const [aiPrice, setAiPrice] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "url">("file");

  const detectedPlatform = detectPlatform(feedUrl);

  const [feedPreview, setFeedPreview] = useState<{
    title: string;
    description: string;
    isLoading: boolean;
    error: string | null;
  } | null>(null);

  const [isConnecting, setIsConnecting] = useState(false);

  type SelectedPlatformType = "substack" | "beehiiv" | "ghost" | "wordpress" | "other" | null;
  const [pubStep, setPubStep] = useState<"select" | "import">("select");
  const [pubPlatform, setPubPlatform] = useState<SelectedPlatformType>(null);
  const [pubDomainInput, setPubDomainInput] = useState("");
  const [isSitemapImporting, setIsSitemapImporting] = useState(false);
  const [sitemapImportResult, setSitemapImportResult] = useState<{ count: number } | null>(null);
  const [detectedFeeds, setDetectedFeeds] = useState<{ sitemap_urls: string[]; rss_urls: string[]; estimated_article_count: number } | null>(null);
  const [isDetectingFeeds, setIsDetectingFeeds] = useState(false);
  const [selectedFeedUrl, setSelectedFeedUrl] = useState<string | null>(null);
  const [useRssFallback, setUseRssFallback] = useState(false);

  const [verificationState, setVerificationState] = useState<{
    token: string;
    platform: string;
    sourceId: string;
    sourceName: string;
    count: number;
    updatedCount: number;
  } | null>(null);
  const [inlineVerifyResult, setInlineVerifyResult] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [copiedInlineCode, setCopiedInlineCode] = useState<"none" | "visible" | "meta">("none");

  const [enterpriseOrgName, setEnterpriseOrgName] = useState("");
  const [enterpriseSitemapUrl, setEnterpriseSitemapUrl] = useState("");
  const [enterpriseHumanPrice, setEnterpriseHumanPrice] = useState("5.00");
  const [enterpriseAiPrice, setEnterpriseAiPrice] = useState("");

  useEffect(() => {
    if (feedUrl.length > 15 && feedUrl.includes('.')) {
      setFeedPreview({ title: '', description: '', isLoading: true, error: null });

      const timer = setTimeout(() => {
        const platform = detectPlatform(feedUrl);
        let pubName = 'Your Publication';
        try {
          const url = new URL(feedUrl.startsWith('http') ? feedUrl : `https://${feedUrl}`);
          pubName = url.hostname.split('.')[0];
          if (pubName === 'www') pubName = url.hostname.split('.')[1] || 'Your Publication';
          pubName = pubName.charAt(0).toUpperCase() + pubName.slice(1);
        } catch {
          // Invalid URL — fall through with the existing pubName default
        }

        setFeedPreview({
          title: platform ? `${pubName} on ${platform.name}` : pubName,
          description: `Articles from ${feedUrl}`,
          isLoading: false,
          error: null,
        });
      }, 800);

      return () => clearTimeout(timer);
    } else {
      setFeedPreview(null);
    }
  }, [feedUrl]);

  const resetForm = () => {
    setView("choice");
    setFeedUrl("");
    setPubHumanPrice("5.00");
    setPubAiPrice("");
    setTitle("");
    setDescription("");
    setArticleUrl("");
    setHumanPrice("5.00");
    setAiPrice("");
    setUploadedFile(null);
    setInputMode("file");
    setRegisteredAssetId(null);
    setCopiedWidget(false);
    setCopiedLink(false);
    setCopiedVerification(false);
    setEnterpriseOrgName("");
    setEnterpriseSitemapUrl("");
    setEnterpriseHumanPrice("5.00");
    setEnterpriseAiPrice("");
    setPubStep("select");
    setPubPlatform(null);
    setPubDomainInput("");
    setIsSitemapImporting(false);
    setSitemapImportResult(null);
    setDetectedFeeds(null);
    setIsDetectingFeeds(false);
    setSelectedFeedUrl(null);
    setUseRssFallback(false);
    setVerificationState(null);
    setInlineVerifyResult("idle");
    setCopiedInlineCode("none");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      setView(initialView);
    }
  }, [open]);

  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOCX, or TXT file",
        variant: "destructive",
      });
      return;
    }
    setUploadedFile(file);
    setInputMode("file");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const directPayLink = registeredAssetId
    ? `https://opedd.com/l/${registeredAssetId}`
    : "";
  const widgetCode = publisherProfileId
    ? `<script src="https://api.opedd.com/widget" data-publisher-id="${publisherProfileId}"></script>`
    : registeredAssetId
    ? `<script src="https://api.opedd.com/widget" data-asset-id="${registeredAssetId}"></script>`
    : "";

  const handleCopy = async (text: string, type: "widget" | "link" | "verification") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "widget") {
        setCopiedWidget(true);
        setTimeout(() => setCopiedWidget(false), 2000);
      } else if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedVerification(true);
        setTimeout(() => setCopiedVerification(false), 2000);
      }
      toast({
        title: "Copied!",
        description: type === "verification" ? "Verification code copied" : type === "widget" ? "Widget code copied to clipboard" : "Direct link copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const runSync = async (syncFeedUrl: string, syncHumanPrice: string, syncAiPrice: string, registrationPath: string = "newsletter_feed") => {
    if (!user) return;

    if (publisherPlan === "free") {
      const { count: otherSourceCount } = await (supabase as any)
        .from("content_sources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("url", syncFeedUrl);
      if ((otherSourceCount ?? 0) >= 1) {
        toast({
          title: "Source limit reached",
          description: "Free plan allows 1 content source. Upgrade to Pro for up to 10 sources.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsConnecting(true);

    try {
      const token = generateVerificationCode();
      const platform = detectPlatform(syncFeedUrl);
      const contentHash = generateContentHash(syncFeedUrl);
      const hasHuman = parseFloat(syncHumanPrice) > 0;
      const hasAi = syncAiPrice && parseFloat(syncAiPrice) > 0;
      const accessType = hasHuman && hasAi ? "both" : hasAi ? "ai" : "human";

      let pubName = "Your Publication";
      try {
        const url = new URL(syncFeedUrl.startsWith("http") ? syncFeedUrl : `https://${syncFeedUrl}`);
        pubName = url.hostname.split(".")[0];
        if (pubName === "www") pubName = url.hostname.split(".")[1] || "Your Publication";
        pubName = pubName.charAt(0).toUpperCase() + pubName.slice(1);
      } catch (err) { Sentry.captureException(err); }

      if (feedPreview?.title && registrationPath === "newsletter_feed") {
        const previewName = feedPreview.title;
        pubName = previewName.startsWith('Publication:') ? previewName.replace('Publication: ', '') : previewName;
      }

      const platformType = (platform?.name.toLowerCase() || "other") as "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      let rssSourceId = "";
      try {
        const { data: existingSource } = await (supabase as any)
          .from("content_sources")
          .select("id")
          .eq("user_id", user.id)
          .eq("url", syncFeedUrl)
          .maybeSingle();

        const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        if (existingSource?.id) {
          await (supabase as any).from("content_sources").update({
            verification_token: token,
            verification_token_expires_at: tokenExpiresAt,
            sync_status: "pending",
            last_sync_at: new Date().toISOString(),
            verification_status: "pending",
          }).eq("id", existingSource.id);
          rssSourceId = existingSource.id;
        } else {
          const { data: insertedSource } = await (supabase as any)
            .from("content_sources")
            .insert({
              user_id: user.id,
              name: pubName,
              url: syncFeedUrl,
              source_type: platformType,
              sync_status: "pending",
              last_sync_at: new Date().toISOString(),
              verification_token: token,
              verification_token_expires_at: tokenExpiresAt,
            })
            .select("id")
            .single();
          rssSourceId = insertedSource?.id || "";
        }
      } catch (localErr) {
        console.warn("[RegisterContentModal] Failed to insert/update local source:", localErr);
      }

      const syncRes = await fetch(`${EXT_SUPABASE_URL}/sync-content-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sourceUrl: syncFeedUrl, humanPrice: parseFloat(syncHumanPrice) || 0, aiPrice: parseFloat(syncAiPrice) || 0 }),
      });
      if (!syncRes.ok) {
        const errData = await syncRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || errData?.message || `Could not sync feed (${syncRes.status})`);
      }

      const syncData = await syncRes.json().catch(() => ({}));
      const importedCount = syncData.data?.items_imported ?? syncData.data?.items_found ?? 0;
      const updatedCount = syncData.data?.items_updated ?? 0;
      setIsConnecting(false);
      setVerificationState({
        token,
        platform: platformType,
        sourceId: rssSourceId,
        sourceName: pubName,
        count: importedCount,
        updatedCount,
      });
      onSuccess?.();
    } catch (error: any) {
      console.warn("[RegisterContentModal] Publication sync failed:", error?.message || error);
      setIsConnecting(false);
      setView("publication");

      const errorMsg = error?.message || "";
      const isPublisherNotFound = errorMsg.toLowerCase().includes("publisher not found");
      const isPlanLimit = errorMsg.toLowerCase().includes("plan") && (errorMsg.toLowerCase().includes("limit") || errorMsg.toLowerCase().includes("source"));

      toast({
        title: isPlanLimit ? "Article Limit Reached" : isPublisherNotFound ? "Publisher Profile Missing" : "Sync Failed",
        description: isPlanLimit
          ? errorMsg
          : isPublisherNotFound
          ? "Your publisher profile hasn't been created on the licensing network yet. Please complete your profile in Settings first."
          : `Could not sync publication: ${errorMsg || "Unknown error. Please try again."}`,
        variant: "destructive",
      });
    }
  };

  const handlePublicationSync = async () => {
    if (!feedUrl.trim()) {
      toast({
        title: "Feed URL Required",
        description: "Please enter your publication URL",
        variant: "destructive",
      });
      return;
    }

    if (!(parseFloat(pubHumanPrice) > 0)) {
      toast({
        title: "Price Required",
        description: "Please set a human license price greater than $0",
        variant: "destructive",
      });
      return;
    }

    await runSync(feedUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
  };

  const handleSingleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your work",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register content",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let publisherId: string;
      const { data: existingPublisher } = await (supabase as any)
        .from("publishers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingPublisher?.id) {
        publisherId = existingPublisher.id;
      } else {
        const { data: newPublisher, error: pubError } = await (supabase as any)
          .from("publishers")
          .insert({ user_id: user.id, name: user.email?.split("@")[0] || "My Publications" })
          .select("id")
          .single();
        if (pubError || !newPublisher?.id) throw new Error("Could not create publisher profile. Please try again.");
        publisherId = newPublisher.id;
      }

      const { data, error } = await (supabase as any)
        .from("licenses")
        .insert({
          publisher_id: publisherId,
          title: title,
          source_url: articleUrl || null,
          human_price: parseFloat(humanPrice) || 5,
          ai_price: aiPrice ? parseFloat(aiPrice) : null,
          licensing_enabled: true,
          status: "pending",
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      setRegisteredAssetId(data.id);
      setView("success");

      toast({
        title: "Content Protected",
        description: "Your work has been registered and is now protected",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Registration Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformIcons: { name: string; logo: string | null; platformKey: SelectedPlatformType }[] = [
    { name: "Substack", logo: PLATFORM_LOGOS.substack, platformKey: "substack" },
    { name: "Ghost", logo: PLATFORM_LOGOS.ghost, platformKey: "ghost" },
    { name: "Beehiiv", logo: PLATFORM_LOGOS.beehiiv, platformKey: "beehiiv" },
    { name: "WordPress", logo: PLATFORM_LOGOS.wordpress, platformKey: "wordpress" },
    { name: "Other", logo: null, platformKey: "other" },
  ];

  const handlePlatformSelect = (platformKey: SelectedPlatformType) => {
    setPubPlatform(platformKey);
    setPubStep("import");
    setPubDomainInput("");
    setDetectedFeeds(null);
    setSelectedFeedUrl(null);
    setUseRssFallback(false);
    setSitemapImportResult(null);
  };

  const importSitemap = async (sitemapUrl: string): Promise<number> => {
    setIsSitemapImporting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sitemap_url: sitemapUrl }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Import failed");
      handleClose();
      toast({
        title: "Import started",
        description: "We'll email you when it's done",
      });
      onSuccess?.();
      return result.data?.new_articles_inserted || 0;
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Could not import sitemap",
        variant: "destructive",
      });
      return -1;
    } finally {
      setIsSitemapImporting(false);
    }
  };

  const insertSourceWithToken = async (params: {
    feedUrl: string;
    platform: string;
    pubName: string;
    registrationPath: string;
  }): Promise<{ token: string; sourceId: string }> => {
    const tok = generateVerificationCode();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data: existing } = await (supabase as any)
        .from("content_sources")
        .select("id")
        .eq("user_id", user!.id)
        .eq("url", params.feedUrl)
        .maybeSingle();

      if (existing?.id) {
        await (supabase as any).from("content_sources").update({
          verification_token: tok,
          verification_token_expires_at: tokenExpiresAt,
          sync_status: "active",
          verification_status: "pending",
          last_sync_at: new Date().toISOString(),
        }).eq("id", existing.id);
        return { token: tok, sourceId: existing.id };
      }

      const { data } = await (supabase as any)
        .from("content_sources")
        .insert({
          user_id: user!.id,
          name: params.pubName,
          url: params.feedUrl,
          source_type: params.platform,
          sync_status: "active",
          last_sync_at: new Date().toISOString(),
          verification_token: tok,
          verification_token_expires_at: tokenExpiresAt,
        })
        .select("id")
        .single();
      return { token: tok, sourceId: data?.id || "" };
    } catch {
      return { token: tok, sourceId: "" };
    }
  };

  const detectFeeds = async (domain: string) => {
    setIsDetectingFeeds(true);
    setDetectedFeeds(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/detect-feeds?domain=${encodeURIComponent(domain)}`, {
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Feed detection failed (${res.status})`);
      const result = await res.json();
      if (result.success && result.data) {
        setDetectedFeeds(result.data);
      } else {
        setDetectedFeeds({ sitemap_urls: [], rss_urls: [], estimated_article_count: 0 });
      }
    } catch {
      setDetectedFeeds({ sitemap_urls: [], rss_urls: [], estimated_article_count: 0 });
    } finally {
      setIsDetectingFeeds(false);
    }
  };

  const handleRssImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rssUrl = `https://${domain}/feed`;
    setFeedUrl(rssUrl);
    setPubHumanPrice(pubHumanPrice);
    setPubAiPrice(pubAiPrice);
    await runSync(rssUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
  };

  const handleGhostImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rawName = domain.split(".")[0];
    const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const sitemapUrl = `https://${domain}/sitemap.xml`;

    if (useRssFallback) {
      const rssUrl = `https://${domain}/rss`;
      setFeedUrl(rssUrl);
      await runSync(rssUrl, pubHumanPrice, pubAiPrice, "sitemap_import");
      return;
    }

    const { token, sourceId } = await insertSourceWithToken({
      feedUrl: sitemapUrl,
      platform: "ghost",
      pubName,
      registrationPath: "sitemap_import",
    });

    const count = await importSitemap(sitemapUrl);
    if (count >= 0) {
      setVerificationState({ token, platform: "ghost", sourceId, sourceName: pubName, count, updatedCount: 0 });
      onSuccess?.();
    }
  };

  const handleWordpressImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rawName = domain.split(".")[0];
    const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    if (useRssFallback) {
      const rssUrl = `https://${domain}/feed`;
      setFeedUrl(rssUrl);
      await runSync(rssUrl, pubHumanPrice, pubAiPrice, "sitemap_import");
      return;
    }

    setIsDetectingFeeds(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/detect-feeds?domain=${encodeURIComponent(`https://${domain}`)}`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Feed detection failed (${res.status})`);
      const result = await res.json();
      setIsDetectingFeeds(false);

      if (result.success && result.data?.sitemap_urls?.length > 0) {
        const sitemapUrl = result.data.sitemap_urls[0];
        const { token: verifyToken, sourceId } = await insertSourceWithToken({
          feedUrl: sitemapUrl,
          platform: "wordpress",
          pubName,
          registrationPath: "sitemap_import",
        });
        const count = await importSitemap(sitemapUrl);
        if (count >= 0) {
          setVerificationState({ token: verifyToken, platform: "wordpress", sourceId, sourceName: pubName, count, updatedCount: 0 });
          onSuccess?.();
        }
      } else {
        toast({ title: "No sitemap found", description: "Try using feed import instead.", variant: "destructive" });
      }
    } catch {
      setIsDetectingFeeds(false);
      toast({ title: "Detection failed", description: "Could not detect feeds.", variant: "destructive" });
    }
  };

  const handleOtherDetect = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    await detectFeeds(`https://${domain}`);
  };

  const handleOtherConfirmImport = async () => {
    if (!selectedFeedUrl) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rawName = domain.split(".")[0];
    const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    if (selectedFeedUrl.includes("sitemap")) {
      const { token, sourceId } = await insertSourceWithToken({
        feedUrl: selectedFeedUrl,
        platform: "other",
        pubName,
        registrationPath: "sitemap_import",
      });
      const count = await importSitemap(selectedFeedUrl);
      if (count >= 0) {
        setVerificationState({ token, platform: "other", sourceId, sourceName: pubName, count, updatedCount: 0 });
        onSuccess?.();
      }
    } else {
      setFeedUrl(selectedFeedUrl);
      await runSync(selectedFeedUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
    }
  };

  const handleInlineVerify = async () => {
    if (!verificationState) return;
    setInlineVerifyResult("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await fetch(`${EXT_SUPABASE_URL}/verify-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ source_id: verificationState.sourceId }),
      });
      const result = await res.json();

      if (result.success && result.data?.verified) {
        setInlineVerifyResult("success");
      } else {
        setInlineVerifyResult("failed");
        if (result.data?.message) {
          toast({ title: "Not verified yet", description: result.data.message, variant: "destructive" });
        }
      }
    } catch {
      setInlineVerifyResult("failed");
    }
  };

  const PricingRow = ({
    humanValue,
    aiValue,
    onHumanChange,
    onAiChange,
  }: {
    humanValue: string;
    aiValue: string;
    onHumanChange: (v: string) => void;
    onAiChange: (v: string) => void;
  }) => (
    <div className="space-y-3 pt-5 border-t border-gray-100">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">What's it worth?</p>
        <p className="text-xs text-gray-400">Set per article — change anytime</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 font-normal">Human reader</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={humanValue}
              onChange={(e) => onHumanChange(e.target.value)}
              placeholder="5.00"
              className="h-11 pl-7 rounded-lg text-base"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 font-normal">AI / training</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={aiValue}
              onChange={(e) => onAiChange(e.target.value)}
              placeholder="25.00"
              className="h-11 pl-7 rounded-lg text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const DialogShell = ({
    children,
    size = "default",
  }: {
    children: ReactNode;
    size?: "default" | "wide" | "hero";
  }) => (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 overflow-hidden rounded-xl shadow-modal ${
          size === "hero" ? "sm:max-w-[640px]" : size === "wide" ? "sm:max-w-2xl" : "sm:max-w-xl"
        }`}
      >
        {children}
      </DialogContent>
    </Dialog>
  );

  if (view === "publication") {
    if (verificationState) {
      const { token: vToken, platform: vPlatform, sourceName: vSourceName, count: vCount } = verificationState;
      const noMetaTag = vPlatform === "substack" || vPlatform === "beehiiv";
      const isWordPress = vPlatform === "wordpress";
      const visibleCode = `Verify with Opedd: ${vToken}`;
      const metaCode = `<meta name="opedd-verification" content="${vToken}" />`;

      const platformInstructions: Record<string, string> = {
        substack: "Go to Substack Dashboard → Settings → Publication details → paste the code in your About section → Save.",
        beehiiv: "Go to beehiiv Dashboard → Settings → Publication → paste the code in your About section → Save.",
        ghost: "Go to Ghost Admin → Settings → Code Injection → Site Header → paste the meta tag → Save.",
        wordpress: "Add the meta tag to your theme's header.php, or install the Opedd plugin for one-click verification.",
        other: "Add the meta tag to your website's <head> section, or paste the visible code on your About page or homepage.",
      };
      const vInstructions = platformInstructions[vPlatform] || platformInstructions["other"];

      if (inlineVerifyResult === "success") {
        return (
          <DialogShell>
            <RegisterContentSubView
              title="Ownership Verified!"
              footer={
                <Button
                  onClick={() => { handleClose(); navigate("/content"); }}
                  className="w-full h-11"
                >
                  Go to Content Library
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              }
            >
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    <strong className="text-foreground">{vSourceName}</strong> is verified — licensing is now active for your content.
                  </p>
                  {vCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {vCount} articles imported and ready for licensing.
                    </p>
                  )}
                </div>
              </div>
            </RegisterContentSubView>
          </DialogShell>
        );
      }

      return (
        <DialogShell>
          <RegisterContentSubView
            title="Verify your publication"
            description={`Add the code below to prove you own ${vSourceName}. This unlocks licensing for your content.`}
            footer={
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <Button variant="outline" onClick={handleClose} className="sm:flex-1 h-11">
                  Verify Later
                </Button>
                <Button
                  onClick={handleInlineVerify}
                  disabled={inlineVerifyResult === "loading"}
                  className="sm:flex-1 h-11"
                >
                  {inlineVerifyResult === "loading" ? (
                    <><Spinner size="sm" />Verifying…</>
                  ) : inlineVerifyResult === "failed" ? (
                    <><RefreshCw size={16} />Try Again</>
                  ) : (
                    <>I've Added It <ArrowRight size={16} /></>
                  )}
                </Button>
              </div>
            }
          >
            {vCount > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800 font-medium">
                  {vCount} new articles imported · {verificationState?.updatedCount ?? 0} already existed
                </p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-medium">Verification Code</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xl md:text-2xl font-mono font-bold text-foreground tracking-[0.2em] leading-none">{vToken}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { navigator.clipboard.writeText(visibleCode); setCopiedInlineCode("visible"); setTimeout(() => setCopiedInlineCode("none"), 2000); }}
                  className="h-9 px-3 flex-shrink-0"
                >
                  {copiedInlineCode === "visible" ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy</>}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">{vInstructions}</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                  <Badge variant="outline" className="text-[10px] px-2 py-0 bg-oxford/10 text-oxford border-oxford/20 font-semibold">
                    {noMetaTag ? "Code" : "Option A"}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">Visible text — About / Bio</span>
                </div>
                <div className="p-3">
                  <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-3 flex items-center justify-between gap-3">
                    <code className="text-xs text-[#334155] font-mono truncate">{visibleCode}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(visibleCode); setCopiedInlineCode("visible"); setTimeout(() => setCopiedInlineCode("none"), 2000); }}
                      aria-label="Copy visible verification code"
                      className="text-gray-500 hover:text-foreground flex-shrink-0"
                    >
                      {copiedInlineCode === "visible" ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {!noMetaTag && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">Option B</Badge>
                    <span className="text-xs font-semibold text-foreground">
                      Hidden — Meta Tag
                      {isWordPress && <span className="text-gray-400 font-normal ml-1">(or install plugin)</span>}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-3 flex items-center justify-between gap-3">
                      <code className="text-xs text-[#334155] font-mono truncate">{metaCode}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(metaCode); setCopiedInlineCode("meta"); setTimeout(() => setCopiedInlineCode("none"), 2000); }}
                        aria-label="Copy verification meta tag"
                        className="text-gray-500 hover:text-foreground flex-shrink-0"
                      >
                        {copiedInlineCode === "meta" ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    {isWordPress && (
                      <p className="text-xs text-gray-500 mt-2">WordPress users can also use the <span className="text-oxford">Opedd plugin</span> for automatic verification.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {inlineVerifyResult === "failed" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Code not found yet. Make sure you've saved your changes, then try again.</p>
              </div>
            )}
          </RegisterContentSubView>
        </DialogShell>
      );
    }

    if (pubStep === "select") {
      return (
        <DialogShell>
          <RegisterContentSubView
            title="Sync Publication"
            description="Select your publishing platform — we'll recommend the best import method."
            footer={
              feedUrl.trim() ? (
                <Button
                  onClick={handlePublicationSync}
                  disabled={isSubmitting || isConnecting || !feedUrl.trim()}
                  className="w-full h-11"
                >
                  {isConnecting ? (
                    <><Spinner size="sm" />Connecting...</>
                  ) : (
                    <><Shield size={16} />Sync & Protect Content</>
                  )}
                </Button>
              ) : undefined
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {platformIcons.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handlePlatformSelect(platform.platformKey)}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-white border border-gray-200 hover:border-oxford hover:shadow-card transition-all duration-200 group cursor-pointer min-h-[88px]"
                >
                  <div className="w-9 h-9 flex items-center justify-center">
                    {platform.logo ? (
                      <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                    ) : (
                      <Globe size={26} className="text-gray-400 group-hover:text-oxford transition-colors" />
                    )}
                  </div>
                  <span className="text-xs text-foreground font-semibold leading-tight text-center">{platform.name}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Label className="text-sm font-medium text-foreground">Or paste a feed URL directly</Label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://yourname.substack.com/feed"
                  className="h-11 pl-10 rounded-lg"
                />
              </div>
            </div>
          </RegisterContentSubView>
        </DialogShell>
      );
    }

    const platformTitle =
      pubPlatform === "substack" ? "Substack Import"
      : pubPlatform === "beehiiv" ? "Beehiiv Import"
      : pubPlatform === "ghost" ? "Ghost Import"
      : pubPlatform === "wordpress" ? "WordPress Import"
      : "Import Content";

    return (
      <DialogShell>
        <RegisterContentSubView
          title={platformTitle}
          description="Connect your content source"
          showBack
          onBack={() => { setPubStep("select"); setPubPlatform(null); }}
          footer={
            !isSitemapImporting ? (
              <div className="space-y-2">
                {(pubPlatform === "substack" || pubPlatform === "beehiiv") && (
                  <Button
                    onClick={handleRssImport}
                    disabled={!pubDomainInput.trim() || isConnecting}
                    className="w-full h-11"
                  >
                    {isConnecting ? (
                      <><Spinner size="sm" />Importing...</>
                    ) : (
                      <><Globe size={16} />Import content</>
                    )}
                  </Button>
                )}

                {pubPlatform === "ghost" && !useRssFallback && (
                  <>
                    <Button
                      onClick={handleGhostImport}
                      disabled={!pubDomainInput.trim() || isSitemapImporting}
                      className="w-full h-11"
                    >
                      <Sparkles size={16} />
                      Import Full Archive (Sitemap)
                    </Button>
                    <button
                      onClick={() => setUseRssFallback(true)}
                      className="w-full text-center text-sm text-gray-500 hover:text-oxford transition-colors py-1"
                    >
                      Use feed import instead
                    </button>
                  </>
                )}
                {pubPlatform === "ghost" && useRssFallback && (
                  <Button
                    onClick={handleRssImport}
                    disabled={!pubDomainInput.trim() || isConnecting}
                    className="w-full h-11"
                  >
                    {isConnecting ? (
                      <><Spinner size="sm" />Importing...</>
                    ) : (
                      <><Globe size={16} />Import content</>
                    )}
                  </Button>
                )}

                {pubPlatform === "wordpress" && !useRssFallback && (
                  <>
                    <Button
                      onClick={handleWordpressImport}
                      disabled={!pubDomainInput.trim() || isDetectingFeeds || isSitemapImporting}
                      className="w-full h-11"
                    >
                      {isDetectingFeeds ? (
                        <><Spinner size="sm" />Detecting sitemap...</>
                      ) : (
                        <><Sparkles size={16} />Import Full Archive (Sitemap)</>
                      )}
                    </Button>
                    <button
                      onClick={() => setUseRssFallback(true)}
                      className="w-full text-center text-sm text-gray-500 hover:text-oxford transition-colors py-1"
                    >
                      Use feed import instead
                    </button>
                  </>
                )}
                {pubPlatform === "wordpress" && useRssFallback && (
                  <Button
                    onClick={handleRssImport}
                    disabled={!pubDomainInput.trim() || isConnecting}
                    className="w-full h-11"
                  >
                    {isConnecting ? (
                      <><Spinner size="sm" />Importing...</>
                    ) : (
                      <><Globe size={16} />Import content</>
                    )}
                  </Button>
                )}

                {pubPlatform === "other" && !detectedFeeds && (
                  <Button
                    onClick={handleOtherDetect}
                    disabled={!pubDomainInput.trim() || isDetectingFeeds}
                    className="w-full h-11"
                  >
                    {isDetectingFeeds ? (
                      <><Spinner size="sm" />Detecting feeds...</>
                    ) : (
                      <><Globe size={16} />Detect Feeds</>
                    )}
                  </Button>
                )}
                {pubPlatform === "other" && detectedFeeds && selectedFeedUrl && (
                  <Button
                    onClick={handleOtherConfirmImport}
                    disabled={isConnecting || isSitemapImporting}
                    className="w-full h-11"
                  >
                    {isConnecting || isSitemapImporting ? (
                      <><Spinner size="sm" />Importing...</>
                    ) : (
                      <><Sparkles size={16} />Import Content</>
                    )}
                  </Button>
                )}
                {pubPlatform === "other" && detectedFeeds && !selectedFeedUrl && detectedFeeds.sitemap_urls.length === 0 && detectedFeeds.rss_urls.length === 0 && (
                  <Button onClick={handleClose} variant="outline" className="w-full h-11">
                    Skip for now →
                  </Button>
                )}
              </div>
            ) : undefined
          }
        >
          {pubPlatform === "substack" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your Substack URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yourpublication.substack.com"
                  className="h-11 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Don't include https:// — just the domain</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Substack doesn't expose a full archive. We'll import your latest articles. New articles will auto-register when readers visit them via the widget.
                </p>
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />
            </>
          )}

          {pubPlatform === "beehiiv" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your Beehiiv URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yourpublication.beehiiv.com"
                  className="h-11 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Don't include https:// — just the domain</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Beehiiv doesn't expose a full archive. We'll import your latest articles. New articles will auto-register when readers visit them via the widget.
                </p>
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />
            </>
          )}

          {pubPlatform === "ghost" && !useRssFallback && (
            <>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 size={12} />
                Recommended: Full archive import
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your Ghost site URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yoursite.com"
                  className="h-11 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Don't include https:// — just the domain</p>
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />
            </>
          )}

          {pubPlatform === "ghost" && useRssFallback && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your Ghost site URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yoursite.com"
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Feed import will capture your latest ~50 articles. For a full archive, go back and use sitemap import.
                </p>
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />
            </>
          )}

          {pubPlatform === "wordpress" && !useRssFallback && (
            <>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 size={12} />
                Recommended: Full archive import
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your WordPress site URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yoursite.com"
                  className="h-11 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">WordPress sitemaps can contain your full article archive (thousands of articles).</p>
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />
            </>
          )}

          {pubPlatform === "wordpress" && useRssFallback && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your WordPress site URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yoursite.com"
                  className="h-11 rounded-lg"
                />
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />
            </>
          )}

          {pubPlatform === "other" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Enter your publication URL</Label>
                <Input
                  value={pubDomainInput}
                  onChange={(e) => setPubDomainInput(e.target.value)}
                  placeholder="yoursite.com"
                  className="h-11 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Don't include https:// — just the domain</p>
              </div>
              <PricingRow humanValue={pubHumanPrice} aiValue={pubAiPrice} onHumanChange={setPubHumanPrice} onAiChange={setPubAiPrice} />

              {detectedFeeds && (
                <div className="space-y-3">
                  {detectedFeeds.sitemap_urls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sitemap (recommended)</p>
                      {detectedFeeds.sitemap_urls.map((url) => (
                        <button
                          key={url}
                          onClick={() => setSelectedFeedUrl(url)}
                          className={`w-full p-3 rounded-lg border text-left text-sm transition-all ${
                            selectedFeedUrl === url
                              ? "border-oxford bg-oxford/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="font-medium text-foreground truncate">{url}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Full archive import</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {detectedFeeds.rss_urls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feeds</p>
                      {detectedFeeds.rss_urls.map((url) => (
                        <button
                          key={url}
                          onClick={() => setSelectedFeedUrl(url)}
                          className={`w-full p-3 rounded-lg border text-left text-sm transition-all ${
                            selectedFeedUrl === url
                              ? "border-oxford bg-oxford/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="font-medium text-foreground truncate">{url}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Latest articles</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {detectedFeeds.sitemap_urls.length === 0 && detectedFeeds.rss_urls.length === 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                      <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        No feeds detected. Articles will auto-register when readers visit them via the widget.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {isSitemapImporting && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Spinner size="md" className="text-oxford" />
              <p className="text-sm text-gray-500 font-medium">Importing your content...</p>
            </div>
          )}
        </RegisterContentSubView>
      </DialogShell>
    );
  }

  if (view === "single") {
    return (
      <DialogShell>
        <RegisterContentSubView
          title="Register Single Work"
          description="License an article, PDF, or text"
          showBack
          onBack={() => setView("choice")}
          footer={
            <Button
              onClick={handleSingleSubmit}
              disabled={isSubmitting}
              className="w-full h-11"
            >
              {isSubmitting ? (
                <><Spinner size="sm" />Registering...</>
              ) : (
                <><Shield size={16} />Protect & License</>
              )}
            </Button>
          }
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Future of AI Governance"
              className="h-11 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of your work..."
              rows={3}
              className="resize-none rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-foreground">Content Source</Label>
              <span className="text-xs text-gray-400">(choose one)</span>
            </div>

            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "url")} className="w-full">
              <TabsList className="w-full bg-gray-100 p-1 rounded-lg h-10">
                <TabsTrigger
                  value="file"
                  className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-card"
                >
                  <Upload size={14} />
                  Upload File
                </TabsTrigger>
                <TabsTrigger
                  value="url"
                  className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-card"
                >
                  <Link2 size={14} />
                  Article URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? "border-oxford bg-oxford/5"
                      : uploadedFile
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <File size={20} className="text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">{uploadedFile.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                        aria-label={`Remove uploaded file ${uploadedFile.name}`}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-foreground">Drop a file here or click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT</p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                    <Input
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      placeholder="https://example.com/your-article"
                      className="h-11 pl-10 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Link to your published article, blog post, or research paper
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-oxford" />
              <span className="text-sm font-semibold text-foreground">License Fees</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Human Republication *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">$</span>
                  <Input
                    type="number"
                    value={humanPrice}
                    onChange={(e) => setHumanPrice(e.target.value)}
                    placeholder="5.00"
                    className="h-11 pl-7 rounded-lg"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  AI Ingestion <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">$</span>
                  <Input
                    type="number"
                    value={aiPrice}
                    onChange={(e) => setAiPrice(e.target.value)}
                    placeholder="25.00"
                    className="h-11 pl-7 rounded-lg"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </RegisterContentSubView>
      </DialogShell>
    );
  }

  if (view === "enterprise") {
    const handleEnterpriseSubmit = async () => {
      if (!enterpriseOrgName.trim()) {
        toast({ title: "Organisation name required", variant: "destructive" });
        return;
      }
      const sitemapUrl = enterpriseSitemapUrl.trim();
      if (!sitemapUrl) {
        toast({ title: "Sitemap URL required", variant: "destructive" });
        return;
      }
      try { new URL(sitemapUrl); } catch {
        toast({ title: "Invalid sitemap URL", description: "Enter a full URL like https://example.com/sitemap.xml", variant: "destructive" });
        return;
      }
      if (!user) return;
      setIsConnecting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error("Not authenticated");

        await insertSourceWithToken({
          feedUrl: sitemapUrl,
          platform: "other",
          pubName: enterpriseOrgName.trim(),
          registrationPath: "bulk_enterprise",
        });

        fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ sitemap_url: sitemapUrl }),
        }).catch(() => {});

        setIsConnecting(false);
        onSuccess?.();
        handleClose();
        toast({
          title: "Import started",
          description: "Your article archive is being imported. Go to your dashboard and click \"Verify Ownership\" on the source when you're ready.",
        });
      } catch (error: any) {
        setIsConnecting(false);
        toast({
          title: "Registration Failed",
          description: error?.message || "Could not start import. Please try again.",
          variant: "destructive",
        });
      }
    };

    return (
      <DialogShell wide>
        <RegisterContentSubView
          title="Register Media Organisation"
          description="Bulk import your entire content archive"
          showBack
          onBack={() => setView("choice")}
          footer={
            <Button
              onClick={handleEnterpriseSubmit}
              disabled={isConnecting || !enterpriseOrgName.trim() || !enterpriseSitemapUrl.trim()}
              className="w-full h-11"
            >
              {isConnecting ? (
                <><Spinner size="sm" />Importing Archive…</>
              ) : (
                <><Globe size={16} />Import & Verify Ownership</>
              )}
            </Button>
          }
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Organisation Name</Label>
            <Input
              value={enterpriseOrgName}
              onChange={(e) => setEnterpriseOrgName(e.target.value)}
              placeholder="The Information"
              className="h-11 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Sitemap URL</Label>
            <Input
              value={enterpriseSitemapUrl}
              onChange={(e) => setEnterpriseSitemapUrl(e.target.value)}
              placeholder="https://theinformation.com/sitemap.xml"
              className="h-11 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Usually found at <code className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] font-mono px-1.5 py-0.5 rounded">yoursite.com/sitemap.xml</code> — imports up to 2,000 articles from your archive.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Human License Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={enterpriseHumanPrice}
                onChange={(e) => setEnterpriseHumanPrice(e.target.value)}
                placeholder="5.00"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                AI License Price ($) <span className="text-gray-400 font-normal">optional</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={enterpriseAiPrice}
                onChange={(e) => setEnterpriseAiPrice(e.target.value)}
                placeholder="—"
                className="h-11 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-oxford/5 border border-oxford/15 rounded-lg p-4 text-sm text-foreground/70 space-y-1">
            <p className="font-medium text-foreground">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>We import your full article archive from your sitemap (up to 2,000 articles)</li>
              <li>You add a small verification tag to your website's &lt;head&gt;</li>
              <li>Licensing goes live across all your content</li>
            </ol>
          </div>
        </RegisterContentSubView>
      </DialogShell>
    );
  }

  if (view === "choice") {
    return (
      <DialogShell>
        <RegisterContentSubView
          title="Register Content"
          description="Choose how you want to protect your work"
        >
          <div className="space-y-3">
            <button
              onClick={() => setView("publication")}
              className="group w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-oxford hover:shadow-card transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-oxford/10 flex items-center justify-center shrink-0 group-hover:bg-oxford transition-colors">
                  <Link2 size={20} className="text-oxford group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-semibold text-sm">Sync Newsletter / Site</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Automatically import and protect every new post via API or sitemap.</p>
                </div>
                <ArrowRight size={16} className="text-oxford opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>

            <button
              onClick={() => setView("single")}
              className="group w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-oxford hover:shadow-card transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors">
                  <FileUp size={20} className="text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-semibold text-sm">Register Single Work</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Protect a one-off article, op-ed, or research paper.</p>
                </div>
                <ArrowRight size={16} className="text-oxford opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>

            <button
              onClick={() => setView("enterprise")}
              className="group w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-plum-magenta hover:shadow-card transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-plum-magenta/10 flex items-center justify-center shrink-0 group-hover:bg-plum-magenta transition-colors">
                  <Globe size={20} className="text-plum-magenta group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-semibold text-sm">Bulk / Enterprise</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Add multiple feeds, sitemaps, and tag them by vertical.</p>
                </div>
                <ArrowRight size={16} className="text-plum-magenta opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>
          </div>
        </RegisterContentSubView>
      </DialogShell>
    );
  }

  if (view !== "success") {
    setView("publication");
    return null;
  }

  return (
    <DialogShell>
      <RegisterContentSubView
        title="Registration Complete"
        description="Your content is now protected"
        footer={
          <Button onClick={handleClose} className="w-full h-11">
            Done
          </Button>
        }
      >
        <div className="flex justify-center pt-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={28} className="text-emerald-600" />
          </div>
        </div>

        <Tabs defaultValue="widget" className="w-full">
          <TabsList className="w-full bg-gray-100 p-1 rounded-lg h-11">
            <TabsTrigger
              value="widget"
              className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-card"
            >
              <Code size={14} />
              Embed Widget
            </TabsTrigger>
            <TabsTrigger
              value="link"
              className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-card"
            >
              <Link2 size={14} />
              Direct Pay Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="widget" className="mt-4">
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-4 relative">
              <code className="text-xs text-[#334155] font-mono break-all leading-relaxed">
                {widgetCode}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCopy(widgetCode, "widget")}
                className="absolute top-2 right-2 h-8 px-3 text-xs"
              >
                {copiedWidget ? (
                  <><Check size={12} />Copied</>
                ) : (
                  <><Clipboard size={12} />Copy</>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Add this script tag to your website to enable licensing
            </p>
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2.5 overflow-hidden">
                <code className="text-sm text-[#334155] font-mono truncate block">
                  {directPayLink}
                </code>
              </div>
              <Button
                size="sm"
                onClick={() => handleCopy(directPayLink, "link")}
                className="h-9 px-4 text-xs flex-shrink-0"
              >
                {copiedLink ? (
                  <><Check size={12} />Copied</>
                ) : (
                  <><Clipboard size={12} />Copy</>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Share this link to accept payments directly
            </p>
          </TabsContent>
        </Tabs>
      </RegisterContentSubView>
    </DialogShell>
  );
}
