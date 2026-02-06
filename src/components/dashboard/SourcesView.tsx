import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Rss, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  ExternalLink,
  CheckCircle,
  Clock,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Platform logos
import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.png";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.png";
import mediumLogo from "@/assets/platforms/medium.svg";

interface Source {
  id: string;
  name: string;
  feed_url: string;
  platform: string | null;
  sync_status: string | null;
  article_count: number | null;
  last_synced_at: string | null;
  created_at: string | null;
}

const platformLogos: Record<string, string> = {
  substack: substackLogo,
  ghost: ghostLogo,
  wordpress: wordpressLogo,
  beehiiv: beehiivLogo,
  medium: mediumLogo,
};

interface SourcesViewProps {
  onAddSource: () => void;
}

export function SourcesView({ onAddSource }: SourcesViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contentSources } = useAuthenticatedApi();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchSources = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("rss_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (err) {
      console.error("Error fetching sources:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [user]);

  const handleResync = async (source: Source) => {
    setSyncingId(source.id);
    try {
      await contentSources.sync(source.id);
      toast({
        title: "Sync Triggered",
        description: `Re-syncing ${source.name}...`,
      });
      // Refresh after delay
      setTimeout(fetchSources, 2000);
    } catch (err) {
      console.error("Resync error:", err);
      toast({
        title: "Sync Failed",
        description: "Could not re-sync this source.",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (source: Source) => {
    try {
      await supabase
        .from("rss_sources")
        .delete()
        .eq("id", source.id)
        .eq("user_id", user!.id);

      setSources(prev => prev.filter(s => s.id !== source.id));
      toast({
        title: "Source Removed",
        description: `${source.name} has been disconnected.`,
      });
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Delete Failed",
        description: "Could not remove this source.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#4A26ED]" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8F2FB] p-12 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#4A26ED]/10 flex items-center justify-center">
          <Rss size={28} className="text-[#4A26ED]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#040042]">No Content Sources</h3>
          <p className="text-sm text-[#040042]/60 mt-1 max-w-sm mx-auto">
            Register a feed or sitemap to start syncing articles into your library automatically.
          </p>
        </div>
        <Button
          onClick={onAddSource}
          className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white"
        >
          <Plus size={16} className="mr-2" />
          Add Your First Source
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => {
          const logo = platformLogos[source.platform || ""] || null;
          const isActive = source.sync_status === "active";
          const isSyncing = syncingId === source.id;

          return (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Platform Icon */}
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 flex-shrink-0">
                  {logo ? (
                    <img src={logo} alt={source.platform || ""} className="w-full h-full object-contain" />
                  ) : (
                    <Globe size={20} className="text-slate-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#040042] text-sm truncate">{source.name}</h3>
                    {isActive ? (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 flex-shrink-0">
                        <CheckCircle size={8} />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-200 gap-1 flex-shrink-0">
                        <Clock size={8} />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#040042]/50 truncate">{source.feed_url}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#040042]/40">
                    <span>{source.article_count || 0} articles</span>
                    {source.last_synced_at && (
                      <span>Last sync: {new Date(source.last_synced_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E8F2FB]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResync(source)}
                        disabled={isSyncing}
                        className="h-8 text-xs gap-1.5"
                      >
                        {isSyncing ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        Re-sync
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fetch new articles from this source</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {source.feed_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 text-xs gap-1.5 text-[#040042]/60"
                  >
                    <a href={source.feed_url.startsWith("http") ? source.feed_url : `https://${source.feed_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={12} />
                      Visit
                    </a>
                  </Button>
                )}

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(source)}
                  className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 size={12} />
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
