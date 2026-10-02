import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Gift,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Music,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react';
import { BrandMenuIcon } from '@/components/BrandIcons';
import SocialShareButtons from '@/components/SocialShareButtons';
import QRCodeModal from '@/components/QRCodeModal';
import Confetti from '@/components/Confetti';
import OpenerThemePreview from '@/components/OpenerThemePreview';
import ThemeSelector from '@/components/ThemeSelector';
import SoundtrackSelector from '@/components/SoundtrackSelector';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ApiError, apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
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
  toIsoDatetime,
} from '@/pages/page-wizard';
import { builtInThemeMap, visualThemeConfig } from '@/lib/themes';
import { fontClassForValue } from '@/pages/theme-builder';

const CREATOR_STEPS = [
  { number: 1, label: 'Honoree' },
  { number: 2, label: 'Keepsake' },
  { number: 3, label: 'Palette & View' },
  { number: 4, label: 'Soundtrack' },
  { number: 5, label: 'Permissions' },
];

const CREATE_FORM_STATE_KEY = 'wishcanvas_create_form_state';

interface CreateFormPersistedState {
  currentStep: number;
  recipientName: string;
  recipientEmail: string;
  guestEmail?: string;
  birthdayDate: string | null;
  creatorMessage: string;
  selectedTheme: Theme;
  selectedLetterTheme: Theme;
  selectedDisplayMode: DisplayMode;
  letterColor: string;
  letterGradientStart: string;
  letterGradientEnd: string;
  allowPhotos: boolean;
  allowAudio: boolean;
  requireNames: boolean;
  closeDate: string | null;
  selectedSoundtrackId: string;
  pageCustomAudioUrl: string | null;
  publicCodeInput: string;
  revealAtInput: string;
  revealPinInput: string;
  poolFundraisingEnabled: boolean;
  poolGoalNairaInput: string;
  poolDescriptionInput: string;
  recipientBankCode: string;
  recipientAccountNumber: string;
  recipientAccountName: string;
  previewView: 'card' | 'envelope';
}

function getInitialCreateState(): Partial<CreateFormPersistedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(CREATE_FORM_STATE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore malformed session state
  }
  return {};
}

