import { useMemo, type FC } from 'react';
import {
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Gift,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isRichHtml, sanitizeWishHtmlForDisplay } from '@/lib/wish-utils';
import { visualThemeConfig, fontClassMap } from '@/lib/themes';
import type { PendingPhoto } from './types';
import type { StickerData } from '@/components/StickerPicker';

const STICKER_EMOJIS: Record<string, string> = {
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

export interface ContributorWishPreviewProps {
  recipientName: string;
  senderName: string;
  message: string;
  selectedPhotos: PendingPhoto[];
  wishAudioPreviewUrl: string | null;
  recordingDuration?: number;
  isRecording?: boolean;
  stickers: StickerData[];
  poolAmountNaira?: string;
  poolFundraisingEnabled?: boolean;
  pageTheme?: string;
  themeKey?: string;
  customGradient?: {
    from: string;
    to: string;
    mid?: string | null;
    angle?: number;
  };
  themeGradientFrom?: string | null;
  themeGradientTo?: string | null;
  themeGradientMid?: string | null;
  themeGradientAngle?: number | null;
  themeEmoji?: string | null;
  themeFont?: string | null;
  displayMode?: string | null;
  letterTheme?: string | null;
  coverPhotoUrl?: string | null;
  className?: string;
}

export const ContributorWishPreview: FC<ContributorWishPreviewProps> = ({
  recipientName,
  senderName,
  message,
  selectedPhotos,
  wishAudioPreviewUrl,
  recordingDuration = 0,
  isRecording = false,
  stickers,
  poolAmountNaira,
  pageTheme,
  themeKey,
  customGradient,
  themeGradientFrom,
  themeGradientTo,
  themeGradientMid,
  themeGradientAngle = 135,
  themeFont,
  className,
}) => {
  const activeThemeKey = themeKey || pageTheme || 'elegant';
  const isCustomTheme = activeThemeKey.startsWith('custom_') || Boolean(customGradient);
  const builtInTheme =
    visualThemeConfig[activeThemeKey as keyof typeof visualThemeConfig] || visualThemeConfig.elegant;

  const fontClass = isCustomTheme
    ? fontClassMap[themeFont || 'sans'] || 'font-sans'
    : builtInTheme.font;

  const titleFontClass = builtInTheme.titleClass || fontClass;

  const isDarkExperience =
    activeThemeKey === 'cosmic' ||
    activeThemeKey === 'midnight' ||
    Boolean(
      isCustomTheme &&
        (customGradient?.from?.toLowerCase().includes('0f') ||
          customGradient?.to?.toLowerCase().includes('0f')),
    );

  const gradientBackground = useMemo(() => {
    if (isCustomTheme) {
      const from = customGradient?.from || themeGradientFrom || '#8b5cf6';
      const to = customGradient?.to || themeGradientTo || '#ec4899';
      const mid = customGradient?.mid ?? themeGradientMid;
      const angle = customGradient?.angle ?? themeGradientAngle ?? 135;
      if (mid) {
        return `linear-gradient(${angle}deg, ${from} 0%, ${mid} 50%, ${to} 100%)`;
      }
      return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
    }
    const colors = builtInTheme.colors || ['#fbbf24', '#f97316'];
    return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
  }, [
    builtInTheme,
    customGradient,
    isCustomTheme,
    themeGradientAngle,
    themeGradientFrom,
    themeGradientMid,
    themeGradientTo,
  ]);

  const sanitizedMessageHtml = useMemo(() => {
    if (!message.trim()) return '';
    return sanitizeWishHtmlForDisplay(message);
  }, [message]);

  const isRich = useMemo(() => isRichHtml(message), [message]);

  const poolAmountNumber = useMemo(() => {
    const raw = Number(poolAmountNaira?.replace(/,/g, '') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, [poolAmountNaira]);

  const displayName = senderName.trim() || 'Your Name';

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(recordingDuration / 60);
    const secs = recordingDuration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [recordingDuration]);

  const keepsakePaperClass = isDarkExperience
    ? 'border-white/18 bg-[linear-gradient(180deg,rgba(34,36,56,0.96),rgba(18,20,34,0.92))] shadow-[0_24px_60px_rgba(2,6,23,0.4)] text-white'
    : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,252,247,0.99),rgba(255,244,235,0.96))] shadow-[0_24px_60px_rgba(183,133,83,0.16),0_12px_24px_rgba(15,23,42,0.06)] text-slate-900';

  const keepsakeSoftClass = isDarkExperience
    ? 'border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] text-white'
    : 'border-white/80 bg-[linear-gradient(180deg,rgba(255,250,244,0.95),rgba(255,243,233,0.9))] text-slate-900';

  const keepsakePillClass = isDarkExperience
    ? 'border border-white/16 bg-white/10 text-white/85'
    : 'border border-stone-200/80 bg-white/80 text-stone-800 shadow-2xs';

  const photoCount = selectedPhotos.length;
  const hasAudio = Boolean(wishAudioPreviewUrl) || isRecording;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xl shadow-stone-200/50',
        className,
      )}
    >
      {/* 1. Preview Command Bar */}
      <div className="flex items-center justify-between border-b border-black/5 bg-stone-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700">
            Live Keepsake Preview
          </span>
        </div>
        <span className="font-sans text-[11px] font-medium text-stone-500">
          For {recipientName}
        </span>
      </div>

      {/* 2. Authentic Keepsake Stage */}
      <div
        className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
        style={{ background: gradientBackground }}
      >
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

        <div className="relative z-10 w-full max-w-md">
          {/* THE WISH CARD */}
          <article
            className={cn(
              'relative overflow-hidden rounded-[1.85rem] border p-5 sm:p-6 transition-all',
              keepsakePaperClass,
            )}
          >
            {/* Card Header: Eyebrow and Recipient */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-65">
                Birthday Wish
              </p>
              <span className="text-[10px] font-semibold opacity-60">
                Celebrating {recipientName}
              </span>
            </div>

            {/* Sender Name */}
            <h2 className={cn('mt-2 text-2xl font-bold leading-tight sm:text-3xl', titleFontClass)}>
              {displayName}
            </h2>

            {/* Wish Message */}
            <div className="mt-3">
              {sanitizedMessageHtml ? (
                isRich ? (
                  <div
                    className="wish-rich-text text-base leading-relaxed sm:text-lg"
                    dangerouslySetInnerHTML={{ __html: sanitizedMessageHtml }}
                  />
                ) : (
                  <p className="text-base leading-relaxed sm:text-lg">
                    &ldquo;{sanitizedMessageHtml}&rdquo;
                  </p>
                )
              ) : (
                <p className="text-base italic leading-relaxed opacity-50 sm:text-lg">
                  &ldquo;Your birthday wish for {recipientName} will appear here as you type...&rdquo;
                </p>
              )}
            </div>

            {/* Badges Row: Photo count, Voice Note, Pool Gift */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10">
              {photoCount > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                    keepsakePillClass,
                  )}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {photoCount} {photoCount === 1 ? 'photo memory' : 'photo memories'}
                </span>
              )}
              {hasAudio && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                    keepsakePillClass,
                  )}
                >
                  <Music className="h-3.5 w-3.5" />
                  Voice note inside
                </span>
              )}
              {poolAmountNumber > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-2xs">
                  <Gift className="h-3.5 w-3.5 text-emerald-700" />
                  Gift pool: ₦{new Intl.NumberFormat('en-NG').format(poolAmountNumber)}
                </span>
              )}
            </div>

            {/* Floating Celebration Stickers */}
            {stickers.length > 0 && (
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                {stickers.map((s) => (
                  <div
                    key={s.id}
                    className="absolute select-none text-3xl drop-shadow-md sm:text-4xl"
                    style={{
                      left: `${s.positionX}%`,
                      top: `${s.positionY}%`,
                      transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})`,
                    }}
                  >
                    {STICKER_EMOJIS[s.stickerType] || '🎉'}
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* AUDIO VOICE NOTE CARD (Rendered when contributor has audio or is recording) */}
          {hasAudio && (
            <article
              className={cn(
                'mt-3 overflow-hidden rounded-[1.45rem] border p-4 shadow-sm transition-all',
                keepsakeSoftClass,
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-white shadow-xs',
                      isRecording ? 'animate-pulse bg-rose-500' : 'bg-amber-500',
                    )}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold">
                    {isRecording ? 'Recording voice note...' : `Voice note from ${displayName}`}
                  </span>
                </div>
                <span
                  className={cn(
                    'font-mono text-xs font-bold',
                    isRecording ? 'animate-pulse text-rose-600' : 'opacity-70',
                  )}
                >
                  {isRecording
                    ? formattedDuration
                    : recordingDuration > 0
                      ? formattedDuration
                      : 'Audio attached'}
                </span>
              </div>

              {wishAudioPreviewUrl ? (
                <div className="mt-2 rounded-xl bg-black/5 p-2 dark:bg-white/10">
                  <audio src={wishAudioPreviewUrl} controls className="h-8 w-full" />
                </div>
              ) : isRecording ? (
                <div className="mt-2 flex animate-pulse items-center justify-center gap-2 rounded-xl border border-rose-300/40 bg-rose-500/10 py-3 text-xs font-semibold text-rose-700">
                  <span className="h-2 w-2 animate-ping rounded-full bg-rose-600" />
                  <span>Recording in progress: {formattedDuration}</span>
                </div>
              ) : null}
            </article>
          )}

          {/* PHOTO MEMORIES LAYOUT (Dynamic by count: 1 photo, 2 photos, 3 photos, 4+ photos) */}
          {photoCount === 1 && (
            <div className="mt-3">
              <div className="group relative rotate-[-1deg] overflow-hidden rounded-[1.4rem] border border-white/60 bg-white/70 p-2.5 shadow-md transition-transform hover:rotate-0">
                <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-stone-100 sm:aspect-[16/10]">
                  <img
                    src={selectedPhotos[0].previewUrl}
                    alt={selectedPhotos[0].caption || 'Photo memory'}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="line-clamp-2 text-xs font-medium sm:text-sm">
                      {selectedPhotos[0].caption || 'Photo memory'}
                    </p>
                    <span className="text-[10px] text-white/75">1 photo attached</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {photoCount === 2 && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {selectedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative overflow-hidden rounded-[1.3rem] border border-white/60 bg-white/70 p-2 shadow-md transition-transform hover:rotate-0',
                    idx === 0 ? 'rotate-[-1.5deg]' : 'rotate-[1.5deg]',
                  )}
                >
                  <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[1rem] bg-stone-100">
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || `Photo memory ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <p className="line-clamp-1 text-[11px] font-medium">
                        {photo.caption || `Photo ${idx + 1}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {photoCount === 3 && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {/* Featured 1st Photo */}
              <div className="group relative col-span-2 rotate-[-0.5deg] overflow-hidden rounded-[1.3rem] border border-white/60 bg-white/70 p-2 shadow-md transition-transform hover:rotate-0">
                <div className="relative isolate aspect-[16/9] overflow-hidden rounded-[1rem] bg-stone-100">
                  <img
                    src={selectedPhotos[0].previewUrl}
                    alt={selectedPhotos[0].caption || 'Featured memory'}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                    <p className="line-clamp-1 text-[11px] font-medium">
                      {selectedPhotos[0].caption || 'Featured memory'}
                    </p>
                  </div>
                </div>
              </div>
              {/* 2nd and 3rd Photos */}
              {selectedPhotos.slice(1, 3).map((photo, idx) => (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative overflow-hidden rounded-[1.2rem] border border-white/60 bg-white/70 p-1.5 shadow-md transition-transform hover:rotate-0',
                    idx === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]',
                  )}
                >
                  <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-stone-100">
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || `Memory ${idx + 2}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <p className="line-clamp-1 text-[10px] font-medium">
                        {photo.caption || `Memory ${idx + 2}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {photoCount >= 4 && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {selectedPhotos.slice(0, 4).map((photo, idx) => (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative overflow-hidden rounded-[1.2rem] border border-white/60 bg-white/70 p-1.5 shadow-md transition-transform hover:rotate-0',
                    idx % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]',
                  )}
                >
                  <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-stone-100">
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || `Memory ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <p className="line-clamp-1 text-[10px] font-medium">
                        {photo.caption || `Memory ${idx + 1}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {photoCount > 4 && (
                <div className="col-span-2 rounded-xl border border-white/50 bg-white/60 py-1.5 text-center text-[11px] font-semibold text-stone-700 shadow-2xs backdrop-blur-xs">
                  +{photoCount - 4} more photos attached
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Footer Prompt */}
      <div className="flex items-center justify-between border-t border-black/5 bg-stone-50/70 px-4 py-2.5 font-sans text-[11px] text-stone-500">
        <span className="flex items-center gap-1 font-semibold text-stone-600">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>WishCanvas Keepsake</span>
        </span>
        <span>Updates live as you type</span>
      </div>
    </div>
  );
};
