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
  Lock,
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
import { ApiError, apiFetch, apiForm } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { visualThemeConfig } from '@/lib/themes';

type Theme = string;
type DisplayMode = 'story' | 'freeform' | 'bento';
type Step = 1 | 2 | 3;

const displayModes: Array<{ id: DisplayMode; label: string; description: string }> = [
  { id: 'story', label: 'Story', description: 'Guided reveal flow' },
  { id: 'freeform', label: 'Freeform', description: 'Scrapbook-style layout' },
  { id: 'bento', label: 'Bento', description: 'Structured card grid' },
];

function getEffectiveColors(
  selectedTheme: string,
  letterColor: string | null | undefined,
  customThemes: CustomTheme[],
) {
  if (letterColor) {
    const [start, end] = letterColor.split(',').map((c) => c.trim());
    return { start, end };
  }

  // Check custom themes
  const custom = customThemes.find((t) => t.id === selectedTheme);
  if (custom) {
    return { start: custom.gradient_from, end: custom.gradient_to };
  }

  // Check built-in themes
  const config = visualThemeConfig[selectedTheme as keyof typeof visualThemeConfig];
  if (config && config.colors && config.colors.length >= 2) {
    return { start: config.colors[0], end: config.colors[1] };
  }

  return { start: '#f5f0e8', end: '#eadfce' };
}

function LetterThemePreview({ startColor, endColor, recipientName }: { startColor: string; endColor: string; recipientName: string }) {
  return (
    <div className="relative h-36 w-52 overflow-hidden rounded-[1.35rem] border border-border/60 bg-gradient-to-br from-white to-muted/50 p-3 shadow-card-sm">
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 rounded-[1rem]"
          style={{
            background: `linear-gradient(145deg, ${startColor}, ${endColor})`,
            boxShadow: '0 14px 26px rgba(15, 23, 42, 0.16)',
          }}
        />
        <div className="absolute inset-[1px] rounded-[0.95rem] border border-white/60" />
        <div
          className="absolute left-1/2 top-0 h-[52%] w-[92%] -translate-x-1/2 origin-top rounded-[0.9rem]"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            background: `linear-gradient(145deg, ${endColor}, ${startColor})`,
          }}
        />
        <div
          className="absolute bottom-[10%] left-1/2 h-[55%] w-[90%] -translate-x-1/2 rounded-[0.85rem] border border-black/10"
          style={{
            background: `linear-gradient(180deg, ${startColor}, ${endColor})`,
          }}
        />
        <div
          className="absolute left-1/2 top-[24%] h-[40%] w-[74%] -translate-x-1/2 rounded-[0.7rem] border border-black/10 px-2.5 py-2 text-left"
          style={{
            background: `linear-gradient(180deg, ${endColor}, ${startColor})`,
          }}
        >
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-foreground/65">To</p>
          <p className="mt-1 line-clamp-1 text-xs font-bold text-foreground">{recipientName || 'Birthday Star'}</p>
          <p className="mt-1 line-clamp-1 text-[9px] text-foreground/70">Open when ready for the story.</p>
        </div>
        <div
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/65 shadow-sm"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${startColor}, ${endColor})`,
          }}
        />
      </div>
    </div>
  );
}

