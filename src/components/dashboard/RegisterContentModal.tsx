import React, { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
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
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { OnboardingCards } from "@/components/dashboard/OnboardingCards";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

// Platform logos — local SVG assets bundled by Vite (transparent, no CDN dependency)
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
  /** When true, shows empty state if no active integrations for "publication" view */
  checkIntegrations?: boolean;
}

type ModalView = "choice" | "publication" | "single" | "enterprise" | "success";

// Derive feed URL from a site URL based on platform
const deriveFeedUrl = (siteUrl: string, platform: string): string => {
  const base = siteUrl.replace(/\/+$/, ""); // strip trailing slashes
  switch (platform) {
    case "ghost": return base + "/rss";
    case "wordpress": return base + "/feed";
    case "beehiiv": return base + "/feed";
    default: return base + "/feed";
  }
};

// Detect platform from URL
const detectPlatform = (url: string): { name: string; logo: string; supportsWidget: boolean } | null => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("substack.com")) return { name: "Substack", logo: PLATFORM_LOGOS.substack, supportsWidget: false };
  if (lowerUrl.includes("ghost.io") || lowerUrl.includes("ghost.org")) return { name: "Ghost", logo: PLATFORM_LOGOS.ghost, supportsWidget: true };
  if (lowerUrl.includes("beehiiv.com")) return { name: "Beehiiv", logo: PLATFORM_LOGOS.beehiiv, supportsWidget: true };
  if (lowerUrl.includes("wordpress.com") || lowerUrl.includes("wp.com")) return { name: "WordPress", logo: PLATFORM_LOGOS.wordpress, supportsWidget: true };
  return null;
};

// Generate verification code/token
const generateVerificationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const code = Array.from(bytes).map(b => chars[b % chars.length]).join("");
  return `OPEDD-${code}`;
};

