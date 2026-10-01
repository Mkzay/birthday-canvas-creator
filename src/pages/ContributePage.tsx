import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { GripVertical, HandCoins, ImagePlus, Loader2, Lock, Mic2, Send, X, Square, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { toast } from 'sonner';
import Confetti from '@/components/Confetti';
import { parseLocalDate } from '@/lib/date';
import { ApiError, apiFetch, apiForm } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import StickerPicker, { type StickerData } from '@/components/StickerPicker';
import { visualThemeConfig, fontClassMap } from '@/lib/themes';
import type { ContributionDraft, PendingPhoto, PublicBirthdayPageData } from '@/pages/contribute';
import {
  CONTRIBUTION_PLATFORM_FEE_RATE,
  ContributeSuccessPanel,
  ContributorWishPreview,
  MAX_PHOTOS,
  MAX_WISH_MESSAGE_CHARACTERS,
  extractPlainTextFromRichHtml,
  formatNairaInputWithCommas,
} from '@/pages/contribute';

const themeConfig = visualThemeConfig;

const ContributePage = () => {
  const { pageId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<PublicBirthdayPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [selectedPhotos, setSelectedPhotos] = useState<PendingPhoto[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [wishAudio, setWishAudio] = useState<File | null>(null);
  const [wishAudioPreviewUrl, setWishAudioPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [poolAmountNaira, setPoolAmountNaira] = useState('');
  const [poolContributorEmail, setPoolContributorEmail] = useState('');
  const [recentContributionKobo, setRecentContributionKobo] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const poolAmountInputRef = useRef<HTMLInputElement>(null);
  const selectedPhotosRef = useRef<PendingPhoto[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const draftStorageKey = pageId ? `contribute-draft:${pageId}` : null;

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      if (wishAudioPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(wishAudioPreviewUrl);
      }
    };
  }, [wishAudioPreviewUrl]);

  const fetchPage = useCallback(async () => {
    if (!pageId) return;

    try {
      const data = await apiFetch<PublicBirthdayPageData>(`/public/pages/${pageId}`);
      setPage(data);
    } catch (error) {
      console.error(error);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (pageId) {
      void fetchPage();
    }
  }, [fetchPage, pageId]);

  useEffect(() => {
    if (!draftStorageKey) {
      setDraftHydrated(false);
      return;
    }

    try {
      const stored = sessionStorage.getItem(draftStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ContributionDraft>;
        if (typeof parsed.senderName === 'string') {
          setSenderName(parsed.senderName);
        }
        if (typeof parsed.message === 'string') {
          setMessage(parsed.message);
        }
        if (typeof parsed.poolAmountNaira === 'string') {
          setPoolAmountNaira(parsed.poolAmountNaira);
        }
        if (typeof parsed.poolContributorEmail === 'string') {
          setPoolContributorEmail(parsed.poolContributorEmail);
        }
        if (Array.isArray(parsed.stickers)) {
          setStickers(parsed.stickers);
        }
      }
    } catch {
      // Ignore malformed draft payloads and continue with fresh state.
    } finally {
      setDraftHydrated(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || !draftHydrated || isSubmitted) {
      return;
    }

    const draft: ContributionDraft = {
      senderName,
      message,
      poolAmountNaira,
      poolContributorEmail,
      stickers,
      updatedAt: Date.now(),
    };

    sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [
    draftHydrated,
    draftStorageKey,
    isSubmitted,
    message,
    poolAmountNaira,
    poolContributorEmail,
    senderName,
    stickers,
  ]);

  const placeholderTemplates = [
    (name: string) => `Write something ${name} will never forget...`,
    (name: string) => `What's your favorite memory with ${name}?`,
    (name: string) => `If you could tell ${name} one thing on their birthday...`,
    (name: string) => `What makes ${name} so special to you?`,
    (name: string) => `Write your birthday wish for ${name}...`,
  ];

  const currentPlaceholder = page
    ? placeholderTemplates[placeholderIndex % placeholderTemplates.length](page.recipient_name)
    : 'Write your birthday wish...';

  useEffect(() => {
    if (!page) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholderTemplates.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [page, placeholderTemplates.length]);

  const clearSelectedPhotos = useCallback(() => {
    setSelectedPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleWishAudioSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mimeType = file.type.toLowerCase();
    const isAudioLike =
      mimeType.startsWith('audio/') ||
      mimeType === 'video/3gpp' ||
      mimeType === 'video/3gpp2';

    if (!isAudioLike) {
      toast.error('Please select an audio or voice-note file');
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Audio must be less than 8MB');
      event.target.value = '';
      return;
    }

    if (wishAudioPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(wishAudioPreviewUrl);
    }

    setWishAudio(file);
    setWishAudioPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const removeWishAudio = () => {
    setWishAudio(null);
    if (wishAudioPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(wishAudioPreviewUrl);
    }
    setWishAudioPreviewUrl(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
          mimeType = 'audio/mp4;codecs=mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const extension = blobType.startsWith('audio/mp4') ? 'm4a' : 'webm';
        const audioFile = new File([audioBlob], `voice-note.${extension}`, { type: blobType });
        
        if (wishAudioPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(wishAudioPreviewUrl);
        }
        
        setWishAudio(audioFile);
        setWishAudioPreviewUrl(URL.createObjectURL(audioBlob));
        
        stream.getTracks().forEach((track) => track.stop());
        
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingDuration(0);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const reorderPhotos = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setSelectedPhotos((currentPhotos) => {
      const sourceIndex = currentPhotos.findIndex((photo) => photo.id === sourceId);
      const targetIndex = currentPhotos.findIndex((photo) => photo.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentPhotos;
      }

      const nextPhotos = [...currentPhotos];
      const [movedPhoto] = nextPhotos.splice(sourceIndex, 1);
      nextPhotos.splice(targetIndex, 0, movedPhoto);
      return nextPhotos;
    });
  };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const availableSlots = MAX_PHOTOS - selectedPhotos.length;
    if (availableSlots <= 0) {
      toast.error(`You can attach up to ${MAX_PHOTOS} photos`);
      event.target.value = '';
      return;
    }

    const acceptedFiles: PendingPhoto[] = [];
    const incomingFiles = files.slice(0, availableSlots);

    incomingFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        return;
      }

      acceptedFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      });
    });

    if (files.length > availableSlots) {
      toast.error(`Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added`);
    }

    if (acceptedFiles.length) {
      setSelectedPhotos((currentPhotos) => [...currentPhotos, ...acceptedFiles]);
    }

    event.target.value = '';
  };

  const handlePhotoCaptionChange = (photoId: string, caption: string) => {
    setSelectedPhotos((currentPhotos) =>
      currentPhotos.map((photo) => (photo.id === photoId ? { ...photo, caption: caption.slice(0, 140) } : photo)),
    );
  };

  const removePhoto = (photoId: string) => {
    setSelectedPhotos((currentPhotos) => {
      const photoToRemove = currentPhotos.find((photo) => photo.id === photoId);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
      }

      return currentPhotos.filter((photo) => photo.id !== photoId);
    });
  };

  const uploadWishAudio = async () => {
    if (!wishAudio || !pageId) return null;

    setUploadingAudio(true);

    try {
      const formData = new FormData();
      formData.append('file', wishAudio);
      const data = await apiForm<{ url: string }>(`/public/pages/${pageId}/message-audio`, formData);
      return data.url;
    } catch (error) {
      console.error('Audio upload error:', error);
      toast.error('Failed to upload audio message');
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const uploadPhotos = async () => {
    if (!pageId || !selectedPhotos.length) return [];

    setUploading(true);

    try {
      const uploads = await Promise.all(
        selectedPhotos.map(async (photo) => {
          const formData = new FormData();
          formData.append('file', photo.file);

          const data = await apiForm<{ url: string }>(`/public/pages/${pageId}/message-photo`, formData);
          return {
            url: data.url,
            caption: photo.caption.trim() || null,
          };
        }),
      );

      return uploads;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload one or more photos');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const formatKobo = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const calculateTotalChargeKobo = (contributionAmountKobo: number) => {
    const platformFeeKobo = Math.round(contributionAmountKobo * CONTRIBUTION_PLATFORM_FEE_RATE);
    return contributionAmountKobo + platformFeeKobo;
  };

  const initializePoolPayment = async (amountKobo: number, contributorName: string | null, contributorEmail: string | null) => {
    if (!page) return;

    const result = await apiFetch<{
      authorizationUrl: string;
      reference: string;
      amountKobo: number;
      contributionAmountKobo?: number;
      totalChargeKobo?: number;
    }>(`/public/pages/${page.id}/pool/initialize`, {
      method: 'POST',
      body: JSON.stringify({
        amountKobo,
        contributorName,
        contributorEmail,
        callbackPath: `/contribute/${page.id}?submitted=1`,
      }),
    });

    sessionStorage.setItem(
      `pool-payment:${page.id}:${result.reference}`,
      JSON.stringify({ amountKobo: result.contributionAmountKobo ?? result.amountKobo }),
    );

    window.location.href = result.authorizationUrl;
  };

  useEffect(() => {
    if (!pageId) return;

    const status = searchParams.get('status')?.toLowerCase();
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const submitted = searchParams.get('submitted') === '1';

    if (status !== 'success' || !reference) {
      if (submitted) {
        setIsSubmitted(true);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('submitted');
        setSearchParams(nextParams, { replace: true });
      }
      return;
    }

    const finalizeVerifiedPayment = async () => {
      const storageKey = `pool-payment:${pageId}:${reference}`;
      const stored = sessionStorage.getItem(storageKey);

      try {
        await apiFetch<{ verified: boolean }>(`/public/pages/${pageId}/pool/verify`, {
          method: 'POST',
          body: JSON.stringify({ reference }),
        });

        await fetchPage();

        if (stored) {
          try {
            const payload = JSON.parse(stored) as { amountKobo?: number };
            if (typeof payload.amountKobo === 'number' && Number.isFinite(payload.amountKobo) && payload.amountKobo > 0) {
              setRecentContributionKobo(payload.amountKobo);
              toast.success(`Payment successful! You contributed ${formatKobo(payload.amountKobo)}.`);
            } else {
              toast.success('Payment successful!');
            }
          } catch {
            toast.success('Payment successful!');
          }
          sessionStorage.removeItem(storageKey);
        } else {
          toast.success('Payment successful!');
        }
      } catch (error) {
        console.error('Pool verify error:', error);
        toast.error('Payment received but verification is still pending. Please refresh shortly.');
      }
    };

    void finalizeVerifiedPayment();

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('status');
    nextParams.delete('reference');
    nextParams.delete('trxref');
    nextParams.delete('transaction_id');
    nextParams.delete('submitted');

    if (submitted) {
      setIsSubmitted(true);
    }

    setSearchParams(nextParams, { replace: true });
  }, [fetchPage, pageId, searchParams, setSearchParams]);

  if (loading) {
    return <WishCanvasLoader />;
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mb-6 text-muted-foreground">This birthday page doesn&apos;t exist or has been removed.</p>
          <Link to="/">
            <Button variant="hero">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCustomTheme = page.theme.startsWith('custom_');
  const poolContributionAmountKobo = Number.isFinite(Number(poolAmountNaira.replace(/,/g, ''))) && Number(poolAmountNaira.replace(/,/g, '')) > 0
    ? Math.round(Number(poolAmountNaira.replace(/,/g, '')) * 100)
    : 0;
  const poolTotalChargeKobo = poolContributionAmountKobo > 0
    ? calculateTotalChargeKobo(poolContributionAmountKobo)
    : 0;
  const builtInTheme = themeConfig[page.theme as keyof typeof themeConfig] || themeConfig.elegant;
  const customGradientFrom = page.theme_gradient_from || '#8b5cf6';
  const customGradientTo = page.theme_gradient_to || '#ec4899';
  const customGradientMid = page.theme_gradient_mid || null;
  const customGradientAngle = page.theme_gradient_angle ?? 135;
  const customGradientStops = customGradientMid
    ? `${customGradientFrom}, ${customGradientMid}, ${customGradientTo}`
    : `${customGradientFrom}, ${customGradientTo}`;
  const customThemeFont = fontClassMap[page.theme_font || 'sans'] || 'font-jakarta';
  const theme = isCustomTheme
    ? {
        emoji: page.theme_emoji || '🎨',
        text: 'text-slate-950',
        bg: '',
        font: customThemeFont,
        style: {
          background: `linear-gradient(${customGradientAngle}deg, ${customGradientStops})`,
        },
      }
    : {
        emoji: builtInTheme.emoji,
        text: builtInTheme.text,
        bg: builtInTheme.heroClass,
        font: builtInTheme.font,
        style: undefined,
      };

  const customGradient = isCustomTheme
    ? {
        from: customGradientFrom,
        to: customGradientTo,
        mid: customGradientMid,
        angle: customGradientAngle,
      }
    : undefined;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (isRecording) {
      toast.error('Please stop your recording before submitting your wish');
      return;
    }

    if (page.require_names && !senderName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const plainText = extractPlainTextFromRichHtml(message);
    if (!plainText) {
      toast.error('Please write a message');
      return;
    }

    if (plainText.length > MAX_WISH_MESSAGE_CHARACTERS) {
      toast.error(`Please keep your message within ${MAX_WISH_MESSAGE_CHARACTERS} characters`);
      return;
    }

    if (!page.can_contribute) {
      toast.error('This page is no longer accepting new wishes');
      return;
    }

    const amountNaira = Number(poolAmountNaira.replace(/,/g, ''));
    const hasPoolAmountInput = poolAmountNaira.trim().length > 0;
    if (hasPoolAmountInput) {
      if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
        toast.error('Enter a valid amount in Naira or clear the amount field');
        return;
      }

      const amountKobo = Math.round(amountNaira * 100);
      if (amountKobo < 100) {
        toast.error('Minimum amount is ₦1.00');
        return;
      }
    }

    setSubmitting(true);

    const uploadedPhotos = selectedPhotos.length ? await uploadPhotos() : [];
    if (uploadedPhotos === null) {
      setSubmitting(false);
      return;
    }

    const uploadedAudioUrl = wishAudio ? await uploadWishAudio() : null;
    if (wishAudio && !uploadedAudioUrl) {
      setSubmitting(false);
      return;
    }

    try {
      await apiFetch(`/public/pages/${page.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          senderName,
          message,
          photos: uploadedPhotos,
          audioUrl: uploadedAudioUrl,
          stickers: [],
        }),
      });

      const shouldInitializePayment =
        page.pool_fundraising_enabled &&
        poolAmountNaira.trim().length > 0 &&
        Number.isFinite(amountNaira) &&
        amountNaira > 0;

      if (shouldInitializePayment) {
        const amountKobo = Math.round(amountNaira * 100);

        if (draftStorageKey) {
          sessionStorage.removeItem(draftStorageKey);
        }

        toast.success('Wish added. Redirecting you to payment...');

        await initializePoolPayment(
          amountKobo,
          senderName.trim() || null,
          poolContributorEmail.trim() || null,
        );
        return;
      }

      setShowConfetti(true);
      setIsSubmitted(true);
      if (draftStorageKey) {
        sessionStorage.removeItem(draftStorageKey);
      }
      setPage((currentPage) =>
        currentPage
          ? {
              ...currentPage,
              message_count: currentPage.message_count + 1,
            }
          : currentPage,
      );

      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONTRIBUTOR_LIMIT_REACHED') {
        toast.error('This page has reached the free contributor limit. Ask the creator to upgrade to Pro for more contributions.');
        return;
      }
      const messageText = error instanceof Error ? error.message : 'Failed to add message';
      toast.error(messageText);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setSenderName('');
    setMessage('');
    setPoolAmountNaira('');
    setPoolContributorEmail('');
    clearSelectedPhotos();
    removeWishAudio();
    setStickers([]);
    setIsSubmitted(false);
    if (draftStorageKey) {
      sessionStorage.removeItem(draftStorageKey);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.font}`} style={theme.style}>
      {showConfetti && <Confetti />}

      <header className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center">
          <BrandLogo compact className="mb-2 sm:mb-4 sm:gap-3" />
          <p className={`text-center text-xs opacity-80 sm:text-sm ${theme.text}`}>
            It&apos;s {page.recipient_name}&apos;s birthday on {format(parseLocalDate(page.birthday_date), 'MMMM d')}!
          </p>
        </div>
      </header>

      <main className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${isSubmitted ? 'max-w-3xl' : 'max-w-7xl'}`}>
        {!isSubmitted ? (
          <>
            <div className="mb-6 text-center animate-fade-in-up sm:mb-8">
              <div className="mb-3 text-5xl sm:mb-4 sm:text-6xl">{theme.emoji}</div>
              <h1 className={`px-2 text-2xl font-bold sm:text-3xl ${theme.text}`}>
                Add your birthday wish for {page.recipient_name}
              </h1>
              <p className={`mx-auto mt-3 max-w-2xl text-sm leading-relaxed opacity-80 sm:text-base ${theme.text}`}>
                Leave a message, add a few photos if you want, and attach a short note to each memory so the page feels more personal.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(page.message_count, 3))].map((_, index) => (
                    <div key={index} className="h-7 w-7 rounded-full border-2 border-card bg-gradient-to-br from-primary to-secondary sm:h-8 sm:w-8" />
                  ))}
                </div>
                <span className={`text-xs opacity-80 sm:text-sm ${theme.text}`}>
                  {page.message_count} {page.message_count === 1 ? 'person has' : 'people have'} contributed
                </span>
              </div>
            </div>

            {/* Mobile Mode Switcher Pill */}
            <div className="sticky top-3 z-30 mb-6 flex justify-center lg:hidden">
              <div className="inline-flex items-center rounded-full border border-border/80 bg-background/95 p-1 shadow-md backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setMobileView('form')}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    mobileView === 'form'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ✍️ Compose Wish
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView('preview')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    mobileView === 'preview'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  👁️ Live Keepsake Preview
                  {(selectedPhotos.length > 0 || message.trim() || wishAudioPreviewUrl || stickers.length > 0) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Sticky Live Keepsake Preview Column */}
              <div className={`lg:col-span-5 lg:sticky lg:top-8 self-start ${mobileView === 'preview' ? 'block' : 'hidden lg:block'}`}>
                <ContributorWishPreview
                  recipientName={page.recipient_name}
                  senderName={senderName}
                  message={message}
                  selectedPhotos={selectedPhotos}
                  wishAudioPreviewUrl={wishAudioPreviewUrl}
                  recordingDuration={recordingDuration}
                  isRecording={isRecording}
                  stickers={stickers}
                  poolAmountNaira={poolAmountNaira}
                  poolFundraisingEnabled={Boolean(page.pool_fundraising_enabled)}
                  themeKey={page.theme}
                  customGradient={customGradient}
                  displayMode={page.display_mode}
                  letterTheme={page.letter_theme}
                  coverPhotoUrl={page.cover_photo_url}
                />
                {mobileView === 'preview' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full lg:hidden"
                    onClick={() => setMobileView('form')}
                  >
                    Back to Composing Wish
                  </Button>
                )}
              </div>

              {/* Form Workbench Column */}
              <div className={`lg:col-span-7 ${mobileView === 'form' ? 'block' : 'hidden lg:block'}`}>
                {!page.can_contribute && (
                  <div className="mb-4 rounded-2xl border border-border bg-card/90 p-4 text-center shadow-soft">
                    <div className="mb-2 flex items-center justify-center gap-2 text-foreground">
                      <Lock className="h-4 w-4" />
                      <span className="font-semibold">Wish collection is closed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">This page is no longer accepting new messages or photos.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="animate-fade-in-up space-y-5" style={{ animationDelay: '0.2s' }}>
              <div className="rounded-[1.9rem] border border-border bg-card/96 p-4 shadow-soft sm:p-6">
                {page.require_names && (
                  <div className="mb-6">
                    <Label htmlFor="name" className="text-foreground">
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      value={senderName}
                      onChange={(event) => setSenderName(event.target.value)}
                      placeholder="Enter your name"
                      className="mt-2 h-12 rounded-xl"
                      disabled={!page.can_contribute}
                    />
                  </div>
                )}

                <div className="mb-6">
                  <Label htmlFor="message" className="mb-2 block text-foreground">
                    Your Message
                  </Label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder={currentPlaceholder}
                    maxLength={MAX_WISH_MESSAGE_CHARACTERS}
                    disabled={!page.can_contribute}
                  />
                </div>

                {page.allow_photos && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-foreground">Photos and memory notes</Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Add up to {MAX_PHOTOS} photos. Each one can include a short note.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!page.can_contribute || selectedPhotos.length >= MAX_PHOTOS}
                      >
                        <ImagePlus className="h-4 w-4" />
                        Add photos
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.gif"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                      disabled={!page.can_contribute}
                    />

                    {selectedPhotos.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-[1.4rem] border-2 border-dashed border-border bg-background/60 p-8 text-center transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!page.can_contribute}
                      >
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-foreground">Add photos that make the message feel lived-in</p>
                        <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, up to 5MB each</p>
                      </button>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {selectedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            draggable={page.can_contribute}
                            onDragStart={() => setDraggedPhotoId(photo.id)}
                            onDragEnd={() => setDraggedPhotoId(null)}
                            onDragOver={(event) => {
                              event.preventDefault();
                            }}
                            onDrop={() => {
                              if (draggedPhotoId) {
                                reorderPhotos(draggedPhotoId, photo.id);
                              }
                              setDraggedPhotoId(null);
                            }}
                            className={[
                              'overflow-hidden rounded-[1.5rem] border border-border bg-background/70 transition-shadow',
                              draggedPhotoId === photo.id ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.24)]' : '',
                            ].join(' ')}
                          >
                            <div className="relative">
                              <img src={photo.previewUrl} alt="Selected memory preview" className="h-52 w-full object-cover" />
                              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                Drag to reorder
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(photo.id)}
                                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
                                aria-label="Remove selected photo"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="p-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">{photo.file.name}</p>
                                <span className="text-xs text-muted-foreground">{photo.caption.length}/140</span>
                              </div>
                              <Input
                                value={photo.caption}
                                onChange={(event) => handlePhotoCaptionChange(photo.id, event.target.value)}
                                placeholder="Add a short memory note for this photo"
                                className="h-11 rounded-xl"
                                disabled={!page.can_contribute}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {page.allow_audio && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-foreground">Voice note (optional)</Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Add a short audio wish so they can hear your voice on the birthday page.
                        </p>
                      </div>
                      {!wishAudioPreviewUrl && !isRecording && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
                            onClick={startRecording}
                            disabled={!page.can_contribute}
                          >
                            <Mic className="h-4 w-4" />
                            Record
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => audioInputRef.current?.click()}
                            disabled={!page.can_contribute}
                          >
                            <Mic2 className="h-4 w-4" />
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>

                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleWishAudioSelect}
                      className="hidden"
                      disabled={!page.can_contribute}
                    />

                    {isRecording ? (
                      <div className="flex items-center justify-between rounded-[1.4rem] border border-primary/30 bg-primary/5 p-4 shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                          <span className="font-mono text-lg font-medium text-foreground">{formatDuration(recordingDuration)}</span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-2 rounded-full"
                          onClick={stopRecording}
                        >
                          <Square className="h-4 w-4 fill-current" />
                          Stop Recording
                        </Button>
                      </div>
                    ) : wishAudioPreviewUrl ? (
                      <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{wishAudio?.name || 'Voice note'}</p>
                            <p className="text-xs text-muted-foreground">One audio clip per wish</p>
                          </div>
                          <Button type="button" variant="ghost" className="gap-2" onClick={removeWishAudio}>
                            <X className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                        <audio controls className="w-full" src={wishAudioPreviewUrl}>
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                        Upload a short audio clip or record one directly here if you want the person to hear your voice.
                      </div>
                    )}
                  </div>
                )}

                {page.pool_fundraising_enabled && (
                  <div className="mb-6 rounded-[1.2rem] border border-emerald-200 bg-emerald-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <HandCoins className="h-4 w-4" />
                          Send {page.recipient_name} money
                        </p>
                        <p className="mt-1 text-xs text-emerald-800/90">
                          Money goes through Paystack and is pooled for the final gift release.
                        </p>
                        {page.pool_description && (
                          <p className="mt-2 text-xs text-emerald-900">{page.pool_description}</p>
                        )}
                        {typeof page.pool_goal_kobo === 'number' && page.pool_goal_kobo > 0 && (
                          <p className="mt-1 text-xs text-emerald-900/90">Goal: {formatKobo(page.pool_goal_kobo)}</p>
                        )}
                      </div>
                    </div>

                    {typeof recentContributionKobo === 'number' && recentContributionKobo > 0 && (
                      <div className="mt-3 rounded-xl border border-emerald-300 bg-white/80 p-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          You contributed {formatKobo(recentContributionKobo)}.
                        </p>
                        <p className="mt-1 text-xs text-emerald-900/80">
                          Want to add more to the gift pool?
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
                          onClick={() => {
                            setPoolAmountNaira(formatNairaInputWithCommas(String(recentContributionKobo / 100)));
                            poolAmountInputRef.current?.focus();
                          }}
                          disabled={!page.can_contribute || submitting}
                        >
                          Contribute again
                        </Button>
                      </div>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Input
                        ref={poolAmountInputRef}
                        type="text"
                        inputMode="decimal"
                        value={poolAmountNaira}
                        onChange={(event) => setPoolAmountNaira(formatNairaInputWithCommas(event.target.value))}
                        placeholder="Amount (NGN)"
                        className="bg-white"
                        disabled={!page.can_contribute || submitting}
                      />
                      <Input
                        type="email"
                        value={poolContributorEmail}
                        onChange={(event) => setPoolContributorEmail(event.target.value)}
                        placeholder="Email for receipt (optional)"
                        className="bg-white sm:col-span-2"
                        disabled={!page.can_contribute || submitting}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <p className="self-center text-[11px] text-emerald-900/80">
                        If you enter an amount, we will redirect you to checkout right after you add your wish.
                      </p>
                      {poolTotalChargeKobo > 0 && (
                        <p className="self-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                          You will be charged {formatKobo(poolTotalChargeKobo)}.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button type="submit" variant="hero" size="lg" className="w-full gap-2" disabled={submitting || uploading || uploadingAudio || isRecording || !page.can_contribute}>
                  {submitting || uploading || uploadingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {uploading
                    ? 'Uploading photos...'
                    : uploadingAudio
                      ? 'Uploading audio...'
                      : submitting
                        ? 'Adding your wish...'
                        : page.pool_fundraising_enabled && poolAmountNaira.trim().length > 0
                          ? 'Add my wish and continue to payment'
                          : 'Add my wish'}
                </Button>
              </div>
            </form>
              </div>
            </div>
          </>
        ) : (
          <ContributeSuccessPanel
            recipientName={page.recipient_name}
            themeTextClass={theme.text}
            onAddAnother={handleAddAnother}
          />
        )}
      </main>
    </div>
  );
};

export default ContributePage;
