import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import { 
  Rss, 
  FileText, 
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
  Globe,
  Image as ImageIcon,
  Copy,
  Plug,
  ArrowRight,
  ArrowLeft,
  Plus,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { VerifyOwnershipModal } from "@/components/dashboard/VerifyOwnershipModal";
import { PlatformSetupInstructions } from "@/components/dashboard/PlatformSetupInstructions";
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

type ModalView = "choice" | "publication" | "single" | "enterprise" | "syncing" | "pub-success" | "success";

interface MockArticle {
  title: string;
  status: "pending" | "syncing" | "complete";
}

// Derive RSS feed URL from a site URL based on platform
const deriveRssUrl = (siteUrl: string, platform: string): string => {
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
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
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
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [copiedVerification, setCopiedVerification] = useState(false);

  // Publisher profile ID (for widget code)
  const [publisherProfileId, setPublisherProfileId] = useState<string | null>(null);

  // Platform setup state (widget install flow)
  const [showPlatformSetup, setShowPlatformSetup] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"ghost" | "wordpress" | "beehiiv" | "other" | null>(null);
  
  // Check for active integrations (for empty state)
  const [hasActiveIntegrations, setHasActiveIntegrations] = useState(true);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  
  // Update view when initialView changes or modal opens
  useEffect(() => {
    if (open) {
      setView(initialView);
      setVerificationCode(generateVerificationCode());
      setShowPlatformSetup(false);
      setSelectedPlatform(null);

      // Check for active integrations if needed
      if (checkIntegrations && initialView === "publication" && user) {
        setIntegrationsLoading(true);
        supabase
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
        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
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
  
  // Syncing state
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState(0);
  const [totalArticles] = useState(45);
  const [articles, setArticles] = useState<MockArticle[]>([
    { title: "The Future of Digital Publishing", status: "pending" },
    { title: "Why AI Licensing Matters in 2025", status: "pending" },
    { title: "Building a Sustainable Content Business", status: "pending" },
  ]);

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
  
  // Connecting state (for triggering RSS import)
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

  // Enterprise (Media Org) multi-feed state
  interface EnterpriseFeed {
    url: string;
    tag: string;
  }
  const [enterpriseFeeds, setEnterpriseFeeds] = useState<EnterpriseFeed[]>([
    { url: "", tag: "" },
  ]);
  const [enterpriseOrgName, setEnterpriseOrgName] = useState("");
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
    setVerificationToken(null);
    setCopiedWidget(false);
    setCopiedLink(false);
    setCopiedVerification(false);
    setProgress(0);
    setCurrentArticle(0);
    setArticles(prev => prev.map(a => ({ ...a, status: "pending" })));
    setEnterpriseFeeds([{ url: "", tag: "" }]);
    setEnterpriseOrgName("");
    setEnterpriseHumanPrice("4.99");
    setEnterpriseAiPrice("");
    setShowPlatformSetup(false);
    setSelectedPlatform(null);
    setPubStep("select");
    setPubPlatform(null);
    setPubDomainInput("");
    setIsSitemapImporting(false);
    setSitemapImportResult(null);
    setDetectedFeeds(null);
    setIsDetectingFeeds(false);
    setSelectedFeedUrl(null);
    setUseRssFallback(false);
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

  // Syncing animation effect
  useEffect(() => {
    if (view !== "syncing") return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const articleInterval = setInterval(() => {
      setCurrentArticle(prev => Math.min(prev + 1, totalArticles));
    }, 110);

    const statusTimeouts = articles.map((_, index) => 
      setTimeout(() => {
        setArticles(prev => 
          prev.map((article, i) => ({
            ...article,
            status: i <= index ? (i < index ? "complete" : "syncing") : "pending"
          }))
        );
      }, (index + 1) * 1200)
    );

    const finalTimeout = setTimeout(() => {
      setArticles(prev => prev.map(a => ({ ...a, status: "complete" })));
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(articleInterval);
      statusTimeouts.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, [view, articles.length, totalArticles]);

  // Transition from syncing → pub-success once progress hits 100 (proper cleanup)
  useEffect(() => {
    if (view !== "syncing" || progress < 100) return;
    const t = setTimeout(() => setView("pub-success"), 500);
    return () => clearTimeout(t);
  }, [progress, view]);

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
    ? `https://opedd.io/pay/${registeredAssetId}`
    : "";
  const widgetCode = publisherProfileId
    ? `<script src="https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget" data-publisher-id="${publisherProfileId}"></script>`
    : registeredAssetId
    ? `<script src="https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget" data-asset-id="${registeredAssetId}"></script>`
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

  // Core sync logic — used by both RSS form and widget install path
  const runSync = async (syncFeedUrl: string, syncHumanPrice: string, syncAiPrice: string, registrationPath: string = "newsletter_feed") => {
    if (!user) return;

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
      } catch {}

      // Use feed preview name if available (only for RSS form path)
      if (feedPreview?.title && registrationPath === "newsletter_feed") {
        const previewName = feedPreview.title;
        pubName = previewName.startsWith('Publication:') ? previewName.replace('Publication: ', '') : previewName;
      }

      // Step 1: Get access token for authenticated edge function calls
      const platformType = (platform?.name.toLowerCase() || "other") as "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      // Start the syncing animation
      setIsConnecting(false);
      setView("syncing");

      // Set local tracking state
      setRegisteredAssetId(crypto.randomUUID());
      const verificationTokenFromApi = token;
      setVerificationToken(verificationTokenFromApi);
      setVerificationCode(verificationTokenFromApi);

      // Step 2: Insert local rss_sources record so Sources tab shows the pipe
      let localSourceId: string | null = null;
      try {
        const { data: localSource, error: srcErr } = await supabase
          .from("rss_sources")
          .insert({
            user_id: user.id,
            name: pubName,
            feed_url: syncFeedUrl,
            platform: platformType,
            sync_status: "active",
            last_synced_at: new Date().toISOString(),
            registration_path: registrationPath,
          })
          .select("id")
          .single();
        if (srcErr) throw srcErr;
        localSourceId = localSource.id;
        console.log("[RegisterContentModal] Local rss_sources record created:", localSourceId);
      } catch (localErr) {
        console.warn("[RegisterContentModal] Failed to insert local source:", localErr);
      }

      // Step 3: Trigger RSS sync to import articles via edge function
      try {
        await fetch(`${EXT_SUPABASE_URL}/functions/v1/sync-content-source`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ sourceUrl: syncFeedUrl }),
        });
        console.log("[RegisterContentModal] RSS sync triggered for:", syncFeedUrl);
      } catch (syncError) {
        console.log("[RegisterContentModal] RSS sync failed:", syncError);
      }

      // Refresh dashboard data
      onSuccess?.();
    } catch (error: any) {
      console.warn("[RegisterContentModal] Publication sync failed:", error?.message || error);
      setIsConnecting(false);

      const errorMsg = error?.message || "";
      const isPublisherNotFound = errorMsg.toLowerCase().includes("publisher not found");

      toast({
        title: isPublisherNotFound ? "Publisher Profile Missing" : "Sync Failed",
        description: isPublisherNotFound
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
        description: "Please enter your publication's RSS feed URL",
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

    await runSync(feedUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
  };

  // Handler for widget install path — derives RSS URL and runs sync
  const handleWidgetSyncAndDone = async (siteUrl: string, humanPrice: string, aiPrice: string) => {
    if (!user) return;
    const rssUrl = deriveRssUrl(siteUrl, selectedPlatform || "other");

    // Update state so the syncing animation / pub-success view can reference them
    setFeedUrl(rssUrl);
    setPubHumanPrice(humanPrice);
    setPubAiPrice(aiPrice);
    setShowPlatformSetup(false);

    // Run sync directly with the values (don't rely on state)
    await runSync(rssUrl, humanPrice, aiPrice, "widget_install");
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
      // Generate content hash from title + description
      const contentHash = generateContentHash(`${title}${description || ''}`);
      
      // Determine access type based on pricing
      const hasHuman = parseFloat(humanPrice) > 0;
      const hasAi = aiPrice && parseFloat(aiPrice) > 0;
      const accessType = hasHuman && hasAi ? "both" : hasAi ? "ai" : "human";
      
      // Create asset with correct DB column names
      const { data, error } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          title: title,
          description: description || null,
          content: description || null,
          source_url: articleUrl || null,
          human_price: parseFloat(humanPrice) || 4.99,
          ai_price: aiPrice ? parseFloat(aiPrice) : null,
          licensing_enabled: true,
          total_revenue: 0,
          human_licenses_sold: 0,
          ai_licenses_sold: 0,
          license_type: accessType, // DB column is license_type, not access_type
          content_hash: contentHash,
          verification_status: "auto-verified", // Single works are auto-verified on upload
          metadata: {
            url: articleUrl || null,
            type: uploadedFile ? "document" : "article",
            filename: uploadedFile?.name || null,
          },
        })
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

  const getArticleStatusIcon = (status: MockArticle["status"]) => {
    switch (status) {
      case "complete":
        return <Check size={14} className="text-emerald-500" />;
      case "syncing":
        return <Loader2 size={14} className="text-[#4A26ED] animate-spin" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />;
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

  // Import sitemap helper
  const importSitemap = async (sitemapUrl: string) => {
    setIsSitemapImporting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/import-sitemap`, {
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
      setSitemapImportResult({ count: result.data?.new_articles_inserted || 0 });
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Could not import sitemap",
        variant: "destructive",
      });
    } finally {
      setIsSitemapImporting(false);
    }
  };

  // Detect feeds helper
  const detectFeeds = async (domain: string) => {
    setIsDetectingFeeds(true);
    setDetectedFeeds(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/detect-feeds?domain=${encodeURIComponent(domain)}`, {
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
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

  // Handle RSS import for Substack/Beehiiv
  const handleRssImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const rssUrl = `https://${domain}/feed`;
    setFeedUrl(rssUrl);
    setPubHumanPrice(pubHumanPrice);
    setPubAiPrice(pubAiPrice);
    await runSync(rssUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
  };

  // Handle Ghost sitemap import
  const handleGhostImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    await importSitemap(`https://${domain}/sitemap.xml`);
  };

  // Handle WordPress sitemap import (detect first)
  const handleWordpressImport = async () => {
    if (!pubDomainInput.trim()) return;
    const domain = pubDomainInput.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    // First detect feeds to find sitemap URL
    setIsDetectingFeeds(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/detect-feeds?domain=${encodeURIComponent(`https://${domain}`)}`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data?.sitemap_urls?.length > 0) {
        setIsDetectingFeeds(false);
        await importSitemap(result.data.sitemap_urls[0]);
      } else {
        setIsDetectingFeeds(false);
        toast({ title: "No sitemap found", description: "Try using RSS feed instead.", variant: "destructive" });
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
    // If it's a sitemap URL, use import-sitemap
    if (selectedFeedUrl.includes("sitemap")) {
      await importSitemap(selectedFeedUrl);
    } else {
      // RSS feed — use the sync flow
      setFeedUrl(selectedFeedUrl);
      await runSync(selectedFeedUrl, pubHumanPrice, pubAiPrice, "newsletter_feed");
    }
  };

  // PUBLICATION SYNC VIEW
  if (view === "publication") {
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

              {/* Or use RSS directly */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-3">Or paste an RSS feed URL directly:</p>
                <div className="space-y-2">
                  <div className="relative">
                    <Rss size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
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

            {/* Footer — only show if RSS URL entered directly */}
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

    // Step 2: Platform-specific import — or success state
    if (sitemapImportResult) {
      return (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#040042] mb-1">Import Complete!</h2>
                <p className="text-sm text-slate-500">
                  {sitemapImportResult.count > 0
                    ? `${sitemapImportResult.count} articles imported and ready for licensing.`
                    : "Your content has been processed."}
                </p>
              </div>
              <Button
                onClick={() => {
                  handleClose();
                  navigate("/content");
                }}
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

    const updateFeedRow = (index: number, field: "url" | "tag", value: string) => {
      setEnterpriseFeeds(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
    };

    const removeFeedRow = (index: number) => {
      setEnterpriseFeeds(prev => prev.filter((_, i) => i !== index));
    };

    const handleEnterpriseSubmit = async () => {
      const validFeeds = enterpriseFeeds.filter(f => f.url.trim());
      if (validFeeds.length === 0) {
        toast({ title: "At least one feed required", variant: "destructive" });
        return;
      }
      if (!user) return;

      setIsConnecting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error("Not authenticated");

        for (const feed of validFeeds) {
          const platform = detectPlatform(feed.url);
          const platformType = (platform?.name.toLowerCase() || "other") as "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
          const feedName = feed.tag ? `${enterpriseOrgName || "Org"} — ${feed.tag}` : (enterpriseOrgName || feed.url);

          // Insert local rss_sources record with bulk_enterprise path
          try {
            await supabase.from("rss_sources").insert({
              user_id: user.id,
              name: feedName,
              feed_url: feed.url,
              platform: platformType,
              sync_status: "active",
              last_synced_at: new Date().toISOString(),
              registration_path: "bulk_enterprise",
            });
          } catch (localErr) {
            console.warn("[RegisterContentModal] Failed to insert local enterprise source:", localErr);
          }

          try {
            await fetch(`${EXT_SUPABASE_URL}/functions/v1/sync-content-source`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: EXT_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ sourceUrl: feed.url }),
            });
          } catch {
            // sync may not be immediately available
          }
        }

        setIsConnecting(false);
        setView("syncing");

        setTimeout(() => {
          onSuccess?.();
        }, 1500);

        toast({
          title: "Sources Registered",
          description: `${validFeeds.length} feed(s) are now syncing.`,
        });
      } catch (error) {
        console.error("Enterprise registration error:", error);
        setIsConnecting(false);
        toast({ title: "Registration Failed", description: "Could not register feeds.", variant: "destructive" });
      }
    };

    const tagSuggestions = ["Politics", "Research", "Business", "Technology", "Opinion", "Culture"];

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
              </>
            )}

            {/* GHOST RSS FALLBACK */}
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
                    RSS will import your latest ~50 articles. For a full archive, go back and use sitemap import.
                  </p>
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
              </>
            )}

            {/* WORDPRESS RSS FALLBACK */}
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
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RSS feeds</p>
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
              {/* Substack / Beehiiv — RSS import */}
              {(pubPlatform === "substack" || pubPlatform === "beehiiv") && (
                <Button
                  onClick={handleRssImport}
                  disabled={!pubDomainInput.trim() || isConnecting}
                  className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
                >
                  {isConnecting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Rss size={18} className="mr-2" />Import via RSS</>
                  )}
                </Button>
              )}

              {/* Ghost — sitemap primary or RSS fallback */}
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
                    Use RSS feed instead
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
                    <><Rss size={18} className="mr-2" />Import via RSS</>
                  )}
                </Button>
              )}

              {/* WordPress — sitemap primary or RSS fallback */}
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
                    Use RSS feed instead
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
                    <><Rss size={18} className="mr-2" />Import via RSS</>
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
  if (view === "syncing") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-[#040042] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={opeddLogo} alt="Opedd" className="h-8" />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight">Syncing & Protecting</h1>
                  <p className="text-[#A78BFA] text-sm">Securing your content rights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A26ED]/10 mb-4">
                <Loader2 size={32} className="text-[#4A26ED] animate-spin" />
              </div>
              <p className="text-sm text-slate-600">
                Registering {currentArticle}/{totalArticles} articles...
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <FileText size={12} />
                <span>Syncing & Protecting Articles</span>
              </div>
              <div className="space-y-2">
                {articles.map((article, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      article.status === "syncing" 
                        ? "bg-[#4A26ED]/5 border border-[#4A26ED]/20" 
                        : article.status === "complete"
                        ? "bg-emerald-50/50"
                        : "bg-white border border-slate-100"
                    }`}
                  >
                    {getArticleStatusIcon(article.status)}
                    <span className={`text-sm flex-1 truncate ${
                      article.status === "complete" 
                        ? "text-[#040042]" 
                        : article.status === "syncing"
                        ? "text-[#4A26ED] font-medium"
                        : "text-slate-400"
                    }`}>
                      {article.title}
                    </span>
                    {article.status === "complete" && (
                      <span className="text-xs text-emerald-600 font-medium">Protected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // PUBLICATION SUCCESS VIEW — show VerifyOwnershipModal in registration mode
  if (view === "pub-success") {
    const code = verificationToken || verificationCode;
    const detectedPlatformForVerify = detectPlatform(feedUrl);
    const platformType = detectedPlatformForVerify?.name.toLowerCase() || "other";

    return (
      <VerifyOwnershipModal
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
        source={{
          id: registeredAssetId || "",
          name: feedPreview?.title || feedUrl,
          platform: platformType,
          verification_token: code,
        }}
        registrationMode
        onVerified={() => {
          onSuccess?.();
        }}
      />
    );
  }

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

  // SUCCESS VIEW (for single work)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="bg-slate-50 border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#040042] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={opeddLogo} alt="Opedd" className="h-8" />
              <div className="h-6 w-px bg-white/20" />
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">Registration Complete</h1>
                <p className="text-emerald-400 text-sm">Your content is now protected</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Success Content */}
        <div className="p-6">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
          </div>

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
              <div className="bg-slate-900 rounded-xl p-4 relative group">
                <code className="text-xs text-emerald-400 font-mono break-all leading-relaxed">
                  {widgetCode}
                </code>
                <Button
                  size="sm"
                  onClick={() => handleCopy(widgetCode, "widget")}
                  className="absolute top-2 right-2 h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
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
