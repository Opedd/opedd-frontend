import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ContentSourceModal } from "@/components/dashboard/ContentSourceModal";
import { Zap, Bot, CreditCard, Link2, CheckCircle2, Rss, FileText, Ghost } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "ai" | "payments" | "web3";
  connected: boolean;
  status?: string;
}

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "openai",
      name: "OpenAI",
      description: "Allow GPT models to license and cite your content",
      icon: <Bot size={24} />,
      category: "ai",
      connected: true,
      status: "Active - 47 requests this month",
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Enable Claude models to access your licensed content",
      icon: <Bot size={24} />,
      category: "ai",
      connected: false,
    },
    {
      id: "google",
      name: "Google DeepMind",
      description: "Gemini model training and inference licensing",
      icon: <Bot size={24} />,
      category: "ai",
      connected: false,
    },
    {
      id: "stripe",
      name: "Stripe Connect",
      description: "Real-time payouts to your bank account",
      icon: <CreditCard size={24} />,
      category: "payments",
      connected: true,
      status: "Connected to ****4242",
    },
    {
      id: "web3-ledger",
      name: "Secure Rights Ledger",
      description: "Immutable ownership records and content hashing",
      icon: <Link2 size={24} />,
      category: "web3",
      connected: false,
    },
  ]);

  if (!user) return null;

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id
          ? { ...integration, connected: !integration.connected }
          : integration
      )
    );
    
    const integration = integrations.find((i) => i.id === id);
    toast({
      title: integration?.connected ? "Disconnected" : "Connected",
      description: `${integration?.name} has been ${integration?.connected ? "disconnected" : "connected"}`,
    });
  };

  const aiIntegrations = integrations.filter((i) => i.category === "ai");
  const paymentIntegrations = integrations.filter((i) => i.category === "payments");
  const web3Integrations = integrations.filter((i) => i.category === "web3");

  // Content source modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<{
    id: "substack" | "ghost" | "rss";
    name: string;
  } | null>(null);

  const contentSources = [
    {
      id: "substack" as const,
      name: "Substack",
      description: "Import your Substack newsletter archive",
      icon: <FileText size={24} />,
    },
    {
      id: "ghost" as const,
      name: "Ghost",
      description: "Connect your Ghost publication",
      icon: <Ghost size={24} />,
    },
    {
      id: "rss" as const,
      name: "RSS Feed",
      description: "Sync any RSS or Atom feed",
      icon: <Rss size={24} />,
    },
  ];

  const handleSourceClick = (source: typeof contentSources[0]) => {
    setSelectedPlatform({ id: source.id, name: source.name });
    setModalOpen(true);
  };

  const IntegrationCard = ({ integration }: { integration: Integration }) => (
    <div className="bg-white rounded-xl border border-[#E8F2FB] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            integration.connected ? "bg-[#4A26ED]/10 text-[#4A26ED]" : "bg-[#040042]/5 text-[#040042]/40"
          }`}>
            {integration.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#040042]">{integration.name}</h3>
              {integration.connected && (
                <CheckCircle2 size={16} className="text-emerald-500" />
              )}
            </div>
            <p className="text-sm text-[#040042]/60 mt-1">{integration.description}</p>
            {integration.status && (
              <p className="text-xs text-[#4A26ED] mt-2 font-medium">{integration.status}</p>
            )}
          </div>
        </div>
        <Switch
          checked={integration.connected}
          onCheckedChange={() => handleToggle(integration.id)}
        />
      </div>
    </div>
  );

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
              <h1 className="text-2xl font-bold text-[#040042]">Integrations Gateway</h1>
              <p className="text-[#040042]/60 text-sm">Connect AI providers, payments, and ownership protocols</p>
            </div>
          </div>

          {/* Automated Content Sources Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Rss size={18} className="text-[#4A26ED]" />
              <h2 className="font-semibold text-[#040042]">Automated Content Sources</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contentSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceClick(source)}
                  className="bg-white rounded-xl border border-[#E8F2FB] p-5 shadow-sm hover:shadow-md hover:border-[#4A26ED]/30 transition-all text-left group"
                >
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#4A26ED]/10 text-[#4A26ED] flex items-center justify-center group-hover:bg-[#4A26ED] group-hover:text-white transition-colors">
                      {source.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#040042]">{source.name}</h3>
                      <p className="text-sm text-[#040042]/60 mt-1">{source.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Connect Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-[#4A26ED]" />
              <h2 className="font-semibold text-[#040042]">AI Model Providers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiIntegrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>

          {/* Payments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#D1009A]" />
              <h2 className="font-semibold text-[#040042]">Payment Processing</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentIntegrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>

          {/* Web3 Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Link2 size={18} className="text-[#4A26ED]" />
              <h2 className="font-semibold text-[#040042]">Ownership Protocols</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {web3Integrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        </div>

        {/* Content Source Modal */}
        {selectedPlatform && (
          <ContentSourceModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            platform={selectedPlatform.id}
            platformName={selectedPlatform.name}
          />
        )}
      </main>
    </div>
  );
}
