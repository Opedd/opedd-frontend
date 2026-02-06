import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Shield, 
  Plug,
  Palette,
  CreditCard,
  Wallet,
  Webhook,
  ExternalLink,
  CheckCircle,
  Circle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { WidgetCustomizer } from "@/components/integrations/WidgetCustomizer";

interface WorkflowConnector {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  status: "connected" | "available" | "coming_soon";
  category: "payouts" | "identity" | "automation";
}

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // AI Policy State
  const [aiDefenseEnabled, setAiDefenseEnabled] = useState(true);

  const connectors: WorkflowConnector[] = [
    {
      id: "stripe",
      name: "Stripe",
      icon: <CreditCard size={22} className="text-[#635BFF]" />,
      description: "Accept payments and automate payouts for licensing revenue",
      status: "available",
      category: "payouts",
    },
    {
      id: "wallet",
      name: "Wallet Connect",
      icon: <Wallet size={22} className="text-[#4A26ED]" />,
      description: "Link a crypto wallet for on-chain identity and IP registration",
      status: "coming_soon",
      category: "identity",
    },
    {
      id: "webhooks",
      name: "CMS Webhooks",
      icon: <Webhook size={22} className="text-emerald-600" />,
      description: "Trigger license events from your CMS (Ghost, WordPress, custom)",
      status: "available",
      category: "automation",
    },
  ];

  if (!user) return null;

  const handleConnectorAction = (connector: WorkflowConnector) => {
    if (connector.status === "coming_soon") {
      toast({
        title: "Coming Soon",
        description: `${connector.name} integration will be available shortly.`,
      });
      return;
    }
    toast({
      title: "Connect " + connector.name,
      description: `${connector.name} setup flow will open here.`,
    });
  };

  const getStatusBadge = (status: WorkflowConnector["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle size={10} />
            Connected
          </Badge>
        );
      case "available":
        return (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
            <Circle size={10} />
            Available
          </Badge>
        );
      case "coming_soon":
        return (
          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">
            Coming Soon
          </Badge>
        );
    }
  };

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
              <h1 className="text-2xl font-bold text-[#040042]">Workflow Connectors</h1>
              <p className="text-[#040042]/60 text-sm">Connect external services to power your licensing workflows</p>
            </div>
          </div>

          {/* Section 1: Connectors Grid */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Plug size={18} className="text-[#4A26ED]" />
              <h2 className="font-bold text-[#040042]">Connectors</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectors.map((connector) => (
                <div
                  key={connector.id}
                  className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {connector.icon}
                    </div>
                    {getStatusBadge(connector.status)}
                  </div>
                  <h3 className="font-semibold text-[#040042] text-sm">{connector.name}</h3>
                  <p className="text-xs text-[#040042]/50 mt-1 flex-1">{connector.description}</p>
                  <Button
                    variant={connector.status === "coming_soon" ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => handleConnectorAction(connector)}
                    disabled={connector.status === "coming_soon"}
                    className="mt-4 w-full h-9 text-xs gap-1.5"
                  >
                    {connector.status === "connected" ? "Manage" : connector.status === "available" ? "Connect" : "Notify Me"}
                    {connector.status === "available" && <ExternalLink size={12} />}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Widget Customizer */}
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
                        <div className="text-xs text-white/40">Secure Rights Ledger</div>
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
    </div>
  );
}
