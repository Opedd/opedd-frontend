import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API } from '@/lib/api';

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

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    const storedPublisher = localStorage.getItem('publisher');
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedPublisher) {
        setPublisher(JSON.parse(storedPublisher));
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    console.log('[Auth] Login response received:', JSON.stringify(result));

    if (!result.success) {
      throw new Error(result.error?.message || 'Login failed');
    }

    // Extract user with priority: result.data?.user || result.data?.publisher || result.user || result.publisher
    const extractedUser = result.data?.user || result.user;
    const extractedPublisher = result.data?.publisher || result.publisher;
    const token = result.data?.accessToken || result.accessToken;

    console.log('[Auth] Setting user:', extractedUser);

    setUser(extractedUser);
    setPublisher(extractedPublisher);
    setAccessToken(token);

    // Persist to localStorage
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(extractedUser));
    if (extractedPublisher) {
      localStorage.setItem('publisher', JSON.stringify(extractedPublisher));
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await fetch(API.proxy('auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Signup failed');
    }

    // Auto-login after signup
    await login(email, password);
  };

  const logout = async () => {
    if (accessToken) {
      try {
        await fetch(API.logout, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    setUser(null);
    setPublisher(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('publisher');
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
