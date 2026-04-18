import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import QRCodeModal from '@/components/QRCodeModal';
import SocialShareButtons from '@/components/SocialShareButtons';
import Header from '@/components/Header';
import { ApiError, apiFetch, apiForm } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import type { CustomTheme, DisplayMode, PaystackBankOption, Step, Theme } from '@/pages/page-wizard';
import {
  DEFAULT_LETTER_END,
  DEFAULT_LETTER_START,
  WIZARD_STEPS,
  WizardStepDetails,
  WizardStepTheme,
  parseLetterGradientValue,
  toDatetimeLocalValue,
  toIsoDatetime,
} from '@/pages/page-wizard';

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

  const handlePoolFundraisingToggle = (checked: boolean) => {
    setPoolFundraisingEnabled(checked);
    toast.info(
      checked
        ? 'Pool contributions enabled. A 2% payout fee will apply when releasing the gift.'
        : 'Pool contributions disabled for this page.',
    );
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

    if (requiresResolvedPoolRecipient && !hasResolvedPoolRecipient) {
      toast.error('Resolve recipient account details before saving');
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
          publicCode: isProUser ? normalizedPublicCode : undefined,
          poolFundraisingEnabled: isProUser ? poolFundraisingEnabled : undefined,
          poolGoalKobo: isProUser && poolGoalNairaInput.trim() ? Math.round(Number(poolGoalNairaInput) * 100) : null,
          poolDescription: isProUser ? (poolDescriptionInput.trim() || null) : undefined,
          recipientBankCode: isProUser ? (recipientBankCode.trim() || null) : undefined,
          recipientAccountNumber: isProUser ? (recipientAccountNumber.trim() || null) : undefined,
          recipientAccountName: isProUser ? (recipientAccountName.trim() || null) : undefined,
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
            {WIZARD_STEPS.map((currentStep, index) => (
              <Fragment key={currentStep.number}>
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
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-1.5 h-0.5 w-10 rounded-full transition-all duration-300 sm:mx-2 sm:h-1 sm:w-16 md:w-24',
                      step > currentStep.number ? 'gradient-cta' : 'bg-muted',
                    )}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {step === 1 && (
          <WizardStepDetails
            variant="edit"
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
            coverPreviewUrl={displayCoverUrl ?? null}
            coverInputRef={coverInputRef}
            onCoverSelect={handleCoverPhotoSelect}
            onRemoveCover={removeCoverPhoto}
          />
        )}

        {step === 2 && (
          <WizardStepTheme
            variant="edit"
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
          />
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
                          <Label htmlFor="recipientAccountName" className="text-foreground">Recipient account name</Label>
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
                        <p className="text-xs text-muted-foreground">
                          Required before saving: recipient bank and account number must resolve to an account name.
                        </p>
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
            <Button variant="hero" size="lg" onClick={handleSave} className="flex-1" disabled={saving || uploadingCover || !hasResolvedPoolRecipient}>
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
