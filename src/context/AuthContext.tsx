import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  defaultTheme: string;
  defaultAllowPhotos: boolean;
  defaultAllowAudio: boolean;
  defaultRequireNames: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  default_theme: string;
  default_allow_photos: boolean;
  default_allow_audio: boolean;
  default_require_names: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; session: null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfile(user: AuthUser | null): Profile | null {
  if (!user) return null;

  return {
    id: user.id,
    user_id: user.id,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    defaultTheme: user.defaultTheme,
    defaultAllowPhotos: user.defaultAllowPhotos,
    defaultAllowAudio: user.defaultAllowAudio,
    defaultRequireNames: user.defaultRequireNames,
    };
    }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const data = await apiFetch<{ user: AuthUser | null }>('/auth/session');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      setUser(data.user);
      return { error: null, session: null };
    } catch (error) {
      return { error: error as Error, session: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        profile: mapProfile(user),
        loading,
        signUp,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
