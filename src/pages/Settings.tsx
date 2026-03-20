import React, { useState, useEffect, useCallback, useRef } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
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
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { PublicationGate, LockedTabContent } from "@/components/dashboard/PublicationGate";

const ADMIN_EMAIL = "alexandre.n.bridi@gmail.com";


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
  stripe_connect: StripeConnect | null;
  webhook_url: string | null;
  webhook: { configured: boolean; url: string } | null;
  created_at: string;
  excluded_url_patterns?: string[];
  pricing_rules?: Record<string, any> | null;
  content_delivery_enabled?: boolean;
  publication_verified?: boolean;
  pending_sources?: Array<{ id: string; name: string; url: string; verification_status: string; sync_status: string }>;
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
        {sending ? <Loader2 size={14} className="animate-spin" /> : "Resend All Licenses"}
      </Button>
    </div>
  );
}

export default function Settings() {
  const { user, getAccessToken, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    const validTabs = ["pricing", "api-keys", "team", "billing", "admin"];
    return validTabs.includes(tab || "") ? tab! : "profile";
  });
  const isAdmin = user?.email === ADMIN_EMAIL;
  const isGated = !profile?.publication_verified && !isAdmin;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cancel subscription state
  const [cancelSubOpen, setCancelSubOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [publisherName, setPublisherName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [defaultHumanPrice, setDefaultHumanPrice] = useState("5.00");
  const [defaultSyndicationPrice, setDefaultSyndicationPrice] = useState("500.00");
  const [defaultAiPrice, setDefaultAiPrice] = useState("");
  const [publisherPricingRules, setPublisherPricingRules] = useState<Record<string, any> | null>(null);

  // Bulk pricing state
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [isBulkPricing, setIsBulkPricing] = useState(false);
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);

  // Developer state
  const [publisherIdCopied, setPublisherIdCopied] = useState(false);
  const [publisherIdRevealed, setPublisherIdRevealed] = useState(false);
  
  // API Key state
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Logo state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);


  // Save feedback banners
  const [saveBanner, setSaveBanner] = useState<"success" | "error" | null>(null);
  const [apiKeyWarning, setApiKeyWarning] = useState(false);
  const [contactForPricing, setContactForPricing] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; user_id: string; role: string; email: string; joined_at: string }>>([]);
  const [teamInvitations, setTeamInvitations] = useState<Array<{ id: string; email: string; role: string; created_at: string; expires_at: string }>>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("owner");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamError, setTeamError] = useState(false);

  // Billing tab state
  interface StripeConnect {
    connected: boolean;
    onboarding_complete: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
  }
  const [stripeStatus, setStripeStatus] = useState<StripeConnect | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(true);
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);
  const [publisherPlan, setPublisherPlan] = useState<string>("free");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isBillingPortalLoading, setIsBillingPortalLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annually">("monthly");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutStripePromise, setCheckoutStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  // Admin tab state
  interface AdminPublisher {
    id: string;
    display_name: string;
    website_url: string | null;
    plan: string;
    article_count: number;
    total_revenue: number;
    stripe_connected: boolean;
    created_at: string;
  }
  interface AdminTransaction {
    id: string;
    created_at: string;
    buyer_email: string;
    amount: number;
    license_type: string;
    license_key: string;
    status: string;
  }
  interface AdminFailedWebhook {
    id: string;
    publisher_name: string;
    event_type: string;
    attempts: number;
    last_attempt_at: string;
    status: string;
  }
  const [adminPublishers, setAdminPublishers] = useState<AdminPublisher[]>([]);
  const [adminTxns, setAdminTxns] = useState<AdminTransaction[]>([]);
  const [adminWebhooks, setAdminWebhooks] = useState<AdminFailedWebhook[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminTxPage, setAdminTxPage] = useState(0);
  const [adminTxHasMore, setAdminTxHasMore] = useState(false);
  const [copiedLicenseKey, setCopiedLicenseKey] = useState<string | null>(null);

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
        setLogoPreview(d.logo_url || null);
      }
    } catch (err) {
      console.warn("[Settings] Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiHeaders]);

  const fetchTeam = useCallback(async () => {
    setIsLoadingTeam(true);
    setTeamError(false);
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "list_team" }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setTeamMembers(result.data.members || []);
        setTeamInvitations(result.data.invitations || []);
        if (result.data.current_user_role) {
          setCurrentUserRole(result.data.current_user_role);
        }
      } else {
        console.warn("[Settings] Team fetch returned error:", result.error);
        setTeamError(true);
      }
    } catch (err) {
      console.warn("[Settings] Team fetch failed:", err);
      setTeamError(true);
    } finally {
      setIsLoadingTeam(false);
      // Always mark as loaded to prevent infinite retry loop
      setTeamLoaded(true);
    }
  }, [apiHeaders]);

  const handleInviteMember = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsInviting(true);
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "invite_member", email }),
      });
      const result = await res.json();
      if (result.success) {
        setInviteEmail("");
        toast({ title: "Invitation Sent", description: `An invite has been sent to ${email}.` });
        fetchTeam();
      } else {
        throw new Error(result.error || "Failed to send invitation");
      }
    } catch (err: unknown) {
      toast({ title: "Invite Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId);
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "remove_member", member_id: memberId }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Member Removed", description: "The team member has been removed." });
        fetchTeam();
      } else {
        throw new Error(result.error || "Failed to remove member");
      }
    } catch (err: unknown) {
      toast({ title: "Remove Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "cancel_invitation", invitation_id: invitationId }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Invitation Cancelled", description: "The pending invitation has been cancelled." });
        fetchTeam();
      } else {
        throw new Error(result.error || "Failed to cancel invitation");
      }
    } catch (err: unknown) {
      toast({ title: "Cancel Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    }
  };

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

  useEffect(() => {
    if (activeTab === "team" && !teamLoaded && !isLoadingTeam) {
      fetchTeam();
    }
  }, [activeTab, teamLoaded, isLoadingTeam, fetchTeam]);

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
  const fetchBillingData = useCallback(async () => {
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
      console.warn("[Settings/Billing] Load failed:", err);
    } finally {
      setIsStripeLoading(false);
    }
  }, [apiHeaders, postAction]);

  useEffect(() => {
    if (activeTab === "billing") fetchBillingData();
  }, [activeTab, fetchBillingData]);

  // Admin tab: load publishers, transactions, webhooks
  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` };
      const [pubRes, txRes, whRes] = await Promise.all([
        fetch(`${EXT_SUPABASE_URL}/admin?action=publishers`, { headers }),
        fetch(`${EXT_SUPABASE_URL}/admin?action=transactions&limit=50&offset=${adminTxPage * 50}`, { headers }),
        fetch(`${EXT_SUPABASE_URL}/admin?action=failed_webhooks`, { headers }),
      ]);
      const [pubJson, txJson, whJson] = await Promise.all([pubRes.json(), txRes.json(), whRes.json()]);
      setAdminPublishers(pubJson.data?.publishers ?? []);
      const txRows = txJson.data?.transactions ?? [];
      setAdminTxns(txRows);
      setAdminTxHasMore(txRows.length === 50);
      setAdminWebhooks(whJson.data?.failed_webhooks ?? []);
    } catch {
      // silently fail
    } finally {
      setAdminLoading(false);
      setAdminLoaded(true);
    }
  }, [isAdmin, getAccessToken, adminTxPage]);

  useEffect(() => {
    if (activeTab === "admin" && isAdmin && !adminLoaded) fetchAdminData();
  }, [activeTab, isAdmin, adminLoaded, fetchAdminData]);

  // Billing handlers
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
      const result = await postAction("create_subscription", { plan, embedded: true, billing });
      if (result.success && result.data?.client_secret) {
        const stripePromise = loadStripe(result.data.publishable_key);
        setCheckoutStripePromise(stripePromise);
        setCheckoutClientSecret(result.data.client_secret);
      } else {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to start checkout");
      }
    } catch (err: unknown) {
      toast({ title: "Upgrade Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleCloseCheckout = () => {
    setCheckoutClientSecret(null);
    setCheckoutStripePromise(null);
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

  // Plan data
  const PLANS = [
    { key: "free", name: "Free", price: "$0", period: "/month", description: "For publishers getting started", features: [{ text: "Up to 500 articles" }, { text: "Widget embedding" }, { text: "Basic analytics" }, { text: "Email support" }], highlighted: false },
    { key: "pro", name: "Pro", price: "$29", period: "/month", description: "For growing independent publishers", features: [{ text: "Unlimited articles" }, { text: "8% platform fee (vs 15% free)" }, { text: "Custom webhooks" }, { text: "Team members (up to 5)" }, { text: "Priority support" }, { text: "Advanced analytics" }], highlighted: true },
    { key: "enterprise", name: "Enterprise", price: "$99", period: "/month", description: "For media organisations & large catalogs", features: [{ text: "Everything in Pro" }, { text: "5% platform fee (vs 15% free)" }, { text: "Unlimited team members" }, { text: "Custom integrations" }, { text: "Dedicated support" }, { text: "SLA guarantee" }], highlighted: false },
  ];
  const ANNUAL_PRICES: Record<string, { price: string; total: string }> = { pro: { price: "$23", total: "$276/year" }, enterprise: { price: "$79", total: "$948/year" } };

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers = await apiHeaders();
      const syndicationVal = parseFloat(defaultSyndicationPrice) || 0;
      const mergedRules = {
        ...publisherPricingRules,
        license_types: {
          ...(publisherPricingRules?.license_types ?? {}),
          syndication: {
            ...(publisherPricingRules?.license_types?.syndication ?? {}),
            enabled: syndicationVal > 0,
            price_per_article: syndicationVal,
          },
        },
      };
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: publisherName,
          default_human_price: parseFloat(defaultHumanPrice) || 0,
          pricing_rules: mergedRules,
          default_ai_price: defaultAiPrice ? parseFloat(defaultAiPrice) : null,
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
        setSaveBanner("success");
        setTimeout(() => setSaveBanner(null), 3000);
      } else {
        throw new Error(result.error?.message || "Save failed");
      }
    } catch (err: unknown) {
      setSaveBanner("error");
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
  const apiKey = profile?.api_key || "";

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

  const handleCopyApiKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
      toast({ title: "API Key Copied!", description: "Keep this key secure and never share it publicly." });
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  const handleRegenerateApiKey = async () => {
    setIsRegenerating(true);
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "regenerate_api_key" }),
      });
      const result = await res.json();
      if (result.success && result.data?.api_key) {
        setProfile(prev => prev ? { ...prev, api_key: result.data.api_key } : prev);
        setApiKeyRevealed(true);
        setApiKeyWarning(true);
        toast({ title: "API Key Generated", description: "Your new key is shown below. Update your integrations." });
      } else {
        throw new Error(result.error?.message || "Failed to generate key");
      }
    } catch (err: unknown) {
      toast({ title: "Generation Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
        <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
          {/* Save feedback banners */}
          <AnimatePresence>
            {saveBanner === "success" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-[#f0fdf4] px-4 py-3"
              >
                <CheckCircle size={16} className="text-[#166534] flex-shrink-0" />
                <span className="text-sm font-medium text-[#166534]">Settings saved</span>
              </motion.div>
            )}
            {saveBanner === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[#DC2626] flex-shrink-0" />
                  <span className="text-sm font-medium text-[#DC2626]">Failed to save. Try again.</span>
                </div>
                <button onClick={() => setSaveBanner(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>
          {isLoading ? (
            <PageLoader />
          ) : (
            <PublicationGate
              isVerified={profile?.publication_verified ?? false}
              pendingSources={profile?.pending_sources ?? []}
              onSourceDeleted={() => { setProfile(null); setIsLoading(true); }}
              adminEmail={profile?.email}
              bannerOnly
            >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Global tab style — #4A26ED underline */}
              <div className="border-b border-[#E5E7EB]">
                <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0">
                  {[
                    { value: "profile", label: "Profile" },
                    { value: "pricing", label: "Pricing" },
                    { value: "team", label: "Team" },
                    { value: "api-keys", label: "API Keys" },
                    { value: "content", label: "Content" },
                    { value: "billing", label: "Billing" },
                    ...(isAdmin ? [{ value: "admin", label: "Admin" }] : []),
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
                              onClick={() => navigate("/payments")}
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
                                <label className={`cursor-pointer inline-flex items-center gap-2 h-9 px-4 text-sm font-medium border rounded-lg transition-colors ${isUploadingLogo ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed" : "border-slate-200 bg-transparent text-slate-500 hover:bg-[#040042] hover:text-white hover:border-[#040042]"}`}>
                                  {isUploadingLogo ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Upload Logo</>}
                                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={isUploadingLogo} onChange={handleLogoUpload} />
                                </label>
                                <p className="text-xs text-slate-400 mt-1.5">Max 2MB. JPG, PNG, or SVG.</p>
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
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input value={profile?.email || user.email || ""} disabled className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-11 opacity-70 cursor-not-allowed" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#6B7280]">Website URL</Label>
                            <div className="relative">
                              <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" className="bg-slate-50 border-slate-200 h-12 rounded-lg pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Bio</Label>
                            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself and your work..." className="bg-slate-50 border-slate-200 rounded-lg min-h-[100px] resize-none focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            <p className="text-xs text-slate-400">Displayed on your public licensing page</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#6B7280]">Licensing Contact Email</Label>
                            <div className="relative">
                              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <Input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="licensing@yourdomain.com"
                                className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                              />
                            </div>
                            <p className="text-xs text-slate-400">Buyers will use this email to contact you about Syndication and custom licenses.</p>
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
                        <p className="text-xs text-slate-500">Enter the buyer's email to resend all license keys to their inbox.</p>
                        <ResendLicensesForm />
                      </div>

                      {/* Save Button */}
                      <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium disabled:opacity-50 transition-all active:scale-[0.98]">
                        {isSaving ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : "Save Changes"}
                      </Button>

                      {/* Danger Zone */}
                      <div className="mt-10 pt-8 border-t border-slate-200">
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
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB: Pricing */}
                <TabsContent value="pricing" className="mt-6" forceMount={activeTab === "pricing" ? true : undefined}>
                  {activeTab === "pricing" && (
                    <motion.div key="monetisation" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {isGated ? <LockedTabContent /> : <>
                      {/* Stripe payouts nudge */}
                      {profile && (!profile.stripe_account_id || !profile.stripe_onboarding_complete) && (
                        <p className="text-sm text-amber-600 mb-4">
                          Stripe payouts not set up —{' '}
                          <button onClick={() => navigate('/payments')} className="underline font-medium">
                            configure in Payments
                          </button>
                        </p>
                      )}
                      {/* Info note */}
                      <div className="bg-[#4A26ED]/5 border border-[#4A26ED]/15 rounded-xl px-4 py-3">
                        <p className="text-sm text-[#040042]/70">
                          These are your publication defaults. You can override pricing on individual articles from the Content page.
                        </p>
                      </div>

                      {/* Default Rates Card */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm space-y-5">
                        <h2 className="font-bold text-[#040042]">Default rates</h2>

                        {/* Permission rate */}
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <Label className="text-[#040042] font-bold text-sm">Permission rate</Label>
                            <span className="text-xs text-slate-400">per article</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <Input type="number" min="0" step="0.01" value={defaultHumanPrice} onChange={(e) => setDefaultHumanPrice(e.target.value)} className="bg-white border-slate-200 h-10 rounded-lg pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                          </div>
                          <p className="text-xs text-slate-500 italic">For students, bloggers, and small reuse. Typical range: $10 – $50</p>
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Syndication rate */}
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <Label className="text-[#040042] font-bold text-sm">Syndication rate</Label>
                            <span className="text-xs text-slate-400">starting from, per article</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <Input type="number" min="0" step="0.01" value={defaultSyndicationPrice} onChange={(e) => setDefaultSyndicationPrice(e.target.value)} className="bg-white border-slate-200 h-10 rounded-lg pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                          </div>
                          <p className="text-xs text-slate-500 italic">Full republication, retranslation, corporate distribution. Typical range: $300 – $2,000</p>
                          <p className="text-xs text-[#4A26ED]/80 bg-[#4A26ED]/5 border border-[#4A26ED]/15 rounded-lg px-3 py-2">
                            Publishers with syndication pricing enabled will show a &ldquo;Syndication License&rdquo; option on their article checkout pages.
                          </p>
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* AI training rate */}
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <Label className="text-[#040042] font-bold text-sm">AI training rate</Label>
                            <span className="text-xs text-slate-400">per article (optional)</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <Input type="number" min="0" step="0.01" value={defaultAiPrice} onChange={(e) => setDefaultAiPrice(e.target.value)} placeholder="0.00" className="bg-white border-slate-200 h-10 rounded-lg pl-7 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                          </div>
                          <p className="text-xs text-slate-500 italic">For AI dataset licensing. Leave blank to disable.</p>
                        </div>

                        <Button onClick={handleSave} disabled={isSaving} className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-xl font-semibold disabled:opacity-50 transition-all active:scale-[0.98]">
                          {isSaving ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : "Save rates"}
                        </Button>
                      </div>

                      {/* Bulk Price Update */}
                      <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <h2 className="font-bold text-[#040042]">Apply default prices to all articles</h2>
                            <p className="text-sm text-[#6B7280] mt-1">
                              Override all per-article prices with your current default prices.
                              {articleCount !== null ? ` This affects ${articleCount} article${articleCount !== 1 ? "s" : ""}.` : ""}
                            </p>
                          </div>
                        </div>
                        <AlertDialog open={bulkPricingOpen} onOpenChange={setBulkPricingOpen}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isBulkPricing}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 font-semibold"
                            >
                              {isBulkPricing ? <><Loader2 size={14} className="animate-spin mr-2" />Applying...</> : "Apply to all articles"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-[#040042]">
                                <AlertTriangle size={20} className="text-amber-500" />Apply default prices to all articles?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-600">
                                This will update pricing for {articleCount !== null ? `all ${articleCount} article${articleCount !== 1 ? "s" : ""}` : "all your articles"}. This cannot be undone. Continue?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                                onClick={async () => {
                                  setBulkPricingOpen(false);
                                  setIsBulkPricing(true);
                                  try {
                                    const headers = await apiHeaders();
                                    const res = await fetch(`${EXT_SUPABASE_URL}/update-license-prices`, {
                                      method: "POST",
                                      headers,
                                      body: JSON.stringify({ action: "apply_defaults" }),
                                    });
                                    const result = await res.json();
                                    if (res.ok && result.success !== false) {
                                      toast({ title: "Prices updated", description: "All article prices have been set to your defaults." });
                                    } else {
                                      throw new Error(result.error?.message || result.error || "Failed to apply defaults");
                                    }
                                  } catch (err: unknown) {
                                    toast({ title: "Update failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
                                  } finally {
                                    setIsBulkPricing(false);
                                  }
                                }}
                              >
                                Yes, apply to all
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      </>}

                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB 2: Team */}
                <TabsContent value="team" className="mt-6" forceMount={activeTab === "team" ? true : undefined}>
                  {activeTab === "team" && (
                    <motion.div key="team" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {isGated ? <LockedTabContent /> : <>
                      {isLoadingTeam ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="animate-spin text-[#4A26ED]" size={32} />
                        </div>
                      ) : teamError ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <p className="text-slate-500 text-sm">Failed to load team data.</p>
                            <Button
                            onClick={() => { setTeamLoaded(false); setTeamError(false); }}
                            className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg"
                          >
                            Try Again
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Invite Member (owner only) */}
                          {currentUserRole === "owner" && (
                            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                              <div className="mb-4">
                                <h2 className="font-bold text-[#040042]">Invite Team Member</h2>
                                <p className="text-[#6B7280] text-xs mt-0.5">Send an invitation to join your team as a member</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <Input type="email" placeholder="colleague@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleInviteMember(); }} className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                                </div>
                                <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail.trim()} className="h-12 px-6 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-semibold">
                                  {isInviting ? <><Loader2 size={14} className="mr-2 animate-spin" />Sending...</> : <><Send size={14} className="mr-2" />Send Invite</>}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Team Members */}
                          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                            <h2 className="font-bold text-[#040042] mb-4">Team Members ({teamMembers.length})</h2>
                            <div className="divide-y divide-slate-100">
                              {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center text-sm font-bold text-[#4A26ED] uppercase">
                                      {member.email.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-[#040042]">{member.email}</p>
                                      <p className="text-xs text-slate-400">Joined {new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={member.role === "owner" ? "bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20 font-medium" : "bg-slate-50 text-slate-600 border-slate-200 font-medium"}>
                                      {member.role === "owner" ? "Owner" : "Member"}
                                    </Badge>
                                    {currentUserRole === "owner" && member.role !== "owner" && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50">
                                            <Trash2 size={14} />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-white">
                                          <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 text-[#040042]"><AlertTriangle size={20} className="text-amber-500" />Remove Team Member?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-600">This will remove <strong>{member.email}</strong> from your team.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)} disabled={removingMemberId === member.id} className="bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-lg">
                                              {removingMemberId === member.id ? <><Loader2 size={14} className="animate-spin mr-2" />Removing...</> : "Remove Member"}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {teamMembers.length === 0 && (
                                <p className="text-sm text-slate-400 py-4 text-center">No team members yet — invite someone above.</p>
                              )}
                            </div>
                          </div>

                          {/* Pending Invitations */}
                          {teamInvitations.length > 0 && (
                            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                              <h2 className="font-bold text-[#040042] mb-4">Pending Invitations ({teamInvitations.length})</h2>
                              <div className="divide-y divide-slate-100">
                                {teamInvitations.map((inv) => (
                                  <div key={inv.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                                        <Mail size={16} className="text-amber-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-[#040042]">{inv.email}</p>
                                        <p className="text-xs text-slate-400">
                                          Sent {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          {" "}&middot;{" "}
                                          Expires {new Date(inv.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </p>
                                      </div>
                                    </div>
                                    {currentUserRole === "owner" && (
                                      <Button size="sm" variant="ghost" onClick={() => handleCancelInvitation(inv.id)} className="h-8 px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs">
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      </>}
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB: API Keys */}
                <TabsContent value="api-keys" className="mt-6" forceMount={activeTab === "api-keys" ? true : undefined}>
                  {activeTab === "api-keys" && (
                    <motion.div key="api-keys" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
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
                            <p className="text-slate-500 text-xs">Public identifier — safe to include in HTML and third-party integrations</p>
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
                        <p className="text-xs text-slate-400 mt-3">Use this in your widget embed snippet, WordPress plugin, and AI defense policy URL</p>
                      </div>

                      {/* Widget Embed Code — moved to Distribution/Widget tab */}

                      {/* API Key */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="mb-6">
                          <div className="flex items-center gap-2">
                            <h2 className="font-bold text-[#040042]">API Key</h2>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-100 text-red-700">Secret</span>
                          </div>
                          <p className="text-[#6B7280] text-xs mt-0.5">Secret key — treat like a password. Never expose in frontend code or HTML</p>
                        </div>

                        <div className="space-y-4">
                          {apiKey ? (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                                  <code className="text-sm text-[#040042] font-mono truncate block">
                                    {apiKeyRevealed ? apiKey : apiKey.slice(0, 10) + "•".repeat(20)}
                                  </code>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setApiKeyRevealed(!apiKeyRevealed)} className="h-10 px-3 bg-[#EDF2F7] hover:bg-[#E2E8F0] text-[#4A5568] rounded-lg transition-all">
                                  {apiKeyRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                                <Button size="sm" onClick={handleCopyApiKey} className="h-11 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium transition-all">
                                  {apiKeyCopied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy</>}
                                </Button>
                              </div>
                              {apiKeyWarning && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-amber-800 font-medium">
                                    Your old API key is now invalid. Update any integrations before leaving this page.
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                  <Shield size={12} className="inline mr-1 text-amber-500" />
                                  Keep this key secret. Only use it in server-side code. Regenerating will invalidate the current key.
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" disabled={isRegenerating} className="h-9 px-4 bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-lg font-medium transition-all">
                                      {isRegenerating ? <><RefreshCw size={14} className="mr-2 animate-spin" />Regenerating...</> : <><RefreshCw size={14} className="mr-2" />Regenerate Key</>}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-white">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2 text-[#040042]"><AlertTriangle size={20} className="text-amber-500" />Regenerate API Key?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-slate-600">This will invalidate your current API key immediately. Any integrations using the old key will stop working.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleRegenerateApiKey} className="bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-lg">Yes, Regenerate Key</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-slate-500 mb-3">No API key generated yet.</p>
                              <Button onClick={handleRegenerateApiKey} disabled={isRegenerating} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg">
                                {isRegenerating ? <><Loader2 size={14} className="mr-2 animate-spin" />Generating...</> : <><Key size={14} className="mr-2" />Generate API Key</>}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      </>}
                    </motion.div>
                  )}
                </TabsContent>
                {/* TAB: Content Delivery */}
                <TabsContent value="content" className="mt-6" forceMount={activeTab === "content" ? true : undefined}>
                  {activeTab === "content" && (
                    <motion.div key="content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {/* Content Delivery Toggle */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="font-bold text-[#040042]">Content Delivery</h2>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-[#EEF0FD] text-[#4A26ED]">
                                {profile?.content_delivery_enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                            <p className="text-sm text-[#6B7280] leading-relaxed max-w-lg">
                              When enabled, buyers with a valid license and API token can retrieve article body content via the Opedd API. Push content when registering articles to make it available.
                            </p>
                          </div>
                          <Switch
                            checked={profile?.content_delivery_enabled || false}
                            onCheckedChange={async (checked) => {
                              const headers = await apiHeaders();
                              const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
                                method: "PATCH",
                                headers,
                                body: JSON.stringify({ content_delivery_enabled: checked }),
                              });
                              const result = await res.json();
                              if (result.success) {
                                setProfile((prev) => prev ? { ...prev, content_delivery_enabled: checked } : prev);
                                toast({ title: checked ? "Content delivery enabled" : "Content delivery disabled" });
                              } else {
                                toast({ title: "Failed to update", variant: "destructive" });
                              }
                            }}
                            className="mt-1 shrink-0"
                          />
                        </div>
                      </div>

                      {/* API Usage Docs */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm space-y-5">
                        <div>
                          <h2 className="font-bold text-[#040042] mb-1">Content Delivery API</h2>
                          <p className="text-sm text-[#6B7280]">Buyers use their <code className="text-xs bg-[#F3F4F6] px-1.5 py-0.5 rounded font-mono">bk_live_</code> token to retrieve article content.</p>
                        </div>

                        {/* Step 1: Push content */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">1 — Push content when registering articles</p>
                          <div className="bg-[#0F0F10] rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-[#E5E7EB] whitespace-pre">{`POST /functions/v1/lookup-article
Content-Type: application/json

{
  "publisher_id": "${profile?.id || "YOUR_PUBLISHER_ID"}",
  "url": "https://yoursite.com/article-slug",
  "title": "Article Title",
  "content": "Full article body text..."
}`}</pre>
                          </div>
                        </div>

                        {/* Step 2: Buyer retrieves */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">2 — Buyer retrieves content with their token</p>
                          <div className="bg-[#0F0F10] rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-[#E5E7EB] whitespace-pre">{`GET /functions/v1/content-delivery?article_id=ARTICLE_ID
Authorization: Bearer bk_live_xxxxxxxxxxxx

// Response
{
  "article_id": "...",
  "title": "Article Title",
  "content": "Full article body...",
  "license_key": "opedd_...",
  "license_type": "ai_inference"
}`}</pre>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
                          <Info size={14} className="text-[#9CA3AF] mt-0.5 shrink-0" />
                          <p className="text-xs text-[#6B7280] leading-relaxed">
                            Tokens are scoped to a specific license. Archive license tokens grant access to all articles from your publication. Per-article license tokens are restricted to that single article.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB: Billing — redirects to /payments */}
                <TabsContent value="billing" className="mt-6" forceMount={activeTab === "billing" ? true : undefined}>
                  {activeTab === "billing" && (
                    <motion.div key="billing" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-10 shadow-sm text-center space-y-4">
                        <CreditCard size={32} className="mx-auto text-[#4A26ED]" />
                        <div>
                          <h2 className="font-bold text-[#040042] text-lg">Payments & Billing</h2>
                          <p className="text-sm text-[#6B7280] mt-1 max-w-xs mx-auto">Manage your Opedd plan, connect Stripe payouts, and view held funds — all in one place.</p>
                        </div>
                        <Link to="/payments">
                          <Button className="h-10 px-6 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white text-sm font-semibold rounded-lg">
                            Go to Payments <ExternalLink size={14} className="ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB: Admin (admin only) */}
                {isAdmin && (
                  <TabsContent value="admin" className="mt-6" forceMount={activeTab === "admin" ? true : undefined}>
                    {activeTab === "admin" && (
                      <motion.div key="admin" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                        {adminLoading ? (
                          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#4A26ED]" /></div>
                        ) : (
                          <>
                            {/* Publishers */}
                            <div className="space-y-4">
                              <h2 className="font-bold text-[#040042] text-lg">Publishers</h2>
                              <div className="relative max-w-xs">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                                <Input placeholder="Search publishers…" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-10 h-10 border-[#E5E7EB]" />
                              </div>
                              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Name</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Website</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Plan</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Articles</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Revenue</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Stripe</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Joined</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {adminPublishers.filter(p => p.display_name?.toLowerCase().includes(adminSearch.toLowerCase())).length === 0 ? (
                                        <tr><td colSpan={7} className="py-12 text-center text-[#9CA3AF]">No publishers found.</td></tr>
                                      ) : adminPublishers.filter(p => p.display_name?.toLowerCase().includes(adminSearch.toLowerCase())).map(p => (
                                        <tr key={p.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                                          <td className="py-3 px-4 font-medium text-[#111827]">{p.display_name || "—"}</td>
                                          <td className="py-3 px-4 text-[#6B7280] truncate max-w-[180px]">{p.website_url || "—"}</td>
                                          <td className="py-3 px-4"><span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.plan === "pro" ? "bg-violet-500/10 text-violet-400" : p.plan === "enterprise" ? "bg-[#040042] text-white border border-white/20" : "bg-white/10 text-[#6B7280]"}`}>{p.plan}</span></td>
                                          <td className="py-3 px-4 text-[#111827]">{p.article_count}</td>
                                          <td className="py-3 px-4 text-[#111827] font-medium">${p.total_revenue.toFixed(2)}</td>
                                          <td className="py-3 px-4">{p.stripe_connected ? <span className="text-emerald-500">✓</span> : <span className="text-[#D1D5DB]">✗</span>}</td>
                                          <td className="py-3 px-4 text-[#6B7280]">{new Date(p.created_at).toLocaleDateString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            {/* Transactions */}
                            <div className="space-y-4">
                              <h2 className="font-bold text-[#040042] text-lg">Transactions</h2>
                              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Date</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Buyer</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Amount</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Type</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">License Key</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {adminTxns.length === 0 ? (
                                        <tr><td colSpan={6} className="py-12 text-center text-[#9CA3AF]">No transactions found.</td></tr>
                                      ) : adminTxns.map(tx => {
                                        const [local, domain] = tx.buyer_email.split("@");
                                        const masked = local?.slice(0, 2) + "•••@" + (domain || "");
                                        const truncKey = tx.license_key.length <= 12 ? tx.license_key : tx.license_key.slice(0, 8) + "…" + tx.license_key.slice(-4);
                                        return (
                                          <tr key={tx.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                                            <td className="py-3 px-4 text-[#6B7280]">{new Date(tx.created_at).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-[#6B7280]">{masked}</td>
                                            <td className="py-3 px-4 font-medium text-[#111827]">${tx.amount.toFixed(2)}</td>
                                            <td className="py-3 px-4"><span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tx.license_type.toLowerCase() === "ai" ? "bg-violet-500/10 text-violet-400" : "bg-sky-500/10 text-sky-400"}`}>{tx.license_type}</span></td>
                                            <td className="py-3 px-4">
                                              <span className="inline-flex items-center gap-1.5">
                                                <code className="text-xs font-mono text-[#6B7280]">{truncKey}</code>
                                                <button onClick={() => { navigator.clipboard.writeText(tx.license_key); setCopiedLicenseKey(tx.license_key); setTimeout(() => setCopiedLicenseKey(null), 1500); }} className="text-[#9CA3AF] hover:text-[#040042] transition-colors">
                                                  {copiedLicenseKey === tx.license_key ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                              </span>
                                            </td>
                                            <td className="py-3 px-4"><span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tx.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : tx.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{tx.status}</span></td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <button onClick={() => { setAdminTxPage(p => Math.max(0, p - 1)); setAdminLoaded(false); }} disabled={adminTxPage === 0} className={`text-sm flex items-center gap-1 transition-colors ${adminTxPage === 0 ? "text-[#D1D5DB] cursor-default" : "text-[#040042] hover:underline"}`}><ChevronLeft size={14} /> Previous</button>
                                <span className="text-xs text-[#9CA3AF]">Page {adminTxPage + 1}</span>
                                <button onClick={() => { setAdminTxPage(p => p + 1); setAdminLoaded(false); }} disabled={!adminTxHasMore} className={`text-sm flex items-center gap-1 transition-colors ${!adminTxHasMore ? "text-[#D1D5DB] cursor-default" : "text-[#040042] hover:underline"}`}>Next <ChevronRight size={14} /></button>
                              </div>
                            </div>

                            {/* Failed Webhooks */}
                            <div className="space-y-4">
                              <h2 className="font-bold text-[#040042] text-lg">Failed Webhooks</h2>
                              {adminWebhooks.length === 0 ? (
                                <div className="py-12 text-center">
                                  <p className="text-lg mb-1">🎉</p>
                                  <p className="text-sm font-medium text-[#6B7280]">No failed webhooks</p>
                                  <p className="text-xs text-[#9CA3AF] mt-1">All webhook deliveries are healthy.</p>
                                </div>
                              ) : (
                                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                                          <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Publisher</th>
                                          <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Event Type</th>
                                          <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Attempts</th>
                                          <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Last Try</th>
                                          <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {adminWebhooks.map(wh => (
                                          <tr key={wh.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                                            <td className="py-3 px-4 font-medium text-[#111827]">{wh.publisher_name}</td>
                                            <td className="py-3 px-4 text-[#6B7280]">{wh.event_type}</td>
                                            <td className="py-3 px-4 text-[#111827]">{wh.attempts}</td>
                                            <td className="py-3 px-4 text-[#6B7280]">{new Date(wh.last_attempt_at).toLocaleString()}</td>
                                            <td className="py-3 px-4"><span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${wh.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : wh.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{wh.status}</span></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </TabsContent>
                )}

              </AnimatePresence>
            </Tabs>
            </PublicationGate>
          )}

        </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelSubOpen} onOpenChange={setCancelSubOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Your plan will remain active until the end of your billing period. After that it will revert to Free.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelSubOpen(false)} disabled={isCancelling}>
              Keep Plan
            </Button>
            <Button
              className="bg-[#E53E3E] hover:bg-[#C53030] text-white"
              disabled={isCancelling}
              onClick={async () => {
                setIsCancelling(true);
                try {
                  const headers = await apiHeaders();
                  const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ action: "cancel_subscription" }),
                  });
                  const result = await res.json();
                  if (result.success) {
                    toast({ title: "Subscription cancelled", description: "Your plan stays active until end of billing period." });
                    setCancelSubOpen(false);
                    fetchProfile();
                  } else {
                    throw new Error(result.error?.message || "Cancellation failed");
                  }
                } catch (err: unknown) {
                  toast({ title: "Cancellation failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
                } finally {
                  setIsCancelling(false);
                }
              }}
            >
              {isCancelling ? <><Loader2 size={14} className="mr-2 animate-spin" />Cancelling...</> : "Confirm Cancellation"}
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
              {isDeleting ? <><Loader2 size={14} className="mr-2 animate-spin" />Deleting...</> : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Embedded Stripe Checkout Modal */}
      {checkoutClientSecret && checkoutStripePromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <button onClick={handleCloseCheckout} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#040042] hover:border-[#040042] transition-colors"><X size={16} /></button>
            <div className="p-2">
              <EmbeddedCheckoutProvider stripe={checkoutStripePromise} options={{ clientSecret: checkoutClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
