import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  Gift,
  Heart,
  Loader2,
  Mail,
  Palette,
  QrCode,
  Share2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { BrandMenuIcon } from '@/components/BrandIcons';
import SocialShareButtons from '@/components/SocialShareButtons';
import QRCodeModal from '@/components/QRCodeModal';
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

  const isProUser = user?.planTier === 'pro' || Boolean(user?.is_pro || profile?.is_pro);
  const requiresResolvedPoolRecipient = isProUser && poolFundraisingEnabled;
  const hasResolvedPoolRecipient = !requiresResolvedPoolRecipient || (
    Boolean(recipientBankCode.trim())
    && recipientAccountNumber.replace(/\D/g, '').length >= 10
    && Boolean(recipientAccountName.trim())
    && !resolvingRecipientAccount
    && !recipientResolveError
  );

  const currentDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';
  const initial = currentDisplayName.charAt(0).toUpperCase();
  const avatarSrc = resolveAssetUrl(profile?.avatar_url);

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

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<BirthdayPage[]>('/pages');
      setPages(data || []);
    } catch (error) {
      console.error('Failed to load stats for canvas creator', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setSelectedTheme(user.defaultTheme || 'elegant');
      setSelectedLetterTheme(user.defaultTheme || 'elegant');
      setAllowPhotos(user.defaultAllowPhotos ?? true);
      setAllowAudio(user.defaultAllowAudio ?? true);
      setRequireNames(user.defaultRequireNames ?? true);
      void fetchCustomThemes();
      void fetchUserStats();
    }
  }, [fetchCustomThemes, fetchUserStats, user]);

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

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

  if (authLoading) {
    return <WishCanvasLoader />;
  }

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 flex overflow-hidden">
      {/* Background Celebratory Glows identical to Dashboard & Settings */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-amber-200/35 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-rose-200/30 to-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[360px] w-[360px] rounded-full bg-amber-100/30 blur-3xl" />

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

        {/* Main Workbench Body */}
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-7 max-w-4xl w-full mx-auto">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Craft Milestone <span className="italic text-rose-500">Celebration Canvas</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">artisan keepsake</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
                Assemble heartfelt notes, voice recordings, nostalgic photos, and ambient soundtracks for someone special.
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

          {/* ARTISAN STEPPER PROGRESSION CARD */}
          <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
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
              <Button
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="btn-press rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-6 h-10 shadow-card flex items-center gap-2"
              >
                <span>Go to Atelier Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default CreatePage;
