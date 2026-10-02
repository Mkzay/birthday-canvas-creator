import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Mail,
  Music4,
  Share2,
  Download,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  Music,
  Image as ImageIcon,
  Video,
  Wallet,
  Gift,
  Check,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import BirthdayCountdown from '@/components/BirthdayCountdown';
import BirthdayShareCard from '@/components/BirthdayShareCard';
import { ApiError, apiFetch, getApiOrigin, resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { toast } from 'sonner';
import { playPresetSoundtrack, soundtrackMap, type SoundtrackController } from '@/lib/soundtracks';
import { cn } from '@/lib/utils';
import AnimatedBackground from '@/components/AnimatedBackground';
import { hexToHsl } from '@/lib/colors';
import { useAuth } from '@/context/AuthContext';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import DOMPurify from 'dompurify';
import { isRichHtml, sanitizeWishHtmlForDisplay, stripHtml, wishMessageHtmlWithQuotes } from '@/lib/wish-utils';
import { fontClassMap } from '@/lib/themes';
import {
  DecorativeLayer,
  drawRoundedRect,
  extractYouTubeId,
  formatNairaFromKobo,
  formatNairaNumberFromKobo,
  getMessagePhotos,
  getMobileSectionCaption,
  getMobileSectionLabel,
  getMobileSectionMarker,
  getMobileSectionTone,
  getSlideDuration,
  getStoryMotionDuration,
  loadImageForVideo,
  mixHue,
  MobileVoiceNoteControl,
  normalizeHexColor,
  resolveVideoMimeType,
  schedulePresetSoundtrackForVideo,
  STICKER_EMOJI_MAP,
  themeConfig,
  wrapCanvasText,
} from '@/pages/birthday';
import {
  LazyBentoStorySections,
  LazyDesktopStorySection,
  LazyFreeformSection,
  LazyMobileStorySection,
  LazyRevealIntroOverlay,
} from '@/pages/birthday/experience/lazyBirthdayExperience';
import { asBirthdayViewModel } from '@/pages/birthday/view/birthdayViewModel';
import { BirthdayPageViewProvider } from '@/pages/birthday/view/BirthdayPageViewContext';
import type {
  BirthdayPageData,
  BirthdayPageProps,
  ExpandedPhoto,
  Message,
  MessagePhoto,
  PageDisplayMode,
  PendingDeleteAction,
  PoolSummaryState,
  PrivatePoolSummary,
  PublicPoolSummary,
  RevealPhase,
  RevealSlide,
} from '@/pages/birthday';

const BirthdayPage = ({
  isPreview = false,
  showRevealIntroInPreview = false,
  forceMobileView = false,
}: BirthdayPageProps) => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<BirthdayPageData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<ExpandedPhoto>(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRevealIntro, setShowRevealIntro] = useState(false);
  const [hasTriggeredIntro, setHasTriggeredIntro] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [isDesktopPlaybackPaused, setIsDesktopPlaybackPaused] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [slideRemainingMs, setSlideRemainingMs] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const [viewMode, setViewMode] = useState<PageDisplayMode>('story');
  const [activeWishAudioId, setActiveWishAudioId] = useState<string | null>(null);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [startYoutube, setStartYoutube] = useState(false);
  const [isSoundtrackMuted, setIsSoundtrackMuted] = useState(false);
  const ytId = useMemo(() => extractYouTubeId(page?.custom_audio_url), [page?.custom_audio_url]);
  const shouldResumeSoundtrackRef = useRef(false);
  const userPausedSoundtrackRef = useRef(false);
  const soundtrackWasDuckedRef = useRef(false);
  const soundtrackPrevVolumeRef = useRef<number | null>(null);
  const presetPrevVolumeRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const ignoreTouchNavigationRef = useRef(false);
  const mobileRevealRef = useRef<HTMLDivElement | null>(null);
  const [isDesktopReveal, setIsDesktopReveal] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 640));
  const isDesktopRevealEffective = forceMobileView ? false : isDesktopReveal;
  const isCoarsePointerDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const mobileFreeformMotion = useMemo(() => {
    if (!isCoarsePointerDevice) {
      return {
        introStaggerMs: 80,
        introPopLagMs: 60,
        scrollStaggerMs: 140,
        cardDurationMs: 980,
      };
    }

    const nav = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } })
      : null;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const saveDataOn = Boolean(nav?.connection?.saveData);
    const hasLowMemory = typeof nav?.deviceMemory === 'number' && nav.deviceMemory <= 4;
    const hasFewThreads = typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
    const isLowPowerMobile = prefersReducedMotion || saveDataOn || hasLowMemory || hasFewThreads;

    if (isLowPowerMobile) {
      return {
        introStaggerMs: 175,
        introPopLagMs: 128,
        scrollStaggerMs: 220,
        cardDurationMs: 1320,
      };
    }

    return {
      introStaggerMs: 210,
      introPopLagMs: 150,
      scrollStaggerMs: 270,
      cardDurationMs: 1480,
    };
  }, [isCoarsePointerDevice]);
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isPageOwner, setIsPageOwner] = useState(false);
  const [poolSummary, setPoolSummary] = useState<PoolSummaryState>({
    pool_fundraising_enabled: false,
    pool_goal_kobo: null,
    pooled_amount_kobo: 0,
    pool_description: null,
    contributors: [],
    is_requested: false,
    is_released: false,
  });
  const [releasingPoolPayout, setReleasingPoolPayout] = useState(false);
  const [requestingGiftRelease, setRequestingGiftRelease] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [includeSoundtrackInVideo, setIncludeSoundtrackInVideo] = useState(true);
  const [expandedFreeformCardIds, setExpandedFreeformCardIds] = useState<Set<string>>(() => new Set());
  const [isFreeformIntroExiting, setIsFreeformIntroExiting] = useState(false);
  const [isFreeformBoardEntered, setIsFreeformBoardEntered] = useState(true);
  const [freeformAnimationRun, setFreeformAnimationRun] = useState(0);
  const [landedFreeformCards, setLandedFreeformCards] = useState<Set<string>>(() => new Set());
  const [poppedFreeformDecorators, setPoppedFreeformDecorators] = useState<Set<string>>(() => new Set());
  const wishAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const slideTimerStartedAtRef = useRef<number | null>(null);
  const freeformAnimationTimeoutsRef = useRef<number[]>([]);
  const mobileCardsContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileObserverRef = useRef<IntersectionObserver | null>(null);
  const freeformBoardSectionRef = useRef<HTMLElement | null>(null);
  const freeformStarsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isPreview || page?.is_revealed !== false) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPreview, page?.is_revealed]);

  useEffect(() => {
    if (!page) return;

    const preloadList: string[] = [];
    const preloadLimit = isCoarsePointerDevice ? 4 : 12;

    if (page.cover_photo_url) {
      const url = resolveAssetUrl(page.cover_photo_url);
      if (url) preloadList.push(url);
    }

    for (const message of messages) {
      if (preloadList.length >= preloadLimit) break;

      if (message.photo_url) {
        const url = resolveAssetUrl(message.photo_url);
        if (url) preloadList.push(url);
      }

      if (message.photos?.length) {
        for (const photo of message.photos) {
          if (preloadList.length >= preloadLimit) break;
          const url = resolveAssetUrl(photo.photo_url);
          if (url) preloadList.push(url);
        }
      }
    }

    const uniquePreloads = Array.from(new Set(preloadList));
    if (!uniquePreloads.length) return;

    const preloadImages = () => {
      uniquePreloads.forEach((url) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as typeof window & { requestIdleCallback: (callback: IdleRequestCallback) => number }).requestIdleCallback(() => {
        preloadImages();
      });

      return () => {
        if ('cancelIdleCallback' in window) {
          (window as typeof window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = globalThis.setTimeout(() => preloadImages(), 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, [isCoarsePointerDevice, page, messages]);

  const stopSoundtrack = useCallback(() => {
    userPausedSoundtrackRef.current = true;
    shouldResumeSoundtrackRef.current = false;
    presetControllerRef.current?.stop();
    presetControllerRef.current = null;

    if (soundtrackAudioRef.current) {
      soundtrackAudioRef.current.pause();
      soundtrackAudioRef.current.currentTime = 0;
      soundtrackAudioRef.current.src = '';
      soundtrackAudioRef.current = null;
    }

    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), '*');
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    }
  }, []);

  const startSoundtrack = useCallback(
    async (withLoop = true) => {
      if (!page) return;
      userPausedSoundtrackRef.current = false;

      presetControllerRef.current?.stop();
      presetControllerRef.current = null;

      if (ytId) {
        setStartYoutube(true);
        if (youtubeIframeRef.current?.contentWindow) {
           youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
           youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [isCoarsePointerDevice ? 85 : 65] }), '*');
        }
        return;
      }

      const resolvedCustomAudioUrl = resolveAssetUrl(page.custom_audio_url);

      if (resolvedCustomAudioUrl) {
        if (!soundtrackAudioRef.current || soundtrackAudioRef.current.src !== resolvedCustomAudioUrl) {
          soundtrackAudioRef.current = new Audio(resolvedCustomAudioUrl);
        }

        soundtrackAudioRef.current.loop = withLoop;
        soundtrackAudioRef.current.volume = isCoarsePointerDevice ? 0.78 : 0.45;

        try {
          await soundtrackAudioRef.current.play();
        } catch (error) {
          console.error('Audio autoplay blocked', error);
        }
        return;
      }

      if (page.soundtrack_id && soundtrackMap[page.soundtrack_id]) {
        presetControllerRef.current = playPresetSoundtrack(page.soundtrack_id, { loop: withLoop, volume: isCoarsePointerDevice ? 0.2 : 0.12 });
      }
    },
    [isCoarsePointerDevice, page, ytId],
  );

  const toggleSoundtrackMute = useCallback(() => {
    setIsSoundtrackMuted((muted) => {
      const nextMuted = !muted;
      if (nextMuted) {
        userPausedSoundtrackRef.current = true;
        if (soundtrackAudioRef.current) {
          soundtrackAudioRef.current.pause();
        }
        if (presetControllerRef.current) {
          presetControllerRef.current.stop();
        }
        if (youtubeIframeRef.current?.contentWindow) {
          youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        }
      } else {
        userPausedSoundtrackRef.current = false;
        void startSoundtrack(true);
      }
      return nextMuted;
    });
  }, [startSoundtrack]);

  const pauseSoundtrackForWishAudio = useCallback(() => {
    let hadPlayingSoundtrack = false;

    // Avoid repeatedly stopping on incidental events.
    if (soundtrackWasDuckedRef.current) {
      shouldResumeSoundtrackRef.current = true;
      return;
    }

    if (presetControllerRef.current) {
      // Stop preset soundtrack so voice notes always cut through.
      presetControllerRef.current.stop?.();
      presetControllerRef.current = null;
      presetPrevVolumeRef.current = null;
      hadPlayingSoundtrack = true;
    }

    const customAudio = soundtrackAudioRef.current;
    if (customAudio && !customAudio.paused && !customAudio.ended) {
      // Pause custom soundtrack (don't reset currentTime so it can resume).
      customAudio.pause();
      soundtrackPrevVolumeRef.current = null;
      hadPlayingSoundtrack = true;
    }

    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      hadPlayingSoundtrack = true;
    }

    soundtrackWasDuckedRef.current = hadPlayingSoundtrack;
    shouldResumeSoundtrackRef.current = hadPlayingSoundtrack;
  }, []);

  const resumeSoundtrackAfterWishAudio = useCallback(async () => {
    if (!shouldResumeSoundtrackRef.current || showRevealIntro) {
      return;
    }
    if (userPausedSoundtrackRef.current) {
      shouldResumeSoundtrackRef.current = false;
      return;
    }

    shouldResumeSoundtrackRef.current = false;
    soundtrackWasDuckedRef.current = false;
    presetPrevVolumeRef.current = null;
    soundtrackPrevVolumeRef.current = null;

    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      return;
    }

    const customAudio = soundtrackAudioRef.current;
    if (customAudio && customAudio.paused && !customAudio.ended && customAudio.currentTime > 0) {
      try {
        await customAudio.play();
        return;
      } catch (error) {
        console.error('Audio autoplay blocked', error);
      }
    }

    await startSoundtrack(true);
  }, [showRevealIntro, startSoundtrack]);

  const toggleSavePage = useCallback(async () => {
    if (!pageId) return;

    try {
      if (isSaved) {
        await apiFetch<void>(`/pages/${pageId}/save`, { method: 'DELETE' });
        setIsSaved(false);
        toast.success('Removed from your dashboard');
      } else {
        await apiFetch<void>(`/pages/${pageId}/save`, { method: 'POST' });
        setIsSaved(true);
        toast.success('Saved to your dashboard');
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to update saved status');
    }
  }, [isSaved, pageId]);

  const handleDownloadKeepsake = useCallback(async () => {
    if (!pageId) return;

    setDownloadingPdf(true);
    try {
      const response = await fetch(`${getApiOrigin()}/api/public/pages/${pageId}/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new ApiError(payload.error || 'Download failed', response.status, payload.code);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug = (page?.recipient_name || 'birthday-page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'birthday-page';
      anchor.href = url;
      anchor.download = `${slug}-wishcanvas-keepsake.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PIN_REQUIRED') {
        toast.error('Unlock this page with the PIN first');
      } else if (error instanceof ApiError && error.code === 'FEATURE_PRO_ONLY') {
        toast.info('This is a Pro feature. Upgrade to unlock keepsake downloads.');
      } else {
        toast.error('Could not download keepsake');
      }
    } finally {
      setDownloadingPdf(false);
    }
  }, [page?.recipient_name, pageId]);

  const handleDownloadVideoKeepsake = useCallback(async () => {
    if (!pageId || !page) return;

    if ((page.owner_plan_tier || 'free') !== 'pro') {
      toast.info('Video download is a Pro feature. Upgrade to unlock it.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      toast.error('Your browser does not support video export');
      return;
    }

    const mimeType = resolveVideoMimeType();
    if (!mimeType) {
      toast.error('This browser cannot export WebM video');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;

    if (typeof canvas.captureStream !== 'function') {
      toast.error('Video export is not supported on this device');
      return;
    }

    setDownloadingVideo(true);

    const context = canvas.getContext('2d');
    if (!context) {
      setDownloadingVideo(false);
      toast.error('Could not initialize video renderer');
      return;
    }

    const stream = canvas.captureStream(30);
    const stopTrackFns: Array<() => void> = [];
    let exportAudioContext: AudioContext | null = null;
    let exportAudioElement: HTMLAudioElement | null = null;
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });
    const chunks: BlobPart[] = [];
    let rafId = 0;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    try {
      let coverImage: HTMLImageElement | null = null;
      const coverUrl = resolveAssetUrl(page.cover_photo_url);
      if (coverUrl) {
        try {
          coverImage = await loadImageForVideo(coverUrl);
        } catch {
          coverImage = null;
        }
      }

      const storyMessages = messages
        .map((message) => ({
          sender: (message.sender_name || 'Someone').trim(),
          content: stripHtml(message.message || '').replace(/\s+/g, ' ').trim(),
        }))
        .filter((entry) => entry.content.length > 0)
        .slice(0, 5);

      const slides = [
        {
          title: `${page.recipient_name}'s Birthday`,
          subtitle: `${messages.length} wishes collected`,
          body: 'A keepsake reel from WishCanvas',
        },
        ...storyMessages.map((entry, index) => ({
          title: `Wish ${index + 1}`,
          subtitle: `From ${entry.sender || 'Someone'}`,
          body: entry.content,
        })),
        {
          title: 'Happy Birthday!',
          subtitle: `Made for ${page.recipient_name}`,
          body: 'Thanks to everyone who shared a memory.',
        },
      ];

      const totalDurationMs = Math.max(9000, slides.length * 1800);
      const perSlideMs = totalDurationMs / slides.length;
      const gradientFrom = normalizeHexColor(page.theme_gradient_from) || '#ff8a5b';
      const gradientTo = normalizeHexColor(page.theme_gradient_to) || '#7c3aed';
      const gradientMid = normalizeHexColor(page.theme_gradient_mid) || '#f59e0b';

      if (includeSoundtrackInVideo) {
        const AudioContextConstructor =
          window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextConstructor) {
          toast.info('Video created without audio: this browser cannot capture soundtrack audio.');
        } else if (ytId) {
          toast.info('Video created without audio: YouTube tracks cannot be captured in export.');
        } else {
          const destinationSetupContext = new AudioContextConstructor();
          exportAudioContext = destinationSetupContext;
          await exportAudioContext.resume();
          const destination = exportAudioContext.createMediaStreamDestination();

          if (page.custom_audio_url) {
            const customAudioUrl = resolveAssetUrl(page.custom_audio_url);
            if (customAudioUrl) {
              const audioEl = new Audio(customAudioUrl);
              audioEl.crossOrigin = 'anonymous';
              audioEl.preload = 'auto';
              audioEl.loop = true;
              audioEl.currentTime = 0;

              const source = exportAudioContext.createMediaElementSource(audioEl);
              const gain = exportAudioContext.createGain();
              gain.gain.value = 0.9;
              source.connect(gain);
              gain.connect(destination);

              destination.stream.getAudioTracks().forEach((track) => {
                stream.addTrack(track);
                stopTrackFns.push(() => track.stop());
              });

              await audioEl.play();
              exportAudioElement = audioEl;
              stopTrackFns.push(() => {
                source.disconnect();
                gain.disconnect();
              });
            }
          } else if (page.soundtrack_id && soundtrackMap[page.soundtrack_id]) {
            const hasPresetTrack = schedulePresetSoundtrackForVideo(exportAudioContext, destination, page.soundtrack_id, totalDurationMs);
            if (hasPresetTrack) {
              destination.stream.getAudioTracks().forEach((track) => {
                stream.addTrack(track);
                stopTrackFns.push(() => track.stop());
              });
            }
          } else {
            toast.info('Video created without audio: no soundtrack selected for this page.');
          }
        }
      }

      const stopped = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error('Video recording failed'));
      });

      const render = (now: number, startAt: number) => {
        const elapsed = now - startAt;
        const cappedElapsed = Math.min(elapsed, totalDurationMs);
        const slideIndex = Math.min(slides.length - 1, Math.floor(cappedElapsed / perSlideMs));
        const currentSlide = slides[slideIndex];
        const localProgress = (cappedElapsed - slideIndex * perSlideMs) / perSlideMs;
        const fadeIn = Math.min(1, localProgress / 0.16);
        const fadeOut = Math.min(1, (1 - localProgress) / 0.16);
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, gradientFrom);
        gradient.addColorStop(0.45, gradientMid);
        gradient.addColorStop(1, gradientTo);
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        const pulse = 0.12 + Math.sin(cappedElapsed / 620) * 0.08;
        context.save();
        context.globalAlpha = 0.2 + pulse;
        const glow = context.createRadialGradient(canvas.width * 0.8, canvas.height * 0.2, 80, canvas.width * 0.8, canvas.height * 0.2, 680);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = glow;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        if (coverImage) {
          context.save();
          context.globalAlpha = 0.22;
          const coverScale = Math.max(canvas.width / coverImage.width, canvas.height / coverImage.height);
          const drawWidth = coverImage.width * coverScale;
          const drawHeight = coverImage.height * coverScale;
          const dx = (canvas.width - drawWidth) / 2;
          const dy = (canvas.height - drawHeight) / 2;
          context.drawImage(coverImage, dx, dy, drawWidth, drawHeight);
          context.restore();
        }

        context.save();
        context.globalAlpha = 0.35;
        drawRoundedRect(context, 72, 72, canvas.width - 144, canvas.height - 144, 60);
        context.fillStyle = 'rgba(0, 0, 0, 0.26)';
        context.fill();
        context.restore();

        context.save();
        context.globalAlpha = alpha;
        drawRoundedRect(context, 120, 420, canvas.width - 240, 1080, 42);
        context.fillStyle = 'rgba(255, 255, 255, 0.92)';
        context.fill();

        context.fillStyle = '#0f172a';
        context.font = '700 72px Georgia, "Times New Roman", serif';
        context.textAlign = 'left';
        context.fillText(currentSlide.title, 170, 560);

        context.fillStyle = '#475569';
        context.font = '500 38px "Trebuchet MS", sans-serif';
        context.fillText(currentSlide.subtitle, 170, 622);

        context.fillStyle = '#111827';
        context.font = '400 48px "Trebuchet MS", sans-serif';
        const lines = wrapCanvasText(context, currentSlide.body, canvas.width - 340, 8);
        lines.forEach((line, index) => {
          context.fillText(line, 170, 736 + index * 62);
        });

        context.fillStyle = 'rgba(15, 23, 42, 0.45)';
        context.font = '600 30px "Trebuchet MS", sans-serif';
        context.fillText('wishcanvas.app', 170, 1400);
        context.restore();

        const progress = Math.max(0, Math.min(1, cappedElapsed / totalDurationMs));
        drawRoundedRect(context, 170, 1450, canvas.width - 340, 16, 8);
        context.fillStyle = 'rgba(255,255,255,0.28)';
        context.fill();

        drawRoundedRect(context, 170, 1450, (canvas.width - 340) * progress, 16, 8);
        context.fillStyle = '#ffffff';
        context.fill();

        if (elapsed >= totalDurationMs) {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        rafId = window.requestAnimationFrame((time) => render(time, startAt));
      };

      recorder.start(100);
      rafId = window.requestAnimationFrame((time) => render(time, time));
      await stopped;

      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) {
        throw new Error('Empty video output');
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug = (page.recipient_name || 'birthday-page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'birthday-page';
      anchor.href = url;
      anchor.download = `${slug}-wishcanvas-reel.webm`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('Video download started');
    } catch (error) {
      console.error(error);
      toast.error('Could not export video');
    } finally {
      window.cancelAnimationFrame(rafId);
      if (exportAudioElement) {
        exportAudioElement.pause();
        exportAudioElement.src = '';
      }
      stopTrackFns.forEach((stop) => stop());
      if (exportAudioContext) {
        void exportAudioContext.close();
      }
      stream.getTracks().forEach((track) => track.stop());
      setDownloadingVideo(false);
    }
  }, [includeSoundtrackInVideo, messages, page, pageId, ytId]);

  const fetchData = useCallback(async () => {
    if (!pageId) return;

    setLoading(true);

    try {
      if (isPreview) {
        const [pageData, messagesData, publicPoolSummary] = await Promise.all([
          apiFetch<BirthdayPageData>(`/pages/${pageId}`),
          apiFetch<Message[]>(`/pages/${pageId}/messages`),
          apiFetch<PublicPoolSummary>(`/public/pages/${pageId}/pool/summary`).catch(() => null),
        ]);

        setPage({
          ...pageData,
          is_revealed: true,
          is_unlocked: true,
          requires_unlock: false,
          owner_plan_tier: (user?.planTier === 'pro' || Boolean(user?.isPro || user?.is_pro)) ? 'pro' : 'free',
          message_count: messagesData.length,
        });
        setViewMode(pageData.display_mode || 'story');
        setMessages(messagesData);
        setIsPageOwner(true);
        setPoolSummary({
          pool_fundraising_enabled: Boolean(pageData.pool_fundraising_enabled),
          pool_goal_kobo: pageData.pool_goal_kobo ?? null,
          pooled_amount_kobo: Number(publicPoolSummary?.pooled_amount_kobo ?? pageData.pooled_amount_kobo ?? 0),
          pool_description: pageData.pool_description || null,
          contributors: publicPoolSummary?.contributors || [],
          is_requested: Boolean(publicPoolSummary?.is_requested),
          is_released: false,
        });
        return;
      }

      const publicPage = await apiFetch<BirthdayPageData>(`/public/pages/${pageId}`);
      const hasReachedBirthdayByDate = (() => {
        const parsedBirthday = parseLocalDate(publicPage.birthday_date);
        if (Number.isNaN(parsedBirthday.getTime())) return false;
        return Date.now() >= parsedBirthday.getTime();
      })();
      const normalizedPublicPage = hasReachedBirthdayByDate && !publicPage.is_revealed
        ? { ...publicPage, is_revealed: true }
        : publicPage;

      setPage(normalizedPublicPage);
      setViewMode(normalizedPublicPage.display_mode || 'story');

      const publicPoolSummary = await apiFetch<PublicPoolSummary>(`/public/pages/${pageId}/pool/summary`).catch(() => null);
      setPoolSummary({
        pool_fundraising_enabled: Boolean(publicPoolSummary?.pool_fundraising_enabled ?? publicPage.pool_fundraising_enabled),
        pool_goal_kobo: publicPoolSummary?.pool_goal_kobo ?? publicPage.pool_goal_kobo ?? null,
        pooled_amount_kobo: Number(publicPoolSummary?.pooled_amount_kobo ?? publicPage.pooled_amount_kobo ?? 0),
        pool_description: publicPoolSummary?.pool_description ?? publicPage.pool_description ?? null,
        contributors: publicPoolSummary?.contributors || [],
        is_requested: Boolean(publicPoolSummary?.is_requested),
        is_released: false,
      });
      
      // If we are using a UUID but the page has a public code, redirect to use the public code in the URL
      if (pageId && /^[0-9a-f-]{36}$/i.test(pageId) && normalizedPublicPage.public_code) {
        navigate(`/birthday/${normalizedPublicPage.public_code}`, { replace: true });
      }

      if (normalizedPublicPage.is_revealed && normalizedPublicPage.is_unlocked !== false) {
        try {
          const messagesData = await apiFetch<Message[]>(`/public/pages/${pageId}/messages`);
          setMessages(messagesData);
        } catch (error) {
          if (error instanceof ApiError && error.code === 'PIN_REQUIRED') {
            setMessages([]);
          } else {
            throw error;
          }
        }
      } else {
        setMessages([]);
      }

      if (user) {
        try {
          const [status, ownerStatus, privatePoolSummary] = await Promise.all([
            apiFetch<{ isSaved: boolean }>(`/pages/${pageId}/save-status`),
            apiFetch<{ isOwner: boolean }>(`/pages/${pageId}/ownership`).catch(() => null),
            apiFetch<PrivatePoolSummary>(`/pages/${pageId}/pool/summary`).catch(() => null),
          ]);

          setIsSaved(status.isSaved);
          setIsPageOwner(Boolean(ownerStatus?.isOwner));

          if (privatePoolSummary) {
            setPoolSummary((current) => ({
              ...current,
              pool_fundraising_enabled: Boolean(privatePoolSummary.pool_fundraising_enabled),
              pool_goal_kobo: privatePoolSummary.pool_goal_kobo,
              pooled_amount_kobo: Number(privatePoolSummary.pooled_amount_kobo || 0),
              pool_description: privatePoolSummary.pool_description,
              contributors: privatePoolSummary.contributors || current.contributors,
              is_requested: Boolean(privatePoolSummary.is_requested),
              is_released: Boolean(privatePoolSummary.is_released),
            }));
          }
        } catch {
          // ignore save status errors
          setIsPageOwner(false);
        }
      } else {
        setIsSaved(false);
        setIsPageOwner(false);
      }
    } catch (error) {
      console.error(error);
      setPage(null);
      setMessages([]);
      setIsPageOwner(false);
    } finally {
      setLoading(false);
    }
  }, [isPreview, navigate, pageId, user]);

  const handleUnlock = useCallback(async () => {
    if (!pageId || !unlockPin.trim()) {
      toast.error('Enter your PIN to unlock this page');
      return;
    }

    setUnlocking(true);
    try {
      await apiFetch<{ unlocked: boolean }>(`/public/pages/${pageId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ pin: unlockPin.trim() }),
      });
      toast.success('Birthday page unlocked');
      setUnlockPin('');
      await fetchData();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PIN_INVALID') {
        toast.error('Incorrect PIN. Please try again.');
      } else {
        toast.error('Could not unlock this page right now');
      }
    } finally {
      setUnlocking(false);
    }
  }, [fetchData, pageId, unlockPin]);

  const handleReleasePoolPayout = useCallback(async () => {
    if (!pageId || !page) return;
    if (!poolSummary.pool_fundraising_enabled) {
      toast.error('Pool gifting is not enabled for this page');
      return;
    }

    setReleasingPoolPayout(true);
    try {
      const payout = await apiFetch<{ amount_kobo?: number; payout_fee_kobo?: number; gross_pool_amount_kobo?: number }>(`/pages/${pageId}/pool/release`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });

      const amountKobo = Number(payout.amount_kobo || poolSummary.pooled_amount_kobo || 0);
      const payoutFeeKobo = Number(payout.payout_fee_kobo || 0);
      toast.success(
        payoutFeeKobo > 0
          ? `Payout released: ${formatNairaFromKobo(amountKobo)} (2% payout fee: ${formatNairaFromKobo(payoutFeeKobo)})`
          : `Payout released: ${formatNairaFromKobo(amountKobo)}`,
      );
      setPoolSummary((current) => ({ ...current, is_released: true }));
      await fetchData();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PAYOUT_TOO_EARLY') {
        toast.error('Payout can be released only after reveal time');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_EMPTY') {
        toast.error('No pooled amount available yet');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_ACCOUNT_REQUIRED') {
        toast.error('Recipient bank details are incomplete');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_ALREADY_RELEASED') {
        toast.info('Payout has already been released for this page');
      } else if (
        error instanceof ApiError
        && error.code === 'PAYOUT_PROVIDER_ACCOUNT_UNVERIFIED'
      ) {
        toast.error(
          error.message
            || 'Payouts are temporarily unavailable while we finish verifying our payout provider account. Please try again later.',
        );
      } else if (
        error instanceof ApiError
        && (
          error.code === 'PAYOUT_FAILED'
          || error.code === 'PAYOUT_PROVIDER_NOT_CONFIGURED'
          || error.code === 'PAYOUT_PROVIDER_BALANCE_LOW'
          || error.code === 'PAYOUT_PROVIDER_TRANSFER_DISABLED'
          || error.code === 'PAYOUT_PROVIDER_OTP_REQUIRED'
          || error.code === 'PAYOUT_PROVIDER_REJECTED'
        )
      ) {
        toast.error(error.message || 'Could not release payout right now');
      } else {
        toast.error('Could not release payout right now');
      }
    } finally {
      setReleasingPoolPayout(false);
    }
  }, [fetchData, page, pageId, poolSummary.pool_fundraising_enabled, poolSummary.pooled_amount_kobo]);

  const handleRequestGiftRelease = useCallback(async () => {
    if (!pageId || !page) return;
    if (!poolSummary.pool_fundraising_enabled || poolSummary.pooled_amount_kobo <= 0) {
      toast.error('No pooled gift is available yet');
      return;
    }

    setRequestingGiftRelease(true);
    try {
      await apiFetch(`/public/pages/${pageId}/pool/request-release`, {
        method: 'POST',
      });
      toast.success("Your gift is on it's way");
      setPoolSummary((current) => ({ ...current, is_requested: true }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PAYOUT_ALREADY_RELEASED') {
        toast.info('This gift has already been released');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_ALREADY_REQUESTED') {
        toast.info('Gift request already sent to the organizer');
        setPoolSummary((current) => ({ ...current, is_requested: true }));
      } else if (error instanceof ApiError && error.code === 'PAYOUT_TOO_EARLY') {
        toast.error('Gift can only be requested after reveal time');
      } else {
        toast.error('Could not request gift release right now');
      }
    } finally {
      setRequestingGiftRelease(false);
    }
  }, [page, pageId, poolSummary.pool_fundraising_enabled, poolSummary.pooled_amount_kobo]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const shouldShowRevealExperience = !isPreview || showRevealIntroInPreview;

  useEffect(() => {
    if (!loading && shouldShowRevealExperience && page?.is_revealed && messages.length > 0 && !hasTriggeredIntro) {
      setShowRevealIntro(true);
    }
  }, [hasTriggeredIntro, loading, messages.length, page?.is_revealed, shouldShowRevealExperience]);

  useEffect(() => {
    if (showRevealIntro && shouldShowRevealExperience) {
      if (!isCoarsePointerDevice) {
        void startSoundtrack(true);
        return;
      }

      const unlockAudio = () => {
        if (userPausedSoundtrackRef.current) return;
        void startSoundtrack(true);
      };

      window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

      return () => {
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
    }
  }, [isCoarsePointerDevice, shouldShowRevealExperience, showRevealIntro, startSoundtrack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isCoarsePointerDevice) return;
    if (!page?.is_revealed) return;
    if (showRevealIntro) return;

    const unlockAudio = () => {
      if (userPausedSoundtrackRef.current) return;
      void startSoundtrack(true);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('scroll', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('scroll', unlockAudio);
    };
  }, [isCoarsePointerDevice, page?.is_revealed, showRevealIntro, startSoundtrack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!page?.is_revealed) return;
    if (showRevealIntro) return;

    const audio = soundtrackAudioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // If a wish voice note is active, don't fight it.
      if (activeWishAudioId) return;
      if (userPausedSoundtrackRef.current) return;
      void startSoundtrack(true);
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [activeWishAudioId, page?.is_revealed, showRevealIntro, startSoundtrack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!page?.is_revealed) return;
    if (showRevealIntro) return;

    const watchdogId = window.setInterval(() => {
      // Don't restart while a wish voice note is playing/active.
      if (activeWishAudioId) return;
      if (userPausedSoundtrackRef.current) return;
      // If we're currently ducked for a voice note, don't fight it.
      if (soundtrackWasDuckedRef.current || soundtrackPrevVolumeRef.current !== null || presetPrevVolumeRef.current !== null) return;

      const audio = soundtrackAudioRef.current;
      if (!audio) return;

      // If the soundtrack stops unexpectedly during playback, restart it.
      if (audio.paused && audio.currentTime > 0) {
        void startSoundtrack(true);
      }
    }, 4000);

    return () => window.clearInterval(watchdogId);
  }, [activeWishAudioId, page?.is_revealed, showRevealIntro, startSoundtrack]);

  useEffect(() => {
    return () => {
      stopSoundtrack();
    };
  }, [stopSoundtrack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const syncRevealMode = () => setIsDesktopReveal(mediaQuery.matches);

    syncRevealMode();
    mediaQuery.addEventListener('change', syncRevealMode);

    return () => {
      mediaQuery.removeEventListener('change', syncRevealMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isDesktopRevealEffective || !mobileRevealRef.current) return;

    const revealNodes = Array.from(mobileRevealRef.current.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));
    if (!revealNodes.length) return;

    // Eagerly mark the initial items visible so the screen is never blank
    revealNodes.slice(0, 4).forEach((node) => {
      node.classList.remove('is-exiting');
      node.classList.add('is-visible');
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-exiting');
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '100px 0px 100px 0px',
      },
    );

    revealNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [isDesktopRevealEffective, messages.length, page?.creator_message, showRevealIntro]);

  const totalPhotos = useMemo(() => {
    return messages.reduce((total, message) => total + getMessagePhotos(message).length, 0);
  }, [messages]);

  const totalAudioWishes = useMemo(() => {
    return messages.filter((message) => Boolean(message.audio_url)).length;
  }, [messages]);
  const hasMessages = messages.length > 0;
  const effectiveViewMode: PageDisplayMode = viewMode;

  const contributorNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];

    for (const message of messages) {
      const raw = message.sender_name?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(raw);
    }

    return names;
  }, [messages]);

  const contributorCount = contributorNames.length;
  const contributorLine = useMemo(() => {
    if (!contributorCount) return null;
    if (contributorCount === 1) return contributorNames[0];
    if (contributorCount === 2) return `${contributorNames[0]} and ${contributorNames[1]}`;
    if (contributorCount === 3) return `${contributorNames[0]}, ${contributorNames[1]}, and ${contributorNames[2]}`;
    return `${contributorNames[0]}, ${contributorNames[1]}, ${contributorNames[2]}, and ${contributorCount - 3} more`;
  }, [contributorCount, contributorNames]);

  const paidContributorLine = useMemo(() => {
    const names = poolSummary.contributors;
    if (!names.length) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
    return `${names[0]}, ${names[1]}, ${names[2]}, and ${names.length - 3} more`;
  }, [poolSummary.contributors]);

  const burstMessages = useMemo(() => messages.slice(0, 4), [messages]);
  const resolvedCoverPhotoUrl = resolveAssetUrl(page?.cover_photo_url);
  const coverPhotoSrc = resolvedCoverPhotoUrl;

  const freeformCardAnimationOrder = useMemo(() => {
    const order: string[] = ['mobile-cover'];
    if (page?.creator_message) {
      order.push('mobile-organizer');
    }
    order.push(...messages.map((message) => `mobile-message-${message.id}`));
    order.push('mobile-closing');

    const pivotIndex = Math.ceil(messages.length / 2);
    order.push('desktop-cover');
    order.push(...messages.slice(0, pivotIndex).map((message) => `desktop-message-${message.id}`));
    if (page?.creator_message) {
      order.push('desktop-organizer');
    }
    order.push(...messages.slice(pivotIndex).map((message) => `desktop-message-${message.id}`));
    order.push('desktop-closing');

    return order;
  }, [messages, page?.creator_message]);

  const clearFreeformAnimationTimeouts = useCallback(() => {
    freeformAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    freeformAnimationTimeoutsRef.current = [];
  }, []);

  const resetFreeformBoard = useCallback(() => {
    clearFreeformAnimationTimeouts();
    setIsFreeformBoardEntered(false);
    setIsFreeformIntroExiting(false);
    setLandedFreeformCards(new Set());
    setPoppedFreeformDecorators(new Set());
  }, [clearFreeformAnimationTimeouts]);

  useEffect(() => {
    if (effectiveViewMode !== 'freeform') {
      clearFreeformAnimationTimeouts();
      setIsFreeformIntroExiting(false);
      setIsFreeformBoardEntered(true);
      setLandedFreeformCards(new Set());
      setPoppedFreeformDecorators(new Set());
      return;
    }

    if (showRevealIntro) {
      // Avoid canceling the in-flight intro->board transition on first click.
      if (!isFreeformIntroExiting) {
        resetFreeformBoard();
      }
      return;
    }

    if (!hasTriggeredIntro) {
      setIsFreeformBoardEntered(true);
      setLandedFreeformCards(new Set(freeformCardAnimationOrder));
      setPoppedFreeformDecorators(new Set(freeformCardAnimationOrder));
    }
  }, [clearFreeformAnimationTimeouts, effectiveViewMode, freeformCardAnimationOrder, hasTriggeredIntro, isFreeformIntroExiting, resetFreeformBoard, showRevealIntro]);

  useEffect(() => {
    if (freeformAnimationRun === 0) {
      return;
    }

    clearFreeformAnimationTimeouts();
    setLandedFreeformCards(new Set());
    setPoppedFreeformDecorators(new Set());

    freeformCardAnimationOrder.forEach((cardId, index) => {
      const startDelay = mobileFreeformMotion.introStaggerMs * index;
      const landTimeoutId = window.setTimeout(() => {
        setLandedFreeformCards((current) => {
          const next = new Set(current);
          next.add(cardId);
          return next;
        });
      }, startDelay);

      const popTimeoutId = window.setTimeout(() => {
        setPoppedFreeformDecorators((current) => {
          const next = new Set(current);
          next.add(cardId);
          return next;
        });
      }, startDelay + mobileFreeformMotion.introPopLagMs);

      freeformAnimationTimeoutsRef.current.push(landTimeoutId, popTimeoutId);
    });

    return () => {
      clearFreeformAnimationTimeouts();
    };
  }, [clearFreeformAnimationTimeouts, freeformAnimationRun, freeformCardAnimationOrder, mobileFreeformMotion]);

  // Mobile: staggered scroll-triggered fall-in for cards. Once a card enters view,
  // keep it revealed so scrolling back up doesn't play a reverse animation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    const container = mobileCardsContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>('.mobile-card'));
    if (cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          el.classList.add('in-view');
        }
      });
    }, { threshold: 0.22 });

    cards.forEach((c) => observer.observe(c));
    mobileObserverRef.current = observer;

    return () => {
      observer.disconnect();
      mobileObserverRef.current = null;
    };
  // Re-run when messages change so newly rendered cards get observed.
  }, [messages.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (effectiveViewMode !== 'freeform' || !hasMessages) return;

    const canvas = freeformStarsCanvasRef.current;
    const section = freeformBoardSectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type ShootingStar = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      size: number;
      glow: number;
      life: number;
      maxLife: number;
      phase: number;
      alphaScale: number;
      isFast: boolean;
    };

    type StarBurstParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      glow: number;
      alphaScale: number;
      drag: number;
      gravity: number;
    };

    type StarBurst = {
      particles: StarBurstParticle[];
    };

    const stars: ShootingStar[] = [];
    const bursts: StarBurst[] = [];
    let rafId = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;

    const random = (min: number, max: number) => Math.random() * (max - min) + min;
    const targetCount = () => Math.max(10, Math.round(width / 170));

    const createStar = (): ShootingStar => {
      const spawnBand = Math.max(width * 0.35, 220);
      const x = random(-spawnBand, width + spawnBand * 0.08);
      const y = random(-Math.max(height * 0.4, 180), Math.max(height * 0.2, 120));
      const angle = random(24, 36) * (Math.PI / 180);
      const isFast = Math.random() < 0.2;
      const speed = isFast ? random(240, 330) : random(120, 210);
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: isFast ? random(108, 170) : random(84, 154),
        size: random(1.2, 2.5),
        glow: random(7, 15),
        life: 0,
        maxLife: isFast ? random(1.8, 3) : random(2.8, 4.6),
        phase: random(0, Math.PI * 2),
        alphaScale: random(0.7, 1),
        isFast,
      };
    };

    const setupCanvas = () => {
      const rect = section.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const isStarOut = (star: ShootingStar) => (
      star.x > width + star.length + 80
      || star.y > height + star.length + 80
      || star.life > star.maxLife
    );

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const createBurst = (x: number, y: number, isFast: boolean): StarBurst => {
      const particleCount = isFast ? 13 : 9;
      const particles: StarBurstParticle[] = [];

      for (let i = 0; i < particleCount; i += 1) {
        const angle = random(0, Math.PI * 2);
        const speed = isFast ? random(72, 150) : random(48, 112);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: random(0.34, 0.62),
          size: random(0.9, 2.1),
          glow: random(5, 12),
          alphaScale: random(0.68, 1),
          drag: random(0.78, 0.9),
          gravity: random(22, 46),
        });
      }

      return { particles };
    };

    const spawnExplosion = (star: ShootingStar) => {
      const burstX = clamp(star.x, 6, width - 6);
      const burstY = clamp(star.y, 6, height - 6);
      bursts.push(createBurst(burstX, burstY, star.isFast));

      if (bursts.length > 120) {
        bursts.splice(0, bursts.length - 120);
      }
    };

    const drawStar = (star: ShootingStar, timeSeconds: number) => {
      const speed = Math.hypot(star.vx, star.vy) || 1;
      const dirX = star.vx / speed;
      const dirY = star.vy / speed;
      const tailX = star.x - dirX * star.length;
      const tailY = star.y - dirY * star.length;

      const lifeProgress = Math.min(1, star.life / star.maxLife);
      const fadeIn = Math.min(1, lifeProgress * 3.2);
      const fadeOut = lifeProgress > 0.68 ? 1 - (lifeProgress - 0.68) / 0.32 : 1;
      const twinkle = 0.85 + Math.sin(timeSeconds * 6 + star.phase) * 0.15;
      const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut * twinkle * star.alphaScale));
      if (alpha <= 0) return;

      const trail = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
      trail.addColorStop(0, `rgba(255, 255, 255, 0)`);
      trail.addColorStop(0.35, `rgba(191, 230, 255, ${0.12 * alpha})`);
      trail.addColorStop(0.75, `rgba(219, 242, 255, ${0.48 * alpha})`);
      trail.addColorStop(1, `rgba(255, 255, 255, ${0.92 * alpha})`);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = star.size;
      ctx.shadowBlur = star.glow;
      ctx.shadowColor = `rgba(197, 236, 255, ${0.85 * alpha})`;
      ctx.strokeStyle = trail;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(star.x, star.y);
      ctx.stroke();

      const headGlow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4.5);
      headGlow.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
      headGlow.addColorStop(0.6, `rgba(212, 239, 255, ${0.35 * alpha})`);
      headGlow.addColorStop(1, 'rgba(212, 239, 255, 0)');
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawBurstParticle = (particle: StarBurstParticle) => {
      const lifeProgress = Math.min(1, particle.life / particle.maxLife);
      const alpha = Math.max(0, (1 - lifeProgress) * particle.alphaScale);
      if (alpha <= 0) return;

      const glow = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 4,
      );
      glow.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
      glow.addColorStop(0.45, `rgba(191, 231, 255, ${0.55 * alpha})`);
      glow.addColorStop(1, 'rgba(191, 231, 255, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = particle.glow;
      ctx.shadowColor = `rgba(196, 232, 255, ${0.75 * alpha})`;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const nowSeconds = now * 0.001;
      if (!lastTime) lastTime = now;
      const dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = stars.length - 1; i >= 0; i -= 1) {
        const star = stars[i];
        star.life += dt;
        star.x += star.vx * dt;
        star.y += star.vy * dt;

        if (isStarOut(star)) {
          spawnExplosion(star);
          stars[i] = createStar();
          continue;
        }

        drawStar(star, nowSeconds);
      }

      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const burst = bursts[i];

        for (let j = burst.particles.length - 1; j >= 0; j -= 1) {
          const particle = burst.particles[j];
          particle.life += dt;
          particle.vx *= 1 - dt * particle.drag;
          particle.vy = particle.vy * (1 - dt * particle.drag) + particle.gravity * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;

          if (particle.life >= particle.maxLife) {
            burst.particles.splice(j, 1);
            continue;
          }

          drawBurstParticle(particle);
        }

        if (burst.particles.length === 0) {
          bursts.splice(i, 1);
        }
      }

      while (stars.length < targetCount()) {
        stars.push(createStar());
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      setupCanvas();
      const wanted = targetCount();
      if (stars.length > wanted) {
        stars.length = wanted;
      }
      while (stars.length < wanted) {
        stars.push(createStar());
      }
    };

    setupCanvas();
    const initialStars = Math.max(8, Math.round(targetCount() * 0.85));
    for (let i = 0; i < initialStars; i += 1) {
      const star = createStar();
      star.life = random(0, star.maxLife * 0.75);
      stars.push(star);
    }

    rafId = window.requestAnimationFrame(tick);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      ctx.clearRect(0, 0, width, height);
    };
  }, [effectiveViewMode, hasMessages]);

  const beginReveal = async () => {
    if (effectiveViewMode === 'freeform') {
      if (isFreeformIntroExiting) {
        return;
      }

      setHasTriggeredIntro(true);
      setIsFreeformIntroExiting(true);
      void startSoundtrack(true);

      const boardEnterTimeoutId = window.setTimeout(() => {
        setShowRevealIntro(false);
        setRevealPhase('idle');
        setIsFreeformBoardEntered(true);
        setIsFreeformIntroExiting(false);
        setFreeformAnimationRun((current) => current + 1);
      }, 750);
      freeformAnimationTimeoutsRef.current.push(boardEnterTimeoutId);
      return;
    }

    setHasTriggeredIntro(true);
    setRevealPhase('opening');
    await startSoundtrack(true);

    window.setTimeout(() => setRevealPhase('burst'), 800);
    window.setTimeout(() => {
      setShowRevealIntro(false);
      setRevealPhase('idle');
    }, 2200);
  };

  const skipReveal = async () => {
    if (effectiveViewMode === 'freeform') {
      if (isFreeformIntroExiting) {
        return;
      }

      setHasTriggeredIntro(true);
      setIsFreeformIntroExiting(true);
      void startSoundtrack(true);

      const boardEnterTimeoutId = window.setTimeout(() => {
        setShowRevealIntro(false);
        setRevealPhase('idle');
        setIsFreeformBoardEntered(true);
        setIsFreeformIntroExiting(false);
        setFreeformAnimationRun((current) => current + 1);
      }, 390);
      freeformAnimationTimeoutsRef.current.push(boardEnterTimeoutId);
      return;
    }

    setHasTriggeredIntro(true);
    setShowRevealIntro(false);
    setRevealPhase('idle');
    await startSoundtrack(true);
  };

  const isCustomTheme = page?.theme?.startsWith('custom_') ?? false;
  const fallbackTheme = themeConfig[(page?.theme as keyof typeof themeConfig) || 'elegant'] || themeConfig.elegant;

  const customGradientFrom = page?.theme_gradient_from || '#8b5cf6';
  const customGradientTo = page?.theme_gradient_to || '#ec4899';
  const customGradientMid = page?.theme_gradient_mid || null;
  const customGradientAngle = page?.theme_gradient_angle ?? 135;
  const customAccentColor = page?.theme_accent_color || null;
  const customGradientStops = customGradientMid
    ? `${customGradientFrom}, ${customGradientMid}, ${customGradientTo}`
    : `${customGradientFrom}, ${customGradientTo}`;
  const customThemeAverageLightness = (
    hexToHsl(customGradientFrom).l
    + hexToHsl(customGradientMid || customGradientTo).l
    + hexToHsl(customGradientTo).l
  ) / 3;
  const isDarkCustomTheme = customThemeAverageLightness < 46;

  const theme = isCustomTheme
    ? {
        emoji: page?.theme_emoji || '🎨',
        colors: [
          customGradientFrom,
          customGradientMid || customGradientTo,
          customGradientTo,
        ],
        font: fontClassMap[page?.theme_font || 'sans'] || 'font-sans',
        heroClass: '',
        titleClass: isDarkCustomTheme ? 'text-white' : 'text-slate-900',
        cardClass: isDarkCustomTheme ? 'bg-white/12 border-white/18' : 'bg-white/82 border-white/70',
        text: isDarkCustomTheme ? 'text-white/95' : 'text-slate-950',
        accentColor: customAccentColor,
        style: {
          background: `linear-gradient(${customGradientAngle}deg, ${customGradientStops})`,
        },
      }
    : {
        ...fallbackTheme,
        accentColor: null as string | null,
        style: undefined,
      };

  const letterThemeKey = page?.letter_theme || page?.theme || 'elegant';
  const isCustomLetterTheme = letterThemeKey.startsWith('custom_');
  const fallbackLetterTheme = themeConfig[letterThemeKey as keyof typeof themeConfig] || fallbackTheme;
  const letterThemeGradientFrom = isCustomLetterTheme
    ? (page?.letter_theme_gradient_from || customGradientFrom)
    : (fallbackLetterTheme.colors[0] || theme.colors[0]);
  const letterThemeGradientTo = isCustomLetterTheme
    ? (page?.letter_theme_gradient_to || customGradientTo)
    : (fallbackLetterTheme.colors[fallbackLetterTheme.colors.length - 1] || theme.colors[theme.colors.length - 1]);
  const letterThemeGradientMid = isCustomLetterTheme
    ? (page?.letter_theme_gradient_mid || null)
    : (fallbackLetterTheme.colors.length > 2 ? fallbackLetterTheme.colors[1] : null);

  const [rawLetterFrom, rawLetterMid, rawLetterTo] = (page?.letter_color || '').split(',');
  const letterColorFromHex =
    normalizeHexColor(rawLetterFrom) ||
    letterThemeGradientFrom ||
    '#ff915a';
  const letterColorMidHex = normalizeHexColor(rawLetterMid) || letterThemeGradientMid;
  const letterColorToHex =
    normalizeHexColor(rawLetterTo || rawLetterMid) ||
    letterThemeGradientTo ||
    letterColorFromHex;

  const { h: letterH, s: letterS, l: letterL } = hexToHsl(letterColorFromHex);
  const { h: letterH2, s: letterS2, l: letterL2 } = hexToHsl(letterColorToHex);
  const clampedS = Math.min(letterS, 70);
  const clampedS2 = Math.min(letterS2, 70);
  const mixedLetterH = mixHue(letterH, letterH2);

  const letterThemeStyle = {
    '--letter-h': letterH.toFixed(0),
    '--letter-h-2': letterH2.toFixed(0),
    '--letter-h-mix': mixedLetterH.toFixed(0),
    '--letter-s': `${clampedS.toFixed(0)}%`,
    '--letter-s-2': `${clampedS2.toFixed(0)}%`,
    '--letter-l': `${letterL.toFixed(0)}%`,
    '--letter-l-2': `${letterL2.toFixed(0)}%`,
    '--letter-bg': 'var(--letter-h) calc(var(--letter-s) * 0.4) 12%',
    '--letter-bg-soft': 'var(--letter-h) var(--letter-s) 22%',
    '--letter-card': 'var(--letter-h) calc(var(--letter-s) * 0.55) 92%',
    '--letter-card-border': 'var(--letter-h) calc(var(--letter-s) * 0.35) 80%',
    '--letter-accent': 'var(--letter-h) var(--letter-s) 55%',
    '--letter-accent-soft': 'var(--letter-h) var(--letter-s) 70%',
    '--letter-text-strong': 'var(--letter-h) 22% 12%',
    '--letter-text-muted': 'var(--letter-h) 18% 34%',
  } as CSSProperties;

  const birthdayDate = parseLocalDate(page?.birthday_date);
  const requiresUnlock = !isPreview && Boolean(page?.requires_unlock);
  const isUnlocked = isPreview || !requiresUnlock || Boolean(page?.is_unlocked);
  const canShowKeepsakeDownload = false;
  const hasReachedBirthdayDate = useMemo(() => {
    if (Number.isNaN(birthdayDate.getTime())) return false;
    return nowMs >= birthdayDate.getTime();
  }, [birthdayDate, nowMs]);
  const isBeforeBirthday = !isPreview && page?.is_revealed === false && !hasReachedBirthdayDate;
  const isDarkExperience = page?.theme === 'cosmic' || page?.theme === 'midnight' || (isCustomTheme && isDarkCustomTheme);
  const experiencePanelClass = isDarkExperience
    ? 'border-white/16 bg-white/12 backdrop-blur-xl'
    : 'border-white/65 bg-white/88 shadow-[0_24px_80px_rgba(255,255,255,0.28),0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-md';
  const experienceInsetClass = isDarkExperience
    ? 'border-white/14 bg-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.18)]'
    : 'border-white/80 bg-white/94 shadow-[0_18px_45px_rgba(255,255,255,0.25),0_16px_30px_rgba(15,23,42,0.06)]';
  const keepsakePaperClass = isDarkExperience
    ? 'border-white/18 bg-[linear-gradient(180deg,rgba(34,36,56,0.94),rgba(18,20,34,0.88))] shadow-[0_30px_90px_rgba(2,6,23,0.44)]'
    : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,252,247,0.99),rgba(255,244,235,0.96))] shadow-[0_34px_86px_rgba(183,133,83,0.16),0_18px_34px_rgba(15,23,42,0.08)]';
  const keepsakeSoftClass = isDarkExperience
    ? 'border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]'
    : 'border-white/80 bg-[linear-gradient(180deg,rgba(255,250,244,0.93),rgba(255,243,233,0.84))]';
  const keepsakePhotoBoardClass = isDarkExperience
    ? 'border-white/18 bg-[linear-gradient(180deg,rgba(20,24,39,0.92),rgba(12,15,27,0.88))] shadow-[0_28px_74px_rgba(4,7,20,0.48)]'
    : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,247,239,0.98),rgba(255,238,224,0.95))] shadow-[0_32px_78px_rgba(194,144,92,0.16),0_16px_32px_rgba(15,23,42,0.07)]';
  const keepsakePillClass = isDarkExperience
    ? 'border border-white/14 bg-white/10 text-white/82'
    : 'border border-white/70 bg-white/74 text-foreground/78';
  const freeformThemePalette = useMemo(() => {
    const colorA = normalizeHexColor(letterColorFromHex) || normalizeHexColor(theme.colors[0]) || '#fbbf24';
    const colorB = normalizeHexColor(letterColorMidHex || letterColorToHex) || normalizeHexColor(theme.colors[1]) || '#f97316';
    const colorC = normalizeHexColor(letterColorToHex) || normalizeHexColor(theme.colors[2]) || colorA;

    const { h: hA, s: sA, l: lA } = hexToHsl(colorA);
    const { h: hB, s: sB, l: lB } = hexToHsl(colorB);
    const { h: hC, s: sC, l: lC } = hexToHsl(colorC);
    const hAB = mixHue(hA, hB);
    const hBC = mixHue(hB, hC);
    const mixedHue = hAB;
    const averageLightness = (lA + lB + lC) / 3;
    const freeformIsDark = isDarkExperience || averageLightness < 42;
    const gradientAngle = Number.isFinite(customGradientAngle) ? customGradientAngle : 165;

    const toDarkCard = (h: number, s: number, l: number) => {
      const baseSat = Math.max(22, Math.min(50, s * 0.58));
      const baseLight = Math.max(18, Math.min(27, l * 0.4));
      return {
        bg: `hsl(${h} ${baseSat}% ${baseLight}%)`,
        border: `hsl(${h} ${Math.max(28, Math.min(62, baseSat + 12))}% ${Math.max(34, Math.min(46, baseLight + 16))}%)`,
        text: 'hsl(0 0% 96%)',
      };
    };

    const toLightCard = (h: number, s: number, l: number) => {
      const baseSat = Math.max(52, Math.min(86, s * 0.86));
      const baseLight = Math.max(87, Math.min(95, l + 24));
      return {
        bg: `hsl(${h} ${baseSat}% ${baseLight}%)`,
        border: `hsl(${h} ${Math.max(42, Math.min(72, s * 0.72))}% ${Math.max(68, Math.min(82, l + 8))}%)`,
        text: `hsl(${h} 34% 24%)`,
      };
    };

    const cards = freeformIsDark
      ? [
          toDarkCard(hA, sA, lA),
          toDarkCard(hB, sB, lB),
          toDarkCard(hC, sC, lC),
          toDarkCard(hAB, (sA + sB) / 2, (lA + lB) / 2),
          toDarkCard(hBC, (sB + sC) / 2, (lB + lC) / 2),
        ]
      : [
          toLightCard(hA, sA, lA),
          toLightCard(hB, sB, lB),
          toLightCard(hC, sC, lC),
          toLightCard(hAB, (sA + sB) / 2, (lA + lB) / 2),
          toLightCard(hBC, (sB + sC) / 2, (lB + lC) / 2),
        ];

    return {
      boardBackground: freeformIsDark
        ? `linear-gradient(${gradientAngle}deg, hsl(${hA} ${Math.max(24, Math.min(56, sA * 0.56))}% ${Math.max(10, Math.min(20, lA * 0.34))}%), hsl(${hB} ${Math.max(24, Math.min(56, sB * 0.56))}% ${Math.max(9, Math.min(18, lB * 0.3))}%) 52%, hsl(${hC} ${Math.max(24, Math.min(56, sC * 0.56))}% ${Math.max(10, Math.min(20, lC * 0.34))}%) 100%)`
        : `linear-gradient(${gradientAngle}deg, hsl(${hA} ${Math.max(50, Math.min(88, sA * 0.92))}% ${Math.max(74, Math.min(92, lA + 24))}%), hsl(${hB} ${Math.max(48, Math.min(86, sB * 0.9))}% ${Math.max(66, Math.min(86, lB + 16))}%) 52%, hsl(${hC} ${Math.max(46, Math.min(84, sC * 0.88))}% ${Math.max(58, Math.min(80, lC + 10))}%) 100%)`,
      eyebrowText: freeformIsDark ? `hsl(${mixedHue} 24% 76%)` : `hsl(${hB} 28% 36%)`,
      metaText: freeformIsDark ? `hsl(${mixedHue} 18% 78%)` : `hsl(${hB} 24% 34%)`,
      chipBg: freeformIsDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.62)',
      chipText: freeformIsDark ? 'rgba(255,255,255,0.94)' : `hsl(${hB} 28% 28%)`,
      accentBorder: freeformIsDark ? `hsl(${hA} 66% 62%)` : `hsl(${hA} 72% 48%)`,
      tapeColor: freeformIsDark ? `hsla(${hC}, 66%, 72%, 0.34)` : `hsla(${hC}, 82%, 72%, 0.55)`,
      pinColor: freeformIsDark ? `hsl(${hA} 76% 66%)` : `hsl(${hA} 76% 52%)`,
      dividerColor: freeformIsDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
      cards,
    };
  }, [customGradientAngle, isDarkExperience, letterColorFromHex, letterColorMidHex, letterColorToHex, theme.colors]);

  const freeformOpenerPalette = useMemo(() => {
    const overlayStart = letterColorFromHex;
    const overlayMid = letterColorMidHex || letterColorToHex;
    const overlayEnd = letterColorToHex;
    const { h: hStart, s: sStart, l: lStart } = hexToHsl(overlayStart);
    const { h: hMid, s: sMid, l: lMid } = hexToHsl(overlayMid);
    const { h: hEnd, s: sEnd, l: lEnd } = hexToHsl(overlayEnd);
    const overlayHue = mixHue(hStart, hEnd);
    const overlaySat = Math.max(18, Math.min((sStart + sEnd) / 2, 72));
    const overlayLight = Math.max(18, Math.min((lStart + lEnd) / 2, 62));
    const openerAngle = Number.isFinite(customGradientAngle) ? customGradientAngle : 135;
    const openerIsDark = isDarkExperience || (lStart + lMid + lEnd) / 3 < 42;
    const floatCardBorder = `hsla(${overlayHue}, ${Math.min(overlaySat + 14, 92)}%, ${openerIsDark ? 72 : 42}%, ${openerIsDark ? 0.4 : 0.3})`;
    const floatCardFill = `hsla(${overlayHue}, ${Math.min(overlaySat + 18, 94)}%, ${openerIsDark ? 34 : 66}%, ${openerIsDark ? 0.24 : 0.2})`;
    const paperColor = openerIsDark
      ? `hsl(${overlayHue} ${Math.max(20, overlaySat * 0.38)}% 16%)`
      : `hsl(${overlayHue} ${Math.max(24, overlaySat * 0.52)}% 93%)`;

    return {
      backdrop: [
        `linear-gradient(${openerAngle}deg, ${overlayStart} 0%, ${overlayMid} 52%, ${overlayEnd} 100%)`,
        `radial-gradient(circle at 50% 24%, hsl(${hMid} ${Math.min(92, sMid + 8)}% ${Math.min(74, lMid + 4)}% / 0.3), transparent 64%)`,
        `radial-gradient(circle at 50% 100%, rgba(0,0,0, ${openerIsDark ? 0.5 : 0.28}), transparent 62%)`,
      ].join(', '),
      textureLayer: [
        `repeating-linear-gradient(180deg, hsl(${overlayHue} ${Math.max(12, overlaySat * 0.3)}% ${openerIsDark ? 92 : 98}% / 0.045) 0px, hsl(${overlayHue} ${Math.max(12, overlaySat * 0.3)}% ${openerIsDark ? 92 : 98}% / 0.045) 1px, transparent 1px, transparent 4px)`,
        `linear-gradient(${openerAngle}deg, ${overlayStart}, ${overlayMid} 52%, ${overlayEnd})`,
      ].join(', '),
      halo: `radial-gradient(circle, hsl(${overlayHue} ${Math.max(30, overlaySat * 0.84)}% ${openerIsDark ? 54 : 64}% / 0.28), transparent 72%)`,
      tape: `${overlayEnd}cc`,
      miniCard: `linear-gradient(145deg, ${letterColorMidHex ? `${overlayStart}, ${overlayMid}, ${overlayEnd}` : `${overlayStart}, ${overlayEnd}`})`,
      floatingCardBorder: floatCardBorder,
      floatingCardFill: floatCardFill,
      paper: paperColor,
      nameText: openerIsDark
        ? 'hsl(0 0% 96%)'
        : `hsl(${overlayHue} ${Math.max(28, overlaySat * 0.52)}% 22%)`,
      eyebrowText: openerIsDark ? 'hsl(0 0% 90% / 0.92)' : 'hsl(0 0% 98% / 0.92)',
      textPrimary: 'hsl(0 0% 98%)',
      textSecondary: 'hsl(0 0% 92%)',
      quoteText: 'hsl(0 0% 94%)',
      chipBg: openerIsDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.24)',
      chipBorder: openerIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.62)',
      chipText: 'hsl(0 0% 96%)',
      ctaBorder: openerIsDark ? 'rgba(255,255,255,0.66)' : 'rgba(255,255,255,0.74)',
      ctaText: 'hsl(0 0% 98%)',
      skipText: 'hsl(0 0% 86%)',
      skipTextHover: 'hsl(0 0% 98%)',
    };
  }, [customGradientAngle, isDarkExperience, letterColorFromHex, letterColorMidHex, letterColorToHex]);

  const storyOpenerPalette = useMemo(() => {
    const start = letterColorFromHex;
    const mid = letterColorMidHex || letterColorToHex;
    const end = letterColorToHex;
    const angle = Number.isFinite(customGradientAngle) ? customGradientAngle : 140;
    const { h: hStart, s: sStart, l: lStart } = hexToHsl(start);
    const { h: hMid, s: sMid, l: lMid } = hexToHsl(mid);
    const { h: hEnd, s: sEnd, l: lEnd } = hexToHsl(end);
    const mixedHue = mixHue(hStart, hEnd);
    const averageLight = (lStart + lMid + lEnd) / 3;
    const isDark = isDarkExperience || averageLight < 44;
    const satAvg = (sStart + sMid + sEnd) / 3;

    return {
      backdrop: [
        `linear-gradient(${angle}deg, ${start} 0%, ${mid} 52%, ${end} 100%)`,
        `radial-gradient(circle at 50% 100%, rgba(0,0,0, ${isDark ? 0.56 : 0.32}), transparent 62%)`,
      ].join(', '),
      textureLayer: `radial-gradient(circle at 50% 24%, rgba(255,255,255, ${isDark ? 0.14 : 0.24}), transparent 44%)`,
      halo: `radial-gradient(circle, hsla(${mixedHue}, ${Math.max(36, Math.min(92, satAvg * 0.9))}%, ${isDark ? 62 : 72}%, 0.3), transparent 70%)`,
      burstBorder: `hsla(${mixedHue}, ${Math.max(28, Math.min(84, satAvg * 0.86))}%, ${isDark ? 80 : 56}%, 0.44)`,
      burstFill: `linear-gradient(${angle}deg, ${start}33, ${mid}40 52%, ${end}33)`,
      envelopeOuter: `linear-gradient(${angle}deg, ${start}, ${mid} 52%, ${end})`,
      envelopeInnerRing: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.52)',
      envelopeInsetBorder: `hsla(${mixedHue}, ${Math.max(24, Math.min(76, satAvg * 0.74))}%, ${isDark ? 78 : 52}%, 0.56)`,
      flap: `linear-gradient(${angle}deg, ${mid}, ${end} 60%, ${start})`,
      body: `linear-gradient(180deg, ${start}f2, ${mid}dd 58%, ${end}d9)`,
      bodyBorder: `hsla(${mixedHue}, ${Math.max(22, Math.min(76, satAvg * 0.68))}%, ${isDark ? 82 : 54}%, 0.66)`,
      letter: `linear-gradient(180deg, rgba(255,255,255,0.95), ${mid}30 65%, ${end}26)`,
      letterBorder: `hsla(${mixedHue}, ${Math.max(24, Math.min(78, satAvg * 0.7))}%, ${isDark ? 84 : 50}%, 0.74)`,
      letterTo: isDark ? 'rgba(255,255,255,0.82)' : `hsl(${mixedHue} 38% 30%)`,
      letterName: isDark ? 'hsl(0 0% 98%)' : `hsl(${hStart} 42% 20%)`,
      letterBody: isDark ? 'rgba(255,255,255,0.84)' : `hsl(${hEnd} 28% 30%)`,
      stamp: `radial-gradient(circle at 30% 30%, ${start}, ${mid} 55%, ${end})`,
      stampBorder: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.74)',
    };
  }, [customGradientAngle, isDarkExperience, letterColorFromHex, letterColorMidHex, letterColorToHex]);

  const storyThemePalette = useMemo(() => {
    const start = letterColorFromHex;
    const mid = letterColorMidHex || letterColorToHex;
    const end = letterColorToHex;
    const angle = Number.isFinite(customGradientAngle) ? customGradientAngle : 140;
    const { h: hStart, s: sStart, l: lStart } = hexToHsl(start);
    const { h: hMid, s: sMid, l: lMid } = hexToHsl(mid);
    const { h: hEnd, s: sEnd, l: lEnd } = hexToHsl(end);
    const hueMix = mixHue(hStart, hEnd);
    const satAvg = (sStart + sMid + sEnd) / 3;
    const lightAvg = (lStart + lMid + lEnd) / 3;
    const isDark = isDarkExperience || lightAvg < 44;

    return {
      sectionBackground: [
        `linear-gradient(${angle}deg, ${start} 0%, ${mid} 52%, ${end} 100%)`,
        `radial-gradient(circle at 50% 110%, rgba(0,0,0, ${isDark ? 0.46 : 0.28}), transparent 60%)`,
      ].join(', '),
      topBadgeBg: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.32)',
      topBadgeText: 'rgba(255,255,255,0.96)',
      panelBg: isDark ? 'rgba(10,12,18,0.42)' : 'rgba(255,255,255,0.22)',
      panelBorder: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.46)',
      orbA: isDark
        ? `hsla(${hMid}, ${Math.max(30, Math.min(92, sMid * 0.88))}%, 78%, 0.16)`
        : `hsla(${hStart}, ${Math.max(34, Math.min(94, sStart * 0.94))}%, 92%, 0.54)`,
      orbB: isDark
        ? `hsla(${hEnd}, ${Math.max(30, Math.min(92, sEnd * 0.9))}%, 62%, 0.24)`
        : `hsla(${hEnd}, ${Math.max(30, Math.min(90, sEnd * 0.9))}%, 76%, 0.46)`,
      paperBg: isDark ? 'rgba(9,11,18,0.5)' : 'rgba(255,255,255,0.27)',
      paperBorder: isDark ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.52)',
      softBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.19)',
      softBorder: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.44)',
      pillBg: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.32)',
      pillBorder: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.56)',
      pillText: isDark ? 'rgba(255,255,255,0.92)' : `hsl(${hueMix} ${Math.max(24, satAvg * 0.45)}% 24%)`,
    };
  }, [customGradientAngle, isDarkExperience, letterColorFromHex, letterColorMidHex, letterColorToHex]);
  const interactiveSelector = 'button,a,audio,input,textarea,select,[data-no-nav="true"]';

  const revealSlides = useMemo<RevealSlide[]>(() => {
    if (!page) return [];

    const slides: RevealSlide[] = [{ id: 'cover', kind: 'cover' }, { id: 'stats', kind: 'stats' }];

    if (page.creator_message) {
      slides.push({ id: 'organizer', kind: 'organizer' });
    }

    messages.forEach((message, index) => {
      slides.push({
        id: `wish-${message.id}`,
        kind: 'wish',
        message,
        index,
      });
    });

    slides.push({ id: 'closing', kind: 'closing' });
    return slides;
  }, [messages, page]);

  useEffect(() => {
    setCurrentSlide((previousSlide) => Math.min(previousSlide, Math.max(revealSlides.length - 1, 0)));
  }, [revealSlides.length]);

  const goToNextSlide = useCallback(() => {
    setSlideDirection('forward');
    setCurrentSlide((previousSlide) => Math.min(previousSlide + 1, Math.max(revealSlides.length - 1, 0)));
  }, [revealSlides.length]);

  const goToPreviousSlide = useCallback(() => {
    setSlideDirection('back');
    setCurrentSlide((previousSlide) => Math.max(previousSlide - 1, 0));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [currentSlide]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!isPreview || !pageId) {
      return;
    }

    try {
      await apiFetch(`/pages/${pageId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleDeletePhoto = async (photoId: string, messageId: string) => {
    if (!isPreview || !pageId) {
      return;
    }

    try {
      await apiFetch(`/pages/${pageId}/messages/photos/${photoId}`, {
        method: 'DELETE',
      });
      
      setMessages((prev) => prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        
        // Remove from photos array
        const newPhotos = msg.photos?.filter(p => p.id !== photoId);
        
        // Remove legacy photo_url if it matches this photoId
        const newPhotoUrl = msg.photo_url && `legacy-${msg.id}` === photoId ? null : msg.photo_url;
        
        return { ...msg, photos: newPhotos, photo_url: newPhotoUrl };
      }));
      
      toast.success('Photo removed');
    } catch (error) {
      console.error('Delete photo error:', error);
      toast.error('Failed to remove photo');
    }
  };

  const handleDeleteAudio = async (messageId: string) => {
    if (!isPreview || !pageId) {
      return;
    }

    try {
      await apiFetch(`/pages/${pageId}/messages/${messageId}/audio`, {
        method: 'DELETE',
      });
      
      setMessages((prev) => prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        return { ...msg, audio_url: null };
      }));
      
      toast.success('Voice note removed');
    } catch (error) {
      console.error('Delete audio error:', error);
      toast.error('Failed to remove voice note');
    }
  };

  const handleStageClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    if (path.some((node) => node instanceof HTMLAudioElement)) {
      return;
    }
    if (path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]')))) {
      return;
    }
    if (target instanceof Element && target.closest(interactiveSelector)) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;

    if (clickX > bounds.width / 2) {
      goToNextSlide();
      return;
    }

    goToPreviousSlide();
  }, [goToNextSlide, goToPreviousSlide]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const target = event.target;
    const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    ignoreTouchNavigationRef.current =
      path.some((node) => node instanceof HTMLAudioElement) ||
      path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]'))) ||
      (target instanceof Element && Boolean(target.closest(interactiveSelector)));
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }, [interactiveSelector]);

  const handleTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    if (path.some((node) => node instanceof HTMLAudioElement)) {
      touchStartXRef.current = null;
      ignoreTouchNavigationRef.current = false;
      return;
    }
    if (path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]')))) {
      touchStartXRef.current = null;
      ignoreTouchNavigationRef.current = false;
      return;
    }
    if (ignoreTouchNavigationRef.current) {
      ignoreTouchNavigationRef.current = false;
      touchStartXRef.current = null;
      return;
    }

    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (startX === null || endX === null) return;

    const distance = endX - startX;
    if (Math.abs(distance) < 50) return;

    if (distance < 0) {
      goToNextSlide();
      return;
    }

    goToPreviousSlide();
  }, [goToNextSlide, goToPreviousSlide]);

  const activeSlide = revealSlides[currentSlide];
  const currentSlideDuration = useMemo(() => getSlideDuration(activeSlide), [activeSlide]);
  const coverHintLabel =
    isCoarsePointerDevice
      ? 'Tap to enlarge'
      : 'Click to enlarge';

  useEffect(() => {
    setSlideRemainingMs(currentSlideDuration);
    slideTimerStartedAtRef.current = null;
  }, [currentSlideDuration, currentSlide]);

  const handlePlayControl = useCallback(() => {
    if (isDesktopReveal) {
      setIsDesktopPlaybackPaused(false);
    }
    void startSoundtrack(true);
  }, [isDesktopReveal, startSoundtrack]);

  const handlePauseControl = useCallback(() => {
    stopSoundtrack();

    if (!isDesktopReveal) {
      return;
    }

    setIsDesktopPlaybackPaused(true);
    const startedAt = slideTimerStartedAtRef.current;
    if (startedAt) {
      const elapsed = Date.now() - startedAt;
      setSlideRemainingMs((previous) => Math.max(280, previous - elapsed));
      slideTimerStartedAtRef.current = null;
    }
  }, [isDesktopReveal, stopSoundtrack]);

  const getStoryDelayStyle = (delay: number, duration?: number) =>
    ({
      '--story-delay': `${delay}ms`,
      ...(duration ? { '--story-duration': `${duration}ms` } : {}),
    }) as CSSProperties;
  const renderStoryImage = (
    src: string,
    alt: string,
    options?: { objectPosition?: string; className?: string; eager?: boolean; disableParallax?: boolean },
  ) => (
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      loading={options?.eager ? 'eager' : 'lazy'}
      className={cn(
        options?.disableParallax ? 'absolute inset-0 block h-full w-full object-cover' : 'story-photo-layer absolute inset-0 h-full w-full object-cover',
        options?.className,
      )}
      style={options?.objectPosition ? { objectPosition: options.objectPosition } : undefined}
    />
  );
  const handleBoardParallaxMove = useCallback((event: MouseEvent<HTMLElement>) => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 18;

    event.currentTarget.style.setProperty('--parallax-x', `${offsetX}px`);
    event.currentTarget.style.setProperty('--parallax-y', `${offsetY}px`);
  }, []);

  const lastAutoPlayedWishIdRef = useRef<string | null>(null);
  const handleBoardParallaxLeave = useCallback((event: MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--parallax-x', '0px');
    event.currentTarget.style.setProperty('--parallax-y', '0px');
  }, []);

  const handleWishAudioPlay = useCallback((messageId: string) => {
    // Desktop only: onPlay/onPause/onEnded are not wired on mobile (MobileVoiceNoteControl owns it).
    setActiveWishAudioId(messageId);

    // Confirm it's really playing before stopping the soundtrack (guards against
    // desktop browsers firing onPlay before stable playback).
    window.setTimeout(() => {
      const el = wishAudioRefs.current[messageId];
      if (!el) return;
      if (!el.paused && !el.ended) {
        pauseSoundtrackForWishAudio();
        return;
      }

      setActiveWishAudioId((currentId) => (currentId === messageId ? null : currentId));
    }, 180);
  }, [pauseSoundtrackForWishAudio]);

  const handleWishAudioStop = useCallback((messageId: string) => {
    setActiveWishAudioId((currentId) => {
      if (currentId !== messageId) {
        return currentId;
      }

      void resumeSoundtrackAfterWishAudio();
      return null;
    });
  }, [resumeSoundtrackAfterWishAudio]);

  const renderWishAudioPlayer = useCallback((message: Message, className?: string) => {
    const src = resolveAssetUrl(message.audio_url) || undefined;
    if (!src) return null;
    const isCoarsePointer = isCoarsePointerDevice;

    return (
      <div
        data-no-nav="true"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {isCoarsePointer && (
          <MobileVoiceNoteControl
            messageId={message.id}
            getAudioEl={() => wishAudioRefs.current[message.id] ?? null}
            onUserStartPlayback={() => {
              pauseSoundtrackForWishAudio();
              setActiveWishAudioId(message.id);
            }}
            onStopped={() => handleWishAudioStop(message.id)}
          />
        )}
        <audio
          ref={(element) => {
            if (element) {
              wishAudioRefs.current[message.id] = element;
            } else {
              delete wishAudioRefs.current[message.id];
            }
          }}
          controls={!isCoarsePointer}
          playsInline
          muted={false}
          className={className}
          src={src}
          preload="metadata"
          onPlay={isCoarsePointer ? undefined : () => handleWishAudioPlay(message.id)}
          onPause={isCoarsePointer ? undefined : () => handleWishAudioStop(message.id)}
          onEnded={isCoarsePointer ? undefined : () => handleWishAudioStop(message.id)}
        >
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }, [handleWishAudioPlay, handleWishAudioStop, isCoarsePointerDevice, pauseSoundtrackForWishAudio]);

  useEffect(() => {
    // This effect is only valid for the desktop "activeSlide" reveal experience.
    // On mobile we render a scrollable list of slides, so `activeSlide` does not
    // represent the currently interacted wish card and would incorrectly stop audio.
    if (!isDesktopReveal) {
      return;
    }

    const slide = activeSlide;
    if (!slide || slide.kind !== 'wish' || !slide.message?.audio_url) {
      // If we leave an audio slide, stop any active wish audio
      if (activeWishAudioId) {
        const previousAudio = wishAudioRefs.current[activeWishAudioId];
        if (previousAudio && !previousAudio.paused) {
          previousAudio.pause();
          previousAudio.currentTime = 0;
        }
        handleWishAudioStop(activeWishAudioId);
      }
      lastAutoPlayedWishIdRef.current = null;
      return;
    }

    // On touch/mobile devices, rely on the user's tap to start audio
    if (isCoarsePointerDevice) {
      return;
    }

    const targetId = slide.message.id;

    // Only attempt autoplay once per wish slide activation
    if (lastAutoPlayedWishIdRef.current === targetId) {
      return;
    }

    const audioEl = wishAudioRefs.current[targetId];
    if (!audioEl) return;

    audioEl
      .play()
      .then(() => {
        lastAutoPlayedWishIdRef.current = targetId;
        // onPlay handler will handle ducking + activeWishAudioId
      })
      .catch((error) => {
        console.error('Wish audio autoplay blocked', error);
      });
  }, [activeSlide, activeWishAudioId, handleWishAudioStop, isCoarsePointerDevice, isDesktopReveal]);

  useEffect(() => {
    if (!isDesktopReveal || !activeSlide) return;

    const nextSlide = revealSlides[currentSlide + 1];
    if (!nextSlide) return;

    const nextImageSrc = nextSlide.kind === 'cover'
      ? coverPhotoSrc
      : nextSlide.kind === 'wish'
        ? resolveAssetUrl(getMessagePhotos(nextSlide.message)[0]?.photo_url)
        : null;

    if (!nextImageSrc) return;

    const image = new Image();
    image.src = nextImageSrc;
  }, [activeSlide, coverPhotoSrc, currentSlide, isDesktopReveal, revealSlides]);

  useEffect(() => {
    if (!isDesktopReveal || loading || !page || showRevealIntro || expandedPhoto || showShareCard || activeWishAudioId || isDesktopPlaybackPaused) return;
    if (!activeSlide || currentSlide >= revealSlides.length - 1) return;

    let hasAdvanced = false;
    slideTimerStartedAtRef.current = Date.now();

    const timeoutId = window.setTimeout(() => {
      hasAdvanced = true;
      setCurrentSlide((previousSlide) => Math.min(previousSlide + 1, Math.max(revealSlides.length - 1, 0)));
    }, slideRemainingMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (!hasAdvanced) {
        const startedAt = slideTimerStartedAtRef.current;
        if (startedAt) {
          const elapsed = Date.now() - startedAt;
          setSlideRemainingMs((previous) => Math.max(280, previous - elapsed));
        }
      }
      slideTimerStartedAtRef.current = null;
    };
  }, [
    activeSlide,
    currentSlide,
    slideRemainingMs,
    expandedPhoto,
    activeWishAudioId,
    isDesktopReveal,
    isDesktopPlaybackPaused,
    loading,
    page,
    revealSlides.length,
    showRevealIntro,
    showShareCard,
  ]);

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

  if (requiresUnlock && !isUnlocked) {
    return (
      <div className={`relative min-h-screen overflow-hidden ${theme.heroClass}`} style={theme.style}>
        <DecorativeLayer colors={theme.colors} />
        <AnimatedBackground />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
          <div className="w-full rounded-[2rem] border border-white/65 bg-white/88 p-6 shadow-card-lg backdrop-blur-md sm:p-8">
            <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>Protected birthday page</p>
            <h1 className={cn('mt-3 text-3xl font-bold leading-tight', theme.titleClass, theme.font)}>
              Enter PIN to unlock {page.recipient_name}&apos;s wishes
            </h1>
            <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme.text)}>
              The creator added a secret PIN so only invited people can open this birthday keepsake.
            </p>

            <div className="mt-6 space-y-3">
              <input
                type="password"
                inputMode="numeric"
                value={unlockPin}
                onChange={(event) => setUnlockPin(event.target.value.replace(/\D/g, '').slice(0, 12))}
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base"
                placeholder="Enter 4-12 digit PIN"
              />
              <Button variant="hero" size="lg" className="w-full" onClick={() => void handleUnlock()} disabled={unlocking || unlockPin.length < 4}>
                {unlocking ? 'Unlocking...' : 'Unlock birthday page'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isBeforeBirthday) {
    return (
      <div className={`relative min-h-screen overflow-hidden ${theme.heroClass}`} style={theme.style}>
        <DecorativeLayer colors={theme.colors} />
        <AnimatedBackground />
        <BirthdayCountdown
          targetDate={birthdayDate}
          recipientName={page.recipient_name}
          theme={{
            emoji: theme.emoji,
            titleClass: theme.titleClass,
            font: theme.font,
            text: theme.text,
            primary: '',
            isCustom: isCustomTheme,
            gradientFrom: page.theme_gradient_from || undefined,
            gradientTo: page.theme_gradient_to || undefined,
          }}
        />
      </div>
    );
  }

  const birthdayViewModel = asBirthdayViewModel({
    activeSlide,
    beginReveal,
    birthdayDate,
    burstMessages,
    canShowKeepsakeDownload,
    clampedS,
    clampedS2,
    contributorLine,
    coverHintLabel,
    coverPhotoSrc,
    currentSlide,
    currentSlideDuration,
    downloadingPdf,
    downloadingVideo,
    effectiveViewMode,
    expandedFreeformCardIds,
    experienceInsetClass,
    experiencePanelClass,
    freeformBoardSectionRef,
    freeformOpenerPalette,
    freeformStarsCanvasRef,
    freeformThemePalette,
    getStoryDelayStyle,
    goToNextSlide,
    goToPreviousSlide,
    handleBoardParallaxLeave,
    handleBoardParallaxMove,
    handleDownloadKeepsake,
    handleDownloadVideoKeepsake,
    handlePauseControl,
    handlePlayControl,
    handleReleasePoolPayout,
    handleRequestGiftRelease,
    handleStageClick,
    handleTouchEnd,
    handleTouchStart,
    hasMessages,
    includeSoundtrackInVideo,
    isDarkExperience,
    isDesktopPlaybackPaused,
    isFreeformBoardEntered,
    isFreeformIntroExiting,
    isPageOwner,
    isPreview,
    isSaved,
    keepsakePaperClass,
    keepsakePhotoBoardClass,
    keepsakePillClass,
    keepsakeSoftClass,
    landedFreeformCards,
    loading,
    messages,
    mixedLetterH,
    mobileCardsContainerRef,
    mobileFreeformMotion,
    mobileRevealRef,
    navigate,
    page,
    pageId,
    paidContributorLine,
    poolSummary,
    poppedFreeformDecorators,
    releasingPoolPayout,
    renderStoryImage,
    renderWishAudioPlayer,
    requestingGiftRelease,
    revealPhase,
    revealSlides,
    setActiveWishAudioId,
    setCurrentSlide,
    setDownloadingPdf,
    setDownloadingVideo,
    setExpandedFreeformCardIds,
    setExpandedPhoto,
    setFreeformAnimationRun,
    setHasTriggeredIntro,
    setIncludeSoundtrackInVideo,
    setIsDesktopPlaybackPaused,
    setIsDesktopReveal,
    setIsFreeformBoardEntered,
    setIsFreeformIntroExiting,
    setIsPageOwner,
    setIsSaved,
    setLandedFreeformCards,
    setLoading,
    setMessages,
    setNowMs,
    setPage,
    setPendingDeleteAction,
    setPoolSummary,
    setPoppedFreeformDecorators,
    setReleasingPoolPayout,
    setRequestingGiftRelease,
    setRevealPhase,
    setShowRevealIntro,
    setShowShareCard,
    setSlideDirection,
    setSlideRemainingMs,
    setStartYoutube,
    setUnlockPin,
    setUnlocking,
    setViewMode,
    showRevealIntro,
    showRevealIntroInPreview,
    skipReveal,
    slideDirection,
    storyOpenerPalette,
    storyThemePalette,
    theme,
    toggleSavePage,
    totalAudioWishes,
    totalPhotos,
    user,
    viewMode,
    forceMobileView,
    isDesktopReveal: isDesktopRevealEffective,
  });

  return (
    <BirthdayPageViewProvider value={birthdayViewModel}>
    <div
      className={cn(
        'relative transition-colors duration-500',
        forceMobileView
          ? showRevealIntro && effectiveViewMode !== 'freeform'
            ? 'h-full min-h-full overflow-hidden'
            : 'min-h-full overflow-x-hidden overflow-y-auto'
          : !isDesktopRevealEffective
            ? showRevealIntro && effectiveViewMode !== 'freeform'
              ? 'h-[100dvh] min-h-[100dvh] overflow-hidden'
              : 'min-h-[100dvh] overflow-x-hidden overflow-y-auto'
            : showRevealIntro || effectiveViewMode === 'story'
              ? 'h-[100dvh] min-h-[100dvh] overflow-hidden'
              : 'min-h-[100dvh] overflow-x-hidden overflow-y-auto',
        theme.heroClass,
      )}
      style={{ ...(theme.style || {}), ...letterThemeStyle }}
    >
      <DecorativeLayer colors={theme.colors} />

      {expandedPhoto && (
        <button
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setExpandedPhoto(null)}
          type="button"
          aria-label="Close expanded photo"
        >
          <div className="max-w-5xl">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-white/75 sm:hidden">
              Tap to close
            </p>
            <img
              src={resolveAssetUrl(expandedPhoto.url) || expandedPhoto.url}
              alt={`Expanded photo from ${expandedPhoto.senderName}`}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            {(expandedPhoto.caption || expandedPhoto.senderName) && (
              <div className="mt-4 text-center text-white">
                {expandedPhoto.caption && <p className="text-base font-medium">{expandedPhoto.caption}</p>}
                <p className="mt-1 text-sm text-white/70">Shared by {expandedPhoto.senderName}</p>
              </div>
            )}
          </div>
        </button>
      )}

      {showRevealIntro && (
        <Suspense fallback={null}>
          <LazyRevealIntroOverlay />
        </Suspense>
      )}

      {effectiveViewMode === 'story' && (
        <>
          <Suspense fallback={null}>
            <LazyMobileStorySection />
          </Suspense>
          <Suspense fallback={null}>
            <LazyDesktopStorySection />
          </Suspense>
        </>
      )}

      {effectiveViewMode === 'bento' && (
        <Suspense fallback={null}>
          <LazyBentoStorySections />
        </Suspense>
      )}

      {effectiveViewMode === 'freeform' && (
        <Suspense fallback={null}>
          <LazyFreeformSection />
        </Suspense>
      )}

      {!showRevealIntro && (page.custom_audio_url || page.soundtrack_id) && (
        <div className="fixed top-3 right-3 z-50 pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSoundtrackMute}
            aria-label={isSoundtrackMuted ? "Unmute celebration music" : "Mute celebration music"}
            className={cn(
              "h-8 px-2.5 gap-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-md border transition-all duration-200",
              isSoundtrackMuted
                ? "bg-black/70 text-white border-white/20 hover:bg-black/85"
                : "bg-white/85 text-foreground border-black/10 hover:bg-white shadow-sm"
            )}
          >
            {isSoundtrackMuted ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span>Sound on</span>
              </>
            )}
          </Button>
        </div>
      )}


      <BirthdayShareCard
        recipientName={page.recipient_name}
        messageCount={messages.length}
        themeEmoji={theme.emoji}
        themeColors={theme.colors}
        shareUrl={typeof window === 'undefined' ? '' : window.location.href}
        open={showShareCard}
        onOpenChange={setShowShareCard}
      />

      <AlertDialog
        open={Boolean(pendingDeleteAction)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteAction?.kind === 'photo'
                ? 'Remove this photo from the wish?'
                : pendingDeleteAction?.kind === 'audio'
                  ? 'Remove this voice note from the wish?'
                  : 'Remove this wish from the story?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteAction?.kind === 'photo'
                ? 'This permanently removes the selected photo from this wish.'
                : pendingDeleteAction?.kind === 'audio'
                  ? 'This permanently removes the voice note from this wish.'
                  : 'This permanently removes the letter, photos, and audio attached to this wish from the birthday playback.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            <Trash2 className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              {pendingDeleteAction?.kind === 'photo'
                ? `The selected photo from ${pendingDeleteAction.senderName}'s wish will be deleted. This can't be undone.`
                : pendingDeleteAction?.kind === 'audio'
                  ? `${pendingDeleteAction.senderName}'s voice note will be deleted. This can't be undone.`
                  : `${pendingDeleteAction?.senderName ?? 'This'} wish will disappear from this birthday story. This can't be undone.`}
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDeleteAction) {
                  return;
                }

                if (pendingDeleteAction.kind === 'message') {
                  void handleDeleteMessage(pendingDeleteAction.messageId);
                } else if (pendingDeleteAction.kind === 'photo') {
                  void handleDeletePhoto(pendingDeleteAction.photoId, pendingDeleteAction.messageId);
                } else {
                  void handleDeleteAudio(pendingDeleteAction.messageId);
                }

                setPendingDeleteAction(null);
              }}
            >
              {pendingDeleteAction?.kind === 'photo'
                ? 'Remove photo'
                : pendingDeleteAction?.kind === 'audio'
                  ? 'Remove voice note'
                  : 'Remove wish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {startYoutube && ytId && (
        <iframe
          ref={youtubeIframeRef}
          className="hidden"
          src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1&autoplay=1&controls=0&mute=0`}
          allow="autoplay"
        />
      )}
    </div>
    </BirthdayPageViewProvider>
  );
};

export default BirthdayPage;
