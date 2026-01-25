import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Publisher {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  publisher: Publisher | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch publisher data for a user
  const fetchPublisher = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('publishers')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('[Auth] No publisher found for user:', userId);
        return null;
      }

      console.log('[Auth] Publisher found:', data);
      return data as Publisher;
    } catch (err) {
      console.error('[Auth] Error fetching publisher:', err);
      return null;
    }
  };

  // Handle session changes
  const handleSession = async (session: Session | null) => {
    if (session?.user) {
      const supabaseUser = session.user;
      const mappedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name,
      };

      setUser(mappedUser);
      setAccessToken(session.access_token);

      // Fetch publisher data
      const publisherData = await fetchPublisher(supabaseUser.id);
      setPublisher(publisherData);

      console.log('[Auth] Session active for:', mappedUser.email);
    } else {
      setUser(null);
      setPublisher(null);
      setAccessToken(null);
      console.log('[Auth] No active session');
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] Auth state changed:', _event);
        await handleSession(session);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[Auth] Attempting login for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Login error:', error.message);
      throw new Error(error.message);
    }

    console.log('[Auth] Login successful for:', data.user?.email);
  };

  const signup = async (email: string, password: string, name: string) => {
    console.log('[Auth] Attempting signup for:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      console.error('[Auth] Signup error:', error.message);
      throw new Error(error.message);
    }

    console.log('[Auth] Signup successful for:', data.user?.email);
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Logout error:', error.message);
      throw new Error(error.message);
    }

    console.log('[Auth] Logout successful');
  };

  return (
    <AuthContext.Provider value={{ user, publisher, accessToken, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
