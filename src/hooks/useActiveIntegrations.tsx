import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RssSource {
  id: string;
  name: string;
  platform: string | null;
  feed_url: string;
  sync_status: string | null;
}

interface ActiveIntegrationsContextType {
  activeIntegrations: RssSource[];
  hasActiveIntegrations: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const ActiveIntegrationsContext = createContext<ActiveIntegrationsContextType | undefined>(undefined);

export function ActiveIntegrationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeIntegrations, setActiveIntegrations] = useState<RssSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIntegrations = async () => {
    if (!user) {
      setActiveIntegrations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("rss_sources")
        .select("*")
        .eq("user_id", user.id)
        .eq("sync_status", "active");

      if (error) throw error;
      setActiveIntegrations(data || []);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      setActiveIntegrations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [user]);

  return (
    <ActiveIntegrationsContext.Provider
      value={{
        activeIntegrations,
        hasActiveIntegrations: activeIntegrations.length > 0,
        isLoading,
        refetch: fetchIntegrations,
      }}
    >
      {children}
    </ActiveIntegrationsContext.Provider>
  );
}

export function useActiveIntegrations() {
  const context = useContext(ActiveIntegrationsContext);
  if (context === undefined) {
    throw new Error("useActiveIntegrations must be used within an ActiveIntegrationsProvider");
  }
  return context;
}
