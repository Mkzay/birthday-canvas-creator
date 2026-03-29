import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Copy, Eye, QrCode, Calendar, Image, X, Loader2, Palette, Lock } from 'lucide-react';
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
import { ApiError, apiFetch, apiForm } from '@/lib/api';
import Header from '@/components/Header';
import OpenerThemePreview from '@/components/OpenerThemePreview';
import { builtInThemeMap, visualThemeConfig } from '@/lib/themes';

type Theme = string;
type DisplayMode = 'story' | 'freeform' | 'bento';
type Step = 1 | 2 | 3;

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  gradient_mid?: string | null;
  gradient_angle?: number | null;
}

interface PaystackBankOption {
  code: string;
  name: string;
}

function getEffectiveColors(
  selectedTheme: string,
  letterColor: string | null | undefined,
  customThemes: CustomTheme[],
) {
  if (letterColor) {
    const [first, second, third] = letterColor.split(',').map((c) => c.trim()).filter(Boolean);
    if (third) {
      return { start: first, mid: second, end: third, angle: null as number | null };
    }
    return { start: first, mid: null as string | null, end: second || first, angle: null as number | null };
  }

  // Check custom themes
  const custom = customThemes.find((t) => t.id === selectedTheme);
  if (custom) {
    return {
      start: custom.gradient_from,
      mid: custom.gradient_mid || null,
      end: custom.gradient_to,
      angle: custom.gradient_angle ?? null,
    };
  }

  // Check built-in themes
  const config = visualThemeConfig[selectedTheme as keyof typeof visualThemeConfig];
  if (config && config.colors && config.colors.length >= 2) {
    const end = config.colors[config.colors.length - 1];
    return {
      start: config.colors[0],
      mid: config.colors.length > 2 ? config.colors[1] : null,
      end,
      angle: null as number | null,
    };
  }

  return { start: '#f5f0e8', mid: null as string | null, end: '#eadfce', angle: null as number | null };
}

const displayModes: Array<{ id: DisplayMode; label: string; description: string }> = [
  { id: 'story', label: 'Story', description: 'Guided reveal flow' },
  { id: 'freeform', label: 'Freeform', description: 'Scrapbook-style layout' },
  { id: 'bento', label: 'Bento', description: 'Structured card grid' },
];

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

const DEFAULT_LETTER_START = '#f5f0e8';
const DEFAULT_LETTER_END = '#eadfce';

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

