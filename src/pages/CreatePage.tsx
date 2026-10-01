import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  Gift,
  Loader2,
  Music,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { BrandMenuIcon } from '@/components/BrandIcons';
import SocialShareButtons from '@/components/SocialShareButtons';
import QRCodeModal from '@/components/QRCodeModal';
import Confetti from '@/components/Confetti';
import OpenerThemePreview from '@/components/OpenerThemePreview';
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
import type { CustomTheme, DisplayMode, PaystackBankOption, Step, Theme } from '@/pages/page-wizard';
import {
  CreateThemeProFooter,
  DEFAULT_LETTER_END,
  DEFAULT_LETTER_START,
  WIZARD_STEPS,
  WizardStepDetails,
  WizardStepTheme,
  toIsoDatetime,
} from '@/pages/page-wizard';
import { builtInThemeMap, visualThemeConfig } from '@/lib/themes';
import { fontClassForValue, fontLabelForValue } from '@/pages/theme-builder';

const CreatePage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  
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

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  
  // Live stage preview state
  const [previewView, setPreviewView] = useState<'card' | 'envelope'>('card');
  const [confettiActive, setConfettiActive] = useState(false);
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(user?.defaultTheme || 'elegant');
  const [selectedLetterTheme, setSelectedLetterTheme] = useState<Theme>(user?.defaultTheme || 'elegant');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>('story');
  const [letterColor, setLetterColor] = useState<string>('');
  const [letterGradientStart, setLetterGradientStart] = useState(DEFAULT_LETTER_START);
  const [letterGradientEnd, setLetterGradientEnd] = useState(DEFAULT_LETTER_END);
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
  
  // QR code and Public Link state
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

  const isProUser = Boolean(user?.isPro || profile?.plan === 'pro');
  const hasResolvedPoolRecipient = Boolean(recipientBankCode && recipientAccountNumber.length === 10 && recipientAccountName.trim());
  const requiresResolvedPoolRecipient = isProUser && poolFundraisingEnabled;

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  const avatarSrc = resolveAssetUrl(profile?.avatarUrl);
  const currentDisplayName = profile?.fullName || user?.name || 'Creator';
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

  const handleNext = async () => {
    if (step === 1) {
      if (!recipientName.trim()) {
        toast.error('Please enter the celebrant name');
        return;
      }
      if (!birthdayDate) {
        toast.error('Please select a birthday milestone date');
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
        toast.success('Birthday canvas created successfully!');
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
    
    setStep((prev) => Math.min(prev + 1, 3) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Live Stage Preview Computations
  const getPreviewColors = (): { start: string; end: string; mid?: string | null } => {
    const custom = customThemes.find((t) => t.id === selectedTheme);
    if (custom) {
      return {
        start: custom.gradient_from,
        end: custom.gradient_to,
        mid: custom.gradient_mid || null,
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
    const custom = customThemes.find((t) => t.id === selectedTheme);
    if (custom) {
      const angle = custom.gradient_angle ?? 135;
      if (custom.gradient_mid) {
        return `linear-gradient(${angle}deg, ${custom.gradient_from} 0%, ${custom.gradient_mid} 50%, ${custom.gradient_to} 100%)`;
      }
      return `linear-gradient(${angle}deg, ${custom.gradient_from} 0%, ${custom.gradient_to} 100%)`;
    }
    const builtIn = builtInThemeMap[selectedTheme];
    if (builtIn) {
      return `linear-gradient(135deg, ${builtIn.gradientColors[0]} 0%, ${builtIn.gradientColors[1]} 100%)`;
    }
    return 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)';
  })();

  const previewEmoji = (() => {
    const custom = customThemes.find((t) => t.id === selectedTheme);
    if (custom) return custom.emoji || '✨';
    return builtInThemeMap[selectedTheme]?.emoji || '✨';
  })();

  const previewFontClass = (() => {
    const custom = customThemes.find((t) => t.id === selectedTheme);
    if (custom) {
      return fontClassForValue(custom.font || 'jakarta');
    }
    return visualThemeConfig[selectedTheme as keyof typeof visualThemeConfig]?.font || 'font-serif';
  })();

  const currentThemeName = (() => {
    const custom = customThemes.find((t) => t.id === selectedTheme);
    if (custom) return custom.name;
    return builtInThemeMap[selectedTheme]?.name || 'Signature Gold';
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
      {/* Background Celebratory Glows identical to Dashboard, Settings, Theme Studio */}
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
                Step {step} of 3: {WIZARD_STEPS[step - 1].label}
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
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-7 max-w-7xl w-full mx-auto">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Craft Milestone <span className="italic text-rose-500">Celebration Canvas</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">zero-scroll studio</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
                Watch your celebration card update live on the left as you sculpt details, choose palettes, and curate soundtracks.
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
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card flex flex-col relative overflow-hidden">
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

                {/* Stage Top Bar */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-amber-600" />
                      Live Canvas Stage
                    </span>
                  </div>

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
                        <div className="h-9 w-9 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-lg shadow-md">
                          {previewEmoji}
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
                      <div className="my-auto relative z-10 grid grid-cols-2 gap-2 text-white animate-fade-in">
                        {/* Bento Tile 1: Hero Name (Col Span 2) */}
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

                        {/* Bento Tile 2: Cover Photo or Moments Frame */}
                        <div className="col-span-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2.5 flex flex-col items-center justify-center text-center min-h-[90px] shadow-sm">
                          {coverPhotoPreview ? (
                            <img
                              src={coverPhotoPreview}
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

                        {/* Bento Tile 4: Pinned Wish Card (Col Span 2) */}
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
                  /* PREVIEW VIEW 2: ENVELOPE OPENER */
                  <div className="my-3 flex flex-col items-center justify-center min-h-[440px] bg-stone-50/70 rounded-3xl p-6 border border-stone-200/70">
                    <OpenerThemePreview
                      mode={selectedDisplayMode}
                      startColor={previewColors.start}
                      endColor={previewColors.end}
                      midColor={previewColors.mid}
                      recipientName={recipientName}
                    />
                    <p className="text-[11px] text-stone-500 mt-4 text-center">
                      Interactive wax-seal envelope shown to {recipientName || 'the celebrant'} on initial arrival.
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

            {/* RIGHT COLUMN: THE CREATION WORKBENCH (7 cols on LG) */}
            <div className="lg:col-span-7 space-y-6">

              {/* ARTISAN STEPPER PROGRESSION CARD */}
              <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card">
                <div className="flex items-center justify-between max-w-xl mx-auto relative">
                  {WIZARD_STEPS.map((s, i) => {
                    const isCompleted = step > s.number;
                    const isCurrent = step === s.number;

                    return (
                      <Fragment key={s.number}>
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={cn(
                              'w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 shadow-2xs',
                              isCurrent
                                ? 'bg-slate-950 text-white shadow-xs ring-4 ring-amber-400/30'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-100 text-stone-400 border border-stone-200',
                            )}
                          >
                            {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.number}
                          </div>
                          <span
                            className={cn(
                              'text-[11px] sm:text-xs mt-2 font-bold transition-colors text-center',
                              isCurrent ? 'text-slate-950' : isCompleted ? 'text-emerald-800' : 'text-stone-400',
                            )}
                          >
                            {s.label}
                          </span>
                        </div>

                        {i < WIZARD_STEPS.length - 1 && (
                          <div
                            className={cn(
                              'flex-1 h-0.5 sm:h-1 mx-2 sm:mx-4 rounded-full transition-all duration-300',
                              step > s.number ? 'bg-emerald-500' : 'bg-stone-200',
                            )}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* STEP 1: THE CELEBRANT & ESSENTIALS */}
              {step === 1 && (
                <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card">
                  <WizardStepDetails
                    variant="create"
                    recipientName={recipientName}
                    setRecipientName={setRecipientName}
                    recipientEmail={recipientEmail}
                    setRecipientEmail={setRecipientEmail}
                    birthdayDate={birthdayDate}
                    setBirthdayDate={setBirthdayDate}
                    closeDate={closeDate}
                    setCloseDate={setCloseDate}
                    creatorMessage={creatorMessage}
                    setCreatorMessage={setCreatorMessage}
                    coverPreviewUrl={coverPhotoPreview}
                    coverInputRef={coverInputRef}
                    onCoverSelect={handleCoverPhotoSelect}
                    onRemoveCover={removeCoverPhoto}
                  />
                </div>
              )}

              {/* STEP 2: AESTHETICS & SOUNDTRACK */}
              {step === 2 && (
                <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card">
                  <WizardStepTheme
                    variant="create"
                    showPreview={false}
                    recipientName={recipientName}
                    selectedTheme={selectedTheme}
                    onSelectTheme={setSelectedTheme}
                    selectedLetterTheme={selectedLetterTheme}
                    onSelectLetterTheme={setSelectedLetterTheme}
                    customThemes={customThemes}
                    isProUser={isProUser}
                    selectedDisplayMode={selectedDisplayMode}
                    onSelectDisplayMode={setSelectedDisplayMode}
                    letterColor={letterColor}
                    setLetterColor={setLetterColor}
                    letterGradientStart={letterGradientStart}
                    setLetterGradientStart={setLetterGradientStart}
                    letterGradientEnd={letterGradientEnd}
                    setLetterGradientEnd={setLetterGradientEnd}
                    selectedSoundtrackId={selectedSoundtrackId}
                    onSelectSoundtrackId={setSelectedSoundtrackId}
                    pageCustomAudioUrl={pageCustomAudioUrl}
                    onChangeCustomAudioUrl={handleCustomAudioUrlChange}
                    footer={
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
                    }
                  />
                </div>
              )}

              {/* STEP 3: CELEBRATION LAUNCHPAD & SHARING HUB */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-10 shadow-card text-center space-y-4">
                    <div className="h-16 w-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto text-3xl shadow-xs">
                      🎉
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Keepsake Activated
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                        {recipientName}&apos;s Birthday Canvas is Ready!
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                        Share the invite link with friends and family to start gathering heartfelt wishes before the reveal date.
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Sharing Cards (Guest Invite vs Celebrant Reveal) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* 1. GUEST INVITATION LINK */}
                    <div className="rounded-[2rem] border border-emerald-200/90 bg-emerald-50/50 p-6 flex flex-col justify-between space-y-4 shadow-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                          <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm shadow-2xs">
                            ✉️
                          </div>
                          <span>Guest Contribution Link</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Send this to friends, coworkers, and family to leave written notes, photos, and voice messages.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyLink('contribute')}
                            className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 gap-1.5 shadow-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Invite Link</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl border-emerald-300 bg-white text-emerald-900 h-9 w-9 shadow-xs"
                            onClick={() => {
                              setQrType('contribute');
                              setQrModalOpen(true);
                            }}
                            title="Show QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="pt-3 border-t border-emerald-200/60">
                          <p className="text-[11px] font-bold text-stone-500 mb-2">Share directly on WhatsApp &amp; Social</p>
                          <SocialShareButtons
                            url={`${window.location.origin}/contribute/${createdPublicCode || createdPageId}`}
                            message={`🎂 Help me celebrate ${recipientName}'s birthday! Add your heartfelt wish here:`}
                            recipientName={recipientName}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. CELEBRANT REVEAL LINK */}
                    <div className="rounded-[2rem] border border-amber-200/90 bg-amber-50/50 p-6 flex flex-col justify-between space-y-4 shadow-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                            <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm shadow-2xs">
                              🎂
                            </div>
                            <span>Celebrant Reveal Link</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                            Private
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Only give this link to {recipientName} on their birthday to unlock the animated story reveal.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => copyLink('birthday')}
                            className="flex-1 rounded-xl border-amber-300 bg-white hover:bg-amber-100/60 text-amber-950 font-bold text-xs h-9 gap-1.5 shadow-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Reveal Link</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl border-amber-300 bg-white text-amber-900 h-9 w-9 shadow-xs"
                            onClick={() => {
                              setQrType('birthday');
                              setQrModalOpen(true);
                            }}
                            title="Show QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>

                        <Link to={`/preview/${createdPublicCode || createdPageId}`} className="block">
                          <Button
                            size="sm"
                            className="btn-press w-full rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-9 gap-1.5 shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-amber-300" />
                            <span>Preview Celebrant Experience</span>
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

                  {/* Live Canvas Settings Card */}
                  <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-6 shadow-card space-y-4">
                    <div className="border-b border-stone-100 pb-3">
                      <h3 className="font-serif font-bold text-slate-950 text-base">
                        Live Canvas Collection Rules
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Adjust contributor permissions at any time while the canvas is collecting.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/50 border border-stone-200/70">
                        <Label htmlFor="photos" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Allow photo attachments by contributors
                        </Label>
                        <Switch id="photos" checked={allowPhotos} onCheckedChange={handleAllowPhotosChange} />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/50 border border-stone-200/70">
                        <Label htmlFor="audio" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Allow audio voice note recordings
                        </Label>
                        <Switch id="audio" checked={allowAudio} onCheckedChange={handleAllowAudioChange} />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/50 border border-stone-200/70">
                        <Label htmlFor="names" className="text-xs font-bold text-slate-900 cursor-pointer">
                          Require contributor names on messages
                        </Label>
                        <Switch id="names" checked={requireNames} onCheckedChange={handleRequireNamesChange} />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* BOTTOM WIZARD NAVIGATION BAR */}
              <div className="rounded-[2rem] border border-stone-200/90 bg-white p-4 shadow-card flex items-center justify-between gap-4">
                {step > 1 && step < 3 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="rounded-xl border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 px-5 h-10 gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    disabled={saving || uploadingCover || (step === 2 && !hasResolvedPoolRecipient)}
                    className="btn-press rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs px-6 h-10 shadow-md shadow-amber-500/25 flex items-center gap-2"
                  >
                    {(saving || uploadingCover) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>{uploadingCover ? 'Uploading Cover Photo...' : 'Crafting Canvas...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{step === 2 ? 'Create Celebration Canvas' : 'Continue to Styling'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to={`/edit/${createdPublicCode || createdPageId}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs px-5 h-10 shadow-xs"
                      >
                        Curate Canvas
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      className="btn-press rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-6 h-10 shadow-card flex items-center gap-2"
                    >
                      <span>Go to Timeline</span>
                      <ArrowRight className="h-4 w-4" />
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

export default CreatePage;
