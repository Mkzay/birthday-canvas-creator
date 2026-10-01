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
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { themeOptions } from '@/pages/settings';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshSession, loading: authLoading } = useAuth();
  
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

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden">
      {/* Background Celebratory Glows */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-amber-200/35 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-rose-200/30 to-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-2/3 h-[380px] w-[380px] rounded-full bg-amber-100/30 blur-3xl" />

      <Header backTo={{ label: 'Back to Atelier', useHistory: false, href: '/dashboard' }} />

      <main className="relative max-w-4xl mx-auto px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 space-y-8">
        
        {/* Creator Hero Header Card */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-10 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-bl from-amber-300/20 to-rose-300/10 blur-2xl" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Creator Atelier Profile</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Personalize your creative space
              </h1>
              <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-stone-500">
                Update your public creator identity, notification triggers, and default milestone canvas preferences.
              </p>
            </div>

            {/* Plan Tier Showcase Card */}
            <div className="shrink-0 p-4 rounded-2xl border border-stone-200/90 bg-stone-50/70 sm:max-w-xs space-y-2.5">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isProUser ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-700'}`}>
                  <Crown className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-950">
                    {isProUser ? 'Pro Atelier Membership' : 'Free Creator Atelier'}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    {isProUser ? 'Unlimited Canvases & Exports' : 'Up to 5 Active Canvases'}
                  </p>
                </div>
              </div>

              {!isProUser ? (
                <Link to="/billing" className="block">
                  <Button size="sm" className="w-full h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs hover:brightness-105">
                    Unlock Pro Perks
                  </Button>
                </Link>
              ) : (
                <Link to="/billing" className="block text-[11px] font-semibold text-amber-800 hover:underline">
                  Manage membership &rarr;
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* 1. Profile Settings Card */}
        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
              <User className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-950">Creator Profile</h2>
              <p className="text-xs text-stone-500">How you appear to friends, family, and contributors</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Avatar Section */}
            <div className="grid gap-2.5">
              <Label className="text-xs font-bold text-slate-800">Profile Portrait</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
                <div className="relative shrink-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName || 'Avatar'}
                      className={`h-20 w-20 rounded-full object-cover shadow-xs ${
                        isProUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white' : 'border-2 border-stone-200'
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-serif text-2xl font-bold shadow-xs ${
                        isProUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white' : ''
                      }`}
                    >
                      {initial}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50 active:scale-95 transition-all"
                    title="Upload portrait photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-950">Upload your creator photo</p>
                  <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">
                    JPG or PNG under 3MB. Displayed across your celebration canvases and creator dashboard.
                  </p>
                  
                  <div className="mt-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="h-8 rounded-xl border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      {uploadingAvatar ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      {uploadingAvatar ? 'Uploading image...' : 'Choose image'}
                    </Button>
                  </div>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*,.gif"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>
            </div>

            {/* Display Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="displayName" className="text-xs font-bold text-slate-800">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="h-10 rounded-xl border-stone-200 bg-white text-xs text-slate-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
              />
              <p className="text-[11px] text-stone-500">
                This name is shown as the celebration host and organizer.
              </p>
            </div>

            {/* Email Input */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-bold text-slate-800">
                Account Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="h-10 rounded-xl border-stone-200 bg-stone-100 text-xs text-stone-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-stone-500">
                Email address is linked to your authentication provider.
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-press rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 text-white font-bold text-xs shadow-md shadow-amber-500/20 gap-2 active:scale-[0.98] transition-all"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Profile Details
            </Button>
          </div>
        </section>

        {/* 2. Notification Preferences Card */}
        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
              <Bell className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-950">Notification Preferences</h2>
              <p className="text-xs text-stone-500">Control when you receive celebration alerts and reminders</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-bold text-slate-950">Email Notifications</p>
                <p className="text-xs text-stone-500">Receive summary digests and account confirmations</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator className="bg-stone-100" />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-bold text-slate-950">New Wish &amp; Memory Alerts</p>
                <p className="text-xs text-stone-500">Get notified when a friend leaves a new voice note or photo</p>
              </div>
              <Switch
                checked={newMessageNotifications}
                onCheckedChange={setNewMessageNotifications}
              />
            </div>

            <Separator className="bg-stone-100" />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-bold text-slate-950">Birthday Milestone Reminders</p>
                <p className="text-xs text-stone-500">Receive head-up alerts 3 days and 1 day before celebration dates</p>
              </div>
              <Switch
                checked={birthdayReminders}
                onCheckedChange={setBirthdayReminders}
              />
            </div>

            <Button
              onClick={handleSaveNotifications}
              disabled={savingNotifications}
              className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs gap-2 active:scale-[0.98] transition-all"
            >
              {savingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Notification Preferences
            </Button>
          </div>
        </section>

        {/* 3. Default Milestone Canvas Settings Card */}
        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-800 border border-rose-200/80">
              <Settings className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-950">Default Canvas Settings</h2>
              <p className="text-xs text-stone-500">Preset preferences applied whenever you craft a new canvas</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold text-slate-800">Default Aesthetic Theme</Label>
              <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white text-xs text-slate-900">
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
            </div>

            <Separator className="bg-stone-100" />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-bold text-slate-950">Allow Photo Uploads</p>
                <p className="text-xs text-stone-500">Allow guests and family to attach photos to their wishes</p>
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
                <p className="text-xs text-stone-500">Allow guests to record audio greetings or upload voice messages</p>
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
                <p className="text-xs text-stone-500">Contributors must enter their name before pinning a wish</p>
              </div>
              <Switch
                checked={defaultRequireNames}
                onCheckedChange={setDefaultRequireNames}
              />
            </div>

            <Button
              onClick={handleSavePreferences}
              disabled={savingPreferences}
              className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs gap-2 active:scale-[0.98] transition-all"
            >
              {savingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Canvas Defaults
            </Button>
          </div>
        </section>

        {/* 4. Account Security & Password Card */}
        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
              <KeyRound className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-950">Account Security</h2>
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
        </section>

        {/* 5. Direct Support & Assistance */}
        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
              <Mail className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-950">Atelier Support &amp; Concierge</h2>
              <p className="text-xs text-stone-500">Direct assistance with memberships, audio playback, or features</p>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 text-xs text-stone-600 leading-relaxed">
            Need a hand with custom audio or setting up a reveal? Write directly to our team at{' '}
            <a
              href="mailto:hello@wishcanvas.app"
              className="font-bold text-amber-900 underline underline-offset-4 hover:text-rose-600 transition-colors"
            >
              hello@wishcanvas.app
            </a>
            . We typically respond within a few hours.
          </div>
        </section>

        {/* 6. Danger Zone Card */}
        <section className="rounded-3xl border border-rose-200/80 bg-rose-50/30 p-6 sm:p-8 shadow-xs space-y-4">
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
        </section>

      </main>
    </div>
  );
};

export default SettingsPage;
