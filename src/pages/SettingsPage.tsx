import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const { user, profile, signOut, loading: authLoading } = useAuth();
  
  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newMessageNotifications, setNewMessageNotifications] = useState(true);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  
  // Default page settings
  const [defaultTheme, setDefaultTheme] = useState('elegant');
  const [defaultAllowPhotos, setDefaultAllowPhotos] = useState(true);
  const [defaultRequireNames, setDefaultRequireNames] = useState(true);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
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
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
    }
    setSaving(false);
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
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message || 'Failed to change password');
    } else {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeleting(true);
    
    // Delete user's pages first
    const { error: pagesError } = await supabase
      .from('birthday_pages')
      .delete()
      .eq('user_id', user.id);
    
    if (pagesError) {
      toast.error('Failed to delete account data');
      setDeleting(false);
      return;
    }

    // Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id);

    // Sign out
    await signOut();
    toast.success('Account deleted successfully');
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-cta flex items-center justify-center text-lg sm:text-xl">
              ⚙️
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">Settings</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Profile Settings */}
        <section className="bg-card rounded-2xl border border-border p-6">
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

            <div className="grid gap-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input 
                id="avatarUrl" 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              {avatarUrl && (
                <div className="mt-2">
                  <img 
                    src={avatarUrl} 
                    alt="Avatar preview" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </Button>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-card rounded-2xl border border-border p-6">
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
                disabled={!emailNotifications}
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
                disabled={!emailNotifications}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            * Notification features coming soon
          </p>
        </section>

        {/* Default Page Settings */}
        <section className="bg-card rounded-2xl border border-border p-6">
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
                <p className="font-medium text-foreground">Require Names</p>
                <p className="text-sm text-muted-foreground">Contributors must provide their name</p>
              </div>
              <Switch 
                checked={defaultRequireNames} 
                onCheckedChange={setDefaultRequireNames}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            * Default settings feature coming soon
          </p>
        </section>

        {/* Account Management */}
        <section className="bg-card rounded-2xl border border-border p-6">
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
              Once you delete your account, there is no going back. All your birthday pages and data will be permanently removed.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data including birthday pages, messages, and custom themes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Yes, delete my account
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
