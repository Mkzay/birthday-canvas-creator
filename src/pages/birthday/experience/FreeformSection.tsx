import { memo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  Wallet,
  Gift,
  Check,
} from 'lucide-react';
import BentoGridView from '@/components/BentoGridView';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/api';
import { stripHtml, isRichHtml, sanitizeWishHtmlForDisplay, wishMessageHtmlWithQuotes } from '@/lib/wish-utils';
import {
  formatNairaNumberFromKobo,
  getMessagePhotos,
  getMobileSectionCaption,
  getMobileSectionLabel,
  getMobileSectionMarker,
  getMobileSectionTone,
  getStoryMotionDuration,
  STICKER_EMOJI_MAP,
} from '@/pages/birthday';
import type { Message, MessagePhoto } from '@/pages/birthday/types';
import { useBirthdayView } from '@/pages/birthday/view/BirthdayPageViewContext';
import FloatingParticles from '@/components/FloatingParticles';


export const FreeformSection = memo(function FreeformSection() {
  const {
  activeSlide,
  beginReveal,
  birthdayDate,
  burstMessages,
  canShowKeepsakeDownload,
  clampedS,
  clampedS2,
  contributorLine,
  coverHintLabel,
  coverPhotoSrc,
  currentSlide,
  currentSlideDuration,
  downloadingPdf,
  downloadingVideo,
  effectiveViewMode,
  expandedFreeformCardIds,
  experienceInsetClass,
  experiencePanelClass,
  freeformBoardSectionRef,
  freeformOpenerPalette,
  freeformStarsCanvasRef,
  freeformThemePalette,
  getStoryDelayStyle,
  goToNextSlide,
  goToPreviousSlide,
  handleBoardParallaxLeave,
  handleBoardParallaxMove,
  handleDownloadKeepsake,
  handleDownloadVideoKeepsake,
  handlePauseControl,
  handlePlayControl,
  handleReleasePoolPayout,
  handleRequestGiftRelease,
  handleStageClick,
  handleTouchEnd,
  handleTouchStart,
  hasMessages,
  includeSoundtrackInVideo,
  isDarkExperience,
  isDesktopPlaybackPaused,
  isFreeformBoardEntered,
  isFreeformIntroExiting,
  isPageOwner,
  isPreview,
  isSaved,
  keepsakePaperClass,
  keepsakePhotoBoardClass,
  keepsakePillClass,
  keepsakeSoftClass,
  landedFreeformCards,
  loading,
  messages,
  mixedLetterH,
  mobileCardsContainerRef,
  mobileFreeformMotion,
  mobileRevealRef,
  navigate,
  page,
  pageId,
  paidContributorLine,
  poolSummary,
  poppedFreeformDecorators,
  releasingPoolPayout,
  renderStoryImage,
  renderWishAudioPlayer,
  requestingGiftRelease,
  revealPhase,
  revealSlides,
  setActiveWishAudioId,
  setCurrentSlide,
  setDownloadingPdf,
  setDownloadingVideo,
  setExpandedFreeformCardIds,
  setExpandedPhoto,
  setFreeformAnimationRun,
  setHasTriggeredIntro,
  setIncludeSoundtrackInVideo,
  setIsDesktopPlaybackPaused,
  setIsDesktopReveal,
  setIsFreeformBoardEntered,
  setIsFreeformIntroExiting,
  setIsPageOwner,
  setIsSaved,
  setLandedFreeformCards,
  setLoading,
  setMessages,
  setNowMs,
  setPage,
  setPendingDeleteAction,
  setPoolSummary,
  setPoppedFreeformDecorators,
  setReleasingPoolPayout,
  setRequestingGiftRelease,
  setRevealPhase,
  setShowRevealIntro,
  setShowShareCard,
  setSlideDirection,
  setSlideRemainingMs,
  setStartYoutube,
  setUnlockPin,
  setUnlocking,
  setViewMode,
  showRevealIntro,
  showRevealIntroInPreview,
  skipReveal,
  slideDirection,
  storyOpenerPalette,
  storyThemePalette,
  theme,
  toggleSavePage,
  totalAudioWishes,
  totalPhotos,
  user,
  viewMode,
  forceMobileView,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VM mirrors BirthdayPage closure until typed
} = useBirthdayView() as any;

  if (effectiveViewMode !== 'freeform') return null;

  return (
    <>
        <section
          ref={freeformBoardSectionRef}
          className={cn(
            'relative min-h-[100dvh] px-3 py-1 touch-pan-y overscroll-y-contain',
            forceMobileView
              ? '!block !min-h-full !overflow-y-auto !h-auto pt-10'
              : 'sm:h-[100dvh] sm:overflow-x-hidden sm:overflow-y-auto sm:px-5 sm:pb-5 sm:pt-0',
            'freeform-reveal board',
            isFreeformBoardEntered && 'enter',
          )}
          style={{
            background: freeformThemePalette.boardBackground,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <canvas ref={freeformStarsCanvasRef} className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />
          <div className="relative z-10 mx-auto w-full max-w-[66rem] pb-20 pt-2 sm:pt-8 xl:max-w-[88rem]">
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
            <div className={cn('mb-5 sm:mb-6', forceMobileView ? '!block' : 'md:hidden', 'card-wrap', landedFreeformCards.has('mobile-cover') && 'landed')}>
              <article
                className="relative mx-auto w-[calc(100%-20px)] max-w-[24rem] rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                style={{
                  marginLeft: '8px',
                  transform: 'rotate(-1.1deg)',
                  '--final-r': '-1.1deg',
                  backgroundColor: freeformThemePalette.cards[0].bg,
                  borderColor: freeformThemePalette.cards[0].border,
                  color: freeformThemePalette.cards[0].text,
                } as CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className={cn('pointer-events-none absolute tape-el', poppedFreeformDecorators.has('mobile-cover') && 'pop')}
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
              <div className={cn('mb-5 sm:mb-6', forceMobileView ? '!block' : 'md:hidden', 'card-wrap', landedFreeformCards.has('mobile-organizer') && 'landed')}>
                <article
                  className="relative mx-auto w-[calc(100%-20px)] max-w-[22rem] rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                  style={{
                    marginLeft: '18px',
                    transform: 'rotate(1.2deg)',
                    '--final-r': '1.2deg',
                    backgroundColor: freeformThemePalette.cards[1].bg,
                    borderColor: freeformThemePalette.cards[1].border,
                    color: freeformThemePalette.cards[1].text,
                  } as CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className={cn('pointer-events-none absolute pin-dot', poppedFreeformDecorators.has('mobile-organizer') && 'pop')}
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
                  <div ref={mobileCardsContainerRef} className={cn('space-y-4', forceMobileView ? '!block' : 'md:hidden')}>
                    {boardMessages.map((message, index) => {
                      const cardAnimationKey = `mobile-message-${message.id}`;
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
                          className={cn('relative rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out mobile-card', 'card-wrap', landedFreeformCards.has(cardAnimationKey) && 'landed')}
                          style={{
                            marginLeft: `${index % 2 === 0 ? 4 : 14}px`,
                            width: 'calc(100% - 20px)',
                            transform: `rotate(${rotation}deg)`,
                            '--final-r': `${rotation}deg`,
                            '--start-x': `${index % 2 === 0 ? '-30%' : '30%'}`,
                            '--start-rot': `${rotation * -1}deg`,
                            '--scroll-delay': `${index * mobileFreeformMotion.scrollStaggerMs}ms`,
                            '--mobile-duration': `${mobileFreeformMotion.cardDurationMs}ms`,
                            backgroundColor: tone.bg,
                            borderColor: isExpanded ? freeformThemePalette.accentBorder : tone.border,
                            color: tone.text,
                          } as CSSProperties}
                        >
                          {index % 2 === 0 ? (
                            <span
                              aria-hidden="true"
                              className={cn('pointer-events-none absolute tape-el', poppedFreeformDecorators.has(cardAnimationKey) && 'pop')}
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
                              className={cn('pointer-events-none absolute pin-dot', poppedFreeformDecorators.has(cardAnimationKey) && 'pop')}
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
                            className={cn("block w-full", photoCount === 0 && voiceCount === 0 ? "text-center" : "text-left")}
                          >
                            <div className={cn("flex items-start gap-3", photoCount === 0 && voiceCount === 0 ? "justify-center" : "justify-between")}>
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedPhoto({
                                            url: resolvedPhotoUrl,
                                            caption: photo.caption,
                                            senderName: message.sender_name,
                                          });
                                        }}
                                      >
                                        {renderStoryImage(resolvedPhotoUrl, `Photo from ${message.sender_name}`, { disableParallax: true })}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
      
                              {voiceCount > 0 && (
                                <div
                                  className="mt-3 space-y-2"
                                  data-no-nav="true"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {renderWishAudioPlayer(message, 'w-full')}
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
      
                  <div className={cn(forceMobileView ? '!hidden' : 'hidden md:block')}>
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
                              const cardAnimationKey = card.type === 'cover'
                                ? 'desktop-cover'
                                : card.type === 'organizer'
                                  ? 'desktop-organizer'
                                  : 'desktop-closing';
                              const metaTone =
                                card.type === 'cover'
                                  ? freeformThemePalette.cards[0]
                                  : card.type === 'organizer'
                                    ? freeformThemePalette.cards[1]
                                    : freeformThemePalette.cards[3];
      
                              return (
                                <article
                                  key={`meta-${card.type}`}
                                  className={cn('relative mb-6 inline-block w-full break-inside-avoid rounded-[1.2rem] border px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.10)]', 'card-wrap', landedFreeformCards.has(cardAnimationKey) && 'landed')}
                                  style={{
                                    transform: `rotate(${rotation}deg)`,
                                    '--final-r': `${rotation}deg`,
                                    backgroundColor: metaTone.bg,
                                    borderColor: metaTone.border,
                                    color: metaTone.text,
                                  } as CSSProperties}
                                >
                                  {index % 2 === 0 ? (
                                    <span
                                      aria-hidden="true"
                                      className={cn('pointer-events-none absolute tape-el', poppedFreeformDecorators.has(cardAnimationKey) && 'pop')}
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
                                      className={cn('pointer-events-none absolute pin-dot', poppedFreeformDecorators.has(cardAnimationKey) && 'pop')}
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
      
                                      <div className="mt-3 rounded-xl border border-black/10 bg-white/35 p-3" data-no-nav="true">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Make moments unforgettable</p>
                                        <p className="mt-1 text-xs font-semibold leading-snug">Create a celebration for someone special</p>
                                        <div className="mt-2.5">
                                          <Link to="/create">
                                            <Button size="sm" className="h-7 w-full gap-1.5 rounded-lg text-xs shadow-sm">
                                              <Sparkles className="h-3 w-3" />
                                              <span>Create a WishCanvas</span>
                                            </Button>
                                          </Link>
                                        </div>
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
                            const cardAnimationKey = `desktop-message-${message.id}`;
                            const isExpanded = expandedFreeformCardIds.has(message.id);
                            const tone = freeformCardPalette[index % freeformCardPalette.length];
                            const photos = getMessagePhotos(message);
                            const photoCount = photos.length;
                            const voiceCount = message.audio_url ? 1 : 0;
                            const compactMessage = stripHtml(message.message || '').trim();
      
                            return (
                              <article
                                key={message.id}
                                className={cn('relative mb-6 inline-block w-full break-inside-avoid rounded-[1.2rem] border px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-all duration-300 ease-out', 'card-wrap', landedFreeformCards.has(cardAnimationKey) && 'landed')}
                                style={{
                                  transform: `rotate(${rotation}deg)`,
                                  '--final-r': `${rotation}deg`,
                                  backgroundColor: tone.bg,
                                  borderColor: isExpanded ? freeformThemePalette.accentBorder : tone.border,
                                  color: tone.text,
                                } as CSSProperties}
                              >
                                {index % 2 === 0 ? (
                                  <span
                                    aria-hidden="true"
                                    className={cn('pointer-events-none absolute tape-el', poppedFreeformDecorators.has(cardAnimationKey) && 'pop')}
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
                                    className={cn('pointer-events-none absolute pin-dot', poppedFreeformDecorators.has(cardAnimationKey) && 'pop')}
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
                                  className={cn("block w-full", photoCount === 0 && voiceCount === 0 ? "text-center" : "text-left")}
                                >
                                  <div className={cn("flex items-start gap-3", photoCount === 0 && voiceCount === 0 ? "justify-center" : "justify-between")}>
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
            <div className={cn('mt-8 sm:mt-10 md:hidden', 'card-wrap', landedFreeformCards.has('mobile-closing') && 'landed')}>
              <article
                className="relative mx-auto w-[calc(100%-20px)] max-w-[24rem] rounded-[1.15rem] border px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                style={{
                  marginLeft: '10px',
                  transform: 'rotate(-0.9deg)',
                  '--final-r': '-0.9deg',
                  backgroundColor: '#ECF8F3',
                  borderColor: '#AFD7C8',
                  color: '#1F5D4A',
                } as CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className={cn('pointer-events-none absolute tape-el', poppedFreeformDecorators.has('mobile-closing') && 'pop')}
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
                <div className="mt-3 rounded-xl border border-black/10 bg-white/45 p-3" data-no-nav="true">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Make moments unforgettable</p>
                  <p className="mt-1 text-xs font-semibold leading-snug">Create a celebration for someone special</p>
                  <div className="mt-2.5">
                    <Link to="/create">
                      <Button size="sm" className="h-8 w-full gap-1.5 rounded-lg text-xs shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Create a WishCanvas</span>
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="mt-3 border-t border-black/10 pt-2 text-xs leading-relaxed opacity-80">
                  Signed by{contributorLine ? ` ${contributorLine}` : ' everyone who wrote'}. Happy birthday, {page.recipient_name}. You were worth gathering all of this for.
                </p>
              </article>
            </div>
          </div>
        </section>
    </>
  );
});
