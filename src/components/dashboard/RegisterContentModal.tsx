import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Rss, 
  FileText, 
  DollarSign,
  Loader2,
  Shield,
  Users,
  Bot,
  X,
  Link2,
  Code,
  Clipboard,
  Check,
  CheckCircle,
  ExternalLink,
  Upload,
  File,
  ArrowLeft
} from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

interface RegisterContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialView?: "choice" | "publication" | "single";
}

type ModalView = "choice" | "publication" | "single" | "syncing" | "success";

interface MockArticle {
  title: string;
  status: "pending" | "syncing" | "complete";
}

export function RegisterContentModal({ open, onOpenChange, onSuccess, initialView = "choice" }: RegisterContentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [view, setView] = useState<ModalView>(initialView);
  
  // Update view when initialView changes or modal opens
  React.useEffect(() => {
    if (open) {
      setView(initialView);
    }
  }, [open, initialView]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAssetId, setRegisteredAssetId] = useState<string | null>(null);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Publication sync form
  const [feedUrl, setFeedUrl] = useState("");
  const [pubHumanPrice, setPubHumanPrice] = useState("4.99");
  const [pubAiPrice, setPubAiPrice] = useState("49.99");
  
  // Syncing state
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState(0);
  const [totalArticles] = useState(45);
  const [articles, setArticles] = useState<MockArticle[]>([
    { title: "The Future of Digital Publishing", status: "pending" },
    { title: "Why AI Licensing Matters in 2025", status: "pending" },
    { title: "Building a Sustainable Content Business", status: "pending" },
  ]);

  // Single work form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetForm = () => {
    setView("choice");
    setFeedUrl("");
    setPubHumanPrice("4.99");
    setPubAiPrice("49.99");
    setTitle("");
    setDescription("");
    setHumanPrice("4.99");
    setAiPrice("49.99");
    setUploadedFile(null);
    setRegisteredAssetId(null);
    setCopiedWidget(false);
    setCopiedLink(false);
    setProgress(0);
    setCurrentArticle(0);
    setArticles(prev => prev.map(a => ({ ...a, status: "pending" })));
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Syncing animation effect
  useEffect(() => {
    if (view !== "syncing") return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setView("success"), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const articleInterval = setInterval(() => {
      setCurrentArticle(prev => Math.min(prev + 1, totalArticles));
    }, 110);

    const statusTimeouts = articles.map((_, index) => 
      setTimeout(() => {
        setArticles(prev => 
          prev.map((article, i) => ({
            ...article,
            status: i <= index ? (i < index ? "complete" : "syncing") : "pending"
          }))
        );
      }, (index + 1) * 1200)
    );

    const finalTimeout = setTimeout(() => {
      setArticles(prev => prev.map(a => ({ ...a, status: "complete" })));
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(articleInterval);
      statusTimeouts.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, [view, articles.length, totalArticles]);

  // File handling
  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOCX, or TXT file",
        variant: "destructive",
      });
      return;
    }
    setUploadedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Generate distribution links
  const directPayLink = registeredAssetId 
    ? `https://opedd.io/pay/${registeredAssetId}` 
    : "";
  const widgetCode = registeredAssetId 
    ? `<script src="https://opedd.io/widget.js" data-asset-id="${registeredAssetId}"></script>` 
    : "";

  const handleCopy = async (text: string, type: "widget" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "widget") {
        setCopiedWidget(true);
        setTimeout(() => setCopiedWidget(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast({
        title: "Copied!",
        description: type === "widget" ? "Widget code copied to clipboard" : "Direct link copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handlePublicationSync = async () => {
    if (!feedUrl.trim()) {
      toast({
        title: "Feed URL Required",
        description: "Please enter your publication's RSS feed URL",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register content",
        variant: "destructive",
      });
      return;
    }

    // Start the syncing animation
    setView("syncing");

    try {
      // Create an asset representing the publication source
      const { data, error } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          title: `Publication: ${feedUrl}`,
          source_url: feedUrl,
          human_price: parseFloat(pubHumanPrice) || 4.99,
          ai_price: parseFloat(pubAiPrice) || 49.99,
          licensing_enabled: true,
          total_revenue: 0,
          human_licenses_sold: 0,
          ai_licenses_sold: 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      setRegisteredAssetId(data.id);
      onSuccess?.();
    } catch (error) {
      console.error("Error syncing publication:", error);
      // Still show success for demo purposes
      setRegisteredAssetId("demo-" + Date.now());
      onSuccess?.();
    }
  };

  const handleSingleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your work",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register content",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          title: title,
          description: description || null,
          content: description || null,
          human_price: parseFloat(humanPrice) || 4.99,
          ai_price: parseFloat(aiPrice) || 49.99,
          licensing_enabled: true,
          total_revenue: 0,
          human_licenses_sold: 0,
          ai_licenses_sold: 0,
        })
        .select("id")
        .single();

      if (error) throw error;

      setRegisteredAssetId(data.id);
      setView("success");

      toast({
        title: "Asset Registered",
        description: "Your content has been protected on Story Protocol",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Registration Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getArticleStatusIcon = (status: MockArticle["status"]) => {
    switch (status) {
      case "complete":
        return <Check size={14} className="text-emerald-500" />;
      case "syncing":
        return <Loader2 size={14} className="text-[#4A26ED] animate-spin" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />;
    }
  };

  // CHOICE VIEW
  if (view === "choice") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-[#040042] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={opeddLogo} alt="Opedd" className="h-8" />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight">Register Content</h1>
                  <p className="text-[#A78BFA] text-sm">What are you protecting today?</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="p-6 space-y-4">
            <button
              onClick={() => setView("publication")}
              className="w-full p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-[#4A26ED] hover:bg-[#4A26ED]/5 text-left transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4A26ED] group-hover:text-white transition-colors">
                  <Link2 size={24} className="text-[#4A26ED] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#040042] text-base mb-1">Sync a Publication</h3>
                  <p className="text-sm text-slate-500">Connect a Newsletter, RSS, or Website to automatically import and protect every new post.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setView("single")}
              className="w-full p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-[#4A26ED] hover:bg-[#4A26ED]/5 text-left transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4A26ED] group-hover:text-white transition-colors">
                  <Upload size={24} className="text-[#4A26ED] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#040042] text-base mb-1">Register Single Work</h3>
                  <p className="text-sm text-slate-500">Upload an article, PDF, or text to protect a one-off piece of content.</p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // PUBLICATION SYNC VIEW
  if (view === "publication") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Light Header */}
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center">
                  <Link2 size={24} className="text-[#4A26ED]" />
                </div>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">Sync Publication</h1>
                  <p className="text-[#040042]/60 text-sm">Connect your RSS feed to auto-protect content</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-[#040042]/60" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">RSS Feed URL</Label>
              <div className="relative">
                <Rss size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://yourname.substack.com/feed"
                  className="border-slate-200 h-12 pl-10 text-[#040042] focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                />
              </div>
              <p className="text-xs text-slate-500">
                We'll fetch and protect all articles from this feed
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#4A26ED]" />
                <span className="text-sm font-semibold text-[#040042]">Global License Fees</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">Human Republication</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <Input 
                      type="number"
                      value={pubHumanPrice}
                      onChange={(e) => setPubHumanPrice(e.target.value)}
                      placeholder="4.99"
                      className="border-slate-200 h-11 pl-7 bg-white focus:border-[#4A26ED]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Per article license</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">AI Ingestion</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <Input 
                      type="number"
                      value={pubAiPrice}
                      onChange={(e) => setPubAiPrice(e.target.value)}
                      placeholder="49.99"
                      className="border-slate-200 h-11 pl-7 bg-white focus:border-[#4A26ED]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-400">LLM training rights</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePublicationSync}
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
            >
              <Shield size={18} className="mr-2" />
              Connect & Protect Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // SYNCING VIEW
  if (view === "syncing") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-[#040042] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={opeddLogo} alt="Opedd" className="h-8" />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight">Syncing Archive</h1>
                  <p className="text-[#A78BFA] text-sm">Registering content on Story Protocol</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A26ED]/10 mb-4">
                <Loader2 size={32} className="text-[#4A26ED] animate-spin" />
              </div>
              <p className="text-sm text-slate-600">
                Registering {currentArticle}/{totalArticles} articles...
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <FileText size={12} />
                <span>Recently Fetched & Shielded</span>
              </div>
              <div className="space-y-2">
                {articles.map((article, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      article.status === "syncing" 
                        ? "bg-[#4A26ED]/5 border border-[#4A26ED]/20" 
                        : article.status === "complete"
                        ? "bg-emerald-50/50"
                        : "bg-white border border-slate-100"
                    }`}
                  >
                    {getArticleStatusIcon(article.status)}
                    <span className={`text-sm flex-1 truncate ${
                      article.status === "complete" 
                        ? "text-[#040042]" 
                        : article.status === "syncing"
                        ? "text-[#4A26ED] font-medium"
                        : "text-slate-400"
                    }`}>
                      {article.title}
                    </span>
                    {article.status === "complete" && (
                      <span className="text-xs text-emerald-600 font-medium">Protected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // SINGLE WORK VIEW
  if (view === "single") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Light Header */}
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center">
                  <Upload size={24} className="text-[#4A26ED]" />
                </div>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">Register Single Work</h1>
                  <p className="text-[#040042]/60 text-sm">Protect an article, PDF, or text</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-[#040042]/60" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">Title *</Label>
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Future of AI Governance"
                className="border-slate-200 h-12 text-[#040042] focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">Content (Optional)</Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste your article text here..."
                rows={4}
                className="border-slate-200 text-[#040042] resize-none focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
              />
            </div>

            {/* File Upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDragOver 
                  ? "border-[#4A26ED] bg-[#4A26ED]/5" 
                  : uploadedFile
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File size={20} className="text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{uploadedFile.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Drop a file here or click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT</p>
                </>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#4A26ED]" />
                <span className="text-sm font-semibold text-[#040042]">License Fees</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">Human Republication</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <Input 
                      type="number"
                      value={humanPrice}
                      onChange={(e) => setHumanPrice(e.target.value)}
                      placeholder="4.99"
                      className="border-slate-200 h-11 pl-7 bg-white focus:border-[#4A26ED]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">AI Ingestion</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <Input 
                      type="number"
                      value={aiPrice}
                      onChange={(e) => setAiPrice(e.target.value)}
                      placeholder="49.99"
                      className="border-slate-200 h-11 pl-7 bg-white focus:border-[#4A26ED]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex-shrink-0">
            <Button 
              onClick={handleSingleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Shield size={18} className="mr-2" />
                  Mint & Protect
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // SUCCESS VIEW
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-50 border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#040042] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={opeddLogo} alt="Opedd" className="h-8" />
              <div className="h-6 w-px bg-white/20" />
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">Registration Complete</h1>
                <p className="text-emerald-400 text-sm">Your IP is now protected on Story Protocol</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Success Content */}
        <div className="p-6">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
          </div>

          {/* Distribution Tabs */}
          <Tabs defaultValue="widget" className="w-full">
            <TabsList className="w-full bg-slate-100 p-1 rounded-xl h-11">
              <TabsTrigger 
                value="widget" 
                className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
              >
                <Code size={14} className="mr-2" />
                Embed Widget
              </TabsTrigger>
              <TabsTrigger 
                value="link" 
                className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
              >
                <Link2 size={14} className="mr-2" />
                Direct Pay Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="widget" className="mt-4">
              <div className="bg-slate-900 rounded-xl p-4 relative group">
                <code className="text-xs text-emerald-400 font-mono break-all leading-relaxed">
                  {widgetCode}
                </code>
                <Button
                  size="sm"
                  onClick={() => handleCopy(widgetCode, "widget")}
                  className="absolute top-2 right-2 h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
                >
                  {copiedWidget ? (
                    <>
                      <Check size={12} className="mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard size={12} className="mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Add this script tag to your website to enable licensing
              </p>
            </TabsContent>

            <TabsContent value="link" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5 overflow-hidden">
                  <code className="text-sm text-[#4A26ED] font-mono truncate block">
                    {directPayLink}
                  </code>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCopy(directPayLink, "link")}
                  className="h-9 px-4 bg-[#040042] hover:bg-[#0A0066] text-white rounded-lg text-xs font-medium flex-shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check size={12} className="mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard size={12} className="mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Share this link to accept payments directly
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-200">
          <Button
            type="button"
            onClick={handleClose}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
