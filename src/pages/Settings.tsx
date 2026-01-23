import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Settings as SettingsIcon, User, Building2, Globe, Key, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("Publisher Name");
  const [companyName, setCompanyName] = useState("Opedd Publishing Co.");
  const [websiteUrl, setWebsiteUrl] = useState("https://example.com");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiDetectionAlerts, setAiDetectionAlerts] = useState(true);

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

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-3xl w-full mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#040042]/5 rounded-xl flex items-center justify-center">
              <SettingsIcon size={24} className="text-[#040042]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Account Settings</h1>
              <p className="text-[#040042]/60 text-sm">Manage your publisher profile and preferences</p>
            </div>
          </div>

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

          {/* API Keys */}
          <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Key size={18} className="text-[#4A26ED]" />
              <h2 className="font-semibold text-[#040042]">API Keys</h2>
            </div>
            <div className="p-4 bg-[#F2F9FF] rounded-xl">
              <p className="text-sm text-[#040042]/60">Your API key for programmatic access</p>
              <div className="flex items-center gap-3 mt-2">
                <code className="flex-1 bg-white px-4 py-2 rounded-lg text-sm font-mono text-[#040042]/70 border border-[#E8F2FB]">
                  op_live_****************************
                </code>
                <button className="px-4 py-2 text-sm font-medium text-[#4A26ED] hover:bg-[#4A26ED]/10 rounded-lg transition-colors">
                  Reveal
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 bg-[#040042] text-white rounded-xl font-semibold hover:bg-[#0A0066] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}
