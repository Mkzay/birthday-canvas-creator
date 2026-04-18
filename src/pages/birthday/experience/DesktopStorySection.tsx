import { memo, type CSSProperties, type ReactNode } from 'react';
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


export const DesktopStorySection = memo(function DesktopStorySection() {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VM mirrors BirthdayPage closure until typed
} = useBirthdayView() as any;
  return (
    <>
      {/* Desktop: story (slide) view */}
      <section
        className={cn(
          'story-desktop-responsive relative hidden h-[100dvh] overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 sm:block',
          effectiveViewMode !== 'story' && '!hidden',
        )}
        style={{ background: storyThemePalette.sectionBackground }}
      >
        <div aria-hidden="true" className="slide-stars-layer" style={{ opacity: 0.68, '--star-end-y': '185%', '--layer-time-offset': '-0.9s' } as CSSProperties}>
          <div className="slide-star" style={{ left: '5%', '--star-x': '0%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '11%', '--star-x': '-1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '16%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '22%', '--star-x': '1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '28%', '--star-x': '-3%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '35%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '41%', '--star-x': '4%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '48%', '--star-x': '-1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '54%', '--star-x': '-2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '61%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '67%', '--star-x': '3%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '74%', '--star-x': '-2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '80%', '--star-x': '-4%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '87%', '--star-x': '1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '93%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '97%', '--star-x': '-1%' } as CSSProperties} />
        </div>
        <div className="story-desktop-shell mx-auto flex min-h-full max-w-6xl flex-col">
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
      
          <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                Birthday playback
              </p>
              <h1 className={cn('mt-2 max-w-[16rem] text-[2.1rem] font-bold leading-[0.94] sm:max-w-none sm:text-3xl', theme.titleClass, theme.font)}>
                {page.recipient_name}&apos;s birthday story
              </h1>
            </div>
            <div className="self-start rounded-full px-3 py-1.5 text-xs font-medium sm:self-auto sm:px-4 sm:py-2 sm:text-sm" style={{ backgroundColor: storyThemePalette.topBadgeBg, color: storyThemePalette.topBadgeText }}>
              Slide {currentSlide + 1} of {revealSlides.length}
            </div>
          </div>
      
          <div
            className="story-desktop-stage relative mt-2 h-[74svh] min-h-[34rem] max-h-[52rem] overflow-hidden sm:mt-3"
            onClick={handleStageClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeSlide && (
              <div key={activeSlide.id} className={cn('h-full', slideDirection === 'back' ? 'animate-wrapped-slide-reverse' : 'animate-wrapped-slide')}>
                <div className="story-desktop-scale h-full">
                  <div
                    className={cn('story-desktop-card relative h-full overflow-hidden rounded-[2rem] border p-3 shadow-[0_30px_90px_rgba(18,18,23,0.14)] sm:rounded-[2.4rem] sm:p-6 lg:p-8', experiencePanelClass)}
                    style={{ backgroundColor: storyThemePalette.panelBg, borderColor: storyThemePalette.panelBorder }}
                  >
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-[10%] top-[10%] h-40 w-40 rounded-full blur-3xl sm:h-56 sm:w-56" style={{ background: storyThemePalette.orbA }} />
                    <div className="absolute bottom-[-8%] right-[-4%] h-48 w-48 rounded-full blur-3xl sm:h-72 sm:w-72" style={{ background: storyThemePalette.orbB }} />
                    <div className={cn('absolute inset-0 opacity-70', isDarkExperience ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.04),transparent_45%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_34%),linear-gradient(145deg,rgba(255,246,236,0.76),transparent_45%)]')} />
                  </div>
                  <div aria-hidden="true" className="slide-stars-layer" style={{ '--layer-time-offset': '-1.75s' } as CSSProperties}>
                    <div className="slide-star" style={{ left: '6%', '--star-x': '0%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '15%', '--star-x': '-1%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '24%', '--star-x': '3%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '34%', '--star-x': '1%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '46%', '--star-x': '-2%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '57%', '--star-x': '2%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '68%', '--star-x': '4%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '77%', '--star-x': '-1%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '86%', '--star-x': '-3%' } as CSSProperties} />
                    <div className="slide-star" style={{ left: '94%', '--star-x': '2%' } as CSSProperties} />
                  </div>
      
                  <div className="relative z-10 h-full">
                    {activeSlide.kind === 'cover' && (
                      <div className={cn('story-slide-cover-grid grid h-full gap-4 lg:items-start', coverPhotoSrc ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'lg:mx-auto lg:max-w-2xl')}>
                        <div className="flex h-full flex-col gap-4 lg:justify-center">
                          <article className={cn('story-slide-cover-card story-stage-reveal relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2.1rem] sm:p-7 lg:p-8', keepsakePaperClass)} style={getStoryDelayStyle(50, getStoryMotionDuration(activeSlide))}>
                            <div className={cn('absolute right-5 top-5 h-16 w-16 rounded-full blur-2xl', isDarkExperience ? 'bg-white/10' : 'bg-amber-100/85')} />
                            <p className={cn('relative text-xs font-semibold uppercase tracking-[0.28em] opacity-70', theme.text)}>
                              First page out of the envelope
                            </p>
                            <h2 className={cn('story-slide-cover-title relative mt-3 text-[2.4rem] font-bold leading-[0.95] sm:mt-4 sm:text-5xl lg:text-6xl', theme.titleClass, theme.font)}>
                              Happy Birthday,
                              <br />
                              {page.recipient_name}.
                            </h2>
                            <p className={cn('story-slide-cover-copy relative mt-4 max-w-xl text-[0.98rem] leading-relaxed opacity-80 sm:mt-5 sm:text-[1.08rem] lg:text-[1.14rem]', theme.text)}>
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
                          <article className={cn('story-slide-cover-photo story-stage-reveal-soft relative overflow-hidden rounded-[1.7rem] border lg:h-full', keepsakeSoftClass)} style={getStoryDelayStyle(170, 760)}>
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
                    <div className="flex h-full items-center justify-center">
                      <article className={cn('story-stage-reveal relative flex h-full w-full max-w-5xl flex-col items-center justify-center rounded-[2rem] border p-6 text-center sm:p-10', keepsakePaperClass)} style={getStoryDelayStyle(90)}>
                        <div className={cn('story-stage-reveal-soft flex h-20 w-20 items-center justify-center rounded-[2rem] border', experienceInsetClass)} style={getStoryDelayStyle(60)}>
                          <Heart className={cn('h-10 w-10', theme.text)} />
                        </div>
                        <p className={cn('story-stage-reveal-soft mt-8 text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)} style={getStoryDelayStyle(120)}>
                          A note from the organizer
                        </p>
                        <p className={cn('story-stage-reveal mt-6 max-w-4xl text-3xl italic leading-[1.3] sm:text-5xl', theme.text)} style={getStoryDelayStyle(180)}>
                          &quot;{page.creator_message}&quot;
                        </p>
                        <p className={cn('story-stage-reveal-soft mt-6 text-sm opacity-70', theme.text)} style={getStoryDelayStyle(250)}>Written before the reveal began.</p>
                      </article>
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
      
                      let photoLayout: ReactNode = null;
      
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
                        <div className={cn("story-slide-wish-grid h-full lg:items-start", photoCount > 0 ? "grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" : "mx-auto flex h-full w-full max-w-3xl flex-col justify-center") }>
                          <div className={cn('flex flex-col gap-4 lg:justify-center', photoCount === 0 && !activeSlide.message.audio_url && 'h-full justify-center')}>
                            <article className={cn('story-slide-wish-card story-stage-reveal relative overflow-hidden rounded-[1.85rem] border p-5 sm:rounded-[2rem] sm:p-6 lg:p-7', keepsakePaperClass, photoCount === 0 && !activeSlide.message.audio_url && 'flex flex-col justify-center')} style={getStoryDelayStyle(60, getStoryMotionDuration(activeSlide))}>
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
                                  <h2 className={cn('story-slide-wish-title mt-3 text-3xl font-bold leading-[0.98] sm:text-5xl', theme.titleClass, theme.font)}>
                                    {activeSlide.message.sender_name}
                                  </h2>
                                </div>
                                <div className={cn('hidden rounded-[1.25rem] border px-4 py-3 sm:block', keepsakeSoftClass)}>
                                  <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wish no.</p>
                                  <p className={cn('mt-1 text-xl font-semibold', theme.text)}>{String(activeSlide.index + 1).padStart(2, '0')}</p>
                                </div>
                              </div>
      
                              {isRichHtml(activeSlide.message.message)
                                ? <div className={cn('story-slide-wish-message wish-rich-text mt-4 text-lg leading-relaxed sm:mt-5 sm:text-[1.7rem] sm:leading-[1.45]', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(activeSlide.message.message) }} />
                                : <p className={cn('story-slide-wish-message mt-4 text-lg leading-relaxed sm:mt-5 sm:text-[1.7rem] sm:leading-[1.45]', theme.text)}>
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
      
                          </div>
      
                          {photoCount > 0 && (
                            <section
                              className={cn('story-slide-wish-photos story-stage-reveal story-photo-board relative overflow-hidden rounded-[1.95rem] border p-3 sm:rounded-[2.15rem] sm:p-4 lg:h-full lg:p-5', keepsakePhotoBoardClass)}
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
      
                            {poolSummary.pool_fundraising_enabled && poolSummary.pooled_amount_kobo > 0 && (
                              <div className={cn('mt-4 rounded-2xl border p-4', keepsakePillClass)} data-no-nav="true">
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70', theme.text)}>Pooled gift</p>
                                <p className={cn('mt-2 text-2xl font-semibold', theme.titleClass, theme.font)}>
                                  ₦{formatNairaNumberFromKobo(poolSummary.pooled_amount_kobo)}
                                </p>
                                {poolSummary.pool_description && (
                                  <p className={cn('mt-2 text-sm leading-relaxed opacity-80', theme.text)}>{poolSummary.pool_description}</p>
                                )}
                                {paidContributorLine && (
                                  <p className={cn('mt-2 text-xs leading-relaxed opacity-75', theme.text)}>Paid by {paidContributorLine}.</p>
                                )}
                                {isPageOwner && !isPreview && (
                                  <div className="mt-3">
                                    {poolSummary.is_released ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                        <Check className="h-3.5 w-3.5" />
                                        Payout released
                                      </span>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-9 gap-2"
                                        onClick={handleReleasePoolPayout}
                                        disabled={releasingPoolPayout || poolSummary.pooled_amount_kobo <= 0 || !page?.is_revealed}
                                      >
                                        {releasingPoolPayout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                                        Release Gift
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {!isPageOwner && !isPreview && !poolSummary.is_released && !poolSummary.is_requested && (
                                  <div className="mt-3">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-9 gap-2"
                                      onClick={handleRequestGiftRelease}
                                      disabled={requestingGiftRelease || !page?.is_revealed}
                                    >
                                      {requestingGiftRelease ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                                      Request Gift
                                    </Button>
                                  </div>
                                )}
                                {!isPageOwner && !isPreview && !poolSummary.is_released && poolSummary.is_requested && (
                                  <div className="mt-3">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                      <Check className="h-3.5 w-3.5" />
                                      Gift requested
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
    </>
  );
});
