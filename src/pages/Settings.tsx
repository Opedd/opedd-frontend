import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Settings as SettingsIcon, 
  User, 
  Building2, 
  Globe, 
  Key, 
  Bell, 
  Users, 
  CreditCard,
  Code,
  Shield,
  Plus,
  Check,
  Copy,
  Webhook,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  { id: "1", name: "Sarah Chen", email: "sarah@publisher.com", role: "Admin", status: "Active" },
  { id: "2", name: "Marcus Johnson", email: "marcus@publisher.com", role: "Editor", status: "Active" },
  { id: "3", name: "Emily Roberts", email: "emily@publisher.com", role: "Viewer", status: "Pending" },
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState("Publisher Name");
  const [companyName, setCompanyName] = useState("Opedd Publishing Co.");
  const [websiteUrl, setWebsiteUrl] = useState("https://example.com");

  // Team state
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");

  // Payout state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [payoutFrequency, setPayoutFrequency] = useState<"weekly" | "monthly" | "manual">("weekly");
  const [autoPayouts, setAutoPayouts] = useState(true);

  // Developer state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiDetectionAlerts, setAiDetectionAlerts] = useState(true);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

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
      status: "Pending",
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
      description: "Your bank account has been verified successfully",
    });
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText("op_live_sk_1234567890abcdefghijklmnop");
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
    toast({
      title: "API Key Copied",
      description: "Your API key has been copied to clipboard",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-4xl w-full mx-auto space-y-8">
          {/* Page Header with Breadcrumb */}
          <div>
            <p className="text-sm text-[#040042]/50 mb-1">
              Organization / <span className="text-[#040042]/70">{companyName}</span>
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#040042]/5 rounded-xl flex items-center justify-center">
                <SettingsIcon size={24} className="text-[#040042]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#040042]">Settings</h1>
                <p className="text-[#040042]/60 text-sm">Manage your account, team, and billing preferences</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white border border-[#E8F2FB] rounded-xl p-1 h-auto">
              <TabsTrigger 
                value="profile" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-[#040042] data-[state=active]:text-white rounded-lg transition-all"
              >
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-[#040042] data-[state=active]:text-white rounded-lg transition-all"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger 
                value="billing" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-[#040042] data-[state=active]:text-white rounded-lg transition-all"
              >
                <CreditCard size={16} />
                <span className="hidden sm:inline">Billing & Payouts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="developer" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-[#040042] data-[state=active]:text-white rounded-lg transition-all"
              >
                <Code size={16} />
                <span className="hidden sm:inline">Developer</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Profile */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              {/* Publisher Profile */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <User size={18} className="text-[#4A26ED]" />
                  <h2 className="font-semibold text-[#040042]">Publisher Profile</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[#040042]/70 text-sm">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#040042]/70 text-sm">Email Address</Label>
                    <Input
                      value={user.email || ""}
                      disabled
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl opacity-60"
                    />
                    <p className="text-xs text-[#040042]/50">Contact support to change your email</p>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 size={18} className="text-[#4A26ED]" />
                  <h2 className="font-semibold text-[#040042]">Company Information</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[#040042]/70 text-sm">Company Name</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#040042]/70 text-sm">Website URL</Label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40" />
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl pl-12"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-14 bg-[#040042] text-white rounded-xl font-semibold hover:bg-[#0A0066] disabled:opacity-50 transition-all"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </TabsContent>

            {/* TAB 2: Team & Permissions */}
            <TabsContent value="team" className="space-y-6 mt-6">
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#4A26ED]" />
                    <h2 className="font-semibold text-[#040042]">Team Management</h2>
                  </div>
                  <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#4A26ED] hover:bg-[#3a1ebd] text-white gap-2">
                        <Plus size={16} />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-[#E8F2FB]">
                      <DialogHeader>
                        <DialogTitle className="text-[#040042]">Invite Team Member</DialogTitle>
                        <DialogDescription className="text-[#040042]/60">
                          Send an invitation to join your publisher team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-[#040042]/70 text-sm">Email Address</Label>
                          <Input
                            type="email"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#040042]/70 text-sm">Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#E8F2FB]">
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Editor">Editor</SelectItem>
                              <SelectItem value="Viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleInviteMember}
                          className="bg-[#040042] hover:bg-[#0A0066] text-white"
                        >
                          Send Invitation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-xl border border-[#E8F2FB] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F2F9FF] hover:bg-[#F2F9FF]">
                        <TableHead className="text-[#040042] font-semibold">Name</TableHead>
                        <TableHead className="text-[#040042] font-semibold">Email</TableHead>
                        <TableHead className="text-[#040042] font-semibold">Role</TableHead>
                        <TableHead className="text-[#040042] font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => (
                        <TableRow key={member.id} className="hover:bg-[#F2F9FF]/50">
                          <TableCell className="font-medium text-[#040042]">{member.name}</TableCell>
                          <TableCell className="text-[#040042]/70">{member.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                member.role === "Admin" 
                                  ? "border-[#4A26ED] text-[#4A26ED] bg-[#4A26ED]/5" 
                                  : member.role === "Editor"
                                  ? "border-[#040042] text-[#040042] bg-[#040042]/5"
                                  : "border-[#040042]/50 text-[#040042]/70"
                              }
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                member.status === "Active" 
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                              }
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
            </TabsContent>

            {/* TAB 3: Billing & Payouts */}
            <TabsContent value="billing" className="space-y-6 mt-6">
              {/* Stripe Featured Card */}
              <div className="bg-gradient-to-br from-[#635BFF] to-[#8B5CF6] rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">Payment Processing by Stripe</h2>
                      <p className="text-white/80 text-sm">Enterprise-grade payment infrastructure</p>
                    </div>
                  </div>
                  {/* Stripe Logo */}
                  <div className="bg-white rounded-lg px-3 py-2">
                    <span className="text-[#635BFF] font-bold text-lg tracking-tight">stripe</span>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard size={18} className="text-[#4A26ED]" />
                  <h2 className="font-semibold text-[#040042]">Bank Account</h2>
                </div>

                {stripeConnected ? (
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">Account Verified</p>
                        <p className="text-sm text-emerald-600">Chase Business •••• 6789</p>
                      </div>
                    </div>
                    <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                      Update
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                    <div>
                      <p className="font-medium text-[#040042]">No bank account connected</p>
                      <p className="text-sm text-[#040042]/60">Connect your bank to receive payouts</p>
                    </div>
                    <Button 
                      onClick={handleConnectStripe}
                      className="bg-[#635BFF] hover:bg-[#5851db] text-white gap-2"
                    >
                      <CreditCard size={16} />
                      Connect Bank Account
                    </Button>
                  </div>
                )}
              </div>

              {/* Payout Frequency */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Clock size={18} className="text-[#4A26ED]" />
                  <h2 className="font-semibold text-[#040042]">Payout Frequency</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                    <div>
                      <p className="font-medium text-[#040042]">Automatic Payouts</p>
                      <p className="text-sm text-[#040042]/60">Receive funds on a schedule</p>
                    </div>
                    <Switch 
                      checked={autoPayouts} 
                      onCheckedChange={setAutoPayouts}
                    />
                  </div>

                  {autoPayouts && (
                    <RadioGroup 
                      value={payoutFrequency} 
                      onValueChange={(v) => setPayoutFrequency(v as typeof payoutFrequency)}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="relative">
                        <RadioGroupItem value="weekly" id="weekly" className="peer sr-only" />
                        <Label
                          htmlFor="weekly"
                          className="flex flex-col items-center justify-center p-4 border-2 border-[#E8F2FB] rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-[#4A26ED] peer-data-[state=checked]:bg-[#4A26ED]/5 hover:border-[#4A26ED]/50"
                        >
                          <span className="font-semibold text-[#040042]">Weekly</span>
                          <span className="text-xs text-[#040042]/60">Every Friday</span>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem value="monthly" id="monthly" className="peer sr-only" />
                        <Label
                          htmlFor="monthly"
                          className="flex flex-col items-center justify-center p-4 border-2 border-[#E8F2FB] rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-[#4A26ED] peer-data-[state=checked]:bg-[#4A26ED]/5 hover:border-[#4A26ED]/50"
                        >
                          <span className="font-semibold text-[#040042]">Monthly</span>
                          <span className="text-xs text-[#040042]/60">1st of each month</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

                  {!autoPayouts && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>Manual Mode:</strong> You'll need to request withdrawals from your dashboard. 
                        Minimum withdrawal amount is $50.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-3 p-4 bg-[#040042]/5 rounded-xl">
                <Shield size={20} className="text-[#4A26ED]" />
                <p className="text-sm text-[#040042]/70">
                  <strong className="text-[#040042]">Payments secured and processed by Stripe.</strong> Opedd does not store your bank credentials.
                </p>
              </div>
            </TabsContent>

            {/* TAB 4: Developer */}
            <TabsContent value="developer" className="space-y-6 mt-6">
              {/* API Keys */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Key size={18} className="text-[#4A26ED]" />
                  <h2 className="font-semibold text-[#040042]">API Keys</h2>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-[#F2F9FF] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-[#040042]">Live API Key</p>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-white px-4 py-3 rounded-lg text-sm font-mono text-[#040042]/70 border border-[#E8F2FB]">
                        op_live_sk_****************************mnop
                      </code>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCopyApiKey}
                        className="gap-2 border-[#E8F2FB] text-[#040042] hover:bg-[#F2F9FF]"
                      >
                        {apiKeyCopied ? <Check size={14} /> : <Copy size={14} />}
                        {apiKeyCopied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-[#F2F9FF] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-[#040042]">Test API Key</p>
                      <Badge variant="outline" className="border-[#040042]/30 text-[#040042]/70">Test Mode</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-white px-4 py-3 rounded-lg text-sm font-mono text-[#040042]/70 border border-[#E8F2FB]">
                        op_test_sk_****************************xyz
                      </code>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2 border-[#E8F2FB] text-[#040042] hover:bg-[#F2F9FF]"
                      >
                        <Copy size={14} />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhooks */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Webhook size={18} className="text-[#4A26ED]" />
                    <h2 className="font-semibold text-[#040042]">Webhooks</h2>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 border-[#E8F2FB] text-[#040042]">
                    <Plus size={14} />
                    Add Endpoint
                  </Button>
                </div>
                <div className="p-8 bg-[#F2F9FF] rounded-xl text-center">
                  <Webhook size={32} className="mx-auto mb-3 text-[#040042]/30" />
                  <p className="text-[#040042]/60 text-sm">No webhook endpoints configured</p>
                  <p className="text-[#040042]/40 text-xs mt-1">Receive real-time notifications for licensing events</p>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Bell size={18} className="text-[#4A26ED]" />
                  <h2 className="font-semibold text-[#040042]">Notifications</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                    <div>
                      <p className="font-medium text-[#040042] text-sm">Email Notifications</p>
                      <p className="text-xs text-[#040042]/50">Receive updates about royalties and licenses</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                    <div>
                      <p className="font-medium text-[#040042] text-sm">AI Detection Alerts</p>
                      <p className="text-xs text-[#040042]/50">Get notified when AI models access your content</p>
                    </div>
                    <Switch checked={aiDetectionAlerts} onCheckedChange={setAiDetectionAlerts} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
