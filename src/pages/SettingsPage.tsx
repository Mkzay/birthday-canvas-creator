import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  User,
  Bell,
  Settings,
  Shield,
  Loader2,
  Save,
  Trash2,
  KeyRound,
  Mail,
  Camera,
  Crown,
  Sparkles,
  ArrowLeft,
  CalendarDays,
  MessageSquare,
  Music,
  Check,
  Palette,
  ExternalLink,
  Gift,
} from 'lucide-react';
import { BrandMenuIcon } from '@/components/BrandIcons';
import { toast } from 'sonner';
import { apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { themeOptions } from '@/pages/settings';
import { builtInThemeMap } from '@/lib/themes';
import type { BirthdayPage } from '@/pages/dashboardPage/types';
import { DashboardSidebar } from '@/pages/dashboardPage';

type SettingsTab = 'profile' | 'canvas' | 'notifications' | 'security';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, isPro, signOut, refreshSession, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // App Shell Navigation & Sidebar state synced with Dashboard
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wishcanvas_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wishcanvas_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Creator statistics
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newMessageNotifications, setNewMessageNotifications] = useState(true);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  
  // Default page settings
  const [defaultTheme, setDefaultTheme] = useState('elegant');
  const [defaultAllowPhotos, setDefaultAllowPhotos] = useState(true);
  const [defaultAllowAudio, setDefaultAllowAudio] = useState(true);
  const [defaultRequireNames, setDefaultRequireNames] = useState(true);
  
  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isProUser = isPro;
  const currentDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';
  const initial = currentDisplayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setDefaultTheme(profile.default_theme || 'elegant');
      setDefaultAllowPhotos(profile.default_allow_photos ?? true);
      setDefaultAllowAudio(profile.default_allow_audio ?? true);
      setDefaultRequireNames(profile.default_require_names ?? true);
      setEmailNotifications(profile.email_notifications ?? true);
      setNewMessageNotifications(profile.new_message_notifications ?? true);
      setBirthdayReminders(profile.birthday_reminders ?? true);
    }
  }, [profile]);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      try {
        const data = await apiFetch<BirthdayPage[]>('/pages');
        setPages(data || []);
      } catch (error) {
        console.error('Failed to load creator stats', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchUserStats();
  }, [user]);

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSavingProfile(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          avatarUrl,
        }),
      });
      await refreshSession();
      toast.success('Creator profile saved');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setSavingNotifications(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          emailNotifications,
          newMessageNotifications,
          birthdayReminders,
        }),
      });
      await refreshSession();
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to update notification settings');
      console.error(error);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    
    setSavingPreferences(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultTheme,
          defaultAllowPhotos,
          defaultAllowAudio,
          defaultRequireNames,
        }),
      });
      await refreshSession();
      toast.success('Default canvas settings saved');
    } catch (error) {
      toast.error('Failed to update preferences');
      console.error(error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Avatar image must be under 3MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiForm<{ avatarUrl?: string; avatar_url?: string; success: boolean }>('/auth/avatar', formData);

      const uploadedUrl = response.avatarUrl || response.avatar_url || '';
      if (!uploadedUrl) {
        throw new Error('Avatar URL was not returned by server');
      }

      setAvatarUrl(uploadedUrl);
      await refreshSession();
      toast.success('Avatar updated');
    } catch (error) {
      toast.error('Failed to upload avatar');
      console.error(error);
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch<void>('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      await signOut();
      toast.success('Password changed. Please sign in again.');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      toast.error(message);
      console.error(error);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteWorkspaceData = async () => {
    if (!user) return;
    
    setDeleting(true);
    try {
      await apiFetch<void>('/auth/me/data', {
        method: 'DELETE',
      });
      await signOut();
      toast.success('Your account and celebration data were deleted');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to delete account data');
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return <WishCanvasLoader />;
  }

  const avatarSrc = resolveAssetUrl(avatarUrl);
  const selectedThemeObj = themeOptions.find((t) => t.value === defaultTheme) || themeOptions[0];

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 flex overflow-hidden">
      {/* Background Celebratory Glows identical to Dashboard */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-amber-200/35 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-rose-200/30 to-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[360px] w-[360px] rounded-full bg-amber-100/30 blur-3xl" />

      {/* 1. PERSISTENT STUDIO APP SHELL SIDEBAR (Desktop) */}
      <DashboardSidebar
        user={user}
        profile={profile}
        activePagesCount={activePages}
        deliveredPagesCount={deliveredPages}
        totalPagesCount={totalPages}
        isProUser={isProUser}
        onSignOut={signOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* MOBILE SIDEBAR DRAWER (When on phone / tablet) */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" hideDefaultClose className="p-0 w-80 bg-[#FAF7F2] text-slate-900 border-r border-stone-200">
          <DashboardSidebar
            isMobileDrawer
            user={user}
            profile={profile}
            activePagesCount={activePages}
            deliveredPagesCount={deliveredPages}
            totalPagesCount={totalPages}
            isProUser={isProUser}
            onSignOut={() => {
              setIsMobileSidebarOpen(false);
              signOut();
            }}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 2. MAIN STUDIO WORKBENCH (Fluid flex container identical to Dashboard) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Command Bar */}
        <header className="bg-white/85 backdrop-blur-md border-b border-stone-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Custom On-Brand Menu Button on Mobile/Tablet */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors shadow-xs active:scale-95"
              aria-label="Open sidebar menu"
              title="Open menu"
            >
              <BrandMenuIcon className="h-4 w-4 text-stone-700" />
            </button>

            {/* Studio Context Title */}
            <div className="flex items-center gap-2 pl-1">
              <Link
                to="/dashboard"
                className="font-serif font-bold text-slate-950 text-sm sm:text-base tracking-tight hover:text-amber-800 transition-colors"
              >
                Celebration Atelier
              </Link>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-stone-300" />
              <span className="hidden sm:inline-block text-[11px] text-stone-500 font-medium">
                Profile &amp; Settings
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="hidden sm:flex items-center gap-4 border-r border-stone-200 pr-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Live
                </span>
                <p className="font-serif font-bold text-emerald-800 text-sm">
                  {activePages} Collecting
                </p>
              </div>
              <div className="w-px h-6 bg-stone-200" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Wishes
                </span>
                <p className="font-serif font-bold text-slate-950 text-sm">
                  {totalWishes} Pinned
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={currentDisplayName}
                  className="h-8 w-8 rounded-full object-cover border border-stone-300"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {initial}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workbench Body */}
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-7 max-w-7xl w-full mx-auto">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Creator Profile <span className="italic text-rose-500">&amp; Settings</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">personal atelier</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
                Configure your creator signature, celebration defaults, notification triggers, and security.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-2xl border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
                  Return to Timeline
                </Button>
              </Link>
              <Link to="/create">
                <Button
                  size="sm"
                  className="btn-press gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="h-4 w-4 text-amber-100" />
                  Craft Canvas
                </Button>
              </Link>
            </div>
          </div>

          {/* 2-Column Artisan Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: THE CREATOR PASSPORT & ATELIER IDENTITY (4 Cols on LG) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              
              {/* Creator Identity Passport Card */}
              <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 shadow-card text-center">
                {/* Decorative top tape */}
                <div className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-xs bg-amber-200/80 rotate-[-1deg] shadow-xs" />
                
                <div className="relative mx-auto mt-2 mb-4 w-fit">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={currentDisplayName}
                      className={`h-24 w-24 rounded-full object-cover shadow-sm ${
                        isProUser ? 'ring-4 ring-amber-400/80 ring-offset-4 ring-offset-white' : 'border-2 border-stone-200'
                      }`}
                    />
                  ) : (
                    <div
                      className={`h-24 w-24 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-serif text-3xl font-bold flex items-center justify-center shadow-sm ${
                        isProUser ? 'ring-4 ring-amber-400/80 ring-offset-4 ring-offset-white' : ''
                      }`}
                    >
                      {initial}
                    </div>
                  )}

                  {/* Upload overlay button */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-105"
                    title="Upload portrait photo"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </label>
                  <input
                    ref={avatarInputRef}
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                    disabled={uploadingAvatar}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <h2 className="font-serif text-xl font-bold text-slate-950">
                      {displayName || 'Celebration Creator'}
                    </h2>
                    {isProUser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Crown className="h-3 w-3 text-amber-600 fill-amber-500" />
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 truncate max-w-[240px] mx-auto">
                    {user?.email}
                  </p>
                </div>

                {/* Real-time celebration metrics */}
                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-stone-100 pt-5 text-center">
                  <div className="rounded-xl bg-stone-50/70 p-2.5">
                    <p className="font-serif font-bold text-lg text-slate-900">
                      {loadingStats ? '-' : totalPages}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Canvases
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50/70 p-2.5">
                    <p className="font-serif font-bold text-lg text-amber-800">
                      {loadingStats ? '-' : totalWishes}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Wishes
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50/70 p-2.5">
                    <p className="font-serif font-bold text-lg text-emerald-800">
                      {loadingStats ? '-' : activePages}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Active
                    </p>
                  </div>
                </div>

                {/* Atelier Tier Card */}
                <div className="mt-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 p-3.5 text-left flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Current Atelier Tier
                    </span>
                    <p className="text-xs font-bold text-slate-900">
                      {isProUser ? 'Pro Atelier Member' : 'Free Creator Studio'}
                    </p>
                  </div>
                  <Link to="/billing">
                    <Button size="sm" variant="outline" className="rounded-xl border-amber-300 bg-white text-[11px] font-bold text-amber-900 hover:bg-amber-100/60 shadow-xs h-8 px-2.5">
                      {isProUser ? 'Perks' : 'Upgrade'}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Navigation Tab Switcher */}
              <div className="rounded-3xl border border-stone-200/90 bg-white p-2 shadow-xs space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-amber-500" />
                    <span>Creator Signature &amp; Identity</span>
                  </span>
                  {activeTab === 'profile' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('canvas')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'canvas'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Palette className="h-4 w-4 text-amber-500" />
                    <span>Default Canvas Presets</span>
                  </span>
                  {activeTab === 'canvas' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'notifications'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span>Celebration Alerts &amp; Triggers</span>
                  </span>
                  {activeTab === 'notifications' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'security'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="h-4 w-4 text-amber-500" />
                    <span>Security &amp; Account Control</span>
                  </span>
                  {activeTab === 'security' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: INTERACTIVE WORKBENCH PANELS (8 Cols on LG) */}
            <div className="lg:col-span-8">
              
              {/* TAB 1: CREATOR IDENTITY & SIGNATURE */}
              {activeTab === 'profile' && (
                <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card space-y-8">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />
                  
                  <div className="border-b border-stone-100 pb-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Creator Atelier
                    </span>
                    <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-1">
                      Creator Signature &amp; Identity
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      This signature introduces your invites and shows guests who curated the celebration.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-xs font-bold text-slate-900">
                        Artist / Creator Display Name
                      </Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Chi, Uncle Tunde, Ayomikun"
                        className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 text-xs sm:text-sm font-medium"
                      />
                      <p className="text-[11px] text-stone-400">
                        Appears on public invite headers and gift links.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold text-slate-900">
                        Account Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <Input
                          id="email"
                          value={user?.email || ''}
                          disabled
                          className="pl-10 rounded-xl border-stone-200 bg-stone-100/70 text-stone-500 text-xs sm:text-sm cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Email cannot be changed directly. Contact support if you need an email transfer.
                      </p>
                    </div>

                    {/* Live Signature Preview Card */}
                    <div className="rounded-2xl border border-stone-200/80 bg-[#FAF7F2] p-4 sm:p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Live Contributor Invite Preview
                        </span>
                        <span className="text-[11px] text-amber-800 font-serif italic">
                          previewing signature
                        </span>
                      </div>
                      <div className="rounded-xl bg-white border border-stone-200/60 p-4 shadow-2xs flex items-center gap-3">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt="preview"
                            className="h-10 w-10 rounded-full object-cover border border-stone-200 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {initial}
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-stone-500">
                            Invited to celebrate with warmth by
                          </p>
                          <p className="font-serif font-bold text-slate-950 text-sm">
                            {displayName || 'Your Display Name'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="btn-press rounded-2xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-card hover:bg-slate-900 active:scale-[0.98] gap-2"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                          <span>Saving Signature...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 text-amber-400" />
                          <span>Save Creator Signature</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: DEFAULT CANVAS PRESETS */}
              {activeTab === 'canvas' && (
                <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card space-y-8">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-rose-500/10 blur-2xl" />

                  <div className="border-b border-stone-100 pb-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Creative Defaults
                    </span>
                    <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-1">
                      Canvas Presets &amp; Defaults
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      Pre-configure default themes and collection rules applied when crafting new canvases.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Theme Swatch Selector */}
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-900">
                        Default Visual Theme
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {themeOptions.map((opt) => {
                          const isSelected = defaultTheme === opt.value;
                          const themeMeta = builtInThemeMap[opt.value as keyof typeof builtInThemeMap];
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDefaultTheme(opt.value)}
                              className={`group text-left p-3.5 rounded-2xl border transition-all relative ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-400/20'
                                  : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{themeMeta?.emoji || '🎨'}</span>
                                  <span className="font-serif font-bold text-sm text-slate-950">
                                    {themeMeta?.name || opt.label}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 leading-relaxed">
                                {themeMeta?.description || opt.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="allow-photos" className="text-xs font-bold text-slate-900 cursor-pointer">
                            Allow Photo Attachments by Default
                          </Label>
                          <p className="text-[11px] text-stone-500">
                            Permit friends and family to attach nostalgic photos alongside their written wishes.
                          </p>
                        </div>
                        <Switch
                          id="allow-photos"
                          checked={defaultAllowPhotos}
                          onCheckedChange={setDefaultAllowPhotos}
                        />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="allow-audio" className="text-xs font-bold text-slate-900 cursor-pointer">
                            Allow Audio Voice Notes by Default
                          </Label>
                          <p className="text-[11px] text-stone-500">
                            Let contributors record voice messages directly from their phones.
                          </p>
                        </div>
                        <Switch
                          id="allow-audio"
                          checked={defaultAllowAudio}
                          onCheckedChange={setDefaultAllowAudio}
                        />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="require-names" className="text-xs font-bold text-slate-900 cursor-pointer">
                            Require Contributor Name
                          </Label>
                          <p className="text-[11px] text-stone-500">
                            Ensure every wish displays the contributor identity instead of anonymous notes.
                          </p>
                        </div>
                        <Switch
                          id="require-names"
                          checked={defaultRequireNames}
                          onCheckedChange={setDefaultRequireNames}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={handleSavePreferences}
                      disabled={savingPreferences}
                      className="btn-press rounded-2xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-card hover:bg-slate-900 active:scale-[0.98] gap-2"
                    >
                      {savingPreferences ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                          <span>Saving Defaults...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 text-amber-400" />
                          <span>Save Canvas Presets</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: CELEBRATION ALERTS & TRIGGERS */}
              {activeTab === 'notifications' && (
                <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card space-y-8">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

                  <div className="border-b border-stone-100 pb-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Celebration Pulse
                    </span>
                    <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-1">
                      Notification Triggers &amp; Alerts
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      Choose when and how WishCanvas alerts you as wishes arrive for your celebrations.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40">
                      <div className="space-y-0.5 max-w-md">
                        <Label htmlFor="new-wishes" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Instant Wish Notifications
                        </Label>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          Receive an email whenever someone adds a photo, voice note, or message to one of your canvases.
                        </p>
                      </div>
                      <Switch
                        id="new-wishes"
                        checked={newMessageNotifications}
                        onCheckedChange={setNewMessageNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40">
                      <div className="space-y-0.5 max-w-md">
                        <Label htmlFor="reminders" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Milestone Countdown Reminders
                        </Label>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          Get a reminder 3 days and 1 day prior to the milestone birthday date to review and seal the canvas.
                        </p>
                      </div>
                      <Switch
                        id="reminders"
                        checked={birthdayReminders}
                        onCheckedChange={setBirthdayReminders}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40">
                      <div className="space-y-0.5 max-w-md">
                        <Label htmlFor="digest" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Weekly Atelier Summary Digest
                        </Label>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          A curated weekly recap showing all collected wishes, active deadlines, and upcoming dates.
                        </p>
                      </div>
                      <Switch
                        id="digest"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={handleSaveNotifications}
                      disabled={savingNotifications}
                      className="btn-press rounded-2xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-card hover:bg-slate-900 active:scale-[0.98] gap-2"
                    >
                      {savingNotifications ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                          <span>Saving Triggers...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 text-amber-400" />
                          <span>Save Notification Triggers</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 4: SECURITY & ACCOUNT CONTROL */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Password Update Card */}
                  <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card space-y-6">
                    <div className="border-b border-stone-100 pb-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Account Access
                      </span>
                      <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-1">
                        Change Password
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 mt-1">
                        Update your password to keep your celebrations and creator atelier protected.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-pass" className="text-xs font-bold text-slate-900">
                          New Password
                        </Label>
                        <Input
                          id="new-pass"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-amber-400 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-pass" className="text-xs font-bold text-slate-900">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirm-pass"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-amber-400 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleChangePassword}
                        disabled={savingPassword || !newPassword || !confirmPassword}
                        className="btn-press rounded-2xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-card hover:bg-slate-900 active:scale-[0.98] gap-2"
                      >
                        {savingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4 text-amber-400" />
                            <span>Update Password</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Atelier Concierge Support Card */}
                  <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-amber-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Atelier Concierge
                      </span>
                      <h4 className="font-serif font-bold text-slate-950 text-base">
                        Need assistance with a celebration?
                      </h4>
                      <p className="text-xs text-stone-600 max-w-md leading-relaxed">
                        Whether recovering an archived canvas, coordinating custom themes, or handling billing queries, our concierge is here to help.
                      </p>
                    </div>
                    <a
                      href="mailto:support@wishcanvas.art?subject=Creator%20Support%20Request"
                      className="shrink-0"
                    >
                      <Button variant="outline" size="sm" className="rounded-xl border-amber-300 bg-white font-bold text-xs text-amber-900 hover:bg-amber-50 shadow-xs gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-amber-700" />
                        <span>Email Concierge</span>
                      </Button>
                    </a>
                  </div>

                  {/* Danger Zone */}
                  <div className="rounded-[2.5rem] border border-rose-200/90 bg-rose-50/40 p-6 sm:p-8 space-y-4">
                    <div className="border-b border-rose-200/60 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                        Danger Zone
                      </span>
                      <h4 className="font-serif text-xl font-bold text-rose-950 mt-0.5">
                        Delete Account and Canvases
                      </h4>
                      <p className="text-xs text-stone-600 mt-1">
                        Permanently deletes all celebration pages, guest notes, uploaded photos, and your creator account. This action cannot be reversed.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="rounded-2xl bg-rose-600 hover:bg-rose-700 text-xs font-bold px-5 py-2.5 shadow-sm gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete All Data &amp; Account</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-serif text-xl font-bold text-slate-950">
                              Permanently delete account?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed pt-2">
                              This will immediately erase your account, active wish collections, and guest memory archives. This operation is permanent and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-6 gap-2">
                            <AlertDialogCancel className="rounded-xl border-stone-200 text-xs font-semibold">
                              Keep My Account
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteWorkspaceData}
                              disabled={deleting}
                              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs"
                            >
                              {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
