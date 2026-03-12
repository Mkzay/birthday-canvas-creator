import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Mail,
  Music4,
  Share2,
  SkipForward,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BirthdayCountdown from '@/components/BirthdayCountdown';
import BirthdayShareCard from '@/components/BirthdayShareCard';
import { apiFetch } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { playPresetSoundtrack, soundtrackMap, type SoundtrackController } from '@/lib/soundtracks';
import { cn } from '@/lib/utils';

interface BirthdayPageData {
  id: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  theme_emoji?: string | null;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
  theme_font?: string | null;
  creator_message: string | null;
  cover_photo_url: string | null;
  soundtrack_id?: string | null;
  custom_audio_url?: string | null;
  allow_photos?: boolean;
  require_names?: boolean;
  is_revealed?: boolean;
  message_count?: number;
}

interface MessagePhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order?: number;
}

interface Message {
  id: string;
  sender_name: string;
  message: string;
  photo_url?: string | null;
  audio_url?: string | null;
  photos?: MessagePhoto[];
  created_at: string;
}

type ExpandedPhoto = {
  url: string;
  caption: string | null;
  senderName: string;
} | null;

type RevealPhase = 'idle' | 'opening' | 'burst';

type RevealSlide =
  | { id: string; kind: 'cover' }
  | { id: string; kind: 'stats' }
  | { id: string; kind: 'organizer' }
  | { id: string; kind: 'wish'; message: Message; index: number }
  | { id: string; kind: 'closing' };

function getSlideDuration(slide: RevealSlide | undefined) {
  if (!slide) return 4800;

  switch (slide.kind) {
    case 'cover':
      return 5200;
    case 'stats':
      return 4400;
    case 'organizer':
      return 5600;
    case 'wish': {
      const photoCount = getMessagePhotos(slide.message).length;
      const hasAudio = Boolean(slide.message.audio_url);
      if (hasAudio) return 7600;
      if (photoCount >= 3) return 6200;
      if (photoCount >= 1) return 5600;
      return 5000;
    }
    case 'closing':
      return 6400;
    default:
      return 4800;
  }
}

