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
  Download,
  SkipForward,
  Sparkles,
  Volume2,
  Trash2,
  Music,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import BentoGridView from '@/components/BentoGridView';
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
import FloatingParticles from '@/components/FloatingParticles';
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
import { visualThemeConfig, fontClassMap } from '@/lib/themes';

const themeConfig = visualThemeConfig;

const STICKER_EMOJI_MAP: Record<string, string> = {
  balloon: '🎈',
  heart: '❤️',
  cake: '🎂',
  party: '🎉',
  star: '⭐',
  gift: '🎁',
  fireworks: '🎆',
  sparkles: '✨',
  crown: '👑',
  unicorn: '🦄',
  pizza: '🍕',
  icecream: '🍦',
};

interface BirthdayPageData {
  id: string;
  public_code?: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  display_mode?: 'story' | 'freeform' | 'bento';
  theme_emoji?: string | null;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
  theme_gradient_mid?: string | null;
  theme_gradient_angle?: number | null;
  theme_accent_color?: string | null;
  theme_font?: string | null;
  letter_color?: string | null;
  creator_message: string | null;
  cover_photo_url: string | null;
  soundtrack_id?: string | null;
  custom_audio_url?: string | null;
  allow_photos?: boolean;
  require_names?: boolean;
  is_revealed?: boolean;
  requires_unlock?: boolean;
  is_unlocked?: boolean;
  owner_plan_tier?: 'free' | 'pro';
  message_count?: number;
}

interface MessagePhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order?: number;
}

interface MessageSticker {
  id: string;
  sticker_type: string;
  position_x: number;
  position_y: number;
  rotation: number;
  scale: number;
}

interface Message {
  id: string;
  sender_name: string;
  message: string;
  photo_url?: string | null;
  audio_url?: string | null;
  photos?: MessagePhoto[];
  stickers?: MessageSticker[];
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

type PageDisplayMode = 'story' | 'freeform' | 'bento';

function extractYouTubeId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : null;
}

function formatMediaTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function normalizeHexColor(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : null;
}

function mixHue(a: number, b: number) {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta / 2 + 360) % 360;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = '';
    }

    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (words.length && lines.length === maxLines) {
    const consumed = lines.join(' ').trim();
    const original = words.join(' ');
    if (consumed.length < original.length) {
      const lastLineIndex = lines.length - 1;
      lines[lastLineIndex] = `${lines[lastLineIndex].replace(/[.]{3}$/g, '').trimEnd()}...`;
    }
  }

  return lines;
}

function resolveVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;

  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || null;
}

async function loadImageForVideo(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = url;
  });
}

function schedulePresetSoundtrackForVideo(
  context: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  soundtrackId: string,
  totalDurationMs: number,
) {
  const soundtrack = soundtrackMap[soundtrackId];
  if (!soundtrack) return false;

  const masterGain = context.createGain();
  masterGain.gain.value = 0.32;
  masterGain.connect(destination);

  let cursor = context.currentTime + 0.04;
  const cutoff = context.currentTime + totalDurationMs / 1000 + 0.2;

  while (cursor < cutoff) {
    for (const note of soundtrack.notes) {
      if (cursor >= cutoff) break;

      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const gainValue = note.gain ?? 0.08;
      const duration = note.duration;

      oscillator.type = note.type || 'triangle';
      oscillator.frequency.setValueAtTime(note.frequency, cursor);

      noteGain.gain.setValueAtTime(0.0001, cursor);
      noteGain.gain.exponentialRampToValueAtTime(gainValue, cursor + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);

      oscillator.connect(noteGain);
      noteGain.connect(masterGain);
      oscillator.start(cursor);
      oscillator.stop(cursor + duration + 0.06);

      cursor += duration + 0.08;
    }
  }

  return true;
}

function MobileVoiceNoteControl({
  messageId,
  getAudioEl,
  onUserStartPlayback,
  onStopped,
}: {
  messageId: string;
  getAudioEl: () => HTMLAudioElement | null;
  onUserStartPlayback: () => void;
  onStopped: () => void;
}) {
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  // Tracks whether the user intentionally started playback via the button.
  // Only when this is true should we call onStopped (to resume the soundtrack).
  const isSessionActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const tryAttach = () => {
      if (cancelled) return;
      const el = getAudioEl();
      if (!el) {
        window.setTimeout(tryAttach, 120);
        return;
      }

      const handleLoaded = () => {
        if (cancelled) return;
        setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      };
      const handleTime = () => {
        if (cancelled) return;
        setCurrentTime(el.currentTime || 0);
      };
      const handlePlay = () => {
        if (cancelled) return;
        setIsBusy(false);
        setIsPlaying(true);
      };
      const handlePause = () => {
        if (cancelled) return;
        setIsBusy(false);
        setIsPlaying(false);
        // Scroll can fire spurious pause events. Only notify parent when this
        // was a real user-initiated session (button tap), not a scroll glitch.
        if (isSessionActiveRef.current) {
          isSessionActiveRef.current = false;
          onStopped();
        }
      };
      const handleEnded = () => {
        if (cancelled) return;
        setIsBusy(false);
        setIsPlaying(false);
        if (isSessionActiveRef.current) {
          isSessionActiveRef.current = false;
          onStopped();
        }
      };
      const handleWaiting = () => {
        if (cancelled) return;
        if (!el.paused) setIsBusy(true);
      };
      const handlePlaying = () => {
        if (cancelled) return;
        setIsBusy(false);
      };

      handleLoaded();
      handleTime();
      setIsPlaying(!el.paused);

      el.addEventListener('loadedmetadata', handleLoaded);
      el.addEventListener('durationchange', handleLoaded);
      el.addEventListener('timeupdate', handleTime);
      el.addEventListener('play', handlePlay);
      el.addEventListener('pause', handlePause);
      el.addEventListener('ended', handleEnded);
      el.addEventListener('waiting', handleWaiting);
      el.addEventListener('playing', handlePlaying);

      cleanup = () => {
        el.removeEventListener('loadedmetadata', handleLoaded);
        el.removeEventListener('durationchange', handleLoaded);
        el.removeEventListener('timeupdate', handleTime);
        el.removeEventListener('play', handlePlay);
        el.removeEventListener('pause', handlePause);
        el.removeEventListener('ended', handleEnded);
        el.removeEventListener('waiting', handleWaiting);
        el.removeEventListener('playing', handlePlaying);
      };
    };

    tryAttach();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [getAudioEl, messageId, onStopped]);

  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <div
      data-no-nav="true"
      className="w-full rounded-[1.25rem] border border-white/45 bg-white/55 p-4 text-left shadow-[0_12px_30px_rgba(18,18,23,0.10)]"
      onPointerUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full gradient-cta" style={{ width: `${progress * 100}%` }} />
      </div>

      <button
        type="button"
        disabled={isBusy}
        className={cn(
          'mt-3 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
          isBusy ? 'bg-black/10 text-foreground/60' : 'bg-black/12 text-foreground hover:bg-black/15',
        )}
        onClick={(e) => {
          e.stopPropagation();
          const el = getAudioEl();
          if (!el) return;

          if (!el.paused) {
            // User explicitly paused — notify parent to resume soundtrack.
            isSessionActiveRef.current = false;
            el.pause();
            onStopped();
            return;
          }

          // User tapped play — stop soundtrack immediately, then start voice note.
          isSessionActiveRef.current = true;
          onUserStartPlayback();
          setIsBusy(true);

          void el.play().catch((err) => {
            console.error('Voice note play failed', err);
            isSessionActiveRef.current = false;
            setIsBusy(false);
            onStopped();
          });
        }}
      >
        {isBusy ? 'Starting…' : isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}

