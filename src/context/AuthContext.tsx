import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  planTier: 'free' | 'pro';
  isPro?: boolean;
  is_pro?: boolean;
  plan?: 'free' | 'pro';
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

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  planTier: 'free' | 'pro';
  plan: 'free' | 'pro';
  is_pro: boolean;
  isPro: boolean;
  default_theme: string;
  default_allow_photos: boolean;
  default_allow_audio: boolean;
  default_require_names: boolean;
  email_notifications: boolean;
  new_message_notifications: boolean;
  birthday_reminders: boolean;
}

export type User = AuthUser;
export type UserProfile = Profile;

export interface AuthContextType {
  user: AuthUser | null;
  session: null;
  profile: Profile | null;
  isPro: boolean;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, claimToken?: string, publicCode?: string) => Promise<{
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

function normalizeAuthUser(user: AuthUser | null): AuthUser | null {
  if (!user) return null;
  const isPro = user.planTier === 'pro' || Boolean(user.isPro || user.is_pro || (user as { plan?: string }).plan === 'pro');
  return {
    ...user,
    planTier: isPro ? 'pro' : 'free',
    isPro,
    is_pro: isPro,
    plan: isPro ? 'pro' : 'free',
  };
}

function mapProfile(user: AuthUser | null): Profile | null {
  if (!user) return null;
  const isPro = user.planTier === 'pro' || Boolean(user.isPro || user.is_pro || (user as { plan?: string }).plan === 'pro');

  return {
    id: user.id,
    user_id: user.id,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    planTier: isPro ? 'pro' : 'free',
    plan: isPro ? 'pro' : 'free',
    is_pro: isPro,
    isPro,
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
      setUser(normalizeAuthUser(data.user));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, claimToken?: string, publicCode?: string) => {
    try {
      const data = await apiFetch<{ requiresVerification?: boolean; message?: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName, claimToken, publicCode }),
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
      setUser(normalizeAuthUser(data.user));
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

  const isPro = Boolean(user?.planTier === 'pro' || user?.isPro || user?.is_pro);

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        profile: mapProfile(user),
        isPro,
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
