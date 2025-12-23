import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Copy, QrCode, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Theme = 'elegant' | 'playful' | 'minimalist' | 'retro';

const themeConfig = {
  elegant: { name: 'Elegant', emoji: '✨', primary: 'from-amber-400 to-orange-500' },
  playful: { name: 'Playful', emoji: '🎈', primary: 'from-pink-500 to-purple-500' },
  minimalist: { name: 'Minimalist', emoji: '🎯', primary: 'from-slate-600 to-slate-800' },
  retro: { name: 'Retro', emoji: '🌈', primary: 'from-cyan-400 to-purple-500' },
};

const EditPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('elegant');
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [requireNames, setRequireNames] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (pageId && user) {
      fetchPage();
    }
  }, [pageId, user]);

  const fetchPage = async () => {
    const { data, error } = await supabase
      .from('birthday_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Page not found');
      navigate('/dashboard');
      return;
    }

    setRecipientName(data.recipient_name);
    setBirthdayDate(new Date(data.birthday_date));
    setCreatorMessage(data.creator_message || '');
    setSelectedTheme(data.theme as Theme);
    setAllowPhotos(data.allow_photos);
    setRequireNames(data.require_names);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!recipientName.trim()) {
      toast.error('Please enter the recipient\'s name');
      return;
    }
    if (!birthdayDate) {
      toast.error('Please select a birthday date');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('birthday_pages')
      .update({
        recipient_name: recipientName,
        birthday_date: format(birthdayDate, 'yyyy-MM-dd'),
        theme: selectedTheme,
        creator_message: creatorMessage || null,
        allow_photos: allowPhotos,
        require_names: requireNames,
      })
      .eq('id', pageId);

    setSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      console.error(error);
      return;
    }

    toast.success('Changes saved!');
    navigate('/dashboard');
  };

  const copyLink = (type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const link = type === 'contribute' 
      ? `${baseUrl}/contribute/${pageId}`
      : `${baseUrl}/birthday/${pageId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center text-xl">
              🎨
            </div>
            <span className="text-xl font-bold text-foreground">WishCanvas</span>
          </Link>
          
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-8">Edit Birthday Page</h1>

        {/* Details */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="font-bold text-foreground mb-4">Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">Recipient's Name</Label>
              <Input
                id="name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-foreground">Birthday Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-2 justify-start text-left font-normal",
                      !birthdayDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {birthdayDate ? format(birthdayDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={birthdayDate}
                    onSelect={setBirthdayDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="message" className="text-foreground">Your Personal Message</Label>
              <Textarea
                id="message"
                value={creatorMessage}
                onChange={(e) => setCreatorMessage(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="font-bold text-foreground mb-4">Theme</h2>
          <div className="grid grid-cols-4 gap-3">
            {(Object.keys(themeConfig) as Theme[]).map((themeKey) => {
              const theme = themeConfig[themeKey];
              const isSelected = selectedTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => setSelectedTheme(themeKey)}
                  className={cn(
                    "aspect-square rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2",
                    `bg-gradient-to-br ${theme.primary}`,
                    isSelected 
                      ? "ring-2 ring-foreground/20 scale-105 border-primary-foreground" 
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <span className="text-2xl">{theme.emoji}</span>
                  <span className="text-xs font-medium text-primary-foreground">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="font-bold text-foreground mb-4">Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="photos" className="text-foreground">Allow photo uploads</Label>
              <Switch id="photos" checked={allowPhotos} onCheckedChange={setAllowPhotos} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="names" className="text-foreground">Require names on messages</Label>
              <Switch id="names" checked={requireNames} onCheckedChange={setRequireNames} />
            </div>
          </div>
        </div>

        {/* Share Links */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="font-bold text-foreground mb-4">Share Links</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="gap-2" onClick={() => copyLink('contribute')}>
              <Copy className="w-4 h-4" />
              Contribution Link
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => copyLink('birthday')}>
              <Copy className="w-4 h-4" />
              Birthday Link
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditPage;
