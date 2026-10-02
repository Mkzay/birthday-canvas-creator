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


export const RevealIntroOverlay = memo(function RevealIntroOverlay() {
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
} = useBirthdayView() as any;
  return (
    <>
        <div
          className={cn(
            forceMobileView ? 'absolute inset-0' : 'fixed inset-0',
            'z-40 flex items-center justify-center backdrop-blur-md',
            effectiveViewMode === 'freeform' ? 'px-0' : 'px-4',
            effectiveViewMode === 'freeform' && 'freeform-intro intro',
            effectiveViewMode === 'freeform' && isFreeformIntroExiting && 'exit',
          )}
          style={{
            background: effectiveViewMode === 'freeform'
              ? freeformOpenerPalette.backdrop
              : storyOpenerPalette.backdrop,
          }}
        >
          <div className={cn('relative flex w-full items-center justify-center', effectiveViewMode !== 'freeform' && 'max-w-5xl')}>
            {effectiveViewMode !== 'freeform' && (
              <button
                type="button"
                onClick={() => void skipReveal()}
                className={cn(
                  'absolute z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/18',
                  forceMobileView ? 'top-2 right-2' : 'top-4 sm:top-6 right-0',
                )}
              >
                <SkipForward className="h-4 w-4" />
                Skip intro
              </button>
            )}
      
            <div className={cn('relative flex w-full items-center justify-center', forceMobileView ? 'min-h-full py-4' : 'min-h-[100dvh] py-20')}>
              {effectiveViewMode !== 'freeform' && (
                <FloatingParticles hue={mixedLetterH} saturation={((clampedS + clampedS2) / 2) * 100} />
              )}
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0"
                  style={
                    effectiveViewMode === 'freeform'
                      ? { background: freeformOpenerPalette.textureLayer }
                      : { background: storyOpenerPalette.textureLayer }
                  }
                />
                <div
                  className="absolute left-1/2 top-[43%] h-[30rem] w-[20rem] -translate-x-1/2 rounded-full blur-3xl"
                  style={
                    effectiveViewMode === 'freeform'
                      ? { background: freeformOpenerPalette.halo }
                      : { background: storyOpenerPalette.halo }
                  }
                />
              </div>
      
              <div
                className={cn(
                  'relative flex w-full flex-col items-center justify-center',
                  effectiveViewMode === 'freeform' ? 'max-w-none px-3 sm:px-8 lg:px-14' : 'max-w-xl',
                )}
              >
                <div className={cn('mb-6 text-center', effectiveViewMode !== 'freeform' && 'text-white')}>
                  <p
                    className={cn('text-[11px] font-semibold uppercase tracking-[0.32em]', effectiveViewMode !== 'freeform' && 'text-white/68')}
                    style={effectiveViewMode === 'freeform' ? { color: freeformOpenerPalette.eyebrowText } : undefined}
                  >
                    {effectiveViewMode === 'bento' ? 'Celebration Vault' : effectiveViewMode === 'freeform' ? 'Birthday board' : 'Birthday post'}
                  </p>
                  <p
                    className={cn('mt-3 text-lg font-medium tracking-tight', effectiveViewMode !== 'freeform' && 'text-white/92')}
                    style={effectiveViewMode === 'freeform' ? { color: freeformOpenerPalette.textSecondary } : undefined}
                  >
                    {effectiveViewMode === 'freeform' ? `A board for ${page.recipient_name}` : effectiveViewMode === 'bento' ? `A collection for ${page.recipient_name}` : `A letter for ${page.recipient_name}`}
                  </p>
                </div>
      
                <div className="relative flex h-[26rem] w-full items-center justify-center sm:h-[30rem]">
                  {effectiveViewMode === 'story' && burstMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        'absolute left-1/2 top-1/2 w-48 rounded-[1.4rem] border p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-700 ease-out hover:scale-[1.03] hover:shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:w-56',
                        revealPhase === 'burst'
                          ? [
                              '-translate-x-[150%] -translate-y-[165%] rotate-[-14deg]',
                              'translate-x-[38%] -translate-y-[148%] rotate-[12deg]',
                              '-translate-x-[145%] translate-y-[74%] rotate-[8deg]',
                              'translate-x-[42%] translate-y-[88%] rotate-[-8deg]',
                            ][index]
                          : 'opacity-0 scale-75 -translate-x-1/2 -translate-y-1/2',
                      )}
                      style={{
                        transitionDelay: `${index * 85}ms`,
                        borderColor: storyOpenerPalette.burstBorder,
                        background: storyOpenerPalette.burstFill,
                        color: 'hsl(0 0% 96%)',
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">Wish {index + 1}</p>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/90">&quot;{stripHtml(message.message)}&quot;</p>
                      <p className="mt-3 text-xs font-semibold text-white/78">{message.sender_name}</p>
                    </div>
                  ))}
      
                  {effectiveViewMode === 'bento' ? (
                    <div
                      className={cn(
                        'relative z-10 w-full max-w-lg px-2 text-center transition-all duration-700 ease-out sm:px-4',
                        revealPhase === 'opening' && 'scale-[1.03] -translate-y-1',
                        revealPhase === 'burst' && 'scale-[1.08] opacity-0 blur-sm',
                      )}
                    >
                      {/* Ambient Glows */}
                      <div className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-amber-400/25 blur-3xl animate-pulse" />
                      <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-rose-400/25 blur-3xl animate-pulse delay-300" />

                      {/* 3D Bento Vault Shell */}
                      <div className="relative mx-auto rounded-[2.5rem] border border-white/30 bg-slate-950/70 p-4 sm:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/20">
                        
                        {/* Bento Grid Compartments */}
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-left">
                          
                          {/* Tile 1: Milestone Hero Header (Spans 2 cols) */}
                          <div className="col-span-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-rose-500/25 to-amber-500/30 border border-white/25 p-3.5 sm:p-4 backdrop-blur-md shadow-xs relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200">
                                <Sparkles className="h-3 w-3 text-amber-300" />
                                <span>Bento Vault</span>
                              </span>
                              <span className="text-[10px] font-semibold text-white/80">
                                {birthdayDate ? format(birthdayDate, 'MMM d, yyyy') : 'Milestone'}
                              </span>
                            </div>
                            <h2 className="mt-2 font-serif text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                              Happy Birthday, {page.recipient_name}! ✨
                            </h2>
                            <p className="mt-1 text-xs text-white/80 line-clamp-1 font-sans">
                              Your milestone vault: wishes, memories, and voice clips.
                            </p>
                          </div>

                          {/* Tile 2: Cover Photo Portrait */}
                          <div className="col-span-1 rounded-2xl bg-white/10 border border-white/15 p-2.5 flex flex-col items-center justify-center text-center min-h-[110px] relative overflow-hidden group">
                            {coverPhotoSrc ? (
                              <>
                                <img
                                  src={coverPhotoSrc}
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              </>
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-2xl mb-1">
                                📸
                              </div>
                            )}
                            <div className="relative z-10 p-1 text-center mt-auto">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Portrait</p>
                              <p className="text-xs font-bold text-white line-clamp-1">{page.recipient_name}</p>
                            </div>
                          </div>

                          {/* Tile 3: Collected Memories Metrics */}
                          <div className="col-span-1 rounded-2xl bg-white/10 border border-white/15 p-3 flex flex-col justify-between min-h-[110px] backdrop-blur-md">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Wishes Pinned</p>
                              <p className="font-serif text-3xl font-bold text-white mt-0.5">{messages.length}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-white/85 font-medium pt-1 border-t border-white/10">
                              <span>📸 {totalPhotos} photos</span>
                              <span>·</span>
                              <span>🎙️ {totalAudioWishes} voice</span>
                            </div>
                          </div>

                        </div>

                        {/* Interactive Open Vault Button */}
                        <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void beginReveal()}
                            className="group w-full btn-press flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white font-bold text-sm shadow-[0_12px_32px_rgba(244,63,94,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                          >
                            <Gift className="h-4 w-4 text-amber-200 transition-transform duration-300 group-hover:scale-110" />
                            <span>Unwrap Celebration Bento</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void skipReveal()}
                            className="text-xs font-medium text-white/60 hover:text-white transition-colors"
                          >
                            Skip intro
                          </button>
                        </div>

                      </div>
                    </div>
                  ) : effectiveViewMode === 'freeform' ? (
                    <div
                      className={cn(
                        'relative z-10 w-full px-2 text-center transition-all duration-700 ease-out sm:px-4',
                        revealPhase === 'opening' && 'scale-[0.99]',
                        revealPhase === 'burst' && 'scale-[0.95] opacity-85',
                      )}
                    >
                      <div className="pointer-events-none absolute left-[-2%] top-[10%] h-[6.3rem] w-[12.4rem] rotate-[-6deg] rounded-lg border" style={{ borderColor: freeformOpenerPalette.floatingCardBorder, backgroundColor: freeformOpenerPalette.floatingCardFill }} />
                      <div className="pointer-events-none absolute left-[27%] top-[3%] h-[5.2rem] w-[9rem] rotate-[1deg] rounded-lg border" style={{ borderColor: freeformOpenerPalette.floatingCardBorder, backgroundColor: freeformOpenerPalette.floatingCardFill }} />
                      <div className="pointer-events-none absolute right-[-2%] top-[9%] h-[6.2rem] w-[11.1rem] rotate-[5deg] rounded-lg border" style={{ borderColor: freeformOpenerPalette.floatingCardBorder, backgroundColor: freeformOpenerPalette.floatingCardFill }} />
                      <div className="pointer-events-none absolute left-[4%] top-[71%] h-[7rem] w-[11rem] rotate-[2deg] rounded-lg border" style={{ borderColor: freeformOpenerPalette.floatingCardBorder, backgroundColor: freeformOpenerPalette.floatingCardFill }} />
                      <div className="pointer-events-none absolute right-[20%] top-[79%] h-[7rem] w-[9.5rem] rotate-[-3deg] rounded-lg border" style={{ borderColor: freeformOpenerPalette.floatingCardBorder, backgroundColor: freeformOpenerPalette.floatingCardFill }} />
                      <div className="pointer-events-none absolute right-[0%] top-[74%] h-[7.4rem] w-[10.1rem] rotate-[-4deg] rounded-lg border" style={{ borderColor: freeformOpenerPalette.floatingCardBorder, backgroundColor: freeformOpenerPalette.floatingCardFill }} />
      
                      <div
                        className={cn('mx-auto w-fit rounded-md px-4 pb-4 pt-3 shadow-[0_20px_56px_rgba(0,0,0,0.45)] freeform-polaroid', isFreeformIntroExiting && 'flip')}
                        style={{ backgroundColor: freeformOpenerPalette.paper }}
                      >
                        <div className="relative mx-auto h-5 w-14 -translate-y-2 rounded-sm transition-colors duration-500" style={{ backgroundColor: freeformOpenerPalette.tape }} />
                        <div className="relative h-[12.6rem] w-[13.8rem] overflow-hidden rounded-sm transition-colors duration-500" style={{ background: freeformOpenerPalette.miniCard }}>
                          {coverPhotoSrc ? (
                            renderStoryImage(coverPhotoSrc, `${page.recipient_name} cover photo`, { disableParallax: true, eager: true })
                          ) : (
                            <div className="flex h-full items-center justify-center" style={{ color: freeformOpenerPalette.textSecondary }}>
                              <ImageIcon className="h-9 w-9" />
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-[1.65rem] leading-none" style={{ fontFamily: '"Lobster", "Pacifico", serif', color: freeformOpenerPalette.nameText }}>{page.recipient_name}</p>
                      </div>
      
                      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: freeformOpenerPalette.eyebrowText }}>A birthday board for</p>
                      <h2 className="mt-2 text-[3.9rem] font-semibold leading-[0.92] sm:text-[4.6rem]" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: freeformOpenerPalette.textPrimary }}>
                        {page.recipient_name}
                      </h2>
                      <p className="mx-auto mt-4 max-w-[27rem] text-[1.12rem] italic leading-[1.45]" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: freeformOpenerPalette.quoteText }}>
                        "Every note, photo, and voice here was left just for you."
                      </p>
      
                      <div className="mt-7 grid grid-cols-3 gap-3 justify-items-center sm:flex sm:items-center sm:justify-center">
                        <span aria-label={`${messages.length} wishes`} className="inline-flex w-[6rem] h-10 items-center justify-center gap-2 rounded-full border text-[0.98rem] font-medium backdrop-blur-sm" style={{ backgroundColor: freeformOpenerPalette.chipBg, borderColor: freeformOpenerPalette.chipBorder, color: freeformOpenerPalette.chipText }}>
                          <span className="select-none text-white">{messages.length}</span>
                          <Sparkles className="h-4 w-4 text-white" />
                        </span>
                        <span aria-label={`${totalPhotos} photos`} className="inline-flex w-[6rem] h-10 items-center justify-center gap-2 rounded-full border text-[0.98rem] font-medium backdrop-blur-sm" style={{ backgroundColor: freeformOpenerPalette.chipBg, borderColor: freeformOpenerPalette.chipBorder, color: freeformOpenerPalette.chipText }}>
                          <span className="select-none text-white">{totalPhotos}</span>
                          <ImageIcon className="h-4 w-4 text-white" />
                        </span>
                        <span aria-label={`${totalAudioWishes} voices`} className="inline-flex w-[6rem] h-10 items-center justify-center gap-2 rounded-full border text-[0.98rem] font-medium backdrop-blur-sm" style={{ backgroundColor: freeformOpenerPalette.chipBg, borderColor: freeformOpenerPalette.chipBorder, color: freeformOpenerPalette.chipText }}>
                          <span className="select-none text-white">{totalAudioWishes}</span>
                          <Music className="h-4 w-4 text-white" />
                        </span>
                      </div>
      
                      <button
                        type="button"
                        onClick={() => void beginReveal()}
                        className="mt-8 inline-flex items-center rounded-2xl border bg-transparent px-8 py-2.5 text-[1.3rem] font-medium transition-colors hover:bg-white/10"
                        style={{ borderColor: freeformOpenerPalette.ctaBorder, color: freeformOpenerPalette.ctaText }}
                        aria-label="Open your board"
                      >
                        Open your board
                      </button>
      
                      <button
                        type="button"
                        onClick={() => void skipReveal()}
                        className="mt-5 block w-full text-[1rem] transition-colors"
                        style={{ color: freeformOpenerPalette.skipText }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.color = freeformOpenerPalette.skipTextHover;
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.color = freeformOpenerPalette.skipText;
                        }}
                      >
                        skip intro
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void beginReveal()}
                      aria-label="Open birthday letter"
                      className={cn(
                        'group relative z-10 h-[18rem] w-[20.5rem] transition-all duration-700 ease-out sm:h-[20.5rem] sm:w-[24rem]',
                        revealPhase === 'opening' && 'scale-[0.98] rotate-[1.5deg]',
                        revealPhase === 'burst' && 'scale-[0.94] opacity-80',
                      )}
                    >
                    {/* Envelope outer shell */}
                    <div
                      className="absolute inset-0 rounded-[2.4rem]"
                      style={{
                        background: storyOpenerPalette.envelopeOuter,
                        boxShadow: '0 26px 90px rgba(0,0,0,0.22)',
                      }}
                    />
                    <div className="absolute inset-[1px] rounded-[2.35rem] border" style={{ borderColor: storyOpenerPalette.envelopeInnerRing }} />
                    <div
                      className="absolute inset-[1.2rem] rounded-[1.9rem] border opacity-60"
                      style={{ borderColor: storyOpenerPalette.envelopeInsetBorder }}
                    />
                    {/* Envelope flap */}
                    <div
                      className={cn(
                        'absolute left-1/2 top-0 h-[52%] w-[92%] -translate-x-1/2 origin-top rounded-[2rem] transition-all duration-500',
                        revealPhase !== 'idle' ? '-translate-y-4 rotate-[-12deg]' : 'group-hover:-translate-y-1',
                      )}
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                        background: storyOpenerPalette.flap,
                        boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
                      }}
                    />
                    {/* Envelope body / inner pocket */}
                    <div
                      className="absolute bottom-[11%] left-1/2 h-[55%] w-[90%] -translate-x-1/2 rounded-[1.8rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      style={{
                        background: storyOpenerPalette.body,
                        borderColor: storyOpenerPalette.bodyBorder,
                      }}
                    />
                    {/* Letter card */}
                    <div
                      className={cn(
                        'absolute left-1/2 top-[24%] h-[40%] w-[74%] -translate-x-1/2 rounded-[1.4rem] border px-5 py-4 text-left transition-all duration-500 sm:w-[72%]',
                        revealPhase === 'opening' ? '-translate-y-6' : '',
                        revealPhase === 'burst' ? '-translate-y-10 opacity-0' : '',
                      )}
                      style={{
                        background: storyOpenerPalette.letter,
                        borderColor: storyOpenerPalette.letterBorder,
                        boxShadow: '0 14px 28px rgba(0,0,0,0.14)',
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: storyOpenerPalette.letterTo }}>To</p>
                      <p className="mt-2 text-[1.45rem] font-bold leading-none sm:text-[1.7rem]" style={{ color: storyOpenerPalette.letterName }}>{page.recipient_name}</p>
                      <p className="mt-2.5 max-w-[9rem] text-[11px] leading-[1.45] sm:max-w-[10rem]" style={{ color: storyOpenerPalette.letterBody }}>
                        Open when ready for the birthday story.
                      </p>
                    </div>
                    {/* Stamp / seal button */}
                    <div
                      className="animate-seal-breathe absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: storyOpenerPalette.stamp,
                        borderColor: storyOpenerPalette.stampBorder,
                        '--seal-glow': 'rgba(255,255,255,0.28)',
                      } as CSSProperties}
                    >
                      <div className="flex h-full w-full items-center justify-center text-white/90">
                        <Mail className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 -bottom-14 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/84 sm:text-xs">
                        Tap to break the seal
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2 text-white/62">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
                        <span className="text-[11px] uppercase tracking-[0.22em]">{messages.length} letters waiting inside</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
                      </div>
                    </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
});
