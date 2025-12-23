import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Copy, QrCode, Calendar, Loader2, Image, X } from 'lucide-react';
import SocialShareButtons from '@/components/SocialShareButtons';
import QRCodeModal from '@/components/QRCodeModal';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Theme = 'elegant' | 'playful' | 'minimalist' | 'retro' | 'tropical' | 'cosmic' | 'sunset' | 'ocean' | 'candyland' | 'midnight';

const themeConfig = {
  elegant: { name: 'Elegant', emoji: '✨', primary: 'from-amber-400 to-orange-500' },
  playful: { name: 'Playful', emoji: '🎈', primary: 'from-pink-500 to-purple-500' },
  minimalist: { name: 'Minimalist', emoji: '🎯', primary: 'from-slate-600 to-slate-800' },
  retro: { name: 'Retro', emoji: '🌈', primary: 'from-cyan-400 to-purple-500' },
  tropical: { name: 'Tropical', emoji: '🌴', primary: 'from-green-400 to-emerald-500' },
  cosmic: { name: 'Cosmic', emoji: '🚀', primary: 'from-violet-500 to-indigo-600' },
  sunset: { name: 'Sunset', emoji: '🌅', primary: 'from-orange-400 to-rose-500' },
  ocean: { name: 'Ocean', emoji: '🌊', primary: 'from-sky-400 to-cyan-500' },
  candyland: { name: 'Candyland', emoji: '🍭', primary: 'from-pink-400 to-purple-500' },
  midnight: { name: 'Midnight', emoji: '🌙', primary: 'from-indigo-500 to-violet-600' },
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
  
  // Cover photo state
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // QR code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState<'contribute' | 'birthday'>('contribute');

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
    setCurrentCoverUrl(data.cover_photo_url);
    setLoading(false);
  };

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setCoverPhoto(file);
    setCoverPhotoPreview(URL.createObjectURL(file));
  };

  const removeCoverPhoto = () => {
    setCoverPhoto(null);
    if (coverPhotoPreview) {
      URL.revokeObjectURL(coverPhotoPreview);
      setCoverPhotoPreview(null);
    }
    setCurrentCoverUrl(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const uploadCoverPhoto = async (): Promise<string | null> => {
    if (!coverPhoto || !pageId) return currentCoverUrl;

    setUploadingCover(true);
    const fileExt = coverPhoto.name.split('.').pop();
    const fileName = `covers/${pageId}.${fileExt}`;

    const { error } = await supabase.storage
      .from('birthday-photos')
      .upload(fileName, coverPhoto, { upsert: true });

    setUploadingCover(false);

    if (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload cover photo');
      return currentCoverUrl;
    }

    const { data: urlData } = supabase.storage
      .from('birthday-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
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

    // Upload cover photo if new one selected
    let coverUrl = currentCoverUrl;
    if (coverPhoto) {
      coverUrl = await uploadCoverPhoto();
    }

    const { error } = await supabase
      .from('birthday_pages')
      .update({
        recipient_name: recipientName,
        birthday_date: format(birthdayDate, 'yyyy-MM-dd'),
        theme: selectedTheme,
        creator_message: creatorMessage || null,
        allow_photos: allowPhotos,
        require_names: requireNames,
        cover_photo_url: coverUrl,
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

  const displayCoverUrl = coverPhotoPreview || currentCoverUrl;

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

            {/* Cover Photo */}
            <div>
              <Label className="text-foreground">Cover Photo</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverPhotoSelect}
                className="hidden"
              />
              
              {displayCoverUrl ? (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-border">
                  <img 
                    src={displayCoverUrl} 
                    alt="Cover preview" 
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeCoverPhoto}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => coverInputRef.current?.click()}
                  className="mt-2 border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload a cover photo</p>
                  <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="font-bold text-foreground mb-4">Theme</h2>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(themeConfig) as Theme[]).map((themeKey) => {
              const theme = themeConfig[themeKey];
              const isSelected = selectedTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => setSelectedTheme(themeKey)}
                  className={cn(
                    "aspect-square rounded-xl p-2 flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2",
                    `bg-gradient-to-br ${theme.primary}`,
                    isSelected 
                      ? "ring-2 ring-foreground/20 scale-105 border-primary-foreground" 
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <span className="text-xl">{theme.emoji}</span>
                  <span className="text-[10px] font-medium text-primary-foreground">{theme.name}</span>
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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => copyLink('contribute')}>
                <Copy className="w-4 h-4" />
                Contribution
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setQrType('contribute'); setQrModalOpen(true); }}>
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => copyLink('birthday')}>
                <Copy className="w-4 h-4" />
                Birthday
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setQrType('birthday'); setQrModalOpen(true); }}>
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">Share contribution link on social media</p>
            <SocialShareButtons 
              url={`${window.location.origin}/contribute/${pageId}`}
              message={`🎂 Help me celebrate ${recipientName}'s birthday! Add your wishes here:`}
              recipientName={recipientName}
            />
          </div>
        </div>

        {/* QR Code Modal */}
        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          url={`${window.location.origin}/${qrType === 'contribute' ? 'contribute' : 'birthday'}/${pageId}`}
          title={qrType === 'contribute' ? 'Contribution QR Code' : 'Birthday QR Code'}
          recipientName={recipientName}
        />

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSave} className="flex-1" disabled={saving || uploadingCover}>
            {(saving || uploadingCover) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadingCover ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditPage;
