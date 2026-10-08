import { useState, useRef, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Heart,
  Image as ImageIcon,
  Mic,
  Sparkles,
  Play,
  Pause,
  X,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/api';
import { isRichHtml, stripHtml, sanitizeWishHtmlForDisplay } from '@/lib/wish-utils';

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

interface BirthdayPageData {
  recipient_name: string;
  birthday_date: string;
  cover_photo_url: string | null;
  creator_message: string | null;
  theme: string;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
}

interface ThemeConfig {
  text: string;
  titleClass: string;
  font: string;
  cardClass?: string;
}

interface ExpandedCard {
  url?: string | null;
  message?: Message | null;
  caption?: string | null;
  senderName?: string | null;
}

interface BentoGridViewProps {
  page: BirthdayPageData;
  messages: Message[];
  theme: ThemeConfig;
  isDarkExperience: boolean;
  keepsakePaperClass: string;
  keepsakeSoftClass: string;
  birthdayDate: Date | null;
  isMobileSim?: boolean;
}

function getMessagePhotos(message: Message): MessagePhoto[] {
  if (message.photos && message.photos.length > 0) {
    return message.photos;
  }
  if (message.photo_url) {
    return [{ id: 'legacy', photo_url: message.photo_url, caption: null, sort_order: 0 }];
  }
  return [];
}

function getSenderInitials(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'W';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const BentoGridView: FC<BentoGridViewProps> = ({
  page,
  messages = [],
  theme,
  keepsakePaperClass,
  keepsakeSoftClass,
  birthdayDate,
  isMobileSim = false,
}) => {
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const birthDateFormatted = birthdayDate ? format(birthdayDate, 'MMMM d, yyyy') : page.birthday_date;
  const totalPhotos = messages.reduce((acc, msg) => acc + getMessagePhotos(msg).length, 0);
  const totalAudio = messages.filter((m) => Boolean(m.audio_url)).length;
  const coverPhotoSrc = page.cover_photo_url ? resolveAssetUrl(page.cover_photo_url) : null;

  function renderMessagePreview(message: string) {
    if (isRichHtml(message)) return stripHtml(message);
    return message;
  }

  function toggleAudioPlayback(e: React.MouseEvent, messageId: string, audioUrl: string) {
    e.stopPropagation();
    const resolvedUrl = resolveAssetUrl(audioUrl) || audioUrl;

    if (playingAudioId === messageId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(resolvedUrl);
    audioPlayerRef.current = audio;
    setPlayingAudioId(messageId);

    audio.play().catch((err) => {
      console.warn('Playback blocked or failed', err);
      setPlayingAudioId(null);
    });

    audio.onended = () => {
      setPlayingAudioId(null);
    };
  }

  function getCardVariant(index: number, hasPhotos: boolean): 'wide' | 'tall' | 'normal' {
    if (isMobileSim) {
      return hasPhotos || index % 3 === 0 ? 'wide' : 'normal';
    }
    const pattern = index % 5;
    if (pattern === 0) return 'wide';
    if (pattern === 2 && hasPhotos) return 'tall';
    return 'normal';
  }

  return (
    <>
      {/* Full-screen Spotlight Overlay Modal */}
      {expandedCard && (
        <button
          className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md transition-all duration-300 animate-fade-in"
          onClick={() => {
            if (audioPlayerRef.current) audioPlayerRef.current.pause();
            setPlayingAudioId(null);
            setExpandedCard(null);
          }}
          type="button"
          aria-label="Close expanded card"
        >
          {expandedCard.url ? (
            <div className="max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <img
                src={expandedCard.url}
                alt={expandedCard.caption || 'Photo memory'}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <div className="mt-4 text-center text-white">
                {expandedCard.caption && <p className="text-base font-medium">{expandedCard.caption}</p>}
                {expandedCard.senderName && (
                  <p className="mt-1 text-sm text-white/80">Shared by {expandedCard.senderName}</p>
                )}
              </div>
            </div>
          ) : expandedCard.message ? (
            <div
              className={cn(
                'relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[2.25rem] border p-6 sm:p-8 shadow-2xl transition-all duration-300 text-left',
                keepsakePaperClass,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header inside modal */}
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-stone-200 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-950 dark:text-amber-200 font-bold text-sm shadow-2xs border border-amber-300/40">
                    {getSenderInitials(expandedCard.message.sender_name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn('text-lg font-bold leading-tight truncate text-slate-950 dark:text-white', theme.font)}>
                      {expandedCard.message.sender_name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300">
                      Birthday Wish
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (audioPlayerRef.current) audioPlayerRef.current.pause();
                    setPlayingAudioId(null);
                    setExpandedCard(null);
                  }}
                  className="rounded-full p-2 text-stone-500 hover:text-stone-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Wish Message text */}
              <div className={cn('text-base sm:text-lg leading-relaxed font-serif text-slate-900 dark:text-slate-100 break-words', theme.text)}>
                {isRichHtml(expandedCard.message.message) ? (
                  <div
                    className="wish-rich-text"
                    dangerouslySetInnerHTML={{ __html: sanitizeWishHtmlForDisplay(expandedCard.message.message) }}
                  />
                ) : (
                  <p>&quot;{expandedCard.message.message}&quot;</p>
                )}
              </div>

              {/* Photos inside modal if present */}
              {getMessagePhotos(expandedCard.message).length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {getMessagePhotos(expandedCard.message).map((p, idx) => (
                    <img
                      key={p.id || idx}
                      src={resolveAssetUrl(p.photo_url) || p.photo_url}
                      alt={p.caption || 'Memory'}
                      className="rounded-xl object-cover w-full aspect-[4/3] border border-stone-200 dark:border-white/10"
                    />
                  ))}
                </div>
              )}

              {/* Voice Note player if present */}
              {expandedCard.message.audio_url && (
                <div className="mt-5 rounded-2xl border border-stone-200 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3.5">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-rose-600">
                    <Mic className="h-4 w-4" />
                    <span>Voice Note Message</span>
                  </div>
                  <audio
                    src={resolveAssetUrl(expandedCard.message.audio_url) || expandedCard.message.audio_url}
                    controls
                    className="w-full rounded-xl"
                  />
                </div>
              )}
            </div>
          ) : null}
        </button>
      )}

      {/* Main Bento Arena */}
      <div className="mx-auto w-full max-w-6xl px-2.5 xs:px-3.5 sm:px-6">
        
        {/* Bento Header */}
        <div className="mb-5 sm:mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-stone-700 dark:text-stone-300">
                Celebration Bento
              </p>
            </div>
            <h1 className={cn('mt-1.5 text-2xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white', theme.titleClass, theme.font)}>
              {page.recipient_name}&apos;s Memories
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 border border-stone-300 dark:border-white/15 text-slate-900 dark:text-white shadow-xs">
              {messages.length} wishes
            </span>
            <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 border border-stone-300 dark:border-white/15 text-slate-900 dark:text-white shadow-xs">
              {totalPhotos} photos
            </span>
            <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 border border-stone-300 dark:border-white/15 text-slate-900 dark:text-white shadow-xs">
              {totalAudio} voice notes
            </span>
          </div>
        </div>

        {/* Responsive Bento Grid Container */}
        <div
          className={cn(
            'grid gap-3.5 sm:gap-4.5',
            isMobileSim
              ? 'grid-cols-1 xs:grid-cols-2 auto-rows-auto'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-auto'
          )}
        >
          {/* TILE 1: Cover Hero Card */}
          <div
            className={cn(
              'group relative col-span-1 xs:col-span-2 row-span-2 overflow-hidden rounded-[2rem] border shadow-card transition-all duration-300 hover:shadow-2xl',
              keepsakePaperClass,
            )}
          >
            {coverPhotoSrc ? (
              <>
                <img
                  src={coverPhotoSrc}
                  alt={`${page.recipient_name}'s birthday`}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white flex flex-col justify-end">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-md px-3 py-1 border border-white/35 text-[10px] font-bold uppercase tracking-widest text-amber-200 w-fit mb-2.5">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>Birthday Honoree</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold leading-tight drop-shadow-md font-serif text-white">
                    Happy Birthday,
                    <br />
                    {page.recipient_name}.
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-white/95 font-semibold">
                    {birthDateFormatted}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-6 sm:p-8 text-center bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-amber-500/20">
                <div className="h-16 w-16 rounded-3xl bg-amber-500/20 flex items-center justify-center text-3xl shadow-sm border border-amber-300">
                  🎂
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-900 dark:text-amber-200 mb-1">
                    Celebration Keepsake
                  </p>
                  <h2 className={cn('text-2xl sm:text-3xl font-bold leading-tight text-slate-950 dark:text-white', theme.font)}>
                    Happy Birthday,
                    <br />
                    {page.recipient_name}!
                  </h2>
                </div>
                <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{birthDateFormatted}</p>
              </div>
            )}
          </div>

          {/* TILE 2: Collected Wishes Metric */}
          <div
            className={cn(
              'col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-[1.8rem] border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5',
              keepsakeSoftClass,
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-700 dark:text-stone-300">
                Wishes Collected
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                ❤️
              </span>
            </div>
            <div className="mt-3">
              <p className={cn('text-3xl sm:text-4xl font-extrabold leading-none text-slate-950 dark:text-white', theme.font)}>
                {messages.length}
              </p>
              <p className="mt-1 text-xs font-bold text-stone-600 dark:text-stone-300">heartfelt letters</p>
            </div>
          </div>

          {/* TILE 3: Media Vault Metric */}
          <div
            className={cn(
              'col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-[1.8rem] border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5',
              keepsakeSoftClass,
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-700 dark:text-stone-300">
              Media Keepsakes
            </span>
            <div className="space-y-2.5 mt-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{totalPhotos} photos preserved</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{totalAudio} voice recordings</span>
              </div>
            </div>
          </div>

          {/* TILE 4: Organizer Dedication Note (if present) */}
          {page.creator_message && (
            <div
              className={cn(
                'col-span-1 xs:col-span-2 row-span-1 flex flex-col justify-between overflow-hidden rounded-[1.8rem] border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5',
                keepsakePaperClass,
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Quote className="h-3 w-3 text-amber-600" />
                  Organizer Dedication
                </span>
                <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300">
                  From the heart
                </span>
              </div>
              <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed italic text-stone-800 dark:text-stone-200 font-serif font-medium break-words">
                &quot;{page.creator_message}&quot;
              </p>
            </div>
          )}

          {/* WISH CARDS GRID */}
          {messages.map((message, index) => {
            const photos = getMessagePhotos(message);
            const firstPhoto = photos[0] ? resolveAssetUrl(photos[0].photo_url) : null;
            const hasPhotos = photos.length > 0;
            const variant = getCardVariant(index, hasPhotos);
            const preview = renderMessagePreview(message.message);
            const isPlayingThisAudio = playingAudioId === message.id;
            const stickerEmojis = (message.stickers ?? []).map(
              (s) => STICKER_EMOJI_MAP[s.sticker_type] ?? s.sticker_type,
            );
            const initials = getSenderInitials(message.sender_name);

            return (
              <div
                key={message.id}
                onClick={() => setExpandedCard({ message })}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-[1.8rem] border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between border-stone-200/90 dark:border-white/15',
                  keepsakePaperClass,
                  variant === 'wide' && 'col-span-1 xs:col-span-2',
                  variant === 'tall' && 'col-span-1 row-span-2',
                  variant === 'normal' && 'col-span-1',
                )}
              >
                {/* Photo Thumbnail Strip when photos exist */}
                {firstPhoto && (
                  <div className="relative w-full aspect-[16/9] overflow-hidden bg-stone-100 dark:bg-slate-900 border-b border-stone-200/80 dark:border-white/10">
                    <img
                      src={firstPhoto}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {photos.length > 1 && (
                      <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
                        +{photos.length - 1} photos
                      </span>
                    )}
                  </div>
                )}

                {/* Card Content & Sender */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center shrink-0 border border-amber-300/40">
                          {initials}
                        </div>
                        <p className={cn('text-xs font-bold truncate text-slate-950 dark:text-white', theme.font)}>
                          {message.sender_name}
                        </p>
                      </div>

                      {stickerEmojis.length > 0 && (
                        <span className="text-base shrink-0 drop-shadow-xs">
                          {stickerEmojis[0]}
                        </span>
                      )}
                    </div>

                    {/* Preview Snippet with high contrast text */}
                    <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed font-serif text-stone-800 dark:text-stone-200 font-medium break-words">
                      &quot;{preview}&quot;
                    </p>
                  </div>

                  {/* Card Actions & Footer */}
                  <div className="pt-3 mt-3 border-t border-stone-200/70 dark:border-white/10 flex items-center justify-between text-xs">
                    {message.audio_url ? (
                      <button
                        type="button"
                        onClick={(e) => toggleAudioPlayback(e, message.id, message.audio_url!)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 shadow-xs',
                          isPlayingThisAudio
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-rose-500 text-white hover:bg-rose-600'
                        )}
                        title={isPlayingThisAudio ? 'Pause voice note' : 'Play voice note'}
                      >
                        {isPlayingThisAudio ? (
                          <>
                            <Pause className="h-3 w-3 fill-current" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-current" />
                            <span>Voice Note</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Wish card
                      </span>
                    )}

                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 group-hover:underline">
                      Open &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* TILE 5: Closing Celebration Heart Card */}
          {messages.length > 0 && (
            <div
              className={cn(
                'col-span-1 xs:col-span-2 row-span-1 flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-6 text-center shadow-xs transition-all duration-200 hover:-translate-y-0.5',
                keepsakePaperClass,
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 mb-2">
                <Heart className="h-5 w-5 fill-rose-500/40" />
              </div>
              <p className={cn('text-base sm:text-lg font-bold font-serif text-slate-950 dark:text-white', theme.font)}>
                Happy Birthday, {page.recipient_name}.
              </p>
              <p className="mt-1 text-xs text-stone-700 dark:text-stone-300 font-semibold max-w-sm">
                Every photo, voice note, and wish was gathered with love.
              </p>
              <div className="mt-3.5">
                <Link to="/create">
                  <Button size="sm" className="h-9 gap-1.5 rounded-xl text-xs font-bold shadow-sm bg-slate-950 text-white hover:bg-slate-900">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Create a WishCanvas</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default BentoGridView;
