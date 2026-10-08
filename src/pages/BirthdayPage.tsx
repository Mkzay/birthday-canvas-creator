import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import {
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { toast } from 'sonner';
import { resolveAssetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import AnimatedBackground from '@/components/AnimatedBackground';
import { hexToHsl } from '@/lib/colors';
import { useAuth } from '@/context/AuthContext';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { fontClassMap } from '@/lib/themes';
import {
  DecorativeLayer,
  getMessagePhotos,
  mixHue,
  MobileVoiceNoteControl,
  normalizeHexColor,
  themeConfig,
  useCelebrationData,
  useCelebrationRevealEngine,
  useCelebrationSoundtrack,
  useFreeformStars,
  useKeepsakeExport,
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
  BirthdayPageProps,
  ExpandedPhoto,
  Message,
  PendingDeleteAction,
} from '@/pages/birthday';

const BirthdayPage = ({
  isPreview = false,
  showRevealIntroInPreview = false,
  forceMobileView = false,
}: BirthdayPageProps) => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const location = useLocation();
  const autoExportTriggeredRef = useRef(false);

  // Shared UI states
  const [expandedPhoto, setExpandedPhoto] = useState<ExpandedPhoto>(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [activeWishAudioId, setActiveWishAudioId] = useState<string | null>(null);
  const wishAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const lastAutoPlayedWishIdRef = useRef<string | null>(null);

  // Device & layout responsiveness
  const [isDesktopReveal, setIsDesktopReveal] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 640));
  const isDesktopRevealEffective = forceMobileView ? false : isDesktopReveal;
  const isCoarsePointerDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const mobileRevealRef = useRef<HTMLDivElement | null>(null);
  const mobileCardsContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileObserverRef = useRef<IntersectionObserver | null>(null);
  const freeformBoardSectionRef = useRef<HTMLElement | null>(null);
  const freeformStarsCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Seam 1: Celebration Data, PIN Unlock, Moderation & Pool Management
  const celebrationData = useCelebrationData({
    pageId,
    isPreview,
    user,
    navigate,
  });

  const {
    page,
    messages,
    loading,
    unlockPin,
    setUnlockPin,
    unlocking,
    handleUnlock,
    requiresUnlock,
    isUnlocked,
    isBeforeBirthday,
    birthdayDate,
  } = celebrationData;

  const shouldShowRevealExperience = !isPreview || showRevealIntroInPreview;

  // Seam 2: Celebration Audio Soundtrack & Ducking
  const soundtrack = useCelebrationSoundtrack({
    page,
    isCoarsePointerDevice,
    showRevealIntro: false, // controlled reactively by revealEngine
    shouldShowRevealExperience,
    activeWishAudioId,
  });

  // Seam 3: Keepsake PDF & Video Canvas Exporter
  const keepsakeExport = useKeepsakeExport({
    page,
    pageId,
    messages,
    ytId: soundtrack.ytId,
  });

  // Automatically trigger video keepsake reel export when invoked with ?export=video or ?action=export-video
  useEffect(() => {
    if (!celebrationData.loading && celebrationData.page && messages.length > 0 && !autoExportTriggeredRef.current) {
      const search = new URLSearchParams(location.search);
      if (search.get('export') === 'video' || search.get('action') === 'export-video') {
        autoExportTriggeredRef.current = true;
        toast.info('Preparing animated story video reel...');
        const timer = setTimeout(() => {
          void keepsakeExport.handleDownloadVideoKeepsake();
        }, 900);
        return () => clearTimeout(timer);
      }
    }
  }, [celebrationData.loading, celebrationData.page, messages.length, location.search, keepsakeExport]);

  // Seam 4: Celebration Reveal Timeline & Story Progression Engine
  const revealEngine = useCelebrationRevealEngine({
    page,
    messages,
    loading,
    shouldShowRevealExperience,
    isDesktopReveal: isDesktopRevealEffective,
    expandedPhoto,
    showShareCard,
    activeWishAudioId,
    mobileFreeformMotion,
    startSoundtrack: soundtrack.startSoundtrack,
    stopSoundtrack: soundtrack.stopSoundtrack,
  });

  // Seam 5: Freeform Shooting Stars Canvas Animation
  useFreeformStars(
    freeformStarsCanvasRef,
    freeformBoardSectionRef,
    revealEngine.effectiveViewMode === 'freeform' && messages.length > 0,
  );

  // Responsive desktop detection effect
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

  // Image preloading for smooth celebration navigation
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

  // Mobile scroll reveal observer
  useEffect(() => {
    if (typeof window === 'undefined' || isDesktopRevealEffective || !mobileRevealRef.current) return;

    const revealNodes = Array.from(mobileRevealRef.current.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));
    if (!revealNodes.length) return;

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
  }, [isDesktopRevealEffective, messages.length, page?.creator_message, revealEngine.showRevealIntro]);

  // Mobile cards staggered fall-in observer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    const container = mobileCardsContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>('.mobile-card'));
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add('in-view');
          }
        });
      },
      { threshold: 0.22 },
    );

    cards.forEach((c) => observer.observe(c));
    mobileObserverRef.current = observer;

    return () => {
      observer.disconnect();
      mobileObserverRef.current = null;
    };
  }, [messages.length]);

  const totalPhotos = useMemo(() => {
    return messages.reduce((total, message) => total + getMessagePhotos(message).length, 0);
  }, [messages]);

  const totalAudioWishes = useMemo(() => {
    return messages.filter((message) => Boolean(message.audio_url)).length;
  }, [messages]);
  const hasMessages = messages.length > 0;

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
    const names = celebrationData.poolSummary.contributors;
    if (!names.length) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
    return `${names[0]}, ${names[1]}, ${names[2]}, and ${names.length - 3} more`;
  }, [celebrationData.poolSummary.contributors]);

  const burstMessages = useMemo(() => messages.slice(0, 4), [messages]);
  const coverPhotoSrc = resolveAssetUrl(page?.cover_photo_url);

  // Themes & Styling
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
    hexToHsl(customGradientFrom).l +
    hexToHsl(customGradientMid || customGradientTo).l +
    hexToHsl(customGradientTo).l
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
    ? page?.letter_theme_gradient_from || customGradientFrom
    : fallbackLetterTheme.colors[0] || theme.colors[0];
  const letterThemeGradientTo = isCustomLetterTheme
    ? page?.letter_theme_gradient_to || customGradientTo
    : fallbackLetterTheme.colors[fallbackLetterTheme.colors.length - 1] || theme.colors[theme.colors.length - 1];
  const letterThemeGradientMid = isCustomLetterTheme
    ? page?.letter_theme_gradient_mid || null
    : fallbackLetterTheme.colors.length > 2
      ? fallbackLetterTheme.colors[1]
      : null;

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

  const canShowKeepsakeDownload = false;
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

  const coverHintLabel = isCoarsePointerDevice ? 'Tap to enlarge' : 'Click to enlarge';

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

  const handleBoardParallaxLeave = useCallback((event: MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--parallax-x', '0px');
    event.currentTarget.style.setProperty('--parallax-y', '0px');
  }, []);

  const handleWishAudioPlay = useCallback(
    (messageId: string) => {
      setActiveWishAudioId(messageId);

      window.setTimeout(() => {
        const el = wishAudioRefs.current[messageId];
        if (!el) return;
        if (!el.paused && !el.ended) {
          soundtrack.pauseSoundtrackForWishAudio();
          return;
        }

        setActiveWishAudioId((currentId) => (currentId === messageId ? null : currentId));
      }, 180);
    },
    [soundtrack],
  );

  const handleWishAudioStop = useCallback(
    (messageId: string) => {
      setActiveWishAudioId((currentId) => {
        if (currentId !== messageId) {
          return currentId;
        }

        void soundtrack.resumeSoundtrackAfterWishAudio();
        return null;
      });
    },
    [soundtrack],
  );

  const renderWishAudioPlayer = useCallback(
    (message: Message, className?: string) => {
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
                soundtrack.pauseSoundtrackForWishAudio();
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
    },
    [handleWishAudioPlay, handleWishAudioStop, isCoarsePointerDevice, soundtrack],
  );

  // Desktop active wish slide audio autoplay handler
  useEffect(() => {
    if (!isDesktopReveal) {
      return;
    }

    const slide = revealEngine.activeSlide;
    if (!slide || slide.kind !== 'wish' || !slide.message?.audio_url) {
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

    if (isCoarsePointerDevice) {
      return;
    }

    const targetId = slide.message.id;
    if (lastAutoPlayedWishIdRef.current === targetId) {
      return;
    }

    const audioEl = wishAudioRefs.current[targetId];
    if (!audioEl) return;

    audioEl
      .play()
      .then(() => {
        lastAutoPlayedWishIdRef.current = targetId;
      })
      .catch((error) => {
        console.error('Wish audio autoplay blocked', error);
      });
  }, [activeWishAudioId, handleWishAudioStop, isCoarsePointerDevice, isDesktopReveal, revealEngine.activeSlide]);

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
    activeSlide: revealEngine.activeSlide,
    beginReveal: revealEngine.beginReveal,
    birthdayDate,
    burstMessages,
    canShowKeepsakeDownload,
    clampedS,
    clampedS2,
    contributorLine,
    coverHintLabel,
    coverPhotoSrc,
    currentSlide: revealEngine.currentSlide,
    currentSlideDuration: revealEngine.currentSlideDuration,
    downloadingPdf: keepsakeExport.downloadingPdf,
    downloadingVideo: keepsakeExport.downloadingVideo,
    effectiveViewMode: revealEngine.effectiveViewMode,
    expandedFreeformCardIds: revealEngine.expandedFreeformCardIds,
    experienceInsetClass,
    experiencePanelClass,
    freeformBoardSectionRef,
    freeformOpenerPalette,
    freeformStarsCanvasRef,
    freeformThemePalette,
    getStoryDelayStyle,
    goToNextSlide: revealEngine.goToNextSlide,
    goToPreviousSlide: revealEngine.goToPreviousSlide,
    handleBoardParallaxLeave,
    handleBoardParallaxMove,
    handleDownloadKeepsake: keepsakeExport.handleDownloadKeepsake,
    handleDownloadVideoKeepsake: keepsakeExport.handleDownloadVideoKeepsake,
    handlePauseControl: revealEngine.handlePauseControl,
    handlePlayControl: revealEngine.handlePlayControl,
    handleReleasePoolPayout: celebrationData.handleReleasePoolPayout,
    handleRequestGiftRelease: celebrationData.handleRequestGiftRelease,
    handleStageClick: revealEngine.handleStageClick,
    handleTouchEnd: revealEngine.handleTouchEnd,
    handleTouchStart: revealEngine.handleTouchStart,
    hasMessages,
    includeSoundtrackInVideo: keepsakeExport.includeSoundtrackInVideo,
    isDarkExperience,
    isDesktopPlaybackPaused: revealEngine.isDesktopPlaybackPaused,
    isFreeformBoardEntered: revealEngine.isFreeformBoardEntered,
    isFreeformIntroExiting: revealEngine.isFreeformIntroExiting,
    isPageOwner: celebrationData.isPageOwner,
    isPreview,
    isSaved: celebrationData.isSaved,
    keepsakePaperClass,
    keepsakePhotoBoardClass,
    keepsakePillClass,
    keepsakeSoftClass,
    landedFreeformCards: revealEngine.landedFreeformCards,
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
    poolSummary: celebrationData.poolSummary,
    poppedFreeformDecorators: revealEngine.poppedFreeformDecorators,
    releasingPoolPayout: celebrationData.releasingPoolPayout,
    renderStoryImage,
    renderWishAudioPlayer,
    requestingGiftRelease: celebrationData.requestingGiftRelease,
    revealPhase: revealEngine.revealPhase,
    revealSlides: revealEngine.revealSlides,
    setActiveWishAudioId,
    setCurrentSlide: revealEngine.setCurrentSlide,
    setDownloadingPdf: () => {},
    setDownloadingVideo: () => {},
    setExpandedFreeformCardIds: revealEngine.setExpandedFreeformCardIds,
    setExpandedPhoto,
    setFreeformAnimationRun: revealEngine.setFreeformAnimationRun,
    setHasTriggeredIntro: revealEngine.setHasTriggeredIntro,
    setIncludeSoundtrackInVideo: keepsakeExport.setIncludeSoundtrackInVideo,
    setIsDesktopPlaybackPaused: revealEngine.setIsDesktopPlaybackPaused,
    setIsDesktopReveal,
    setIsFreeformBoardEntered: revealEngine.setIsFreeformBoardEntered,
    setIsFreeformIntroExiting: revealEngine.setIsFreeformIntroExiting,
    setIsPageOwner: () => {},
    setIsSaved: () => {},
    setLandedFreeformCards: revealEngine.setLandedFreeformCards,
    setLoading: () => {},
    setMessages: celebrationData.setMessages,
    setNowMs: () => {},
    setPage: celebrationData.setPage,
    setPendingDeleteAction,
    setPoolSummary: celebrationData.setPoolSummary,
    setPoppedFreeformDecorators: revealEngine.setPoppedFreeformDecorators,
    setReleasingPoolPayout: () => {},
    setRequestingGiftRelease: () => {},
    setRevealPhase: revealEngine.setRevealPhase,
    setShowRevealIntro: revealEngine.setShowRevealIntro,
    setShowShareCard,
    setSlideDirection: revealEngine.setSlideDirection,
    setSlideRemainingMs: revealEngine.setSlideRemainingMs,
    setStartYoutube: () => {},
    setUnlockPin,
    setUnlocking: () => {},
    setViewMode: revealEngine.setViewMode,
    showRevealIntro: revealEngine.showRevealIntro,
    showRevealIntroInPreview,
    skipReveal: revealEngine.skipReveal,
    slideDirection: revealEngine.slideDirection,
    storyOpenerPalette,
    storyThemePalette,
    theme,
    toggleSavePage: celebrationData.toggleSavePage,
    totalAudioWishes,
    totalPhotos,
    user,
    viewMode: revealEngine.viewMode,
    forceMobileView,
    isDesktopReveal: isDesktopRevealEffective,
  });

  return (
    <BirthdayPageViewProvider value={birthdayViewModel}>
      <div
        className={cn(
          'relative transition-colors duration-500',
          forceMobileView
            ? revealEngine.showRevealIntro && revealEngine.effectiveViewMode !== 'freeform'
              ? 'h-full min-h-full overflow-hidden'
              : 'min-h-full overflow-x-hidden overflow-y-auto'
            : !isDesktopRevealEffective
              ? revealEngine.showRevealIntro && revealEngine.effectiveViewMode !== 'freeform'
                ? 'h-[100dvh] min-h-[100dvh] overflow-hidden'
                : 'min-h-[100dvh] overflow-x-hidden overflow-y-auto'
              : revealEngine.showRevealIntro || revealEngine.effectiveViewMode === 'story'
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

        {revealEngine.showRevealIntro && (
          <Suspense fallback={null}>
            <LazyRevealIntroOverlay />
          </Suspense>
        )}

        {revealEngine.effectiveViewMode === 'story' && (
          <>
            <Suspense fallback={null}>
              <LazyMobileStorySection />
            </Suspense>
            <Suspense fallback={null}>
              <LazyDesktopStorySection />
            </Suspense>
          </>
        )}

        {revealEngine.effectiveViewMode === 'bento' && (
          <Suspense fallback={null}>
            <LazyBentoStorySections />
          </Suspense>
        )}

        {revealEngine.effectiveViewMode === 'freeform' && (
          <Suspense fallback={null}>
            <LazyFreeformSection />
          </Suspense>
        )}

        {!revealEngine.showRevealIntro && (page.custom_audio_url || page.soundtrack_id) && (
          <div className="fixed top-3 right-3 z-50 pointer-events-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={soundtrack.toggleSoundtrackMute}
              aria-label={soundtrack.isSoundtrackMuted ? 'Unmute celebration music' : 'Mute celebration music'}
              className={cn(
                'h-8 px-2.5 gap-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-md border transition-all duration-200',
                soundtrack.isSoundtrackMuted
                  ? 'bg-black/70 text-white border-white/20 hover:bg-black/85'
                  : 'bg-white/85 text-foreground border-black/10 hover:bg-white shadow-sm',
              )}
            >
              {soundtrack.isSoundtrackMuted ? (
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
                    void celebrationData.handleDeleteMessage(pendingDeleteAction.messageId);
                  } else if (pendingDeleteAction.kind === 'photo') {
                    void celebrationData.handleDeletePhoto(pendingDeleteAction.photoId, pendingDeleteAction.messageId);
                  } else {
                    void celebrationData.handleDeleteAudio(pendingDeleteAction.messageId);
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

        {soundtrack.startYoutube && soundtrack.ytId && (
          <iframe
            ref={soundtrack.youtubeIframeRef}
            className="hidden"
            src={`https://www.youtube.com/embed/${soundtrack.ytId}?enablejsapi=1&autoplay=1&controls=0&mute=0`}
            allow="autoplay"
          />
        )}
      </div>
    </BirthdayPageViewProvider>
  );
};

export default BirthdayPage;
