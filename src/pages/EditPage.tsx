import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Copy,
  Eye,
  Gift,
  Image as ImageIcon,
  Loader2,
  Lock,
  Music,
  QrCode,
  Sparkles,
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BrandMenuIcon } from '@/components/BrandIcons';
import QRCodeModal from '@/components/QRCodeModal';
import SocialShareButtons from '@/components/SocialShareButtons';
import Confetti from '@/components/Confetti';
import OpenerThemePreview from '@/components/OpenerThemePreview';
import ThemeSelector from '@/components/ThemeSelector';
import SoundtrackSelector from '@/components/SoundtrackSelector';
import { ApiError, apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { DashboardSidebar } from '@/pages/dashboardPage';
import type { BirthdayPage } from '@/pages/dashboardPage/types';
import type { CustomTheme, DisplayMode, PaystackBankOption, Theme } from '@/pages/page-wizard';
import {
  CreateThemeProFooter,
  DEFAULT_LETTER_END,
  DEFAULT_LETTER_START,
  displayModes,
  getEffectiveColors,
  parseLetterGradientValue,
  toDatetimeLocalValue,
  toIsoDatetime,
} from '@/pages/page-wizard';
import { builtInThemeMap, visualThemeConfig } from '@/lib/themes';
import { fontClassForValue } from '@/pages/theme-builder';

const EDIT_STEPS = [
  { number: 1, label: 'Honoree' },
  { number: 2, label: 'Keepsake' },
  { number: 3, label: 'Palette & View' },
  { number: 4, label: 'Soundtrack' },
  { number: 5, label: 'Permissions & Save' },
];

const EDIT_FORM_STATE_KEY_PREFIX = 'wishcanvas_edit_form_state_';

function getInitialEditStep(pageId?: string): number {
  if (typeof window === 'undefined' || !pageId) return 1;
  try {
    const raw = sessionStorage.getItem(`${EDIT_FORM_STATE_KEY_PREFIX}${pageId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.currentStep === 'number' && parsed.currentStep >= 1 && parsed.currentStep <= 5) {
        return parsed.currentStep;
      }
    }
  } catch {
    // ignore
  }
  return 1;
}

function getInitialEditPreviewView(pageId?: string): 'card' | 'envelope' {
  if (typeof window === 'undefined' || !pageId) return 'card';
  try {
    const raw = sessionStorage.getItem(`${EDIT_FORM_STATE_KEY_PREFIX}${pageId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.previewView === 'card' || parsed.previewView === 'envelope') {
        return parsed.previewView;
      }
    }
  } catch {
    // ignore
  }
  return 'card';
}

const EditPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, profile, isPro, loading: authLoading, signOut } = useAuth();
  
  // App Shell navigation and sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wishcanvas_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wishcanvas_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Creator statistics for sidebar and topbar
  const [pages, setPages] = useState<BirthdayPage[]>([]);

  // Stepper state (Steps 1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(() => getInitialEditStep(pageId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  // Live stage preview state
  const [previewView, setPreviewView] = useState<'card' | 'envelope'>(() => getInitialEditPreviewView(pageId));
  const [confettiActive, setConfettiActive] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Auto-persist active editing step and view into session state (not localStorage)
  useEffect(() => {
    if (!pageId) return;
    try {
      sessionStorage.setItem(`${EDIT_FORM_STATE_KEY_PREFIX}${pageId}`, JSON.stringify({
        currentStep,
        previewView,
      }));
    } catch {
      // ignore
    }
  }, [currentStep, pageId, previewView]);

  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('elegant');
  const [selectedLetterTheme, setSelectedLetterTheme] = useState<Theme>('elegant');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>('story');
  const [letterColor, setLetterColor] = useState<string>('');
  const [letterGradientStart, setLetterGradientStart] = useState(DEFAULT_LETTER_START);
  const [letterGradientEnd, setLetterGradientEnd] = useState(DEFAULT_LETTER_END);
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

  const isProUser = isPro;
  const requiresResolvedPoolRecipient = isProUser && poolFundraisingEnabled;
  const hasResolvedPoolRecipient = !requiresResolvedPoolRecipient || (
    Boolean(recipientBankCode.trim())
    && recipientAccountNumber.replace(/\D/g, '').length >= 10
    && Boolean(recipientAccountName.trim())
    && !resolvingRecipientAccount
    && !recipientResolveError
  );

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  const avatarSrc = resolveAssetUrl(profile?.avatar_url);
  const currentDisplayName = profile?.display_name || user?.displayName || user?.email?.split('@')[0] || 'Creator';
  const initial = (currentDisplayName.trim()[0] || 'C').toUpperCase();

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
        letter_theme?: string | null;
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
        pool_fundraising_enabled?: boolean;
        pool_goal_kobo?: number | null;
        pool_description?: string | null;
        recipient_bank_code?: string | null;
        recipient_account_number?: string | null;
        recipient_account_name?: string | null;
      }>(`/pages/${pageId}`);

      setRecipientName(data.recipient_name);
      setRecipientEmail(data.recipient_email || '');
      setBirthdayDate(parseLocalDate(data.birthday_date));
      setCreatorMessage(data.creator_message || '');
      setSelectedTheme(data.theme as Theme);
      setSelectedLetterTheme((data.letter_theme as Theme) || (data.theme as Theme));
      setSelectedDisplayMode(isProUser ? (data.display_mode || 'story') : 'story');
      setLetterColor(data.letter_color || '');
      if (data.letter_color) {
        const parsed = parseLetterGradientValue(data.letter_color);
        setLetterGradientStart(parsed.start);
        setLetterGradientEnd(parsed.end);
      } else {
        setLetterGradientStart(DEFAULT_LETTER_START);
        setLetterGradientEnd(DEFAULT_LETTER_END);
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
      setPoolFundraisingEnabled(Boolean(data.pool_fundraising_enabled));
      setPoolGoalNairaInput(
        typeof data.pool_goal_kobo === 'number' && Number.isFinite(data.pool_goal_kobo)
          ? (data.pool_goal_kobo / 100).toFixed(2)
          : '',
      );
      setPoolDescriptionInput(data.pool_description || '');
      setRecipientBankCode(data.recipient_bank_code || '');
      setRecipientAccountNumber(data.recipient_account_number || '');
      setRecipientAccountName(data.recipient_account_name || '');
      setLoading(false);

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

      apiFetch<BirthdayPage[]>('/pages')
        .then((data) => setPages(data || []))
        .catch(() => setPages([]));
    }
  }, [fetchCustomThemes, fetchPage, pageId, user]);

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
          setRecipientResolveError('Could not resolve account name. Check bank and account number.');
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

  useEffect(() => {
    if (!isProUser && selectedDisplayMode !== 'story') {
      setSelectedDisplayMode('story');
    }
  }, [isProUser, selectedDisplayMode]);

  const handleCoverPhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
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
    if (currentStep === 1) {
      if (!recipientName.trim()) {
        toast.error("Please enter the recipient's name");
        return;
      }
      if (!birthdayDate) {
        toast.error('Please select a birthday date');
        return;
      }
    }

    if (currentStep === 3) {
      setPreviewView('envelope');
    } else if (currentStep === 4) {
      setPreviewView('card');
    }

    if (currentStep === 4) {
      if (requiresResolvedPoolRecipient && !hasResolvedPoolRecipient) {
        toast.error('Resolve recipient account details before continuing');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    if (currentStep === 4) {
      setPreviewView('card');
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePoolFundraisingToggle = (checked: boolean) => {
    setPoolFundraisingEnabled(checked);
    toast.info(
      checked
        ? 'Pool contributions enabled. A 2% payout fee will apply when releasing the gift.'
        : 'Pool contributions disabled for this canvas.',
    );
  };

  const handleSave = async () => {
    if (!recipientName.trim()) {
      toast.error("Please enter the recipient's name");
      setCurrentStep(1);
      return;
    }
    if (!birthdayDate) {
      toast.error('Please select a birthday date');
      setCurrentStep(1);
      return;
    }

    setPublicCodeError(null);
    const normalizedPublicCode = publicCodeInput.trim().toLowerCase();
    if (isProUser && normalizedPublicCode && !/^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/.test(normalizedPublicCode)) {
      setPublicCodeError('Use 6-40 chars with lowercase letters, numbers, and hyphens.');
      setSaving(false);
      setCurrentStep(4);
      return;
    }

    if (requiresResolvedPoolRecipient && !hasResolvedPoolRecipient) {
      toast.error('Resolve recipient account details before saving');
      setCurrentStep(4);
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
          letterTheme: selectedLetterTheme,
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
          publicCode: isProUser && normalizedPublicCode ? normalizedPublicCode : undefined,
          poolFundraisingEnabled: isProUser ? poolFundraisingEnabled : undefined,
          poolGoalKobo: isProUser && poolGoalNairaInput.trim() ? Math.round(Number(poolGoalNairaInput) * 100) : null,
          poolDescription: isProUser ? (poolDescriptionInput.trim() || null) : undefined,
          recipientBankCode: isProUser ? (recipientBankCode.trim() || null) : undefined,
          recipientAccountNumber: isProUser ? (recipientAccountNumber.trim() || null) : undefined,
          recipientAccountName: isProUser ? (recipientAccountName.trim() || null) : undefined,
        }),
      });

      setSaving(false);
      setConfettiActive(true);
      if (pageId) {
        try {
          sessionStorage.removeItem(`${EDIT_FORM_STATE_KEY_PREFIX}${pageId}`);
        } catch {
          // ignore
        }
      }
      toast.success('Milestone canvas updated successfully!');
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && error.status === 409) {
        setPublicCodeError('That custom link is already taken. Try another one.');
        toast.error('Custom link already taken');
        setCurrentStep(4);
        return;
      }
      toast.error('Failed to save changes');
      console.error(error);
      return;
    }
  };

  const copyLink = async (type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const shareTarget = publicCode || pageId;
    const link = type === 'contribute' ? `${baseUrl}/contribute/${shareTarget}` : `${baseUrl}/birthday/${shareTarget}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  // Helper to reliably find custom theme by either raw ID or custom_ prefixed key
  const findCustomTheme = (themeKey: string, customList: CustomTheme[]): CustomTheme | undefined => {
    const normalizedId = themeKey.startsWith('custom_') ? themeKey.slice('custom_'.length) : themeKey;
    return customList.find((t) => String(t.id) === normalizedId);
  };

  const resolvedCustomTheme = findCustomTheme(selectedTheme, customThemes);
  const resolvedLetterCustomTheme = findCustomTheme(selectedLetterTheme, customThemes);
  const letterColors = getEffectiveColors(selectedLetterTheme, letterColor, customThemes);

  const previewGradient = (() => {
    if (resolvedCustomTheme) {
      const angle = resolvedCustomTheme.gradient_angle ?? 135;
      if (resolvedCustomTheme.gradient_mid) {
        return `linear-gradient(${angle}deg, ${resolvedCustomTheme.gradient_from} 0%, ${resolvedCustomTheme.gradient_mid} 50%, ${resolvedCustomTheme.gradient_to} 100%)`;
      }
      return `linear-gradient(${angle}deg, ${resolvedCustomTheme.gradient_from} 0%, ${resolvedCustomTheme.gradient_to} 100%)`;
    }
    const builtIn = builtInThemeMap[selectedTheme];
    if (builtIn) {
      return `linear-gradient(135deg, ${builtIn.gradientColors[0]} 0%, ${builtIn.gradientColors[1]} 100%)`;
    }
    return 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)';
  })();

  const previewEmoji = (() => {
    if (resolvedCustomTheme) return resolvedCustomTheme.emoji || '✨';
    return builtInThemeMap[selectedTheme]?.emoji || '✨';
  })();

  const previewIconUrl = resolvedCustomTheme?.icon_url || null;

  const previewFontClass = (() => {
    if (resolvedCustomTheme) {
      return fontClassForValue(resolvedCustomTheme.font || 'jakarta');
    }
    return visualThemeConfig[selectedTheme as keyof typeof visualThemeConfig]?.font || 'font-serif';
  })();

  const currentThemeName = (() => {
    if (resolvedCustomTheme) return resolvedCustomTheme.name;
    return builtInThemeMap[selectedTheme]?.name || 'Signature Gold';
  })();

  const currentLetterThemeName = (() => {
    if (resolvedLetterCustomTheme) return resolvedLetterCustomTheme.name;
    return builtInThemeMap[selectedLetterTheme]?.name || 'Signature Gold';
  })();

  const triggerConfettiPop = () => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3500);
  };

  if (loading || authLoading) {
    return <WishCanvasLoader />;
  }

  const displayCoverUrl = coverPhotoPreview || currentCoverUrl;

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 flex overflow-hidden">
      {/* Background Celebratory Glows */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-amber-200/35 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-rose-200/30 to-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[360px] w-[360px] rounded-full bg-amber-100/30 blur-3xl" />

      {/* Floating Interactive Confetti */}
      {confettiActive && <Confetti />}

      {/* 1. PERSISTENT STUDIO APP SHELL SIDEBAR (Desktop) */}
      <DashboardSidebar
        user={user}
        profile={profile}
        activePagesCount={activePages}
        deliveredPagesCount={deliveredPages}
        totalPagesCount={totalPages}
        isProUser={isProUser}
        onSignOut={signOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* MOBILE SIDEBAR DRAWER (When on phone / tablet) */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" hideDefaultClose className="p-0 w-80 bg-[#FAF7F2] text-slate-900 border-r border-stone-200">
          <DashboardSidebar
            isMobileDrawer
            user={user}
            profile={profile}
            activePagesCount={activePages}
            deliveredPagesCount={deliveredPages}
            totalPagesCount={totalPages}
            isProUser={isProUser}
            onSignOut={() => {
              setIsMobileSidebarOpen(false);
              signOut();
            }}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 2. MAIN STUDIO WORKBENCH */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Command Bar */}
        <header className="bg-white/85 backdrop-blur-md border-b border-stone-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors shadow-xs active:scale-95"
              aria-label="Open sidebar menu"
              title="Open menu"
            >
              <BrandMenuIcon className="h-4 w-4 text-stone-700" />
            </button>

            {/* Studio Context Title */}
            <div className="flex items-center gap-2 pl-1">
              <Link
                to="/dashboard"
                className="font-serif font-bold text-slate-950 text-sm sm:text-base tracking-tight hover:text-amber-800 transition-colors"
              >
                Celebration Atelier
              </Link>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-stone-300" />
              <span className="hidden sm:inline-block text-[11px] text-stone-500 font-medium">
                Step {currentStep} of 5: {EDIT_STEPS[currentStep - 1].label}
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="hidden sm:flex items-center gap-4 border-r border-stone-200 pr-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Live
                </span>
                <p className="font-serif font-bold text-emerald-800 text-sm">
                  {activePages} Collecting
                </p>
              </div>
              <div className="w-px h-6 bg-stone-200" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Wishes
                </span>
                <p className="font-serif font-bold text-slate-950 text-sm">
                  {totalWishes} Pinned
                </p>
              </div>
            </div>

            <Link to="/settings" className="flex items-center gap-2" title="Account settings">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={currentDisplayName}
                  className="h-8 w-8 rounded-full object-cover border border-stone-300"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {initial}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Main Workbench Body with Zero-Scroll Split Studio */}
        <main className="flex-1 p-3.5 sm:p-7 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Curate Milestone <span className="italic text-rose-500">Celebration Canvas</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">artisan studio</span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
                Refine personal details, refresh the visual atmosphere, and manage contributor rules. The form stays compact beside the live preview.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-2xl border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
                  Return to Timeline
                </Button>
              </Link>
            </div>
          </div>

          {/* THE ZERO-SCROLL SPLIT STUDIO CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            
            {/* LEFT COLUMN: THE LIVE CELEBRATION CANVAS STAGE (5 cols on LG, sticky in view) */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 self-start space-y-4">
              <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-5 shadow-card flex flex-col relative overflow-hidden">
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

                {/* Stage Top Bar */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-950 flex items-center gap-1.5 font-sans">
                      <Eye className="h-3.5 w-3.5 text-amber-600" />
                      Live Canvas Stage
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Mobile View Toggle */}
                    <button
                      type="button"
                      onClick={() => setMobilePreviewOpen((prev) => !prev)}
                      className="lg:hidden px-2.5 py-1 text-[10px] font-bold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all font-sans"
                    >
                      {mobilePreviewOpen ? 'Hide' : 'View Preview'}
                    </button>

                    {/* Switch between Canvas Card and Envelope Opener */}
                    <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200/80">
                      <button
                        type="button"
                        onClick={() => setPreviewView('card')}
                        className={cn(
                          'px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all',
                          previewView === 'card'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-500 hover:text-slate-900',
                        )}
                      >
                        Reveal Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewView('envelope')}
                        className={cn(
                          'px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all',
                          previewView === 'envelope'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-500 hover:text-slate-900',
                        )}
                      >
                        Envelope
                      </button>
                    </div>
                  </div>
                </div>

                {/* STAGE BODY: Always visible on desktop, toggleable on mobile */}
                <div className={cn(mobilePreviewOpen ? 'block' : 'hidden lg:block')}>

                {/* PREVIEW VIEW 1: DYNAMIC DISPLAY MODE LIVE STAGE */}
                {previewView === 'card' ? (
                  <div
                    className="my-3 rounded-3xl p-5 relative overflow-hidden shadow-lg text-white transition-all duration-300 min-h-[440px] flex flex-col justify-between"
                    style={{ background: previewGradient }}
                  >
                    {/* Subtle glass ambient sheen */}
                    <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-white/20 blur-xl" />
                    <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-black/10 blur-xl" />

                    {/* Stage Header: Theme Emblem & Mode Badge */}
                    <div className="flex items-center justify-between relative z-10 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-lg shadow-md overflow-hidden">
                          {previewIconUrl ? (
                            <img src={previewIconUrl} alt="Emblem" className="h-full w-full object-cover" />
                          ) : (
                            previewEmoji
                          )}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 drop-shadow-xs">
                          {currentThemeName}
                        </span>
                      </div>
                      <span className="rounded-full bg-black/25 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/95 border border-white/20">
                        {selectedDisplayMode === 'bento' ? 'Bento Grid' : selectedDisplayMode === 'freeform' ? 'Freeform Wall' : 'Story Reveal'}
                      </span>
                    </div>

                    {/* DYNAMIC MODE 1: STORY FLOW VIEW */}
                    {selectedDisplayMode === 'story' && (
                      <div className="my-auto relative z-10 space-y-3 animate-fade-in">
                        {displayCoverUrl && (
                          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/25 w-fit">
                            <img
                              src={displayCoverUrl}
                              alt="Celebrant Cover"
                              className="h-12 w-12 rounded-xl object-cover border border-white/50 shadow-sm"
                            />
                            <div className="pr-2">
                              <span className="text-[9px] uppercase tracking-wider text-white/75 font-semibold block">Cover Portrait</span>
                              <span className="text-xs font-bold text-white line-clamp-1">{recipientName || 'Celebrant'}</span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest text-white/80 font-semibold flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-amber-300" />
                            Milestone Celebration Story
                          </p>
                          <h2 className={cn('text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md text-white tracking-tight', previewFontClass)}>
                            Happy Birthday, {recipientName.trim() ? recipientName.trim() : 'Alex'}!
                          </h2>
                          <p className="text-xs text-white/85 font-medium drop-shadow-xs">
                            {birthdayDate ? format(birthdayDate, 'EEEE, MMMM d, yyyy') : 'Milestone date to be set'}
                          </p>
                        </div>

                        {/* Organizer Welcome Letter Snippet */}
                        {creatorMessage.trim() && (
                          <div
                            className="rounded-2xl border border-white/30 p-2.5 text-xs leading-relaxed text-white/95 shadow-sm"
                            style={{
                              background: letterColors.mid
                                ? `linear-gradient(${letterColors.angle ?? 135}deg, ${letterColors.start}66, ${letterColors.mid}66, ${letterColors.end}66)`
                                : `linear-gradient(135deg, ${letterColors.start}66, ${letterColors.end}66)`,
                            }}
                          >
                            <p className="text-[9px] uppercase tracking-wider text-white/75 font-bold mb-0.5">
                              Note from Organizer:
                            </p>
                            <p className="italic line-clamp-2">&quot;{creatorMessage}&quot;</p>
                          </div>
                        )}

                        {/* Story Progress & Chapter Indicators */}
                        <div className="rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-6 rounded-full bg-white shadow-xs" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                          </div>
                          <span className="text-[10px] text-white/80 font-medium">Chapter 1 of 4: Cover Reveal</span>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC MODE 2: BENTO GRID VIEW */}
                    {selectedDisplayMode === 'bento' && (
                      <div className="my-auto relative z-10 grid grid-cols-2 gap-2 text-white animate-fade-in">
                        {/* Bento Tile 1: Hero Name */}
                        <div className="col-span-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 p-3.5 space-y-1 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-amber-300 font-bold">
                              Milestone Bento
                            </span>
                            <span className="text-[10px] text-white/80 font-medium">
                              {birthdayDate ? format(birthdayDate, 'MMM d, yyyy') : 'Milestone'}
                            </span>
                          </div>
                          <h2 className={cn('text-xl font-bold leading-tight text-white', previewFontClass)}>
                            Happy Birthday, {recipientName.trim() ? recipientName.trim() : 'Alex'}! ✨
                          </h2>
                        </div>

                        {/* Bento Tile 2: Cover Photo */}
                        <div className="col-span-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2.5 flex flex-col items-center justify-center text-center min-h-[90px] shadow-sm">
                          {displayCoverUrl ? (
                            <img
                              src={displayCoverUrl}
                              alt="Cover"
                              className="h-14 w-14 rounded-xl object-cover border border-white/50 shadow-xs mb-1"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-lg mb-1">
                              📸
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-white/90">Moments Vault</span>
                        </div>

                        {/* Bento Tile 3: Audio Voice Wish */}
                        <div className="col-span-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2.5 flex flex-col justify-between min-h-[90px] shadow-sm">
                          <span className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">Voice Wish</span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="h-3 w-1 bg-amber-300 rounded-full animate-pulse" />
                              <span className="h-5 w-1 bg-amber-200 rounded-full animate-pulse delay-75" />
                              <span className="h-2 w-1 bg-white rounded-full" />
                              <span className="h-4 w-1 bg-amber-300 rounded-full" />
                              <span className="text-[10px] font-bold text-white ml-1">0:42</span>
                            </div>
                            <p className="text-[10px] text-white/80 font-medium line-clamp-1">Sarah M.</p>
                          </div>
                        </div>

                        {/* Bento Tile 4: Pinned Wish Card */}
                        <div className="col-span-2 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 p-3 text-slate-900 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800">David K.</span>
                            <span className="text-[10px] text-stone-500 font-medium">Friend</span>
                          </div>
                          <p className="text-xs text-stone-700 leading-snug line-clamp-2">
                            Wishing you the greatest year yet filled with joy, adventure, and success! 🎂
                          </p>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC MODE 3: FREEFORM WALL VIEW */}
                    {selectedDisplayMode === 'freeform' && (
                      <div className="my-auto relative z-10 space-y-2.5 py-1 animate-fade-in">
                        {/* Tilted Polaroid Snapshot */}
                        <div className="w-48 mx-auto bg-white p-2 pb-3 rounded-xl shadow-md text-slate-900 transform -rotate-2 relative">
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-amber-200/80 rounded-xs shadow-2xs rotate-1" />
                          <div className="h-24 bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center border border-stone-200">
                            {displayCoverUrl ? (
                              <img src={displayCoverUrl} alt="Cover" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-3xl">🎉</span>
                            )}
                          </div>
                          <p className="mt-1.5 text-center font-handwriting text-sm text-slate-800 font-bold">
                            {recipientName || 'Alex'}&apos;s Big Day
                          </p>
                        </div>

                        {/* 2 Staggered Sticky Notes */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* Sticky Note 1 */}
                          <div className="bg-amber-100 text-amber-950 p-2.5 rounded-xl shadow-sm border border-amber-200 transform rotate-2 relative">
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
                            <p className="text-[9px] font-bold uppercase text-amber-800 tracking-wider">Maya S.</p>
                            <p className="text-[11px] leading-tight font-medium mt-0.5">
                              Happiest birthday! So grateful for you! 🎈
                            </p>
                          </div>

                          {/* Sticky Note 2 */}
                          <div className="bg-purple-100 text-purple-950 p-2.5 rounded-xl shadow-sm border border-purple-200 transform -rotate-1 relative">
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
                            <p className="text-[9px] font-bold uppercase text-purple-800 tracking-wider">Voice Wish</p>
                            <p className="text-[11px] font-semibold mt-0.5 flex items-center gap-1">
                              <span>🎙️ 0:38</span>
                              <span className="text-[10px] text-purple-700 font-normal">Sarah</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Soundtrack & Stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/20 relative z-10 text-xs">
                      <div className="flex items-center gap-1.5 text-white/90 font-medium text-[11px] bg-black/20 px-2.5 py-1 rounded-xl backdrop-blur-xs">
                        <Music className="h-3 w-3 text-amber-300" />
                        <span className="capitalize">{selectedSoundtrackId.replace(/-/g, ' ')}</span>
                      </div>

                      <button
                        type="button"
                        onClick={triggerConfettiPop}
                        className="flex items-center gap-1 text-[11px] font-bold text-white bg-white/25 hover:bg-white/35 active:scale-95 px-2.5 py-1 rounded-xl transition-all border border-white/30"
                      >
                        <span>🎉 Pop Confetti</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PREVIEW VIEW 2: ENVELOPE OPENER */
                  <div className="my-3 flex flex-col items-center justify-center min-h-[440px] bg-stone-50/70 rounded-3xl p-6 border border-stone-200/70">
                    <div className="flex items-center justify-between w-full max-w-[210px] mb-3 px-1 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Envelope Theme</span>
                      <span className="text-xs font-bold text-slate-800">{currentLetterThemeName}</span>
                    </div>
                    <OpenerThemePreview
                      mode={selectedDisplayMode}
                      startColor={letterColors.start}
                      endColor={letterColors.end}
                      midColor={letterColors.mid}
                      gradientAngle={letterColors.angle}
                      recipientName={recipientName}
                    />
                    <p className="text-[11px] text-stone-500 mt-4 text-center">
                      Interactive wax-seal envelope styled with {currentLetterThemeName}, shown to {recipientName || 'the celebrant'} on arrival.
                    </p>
                  </div>
                )}

                {/* Stage Footer: Live sync confirmation */}
                <div className="pt-2 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100">
                  <span>Auto-updates in real time</span>
                  <span className="font-semibold text-amber-800">Celebration Keepsake</span>
                </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: THE COMPACT STEPPER WORKBENCH (7 cols on LG) */}
            <div className="lg:col-span-7 space-y-4">

              {/* ARTISAN STEPPER BAR (STEPS 1 TO 5) */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-2.5 sm:p-4 shadow-card overflow-hidden">
                <div className="flex items-center justify-between max-w-xl mx-auto relative w-full">
                  {EDIT_STEPS.map((s, i) => {
                    const isCompleted = currentStep > s.number;
                    const isCurrent = currentStep === s.number;

                    return (
                      <Fragment key={s.number}>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(s.number)}
                          className="flex flex-col items-center relative z-10 group shrink-0"
                        >
                          <div
                            className={cn(
                              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all duration-300 shadow-2xs',
                              isCurrent
                                ? 'bg-slate-950 text-white shadow-xs ring-2 sm:ring-4 ring-amber-400/30'
                                : isCompleted
                                ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                                : 'bg-stone-100 text-stone-400 border border-stone-200',
                            )}
                          >
                            {isCompleted ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" /> : s.number}
                          </div>
                          <span
                            className={cn(
                              'text-[10px] mt-1.5 font-bold transition-colors text-center hidden sm:inline-block',
                              isCurrent ? 'text-slate-950' : isCompleted ? 'text-emerald-800' : 'text-stone-400',
                            )}
                          >
                            {s.label}
                          </span>
                        </button>

                        {i < EDIT_STEPS.length - 1 && (
                          <div
                            className={cn(
                              'flex-1 h-0.5 mx-1 sm:mx-2 rounded-full transition-all duration-300 min-w-[6px]',
                              currentStep > s.number ? 'bg-emerald-500' : 'bg-stone-200',
                            )}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* STEP 1: THE HONOREE (COMPACT) */}
              {currentStep === 1 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Milestone Honoree</h2>
                    <p className="text-xs text-stone-500">Update the celebrant&apos;s name and milestone birthday date.</p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div>
                      <Label htmlFor="recipientName" className="text-xs font-bold text-slate-800">
                        Celebrant&apos;s Name *
                      </Label>
                      <Input
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g., Alex, Chioma, or Sarah"
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-800">Milestone Birthday Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'mt-1.5 w-full justify-start text-left font-normal h-10 rounded-xl border-stone-200',
                              !birthdayDate && 'text-stone-400',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
                            {birthdayDate ? format(birthdayDate, 'PPP') : <span>Select birthday date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={birthdayDate}
                            onSelect={setBirthdayDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="recipientEmail" className="text-xs font-bold text-stone-700">
                        Celebrant Email (optional)
                      </Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="e.g., alex@example.com"
                        className="mt-1.5 h-10 rounded-xl"
                      />
                      <p className="text-[11px] text-stone-400 mt-1">
                        If provided, birthday delivery notifications are dispatched to this address.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: COVER PHOTO & WELCOME NOTE (COMPACT) */}
              {currentStep === 2 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Cover Portrait &amp; Welcome Note</h2>
                    <p className="text-xs text-stone-500">Update the celebrant cover photo and the opening message from you as organizer.</p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* Cover photo uploader */}
                    <div>
                      <Label className="text-xs font-bold text-slate-800">Celebrant Cover Photo</Label>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverPhotoSelect}
                        className="hidden"
                      />

                      {displayCoverUrl ? (
                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/70">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={displayCoverUrl}
                              alt="Cover thumbnail"
                              className="h-11 w-11 shrink-0 rounded-xl object-cover border border-stone-300 shadow-2xs"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">Cover Photo Attached</p>
                              <p className="text-[11px] text-stone-500 truncate">Shown on the canvas cover portrait</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => coverInputRef.current?.click()}
                              className="h-8 rounded-lg text-xs font-semibold px-3"
                            >
                              Replace
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeCoverPhoto}
                              className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold px-2.5"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="mt-1.5 w-full border-2 border-dashed border-stone-200 hover:border-amber-400 hover:bg-amber-50/20 rounded-xl p-3 text-center transition-all flex items-center justify-center gap-2 text-xs font-semibold text-stone-600"
                        >
                          <ImageIcon className="h-4 w-4 text-amber-600" />
                          <span>Upload Celebrant Portrait (JPG, PNG)</span>
                        </button>
                      )}
                    </div>

                    {/* Organizer Note */}
                    <div>
                      <Label htmlFor="creatorMessage" className="text-xs font-bold text-slate-800">
                        Organizer&apos;s Welcome Note
                      </Label>
                      <Textarea
                        id="creatorMessage"
                        value={creatorMessage}
                        onChange={(e) => setCreatorMessage(e.target.value)}
                        placeholder="Write a sweet personal greeting to introduce the canvas..."
                        className="mt-1.5 min-h-[95px] rounded-xl text-xs"
                        maxLength={400}
                      />
                      <p className="text-[11px] text-stone-400 mt-1">
                        Pinned as the opening keepsake letter on {recipientName || 'the celebrant'}&apos;s canvas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PALETTE & VIEW MODE (COMPACT, SHOWPREVIEW=FALSE) */}
              {currentStep === 3 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Visual Vibe &amp; Layout</h2>
                    <p className="text-xs text-stone-500">Select a layout style and color palette. Watch the left stage react instantly.</p>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Birthday Page View Buttons */}
                    <div>
                      <Label className="text-xs font-bold text-slate-800 mb-2 block">
                        Birthday Page View Style
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {displayModes.map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              if (!isProUser && mode.id !== 'story') {
                                toast.info('Bento and Freeform layouts are part of Pro Atelier.');
                                return;
                              }
                              setSelectedDisplayMode(mode.id);
                            }}
                            className={cn(
                              'rounded-xl border p-2.5 text-left transition-all relative',
                              selectedDisplayMode === mode.id
                                ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                                : 'border-stone-200 hover:border-stone-300 bg-white',
                            )}
                          >
                            <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                              <span>{mode.label}</span>
                              {!isProUser && mode.id !== 'story' && <Lock className="h-3 w-3 text-stone-400" />}
                            </p>
                            <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">{mode.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Signature Palette Selector */}
                    <div>
                      <Label className="text-xs font-bold text-slate-800 mb-2 block">
                        Signature Palette
                      </Label>
                      <div className="max-h-[190px] overflow-y-auto pr-1">
                        <ThemeSelector
                          selectedTheme={selectedTheme}
                          onSelect={(theme) => {
                            setSelectedTheme(theme);
                            setPreviewView('card');
                          }}
                          customThemes={customThemes}
                          recipientName={recipientName}
                          showPreview={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SOUNDTRACK & ENVELOPE (COMPACT) */}
              {currentStep === 4 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Soundtrack &amp; Envelope</h2>
                    <p className="text-xs text-stone-500">Pick the reveal soundtrack and envelope styling for the opening surprise.</p>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Opening Soundtrack */}
                    <div>
                      <Label className="text-xs font-bold text-slate-800 mb-2 block">
                        Opening Reveal Soundtrack
                      </Label>
                      <div className="max-h-[140px] overflow-y-auto pr-1">
                        <SoundtrackSelector
                          selectedSoundtrackId={selectedSoundtrackId}
                          onSelectSoundtrackId={setSelectedSoundtrackId}
                          customAudioUrl={pageCustomAudioUrl}
                          onChangeCustomAudioUrl={handleCustomAudioUrlChange}
                        />
                      </div>
                    </div>

                    {/* Envelope / Letter Theme */}
                    <div className="pt-2 border-t border-stone-100">
                      <Label className="text-xs font-bold text-slate-800 mb-2 block">
                        Letter &amp; Envelope Theme
                      </Label>
                      <div className="max-h-[120px] overflow-y-auto pr-1">
                        <ThemeSelector
                          selectedTheme={selectedLetterTheme}
                          onSelect={(theme) => {
                            setSelectedLetterTheme(theme);
                            setPreviewView('envelope');
                          }}
                          customThemes={customThemes}
                          recipientName={recipientName}
                          showPreview={false}
                        />
                      </div>
                    </div>

                    {/* Optional Pro Perks Accordion */}
                    {isProUser && (
                      <div className="pt-2 border-t border-stone-100">
                        <CreateThemeProFooter
                          isProUser={isProUser}
                          publicCodeInput={publicCodeInput}
                          onPublicCodeInputChange={(value) => {
                            setPublicCodeInput(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                            setPublicCodeError(null);
                          }}
                          publicCodeError={publicCodeError}
                          revealAtInput={revealAtInput}
                          onRevealAtInputChange={setRevealAtInput}
                          revealPinInput={revealPinInput}
                          onRevealPinInputChange={(value) => setRevealPinInput(value.replace(/\D/g, '').slice(0, 12))}
                          poolFundraisingEnabled={poolFundraisingEnabled}
                          onPoolFundraisingToggle={handlePoolFundraisingToggle}
                          poolGoalNairaInput={poolGoalNairaInput}
                          onPoolGoalNairaInputChange={setPoolGoalNairaInput}
                          poolDescriptionInput={poolDescriptionInput}
                          onPoolDescriptionInputChange={setPoolDescriptionInput}
                          recipientBankCode={recipientBankCode}
                          onRecipientBankCodeChange={(code) => {
                            setRecipientBankCode(code);
                            setRecipientAccountName('');
                            setRecipientResolveError(null);
                            lastResolvedRecipientRef.current = null;
                          }}
                          recipientAccountNumber={recipientAccountNumber}
                          onRecipientAccountNumberChange={(value) => {
                            setRecipientAccountNumber(value.replace(/\D/g, '').slice(0, 20));
                            setRecipientAccountName('');
                            setRecipientResolveError(null);
                            lastResolvedRecipientRef.current = null;
                          }}
                          recipientAccountName={recipientAccountName}
                          loadingBankOptions={loadingBankOptions}
                          bankOptions={bankOptions}
                          resolvingRecipientAccount={resolvingRecipientAccount}
                          recipientResolveError={recipientResolveError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: PERMISSIONS & FINALIZE (COMPACT) */}
              {currentStep === 5 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Collection Rules &amp; Sharing</h2>
                    <p className="text-xs text-stone-500">Configure contributor rules, copy sharing links, and save your changes.</p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Contributor permission toggles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50/70 border border-stone-200/80">
                        <Label htmlFor="photos" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Allow photo attachments from friends
                        </Label>
                        <Switch id="photos" checked={allowPhotos} onCheckedChange={setAllowPhotos} />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50/70 border border-stone-200/80">
                        <Label htmlFor="audio" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Allow voice note recordings
                        </Label>
                        <Switch id="audio" checked={allowAudio} onCheckedChange={setAllowAudio} />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50/70 border border-stone-200/80">
                        <Label htmlFor="names" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Require contributor names on wishes
                        </Label>
                        <Switch id="names" checked={requireNames} onCheckedChange={setRequireNames} />
                      </div>
                    </div>

                    {/* Contribution closing date */}
                    <div className="p-2.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-amber-950">Contribution Deadline</p>
                        <p className="text-[10px] text-amber-800">
                          {closeDate ? format(closeDate, 'PP') : (birthdayDate ? format(birthdayDate, 'PP') : 'Same as birthday date')}
                        </p>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl bg-white border-amber-300 text-amber-950">
                            Set Deadline
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={closeDate}
                            onSelect={setCloseDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Quick share links */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink('contribute')}
                        className="rounded-xl border-emerald-300 bg-emerald-50/50 text-emerald-950 hover:bg-emerald-100/60 text-xs font-bold h-9 gap-1.5"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy Invite Link</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink('birthday')}
                        className="rounded-xl border-amber-300 bg-amber-50/50 text-amber-950 hover:bg-amber-100/60 text-xs font-bold h-9 gap-1.5"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy Reveal Link</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Modal */}
              <QRCodeModal
                open={qrModalOpen}
                onOpenChange={setQrModalOpen}
                url={`${window.location.origin}/${qrType === 'contribute' ? 'contribute' : 'birthday'}/${publicCode || pageId}`}
                title={qrType === 'contribute' ? 'Contribution QR Code' : 'Birthday Reveal QR Code'}
                recipientName={recipientName}
              />

              {/* BOTTOM WIZARD NAVIGATION BAR */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-4 shadow-card flex items-center justify-between gap-2 sm:gap-4">
                {currentStep > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="rounded-xl border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 px-3 sm:px-4 h-9 gap-1.5 shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 5 && (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 sm:px-5 h-9 shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}

                {currentStep === 5 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Link to={`/preview/${publicCode || pageId}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs px-2.5 sm:px-4 h-9 shadow-xs flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-amber-600" />
                        <span className="hidden sm:inline">Preview</span>
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || uploadingCover || !hasResolvedPoolRecipient}
                      className="btn-press rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs px-3.5 sm:px-5 h-9 shadow-md shadow-amber-500/25 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {(saving || uploadingCover) ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="sm:hidden">Save Changes</span>
                          <span className="hidden sm:inline">Save Canvas Changes</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default EditPage;