// Generate content hash from content string
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

  // Publisher profile ID (for widget code)
  const [publisherProfileId, setPublisherProfileId] = useState<string | null>(null);
  const [publisherPlan, setPublisherPlan] = useState<string>("free");
  
  // Check for active integrations (for empty state)
  const [hasActiveIntegrations, setHasActiveIntegrations] = useState(true);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  
  // Update view when initialView changes or modal opens
  useEffect(() => {
    if (open) {
      setView(initialView);
      setVerificationCode(generateVerificationCode());

      // Check for active integrations if needed
      if (checkIntegrations && initialView === "publication" && user) {
        setIntegrationsLoading(true);
        {next}
          .from("rss_sources")
          .select("id")
          .eq("user_id", user.id)
          .eq("sync_status", "active")
          .then(({ data }) => {
            setHasActiveIntegrations((data?.length || 0) > 0);
            setIntegrationsLoading(false);
          });
      }
    }
  }, [open, initialView, checkIntegrations, user]);

  // Fetch publisher profile ID for widget code
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
        // Non-critical — widget code will fall back to asset ID
      }
    })();
  }, [open, user, getAccessToken]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAssetId, setRegisteredAssetId] = useState<string | null>(null);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Publication sync form
  const [feedUrl, setFeedUrl] = useState("");
  const [pubHumanPrice, setPubHumanPrice] = useState("4.99");
  const [pubAiPrice, setPubAiPrice] = useState("");
  

  // Single work form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "url">("file");

  const detectedPlatform = detectPlatform(feedUrl);
  
  // Feed preview state
  const [feedPreview, setFeedPreview] = useState<{
    title: string;
    description: string;
    isLoading: boolean;
    error: string | null;
  } | null>(null);
  
  // Connecting state (for triggering content import)
  const [isConnecting, setIsConnecting] = useState(false);

  // Platform-specific import step state
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

  // Inline verification state (shown after import completes)
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

  // Enterprise (Media Org) state
  const [enterpriseOrgName, setEnterpriseOrgName] = useState("");
  const [enterpriseSitemapUrl, setEnterpriseSitemapUrl] = useState("");
  const [enterpriseHumanPrice, setEnterpriseHumanPrice] = useState("4.99");
  const [enterpriseAiPrice, setEnterpriseAiPrice] = useState("");

  // Simulate fetching feed metadata when URL changes
  useEffect(() => {
    if (feedUrl.length > 15 && feedUrl.includes('.')) {
      setFeedPreview({ title: '', description: '', isLoading: true, error: null });
      
      // Simulate fetching feed metadata
      const timer = setTimeout(() => {
        const platform = detectPlatform(feedUrl);
        // Extract publication name from URL
        let pubName = 'Your Publication';
        try {
          const url = new URL(feedUrl.startsWith('http') ? feedUrl : `https://${feedUrl}`);
          pubName = url.hostname.split('.')[0];
          if (pubName === 'www') pubName = url.hostname.split('.')[1] || 'Your Publication';
          pubName = pubName.charAt(0).toUpperCase() + pubName.slice(1);
        } catch {
          // Use default
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
    setPubHumanPrice("4.99");
    setPubAiPrice("");
    setTitle("");
    setDescription("");
    setArticleUrl("");
    setHumanPrice("4.99");
    setAiPrice("");
    setUploadedFile(null);
    setInputMode("file");
    setRegisteredAssetId(null);
    setCopiedWidget(false);
    setCopiedLink(false);
    setCopiedVerification(false);
    setEnterpriseOrgName("");
    setEnterpriseSitemapUrl("");
    setEnterpriseHumanPrice("4.99");
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

  // Reset all state whenever the modal is opened fresh
  useEffect(() => {
    if (open) {
      resetForm();
      setView(initialView);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // File handling
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

  // Generate distribution links
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

  // Core sync logic — used by both feed form and widget install path
  const runSync = async (syncFeedUrl: string, syncHumanPrice: string, syncAiPrice: string, registrationPath: string = "newsletter_feed") => {
    if (!user) return;

    // Free plan: max 1 content source
    if (publisherPlan === "free") {
      const { count: otherSourceCount } = await {next}
        .from("rss_sources")
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
      // Generate verification token
      const token = generateVerificationCode();

      // Detect platform from URL for metadata
      const platform = detectPlatform(syncFeedUrl);

      // Generate content hash from feed URL
      const contentHash = generateContentHash(syncFeedUrl);

      // Determine access type based on pricing
      const hasHuman = parseFloat(syncHumanPrice) > 0;
      const hasAi = syncAiPrice && parseFloat(syncAiPrice) > 0;
      const accessType = hasHuman && hasAi ? "both" : hasAi ? "ai" : "human";

      // Extract pub name from URL
      let pubName = "Your Publication";
      try {
        const url = new URL(syncFeedUrl.startsWith("http") ? syncFeedUrl : `https://${syncFeedUrl}`);
        pubName = url.hostname.split(".")[0];
        if (pubName === "www") pubName = url.hostname.split(".")[1] || "Your Publication";
        pubName = pubName.charAt(0).toUpperCase() + pubName.slice(1);
      } catch (err) { Sentry.captureException(err); }

      // Use feed preview name if available (only for feed form path)
      if (feedPreview?.title && registrationPath === "newsletter_feed") {
        const previewName = feedPreview.title;
        pubName = previewName.startsWith('Publication:') ? previewName.replace('Publication: ', '') : previewName;
      }

      // Step 1: Get access token for authenticated edge function calls
      const platformType = (platform?.name.toLowerCase() || "other") as "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      // Step 2: Insert local content_sources record — capture ID for inline verification
      let rssSourceId = "";
      try {
        // Check for existing source first (re-registration after delete)
        const { data: existingSource } = await {next}
          .from("rss_sources")
          .select("id")
          .eq("user_id", user.id)
          .eq("url", syncFeedUrl)
          .maybeSingle();

        const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        if (existingSource?.id) {
          // Update existing source with new token
          await (supabase as any).from("rss_sources").update({
            verification_token: token,
            verification_token_expires_at: tokenExpiresAt,
            sync_status: "pending",
            last_sync_at: new Date().toISOString(),
            verification_status: "pending",
          }).eq("id", existingSource.id);
          rssSourceId = existingSource.id;
        } else {
          const { data: insertedSource } = await {next}
            .from("rss_sources")
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

      // Step 3: Trigger content sync BEFORE showing animation — surface real errors
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

      // Step 4: Sync succeeded — show inline verification step
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
      setView("publication"); // return user to the form, don't leave them on syncing screen

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
      // Look up publisher record for this user — auto-create a minimal one if it doesn't exist yet
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

      // Write to licenses table (same as imported articles — shows in dashboard + content library)
      const { data, error } = await (supabase as any)
        .from("licenses")
        .insert({
          publisher_id: publisherId,
          title: title,
          source_url: articleUrl || null,
          human_price: parseFloat(humanPrice) || 4.99,
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

  // Platform icons for display with placeholders
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

  // Import sitemap helper — fires import and returns immediately (queued)
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
      // Close modal immediately and show toast — import runs in background
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

  // Helper: insert (or update) a content_sources record with a fresh verification token
  const insertSourceWithToken = async (params: {
    feedUrl: string;
    platform: string;
    pubName: string;
    registrationPath: string;
  }): Promise<{ token: string; sourceId: string }> => {
    const tok = generateVerificationCode();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data: existing } = await {next}
        .from("rss_sources")
        .select("id")
        .eq("user_id", user!.id)
        .eq("url", params.feedUrl)
        .maybeSingle();

      if (existing?.id) {
        await (supabase as any).from("rss_sources").update({
          verification_token: tok,
          verification_token_expires_at: tokenExpiresAt,
          sync_status: "active",
          verification_status: "pending",
          last_sync_at: new Date().toISOString(),
        }).eq("id", existing.id);
        return { token: tok, sourceId: existing.id };
      }

      const { data } = await {next}
        .from("rss_sources")
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

  // Detect feeds helper
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

  // Handle feed import for Substack/Beehiiv
  const handleRssImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rssUrl = `https://${domain}/feed`;
    setFeedUrl(rssUrl);
    setPubHumanPrice(pubHumanPrice);
    setPubAiPrice(pubAiPrice);
    await runSync(rssUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
  };

  // Handle Ghost import — sitemap first, verification after
  const handleGhostImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rawName = domain.split(".")[0];
    const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const sitemapUrl = `https://${domain}/sitemap.xml`;

    if (useRssFallback) {
      // Sync fallback — use runSync which handles content_sources + verificationState
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

  // Handle WordPress import — detect sitemap, verification after
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

  // Handle Other platform — detect feeds
  const handleOtherDetect = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    await detectFeeds(`https://${domain}`);
  };

  // Handle confirmed import from Other platform detected feed
  const handleOtherConfirmImport = async () => {
    if (!selectedFeedUrl) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rawName = domain.split(".")[0];
    const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    if (selectedFeedUrl.includes("sitemap")) {
      // Sitemap path — insert source record with token, then import
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
      // Feed sync — runSync handles content_sources insert + verificationState
      setFeedUrl(selectedFeedUrl);
      await runSync(selectedFeedUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
    }
  };

  // Verify ownership inline after import
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

  // PUBLICATION SYNC VIEW
  if (view === "publication") {
    // Show inline verification if import just completed
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
          <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
              <div className="p-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#040042] mb-1">Ownership Verified!</h2>
                  <p className="text-sm text-slate-500"><strong>{vSourceName}</strong> is verified — licensing is now active for your content.</p>
                  {vCount > 0 && <p className="text-xs text-slate-400 mt-1">{vCount} articles imported and ready for licensing.</p>}
                </div>
                <Button
                  onClick={() => { handleClose(); navigate("/content"); }}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold"
                >
                  Go to Content Library
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      }

      return (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#040042] px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-[#A78BFA]" />
                  <div>
                    <h1 className="text-white font-bold text-base leading-tight">Verify Ownership</h1>
                    <p className="text-[#A78BFA] text-sm truncate max-w-[250px]">{vSourceName}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Import success banner */}
              {vCount > 0 && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-sm text-emerald-800 font-medium">
                    ✓ {vCount} new articles imported · {verificationState?.updatedCount ?? 0} already existed
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-[#040042]">Verify your publication</h3>
                <p className="text-sm text-slate-500 mt-1">Add the code below to prove you own <strong>{vSourceName}</strong>. This unlocks licensing for your content.</p>
              </div>

              {/* Verification code box */}
              <div className="bg-[#040042] rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-medium">Verification Code</p>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-xl md:text-2xl font-mono font-bold text-white tracking-[0.2em] leading-none">{vToken}</code>
                  <Button
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(visibleCode); setCopiedInlineCode("visible"); setTimeout(() => setCopiedInlineCode("none"), 2000); }}
                    className="bg-white/10 hover:bg-white/20 text-white border-none h-9 px-3 flex-shrink-0"
                  >
                    {copiedInlineCode === "visible" ? <><Check size={14} className="mr-1.5" />Copied</> : <><Copy size={14} className="mr-1.5" />Copy</>}
                  </Button>
                </div>
              </div>

              {/* Platform instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-[#040042] leading-relaxed">{vInstructions}</p>
              </div>

              {/* Option A: Visible text (always shown) */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20 font-semibold">{noMetaTag ? "Code" : "Option A"}</Badge>
                    <span className="text-xs font-semibold text-[#040042]">Visible text — About / Bio</span>
                  </div>
                  <div className="p-3">
                    <div className="bg-[#040042] rounded-lg p-3 flex items-center justify-between gap-3">
                      <code className="text-xs text-emerald-400 font-mono truncate">{visibleCode}</code>
                      <button onClick={() => { navigator.clipboard.writeText(visibleCode); setCopiedInlineCode("visible"); setTimeout(() => setCopiedInlineCode("none"), 2000); }} className="text-white/60 hover:text-white flex-shrink-0">
                        {copiedInlineCode === "visible" ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option B: Meta tag — NOT for Substack/Beehiiv */}
                {!noMetaTag && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-teal-50 text-teal-700 border-teal-200 font-semibold">Option B</Badge>
                      <span className="text-xs font-semibold text-[#040042]">Hidden — Meta Tag{isWordPress && <span className="text-slate-400 font-normal ml-1">(or install plugin)</span>}</span>
                    </div>
                    <div className="p-3">
                      <div className="bg-[#040042] rounded-lg p-3 flex items-center justify-between gap-3">
                        <code className="text-xs text-emerald-400 font-mono truncate">{metaCode}</code>
                        <button onClick={() => { navigator.clipboard.writeText(metaCode); setCopiedInlineCode("meta"); setTimeout(() => setCopiedInlineCode("none"), 2000); }} className="text-white/60 hover:text-white flex-shrink-0">
                          {copiedInlineCode === "meta" ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      {isWordPress && (
                        <p className="text-xs text-slate-400 mt-2">WordPress users can also use the <span className="text-[#4A26ED]">Opedd plugin</span> for automatic verification.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {inlineVerifyResult === "failed" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Code not found yet. Make sure you've saved your changes, then try again.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 h-11">
                Verify Later
              </Button>
              <Button
                onClick={handleInlineVerify}
                disabled={inlineVerifyResult === "loading"}
                className="flex-1 h-11 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold"
              >
                {inlineVerifyResult === "loading" ? (
                  <><Loader2 size={16} className="animate-spin mr-2" />Verifying…</>
                ) : inlineVerifyResult === "failed" ? (
                  <><RefreshCw size={16} className="mr-2" />Try Again</>
                ) : (
                  <>I've Added It <ArrowRight size={16} className="ml-1.5" /></>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    // Step 1: Platform selection
    if (pubStep === "select") {
      return (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-white border-b border-[#E8F2FB] px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A26ED]/20 to-[#7C3AED]/20 flex items-center justify-center">
                    <Link2 size={24} className="text-[#4A26ED]" />
                  </div>
                  <div>
                    <h1 className="text-[#040042] font-bold text-lg leading-tight">Sync Publication</h1>
                    <p className="text-[#040042]/60 text-sm">Select your publishing platform</p>
                  </div>
                </div>
                <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X size={16} className="text-[#040042]/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-sm text-slate-500">We'll recommend the best import method for your platform.</p>
              <div className="grid grid-cols-5 gap-2">
                {platformIcons.map((platform) => (
                  <button
                    key={platform.name}
                    onClick={() => handlePlatformSelect(platform.platformKey)}
                    className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl bg-[#F8F9FF] border-2 border-[#E8F2FB] hover:border-[#4A26ED] hover:bg-[#4A26ED]/5 hover:shadow-md hover:shadow-[#4A26ED]/10 transition-all duration-200 group hover:scale-[1.03] cursor-pointer"
                  >
                    <div className="w-9 h-9 flex items-center justify-center">
                      {platform.logo ? (
                        <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                      ) : (
                        <Globe size={26} className="text-slate-400 group-hover:text-[#4A26ED] transition-colors" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold group-hover:text-[#4A26ED] transition-colors leading-tight text-center">{platform.name}</span>
                  </button>
                ))}
              </div>

              {/* Or paste URL directly */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-3">Or paste a feed URL directly:</p>
                <div className="space-y-2">
                  <div className="relative">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <Input
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      placeholder="https://yourname.substack.com/feed"
                      className="!bg-white !text-[#040042] border-slate-200 h-12 pl-10 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — only show if feed URL entered directly */}
            {feedUrl.trim() && (
              <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <Button
                  onClick={handlePublicationSync}
                  disabled={isSubmitting || isConnecting || !feedUrl.trim()}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isConnecting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Connecting...</>
                  ) : (
                    <><Shield size={18} className="mr-2" />Sync & Protect Content</>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      );
    }

    // Platform-specific step 2
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setPubStep("select"); setPubPlatform(null); }}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft size={16} className="text-[#040042]/60" />
                </button>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">
                    {pubPlatform === "substack" && "Substack Import"}
                    {pubPlatform === "beehiiv" && "Beehiiv Import"}
                    {pubPlatform === "ghost" && "Ghost Import"}
                    {pubPlatform === "wordpress" && "WordPress Import"}
                    {pubPlatform === "other" && "Import Content"}
                  </h1>
                  <p className="text-[#040042]/60 text-sm">Connect your content source</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={16} className="text-[#040042]/60" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* SUBSTACK */}
            {pubPlatform === "substack" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your Substack URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yourpublication.substack.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                  <p className="text-xs text-slate-400">Don't include https:// — just the domain</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Substack doesn't expose a full archive. We'll import your latest articles. New articles will auto-register when readers visit them via the widget.
                  </p>
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* BEEHIIV */}
            {pubPlatform === "beehiiv" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your Beehiiv URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yourpublication.beehiiv.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                  <p className="text-xs text-slate-400">Don't include https:// — just the domain</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Beehiiv doesn't expose a full archive. We'll import your latest articles. New articles will auto-register when readers visit them via the widget.
                  </p>
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* GHOST */}
            {pubPlatform === "ghost" && !useRssFallback && (
              <>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 size={12} />
                  Recommended: Full archive import
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your Ghost site URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yoursite.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                  <p className="text-xs text-slate-400">Don't include https:// — just the domain</p>
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* GHOST FEED FALLBACK */}
            {pubPlatform === "ghost" && useRssFallback && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your Ghost site URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yoursite.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Feed import will capture your latest ~50 articles. For a full archive, go back and use sitemap import.
                  </p>
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* WORDPRESS */}
            {pubPlatform === "wordpress" && !useRssFallback && (
              <>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 size={12} />
                  Recommended: Full archive import
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your WordPress site URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yoursite.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                  <p className="text-xs text-slate-500">WordPress sitemaps can contain your full article archive (thousands of articles).</p>
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* WORDPRESS FEED FALLBACK */}
            {pubPlatform === "wordpress" && useRssFallback && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your WordPress site URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yoursite.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* OTHER */}
            {pubPlatform === "other" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#040042]">Enter your publication URL</Label>
                  <Input
                    value={pubDomainInput}
                    onChange={(e) => setPubDomainInput(e.target.value)}
                    placeholder="yoursite.com"
                    className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                    style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                  />
                  <p className="text-xs text-slate-400">Don't include https:// — just the domain</p>
                </div>
                {/* Pricing */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">Human price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubHumanPrice} onChange={(e) => setPubHumanPrice(e.target.value)} placeholder="4.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#040042]">AI price (USD) <span className="text-slate-400 font-normal">optional</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input type="number" min="0" step="0.01" value={pubAiPrice} onChange={(e) => setPubAiPrice(e.target.value)} placeholder="49.99" className="!bg-white !text-[#040042] border-slate-200 h-10 pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detection results */}
                {detectedFeeds && (
                  <div className="space-y-3">
                    {detectedFeeds.sitemap_urls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sitemap (recommended)</p>
                        {detectedFeeds.sitemap_urls.map((url) => (
                          <button
                            key={url}
                            onClick={() => setSelectedFeedUrl(url)}
                            className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${
                              selectedFeedUrl === url
                                ? "border-[#4A26ED] bg-[#4A26ED]/5"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <p className="font-medium text-[#040042] truncate">{url}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Full archive import</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {detectedFeeds.rss_urls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Feeds</p>
                        {detectedFeeds.rss_urls.map((url) => (
                          <button
                            key={url}
                            onClick={() => setSelectedFeedUrl(url)}
                            className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${
                              selectedFeedUrl === url
                                ? "border-[#4A26ED] bg-[#4A26ED]/5"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <p className="font-medium text-[#040042] truncate">{url}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Latest articles</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {detectedFeeds.sitemap_urls.length === 0 && detectedFeeds.rss_urls.length === 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          No feeds detected. Articles will auto-register when readers visit them via the widget.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Importing spinner */}
            {isSitemapImporting && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 size={20} className="text-[#4A26ED] animate-spin" />
                <p className="text-sm text-slate-600 font-medium">Importing your content...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isSitemapImporting && (
            <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] space-y-3">
              {/* Substack / Beehiiv — content import */}
              {(pubPlatform === "substack" || pubPlatform === "beehiiv") && (
                <Button
                  onClick={handleRssImport}
                  disabled={!pubDomainInput.trim() || isConnecting}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isConnecting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Globe size={18} className="mr-2" />Import content</>
                  )}
                </Button>
              )}

              {/* Ghost — sitemap primary or feed fallback */}
              {pubPlatform === "ghost" && !useRssFallback && (
                <>
                  <Button
                    onClick={handleGhostImport}
                    disabled={!pubDomainInput.trim() || isSitemapImporting}
                    className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                  >
                    <Sparkles size={18} className="mr-2" />
                    Import Full Archive (Sitemap)
                  </Button>
                  <button
                    onClick={() => setUseRssFallback(true)}
                    className="w-full text-center text-sm text-slate-500 hover:text-[#4A26ED] transition-colors"
                  >
                    Use feed import instead
                  </button>
                </>
              )}
              {pubPlatform === "ghost" && useRssFallback && (
                <Button
                  onClick={handleRssImport}
                  disabled={!pubDomainInput.trim() || isConnecting}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isConnecting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Globe size={18} className="mr-2" />Import content</>
                  )}
                </Button>
              )}

              {/* WordPress — sitemap primary or feed fallback */}
              {pubPlatform === "wordpress" && !useRssFallback && (
                <>
                  <Button
                    onClick={handleWordpressImport}
                    disabled={!pubDomainInput.trim() || isDetectingFeeds || isSitemapImporting}
                    className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                  >
                    {isDetectingFeeds ? (
                      <><Loader2 size={18} className="mr-2 animate-spin" />Detecting sitemap...</>
                    ) : (
                      <><Sparkles size={18} className="mr-2" />Import Full Archive (Sitemap)</>
                    )}
                  </Button>
                  <button
                    onClick={() => setUseRssFallback(true)}
                    className="w-full text-center text-sm text-slate-500 hover:text-[#4A26ED] transition-colors"
                  >
                    Use feed import instead
                  </button>
                </>
              )}
              {pubPlatform === "wordpress" && useRssFallback && (
                <Button
                  onClick={handleRssImport}
                  disabled={!pubDomainInput.trim() || isConnecting}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isConnecting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Globe size={18} className="mr-2" />Import content</>
                  )}
                </Button>
              )}

              {/* Other — detect or confirm */}
              {pubPlatform === "other" && !detectedFeeds && (
                <Button
                  onClick={handleOtherDetect}
                  disabled={!pubDomainInput.trim() || isDetectingFeeds}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isDetectingFeeds ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Detecting feeds...</>
                  ) : (
                    <><Globe size={18} className="mr-2" />Detect Feeds</>
                  )}
                </Button>
              )}
              {pubPlatform === "other" && detectedFeeds && selectedFeedUrl && (
                <Button
                  onClick={handleOtherConfirmImport}
                  disabled={isConnecting || isSitemapImporting}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isConnecting || isSitemapImporting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Sparkles size={18} className="mr-2" />Import Content</>
                  )}
                </Button>
              )}
              {pubPlatform === "other" && detectedFeeds && !selectedFeedUrl && detectedFeeds.sitemap_urls.length === 0 && detectedFeeds.rss_urls.length === 0 && (
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full h-12"
                >
                  Skip for now →
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // SYNCING VIEW
  // SINGLE WORK VIEW
  if (view === "single") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Light Header */}
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                  <Upload size={24} className="text-teal-600" />
                </div>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">Register Single Work</h1>
                  <p className="text-[#040042]/60 text-sm">License an article, PDF, or text</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-[#040042]/60" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">Title *</Label>
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Future of AI Governance"
                className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of your work..."
                rows={3}
                className="!bg-white !text-[#040042] border-slate-200 resize-none focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              />
            </div>

            {/* Input Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-bold text-[#040042]">Content Source</Label>
                <span className="text-xs text-slate-400">(choose one)</span>
              </div>
              
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "url")} className="w-full">
                <TabsList className="w-full bg-slate-100 p-1 rounded-xl h-10">
                  <TabsTrigger 
                    value="file" 
                    className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
                  >
                    <Upload size={14} className="mr-2" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger 
                    value="url" 
                    className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
                  >
                    <Link2 size={14} className="mr-2" />
                    Article URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-3">
                  {/* File Upload */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      isDragOver 
                        ? "border-[#4A26ED] bg-[#4A26ED]/5" 
                        : uploadedFile
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
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
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600">Drop a file here or click to upload</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT</p>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="url" className="mt-3">
                  <div className="space-y-2">
                    <div className="relative">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <Input 
                        value={articleUrl}
                        onChange={(e) => setArticleUrl(e.target.value)}
                        placeholder="https://example.com/your-article"
                        className="!bg-white !text-[#040042] border-slate-200 h-12 pl-10 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                        style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Link to your published article, blog post, or research paper
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#4A26ED]" />
                <span className="text-sm font-semibold text-[#040042]">License Fees</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">Human Republication *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium z-10">$</span>
                    <Input 
                      type="number"
                      value={humanPrice}
                      onChange={(e) => setHumanPrice(e.target.value)}
                      placeholder="4.99"
                      className="!bg-white !text-[#040042] border-slate-200 h-11 pl-7 focus:border-[#4A26ED]"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">AI Ingestion <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium z-10">$</span>
                    <Input 
                      type="number"
                      value={aiPrice}
                      onChange={(e) => setAiPrice(e.target.value)}
                      placeholder="49.99"
                      className="!bg-white !text-[#040042] border-slate-200 h-11 pl-7 focus:border-[#4A26ED]"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 bg-white border-t border-slate-200 flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <Button 
              onClick={handleSingleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Registering...
                </>
               ) : (
                <>
                  <Shield size={18} className="mr-2" />
                  Protect & License
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ENTERPRISE (Media Organisation) VIEW
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

        // Step 1: Create content_sources record with verification token immediately
        // so the source appears in the dashboard before import finishes
        await insertSourceWithToken({
          feedUrl: sitemapUrl,
          platform: "other",
          pubName: enterpriseOrgName.trim(),
          registrationPath: "bulk_enterprise",
        });

        // Step 2: Fire import in background — don't await
        // import-sitemap will check if source is already verified and activate accordingly
        fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ sitemap_url: sitemapUrl }),
        }).catch(() => {}); // fire-and-forget, errors logged server-side

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
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Dark navy header */}
          <div className="bg-[#040042] px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={opeddLogo} alt="Opedd" className="h-8" />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight">Register Media Organisation</h1>
                  <p className="text-white/60 text-sm">Bulk import your entire content archive</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Organisation Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#040042]">Organisation Name</Label>
              <Input
                value={enterpriseOrgName}
                onChange={(e) => setEnterpriseOrgName(e.target.value)}
                placeholder="The Information"
                className="!bg-white !text-[#040042] border-slate-200 h-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
              />
            </div>

            {/* Sitemap URL */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#040042]">Sitemap URL</Label>
              <Input
                value={enterpriseSitemapUrl}
                onChange={(e) => setEnterpriseSitemapUrl(e.target.value)}
                placeholder="https://theinformation.com/sitemap.xml"
                className="!bg-white !text-[#040042] border-slate-200 h-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">
                Usually found at <code className="bg-slate-100 px-1 rounded">yoursite.com/sitemap.xml</code> — imports up to 2,000 articles from your archive.
              </p>
            </div>

            {/* Pricing row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#040042]">Human License Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={enterpriseHumanPrice}
                  onChange={(e) => setEnterpriseHumanPrice(e.target.value)}
                  placeholder="4.99"
                  className="!bg-white !text-[#040042] border-slate-200 h-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#040042]">AI License Price ($) <span className="text-slate-400 font-normal">optional</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={enterpriseAiPrice}
                  onChange={(e) => setEnterpriseAiPrice(e.target.value)}
                  placeholder="—"
                  className="!bg-white !text-[#040042] border-slate-200 h-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Info box */}
            <div className="bg-[#4A26ED]/5 border border-[#4A26ED]/15 rounded-xl p-4 text-sm text-[#040042]/70 space-y-1">
              <p className="font-medium text-[#040042]">How it works</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>We import your full article archive from your sitemap (up to 2,000 articles)</li>
                <li>You add a small verification tag to your website's &lt;head&gt;</li>
                <li>Licensing goes live across all your content</li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] space-y-2">
            <Button
              onClick={handleEnterpriseSubmit}
              disabled={isConnecting || !enterpriseOrgName.trim() || !enterpriseSitemapUrl.trim()}
              className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
            >
              {isConnecting ? (
                <><Loader2 size={18} className="mr-2 animate-spin" />Importing Archive…</>
              ) : (
                <><Globe size={18} className="mr-2" />Import & Verify Ownership</>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setView("choice")}
              className="w-full h-9 text-sm text-slate-500 hover:text-[#040042]"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // CHOICE VIEW — pick registration path
  if (view === "choice") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-slate-200 text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[#040042] font-bold text-lg leading-tight">Register Content</h1>
                <p className="text-slate-500 text-sm">Choose how you want to protect your work</p>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-[#040042] transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Stacked Cards */}
          <div className="p-5 space-y-3">
            <button
              onClick={() => setView("publication")}
              className="group w-full relative bg-white border border-[#E8F2FB] rounded-xl p-4 text-left hover:border-[#4A26ED]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center shrink-0 group-hover:from-[#4A26ED] group-hover:to-[#7C3AED] transition-all">
                  <Link2 size={20} className="text-[#4A26ED] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#040042] font-semibold text-sm">Sync Newsletter / Site</h3>
                  <p className="text-[#040042]/60 text-xs mt-0.5">Automatically import and protect every new post via API or sitemap.</p>
                </div>
                <ArrowRight size={16} className="text-[#4A26ED] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>

            <button
              onClick={() => setView("single")}
              className="group w-full relative bg-white border border-[#E8F2FB] rounded-xl p-4 text-left hover:border-teal-400 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0 group-hover:from-teal-500 group-hover:to-emerald-500 transition-all">
                  <FileUp size={20} className="text-teal-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#040042] font-semibold text-sm">Register Single Work</h3>
                  <p className="text-[#040042]/60 text-xs mt-0.5">Protect a one-off article, op-ed, or research paper.</p>
                </div>
                <ArrowRight size={16} className="text-[#4A26ED] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>

            <button
              onClick={() => setView("enterprise")}
              className="group w-full relative bg-white border border-[#E8F2FB] rounded-xl p-4 text-left hover:border-[#D1009A]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#D1009A]/10 to-[#FF4DA6]/10 flex items-center justify-center shrink-0 group-hover:from-[#D1009A] group-hover:to-[#FF4DA6] transition-all">
                  <Globe size={20} className="text-[#D1009A] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#040042] font-semibold text-sm">Bulk / Enterprise</h3>
                  <p className="text-[#040042]/60 text-xs mt-0.5">Add multiple feeds, sitemaps, and tag them by vertical.</p>
                </div>
                <ArrowRight size={16} className="text-[#D1009A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // SUCCESS VIEW (for single work — only when view is explicitly "success")
  if (view !== "success") {
    // Unknown/unhandled view — redirect to publication platform picker
    setView("publication");
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="bg-white border-slate-200 text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-[#040042] font-bold text-lg leading-tight">Registration Complete</h1>
                <p className="text-slate-500 text-sm">Your content is now protected</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-[#040042] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success Content */}
        <div className="p-6">
          {/* Distribution Tabs */}
          <Tabs defaultValue="widget" className="w-full">
            <TabsList className="w-full bg-slate-100 p-1 rounded-xl h-11">
              <TabsTrigger 
                value="widget" 
                className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
              >
                <Code size={14} className="mr-2" />
                Embed Widget
              </TabsTrigger>
              <TabsTrigger 
                value="link" 
                className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
              >
                <Link2 size={14} className="mr-2" />
                Direct Pay Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="widget" className="mt-4">
              <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-4 relative group">
                <code className="text-xs text-[#334155] font-mono break-all leading-relaxed">
                  {widgetCode}
                </code>
                <Button
                  size="sm"
                  onClick={() => handleCopy(widgetCode, "widget")}
                  className="absolute top-2 right-2 h-8 px-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-xs font-medium"
                >
                  {copiedWidget ? (
                    <>
                      <Check size={12} className="mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard size={12} className="mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Add this script tag to your website to enable licensing
              </p>
            </TabsContent>

            <TabsContent value="link" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5 overflow-hidden">
                  <code className="text-sm text-[#4A26ED] font-mono truncate block">
                    {directPayLink}
                  </code>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCopy(directPayLink, "link")}
                  className="h-9 px-4 bg-[#040042] hover:bg-[#0A0066] text-white rounded-lg text-xs font-medium flex-shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check size={12} className="mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard size={12} className="mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Share this link to accept payments directly
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-200">
          <Button
            type="button"
            onClick={handleClose}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
