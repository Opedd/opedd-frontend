import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings as SettingsIcon, 
  User, 
  Globe, 
  Users, 
  CreditCard,
  Shield,
  Check,
  Copy,
  Lock,
  Mail,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  DollarSign,
  Loader2,
  BarChart3
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface PublisherProfile {
  id: string;
  name: string;
  email: string;
  api_key: string | null;
  default_human_price: number | null;
  default_ai_price: number | null;
  website_url: string | null;
  description: string | null;
  article_count: number;
  transaction_count: number;
  created_at: string;
}

// Animation variants for tab content
const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const }
  }
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [publisherName, setPublisherName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [defaultHumanPrice, setDefaultHumanPrice] = useState("5.00");
  const [defaultAiPrice, setDefaultAiPrice] = useState("10.00");

  // Developer state
  const [publisherIdCopied, setPublisherIdCopied] = useState(false);
  
  // API Key state
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Stripe state
  const [stripeConnected] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
      });

      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data as PublisherProfile;
        setProfile(d);
        setPublisherName(d.name || "");
        setBio(d.description || "");
        setWebsiteUrl(d.website_url || "");
        setDefaultHumanPrice(d.default_human_price != null ? String(d.default_human_price) : "5.00");
        setDefaultAiPrice(d.default_ai_price != null ? String(d.default_ai_price) : "10.00");
      }
    } catch (err) {
      console.warn("[Settings] Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: publisherName,
          default_human_price: parseFloat(defaultHumanPrice) || 0,
          default_ai_price: parseFloat(defaultAiPrice) || 0,
          website_url: websiteUrl,
          description: bio,
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (result.data) setProfile(result.data);
        toast({ title: "Settings Saved", description: "Your preferences have been updated" });
      } else {
        throw new Error(result.error?.message || "Save failed");
      }
    } catch (err: unknown) {
      toast({ title: "Save Failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectStripe = () => {
    toast({
      title: "Coming Soon",
      description: "Stripe Connect integration is not yet available.",
    });
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "generate_api_key" }),
      });

      const result = await res.json();
      if (result.success && result.data?.api_key) {
        setProfile(prev => prev ? { ...prev, api_key: result.data.api_key } : prev);
        setApiKeyRevealed(true);
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
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />

        <div className="p-8 pt-20 lg:pt-8 max-w-4xl w-full mx-auto space-y-8">
          {/* Page Header */}
          <div>
            <p className="text-sm text-[#040042]/50 mb-1">
              Organization / <span className="text-[#040042]/70">Settings</span>
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 rounded-xl flex items-center justify-center border border-[#4A26ED]/20">
                <SettingsIcon size={24} className="text-[#4A26ED]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#040042]">Settings</h1>
                <p className="text-[#040042]/60 text-sm">Manage your profile, team, and payouts</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#4A26ED]" size={32} />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-[#E8F2FB] rounded-xl p-1.5 h-auto shadow-sm">
                <TabsTrigger 
                  value="profile" 
                  className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4A26ED] data-[state=active]:to-[#7C3AED] data-[state=active]:text-white rounded-lg transition-all font-medium"
                >
                  <User size={16} />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="team" 
                  className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4A26ED] data-[state=active]:to-[#7C3AED] data-[state=active]:text-white rounded-lg transition-all font-medium"
                >
                  <Users size={16} />
                  <span>Team</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="payouts" 
                  className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4A26ED] data-[state=active]:to-[#7C3AED] data-[state=active]:text-white rounded-lg transition-all font-medium"
                >
                  <CreditCard size={16} />
                  <span>Payouts</span>
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                {/* TAB 1: Profile */}
                <TabsContent value="profile" className="mt-6" forceMount={activeTab === "profile" ? true : undefined}>
                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-6"
                    >
                      {/* Stats Row */}
                      {profile && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#4A26ED]/10 flex items-center justify-center">
                              <FileText size={18} className="text-[#4A26ED]" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-[#040042]">{profile.article_count}</p>
                              <p className="text-xs text-slate-500">Articles</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <BarChart3 size={18} className="text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-[#040042]">{profile.transaction_count}</p>
                              <p className="text-xs text-slate-500">Transactions</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Publisher Profile Card */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                            <User size={16} className="text-[#4A26ED]" />
                          </div>
                          <h2 className="font-bold text-[#040042]">Publisher Profile</h2>
                        </div>
                        <div className="grid gap-5">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[#040042] font-bold text-sm">Publisher Name</Label>
                              <Input
                                value={publisherName}
                                onChange={(e) => setPublisherName(e.target.value)}
                                placeholder="Your display name"
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[#040042] font-bold text-sm">Email Address</Label>
                              <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                  value={profile?.email || user.email || ""}
                                  disabled
                                  className="bg-slate-100 border-slate-200 h-12 rounded-xl pl-11 opacity-70 cursor-not-allowed"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Website URL</Label>
                            <div className="relative">
                              <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <Input
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="https://yoursite.com"
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Bio</Label>
                            <Textarea
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Tell us about yourself and your work..."
                              className="bg-slate-50 border-slate-200 rounded-xl min-h-[100px] resize-none focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                            />
                            <p className="text-xs text-slate-400">Displayed on your public licensing page</p>
                          </div>
                        </div>
                      </div>

                      {/* Developer Section - Publisher ID */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <FileText size={16} className="text-white" />
                          </div>
                          <div>
                            <h2 className="font-bold text-white">Developer</h2>
                            <p className="text-slate-400 text-xs">Use this ID in the Widget script</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 overflow-hidden">
                            <code className="text-sm text-emerald-400 font-mono truncate block">
                              {publisherId}
                            </code>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleCopyPublisherId}
                            className="h-11 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium flex-shrink-0 transition-all"
                          >
                            {publisherIdCopied ? (
                              <>
                                <Check size={14} className="mr-2" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={14} className="mr-2" />
                                Copy ID
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* API Key Section */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-500/20">
                            <Key size={16} className="text-amber-600" />
                          </div>
                          <div>
                            <h2 className="font-bold text-[#040042]">API Key</h2>
                            <p className="text-slate-500 text-xs">For programmatic access to your Opedd account</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {apiKey ? (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 overflow-hidden relative">
                                  <code className="text-sm text-[#040042] font-mono truncate block">
                                    {apiKeyRevealed 
                                      ? apiKey 
                                      : apiKey.slice(0, 10) + "•".repeat(20)
                                    }
                                  </code>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                                  className="h-11 px-3 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                                  title={apiKeyRevealed ? "Hide API Key" : "Reveal API Key"}
                                >
                                  {apiKeyRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleCopyApiKey}
                                  className="h-11 px-4 bg-[#040042] hover:bg-[#040042]/90 text-white rounded-xl font-medium transition-all"
                                >
                                  {apiKeyCopied ? (
                                    <>
                                      <Check size={14} className="mr-2" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={14} className="mr-2" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              </div>
                              
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                  <Shield size={12} className="inline mr-1 text-amber-500" />
                                  Keep this key secret. Regenerating will invalidate the current key.
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleRegenerateApiKey}
                                  disabled={isRegenerating}
                                  className="h-9 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg font-medium transition-all"
                                >
                                  {isRegenerating ? (
                                    <>
                                      <RefreshCw size={14} className="mr-2 animate-spin" />
                                      Regenerating...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={14} className="mr-2" />
                                      Regenerate Key
                                    </>
                                  )}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-slate-500 mb-3">No API key generated yet.</p>
                              <Button
                                onClick={handleRegenerateApiKey}
                                disabled={isRegenerating}
                                className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl shadow-lg shadow-[#4A26ED]/20"
                              >
                                {isRegenerating ? (
                                  <>
                                    <Loader2 size={14} className="mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Key size={14} className="mr-2" />
                                    Generate API Key
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing Defaults Card */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                            <DollarSign size={16} className="text-emerald-600" />
                          </div>
                          <div>
                            <h2 className="font-bold text-[#040042]">Pricing Defaults</h2>
                            <p className="text-slate-500 text-xs">Standard prices applied to newly synced articles</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Default Human License Price</Label>
                            <p className="text-xs text-slate-500">Applied to new articles from synced sources.</p>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40 font-semibold text-sm">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={defaultHumanPrice}
                                onChange={(e) => setDefaultHumanPrice(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Default AI Training License Price</Label>
                            <p className="text-xs text-slate-500">Fee for AI companies ingesting your content.</p>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40 font-semibold text-sm">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={defaultAiPrice}
                                onChange={(e) => setDefaultAiPrice(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3">These prices will be applied automatically when new articles are synced from your connected sources.</p>
                      </div>

                      {/* Save Button */}
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl font-semibold text-base shadow-lg shadow-[#4A26ED]/25 disabled:opacity-50 transition-all active:scale-[0.98]"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB 2: Team — Coming Soon */}
                <TabsContent value="team" className="mt-6" forceMount={activeTab === "team" ? true : undefined}>
                  {activeTab === "team" && (
                    <motion.div
                      key="team"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-6"
                    >
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-12 shadow-sm text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                          <Users size={28} className="text-[#4A26ED]" />
                        </div>
                        <h2 className="font-bold text-[#040042] text-xl mb-2">Team Management</h2>
                        <p className="text-[#040042]/60 text-sm max-w-md mx-auto">
                          Invite team members, assign roles, and manage organizational access. This feature is coming soon.
                        </p>
                        <Badge variant="outline" className="mt-4 border-[#4A26ED]/30 text-[#4A26ED] bg-[#4A26ED]/5 font-medium">
                          Coming Soon
                        </Badge>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB 3: Payouts */}
                <TabsContent value="payouts" className="mt-6" forceMount={activeTab === "payouts" ? true : undefined}>
                  {activeTab === "payouts" && (
                    <motion.div
                      key="payouts"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-6"
                    >
                      {/* Stripe Connect Card */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#635BFF]/20 to-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-start justify-between mb-6 relative">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#635BFF] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#635BFF]/25">
                              <CreditCard size={24} className="text-white" />
                            </div>
                            <div>
                              <h2 className="font-bold text-[#040042] text-lg">Stripe Connect</h2>
                              <p className="text-slate-500 text-sm">Receive payouts directly to your bank</p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline"
                            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                              stripeConnected 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {stripeConnected ? "Connected" : "Disconnected"}
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <Shield size={18} className="text-slate-500" />
                              </div>
                              <div>
                                <p className="font-medium text-[#040042] text-sm">Secure Payment Processing</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Connect your Stripe account to receive payouts from content licensing. 
                                  Your financial data is encrypted and never stored on our servers.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={handleConnectStripe}
                            className="w-full h-14 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] hover:from-[#5649e6] hover:to-[#7c3aed] text-white rounded-xl font-semibold text-base shadow-lg shadow-[#635BFF]/25 transition-all active:scale-[0.98]"
                          >
                            <Lock size={18} className="mr-2" />
                            Connect Stripe Account
                            <ExternalLink size={14} className="ml-2 opacity-70" />
                          </Button>
                          <p className="text-xs text-center text-slate-400">Stripe Connect integration coming soon</p>
                        </div>
                      </div>

                      {/* Payout Info */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                            <CreditCard size={16} className="text-[#4A26ED]" />
                          </div>
                          <h2 className="font-bold text-[#040042]">Payout Schedule</h2>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                          Payouts are processed automatically on the 1st and 15th of each month for balances over $50.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <p className="text-2xl font-bold text-[#040042]">$0.00</p>
                            <p className="text-xs text-slate-500 mt-1">Pending</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <p className="text-2xl font-bold text-[#040042]">$0.00</p>
                            <p className="text-xs text-slate-500 mt-1">This Month</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <p className="text-2xl font-bold text-[#040042]">$0.00</p>
                            <p className="text-xs text-slate-500 mt-1">All Time</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
