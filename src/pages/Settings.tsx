import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Settings as SettingsIcon, 
  User, 
  Building2, 
  Globe, 
  Users, 
  CreditCard,
  Shield,
  Plus,
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
  DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Mock team data
const initialTeamMembers = [
  { id: "1", name: "Sarah Chen", email: "sarah@publisher.com", role: "Admin", status: "Active" as const },
  { id: "2", name: "Marcus Johnson", email: "marcus@publisher.com", role: "Editor", status: "Active" as const },
  { id: "3", name: "Emily Roberts", email: "emily@publisher.com", role: "Viewer", status: "Pending" as const },
];

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
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [publisherName, setPublisherName] = useState("Alex Chen");
  const [bio, setBio] = useState("Independent journalist and content creator focused on AI ethics and technology policy.");
  const [companyName, setCompanyName] = useState("Opedd Publishing Co.");
  const [websiteUrl, setWebsiteUrl] = useState("https://example.com");

  // Team state
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");

  // Stripe state
  const [stripeConnected, setStripeConnected] = useState(false);

  // Pricing defaults state
  const [defaultHumanPrice, setDefaultHumanPrice] = useState("5.00");
  const [defaultAiPrice, setDefaultAiPrice] = useState("10.00");

  // Developer state
  const [publisherIdCopied, setPublisherIdCopied] = useState(false);
  const publisherId = user?.id || "pub_demo_1234567890";
  
  // API Key state
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const apiKey = "opedd_sk_live_" + (user?.id?.slice(0, 24) || "abc123def456ghi789jkl012");

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = () => {
    if (!inviteEmail) return;
    const newMember = {
      id: Date.now().toString(),
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      status: "Pending" as const,
    };
    setTeamMembers([...teamMembers, newMember]);
    setInviteEmail("");
    setInviteRole("Viewer");
    setInviteModalOpen(false);
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${inviteEmail}`,
    });
  };

  const handleConnectStripe = () => {
    setStripeConnected(true);
    toast({
      title: "Stripe Connected",
      description: "Your account has been linked successfully",
    });
  };

  const handleCopyPublisherId = async () => {
    try {
      await navigator.clipboard.writeText(publisherId);
      setPublisherIdCopied(true);
      setTimeout(() => setPublisherIdCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Publisher ID copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
      toast({
        title: "API Key Copied!",
        description: "Keep this key secure and never share it publicly.",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateApiKey = async () => {
    setIsRegenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast({
        title: "API Key Regenerated",
        description: "Your old key has been invalidated. Update your integrations.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "Admin":
        return "border-[#4A26ED] text-[#4A26ED] bg-[#4A26ED]/5";
      case "Editor":
        return "border-[#040042] text-[#040042] bg-[#040042]/5";
      default:
        return "border-[#040042]/50 text-[#040042]/70 bg-transparent";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    return status === "Active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />

        <div className="p-8 pt-20 lg:pt-8 max-w-4xl w-full mx-auto space-y-8">
          {/* Page Header with Breadcrumb */}
          <div>
            <p className="text-sm text-[#040042]/50 mb-1">
              Organization / <span className="text-[#040042]/70">{companyName}</span>
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

          {/* Tabs */}
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
                                value={user.email || ""}
                                disabled
                                className="bg-slate-100 border-slate-200 h-12 rounded-xl pl-11 opacity-70 cursor-not-allowed"
                              />
                            </div>
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

                    {/* Company Information Card */}
                    <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                          <Building2 size={16} className="text-[#4A26ED]" />
                        </div>
                        <h2 className="font-bold text-[#040042]">Company Information</h2>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#040042] font-bold text-sm">Company Name</Label>
                          <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#040042] font-bold text-sm">Website URL</Label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={websiteUrl}
                              onChange={(e) => setWebsiteUrl(e.target.value)}
                              className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-11 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                            />
                          </div>
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
                          <p className="text-slate-400 text-xs">Use this ID in the WidgetCustomizer script</p>
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
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 overflow-hidden relative">
                            <code className="text-sm text-[#040042] font-mono truncate block">
                              {apiKeyRevealed 
                                ? apiKey 
                                : "opedd_sk_live_" + "•".repeat(24)
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

              {/* TAB 2: Team Management */}
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
                    <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
                            <Users size={16} className="text-[#4A26ED]" />
                          </div>
                          <div>
                            <h2 className="font-bold text-[#040042]">Team Management</h2>
                            <p className="text-xs text-slate-500">{teamMembers.length} members</p>
                          </div>
                        </div>
                        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white gap-2 rounded-xl shadow-lg shadow-[#4A26ED]/20 transition-all active:scale-[0.98]">
                              <Plus size={16} />
                              Invite Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white border-[#E8F2FB] rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-[#040042] font-bold">Invite Team Member</DialogTitle>
                              <DialogDescription className="text-[#040042]/60">
                                Send an invitation to join your publisher team.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label className="text-[#040042] font-bold text-sm">Email Address</Label>
                                <Input
                                  type="email"
                                  placeholder="colleague@company.com"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                  className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[#040042] font-bold text-sm">Role</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                  <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-[#E8F2FB] rounded-xl">
                                    <SelectItem value="Admin">Admin - Full access</SelectItem>
                                    <SelectItem value="Editor">Editor - Manage assets</SelectItem>
                                    <SelectItem value="Viewer">Viewer - Read only</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={handleInviteMember}
                                className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl shadow-lg shadow-[#4A26ED]/20"
                              >
                                Send Invitation
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Team Table - SmartLibraryTable Styling */}
                      <div className="rounded-xl border border-[#E8F2FB] overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#E8F2FB] bg-[#F2F9FF]/50 hover:bg-[#F2F9FF]/50">
                              <TableHead className="text-[#040042]/60 text-xs font-medium pl-5">Member Name</TableHead>
                              <TableHead className="text-[#040042]/60 text-xs font-medium">Email</TableHead>
                              <TableHead className="text-[#040042]/60 text-xs font-medium">Role</TableHead>
                              <TableHead className="text-[#040042]/60 text-xs font-medium">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.map((member) => (
                              <TableRow 
                                key={member.id} 
                                className="group border-[#E8F2FB] transition-all duration-200 hover:bg-[#F8FAFF] hover:shadow-[0_0_0_1px_rgba(74,38,237,0.1),0_4px_12px_-4px_rgba(74,38,237,0.15)]"
                              >
                                <TableCell className="pl-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4A26ED] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm">
                                      {member.name.charAt(0)}
                                    </div>
                                    <span className="font-medium text-[#040042] text-sm">{member.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[#040042]/70 text-sm">{member.email}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(member.role)}`}
                                  >
                                    {member.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline"
                                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(member.status)}`}
                                  >
                                    {member.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
                      {/* Glassmorphism accent */}
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

                      {stripeConnected ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-emerald-800">Account Verified</p>
                              <p className="text-sm text-emerald-600">Chase Business •••• 6789</p>
                            </div>
                          </div>
                        </div>
                      ) : (
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
                        </div>
                      )}
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
        </div>
      </main>
    </div>
  );
}
