import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Zap, 
  Shield, 
  Palette, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink,
  Rss,
  Globe,
  FileText,
  ChevronRight
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CMSPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  connected: boolean;
  setupSteps: string[];
}

const WordPressIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-.812.118-1.596.336-2.336l3.693 10.112A8.567 8.567 0 013.443 12zm8.557 8.557c-.936 0-1.836-.152-2.678-.43l2.844-8.26 2.912 7.984c.02.046.042.09.066.132a8.524 8.524 0 01-3.144.574zm1.301-12.54c.57-.03 1.084-.09 1.084-.09.51-.06.45-.81-.06-.78 0 0-1.534.12-2.524.12-.93 0-2.49-.12-2.49-.12-.51-.03-.57.75-.06.78 0 0 .48.06.99.09l1.47 4.032-2.064 6.192-3.434-10.224c.57-.03 1.084-.09 1.084-.09.51-.06.45-.81-.06-.78 0 0-1.534.12-2.524.12-.178 0-.388-.004-.612-.01A8.528 8.528 0 0112 3.443c2.274 0 4.348.888 5.89 2.336-.038-.002-.074-.008-.114-.008-.93 0-1.59.81-1.59 1.68 0 .78.45 1.44.93 2.22.36.63.78 1.44.78 2.61 0 .81-.312 1.752-.72 3.066l-.948 3.168-3.426-10.194zM15.033 19.2l2.892-8.352c.54-1.35.72-2.43.72-3.39 0-.348-.024-.672-.066-.978A8.544 8.544 0 0120.557 12a8.552 8.552 0 01-5.524 7.2z"/>
  </svg>
);

const GhostIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 2C7.582 2 4 5.582 4 10v8c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4v-8c0-4.418-3.582-8-8-8zm-3.5 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3.5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3.5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
  </svg>
);

const SubstackIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24l9.54-5.49L20.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
  </svg>
);

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // CMS State
  const [platforms, setPlatforms] = useState<CMSPlatform[]>([
    {
      id: "wordpress",
      name: "WordPress",
      icon: <WordPressIcon />,
      description: "Connect your WordPress site with our plugin",
      connected: false,
      setupSteps: [
        "Download the Opedd WordPress plugin from our dashboard",
        "Go to Plugins → Add New → Upload Plugin in your WordPress admin",
        "Activate the plugin and navigate to Settings → Opedd",
        "Paste your Publisher API Key and click 'Connect'",
        "Choose which post types to protect (posts, pages, custom types)"
      ]
    },
    {
      id: "ghost",
      name: "Ghost",
      icon: <GhostIcon />,
      description: "Integrate with your Ghost publication",
      connected: false,
      setupSteps: [
        "Go to your Ghost Admin → Settings → Integrations",
        "Click 'Add custom integration' and name it 'Opedd'",
        "Copy the Content API Key and Admin API Key",
        "Paste both keys in the fields below",
        "Click 'Verify & Connect' to complete setup"
      ]
    },
    {
      id: "substack",
      name: "Substack",
      icon: <SubstackIcon />,
      description: "Protect your Substack newsletter content",
      connected: true,
      setupSteps: [
        "Copy your Substack publication URL (e.g., yourname.substack.com)",
        "Paste the URL in the field below",
        "We'll automatically sync your public posts",
        "Add the Opedd verification token to your Substack About page",
        "Click 'Verify Ownership' to complete the connection"
      ]
    },
    {
      id: "rss",
      name: "RSS Feed",
      icon: <Rss size={24} />,
      description: "Connect any RSS-compatible platform",
      connected: false,
      setupSteps: [
        "Locate your publication's RSS feed URL",
        "Paste the feed URL in the field below",
        "We'll parse and import your content automatically",
        "Add our verification meta tag to your site's <head>",
        "Articles will sync every 6 hours automatically"
      ]
    }
  ]);
  
  const [selectedPlatform, setSelectedPlatform] = useState<CMSPlatform | null>(null);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  
  // Widget Customizer State
  const [widgetText, setWidgetText] = useState("License This Content");
  const [widgetColor, setWidgetColor] = useState("#4A26ED");
  const [codeCopied, setCodeCopied] = useState(false);
  
  // AI Policy State
  const [aiPolicyEnabled, setAiPolicyEnabled] = useState(true);

  if (!user) return null;

  const handleConnect = (platform: CMSPlatform) => {
    setSelectedPlatform(platform);
    setSetupDialogOpen(true);
  };

  const handleCompleteSetup = () => {
    if (selectedPlatform) {
      setPlatforms(prev => 
        prev.map(p => 
          p.id === selectedPlatform.id 
            ? { ...p, connected: true } 
            : p
        )
      );
      toast({
        title: "Connected Successfully",
        description: `${selectedPlatform.name} has been connected to your account.`,
      });
      setSetupDialogOpen(false);
    }
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms(prev =>
      prev.map(p =>
        p.id === platformId
          ? { ...p, connected: false }
          : p
      )
    );
    const platform = platforms.find(p => p.id === platformId);
    toast({
      title: "Disconnected",
      description: `${platform?.name} has been disconnected.`,
    });
  };

  const widgetCode = `<script src="https://opedd.io/widget.js" 
  data-text="${widgetText}"
  data-color="${widgetColor}"
  data-publisher-id="${user.id?.slice(0, 8)}">
</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    setCodeCopied(true);
    toast({
      title: "Copied!",
      description: "Widget code copied to clipboard.",
    });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const colorPresets = [
    { name: "Oxford Blue", value: "#4A26ED" },
    { name: "Deep Navy", value: "#040042" },
    { name: "Plum", value: "#D1009A" },
    { name: "Emerald", value: "#059669" },
    { name: "Slate", value: "#475569" },
  ];

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-5xl w-full mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#4A26ED]/10 rounded-xl flex items-center justify-center">
              <Zap size={24} className="text-[#4A26ED]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Publisher Tools</h1>
              <p className="text-[#040042]/60 text-sm">Connect your CMS, customize your widget, and manage AI access</p>
            </div>
          </div>

          {/* Section 1: Connect your CMS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">Connect Your CMS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <div 
                  key={platform.id}
                  className="bg-white rounded-xl border border-[#E8F2FB] p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        platform.connected 
                          ? "bg-[#4A26ED]/10 text-[#4A26ED]" 
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        {platform.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#040042]">{platform.name}</h3>
                          {platform.connected && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full">
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#040042]/60 mt-1">{platform.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {platform.connected ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConnect(platform)}
                          className="text-[#040042]/70"
                        >
                          <FileText size={14} className="mr-1" />
                          View Setup
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        className="bg-[#040042] hover:bg-[#040042]/90 text-white"
                      >
                        Connect
                        <ChevronRight size={14} className="ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Web Widget Setup */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-[#D1009A]" />
              <h2 className="font-bold text-[#040042]">Web Widget Setup</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Widget Controls */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#040042]">Button Text</Label>
                  <Select value={widgetText} onValueChange={setWidgetText}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="License This Content">License This Content</SelectItem>
                      <SelectItem value="Buy IP Rights">Buy IP Rights</SelectItem>
                      <SelectItem value="Request License">Request License</SelectItem>
                      <SelectItem value="Get Usage Rights">Get Usage Rights</SelectItem>
                      <SelectItem value="Republish This">Republish This</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#040042]">Primary Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setWidgetColor(color.value)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          widgetColor === color.value 
                            ? "border-[#040042] scale-110" 
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <Input
                      type="color"
                      value={widgetColor}
                      onChange={(e) => setWidgetColor(e.target.value)}
                      className="w-8 h-8 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#040042]">Embed Code</Label>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                      <code>{widgetCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      onClick={handleCopyCode}
                      className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white h-8"
                    >
                      {codeCopied ? (
                        <>
                          <Check size={14} className="mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
                <Label className="text-sm font-semibold text-[#040042] block mb-4">Live Preview</Label>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 min-h-[280px] flex flex-col">
                  {/* Simulated Article */}
                  <div className="bg-white rounded-lg shadow-sm p-5 flex-1">
                    <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                    <div className="h-5 w-3/4 bg-slate-300 rounded mb-2" />
                    <div className="space-y-2 mb-4">
                      <div className="h-2 w-full bg-slate-100 rounded" />
                      <div className="h-2 w-full bg-slate-100 rounded" />
                      <div className="h-2 w-5/6 bg-slate-100 rounded" />
                    </div>
                    
                    {/* Widget Preview */}
                    <div className="border-t border-slate-100 pt-4 mt-auto">
                      <div className="flex items-center gap-3">
                        <button
                          className="px-4 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                          style={{ backgroundColor: widgetColor }}
                        >
                          <Shield size={16} />
                          {widgetText}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Protected by Opedd
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trust Badge */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Shield size={12} className="text-[#4A26ED]" />
                    <span>Verified IP Protection • Story Protocol Secured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: AI Crawler Policy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">AI Crawler Policy</h2>
            </div>
            <div className="bg-gradient-to-r from-[#040042] to-[#1a1a6c] rounded-xl p-6 shadow-lg">
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield size={28} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Enforce Story Protocol Licensing</h3>
                    <p className="text-sm text-white/70 max-w-lg">
                      Automatically notifies AI crawlers of your licensing fees and blocks unauthorized scraping. 
                      Your content will only be used for AI training if models pay your specified ingestion fee.
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                        robots.txt updated
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                        ai.txt configured
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                        Story Protocol registered
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    checked={aiPolicyEnabled}
                    onCheckedChange={(checked) => {
                      setAiPolicyEnabled(checked);
                      toast({
                        title: checked ? "AI Protection Enabled" : "AI Protection Disabled",
                        description: checked 
                          ? "Your content is now protected from unauthorized AI scraping."
                          : "AI crawlers can now access your content without licensing.",
                      });
                    }}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span className="text-xs text-white/50">
                    {aiPolicyEnabled ? "Protection Active" : "Protection Disabled"}
                  </span>
                </div>
              </div>
              
              {aiPolicyEnabled && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">47</div>
                        <div className="text-xs text-white/50">Crawl Attempts</div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-400">$2,847</div>
                        <div className="text-xs text-white/50">Fees Collected</div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">12</div>
                        <div className="text-xs text-white/50">Blocked</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <ExternalLink size={14} className="mr-2" />
                      View Activity Log
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-[#040042]">
              {selectedPlatform && (
                <div className="w-10 h-10 rounded-lg bg-[#4A26ED]/10 text-[#4A26ED] flex items-center justify-center">
                  {selectedPlatform.icon}
                </div>
              )}
              Connect {selectedPlatform?.name}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to integrate Opedd with your {selectedPlatform?.name} publication.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedPlatform?.setupSteps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#4A26ED]/10 text-[#4A26ED] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-[#040042]/80 pt-0.5">{step}</p>
              </div>
            ))}
          </div>

          {/* Platform-specific input */}
          {selectedPlatform && !selectedPlatform.connected && (
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-[#040042]">
                {selectedPlatform.id === "rss" ? "RSS Feed URL" : 
                 selectedPlatform.id === "substack" ? "Substack URL" :
                 selectedPlatform.id === "ghost" ? "Ghost Admin URL" :
                 "WordPress Site URL"}
              </Label>
              <Input 
                placeholder={
                  selectedPlatform.id === "rss" ? "https://yoursite.com/feed.xml" :
                  selectedPlatform.id === "substack" ? "https://yourname.substack.com" :
                  selectedPlatform.id === "ghost" ? "https://yourblog.ghost.io" :
                  "https://yoursite.com"
                }
                className="border-slate-200"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setSetupDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteSetup}
              className="flex-1 bg-[#040042] hover:bg-[#040042]/90 text-white"
            >
              {selectedPlatform?.connected ? "Done" : "Complete Setup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