function FreeformThemePreview({ startColor, endColor, recipientName }: { startColor: string; endColor: string; recipientName: string }) {
  return (
    <div className="relative h-44 w-52 flex flex-col items-center justify-center p-3">
       <div className="mx-auto w-fit rounded-md bg-white px-3 pb-3 pt-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
        <div 
          className="relative mx-auto h-3 w-10 -translate-y-1.5 rounded-sm transition-colors duration-500" 
          style={{ backgroundColor: `${endColor}cc` }} 
        />
        <div 
          className="relative h-[8.5rem] w-[9.2rem] overflow-hidden rounded-sm transition-colors duration-500 flex flex-col items-center justify-center text-center p-2" 
          style={{ background: `linear-gradient(145deg, ${startColor}, ${endColor})` }}
        >
          <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-white/70">Happy Birthday</p>
          <p className="mt-1 text-base font-bold text-white leading-tight drop-shadow-sm">{recipientName || 'Name'}</p>
          <div className="mt-2 h-0.5 w-6 bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ mode, startColor, endColor, recipientName }: { mode: DisplayMode; startColor: string; endColor: string; recipientName: string }) {
  if (mode === 'story') {
    return <LetterThemePreview startColor={startColor} endColor={endColor} recipientName={recipientName} />;
  }
  if (mode === 'freeform') {
    return <FreeformThemePreview startColor={startColor} endColor={endColor} recipientName={recipientName} />;
  }
  return (
    <div className="flex h-36 w-52 items-center justify-center rounded-[1.35rem] border border-dashed border-border/60 bg-muted/20 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
      Bento Preview
    </div>
  );
}

function ModePreview({ mode }: { mode: DisplayMode }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/35 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live preview</p>
        <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {mode === 'story' ? 'Story flow' : mode === 'freeform' ? 'Freeform board' : 'Bento grid'}
        </span>
      </div>

      {mode === 'story' && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
            <div className="flex w-full gap-2 px-2 py-2">
              <div className="w-[70%] shrink-0 rounded-lg border border-border/60 bg-gradient-to-br from-amber-100/70 to-rose-100/70 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">Slide 1</p>
                <p className="mt-1 text-xs font-medium text-foreground">Cover reveal</p>
              </div>
              <div className="w-[70%] shrink-0 rounded-lg border border-border/50 bg-background/75 p-2 opacity-80">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Slide 2</p>
                <p className="mt-1 text-xs text-foreground">Birthday stats</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-foreground/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/35" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/35" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/35" />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Swipe or next controls</p>
          </div>
        </div>
      )}

      {mode === 'freeform' && (
        <div className="columns-2 [column-gap:0.5rem]">
          <article className="relative mb-2 inline-block w-full break-inside-avoid rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-900 shadow-sm [transform:rotate(-1.5deg)]">
            <span className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-sm bg-amber-200/80" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Nora</p>
            <p className="mt-1 text-[11px] leading-snug">You made this year brighter for everyone.</p>
          </article>
          <article className="relative mb-2 inline-block w-full break-inside-avoid rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-900 shadow-sm [transform:rotate(1.2deg)]">
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-rose-400/85" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Jules</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <div className="h-7 rounded-md border border-white/65 bg-white/70" />
              <div className="h-7 rounded-md border border-white/65 bg-white/70" />
            </div>
          </article>
          <article className="relative mb-2 inline-block w-full break-inside-avoid rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2 text-sky-900 shadow-sm [transform:rotate(-0.8deg)]">
            <span className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-sm bg-sky-200/85" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Amara</p>
            <p className="mt-1 text-[11px]">Voice note + message</p>
          </article>
        </div>
      )}

      {mode === 'bento' && (
        <div className="grid h-32 grid-cols-3 gap-2">
          <div className="col-span-2 rounded-xl border border-border/70 bg-background/80" />
          <div className="row-span-2 rounded-xl border border-border/70 bg-background/80" />
          <div className="rounded-xl border border-border/70 bg-background/75" />
          <div className="rounded-xl border border-border/70 bg-background/75" />
        </div>
      )}
    </div>
  );
}

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

const DEFAULT_LETTER_START = '#f5f0e8';
const DEFAULT_LETTER_END = '#eadfce';

function normalizeHexColor(value: string, fallback: string) {
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback;
}

function normalizePastedHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortMatch = withHash.match(/^#([0-9a-f]{3})$/i);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : null;
}