function toIsoDatetime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const CreatePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(user?.defaultTheme || 'elegant');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>('story');
  const [letterColor, setLetterColor] = useState<string>('');
  const [letterGradientStart, setLetterGradientStart] = useState(DEFAULT_LETTER_START);
  const [letterGradientEnd, setLetterGradientEnd] = useState(DEFAULT_LETTER_END);
  const [letterStartHexInput, setLetterStartHexInput] = useState(DEFAULT_LETTER_START);
  const [letterEndHexInput, setLetterEndHexInput] = useState(DEFAULT_LETTER_END);
  const [allowPhotos, setAllowPhotos] = useState(user?.defaultAllowPhotos ?? true);
  const [allowAudio, setAllowAudio] = useState(user?.defaultAllowAudio ?? true);
  const [requireNames, setRequireNames] = useState(user?.defaultRequireNames ?? true);
  const [closeDate, setCloseDate] = useState<Date>();
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState('golden-hour');
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
  const [publicCodeInput, setPublicCodeInput] = useState('');
  const [publicCodeError, setPublicCodeError] = useState<string | null>(null);
  const [revealAtInput, setRevealAtInput] = useState('');
  const [revealPinInput, setRevealPinInput] = useState('');
  const [poolFundraisingEnabled, setPoolFundraisingEnabled] = useState(false);
  const [poolGoalNairaInput, setPoolGoalNairaInput] = useState('');
  const [poolDescriptionInput, setPoolDescriptionInput] = useState('');
  const [recipientBankCode, setRecipientBankCode] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientAccountName, setRecipientAccountName] = useState('');
  const [bankOptions, setBankOptions] = useState<PaystackBankOption[]>([]);
  const [loadingBankOptions, setLoadingBankOptions] = useState(false);
  const [resolvingRecipientAccount, setResolvingRecipientAccount] = useState(false);
  const [recipientResolveError, setRecipientResolveError] = useState<string | null>(null);
  const lastResolvedRecipientRef = useRef<string | null>(null);
  const isProUser = user?.planTier === 'pro';
  const requiresResolvedPoolRecipient = isProUser && poolFundraisingEnabled;
  const hasResolvedPoolRecipient = !requiresResolvedPoolRecipient || (
    Boolean(recipientBankCode.trim())
    && recipientAccountNumber.replace(/\D/g, '').length >= 10
    && Boolean(recipientAccountName.trim())
    && !resolvingRecipientAccount
    && !recipientResolveError
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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
      setAllowAudio(user.defaultAllowAudio ?? true);
      setRequireNames(user.defaultRequireNames ?? true);
      void fetchCustomThemes();
    }
  }, [fetchCustomThemes, user]);

  useEffect(() => {
    if (!user || !isProUser) return;

    let cancelled = false;
    setLoadingBankOptions(true);

    void apiFetch<{ banks: PaystackBankOption[] }>('/payments/paystack/banks')
      .then((data) => {
        if (cancelled) return;
        setBankOptions(Array.isArray(data?.banks) ? data.banks : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setBankOptions([]);
        toast.error('Could not load bank list right now');
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBankOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isProUser, user]);

  useEffect(() => {
    if (!isProUser || !poolFundraisingEnabled) return;

    const bankCode = recipientBankCode.trim();
    const accountNumber = recipientAccountNumber.replace(/\D/g, '').slice(0, 20);

    if (!bankCode || accountNumber.length < 10) {
      setRecipientAccountName('');
      setRecipientResolveError(null);
      lastResolvedRecipientRef.current = null;
      return;
    }

    const key = `${bankCode}:${accountNumber}`;
    if (lastResolvedRecipientRef.current === key) return;

    const timeoutId = window.setTimeout(() => {
      setResolvingRecipientAccount(true);
      setRecipientResolveError(null);

      void apiFetch<{ accountName: string; accountNumber: string }>('/payments/paystack/resolve-account', {
        method: 'POST',
        body: JSON.stringify({ bankCode, accountNumber }),
      })
        .then((data) => {
          setRecipientAccountName((data.accountName || '').trim());
          lastResolvedRecipientRef.current = key;
          setRecipientResolveError(null);
        })
        .catch(() => {
          setRecipientAccountName('');
          lastResolvedRecipientRef.current = null;
          setRecipientResolveError('Could not resolve account name. Check the bank and account number.');
        })
        .finally(() => {
          setResolvingRecipientAccount(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProUser, poolFundraisingEnabled, recipientAccountNumber, recipientBankCode]);

  useEffect(() => {
    return () => {
      if (coverPhotoPreview) {
        URL.revokeObjectURL(coverPhotoPreview);
      }
    };
  }, [coverPhotoPreview]);

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

  const handleCustomAudioUrlChange = (url: string | null) => {
    setPageCustomAudioUrl(url);
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
      if (requiresResolvedPoolRecipient && !hasResolvedPoolRecipient) {
        toast.error('Resolve recipient account details before continuing');
        return;
      }

      setSaving(true);
      setPublicCodeError(null);
      const normalizedPublicCode = publicCodeInput.trim().toLowerCase();
      if (isProUser && normalizedPublicCode && !/^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/.test(normalizedPublicCode)) {
        setPublicCodeError('Use 6-40 chars with lowercase letters, numbers, and hyphens.');
        setSaving(false);
        return;
      }

      try {
        const data = await apiFetch<{ id: string; public_code: string }>('/pages', {
          method: 'POST',
          body: JSON.stringify({
            recipientName,
            recipientEmail: recipientEmail.trim() || null,
            birthdayDate: format(birthdayDate!, 'yyyy-MM-dd'),
            theme: selectedTheme,
            displayMode: isProUser ? selectedDisplayMode : 'story',
            letterColor: letterColor || null,
            creatorMessage: creatorMessage || null,
            soundtrackId: selectedSoundtrackId,
            pageCustomAudioUrl,
            allowPhotos,
            allowAudio,
            requireNames,
            closeDate: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate!, 'yyyy-MM-dd'),
            revealAt: isProUser ? toIsoDatetime(revealAtInput) : undefined,
            revealPin: isProUser && revealPinInput.trim() ? revealPinInput.trim() : undefined,
            publicCode: isProUser && normalizedPublicCode ? normalizedPublicCode : undefined,
            poolFundraisingEnabled,
            poolGoalKobo: poolGoalNairaInput.trim() ? Math.round(Number(poolGoalNairaInput) * 100) : null,
            poolDescription: poolDescriptionInput.trim() || null,
            recipientBankCode: recipientBankCode.trim() || null,
            recipientAccountNumber: recipientAccountNumber.trim() || null,
            recipientAccountName: recipientAccountName.trim() || null,
          }),
        });

        if (coverPhoto) {
          const coverUrl = await uploadCoverPhoto(data.id);
          if (!coverUrl) {
            setSaving(false);
            return;
          }
        }

        setCreatedPageId(data.id);
        setCreatedPublicCode(data.public_code);
        toast.success('Birthday page created!');
      } catch (error) {
        setSaving(false);
        if (error instanceof ApiError && error.status === 409) {
          setPublicCodeError('That custom link is already taken. Try another one.');
          toast.error('Custom link already taken');
          return;
        }
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

  const updateCreatedPageSettings = useCallback(async (nextAllowPhotos: boolean, nextAllowAudio: boolean, nextRequireNames: boolean) => {
    if (!createdPageId) return;

    try {
      await apiFetch(`/pages/${createdPageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          recipientName,
          recipientEmail: recipientEmail.trim() || null,
          birthdayDate: format(birthdayDate!, 'yyyy-MM-dd'),
          theme: selectedTheme,
          displayMode: isProUser ? selectedDisplayMode : 'story',
          letterColor: letterColor || null,
          creatorMessage: creatorMessage || null,
          soundtrackId: selectedSoundtrackId,
          allowPhotos: nextAllowPhotos,
          allowAudio: nextAllowAudio,
          requireNames: nextRequireNames,
          closeDate: closeDate ? format(closeDate, 'yyyy-MM-dd') : format(birthdayDate!, 'yyyy-MM-dd'),
          pageCustomAudioUrl,
          poolFundraisingEnabled,
          poolGoalKobo: poolGoalNairaInput.trim() ? Math.round(Number(poolGoalNairaInput) * 100) : null,
          poolDescription: poolDescriptionInput.trim() || null,
          recipientBankCode: recipientBankCode.trim() || null,
          recipientAccountNumber: recipientAccountNumber.trim() || null,
          recipientAccountName: recipientAccountName.trim() || null,
        }),
      });
    } catch (error) {
      toast.error('Failed to update page settings');
      console.error(error);
    }
  }, [birthdayDate, closeDate, createdPageId, creatorMessage, isProUser, letterColor, pageCustomAudioUrl, poolDescriptionInput, poolFundraisingEnabled, poolGoalNairaInput, recipientAccountName, recipientAccountNumber, recipientBankCode, recipientEmail, recipientName, selectedDisplayMode, selectedSoundtrackId, selectedTheme]);

  const handleAllowPhotosChange = (checked: boolean) => {
    setAllowPhotos(checked);
    void updateCreatedPageSettings(checked, allowAudio, requireNames);
  };

  const handleAllowAudioChange = (checked: boolean) => {
    setAllowAudio(checked);
    void updateCreatedPageSettings(allowPhotos, checked, requireNames);
  };

  const handleRequireNamesChange = (checked: boolean) => {
    setRequireNames(checked);
    void updateCreatedPageSettings(allowPhotos, allowAudio, checked);
  };

  const handlePoolFundraisingToggle = (checked: boolean) => {
    setPoolFundraisingEnabled(checked);
    toast.info(
      checked
        ? 'Pool contributions enabled. A 2% payout fee will apply when releasing the gift.'
        : 'Pool contributions disabled for this page.',
    );
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
      <Header backTo={{ label: 'Back', useHistory: true, href: '/dashboard' }} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-6 sm:pt-28 sm:pb-10">
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
                <Label htmlFor="recipientEmail" className="text-foreground">Recipient Email (optional)</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="e.g., sarah@example.com"
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  If provided, birthday-day notification is sent to this address.
                </p>
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
                    <div className="relative h-[58vw] min-h-[13rem] max-h-[32rem] sm:h-[24rem]">
                      <img
                        src={coverPhotoPreview}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-45"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-black/5" />
                      <img
                        src={coverPhotoPreview}
                        alt="Cover preview"
                        className="relative z-10 h-full w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeCoverPhoto}
                      className="absolute top-2 right-2 z-20 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
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
                    <p className="mt-1 text-xs text-muted-foreground">Preview shows the full image so you can frame it better</p>
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
              recipientName={recipientName}
            />

            <div className="panel-inset mt-4 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground">Birthday page view</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isProUser
                  ? 'You control how recipients will view this page.'
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
                const { start, mid, end, angle } = getEffectiveColors(selectedTheme, letterColor, customThemes);
                return (
                  <div className="mt-4 flex w-full flex-col items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:pr-4">
                    <div className="order-2 sm:order-1">
                      <OpenerThemePreview 
                        mode={selectedDisplayMode} 
                        startColor={start} 
                        endColor={end} 
                        midColor={mid}
                        gradientAngle={angle}
                        recipientName={recipientName} 
                      />
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
                Choose one of the in-app soundtracks or paste a YouTube custom link for the reveal.
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

            <div className="panel-inset mt-4 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground">Pro controls</h3>
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
                    <Label htmlFor="publicCode" className="text-foreground">Custom public link (optional)</Label>
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
                      Leave empty to auto-generate a random link.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="revealAt" className="text-foreground">Scheduled reveal date and time (optional)</Label>
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
                    <Label htmlFor="revealPin" className="text-foreground">Secret reveal PIN (optional)</Label>
                    <Input
                      id="revealPin"
                      value={revealPinInput}
                      onChange={(event) => setRevealPinInput(event.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="mt-2"
                      inputMode="numeric"
                      placeholder="4 to 12 digit PIN"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Anyone opening the birthday link will need this PIN before they can view wishes.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Pool money gifts</p>
                        <p className="text-xs text-muted-foreground">Enable Paystack contributions for this page.</p>
                      </div>
                      <Switch checked={poolFundraisingEnabled} onCheckedChange={handlePoolFundraisingToggle} />
                    </div>

                    {poolFundraisingEnabled && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <Label htmlFor="poolGoal" className="text-foreground">Goal amount (NGN, optional)</Label>
                          <Input
                            id="poolGoal"
                            type="number"
                            min="0"
                            step="0.01"
                            value={poolGoalNairaInput}
                            onChange={(event) => setPoolGoalNairaInput(event.target.value)}
                            className="mt-2"
                            placeholder="e.g. 50000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="poolDescription" className="text-foreground">Pool description (optional)</Label>
                          <Textarea
                            id="poolDescription"
                            value={poolDescriptionInput}
                            onChange={(event) => setPoolDescriptionInput(event.target.value)}
                            className="mt-2 min-h-[80px]"
                            placeholder="What contributors are helping with"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="recipientBankCode" className="text-foreground">Recipient bank</Label>
                            <select
                              id="recipientBankCode"
                              value={recipientBankCode}
                              onChange={(event) => {
                                setRecipientBankCode(event.target.value);
                                setRecipientAccountName('');
                                setRecipientResolveError(null);
                                lastResolvedRecipientRef.current = null;
                              }}
                              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              disabled={loadingBankOptions}
                            >
                              <option value="">{loadingBankOptions ? 'Loading banks...' : 'Select bank'}</option>
                              {bankOptions.map((bank) => (
                                <option key={bank.code} value={bank.code}>{bank.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="recipientAccountNumber" className="text-foreground">Recipient account number</Label>
                            <Input
                              id="recipientAccountNumber"
                              value={recipientAccountNumber}
                              onChange={(event) => {
                                setRecipientAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 20));
                                setRecipientAccountName('');
                                setRecipientResolveError(null);
                                lastResolvedRecipientRef.current = null;
                              }}
                              className="mt-2"
                              placeholder="10-20 digits"
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="recipientAccountName" className="text-foreground">Recipient account name (auto-resolved)</Label>
                          <Input
                            id="recipientAccountName"
                            value={recipientAccountName}
                            className="mt-2"
                            placeholder={resolvingRecipientAccount ? 'Resolving account name...' : 'Account name will appear automatically'}
                            readOnly
                          />
                          <div className="mt-2 flex items-center gap-2">
                            {resolvingRecipientAccount ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Resolving account
                              </span>
                            ) : recipientAccountName.trim() && !recipientResolveError ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="h-3.5 w-3.5" />
                                Account resolved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                Enter bank and account number to resolve
                              </span>
                            )}
                          </div>
                          {recipientResolveError && <p className="mt-2 text-xs font-medium text-destructive">{recipientResolveError}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Custom links, scheduled reveal, and secret PIN unlock are available on Pro.
                  </p>
                  <Button type="button" variant="outline" className="mt-3" onClick={() => navigate('/billing')}>
                    Upgrade to Pro
                  </Button>
                </div>
              )}
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
                <Label htmlFor="audio" className="text-xs sm:text-sm text-foreground">Allow audio wishes</Label>
                <Switch id="audio" checked={allowAudio} onCheckedChange={handleAllowAudioChange} />
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
            <Button variant="outline" size="lg" onClick={handleBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              variant="hero"
              size="lg"
              onClick={handleNext}
              className="flex-1"
              disabled={saving || uploadingCover || (step === 2 && !hasResolvedPoolRecipient)}
            >
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
            <Button variant="hero" size="lg" onClick={() => navigate('/dashboard')} className="flex-1">
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
