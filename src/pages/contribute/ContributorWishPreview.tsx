import { useState, useMemo, type FC } from 'react';
import {
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Gift,
  Music,
  Layers,
  LayoutGrid,
  Pin,
  ChevronLeft,
  ChevronRight,
  Quote,
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
  displayMode,
  className,
}) => {
  const normalizedCanvasMode = (displayMode === 'bento' || displayMode === 'freeform') ? displayMode : 'story';
  const [activePreviewMode, setActivePreviewMode] = useState<'story' | 'bento' | 'freeform'>(normalizedCanvasMode);

  // Sync mode if parent canvas displayMode updates
  const effectiveMode = activePreviewMode;

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
      {/* 1. Preview Command Bar with Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-stone-50/90 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-800">
            Recipient View Preview
          </span>
          <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
            For {recipientName}
          </span>
        </div>

        {/* Display Mode Tabs */}
        <div className="flex items-center rounded-xl bg-stone-200/70 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActivePreviewMode('story')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all',
              effectiveMode === 'story'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900',
            )}
            title="Preview as Story Slide"
          >
            <Layers className="h-3 w-3" />
            <span>Story</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePreviewMode('bento')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all',
              effectiveMode === 'bento'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900',
            )}
            title="Preview as Bento Tile"
          >
            <LayoutGrid className="h-3 w-3" />
            <span>Bento</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePreviewMode('freeform')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all',
              effectiveMode === 'freeform'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900',
            )}
            title="Preview as Pinned Board Card"
          >
            <Pin className="h-3 w-3" />
            <span>Board</span>
          </button>
        </div>
      </div>

      {/* 2. Recipient Stage View */}
      {effectiveMode === 'story' && (
        <div
          className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
          style={{ background: gradientBackground }}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

          {/* Story Progress Bars Bar */}
          <div className="absolute inset-x-4 top-3 z-20 flex items-center gap-1.5 sm:inset-x-6">
            <div className="h-1 flex-1 rounded-full bg-white/80 shadow-xs" />
            <div className="h-1 flex-1 rounded-full bg-white/35" />
            <div className="h-1 flex-1 rounded-full bg-white/20" />
          </div>

          <div className="relative z-10 mt-3 w-full max-w-md">
            {/* THE STORY WISH CARD */}
            <article
              className={cn(
                'relative overflow-hidden rounded-[1.85rem] border p-5 sm:p-6 transition-all',
                keepsakePaperClass,
              )}
            >
              {/* Card Header: Eyebrow and Slide Indicator */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-65">
                  Letter 1 of 1 : Birthday Wish
                </p>
                <span className="text-[10px] font-semibold opacity-60">
                  For {recipientName}
                </span>
              </div>

              {/* Sender Name in Theme Typography */}
              <h2 className={cn('mt-2 text-2xl font-bold leading-tight sm:text-3xl', titleFontClass)}>
                {displayName}
              </h2>

              {/* Wish Message with Recipient Typography */}
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

              {/* Floating Celebration Stickers on the card */}
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

            {/* AUDIO VOICE NOTE CARD */}
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

            {/* PHOTO MEMORIES GALLERY BOARD */}
            {photoCount > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 drop-shadow-xs">
                    Photo Keepsakes ({photoCount})
                  </span>
                  <span className="text-[10px] font-medium text-white/80">
                    Story presentation
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {selectedPhotos.slice(0, 4).map((photo, idx) => (
                    <div
                      key={photo.id}
                      className={cn(
                        'group relative overflow-hidden rounded-[1.2rem] border border-white/70 bg-white/80 p-2 shadow-md transition-transform hover:rotate-0',
                        idx % 2 === 0 ? 'rotate-[-1.5deg]' : 'rotate-[1.5deg]',
                      )}
                    >
                      <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[0.95rem] bg-stone-100">
                        <img
                          src={photo.previewUrl}
                          alt={photo.caption || `Memory ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                          <p className="line-clamp-1 text-[11px] font-medium">
                            {photo.caption || `Memory ${idx + 1}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {photoCount > 4 && (
                  <div className="mt-2 rounded-xl border border-white/50 bg-white/70 py-1.5 text-center text-[11px] font-semibold text-stone-800 shadow-2xs backdrop-blur-xs">
                    +{photoCount - 4} more photos attached
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slide Navigation Hints */}
          <div className="mt-4 flex items-center justify-between w-full max-w-md px-2 text-white/70 text-[10px] font-medium">
            <span className="flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" /> Previous slide
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">
              Slide 1 of 1
            </span>
            <span className="flex items-center gap-1">
              Next slide <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      )}

      {/* BENTO GRID TILE MODE */}
      {effectiveMode === 'bento' && (
        <div
          className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
          style={{ background: gradientBackground }}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

          {/* Bento Vault Header Snippet */}
          <div className="relative z-10 mb-4 w-full max-w-md text-left">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
                Bento Vault Preview
              </p>
            </div>
            <h3 className="mt-1 text-lg font-bold text-white drop-shadow-sm">
              {recipientName}&apos;s celebration board
            </h3>
          </div>

          {/* THE BENTO CARD TILE */}
          <div className="relative z-10 w-full max-w-md">
            <article
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-[1.8rem] border text-left shadow-[0_18px_50px_rgba(15,23,42,0.18)] transition-all',
                keepsakePaperClass,
              )}
            >
              {/* First photo background with subtle opacity if photos exist */}
              {photoCount > 0 && selectedPhotos[0]?.previewUrl && (
                <div className="pointer-events-none absolute inset-0">
                  <img
                    src={selectedPhotos[0].previewUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-25 dark:opacity-40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent" />
                </div>
              )}

              {/* Bento Card Header: Sender Avatar & Name */}
              <div className="relative z-10 p-5 pb-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/15 text-xs font-bold">
                      {(displayName[0] || 'Y').toUpperCase()}
                    </div>
                    <p className={cn('text-sm font-bold truncate leading-tight', titleFontClass)}>
                      {displayName}
                    </p>
                  </div>

                  {stickers.length > 0 && (
                    <span className="text-lg shrink-0 drop-shadow-xs">
                      {STICKER_EMOJIS[stickers[0].stickerType] || '🎉'}
                    </span>
                  )}
                </div>

                {/* Message Quote */}
                <div className="mt-3">
                  {sanitizedMessageHtml ? (
                    isRich ? (
                      <div
                        className="wish-rich-text line-clamp-4 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizedMessageHtml }}
                      />
                    ) : (
                      <p className="line-clamp-4 text-sm leading-relaxed italic opacity-85">
                        &ldquo;{sanitizedMessageHtml}&rdquo;
                      </p>
                    )
                  ) : (
                    <p className="text-sm italic opacity-50">
                      &ldquo;Your birthday wish will be pinned here...&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Bento Tile Footer: Audio, Photo Counts, Badges */}
              <div className="relative z-10 p-5 pt-4 mt-4 border-t border-black/5 dark:border-white/10">
                {hasAudio && (
                  <div className="mb-2.5 flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <Volume2 className="h-3.5 w-3.5 animate-pulse text-rose-600" />
                    <span>Voice note attached ({formattedDuration || 'Audio'})</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {photoCount > 0 && (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', keepsakePillClass)}>
                      <ImageIcon className="h-3.5 w-3.5" />
                      {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                    </span>
                  )}
                  {poolAmountNumber > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-2xs">
                      <Gift className="h-3.5 w-3.5 text-emerald-700" />
                      ₦{new Intl.NumberFormat('en-NG').format(poolAmountNumber)} pool gift
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-medium opacity-60">
                    Tap to expand full note
                  </span>
                </div>
              </div>
            </article>

            {/* Attached Photo Previews */}
            {photoCount > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {selectedPhotos.slice(0, 3).map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-white/60 bg-white/70 shadow-xs"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || `Memory ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FREEFORM PINNED BOARD MODE */}
      {effectiveMode === 'freeform' && (
        <div
          className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
          style={{ background: gradientBackground }}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

          {/* Pinned Board Header */}
          <div className="relative z-10 mb-3 w-full max-w-md text-left">
            <div className="flex items-center gap-2">
              <Pin className="h-3.5 w-3.5 text-white/90" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/85">
                Pinned Keepsake Board Preview
              </p>
            </div>
          </div>

          {/* THE PINNED CARD */}
          <div className="relative z-10 w-full max-w-md pt-3">
            <article
              className={cn(
                'relative rotate-[-1deg] rounded-[1.35rem] border px-5 py-4 shadow-[0_16px_38px_rgba(15,23,42,0.12)] transition-all hover:rotate-0',
                keepsakePaperClass,
              )}
            >
              {/* Pushpin / Washi Tape Top Accent */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-[2px] bg-amber-200/90 shadow-xs"
                style={{
                  width: '38px',
                  height: '14px',
                  transform: 'translateX(-50%) rotate(-1.5deg)',
                }}
              />

              {/* Sender Name in Pinned Header */}
              <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-2 dark:border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">
                  FROM {displayName.toUpperCase()}
                </p>
                <span className="text-[10px] font-semibold opacity-60">
                  For {recipientName}
                </span>
              </div>

              {/* Wish Message */}
              <div className="mt-3">
                {sanitizedMessageHtml ? (
                  isRich ? (
                    <div
                      className="wish-rich-text text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizedMessageHtml }}
                    />
                  ) : (
                    <p className="text-base leading-relaxed">
                      &ldquo;{sanitizedMessageHtml}&rdquo;
                    </p>
                  )
                ) : (
                  <p className="text-base italic leading-relaxed opacity-50">
                    &ldquo;Your pinned wish will appear here as you type...&rdquo;
                  </p>
                )}
              </div>

              {/* Floating Stickers on Pinned Card */}
              {stickers.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                  {stickers.map((s) => (
                    <div
                      key={s.id}
                      className="absolute select-none text-2xl drop-shadow-md sm:text-3xl"
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

              {/* Voice Note Audio inside Pinned Card */}
              {hasAudio && (
                <div className="mt-4 rounded-xl border border-black/5 bg-black/5 p-3 dark:border-white/10 dark:bg-white/10">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5 text-rose-500" />
                      Voice note from {displayName}
                    </span>
                    <span className="font-mono text-[11px] opacity-70">
                      {formattedDuration || 'Audio'}
                    </span>
                  </div>
                  {wishAudioPreviewUrl && (
                    <audio src={wishAudioPreviewUrl} controls className="h-8 w-full" />
                  )}
                </div>
              )}

              {/* Photos inside Pinned Card */}
              {photoCount > 0 && (
                <div className="mt-4 border-t border-black/5 pt-3 dark:border-white/10">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-65">
                    Attached Memories ({photoCount})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPhotos.slice(0, 6).map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-white/60 bg-white/70 shadow-xs"
                      >
                        <img
                          src={photo.previewUrl}
                          alt={photo.caption || `Memory ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gift Pool Badge */}
              {poolAmountNumber > 0 && (
                <div className="mt-3 flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-2xs">
                  <Gift className="h-3.5 w-3.5 text-emerald-700" />
                  Gift pool: ₦{new Intl.NumberFormat('en-NG').format(poolAmountNumber)}
                </div>
              )}
            </article>
          </div>
        </div>
      )}

      {/* 3. Footer Prompt */}
      <div className="flex items-center justify-between border-t border-black/5 bg-stone-50/80 px-4 py-2.5 font-sans text-[11px] text-stone-500">
        <span className="flex items-center gap-1 font-semibold text-stone-700">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Real recipient preview</span>
        </span>
        <span className="text-stone-500">
          Canvas mode: <strong className="text-stone-700 capitalize">{normalizedCanvasMode}</strong>
        </span>
      </div>
    </div>
  );
};
