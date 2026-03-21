import React, { useRef, useState, useEffect } from 'react';
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
  ArrowLeft,
  User,
  Bell,
  Settings,
  Shield,
  Loader2,
  Save,
  Trash2,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';

const themeOptions = [
  { value: 'elegant', label: 'Elegant ✨' },
  { value: 'playful', label: 'Playful 🎈' },
  { value: 'minimalist', label: 'Minimalist 🎯' },
  { value: 'retro', label: 'Retro 🌈' },
  { value: 'tropical', label: 'Tropical 🌴' },
  { value: 'cosmic', label: 'Cosmic 🚀' },
  { value: 'sunset', label: 'Sunset 🌅' },
  { value: 'ocean', label: 'Ocean 🌊' },
  { value: 'candyland', label: 'Candyland 🍭' },
  { value: 'midnight', label: 'Midnight 🌙' },
];

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
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setDefaultRequireNames(profile.default_require_names ?? true);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          avatarUrl,
        }),
      });
      await refreshSession();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    }
    setSaving(false);
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await apiFetch('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultTheme,
          defaultAllowPhotos,
          defaultAllowAudio,
          defaultRequireNames,
        }),
      });
      await refreshSession();
      toast.success('Default page settings saved');
    } catch (error) {
      toast.error('Failed to update default settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      event.target.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Avatar must be less than 3MB');
      event.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiForm<{ url: string }>('/uploads/avatar', formData);
      setAvatarUrl(data.url);
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          avatarUrl: data.url,
        }),
      });
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

    setSaving(true);
    try {
      await apiFetch<void>('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      toast.error(message);
      console.error(error);
    }
    setSaving(false);
  };

  const handleDeleteWorkspaceData = async () => {
    if (!user) return;
    
    setDeleting(true);
    try {
      await apiFetch<void>('/auth/me/data', {
        method: 'DELETE',
      });
      await signOut();
      toast.success('Your account and workspace data were deleted');
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

  return (
    <div className="min-h-screen app-shell">
      <Header />

      <main className="max-w-5xl mx-auto px-4 pb-6 pt-24 sm:px-6 sm:pb-8 sm:pt-28 space-y-8">
        <section className="panel-card p-6 sm:p-8">
          <span className="eyebrow-chip">Workspace settings</span>
          <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-4xl">Tune the account behind the surprises</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Profile details are live. Notification and default-page preferences are intentionally visible but read-only
            until those systems are wired through end to end.
          </p>
        </section>

        {/* Profile Settings */}
        <section className="panel-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Profile Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={user?.email || ''} 
                disabled 
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input 
                id="displayName" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div className="grid gap-3">
              <Label>Avatar</Label>
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                <img
                  src={resolveAssetUrl(avatarUrl) || '/brand-mark.svg'}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full border-2 border-border object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Upload a profile image</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to 3MB.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {uploadingAvatar ? 'Uploading...' : 'Upload'}
                </Button>
                <input ref={avatarInputRef} type="file" accept="image/*,.gif" className="hidden" onChange={handleAvatarSelect} />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </Button>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="panel-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Notification Preferences</h2>
              <p className="text-sm text-muted-foreground">Control how you receive updates</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                disabled
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">New Message Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when someone leaves a message</p>
              </div>
              <Switch 
                checked={newMessageNotifications} 
                onCheckedChange={setNewMessageNotifications}
                disabled
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Birthday Reminders</p>
                <p className="text-sm text-muted-foreground">Reminders before birthday dates</p>
              </div>
              <Switch 
                checked={birthdayReminders} 
                onCheckedChange={setBirthdayReminders}
                disabled
              />
            </div>
          </div>

          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700 mt-4 italic">
            Notification preferences are not live yet, so these controls are intentionally read-only.
          </p>
        </section>

        {/* Default Page Settings */}
        <section className="panel-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Default Page Settings</h2>
              <p className="text-sm text-muted-foreground">Set defaults for new birthday pages</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Theme</Label>
              <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Allow Photo Uploads</p>
                <p className="text-sm text-muted-foreground">Let contributors add photos to messages</p>
              </div>
              <Switch 
                checked={defaultAllowPhotos} 
                onCheckedChange={setDefaultAllowPhotos}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Allow Audio Wishes</p>
                <p className="text-sm text-muted-foreground">Let contributors record or upload voice notes</p>
              </div>
              <Switch 
                checked={defaultAllowAudio} 
                onCheckedChange={setDefaultAllowAudio}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Require Names</p>
                <p className="text-sm text-muted-foreground">Contributors must provide their name</p>
              </div>
              <Switch 
                checked={defaultRequireNames} 
                onCheckedChange={setDefaultRequireNames}
              />
            </div>
          </div>

          <Button onClick={handleSavePreferences} disabled={saving} className="mt-4 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save default settings
          </Button>
        </section>

        {/* Account Management */}
        <section className="panel-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Account Management</h2>
              <p className="text-sm text-muted-foreground">Security and account options</p>
            </div>
          </div>

          {/* Change Password */}
          <div className="mb-6">
            <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
              <KeyRound className="w-4 h-4" />
              Change Password
            </h3>
            <div className="space-y-3">
              <Input 
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input 
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button 
                variant="outline" 
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Password
              </Button>
              <p className="text-xs text-muted-foreground">
                Password updates take effect immediately for this account.
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Delete Account */}
          <div>
            <h3 className="font-medium text-destructive flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4" />
              Danger Zone
            </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This permanently removes your account, birthday pages, custom themes, messages, and stored photos from WishCanvas.
              </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete My Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your workspace data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. It will permanently remove your WishCanvas data, including birthday pages, messages, custom themes, and stored photos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteWorkspaceData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Yes, delete my data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
