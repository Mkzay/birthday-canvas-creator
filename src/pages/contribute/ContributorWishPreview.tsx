import { useState, useMemo, type FC } from 'react';
import {
  Sparkles,
  Heart,
  Volume2,
  Image as ImageIcon,
  Gift,
  Smile,
  Eye,
  LayoutGrid,
  Film,
  Music,
  CheckCircle2,
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
  poolFundraisingEnabled,
  pageTheme,
  themeKey,
  customGradient,
  themeGradientFrom,
  themeGradientTo,
  themeGradientMid,
  themeGradientAngle = 135,
  themeEmoji,
  themeFont,
  displayMode = 'story',
  letterTheme,
  coverPhotoUrl,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'canvas'>('card');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const activeThemeKey = themeKey || pageTheme || 'elegant';
  const isCustomTheme = activeThemeKey.startsWith('custom_') || Boolean(customGradient);
  const builtInTheme = visualThemeConfig[activeThemeKey as keyof typeof visualThemeConfig] || visualThemeConfig.elegant;

  const fontClass = isCustomTheme
    ? (fontClassMap[themeFont || 'sans'] || 'font-sans')
    : builtInTheme.font;

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
  }, [builtInTheme, customGradient, isCustomTheme, themeGradientAngle, themeGradientFrom, themeGradientMid, themeGradientTo]);

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
  const initial = (displayName[0] || 'Y').toUpperCase();

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(recordingDuration / 60);
    const secs = recordingDuration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [recordingDuration]);

  return (
    <div className={cn('flex flex-col rounded-3xl border border-stone-200/90 bg-white shadow-xl shadow-stone-200/50 overflow-hidden', className)}>
      {/* 1. Preview Command Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/70">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
            Live Keepsake Preview
          </span>
        </div>

        {/* View Switcher: Card vs Canvas Mode */}
        <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1.5',
              activeTab === 'card'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-stone-600 hover:text-slate-900',
            )}
          >
            <span>Wish Card</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('canvas')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1.5',
              activeTab === 'canvas'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-stone-600 hover:text-slate-900',
            )}
          >
            <span>Canvas View</span>
          </button>
        </div>
      </div>

      {/* 2. Live Canvas / Card Stage */}
      <div
        className="relative p-4 sm:p-5 flex flex-col items-center justify-center min-h-[380px] overflow-hidden"
        style={{ background: gradientBackground }}
      >
        {/* Ambient Decorative Backlight */}
        <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-black/15 blur-2xl" />

        {/* TAB 1: INDIVIDUAL WISH CARD */}
        {activeTab === 'card' && (
          <div className={cn(
            'relative w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-md p-5 border border-white/80 shadow-2xl transition-all',
            fontClass,
          )}>
            {/* Header: Sender Initial, Name, and Pool Gift Pill */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white font-bold text-sm shadow-xs ring-2 ring-white">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-stone-500 font-medium">
                    Celebrating {recipientName}
                  </p>
                </div>
              </div>

              {poolAmountNumber > 0 && (
                <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  <Gift className="h-3 w-3 text-emerald-600" />
                  <span>₦{new Intl.NumberFormat('en-NG').format(poolAmountNumber)}</span>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="py-3">
              {sanitizedMessageHtml ? (
                <div
                  className="text-xs sm:text-sm text-slate-800 leading-relaxed break-words rich-text-preview"
                  dangerouslySetInnerHTML={{ __html: sanitizedMessageHtml }}
                />
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-stone-400 italic">
                    Your personal wish for {recipientName} will appear here as you type...
                  </p>
                </div>
              )}
            </div>

            {/* Attached Photos Carousel / Polaroid */}
            {selectedPhotos.length > 0 && (
              <div className="mt-2 pt-2 border-t border-stone-100">
                <div className="relative rounded-xl overflow-hidden bg-stone-100 border border-stone-200 aspect-[4/3]">
                  <img
                    src={selectedPhotos[activePhotoIndex]?.previewUrl || selectedPhotos[0]?.previewUrl}
                    alt="Celebration memory"
                    className="h-full w-full object-cover"
                  />
                  {selectedPhotos.length > 1 && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full text-[10px] text-white font-bold">
                      <ImageIcon className="h-2.5 w-2.5" />
                      <span>{activePhotoIndex + 1}/{selectedPhotos.length}</span>
                    </div>
                  )}
                </div>

                {/* Photo Caption if present */}
                {selectedPhotos[activePhotoIndex]?.caption && (
                  <p className="mt-1.5 text-[11px] text-stone-600 italic px-1 text-center">
                    &ldquo;{selectedPhotos[activePhotoIndex].caption}&rdquo;
                  </p>
                )}

                {/* Thumbnail dots if multiple */}
                {selectedPhotos.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {selectedPhotos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePhotoIndex(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i === activePhotoIndex ? 'w-4 bg-amber-500' : 'w-1.5 bg-stone-300',
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attached Audio Voice Note Player Pill */}
            {(wishAudioPreviewUrl || isRecording) && (
              <div
                className={cn(
                  'mt-3 flex items-center gap-2.5 rounded-xl border p-2.5 text-xs shadow-2xs transition-all',
                  isRecording
                    ? 'border-rose-300 bg-rose-50/90 text-rose-900 animate-pulse'
                    : 'border-amber-200/80 bg-amber-50/80 text-amber-900',
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-xs',
                    isRecording ? 'bg-rose-500' : 'bg-amber-500',
                  )}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[11px] font-bold', isRecording ? 'text-rose-950' : 'text-amber-950')}>
                    {isRecording ? 'Recording Voice Note...' : 'Voice Note Attached'}
                  </p>
                  <p className={cn('text-[10px]', isRecording ? 'font-mono text-rose-700' : 'text-amber-700')}>
                    {isRecording
                      ? formattedDuration
                      : recordingDuration > 0
                        ? formattedDuration
                        : 'Ready to play on canvas'}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold',
                    isRecording ? 'bg-rose-200 text-rose-900' : 'bg-amber-200/60 text-amber-900',
                  )}
                >
                  {isRecording ? 'Live' : 'Audio'}
                </span>
              </div>
            )}

            {/* Floating Stickers Placement */}
            {stickers.length > 0 && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                {stickers.map((s) => (
                  <span
                    key={s.id}
                    className="absolute text-xl sm:text-2xl drop-shadow-md select-none"
                    style={{
                      left: `${Math.min(85, Math.max(8, s.positionX))}%`,
                      top: `${Math.min(85, Math.max(8, s.positionY))}%`,
                      transform: `rotate(${s.rotation}deg) scale(${s.scale})`,
                    }}
                  >
                    {STICKER_EMOJIS[s.stickerType] || '🎉'}
                  </span>
                ))}
              </div>
            )}

            {/* Card Footer Tag */}
            <div className="mt-3 pt-2 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-50">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>WishCanvas Keepsake</span>
              </span>
              <span>For {recipientName}&apos;s Eyes Only</span>
            </div>
          </div>
        )}

        {/* TAB 2: CANVAS VIEW CONTEXT */}
        {activeTab === 'canvas' && (
          <div className="w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-md p-4 border border-white/80 shadow-2xl flex flex-col gap-3">
            {/* Mock Header of the Celebration Canvas */}
            <div className="text-center pb-2 border-b border-stone-200">
              <span className="text-2xl">{themeEmoji || '✨'}</span>
              <p className="text-xs font-bold text-slate-900">
                {recipientName}&apos;s Celebration Canvas
              </p>
              <p className="text-[10px] text-stone-500 capitalize">
                Display Mode: {displayMode || 'Story Reel'}
              </p>
            </div>

            {/* Mini layout grid preview showing this card nested among others */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {/* Highlighted contributor card */}
              <div className="col-span-2 rounded-xl bg-amber-50/90 border-2 border-amber-400 p-2.5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-amber-600" />
                    <span>Your Card: {displayName}</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                    Just Now
                  </span>
                </div>
                <p className="text-[10px] text-stone-700 line-clamp-2 italic">
                  {message.trim() ? message.replace(/<[^>]*>?/gm, '') : 'Your warm birthday wishes...'}
                </p>
              </div>

              {/* Mock peer contributions */}
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-2 opacity-75">
                <p className="text-[10px] font-bold text-slate-800">Mom &amp; Dad</p>
                <p className="text-[9px] text-stone-500 line-clamp-1">&ldquo;So proud of you!&rdquo;</p>
              </div>
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-2 opacity-75">
                <p className="text-[10px] font-bold text-slate-800">David K.</p>
                <p className="text-[9px] text-stone-500 line-clamp-1">&ldquo;Happy 25th milestone!&rdquo;</p>
              </div>
            </div>

            <p className="text-[10px] text-center text-stone-400 pt-1">
              Your memory will sit proudly beside all contributors on the big reveal!
            </p>
          </div>
        )}
      </div>

      {/* 3. Footer Helper Notes */}
      <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
          <span>Updates automatically as you type</span>
        </span>
        <span className="text-[10px] text-stone-400 font-medium">
          WishCanvas Atelier
        </span>
      </div>
    </div>
  );
};
