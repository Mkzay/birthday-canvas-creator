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
  Sparkles,
  ArrowRight,
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
  forceMobileView,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VM mirrors BirthdayPage closure until typed
} = useBirthdayView() as any;

  if (effectiveViewMode !== 'story') return null;

  return (
    <>
      {/* Desktop: story (slide) view */}
      <section
        className={cn(
          'story-desktop-responsive relative hidden h-[100dvh] max-h-[100dvh] overflow-x-hidden overflow-y-auto px-3 py-2 sm:px-6 sm:py-2.5 sm:block',
          effectiveViewMode !== 'story' && '!hidden',
          forceMobileView && '!hidden',
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
        <div className="story-desktop-shell mx-auto flex h-full max-h-full max-w-6xl flex-col justify-between">
          <div className="flex items-start gap-4 shrink-0">
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
              <div className="hidden items-center gap-2 sm:flex shrink-0" data-no-nav="true">
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
      
          <div className="mt-1.5 flex flex-col gap-1 shrink-0 sm:mt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70 sm:text-xs', theme.text)}>
                Birthday playback
              </p>
              <h1 className={cn('mt-0.5 max-w-[16rem] text-xl font-bold leading-tight sm:max-w-none sm:text-2xl lg:text-3xl', theme.titleClass, theme.font)}>
                {page.recipient_name}&apos;s birthday story
              </h1>
            </div>
            <div className="self-start rounded-full px-3 py-1 text-xs font-medium sm:self-auto sm:px-3.5 sm:py-1.5 sm:text-sm" style={{ backgroundColor: storyThemePalette.topBadgeBg, color: storyThemePalette.topBadgeText }}>
              Slide {currentSlide + 1} of {revealSlides.length}
            </div>
          </div>
      
          <div
            className="story-desktop-stage relative my-1.5 sm:my-2 flex-1 min-h-0 overflow-hidden"
            onClick={handleStageClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeSlide && (
              <div key={activeSlide.id} className={cn('h-full', slideDirection === 'back' ? 'animate-wrapped-slide-reverse' : 'animate-wrapped-slide')}>
                <div className="story-desktop-scale h-full">
                  <div
                    className={cn('story-desktop-card relative h-full overflow-hidden rounded-[1.75rem] border p-3.5 shadow-[0_30px_90px_rgba(18,18,23,0.14)] sm:rounded-[2.2rem] sm:p-5 lg:p-6 xl:p-7', experiencePanelClass)}
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
                    {/* 1. COVER SLIDE */}
                    {activeSlide.kind === 'cover' && (
                      <div className={cn('story-slide-cover-grid grid h-full gap-4 items-stretch', coverPhotoSrc ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'max-w-3xl mx-auto w-full')}>
                        <article className={cn('story-slide-cover-card story-stage-reveal relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border p-5 sm:p-7 lg:p-8', keepsakePaperClass)} style={getStoryDelayStyle(50, getStoryMotionDuration(activeSlide))}>
                          <div className={cn('absolute right-5 top-5 h-20 w-20 rounded-full blur-2xl', isDarkExperience ? 'bg-white/10' : 'bg-amber-100/85')} />
                          
                          {/* Top Section */}
                          <div className="relative z-10">
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.28em] opacity-70 sm:text-xs', theme.text)}>
                              First page out of the envelope
                            </p>
                            <h2 className={cn('story-slide-cover-title mt-2 text-2xl font-bold leading-[1.05] sm:mt-3 sm:text-4xl lg:text-5xl', theme.titleClass, theme.font)}>
                              Happy Birthday,
                              <br />
                              {page.recipient_name}.
                            </h2>
                            <p className={cn('story-slide-cover-copy mt-2.5 max-w-xl text-xs leading-relaxed opacity-80 sm:mt-3 sm:text-sm lg:text-base', theme.text)}>
                              Every note, photo, and voice clip inside was chosen to make this feel less like a page and more like a gift being opened.
                            </p>
                          </div>

                          {/* Middle Section: Organizer Note if present */}
                          {page.creator_message && (
                            <div className={cn('relative z-10 my-3 rounded-2xl border p-3.5 sm:p-4 rotate-[-0.5deg]', keepsakeSoftClass)} style={getStoryDelayStyle(180)}>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-65', theme.text)}>Packed with a note from the organizer</p>
                              <p className={cn('mt-1 line-clamp-3 font-serif italic text-xs leading-relaxed sm:text-sm', theme.text)}>
                                &quot;{page.creator_message}&quot;
                              </p>
                            </div>
                          )}

                          {/* Bottom Section: Celebration Metrics */}
                          <div className="relative z-10 grid gap-2.5 sm:grid-cols-2">
                            <div className={cn('story-stage-reveal-soft rounded-2xl border p-3 sm:p-3.5', keepsakeSoftClass)} style={getStoryDelayStyle(160)}>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Wishes gathered</p>
                              <p className={cn('mt-1 text-xl font-bold sm:text-2xl', theme.titleClass, theme.font)}>{messages.length}</p>
                            </div>
                            <div className={cn('story-stage-reveal-soft rounded-2xl border p-3 sm:p-3.5', keepsakeSoftClass)} style={getStoryDelayStyle(220)}>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Reveal date</p>
                              <p className={cn('mt-1 text-xs font-semibold sm:text-sm', theme.text)}>{format(birthdayDate, 'MMMM d, yyyy')}</p>
                            </div>
                          </div>
                        </article>

                        {/* Right Photo Column */}
                        {coverPhotoSrc && (
                          <article className={cn('story-slide-cover-photo story-stage-reveal-soft relative overflow-hidden rounded-[2rem] border h-full min-h-[14rem] lg:min-h-0', keepsakeSoftClass)} style={getStoryDelayStyle(170, 760)}>
                            <button
                              type="button"
                              className="relative block h-full w-full group"
                              onClick={() => setExpandedPhoto({
                                url: coverPhotoSrc,
                                caption: `${page.recipient_name}'s birthday cover`,
                                senderName: 'Birthday page',
                              })}
                              aria-label={`Expand ${page.recipient_name}'s birthday cover`}
                            >
                              {renderStoryImage(coverPhotoSrc, `${page.recipient_name} birthday cover`, { disableParallax: true, eager: true })}
                              <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md group-hover:bg-black/70 transition-colors">
                                {coverHintLabel}
                              </span>
                            </button>
                          </article>
                        )}
                      </div>
                    )}

                    {/* 2. STATS SLIDE */}
                    {activeSlide.kind === 'stats' && (
                      <div className="grid h-full gap-4 lg:grid-cols-[0.95fr_1.05fr] items-stretch">
                        {/* Left Narrative Column */}
                        <div className="flex h-full flex-col justify-between gap-3.5">
                          <article className={cn('story-stage-reveal flex-1 flex flex-col justify-center relative overflow-hidden rounded-[2rem] border p-5 sm:p-7 lg:p-8', keepsakePaperClass)} style={getStoryDelayStyle(50, getStoryMotionDuration(activeSlide))}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.28em] opacity-70 sm:text-xs', theme.text)}>
                              The shape of the celebration
                            </p>
                            <h2 className={cn('mt-2 text-2xl font-bold leading-tight sm:mt-3 sm:text-4xl lg:text-5xl', theme.titleClass, theme.font)}>
                              Collected with love.
                            </h2>
                            <p className={cn('mt-3 max-w-xl text-xs leading-relaxed opacity-80 sm:text-sm lg:text-base', theme.text)}>
                              Before the story started, people left little pieces of themselves here. This is what made it into the envelope.
                            </p>
                          </article>

                          <article className={cn('story-stage-reveal-soft shrink-0 rounded-[1.75rem] border p-4 sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(150)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>What tonight feels like</p>
                            <p className={cn('mt-1.5 text-xs leading-relaxed sm:text-sm lg:text-[0.95rem]', theme.text)}>
                              Not a comment feed. A replayable set of moments gathered into one birthday delivery.
                            </p>
                          </article>
                        </div>

                        {/* Right Bento Metric Grid */}
                        <div className="grid h-full gap-3.5 sm:grid-cols-2 sm:grid-rows-2">
                          <article className={cn('story-stage-reveal sm:row-span-2 rounded-[2rem] border p-5 sm:p-7 flex flex-col justify-between', keepsakePaperClass)} style={getStoryDelayStyle(110)}>
                            <div>
                              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Wishes written</p>
                              <p className={cn('mt-3 text-6xl font-bold leading-none sm:text-7xl lg:text-8xl', theme.titleClass, theme.font)}>{messages.length}</p>
                            </div>
                            <p className={cn('max-w-[16rem] text-xs leading-relaxed opacity-80 sm:text-sm', theme.text)}>
                              Each one written with this exact moment in mind.
                            </p>
                          </article>

                          <article className={cn('story-stage-reveal-soft rounded-[1.75rem] border p-4 sm:p-5 flex flex-col justify-center rotate-[-0.75deg]', keepsakeSoftClass)} style={getStoryDelayStyle(210)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Photos added</p>
                            <p className={cn('mt-1.5 text-3xl font-bold sm:text-4xl', theme.titleClass, theme.font)}>{totalPhotos}</p>
                            <p className={cn('mt-1 text-xs opacity-75', theme.text)}>Snapshots that make the story grounded.</p>
                          </article>

                          <article className={cn('story-stage-reveal-soft rounded-[1.75rem] border p-4 sm:p-5 flex flex-col justify-center rotate-[0.75deg]', keepsakeSoftClass)} style={getStoryDelayStyle(260)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Voice notes</p>
                            <p className={cn('mt-1.5 text-3xl font-bold sm:text-4xl', theme.titleClass, theme.font)}>{totalAudioWishes}</p>
                            <p className={cn('mt-1 text-xs opacity-75', theme.text)}>Voices that make the reveal feel present.</p>
                          </article>
                        </div>
                      </div>
                    )}

                    {/* 3. ORGANIZER NOTE SLIDE */}
                    {activeSlide.kind === 'organizer' && page.creator_message && (
                      <div className="flex h-full w-full items-center justify-center">
                        <article className={cn('story-stage-reveal relative flex h-full w-full max-w-3xl flex-col items-center justify-between overflow-hidden rounded-[2.2rem] border p-7 text-center sm:p-10 lg:p-12 shadow-sm', keepsakePaperClass)} style={getStoryDelayStyle(90)}>
                          {/* Top Seal Medallion */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={cn('story-stage-reveal-soft flex h-14 w-14 items-center justify-center rounded-full border shadow-2xs', experienceInsetClass)} style={getStoryDelayStyle(60)}>
                              <Heart className={cn('h-7 w-7 text-rose-500 fill-rose-500/20')} />
                            </div>
                            <p className={cn('story-stage-reveal-soft mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] opacity-70', theme.text)} style={getStoryDelayStyle(120)}>
                              A note from the organizer
                            </p>
                          </div>

                          {/* Center Quote */}
                          <div className="my-auto py-4 max-w-2xl px-2">
                            <span className="text-4xl sm:text-6xl font-serif text-amber-500/40 select-none block leading-none">&ldquo;</span>
                            <p className={cn('story-stage-reveal -mt-2 text-xl font-serif italic leading-relaxed sm:text-3xl lg:text-4xl', theme.text)} style={getStoryDelayStyle(180)}>
                              {page.creator_message}
                            </p>
                            <span className="text-4xl sm:text-6xl font-serif text-amber-500/40 select-none block leading-none text-right">&rdquo;</span>
                          </div>

                          {/* Bottom Attestation */}
                          <div className="border-t border-black/8 w-full pt-3 shrink-0">
                            <p className={cn('story-stage-reveal-soft text-xs opacity-65 tracking-wider uppercase', theme.text)} style={getStoryDelayStyle(250)}>
                              Written with love before the reveal began
                            </p>
                          </div>
                        </article>
                      </div>
                    )}

                    {/* 4. WISH CONTRIBUTION SLIDES */}
                    {activeSlide.kind === 'wish' && (() => {
                      const wishPhotos = getMessagePhotos(activeSlide.message);
                      const photoCount = wishPhotos.length;
                      const hasPhotos = photoCount > 0;
                      const hasAudio = Boolean(activeSlide.message.audio_url);

                      const openPhoto = (photo: MessagePhoto) => {
                        setExpandedPhoto({
                          url: resolveAssetUrl(photo.photo_url) || photo.photo_url,
                          caption: photo.caption,
                          senderName: activeSlide.message.sender_name,
                        });
                      };

                      const photoFrameClass =
                        'group relative min-h-0 overflow-hidden rounded-[1.4rem] border border-white/45 bg-white/55 p-1.5 sm:p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)] transition-all duration-300 hover:shadow-xl hover:scale-[1.01]';

                      const renderPhotoCard = (photo: MessagePhoto, className?: string, containerAspect?: string) => (
                        <button
                          key={photo.id}
                          type="button"
                          className={cn(photoFrameClass, className, containerAspect)}
                          onClick={() => openPhoto(photo)}
                          aria-label={`Expand photo from ${activeSlide.message.sender_name}`}
                        >
                          <div className="relative isolate h-full min-h-[7.5rem] overflow-hidden rounded-[1.1rem] sm:rounded-[1.25rem] bg-[#dfe7dc]">
                            <img
                              className="story-photo-layer absolute inset-0 z-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              src={resolveAssetUrl(photo.photo_url) || photo.photo_url}
                              alt={`Photo from ${activeSlide.message.sender_name}`}
                              decoding="async"
                              loading="lazy"
                              draggable={false}
                            />
                            <div className="absolute inset-x-0 bottom-0 z-10 h-[46%] bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-2.5 sm:p-3.5">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-xs font-medium text-white">{photo.caption || 'Photo memory'}</p>
                                {!photo.caption && <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">From the story</p>}
                              </div>
                              <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">Open</span>
                            </div>
                            {isPreview && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute right-2.5 top-2.5 z-30 h-7 w-7 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
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
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </button>
                      );

                      /* PHOTO LAYOUT BY COUNT */
                      let photoLayout: ReactNode = null;
                      if (photoCount === 1) {
                        photoLayout = (
                          <div className="h-full w-full">
                            {renderPhotoCard(wishPhotos[0], 'h-full w-full rounded-[1.85rem]')}
                          </div>
                        );
                      } else if (photoCount === 2) {
                        photoLayout = (
                          <div className="h-full grid grid-rows-2 gap-3 sm:gap-3.5">
                            {wishPhotos.map((photo, photoIndex) =>
                              renderPhotoCard(photo, 'h-full min-h-0 w-full rounded-[1.6rem]', photoIndex === 0 ? 'rotate-[-0.5deg]' : 'rotate-[0.5deg]')
                            )}
                          </div>
                        );
                      } else if (photoCount === 3) {
                        photoLayout = (
                          <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 sm:gap-3.5">
                            {renderPhotoCard(wishPhotos[0], 'col-span-1 row-span-2 h-full min-h-0 w-full rounded-[1.6rem]')}
                            {renderPhotoCard(wishPhotos[1], 'col-span-1 row-span-1 h-full min-h-0 w-full rounded-[1.5rem]')}
                            {renderPhotoCard(wishPhotos[2], 'col-span-1 row-span-1 h-full min-h-0 w-full rounded-[1.5rem]')}
                          </div>
                        );
                      } else if (photoCount === 4) {
                        photoLayout = (
                          <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 sm:gap-3.5">
                            {wishPhotos.map((photo) =>
                              renderPhotoCard(photo, 'h-full min-h-0 w-full rounded-[1.5rem]')
                            )}
                          </div>
                        );
                      } else if (photoCount === 5) {
                        photoLayout = (
                          <div className="h-full grid grid-cols-6 grid-rows-2 gap-2.5 sm:gap-3">
                            {/* Top row: 2 photos, 3 cols each */}
                            {renderPhotoCard(wishPhotos[0], 'col-span-3 row-span-1 h-full min-h-0 w-full rounded-[1.45rem]')}
                            {renderPhotoCard(wishPhotos[1], 'col-span-3 row-span-1 h-full min-h-0 w-full rounded-[1.45rem]')}
                            {/* Bottom row: 3 photos, 2 cols each */}
                            {renderPhotoCard(wishPhotos[2], 'col-span-2 row-span-1 h-full min-h-0 w-full rounded-[1.35rem]')}
                            {renderPhotoCard(wishPhotos[3], 'col-span-2 row-span-1 h-full min-h-0 w-full rounded-[1.35rem]')}
                            {renderPhotoCard(wishPhotos[4], 'col-span-2 row-span-1 h-full min-h-0 w-full rounded-[1.35rem]')}
                          </div>
                        );
                      } else if (photoCount === 6) {
                        photoLayout = (
                          <div className="h-full grid grid-cols-3 grid-rows-2 gap-2.5 sm:gap-3">
                            {wishPhotos.map((photo) =>
                              renderPhotoCard(photo, 'col-span-1 row-span-1 h-full min-h-0 w-full rounded-[1.35rem]')
                            )}
                          </div>
                        );
                      } else if (photoCount >= 7) {
                        photoLayout = (
                          <div className="h-full overflow-y-auto pr-1.5 custom-scrollbar grid grid-cols-2 gap-2.5 sm:gap-3">
                            {wishPhotos.map((photo, photoIndex) =>
                              renderPhotoCard(
                                photo,
                                cn('min-h-[9.5rem] h-44 w-full rounded-[1.4rem]', photoIndex === 0 && 'col-span-2 h-52')
                              )
                            )}
                          </div>
                        );
                      }

                      /* SCENARIO 1: MESSAGE ONLY (NO PHOTOS, NO AUDIO) */
                      if (!hasPhotos && !hasAudio) {
                        return (
                          <div className="flex h-full w-full items-center justify-center">
                            <article className={cn('story-slide-wish-card story-stage-reveal relative flex h-full w-full max-w-3xl flex-col justify-between overflow-hidden rounded-[2.2rem] border p-6 sm:p-9 lg:p-11 shadow-sm', keepsakePaperClass)} style={getStoryDelayStyle(60, getStoryMotionDuration(activeSlide))}>
                              {/* Top Bar: Letter number & Wish number & Delete */}
                              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3.5 shrink-0">
                                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70 sm:text-xs', theme.text)}>
                                  Letter {activeSlide.index + 1} of {messages.length}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className={cn('rounded-full border px-3 py-0.5 text-xs font-mono font-bold', keepsakeSoftClass)}>
                                    Wish #{String(activeSlide.index + 1).padStart(2, '0')}
                                  </span>
                                  {isPreview && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 rounded-full px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingDeleteAction({
                                          kind: 'message',
                                          messageId: activeSlide.message.id,
                                          senderName: activeSlide.message.sender_name,
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Sender Name */}
                              <div className="mt-4 shrink-0">
                                <h2 className={cn('story-slide-wish-title text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl', theme.titleClass, theme.font)}>
                                  {activeSlide.message.sender_name}
                                </h2>
                              </div>

                              {/* Center Message Hero */}
                              <div className="my-auto py-4">
                                {isRichHtml(activeSlide.message.message) ? (
                                  <div className={cn('story-slide-wish-message wish-rich-text max-h-[50vh] sm:max-h-[54vh] overflow-y-auto pr-2 text-xl sm:text-2xl lg:text-3xl font-serif italic leading-relaxed custom-scrollbar scroll-smooth', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(activeSlide.message.message) }} />
                                ) : (
                                  <p className={cn('story-slide-wish-message max-h-[50vh] sm:max-h-[54vh] overflow-y-auto pr-2 text-xl sm:text-2xl lg:text-3xl font-serif italic leading-relaxed custom-scrollbar scroll-smooth', theme.text)}>
                                    &quot;{activeSlide.message.message}&quot;
                                  </p>
                                )}
                              </div>

                              {/* Stickers */}
                              {activeSlide.message.stickers && activeSlide.message.stickers.length > 0 && (
                                <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                                  {activeSlide.message.stickers.map((sticker: any) => (
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

                              {/* Footer */}
                              <div className="flex items-center justify-between border-t border-black/6 pt-3.5 shrink-0">
                                <span className={cn('rounded-full px-3.5 py-1 text-xs font-medium', keepsakePillClass)}>
                                  Personal letter keepsake
                                </span>
                                <span className={cn('text-[11px] opacity-60 tracking-wider uppercase', theme.text)}>
                                  Celebration memory
                                </span>
                              </div>
                            </article>
                          </div>
                        );
                      }

                      /* SCENARIO 2: MESSAGE + VOICE NOTE ONLY (NO PHOTOS, WITH AUDIO) */
                      if (!hasPhotos && hasAudio) {
                        return (
                          <div className="max-w-5xl mx-auto w-full h-full grid lg:grid-cols-[1.1fr_0.9fr] gap-4 sm:gap-6 items-stretch">
                            {/* Left Letter Card */}
                            <article className={cn('story-slide-wish-card story-stage-reveal relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-sm', keepsakePaperClass)} style={getStoryDelayStyle(60, getStoryMotionDuration(activeSlide))}>
                              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3 shrink-0">
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70 sm:text-xs', theme.text)}>
                                  Letter {activeSlide.index + 1} of {messages.length}
                                </p>
                                <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold', keepsakeSoftClass)}>
                                  Wish #{String(activeSlide.index + 1).padStart(2, '0')}
                                </span>
                              </div>

                              <div className="mt-3 shrink-0">
                                <h2 className={cn('story-slide-wish-title text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl', theme.titleClass, theme.font)}>
                                  {activeSlide.message.sender_name}
                                </h2>
                              </div>

                              <div className="my-auto py-3">
                                {isRichHtml(activeSlide.message.message) ? (
                                  <div className={cn('story-slide-wish-message wish-rich-text max-h-[48vh] sm:max-h-[52vh] overflow-y-auto pr-2 text-lg sm:text-xl font-serif italic leading-relaxed custom-scrollbar scroll-smooth', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(activeSlide.message.message) }} />
                                ) : (
                                  <p className={cn('story-slide-wish-message max-h-[48vh] sm:max-h-[52vh] overflow-y-auto pr-2 text-lg sm:text-xl font-serif italic leading-relaxed custom-scrollbar scroll-smooth', theme.text)}>
                                    &quot;{activeSlide.message.message}&quot;
                                  </p>
                                )}
                              </div>

                              <div className="border-t border-black/6 pt-3 shrink-0">
                                <span className={cn('rounded-full px-3 py-1 text-xs font-medium', keepsakePillClass)}>
                                  Voice note enclosed
                                </span>
                              </div>
                            </article>

                            {/* Right Audio Keepsake Card */}
                            <article className={cn('story-stage-reveal-soft relative flex h-full flex-col justify-between items-center rounded-[2rem] border p-6 sm:p-8 text-center shadow-md', keepsakeSoftClass)} data-no-nav="true" style={getStoryDelayStyle(170, 760)}>
                              {isPreview && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-4 top-4 text-destructive hover:bg-destructive/10"
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

                              <div className="flex flex-col items-center shrink-0">
                                <div className={cn('flex h-16 w-16 items-center justify-center rounded-full border shadow-sm', isDarkExperience ? 'bg-white/10' : 'bg-white')}>
                                  <Music4 className={cn('h-8 w-8', theme.text)} />
                                </div>
                                <p className={cn('mt-3 text-xs font-bold uppercase tracking-[0.24em]', theme.text)}>Voice Note Keepsake</p>
                                <p className={cn('text-xs opacity-70 mt-1', theme.text)}>Spoken with love by {activeSlide.message.sender_name}</p>
                              </div>

                              <div className="w-full my-auto py-4">
                                {renderWishAudioPlayer(activeSlide.message, 'w-full')}
                              </div>

                              <div className="border-t border-black/6 w-full pt-3 shrink-0">
                                <span className={cn('text-[11px] font-medium tracking-wide opacity-75', theme.text)}>
                                  Press play to listen to this wish
                                </span>
                              </div>
                            </article>
                          </div>
                        );
                      }

                      /* SCENARIOS 3-7: MESSAGE + PHOTOS (1, 2, 3, 4, 5+ PHOTOS, WITH OR WITHOUT AUDIO) */
                      return (
                        <div className="story-slide-wish-grid h-full grid lg:grid-cols-[0.95fr_1.05fr] gap-4 lg:gap-5 items-stretch">
                          {/* Left Column: Letter + Voice Note */}
                          <div className="flex h-full flex-col gap-3 justify-between">
                            <article className={cn('story-slide-wish-card story-stage-reveal relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden rounded-[1.85rem] border p-5 sm:p-6 lg:p-7 shadow-sm', keepsakePaperClass)} style={getStoryDelayStyle(60, getStoryMotionDuration(activeSlide))}>
                              {/* Header: Clean non-overlapping layout */}
                              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-2.5 shrink-0">
                                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70 sm:text-xs', theme.text)}>
                                  Letter {activeSlide.index + 1} of {messages.length}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold', keepsakeSoftClass)}>
                                    Wish #{String(activeSlide.index + 1).padStart(2, '0')}
                                  </span>
                                  {isPreview && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 rounded-full px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingDeleteAction({
                                          kind: 'message',
                                          messageId: activeSlide.message.id,
                                          senderName: activeSlide.message.sender_name,
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Sender Name */}
                              <div className="mt-2.5 shrink-0">
                                <h2 className={cn('story-slide-wish-title text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl', theme.titleClass, theme.font)}>
                                  {activeSlide.message.sender_name}
                                </h2>
                              </div>

                              {/* Message Text with Scroll Containment */}
                              <div className="my-auto py-2">
                                {isRichHtml(activeSlide.message.message) ? (
                                  <div className={cn('story-slide-wish-message wish-rich-text max-h-[46vh] sm:max-h-[50vh] overflow-y-auto pr-2 text-base leading-relaxed sm:text-lg lg:text-xl font-serif italic custom-scrollbar scroll-smooth', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(activeSlide.message.message) }} />
                                ) : (
                                  <p className={cn('story-slide-wish-message max-h-[46vh] sm:max-h-[50vh] overflow-y-auto pr-2 text-base leading-relaxed sm:text-lg lg:text-xl font-serif italic custom-scrollbar scroll-smooth', theme.text)}>
                                    &quot;{activeSlide.message.message}&quot;
                                  </p>
                                )}
                              </div>

                              {/* Stickers */}
                              {activeSlide.message.stickers && activeSlide.message.stickers.length > 0 && (
                                <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                                  {activeSlide.message.stickers.map((sticker: any) => (
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

                              {/* Tags Footer */}
                              <div className="mt-2 flex flex-wrap gap-2 border-t border-black/6 pt-2.5 shrink-0">
                                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', keepsakePillClass)}>
                                  {photoCount} {photoCount === 1 ? 'photo memory' : 'photo memories'}
                                </span>
                                {hasAudio && (
                                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', keepsakePillClass)}>
                                    Voice note below
                                  </span>
                                )}
                              </div>
                            </article>

                            {/* Docked Voice Note Player if present */}
                            {hasAudio && (
                              <article className={cn('story-stage-reveal-soft shrink-0 rounded-[1.4rem] border p-3 sm:p-3.5', keepsakeSoftClass)} data-no-nav="true" style={getStoryDelayStyle(170, 760)}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', isDarkExperience ? 'bg-white/10' : 'bg-white/80')}>
                                      <Music4 className={cn('h-4 w-4', theme.text)} />
                                    </div>
                                    <div>
                                      <p className={cn('text-xs font-semibold', theme.text)}>Voice note</p>
                                      <p className={cn('text-[10px] opacity-65', theme.text)}>A voice to go with the words.</p>
                                    </div>
                                  </div>
                                  {isPreview && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingDeleteAction({
                                          kind: 'audio',
                                          messageId: activeSlide.message.id,
                                          senderName: activeSlide.message.sender_name,
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                                {renderWishAudioPlayer(activeSlide.message, 'mt-2 w-full')}
                              </article>
                            )}
                          </div>

                          {/* Right Column: Photo Gallery Board */}
                          <section
                            className={cn('story-slide-wish-photos story-stage-reveal story-photo-board relative overflow-hidden rounded-[1.85rem] border p-3 sm:p-3.5 h-full min-h-0', keepsakePhotoBoardClass)}
                            style={getStoryDelayStyle(hasAudio ? 210 : 140, getStoryMotionDuration(activeSlide))}
                            onMouseMove={handleBoardParallaxMove}
                            onMouseLeave={handleBoardParallaxLeave}
                          >
                            <div className="absolute inset-x-4 top-2 flex items-center justify-between z-20 pointer-events-none">
                              <p className={cn('text-[9px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Photo keepsakes</p>
                              <p className={cn('text-[9px] font-semibold uppercase tracking-[0.18em] opacity-55', theme.text)}>Tap to open</p>
                            </div>
                            <div className="h-full pt-4">
                              {photoLayout}
                            </div>
                          </section>
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
      
                          <article className={cn('story-stage-reveal-soft rounded-[1.75rem] border p-4.5 text-left sm:p-5', keepsakeSoftClass)} style={getStoryDelayStyle(220, 760)}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Signed by the people who showed up</p>
                            <p className={cn('mt-2 text-base leading-relaxed sm:text-[1.05rem]', theme.text)}>
                              Happy birthday, {page.recipient_name}. This story was worth making because you were worth gathering for.
                            </p>
                            {contributorLine && (
                              <p className={cn('mt-2 text-xs leading-relaxed opacity-75', theme.text)}>
                                {contributorLine}.
                              </p>
                            )}
                          </article>

                          <article className={cn('story-stage-reveal-soft rounded-[1.5rem] border p-4.5 text-left sm:p-5 shadow-xs', keepsakePillClass)} data-no-nav="true" style={getStoryDelayStyle(280, 800)}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-5">
                              <div className="min-w-0 flex-1">
                                <p className={cn('text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] opacity-75', theme.text)}>
                                  Make moments unforgettable
                                </p>
                                <p className={cn('mt-0.5 text-sm sm:text-base font-bold leading-snug', theme.titleClass, theme.font)}>
                                  Create a celebration for someone you love
                                </p>
                                <p className={cn('mt-1 text-xs opacity-80 leading-relaxed', theme.text)}>
                                  Gather heartfelt messages, photos, and voice notes into one keepsake.
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center">
                                <Link to="/create" onClick={(e) => e.stopPropagation()} className="group inline-flex w-full sm:w-auto">
                                  <Button
                                    variant="hero"
                                    size="sm"
                                    className="btn-press w-full sm:w-auto h-9 sm:h-10 px-4.5 sm:px-5 gap-2 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 active:scale-95 transition-all text-white border-0"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                                    <span>Create a WishCanvas</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-white/80 transition-transform group-hover:translate-x-0.5" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
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
      
          <div className="mt-1.5 flex items-center justify-between shrink-0 sm:mt-2 py-0.5">
            <div className="hidden items-center gap-2 sm:flex" data-no-nav="true">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl text-xs font-semibold" onClick={goToPreviousSlide} disabled={currentSlide === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button variant="hero" size="sm" className="h-8 gap-1.5 rounded-xl text-xs font-semibold" onClick={goToNextSlide} disabled={currentSlide === revealSlides.length - 1}>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className={cn('text-[9px] uppercase tracking-[0.14em] opacity-60 sm:text-xs sm:tracking-[0.22em]', theme.text)}>
              <span className="sm:hidden">Swipe or tap edges</span>
              <span className="hidden sm:inline">Tap sides or swipe to move through the story</span>
            </p>
            <Link to="/create" className={cn('hidden text-xs sm:text-sm font-medium opacity-70 transition-opacity hover:opacity-100 sm:block', theme.text)}>
              Create your own
            </Link>
          </div>
        </div>
      </section>
    </>
  );
});
