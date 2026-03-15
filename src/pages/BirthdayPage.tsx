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
  Trash2,
  Music,
  Image as ImageIcon,
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
import { apiFetch, resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { toast } from 'sonner';
import { playPresetSoundtrack, soundtrackMap, type SoundtrackController } from '@/lib/soundtracks';
import { cn } from '@/lib/utils';
import AnimatedBackground from '@/components/AnimatedBackground';

interface BirthdayPageData {
  id: string;
  public_code?: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  theme_emoji?: string | null;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
  theme_font?: string | null;
  letter_color?: string | null;
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
      return 5800;
    case 'stats':
      return 5000;
    case 'organizer':
      return 6200;
    case 'wish': {
      const photoCount = getMessagePhotos(slide.message).length;
      const hasAudio = Boolean(slide.message.audio_url);
      if (hasAudio && photoCount >= 1) return 8600;
      if (hasAudio) return 8000;
      if (photoCount >= 3) return 7000;
      if (photoCount >= 1) return 6200;
      return 5400;
    }
    case 'closing':
      return 7200;
    default:
      return 4800;
  }
}

function getStoryMotionDuration(slide: RevealSlide | undefined) {
  if (!slide) return 720;

  switch (slide.kind) {
    case 'cover':
      return 820;
    case 'stats':
      return 700;
    case 'organizer':
      return 760;
    case 'wish':
      return slide.message.audio_url ? 860 : 780;
    case 'closing':
      return 840;
    default:
      return 720;
  }
}

function getMobileSectionLabel(slide: RevealSlide) {
  switch (slide.kind) {
    case 'cover':
      return 'Opening page';
    case 'stats':
      return 'Collected pieces';
    case 'organizer':
      return 'Organizer note';
    case 'wish':
      return `Letter ${slide.index + 1}`;
    case 'closing':
      return 'Final note';
    default:
      return 'Keepsake';
  }
}

function getMobileSectionCaption(slide: RevealSlide) {
  switch (slide.kind) {
    case 'cover':
      return 'The first keepsake out of the envelope';
    case 'stats':
      return 'What made it into the birthday bundle';
    case 'organizer':
      return 'A note waiting between the pages';
    case 'wish':
      return 'One more piece of the story';
    case 'closing':
      return 'The last page of the reveal';
    default:
      return 'Another page in the story';
  }
}

function getMobileSectionMarker(slide: RevealSlide) {
  switch (slide.kind) {
    case 'cover':
      return '✦';
    case 'stats':
      return '◌';
    case 'organizer':
      return '♥';
    case 'wish':
      return '✉';
    case 'closing':
      return '✺';
    default:
      return '•';
  }
}

