import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FileText, ArrowLeft, Link as LinkIcon, DollarSign, Bot, Users, Building2 } from "lucide-react";

export default function AddAsset() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [contentUrl, setContentUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("article");

  // Licensing toggles
  const [humanConsumption, setHumanConsumption] = useState(true);
  const [aiTraining, setAiTraining] = useState(true);
  const [commercialRedist, setCommercialRedist] = useState(false);

  // Pricing
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Integrate with backend API
      await new Promise((r) => setTimeout(r, 1000));
      
      toast({
        title: "Asset Registered",
        description: `"${title}" has been added to your Smart Library`,
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-4xl w-full mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-[#040042]/60 hover:text-[#040042] mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Smart Library</span>
          </button>

          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#4A26ED]/10 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-[#4A26ED]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Register New Asset</h1>
              <p className="text-[#040042]/60 text-sm">Add content to your sovereign registry</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Content URL */}
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon size={18} className="text-[#4A26ED]" />
                <h2 className="font-semibold text-[#040042]">Content Source</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url" className="text-[#040042]/70 text-sm">Content URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-publication.com/article"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  required
                  className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl"
                />
                <p className="text-xs text-[#040042]/50">Paste the URL of your article, video, or audio content</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-[#4A26ED]" />
                <h2 className="font-semibold text-[#040042]">Metadata</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#040042]/70 text-sm">Title</Label>
                  <Input
                    id="title"
                    placeholder="The Future of AI Governance"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[#040042]/70 text-sm">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="A comprehensive analysis of..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-[#F2F9FF] border-[#E8F2FB] rounded-xl min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#040042]/70 text-sm">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F2F9FF] border border-[#E8F2FB] h-12 rounded-xl px-4 text-[#040042]"
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio / Podcast</option>
                    <option value="research">Research Paper</option>
                    <option value="dataset">Dataset</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Licensing Engine */}
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Bot size={18} className="text-[#4A26ED]" />
                <h2 className="font-semibold text-[#040042]">Licensing Engine</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-[#4A26ED]" />
                    <div>
                      <p className="font-medium text-[#040042] text-sm">Human Consumption</p>
                      <p className="text-xs text-[#040042]/50">Individual readers and subscribers</p>
                    </div>
                  </div>
                  <Switch checked={humanConsumption} onCheckedChange={setHumanConsumption} />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                  <div className="flex items-center gap-3">
                    <Bot size={20} className="text-[#4A26ED]" />
                    <div>
                      <p className="font-medium text-[#040042] text-sm">AI Model Training</p>
                      <p className="text-xs text-[#040042]/50">LLM providers and AI companies</p>
                    </div>
                  </div>
                  <Switch checked={aiTraining} onCheckedChange={setAiTraining} />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl">
                  <div className="flex items-center gap-3">
                    <Building2 size={20} className="text-[#4A26ED]" />
                    <div>
                      <p className="font-medium text-[#040042] text-sm">Commercial Redistribution</p>
                      <p className="text-xs text-[#040042]/50">Syndication and republishing rights</p>
                    </div>
                  </div>
                  <Switch checked={commercialRedist} onCheckedChange={setCommercialRedist} />
                </div>
              </div>
            </div>

            {/* Dynamic Pricing */}
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-[#D1009A]" />
                <h2 className="font-semibold text-[#040042]">Dynamic Pricing</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#040042]/70 text-sm">Individual Human License</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/50">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={humanPrice}
                      onChange={(e) => setHumanPrice(e.target.value)}
                      disabled={!humanConsumption}
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl pl-8 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-xs text-[#040042]/50">Per-article access fee</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#040042]/70 text-sm">Enterprise AI Training</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/50">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={aiPrice}
                      onChange={(e) => setAiPrice(e.target.value)}
                      disabled={!aiTraining}
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl pl-8 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-xs text-[#040042]/50">Per-model training license</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex-1 h-14 border border-[#E8F2FB] text-[#040042] rounded-xl font-semibold hover:bg-[#F2F9FF] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title || !contentUrl}
                className="flex-1 h-14 bg-[#040042] text-white rounded-xl font-semibold hover:bg-[#0A0066] disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? "Registering..." : "Register Asset"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
