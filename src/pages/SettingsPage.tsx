import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { themeOptions } from '@/pages/settings';
import type { BirthdayPage } from '@/pages/dashboardPage/types';

type SettingsTab = 'profile' | 'canvas' | 'notifications' | 'security';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshSession, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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

  const isProUser = Boolean(user?.is_pro || profile?.is_pro);
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
        setPages(data);
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

      const response = await apiForm<{ avatarUrl?: string; avatar_url?: string; success: boolean }>('/auth/avatar', {
        method: 'POST',
        body: formData,
      });

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
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden">
      {/* Background Celebratory Glows */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-amber-200/35 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[560px] w-[560px] rounded-full bg-gradient-to-bl from-rose-200/30 to-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[420px] w-[420px] rounded-full bg-amber-100/30 blur-3xl" />

      {/* Top App Header with Direct Return to Dashboard */}
      <Header backTo={{ label: 'Back to Atelier', useHistory: false, href: '/dashboard' }} />

      <main className="relative max-w-7xl mx-auto px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-28">
        
        {/* Top Breadcrumb & Page Banner */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif italic text-sm text-amber-800">creator atelier</span>
              <span className="h-1 w-1 rounded-full bg-stone-300" />
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Profile &amp; Settings</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              Creator Studio &amp; Account
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="rounded-xl border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 gap-1.5 shadow-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Atelier</span>
              </Button>
            </Link>
            <Link to="/create">
              <Button size="sm" className="btn-press rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 text-white font-bold text-xs shadow-md shadow-amber-500/20 gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-100" />
                <span>Craft Canvas</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Artisan Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: THE CREATOR PASSPORT & ATELIER IDENTITY (4 Cols on LG) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            
            {/* Creator Identity Passport Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 shadow-sm text-center">
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

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-700 shadow-md hover:bg-stone-50 hover:text-slate-950 active:scale-95 transition-all"
                  title="Upload portrait photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <h2 className="font-serif text-xl font-bold text-slate-950">
                    {currentDisplayName}
                  </h2>
                  {isProUser && (
                    <span className="text-[10px] font-bold text-amber-950 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 truncate max-w-[220px] mx-auto">
                  {user?.email}
                </p>
              </div>

              {/* Creator Studio Stats */}
              <div className="mt-6 grid grid-cols-3 gap-2 border-y border-stone-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Canvases</span>
                  <p className="font-serif text-base font-bold text-slate-950 mt-0.5">{totalPages}</p>
                </div>
                <div className="border-x border-stone-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Wishes</span>
                  <p className="font-serif text-base font-bold text-emerald-800 mt-0.5">{totalWishes}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Active</span>
                  <p className="font-serif text-base font-bold text-amber-800 mt-0.5">{activePages}</p>
                </div>
              </div>

              {/* Atelier Membership Tier Box */}
              <div className="mt-6 rounded-2xl bg-stone-50 border border-stone-200/80 p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Atelier Tier</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isProUser ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {isProUser ? 'Pro Member' : 'Free Creator'}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-snug">
                  {isProUser
                    ? 'Unlimited milestone canvases, audio voice recordings, and keepsake PDF downloads unlocked.'
                    : `${activePages} of 5 active milestone canvases currently in use.`}
                </p>

                <Link to="/billing" className="block pt-1">
                  <Button
                    size="sm"
                    className={`w-full rounded-xl text-xs font-bold transition-all ${
                      isProUser
                        ? 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-100'
                        : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-xs hover:brightness-105'
                    }`}
                  >
                    {isProUser ? 'Manage Pro Atelier' : 'Upgrade to Pro Atelier'}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Navigation Switcher on Desktop */}
            <div className="rounded-3xl border border-stone-200/90 bg-white p-3 shadow-xs space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'profile'
                    ? 'bg-amber-50 text-amber-950 border border-amber-200/80 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950'
                }`}
              >
                <User className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Creator Profile Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'canvas'
                    ? 'bg-amber-50 text-amber-950 border border-amber-200/80 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950'
                }`}
              >
                <Palette className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Default Canvas Presets</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'notifications'
                    ? 'bg-amber-50 text-amber-950 border border-amber-200/80 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950'
                }`}
              >
                <Bell className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Notification Triggers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'security'
                    ? 'bg-amber-50 text-amber-950 border border-amber-200/80 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-slate-950'
                }`}
              >
                <Shield className="h-4 w-4 text-stone-600 shrink-0" />
                <span>Security &amp; Account Control</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: INTERACTIVE ATELIER WORKBENCH (8 Cols on LG) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Mobile Tab Pills Switcher */}
            <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeTab === 'profile'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeTab === 'canvas'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                Canvas Presets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeTab === 'notifications'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                Notifications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeTab === 'security'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                Security
              </button>
            </div>

            {/* TAB 1: CREATOR PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
                    <User className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-slate-950">Creator Profile &amp; Signature</h2>
                    <p className="text-xs text-stone-500">Your public celebration organizer identity across canvases</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName" className="text-xs font-bold text-slate-800">
                      Organizer Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Ayomikun Oladipo"
                      className="h-10 rounded-xl border-stone-200 bg-white text-xs text-slate-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                    />
                    <p className="text-[11px] text-stone-500">
                      Displayed on contribution invitations, secret share links, and cover notes.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-800">
                      Connected Account Email
                    </Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="h-10 rounded-xl border-stone-200 bg-stone-100 text-xs text-stone-500 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-stone-500">
                      Managed through your authentication login.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="btn-press rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 text-white font-bold text-xs shadow-md shadow-amber-500/20 gap-2 active:scale-[0.98] transition-all"
                    >
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Profile Information</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DEFAULT CANVAS PRESETS */}
            {activeTab === 'canvas' && (
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-800 border border-rose-200/80">
                    <Palette className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-slate-950">Default Canvas Presets</h2>
                    <p className="text-xs text-stone-500">Global rules applied automatically when creating new birthday canvases</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Theme Selector with Visual Swatch Preview */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-800">Default Aesthetic Theme</Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                        <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white text-xs text-slate-900 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-stone-200 bg-white shadow-xl">
                          {themeOptions.map((theme) => (
                            <SelectItem key={theme.value} value={theme.value} className="text-xs rounded-xl">
                              {theme.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="h-10 px-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center gap-2 text-xs font-medium text-stone-700 shrink-0">
                        <span className="h-3 w-3 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400" />
                        <span>Active: {selectedThemeObj.label}</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-stone-100" />

                  {/* Toggle Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-xs font-bold text-slate-950">Allow Photo Uploads</p>
                        <p className="text-xs text-stone-500">Allow guests to attach keepsake photos to their birthday wishes</p>
                      </div>
                      <Switch
                        checked={defaultAllowPhotos}
                        onCheckedChange={setDefaultAllowPhotos}
                      />
                    </div>

                    <Separator className="bg-stone-100" />

                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-xs font-bold text-slate-950">Allow Audio Voice Notes</p>
                        <p className="text-xs text-stone-500">Enable in-browser audio recording for emotional voice greetings</p>
                      </div>
                      <Switch
                        checked={defaultAllowAudio}
                        onCheckedChange={setDefaultAllowAudio}
                      />
                    </div>

                    <Separator className="bg-stone-100" />

                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-xs font-bold text-slate-950">Require Contributor Names</p>
                        <p className="text-xs text-stone-500">Prompt guests to enter their real name before pinning their wish</p>
                      </div>
                      <Switch
                        checked={defaultRequireNames}
                        onCheckedChange={setDefaultRequireNames}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleSavePreferences}
                      disabled={savingPreferences}
                      className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs gap-2 active:scale-[0.98] transition-all"
                    >
                      {savingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Canvas Presets</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATION CHANNELS */}
            {activeTab === 'notifications' && (
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
                    <Bell className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-slate-950">Notification Triggers</h2>
                    <p className="text-xs text-stone-500">Control when WishCanvas alerts you about new memories and milestones</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-bold text-slate-950">Email Digests &amp; Confirmations</p>
                      <p className="text-xs text-stone-500">Receive essential account receipts and canvas setup summaries</p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator className="bg-stone-100" />

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-bold text-slate-950">New Memory Alerts</p>
                      <p className="text-xs text-stone-500">Instant notification whenever a contributor leaves a voice note or wish</p>
                    </div>
                    <Switch
                      checked={newMessageNotifications}
                      onCheckedChange={setNewMessageNotifications}
                    />
                  </div>

                  <Separator className="bg-stone-100" />

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-bold text-slate-950">Milestone Countdown Reminders</p>
                      <p className="text-xs text-stone-500">Receive reminders 3 days and 24 hours before the birthday reveal trigger</p>
                    </div>
                    <Switch
                      checked={birthdayReminders}
                      onCheckedChange={setBirthdayReminders}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleSaveNotifications}
                      disabled={savingNotifications}
                      className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs gap-2 active:scale-[0.98] transition-all"
                    >
                      {savingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Notification Triggers</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY & ACCOUNT CONTROL */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Password Change Card */}
                <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
                      <KeyRound className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl font-bold text-slate-950">Account Security</h2>
                      <p className="text-xs text-stone-500">Update your access password and security credentials</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-800">New Password</Label>
                      <Input
                        type="password"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 rounded-xl border-stone-200 bg-white text-xs text-slate-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-800">Confirm New Password</Label>
                      <Input
                        type="password"
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10 rounded-xl border-stone-200 bg-white text-xs text-slate-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleChangePassword}
                      disabled={!newPassword || !confirmPassword || savingPassword}
                      className="rounded-xl border-stone-200 bg-white text-xs font-semibold text-slate-900 hover:bg-stone-50"
                    >
                      {savingPassword ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      Update Password
                    </Button>
                  </div>
                </div>

                {/* Concierge Support Card */}
                <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
                      <Mail className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg font-bold text-slate-950">Atelier Concierge</h2>
                      <p className="text-xs text-stone-500">Direct help with billing, accounts, or custom soundtracks</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 text-xs text-stone-600 leading-relaxed">
                    Have questions about your celebration atelier or need custom audio assistance? Reach our team at{' '}
                    <a
                      href="mailto:hello@wishcanvas.app"
                      className="font-bold text-amber-900 underline underline-offset-4 hover:text-rose-600 transition-colors"
                    >
                      hello@wishcanvas.app
                    </a>
                    .
                  </div>
                </div>

                {/* Danger Zone Card */}
                <div className="rounded-3xl border border-rose-200/80 bg-rose-50/30 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 text-rose-700">
                    <Trash2 className="h-5 w-5" />
                    <h3 className="font-serif text-base font-bold">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
                    Permanently removes your creator account, created birthday pages, audio recordings, custom themes, and guest memories from WishCanvas.
                  </p>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="rounded-xl text-xs font-bold gap-2">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete My Account &amp; Canvases
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl bg-white border border-stone-200 p-6">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-serif text-xl font-bold text-slate-950">
                          Delete your creator account and canvas data?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed">
                          This action cannot be undone. It permanently removes your WishCanvas account, active collections, audio wishes, and stored keepsake photos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteWorkspaceData}
                          className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
                          disabled={deleting}
                        >
                          {deleting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                          Yes, permanently delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
};

export default SettingsPage;
