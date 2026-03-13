import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Copy, QrCode, Calendar, Image, X, Loader2, Palette } from 'lucide-react';
import SocialShareButtons from '@/components/SocialShareButtons';
import QRCodeModal from '@/components/QRCodeModal';
import ThemeSelector from '@/components/ThemeSelector';
import SoundtrackSelector from '@/components/SoundtrackSelector';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiFetch, apiForm } from '@/lib/api';

type Theme = string;
type Step = 1 | 2 | 3;

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
}

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

const CreatePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(user?.defaultTheme || 'elegant');
  const [allowPhotos, setAllowPhotos] = useState(user?.defaultAllowPhotos ?? true);
  const [requireNames, setRequireNames] = useState(user?.defaultRequireNames ?? true);
  const [closeDate, setCloseDate] = useState<Date>();
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState('golden-hour');
  const [pageCustomAudio, setPageCustomAudio] = useState<File | null>(null);
  const [pageCustomAudioUrl, setPageCustomAudioUrl] = useState<string | null>(null);
  
  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // QR code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState<'contribute' | 'birthday'>('contribute');
  const [createdPublicCode, setCreatedPublicCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchCustomThemes = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiFetch<CustomTheme[]>('/themes');
      setCustomThemes(data || []);
    } catch (error) {
      toast.error('Failed to load custom themes');
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setSelectedTheme(user.defaultTheme || 'elegant');
      setAllowPhotos(user.defaultAllowPhotos ?? true);
      setRequireNames(user.defaultRequireNames ?? true);
      void fetchCustomThemes();
    }
  }, [fetchCustomThemes, user]);

  useEffect(() => {
    return () => {
      if (coverPhotoPreview) {
        URL.revokeObjectURL(coverPhotoPreview);
      }
      if (pageCustomAudioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pageCustomAudioUrl);
      }
    };
  }, [coverPhotoPreview, pageCustomAudioUrl]);

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
    const formData = new FormData();
    formData.append('file', coverPhoto);
    formData.append('pageId', pageId);

    try {
      const data = await apiForm<{ url: string }>('/uploads/cover', formData);
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload cover photo');
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCustomAudioSelect = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Audio must be less than 8MB');
      return;
    }

    if (pageCustomAudioUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pageCustomAudioUrl);
    }

    setPageCustomAudio(file);
    setPageCustomAudioUrl(URL.createObjectURL(file));
  };

  const removeCustomAudio = () => {
    setPageCustomAudio(null);
    if (pageCustomAudioUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pageCustomAudioUrl);
    }
    setPageCustomAudioUrl(null);
  };

  const uploadPageSoundtrack = async (pageId: string): Promise<string | null> => {
    if (!pageCustomAudio) return pageCustomAudioUrl;

    const formData = new FormData();
    formData.append('file', pageCustomAudio);
    formData.append('pageId', pageId);

    try {
      const data = await apiForm<{ url: string }>('/uploads/page-soundtrack', formData);
      if (pageCustomAudioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pageCustomAudioUrl);
      }
      setPageCustomAudio(null);
      setPageCustomAudioUrl(data.url);
      return data.url;
    } catch (error) {
      console.error('Audio upload error:', error);
      toast.error('Failed to upload opening audio');
      return null;
    }
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
      setSaving(true);
      try {
        const data = await apiFetch<{ id: string; public_code: string }>('/pages', {
          method: 'POST',
          body: JSON.stringify({
            recipientName,
            birthdayDate: format(birthdayDate!, 'yyyy-MM-dd'),
            theme: selectedTheme,
            creatorMessage: creatorMessage || null,
            soundtrackId: selectedSoundtrackId,
            allowPhotos,
            requireNames,
            closeDate: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate!, 'yyyy-MM-dd'),
          }),
        });

        if (coverPhoto) {
          const coverUrl = await uploadCoverPhoto(data.id);
          if (!coverUrl) {
            setSaving(false);
            return;
          }
        }

        if (pageCustomAudio) {
          const audioUrl = await uploadPageSoundtrack(data.id);
          if (!audioUrl) {
            setSaving(false);
            return;
          }
        }

        setCreatedPageId(data.id);
        setCreatedPublicCode(data.public_code);
        toast.success('Birthday page created!');
      } catch (error) {
        setSaving(false);
        toast.error('Failed to create page');
        console.error(error);
        return;
      }
      setSaving(false);
    }
    
    setStep(prev => Math.min(prev + 1, 3) as Step);
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1) as Step);
  };

  const updateCreatedPageSettings = useCallback(async (nextAllowPhotos: boolean, nextRequireNames: boolean) => {
    if (!createdPageId) return;

    try {
      await apiFetch(`/pages/${createdPageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          recipientName,
          birthdayDate: format(birthdayDate!, 'yyyy-MM-dd'),
          theme: selectedTheme,
          creatorMessage: creatorMessage || null,
          soundtrackId: selectedSoundtrackId,
          allowPhotos: nextAllowPhotos,
          requireNames: nextRequireNames,
          closeDate: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate!, 'yyyy-MM-dd'),
          pageCustomAudioUrl,
        }),
      });
    } catch (error) {
      toast.error('Failed to update page settings');
      console.error(error);
    }
  }, [birthdayDate, closeDate, createdPageId, creatorMessage, pageCustomAudioUrl, recipientName, selectedSoundtrackId, selectedTheme]);

  const handleAllowPhotosChange = (checked: boolean) => {
    setAllowPhotos(checked);
    void updateCreatedPageSettings(checked, requireNames);
  };

  const handleRequireNamesChange = (checked: boolean) => {
    setRequireNames(checked);
    void updateCreatedPageSettings(allowPhotos, checked);
  };

  const copyLink = async (type: 'contribute' | 'birthday') => {
    if (!createdPageId) return;
    const baseUrl = window.location.origin;
    const shareId = createdPublicCode || createdPageId;
    const link = type === 'contribute' 
      ? `${baseUrl}/contribute/${shareId}`
      : `${baseUrl}/birthday/${shareId}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  return (
    <div className="min-h-screen app-shell">
      {/* Header */}
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-cta flex items-center justify-center text-lg sm:text-xl">
              🎨
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">WishCanvas</span>
          </Link>
          
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 sm:gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="panel-card mb-6 overflow-hidden p-6 sm:p-8">
          <span className="eyebrow-chip">Birthday page builder</span>
          <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-4xl">Shape the surprise before anyone sees it</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Move from setup to theme to sharing without losing the emotional feel of the final page.
          </p>

        {/* Progress Indicator */}
        <div className="mt-8 flex items-center justify-center">
          {steps.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300",
                  step >= s.number 
                    ? "gradient-cta text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.number ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : s.number}
                </div>
                <span className={cn(
                  "text-[10px] sm:text-xs mt-1.5 sm:mt-2 font-medium transition-colors",
                  step >= s.number ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-10 sm:w-16 md:w-24 h-0.5 sm:h-1 mx-1.5 sm:mx-2 rounded-full transition-all duration-300",
                  step > s.number ? "gradient-cta" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
        </div>

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="panel-card animate-fade-in-up p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">Who&apos;s the lucky one?</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Tell us about the birthday person</p>

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
                <Label className="text-foreground">Stop collecting wishes (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-2 justify-start text-left font-normal",
                        !closeDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {closeDate ? format(closeDate, "PPP") : "Defaults to the birthday date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={closeDate}
                      onSelect={setCloseDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="mt-2 text-xs text-muted-foreground">
                  New wishes and photo uploads will close after this date.
                </p>
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
                  accept="image/*,.gif"
                  onChange={handleCoverPhotoSelect}
                  className="hidden"
                />
                
                {coverPhotoPreview ? (
                  <div className="relative mt-2 overflow-hidden rounded-2xl border border-border bg-muted/20">
                    <img 
                      src={coverPhotoPreview} 
                      alt="Cover preview" 
                      className="aspect-[16/10] max-h-[28rem] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeCoverPhoto}
                      className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                      aria-label="Remove selected cover photo"
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
                    <p className="mt-1 text-xs text-muted-foreground">Shown as a wide hero image on the final page</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Choose Theme */}
        {step === 2 && (
          <div className="panel-card animate-fade-in-up p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">Choose a vibe</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Select a theme that matches their personality</p>

            <ThemeSelector
              selectedTheme={selectedTheme}
              onSelect={setSelectedTheme}
              customThemes={customThemes}
            />

            <div className="panel-inset mt-8 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground">Opening soundtrack</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose one of the in-app soundtracks or upload your own short opening audio for the reveal.
              </p>
              <div className="mt-5">
                <SoundtrackSelector
                  selectedSoundtrackId={selectedSoundtrackId}
                  onSelectSoundtrackId={setSelectedSoundtrackId}
                  customAudioUrl={pageCustomAudioUrl}
                  onSelectCustomAudio={handleCustomAudioSelect}
                  onRemoveCustomAudio={removeCustomAudio}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Share & Configure */}
        {step === 3 && (
          <div className="panel-card animate-fade-in-up p-6 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎉</div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">Your page is ready!</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Share these links to start collecting wishes</p>
            </div>

            {/* Contribution Link */}
            <div className="panel-inset p-4 sm:p-6 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-base sm:text-lg">✉️</span>
                </div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">Contribution Link</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Share this with friends to add messages</p>
              <div className="flex gap-2 mb-3 sm:mb-4">
                <Button variant="outline" size="sm" className="flex-1 gap-2 text-sm" onClick={() => copyLink('contribute')}>
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" className="px-3" onClick={() => { setQrType('contribute'); setQrModalOpen(true); }}>
                  <span className="sr-only">Show contribution QR code</span>
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 sm:mb-3">Share directly on social media</p>
                <SocialShareButtons 
                  url={`${window.location.origin}/contribute/${createdPublicCode || createdPageId}`}
                  message={`🎂 Help me celebrate ${recipientName}'s birthday! Add your wishes here:`}
                  recipientName={recipientName}
                />
              </div>
            </div>

            {/* Birthday Link */}
            <div className="panel-inset p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-base sm:text-lg">🎂</span>
                </div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">Birthday Link</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Send this to {recipientName} on their birthday</p>
              <p className="text-xs text-amber-600 font-medium mb-3 sm:mb-4">⚠️ Don't share this yet!</p>
              <div className="flex gap-2 mb-3 sm:mb-4">
                <Button variant="outline" size="sm" className="flex-1 gap-2 text-sm" onClick={() => copyLink('birthday')}>
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" className="px-3" onClick={() => { setQrType('birthday'); setQrModalOpen(true); }}>
                  <span className="sr-only">Show birthday QR code</span>
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
              <Link to={`/preview/${createdPublicCode || createdPageId}`} className="block">
                <Button variant="hero" size="sm" className="w-full gap-2 text-xs sm:text-sm">
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  View Preview
                </Button>
              </Link>
            </div>

            {/* QR Code Modal */}
            <QRCodeModal
              open={qrModalOpen}
              onOpenChange={setQrModalOpen}
              url={`${window.location.origin}/${qrType === 'contribute' ? 'contribute' : 'birthday'}/${createdPublicCode || createdPageId}`}
              title={qrType === 'contribute' ? 'Contribution QR Code' : 'Birthday QR Code'}
              recipientName={recipientName}
            />

            {/* Settings */}
            <div className="panel-inset p-4 sm:p-6 space-y-3 sm:space-y-4">
              <h3 className="font-bold text-foreground text-sm sm:text-base">Page Settings</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="photos" className="text-xs sm:text-sm text-foreground">Allow photo uploads</Label>
                <Switch id="photos" checked={allowPhotos} onCheckedChange={handleAllowPhotosChange} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="names" className="text-xs sm:text-sm text-foreground">Require names on messages</Label>
                <Switch id="names" checked={requireNames} onCheckedChange={handleRequireNamesChange} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="panel-card mt-6 flex gap-3 p-4 sm:gap-4 sm:p-5">
          {step > 1 && step < 3 && (
            <Button variant="outline" size="default" onClick={handleBack} className="flex-1 text-sm">
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button variant="hero" size="default" onClick={handleNext} className="flex-1 text-sm" disabled={saving || uploadingCover}>
              {(saving || uploadingCover) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                  {uploadingCover ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                <>
                  {step === 2 ? 'Create Page' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button variant="hero" size="default" onClick={() => navigate('/dashboard')} className="flex-1 text-sm">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreatePage;