const CreatePage = () => {
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

  // Creator statistics
  const [pages, setPages] = useState<BirthdayPage[]>([]);

  const initialDraft = useRef(getInitialCreateState()).current;

  // Fine-grained stepper state (Steps 1 to 5 for configuration, Step 6 for Launchpad)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const step = initialDraft.currentStep;
    return typeof step === 'number' && step >= 1 && step <= 5 ? step : 1;
  });
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  
  // Live stage preview state
  const [previewView, setPreviewView] = useState<'card' | 'envelope'>(() => initialDraft.previewView ?? 'card');
  const [confettiActive, setConfettiActive] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  
  // Form state
  const [recipientName, setRecipientName] = useState(() => initialDraft.recipientName ?? '');
  const [recipientEmail, setRecipientEmail] = useState(() => initialDraft.recipientEmail ?? '');
  const [guestEmail, setGuestEmail] = useState(() => initialDraft.guestEmail ?? '');
  const [guestClaimToken, setGuestClaimToken] = useState<string | null>(null);
  const [isGuestCreated, setIsGuestCreated] = useState<boolean>(false);
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(() => {
    return initialDraft.birthdayDate ? new Date(initialDraft.birthdayDate) : undefined;
  });
  const [creatorMessage, setCreatorMessage] = useState(() => initialDraft.creatorMessage ?? '');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(() => initialDraft.selectedTheme ?? user?.defaultTheme ?? 'elegant');
  const [selectedLetterTheme, setSelectedLetterTheme] = useState<Theme>(() => initialDraft.selectedLetterTheme ?? user?.defaultTheme ?? 'elegant');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>(() => initialDraft.selectedDisplayMode ?? 'story');
  const [letterColor, setLetterColor] = useState<string>(() => initialDraft.letterColor ?? '');
  const [letterGradientStart, setLetterGradientStart] = useState(() => initialDraft.letterGradientStart ?? DEFAULT_LETTER_START);
  const [letterGradientEnd, setLetterGradientEnd] = useState(() => initialDraft.letterGradientEnd ?? DEFAULT_LETTER_END);
  const [allowPhotos, setAllowPhotos] = useState(() => initialDraft.allowPhotos ?? user?.defaultAllowPhotos ?? true);
  const [allowAudio, setAllowAudio] = useState(() => initialDraft.allowAudio ?? user?.defaultAllowAudio ?? true);
  const [requireNames, setRequireNames] = useState(() => initialDraft.requireNames ?? user?.defaultRequireNames ?? true);
  const [closeDate, setCloseDate] = useState<Date | undefined>(() => {
    return initialDraft.closeDate ? new Date(initialDraft.closeDate) : undefined;
  });
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState(() => initialDraft.selectedSoundtrackId ?? 'golden-hour');
  const [pageCustomAudioUrl, setPageCustomAudioUrl] = useState<string | null>(() => initialDraft.pageCustomAudioUrl ?? null);
  
  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // QR code and Public Link state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState<'contribute' | 'birthday'>('contribute');
  const [createdPublicCode, setCreatedPublicCode] = useState<string | null>(null);
  const [publicCodeInput, setPublicCodeInput] = useState(() => initialDraft.publicCodeInput ?? '');
  const [publicCodeError, setPublicCodeError] = useState<string | null>(null);
  const [revealAtInput, setRevealAtInput] = useState(() => initialDraft.revealAtInput ?? '');
  const [revealPinInput, setRevealPinInput] = useState(() => initialDraft.revealPinInput ?? '');
  const [poolFundraisingEnabled, setPoolFundraisingEnabled] = useState(() => initialDraft.poolFundraisingEnabled ?? false);
  const [poolGoalNairaInput, setPoolGoalNairaInput] = useState(() => initialDraft.poolGoalNairaInput ?? '');
  const [poolDescriptionInput, setPoolDescriptionInput] = useState(() => initialDraft.poolDescriptionInput ?? '');
  const [recipientBankCode, setRecipientBankCode] = useState(() => initialDraft.recipientBankCode ?? '');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState(() => initialDraft.recipientAccountNumber ?? '');
  const [recipientAccountName, setRecipientAccountName] = useState(() => initialDraft.recipientAccountName ?? '');
  const [bankOptions, setBankOptions] = useState<PaystackBankOption[]>([]);
  const [loadingBankOptions, setLoadingBankOptions] = useState(false);
  const [resolvingRecipientAccount, setResolvingRecipientAccount] = useState(false);
  const [recipientResolveError, setRecipientResolveError] = useState<string | null>(null);
  const lastResolvedRecipientRef = useRef<string | null>(null);

  // Auto-persist form configuration and current step into session state (not localStorage)
  useEffect(() => {
    if (createdPageId || currentStep === 6) return;

    const draftToSave: CreateFormPersistedState = {
      currentStep,
      recipientName,
      recipientEmail,
      guestEmail,
      birthdayDate: birthdayDate ? birthdayDate.toISOString() : null,
      creatorMessage,
      selectedTheme,
      selectedLetterTheme,
      selectedDisplayMode,
      letterColor,
      letterGradientStart,
      letterGradientEnd,
      allowPhotos,
      allowAudio,
      requireNames,
      closeDate: closeDate ? closeDate.toISOString() : null,
      selectedSoundtrackId,
      pageCustomAudioUrl,
      publicCodeInput,
      revealAtInput,
      revealPinInput,
      poolFundraisingEnabled,
      poolGoalNairaInput,
      poolDescriptionInput,
      recipientBankCode,
      recipientAccountNumber,
      recipientAccountName,
      previewView,
    };

    try {
      sessionStorage.setItem(CREATE_FORM_STATE_KEY, JSON.stringify(draftToSave));
      window.history.replaceState({ ...window.history.state, wishcanvasCreateState: draftToSave }, '');
    } catch {
      // Ignore storage quota errors
    }
  }, [
    currentStep,
    recipientName,
    recipientEmail,
    guestEmail,
    birthdayDate,
    creatorMessage,
    selectedTheme,
    selectedLetterTheme,
    selectedDisplayMode,
    letterColor,
    letterGradientStart,
    letterGradientEnd,
    allowPhotos,
    allowAudio,
    requireNames,
    closeDate,
    selectedSoundtrackId,
    pageCustomAudioUrl,
    publicCodeInput,
    revealAtInput,
    revealPinInput,
    poolFundraisingEnabled,
    poolGoalNairaInput,
    poolDescriptionInput,
    recipientBankCode,
    recipientAccountNumber,
    recipientAccountName,
    previewView,
    createdPageId,
  ]);

  const isProUser = isPro;
  const hasResolvedPoolRecipient = Boolean(recipientBankCode && recipientAccountNumber.length === 10 && recipientAccountName.trim());
  const requiresResolvedPoolRecipient = isProUser && poolFundraisingEnabled;

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  const avatarSrc = resolveAssetUrl(profile?.avatar_url);
  const currentDisplayName = profile?.display_name || user?.displayName || user?.email?.split('@')[0] || 'Creator';
  const initial = (currentDisplayName.trim()[0] || 'C').toUpperCase();

  // Load banks for pool contributions
  useEffect(() => {
    let cancelled = false;
    setLoadingBankOptions(true);

    apiFetch<PaystackBankOption[]>('/paystack/banks')
      .then((banks) => {
        if (!cancelled) {
          setBankOptions(Array.isArray(banks) ? banks : []);
        }
      })
      .catch((error) => {
        console.error('Failed to load Paystack banks:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBankOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Free tier forces story display mode
  useEffect(() => {
    if (!isProUser && selectedDisplayMode !== 'story') {
      setSelectedDisplayMode('story');
    }
  }, [isProUser, selectedDisplayMode]);

  // Load custom themes created by user
  const fetchCustomThemes = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<CustomTheme[]>('/themes');
      setCustomThemes(data || []);
    } catch (error) {
      console.error('Failed to fetch custom themes:', error);
    }
  }, [user]);

  // Preload custom themes and pages stats
  useEffect(() => {
    if (user) {
      setSelectedTheme(user.defaultTheme || 'elegant');
      setSelectedLetterTheme(user.defaultTheme || 'elegant');
      setAllowPhotos(user.defaultAllowPhotos ?? true);
      setAllowAudio(user.defaultAllowAudio ?? true);
      setRequireNames(user.defaultRequireNames ?? true);
      void fetchCustomThemes();

      // Fetch user pages for header metrics
      apiFetch<BirthdayPage[]>('/pages')
        .then((data) => setPages(data || []))
        .catch(() => setPages([]));
    }
  }, [user, fetchCustomThemes]);

  // Auto-resolve recipient bank account details for pool gifts
  useEffect(() => {
    if (!isProUser || !poolFundraisingEnabled) {
      setRecipientAccountName('');
      setRecipientResolveError(null);
      lastResolvedRecipientRef.current = null;
      return;
    }

    const cleanAccount = recipientAccountNumber.trim();
    if (!recipientBankCode || cleanAccount.length !== 10) {
      setRecipientAccountName('');
      setRecipientResolveError(null);
      lastResolvedRecipientRef.current = null;
      return;
    }

    const key = `${recipientBankCode}:${cleanAccount}`;
    if (lastResolvedRecipientRef.current === key) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResolvingRecipientAccount(true);
      setRecipientResolveError(null);

      apiFetch<{ accountName: string; accountNumber: string; bankCode: string }>('/paystack/resolve-account', {
        method: 'POST',
        body: JSON.stringify({
          accountNumber: cleanAccount,
          bankCode: recipientBankCode,
        }),
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

  const handleCoverPhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
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

  // Step transitions with validation
  const handleNext = () => {
    if (currentStep === 1) {
      if (!recipientName.trim()) {
        toast.error('Please enter the celebrant name');
        return;
      }
      if (!birthdayDate) {
        toast.error('Please select a birthday milestone date');
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

  // Create page submission at Step 5
  const handleCreateCanvas = async () => {
    if (!recipientName.trim()) {
      toast.error('Please enter the celebrant name');
      setCurrentStep(1);
      return;
    }
    if (!birthdayDate) {
      toast.error('Please select a birthday milestone date');
      setCurrentStep(1);
      return;
    }
    if (!user) {
      const cleanGuestEmail = guestEmail.trim().toLowerCase();
      if (!cleanGuestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanGuestEmail)) {
        toast.error('Please enter a valid email address to receive your canvas links');
        setCurrentStep(5);
        return;
      }
    }
    if (requiresResolvedPoolRecipient && !hasResolvedPoolRecipient) {
      toast.error('Resolve recipient account details before continuing');
      setCurrentStep(4);
      return;
    }

    setSaving(true);
    setPublicCodeError(null);
    const normalizedPublicCode = publicCodeInput.trim().toLowerCase();
    if (isProUser && normalizedPublicCode && !/^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/.test(normalizedPublicCode)) {
      setPublicCodeError('Use 6-40 chars with lowercase letters, numbers, and hyphens.');
      setSaving(false);
      setCurrentStep(4);
      return;
    }

    try {
      const data = await apiFetch<{ id: string; public_code: string; claim_token?: string; is_guest?: boolean }>('/pages', {
        method: 'POST',
        body: JSON.stringify({
          recipientName,
          recipientEmail: recipientEmail.trim() || null,
          guestEmail: !user ? guestEmail.trim().toLowerCase() : undefined,
          birthdayDate: format(birthdayDate!, 'yyyy-MM-dd'),
          theme: selectedTheme,
          letterTheme: selectedLetterTheme,
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
      if (data.claim_token) {
        setGuestClaimToken(data.claim_token);
      }
      setIsGuestCreated(Boolean(data.is_guest || !user));
      setConfettiActive(true);
      try {
        sessionStorage.removeItem(CREATE_FORM_STATE_KEY);
      } catch {
        // ignore
      }
      toast.success(!user ? 'Guest canvas created! Links sent to your email.' : 'Birthday canvas created successfully!');
      setCurrentStep(6); // Step 6 is the Launchpad Hub!
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && error.status === 409) {
        setPublicCodeError('That custom link is already taken. Try another one.');
        toast.error('Custom link already taken');
        setCurrentStep(4);
        return;
      }
      toast.error('Failed to create page');
      console.error(error);
      return;
    }
    setSaving(false);
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
          letterTheme: selectedLetterTheme,
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
      toast.success('Canvas settings updated');
    } catch (error) {
      toast.error('Failed to update canvas settings');
      console.error(error);
    }
  }, [birthdayDate, closeDate, createdPageId, creatorMessage, isProUser, letterColor, pageCustomAudioUrl, poolDescriptionInput, poolFundraisingEnabled, poolGoalNairaInput, recipientAccountName, recipientAccountNumber, recipientBankCode, recipientEmail, recipientName, selectedDisplayMode, selectedLetterTheme, selectedSoundtrackId, selectedTheme]);

  const handleAllowPhotosChange = (checked: boolean) => {
    setAllowPhotos(checked);
    if (createdPageId) {
      void updateCreatedPageSettings(checked, allowAudio, requireNames);
    }
  };

  const handleAllowAudioChange = (checked: boolean) => {
    setAllowAudio(checked);
    if (createdPageId) {
      void updateCreatedPageSettings(allowPhotos, checked, requireNames);
    }
  };

  const handleRequireNamesChange = (checked: boolean) => {
    setRequireNames(checked);
    if (createdPageId) {
      void updateCreatedPageSettings(allowPhotos, allowAudio, checked);
    }
  };

  const handlePoolFundraisingToggle = (checked: boolean) => {
    setPoolFundraisingEnabled(checked);
    toast.info(
      checked
        ? 'Pool contributions enabled. A 2% payout fee applies when releasing the gift.'
        : 'Pool contributions disabled for this canvas.',
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

  // Live Stage Preview Computations
  const getPreviewColors = (): { start: string; end: string; mid?: string | null } => {
    if (resolvedCustomTheme) {
      return {
        start: resolvedCustomTheme.gradient_from,
        end: resolvedCustomTheme.gradient_to,
        mid: resolvedCustomTheme.gradient_mid || null,
      };
    }
    const builtIn = builtInThemeMap[selectedTheme];
    if (builtIn) {
      return {
        start: builtIn.gradientColors[0],
        end: builtIn.gradientColors[1],
        mid: null,
      };
    }
    return {
      start: '#fbbf24',
      end: '#f97316',
      mid: null,
    };
  };

  const previewColors = getPreviewColors();

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

  const resolvedLetterCustomTheme = findCustomTheme(selectedLetterTheme, customThemes);
  const letterColors = getEffectiveColors(selectedLetterTheme, letterColor, customThemes);
  const currentLetterThemeName = (() => {
    if (resolvedLetterCustomTheme) return resolvedLetterCustomTheme.name;
    return builtInThemeMap[selectedLetterTheme]?.name || 'Signature Gold';
  })();

  const triggerConfettiPop = () => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3500);
  };

  if (authLoading) {
    return <WishCanvasLoader />;
  }

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
                to={user ? '/dashboard' : '/'}
                className="font-serif font-bold text-slate-950 text-sm sm:text-base tracking-tight hover:text-amber-800 transition-colors"
              >
                Celebration Atelier
              </Link>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-stone-300" />
              <span className="hidden sm:inline-block text-[11px] text-stone-500 font-medium">
                {currentStep <= 5 ? `Step ${currentStep} of 5: ${CREATOR_STEPS[currentStep - 1].label}` : 'Step 6: Launchpad Activated'}
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            {user ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 text-[11px] font-bold shadow-2xs">
                  <Sparkles className="h-3 w-3 text-amber-700" />
                  <span>Guest Studio</span>
                </span>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl border-stone-300 text-stone-700 hover:bg-stone-50">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Main Workbench Body with Zero-Scroll Split Studio */}
        <main className="flex-1 p-3.5 sm:p-7 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Craft Milestone <span className="italic text-rose-500">Celebration Canvas</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">zero-scroll studio</span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
                Step-by-step studio workbench. The form stays compact and never taller than your live preview.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link to={user ? '/dashboard' : '/'}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-2xl border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
                  {user ? 'Return to Timeline' : 'Return Home'}
                </Button>
              </Link>
            </div>
          </div>

          {/* THE ZERO-SCROLL SPLIT STUDIO CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            
            {/* LEFT COLUMN: THE LIVE CELEBRATION CANVAS STAGE (5 cols on LG, sticky in view) */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 self-start space-y-4">
              <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-3.5 sm:p-5 shadow-card flex flex-col relative overflow-hidden">
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

                {/* Stage Top Bar */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 relative z-10 gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-950 flex items-center gap-1.5 font-sans whitespace-nowrap">
                      <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="hidden sm:inline">Live Canvas Stage</span>
                      <span className="sm:hidden">Live Stage</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* Mobile View Toggle */}
                    <button
                      type="button"
                      onClick={() => setMobilePreviewOpen((prev) => !prev)}
                      className={cn(
                        'lg:hidden flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all font-sans whitespace-nowrap shrink-0 shadow-2xs active:scale-95',
                        mobilePreviewOpen
                          ? 'bg-slate-950 text-white shadow-xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      )}
                      aria-label={mobilePreviewOpen ? 'Hide stage preview' : 'Show stage preview'}
                    >
                      {mobilePreviewOpen ? (
                        <>
                          <ChevronUp className="h-3 w-3 text-stone-400" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 text-stone-500" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>

                    {/* Switch between Canvas Card and Envelope Opener */}
                    <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded-xl border border-stone-200/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewView('card')}
                        className={cn(
                          'px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all whitespace-nowrap shrink-0',
                          previewView === 'card'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-500 hover:text-slate-900',
                        )}
                      >
                        <span className="hidden xs:inline">Reveal </span>Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewView('envelope')}
                        className={cn(
                          'px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all whitespace-nowrap shrink-0',
                          previewView === 'envelope'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-500 hover:text-slate-900',
                        )}
                      >
                        {selectedDisplayMode === 'bento' ? 'Vault Opener' : selectedDisplayMode === 'freeform' ? 'Board Opener' : 'Envelope'}
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
                        {coverPhotoPreview && (
                          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/25 w-fit">
                            <img
                              src={coverPhotoPreview}
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
                          <div className="rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 p-2.5 text-xs leading-relaxed text-white/95 shadow-sm">
                            <p className="text-[9px] uppercase tracking-wider text-white/70 font-bold mb-0.5">
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
                      <div className="my-auto relative z-10 space-y-2 text-white animate-fade-in">
                        {/* Bento Header Bar */}
                        <div className="flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">
                              Bento Vault
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[8.5px] font-semibold text-white/80">
                            <span className="rounded-full bg-black/20 backdrop-blur-xs px-2 py-0.5 border border-white/15">12 wishes</span>
                            <span className="rounded-full bg-black/20 backdrop-blur-xs px-2 py-0.5 border border-white/15">6 photos</span>
                          </div>
                        </div>

                        {/* Bento Grid Compartments */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Tile 1: Milestone Honoree Hero Card */}
                          <div className="col-span-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 p-3 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 border border-amber-300/40 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-widest text-amber-200">
                                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                                <span>Milestone Honoree</span>
                              </span>
                              <span className="text-[9.5px] text-white/80 font-medium">
                                {birthdayDate ? format(birthdayDate, 'MMM d, yyyy') : 'Milestone'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              {coverPhotoPreview ? (
                                <img
                                  src={coverPhotoPreview}
                                  alt="Cover"
                                  className="h-11 w-11 rounded-xl object-cover border border-white/50 shadow-xs shrink-0"
                                />
                              ) : (
                                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
                                  🎂
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h2 className={cn('text-base sm:text-lg font-bold leading-tight text-white truncate', previewFontClass)}>
                                  Happy Birthday, {recipientName.trim() ? recipientName.trim() : 'Alex'}! ✨
                                </h2>
                                <p className="text-[10px] text-white/75 truncate">
                                  Celebration board with wishes and moments
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Tile 2: Moments Vault Metric */}
                          <div className="col-span-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2.5 flex flex-col justify-between min-h-[78px] shadow-sm">
                            <span className="text-[8.5px] font-bold uppercase tracking-wider text-white/75">Moments Vault</span>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-white/90">
                                <span>📸</span>
                                <span>6 photos</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-200">
                                <span>🎙️</span>
                                <span>3 voice clips</span>
                              </div>
                            </div>
                          </div>

                          {/* Tile 3: Collected Wishes Metric */}
                          <div className="col-span-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2.5 flex flex-col justify-between min-h-[78px] shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[8.5px] font-bold uppercase tracking-wider text-white/75">Collected</span>
                              <span className="text-xs">❤️</span>
                            </div>
                            <div>
                              <p className="text-xl font-extrabold leading-none text-white">12</p>
                              <p className="text-[9px] text-white/75 font-medium mt-0.5">wishes pinned</p>
                            </div>
                          </div>

                          {/* Tile 4: Organizer Welcome Note Snippet (if typed) */}
                          {creatorMessage.trim() && (
                            <div className="col-span-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 p-2.5 text-xs leading-relaxed text-white/95 shadow-sm">
                              <p className="text-[8.5px] uppercase tracking-wider text-white/75 font-bold mb-0.5">
                                Organizer Dedication:
                              </p>
                              <p className="italic line-clamp-1">&quot;{creatorMessage}&quot;</p>
                            </div>
                          )}

                          {/* Tile 5: Pinned Wish Card (Spans 2 cols) */}
                          <div className="col-span-2 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 p-2.5 text-slate-900 shadow-sm">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-bold text-slate-800">David K.</span>
                              <span className="text-[9.5px] text-stone-500 font-medium">Friend</span>
                            </div>
                            <p className="text-xs text-stone-700 leading-snug line-clamp-1">
                              Wishing you the greatest year yet filled with joy, adventure, and success! 🎂
                            </p>
                          </div>
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
                            {coverPhotoPreview ? (
                              <img src={coverPhotoPreview} alt="Cover" className="h-full w-full object-cover" />
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

                          {/* Sticky Note 2 (Audio memo) */}
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
                  /* PREVIEW VIEW 2: OPENER PREVIEW */
                  <div className="my-3 flex flex-col items-center justify-center min-h-[440px] bg-stone-50/70 rounded-3xl p-6 border border-stone-200/70">
                    <div className={cn("flex items-center justify-between w-full mb-3 px-1 text-xs", selectedDisplayMode === 'story' ? "max-w-[210px]" : "max-w-[230px]")}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        {selectedDisplayMode === 'bento' ? 'Vault Theme' : selectedDisplayMode === 'freeform' ? 'Board Theme' : 'Envelope Theme'}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{currentLetterThemeName}</span>
                    </div>
                    <OpenerThemePreview
                      mode={selectedDisplayMode}
                      startColor={letterColors.start}
                      endColor={letterColors.end}
                      midColor={letterColors.mid}
                      gradientAngle={letterColors.angle}
                      recipientName={recipientName}
                      coverPhotoUrl={coverPhotoPreview}
                    />
                    <p className={cn("text-[11px] text-stone-500 mt-4 text-center leading-relaxed", selectedDisplayMode === 'story' ? "max-w-[215px]" : "max-w-[235px]")}>
                      {selectedDisplayMode === 'bento'
                        ? `Interactive 3D Bento Vault styled with ${currentLetterThemeName}, presented to ${recipientName || 'the celebrant'} before opening.`
                        : selectedDisplayMode === 'freeform'
                        ? `Interactive Polaroid memory board styled with ${currentLetterThemeName}, presented to ${recipientName || 'the celebrant'} on arrival.`
                        : `Interactive wax-seal envelope styled with ${currentLetterThemeName}, shown to ${recipientName || 'the celebrant'} on arrival.`}
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
              {currentStep <= 5 && (
                <div className="rounded-2xl border border-stone-200/90 bg-white p-2.5 sm:p-4 shadow-card overflow-hidden">
                  <div className="flex items-center justify-between max-w-xl mx-auto relative w-full">
                    {CREATOR_STEPS.map((s, i) => {
                      const isCompleted = currentStep > s.number;
                      const isCurrent = currentStep === s.number;

                      return (
                        <Fragment key={s.number}>
                          <button
                            type="button"
                            onClick={() => {
                              if (isCompleted || isCurrent) {
                                setCurrentStep(s.number);
                              }
                            }}
                            className={cn(
                              'flex flex-col items-center relative z-10 group shrink-0',
                              (isCompleted || isCurrent) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                            )}
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

                          {i < CREATOR_STEPS.length - 1 && (
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
              )}

              {/* STEP 1: THE HONOREE (COMPACT, NEVER LONGER THAN PREVIEW) */}
              {currentStep === 1 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Who are we celebrating?</h2>
                    <p className="text-xs text-stone-500">Provide the celebrant&apos;s name and birthday date to personalize their canvas.</p>
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
                        autoFocus
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
                        If provided, an automated birthday delivery invite can be scheduled.
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
                    <p className="text-xs text-stone-500">Add an optional cover photo and an opening message from you as the organizer.</p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* Cover photo uploader */}
                    <div>
                      <Label className="text-xs font-bold text-slate-800">Celebrant Cover Photo (optional)</Label>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverPhotoSelect}
                        className="hidden"
                      />

                      {coverPhotoPreview ? (
                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/70">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={coverPhotoPreview}
                              alt="Cover thumbnail"
                              className="h-11 w-11 shrink-0 rounded-xl object-cover border border-stone-300 shadow-2xs"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">Cover Photo Selected</p>
                              <p className="text-[11px] text-stone-500 truncate">Shown on the canvas cover portrait</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeCoverPhoto}
                            className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold px-2.5 self-end sm:self-auto shrink-0"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
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
                        Organizer&apos;s Welcome Note (optional)
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

              {/* STEP 4: SOUNDTRACK & LETTER (COMPACT) */}
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

              {/* STEP 5: PERMISSIONS & LAUNCH (COMPACT) */}
              {currentStep === 5 && (
                <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card space-y-4 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Collection Rules &amp; Craft</h2>
                    <p className="text-xs text-stone-500">Configure contributor rules and launch your milestone canvas.</p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/80">
                      <Label htmlFor="photos" className="text-xs font-bold text-slate-900 cursor-pointer">
                        Allow photo attachments from friends
                      </Label>
                      <Switch id="photos" checked={allowPhotos} onCheckedChange={handleAllowPhotosChange} />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/80">
                      <Label htmlFor="audio" className="text-xs font-bold text-slate-900 cursor-pointer">
                        Allow voice note audio recordings
                      </Label>
                      <Switch id="audio" checked={allowAudio} onCheckedChange={handleAllowAudioChange} />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/80">
                      <Label htmlFor="names" className="text-xs font-bold text-slate-900 cursor-pointer">
                        Require contributor names on wishes
                      </Label>
                      <Switch id="names" checked={requireNames} onCheckedChange={handleRequireNamesChange} />
                    </div>

                    {/* Contribution closing date */}
                    <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-amber-950">Milestone Contribution Deadline</p>
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

                    {/* Guest Mode Email & Non-Editable Notice */}
                    {!user && (
                      <div className="space-y-3 pt-2 border-t border-stone-200/80">
                        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="guestEmailInput" className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-amber-700" />
                              <span>Your Email Address (Required for Guest Mode)</span>
                            </Label>
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                              Required
                            </span>
                          </div>
                          <Input
                            id="guestEmailInput"
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="e.g. yourname@example.com"
                            className="h-10 rounded-xl bg-white border-amber-300 text-xs text-slate-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-amber-500/20"
                            required
                          />
                          <p className="text-[11px] text-amber-900/80 leading-relaxed">
                            We will email your contributor invite link, live preview link, and a private magic claim key to this address.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 space-y-1">
                          <div className="flex items-center gap-1.5 text-stone-900 font-bold text-xs">
                            <Lock className="h-3.5 w-3.5 text-stone-600" />
                            <span>Guest Creation Notice: Non-Editable After Launch</span>
                          </div>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            As a guest, your milestone canvas goes live immediately to collect wishes. However, you will not be able to edit details, customize themes, or moderate wishes after creating it unless you create a free account to claim this canvas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: CELEBRATION LAUNCHPAD & SHARING HUB */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-card text-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto text-2xl shadow-xs">
                      🎉
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Keepsake Activated
                      </span>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                        {recipientName}&apos;s Canvas is Ready!
                      </h2>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed mt-0.5">
                        Share the guest invite link to start collecting heartfelt wishes and voice notes.
                      </p>
                    </div>
                  </div>

                  {/* PROMINENT GUEST CLAIM BANNER */}
                  {(!user || isGuestCreated) && (
                    <div className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50 via-rose-50/40 to-white p-5 sm:p-6 shadow-sm space-y-3.5 text-left animate-fade-in">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-950">Claim Canvas &amp; Unlock Editing</h3>
                            <p className="text-[11px] text-stone-600">Take full ownership to edit settings, customize themes, and curate wishes.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                          Guest Canvas
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        We sent your contributor invite, preview link, and magic claim key to <span className="font-bold text-slate-900">{guestEmail || 'your email'}</span>. Create a free account now to claim this canvas and manage it anytime.
                      </p>

                      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <Link
                          to={`/auth?mode=signup&claim_token=${guestClaimToken || ''}&email=${encodeURIComponent(guestEmail)}&public_code=${createdPublicCode || ''}`}
                          className="flex-1"
                        >
                          <Button className="btn-press w-full rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-9 shadow-xs gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            <span>Create Account to Claim Canvas</span>
                          </Button>
                        </Link>
                        <Link
                          to={`/auth?mode=login&claim_token=${guestClaimToken || ''}&email=${encodeURIComponent(guestEmail)}&public_code=${createdPublicCode || ''}`}
                        >
                          <Button variant="outline" className="w-full sm:w-auto rounded-xl border-stone-300 text-xs font-semibold h-9 px-3.5 hover:bg-stone-50">
                            Already have an account? Sign in
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* 2-Column Sharing Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* GUEST INVITATION LINK */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col justify-between space-y-3 shadow-xs">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                          <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                            ✉️
                          </div>
                          <span>Guest Invite Link</span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-1">
                          Send to friends and family to collect notes, photos, and voice wishes.
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyLink('contribute')}
                            className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Invite</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl border-emerald-300 bg-white text-emerald-900 h-8 w-8 shadow-xs"
                            onClick={() => {
                              setQrType('contribute');
                              setQrModalOpen(true);
                            }}
                            title="Show QR Code"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="pt-2 border-t border-emerald-200/60">
                          <SocialShareButtons
                            url={`${window.location.origin}/contribute/${createdPublicCode || createdPageId}`}
                            message={`🎂 Help me celebrate ${recipientName}'s birthday! Add your heartfelt wish here:`}
                            recipientName={recipientName}
                          />
                        </div>
                      </div>
                    </div>

                    {/* CELEBRANT REVEAL LINK */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col justify-between space-y-3 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                            <div className="h-6 w-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs">
                              🎂
                            </div>
                            <span>Celebrant Reveal Link</span>
                          </div>
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                            Private
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-1">
                          Only give this link to {recipientName} on their special day to open the reveal.
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => copyLink('birthday')}
                            className="flex-1 rounded-xl border-amber-300 bg-white hover:bg-amber-100/60 text-amber-950 font-bold text-xs h-8 gap-1.5 shadow-xs"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Reveal</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl border-amber-300 bg-white text-amber-900 h-8 w-8 shadow-xs"
                            onClick={() => {
                              setQrType('birthday');
                              setQrModalOpen(true);
                            }}
                            title="Show QR Code"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <Link to={`/preview/${createdPublicCode || createdPageId}`} className="block">
                          <Button
                            size="sm"
                            className="btn-press w-full rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                          >
                            <Eye className="h-3 w-3 text-amber-300" />
                            <span>Preview Reveal</span>
                          </Button>
                        </Link>
                      </div>
                    </div>

                  </div>

                  {/* QR Code Modal Component */}
                  <QRCodeModal
                    open={qrModalOpen}
                    onOpenChange={setQrModalOpen}
                    url={`${window.location.origin}/${qrType === 'contribute' ? 'contribute' : 'birthday'}/${createdPublicCode || createdPageId}`}
                    title={qrType === 'contribute' ? 'Contribution QR Code' : 'Birthday Reveal QR Code'}
                    recipientName={recipientName}
                  />
                </div>
              )}

              {/* BOTTOM WIZARD NAVIGATION BAR (ALWAYS COMPACT & VISIBLE) */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-4 shadow-card flex items-center justify-between gap-2 sm:gap-4">
                {currentStep > 1 && currentStep <= 5 ? (
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
                  <Button
                    size="sm"
                    onClick={handleCreateCanvas}
                    disabled={saving || uploadingCover}
                    className="btn-press rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs px-3.5 sm:px-5 h-9 shadow-md shadow-amber-500/25 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {(saving || uploadingCover) ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        <span>Crafting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="sm:hidden">Craft Canvas</span>
                        <span className="hidden sm:inline">Craft Milestone Canvas</span>
                      </>
                    )}
                  </Button>
                )}

                {currentStep === 6 && (
                  <div className="flex items-center gap-2">
                    {user ? (
                      <>
                        <Link to={`/edit/${createdPublicCode || createdPageId}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs px-4 h-9 shadow-xs"
                          >
                            Curate Canvas
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => navigate('/dashboard')}
                          className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-5 h-9 shadow-card flex items-center gap-1.5"
                        >
                          <span>Go to Timeline</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link to={`/preview/${createdPublicCode || createdPageId}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs px-4 h-9 shadow-xs"
                          >
                            Preview Reveal
                          </Button>
                        </Link>
                        <Link to={`/auth?mode=signup&claim_token=${guestClaimToken || ''}&email=${encodeURIComponent(guestEmail)}&public_code=${createdPublicCode || ''}`}>
                          <Button
                            size="sm"
                            className="btn-press rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 sm:px-5 h-9 shadow-card flex items-center gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            <span>Claim Canvas</span>
                          </Button>
                        </Link>
                      </>
                    )}
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

export default CreatePage;
