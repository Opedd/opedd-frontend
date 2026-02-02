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
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import { 
  Rss, 
  FileText, 
  Loader2,
  Shield,
  X,
  Link2,
  Code,
  Clipboard,
  Check,
  CheckCircle,
  Upload,
  File,
  Globe,
  Image as ImageIcon,
  Copy,
  Plug,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

// Platform logos
import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.png";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.png";

interface RegisterContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialView?: "choice" | "publication" | "single";
  /** When true, shows empty state if no active integrations for "publication" view */
  checkIntegrations?: boolean;
}

type ModalView = "choice" | "publication" | "single" | "syncing" | "pub-success" | "success";

interface MockArticle {
  title: string;
  status: "pending" | "syncing" | "complete";
}

// Detect platform from URL
const detectPlatform = (url: string): { name: string; logo: string } | null => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("substack.com")) return { name: "Substack", logo: substackLogo };
  if (lowerUrl.includes("ghost.io") || lowerUrl.includes("ghost.org")) return { name: "Ghost", logo: ghostLogo };
  if (lowerUrl.includes("beehiiv.com")) return { name: "Beehiiv", logo: beehiivLogo };
  if (lowerUrl.includes("wordpress.com") || lowerUrl.includes("wp.com")) return { name: "WordPress", logo: wordpressLogo };
  return null;
};

