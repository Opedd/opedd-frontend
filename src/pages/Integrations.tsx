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

interface CMSSource {
  id: string;
  name: string;
  logo: React.ReactNode;
  description: string;
  connected: boolean;
  feedUrl?: string;
  humanPrice?: string;
  aiPrice?: string;
}

// High-quality brand logos as SVG components
const SubstackLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#FF6719">
    <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24l9.54-5.49L20.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
  </svg>
);

const WordPressLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#21759B">
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-.812.118-1.596.336-2.336l3.693 10.112A8.567 8.567 0 013.443 12zm8.557 8.557c-.936 0-1.836-.152-2.678-.43l2.844-8.26 2.912 7.984c.02.046.042.09.066.132a8.524 8.524 0 01-3.144.574zm1.301-12.54c.57-.03 1.084-.09 1.084-.09.51-.06.45-.81-.06-.78 0 0-1.534.12-2.524.12-.93 0-2.49-.12-2.49-.12-.51-.03-.57.75-.06.78 0 0 .48.06.99.09l1.47 4.032-2.064 6.192-3.434-10.224c.57-.03 1.084-.09 1.084-.09.51-.06.45-.81-.06-.78 0 0-1.534.12-2.524.12-.178 0-.388-.004-.612-.01A8.528 8.528 0 0112 3.443c2.274 0 4.348.888 5.89 2.336-.038-.002-.074-.008-.114-.008-.93 0-1.59.81-1.59 1.68 0 .78.45 1.44.93 2.22.36.63.78 1.44.78 2.61 0 .81-.312 1.752-.72 3.066l-.948 3.168-3.426-10.194zM15.033 19.2l2.892-8.352c.54-1.35.72-2.43.72-3.39 0-.348-.024-.672-.066-.978A8.544 8.544 0 0120.557 12a8.552 8.552 0 01-5.524 7.2z"/>
  </svg>
);

const GhostLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#15171A">
    <path d="M12 2a8 8 0 00-8 8v8a4 4 0 004 4 2 2 0 002-2v-2a2 2 0 014 0v2a2 2 0 002 2 4 4 0 004-4v-8a8 8 0 00-8-8zm-3 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
  </svg>
);

const MediumLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#000000">
    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
  </svg>
);

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // CMS Sources State
  const [sources, setSources] = useState<CMSSource[]>([
    {
      id: "substack",
      name: "Substack",
      logo: <SubstackLogo />,
      description: "Import your newsletter archive automatically",
      connected: true,
      feedUrl: "alice-gray.substack.com",
      humanPrice: "4.99",
      aiPrice: "49.99"
    },
    {
      id: "wordpress",
      name: "WordPress",
      logo: <WordPressLogo />,
      description: "Sync posts from your WordPress blog",
      connected: false,
    },
    {
      id: "ghost",
      name: "Ghost",
      logo: <GhostLogo />,
      description: "Connect your Ghost publication",
      connected: false,
    },
    {
      id: "medium",
      name: "Medium",
      logo: <MediumLogo />,
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
    switch (selectedSource.id) {
      case "substack": return <SubstackLogo className="w-6 h-6" />;
      case "wordpress": return <WordPressLogo className="w-6 h-6" />;
      case "ghost": return <GhostLogo className="w-6 h-6" />;
      case "medium": return <MediumLogo className="w-6 h-6" />;
      default: return <Rss size={24} />;
    }
  };

  const connectedCount = sources.filter(s => s.connected).length;

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-5xl w-full mx-auto space-y-10">
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
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      source.connected ? "bg-slate-50" : "bg-slate-100"
                    }`}>
                      {source.logo}
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