function getSlideDuration(slide: RevealSlide | undefined) {
  if (!slide) return 6800;

  switch (slide.kind) {
    case 'cover':
      return 7800;
    case 'stats':
      return 7000;
    case 'organizer':
      return 8200;
    case 'wish': {
      const photoCount = getMessagePhotos(slide.message).length;
      const hasAudio = Boolean(slide.message.audio_url);
      if (hasAudio && photoCount >= 1) return 10600;
      if (hasAudio) return 10000;
      if (photoCount >= 3) return 9000;
      if (photoCount >= 1) return 8200;
      return 7400;
    }
    case 'closing':
      return 9200;
    default:
      return 6800;
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

type PendingDeleteAction =
  | { kind: 'message'; messageId: string; senderName: string }
  | { kind: 'photo'; photoId: string; messageId: string; senderName: string }
  | { kind: 'audio'; messageId: string; senderName: string };

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
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRevealIntro, setShowRevealIntro] = useState(false);
  const [hasTriggeredIntro, setHasTriggeredIntro] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [isDesktopPlaybackPaused, setIsDesktopPlaybackPaused] = useState(false);
  const [slideRemainingMs, setSlideRemainingMs] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const [viewMode, setViewMode] = useState<PageDisplayMode>('story');
  const [activeWishAudioId, setActiveWishAudioId] = useState<string | null>(null);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [startYoutube, setStartYoutube] = useState(false);
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
  const isCoarsePointerDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [includeSoundtrackInVideo, setIncludeSoundtrackInVideo] = useState(true);
  const [expandedFreeformCardIds, setExpandedFreeformCardIds] = useState<Set<string>>(() => new Set());
  const wishAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const slideTimerStartedAtRef = useRef<number | null>(null);

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
    }

    if (youtubeIframeRef.current?.contentWindow) {
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
        const [pageData, messagesData] = await Promise.all([
          apiFetch<BirthdayPageData>(`/pages/${pageId}`),
          apiFetch<Message[]>(`/pages/${pageId}/messages`),
        ]);

        setPage({
          ...pageData,
          is_revealed: true,
          is_unlocked: true,
          requires_unlock: false,
          owner_plan_tier: user?.planTier === 'pro' ? 'pro' : 'free',
          message_count: messagesData.length,
        });
        setViewMode(pageData.display_mode || 'story');
        setMessages(messagesData);
        return;
      }

      const publicPage = await apiFetch<BirthdayPageData>(`/public/pages/${pageId}`);
      setPage(publicPage);
      setViewMode(publicPage.display_mode || 'story');
      
      // If we are using a UUID but the page has a public code, redirect to use the public code in the URL
      if (pageId && /^[0-9a-f-]{36}$/i.test(pageId) && publicPage.public_code) {
        navigate(`/birthday/${publicPage.public_code}`, { replace: true });
      }

      if (publicPage.is_revealed && publicPage.is_unlocked !== false) {
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
          const status = await apiFetch<{ isSaved: boolean }>(`/pages/${pageId}/save-status`);
          setIsSaved(status.isSaved);
        } catch {
          // ignore save status errors
        }
      } else {
        setIsSaved(false);
      }
    } catch (error) {
      console.error(error);
      setPage(null);
      setMessages([]);
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
    if (typeof window === 'undefined' || isDesktopReveal || !mobileRevealRef.current) return;

    const revealNodes = Array.from(mobileRevealRef.current.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));
    if (!revealNodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-exiting');
            entry.target.classList.add('is-visible');
          } else if (entry.target.classList.contains('is-visible')) {
            entry.target.classList.remove('is-visible');
            entry.target.classList.add('is-exiting');
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

  const customGradientFrom = page?.theme_gradient_from || '#8b5cf6';
  const customGradientTo = page?.theme_gradient_to || '#ec4899';
  const customGradientMid = page?.theme_gradient_mid || null;
  const customGradientAngle = page?.theme_gradient_angle ?? 135;
  const customAccentColor = page?.theme_accent_color || null;
  const customGradientStops = customGradientMid
    ? `${customGradientFrom}, ${customGradientMid}, ${customGradientTo}`
    : `${customGradientFrom}, ${customGradientTo}`;

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
        titleClass: 'text-slate-900',
        cardClass: 'bg-white/82 border-white/70',
        text: 'text-slate-950',
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

  const [rawLetterFrom, rawLetterMid, rawLetterTo] = (page?.letter_color || '').split(',');
  const letterColorFromHex =
    normalizeHexColor(rawLetterFrom) ||
    (isCustomTheme ? normalizeHexColor(page?.theme_gradient_from) : null) ||
    '#ff915a';
  const letterColorMidHex = normalizeHexColor(rawLetterMid) || null;
  const letterColorToHex =
    normalizeHexColor(rawLetterTo || rawLetterMid) ||
    (isCustomTheme ? normalizeHexColor(page?.theme_gradient_to) : null) ||
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
  } as React.CSSProperties;

  const birthdayDate = parseLocalDate(page?.birthday_date);
  const requiresUnlock = !isPreview && Boolean(page?.requires_unlock);
  const isUnlocked = isPreview || !requiresUnlock || Boolean(page?.is_unlocked);
  const canShowKeepsakeDownload = false;
  const isBeforeBirthday = !isPreview && page?.is_revealed === false;
  const isDarkExperience = page?.theme === 'cosmic' || page?.theme === 'midnight';
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
    const colorA = normalizeHexColor(theme.colors[0]) || '#fbbf24';
    const colorB = normalizeHexColor(theme.colors[1]) || '#f97316';
    const colorC = normalizeHexColor(theme.colors[2]) || colorA;

    const { h: hA } = hexToHsl(colorA);
    const { h: hB } = hexToHsl(colorB);
    const { h: hC } = hexToHsl(colorC);
    const mixedHue = mixHue(hA, hB);

    const cards = isDarkExperience
      ? [
          { bg: `hsl(${hA} 24% 22%)`, border: `hsl(${hA} 34% 38%)`, text: 'hsl(0 0% 96%)' },
          { bg: `hsl(${hB} 22% 20%)`, border: `hsl(${hB} 32% 36%)`, text: 'hsl(0 0% 96%)' },
          { bg: `hsl(${hC} 20% 22%)`, border: `hsl(${hC} 30% 38%)`, text: 'hsl(0 0% 96%)' },
          { bg: `hsl(${mixedHue} 22% 21%)`, border: `hsl(${mixedHue} 32% 37%)`, text: 'hsl(0 0% 96%)' },
          { bg: `hsl(${mixHue(hB, hC)} 20% 23%)`, border: `hsl(${mixHue(hB, hC)} 30% 39%)`, text: 'hsl(0 0% 96%)' },
        ]
      : [
          { bg: `hsl(${hA} 86% 95%)`, border: `hsl(${hA} 62% 78%)`, text: `hsl(${hA} 34% 24%)` },
          { bg: `hsl(${hB} 84% 95%)`, border: `hsl(${hB} 58% 79%)`, text: `hsl(${hB} 32% 24%)` },
          { bg: `hsl(${hC} 84% 95%)`, border: `hsl(${hC} 56% 79%)`, text: `hsl(${hC} 32% 24%)` },
          { bg: `hsl(${mixedHue} 84% 95%)`, border: `hsl(${mixedHue} 58% 79%)`, text: `hsl(${mixedHue} 32% 24%)` },
          { bg: `hsl(${mixHue(hB, hC)} 84% 95%)`, border: `hsl(${mixHue(hB, hC)} 58% 79%)`, text: `hsl(${mixHue(hB, hC)} 32% 24%)` },
        ];

    return {
      boardBackground: isDarkExperience
        ? `linear-gradient(165deg, hsl(${mixedHue} 24% 12%), hsl(${hB} 24% 10%) 52%, hsl(${hC} 24% 14%) 100%)`
        : `linear-gradient(165deg, hsl(${mixedHue} 44% 95%), hsl(${hC} 40% 93%) 56%, hsl(${hA} 42% 91%) 100%)`,
      eyebrowText: isDarkExperience ? `hsl(${mixedHue} 24% 76%)` : `hsl(${hB} 18% 47%)`,
      metaText: isDarkExperience ? `hsl(${mixedHue} 18% 78%)` : `hsl(${hB} 14% 45%)`,
      chipBg: isDarkExperience ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.58)',
      chipText: isDarkExperience ? 'rgba(255,255,255,0.94)' : `hsl(${hB} 28% 30%)`,
      accentBorder: isDarkExperience ? `hsl(${hA} 66% 62%)` : `hsl(${hA} 72% 52%)`,
      tapeColor: isDarkExperience ? `hsla(${hC}, 66%, 72%, 0.34)` : `hsla(${hC}, 82%, 72%, 0.55)`,
      pinColor: isDarkExperience ? `hsl(${hA} 76% 66%)` : `hsl(${hA} 76% 54%)`,
      dividerColor: isDarkExperience ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
      cards,
    };
  }, [isDarkExperience, theme.colors]);

  const freeformOpenerPalette = useMemo(() => {
    const overlayStart = letterColorFromHex;
    const overlayMid = letterColorMidHex || letterColorToHex;
    const overlayEnd = letterColorToHex;

    return {
      backdrop: `radial-gradient(circle at 50% 24%, ${overlayStart}73, ${overlayMid}4f 58%, rgba(18, 7, 5, 0.94) 100%)`,
      tape: `${overlayEnd}cc`,
      miniCard: `linear-gradient(145deg, ${letterColorMidHex ? `${overlayStart}, ${overlayMid}, ${overlayEnd}` : `${overlayStart}, ${overlayEnd}`})`,
      textPrimary: isDarkExperience ? 'hsl(0 0% 96%)' : 'hsl(0 0% 92%)',
      textSecondary: isDarkExperience ? 'hsl(0 0% 80%)' : 'hsl(0 0% 76%)',
    };
  }, [isDarkExperience, letterColorFromHex, letterColorMidHex, letterColorToHex]);
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

  const handleStageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
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

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target;
    const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    ignoreTouchNavigationRef.current =
      path.some((node) => node instanceof HTMLAudioElement) ||
      path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]'))) ||
      (target instanceof Element && Boolean(target.closest(interactiveSelector)));
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }, [interactiveSelector]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
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
  const hasMessages = messages.length > 0;
  const effectiveViewMode: PageDisplayMode = hasMessages ? viewMode : 'story';
  const viewModeLabel = effectiveViewMode === 'story' ? 'Story' : effectiveViewMode === 'freeform' ? 'Freeform' : 'Bento';
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

  const lastAutoPlayedWishIdRef = useRef<string | null>(null);
  const handleBoardParallaxLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
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

  return (
    <div
      className={cn(
        'relative transition-colors duration-500',
        isDesktopReveal ? 'h-[100dvh] min-h-[100dvh] overflow-hidden' : 'min-h-[100dvh] overflow-x-hidden overflow-y-auto',
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
        <div
          className={cn(
            'fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md',
            effectiveViewMode === 'freeform' ? 'px-0' : 'px-4',
          )}
          style={{
            background: effectiveViewMode === 'freeform'
              ? freeformOpenerPalette.backdrop
              : [
                  `radial-gradient(circle at 50% 28%, hsl(${letterH} ${clampedS * 0.5}% 85% / 0.3), hsl(${letterH2} ${clampedS2 * 0.45}% 76% / 0.22), transparent 32%)`,
                  `radial-gradient(circle at 18% 16%, hsl(${letterH2} ${clampedS2 * 0.6}% 68% / 0.16), transparent 22%)`,
                  `linear-gradient(180deg, hsl(${letterH} ${clampedS * 0.35}% 18% / 0.72), hsl(${letterH2} ${clampedS2 * 0.3}% 14% / 0.86))`,
                ].join(', '),
          }}
        >
          <div className={cn('relative flex w-full items-center justify-center', effectiveViewMode !== 'freeform' && 'max-w-5xl')}>
            {effectiveViewMode !== 'freeform' && (
              <button
                type="button"
                onClick={() => void skipReveal()}
                className="absolute right-0 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/18 sm:top-6"
              >
                <SkipForward className="h-4 w-4" />
                Skip intro
              </button>
            )}

            <div className="relative flex min-h-[100dvh] w-full items-center justify-center py-20">
              {effectiveViewMode !== 'freeform' && (
                <FloatingParticles hue={mixedLetterH} saturation={((clampedS + clampedS2) / 2) * 100} />
              )}
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0"
                  style={
                    effectiveViewMode === 'freeform'
                      ? {
                          background: [
                            'repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)',
                            'linear-gradient(180deg, #2c130d 0%, #1f0d08 100%)',
                          ].join(', '),
                        }
                      : {
                          background: `radial-gradient(circle, hsl(${letterH} ${clampedS}% ${letterL}% / 0.34), hsl(${letterH2} ${clampedS2}% ${letterL2}% / 0.16), transparent 62%)`,
                        }
                  }
                />
                <div
                  className="absolute left-1/2 top-[43%] h-[30rem] w-[20rem] -translate-x-1/2 rounded-full blur-3xl"
                  style={
                    effectiveViewMode === 'freeform'
                      ? { background: 'radial-gradient(circle, rgba(86,41,27,0.22), transparent 70%)' }
                      : { background: `radial-gradient(circle, hsl(${letterH2} ${clampedS2}% ${letterL2}% / 0.2), transparent 68%)` }
                  }
                />
              </div>

              <div
                className={cn(
                  'relative flex w-full flex-col items-center justify-center',
                  effectiveViewMode === 'freeform' ? 'max-w-none px-3 sm:px-8 lg:px-14' : 'max-w-xl',
                )}
              >
                <div className="mb-6 text-center text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/68">Birthday post</p>
                  <p className="mt-3 text-lg font-medium tracking-tight text-white/92">
                    {effectiveViewMode === 'freeform' ? `A board for ${page.recipient_name}` : `A letter for ${page.recipient_name}`}
                  </p>
                </div>

                <div className="relative flex h-[26rem] w-full items-center justify-center sm:h-[30rem]">
                  {effectiveViewMode !== 'freeform' && burstMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        'absolute left-1/2 top-1/2 w-48 rounded-[1.4rem] border border-white/14 bg-white/12 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-700 ease-out hover:scale-[1.03] hover:shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:w-56',
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
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/88">&quot;{stripHtml(message.message)}&quot;</p>
                      <p className="mt-3 text-xs font-semibold text-white/72">{message.sender_name}</p>
                    </div>
                  ))}

                  {effectiveViewMode === 'freeform' ? (
                    <div
                      className={cn(
                        'relative z-10 w-full px-2 text-center transition-all duration-700 ease-out sm:px-4',
                        revealPhase === 'opening' && 'scale-[0.99]',
                        revealPhase === 'burst' && 'scale-[0.95] opacity-85',
                      )}
                    >
                      <div className="pointer-events-none absolute left-[-2%] top-[10%] h-[6.3rem] w-[12.4rem] rotate-[-6deg] rounded-lg border border-white/8 bg-white/14" />
                      <div className="pointer-events-none absolute left-[27%] top-[3%] h-[5.2rem] w-[9rem] rotate-[1deg] rounded-lg border border-white/7 bg-white/12" />
                      <div className="pointer-events-none absolute right-[-2%] top-[9%] h-[6.2rem] w-[11.1rem] rotate-[5deg] rounded-lg border border-white/8 bg-white/13" />
                      <div className="pointer-events-none absolute left-[4%] top-[71%] h-[7rem] w-[11rem] rotate-[2deg] rounded-lg border border-white/8 bg-white/13" />
                      <div className="pointer-events-none absolute right-[20%] top-[79%] h-[7rem] w-[9.5rem] rotate-[-3deg] rounded-lg border border-white/8 bg-white/13" />
                      <div className="pointer-events-none absolute right-[0%] top-[74%] h-[7.4rem] w-[10.1rem] rotate-[-4deg] rounded-lg border border-white/8 bg-white/14" />

                      <div className="mx-auto w-fit rounded-md bg-white px-4 pb-4 pt-3 shadow-[0_20px_56px_rgba(0,0,0,0.45)]">
                        <div className="relative mx-auto h-5 w-14 -translate-y-2 rounded-sm" style={{ backgroundColor: '#e3c57a' }} />
                        <div className="relative h-[12.6rem] w-[13.8rem] overflow-hidden rounded-sm" style={{ backgroundColor: '#c6ac84' }}>
                          {coverPhotoSrc ? (
                            renderStoryImage(coverPhotoSrc, `${page.recipient_name} cover photo`, { disableParallax: true, eager: true })
                          ) : (
                            <div className="flex h-full items-center justify-center text-white/60">
                              <ImageIcon className="h-9 w-9" />
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-[1.65rem] leading-none" style={{ fontFamily: '"Lobster", "Pacifico", serif', color: '#5b4032' }}>{page.recipient_name}</p>
                      </div>

                      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">A birthday board for</p>
                      <h2 className="mt-2 text-[3.9rem] font-semibold leading-[0.92] text-white sm:text-[4.6rem]" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                        {page.recipient_name}
                      </h2>
                      <p className="mx-auto mt-4 max-w-[27rem] text-[1.12rem] italic leading-[1.45] text-white/82" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                        "Every note, photo, and voice here was left just for you."
                      </p>

                      <div className="mt-7 flex items-center justify-center gap-3 text-white/92">
                        <span className="inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-full border border-white/32 bg-white/14 px-4 py-2.5 text-[0.98rem] font-medium backdrop-blur-sm">
                          <Sparkles className="h-4 w-4" />
                          {messages.length} wishes
                        </span>
                        <span className="inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-full border border-white/32 bg-white/14 px-4 py-2.5 text-[0.98rem] font-medium backdrop-blur-sm">
                          <ImageIcon className="h-4 w-4" />
                          {totalPhotos} photos
                        </span>
                        <span className="inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-full border border-white/32 bg-white/14 px-4 py-2.5 text-[0.98rem] font-medium backdrop-blur-sm">
                          <Music className="h-4 w-4" />
                          {totalAudioWishes} voices
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void beginReveal()}
                        className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/42 bg-transparent px-8 py-3.5 text-[1.3rem] font-medium text-white transition-colors hover:bg-white/10"
                        aria-label="Open your board"
                      >
                        <Share2 className="h-5 w-5" />
                        Open your board
                      </button>

                      <button
                        type="button"
                        onClick={() => void skipReveal()}
                        className="mt-5 block w-full text-[1rem] text-white/62 transition-colors hover:text-white/78"
                      >
                        skip intro
                      </button>
                    </div>
                  ) : (
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
                    {/* Envelope outer shell */}
                    <div
                      className="absolute inset-0 rounded-[2.4rem]"
                      style={{
                        background: `linear-gradient(145deg, hsl(${letterH} ${clampedS * 0.45}% 95%), hsl(${letterH2} ${clampedS2 * 0.55}% 88%))`,
                        boxShadow: `0 26px 90px hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 20% / 0.22)`,
                      }}
                    />
                    <div className="absolute inset-[1px] rounded-[2.35rem] border border-white/60" />
                    <div
                      className="absolute inset-[1.2rem] rounded-[1.9rem] border opacity-60"
                      style={{ borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.4}% 82%)` }}
                    />
                    {/* Envelope flap */}
                    <div
                      className={cn(
                        'absolute left-1/2 top-0 h-[52%] w-[92%] -translate-x-1/2 origin-top rounded-[2rem] transition-all duration-500',
                        revealPhase !== 'idle' ? '-translate-y-4 rotate-[-12deg]' : 'group-hover:-translate-y-1',
                      )}
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                        background: `linear-gradient(145deg, hsl(${letterH2} ${clampedS2 * 0.6}% 78%), hsl(${letterH} ${clampedS * 0.5}% 88%))`,
                        boxShadow: `0 16px 36px hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.4}% 40% / 0.22)`,
                      }}
                    />
                    {/* Envelope body / inner pocket */}
                    <div
                      className="absolute bottom-[11%] left-1/2 h-[55%] w-[90%] -translate-x-1/2 rounded-[1.8rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      style={{
                        background: `linear-gradient(180deg, hsl(${letterH} ${clampedS * 0.4}% 97%), hsl(${letterH2} ${clampedS2 * 0.55}% 90%))`,
                        borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 85% / 0.7)`,
                      }}
                    />
                    {/* Letter card */}
                    <div
                      className={cn(
                        'absolute left-1/2 top-[24%] h-[40%] w-[74%] -translate-x-1/2 rounded-[1.4rem] border px-5 py-4 text-left transition-all duration-500 sm:w-[72%]',
                        revealPhase === 'opening' ? '-translate-y-6' : '',
                        revealPhase === 'burst' ? '-translate-y-10 opacity-0' : '',
                      )}
                      style={{
                        background: `linear-gradient(180deg, hsl(${letterH2} ${clampedS2 * 0.35}% 97%), hsl(${letterH} ${clampedS * 0.45}% 93%))`,
                        borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.4}% 78% / 0.8)`,
                        boxShadow: `0 14px 28px hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 35% / 0.16)`,
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: `hsl(${mixedLetterH} 30% 42%)` }}>To</p>
                      <p className="mt-2 text-[1.45rem] font-bold leading-none sm:text-[1.7rem]" style={{ color: `hsl(${letterH} 28% 22%)` }}>{page.recipient_name}</p>
                      <p className="mt-2.5 max-w-[9rem] text-[11px] leading-[1.45] sm:max-w-[10rem]" style={{ color: `hsl(${letterH2} 20% 38%)` }}>
                        Open when ready for the birthday story.
                      </p>
                    </div>
                    {/* Stamp / seal button */}
                    <div
                      className="animate-seal-breathe absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, hsl(${letterH} ${clampedS}% 62%), hsl(${letterH2} ${clampedS2 * 0.8}% 48%))`,
                        borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.5}% 82%)`,
                        '--seal-glow': `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.6}% 55% / 0.35)`,
                      } as React.CSSProperties}
                    >
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
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showRevealIntro && (
        <div
          className={cn(
            'pointer-events-none z-40 mx-auto flex w-full max-w-6xl justify-center px-3 sm:px-5',
            effectiveViewMode === 'freeform' ? 'fixed left-0 right-0 top-3 sm:top-4' : 'sticky top-3 sm:top-4',
          )}
        >
          <div
            className={cn(
              'pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl',
              isDarkExperience ? 'border-white/16 bg-white/8 text-white' : 'border-white/75 bg-white/84 text-foreground',
            )}
            data-no-nav="true"
          >
            <span>View</span>
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] tracking-[0.1em]', isDarkExperience ? 'bg-white/14 text-white' : 'bg-white text-foreground')}>
              {viewModeLabel}
            </span>
          </div>
        </div>
      )}

      <section className={cn('relative min-h-[100dvh] overflow-y-auto px-3 py-4 sm:hidden', effectiveViewMode !== 'story' && 'hidden')}>
        <div ref={mobileRevealRef} className="mx-auto flex max-w-2xl flex-col gap-4 pb-28">
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

          {!showRevealIntro && (
            <div
              className={cn(
                'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-50 mx-auto flex w-full max-w-2xl items-center justify-center px-2',
                'pointer-events-none',
              )}
              aria-hidden="true"
            >
              <div
                className="pointer-events-auto w-fit max-w-[calc(100vw-0.75rem)] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                data-no-nav="true"
              >
                <div
                className={cn(
                'inline-flex w-max items-center gap-1.5 rounded-2xl border px-1.5 py-1.5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl',
                  isDarkExperience ? 'border-white/18 bg-white/10 text-white' : 'border-white/70 bg-white/80 text-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => setShowShareCard(true)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                    isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white',
                  )}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handlePlayControl}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                    isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white',
                  )}
                >
                  <Music4 className="h-3.5 w-3.5" />
                  Play
                </button>
                <button
                  type="button"
                  onClick={handlePauseControl}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                    isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white',
                  )}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Pause
                </button>
                {canShowKeepsakeDownload && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleDownloadKeepsake()}
                      disabled={downloadingPdf}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white',
                      )}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingPdf ? 'Preparing' : 'PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeSoundtrackInVideo((current) => !current)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                        isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white',
                      )}
                    >
                      <Music className="h-3.5 w-3.5" />
                      {includeSoundtrackInVideo ? 'Sound on' : 'Sound off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadVideoKeepsake()}
                      disabled={downloadingVideo}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white',
                      )}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {downloadingVideo ? 'Rendering' : 'Video'}
                    </button>
                  </>
                )}
                </div>
              </div>
            </div>
          )}

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
              <div aria-hidden="true" className="slide-stars-layer">
                <div className="slide-star" style={{ left: '8%', '--star-x': '0%' } as React.CSSProperties} />
                <div className="slide-star" style={{ left: '26%', '--star-x': '3%' } as React.CSSProperties} />
                <div className="slide-star" style={{ left: '42%', '--star-x': '-2%' } as React.CSSProperties} />
                <div className="slide-star" style={{ left: '61%', '--star-x': '4%' } as React.CSSProperties} />
                <div className="slide-star" style={{ left: '79%', '--star-x': '-3%' } as React.CSSProperties} />
              </div>

              <div className="relative z-10">
                {slide.kind === 'cover' && (
                  <div className="space-y-4">
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

                      {page.creator_message && (
                        <article className={cn('story-stage-reveal-soft rounded-[1.4rem] border p-4', keepsakeSoftClass)} style={getStoryDelayStyle(180, 700)}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Packed with a note from the organizer</p>
                          <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme.text)}>&quot;{page.creator_message}&quot;</p>
                        </article>
                      )}
                    </div>

                    {coverPhotoSrc && (
                      <article className={cn('story-stage-reveal-soft relative overflow-hidden rounded-[1.4rem] border', keepsakeSoftClass)} style={getStoryDelayStyle(130, 760)}>
                        <button
                          type="button"
                          className="relative block h-[46dvh] min-h-[16rem] max-h-[30rem] w-full"
                          onClick={() => setExpandedPhoto({
                            url: coverPhotoSrc,
                            caption: `${page.recipient_name}'s birthday cover`,
                            senderName: 'Birthday page',
                          })}
                          aria-label={`Expand ${page.recipient_name}'s birthday cover`}
                        >
                          {renderStoryImage(coverPhotoSrc, `${page.recipient_name} birthday cover`, { disableParallax: true, eager: true })}
                        </button>
                      </article>
                    )}
                  </div>
                )}

                {slide.kind === 'stats' && (
                  <div className="space-y-4">
                    <article className={cn('story-stage-reveal rounded-[1.7rem] border p-5', keepsakePaperClass)} style={getStoryDelayStyle(30, getStoryMotionDuration(slide))}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>The shape of the celebration</p>
                      <h2 className={cn('mt-3 text-[2.1rem] font-bold leading-[0.98]', theme.titleClass, theme.font)}>
                        Collected with love.
                      </h2>
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
                      <article className={cn('story-stage-reveal rounded-[1.7rem] border p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover', keepsakePaperClass)} style={getStoryDelayStyle(40, getStoryMotionDuration(slide))}>
                        <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                          Letter {slide.index + 1} of {messages.length}
                        </p>
                        <h2 className={cn('mt-3 text-3xl font-bold leading-[0.98]', theme.titleClass, theme.font)}>{slide.message.sender_name}</h2>
                        {isRichHtml(slide.message.message)
                          ? <div className={cn('wish-rich-text mt-4 text-lg leading-relaxed', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(slide.message.message) }} />
                          : <p className={cn('mt-4 text-lg leading-relaxed', theme.text)}>&quot;{slide.message.message}&quot;</p>
                        }
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

                        {/* Stickers Rendering (Mobile) */}
                        {slide.message.stickers && slide.message.stickers.length > 0 && (
                          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                            {slide.message.stickers.map((sticker) => (
                              <div
                                key={sticker.id}
                                className="absolute select-none text-4xl"
                                style={{
                                  left: `${sticker.position_x}%`,
                                  top: `${sticker.position_y}%`,
                                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                                }}
                              >
                                {STICKER_EMOJI_MAP[sticker.sticker_type] ?? sticker.sticker_type}
                              </div>
                            ))}
                          </div>
                        )}
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
                      <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>
                        Signed by{contributorLine ? ` ${contributorLine}` : ' everyone who wrote'}
                      </p>
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

      {/* Bento grid — mobile (below sm breakpoint, shown when viewMode=bento) */}
      {effectiveViewMode === 'bento' && messages.length > 0 && (
        <section className="relative min-h-[100dvh] overflow-y-auto px-0 py-4 sm:hidden">
          <BentoGridView
            page={page}
            messages={messages}
            theme={theme}
            isDarkExperience={isDarkExperience}
            keepsakePaperClass={keepsakePaperClass}
            keepsakeSoftClass={keepsakeSoftClass}
            birthdayDate={birthdayDate}
          />
        </section>
      )}

      {/* Desktop: bento grid view */}
      {effectiveViewMode === 'bento' && messages.length > 0 && (
        <section className="relative hidden h-[100dvh] overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 sm:block">
          <BentoGridView
            page={page}
            messages={messages}
            theme={theme}
            isDarkExperience={isDarkExperience}
            keepsakePaperClass={keepsakePaperClass}
            keepsakeSoftClass={keepsakeSoftClass}
            birthdayDate={birthdayDate}
          />
        </section>
      )}

      {effectiveViewMode === 'freeform' && hasMessages && (
        <section className="relative min-h-[100dvh] overflow-y-auto px-3 py-4 sm:h-[100dvh] sm:px-5 sm:pb-5 sm:pt-0" style={{ background: freeformThemePalette.boardBackground }}>
          <div className="mx-auto w-full max-w-[66rem] pb-20 pt-14 sm:pt-16 xl:max-w-[88rem]">
            <div className="mb-5 w-full sm:mb-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] md:block" style={{ color: freeformThemePalette.eyebrowText }}>Freeform view</p>
                  <h2 className={cn('mt-2 text-2xl font-bold leading-tight sm:text-3xl', theme.titleClass, theme.font)}>
                    {page.recipient_name}&apos;s story board
                  </h2>
                  <p className="mt-1 text-[11px]" style={{ color: freeformThemePalette.metaText }}>
                    {messages.length} wishes · {totalPhotos} photos · {totalAudioWishes} voice notes
                  </p>
                </div>
              </div>
            </div>

            {/* Cover Card */}
            <div className="mb-5 sm:mb-6 md:hidden">
              <article
                className="relative mx-auto w-[calc(100%-20px)] max-w-[24rem] rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                style={{
                  marginLeft: '8px',
                  transform: 'rotate(-1.1deg)',
                  backgroundColor: freeformThemePalette.cards[0].bg,
                  borderColor: freeformThemePalette.cards[0].border,
                  color: freeformThemePalette.cards[0].text,
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute"
                  style={{
                    width: '36px',
                    height: '13px',
                    borderRadius: '2px',
                    top: '-7px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-1.5deg)',
                    backgroundColor: freeformThemePalette.tapeColor,
                  }}
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">First Note off the board</p>
                <h3 className={cn('mt-2 text-2xl font-bold leading-[0.95]', theme.titleClass, theme.font)}>
                  Happy Birthday,
                  <br />
                  {page.recipient_name}.
                </h3>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  Every note, photo, and voice clip inside was chosen to make this feel less like a page and more like a gift being opened.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>{messages.length} wishes</span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>Reveal {format(birthdayDate, 'MMM d, yyyy')}</span>
                </div>
                {coverPhotoSrc && (
                  <button
                    type="button"
                    className="relative mt-3 block aspect-[4/3] w-full max-h-48 overflow-hidden rounded-lg border border-white/45 bg-white/35"
                    onClick={() => setExpandedPhoto({
                      url: coverPhotoSrc,
                      caption: `${page.recipient_name}'s birthday cover`,
                      senderName: 'Birthday page',
                    })}
                    aria-label={`Expand ${page.recipient_name}'s birthday cover`}
                  >
                    {renderStoryImage(coverPhotoSrc, `${page.recipient_name} birthday cover`, { disableParallax: true, eager: true })}
                  </button>
                )}
              </article>
            </div>

            {/* Organizer Card */}
            {page.creator_message && (
              <div className="mb-5 sm:mb-6 md:hidden">
                <article
                  className="relative mx-auto w-[calc(100%-20px)] max-w-[22rem] rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                  style={{
                    marginLeft: '18px',
                    transform: 'rotate(1.2deg)',
                    backgroundColor: freeformThemePalette.cards[1].bg,
                    borderColor: freeformThemePalette.cards[1].border,
                    color: freeformThemePalette.cards[1].text,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute"
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '999px',
                      top: '-5px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: freeformThemePalette.pinColor,
                    }}
                  />
                  <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/55">
                    <Heart className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">A note from the organizer</p>
                  <p className="mt-2 text-sm italic leading-relaxed">&quot;{page.creator_message}&quot;</p>
                </article>
              </div>
            )}

            {(() => {
              const freeformCardPalette = freeformThemePalette.cards;
              const boardMessages = messages;

              return (
                <>
                  <div className="space-y-4 md:hidden">
                    {boardMessages.map((message, index) => {
                      const isExpanded = expandedFreeformCardIds.has(message.id);
                      const baseRotation = ((index * 7) % 11 - 5) * 0.6;
                      const rotation = Math.max(-1.5, Math.min(1.5, baseRotation));
                      const tone = freeformCardPalette[index % freeformCardPalette.length];
                      const photos = getMessagePhotos(message);
                      const photoCount = photos.length;
                      const voiceCount = message.audio_url ? 1 : 0;
                      const compactMessage = stripHtml(message.message || '').trim();

                      return (
                        <article
                          key={message.id}
                          className="relative rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out"
                          style={{
                            marginLeft: `${index % 2 === 0 ? 4 : 14}px`,
                            width: 'calc(100% - 20px)',
                            transform: `rotate(${rotation}deg)`,
                            backgroundColor: tone.bg,
                            borderColor: isExpanded ? freeformThemePalette.accentBorder : tone.border,
                            color: tone.text,
                          }}
                        >
                          {index % 2 === 0 ? (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute"
                              style={{
                                width: '36px',
                                height: '13px',
                                borderRadius: '2px',
                                top: '-7px',
                                left: '50%',
                                transform: 'translateX(-50%) rotate(-1.5deg)',
                                backgroundColor: freeformThemePalette.tapeColor,
                              }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute"
                              style={{
                                width: '9px',
                                height: '9px',
                                borderRadius: '999px',
                                top: '-5px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: freeformThemePalette.pinColor,
                              }}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedFreeformCardIds((current) => {
                                const next = new Set(current);
                                if (next.has(message.id)) {
                                  next.delete(message.id);
                                } else {
                                  next.add(message.id);
                                }
                                return next;
                              })
                            }
                            className="block w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-65">{message.sender_name || 'Someone'}</p>
                              {isExpanded && (
                                <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>
                                  Tap to close
                                </span>
                              )}
                            </div>

                            <p className="mt-2 line-clamp-3 text-[1.02rem] leading-snug">{compactMessage || 'A birthday wish.'}</p>

                            {(photoCount > 0 || voiceCount > 0) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {photoCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    {photoCount} photo{photoCount === 1 ? '' : 's'}
                                  </span>
                                )}
                                {voiceCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>
                                    <Music className="h-3.5 w-3.5" />
                                    {voiceCount} voice note{voiceCount === 1 ? '' : 's'}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-3 border-t pt-2 text-center text-xs font-medium opacity-45" style={{ borderColor: freeformThemePalette.dividerColor }}>Tap to open</div>
                          </button>

                          <div className={cn('grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out', isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0')}>
                            <div className="overflow-hidden">
                              {isRichHtml(message.message)
                                ? <div className="wish-rich-text text-[1.02rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeWishHtmlForDisplay(message.message) }} />
                                : <p className="text-[1.02rem] leading-relaxed">{message.message}</p>
                              }

                              {photoCount > 0 && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  {photos.map((photo) => {
                                    const resolvedPhotoUrl = resolveAssetUrl(photo.photo_url) || photo.photo_url;

                                    return (
                                      <button
                                        key={photo.id}
                                        type="button"
                                        className="relative aspect-square overflow-hidden rounded-lg border border-white/45 bg-white/35"
                                        onClick={() =>
                                          setExpandedPhoto({
                                            url: resolvedPhotoUrl,
                                            caption: photo.caption,
                                            senderName: message.sender_name,
                                          })
                                        }
                                      >
                                        {renderStoryImage(resolvedPhotoUrl, `Photo from ${message.sender_name}`, { disableParallax: true })}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {voiceCount > 0 && <div className="mt-3 space-y-2">{renderWishAudioPlayer(message, 'w-full')}</div>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden md:block">
                    {(() => {
                      const pivotIndex = Math.ceil(boardMessages.length / 2);
                      const desktopBoardCards: Array<
                        | { type: 'cover' }
                        | { type: 'organizer' }
                        | { type: 'closing' }
                        | { type: 'message'; message: Message }
                      > = [
                        { type: 'cover' },
                        ...boardMessages.slice(0, pivotIndex).map((message) => ({ type: 'message' as const, message })),
                        ...(page.creator_message ? ([{ type: 'organizer' as const }] as const) : []),
                        ...boardMessages.slice(pivotIndex).map((message) => ({ type: 'message' as const, message })),
                        { type: 'closing' },
                      ];

                      return (
                        <div
                          className="relative mx-auto w-full columns-3 [column-gap:1.25rem] [column-fill:balance] xl:columns-4"
                        >
                          {desktopBoardCards.map((card, index) => {
                            const baseRotation = ((index * 7) % 11 - 5) * 0.6;
                            const rotation = Math.max(-1.5, Math.min(1.5, baseRotation));

                            if (card.type !== 'message') {
                              const metaTone =
                                card.type === 'cover'
                                  ? freeformThemePalette.cards[0]
                                  : card.type === 'organizer'
                                    ? freeformThemePalette.cards[1]
                                    : freeformThemePalette.cards[3];

                              return (
                                <article
                                  key={`meta-${card.type}`}
                                  className="relative mb-6 inline-block w-full break-inside-avoid rounded-[1.2rem] border px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
                                  style={{
                                    transform: `rotate(${rotation}deg)`,
                                    backgroundColor: metaTone.bg,
                                    borderColor: metaTone.border,
                                    color: metaTone.text,
                                  }}
                                >
                                  {index % 2 === 0 ? (
                                    <span
                                      aria-hidden="true"
                                      className="pointer-events-none absolute"
                                      style={{
                                        width: '36px',
                                        height: '13px',
                                        borderRadius: '2px',
                                        top: '-7px',
                                        left: '50%',
                                        transform: 'translateX(-50%) rotate(-1.5deg)',
                                        backgroundColor: freeformThemePalette.tapeColor,
                                      }}
                                    />
                                  ) : (
                                    <span
                                      aria-hidden="true"
                                      className="pointer-events-none absolute"
                                      style={{
                                        width: '9px',
                                        height: '9px',
                                        borderRadius: '999px',
                                        top: '-5px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: freeformThemePalette.pinColor,
                                      }}
                                    />
                                  )}

                                  {card.type === 'cover' && (
                                    <>
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">First Note off the board</p>
                                      <h3 className={cn('mt-2 text-2xl font-bold leading-[0.95]', theme.titleClass, theme.font)}>
                                        Happy Birthday,
                                        <br />
                                        {page.recipient_name}.
                                      </h3>
                                      <p className="mt-2 text-sm leading-relaxed opacity-80">
                                        Every note, photo, and voice clip inside was chosen to make this feel less like a page and more like a gift being opened.
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>{messages.length} wishes</span>
                                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>Reveal {format(birthdayDate, 'MMM d, yyyy')}</span>
                                      </div>
                                      {coverPhotoSrc && (
                                        <button
                                          type="button"
                                          className="relative mt-3 block aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/45 bg-white/35"
                                          onClick={() =>
                                            setExpandedPhoto({
                                              url: coverPhotoSrc,
                                              caption: `${page.recipient_name}'s birthday cover`,
                                              senderName: 'Birthday page',
                                            })
                                          }
                                          aria-label={`Expand ${page.recipient_name}'s birthday cover`}
                                        >
                                          {renderStoryImage(coverPhotoSrc, `${page.recipient_name} birthday cover`, { disableParallax: true, eager: true })}
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {card.type === 'organizer' && (
                                    <>
                                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/55">
                                        <Heart className="h-4 w-4" />
                                      </div>
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">A note from the organizer</p>
                                      <p className="mt-2 text-sm italic leading-relaxed">&quot;{page.creator_message}&quot;</p>
                                    </>
                                  )}

                                  {card.type === 'closing' && (
                                    <>
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">Final Note</p>
                                      <h3 className={cn('mt-2 text-2xl font-bold leading-[0.98]', theme.titleClass, theme.font)}>
                                        Keep this close,
                                        <br />
                                        {page.recipient_name}.
                                      </h3>
                                      <p className="mt-2 text-sm leading-relaxed opacity-80">
                                        This is the part worth replaying: every photo, every message, and every voice note gathered into one last birthday page.
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>{messages.length} wishes</span>
                                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>{totalPhotos} photos</span>
                                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-85" style={{ backgroundColor: freeformThemePalette.chipBg, color: freeformThemePalette.chipText }}>{totalAudioWishes} voices</span>
                                      </div>
                                      <p className="mt-3 border-t pt-2 text-xs leading-relaxed opacity-80" style={{ borderColor: freeformThemePalette.dividerColor }}>
                                        Signed by{contributorLine ? ` ${contributorLine}` : ' everyone who wrote'}. Happy birthday, {page.recipient_name}. You were worth gathering all of this for.
                                      </p>
                                    </>
                                  )}
                                </article>
                              );
                            }

                            const message = card.message;
                            const isExpanded = expandedFreeformCardIds.has(message.id);
                            const tone = freeformCardPalette[index % freeformCardPalette.length];
                            const photos = getMessagePhotos(message);
                            const photoCount = photos.length;
                            const voiceCount = message.audio_url ? 1 : 0;
                            const compactMessage = stripHtml(message.message || '').trim();

                            return (
                              <article
                                key={message.id}
                                className="relative mb-6 inline-block w-full break-inside-avoid rounded-[1.2rem] border px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-all duration-300 ease-out"
                                style={{
                                  transform: `rotate(${rotation}deg)`,
                                  backgroundColor: tone.bg,
                                  borderColor: isExpanded ? freeformThemePalette.accentBorder : tone.border,
                                  color: tone.text,
                                }}
                              >
                                {index % 2 === 0 ? (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute"
                                    style={{
                                      width: '36px',
                                      height: '13px',
                                      borderRadius: '2px',
                                      top: '-7px',
                                      left: '50%',
                                      transform: 'translateX(-50%) rotate(-1.5deg)',
                                      backgroundColor: 'rgba(255, 218, 130, 0.55)',
                                    }}
                                  />
                                ) : (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute"
                                    style={{
                                      width: '9px',
                                      height: '9px',
                                      borderRadius: '999px',
                                      top: '-5px',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      backgroundColor: '#E35252',
                                    }}
                                  />
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedFreeformCardIds((current) => {
                                      const next = new Set(current);
                                      if (next.has(message.id)) {
                                        next.delete(message.id);
                                      } else {
                                        next.add(message.id);
                                      }
                                      return next;
                                    })
                                  }
                                  className="block w-full text-left"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-65">{message.sender_name || 'Someone'}</p>
                                    {isExpanded && (
                                      <span className="rounded-full bg-[#f3e5d2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9b6a35]">
                                        Tap to close
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-2 line-clamp-3 text-[1.02rem] leading-snug">{compactMessage || 'A birthday wish.'}</p>

                                  {(photoCount > 0 || voiceCount > 0) && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {photoCount > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2 py-1 text-[11px] font-semibold opacity-85">
                                          <ImageIcon className="h-3.5 w-3.5" />
                                          {photoCount} photo{photoCount === 1 ? '' : 's'}
                                        </span>
                                      )}
                                      {voiceCount > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2 py-1 text-[11px] font-semibold opacity-85">
                                          <Music className="h-3.5 w-3.5" />
                                          {voiceCount} voice note{voiceCount === 1 ? '' : 's'}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-3 border-t border-black/10 pt-2 text-center text-xs font-medium opacity-45">Tap to open</div>
                                </button>

                                <div className={cn('grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out', isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0')}>
                                  <div className="overflow-hidden">
                                    {isRichHtml(message.message)
                                      ? <div className="wish-rich-text text-[1.02rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeWishHtmlForDisplay(message.message) }} />
                                      : <p className="text-[1.02rem] leading-relaxed">{message.message}</p>
                                    }

                                    {photoCount > 0 && (
                                      <div className="mt-3 grid grid-cols-3 gap-2">
                                        {photos.map((photo) => {
                                          const resolvedPhotoUrl = resolveAssetUrl(photo.photo_url) || photo.photo_url;

                                          return (
                                            <button
                                              key={photo.id}
                                              type="button"
                                              className="relative aspect-square overflow-hidden rounded-lg border border-white/45 bg-white/35"
                                              onClick={() =>
                                                setExpandedPhoto({
                                                  url: resolvedPhotoUrl,
                                                  caption: photo.caption,
                                                  senderName: message.sender_name,
                                                })
                                              }
                                            >
                                              {renderStoryImage(resolvedPhotoUrl, `Photo from ${message.sender_name}`, { disableParallax: true })}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {voiceCount > 0 && <div className="mt-3 space-y-2">{renderWishAudioPlayer(message, 'w-full')}</div>}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}

            {/* Closing Card */}
            <div className="mt-8 sm:mt-10 md:hidden">
              <article
                className="relative mx-auto w-[calc(100%-20px)] max-w-[24rem] rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                style={{
                  marginLeft: '10px',
                  transform: 'rotate(-0.9deg)',
                  backgroundColor: '#ECF8F3',
                  borderColor: '#AFD7C8',
                  color: '#1F5D4A',
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute"
                  style={{
                    width: '36px',
                    height: '13px',
                    borderRadius: '2px',
                    top: '-7px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-1.5deg)',
                    backgroundColor: 'rgba(255, 218, 130, 0.55)',
                  }}
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">Final Note</p>
                <h3 className={cn('mt-2 text-2xl font-bold leading-[0.98]', theme.titleClass, theme.font)}>
                  Keep this close,
                  <br />
                  {page.recipient_name}.
                </h3>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  This is the part worth replaying: every photo, every message, and every voice note gathered into one last birthday page.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/55 px-2.5 py-1 text-[11px] font-semibold opacity-85">{messages.length} wishes</span>
                  <span className="rounded-full bg-white/55 px-2.5 py-1 text-[11px] font-semibold opacity-85">{totalPhotos} photos</span>
                  <span className="rounded-full bg-white/55 px-2.5 py-1 text-[11px] font-semibold opacity-85">{totalAudioWishes} voices</span>
                </div>
                <p className="mt-3 border-t border-black/10 pt-2 text-xs leading-relaxed opacity-80">
                  Signed by{contributorLine ? ` ${contributorLine}` : ' everyone who wrote'}. Happy birthday, {page.recipient_name}. You were worth gathering all of this for.
                </p>
              </article>
            </div>
          </div>
        </section>
      )}

      {/* Desktop: story (slide) view */}
      <section className={cn('relative hidden h-[100dvh] overflow-hidden px-3 py-3 sm:px-5 sm:py-5 sm:block', effectiveViewMode !== 'story' && '!hidden')}>
        <div className="mx-auto flex h-full max-w-6xl flex-col">
          <div className="flex items-start gap-4">
            <div className="flex flex-1 gap-2">
              {revealSlides.map((slide, index) => (
                <div key={slide.id} className={cn('h-1.5 flex-1 overflow-hidden rounded-full bg-black/12 transition-transform duration-200', index === currentSlide && 'scale-y-[1.6]')}>
                  <div
                    key={index === currentSlide ? `${slide.id}-active` : slide.id}
                    className={cn(
                      'h-full rounded-full',
                      index < currentSlide && 'w-full gradient-cta',
                      index === currentSlide && 'animate-wrapped-progress gradient-cta',
                      index === currentSlide && isDesktopPlaybackPaused && '[animation-play-state:paused]',
                      index > currentSlide && 'w-0',
                    )}
                    style={index === currentSlide ? { animationDuration: `${currentSlideDuration}ms` } : undefined}
                  />
                </div>
              ))}
            </div>

            {!showRevealIntro && (
              <div className="hidden items-center gap-2 sm:flex" data-no-nav="true">
              <button
                type="button"
                onClick={() => setShowShareCard(true)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
                  isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                type="button"
                onClick={handlePlayControl}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
                  isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Music4 className="h-4 w-4" />
                Play
              </button>
              <button
                type="button"
                onClick={handlePauseControl}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
                  isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Volume2 className="h-4 w-4" />
                Pause
              </button>
              {canShowKeepsakeDownload && (
                <>
                  <button
                    type="button"
                    onClick={() => void handleDownloadKeepsake()}
                    disabled={downloadingPdf}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                    )}
                  >
                    <Download className="h-4 w-4" />
                    {downloadingPdf ? 'Preparing' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeSoundtrackInVideo((current) => !current)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
                      isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                    )}
                  >
                    <Music className="h-4 w-4" />
                    {includeSoundtrackInVideo ? 'Video sound on' : 'Video sound off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadVideoKeepsake()}
                    disabled={downloadingVideo}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white',
                    )}
                  >
                    <Video className="h-4 w-4" />
                    {downloadingVideo ? 'Rendering video' : 'Download video'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    void toggleSavePage();
                  } else {
                    const redirectPath = `/birthday/${pageId}`;
                    const params = new URLSearchParams({
                      redirect: redirectPath,
                      save: '1',
                      page: pageId || '',
                    });
                    navigate(`/auth?${params.toString()}`);
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
                  user && isSaved
                    ? isDarkExperience
                      ? 'bg-emerald-500/90 text-white hover:bg-emerald-500'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : isDarkExperience
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-white/78 text-foreground hover:bg-white',
                )}
              >
                <Heart className={cn('h-4 w-4', user && isSaved ? 'fill-current' : '')} />
                {user ? (isSaved ? 'Saved' : 'Save to dashboard') : 'Save to my dashboard'}
              </button>
              </div>
            )}
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
              <div key={activeSlide.id} className={cn('h-full', slideDirection === 'back' ? 'animate-wrapped-slide-reverse' : 'animate-wrapped-slide')}>
                <div className={cn('relative h-full overflow-hidden rounded-[2rem] border p-3 shadow-[0_30px_90px_rgba(18,18,23,0.14)] sm:rounded-[2.4rem] sm:p-6 lg:p-8', experiencePanelClass)}>
                  <div className="pointer-events-none absolute inset-0">
                    <div className={cn('absolute -left-[10%] top-[10%] h-40 w-40 rounded-full blur-3xl sm:h-56 sm:w-56', isDarkExperience ? 'bg-white/8' : 'bg-white/55')} />
                    <div className={cn('absolute bottom-[-8%] right-[-4%] h-48 w-48 rounded-full blur-3xl sm:h-72 sm:w-72', isDarkExperience ? 'bg-primary/20' : 'bg-amber-200/55')} />
                    <div className={cn('absolute inset-0 opacity-70', isDarkExperience ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.04),transparent_45%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_34%),linear-gradient(145deg,rgba(255,246,236,0.76),transparent_45%)]')} />
                  </div>
                  <div aria-hidden="true" className="slide-stars-layer">
                    <div className="slide-star" style={{ left: '6%', '--star-x': '0%' } as React.CSSProperties} />
                    <div className="slide-star" style={{ left: '24%', '--star-x': '3%' } as React.CSSProperties} />
                    <div className="slide-star" style={{ left: '46%', '--star-x': '-2%' } as React.CSSProperties} />
                    <div className="slide-star" style={{ left: '68%', '--star-x': '4%' } as React.CSSProperties} />
                    <div className="slide-star" style={{ left: '86%', '--star-x': '-3%' } as React.CSSProperties} />
                  </div>

                  <div className="relative z-10 h-full">
                    {activeSlide.kind === 'cover' && (
                      <div className={cn('grid h-full gap-4 lg:items-start', coverPhotoSrc ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'lg:mx-auto lg:max-w-2xl')}>
                        <div className="flex h-full flex-col gap-4 lg:justify-center">
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

                        {coverPhotoSrc && (
                          <article className={cn('story-stage-reveal-soft relative overflow-hidden rounded-[1.7rem] border lg:h-full', keepsakeSoftClass)} style={getStoryDelayStyle(170, 760)}>
                            <button
                              type="button"
                              className="relative block h-full min-h-[16rem] w-full"
                              onClick={() => setExpandedPhoto({
                                url: coverPhotoSrc,
                                caption: `${page.recipient_name}'s birthday cover`,
                                senderName: 'Birthday page',
                              })}
                              aria-label={`Expand ${page.recipient_name}'s birthday cover`}
                            >
                              {renderStoryImage(coverPhotoSrc, `${page.recipient_name} birthday cover`, { disableParallax: true, eager: true })}
                              <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-white backdrop-blur-sm">
                                {coverHintLabel}
                              </span>
                            </button>
                          </article>
                        )}
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
                                    setPendingDeleteAction({
                                      kind: 'photo',
                                      photoId: photo.id,
                                      messageId: activeSlide.message.id,
                                      senderName: activeSlide.message.sender_name,
                                    });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </button>
                      );

                      let photoLayout: React.ReactNode = null;

                              <span className="absolute bottom-4 right-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-white backdrop-blur-sm">
                                {coverHintLabel}
                              </span>
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
                      } else if (photoCount === 4) {
                        photoLayout = (
                          <div className="grid grid-cols-2 grid-rows-2 gap-3 pt-7 sm:gap-4 sm:pt-8 lg:h-full lg:min-h-0">
                            {wishPhotos.map((photo) => renderPhotoCard(photo, 'h-full min-h-0', 'aspect-square'))}
                          </div>
                        );
                      } else if (photoCount === 5) {
                        photoLayout = (
                          <div className="grid grid-cols-2 gap-3 pt-7 sm:gap-4 sm:pt-8 lg:h-full lg:min-h-0 lg:grid-cols-3 lg:grid-rows-2">
                            {wishPhotos.map((photo, photoIndex) =>
                              renderPhotoCard(
                                photo,
                                photoIndex === 4 ? 'h-full min-h-0 lg:row-span-2' : 'h-full min-h-0',
                                photoIndex === 4 ? 'aspect-[4/5] lg:aspect-auto lg:h-full' : 'aspect-[4/5]',
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
                                    setPendingDeleteAction({
                                      kind: 'message',
                                      messageId: activeSlide.message.id,
                                      senderName: activeSlide.message.sender_name,
                                    });
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

                              {isRichHtml(activeSlide.message.message)
                                ? <div className={cn('wish-rich-text mt-4 text-lg leading-relaxed sm:mt-5 sm:text-[1.7rem] sm:leading-[1.45]', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(activeSlide.message.message) }} />
                                : <p className={cn('mt-4 text-lg leading-relaxed sm:mt-5 sm:text-[1.7rem] sm:leading-[1.45]', theme.text)}>
                                &quot;{activeSlide.message.message}&quot;
                              </p>}

                              {/* Stickers Rendering (Desktop) */}
                              {activeSlide.message.stickers && activeSlide.message.stickers.length > 0 && (
                                <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                                  {activeSlide.message.stickers.map((sticker) => (
                                    <div
                                      key={sticker.id}
                                      className="absolute select-none text-6xl"
                                      style={{
                                        left: `${sticker.position_x}%`,
                                        top: `${sticker.position_y}%`,
                                        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                                      }}
                                    >
                                      {STICKER_EMOJI_MAP[sticker.sticker_type] ?? sticker.sticker_type}
                                    </div>
                                  ))}
                                </div>
                              )}

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
                                      setPendingDeleteAction({
                                        kind: 'audio',
                                        messageId: activeSlide.message.id,
                                        senderName: activeSlide.message.sender_name,
                                      });
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
                            {contributorLine && (
                              <p className={cn('mt-3 text-sm leading-relaxed opacity-75', theme.text)}>
                                {contributorLine}.
                              </p>
                            )}
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
  );
};

export default BirthdayPage;
