import React, { useState, useEffect, useCallback, useRef } from "react";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import {
  User,
  Globe,
  Users,
  Shield,
  Check,
  Copy,
  Mail,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  DollarSign,
  Loader2,
  BarChart3,
  Upload,
  Camera,
  AlertTriangle,
  Trash2,
  Send,
  Clock,
  XCircle,
  CheckCircle,
  X,
  Info,
  MessageSquare,
  CreditCard,
  Wallet,
  Lock,
  ExternalLink,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Activity,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PublicationGate, LockedTabContent } from "@/components/dashboard/PublicationGate";
import { Spinner } from "@/components/ui/Spinner";
import {
  publisherApi,
  type PublisherApiKeyListItem,
  type PublisherWebhookListItem,
  type PublisherWebhookTestResult,
} from "@/lib/api";

const WEBHOOK_EVENT_TYPES = [
  "license.paid",
  "license.issued",
  "license.revoked",
  "license.expired",
  "archive.subscribed",
] as const;
type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[number];

interface StripeConnect {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

interface PublisherProfile {
  id: string;
  name: string;
  email: string;
  api_key: string | null;
  default_human_price: number | null;
  default_ai_price: number | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  article_count: number;
  plan?: string;
  transaction_count: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_disabled_reason: string | null;
  stripe_connect: StripeConnect | null;
  webhook_url: string | null;
  webhook: { configured: boolean; url: string } | null;
  created_at: string;
  excluded_url_patterns?: string[];
  pricing_rules?: Record<string, any> | null;
  content_delivery_enabled?: boolean;
  publication_verified?: boolean;
  pending_sources?: Array<{ id: string; name: string; url: string; verification_status: string; sync_status: string }>;
  is_admin?: boolean;
}

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: { 
    opacity: 0, y: -10,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const }
  }
};

function ResendLicensesForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/resend-licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.success !== false) {
        setSent(true);
      } else {
        toast({ title: "Failed to send", description: result.error?.message || "Please try again", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="text-sm text-emerald-600 flex items-center gap-1.5">
        <Check size={14} /> Email sent if any licenses exist for that address.
      </p>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        type="email"
        placeholder="buyer@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 text-sm"
      />
      <Button
        size="sm"
        disabled={sending || !email.trim()}
        onClick={handleResend}
        className="flex-shrink-0 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
      >
        {sending ? <Spinner size="sm" /> : "Resend All Licenses"}
      </Button>
    </div>
  );
}

export default function Settings() {
  useDocumentTitle("Settings — Opedd");
  const { user, getAccessToken, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    // Back-compat: legacy tab values redirect to new consolidated tabs
    if (tab === "api-keys" || tab === "developers") return "developers";
    if (tab === "ai-licensing" || tab === "pricing" || tab === "content") return "profile";
    if (tab === "admin") {
      // Legacy admin tab — admin moved to /admin route
      return "profile";
    }
    // Legacy ?tab=billing / ?tab=team redirect to Profile (those tabs retired in Phase 9.4).
    if (tab === "billing" || tab === "team") return "profile";
    const validTabs = ["profile", "developers", "account"];
    return validTabs.includes(tab || "") ? tab! : "profile";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const isAdmin = !!profile?.is_admin;
  // isGated must come AFTER profile is declared (avoids TDZ error)
  const isGated = !profile?.publication_verified && !isAdmin;
  const [publisherName, setPublisherName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [defaultHumanPrice, setDefaultHumanPrice] = useState("5.00");
  const [defaultSyndicationPrice, setDefaultSyndicationPrice] = useState("500.00");
  const [defaultAiPrice, setDefaultAiPrice] = useState("");
  const [aiAnnualPrice, setAiAnnualPrice] = useState("");
  const [publisherCategory, setPublisherCategory] = useState("");
  const [publisherPricingRules, setPublisherPricingRules] = useState<Record<string, any> | null>(null);

  // Bulk pricing state
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [isBulkPricing, setIsBulkPricing] = useState(false);
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);

  // Developer state
  const [publisherIdCopied, setPublisherIdCopied] = useState(false);
  const [publisherIdRevealed, setPublisherIdRevealed] = useState(false);
  
  // API Keys state (canonical /publishers-api-keys)
  const [apiKeys, setApiKeys] = useState<PublisherApiKeyListItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [freshKey, setFreshKey] = useState<{ plaintext_key: string; key_prefix: string; name?: string } | null>(null);
  const [freshKeyCopied, setFreshKeyCopied] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // Webhooks state (canonical /publishers-webhooks; session-JWT carve-out)
  const [webhooks, setWebhooks] = useState<PublisherWebhookListItem[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [createWebhookDialogOpen, setCreateWebhookDialogOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<WebhookEventType[]>(["license.paid"]);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [freshWebhookSecret, setFreshWebhookSecret] = useState<{ id: string; url: string; secret: string } | null>(null);
  const [freshWebhookSecretCopied, setFreshWebhookSecretCopied] = useState(false);
  const [revokingWebhookId, setRevokingWebhookId] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookId: string; result: PublisherWebhookTestResult } | { webhookId: string; error: string } | null>(null);

  // Logo state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Save feedback banners
  // saveBanner shape carries the actual backend error message (KI #124 fix).
  // Pre-fix: boolean-ish "success"|"error"|null with hardcoded "Failed to save.
  // Try again." text — hid the actual diagnostic from the user. Backend's
  // _shared/cors.ts:errorResponse returns `error` as a STRING; legacy parsing
  // (`result.error?.message`) was always undefined for this envelope shape.
  const [saveBanner, setSaveBanner] = useState<
    | { kind: "success" }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [contactForPricing, setContactForPricing] = useState(false);

  // Content Taxonomy
  const CATEGORIES = [
    "Finance & Markets", "Technology", "Politics & Policy", "Business",
    "Media & Journalism", "Science", "Health & Medicine", "Law & Regulation",
    "Energy & Climate", "Defence & Security", "Culture & Society", "Sports",
    "Travel", "Food & Lifestyle", "Education", "Real Estate",
    "Crypto & Web3", "AI & Machine Learning",
  ];
  const [publisherCategories, setPublisherCategories] = useState<string[]>([]);
  const [expertiseSummary, setExpertiseSummary] = useState("");
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

  // Stripe Connect status (used by Profile tab's connected/payout banner)
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
    const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  }, [apiHeaders]);

  const fetchProfile = useCallback(async () => {
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, { headers });
      const result = await res.json();
      if (result.success && result.data) {
        const pub = result.data.publisher || result.data;
        const stats = result.data.stats || {};
        const d: PublisherProfile = {
          ...pub,
          article_count: stats.article_count ?? pub.article_count ?? 0,
          transaction_count: stats.transaction_count ?? pub.transaction_count ?? 0,
          email: pub.email || user?.email || "",
        };
        setProfile(d);
        setPublisherName(d.name || "");
        setBio(d.description || "");
        setWebsiteUrl(d.website_url || "");
        setContactEmail(d.contact_email || "");
        setContactForPricing(!!(d as any).contact_for_pricing);
        setDefaultHumanPrice(d.default_human_price != null ? String(d.default_human_price) : "25.00");
        // Load syndication price from pricing_rules, fall back to legacy flat field
        const syndicationPrice = d.pricing_rules?.license_types?.syndication?.price_per_article
          ?? (d as any).default_syndication_price
          ?? 500;
        setDefaultSyndicationPrice(String(syndicationPrice));
        setPublisherPricingRules(d.pricing_rules ?? null);
        setDefaultAiPrice(d.default_ai_price != null ? String(d.default_ai_price) : "");
        setAiAnnualPrice((d as any).ai_annual_price != null ? String((d as any).ai_annual_price) : "");
        setPublisherCategory((d as any).category || "");
        setLogoPreview(d.logo_url || null);
         if ((d as any).categories) {
           setPublisherCategories((d as any).categories);
         }
         if ((d as any).expertise_summary) {
           setExpertiseSummary((d as any).expertise_summary);
         }
       }
    } catch (err) {
      console.warn("[Settings] Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiHeaders]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeTab === "pricing" && articleCount === null && profile?.api_key) {
      fetch(`${EXT_SUPABASE_URL}/api?action=articles&limit=1`, {
        headers: { "X-API-Key": profile.api_key },
      })
        .then((r) => r.json())
        .then((json) => {
          if (typeof json.total === "number") setArticleCount(json.total);
        })
        .catch(() => {});
    }
  }, [activeTab, articleCount, profile?.api_key]);

  const loadApiKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const token = await getAccessToken();
      const result = await publisherApi.listApiKeys(token);
      setApiKeys(result.api_keys ?? []);
    } catch (err) {
      toast({
        title: "Couldn't load API keys",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKeys(false);
    }
  }, [getAccessToken, toast]);

  useEffect(() => {
    if (activeTab !== "developers" || !profile) return;
    void loadApiKeys();
  }, [activeTab, profile, loadApiKeys]);

  const loadWebhooks = useCallback(async () => {
    setIsLoadingWebhooks(true);
    try {
      const token = await getAccessToken();
      const result = await publisherApi.listWebhooks(token);
      setWebhooks(result.webhooks ?? []);
    } catch (err) {
      toast({
        title: "Couldn't load webhooks",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWebhooks(false);
    }
  }, [getAccessToken, toast]);

  useEffect(() => {
    if (activeTab !== "developers" || !profile) return;
    void loadWebhooks();
  }, [activeTab, profile, loadWebhooks]);

  // Realtime: if THIS user is removed from the team, force redirect to home
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("team-membership-watch")
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "team_members",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        toast({
          title: "Access Removed",
          description: "You have been removed from this team. Redirecting...",
          variant: "destructive",
        });
        setTimeout(() => navigate("/"), 2000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, navigate, toast]);

  // Billing tab: load stripe status & plan

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

  const isStripeFullyConnected = stripeStatus?.connected && stripeStatus?.onboarding_complete;
  const isStripePartial = stripeStatus?.connected && !stripeStatus?.onboarding_complete;

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers = await apiHeaders();
      // KI #122 fix: syndication merge block REMOVED. Phase 5.1 vocabulary
      // unification stripped 'syndication' from publisher-profile's PATCH
      // allowlist (validTypes = human_per_article / human_full_archive /
      // ai_retrieval / ai_training). KI #67 closed 2026-05-01 deleted
      // ArchiveLicenseCheckout + PublisherLicensingPage syndication card but
      // missed this Settings.tsx writeback — every Settings save has been
      // silently failing since (frontend hid the actual reason via KI #124
      // response-shape parse bug; only surfaced 2026-05-05 Phase 5.11-β
      // walk Step 9). The price-input UI surface for syndication is left
      // intact; READ path at L348 still reads legacy values for display, but
      // WRITE path no longer sends the deprecated key.
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: publisherName,
          default_human_price: parseFloat(defaultHumanPrice) || 0,
          pricing_rules: publisherPricingRules,
          default_ai_price: defaultAiPrice ? parseFloat(defaultAiPrice) : null,
          ai_annual_price: aiAnnualPrice ? parseFloat(aiAnnualPrice) : null,
          category: publisherCategory || null,
          website_url: websiteUrl,
          description: bio,
          contact_email: contactEmail || null,
          contact_for_pricing: contactForPricing,
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (result.data) {
          setProfile(result.data);
          if (result.data.pricing_rules !== undefined) {
            setPublisherPricingRules(result.data.pricing_rules ?? null);
          }
        }
        setSaveBanner({ kind: "success" });
        setTimeout(() => setSaveBanner(null), 3000);
      } else {
        // KI #124 fix: handle BOTH error envelope shapes per
        // _shared/cors.ts. errorResponse returns string; legacy
        // license/webhook handlers may return {code, message}. Pre-fix
        // `result.error?.message` was always undefined for the string
        // shape, falling back to hardcoded "Save failed" and hiding
        // the actual diagnostic from the user.
        const errMsg = typeof result.error === "string"
          ? result.error
          : (result.error?.message ?? "Save failed");
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      setSaveBanner({ kind: "error", message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    if (!profile?.id) {
      toast({ title: "Not ready", description: "Please wait for your profile to load", variant: "destructive" });
      return;
    }
    setIsUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${profile.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("publisher-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from("publisher-logos").getPublicUrl(path);
      const headers = await apiHeaders();
      await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ logo_url: publicUrl }),
      });
      setLogoPreview(publicUrl);
      setProfile(prev => prev ? { ...prev, logo_url: publicUrl } : prev);
      toast({ title: "Logo Updated", description: "Your publication logo has been saved." });
    } catch (err: unknown) {
      toast({ title: "Upload Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const publisherId = profile?.id || user?.id || "";

  const handleCopyPublisherId = async () => {
    try {
      await navigator.clipboard.writeText(publisherId);
      setPublisherIdCopied(true);
      setTimeout(() => setPublisherIdCopied(false), 2000);
      toast({ title: "Copied!", description: "Publisher ID copied to clipboard" });
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  const handleCreateApiKey = async () => {
    if (isCreatingKey) return;
    setIsCreatingKey(true);
    try {
      const token = await getAccessToken();
      const trimmed = newKeyName.trim();
      const result = await publisherApi.createApiKey(
        trimmed.length > 0 ? { name: trimmed } : {},
        token,
      );
      setFreshKey({
        plaintext_key: result.plaintext_key,
        key_prefix: result.key_prefix,
        name: result.name,
      });
      setFreshKeyCopied(false);
      setCreateKeyDialogOpen(false);
      setNewKeyName("");
      void loadApiKeys();
    } catch (err) {
      toast({
        title: "Couldn't create API key",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (revokingKeyId) return;
    setRevokingKeyId(id);
    try {
      const token = await getAccessToken();
      await publisherApi.revokeApiKey(id, token);
      toast({ title: "API key revoked" });
      void loadApiKeys();
    } catch (err) {
      toast({
        title: "Couldn't revoke",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleCopyFreshKey = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey.plaintext_key);
      setFreshKeyCopied(true);
      setTimeout(() => setFreshKeyCopied(false), 2000);
      toast({ title: "Copied", description: "Save it now — it won't be shown again." });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  const toggleNewWebhookEvent = (evt: WebhookEventType) => {
    setNewWebhookEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  const handleCreateWebhook = async () => {
    if (isCreatingWebhook) return;
    const trimmedUrl = newWebhookUrl.trim();
    if (!trimmedUrl) {
      toast({ title: "URL required", variant: "destructive" });
      return;
    }
    if (!/^https:\/\//i.test(trimmedUrl)) {
      toast({ title: "URL must use https://", variant: "destructive" });
      return;
    }
    if (newWebhookEvents.length === 0) {
      toast({ title: "Pick at least one event type", variant: "destructive" });
      return;
    }
    setIsCreatingWebhook(true);
    try {
      const token = await getAccessToken();
      const result = await publisherApi.createWebhook(
        { url: trimmedUrl, event_types: newWebhookEvents },
        token,
      );
      setFreshWebhookSecret({
        id: result.id,
        url: result.url,
        secret: result.webhook_secret_plaintext,
      });
      setFreshWebhookSecretCopied(false);
      setCreateWebhookDialogOpen(false);
      setNewWebhookUrl("");
      setNewWebhookEvents(["license.paid"]);
      void loadWebhooks();
    } catch (err) {
      toast({
        title: "Couldn't create webhook",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const handleRevokeWebhook = async (id: string) => {
    if (revokingWebhookId) return;
    setRevokingWebhookId(id);
    try {
      const token = await getAccessToken();
      await publisherApi.revokeWebhook(id, token);
      toast({ title: "Webhook revoked" });
      void loadWebhooks();
    } catch (err) {
      toast({
        title: "Couldn't revoke",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setRevokingWebhookId(null);
    }
  };

  const handleTestWebhook = async (id: string) => {
    if (testingWebhookId) return;
    setTestingWebhookId(id);
    setTestResult(null);
    try {
      const token = await getAccessToken();
      const result = await publisherApi.testWebhook(id, token);
      setTestResult({ webhookId: id, result });
    } catch (err) {
      setTestResult({
        webhookId: id,
        error: err instanceof Error ? err.message : "Test request failed.",
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleCopyFreshWebhookSecret = async () => {
    if (!freshWebhookSecret) return;
    try {
      await navigator.clipboard.writeText(freshWebhookSecret.secret);
      setFreshWebhookSecretCopied(true);
      setTimeout(() => setFreshWebhookSecretCopied(false), 2000);
      toast({ title: "Copied", description: "Save it now — it won't be shown again." });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Settings">
        <SEO title="Settings — Opedd" path="/settings" noindex />
        <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
          {/* Save success banner — top-of-page; ephemeral confirmation
              (3s auto-dismiss). KI #123: error variant moved inline-above-
              Save (search for `saveBanner?.kind === "error"` further down)
              so a save failure surfaces adjacent to the failing action
              instead of forcing the user to scroll back to the top. */}
          <AnimatePresence>
            {saveBanner?.kind === "success" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-[#f0fdf4] px-4 py-3"
              >
                <CheckCircle size={16} className="text-[#166534] flex-shrink-0" />
                <span className="text-sm font-medium text-[#166534]">Settings saved</span>
              </motion.div>
            )}
          </AnimatePresence>
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <PublicationGate
              isVerified={profile?.publication_verified ?? false}
              pendingSources={profile?.pending_sources ?? []}
              onSourceDeleted={() => { setProfile(null); setIsLoading(true); }}
              isAdmin={isAdmin}
              bannerOnly
            >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Global tab style — #4A26ED underline */}
              <div className="border-b border-[#E5E7EB] overflow-x-auto">
                <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0 whitespace-nowrap">
                  {[
                    { value: "profile", label: "Profile" },
                    { value: "developers", label: "Developers" },
                    { value: "account", label: "Account" },
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

              <AnimatePresence mode="wait">
                {/* TAB 1: Profile */}
                <TabsContent value="profile" className="mt-6" forceMount={activeTab === "profile" ? true : undefined}>
                  {activeTab === "profile" && (
                    <motion.div key="profile" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {/* Stripe KYC Warning — show when publisher has started Stripe onboarding but hasn't completed KYC */}
                      {profile?.stripe_account_id && (
                        !profile.stripe_onboarding_complete || (profile.stripe_connect && !profile.stripe_connect.payouts_enabled)
                      ) && (
                       <div className="flex items-start gap-3 rounded-xl border border-[#4A26ED]/20 bg-[#EEF0FF] px-5 py-4">
                          <AlertTriangle size={18} className="text-[#4A26ED] mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#040042]">
                              {!profile.stripe_onboarding_complete
                                ? "Your Stripe payouts are not yet enabled. Complete your Stripe account setup to receive payments."
                                : "Your Stripe account is connected but payouts are not yet enabled. Complete your Stripe identity verification to receive payments."}
                            </p>
                            {profile.stripe_disabled_reason && (
                              <p className="text-xs text-[#6B7280] mt-1.5">
                                <span className="font-medium text-[#040042]">Stripe says:</span>{" "}
                                {String(profile.stripe_disabled_reason).startsWith("currently_due:")
                                  ? `Missing - ${String(profile.stripe_disabled_reason)
                                      .replace("currently_due:", "")
                                      .split(",")
                                      .map((r) => r.replace(/[._]/g, " "))
                                      .join(", ")}`
                                  : String(profile.stripe_disabled_reason).replace(/[._]/g, " ")}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white flex-shrink-0"
                            onClick={async () => {
                              try {
                                const headers = await apiHeaders();
                                if (!profile.stripe_onboarding_complete) {
                                  // Incomplete onboarding — redirect in same tab to avoid popup blocker
                                  const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify({ action: "connect_stripe" }),
                                  });
                                  const result = await res.json();
                                  if (result.success && result.data?.onboarding_url) {
                                    window.location.href = result.data.onboarding_url;
                                  } else {
                                    toast({ title: "Could not open Stripe", description: "Please try again", variant: "destructive" });
                                  }
                                } else {
                                  // Onboarding complete but payouts disabled — open Stripe dashboard
                                  const newWindow = window.open("", "_blank");
                                  const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify({ action: "stripe_dashboard" }),
                                  });
                                  const result = await res.json();
                                  if (result.success && result.data?.dashboard_url) {
                                    if (newWindow) newWindow.location.href = result.data.dashboard_url;
                                  } else {
                                    if (newWindow) newWindow.close();
                                    toast({ title: "Could not open Stripe", description: "Please try again", variant: "destructive" });
                                  }
                                }
                              } catch {
                                toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
                              }
                            }}
                          >
                            {!profile.stripe_onboarding_complete ? "Complete setup" : "Complete verification"}
                          </Button>
                        </div>
                      )}
                      {/* Stats Row */}
                      {profile && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm flex items-center gap-3">
                            <FileText size={18} className="text-[#4A26ED]" />
                            <div>
                              <p className="text-2xl font-bold text-[#040042]">{profile.article_count}</p>
                              <p className="text-xs text-[#6B7280]">Articles</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm flex items-center gap-3">
                            <BarChart3 size={18} className="text-emerald-600" />
                            <div>
                              <p className="text-2xl font-bold text-[#040042]">{profile.transaction_count}</p>
                              <p className="text-xs text-[#6B7280]">Transactions</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Your Plan — compact banner */}
                      {profile && (() => {
                        const plan = profile.plan || "free";
                        const badgeStyles = plan === "enterprise"
                          ? "bg-[#E0E7FF] text-[#3730A3]"
                          : plan === "pro"
                          ? "bg-[#EDE9FE] text-[#5B21B6]"
                          : "bg-[#F3F4F6] text-[#6B7280]";
                        const badgeLabel = plan === "enterprise" ? "Enterprise" : plan === "pro" ? "Pro" : "Free";
                        const summary = plan === "enterprise"
                          ? "Unlimited articles · 5% fee"
                          : plan === "pro"
                          ? "Unlimited articles · 8% fee"
                          : "500 articles · 15% fee";

                        return (
                          <div className="bg-white rounded-xl border border-[#E5E7EB] px-5 py-3.5 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${badgeStyles}`}>
                                {badgeLabel}
                              </span>
                              <span className="text-sm text-[#6B7280]">{summary}</span>
                            </div>
                            <button
                              onClick={() => navigate("/settings?tab=billing")}
                              className="text-sm font-medium text-[#4A26ED] hover:underline"
                            >
                              Manage Plan →
                            </button>
                          </div>
                        );
                      })()}

                      {/* Publisher Profile Card */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <h2 className="font-bold text-[#040042] mb-6">Publisher Profile</h2>
                        <div className="grid gap-5">
                          {/* Logo Upload */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#6B7280]">Publication Logo</Label>
                            <div className="flex items-center gap-4">
                              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {logoPreview ? (
                                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                  <Camera size={28} className="text-slate-300" />
                                )}
                              </div>
                              <div>
                                <label className={`cursor-pointer inline-flex items-center gap-2 h-9 px-4 text-sm font-medium border rounded-lg transition-colors ${isUploadingLogo ? "border-slate-200 bg-slate-100 text-gray-400 cursor-not-allowed" : "border-slate-200 bg-transparent text-gray-500 hover:bg-[#040042] hover:text-white hover:border-[#040042]"}`}>
                                  {isUploadingLogo ? <><Spinner size="sm" /> Uploading...</> : <><Upload size={14} /> Upload Logo</>}
                                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={isUploadingLogo} onChange={handleLogoUpload} />
                                </label>
                                <p className="text-xs text-gray-400 mt-1.5">Max 2MB. JPG, PNG, or SVG.</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-[#6B7280]">Publisher Name</Label>
                              <Input value={publisherName} onChange={(e) => setPublisherName(e.target.value)} placeholder="Your display name" className="bg-slate-50 border-slate-200 h-10 rounded-lg focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-[#6B7280]">Email Address</Label>
                              <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input value={profile?.email || user.email || ""} disabled className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-11 opacity-70 cursor-not-allowed" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#6B7280]">Website URL</Label>
                            <div className="relative">
                              <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" className="bg-slate-50 border-slate-200 h-12 rounded-lg pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Bio</Label>
                            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself and your work..." className="bg-slate-50 border-slate-200 rounded-lg min-h-[100px] resize-none focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            <p className="text-xs text-gray-400">Displayed on your public licensing page</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Publication Category</Label>
                            <select
                              value={publisherCategory}
                              onChange={(e) => setPublisherCategory(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm text-[#040042] focus:outline-none focus:border-[#4A26ED] focus:ring-1 focus:ring-[#4A26ED]/20"
                            >
                              <option value="">Select a category…</option>
                              <option value="News & Journalism">News &amp; Journalism</option>
                              <option value="Business & Finance">Business &amp; Finance</option>
                              <option value="Science & Research">Science &amp; Research</option>
                              <option value="Technology">Technology</option>
                              <option value="Law & Policy">Law &amp; Policy</option>
                              <option value="Health & Medicine">Health &amp; Medicine</option>
                              <option value="Arts & Culture">Arts &amp; Culture</option>
                              <option value="Education">Education</option>
                              <option value="Sports">Sports</option>
                              <option value="Entertainment">Entertainment</option>
                              <option value="Other">Other</option>
                            </select>
                            <p className="text-xs text-gray-400">Used by AI systems to discover and license your content</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Annual Catalog Price (USD)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <Input type="number" min="0" step="1" value={aiAnnualPrice} onChange={(e) => setAiAnnualPrice(e.target.value)} placeholder="0" className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                            <p className="text-xs text-gray-400">Flat annual rate for enterprise AI catalog licensing. Leave blank to auto-calculate from per-article AI price.</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#6B7280]">Licensing Contact Email</Label>
                            <div className="relative">
                              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <Input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="licensing@yourdomain.com"
                                className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                              />
                            </div>
                            <p className="text-xs text-gray-400">Buyers will use this email to contact you about Syndication and custom licenses.</p>
                          </div>
                        </div>
                      </div>

                      {/* Contact for Pricing Section */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-1">
                          <MessageSquare size={18} className="text-[#4A26ED]" />
                          <h2 className="font-bold text-[#040042]">Contact for Pricing</h2>
                        </div>
                        <p className="text-xs text-[#6B7280] mb-4 ml-[30px]">
                          When enabled, high-value articles can show "Request License" instead of a checkout button.
                        </p>
                        <div className="flex items-center justify-between ml-[30px]">
                          <div>
                            <p className="text-sm font-medium text-[#111827]">Allow buyers to request a quote</p>
                            <p className="text-xs text-[#6B7280] mt-0.5">Instead of purchasing directly</p>
                          </div>
                          <Switch checked={contactForPricing} onCheckedChange={setContactForPricing} />
                        </div>
                      </div>

                      {/* Support: Resend licenses */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm space-y-3">
                        <h2 className="font-bold text-[#040042] text-sm">Lost your license email?</h2>
                        <p className="text-xs text-gray-500">Enter the buyer's email to resend all license keys to their inbox.</p>
                        <ResendLicensesForm />
                      </div>

                      {/* KI #123: inline-above-Save error banner. Persists
                          until user dismisses or successful save replaces
                          state; sits adjacent to the failing action so the
                          user doesn't have to scroll back to page-top to
                          read what went wrong. */}
                      <AnimatePresence>
                        {saveBanner?.kind === "error" && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                          >
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={16} className="text-[#DC2626] flex-shrink-0" />
                              <span className="text-sm font-medium text-[#DC2626]">{saveBanner.message}</span>
                            </div>
                            <button onClick={() => setSaveBanner(null)} aria-label="Dismiss save error" className="text-red-400 hover:text-red-600"><X size={14} /></button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Save Button */}
                      <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium disabled:opacity-50 transition-all active:scale-[0.98]">
                        {isSaving ? <><Spinner size="md" className="mr-2" />Saving...</> : "Save Changes"}
                      </Button>

                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB 5: Account — data export, sign out, delete account */}
                <TabsContent value="account" className="mt-6" forceMount={activeTab === "account" ? true : undefined}>
                  {activeTab === "account" && (
                    <motion.div key="account" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {/* Account info */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-[#040042] mb-1">Account</h2>
                        <p className="text-sm text-[#6B7280] mb-4">Signed in as <span className="font-medium text-[#040042]">{user?.email}</span></p>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            await logout();
                            navigate("/login");
                          }}
                          className="border-slate-200"
                        >
                          Sign out
                        </Button>
                      </div>

                      {/* Data Export */}
                      <div className="border border-slate-200 rounded-xl p-6 bg-white">
                        <h2 className="text-lg font-bold text-[#040042] mb-1">Export your data</h2>
                        <p className="text-sm text-[#6B7280] mb-4">
                          Download all your articles, transactions, webhook deliveries, team, and profile as JSON or CSV. Limited to 5 exports per day.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const token = await getAccessToken();
                              const url = `${EXT_SUPABASE_URL}/export-data?format=json`;
                              const res = await fetch(url, { headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` } });
                              if (!res.ok) {
                                toast({ title: "Export failed", description: (await res.json().catch(() => ({}))).error || res.statusText, variant: "destructive" });
                                return;
                              }
                              const blob = await res.blob();
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `opedd-export-${new Date().toISOString().slice(0, 10)}.json`;
                              a.click();
                              URL.revokeObjectURL(a.href);
                              toast({ title: "Export downloaded" });
                            }}
                          >Download JSON</Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const token = await getAccessToken();
                              const url = `${EXT_SUPABASE_URL}/export-data?format=csv`;
                              const res = await fetch(url, { headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` } });
                              if (!res.ok) {
                                toast({ title: "Export failed", description: (await res.json().catch(() => ({}))).error || res.statusText, variant: "destructive" });
                                return;
                              }
                              const blob = await res.blob();
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `opedd-export-${new Date().toISOString().slice(0, 10)}.csv`;
                              a.click();
                              URL.revokeObjectURL(a.href);
                              toast({ title: "Export downloaded" });
                            }}
                          >Download CSV</Button>
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div className="border border-red-300 rounded-xl p-6 bg-white">
                        <h2 className="text-lg font-bold text-red-600 mb-1">Delete Account</h2>
                        <p className="text-sm text-[#6B7280] mb-4">
                          Permanently delete your publisher account. Your financial records are retained for legal compliance, but all personal information will be anonymised.
                        </p>
                        <button
                          onClick={() => { setDeleteConfirmText(""); setDeleteOpen(true); }}
                          className="border border-red-400 text-red-600 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-50 transition-colors"
                        >
                          Delete My Account
                        </button>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB 2: Team */}

                {/* TAB: API Keys */}
                <TabsContent value="developers" className="mt-6" forceMount={activeTab === "developers" ? true : undefined}>
                  {activeTab === "developers" && (
                    <motion.div key="developers" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {isGated ? <LockedTabContent /> : <>
                      {/* Publisher ID */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                            <FileText size={16} className="text-[#4A26ED]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="font-bold text-[#040042]">Publisher ID</h2>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-green-100 text-green-700">Public</span>
                            </div>
                            <p className="text-gray-500 text-xs">Public identifier — safe to include in HTML and third-party integrations</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                            <code className="text-sm text-[#040042] font-mono truncate block">{publisherId}</code>
                          </div>
                          <Button size="sm" onClick={handleCopyPublisherId} className="h-11 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium flex-shrink-0 transition-all">
                            {publisherIdCopied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy ID</>}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Use this in your widget embed snippet and AI defense policy URL</p>
                      </div>

                      {/* Widget Embed Code — moved to Distribution/Widget tab */}

                      {/* API Keys */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="font-bold text-[#040042]">API Keys</h2>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-100 text-red-700">Secret</span>
                            </div>
                            <p className="text-[#6B7280] text-xs mt-0.5">Keys are shown once at creation. Treat each like a password — never expose in frontend code or HTML.</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => { setNewKeyName(""); setCreateKeyDialogOpen(true); }}
                            className="h-9 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium flex-shrink-0"
                          >
                            <Key size={14} className="mr-2" />Create key
                          </Button>
                        </div>

                        {isLoadingKeys && apiKeys.length === 0 ? (
                          <div className="text-center py-6"><Spinner size="md" className="text-gray-400" /></div>
                        ) : apiKeys.length === 0 ? (
                          <div className="text-center py-6 text-sm text-gray-500">
                            No API keys yet. Click <span className="font-medium">Create key</span> to issue one.
                          </div>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {apiKeys.map((k) => {
                              const isRevoked = k.revoked_at !== null;
                              const lastUsed = k.last_used_at
                                ? new Date(k.last_used_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })
                                : "Never used";
                              const created = new Date(k.created_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
                              return (
                                <li key={k.id} className="py-3 flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm text-[#040042] font-mono">{k.key_prefix}…</code>
                                      {k.name && <span className="text-sm text-[#040042] truncate">{k.name}</span>}
                                      {isRevoked && <Badge variant="secondary" className="text-[10px] uppercase">Revoked</Badge>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">Created {created} · Last used {lastUsed}</p>
                                  </div>
                                  {!isRevoked && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={revokingKeyId === k.id}
                                          className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                                        >
                                          {revokingKeyId === k.id ? <Spinner size="sm" /> : <>Revoke</>}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-white">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="flex items-center gap-2 text-[#040042]"><AlertTriangle size={20} className="text-amber-500" />Revoke API key?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-gray-600">
                                            This will invalidate <span className="font-mono">{k.key_prefix}…</span> immediately. Integrations using this key will stop working.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleRevokeApiKey(k.id)} className="bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-lg">Yes, revoke</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                          <Shield size={12} className="text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-gray-500">Keep keys secret. Use them only in server-side code.</p>
                        </div>
                      </div>

                      {/* Webhooks */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="font-bold text-[#040042]">Webhooks</h2>
                            </div>
                            <p className="text-[#6B7280] text-xs mt-0.5">
                              Receive license lifecycle events at your HTTPS endpoint. Each webhook gets a signing secret (HMAC-SHA256, shown once).
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => { setNewWebhookUrl(""); setNewWebhookEvents(["license.paid"]); setCreateWebhookDialogOpen(true); }}
                            className="h-9 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium flex-shrink-0"
                          >
                            <Send size={14} className="mr-2" />Add webhook
                          </Button>
                        </div>

                        {isLoadingWebhooks && webhooks.length === 0 ? (
                          <div className="text-center py-6"><Spinner size="md" className="text-gray-400" /></div>
                        ) : webhooks.length === 0 ? (
                          <div className="text-center py-6 text-sm text-gray-500">
                            No webhooks yet. Click <span className="font-medium">Add webhook</span> to register one.
                          </div>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {webhooks.map((w) => {
                              const isRevoked = w.revoked_at !== null;
                              const created = new Date(w.created_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
                              const banner = testResult && testResult.webhookId === w.id ? testResult : null;
                              return (
                                <li key={w.id} className="py-3 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <code className="text-sm text-[#040042] font-mono truncate">{w.url}</code>
                                        {isRevoked && <Badge variant="secondary" className="text-[10px] uppercase">Revoked</Badge>}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        Events: {w.event_types.join(", ")} · Created {created}
                                      </p>
                                    </div>
                                    {!isRevoked && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleTestWebhook(w.id)}
                                          disabled={testingWebhookId === w.id}
                                          className="h-8 px-3 text-xs flex-shrink-0"
                                        >
                                          {testingWebhookId === w.id ? <Spinner size="sm" /> : <>Test</>}
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={revokingWebhookId === w.id}
                                              className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                                            >
                                              {revokingWebhookId === w.id ? <Spinner size="sm" /> : <>Revoke</>}
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="bg-white">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="flex items-center gap-2 text-[#040042]">
                                                <AlertTriangle size={20} className="text-amber-500" />Revoke webhook?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription className="text-gray-600">
                                                We'll stop delivering events to <span className="font-mono break-all">{w.url}</span>. This cannot be undone — register a new webhook to resume.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleRevokeWebhook(w.id)} className="bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-lg">Yes, revoke</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>

                                  {banner && "result" in banner && (
                                    <div role="status" aria-live="polite" className={`rounded-md border px-3 py-2 text-xs ${banner.result.delivered ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                                      <strong className="font-semibold">
                                        {banner.result.delivered ? "✓ Delivered" : "Delivery attempted"}
                                      </strong>{" "}
                                      ({banner.result.event})
                                      {banner.result.status_code !== null && <> · HTTP {banner.result.status_code}</>}
                                      {banner.result.reason && <> · {banner.result.reason}</>}
                                    </div>
                                  )}
                                  {banner && "error" in banner && (
                                    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                                      <strong className="font-semibold">Test failed.</strong> {banner.error}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                          <Shield size={12} className="text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-gray-500">Verify deliveries via HMAC-SHA256 of <code className="font-mono">rawBody + timestamp</code>; header <code className="font-mono">X-Opedd-Signature: sha256=&lt;hex&gt;, t=&lt;unix-ms&gt;</code>.</p>
                        </div>
                      </div>
                      </>}
                    </motion.div>
                  )}
                </TabsContent>
                {/* TAB: Billing */}

              </AnimatePresence>
            </Tabs>
            </PublicationGate>
          )}

        </div>

      {/* Create API Key Dialog */}
      <Dialog open={createKeyDialogOpen} onOpenChange={(open) => { if (!isCreatingKey) setCreateKeyDialogOpen(open); }}>
        <DialogContent hideCloseButton className="bg-white max-w-[420px] rounded-xl border border-[#E5E7EB] p-6 shadow-sm gap-0">
          <DialogHeader className="space-y-0 mb-5">
            <DialogTitle className="text-lg font-semibold text-[#040042]">Create API key</DialogTitle>
            <DialogDescription className="text-sm text-[#040042]/50 mt-1.5 leading-relaxed">
              Name it to keep track of where it's used (e.g. "production-server", "staging").
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mb-6">
            <Label htmlFor="new-key-name" className="text-xs font-medium text-[#040042]/50">Name (optional)</Label>
            <Input
              id="new-key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Production server"
              maxLength={100}
              disabled={isCreatingKey}
              className="bg-white border-slate-200 focus:border-[#4A26ED]/40 focus:ring-[#4A26ED]/10 h-10 rounded-lg text-sm"
            />
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCreateKeyDialogOpen(false)} disabled={isCreatingKey} className="rounded-lg border-slate-200">Cancel</Button>
            <Button onClick={handleCreateApiKey} disabled={isCreatingKey} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg">
              {isCreatingKey ? <><Spinner size="sm" className="mr-2" />Creating…</> : <>Create key</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={createWebhookDialogOpen} onOpenChange={(open) => { if (!isCreatingWebhook) setCreateWebhookDialogOpen(open); }}>
        <DialogContent hideCloseButton className="bg-white max-w-[480px] rounded-xl border border-[#E5E7EB] p-6 shadow-sm gap-0">
          <DialogHeader className="space-y-0 mb-5">
            <DialogTitle className="text-lg font-semibold text-[#040042]">Add webhook</DialogTitle>
            <DialogDescription className="text-sm text-[#040042]/50 mt-1.5 leading-relaxed">
              We'll deliver matching events to this HTTPS endpoint, signed with HMAC-SHA256.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="new-webhook-url" className="text-xs font-medium text-[#040042]/50">Endpoint URL</Label>
              <Input
                id="new-webhook-url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/opedd-webhook"
                disabled={isCreatingWebhook}
                className="bg-white border-slate-200 focus:border-[#4A26ED]/40 focus:ring-[#4A26ED]/10 h-10 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#040042]/50">Events</Label>
              <div className="space-y-1.5">
                {WEBHOOK_EVENT_TYPES.map((evt) => (
                  <label key={evt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWebhookEvents.includes(evt)}
                      onChange={() => toggleNewWebhookEvent(evt)}
                      disabled={isCreatingWebhook}
                      className="h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30"
                    />
                    <code className="text-sm font-mono text-[#040042]">{evt}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCreateWebhookDialogOpen(false)} disabled={isCreatingWebhook} className="rounded-lg border-slate-200">Cancel</Button>
            <Button onClick={handleCreateWebhook} disabled={isCreatingWebhook} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg">
              {isCreatingWebhook ? <><Spinner size="sm" className="mr-2" />Creating…</> : <>Create webhook</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fresh Webhook Secret Reveal Dialog (one-time plaintext) */}
      <Dialog open={freshWebhookSecret !== null} onOpenChange={(open) => { if (!open) setFreshWebhookSecret(null); }}>
        <DialogContent hideCloseButton className="bg-white max-w-[520px] rounded-xl border border-[#E5E7EB] p-6 shadow-sm gap-0">
          <DialogHeader className="space-y-0 mb-4">
            <DialogTitle className="text-lg font-semibold text-[#040042] flex items-center gap-2">
              <Send size={18} className="text-[#4A26ED]" />Save your webhook secret now
            </DialogTitle>
            <DialogDescription className="text-sm text-[#040042]/60 mt-1.5 leading-relaxed">
              Use this secret to verify the HMAC-SHA256 signature on inbound deliveries. We can't show it again.
            </DialogDescription>
          </DialogHeader>
          {freshWebhookSecret && (
            <div className="space-y-3 mb-6">
              <div className="text-xs text-gray-500">
                Endpoint: <span className="font-mono break-all">{freshWebhookSecret.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                  <code className="text-sm text-[#040042] font-mono break-all">{freshWebhookSecret.secret}</code>
                </div>
                <Button size="sm" onClick={handleCopyFreshWebhookSecret} className="h-11 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium flex-shrink-0">
                  {freshWebhookSecretCopied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy</>}
                </Button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">Lost secrets cannot be recovered. To rotate, revoke this webhook and create a new one.</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-row justify-end">
            <Button onClick={() => setFreshWebhookSecret(null)} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg">
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fresh API Key Reveal Dialog (one-time plaintext) */}
      <Dialog open={freshKey !== null} onOpenChange={(open) => { if (!open) setFreshKey(null); }}>
        <DialogContent hideCloseButton className="bg-white max-w-[520px] rounded-xl border border-[#E5E7EB] p-6 shadow-sm gap-0">
          <DialogHeader className="space-y-0 mb-4">
            <DialogTitle className="text-lg font-semibold text-[#040042] flex items-center gap-2">
              <Key size={18} className="text-[#4A26ED]" />Save your API key now
            </DialogTitle>
            <DialogDescription className="text-sm text-[#040042]/60 mt-1.5 leading-relaxed">
              This is the only time the full key will be shown. Copy it and store it somewhere safe — we don't store it.
            </DialogDescription>
          </DialogHeader>
          {freshKey && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                  <code className="text-sm text-[#040042] font-mono break-all">{freshKey.plaintext_key}</code>
                </div>
                <Button size="sm" onClick={handleCopyFreshKey} className="h-11 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium flex-shrink-0">
                  {freshKeyCopied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy</>}
                </Button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">After you close this dialog, only the prefix <span className="font-mono">{freshKey.key_prefix}…</span> will be visible. Lost keys must be revoked and re-issued.</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-row justify-end">
            <Button onClick={() => setFreshKey(null)} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg">
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent hideCloseButton className="bg-white max-w-[420px] rounded-xl border border-[#E5E7EB] p-6 shadow-sm gap-0">
          <DialogHeader className="space-y-0 mb-5">
            <DialogTitle className="text-lg font-semibold text-[#040042]">Delete Account</DialogTitle>
            <DialogDescription className="text-sm text-[#040042]/50 mt-1.5 leading-relaxed">
              This will permanently delete your publisher account, all your content, licensing settings, and API keys. Your financial records are retained for legal compliance but all personal information will be anonymised. <span className="font-semibold text-[#040042]">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mb-6">
            <label className="text-xs font-medium text-[#040042]/50">
              Type <span className="font-mono font-semibold text-[#040042]">DELETE</span> to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-white border-slate-200 focus:border-[#4A26ED]/40 focus:ring-[#4A26ED]/10 h-10 rounded-lg text-sm font-mono"
            />
          </div>

          <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
            <button
              onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); }}
              disabled={isDeleting}
              className="text-sm font-medium text-[#6b7280] hover:text-[#040042] hover:underline transition-colors px-4 h-9 flex items-center"
            >
              Cancel
            </button>
            <Button
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              onClick={async () => {
                setIsDeleting(true);
                try {
                  const token = await getAccessToken();
                  const res = await fetch(`${EXT_SUPABASE_URL}/delete-account`, {
                    method: "POST",
                    headers: {
                      apikey: EXT_ANON_KEY,
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  });
                  if (!res.ok) {
                    const result = await res.json().catch(() => ({}));
                    throw new Error(result.error || `Request failed (${res.status})`);
                  }
                  await logout();
                  navigate("/");
                } catch (err: unknown) {
                  toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="bg-[#EF4444] hover:bg-red-600 text-white rounded-lg h-9 px-4 text-sm font-medium disabled:opacity-40"
            >
              {isDeleting ? <><Spinner size="sm" className="mr-2" />Deleting...</> : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
