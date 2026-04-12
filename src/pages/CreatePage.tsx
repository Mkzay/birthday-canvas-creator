import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, Copy, Eye, QrCode, Loader2, Palette } from 'lucide-react';
import SocialShareButtons from '@/components/SocialShareButtons';
import QRCodeModal from '@/components/QRCodeModal';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ApiError, apiFetch, apiForm } from '@/lib/api';
import Header from '@/components/Header';
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
          {WIZARD_STEPS.map((s, i) => (
            <Fragment key={s.number}>
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
              {i < WIZARD_STEPS.length - 1 && (
                <div className={cn(
                  "w-10 sm:w-16 md:w-24 h-0.5 sm:h-1 mx-1.5 sm:mx-2 rounded-full transition-all duration-300",
                  step > s.number ? "gradient-cta" : "bg-muted"
                )} />
              )}
            </Fragment>
          ))}
        </div>
        </div>

        {step === 1 && (
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
        )}

        {step === 2 && (
          <WizardStepTheme
            variant="create"
            recipientName={recipientName}
            selectedTheme={selectedTheme}
            onSelectTheme={setSelectedTheme}
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
            letterStartHexInput={letterStartHexInput}
            setLetterStartHexInput={setLetterStartHexInput}
            letterEndHexInput={letterEndHexInput}
            setLetterEndHexInput={setLetterEndHexInput}
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
