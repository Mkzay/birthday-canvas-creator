import { Fragment, memo, useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Loader2,
  Music4,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/api';
import { isRichHtml, sanitizeWishHtmlForDisplay, wishMessageHtmlWithQuotes } from '@/lib/wish-utils';
import {
  getMessagePhotos,
  STICKER_EMOJI_MAP,
} from '@/pages/birthday';
import { useBirthdayView } from '@/pages/birthday/view/BirthdayPageViewContext';
import { MobileWishPhotoGrid } from './MobileWishPhotoGrid';

export const MobileStorySection = memo(function MobileStorySection() {
  const {
    activeSlide,
    birthdayDate,
    canShowKeepsakeDownload,
    coverPhotoSrc,
    currentSlide,
    currentSlideDuration,
    downloadingPdf,
    downloadingVideo,
    effectiveViewMode,
    forceMobileView,
    goToNextSlide,
    goToPreviousSlide,
    handleDownloadKeepsake,
    handleDownloadVideoKeepsake,
    handleOpenExportModal,
    downloadingImage,
    handlePauseControl,
    handlePlayControl,
    isDarkExperience,
    isDesktopPlaybackPaused,
    keepsakePaperClass,
    keepsakePillClass,
    keepsakeSoftClass,
    messages,
    page,
    renderStoryImage,
    renderWishAudioPlayer,
    revealSlides,
    setCurrentSlide,
    setExpandedPhoto,
    setShowShareCard,
    slideRemainingMs,
    storyThemePalette,
    theme,
    totalAudioWishes,
    totalPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VM mirrors BirthdayPage closure
  } = useBirthdayView() as any;

  const [isPressHolding, setIsPressHolding] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const pressHoldTimerRef = useRef<number | null>(null);
  const totalSlides = revealSlides?.length || 1;
  const slideIndex = Math.min(Math.max(0, currentSlide || 0), totalSlides - 1);
  const currentActiveSlide = revealSlides?.[slideIndex] || activeSlide;

  const isPaused = isDesktopPlaybackPaused || isPressHolding;

  // Progress percentage for active slide
  const duration = currentSlideDuration || 6500;
  const remaining = typeof slideRemainingMs === 'number' && slideRemainingMs > 0 ? slideRemainingMs : duration;
  const progressRatio = Math.max(0, Math.min(1, 1 - remaining / duration));

  // Press and hold pause handler
  const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    // Ignore interactive clicks on buttons, audio, links
    const target = e.target as HTMLElement;
    if (target.closest('button, a, audio, input, [data-no-nav="true"]')) {
      return;
    }

    pressHoldTimerRef.current = window.setTimeout(() => {
      setIsPressHolding(true);
      handlePauseControl?.();
    }, 180);
  }, [handlePauseControl]);

  const handlePointerUp = useCallback(() => {
    if (pressHoldTimerRef.current) {
      window.clearTimeout(pressHoldTimerRef.current);
      pressHoldTimerRef.current = null;
    }
    if (isPressHolding) {
      setIsPressHolding(false);
      handlePlayControl?.();
    }
  }, [handlePlayControl, isPressHolding]);

  // Touch swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, audio, input, [data-no-nav="true"]')) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Horizontal swipe must be stronger than vertical scroll
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goToNextSlide?.();
      } else {
        goToPreviousSlide?.();
      }
    }
  }, [goToNextSlide, goToPreviousSlide]);

  // Tap navigation zones
  const handleTapZone = useCallback((zone: 'left' | 'right') => {
    if (isPressHolding) return;
    if (zone === 'left') {
      goToPreviousSlide?.();
    } else {
      goToNextSlide?.();
    }
  }, [goToNextSlide, goToPreviousSlide, isPressHolding]);

  if (effectiveViewMode !== 'story') return null;

  return (
    <section
      className={cn(
        'relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none flex flex-col justify-between',
        forceMobileView ? '!block !min-h-full' : 'sm:hidden',
      )}
      style={{ background: storyThemePalette?.sectionBackground || '#10111A' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Ambient background glow & stars */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-[10%] -left-[10%] h-72 w-72 rounded-full blur-3xl opacity-35"
          style={{ background: storyThemePalette?.orbA || '#ec4899' }}
        />
        <div
          className="absolute -bottom-[10%] -right-[10%] h-80 w-80 rounded-full blur-3xl opacity-35"
          style={{ background: storyThemePalette?.orbB || '#8b5cf6' }}
        />
        {coverPhotoSrc && (
          <img
            src={coverPhotoSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-12 blur-2xl scale-125"
          />
        )}
      </div>

      {/* 1. TOP SEGMENTED PROGRESS BARS (AUTHENTIC INSTAGRAM / WHATSAPP STYLE) */}
      <div className="relative z-30 pt-3 px-3 pb-1 w-full shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 w-full">
          {revealSlides.map((s: { id: string }, idx: number) => {
            const isCompleted = idx < slideIndex;
            const isCurrent = idx === slideIndex;

            return (
              <div
                key={s.id || idx}
                className="h-1 flex-1 rounded-full overflow-hidden bg-white/25 backdrop-blur-xs relative"
              >
                {isCompleted && (
                  <div className="h-full w-full bg-white rounded-full" />
                )}
                {isCurrent && (
                  <div
                    className={cn(
                      'h-full bg-white rounded-full transition-all ease-linear',
                      isPaused ? 'duration-0' : 'duration-100',
                    )}
                    style={{
                      width: `${Math.round(progressRatio * 100)}%`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 2. STORY HEADER (AVATAR + NAME + PROGRESS + PAUSE PILL) */}
        <div className="flex items-center justify-between text-white px-0.5 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-linear-to-tr from-amber-400 to-rose-500 p-0.5 shrink-0 shadow-xs">
              <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {coverPhotoSrc ? (
                  <img src={coverPhotoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{(page?.recipient_name || 'W')[0].toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate drop-shadow-xs">
                {page?.recipient_name}&apos;s Story
              </p>
              <p className="text-[10px] text-white/70 tracking-wider uppercase drop-shadow-xs">
                {slideIndex + 1} of {totalSlides}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5" data-no-nav="true">
            {isPaused && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black/50 text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/30 animate-pulse">
                Paused
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPaused) {
                  handlePlayControl?.();
                } else {
                  handlePauseControl?.();
                }
              }}
              className="h-7 w-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/50 transition-colors"
              aria-label={isPaused ? 'Resume story' : 'Pause story'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. TAP NAVIGATION ZONES (LEFT 30% / RIGHT 70%) */}
      <div className="absolute inset-x-0 top-16 bottom-20 z-20 flex pointer-events-auto">
        <div
          className="w-[30%] h-full cursor-pointer"
          onClick={() => handleTapZone('left')}
          aria-label="Previous slide"
        />
        <div
          className="w-[70%] h-full cursor-pointer"
          onClick={() => handleTapZone('right')}
          aria-label="Next slide"
        />
      </div>

      {/* 4. ACTIVE STORY SLIDE CONTENT CONTAINER */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-3 sm:px-4 py-2 min-h-0 pointer-events-none">
        {currentActiveSlide?.kind === 'cover' && (
          <article
            className={cn(
              'pointer-events-auto rounded-[2rem] border p-5 shadow-2xl overflow-y-auto h-full max-h-[calc(100dvh-6rem)] transition-transform flex flex-col justify-between',
              keepsakePaperClass,
            )}
            style={{
              backgroundColor: storyThemePalette?.paperBg || 'rgba(255,255,255,0.92)',
              borderColor: storyThemePalette?.paperBorder || 'rgba(255,255,255,0.4)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={cn('text-[10px] font-bold uppercase tracking-[0.2em] opacity-70', theme?.text)}>
                  Birthday Card Keepsake
                </span>
                <span className="text-xs">✨</span>
              </div>

              <h2 className={cn('text-3xl font-bold leading-tight font-serif', theme?.titleClass, theme?.font)}>
                Happy Birthday,
                <br />
                {page?.recipient_name}.
              </h2>

              <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme?.text)}>
                Every note, photo, and voice clip inside was gathered to make this feel less like a page and more like a gift being opened.
              </p>

              {coverPhotoSrc && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 shadow-md aspect-[16/10] sm:aspect-[16/9] min-h-[14rem] max-h-[38dvh] relative">
                  <img
                    src={coverPhotoSrc}
                    alt={`${page?.recipient_name}'s birthday`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <p className="absolute bottom-2 left-3 text-[11px] font-medium text-white drop-shadow-sm">
                    {page?.recipient_name}&apos;s celebration
                  </p>
                </div>
              )}

              {page?.creator_message && (
                <div
                  className={cn('mt-4 rounded-2xl border p-3.5', keepsakeSoftClass)}
                  style={{
                    backgroundColor: storyThemePalette?.softBg,
                    borderColor: storyThemePalette?.softBorder,
                  }}
                >
                  <p className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60', theme?.text)}>
                    From the organizer
                  </p>
                  <p className={cn('mt-1.5 text-xs italic leading-relaxed opacity-85 font-serif', theme?.text)}>
                    &quot;{page.creator_message}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div
                className={cn('rounded-xl border p-2.5', keepsakeSoftClass)}
                style={{ backgroundColor: storyThemePalette?.softBg, borderColor: storyThemePalette?.softBorder }}
              >
                <p className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60', theme?.text)}>Wishes</p>
                <p className={cn('mt-1 text-lg font-bold', theme?.text)}>{messages?.length || 0}</p>
              </div>
              <div
                className={cn('rounded-xl border p-2.5', keepsakeSoftClass)}
                style={{ backgroundColor: storyThemePalette?.softBg, borderColor: storyThemePalette?.softBorder }}
              >
                <p className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60', theme?.text)}>Date</p>
                <p className={cn('mt-1 text-xs font-bold truncate', theme?.text)}>
                  {birthdayDate ? format(birthdayDate, 'MMM d, yyyy') : 'Special day'}
                </p>
              </div>
            </div>
          </article>
        )}

        {currentActiveSlide?.kind === 'stats' && (
          <article
            className={cn(
              'pointer-events-auto rounded-[2rem] border p-6 shadow-2xl overflow-y-auto max-h-[calc(100dvh-10rem)] flex flex-col justify-between',
              keepsakePaperClass,
            )}
            style={{
              backgroundColor: storyThemePalette?.paperBg || 'rgba(255,255,255,0.92)',
              borderColor: storyThemePalette?.paperBorder || 'rgba(255,255,255,0.4)',
            }}
          >
            <div>
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.24em] opacity-70 mb-2', theme?.text)}>
                The shape of the celebration
              </p>
              <h2 className={cn('text-3xl font-bold leading-tight font-serif', theme?.titleClass, theme?.font)}>
                Collected with love.
              </h2>
              <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme?.text)}>
                Before the story started, loved ones left little pieces of themselves here. This is what made it into the envelope.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div
                className={cn('col-span-2 rounded-2xl border p-4', keepsakeSoftClass)}
                style={{ backgroundColor: storyThemePalette?.softBg, borderColor: storyThemePalette?.softBorder }}
              >
                <p className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60', theme?.text)}>Wishes written</p>
                <p className={cn('mt-2 text-4xl font-extrabold', theme?.titleClass, theme?.font)}>{messages?.length || 0}</p>
              </div>
              <div
                className={cn('rounded-2xl border p-3.5', keepsakeSoftClass)}
                style={{ backgroundColor: storyThemePalette?.softBg, borderColor: storyThemePalette?.softBorder }}
              >
                <p className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60', theme?.text)}>Photos shared</p>
                <p className={cn('mt-1 text-2xl font-bold', theme?.text)}>{totalPhotos || 0}</p>
              </div>
              <div
                className={cn('rounded-2xl border p-3.5', keepsakeSoftClass)}
                style={{ backgroundColor: storyThemePalette?.softBg, borderColor: storyThemePalette?.softBorder }}
              >
                <p className={cn('text-[10px] font-bold uppercase tracking-wider opacity-60', theme?.text)}>Voice notes</p>
                <p className={cn('mt-1 text-2xl font-bold', theme?.text)}>{totalAudioWishes || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs opacity-60 pt-2 border-t border-black/5 dark:border-white/10">
              <span>Swipe or tap right to begin</span>
              <span>&rarr;</span>
            </div>
          </article>
        )}

        {currentActiveSlide?.kind === 'organizer' && page?.creator_message && (
          <article
            className={cn(
              'pointer-events-auto rounded-[2rem] border p-6 shadow-2xl overflow-y-auto max-h-[calc(100dvh-10rem)] text-center flex flex-col justify-center',
              keepsakePaperClass,
            )}
            style={{
              backgroundColor: storyThemePalette?.paperBg || 'rgba(255,255,255,0.92)',
              borderColor: storyThemePalette?.paperBorder || 'rgba(255,255,255,0.4)',
            }}
          >
            <div className="h-14 w-14 rounded-3xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center mb-4">
              <Heart className="h-7 w-7 fill-rose-500/30" />
            </div>
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.24em] opacity-70 mb-2', theme?.text)}>
              Organizer Note
            </p>
            <p className={cn('text-xl font-serif italic leading-relaxed', theme?.text)}>
              &quot;{page.creator_message}&quot;
            </p>
            <p className={cn('mt-4 text-xs opacity-60', theme?.text)}>
              Written before the reveal began
            </p>
          </article>
        )}

        {currentActiveSlide?.kind === 'wish' && (() => {
          const wish = currentActiveSlide.message;
          const wishPhotos = getMessagePhotos(wish);

          return (
            <article
              className={cn(
                'pointer-events-auto rounded-[2rem] border p-4.5 sm:p-5 shadow-2xl overflow-y-auto h-full max-h-[calc(100dvh-6rem)] flex flex-col justify-between relative transition-all duration-300',
                keepsakePaperClass,
              )}
              style={{
                backgroundColor: storyThemePalette?.paperBg || 'rgba(255,255,255,0.92)',
                borderColor: storyThemePalette?.paperBorder || 'rgba(255,255,255,0.4)',
              }}
            >
              <div>
                {/* Header: Letter number & Wish tag */}
                <div className="flex items-center justify-between border-b border-black/6 pb-2.5 mb-3">
                  <span className={cn('text-[10px] font-bold uppercase tracking-[0.2em] opacity-70', theme?.text)}>
                    Letter {currentActiveSlide.index + 1} of {messages?.length || 1}
                  </span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold', keepsakePillClass)}>
                    #{String(currentActiveSlide.index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Sender name */}
                <h3 className={cn('text-2xl font-bold font-serif leading-tight', theme?.titleClass, theme?.font)}>
                  {wish.sender_name}
                </h3>

                {/* Wish message */}
                <div className="my-3">
                  {isRichHtml(wish.message) ? (
                    <div
                      className={cn('wish-rich-text text-base leading-relaxed font-serif', theme?.text)}
                      dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(wish.message) }}
                    />
                  ) : (
                    <p className={cn('text-base leading-relaxed font-serif italic', theme?.text)}>
                      &quot;{wish.message}&quot;
                    </p>
                  )}
                </div>

                {/* Responsive Multi-Photo Layout */}
                {wishPhotos.length > 0 && (
                  <div className="my-3" data-no-nav="true">
                    <MobileWishPhotoGrid
                      photos={wishPhotos}
                      senderName={wish.sender_name}
                      onOpenPhoto={(photo) =>
                        setExpandedPhoto?.({
                          url: resolveAssetUrl(photo.photo_url) || photo.photo_url,
                          caption: photo.caption,
                          senderName: wish.sender_name,
                        })
                      }
                    />
                  </div>
                )}

                {/* Audio Voice Player docked inside card */}
                {wish.audio_url && (
                  <div
                    className={cn('my-3 rounded-2xl border p-3', keepsakeSoftClass)}
                    data-no-nav="true"
                    style={{ backgroundColor: storyThemePalette?.softBg, borderColor: storyThemePalette?.softBorder }}
                  >
                    <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5', theme?.text)}>
                      <Music4 className="h-3.5 w-3.5 text-rose-500" />
                      Voice Note
                    </p>
                    {renderWishAudioPlayer?.(wish, 'w-full')}
                  </div>
                )}

                {/* Floating stickers */}
                {wish.stickers && wish.stickers.length > 0 && (
                  <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                    {wish.stickers.map((s: { id: string; sticker_type: string; position_x: number; position_y: number; rotation: number; scale: number }) => (
                      <div
                        key={s.id}
                        className="absolute select-none text-4xl drop-shadow-sm"
                        style={{
                          left: `${s.position_x}%`,
                          top: `${s.position_y}%`,
                          transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})`,
                        }}
                      >
                        {STICKER_EMOJI_MAP[s.sticker_type] ?? s.sticker_type}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer tags */}
              <div className="flex items-center justify-between pt-2 border-t border-black/6 text-[10px] opacity-60">
                <span>Personal wish keepsake</span>
                <span>Tap right for next &rarr;</span>
              </div>
            </article>
          );
        })()}

        {currentActiveSlide?.kind === 'closing' && (
          <article
            className={cn(
              'pointer-events-auto rounded-[2rem] border p-6 shadow-2xl overflow-y-auto max-h-[calc(100dvh-10rem)] text-center flex flex-col justify-between',
              keepsakePaperClass,
            )}
            style={{
              backgroundColor: storyThemePalette?.paperBg || 'rgba(255,255,255,0.92)',
              borderColor: storyThemePalette?.paperBorder || 'rgba(255,255,255,0.4)',
            }}
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.24em] opacity-70 mb-2', theme?.text)}>
                Final page
              </p>
              <h2 className={cn('text-3xl font-bold leading-tight font-serif', theme?.titleClass, theme?.font)}>
                Keep this close,
                <br />
                {page?.recipient_name}.
              </h2>
              <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme?.text)}>
                Every wish, photo, and voice clip here was gathered to celebrate your milestone. This canvas is preserved forever.
              </p>
            </div>

            <div className="space-y-2 mt-5" data-no-nav="true">
              <button
                type="button"
                onClick={() => setShowShareCard?.(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 py-3 text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
              >
                <Share2 className="h-4 w-4" />
                Share this story
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide?.(0)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-white/20 bg-white/70 dark:bg-white/10 py-2.5 text-xs font-bold hover:bg-white transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replay from start
              </button>
            </div>
          </article>
        )}
      </div>

      {/* 5. BOTTOM KEEPSAKE ACTION BAR */}
      <div
        className="relative z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-1 flex items-center justify-between gap-2 shrink-0 pointer-events-auto"
        data-no-nav="true"
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goToPreviousSlide?.()}
            disabled={slideIndex === 0}
            className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/25 active:scale-95 transition-all"
            aria-label="Previous story slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToNextSlide?.()}
            disabled={slideIndex >= totalSlides - 1}
            className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/25 active:scale-95 transition-all"
            aria-label="Next story slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canShowKeepsakeDownload && (
            <button
              type="button"
              onClick={() => {
                if (typeof handleOpenExportModal === 'function') {
                  handleOpenExportModal();
                } else {
                  void handleDownloadKeepsake?.();
                }
              }}
              disabled={downloadingPdf || downloadingVideo || downloadingImage}
              className="inline-flex items-center gap-1.5 h-9 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 px-3.5 text-xs font-bold hover:bg-white/30 active:scale-95 transition-all"
            >
              {downloadingPdf || downloadingVideo || downloadingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>
                {downloadingPdf
                  ? 'PDF...'
                  : downloadingVideo
                    ? 'Video...'
                    : downloadingImage
                      ? 'Image...'
                      : 'Download'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowShareCard?.(true)}
            className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
            aria-label="Share story"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
});
