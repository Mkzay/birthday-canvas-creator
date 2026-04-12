import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  planTier: 'free' | 'pro';
  emailVerifiedAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  defaultTheme: string;
  defaultAllowPhotos: boolean;
  defaultAllowAudio: boolean;
  defaultRequireNames: boolean;
  emailNotifications: boolean;
  newMessageNotifications: boolean;
  birthdayReminders: boolean;
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
  email_notifications: boolean;
  new_message_notifications: boolean;
  birthday_reminders: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{
    error: Error | null;
    session: null;
    requiresVerification: boolean;
    message: string | null;
  }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null; code: string | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

declare global {
  interface Window {
    __wishcanvasAuthContext?: Context<AuthContextType | undefined>;
  }
}

const AuthContext =
  window.__wishcanvasAuthContext || createContext<AuthContextType | undefined>(undefined);

window.__wishcanvasAuthContext = AuthContext;

function mapProfile(user: AuthUser | null): Profile | null {
  if (!user) return null;

  return {
    id: user.id,
    user_id: user.id,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    default_theme: user.defaultTheme,
    default_allow_photos: user.defaultAllowPhotos,
    default_allow_audio: user.defaultAllowAudio,
    default_require_names: user.defaultRequireNames,
    email_notifications: user.emailNotifications,
    new_message_notifications: user.newMessageNotifications,
    birthday_reminders: user.birthdayReminders,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
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
      const data = await apiFetch<{ requiresVerification?: boolean; message?: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      return {
        error: null,
        session: null,
        requiresVerification: Boolean(data.requiresVerification),
        message: data.message || null,
      };
    } catch (error) {
      return { error: error as Error, session: null, requiresVerification: false, message: null };
    }
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      setUser(data.user);
      return { error: null, code: null };
    } catch (error) {
      const err = error as Error & { code?: string };
      return { error: err, code: err.code || null };
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
