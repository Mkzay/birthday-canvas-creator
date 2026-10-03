import { useMemo, type FC } from 'react';
import {
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Gift,
  Music,
  Pin,
  Layers,
  LayoutGrid,
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
  // Preview mode is strictly determined by the creator's choice on the canvas
  const effectiveMode = (displayMode === 'bento' || displayMode === 'freeform')
    ? displayMode
    : 'story';

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

  const modeBadge = useMemo(() => {
    switch (effectiveMode) {
      case 'freeform':
        return {
          label: 'Pinned Board Card',
          icon: <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400" />,
        };
      case 'bento':
        return {
          label: 'Bento Grid Tile',
          icon: <LayoutGrid className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />,
        };
      case 'story':
      default:
        return {
          label: 'Story Slide',
          icon: <Layers className="h-3 w-3 text-rose-600 dark:text-rose-400" />,
        };
    }
  }, [effectiveMode]);

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xl shadow-stone-200/50',
        className,
      )}
    >
      {/* 1. Preview Command Bar: No switcher, displays creator's selected mode */}
      <div className="flex items-center justify-between border-b border-black/5 bg-stone-50/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-800">
            Live Recipient Preview
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 border border-stone-200/80 text-[10px] font-semibold text-stone-700 shadow-2xs">
          {modeBadge.icon}
          <span>{modeBadge.label}</span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-500">For {recipientName}</span>
        </div>
      </div>

      {/* 2. RECIPIENT STAGE: Rendered strictly according to effectiveMode */}

      {/* MODE A: FREEFORM (Pinned Corkboard Card) */}
      {effectiveMode === 'freeform' && (
        <div
          className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
          style={{ background: gradientBackground }}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

          {/* THE PINNED CARD */}
          <div className="relative z-10 w-full max-w-md pt-2">
            <article
              className={cn(
                'relative rotate-[-1deg] rounded-[1.25rem] border px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.12)] transition-transform hover:rotate-0',
                keepsakePaperClass,
              )}
            >
              {/* Realistic washi tape accent at top center */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-[2px] bg-amber-200/90 shadow-2xs border border-amber-300/40"
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
                      {formattedDuration || 'Audio attached'}
                    </span>
                  </div>
                  {wishAudioPreviewUrl ? (
                    <audio src={wishAudioPreviewUrl} controls className="h-8 w-full" />
                  ) : isRecording ? (
                    <div className="flex animate-pulse items-center gap-2 text-xs font-medium text-rose-600">
                      <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                      Recording: {formattedDuration}
                    </div>
                  ) : null}
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

              {/* Pinned Card Footer Attribution */}
              <div className="mt-3 pt-2 text-center text-[10px] font-medium opacity-50 border-t border-black/5 dark:border-white/10">
                Pinned to {recipientName}&apos;s canvas
              </div>
            </article>
          </div>
        </div>
      )}

      {/* MODE B: STORY (Vertical mobile story slide matching MobileStorySection) */}
      {effectiveMode === 'story' && (
        <div
          className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
          style={{ background: gradientBackground }}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

          {/* Top Story Progress Bars Bar */}
          <div className="absolute inset-x-4 top-3 z-20 flex items-center gap-1.5 sm:inset-x-6">
            <div className="h-1 flex-1 rounded-full bg-white/85 shadow-xs" />
            <div className="h-1 flex-1 rounded-full bg-white/35" />
            <div className="h-1 flex-1 rounded-full bg-white/20" />
          </div>

          <div className="relative z-10 mt-3 w-full max-w-md space-y-4">
            {/* The Authentic Story Wish Article */}
            <article
              className={cn(
                'relative overflow-hidden rounded-[1.7rem] border p-5 sm:p-6 transition-all',
                keepsakePaperClass,
              )}
            >
              {/* Header: Letter index */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
                  Letter 1 of 1
                </p>
                <span className="text-[11px] font-semibold opacity-65">
                  Happy Birthday, {recipientName}
                </span>
              </div>

              {/* Sender Name in Theme Typography */}
              <h2 className={cn('mt-3 text-3xl font-bold leading-[0.98]', titleFontClass)}>
                {displayName}
              </h2>

              {/* Wish Message */}
              <div className="mt-4">
                {sanitizedMessageHtml ? (
                  isRich ? (
                    <div
                      className="wish-rich-text text-lg leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizedMessageHtml }}
                    />
                  ) : (
                    <p className="text-lg leading-relaxed">
                      &ldquo;{sanitizedMessageHtml}&rdquo;
                    </p>
                  )
                ) : (
                  <p className="text-lg italic leading-relaxed opacity-50">
                    &ldquo;Your birthday wish for {recipientName} will appear here as you type...&rdquo;
                  </p>
                )}
              </div>

              {/* Badges Row */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {photoCount > 0 && (
                  <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', keepsakePillClass)}>
                    {photoCount} {photoCount === 1 ? 'photo memory' : 'photo memories'}
                  </span>
                )}
                {hasAudio && (
                  <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', keepsakePillClass)}>
                    Voice note inside
                  </span>
                )}
                {poolAmountNumber > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 shadow-2xs">
                    <Gift className="h-3.5 w-3.5 text-emerald-700" />
                    ₦{new Intl.NumberFormat('en-NG').format(poolAmountNumber)} pool gift
                  </span>
                )}
              </div>

              {/* Stickers Floating on the Card */}
              {stickers.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                  {stickers.map((s) => (
                    <div
                      key={s.id}
                      className="absolute select-none text-4xl"
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

            {/* Voice Note Section if audio present */}
            {hasAudio && (
              <article className={cn('rounded-[1.45rem] border p-4 shadow-sm', keepsakeSoftClass)}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-rose-500" />
                    <p className="text-sm font-semibold">Voice note from {displayName}</p>
                  </div>
                  <span className="text-xs font-mono opacity-70">
                    {formattedDuration || 'Audio'}
                  </span>
                </div>
                {wishAudioPreviewUrl ? (
                  <audio src={wishAudioPreviewUrl} controls className="mt-2 h-8 w-full" />
                ) : isRecording ? (
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-rose-600 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                    Recording in progress: {formattedDuration}
                  </div>
                ) : null}
              </article>
            )}

            {/* Photo Memories: Authentic Story format matching MobileStorySection */}
            {photoCount > 0 && (
              <div className="space-y-3">
                {selectedPhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="group block w-full rounded-[1.35rem] border border-white/50 bg-white/60 p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)] dark:border-white/20 dark:bg-white/10"
                  >
                    <div className="relative isolate aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[#dfe7dc]">
                      <img
                        src={photo.previewUrl}
                        alt={photo.caption || `Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-white">
                            {photo.caption || `Memory ${idx + 1}`}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                          Open
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE C: BENTO GRID TILE */}
      {effectiveMode === 'bento' && (
        <div
          className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
          style={{ background: gradientBackground }}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

          {/* Bento Header */}
          <div className="relative z-10 mb-3 w-full max-w-md text-left">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
                Bento Vault
              </p>
            </div>
            <h3 className="mt-1 text-lg font-bold text-white drop-shadow-sm">
              {recipientName}&apos;s celebration board
            </h3>
          </div>

          {/* The Bento Tile */}
          <div className="relative z-10 w-full max-w-md">
            <article
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-[1.8rem] border text-left shadow-[0_18px_50px_rgba(15,23,42,0.18)] transition-all',
                keepsakePaperClass,
              )}
            >
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

      {/* 3. Footer Prompt */}
      <div className="flex items-center justify-between border-t border-black/5 bg-stone-50/80 px-4 py-2.5 font-sans text-[11px] text-stone-500">
        <span className="flex items-center gap-1 font-semibold text-stone-700">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Real recipient preview</span>
        </span>
        <span className="text-stone-500">
          Canvas mode: <strong className="text-stone-700 capitalize">{effectiveMode}</strong>
        </span>
      </div>
    </div>
  );
};