const themeConfig = {
  elegant: {
    emoji: '✨',
    colors: ['#fbbf24', '#f97316', '#fef3c7'],
    font: 'font-serif',
    heroClass: 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-100',
    titleClass: 'font-serif text-amber-900',
    cardClass: 'bg-white/78 border-amber-200/70',
    text: 'text-amber-950',
  },
  playful: {
    emoji: '🎈',
    colors: ['#ec4899', '#a855f7', '#f9a8d4'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100',
    titleClass: 'text-pink-800',
    cardClass: 'bg-white/78 border-pink-200/70',
    text: 'text-pink-950',
  },
  minimalist: {
    emoji: '🎯',
    colors: ['#94a3b8', '#64748b', '#e2e8f0'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-slate-50 to-gray-100',
    titleClass: 'text-slate-900',
    cardClass: 'bg-white/82 border-slate-200/80',
    text: 'text-slate-950',
  },
  retro: {
    emoji: '🌈',
    colors: ['#06b6d4', '#a855f7', '#f0abfc'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-cyan-100 via-purple-100 to-pink-100',
    titleClass: 'text-purple-900',
    cardClass: 'bg-white/76 border-cyan-200/80',
    text: 'text-purple-950',
  },
  tropical: {
    emoji: '🌴',
    colors: ['#22c55e', '#eab308', '#10b981'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-green-100 via-yellow-50 to-emerald-100',
    titleClass: 'text-emerald-900',
    cardClass: 'bg-white/78 border-green-200/80',
    text: 'text-emerald-950',
  },
  cosmic: {
    emoji: '🚀',
    colors: ['#8b5cf6', '#3b82f6', '#a78bfa'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-violet-950 via-indigo-950 to-purple-950',
    titleClass: 'text-violet-100',
    cardClass: 'bg-white/10 border-white/14',
    text: 'text-white',
  },
  sunset: {
    emoji: '🌅',
    colors: ['#f97316', '#ef4444', '#fbbf24'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-orange-200 via-rose-200 to-amber-200',
    titleClass: 'text-rose-900',
    cardClass: 'bg-white/78 border-orange-200/80',
    text: 'text-rose-950',
  },
  ocean: {
    emoji: '🌊',
    colors: ['#0ea5e9', '#06b6d4', '#38bdf8'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-sky-200 via-cyan-100 to-blue-200',
    titleClass: 'text-sky-900',
    cardClass: 'bg-white/78 border-sky-200/80',
    text: 'text-sky-950',
  },
  candyland: {
    emoji: '🍭',
    colors: ['#f472b6', '#c084fc', '#a3e635'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-pink-200 via-purple-100 to-lime-100',
    titleClass: 'text-fuchsia-900',
    cardClass: 'bg-white/78 border-pink-200/80',
    text: 'text-fuchsia-950',
  },
  midnight: {
    emoji: '🌙',
    colors: ['#6366f1', '#4f46e5', '#818cf8'],
    font: 'font-serif',
    heroClass: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950',
    titleClass: 'text-indigo-100 font-serif',
    cardClass: 'bg-white/8 border-white/12',
    text: 'text-white',
  },
} as const;

const DecorativeLayer = ({ colors }: { colors: readonly string[] }) => {
  const [bubbles] = useState(() =>
    Array.from({ length: 12 }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 80 + Math.random() * 160,
      color: colors[index % colors.length],
    })),
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${bubble.left}%`,
            top: `${bubble.top}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            backgroundColor: bubble.color,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
};

interface BirthdayPageProps {
  isPreview?: boolean;
  showRevealIntroInPreview?: boolean;
}

function getMessagePhotos(message: Message) {
  if (message.photos?.length) {
    return message.photos;
  }

  if (message.photo_url) {
    return [
      {
        id: `legacy-${message.id}`,
        photo_url: message.photo_url,
        caption: null,
        sort_order: 0,
      },
    ];
  }

  return [];
}

const BirthdayPage = ({ isPreview = false, showRevealIntroInPreview = false }: BirthdayPageProps) => {
  const { pageId } = useParams();
  const [page, setPage] = useState<BirthdayPageData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<ExpandedPhoto>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRevealIntro, setShowRevealIntro] = useState(false);
  const [hasTriggeredIntro, setHasTriggeredIntro] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [currentSlide, setCurrentSlide] = useState(0);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const ignoreTouchNavigationRef = useRef(false);

  const stopSoundtrack = useCallback(() => {
    presetControllerRef.current?.stop();
    presetControllerRef.current = null;

    if (soundtrackAudioRef.current) {
      soundtrackAudioRef.current.pause();
      soundtrackAudioRef.current.currentTime = 0;
    }
  }, []);

  const startSoundtrack = useCallback(
    async (withLoop = true) => {
      if (!page) return;

      presetControllerRef.current?.stop();
      presetControllerRef.current = null;

      if (page.custom_audio_url) {
        if (!soundtrackAudioRef.current || soundtrackAudioRef.current.src !== `${window.location.origin}${page.custom_audio_url}`) {
          soundtrackAudioRef.current = new Audio(page.custom_audio_url);
        }

        soundtrackAudioRef.current.loop = withLoop;
        soundtrackAudioRef.current.volume = 0.45;

        try {
          await soundtrackAudioRef.current.play();
        } catch (error) {
          console.error('Audio autoplay blocked', error);
        }
        return;
      }

      if (page.soundtrack_id && soundtrackMap[page.soundtrack_id]) {
        presetControllerRef.current = playPresetSoundtrack(page.soundtrack_id, { loop: withLoop, volume: 0.12 });
      }
    },
    [page],
  );

  const fetchData = useCallback(async () => {
    if (!pageId) return;

    setLoading(true);

    try {
      if (isPreview) {
        const [pageData, messagesData] = await Promise.all([
          apiFetch<BirthdayPageData>(`/pages/${pageId}`),
          apiFetch<Message[]>(`/pages/${pageId}/messages`),
        ]);

        setPage({
          ...pageData,
          is_revealed: true,
          message_count: messagesData.length,
        });
        setMessages(messagesData);
        return;
      }

      const publicPage = await apiFetch<BirthdayPageData>(`/public/pages/${pageId}`);
      setPage(publicPage);

      if (publicPage.is_revealed) {
        const messagesData = await apiFetch<Message[]>(`/public/pages/${pageId}/messages`);
        setMessages(messagesData);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error(error);
      setPage(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [isPreview, pageId]);

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
      void startSoundtrack(true);
    }
  }, [shouldShowRevealExperience, showRevealIntro, startSoundtrack]);

  useEffect(() => {
    return () => {
      stopSoundtrack();
    };
  }, [stopSoundtrack]);

  const totalPhotos = useMemo(() => {
    return messages.reduce((total, message) => total + getMessagePhotos(message).length, 0);
  }, [messages]);

  const totalAudioWishes = useMemo(() => {
    return messages.filter((message) => Boolean(message.audio_url)).length;
  }, [messages]);

  const burstMessages = useMemo(() => messages.slice(0, 4), [messages]);

  const beginReveal = async () => {
    setHasTriggeredIntro(true);
    setRevealPhase('opening');
    await startSoundtrack(true);

    window.setTimeout(() => setRevealPhase('burst'), 520);
    window.setTimeout(() => {
      setShowRevealIntro(false);
      setRevealPhase('idle');
    }, 1380);
  };

  const skipReveal = async () => {
    setHasTriggeredIntro(true);
    setShowRevealIntro(false);
    setRevealPhase('idle');
    await startSoundtrack(true);
  };

  const isCustomTheme = page?.theme?.startsWith('custom_') ?? false;
  const fallbackTheme = themeConfig[(page?.theme as keyof typeof themeConfig) || 'elegant'] || themeConfig.elegant;
  const theme = isCustomTheme
    ? {
        emoji: page?.theme_emoji || '🎨',
        colors: [
          page?.theme_gradient_from || '#8b5cf6',
          page?.theme_gradient_to || '#ec4899',
          page?.theme_gradient_from || '#8b5cf6',
        ],
        font: page?.theme_font === 'serif' ? 'font-serif' : 'font-sans',
        heroClass: '',
        titleClass: 'text-white',
        cardClass: 'bg-white/10 border-white/16',
        text: 'text-white',
        style: {
          background: `linear-gradient(135deg, ${page?.theme_gradient_from || '#8b5cf6'}, ${page?.theme_gradient_to || '#ec4899'})`,
        },
      }
    : {
        ...fallbackTheme,
        style: undefined,
      };

  const birthdayDate = parseLocalDate(page?.birthday_date);
  const isBeforeBirthday = !isPreview && page?.is_revealed === false;
  const isDarkExperience = isCustomTheme || page?.theme === 'cosmic' || page?.theme === 'midnight';
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
    setCurrentSlide((previousSlide) => Math.min(previousSlide + 1, Math.max(revealSlides.length - 1, 0)));
  }, [revealSlides.length]);

  const goToPreviousSlide = useCallback(() => {
    setCurrentSlide((previousSlide) => Math.max(previousSlide - 1, 0));
  }, []);

  const handleStageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
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

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target;
    ignoreTouchNavigationRef.current = target instanceof Element && Boolean(target.closest(interactiveSelector));
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }, [interactiveSelector]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
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

  useEffect(() => {
    if (loading || !page || showRevealIntro || expandedPhoto || showShareCard) return;
    if (!activeSlide || currentSlide >= revealSlides.length - 1) return;

    const timeoutId = window.setTimeout(() => {
      setCurrentSlide((previousSlide) => Math.min(previousSlide + 1, Math.max(revealSlides.length - 1, 0)));
    }, currentSlideDuration);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeSlide,
    currentSlide,
    currentSlideDuration,
    expandedPhoto,
    loading,
    page,
    revealSlides.length,
    showRevealIntro,
    showShareCard,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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

  if (isBeforeBirthday) {
    return (
      <div className={`relative min-h-screen overflow-hidden ${theme.heroClass}`} style={theme.style}>
        <DecorativeLayer colors={theme.colors} />
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

  return (
    <div className={`relative h-[100dvh] min-h-[100dvh] overflow-hidden transition-colors duration-500 ${theme.heroClass}`} style={theme.style}>
      <DecorativeLayer colors={theme.colors} />

      {expandedPhoto && (
        <button
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setExpandedPhoto(null)}
          type="button"
          aria-label="Close expanded photo"
        >
          <div className="max-w-5xl">
            <img
              src={expandedPhoto.url}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_50%_28%,rgba(255,235,214,0.30),transparent_18%),radial-gradient(circle_at_18%_16%,rgba(255,170,150,0.14),transparent_20%),linear-gradient(180deg,rgba(86,37,45,0.70),rgba(48,24,39,0.84))] px-4 backdrop-blur-md">
          <div className="relative flex w-full max-w-5xl items-center justify-center">
            <button
              type="button"
              onClick={() => void skipReveal()}
              className="absolute right-0 top-0 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/18"
            >
              <SkipForward className="h-4 w-4" />
              Skip intro
            </button>

            <div className="relative flex min-h-[100dvh] w-full items-center justify-center py-20">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,241,221,0.34),transparent_58%)] blur-2xl" />
                <div className="absolute left-1/2 top-[43%] h-[30rem] w-[20rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,193,147,0.16),transparent_68%)] blur-3xl" />
              </div>

              <div className="relative flex w-full max-w-xl flex-col items-center justify-center">
                <div className="mb-6 text-center text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/68">Birthday post</p>
                  <p className="mt-3 text-lg font-medium tracking-tight text-white/92">A letter for {page.recipient_name}</p>
                </div>

                <div className="relative flex h-[26rem] w-full items-center justify-center sm:h-[30rem]">
                  {burstMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        'absolute left-1/2 top-1/2 w-48 rounded-[1.4rem] border border-white/14 bg-white/12 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-700 ease-out sm:w-56',
                        revealPhase === 'burst'
                          ? [
                              '-translate-x-[150%] -translate-y-[165%] rotate-[-14deg]',
                              'translate-x-[38%] -translate-y-[148%] rotate-[12deg]',
                              '-translate-x-[145%] translate-y-[74%] rotate-[8deg]',
                              'translate-x-[42%] translate-y-[88%] rotate-[-8deg]',
                            ][index]
                          : 'opacity-0 scale-75 -translate-x-1/2 -translate-y-1/2',
                      )}
                      style={{ transitionDelay: `${index * 85}ms` }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">Wish {index + 1}</p>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/88">&quot;{message.message}&quot;</p>
                      <p className="mt-3 text-xs font-semibold text-white/72">{message.sender_name}</p>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => void beginReveal()}
                    aria-label="Open birthday letter"
                    className={cn(
                      'group relative z-10 h-[18rem] w-[20.5rem] transition-all duration-700 ease-out sm:h-[20.5rem] sm:w-[24rem]',
                      revealPhase === 'opening' && 'scale-[0.98] rotate-[1.5deg]',
                      revealPhase === 'burst' && 'scale-[0.94] opacity-80',
                    )}
                  >
                    <div className="absolute inset-0 rounded-[2.4rem] bg-[linear-gradient(145deg,#fff8ef,#ffe4cf)] shadow-[0_26px_90px_rgba(33,18,24,0.18)]" />
                    <div className="absolute inset-[1px] rounded-[2.35rem] border border-white/60" />
                    <div className="absolute inset-[1.2rem] rounded-[1.9rem] border border-[#f6dec9]/80 opacity-60" />
                    <div
                      className={cn(
                        'absolute left-1/2 top-0 h-[52%] w-[92%] -translate-x-1/2 origin-top rounded-[2rem] bg-[linear-gradient(145deg,#ffd1ad,#ffe6d1)] shadow-[0_16px_36px_rgba(227,144,104,0.2)] transition-all duration-500',
                        revealPhase !== 'idle' ? '-translate-y-4 rotate-[-12deg]' : 'group-hover:-translate-y-1',
                      )}
                      style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                    />
                    <div className="absolute bottom-[11%] left-1/2 h-[55%] w-[90%] -translate-x-1/2 rounded-[1.8rem] border border-amber-100/70 bg-[linear-gradient(180deg,#fffaf4,#ffead7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
                    <div
                      className={cn(
                        'absolute left-1/2 top-[24%] h-[40%] w-[74%] -translate-x-1/2 rounded-[1.4rem] border border-[#f4c7aa]/80 bg-[linear-gradient(180deg,rgba(255,250,245,0.98),rgba(255,238,221,0.95))] px-5 py-4 text-left shadow-[0_14px_28px_rgba(206,120,92,0.14)] transition-all duration-500 sm:w-[72%]',
                        revealPhase === 'opening' ? '-translate-y-6' : '',
                        revealPhase === 'burst' ? '-translate-y-10 opacity-0' : '',
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a46f56]">To</p>
                      <p className="mt-2 text-[1.45rem] font-bold leading-none text-[#6b3e39] sm:text-[1.7rem]">{page.recipient_name}</p>
                      <p className="mt-2.5 max-w-[9rem] text-[11px] leading-[1.45] text-[#8d6a63] sm:max-w-[10rem]">
                        Open when ready for the birthday story.
                      </p>
                    </div>
                    <div className="absolute bottom-[15%] left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-[5px] border-[#f7dbc7] bg-[radial-gradient(circle_at_30%_30%,#ffc59b,#ef8c71)] shadow-[0_12px_24px_rgba(220,107,79,0.28)] transition-transform duration-300 group-hover:scale-105">
                      <div className="flex h-full w-full items-center justify-center text-white/90">
                        <Mail className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 -bottom-14 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/84 sm:text-xs">
                        Tap to break the seal
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2 text-white/62">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
                        <span className="text-[11px] uppercase tracking-[0.22em]">{messages.length} letters waiting inside</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="relative h-[100dvh] overflow-hidden px-3 py-3 sm:px-5 sm:py-5">
        <div className="mx-auto flex h-full max-w-6xl flex-col">
          <div className="flex items-start gap-4">
            <div className="flex flex-1 gap-2">
              {revealSlides.map((slide, index) => (
                <div key={slide.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/12">
                  <div
                    key={index === currentSlide ? `${slide.id}-active` : slide.id}
                    className={cn(
                      'h-full rounded-full',
                      index < currentSlide && 'w-full gradient-cta',
                      index === currentSlide && 'animate-wrapped-progress gradient-cta',
                      index > currentSlide && 'w-0',
                    )}
                    style={index === currentSlide ? { animationDuration: `${currentSlideDuration}ms` } : undefined}
                  />
                </div>
              ))}
            </div>

            <div className="hidden items-center gap-2 sm:flex" data-no-nav="true">
              <button
                type="button"
                onClick={() => setShowShareCard(true)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                type="button"
                onClick={() => void startSoundtrack(true)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Music4 className="h-4 w-4" />
                Play
              </button>
              <button
                type="button"
                onClick={stopSoundtrack}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Volume2 className="h-4 w-4" />
                Stop
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                Birthday playback
              </p>
              <h1 className={cn('mt-2 max-w-[16rem] text-[2.1rem] font-bold leading-[0.94] sm:max-w-none sm:text-3xl', theme.titleClass, theme.font)}>
                {page.recipient_name}&apos;s birthday story
              </h1>
            </div>
            <div className={cn('self-start rounded-full px-3 py-1.5 text-xs font-medium sm:self-auto sm:px-4 sm:py-2 sm:text-sm', isDarkExperience ? 'bg-white/10 text-white' : 'bg-white/72 text-foreground')}>
              Slide {currentSlide + 1} of {revealSlides.length}
            </div>
          </div>

          <div
            className="relative mt-3 flex-1 overflow-hidden sm:mt-4"
            onClick={handleStageClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeSlide && (
              <div key={activeSlide.id} className="h-full animate-wrapped-slide">
                <div className={cn('relative h-full overflow-hidden rounded-[2rem] border p-3 shadow-[0_30px_90px_rgba(18,18,23,0.14)] sm:rounded-[2.4rem] sm:p-6 lg:p-8', experiencePanelClass)}>
                  <div className="pointer-events-none absolute inset-0">
                    <div className={cn('absolute -left-[10%] top-[10%] h-40 w-40 rounded-full blur-3xl sm:h-56 sm:w-56', isDarkExperience ? 'bg-white/8' : 'bg-white/55')} />
                    <div className={cn('absolute bottom-[-8%] right-[-4%] h-48 w-48 rounded-full blur-3xl sm:h-72 sm:w-72', isDarkExperience ? 'bg-primary/20' : 'bg-amber-200/55')} />
                    <div className={cn('absolute inset-0 opacity-70', isDarkExperience ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.04),transparent_45%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_34%),linear-gradient(145deg,rgba(255,246,236,0.76),transparent_45%)]')} />
                  </div>

                  <div className="relative z-10 h-full">
                    {activeSlide.kind === 'cover' && (
                      <div className="grid h-full gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                        <div className="order-2 flex flex-col gap-4 lg:order-1 lg:justify-center">
                          <article className={cn('relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2.1rem] sm:p-7 lg:p-8', keepsakePaperClass)}>
                            <div className={cn('absolute right-5 top-5 h-16 w-16 rounded-full blur-2xl', isDarkExperience ? 'bg-white/10' : 'bg-amber-100/85')} />
                            <p className={cn('relative text-xs font-semibold uppercase tracking-[0.28em] opacity-70', theme.text)}>
                              First page out of the envelope
                            </p>
                            <h2 className={cn('relative mt-3 text-[2.4rem] font-bold leading-[0.95] sm:mt-4 sm:text-5xl lg:text-6xl', theme.titleClass, theme.font)}>
                              Happy Birthday,
                              <br />
                              {page.recipient_name}.
                            </h2>
                            <p className={cn('relative mt-4 max-w-xl text-[0.98rem] leading-relaxed opacity-80 sm:mt-5 sm:text-[1.08rem] lg:text-[1.14rem]', theme.text)}>
                              Every note, photo, and voice clip inside was chosen to make this feel less like a page and more like a gift being opened.
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                              <div className={cn('rounded-[1.35rem] border p-3 sm:rounded-[1.45rem] sm:p-4', keepsakeSoftClass)}>
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Wishes gathered</p>
                                <p className={cn('mt-2 text-xl font-semibold sm:text-2xl', theme.text)}>{messages.length}</p>
                              </div>
                              <div className={cn('rounded-[1.35rem] border p-3 sm:rounded-[1.45rem] sm:p-4', keepsakeSoftClass)}>
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Reveal date</p>
                                <p className={cn('mt-2 text-base font-semibold sm:text-lg', theme.text)}>{format(birthdayDate, 'MMMM d, yyyy')}</p>
                              </div>
                            </div>
                          </article>

                          {page.creator_message && (
                            <article className={cn('relative ml-2 max-w-xl rotate-[-1deg] rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)}>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Packed with a note from the organizer</p>
                              <p className={cn('mt-3 line-clamp-3 text-sm leading-relaxed opacity-80 sm:text-base', theme.text)}>
                                &quot;{page.creator_message}&quot;
                              </p>
                            </article>
                          )}
                        </div>

                        <div className="order-1 lg:order-2">
                          <div className={cn('relative rounded-[1.95rem] border p-3 sm:rounded-[2.2rem] sm:p-4 lg:p-5', keepsakePhotoBoardClass)}>
                            <span className={cn('absolute left-6 top-4 h-6 w-16 rounded-full opacity-80 sm:left-8 sm:top-5 sm:h-7 sm:w-20', isDarkExperience ? 'bg-white/12' : 'bg-amber-100/80')} />
                            <span className={cn('absolute right-6 top-4 h-6 w-16 rounded-full opacity-80 sm:right-8 sm:top-5 sm:h-7 sm:w-20', isDarkExperience ? 'bg-white/12' : 'bg-amber-100/80')} />
                            <div className="relative overflow-hidden rounded-[1.55rem] sm:rounded-[1.85rem]">
                              <div className="relative isolate h-[28dvh] min-h-[13rem] overflow-hidden rounded-[1.45rem] bg-[#dfe7dc] shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:h-[40dvh] sm:min-h-[20rem] sm:rounded-[1.7rem] lg:h-[48dvh]">
                                {page.cover_photo_url ? (
                                  <img
                                    src={page.cover_photo_url}
                                    alt={`${page.recipient_name}'s birthday cover`}
                                    className="absolute inset-0 z-0 h-full w-full scale-[1.04] object-cover object-[center_28%] sm:scale-[1.06] sm:object-center"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[6rem] sm:text-[8rem]">
                                    {theme.emoji}
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 z-10 h-[42%] bg-gradient-to-t from-black/42 via-black/12 to-transparent" />
                                <div className="absolute left-4 top-4 z-20 rounded-full bg-black/24 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/76 backdrop-blur-md">
                                  Birthday keepsake
                                </div>
                              </div>
                            </div>

                            <div className={cn('absolute -bottom-3 right-4 max-w-[12rem] rotate-[1.6deg] rounded-[1.2rem] border px-4 py-3 sm:right-8 sm:max-w-[14rem]', keepsakePaperClass)}>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Ready to open</p>
                              <p className={cn('mt-1 text-sm font-semibold leading-snug sm:text-base', theme.text)}>
                                {messages.length} wishes, {totalPhotos} photo memories, and {totalAudioWishes} voice notes.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSlide.kind === 'stats' && (
                      <div className="grid h-full gap-4 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
                        <div className="flex flex-col gap-4 lg:justify-center">
                          <article className={cn('relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2rem] sm:p-7 lg:p-8', keepsakePaperClass)}>
                            <p className={cn('text-xs font-semibold uppercase tracking-[0.28em] opacity-70', theme.text)}>
                              The shape of the celebration
                            </p>
                            <h2 className={cn('mt-3 text-[2.2rem] font-bold leading-[0.97] sm:mt-4 sm:text-5xl lg:text-[3.65rem]', theme.titleClass, theme.font)}>
                              Collected with love.
                            </h2>
                            <p className={cn('mt-4 max-w-xl text-[0.98rem] leading-relaxed opacity-80 sm:text-[1.08rem]', theme.text)}>
                              Before the story started, people left little pieces of themselves here. This is what made it into the envelope.
                            </p>
                          </article>

                          <article className={cn('relative max-w-xl rounded-[1.55rem] border p-4 sm:rounded-[1.8rem] sm:p-5', keepsakeSoftClass)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>What tonight feels like</p>
                            <p className={cn('mt-3 text-base leading-relaxed sm:text-lg', theme.text)}>
                              Not a comment feed. A replayable set of moments gathered into one birthday delivery.
                            </p>
                          </article>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 sm:grid-rows-2">
                          <article className={cn('sm:row-span-2 rounded-[1.75rem] border p-5 sm:rounded-[2rem] sm:p-7', keepsakePaperClass)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Wishes written</p>
                            <p className={cn('mt-4 text-6xl font-bold leading-none sm:mt-6 sm:text-[5.5rem]', theme.titleClass, theme.font)}>{messages.length}</p>
                            <p className={cn('mt-4 max-w-[16rem] text-sm leading-relaxed opacity-80 sm:mt-6 sm:text-base', theme.text)}>
                              Each one written with this exact moment in mind.
                            </p>
                          </article>

                          <article className={cn('rotate-[-1.2deg] rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Photos added</p>
                            <p className={cn('mt-3 text-3xl font-semibold sm:text-4xl', theme.text)}>{totalPhotos}</p>
                            <p className={cn('mt-2 text-sm leading-relaxed opacity-80', theme.text)}>Snapshots that make the story feel grounded and real.</p>
                          </article>

                          <article className={cn('rotate-[1.2deg] rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Voice notes</p>
                            <p className={cn('mt-3 text-3xl font-semibold sm:text-4xl', theme.text)}>{totalAudioWishes}</p>
                            <p className={cn('mt-2 text-sm leading-relaxed opacity-80', theme.text)}>Voices that make the reveal feel present, not distant.</p>
                          </article>
                        </div>
                      </div>
                    )}

                  {activeSlide.kind === 'organizer' && page.creator_message && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className={cn('flex h-20 w-20 items-center justify-center rounded-[2rem] border', experienceInsetClass)}>
                        <Heart className={cn('h-10 w-10', theme.text)} />
                      </div>
                      <p className={cn('mt-8 text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>
                        A note from the organizer
                      </p>
                      <p className={cn('mt-6 max-w-4xl text-3xl italic leading-[1.3] sm:text-5xl', theme.text)}>
                        &quot;{page.creator_message}&quot;
                      </p>
                      <p className={cn('mt-6 text-sm opacity-70', theme.text)}>Written before the reveal began.</p>
                    </div>
                  )}

                    {activeSlide.kind === 'wish' && (() => {
                      const wishPhotos = getMessagePhotos(activeSlide.message).slice(0, 4);
                      const photoCount = wishPhotos.length;
                      const openPhoto = (photo: MessagePhoto) => {
                        setExpandedPhoto({
                          url: photo.photo_url,
                          caption: photo.caption,
                          senderName: activeSlide.message.sender_name,
                        });
                      };
                      const photoFrameClass =
                        'group relative min-h-0 overflow-hidden rounded-[1.4rem] border border-white/45 bg-white/55 p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)] transition-transform duration-500 hover:-translate-y-1 sm:rounded-[1.65rem] sm:p-2.5';

                      const renderPhotoCard = (photo: MessagePhoto, className?: string, imageClassName?: string) => (
                        <button
                          key={photo.id}
                          type="button"
                          className={cn(photoFrameClass, className)}
                          onClick={() => openPhoto(photo)}
                          aria-label={`Expand photo from ${activeSlide.message.sender_name}`}
                        >
                          <div className="relative isolate h-full min-h-[8.8rem] overflow-hidden rounded-[1.2rem] bg-[#dfe7dc] sm:rounded-[1.35rem]">
                            <img
                              src={photo.photo_url}
                              alt={`Photo from ${activeSlide.message.sender_name}`}
                              className={cn('relative z-0 block h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]', imageClassName)}
                            />
                            <div className="absolute inset-x-0 bottom-0 z-10 h-[46%] bg-gradient-to-t from-black/56 via-black/10 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-medium text-white">{photo.caption || 'Photo memory'}</p>
                                {!photo.caption && <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/70">From the story</p>}
                              </div>
                              <span className="shrink-0 rounded-full bg-white/16 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">Open</span>
                            </div>
                          </div>
                        </button>
                      );

                      let photoLayout: React.ReactNode = null;

                      if (photoCount === 1) {
                        photoLayout = (
                          <div className="pt-7 sm:pt-8 lg:h-full">
                            {renderPhotoCard(wishPhotos[0], 'h-[30dvh] min-h-[15rem] w-full rotate-[-1deg] sm:h-[34dvh] lg:h-full')}
                          </div>
                        );
                      } else if (photoCount === 2) {
                        photoLayout = (
                          <div className="grid min-h-[18rem] gap-3 pt-7 sm:gap-4 sm:pt-8 lg:h-full lg:min-h-0 lg:grid-rows-2">
                            {wishPhotos.map((photo, photoIndex) => renderPhotoCard(photo, photoIndex === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]'))}
                          </div>
                        );
                      } else if (photoCount >= 3) {
                        photoLayout = (
                          <div className="grid min-h-[18rem] grid-cols-2 gap-3 pt-7 sm:gap-4 sm:pt-8 lg:h-full lg:min-h-0">
                            {wishPhotos.map((photo, photoIndex) =>
                              renderPhotoCard(
                                photo,
                                photoIndex === 0
                                  ? 'col-span-2 rotate-[-1deg] lg:col-span-1 lg:row-span-2'
                                  : photoIndex % 2 === 0
                                    ? 'rotate-[1deg]'
                                    : 'rotate-[-1deg]',
                                photoIndex === 0 ? 'aspect-[16/10] lg:aspect-auto' : 'aspect-[4/5]',
                              ),
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="grid h-full gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                          <div className="flex flex-col gap-4 lg:justify-center">
                            <article className={cn('relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2rem] sm:p-6 lg:p-7', keepsakePaperClass)}>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                                    Letter {activeSlide.index + 1} of {messages.length}
                                  </p>
                                  <h2 className={cn('mt-3 text-3xl font-bold leading-[0.98] sm:text-5xl', theme.titleClass, theme.font)}>
                                    {activeSlide.message.sender_name}
                                  </h2>
                                </div>
                                <div className={cn('hidden rounded-[1.25rem] border px-4 py-3 sm:block', keepsakeSoftClass)}>
                                  <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wish no.</p>
                                  <p className={cn('mt-1 text-xl font-semibold', theme.text)}>{String(activeSlide.index + 1).padStart(2, '0')}</p>
                                </div>
                              </div>

                              <p className={cn('mt-4 text-lg leading-relaxed sm:mt-5 sm:text-[1.7rem] sm:leading-[1.45]', theme.text)}>
                                &quot;{activeSlide.message.message}&quot;
                              </p>

                              <div className="mt-6 flex flex-wrap gap-2.5">
                                {photoCount > 0 && (
                                  <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold sm:px-4 sm:text-xs', keepsakePillClass)}>
                                    {photoCount} {photoCount === 1 ? 'photo memory' : 'photo memories'}
                                  </span>
                                )}
                                {activeSlide.message.audio_url && (
                                  <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold sm:px-4 sm:text-xs', keepsakePillClass)}>
                                    Voice note inside
                                  </span>
                                )}
                              </div>
                            </article>

                            {activeSlide.message.audio_url && (
                              <article className={cn('rounded-[1.5rem] border p-4 sm:rounded-[1.75rem] sm:p-5', keepsakeSoftClass)} data-no-nav="true">
                                <div className="flex items-center gap-2">
                                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', isDarkExperience ? 'bg-white/10' : 'bg-white/80')}>
                                    <Music4 className={cn('h-4 w-4', theme.text)} />
                                  </div>
                                  <div>
                                    <p className={cn('text-sm font-semibold', theme.text)}>Voice note</p>
                                    <p className={cn('text-xs opacity-65', theme.text)}>A voice to go with the words.</p>
                                  </div>
                                </div>
                                <audio controls className="mt-3 w-full" src={activeSlide.message.audio_url} preload="none">
                                  Your browser does not support audio playback.
                                </audio>
                              </article>
                            )}

                            {photoCount === 0 && (
                              <article className={cn('flex items-center gap-3 rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)}>
                                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', isDarkExperience ? 'bg-white/10' : 'bg-white/78')}>
                                  <Sparkles className={cn('h-5 w-5', theme.text)} />
                                </div>
                                <p className={cn('text-sm leading-relaxed opacity-82 sm:text-base', theme.text)}>
                                  This one lands through words{activeSlide.message.audio_url ? ' and voice' : ''} alone.
                                </p>
                              </article>
                            )}
                          </div>

                          {photoCount > 0 && (
                            <section className={cn('relative overflow-hidden rounded-[1.95rem] border p-3 sm:rounded-[2.15rem] sm:p-4 lg:h-full lg:p-5', keepsakePhotoBoardClass)}>
                              <div className="absolute inset-x-5 top-3 flex items-center justify-between sm:inset-x-6 sm:top-4">
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Photo keepsakes</p>
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55', theme.text)}>Tap to open</p>
                              </div>
                              {photoLayout}
                            </section>
                          )}
                        </div>
                      );
                    })()}

                  {activeSlide.kind === 'closing' && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className={cn('flex h-24 w-24 items-center justify-center rounded-[2rem] border text-5xl', experienceInsetClass)}>
                        {theme.emoji}
                      </div>
                      <p className={cn('mt-8 text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>
                        One more thing
                      </p>
                      <h2 className={cn('mt-4 text-4xl font-bold sm:text-6xl', theme.titleClass, theme.font)}>
                        You are deeply loved,
                        <br />
                        {page.recipient_name}.
                      </h2>
                      <p className={cn('mt-5 max-w-2xl text-base leading-relaxed opacity-80 sm:text-xl', theme.text)}>
                        Every photo, every message, and every voice note here was written to make this day feel bigger.
                      </p>

                      <div className="mt-8 flex flex-wrap justify-center gap-3" data-no-nav="true">
                        <Button variant="hero" size="lg" className="gap-2" onClick={() => setShowShareCard(true)}>
                          <Share2 className="h-4 w-4" />
                          Share this moment
                        </Button>
                        <Button variant="outline" size="lg" className="gap-2" onClick={() => setCurrentSlide(0)}>
                          <ChevronLeft className="h-4 w-4" />
                          Replay from the start
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between sm:mt-4">
            <div className="hidden items-center gap-2 sm:flex" data-no-nav="true">
              <Button variant="outline" className="gap-2" onClick={goToPreviousSlide} disabled={currentSlide === 0}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="hero" className="gap-2" onClick={goToNextSlide} disabled={currentSlide === revealSlides.length - 1}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className={cn('text-[9px] uppercase tracking-[0.14em] opacity-60 sm:text-xs sm:tracking-[0.22em]', theme.text)}>
              <span className="sm:hidden">Swipe or tap edges</span>
              <span className="hidden sm:inline">Tap sides or swipe to move through the story</span>
            </p>
            <Link to="/create" className={cn('hidden text-sm font-medium opacity-70 transition-opacity hover:opacity-100 sm:block', theme.text)}>
              Create your own
            </Link>
          </div>
        </div>
      </section>

      <BirthdayShareCard
        recipientName={page.recipient_name}
        messageCount={messages.length}
        themeEmoji={theme.emoji}
        themeColors={theme.colors}
        open={showShareCard}
        onOpenChange={setShowShareCard}
      />
    </div>
  );
};

export default BirthdayPage;
