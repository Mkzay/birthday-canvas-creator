import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Image,
  Loader2,
  QrCode,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import QRCodeModal from '@/components/QRCodeModal';
import SocialShareButtons from '@/components/SocialShareButtons';
import SoundtrackSelector from '@/components/SoundtrackSelector';
import ThemeSelector from '@/components/ThemeSelector';
import Header from '@/components/Header';
import { apiFetch, apiForm } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { cn } from '@/lib/utils';

type Theme = string;
type Step = 1 | 2 | 3;

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  gradient_mid?: string | null;
  gradient_angle?: number | null;
  accent_color?: string | null;
  font?: string | null;
}

const steps = [
  { number: 1, label: 'Details' },
  { number: 2, label: 'Theme' },
  { number: 3, label: 'Share' },
] as const;

const EditPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  const [recipientName, setRecipientName] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('elegant');
  const [letterColor, setLetterColor] = useState<string>('');
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [allowAudio, setAllowAudio] = useState(true);
  const [requireNames, setRequireNames] = useState(true);
  const [closeDate, setCloseDate] = useState<Date>();
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState('golden-hour');
  const [pageCustomAudio, setPageCustomAudio] = useState<File | null>(null);
  const [pageCustomAudioUrl, setPageCustomAudioUrl] = useState<string | null>(null);

  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState<'contribute' | 'birthday'>('contribute');
  const [publicCode, setPublicCode] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

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

  const fetchPage = useCallback(async () => {
    if (!user || !pageId) return;

    try {
      const data = await apiFetch<{
        recipient_name: string;
        birthday_date: string;
        creator_message: string | null;
        theme: string;
        letter_color: string | null;
        soundtrack_id: string | null;
        custom_audio_url: string | null;
        allow_photos: boolean;
        allow_audio: boolean;
        require_names: boolean;
        close_date: string | null;
        cover_photo_url: string | null;
        public_code: string;
      }>(`/pages/${pageId}`);

      setRecipientName(data.recipient_name);
      setBirthdayDate(parseLocalDate(data.birthday_date));
      setCreatorMessage(data.creator_message || '');
      setSelectedTheme(data.theme as Theme);
      setLetterColor(data.letter_color || '');
      setSelectedSoundtrackId(data.soundtrack_id || 'golden-hour');
      setAllowPhotos(data.allow_photos);
      setAllowAudio(data.allow_audio);
      setRequireNames(data.require_names);
      setCloseDate(data.close_date ? parseLocalDate(data.close_date) : undefined);
      setCurrentCoverUrl(data.cover_photo_url);
      setPageCustomAudioUrl(data.custom_audio_url);
      setPublicCode(data.public_code);
      setLoading(false);

      // If we are using a UUID but have a public code, redirect to use the public code in the URL
      if (pageId && /^[0-9a-f-]{36}$/i.test(pageId) && data.public_code) {
        navigate(`/edit/${data.public_code}`, { replace: true });
      }
    } catch (error) {
      toast.error('Page not found');
      console.error(error);
      navigate('/dashboard');
    }
  }, [navigate, pageId, user]);

  useEffect(() => {
    if (pageId && user) {
      void fetchPage();
      void fetchCustomThemes();
    }
  }, [fetchCustomThemes, fetchPage, pageId, user]);

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

  const handleCoverPhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    const formData = new FormData();
    formData.append('file', coverPhoto);
    formData.append('pageId', pageId);

    try {
      const data = await apiForm<{ url: string }>('/uploads/cover', formData);
      return data.url;
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload cover photo');
      return currentCoverUrl;
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

  const uploadPageSoundtrack = async (): Promise<string | null> => {
    if (!pageCustomAudio || !pageId) return pageCustomAudioUrl;

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
      console.error(error);
      toast.error('Failed to upload opening audio');
      return pageCustomAudioUrl;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!recipientName.trim()) {
        toast.error("Please enter the recipient's name");
        return;
      }
      if (!birthdayDate) {
        toast.error('Please select a birthday date');
        return;
      }
    }

    setStep((currentStep) => Math.min(currentStep + 1, 3) as Step);
  };

  const handleBack = () => {
    setStep((currentStep) => Math.max(currentStep - 1, 1) as Step);
  };

  const handleSave = async () => {
    if (!recipientName.trim()) {
      toast.error("Please enter the recipient's name");
      return;
    }
    if (!birthdayDate) {
      toast.error('Please select a birthday date');
      return;
    }

    setSaving(true);

    let coverUrl = currentCoverUrl;
    if (coverPhoto) {
      coverUrl = await uploadCoverPhoto();
    }

    let customAudioUrl = pageCustomAudioUrl;
    if (pageCustomAudio) {
      customAudioUrl = await uploadPageSoundtrack();
    }

    try {
      await apiFetch(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          recipientName,
          birthdayDate: format(birthdayDate, 'yyyy-MM-dd'),
          creatorMessage: creatorMessage || null,
          theme: selectedTheme,
          letterColor: letterColor || null,
          soundtrackId: selectedSoundtrackId,
          allowPhotos,
          allowAudio,
          requireNames,
          closeDate: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate, 'yyyy-MM-dd'),
          coverPhotoUrl: coverUrl,
          pageCustomAudioUrl: customAudioUrl,
        }),
      });
    } catch (error) {
      setSaving(false);
      toast.error('Failed to save changes');
      console.error(error);
      return;
    }

    setSaving(false);
    toast.success('Changes saved');
    navigate('/dashboard');
  };

  const copyLink = async (type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const shareTarget = publicCode || pageId;
    const link = type === 'contribute' ? `${baseUrl}/contribute/${shareTarget}` : `${baseUrl}/birthday/${shareTarget}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayCoverUrl = coverPhotoPreview || currentCoverUrl;

  return (
    <div className="min-h-screen app-shell">
      <Header backTo={{ label: 'Dashboard', href: '/dashboard' }} />

      <main className="mx-auto max-w-3xl px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
        <div className="panel-card mb-6 overflow-hidden p-6 sm:p-8">
          <span className="eyebrow-chip">Editor</span>
          <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-4xl">Edit the birthday page</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Update the details, refresh the look, and adjust sharing settings without digging through one long form.
          </p>

          <div className="mt-8 flex items-center justify-center">
            {steps.map((currentStep, index) => (
              <React.Fragment key={currentStep.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:h-10 sm:w-10 sm:text-sm',
                      step >= currentStep.number ? 'gradient-cta text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {step > currentStep.number ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : currentStep.number}
                  </div>
                  <span
                    className={cn(
                      'mt-1.5 text-[10px] font-medium transition-colors sm:mt-2 sm:text-xs',
                      step >= currentStep.number ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {currentStep.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-1.5 h-0.5 w-10 rounded-full transition-all duration-300 sm:mx-2 sm:h-1 sm:w-16 md:w-24',
                      step > currentStep.number ? 'gradient-cta' : 'bg-muted',
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="panel-card animate-fade-in-up p-6 sm:p-8">
            <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Update the essentials</h2>
            <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Tidy the page details first, then move on to styling and sharing.
            </p>

            <div className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-foreground">Recipient&apos;s Name</Label>
                <Input id="name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className="mt-2" />
              </div>

              <div>
                <Label className="text-foreground">Birthday Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('mt-2 w-full justify-start text-left font-normal', !birthdayDate && 'text-muted-foreground')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {birthdayDate ? format(birthdayDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={birthdayDate}
                      onSelect={setBirthdayDate}
                      initialFocus
                      className="pointer-events-auto p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-foreground">Stop collecting wishes</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('mt-2 w-full justify-start text-left font-normal', !closeDate && 'text-muted-foreground')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {closeDate ? format(closeDate, 'PPP') : 'Defaults to the birthday date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={closeDate}
                      onSelect={setCloseDate}
                      initialFocus
                      className="pointer-events-auto p-3"
                    />
                  </PopoverContent>
                </Popover>
                <p className="mt-2 text-xs text-muted-foreground">
                  New wishes and photo uploads will stop after this date.
                </p>
              </div>

              <div>
                <Label htmlFor="message" className="text-foreground">Your Personal Message</Label>
                <Textarea
                  id="message"
                  value={creatorMessage}
                  onChange={(event) => setCreatorMessage(event.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-foreground">Cover Photo</Label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*,.gif"
                  onChange={handleCoverPhotoSelect}
                  className="hidden"
                />

                {displayCoverUrl ? (
                  <div className="relative mt-2 overflow-hidden rounded-2xl border border-border bg-muted/20">
                    <img src={displayCoverUrl} alt="Cover preview" className="aspect-[16/10] max-h-[28rem] w-full object-cover" />
                    <button
                      type="button"
                      onClick={removeCoverPhoto}
                      className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-background"
                      aria-label="Remove selected cover photo"
                    >
                      <X className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className="mt-2 cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
                  >
                    <Image className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload a cover photo</p>
                    <p className="mt-1 text-xs text-muted-foreground">Shown as a wide hero image on the final page</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="panel-card animate-fade-in-up p-6 sm:p-8">
            <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Adjust the visual direction</h2>
            <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Change the page mood and soundtrack without scrolling through unrelated fields.
            </p>

            <ThemeSelector
              selectedTheme={selectedTheme}
              onSelect={setSelectedTheme}
              customThemes={customThemes}
              recipientName={recipientName}
            />

            <div className="mt-8">
              <Label className="text-foreground">Letter / envelope color</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional. Sets the paper color of the letter cards in the story. Leave empty to use the theme default.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  id="letter-color"
                  value={letterColor || '#f5f0e8'}
                  onChange={(e) => setLetterColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background"
                  aria-label="Choose letter color"
                />
                <Input
                  type="text"
                  placeholder="#f5f0e8"
                  value={letterColor}
                  onChange={(e) => setLetterColor(e.target.value)}
                  className="max-w-[10rem] font-mono text-sm"
                />
                {letterColor && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLetterColor('')}>
                    Use default
                  </Button>
                )}
              </div>
              <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 pr-4">
                <div
                  className="relative h-16 w-28 rounded-2xl border border-border/60 bg-gradient-to-b from-white/96 to-white/86 shadow-card-sm"
                  style={{
                    background: letterColor
                      ? `linear-gradient(180deg, ${letterColor} 0%, ${letterColor} 100%)`
                      : undefined,
                  }}
                >
                  <div className="absolute inset-x-2 top-2 h-4 rounded-xl border border-border/60 bg-white/82" />
                  <div className="absolute inset-x-3 bottom-3 h-2 rounded-full bg-black/5" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-foreground">Letter theme preview</p>
                  <p className="text-[11px] text-muted-foreground">
                    Approximate paper tone for the opening letter and keepsake cards.
                  </p>
                </div>
              </div>
            </div>

            <div className="panel-inset mt-8 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground">Opening soundtrack</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose one of the in-app tracks or upload a custom opening audio for the reveal.
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

        {step === 3 && (
          <div className="panel-card animate-fade-in-up p-6 sm:p-8">
            <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Share and finalize</h2>
            <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Copy the links you need, update contribution rules, then save everything at once.
            </p>

            <div className="panel-inset mb-4 p-4 sm:p-6">
              <h3 className="font-bold text-foreground">Share links</h3>
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2 text-sm" onClick={() => copyLink('contribute')}>
                    <Copy className="h-4 w-4 shrink-0" />
                    <span>Contribution Link</span>
                  </Button>
                  <Button variant="outline" className="px-3" onClick={() => { setQrType('contribute'); setQrModalOpen(true); }}>
                    <span className="sr-only">Show contribution QR code</span>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2 text-sm" onClick={() => copyLink('birthday')}>
                    <Copy className="h-4 w-4 shrink-0" />
                    <span>Birthday Link</span>
                  </Button>
                  <Button variant="outline" className="px-3" onClick={() => { setQrType('birthday'); setQrModalOpen(true); }}>
                    <span className="sr-only">Show birthday QR code</span>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-3 text-center text-xs text-muted-foreground">Share contribution link on social media</p>
                <SocialShareButtons
                  url={`${window.location.origin}/contribute/${publicCode || pageId}`}
                  message={`Help me celebrate ${recipientName}'s birthday. Add your wishes here:`}
                  recipientName={recipientName}
                />
              </div>
            </div>

            <div className="panel-inset p-4 sm:p-6">
              <h3 className="font-bold text-foreground">Contribution settings</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="photos" className="text-foreground">Allow Photo Uploads</Label>
                  <Switch id="photos" checked={allowPhotos} onCheckedChange={setAllowPhotos} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="audio" className="text-foreground">Allow Audio Wishes</Label>
                  <Switch id="audio" checked={allowAudio} onCheckedChange={setAllowAudio} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="names" className="text-foreground">Require names on messages</Label>
                  <Switch id="names" checked={requireNames} onCheckedChange={setRequireNames} />
                </div>
              </div>
            </div>
          </div>
        )}

        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          url={`${window.location.origin}/${qrType === 'contribute' ? 'contribute' : 'birthday'}/${publicCode || pageId}`}
          title={qrType === 'contribute' ? 'Contribution QR Code' : 'Birthday QR Code'}
          recipientName={recipientName}
        />

        <div className="panel-card mt-6 flex gap-3 p-4 sm:gap-4 sm:p-5">
          {step > 1 ? (
            <Button variant="outline" size="lg" onClick={handleBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')} className="flex-1">
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button variant="hero" size="lg" onClick={handleNext} className="flex-1">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="hero" size="lg" onClick={handleSave} className="flex-1" disabled={saving || uploadingCover}>
              {saving || uploadingCover ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingCover ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditPage;