function parseLetterGradientValue(value: string) {
  const [startRaw, endRaw] = value.split(',').map((part) => part.trim());
  const start = normalizeHexColor(startRaw || '', DEFAULT_LETTER_START);
  const end = normalizeHexColor(endRaw || start, start);
  return { start, end };
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDatetime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const EditPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('elegant');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>('story');
  const [letterColor, setLetterColor] = useState<string>('');
  const [letterGradientStart, setLetterGradientStart] = useState(DEFAULT_LETTER_START);
  const [letterGradientEnd, setLetterGradientEnd] = useState(DEFAULT_LETTER_END);
  const [letterStartHexInput, setLetterStartHexInput] = useState(DEFAULT_LETTER_START);
  const [letterEndHexInput, setLetterEndHexInput] = useState(DEFAULT_LETTER_END);
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [allowAudio, setAllowAudio] = useState(true);
  const [requireNames, setRequireNames] = useState(true);
  const [closeDate, setCloseDate] = useState<Date>();
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState('golden-hour');
  const [pageCustomAudioUrl, setPageCustomAudioUrl] = useState<string | null>(null);

  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState<'contribute' | 'birthday'>('contribute');
  const [publicCode, setPublicCode] = useState('');
  const [publicCodeInput, setPublicCodeInput] = useState('');
  const [publicCodeError, setPublicCodeError] = useState<string | null>(null);
  const [revealAtInput, setRevealAtInput] = useState('');
  const [revealPinInput, setRevealPinInput] = useState('');
  const [hasRevealPin, setHasRevealPin] = useState(false);
  const isProUser = user?.planTier === 'pro';

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
        recipient_email: string | null;
        birthday_date: string;
        creator_message: string | null;
        theme: string;
        display_mode?: DisplayMode;
        letter_color: string | null;
        soundtrack_id: string | null;
        custom_audio_url: string | null;
        allow_photos: boolean;
        allow_audio: boolean;
        require_names: boolean;
        close_date: string | null;
        cover_photo_url: string | null;
        public_code: string;
        reveal_at: string | null;
        reveal_pin_set?: boolean;
      }>(`/pages/${pageId}`);

      setRecipientName(data.recipient_name);
      setRecipientEmail(data.recipient_email || '');
      setBirthdayDate(parseLocalDate(data.birthday_date));
      setCreatorMessage(data.creator_message || '');
      setSelectedTheme(data.theme as Theme);
      setSelectedDisplayMode(isProUser ? (data.display_mode || 'story') : 'story');
      setLetterColor(data.letter_color || '');
      if (data.letter_color) {
        const parsed = parseLetterGradientValue(data.letter_color);
        setLetterGradientStart(parsed.start);
        setLetterGradientEnd(parsed.end);
        setLetterStartHexInput(parsed.start);
        setLetterEndHexInput(parsed.end);
      } else {
        setLetterGradientStart(DEFAULT_LETTER_START);
        setLetterGradientEnd(DEFAULT_LETTER_END);
        setLetterStartHexInput(DEFAULT_LETTER_START);
        setLetterEndHexInput(DEFAULT_LETTER_END);
      }
      setSelectedSoundtrackId(data.soundtrack_id || 'golden-hour');
      setAllowPhotos(data.allow_photos);
      setAllowAudio(data.allow_audio);
      setRequireNames(data.require_names);
      setCloseDate(data.close_date ? parseLocalDate(data.close_date) : undefined);
      setCurrentCoverUrl(data.cover_photo_url);
      setPageCustomAudioUrl(data.custom_audio_url);
      setPublicCode(data.public_code);
      setPublicCodeInput(data.public_code);
      setRevealAtInput(toDatetimeLocalValue(data.reveal_at));
      setHasRevealPin(Boolean(data.reveal_pin_set));
      setRevealPinInput('');
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
  }, [isProUser, navigate, pageId, user]);

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
    };
  }, [coverPhotoPreview]);

  useEffect(() => {
    if (!isProUser && selectedDisplayMode !== 'story') {
      setSelectedDisplayMode('story');
    }
  }, [isProUser, selectedDisplayMode]);

  useEffect(() => {
    setLetterStartHexInput(letterGradientStart);
  }, [letterGradientStart]);

  useEffect(() => {
    setLetterEndHexInput(letterGradientEnd);
  }, [letterGradientEnd]);

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

  const handleCustomAudioUrlChange = (url: string | null) => {
    setPageCustomAudioUrl(url);
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

    setPublicCodeError(null);
    const normalizedPublicCode = publicCodeInput.trim().toLowerCase();
    if (isProUser && !/^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/.test(normalizedPublicCode)) {
      setPublicCodeError('Use 6-40 chars with lowercase letters, numbers, and hyphens.');
      setSaving(false);
      return;
    }

    setSaving(true);

    let coverUrl = currentCoverUrl;
    if (coverPhoto) {
      coverUrl = await uploadCoverPhoto();
    }

    try {
      await apiFetch(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          recipientName,
          recipientEmail: recipientEmail.trim() || null,
          birthdayDate: format(birthdayDate, 'yyyy-MM-dd'),
          creatorMessage: creatorMessage || null,
          theme: selectedTheme,
          displayMode: isProUser ? selectedDisplayMode : 'story',
          letterColor: letterColor || null,
          soundtrackId: selectedSoundtrackId,
          allowPhotos,
          allowAudio,
          requireNames,
          closeDate: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate, 'yyyy-MM-dd'),
          coverPhotoUrl: coverUrl,
          pageCustomAudioUrl,
          revealAt: isProUser ? toIsoDatetime(revealAtInput) : undefined,
          revealPin: isProUser
            ? (revealPinInput.trim() ? revealPinInput.trim() : (hasRevealPin ? undefined : null))
            : undefined,
          publicCode: isProUser ? normalizedPublicCode : undefined,
        }),
      });
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && error.status === 409) {
        setPublicCodeError('That custom link is already taken. Try another one.');
        toast.error('Custom link already taken');
        return;
      }
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
    return <WishCanvasLoader />;
  }

  const displayCoverUrl = coverPhotoPreview || currentCoverUrl;

  return (
    <div className="min-h-screen app-shell">
      <Header backTo={{ label: 'Back', useHistory: true, href: '/dashboard' }} />

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
                <Label htmlFor="recipientEmail">Recipient Email (optional)</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  className="mt-2"
                  placeholder="e.g., esther@example.com"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  If provided, birthday-day notification is sent to this address.
                </p>
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
                    <div className="relative h-[58vw] min-h-[13rem] max-h-[32rem] sm:h-[24rem]">
                      <img
                        src={displayCoverUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-45"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-black/5" />
                      <img src={displayCoverUrl} alt="Cover preview" className="relative z-10 h-full w-full object-contain" />
                    </div>
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
                    <p className="mt-1 text-xs text-muted-foreground">Preview shows the full image so you can frame it better</p>
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

            <div className="panel-inset mt-4 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground">Birthday page view</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isProUser
                  ? 'Only you can choose the recipient-facing view style.'
                  : 'Free plan uses Story view. Upgrade to Pro to unlock Freeform and Bento.'}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {displayModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      if (!isProUser && mode.id !== 'story') return;
                      setSelectedDisplayMode(mode.id);
                    }}
                    disabled={!isProUser && mode.id !== 'story'}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      selectedDisplayMode === mode.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/70 bg-background/70 text-foreground hover:border-primary/40',
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {mode.label}
                      {!isProUser && mode.id !== 'story' && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{mode.description}</p>
                    {!isProUser && mode.id !== 'story' && (
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700">Pro</p>
                    )}
                  </button>
                ))}
              </div>
              <ModePreview mode={selectedDisplayMode} />
            </div>

            <div className="mt-8">
              <Label className="text-foreground">Letter / envelope color</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional. Use one or two tones for the paper mood. Leave empty to use the theme default.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                  <Label htmlFor="letter-color-start" className="text-xs text-muted-foreground">Start</Label>
                  <input
                    type="color"
                    id="letter-color-start"
                    value={letterGradientStart}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setLetterGradientStart(nextStart);
                      setLetterColor(`${nextStart},${letterGradientEnd}`);
                    }}
                    className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background"
                    aria-label="Choose letter gradient start color"
                  />
                </div>
                <Input
                  value={letterStartHexInput}
                  onChange={(event) => setLetterStartHexInput(event.target.value)}
                  onBlur={() => {
                    const normalized = normalizePastedHex(letterStartHexInput);
                    if (!normalized) {
                      setLetterStartHexInput(letterGradientStart);
                      return;
                    }
                    setLetterGradientStart(normalized);
                    setLetterColor(`${normalized},${letterGradientEnd}`);
                  }}
                  placeholder="#f5f0e8"
                  className="h-10 w-[8.5rem] font-mono text-xs"
                  aria-label="Paste letter gradient start color code"
                />
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                  <Label htmlFor="letter-color-end" className="text-xs text-muted-foreground">End</Label>
                  <input
                    type="color"
                    id="letter-color-end"
                    value={letterGradientEnd}
                    onChange={(e) => {
                      const nextEnd = e.target.value;
                      setLetterGradientEnd(nextEnd);
                      setLetterColor(`${letterGradientStart},${nextEnd}`);
                    }}
                    className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background"
                    aria-label="Choose letter gradient end color"
                  />
                </div>
                <Input
                  value={letterEndHexInput}
                  onChange={(event) => setLetterEndHexInput(event.target.value)}
                  onBlur={() => {
                    const normalized = normalizePastedHex(letterEndHexInput);
                    if (!normalized) {
                      setLetterEndHexInput(letterGradientEnd);
                      return;
                    }
                    setLetterGradientEnd(normalized);
                    setLetterColor(`${letterGradientStart},${normalized}`);
                  }}
                  placeholder="#eadfce"
                  className="h-10 w-[8.5rem] font-mono text-xs"
                  aria-label="Paste letter gradient end color code"
                />
                {letterColor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLetterColor('');
                      setLetterGradientStart(DEFAULT_LETTER_START);
                      setLetterGradientEnd(DEFAULT_LETTER_END);
                      setLetterStartHexInput(DEFAULT_LETTER_START);
                      setLetterEndHexInput(DEFAULT_LETTER_END);
                    }}
                  >
                    Use default
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">You can paste hex values like #f5f0e8, f5f0e8, or #abc.</p>

              {(() => {
                const { start, end } = getEffectiveColors(selectedTheme, letterColor, customThemes);
                return (
                  <div className="mt-4 flex w-full flex-col items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:pr-4">
                    <div className="order-2 sm:order-1">
                      <ThemePreview mode={selectedDisplayMode} startColor={start} endColor={end} recipientName={recipientName} />
                    </div>
                    <div className="order-1 space-y-0.5 text-xs sm:order-2">
                      <p className="font-semibold text-foreground">
                        {selectedDisplayMode === 'story' ? 'Letter theme preview' : 'Freeform opener preview'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedDisplayMode === 'story'
                          ? 'Mirrors the opening envelope layout used on the birthday page.'
                          : 'Shows the polaroid-style reveal used in Freeform mode.'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="panel-inset mt-8 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground">Opening soundtrack</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose one of the in-app tracks or paste a YouTube custom link for the reveal.
              </p>
              <div className="mt-5">
                <SoundtrackSelector
                  selectedSoundtrackId={selectedSoundtrackId}
                  onSelectSoundtrackId={setSelectedSoundtrackId}
                  customAudioUrl={pageCustomAudioUrl}
                  onChangeCustomAudioUrl={handleCustomAudioUrlChange}
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

            <div className="panel-inset mb-4 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-foreground">Pro controls</h3>
                <span className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  isProUser ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                )}>
                  {isProUser ? 'Pro active' : 'Pro required'}
                </span>
              </div>
              {isProUser ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="publicCode" className="text-foreground">Custom public link</Label>
                    <Input
                      id="publicCode"
                      value={publicCodeInput}
                      onChange={(event) => {
                        setPublicCodeInput(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        setPublicCodeError(null);
                      }}
                      className="mt-2"
                      placeholder="e.g. ada-birthday-2026"
                    />
                    {publicCodeError && (
                      <p className="mt-2 text-xs font-medium text-destructive">{publicCodeError}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Used for both contribution and birthday links. 6-40 chars, lowercase letters, numbers, and hyphens.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="revealAt" className="text-foreground">Scheduled reveal date and time</Label>
                    <Input
                      id="revealAt"
                      type="datetime-local"
                      value={revealAtInput}
                      onChange={(event) => setRevealAtInput(event.target.value)}
                      className="mt-2"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Leave empty to reveal automatically on the birthday date. Set a future date/time for timed unlock.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="revealPin" className="text-foreground">Secret reveal PIN</Label>
                    <Input
                      id="revealPin"
                      value={revealPinInput}
                      onChange={(event) => setRevealPinInput(event.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="mt-2"
                      inputMode="numeric"
                      placeholder={hasRevealPin ? 'Leave blank to keep current PIN' : '4 to 12 digit PIN'}
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {hasRevealPin
                          ? 'A PIN is currently active for this page.'
                          : 'Set a PIN to require unlock before wishes are shown.'}
                      </p>
                      {hasRevealPin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                          onClick={() => {
                            setRevealPinInput('');
                            setHasRevealPin(false);
                          }}
                        >
                          Remove PIN
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Custom links, scheduled reveal, and secret PIN unlock are available on Pro.
                  </p>
                  <Button type="button" variant="outline" className="mt-3" onClick={() => navigate('/upgrade')}>
                    Upgrade to Pro
                  </Button>
                </div>
              )}
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
