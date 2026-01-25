import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContentSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: "substack" | "ghost" | "rss";
  platformName: string;
}

export function ContentSourceModal({
  open,
  onOpenChange,
  platform,
  platformName,
}: ContentSourceModalProps) {
  const [feedUrl, setFeedUrl] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!feedUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid feed URL",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke("sync-content-source", {
        body: {
          feedUrl: feedUrl.trim(),
          platform,
          name: `${platformName} Feed`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Sync Complete",
        description: data.message || `Successfully imported content from ${platformName}`,
      });

      setFeedUrl("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync content source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getPlaceholder = () => {
    switch (platform) {
      case "substack":
        return "https://yourpublication.substack.com/feed";
      case "ghost":
        return "https://yourblog.ghost.io/rss/";
      case "rss":
        return "https://example.com/feed.xml";
      default:
        return "Enter feed URL";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        style={{ 
          backgroundColor: "#F2F9FF", 
          borderRadius: "12px",
          border: "1px solid #E8F2FB"
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#040042] text-lg font-semibold">
            Connect {platformName}
          </DialogTitle>
          <DialogDescription className="text-[#040042]/60 text-sm">
            Enter your {platformName} feed URL to import your archive automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedUrl" className="text-[#040042] text-sm font-medium">
              Feed URL
            </Label>
            <Input
              id="feedUrl"
              type="url"
              placeholder={getPlaceholder()}
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="h-11 rounded-xl border-[#E8F2FB] bg-white text-[#040042] placeholder:text-[#040042]/40 focus:border-[#4A26ED] focus:ring-[#4A26ED]"
              disabled={isSyncing}
            />
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing || !feedUrl.trim()}
            className="w-full h-11 rounded-xl bg-[#040042] text-white font-semibold text-sm hover:bg-[#040042]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Syncing Archive...
              </>
            ) : (
              "Sync & Import Archive"
            )}
          </button>

          <p className="text-xs text-[#040042]/50 text-center">
            We'll import all existing articles and set up automatic syncing for new content.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
