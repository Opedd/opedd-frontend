import React, { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldCheck, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Spinner } from "@/components/ui/Spinner";

export interface PendingSource {
  id: string;
  name: string;
  url: string;
  verification_status: string;
  sync_status: string;
}

interface PublicationGateProps {
  /** Whether the publisher has at least one verified source */
  isVerified: boolean;
  /** Unverified sources (from publisher-profile pending_sources) */
  pendingSources: PendingSource[];
  /** Called after a pending source is deleted so parent can refetch */
  onSourceDeleted?: () => void;
  /** Admin flag — bypasses gate entirely */
  isAdmin?: boolean;
  /**
   * bannerOnly: just show the banner, render children normally (no blur).
   * Use this inside Settings where individual tabs control their own gating.
   */
  bannerOnly?: boolean;
  /** Whether the publisher has any articles — used to detect orphaned state */
  hasContent?: boolean;
  /** The content to render when gate is open */
  children: React.ReactNode;
}

export function PublicationGate({
  isVerified,
  pendingSources,
  onSourceDeleted,
  isAdmin = false,
  bannerOnly = false,
  hasContent = false,
  children,
}: PublicationGateProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAccessToken } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Admin bypass
  if (isAdmin) return <>{children}</>;

  // Verified — render normally
  if (isVerified) return <>{children}</>;

  const hasPending = pendingSources.length > 0;

  const handleDelete = async (source: PendingSource) => {
    setDeletingId(source.id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete_pending_source", source_id: source.id }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || "Failed to delete");
      toast({ title: "Publication removed", description: `${source.name} has been removed.` });
      onSourceDeleted?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err?.message || "Could not remove publication. Try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-0">
      {/* Gate banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              {hasPending ? (
                <>
                  <p className="text-sm font-semibold text-amber-900">Publication pending verification</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Verify ownership of your publication to unlock pricing, API access, and the widget.
                  </p>
                  <div className="mt-2 space-y-1">
                    {pendingSources.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {s.name}
                        </span>
                        <span className="text-xs text-amber-600 capitalize">{s.verification_status}</span>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 ml-1"
                        >
                          {deletingId === s.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 size={11} />
                          )}
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : hasContent ? (
                <>
                  <p className="text-sm font-semibold text-amber-900">Publication source removed</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your articles are still here, but you need to reconnect and verify a publication source to unlock pricing and the widget.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-900">No publication connected</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Add and verify a publication to unlock pricing, API access, and the widget.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hasPending ? (
              <Button
                size="sm"
                onClick={() => navigate("/settings?tab=profile")}
                className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
              >
                <ShieldCheck size={13} className="mr-1.5" />
                Verify Now
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/distribution")}
                className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
              >
                <Plus size={13} className="mr-1.5" />
                Add Publication
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content — blurred if full-page gate, normal if bannerOnly */}
      {bannerOnly ? (
        <>{children}</>
      ) : (
        <div className="pointer-events-none select-none opacity-40">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Drop-in replacement for a locked tab's content in Settings.
 * Shows a small inline notice instead of the real content.
 */
export function LockedTabContent({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
        <AlertTriangle size={18} className="text-amber-500" />
      </div>
      <p className="text-sm font-semibold text-gray-900">Verify your publication first</p>
      <p className="text-xs text-gray-500 max-w-xs">
        You need a verified publication to access this feature.
        Go to your Profile tab to complete verification.
      </p>
      <button
        onClick={() => navigate("/settings?tab=profile")}
        className="mt-1 text-xs font-semibold text-oxford hover:underline"
      >
        Go to Profile →
      </button>
    </div>
  );
}
