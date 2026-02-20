import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Clock
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

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
  article_count: number;
  transaction_count: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_connect: StripeConnect | null;
  webhook_url: string | null;
  webhook: { configured: boolean; url: string } | null;
  created_at: string;
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

export default function Settings() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Logo state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Team state
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; user_id: string; role: string; email: string; joined_at: string }>>([]);
  const [teamInvitations, setTeamInvitations] = useState<Array<{ id: string; email: string; role: string; created_at: string; expires_at: string }>>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("owner");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamError, setTeamError] = useState(false);

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

  const fetchProfile = useCallback(async () => {
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, { headers });
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
        setDefaultHumanPrice(d.default_human_price != null ? String(d.default_human_price) : "5.00");
        setDefaultAiPrice(d.default_ai_price != null ? String(d.default_ai_price) : "10.00");
        setLogoPreview(d.logo_url || null);
        // Derive stripe status from publisher fields if stripe_connect not present — kept for profile context only
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
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
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
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
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
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
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
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
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
    if (activeTab === "team" && !teamLoaded && !isLoadingTeam) {
      fetchTeam();
    }
  }, [activeTab, teamLoaded, isLoadingTeam, fetchTeam]);

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        method: "PATCH",
        headers,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    setIsUploadingLogo(true);
    try {
      const token = await getAccessToken();
      if (!token || !profile?.id) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/logo.${ext}`;
      const uploadRes = await fetch(
        `${EXT_SUPABASE_URL}/storage/v1/object/publisher-logos/${path}`,
        {
          method: "POST",
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, "x-upsert": "true" },
          body: file,
        }
      );
      if (!uploadRes.ok) throw new Error("Upload failed");
      const publicUrl = `${EXT_SUPABASE_URL}/storage/v1/object/public/publisher-logos/${path}`;
      const headers = await apiHeaders();
      await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
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
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "regenerate_api_key" }),
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
    <DashboardLayout title="Settings">
        <div className="p-8 max-w-6xl w-full mx-auto space-y-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#4A26ED]" size={32} />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Global tab style — #4A26ED underline */}
              <div className="border-b border-[#E5E7EB]">
                <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0">
                  {[
                    { value: "profile", label: "Profile" },
                    { value: "api-keys", label: "API Keys" },
                    { value: "team", label: "Team" },
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

                      {/* Publisher Profile Card */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <h2 className="font-bold text-[#040042] mb-6">Publisher Profile</h2>
                        <div className="grid gap-5">
                          {/* Logo Upload */}
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Publication Logo</Label>
                            <div className="flex items-center gap-4">
                              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {logoPreview ? (
                                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                  <Camera size={28} className="text-slate-300" />
                                )}
                              </div>
                              <div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo} className="border-slate-200 bg-transparent text-slate-500 hover:bg-[#040042] hover:text-white hover:border-[#040042] rounded-lg transition-colors">
                                  {isUploadingLogo ? <><Loader2 size={14} className="mr-2 animate-spin" /> Uploading...</> : <><Upload size={14} className="mr-2" /> Upload Logo</>}
                                </Button>
                                <p className="text-xs text-slate-400 mt-1.5">Max 2MB. JPG, PNG, or SVG.</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[#040042] font-bold text-sm">Publisher Name</Label>
                              <Input value={publisherName} onChange={(e) => setPublisherName(e.target.value)} placeholder="Your display name" className="bg-slate-50 border-slate-200 h-12 rounded-lg focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[#040042] font-bold text-sm">Email Address</Label>
                              <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input value={profile?.email || user.email || ""} disabled className="bg-slate-100 border-slate-200 h-12 rounded-lg pl-11 opacity-70 cursor-not-allowed" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Website URL</Label>
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
                        </div>
                      </div>

                      {/* Pricing Defaults Card */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="mb-6">
                          <h2 className="font-bold text-[#040042]">Pricing Defaults</h2>
                          <p className="text-[#6B7280] text-xs mt-0.5">Standard prices applied to newly synced articles</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Default Human License Price</Label>
                            <p className="text-xs text-slate-500">Applied to new articles from synced sources.</p>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40 font-semibold text-sm">$</span>
                              <Input type="number" min="0" step="0.01" value={defaultHumanPrice} onChange={(e) => setDefaultHumanPrice(e.target.value)} className="bg-slate-50 border-slate-200 h-12 rounded-lg pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#040042] font-bold text-sm">Default AI Training License Price</Label>
                            <p className="text-xs text-slate-500">Fee for AI companies ingesting your content.</p>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40 font-semibold text-sm">$</span>
                              <Input type="number" min="0" step="0.01" value={defaultAiPrice} onChange={(e) => setDefaultAiPrice(e.target.value)} className="bg-slate-50 border-slate-200 h-12 rounded-lg pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3">These prices will be applied automatically when new articles are synced from your connected sources.</p>
                      </div>

                      {/* Save Button */}
                      <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium disabled:opacity-50 transition-all active:scale-[0.98]">
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB 2: Team */}
                <TabsContent value="team" className="mt-6" forceMount={activeTab === "team" ? true : undefined}>
                  {activeTab === "team" && (
                    <motion.div key="team" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {isLoadingTeam ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="animate-spin text-[#4A26ED]" size={32} />
                        </div>
                      ) : teamError ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <p className="text-slate-500 text-sm">Failed to load team data.</p>
                          <Button
                            variant="outline"
                            onClick={() => { setTeamLoaded(false); setTeamError(false); }}
                            className="border-[#4A26ED] text-[#4A26ED] hover:bg-[#4A26ED]/5 rounded-xl"
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
                                  <Input type="email" placeholder="colleague@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleInviteMember(); }} className="bg-slate-50 border-slate-200 h-12 rounded-lg pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20" />
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
                                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">Remove Member</AlertDialogAction>
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
                    </motion.div>
                  )}
                </TabsContent>

                {/* TAB: API Keys */}
                <TabsContent value="api-keys" className="mt-6" forceMount={activeTab === "api-keys" ? true : undefined}>
                  {activeTab === "api-keys" && (
                    <motion.div key="api-keys" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      {/* Publisher ID */}
                      <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                            <FileText size={16} className="text-[#4A26ED]" />
                          </div>
                          <div>
                            <h2 className="font-bold text-[#040042]">Publisher ID</h2>
                            <p className="text-slate-500 text-xs">Use this ID in the Widget script</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 overflow-hidden">
                            <code className="text-sm text-emerald-600 font-mono truncate block">{publisherId}</code>
                          </div>
                          <Button size="sm" onClick={handleCopyPublisherId} className="h-11 px-4 bg-[#040042] hover:bg-[#040042]/80 text-white rounded-lg font-medium flex-shrink-0 transition-all">
                            {publisherIdCopied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy ID</>}
                          </Button>
                        </div>
                      </div>

                      {/* API Key */}
                      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                        <div className="mb-6">
                          <h2 className="font-bold text-[#040042]">API Key</h2>
                          <p className="text-[#6B7280] text-xs mt-0.5">For programmatic access to your Opedd account</p>
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
                                <Button size="sm" variant="outline" onClick={() => setApiKeyRevealed(!apiKeyRevealed)} className="h-11 px-3 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all">
                                  {apiKeyRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                                <Button size="sm" onClick={handleCopyApiKey} className="h-11 px-4 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium transition-all">
                                  {apiKeyCopied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy</>}
                                </Button>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                  <Shield size={12} className="inline mr-1 text-amber-500" />
                                  Keep this key secret. Regenerating will invalidate the current key.
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" disabled={isRegenerating} className="h-9 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg font-medium transition-all">
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
                                      <AlertDialogAction onClick={handleRegenerateApiKey} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">Yes, Regenerate Key</AlertDialogAction>
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
                    </motion.div>
                  )}
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          )}
        </div>
    </DashboardLayout>
  );
}
