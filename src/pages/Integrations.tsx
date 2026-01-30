import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Shield, 
  Rss,
  Plug,
  Palette
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConnectCMSModal } from "@/components/integrations/ConnectCMSModal";
import { WidgetCustomizer } from "@/components/integrations/WidgetCustomizer";
import { RegisterContentModal } from "@/components/dashboard/RegisterContentModal";
import { supabase } from "@/integrations/supabase/client";

// Platform logos (high-fidelity brand assets)
import substackLogo from "@/assets/platforms/substack.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import ghostLogo from "@/assets/platforms/ghost.png";
import beehiivLogo from "@/assets/platforms/beehiiv.png";
import mediumLogo from "@/assets/platforms/medium.svg";

interface CMSSource {
  id: string;
  name: string;
  logo: string;
  description: string;
  connected: boolean;
  feedUrl?: string;
  humanPrice?: string;
  aiPrice?: string;
}

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // CMS Sources State
  const [sources, setSources] = useState<CMSSource[]>([
    {
      id: "substack",
      name: "Substack",
      logo: substackLogo,
      description: "Import your newsletter archive automatically",
      connected: true,
      feedUrl: "alice-gray.substack.com",
      humanPrice: "4.99",
      aiPrice: "49.99"
    },
    {
      id: "wordpress",
      name: "WordPress",
      logo: wordpressLogo,
      description: "Sync posts from your WordPress blog",
      connected: false,
    },
    {
      id: "ghost",
      name: "Ghost",
      logo: ghostLogo,
      description: "Connect your Ghost publication",
      connected: false,
    },
    {
      id: "beehiiv",
      name: "Beehiiv",
      logo: beehiivLogo,
      description: "Import your Beehiiv newsletters",
      connected: false,
    },
    {
      id: "medium",
      name: "Medium",
      logo: mediumLogo,
      description: "Import your Medium articles",
      connected: false,
    }
  ]);
  
  const [selectedSource, setSelectedSource] = useState<CMSSource | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  
  // Sync Publication Modal State (opens after connection is active)
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  
  // AI Policy State
  const [aiDefenseEnabled, setAiDefenseEnabled] = useState(true);

  if (!user) return null;

  const handleConnect = (source: CMSSource) => {
    setSelectedSource(source);
    setConnectModalOpen(true);
  };

  const handleConnectionComplete = async (feedUrl: string, humanPrice: string, aiPrice: string) => {
    if (selectedSource) {
      // Update local state
      setSources(prev => 
        prev.map(s => 
          s.id === selectedSource.id 
            ? { ...s, connected: true, feedUrl, humanPrice, aiPrice } 
            : s
        )
      );
      
      // Persist to database
      try {
        await supabase.from("rss_sources").insert({
          user_id: user.id,
          name: selectedSource.name,
          platform: selectedSource.id,
          feed_url: feedUrl,
          sync_status: "active",
        });
      } catch (error) {
        console.error("Error saving RSS source:", error);
      }
      
      toast({
        title: "Source Connected",
        description: `${selectedSource.name} is now syncing your content.`,
      });
      
      // Close ConnectCMS modal, then open Sync Publication modal
      setConnectModalOpen(false);
      setTimeout(() => {
        setSyncModalOpen(true);
      }, 300);
    }
  };

  const handleDisconnect = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    
    // Remove from database
    try {
      if (source?.feedUrl) {
        await supabase
          .from("rss_sources")
          .delete()
          .eq("user_id", user.id)
          .eq("platform", sourceId);
      }
    } catch (error) {
      console.error("Error removing RSS source:", error);
    }
    
    // Update local state
    setSources(prev =>
      prev.map(s =>
        s.id === sourceId
          ? { ...s, connected: false, feedUrl: undefined, humanPrice: undefined, aiPrice: undefined }
          : s
      )
    );
    toast({
      title: "Disconnected",
      description: "Source has been removed from your account.",
    });
  };

  const getLogoForModal = () => {
    if (!selectedSource) return null;
    return <img src={selectedSource.logo} alt={selectedSource.name} className="w-6 h-6 object-contain" />;
  };

  const connectedCount = sources.filter(s => s.connected).length;

  return (
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />

        <div className="p-8 pt-20 lg:pt-8 max-w-5xl w-full mx-auto space-y-10">
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A26ED] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
              <Plug size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Publisher Automation Hub</h1>
              <p className="text-[#040042]/60 text-sm">Manage your content sources and API connections</p>
            </div>
          </div>

          {/* Section 1: CMS Connectors (Inbound) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rss size={18} className="text-[#4A26ED]" />
                <h2 className="font-bold text-[#040042]">Content Sources</h2>
              </div>
              <span className="text-sm text-[#040042]/50">
                {connectedCount} of {sources.length} connected
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sources.map((source) => (
                <div 
                  key={source.id}
                  className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                    source.connected 
                      ? "border-[#4A26ED]/30 shadow-sm" 
                      : "border-[#E8F2FB]"
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center p-3 ${
                      source.connected ? "bg-slate-50" : "bg-slate-100"
                    }`}>
                      <img src={source.logo} alt={source.name} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#040042]">{source.name}</h3>
                      <p className="text-xs text-[#040042]/50 mt-1">{source.description}</p>
                    </div>
                    
                    {source.connected ? (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <span className="text-xs font-medium text-emerald-600">Syncing</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleConnect(source)}
                            className="flex-1 text-xs h-8"
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDisconnect(source.id)}
                            className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleConnect(source)}
                        className="w-full bg-[#040042] hover:bg-[#040042]/90 text-white h-9"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Widget Customizer - Full Featured */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-[#D1009A]" />
                <h2 className="font-bold text-[#040042]">Opedd Widget Customizer</h2>
              </div>
              <span className="text-xs text-[#040042]/50 bg-[#D1009A]/10 px-2 py-1 rounded-full">
                Embed on your site
              </span>
            </div>
            <p className="text-sm text-[#040042]/60 -mt-2">
              Design your licensing widget and get the embed code for your website.
            </p>
            
            <WidgetCustomizer publisherId={user.id?.slice(0, 8) || "publisher"} />
          </section>

          {/* Section 3: AI Defense Policy */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">AI Defense Policy</h2>
            </div>
            
            <div className="bg-gradient-to-br from-[#040042] via-[#0a0a5c] to-[#040042] rounded-xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#4A26ED] to-[#7C3AED] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#4A26ED]/30">
                    <Shield size={26} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Global AI Rights Enforcement</h3>
                    <p className="text-sm text-white/60 max-w-md leading-relaxed">
                      When enabled, Opedd automatically updates your headers and robots.txt to block scrapers that do not pay your required licensing fees.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Switch
                    checked={aiDefenseEnabled}
                    onCheckedChange={(checked) => {
                      setAiDefenseEnabled(checked);
                      toast({
                        title: checked ? "AI Defense Activated" : "AI Defense Disabled",
                        description: checked 
                          ? "Your content is now protected from unauthorized AI scraping."
                          : "AI crawlers can access your content freely.",
                      });
                    }}
                    className="data-[state=checked]:bg-emerald-500 scale-110"
                  />
                  <span className="text-xs text-white/40 mt-1">
                    {aiDefenseEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
              
              {aiDefenseEnabled && (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="text-xs text-white/40">robots.txt</div>
                        <div className="text-sm font-semibold text-white">Updated</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="text-xs text-white/40">ai.txt headers</div>
                        <div className="text-sm font-semibold text-white">Configured</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="text-xs text-white/40">Story Protocol</div>
                        <div className="text-sm font-semibold text-white">Registered</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Connect CMS Modal */}
      <ConnectCMSModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        platformName={selectedSource?.name || ""}
        platformLogo={getLogoForModal()}
        onComplete={handleConnectionComplete}
      />
      
      {/* Sync Publication Modal - Opens after connection is active */}
      <RegisterContentModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
        initialView="publication"
      />
    </div>
  );
}