// Generate verification code/token
const generateVerificationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OPEDD-${code}`;
};

// Generate content hash from content string
const generateContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
};

export function RegisterContentModal({ open, onOpenChange, onSuccess, initialView = "choice", checkIntegrations = false }: RegisterContentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { contentSources } = useAuthenticatedApi();
  const navigate = useNavigate();
  
  const [view, setView] = useState<ModalView>(initialView);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [copiedVerification, setCopiedVerification] = useState(false);
  
  // Check for active integrations (for empty state)
  const [hasActiveIntegrations, setHasActiveIntegrations] = useState(true);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  
  // Update view when initialView changes or modal opens
  useEffect(() => {
    if (open) {
      setView(initialView);
      setVerificationCode(generateVerificationCode());
      
      // Check for active integrations if needed
      if (checkIntegrations && initialView === "publication" && user) {
        setIntegrationsLoading(true);
        supabase
          .from("rss_sources")
          .select("id")
          .eq("user_id", user.id)
          .eq("sync_status", "active")
          .then(({ data }) => {
            setHasActiveIntegrations((data?.length || 0) > 0);
            setIntegrationsLoading(false);
          });
      }
    }
  }, [open, initialView, checkIntegrations, user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAssetId, setRegisteredAssetId] = useState<string | null>(null);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Publication sync form
  const [feedUrl, setFeedUrl] = useState("");
  const [pubHumanPrice, setPubHumanPrice] = useState("4.99");
  const [pubAiPrice, setPubAiPrice] = useState("");
  
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
  const [articleUrl, setArticleUrl] = useState("");
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "url">("file");

  const detectedPlatform = detectPlatform(feedUrl);
  
  // Feed preview state
  const [feedPreview, setFeedPreview] = useState<{
    title: string;
    description: string;
    isLoading: boolean;
    error: string | null;
  } | null>(null);
  
  // Connecting state (for triggering RSS import)
  const [isConnecting, setIsConnecting] = useState(false);

  // Simulate fetching feed metadata when URL changes
  useEffect(() => {
    if (feedUrl.length > 15 && feedUrl.includes('.')) {
      setFeedPreview({ title: '', description: '', isLoading: true, error: null });
      
      // Simulate fetching feed metadata
      const timer = setTimeout(() => {
        const platform = detectPlatform(feedUrl);
        // Extract publication name from URL
        let pubName = 'Your Publication';
        try {
          const url = new URL(feedUrl.startsWith('http') ? feedUrl : `https://${feedUrl}`);
          pubName = url.hostname.split('.')[0];
          if (pubName === 'www') pubName = url.hostname.split('.')[1] || 'Your Publication';
          pubName = pubName.charAt(0).toUpperCase() + pubName.slice(1);
        } catch {
          // Use default
        }
        
        setFeedPreview({
          title: platform ? `${pubName} on ${platform.name}` : pubName,
          description: `Articles from ${feedUrl}`,
          isLoading: false,
          error: null,
        });
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      setFeedPreview(null);
    }
  }, [feedUrl]);

  const resetForm = () => {
    setView("choice");
    setFeedUrl("");
    setPubHumanPrice("4.99");
    setPubAiPrice("");
    setTitle("");
    setDescription("");
    setArticleUrl("");
    setHumanPrice("4.99");
    setAiPrice("");
    setUploadedFile(null);
    setInputMode("file");
    setRegisteredAssetId(null);
    setVerificationToken(null);
    setCopiedWidget(false);
    setCopiedLink(false);
    setCopiedVerification(false);
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
          setTimeout(() => setView("pub-success"), 500);
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
    setInputMode("file");
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

  const handleCopy = async (text: string, type: "widget" | "link" | "verification") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "widget") {
        setCopiedWidget(true);
        setTimeout(() => setCopiedWidget(false), 2000);
      } else if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedVerification(true);
        setTimeout(() => setCopiedVerification(false), 2000);
      }
      toast({
        title: "Copied!",
        description: type === "verification" ? "Verification code copied" : type === "widget" ? "Widget code copied to clipboard" : "Direct link copied to clipboard",
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

    // Start connecting state then syncing animation
    setIsConnecting(true);

    try {
      // Generate verification token
      const token = generateVerificationCode();
      
      // Detect platform from URL for metadata
      const platform = detectPlatform(feedUrl);
      
      // Generate content hash from feed URL
      const contentHash = generateContentHash(feedUrl);
      
      // Determine access type based on pricing
      const hasHuman = parseFloat(pubHumanPrice) > 0;
      const hasAi = pubAiPrice && parseFloat(pubAiPrice) > 0;
      const accessType = hasHuman && hasAi ? "both" : hasAi ? "ai" : "human";
      
      // Get the publication name from preview or URL
      const pubName = feedPreview?.title || feedUrl;
      const cleanPubName = pubName.startsWith('Publication:') ? pubName.replace('Publication: ', '') : pubName;
      
      // Step 1: Create content source via authenticated API (token auto-injected)
      const sourceData = await contentSources.create<{ id: string; verification_token?: string }>({
        feed_url: feedUrl,
        name: cleanPubName,
        human_price: parseFloat(pubHumanPrice) || 4.99,
        ai_price: pubAiPrice ? parseFloat(pubAiPrice) : undefined,
      });
      
      console.log("[RegisterContentModal] Created content source via API:", sourceData);
      
      // Start the syncing animation after source creation
      setIsConnecting(false);
      setView("syncing");
      
      // Use the source ID as the registered asset ID
      const sourceId = sourceData.id;
      setRegisteredAssetId(sourceId);
      
      // Use verification token from API response or generated one
      const verificationTokenFromApi = sourceData.verification_token || token;
      setVerificationToken(verificationTokenFromApi);
      setVerificationCode(verificationTokenFromApi);
      
      // Step 2: Trigger RSS sync to import articles (token auto-injected)
      try {
        await contentSources.sync(sourceId);
        console.log("[RegisterContentModal] RSS sync triggered for source:", sourceId);
      } catch (syncError) {
        console.log("[RegisterContentModal] RSS sync not available yet:", syncError);
        // Non-critical - the sync will happen when backend is ready
      }
      
      onSuccess?.();
    } catch (error) {
      console.error("Error syncing publication:", error);
      setIsConnecting(false);
      toast({
        title: "Sync Failed",
        description: "Could not sync publication. Please try again.",
        variant: "destructive",
      });
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
      // Generate content hash from title + description
      const contentHash = generateContentHash(`${title}${description || ''}`);
      
      // Determine access type based on pricing
      const hasHuman = parseFloat(humanPrice) > 0;
      const hasAi = aiPrice && parseFloat(aiPrice) > 0;
      const accessType = hasHuman && hasAi ? "both" : hasAi ? "ai" : "human";
      
      // Create asset with correct DB column names
      const { data, error } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          title: title,
          description: description || null,
          content: description || null,
          source_url: articleUrl || null,
          human_price: parseFloat(humanPrice) || 4.99,
          ai_price: aiPrice ? parseFloat(aiPrice) : null,
          licensing_enabled: true,
          total_revenue: 0,
          human_licenses_sold: 0,
          ai_licenses_sold: 0,
          license_type: accessType, // DB column is license_type, not access_type
          content_hash: contentHash,
          verification_status: "verified", // Single works are auto-verified
          metadata: {
            url: articleUrl || null,
            type: uploadedFile ? "document" : "article",
            filename: uploadedFile?.name || null,
          },
        })
        .select("id")
        .single();

      if (error) throw error;

      setRegisteredAssetId(data.id);
      setView("success");

      toast({
        title: "Asset Licensed",
        description: "Your content has been registered on Story Protocol",
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

  // Platform icons for display with placeholders
  const platformIcons = [
    { name: "Substack", logo: substackLogo, placeholder: "yourname.substack.com/feed" },
    { name: "Ghost", logo: ghostLogo, placeholder: "yoursite.ghost.io/rss" },
    { name: "Beehiiv", logo: beehiivLogo, placeholder: "yourname.beehiiv.com/feed" },
    { name: "WordPress", logo: wordpressLogo, placeholder: "yoursite.wordpress.com/feed" },
  ];

  const handlePlatformClick = (placeholder: string) => {
    setFeedUrl(`https://${placeholder}`);
  };

  // CHOICE VIEW
  if (view === "choice") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center">
                  <Shield size={24} className="text-[#4A26ED]" />
                </div>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">Register Content</h1>
                  <p className="text-[#040042]/60 text-sm">What are you licensing today?</p>
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

          {/* Options */}
          <div className="p-6 space-y-4">
            <button
              onClick={() => setView("publication")}
              className="w-full p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-[#4A26ED] hover:bg-[#4A26ED]/5 text-left transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A26ED]/20 to-[#7C3AED]/20 flex items-center justify-center flex-shrink-0 group-hover:from-[#4A26ED] group-hover:to-[#7C3AED] transition-all">
                  <Link2 size={24} className="text-[#4A26ED] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#040042] text-base mb-1">Sync a Publication</h3>
                  <p className="text-sm text-slate-500">Connect a Newsletter, RSS, or Website to automatically import and license every new post.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setView("single")}
              className="w-full p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:from-teal-500 group-hover:to-emerald-500 transition-all">
                  <Upload size={24} className="text-teal-600 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#040042] text-base mb-1">Register Single Work</h3>
                  <p className="text-sm text-slate-500">Upload an article, PDF, or text to license a one-off piece of content.</p>
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
    // Show empty state if checkIntegrations is true and no active integrations
    const showEmptyState = checkIntegrations && !hasActiveIntegrations && !integrationsLoading;
    
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Light Header */}
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A26ED]/20 to-[#7C3AED]/20 flex items-center justify-center">
                  <Link2 size={24} className="text-[#4A26ED]" />
                </div>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">Sync Publication</h1>
                  <p className="text-[#040042]/60 text-sm">Connect your RSS feed to auto-license content</p>
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

          {/* Empty State - No Active Integrations */}
          {showEmptyState ? (
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Plug size={36} className="text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#040042]">No Content Sources Connected</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Connect a Substack, Ghost, or WordPress publication first to sync your content automatically.
                </p>
              </div>
              <Button
                onClick={() => {
                  handleClose();
                  navigate("/integrations");
                }}
                className="bg-[#040042] hover:bg-[#040042]/90 text-white"
              >
                Go to Integrations
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          ) : integrationsLoading ? (
            <div className="p-8 text-center">
              <Loader2 size={32} className="text-[#4A26ED] animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-4">Checking integrations...</p>
            </div>
          ) : (
            /* Form */
            <div className="p-6 space-y-5">
            {/* Platform Icons - Interactive Buttons */}
            <div className="flex items-center justify-center gap-3 pb-2">
              {platformIcons.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handlePlatformClick(platform.placeholder)}
                  className="flex flex-col items-center gap-1.5 group"
                  title={`Click to use ${platform.name} template`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center p-2 hover:border-[#4A26ED] hover:shadow-md hover:shadow-[#4A26ED]/10 transition-all cursor-pointer group-hover:scale-105">
                    <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium group-hover:text-[#4A26ED] transition-colors">{platform.name}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">RSS Feed or Site URL</Label>
              <div className="relative">
                <Rss size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <Input 
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://yourname.substack.com/feed"
                  className="!bg-white !text-[#040042] border-slate-200 h-12 pl-10 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                  style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                />
              </div>
              <p className="text-xs text-slate-500">
                We'll fetch and license all articles from this feed
              </p>
            </div>

            {/* URL Preview Card with Fetching State */}
            {feedPreview && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  {detectedPlatform ? (
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2">
                      <img src={detectedPlatform.logo} alt={detectedPlatform.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                      <Globe size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {feedPreview.isLoading ? (
                        <>
                          <p className="text-sm font-semibold text-[#040042] truncate">
                            {detectedPlatform ? `${detectedPlatform.name} Publication` : "Publication"}
                          </p>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#4A26ED]/10 text-[#4A26ED]">
                            <Loader2 size={10} className="animate-spin" />
                            <span className="text-[10px] font-medium">Validating...</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-[#040042] truncate">
                          {feedPreview.title}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {feedPreview.isLoading ? feedUrl : feedPreview.description}
                    </p>
                  </div>
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-[#040042] to-[#4A26ED] flex items-center justify-center flex-shrink-0 p-2 ${feedPreview.isLoading ? 'animate-pulse' : ''}`}>
                    <img src={opeddLogo} alt="Opedd" className="w-full h-full object-contain" />
                  </div>
                </div>
                {!feedPreview.isLoading && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                    <CheckCircle size={12} className="text-emerald-500" />
                    <span className="text-xs text-slate-600">Feed detected • Ready to sync articles</span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#4A26ED]" />
                <span className="text-sm font-semibold text-[#040042]">Global License Fees</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">Human Republication *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium z-10">$</span>
                    <Input 
                      type="number"
                      value={pubHumanPrice}
                      onChange={(e) => setPubHumanPrice(e.target.value)}
                      placeholder="4.99"
                      className="!bg-white !text-[#040042] border-slate-200 h-11 pl-7 focus:border-[#4A26ED]"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Per article license</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">AI Ingestion <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium z-10">$</span>
                    <Input 
                      type="number"
                      value={pubAiPrice}
                      onChange={(e) => setPubAiPrice(e.target.value)}
                      placeholder="49.99"
                      className="!bg-white !text-[#040042] border-slate-200 h-11 pl-7 focus:border-[#4A26ED]"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
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
              disabled={isSubmitting || isConnecting || !feedUrl.trim()}
              className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Connecting...
                </>
              ) : feedPreview?.isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Validating URL...
                </>
              ) : (
                <>
                  <Shield size={18} className="mr-2" />
                  Connect & License Archive
                </>
              )}
            </Button>
          </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // SYNCING VIEW
  if (view === "syncing") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
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
                      <span className="text-xs text-emerald-600 font-medium">Licensed</span>
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

  // PUBLICATION SUCCESS VIEW (with verification code)
  if (view === "pub-success") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-[#040042] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={opeddLogo} alt="Opedd" className="h-8" />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight">Publication Linked!</h1>
                  <p className="text-emerald-400 text-sm">One more step to finalize protection</p>
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

          {/* Verification Content */}
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield size={32} className="text-amber-600" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-[#040042] mb-2">Pending Verification</h3>
              <p className="text-sm text-slate-600">
                To finalize licensing, please add the verification token below to your publication bio or site header.
              </p>
            </div>

            {/* Verification Token Box */}
            <div className="bg-[#F2F9FF] border-2 border-[#4A26ED]/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Verification Token</p>
                  <p className="text-2xl font-mono font-bold text-[#4A26ED] tracking-wider">{verificationToken || verificationCode}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCopy(verificationToken || verificationCode, "verification")}
                  className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white border-none"
                >
                  {copiedVerification ? (
                    <>
                      <Check size={14} className="mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <strong>Where to add it:</strong> Add <code className="bg-amber-100 px-1 rounded">{verificationToken || verificationCode}</code> to your Substack bio, Ghost site description, or your website's header/footer.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold shadow-lg shadow-[#4A26ED]/25"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // SINGLE WORK VIEW
  if (view === "single") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Light Header */}
          <div className="bg-white border-b border-[#E8F2FB] px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                  <Upload size={24} className="text-teal-600" />
                </div>
                <div>
                  <h1 className="text-[#040042] font-bold text-lg leading-tight">Register Single Work</h1>
                  <p className="text-[#040042]/60 text-sm">License an article, PDF, or text</p>
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
                className="!bg-white !text-[#040042] border-slate-200 h-12 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#040042]">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of your work..."
                rows={3}
                className="!bg-white !text-[#040042] border-slate-200 resize-none focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              />
            </div>

            {/* Input Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-bold text-[#040042]">Content Source</Label>
                <span className="text-xs text-slate-400">(choose one)</span>
              </div>
              
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "url")} className="w-full">
                <TabsList className="w-full bg-slate-100 p-1 rounded-xl h-10">
                  <TabsTrigger 
                    value="file" 
                    className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
                  >
                    <Upload size={14} className="mr-2" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger 
                    value="url" 
                    className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
                  >
                    <Link2 size={14} className="mr-2" />
                    Article URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-3">
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
                </TabsContent>

                <TabsContent value="url" className="mt-3">
                  <div className="space-y-2">
                    <div className="relative">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <Input 
                        value={articleUrl}
                        onChange={(e) => setArticleUrl(e.target.value)}
                        placeholder="https://example.com/your-article"
                        className="!bg-white !text-[#040042] border-slate-200 h-12 pl-10 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 placeholder:text-slate-400"
                        style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Link to your published article, blog post, or research paper
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#4A26ED]" />
                <span className="text-sm font-semibold text-[#040042]">License Fees</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">Human Republication *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium z-10">$</span>
                    <Input 
                      type="number"
                      value={humanPrice}
                      onChange={(e) => setHumanPrice(e.target.value)}
                      placeholder="4.99"
                      className="!bg-white !text-[#040042] border-slate-200 h-11 pl-7 focus:border-[#4A26ED]"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#040042]">AI Ingestion <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium z-10">$</span>
                    <Input 
                      type="number"
                      value={aiPrice}
                      onChange={(e) => setAiPrice(e.target.value)}
                      placeholder="49.99"
                      className="!bg-white !text-[#040042] border-slate-200 h-11 pl-7 focus:border-[#4A26ED]"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
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
                  Mint & License
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // SUCCESS VIEW (for single work)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="bg-slate-50 border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
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
