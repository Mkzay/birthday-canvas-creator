import React, { useState } from 'react';
import { format } from 'date-fns';
import { Heart, Image as ImageIcon, Mic, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/api';
import { isRichHtml, stripHtml } from '@/lib/wish-utils';

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

const BentoGridView: React.FC<BentoGridViewProps> = ({
  page,
  messages,
  theme,
  isDarkExperience,
  keepsakePaperClass,
  keepsakeSoftClass,
  birthdayDate,
}) => {
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null);
  const birthDateFormatted = birthdayDate ? format(birthdayDate, 'MMMM d, yyyy') : page.birthday_date;

  const totalPhotos = messages.reduce((acc, msg) => acc + getMessagePhotos(msg).length, 0);
  const totalAudio = messages.filter((m) => m.audio_url).length;
  const coverPhotoSrc = page.cover_photo_url ? resolveAssetUrl(page.cover_photo_url) : null;

  function renderMessagePreview(message: string) {
    if (isRichHtml(message)) return stripHtml(message);
    return message;
  }

  // Decide card size variant based on index for visual rhythm
  function getCardVariant(index: number): string {
    const pattern = index % 7;
    if (pattern === 0) return 'wide';
    if (pattern === 3) return 'tall';
    return 'normal';
  }

  return (
    <>
      {/* Full-screen expanded overlay */}
      {expandedCard && (
        <button
          className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setExpandedCard(null)}
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
                'relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border p-7',
                keepsakePaperClass,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-60', theme.text)}>
                Birthday wish
              </p>
              <h2 className={cn('mt-3 text-2xl font-bold leading-tight', theme.titleClass, theme.font)}>
                {expandedCard.message.sender_name}
              </h2>
              <p className={cn('mt-4 text-base leading-relaxed', theme.text)}>
                &quot;{renderMessagePreview(expandedCard.message.message)}&quot;
              </p>

              {expandedCard.message.stickers && expandedCard.message.stickers.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {expandedCard.message.stickers.map((s) => (
                    <span key={s.id} className="text-2xl">
                      {STICKER_EMOJI_MAP[s.sticker_type] ?? s.sticker_type}
                    </span>
                  ))}
                </div>
              )}

              {getMessagePhotos(expandedCard.message).length > 0 && (
                <div className="mt-5 grid gap-3">
                  {getMessagePhotos(expandedCard.message).map((photo) => {
                    const url = resolveAssetUrl(photo.photo_url);
                    return url ? (
                      <img
                        key={photo.id}
                        src={url}
                        alt={photo.caption || 'Photo'}
                        className="w-full rounded-xl object-cover"
                      />
                    ) : null;
                  })}
                </div>
              )}

              {expandedCard.message.audio_url && (
                <div className="mt-5">
                  <p className={cn('mb-2 text-sm font-semibold', theme.text)}>Voice note</p>
                  <audio
                    src={resolveAssetUrl(expandedCard.message.audio_url) || expandedCard.message.audio_url}
                    controls
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ) : null}
        </button>
      )}

      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        {/* Page header */}
        <div className="mb-6">
          <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-60', theme.text)}>
            Bento view
          </p>
          <h1 className={cn('mt-2 text-2xl font-bold sm:text-3xl', theme.titleClass, theme.font)}>
            {page.recipient_name}&apos;s birthday story
          </h1>
        </div>

        {/* Bento grid */}
        <div className="grid auto-rows-[12rem] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">

          {/* Cover photo card — always first, 2×2 */}
          <div
            className={cn(
              'relative col-span-2 row-span-2 overflow-hidden rounded-[1.8rem] border shadow-[0_18px_50px_rgba(15,23,42,0.15)]',
              keepsakePaperClass,
            )}
          >
            {coverPhotoSrc ? (
              <>
                <img
                  src={coverPhotoSrc}
                  alt={`${page.recipient_name}'s birthday`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Birthday keepsake</p>
                  <p className="mt-1 text-xl font-bold leading-tight">
                    Happy Birthday, {page.recipient_name}.
                  </p>
                  <p className="mt-1 text-sm text-white/80">{birthDateFormatted}</p>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <Sparkles className={cn('h-10 w-10 opacity-40', theme.text)} />
                <div>
                  <p className={cn('text-xl font-bold', theme.titleClass, theme.font)}>Happy Birthday,</p>
                  <p className={cn('text-2xl font-bold', theme.titleClass, theme.font)}>{page.recipient_name}.</p>
                </div>
                <p className={cn('text-sm opacity-60', theme.text)}>{birthDateFormatted}</p>
              </div>
            )}
          </div>

          {/* Stats card */}
          <div className={cn('col-span-1 row-span-1 overflow-hidden rounded-[1.5rem] border p-4', keepsakeSoftClass)}>
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60', theme.text)}>
              Collected
            </p>
            <p className={cn('mt-3 text-4xl font-bold leading-none', theme.titleClass, theme.font)}>
              {messages.length}
            </p>
            <p className={cn('mt-1 text-sm opacity-70', theme.text)}>wishes</p>
          </div>

          {/* Photos / voice stats */}
          <div className={cn('col-span-1 row-span-1 overflow-hidden rounded-[1.5rem] border p-4', keepsakeSoftClass)}>
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className={cn('h-4 w-4 opacity-50', theme.text)} />
                <p className={cn('text-xs font-semibold opacity-60', theme.text)}>{totalPhotos} photos</p>
              </div>
              <div className="flex items-center gap-2">
                <Mic className={cn('h-4 w-4 opacity-50', theme.text)} />
                <p className={cn('text-xs font-semibold opacity-60', theme.text)}>{totalAudio} voice notes</p>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className={cn('h-4 w-4 opacity-50', theme.text)} />
                <p className={cn('text-xs font-semibold opacity-60', theme.text)}>{messages.length} messages</p>
              </div>
            </div>
          </div>

          {/* Organizer note — if present */}
          {page.creator_message && (
            <div
              className={cn(
                'col-span-2 row-span-1 flex flex-col justify-center overflow-hidden rounded-[1.5rem] border p-5 sm:col-span-1',
                keepsakePaperClass,
              )}
            >
              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55', theme.text)}>
                Organizer note
              </p>
              <p className={cn('mt-2 line-clamp-3 text-sm leading-relaxed italic opacity-80', theme.text)}>
                &quot;{page.creator_message}&quot;
              </p>
            </div>
          )}

          {/* Wish cards */}
          {messages.map((message, index) => {
            const photos = getMessagePhotos(message);
            const firstPhoto = photos[0] ? resolveAssetUrl(photos[0].photo_url) : null;
            const variant = getCardVariant(index);
            const preview = renderMessagePreview(message.message);
            const stickerEmojis = (message.stickers ?? []).map(
              (s) => STICKER_EMOJI_MAP[s.sticker_type] ?? s.sticker_type,
            );
            const isTextOnly = photos.length === 0 && !message.audio_url;

            return (
              <button
                key={message.id}
                type="button"
                onClick={() => setExpandedCard({ message })}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-[1.5rem] border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.18)]',
                  keepsakePaperClass,
                  variant === 'wide' && 'col-span-2 row-span-1',
                  variant === 'tall' && 'col-span-1 row-span-2',
                  variant === 'normal' && 'col-span-1 row-span-1',
                  isTextOnly && 'text-center'
                )}
              >
                {/* Photo background if available and card is tall or wide */}
                {firstPhoto && variant !== 'normal' && (
                  <>
                    <img
                      src={firstPhoto}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-300 group-hover:opacity-55"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </>
                )}

                {/* Card content */}
                <div className={cn('relative z-10 flex h-full flex-col p-4', firstPhoto && variant !== 'normal' ? 'justify-end text-white' : '', isTextOnly && 'items-center justify-center')}>
                  <p
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-[0.18em]',
                      firstPhoto && variant !== 'normal' ? 'text-white/70' : cn('opacity-55', theme.text),
                    )}
                  >
                    Wish {index + 1}
                  </p>
                  <p
                    className={cn(
                      'mt-1 font-bold leading-tight',
                      variant === 'tall' ? 'text-lg' : 'text-sm',
                      firstPhoto && variant !== 'normal' ? 'text-white' : cn(theme.titleClass, theme.font),
                    )}
                  >
                    {message.sender_name}
                  </p>
                  {variant !== 'normal' && (
                    <p
                      className={cn(
                        'mt-1.5 line-clamp-3 text-xs leading-relaxed',
                        firstPhoto && variant !== 'normal' ? 'text-white/80' : cn('opacity-70', theme.text),
                      )}
                    >
                      {preview.slice(0, 120)}{preview.length > 120 ? '…' : ''}
                    </p>
                  )}

                  {/* Badges row */}
                  <div className={cn("mt-auto flex flex-wrap items-center gap-1.5 pt-2", isTextOnly && "justify-center")}>
                    {stickerEmojis.length > 0 && (
                      <span className="text-sm">{stickerEmojis.slice(0, 3).join(' ')}</span>
                    )}
                    {photos.length > 0 && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          firstPhoto && variant !== 'normal'
                            ? 'bg-white/20 text-white'
                            : isDarkExperience
                            ? 'bg-white/12 text-white/80'
                            : 'bg-black/8 text-foreground/70',
                        )}
                      >
                        <ImageIcon className="h-2.5 w-2.5" />
                        {photos.length}
                      </span>
                    )}
                    {message.audio_url && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          firstPhoto && variant !== 'normal'
                            ? 'bg-white/20 text-white'
                            : isDarkExperience
                            ? 'bg-white/12 text-white/80'
                            : 'bg-black/8 text-foreground/70',
                        )}
                      >
                        <Mic className="h-2.5 w-2.5" />
                        voice
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnail for normal-size cards with photo */}
                {firstPhoto && variant === 'normal' && (
                  <div className="absolute right-3 top-3 h-10 w-10 overflow-hidden rounded-xl">
                    <img src={firstPhoto} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Closing card */}
          {messages.length > 0 && (
            <div
              className={cn(
                'col-span-2 row-span-1 flex flex-col items-center justify-center overflow-hidden rounded-[1.8rem] border p-5 text-center',
                keepsakePaperClass,
              )}
            >
              <Heart className={cn('h-7 w-7 opacity-50', theme.text)} />
              <p className={cn('mt-3 text-base font-bold', theme.titleClass, theme.font)}>
                Happy birthday, {page.recipient_name}.
              </p>
              <p className={cn('mt-1.5 text-xs leading-relaxed opacity-65', theme.text)}>
                You were worth gathering all of this for.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BentoGridView;
