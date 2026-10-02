import { useState, useRef, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Heart,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  Sparkles,
  Play,
  Pause,
  X,
  Gift,
  Music,
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

const BentoGridView: FC<BentoGridViewProps> = ({
  page,
  messages = [],
  theme,
  isDarkExperience,
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

  // Rhythmic card sizing variant based on card index
  function getCardVariant(index: number): 'wide' | 'tall' | 'normal' {
    if (isMobileSim) {
      // In mobile view: alternate between full width and half width
      return index % 3 === 0 ? 'wide' : 'normal';
    }
    const pattern = index % 6;
    if (pattern === 0) return 'wide';
    if (pattern === 3) return 'tall';
    return 'normal';
  }

  return (
    <>
      {/* Full-screen Spotlight Overlay Modal */}
      {expandedCard && (
        <button
          className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md transition-all duration-300 animate-fade-in"
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
                  <p className="mt-1 text-sm text-white/70">Shared by {expandedCard.senderName}</p>
                )}
              </div>
            </div>
          ) : expandedCard.message ? (
            <div
              className={cn(
                'relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[2.25rem] border p-6 sm:p-8 shadow-2xl transition-all duration-300',
                keepsakePaperClass,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header inside modal */}
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-black/10 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-900 dark:text-amber-300 font-bold text-base shadow-2xs">
                    {(expandedCard.message.sender_name || 'F')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className={cn('text-lg font-bold leading-tight', theme.titleClass, theme.font)}>
                      {expandedCard.message.sender_name}
                    </h3>
                    <p className={cn('text-[10px] font-semibold uppercase tracking-widest opacity-60', theme.text)}>
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
                  className="rounded-full p-2 text-stone-400 hover:text-stone-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Wish Message text */}
              <div className={cn('text-base sm:text-lg leading-relaxed font-serif', theme.text)}>
                {isRichHtml(expandedCard.message.message) ? (
                  <div
                    className="wish-rich-text"
                    dangerouslySetInnerHTML={{ __html: sanitizeWishHtmlForDisplay(expandedCard.message.message) }}
                  />
                ) : (
                  <p>&quot;{expandedCard.message.message}&quot;</p>
                )}
              </div>

              {/* Stickers */}
              {expandedCard.message.stickers && expandedCard.message.stickers.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2 pt-3 border-t border-black/5 dark:border-white/10">
                  {expandedCard.message.stickers.map((s) => (
                    <span key={s.id} className="text-2xl drop-shadow-xs">
                      {STICKER_EMOJI_MAP[s.sticker_type] ?? s.sticker_type}
                    </span>
                  ))}
                </div>
              )}

              {/* Photo Gallery Grid */}
              {getMessagePhotos(expandedCard.message).length > 0 && (
                <div className="mt-6 space-y-3 pt-3 border-t border-black/5 dark:border-white/10">
                  <p className={cn('text-xs font-semibold uppercase tracking-wider opacity-60', theme.text)}>
                    Photos Shared ({getMessagePhotos(expandedCard.message).length})
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {getMessagePhotos(expandedCard.message).map((photo) => {
                      const url = resolveAssetUrl(photo.photo_url);
                      return url ? (
                        <div key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl border border-white/20 shadow-xs">
                          <img
                            src={url}
                            alt={photo.caption || 'Photo'}
                            className="h-full w-full object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-[11px] text-white">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Voice Note Player inside modal */}
              {expandedCard.message.audio_url && (
                <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('text-xs font-bold uppercase tracking-wider flex items-center gap-1.5', theme.text)}>
                      <Mic className="h-3.5 w-3.5 text-amber-500" />
                      Voice Wish
                    </span>
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
      <div className="mx-auto w-full max-w-6xl px-2 xs:px-3 sm:px-5">
        
        {/* Bento Header */}
        <div className="mb-5 sm:mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>
                Bento Vault
              </p>
            </div>
            <h1 className={cn('mt-1.5 text-2xl sm:text-4xl font-bold tracking-tight', theme.titleClass, theme.font)}>
              {page.recipient_name}&apos;s celebration board
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium opacity-70">
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 border border-black/5 dark:border-white/10">
              {messages.length} wishes
            </span>
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 border border-black/5 dark:border-white/10">
              {totalPhotos} photos
            </span>
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 border border-black/5 dark:border-white/10">
              {totalAudio} voice clips
            </span>
          </div>
        </div>

        {/* The Responsive Bento Grid Container */}
        <div
          className={cn(
            'grid gap-3 sm:gap-4.5',
            isMobileSim
              ? 'grid-cols-2 auto-rows-[minmax(9.5rem,auto)]'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(11rem,auto)]'
          )}
        >
          {/* TILE 1: Cover Hero Card (Spans 2 cols, 2 rows) */}
          <div
            className={cn(
              'group relative col-span-2 row-span-2 overflow-hidden rounded-[2rem] border shadow-[0_18px_50px_rgba(15,23,42,0.15)] transition-all duration-300 hover:shadow-2xl',
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white flex flex-col justify-end">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 border border-white/30 text-[10px] font-bold uppercase tracking-widest text-amber-200 w-fit mb-2">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>Milestone Honoree</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold leading-tight drop-shadow-md font-serif">
                    Happy Birthday,
                    <br />
                    {page.recipient_name}.
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-white/85 font-medium">
                    {birthDateFormatted}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 p-6 text-center bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-amber-500/15">
                <div className="h-16 w-16 rounded-3xl bg-amber-500/15 flex items-center justify-center text-3xl shadow-sm border border-amber-300/40">
                  🎂
                </div>
                <div>
                  <p className={cn('text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-1')}>Milestone Celebration</p>
                  <h2 className={cn('text-2xl sm:text-3xl font-bold leading-tight', theme.titleClass, theme.font)}>
                    Happy Birthday,
                    <br />
                    {page.recipient_name}!
                  </h2>
                </div>
                <p className={cn('text-xs opacity-70 font-medium', theme.text)}>{birthDateFormatted}</p>
              </div>
            )}
          </div>

          {/* TILE 2: Collected Wishes Metric */}
          <div
            className={cn(
              'col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-[1.8rem] border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-1',
              keepsakeSoftClass,
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn('text-[10px] font-bold uppercase tracking-[0.2em] opacity-60', theme.text)}>
                Collected
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs">
                ❤️
              </span>
            </div>
            <div>
              <p className={cn('text-3xl sm:text-4xl font-extrabold leading-none', theme.titleClass, theme.font)}>
                {messages.length}
              </p>
              <p className={cn('mt-1 text-xs opacity-70 font-medium', theme.text)}>wishes pinned</p>
            </div>
          </div>

          {/* TILE 3: Photos & Voice Multimedia Metric */}
          <div
            className={cn(
              'col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-[1.8rem] border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-1',
              keepsakeSoftClass,
            )}
          >
            <span className={cn('text-[10px] font-bold uppercase tracking-[0.2em] opacity-60', theme.text)}>
              Moments Vault
            </span>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className={cn('h-3.5 w-3.5 opacity-60', theme.text)} />
                <span className={cn('text-xs font-bold', theme.text)}>{totalPhotos} photos</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic className={cn('h-3.5 w-3.5 text-rose-500', theme.text)} />
                <span className={cn('text-xs font-bold', theme.text)}>{totalAudio} voice clips</span>
              </div>
            </div>
          </div>

          {/* TILE 4: Organizer Dedication Note (if present) */}
          {page.creator_message && (
            <div
              className={cn(
                'col-span-2 row-span-1 flex flex-col justify-between overflow-hidden rounded-[1.8rem] border p-5 shadow-xs transition-all duration-200 hover:-translate-y-1',
                keepsakePaperClass,
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5', theme.text)}>
                  <Quote className="h-3 w-3 text-amber-500" />
                  Organizer Dedication
                </span>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60">
                  From the heart
                </span>
              </div>
              <p className={cn('mt-2 line-clamp-2 text-xs sm:text-sm leading-relaxed italic opacity-85 font-serif', theme.text)}>
                &quot;{page.creator_message}&quot;
              </p>
            </div>
          )}

          {/* EMPTY STATE TILE when no wishes are pinned yet */}
          {messages.length === 0 && (
            <div
              className={cn(
                'col-span-2 sm:col-span-2 row-span-1 flex flex-col items-center justify-center p-6 rounded-[1.8rem] border border-dashed border-stone-300 dark:border-white/20 text-center',
                keepsakeSoftClass,
              )}
            >
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-xl mb-2">
                ✨
              </div>
              <p className={cn('text-sm font-bold', theme.text)}>Awaiting first wishes</p>
              <p className={cn('text-xs opacity-65 max-w-xs mt-1', theme.text)}>
                Share your invite link to collect messages, photos, and voice notes here.
              </p>
            </div>
          )}

          {/* WISH CARDS GRID */}
          {messages.map((message, index) => {
            const photos = getMessagePhotos(message);
            const firstPhoto = photos[0] ? resolveAssetUrl(photos[0].photo_url) : null;
            const variant = getCardVariant(index);
            const preview = renderMessagePreview(message.message);
            const isPlayingThisAudio = playingAudioId === message.id;
            const stickerEmojis = (message.stickers ?? []).map(
              (s) => STICKER_EMOJI_MAP[s.sticker_type] ?? s.sticker_type,
            );
            const isTextOnly = photos.length === 0 && !message.audio_url;

            return (
              <div
                key={message.id}
                onClick={() => setExpandedCard({ message })}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-[1.8rem] border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.18)] flex flex-col justify-between',
                  keepsakePaperClass,
                  variant === 'wide' && 'col-span-2 row-span-1',
                  variant === 'tall' && 'col-span-1 row-span-2',
                  variant === 'normal' && 'col-span-1 row-span-1',
                )}
              >
                {/* Photo Background if available for non-normal or photo-first card */}
                {firstPhoto && (variant !== 'normal' || photos.length > 0) && (
                  <div className="absolute inset-0 pointer-events-none">
                    <img
                      src={firstPhoto}
                      alt=""
                      className="h-full w-full object-cover opacity-25 dark:opacity-40 transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent" />
                  </div>
                )}

                {/* Card Header & Sender */}
                <div className="relative z-10 p-4 sm:p-5 pb-0">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-black/5 dark:bg-white/15 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {(message.sender_name || 'F')[0].toUpperCase()}
                      </div>
                      <p className={cn('text-xs font-bold truncate leading-tight', theme.titleClass, theme.font)}>
                        {message.sender_name}
                      </p>
                    </div>

                    {stickerEmojis.length > 0 && (
                      <span className="text-sm shrink-0 drop-shadow-xs">
                        {stickerEmojis[0]}
                      </span>
                    )}
                  </div>

                  {/* Message Preview Snippet */}
                  <p className={cn('mt-2 line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm leading-relaxed font-serif opacity-80', theme.text)}>
                    &quot;{preview}&quot;
                  </p>
                </div>

                {/* Card Footer: Audio quick-play & Badges */}
                <div className="relative z-10 p-4 sm:p-5 pt-3 mt-auto">
                  
                  {/* Inline Audio Quick-Play Pill */}
                  {message.audio_url && (
                    <button
                      type="button"
                      onClick={(e) => toggleAudioPlayback(e, message.id, message.audio_url!)}
                      className={cn(
                        'mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shadow-2xs w-fit active:scale-95',
                        isPlayingThisAudio
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-black/8 dark:bg-white/15 text-foreground hover:bg-black/12 dark:hover:bg-white/20'
                      )}
                      title={isPlayingThisAudio ? 'Pause voice note' : 'Play voice note'}
                    >
                      {isPlayingThisAudio ? (
                        <>
                          <Pause className="h-3 w-3 fill-current" />
                          <span>Playing</span>
                          <span className="flex items-center gap-0.5 ml-1">
                            <span className="h-2 w-0.5 bg-white animate-pulse" />
                            <span className="h-3 w-0.5 bg-white animate-pulse delay-75" />
                            <span className="h-1.5 w-0.5 bg-white animate-pulse delay-150" />
                          </span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>Voice Note</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Metadata Chips */}
                  <div className="flex items-center justify-between text-[10px] opacity-60">
                    <div className="flex items-center gap-1.5">
                      {photos.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-2.5 w-2.5" />
                          {photos.length}
                        </span>
                      )}
                      {photos.length > 0 && message.audio_url && <span>·</span>}
                      {message.audio_url && (
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-2.5 w-2.5" />
                          voice
                        </span>
                      )}
                    </div>
                    <span className="group-hover:translate-x-0.5 transition-transform text-[10px] font-medium">
                      Open ↗
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
                'col-span-2 row-span-1 flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-6 text-center shadow-xs transition-all duration-200 hover:-translate-y-1',
                keepsakePaperClass,
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-2">
                <Heart className="h-5 w-5 fill-rose-500/30" />
              </div>
              <p className={cn('text-base sm:text-lg font-bold font-serif', theme.titleClass, theme.font)}>
                Happy Birthday, {page.recipient_name}.
              </p>
              <p className={cn('mt-1 text-xs opacity-70 font-medium max-w-sm', theme.text)}>
                Every photo, voice note, and wish was gathered with love.
              </p>
              <div className="mt-3.5">
                <Link to="/create">
                  <Button size="sm" className="h-8 gap-1.5 rounded-xl text-xs shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
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