function getMobileSectionTone(slide: RevealSlide, isDarkExperience: boolean) {
  if (isDarkExperience) {
    switch (slide.kind) {
      case 'cover':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(255,214,153,0.55),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'stats':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(196,181,253,0.55),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'organizer':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(251,113,133,0.5),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'wish':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(147,197,253,0.5),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'closing':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(253,224,71,0.55),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      default:
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
    }
  }

  switch (slide.kind) {
    case 'cover':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.4),transparent)]',
        badgeClass: 'border-amber-200/80 bg-amber-50/90 text-amber-900',
      };
    case 'stats':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.32),transparent)]',
        badgeClass: 'border-sky-200/80 bg-sky-50/92 text-sky-900',
      };
    case 'organizer':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(251,113,133,0.32),transparent)]',
        badgeClass: 'border-rose-200/80 bg-rose-50/92 text-rose-900',
      };
    case 'wish':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(192,132,252,0.32),transparent)]',
        badgeClass: 'border-fuchsia-200/80 bg-fuchsia-50/92 text-fuchsia-900',
      };
    case 'closing':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(34,197,94,0.28),transparent)]',
        badgeClass: 'border-emerald-200/80 bg-emerald-50/92 text-emerald-900',
      };
    default:
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(15,23,42,0.14),transparent)]',
        badgeClass: 'border-white/70 bg-white/84 text-foreground',
      };
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
  const navigate = useNavigate();
  const [page, setPage] = useState<BirthdayPageData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<ExpandedPhoto>(null);
   const [messagePendingDelete, setMessagePendingDelete] = useState<Message | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRevealIntro, setShowRevealIntro] = useState(false);
  const [hasTriggeredIntro, setHasTriggeredIntro] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeWishAudioId, setActiveWishAudioId] = useState<string | null>(null);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const shouldResumeSoundtrackRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const ignoreTouchNavigationRef = useRef(false);
  const mobileRevealRef = useRef<HTMLDivElement | null>(null);
  const [isDesktopReveal, setIsDesktopReveal] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 640));

  const stopSoundtrack = useCallback(() => {
    shouldResumeSoundtrackRef.current = false;
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

      const resolvedCustomAudioUrl = resolveAssetUrl(page.custom_audio_url);

      if (resolvedCustomAudioUrl) {
        if (!soundtrackAudioRef.current || soundtrackAudioRef.current.src !== resolvedCustomAudioUrl) {
          soundtrackAudioRef.current = new Audio(resolvedCustomAudioUrl);
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

  const pauseSoundtrackForWishAudio = useCallback(() => {
    let hadPlayingSoundtrack = false;

    if (presetControllerRef.current) {
      presetControllerRef.current.stop();
      presetControllerRef.current = null;
      hadPlayingSoundtrack = true;
    }

    if (soundtrackAudioRef.current && !soundtrackAudioRef.current.paused) {
      soundtrackAudioRef.current.pause();
      hadPlayingSoundtrack = true;
    }

    shouldResumeSoundtrackRef.current = hadPlayingSoundtrack;
  }, []);

  const resumeSoundtrackAfterWishAudio = useCallback(async () => {
    if (!shouldResumeSoundtrackRef.current || showRevealIntro) {
      return;
    }

    shouldResumeSoundtrackRef.current = false;
    await startSoundtrack(true);
  }, [showRevealIntro, startSoundtrack]);

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
      
      // If we are using a UUID but the page has a public code, redirect to use the public code in the URL
      if (pageId && /^[0-9a-f-]{36}$/i.test(pageId) && publicPage.public_code) {
        navigate(`/birthday/${publicPage.public_code}`, { replace: true });
      }

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
  }, [isPreview, navigate, pageId]);

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
    if (typeof window === 'undefined' || isDesktopReveal || !mobileRevealRef.current) return;

    const revealNodes = Array.from(mobileRevealRef.current.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));
    if (!revealNodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    revealNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [isDesktopReveal, messages.length, page?.creator_message, showRevealIntro]);

  const totalPhotos = useMemo(() => {
    return messages.reduce((total, message) => total + getMessagePhotos(message).length, 0);
  }, [messages]);

  const totalAudioWishes = useMemo(() => {
    return messages.filter((message) => Boolean(message.audio_url)).length;
  }, [messages]);

  const burstMessages = useMemo(() => messages.slice(0, 4), [messages]);
  const resolvedCoverPhotoUrl = resolveAssetUrl(page?.cover_photo_url);
  const coverPhotoSrc = resolvedCoverPhotoUrl;

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

  const handleDeleteMessage = async (messageId: string) => {
    if (!isPreview || !pageId || !window.confirm('Are you sure you want to delete this message? This cannot be undone.')) {
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
    if (!isPreview || !pageId || !window.confirm('Are you sure you want to delete this photo?')) {
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
    if (!isPreview || !pageId || !window.confirm('Are you sure you want to delete this voice note?')) {
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
  const getStoryDelayStyle = (delay: number, duration?: number) =>
    ({
      '--story-delay': `${delay}ms`,
      ...(duration ? { '--story-duration': `${duration}ms` } : {}),
    }) as React.CSSProperties;
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
  const handleBoardParallaxMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 18;

    event.currentTarget.style.setProperty('--parallax-x', `${offsetX}px`);
    event.currentTarget.style.setProperty('--parallax-y', `${offsetY}px`);
  }, []);
  const handleBoardParallaxLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--parallax-x', '0px');
    event.currentTarget.style.setProperty('--parallax-y', '0px');
  }, []);

  const handleWishAudioPlay = useCallback((messageId: string) => {
    setActiveWishAudioId(messageId);
    pauseSoundtrackForWishAudio();
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

    return (
      <audio
        controls
        className={className}
        src={src}
        preload="none"
        onPlay={() => handleWishAudioPlay(message.id)}
        onPause={() => handleWishAudioStop(message.id)}
        onEnded={() => handleWishAudioStop(message.id)}
      >
        Your browser does not support audio playback.
      </audio>
    );
  }, [handleWishAudioPlay, handleWishAudioStop]);

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
    if (!isDesktopReveal || loading || !page || showRevealIntro || expandedPhoto || showShareCard || activeWishAudioId) return;
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
    activeWishAudioId,
    isDesktopReveal,
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

  return (
    <div
      className={cn(
        'relative transition-colors duration-500',
        isDesktopReveal ? 'h-[100dvh] min-h-[100dvh] overflow-hidden' : 'min-h-[100dvh] overflow-x-hidden overflow-y-auto',
        theme.heroClass,
      )}
      style={theme.style}
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

      <section className="relative min-h-[100dvh] overflow-y-auto px-3 py-4 sm:hidden">
        <div ref={mobileRevealRef} className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
          <div className="story-scroll-reveal flex items-start justify-between gap-3" data-scroll-reveal="true" style={getStoryDelayStyle(0)}>
            <div>
              <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                Birthday playback
              </p>
              <h1 className={cn('mt-2 max-w-[14rem] text-[2.05rem] font-bold leading-[0.94]', theme.titleClass, theme.font)}>
                {page.recipient_name}&apos;s birthday story
              </h1>
            </div>
            <div className={cn('rounded-full px-3 py-1.5 text-xs font-medium', isDarkExperience ? 'bg-white/10 text-white' : 'bg-white/72 text-foreground')}>
              Scroll through
            </div>
          </div>

          <div
            className="story-scroll-reveal flex flex-wrap gap-2"
            data-no-nav="true"
            data-scroll-reveal="true"
            style={getStoryDelayStyle(80)}
          >
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

          {revealSlides.map((slide, index) => (
            <React.Fragment key={slide.id}>
              {index > 0 && (
                <div
                  className="story-scroll-reveal relative flex items-center gap-3 px-2 py-1"
                  data-scroll-reveal="true"
                  style={getStoryDelayStyle(Math.min(90 + index * 60, 300), 620)}
                >
                  <div className={cn('h-px flex-1', getMobileSectionTone(slide, isDarkExperience).lineClass)} />
                  <div className="shrink-0 text-center">
                    <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]', getMobileSectionTone(slide, isDarkExperience).badgeClass)}>
                      <span className="text-sm leading-none">{getMobileSectionMarker(slide)}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">{getMobileSectionLabel(slide)}</span>
                    </div>
                    <p className={cn('mt-1.5 text-[11px] opacity-55', theme.text)}>{getMobileSectionCaption(slide)}</p>
                  </div>
                  <div className={cn('h-px flex-1', getMobileSectionTone(slide, isDarkExperience).lineClass)} />
                </div>
              )}

            <article
              className={cn('story-scroll-reveal relative overflow-hidden rounded-[2rem] border p-4 shadow-[0_24px_80px_rgba(18,18,23,0.12)]', experiencePanelClass)}
              data-scroll-reveal="true"
              style={getStoryDelayStyle(Math.min(120 + index * 70, 420), getStoryMotionDuration(slide))}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className={cn('absolute -left-[8%] top-[8%] h-28 w-28 rounded-full blur-3xl', isDarkExperience ? 'bg-white/8' : 'bg-white/55')} />
                <div className={cn('absolute bottom-[-8%] right-[-6%] h-32 w-32 rounded-full blur-3xl', isDarkExperience ? 'bg-primary/20' : 'bg-amber-200/55')} />
              </div>

              <div className="relative z-10">
                {slide.kind === 'cover' && (
                  <div className="space-y-4">
                    <article className={cn('story-stage-reveal relative overflow-hidden rounded-[1.7rem] border p-5', keepsakePaperClass)} style={getStoryDelayStyle(30, getStoryMotionDuration(slide))}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>First page out of the envelope</p>
                      <h2 className={cn('mt-3 text-[2.55rem] font-bold leading-[0.94]', theme.titleClass, theme.font)}>
                        Happy Birthday,
                        <br />
                        {page.recipient_name}.
                      </h2>
                      <p className={cn('mt-4 text-base leading-relaxed opacity-80', theme.text)}>
                        Every note, photo, and voice clip inside was chosen to make this feel less like a page and more like a gift being opened.
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className={cn('rounded-[1.2rem] border p-3', keepsakeSoftClass)}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes</p>
                          <p className={cn('mt-2 text-xl font-semibold', theme.text)}>{messages.length}</p>
                        </div>
                        <div className={cn('rounded-[1.2rem] border p-3', keepsakeSoftClass)}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Reveal date</p>
                          <p className={cn('mt-2 text-base font-semibold', theme.text)}>{format(birthdayDate, 'MMMM d, yyyy')}</p>
                        </div>
                      </div>
                    </article>

                    <div
                      className={cn('story-stage-reveal-soft story-photo-board relative overflow-hidden rounded-[1.8rem] border p-3', keepsakePhotoBoardClass)}
                      style={getStoryDelayStyle(120, getStoryMotionDuration(slide))}
                      onMouseMove={handleBoardParallaxMove}
                      onMouseLeave={handleBoardParallaxLeave}
                    >
                      <div className="relative isolate aspect-[4/5] min-h-[20rem] w-full overflow-hidden rounded-[1.45rem] bg-[#dfe7dc] sm:min-h-[24rem]">
                        {coverPhotoSrc ? (
                          <img
                            src={resolveAssetUrl(coverPhotoSrc) || coverPhotoSrc}
                            alt={`${page.recipient_name}'s birthday cover`}
                            className="absolute inset-0 h-full w-full object-cover"
                            decoding="async"
                            loading="eager"
                            draggable={false}
                            style={{ objectPosition: 'center 28%' }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[5rem]">{theme.emoji}</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/42 via-black/12 to-transparent" />
                        <div className="absolute left-4 top-4 rounded-full bg-black/24 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/76 backdrop-blur-md">
                          Birthday keepsake
                        </div>
                      </div>
                    </div>

                    {page.creator_message && (
                      <article className={cn('story-stage-reveal-soft rounded-[1.4rem] border p-4', keepsakeSoftClass)} style={getStoryDelayStyle(180, 700)}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Packed with a note from the organizer</p>
                        <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme.text)}>&quot;{page.creator_message}&quot;</p>
                      </article>
                    )}
                  </div>
                )}

                {slide.kind === 'stats' && (
                  <div className="space-y-4">
                    <article className={cn('story-stage-reveal rounded-[1.7rem] border p-5', keepsakePaperClass)} style={getStoryDelayStyle(30, getStoryMotionDuration(slide))}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>The shape of the celebration</p>
                      <h2 className={cn('mt-3 text-[2.1rem] font-bold leading-[0.98]', theme.titleClass, theme.font)}>Collected with love.</h2>
                      <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme.text)}>
                        Before the story started, people left little pieces of themselves here. This is what made it into the envelope.
                      </p>
                    </article>
                    <div className="grid grid-cols-2 gap-3">
                      <article className={cn('story-stage-reveal-soft col-span-2 rounded-[1.45rem] border p-4', keepsakePaperClass)} style={getStoryDelayStyle(110)}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes written</p>
                        <p className={cn('mt-3 text-5xl font-bold leading-none', theme.titleClass, theme.font)}>{messages.length}</p>
                      </article>
                      <article className={cn('story-stage-reveal-soft rounded-[1.35rem] border p-4', keepsakeSoftClass)} style={getStoryDelayStyle(170)}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Photos added</p>
                        <p className={cn('mt-3 text-3xl font-semibold', theme.text)}>{totalPhotos}</p>
                      </article>
                      <article className={cn('story-stage-reveal-soft rounded-[1.35rem] border p-4', keepsakeSoftClass)} style={getStoryDelayStyle(220)}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Voice notes</p>
                        <p className={cn('mt-3 text-3xl font-semibold', theme.text)}>{totalAudioWishes}</p>
                      </article>
                    </div>
                  </div>
                )}

                {slide.kind === 'organizer' && page.creator_message && (
                  <div className="space-y-4 text-center">
                    <div className={cn('story-stage-reveal mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] border', experienceInsetClass)} style={getStoryDelayStyle(40)}>
                      <Heart className={cn('h-8 w-8', theme.text)} />
                    </div>
                    <article className={cn('story-stage-reveal-soft rounded-[1.7rem] border p-5', keepsakePaperClass)} style={getStoryDelayStyle(130)}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>A note from the organizer</p>
                      <p className={cn('mt-4 text-xl italic leading-[1.45]', theme.text)}>&quot;{page.creator_message}&quot;</p>
                    </article>
                  </div>
                )}

                {slide.kind === 'wish' && (() => {
                  const wishPhotos = getMessagePhotos(slide.message);
                  const photoCount = wishPhotos.length;

                  return (
                    <div className="space-y-4">
                      <article className={cn('story-stage-reveal rounded-[1.7rem] border p-5', keepsakePaperClass)} style={getStoryDelayStyle(40, getStoryMotionDuration(slide))}>
                        <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                          Letter {slide.index + 1} of {messages.length}
                        </p>
                        <h2 className={cn('mt-3 text-3xl font-bold leading-[0.98]', theme.titleClass, theme.font)}>{slide.message.sender_name}</h2>
                        <p className={cn('mt-4 text-lg leading-relaxed', theme.text)}>&quot;{slide.message.message}&quot;</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {photoCount > 0 && (
                            <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', keepsakePillClass)}>
                              {photoCount} {photoCount === 1 ? 'photo memory' : 'photo memories'}
                            </span>
                          )}
                          {slide.message.audio_url && (
                            <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', keepsakePillClass)}>
                              Voice note inside
                            </span>
                          )}
                        </div>
                      </article>

                      {slide.message.audio_url && (
                        <article className={cn('story-stage-reveal-soft rounded-[1.45rem] border p-4', keepsakeSoftClass)} style={getStoryDelayStyle(130, 760)}>
                          <p className={cn('text-sm font-semibold', theme.text)}>Voice note</p>
                          {renderWishAudioPlayer(slide.message, 'mt-3 w-full')}
                        </article>
                      )}

                      {photoCount > 0 && (
                        <section
                          className={cn('story-stage-reveal-soft story-photo-board rounded-[1.7rem] border p-3', keepsakePhotoBoardClass)}
                          style={getStoryDelayStyle(slide.message.audio_url ? 190 : 130, getStoryMotionDuration(slide))}
                          onMouseMove={handleBoardParallaxMove}
                          onMouseLeave={handleBoardParallaxLeave}
                        >
                          <div className="space-y-3">
                            {wishPhotos.map((photo) => (
                              <button
                                key={photo.id}
                                type="button"
                                className="group block w-full rounded-[1.35rem] border border-white/45 bg-white/55 p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)]"
                                onClick={() =>
                                  setExpandedPhoto({
                                    url: resolveAssetUrl(photo.photo_url) || photo.photo_url,
                                    caption: photo.caption,
                                    senderName: slide.message.sender_name,
                                  })
                                }
                              >
                                <div className="relative isolate aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[#dfe7dc]">
                                  {renderStoryImage(resolveAssetUrl(photo.photo_url) || photo.photo_url, `Photo from ${slide.message.sender_name}`)}
                                  <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/56 via-black/10 to-transparent" />
                                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 text-sm font-medium text-white">{photo.caption || 'Photo memory'}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-white/16 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">Open</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {photoCount === 0 && (
                        <article className={cn('story-stage-reveal-soft rounded-[1.45rem] border p-4', keepsakeSoftClass)} style={getStoryDelayStyle(slide.message.audio_url ? 190 : 130)}>
                          <p className={cn('text-sm leading-relaxed opacity-82', theme.text)}>
                            This one lands through words{slide.message.audio_url ? ' and voice' : ''} alone.
                          </p>
                        </article>
                      )}
                    </div>
                  );
                })()}

                {slide.kind === 'closing' && (
                  <div className="space-y-4 text-center">
                    <div className={cn('story-stage-reveal mx-auto flex h-18 w-18 items-center justify-center rounded-[1.5rem] border text-4xl', experienceInsetClass)} style={getStoryDelayStyle(40, getStoryMotionDuration(slide))}>
                      {theme.emoji}
                    </div>
                    <article className={cn('story-stage-reveal-soft rounded-[1.7rem] border p-5', keepsakePaperClass)} style={getStoryDelayStyle(130, getStoryMotionDuration(slide))}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>Final page</p>
                      <h2 className={cn('mt-3 text-[2.1rem] font-bold leading-[1]', theme.titleClass, theme.font)}>
                        Keep this close,
                        <br />
                        {page.recipient_name}.
                      </h2>
                      <p className={cn('mt-4 text-base leading-relaxed opacity-80', theme.text)}>
                        This is the part worth replaying: every photo, every message, and every voice note gathered into one last birthday page.
                      </p>
                      <div className="mt-5 grid grid-cols-3 gap-2 text-left">
                        <div className={cn('rounded-[1.1rem] border p-3', keepsakeSoftClass)}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes</p>
                          <p className={cn('mt-2 text-lg font-semibold', theme.text)}>{messages.length}</p>
                        </div>
                        <div className={cn('rounded-[1.1rem] border p-3', keepsakeSoftClass)}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Photos</p>
                          <p className={cn('mt-2 text-lg font-semibold', theme.text)}>{totalPhotos}</p>
                        </div>
                        <div className={cn('rounded-[1.1rem] border p-3', keepsakeSoftClass)}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Voices</p>
                          <p className={cn('mt-2 text-lg font-semibold', theme.text)}>{totalAudioWishes}</p>
                        </div>
                      </div>
                    </article>
                    <article className={cn('story-stage-reveal-soft rounded-[1.45rem] border p-4 text-left', keepsakeSoftClass)} style={getStoryDelayStyle(220, 760)}>
                      <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>From everyone who wrote tonight</p>
                      <p className={cn('mt-3 text-lg leading-relaxed', theme.text)}>
                        Happy birthday, {page.recipient_name}. You were worth gathering all of this for.
                      </p>
                    </article>
                  </div>
                )}
              </div>
            </article>
            </React.Fragment>
          ))}

          <Link to="/create" className={cn('mx-auto pt-2 text-sm font-medium opacity-70 transition-opacity hover:opacity-100', theme.text)}>
            Create your own
          </Link>
        </div>
      </section>

      <section className="relative hidden h-[100dvh] overflow-hidden px-3 py-3 sm:px-5 sm:py-5 sm:block">
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
                      <div className="grid h-full gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:grid-rows-[1fr] lg:items-stretch">
                        <div className="order-2 flex flex-col gap-4 lg:order-1 lg:h-full lg:justify-center">
                          <article className={cn('story-stage-reveal relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2.1rem] sm:p-7 lg:p-8', keepsakePaperClass)} style={getStoryDelayStyle(50, getStoryMotionDuration(activeSlide))}>
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
                              <div className={cn('story-stage-reveal-soft rounded-[1.35rem] border p-3 sm:rounded-[1.45rem] sm:p-4', keepsakeSoftClass)} style={getStoryDelayStyle(160)}>
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Wishes gathered</p>
                                <p className={cn('mt-2 text-xl font-semibold sm:text-2xl', theme.text)}>{messages.length}</p>
                              </div>
                              <div className={cn('story-stage-reveal-soft rounded-[1.35rem] border p-3 sm:rounded-[1.45rem] sm:p-4', keepsakeSoftClass)} style={getStoryDelayStyle(220)}>
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Reveal date</p>
                                <p className={cn('mt-2 text-base font-semibold sm:text-lg', theme.text)}>{format(birthdayDate, 'MMMM d, yyyy')}</p>
                              </div>
                            </div>
                          </article>

                          {page.creator_message && (
                            <article className={cn('story-stage-reveal-soft relative ml-2 max-w-xl rotate-[-1deg] rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(280)}>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Packed with a note from the organizer</p>
                              <p className={cn('mt-3 line-clamp-3 text-sm leading-relaxed opacity-80 sm:text-base', theme.text)}>
                                &quot;{page.creator_message}&quot;
                              </p>
                            </article>
                          )}
                        </div>

                        <div className="order-1 lg:order-2 lg:h-full lg:min-h-0">
                          <div
                            className={cn('story-stage-reveal story-photo-board relative rounded-[1.95rem] border p-3 sm:rounded-[2.2rem] sm:p-4 lg:p-5 h-full lg:flex lg:flex-col', keepsakePhotoBoardClass)}
                            style={getStoryDelayStyle(130, getStoryMotionDuration(activeSlide))}
                            onMouseMove={handleBoardParallaxMove}
                            onMouseLeave={handleBoardParallaxLeave}
                          >
                            <span className={cn('absolute left-6 top-4 h-6 w-16 rounded-full opacity-80 sm:left-8 sm:top-5 sm:h-7 sm:w-20', isDarkExperience ? 'bg-white/12' : 'bg-amber-100/80')} />
                            <span className={cn('absolute right-6 top-4 h-6 w-16 rounded-full opacity-80 sm:right-8 sm:top-5 sm:h-7 sm:w-20', isDarkExperience ? 'bg-white/12' : 'bg-amber-100/80')} />
                            <div className="relative isolate aspect-[4/5] min-h-[20rem] w-full overflow-hidden rounded-[1.45rem] bg-[#dfe7dc] shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:min-h-[24rem] sm:rounded-[1.7rem] lg:aspect-auto lg:min-h-0 lg:flex-1">
                              {coverPhotoSrc ? (
                                <img
                                  src={resolveAssetUrl(coverPhotoSrc) || coverPhotoSrc}
                                  alt={`${page.recipient_name}'s birthday cover`}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  decoding="async"
                                  loading="eager"
                                  draggable={false}
                                  style={{ objectPosition: 'center 28%' }}
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

                            <div
                              className={cn('story-stage-reveal-soft story-photo-float absolute -bottom-3 right-4 max-w-[12rem] rounded-[1.2rem] border px-4 py-3 sm:right-8 sm:max-w-[14rem]', keepsakePaperClass)}
                              style={{ ...getStoryDelayStyle(260, 720), '--float-rotate': '1.6deg' } as React.CSSProperties}
                            >
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
                          <article className={cn('story-stage-reveal relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2rem] sm:p-7 lg:p-8', keepsakePaperClass)} style={getStoryDelayStyle(50, getStoryMotionDuration(activeSlide))}>
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

                          <article className={cn('story-stage-reveal-soft relative max-w-xl rounded-[1.55rem] border p-4 sm:rounded-[1.8rem] sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(150)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>What tonight feels like</p>
                            <p className={cn('mt-3 text-base leading-relaxed sm:text-lg', theme.text)}>
                              Not a comment feed. A replayable set of moments gathered into one birthday delivery.
                            </p>
                          </article>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 sm:grid-rows-2">
                          <article className={cn('story-stage-reveal sm:row-span-2 rounded-[1.75rem] border p-5 sm:rounded-[2rem] sm:p-7', keepsakePaperClass)} style={getStoryDelayStyle(110)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Wishes written</p>
                            <p className={cn('mt-4 text-6xl font-bold leading-none sm:mt-6 sm:text-[5.5rem]', theme.titleClass, theme.font)}>{messages.length}</p>
                            <p className={cn('mt-4 max-w-[16rem] text-sm leading-relaxed opacity-80 sm:mt-6 sm:text-base', theme.text)}>
                              Each one written with this exact moment in mind.
                            </p>
                          </article>

                          <article className={cn('story-stage-reveal-soft rotate-[-1.2deg] rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(210)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Photos added</p>
                            <p className={cn('mt-3 text-3xl font-semibold sm:text-4xl', theme.text)}>{totalPhotos}</p>
                            <p className={cn('mt-2 text-sm leading-relaxed opacity-80', theme.text)}>Snapshots that make the story feel grounded and real.</p>
                          </article>

                          <article className={cn('story-stage-reveal-soft rotate-[1.2deg] rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(260)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Voice notes</p>
                            <p className={cn('mt-3 text-3xl font-semibold sm:text-4xl', theme.text)}>{totalAudioWishes}</p>
                            <p className={cn('mt-2 text-sm leading-relaxed opacity-80', theme.text)}>Voices that make the reveal feel present, not distant.</p>
                          </article>
                        </div>
                      </div>
                    )}

                  {activeSlide.kind === 'organizer' && page.creator_message && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className={cn('story-stage-reveal flex h-20 w-20 items-center justify-center rounded-[2rem] border', experienceInsetClass)} style={getStoryDelayStyle(60)}>
                        <Heart className={cn('h-10 w-10', theme.text)} />
                      </div>
                      <p className={cn('story-stage-reveal-soft mt-8 text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)} style={getStoryDelayStyle(120)}>
                        A note from the organizer
                      </p>
                      <p className={cn('story-stage-reveal mt-6 max-w-4xl text-3xl italic leading-[1.3] sm:text-5xl', theme.text)} style={getStoryDelayStyle(180)}>
                        &quot;{page.creator_message}&quot;
                      </p>
                      <p className={cn('story-stage-reveal-soft mt-6 text-sm opacity-70', theme.text)} style={getStoryDelayStyle(250)}>Written before the reveal began.</p>
                    </div>
                  )}

                    {activeSlide.kind === 'wish' && (() => {
                      const wishPhotos = getMessagePhotos(activeSlide.message);
                      const photoCount = wishPhotos.length;
      const openPhoto = (photo: MessagePhoto) => {
        setExpandedPhoto({
          url: resolveAssetUrl(photo.photo_url) || photo.photo_url,
          caption: photo.caption,
          senderName: activeSlide.message.sender_name,
        });
      };
                      const photoFrameClass =
                        'group relative min-h-0 overflow-hidden rounded-[1.4rem] border border-white/45 bg-white/55 p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)] transition-transform duration-500 hover:-translate-y-1 sm:rounded-[1.65rem] sm:p-2.5';

                      const renderPhotoCard = (photo: MessagePhoto, className?: string, containerAspect?: string) => (
                        <button
                          key={photo.id}
                          type="button"
                          className={cn(photoFrameClass, className, containerAspect)}
                          onClick={() => openPhoto(photo)}
                          aria-label={`Expand photo from ${activeSlide.message.sender_name}`}
                        >
                          <div className="relative isolate h-full min-h-[8.8rem] overflow-hidden rounded-[1.2rem] bg-[#dfe7dc] sm:rounded-[1.35rem]">
                            <img
                              className="story-photo-layer absolute inset-0 z-0 h-full w-full object-cover"
                              src={resolveAssetUrl(photo.photo_url) || photo.photo_url}
                              alt={`Photo from ${activeSlide.message.sender_name}`}
                              decoding="async"
                              loading="lazy"
                              draggable={false}
                            />
                            <div className="absolute inset-x-0 bottom-0 z-10 h-[46%] bg-gradient-to-t from-black/56 via-black/10 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-medium text-white">{photo.caption || 'Photo memory'}</p>
                                {!photo.caption && <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/70">From the story</p>}
                              </div>
                              <span className="shrink-0 rounded-full bg-white/16 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">Open</span>
                            </div>
                            {isPreview && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute right-3 top-3 z-30 h-8 w-8 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeletePhoto(photo.id, activeSlide.message.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
                      } else if (photoCount === 3) {
                        photoLayout = (
                          <div className="grid grid-cols-2 grid-rows-2 gap-3 pt-7 sm:gap-4 sm:pt-8 aspect-[5/4] lg:aspect-auto lg:h-full lg:min-h-0">
                            {wishPhotos.map((photo, photoIndex) =>
                              renderPhotoCard(
                                photo,
                                photoIndex === 0
                                  ? 'col-span-2 h-full min-h-0 rotate-[-1deg] lg:col-span-1 lg:row-span-2'
                                  : photoIndex === 1
                                    ? 'h-full min-h-0 rotate-[1deg]'
                                    : 'h-full min-h-0 rotate-[-1deg]',
                              ),
                            )}
                          </div>
                        );
                      } else if (photoCount >= 4) {
                        photoLayout = (
                          <div className={cn(
                            "grid min-h-[18rem] gap-3 pt-7 sm:gap-4 sm:pt-8 lg:h-full lg:min-h-0 overflow-y-auto pr-2 pb-2 custom-scrollbar",
                            photoCount >= 5 ? "grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-2"
                          )}>
                            {wishPhotos.map((photo, photoIndex) =>
                              renderPhotoCard(
                                photo,
                                photoIndex === 0 && photoCount < 5
                                  ? 'col-span-2 rotate-[-1deg] lg:col-span-1 lg:row-span-2'
                                  : photoIndex % 2 === 0
                                    ? 'rotate-[1deg]'
                                    : 'rotate-[-1deg]',
                                photoIndex === 0 && photoCount < 5 ? 'aspect-[16/10] lg:aspect-auto lg:h-full' : 'aspect-[4/5]',
                              )
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="grid h-full gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                          <div className="flex flex-col gap-4 lg:justify-center">
                            <article className={cn('story-stage-reveal relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2rem] sm:p-6 lg:p-7', keepsakePaperClass)} style={getStoryDelayStyle(60, getStoryMotionDuration(activeSlide))}>
                              {isPreview && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-4 top-4 gap-1 text-destructive/90 hover:bg-destructive/5 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMessagePendingDelete(activeSlide.message);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="hidden sm:inline">Remove wish</span>
                                </Button>
                              )}
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
                              <article className={cn('story-stage-reveal-soft rounded-[1.5rem] border p-4 sm:rounded-[1.75rem] sm:p-5', keepsakeSoftClass)} data-no-nav="true" style={getStoryDelayStyle(170, 760)}>
                                <div className="flex items-center gap-2">
                                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', isDarkExperience ? 'bg-white/10' : 'bg-white/80')}>
                                    <Music4 className={cn('h-4 w-4', theme.text)} />
                                  </div>
                                  <div>
                                    <p className={cn('text-sm font-semibold', theme.text)}>Voice note</p>
                                    <p className={cn('text-xs opacity-65', theme.text)}>A voice to go with the words.</p>
                                  </div>
                                </div>
                                {isPreview && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-4 top-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleDeleteAudio(activeSlide.message.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {renderWishAudioPlayer(activeSlide.message, 'mt-3 w-full')}
                              </article>
                            )}

                            {photoCount === 0 && (
                              <article className={cn('story-stage-reveal-soft flex items-center gap-3 rounded-[1.5rem] border p-4 sm:rounded-[1.7rem] sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(activeSlide.message.audio_url ? 240 : 170, 740)}>
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
                            <section
                              className={cn('story-stage-reveal story-photo-board relative overflow-hidden rounded-[1.95rem] border p-3 sm:rounded-[2.15rem] sm:p-4 lg:h-full lg:p-5', keepsakePhotoBoardClass)}
                              style={getStoryDelayStyle(activeSlide.message.audio_url ? 210 : 140, getStoryMotionDuration(activeSlide))}
                              onMouseMove={handleBoardParallaxMove}
                              onMouseLeave={handleBoardParallaxLeave}
                            >
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
                      <div className={cn('story-stage-reveal flex h-24 w-24 items-center justify-center rounded-[2rem] border text-5xl', experienceInsetClass)} style={getStoryDelayStyle(60, getStoryMotionDuration(activeSlide))}>
                        {theme.emoji}
                      </div>
                      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
                        <article className={cn('story-stage-reveal relative overflow-hidden rounded-[2rem] border p-6 text-left sm:p-8', keepsakePaperClass)} style={getStoryDelayStyle(110, getStoryMotionDuration(activeSlide))}>
                          <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>
                            Final page
                          </p>
                          <h2 className={cn('mt-4 text-4xl font-bold leading-[0.96] sm:text-[3.9rem]', theme.titleClass, theme.font)}>
                            Keep this close,
                            <br />
                            {page.recipient_name}.
                          </h2>
                          <p className={cn('mt-5 max-w-2xl text-base leading-relaxed opacity-80 sm:text-xl', theme.text)}>
                            Every photo, every message, and every voice note here was gathered to make one thing clear: you are deeply loved.
                          </p>

                          <div className="story-stage-reveal-soft mt-8 flex flex-wrap gap-3" data-no-nav="true" style={getStoryDelayStyle(260, 760)}>
                            <Button variant="hero" size="lg" className="gap-2" onClick={() => setShowShareCard(true)}>
                              <Share2 className="h-4 w-4" />
                              Share this moment
                            </Button>
                            <Button variant="outline" size="lg" className="gap-2" onClick={() => setCurrentSlide(0)}>
                              <ChevronLeft className="h-4 w-4" />
                              Replay from the start
                            </Button>
                          </div>
                        </article>

                        <div className="flex flex-col gap-4">
                          <article className={cn('story-stage-reveal-soft rounded-[1.75rem] border p-5 text-left sm:p-6', keepsakeSoftClass)} style={getStoryDelayStyle(180, 760)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>What stays with this page</p>
                            <div className="mt-4 grid grid-cols-3 gap-3">
                              <div>
                                <p className={cn('text-3xl font-semibold leading-none sm:text-4xl', theme.titleClass, theme.font)}>{messages.length}</p>
                                <p className={cn('mt-2 text-xs uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes</p>
                              </div>
                              <div>
                                <p className={cn('text-3xl font-semibold leading-none sm:text-4xl', theme.titleClass, theme.font)}>{totalPhotos}</p>
                                <p className={cn('mt-2 text-xs uppercase tracking-[0.18em] opacity-60', theme.text)}>Photos</p>
                              </div>
                              <div>
                                <p className={cn('text-3xl font-semibold leading-none sm:text-4xl', theme.titleClass, theme.font)}>{totalAudioWishes}</p>
                                <p className={cn('mt-2 text-xs uppercase tracking-[0.18em] opacity-60', theme.text)}>Voices</p>
                              </div>
                            </div>
                          </article>

                          <article className={cn('story-stage-reveal-soft rounded-[1.75rem] border p-5 text-left sm:p-6', keepsakeSoftClass)} style={getStoryDelayStyle(240, 800)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Signed by the people who showed up</p>
                            <p className={cn('mt-4 text-lg leading-relaxed sm:text-[1.15rem]', theme.text)}>
                              Happy birthday, {page.recipient_name}. This story was worth making because you were worth gathering for.
                            </p>
                          </article>
                        </div>
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

      <AlertDialog
        open={Boolean(messagePendingDelete)}
        onOpenChange={(open) => {
          if (!open) setMessagePendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this wish from the story?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the letter, photos, and audio attached to this wish from the birthday playback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            <Trash2 className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              {messagePendingDelete?.sender_name}&apos;s wish will disappear from this birthday story. This can&apos;t be undone.
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMessagePendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (messagePendingDelete) {
                  void handleDeleteMessage(messagePendingDelete.id);
                }
                setMessagePendingDelete(null);
              }}
            >
              Remove wish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BirthdayPage;
