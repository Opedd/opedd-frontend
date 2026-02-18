import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check active sessions on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Listen for auth changes (login/logout/token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Check for pending invite token after sign-in
      if (_event === "SIGNED_IN" && session?.access_token) {
        const pendingToken = localStorage.getItem("pending_invite_token");
        if (pendingToken) {
          localStorage.removeItem("pending_invite_token");
          fetch(`${EXT_SUPABASE_URL}/functions/v1/accept-invite`, {
            method: "POST",
            headers: {
              apikey: EXT_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: pendingToken }),
          })
            .then((res) => res.json())
            .then((result) => {
              if (result.success && result.data?.joined) {
                console.log("[AuthContext] Auto-accepted team invite for", result.data.publisher_name);
              }
            })
            .catch((err) => {
              console.warn("[AuthContext] Failed to auto-accept invite:", err);
            });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Computed access token from current session
  const accessToken = session?.access_token ?? null;

  // Async getter that refreshes the session if needed
  const getAccessToken = async (): Promise<string | null> => {
    // First try the current session
    if (session?.access_token) {
      // Check if token is still valid (has more than 60 seconds left)
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt > Math.floor(Date.now() / 1000) + 60) {
        return session.access_token;
      }
    }

    // Refresh session to get a fresh token
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("[AuthContext] Failed to refresh session:", error);
      return null;
    }

    if (freshSession) {
      setSession(freshSession);
      setUser(freshSession.user);
      return freshSession.access_token;
    }

    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      accessToken, 
      isLoading, 
      logout, 
      getAccessToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
