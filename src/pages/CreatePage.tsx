import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Copy, QrCode, Calendar, Image, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Theme = 'elegant' | 'playful' | 'minimalist' | 'retro';
type Step = 1 | 2 | 3;

const themeConfig = {
  elegant: { name: 'Elegant', emoji: '✨', primary: 'from-amber-400 to-orange-500' },
  playful: { name: 'Playful', emoji: '🎈', primary: 'from-pink-500 to-purple-500' },
  minimalist: { name: 'Minimalist', emoji: '🎯', primary: 'from-slate-600 to-slate-800' },
  retro: { name: 'Retro', emoji: '🌈', primary: 'from-cyan-400 to-purple-500' },
};

const CreatePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('elegant');
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [requireNames, setRequireNames] = useState(true);
  const [closeDate, setCloseDate] = useState<Date>();
  
  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const steps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Theme' },
    { number: 3, label: 'Share' },
  ];

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
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const uploadCoverPhoto = async (pageId: string): Promise<string | null> => {
    if (!coverPhoto) return null;

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
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('birthday-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!recipientName.trim()) {
        toast.error('Please enter the recipient\'s name');
        return;
      }
      if (!birthdayDate) {
        toast.error('Please select a birthday date');
        return;
      }
    }
    
    if (step === 2) {
      // Create the page in database
      setSaving(true);
      const { data, error } = await supabase
        .from('birthday_pages')
        .insert({
          user_id: user!.id,
          recipient_name: recipientName,
          birthday_date: format(birthdayDate!, 'yyyy-MM-dd'),
          theme: selectedTheme,
          creator_message: creatorMessage || null,
          allow_photos: allowPhotos,
          require_names: requireNames,
          close_date: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate!, 'yyyy-MM-dd'),
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        setSaving(false);
        toast.error('Failed to create page');
        console.error(error);
        return;
      }

      // Upload cover photo if selected
      if (coverPhoto && data) {
        const coverUrl = await uploadCoverPhoto(data.id);
        if (coverUrl) {
          await supabase
            .from('birthday_pages')
            .update({ cover_photo_url: coverUrl })
            .eq('id', data.id);
        }
      }

      setSaving(false);
      setCreatedPageId(data.id);
      toast.success('Birthday page created!');
    }
    
    setStep(prev => Math.min(prev + 1, 3) as Step);
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1) as Step);
  };

  const copyLink = (type: 'contribute' | 'birthday') => {
    if (!createdPageId) return;
    const baseUrl = window.location.origin;
    const link = type === 'contribute' 
      ? `${baseUrl}/contribute/${createdPageId}`
      : `${baseUrl}/birthday/${createdPageId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

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
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  step >= s.number 
                    ? "gradient-cta text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium transition-colors",
                  step >= s.number ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300",
                  step > s.number ? "gradient-cta" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-2">Who's the lucky one?</h2>
            <p className="text-muted-foreground mb-8">Tell us about the birthday person</p>

            <div className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-foreground">Recipient's Name *</Label>
                <Input
                  id="name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Sarah"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-foreground">Birthday Date *</Label>
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
                <Label htmlFor="message" className="text-foreground">Your Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  value={creatorMessage}
                  onChange={(e) => setCreatorMessage(e.target.value)}
                  placeholder="Add a special message from you..."
                  className="mt-2 min-h-[100px]"
                />
              </div>

              {/* Cover Photo Upload */}
              <div>
                <Label className="text-foreground">Cover Photo (optional)</Label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverPhotoSelect}
                  className="hidden"
                />
                
                {coverPhotoPreview ? (
                  <div className="relative mt-2 rounded-xl overflow-hidden border border-border">
                    <img 
                      src={coverPhotoPreview} 
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
        )}

        {/* Step 2: Choose Theme */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose a vibe</h2>
            <p className="text-muted-foreground mb-8">Select a theme that matches their personality</p>

            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(themeConfig) as Theme[]).map((themeKey) => {
                const theme = themeConfig[themeKey];
                const isSelected = selectedTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => setSelectedTheme(themeKey)}
                    className={cn(
                      "aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 border-2 relative",
                      `bg-gradient-to-br ${theme.primary}`,
                      isSelected 
                        ? "ring-4 ring-foreground/20 scale-105 border-primary-foreground" 
                        : "border-transparent hover:scale-102 opacity-80 hover:opacity-100"
                    )}
                  >
                    <span className="text-5xl">{theme.emoji}</span>
                    <span className="text-lg font-bold text-primary-foreground">{theme.name}</span>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-primary-foreground rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Share & Configure */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Your page is ready!</h2>
              <p className="text-muted-foreground">Share these links to start collecting wishes</p>
            </div>

            {/* Contribution Link */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">✉️</span>
                </div>
                <h3 className="font-bold text-foreground">Contribution Link</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Share this with friends to add messages</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => copyLink('contribute')}>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button variant="outline" size="icon">
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Birthday Link */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-lg">🎂</span>
                </div>
                <h3 className="font-bold text-foreground">Birthday Link</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Send this to {recipientName} on their birthday</p>
              <p className="text-xs text-amber-600 font-medium mb-4">⚠️ Don't share this yet!</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => copyLink('birthday')}>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button variant="outline" size="icon">
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-foreground">Page Settings</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="photos" className="text-sm text-foreground">Allow photo uploads</Label>
                <Switch id="photos" checked={allowPhotos} onCheckedChange={setAllowPhotos} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="names" className="text-sm text-foreground">Require names on messages</Label>
                <Switch id="names" checked={requireNames} onCheckedChange={setRequireNames} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && step < 3 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button variant="hero" onClick={handleNext} className="flex-1" disabled={saving || uploadingCover}>
              {(saving || uploadingCover) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingCover ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                <>
                  {step === 2 ? 'Create Page' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button variant="hero" onClick={() => navigate('/dashboard')} className="flex-1">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreatePage;
