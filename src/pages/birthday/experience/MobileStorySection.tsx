import { Fragment, memo, useEffect, type CSSProperties } from 'react';
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
import { useBirthdayView } from '@/pages/birthday/view/BirthdayPageViewContext';
import FloatingParticles from '@/components/FloatingParticles';
import { MobileStoryControls } from './MobileStoryControls';


export const MobileStorySection = memo(function MobileStorySection() {
  const {
    birthdayDate,
    canShowKeepsakeDownload,
    contributorLine,
    coverPhotoSrc,
    downloadingPdf,
    downloadingVideo,
    effectiveViewMode,
    forceMobileView,
    experienceInsetClass,
    experiencePanelClass,
    getStoryDelayStyle,
    handleBoardParallaxLeave,
    handleBoardParallaxMove,
    handleDownloadKeepsake,
    handleDownloadVideoKeepsake,
    handlePauseControl,
    handlePlayControl,
    includeSoundtrackInVideo,
    isDarkExperience,
    isSaved,
    keepsakePaperClass,
    keepsakePhotoBoardClass,
    keepsakePillClass,
    keepsakeSoftClass,
    messages,
    mobileRevealRef,
    navigate,
    page,
    pageId,
    renderStoryImage,
    renderWishAudioPlayer,
    revealSlides,
    setExpandedPhoto,
    setIncludeSoundtrackInVideo,
    setShowShareCard,
    showRevealIntro,
    storyThemePalette,
    theme,
    totalAudioWishes,
    totalPhotos,
    toggleSavePage,
    user,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VM mirrors BirthdayPage closure until typed
  } = useBirthdayView() as any;

  // Ensure cards in MobileStorySection are properly revealed, especially in simulator
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = mobileRevealRef?.current as HTMLElement | null;
    if (!container) return;

    const revealNodes = Array.from(
      container.querySelectorAll('[data-scroll-reveal]')
    ) as HTMLElement[];
    if (!revealNodes.length) return;

    // Immediately reveal the first batch so the screen is never blank
    revealNodes.slice(0, 6).forEach((node) => {
      node.classList.remove('is-exiting');
      node.classList.add('is-visible');
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-exiting');
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.04,
        rootMargin: '140px 0px 140px 0px',
      }
    );

    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [mobileRevealRef, revealSlides.length, forceMobileView]);

  if (effectiveViewMode !== 'story') return null;

  return (
    <>
      <section
        className={cn(
          'relative min-h-[100dvh] px-2 xs:px-3 sm:px-4 pt-12 pb-6 sm:py-6',
          forceMobileView ? '!block !min-h-full' : 'sm:hidden',
        )}
        style={{ background: storyThemePalette.sectionBackground }}
      >
        <div aria-hidden="true" className="slide-stars-layer" style={{ opacity: 0.68, '--star-end-y': '185%', '--layer-time-offset': '-0.45s' } as CSSProperties}>
          <div className="slide-star" style={{ left: '7%', '--star-x': '0%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '13%', '--star-x': '-1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '20%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '27%', '--star-x': '1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '34%', '--star-x': '-3%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '41%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '49%', '--star-x': '4%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '56%', '--star-x': '-1%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '63%', '--star-x': '-2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '70%', '--star-x': '2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '77%', '--star-x': '3%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '84%', '--star-x': '-2%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '91%', '--star-x': '-4%' } as CSSProperties} />
          <div className="slide-star" style={{ left: '96%', '--star-x': '1%' } as CSSProperties} />
        </div>
        <div ref={mobileRevealRef} className="mx-auto flex max-w-2xl flex-col gap-4 pb-28">
          <div className="story-scroll-reveal flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3" data-scroll-reveal="true" style={getStoryDelayStyle(0)}>
            <div>
              <div className="flex items-center gap-2">
                <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                  Birthday playback
                </p>
                <span className="h-1 w-1 rounded-full bg-current opacity-30" />
                <span className="text-[11px] font-medium opacity-60">Story mode</span>
              </div>
              <h1 className={cn('mt-1.5 max-w-md text-[1.95rem] sm:text-[2.05rem] font-bold leading-[1.02]', theme.titleClass, theme.font)}>
                {page.recipient_name}&apos;s birthday story
              </h1>
            </div>
            <div
              className="self-start shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-2xs backdrop-blur-md border"
              style={{
                backgroundColor: storyThemePalette.topBadgeBg,
                color: storyThemePalette.topBadgeText,
                borderColor: `${storyThemePalette.topBadgeText}22`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Scroll to explore</span>
              <span className="text-[10px] opacity-70">↓</span>
            </div>
          </div>
      
          {!showRevealIntro && (
            <MobileStoryControls
              onOpenShareCard={() => setShowShareCard(true)}
              onPlay={handlePlayControl}
              onPause={handlePauseControl}
              canShowKeepsakeDownload={canShowKeepsakeDownload}
              onDownloadPdf={() => void handleDownloadKeepsake()}
              downloadingPdf={downloadingPdf}
              includeSoundtrackInVideo={includeSoundtrackInVideo}
              onToggleVideoSoundtrack={() => setIncludeSoundtrackInVideo((current) => !current)}
              onDownloadVideo={() => void handleDownloadVideoKeepsake()}
              downloadingVideo={downloadingVideo}
              isDarkExperience={isDarkExperience}
            />
          )}
      
          {revealSlides.map((slide, index) => (
            <Fragment key={slide.id}>
              {index > 0 && (
                <div
                  className="story-scroll-reveal relative flex items-center gap-3 px-2 py-1"
                  data-scroll-reveal="true"
                  style={getStoryDelayStyle(Math.min(90 + index * 60, 300), 620)}
                >
                  <div className={cn('h-px flex-1', getMobileSectionTone(slide, isDarkExperience).lineClass)} />
                  <div className="shrink-0 text-center">
                    <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]', getMobileSectionTone(slide, isDarkExperience).badgeClass)}>
                      <span className="text-sm leading-none">{getMobileSectionMarker(slide)}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">{getMobileSectionLabel(slide)}</span>
                    </div>
                    <p className={cn('mt-1.5 text-[11px] opacity-55', theme.text)}>{getMobileSectionCaption(slide)}</p>
                  </div>
                  <div className={cn('h-px flex-1', getMobileSectionTone(slide, isDarkExperience).lineClass)} />
                </div>
              )}
      
            <article
              className={cn('story-scroll-reveal relative overflow-hidden rounded-[2rem] border p-4 shadow-[0_24px_80px_rgba(18,18,23,0.12)]', experiencePanelClass)}
              data-scroll-reveal="true"
              style={{ ...getStoryDelayStyle(Math.min(120 + index * 70, 420), getStoryMotionDuration(slide)), backgroundColor: storyThemePalette.panelBg, borderColor: storyThemePalette.panelBorder }}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-[8%] top-[8%] h-28 w-28 rounded-full blur-3xl" style={{ background: storyThemePalette.orbA }} />
                <div className="absolute bottom-[-8%] right-[-6%] h-32 w-32 rounded-full blur-3xl" style={{ background: storyThemePalette.orbB }} />
              </div>
              <div aria-hidden="true" className="slide-stars-layer" style={{ '--layer-time-offset': '-1.35s' } as CSSProperties}>
                <div className="slide-star" style={{ left: '8%', '--star-x': '0%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '17%', '--star-x': '-1%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '26%', '--star-x': '3%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '35%', '--star-x': '1%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '42%', '--star-x': '-2%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '53%', '--star-x': '2%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '61%', '--star-x': '4%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '70%', '--star-x': '-1%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '79%', '--star-x': '-3%' } as CSSProperties} />
                <div className="slide-star" style={{ left: '89%', '--star-x': '2%' } as CSSProperties} />
              </div>
      
              <div className="relative z-10">
                {slide.kind === 'cover' && (
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <article className={cn('story-stage-reveal relative overflow-hidden rounded-[1.7rem] border p-5', keepsakePaperClass)} style={{ ...getStoryDelayStyle(30, getStoryMotionDuration(slide)), backgroundColor: storyThemePalette.paperBg, borderColor: storyThemePalette.paperBorder }}>
                        <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>First page out of the envelope</p>
                        <h2 className={cn('mt-3 text-[2.55rem] font-bold leading-[0.94]', theme.titleClass, theme.font)}>
                          Happy Birthday,
                          <br />
                          {page.recipient_name}.
                        </h2>
                        <p className={cn('mt-4 text-base leading-relaxed opacity-80', theme.text)}>
                          Every note, photo, and voice clip inside was chosen to make this feel less like a page and more like a gift being opened.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className={cn('rounded-[1.2rem] border p-3', keepsakeSoftClass)} style={{ backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes</p>
                            <p className={cn('mt-2 text-xl font-semibold', theme.text)}>{messages.length}</p>
                          </div>
                          <div className={cn('rounded-[1.2rem] border p-3', keepsakeSoftClass)} style={{ backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Reveal date</p>
                            <p className={cn('mt-2 text-base font-semibold', theme.text)}>{format(birthdayDate, 'MMMM d, yyyy')}</p>
                          </div>
                        </div>
                      </article>
      
                      {page.creator_message && (
                        <article className={cn('story-stage-reveal-soft rounded-[1.4rem] border p-4', keepsakeSoftClass)} style={{ ...getStoryDelayStyle(180, 700), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>Packed with a note from the organizer</p>
                          <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme.text)}>&quot;{page.creator_message}&quot;</p>
                        </article>
                      )}
                    </div>
      
                    {coverPhotoSrc && (
                      <article className={cn('story-stage-reveal-soft relative overflow-hidden rounded-[1.4rem] border', keepsakeSoftClass)} style={{ ...getStoryDelayStyle(130, 760), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                        <button
                          type="button"
                          className="relative block h-[46dvh] min-h-[16rem] max-h-[30rem] w-full"
                          onClick={() => setExpandedPhoto({
                            url: coverPhotoSrc,
                            caption: `${page.recipient_name}'s birthday cover`,
                            senderName: 'Birthday page',
                          })}
                          aria-label={`Expand ${page.recipient_name}'s birthday cover`}
                        >
                          {renderStoryImage(coverPhotoSrc, `${page.recipient_name} birthday cover`, { disableParallax: true, eager: true })}
                        </button>
                      </article>
                    )}
                  </div>
                )}
      
                {slide.kind === 'stats' && (
                  <div className="space-y-4">
                    <article className={cn('story-stage-reveal rounded-[1.7rem] border p-5', keepsakePaperClass)} style={{ ...getStoryDelayStyle(30, getStoryMotionDuration(slide)), backgroundColor: storyThemePalette.paperBg, borderColor: storyThemePalette.paperBorder }}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>The shape of the celebration</p>
                      <h2 className={cn('mt-3 text-[2.1rem] font-bold leading-[0.98]', theme.titleClass, theme.font)}>
                        Collected with love.
                      </h2>
                      <p className={cn('mt-3 text-sm leading-relaxed opacity-80', theme.text)}>
                        Before the story started, people left little pieces of themselves here. This is what made it into the envelope.
                      </p>
                    </article>
                    <div className="grid grid-cols-2 gap-3">
                      <article className={cn('story-stage-reveal-soft col-span-2 rounded-[1.45rem] border p-4', keepsakePaperClass)} style={{ ...getStoryDelayStyle(110), backgroundColor: storyThemePalette.paperBg, borderColor: storyThemePalette.paperBorder }}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes written</p>
                        <p className={cn('mt-3 text-5xl font-bold leading-none', theme.titleClass, theme.font)}>{messages.length}</p>
                      </article>
                      <article className={cn('story-stage-reveal-soft rounded-[1.35rem] border p-4', keepsakeSoftClass)} style={{ ...getStoryDelayStyle(170), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Photos added</p>
                        <p className={cn('mt-3 text-3xl font-semibold', theme.text)}>{totalPhotos}</p>
                      </article>
                      <article className={cn('story-stage-reveal-soft rounded-[1.35rem] border p-4', keepsakeSoftClass)} style={{ ...getStoryDelayStyle(220), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Voice notes</p>
                        <p className={cn('mt-3 text-3xl font-semibold', theme.text)}>{totalAudioWishes}</p>
                      </article>
                    </div>
                  </div>
                )}
      
                {slide.kind === 'organizer' && page.creator_message && (
                  <div className="flex h-full items-center justify-center">
                    <article className={cn('story-stage-reveal relative flex h-full w-full flex-col items-center justify-center rounded-[1.7rem] border p-5 text-center', keepsakePaperClass)} style={{ ...getStoryDelayStyle(70), backgroundColor: storyThemePalette.paperBg, borderColor: storyThemePalette.paperBorder }}>
                      <div className={cn('story-stage-reveal-soft mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] border', experienceInsetClass)} style={{ ...getStoryDelayStyle(40), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                        <Heart className={cn('h-8 w-8', theme.text)} />
                      </div>
                      <p className={cn('mt-4 text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>A note from the organizer</p>
                      <p className={cn('mt-4 text-xl italic leading-[1.45]', theme.text)}>&quot;{page.creator_message}&quot;</p>
                      <p className={cn('mt-4 text-xs opacity-65', theme.text)}>Written before the reveal began.</p>
                    </article>
                  </div>
                )}
      
                {slide.kind === 'wish' && (() => {
                  const wishPhotos = getMessagePhotos(slide.message);
                  const photoCount = wishPhotos.length;
      
                  return (
                    <div className={cn('space-y-4', photoCount === 0 && !slide.message.audio_url && 'flex h-full flex-col justify-center')}>
                      <article className={cn('story-stage-reveal rounded-[1.7rem] border p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover', keepsakePaperClass, photoCount === 0 && !slide.message.audio_url && 'flex flex-col justify-center')} style={{ ...getStoryDelayStyle(40, getStoryMotionDuration(slide)), backgroundColor: storyThemePalette.paperBg, borderColor: storyThemePalette.paperBorder }}>
                        <p className={cn('text-xs font-semibold uppercase tracking-[0.24em] opacity-70', theme.text)}>
                          Letter {slide.index + 1} of {messages.length}
                        </p>
                        <h2 className={cn('mt-3 text-3xl font-bold leading-[0.98]', theme.titleClass, theme.font)}>{slide.message.sender_name}</h2>
                        {isRichHtml(slide.message.message)
                          ? <div className={cn('wish-rich-text mt-4 text-lg leading-relaxed', theme.text)} dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(slide.message.message) }} />
                          : <p className={cn('mt-4 text-lg leading-relaxed', theme.text)}>&quot;{slide.message.message}&quot;</p>
                        }
                        <div className="mt-5 flex flex-wrap gap-2">
                          {photoCount > 0 && (
                            <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', keepsakePillClass)} style={{ backgroundColor: storyThemePalette.pillBg, borderColor: storyThemePalette.pillBorder, color: storyThemePalette.pillText }}>
                              {photoCount} {photoCount === 1 ? 'photo memory' : 'photo memories'}
                            </span>
                          )}
                          {slide.message.audio_url && (
                            <span className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', keepsakePillClass)} style={{ backgroundColor: storyThemePalette.pillBg, borderColor: storyThemePalette.pillBorder, color: storyThemePalette.pillText }}>
                              Voice note inside
                            </span>
                          )}
                        </div>
      
                        {/* Stickers Rendering (Mobile) */}
                        {slide.message.stickers && slide.message.stickers.length > 0 && (
                          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                            {slide.message.stickers.map((sticker) => (
                              <div
                                key={sticker.id}
                                className="absolute select-none text-4xl"
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
                      </article>
      
                      {slide.message.audio_url && (
                        <article className={cn('story-stage-reveal-soft rounded-[1.45rem] border p-4', keepsakeSoftClass)} style={{ ...getStoryDelayStyle(130, 760), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                          <p className={cn('text-sm font-semibold', theme.text)}>Voice note</p>
                          {renderWishAudioPlayer(slide.message, 'mt-3 w-full')}
                        </article>
                      )}
      
                      {photoCount > 0 && (
                        <section
                          className={cn('story-stage-reveal-soft story-photo-board rounded-[1.7rem] border p-3', keepsakePhotoBoardClass)}
                          style={getStoryDelayStyle(slide.message.audio_url ? 190 : 130, getStoryMotionDuration(slide))}
                          onMouseMove={handleBoardParallaxMove}
                          onMouseLeave={handleBoardParallaxLeave}
                        >
                          <div className="space-y-3">
                            {wishPhotos.map((photo) => (
                              <button
                                key={photo.id}
                                type="button"
                                className="group block w-full rounded-[1.35rem] border border-white/45 bg-white/55 p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)]"
                                onClick={() =>
                                  setExpandedPhoto({
                                    url: resolveAssetUrl(photo.photo_url) || photo.photo_url,
                                    caption: photo.caption,
                                    senderName: slide.message.sender_name,
                                  })
                                }
                              >
                                <div className="relative isolate aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[#dfe7dc]">
                                  {renderStoryImage(resolveAssetUrl(photo.photo_url) || photo.photo_url, `Photo from ${slide.message.sender_name}`)}
                                  <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/56 via-black/10 to-transparent" />
                                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 text-sm font-medium text-white">{photo.caption || 'Photo memory'}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-white/16 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">Open</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
      
                    </div>
                  );
                })()}
      
                {slide.kind === 'closing' && (
                  <div className="space-y-4 text-center">
                    <article className={cn('story-stage-reveal-soft rounded-[1.7rem] border p-5', keepsakePaperClass)} style={{ ...getStoryDelayStyle(130, getStoryMotionDuration(slide)), backgroundColor: storyThemePalette.paperBg, borderColor: storyThemePalette.paperBorder }}>
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.26em] opacity-70', theme.text)}>Final page</p>
                      <h2 className={cn('mt-3 text-[2.1rem] font-bold leading-[1]', theme.titleClass, theme.font)}>
                        Keep this close,
                        <br />
                        {page.recipient_name}.
                      </h2>
                      <p className={cn('mt-4 text-base leading-relaxed opacity-80', theme.text)}>
                        This is the part worth replaying: every photo, every message, and every voice note gathered into one last birthday page.
                      </p>
                      <div className="mt-5 grid grid-cols-3 gap-2 text-left">
                        <div className={cn('rounded-[1.1rem] border p-3', keepsakeSoftClass)} style={{ backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Wishes</p>
                          <p className={cn('mt-2 text-lg font-semibold', theme.text)}>{messages.length}</p>
                        </div>
                        <div className={cn('rounded-[1.1rem] border p-3', keepsakeSoftClass)} style={{ backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Photos</p>
                          <p className={cn('mt-2 text-lg font-semibold', theme.text)}>{totalPhotos}</p>
                        </div>
                        <div className={cn('rounded-[1.1rem] border p-3', keepsakeSoftClass)} style={{ backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60', theme.text)}>Voices</p>
                          <p className={cn('mt-2 text-lg font-semibold', theme.text)}>{totalAudioWishes}</p>
                        </div>
                      </div>
                    </article>
                    <article className={cn('story-stage-reveal-soft rounded-[1.45rem] border p-4 text-left', keepsakeSoftClass)} style={{ ...getStoryDelayStyle(220, 760), backgroundColor: storyThemePalette.softBg, borderColor: storyThemePalette.softBorder }}>
                      <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60', theme.text)}>
                        Signed by{contributorLine ? ` ${contributorLine}` : ' everyone who wrote'}
                      </p>
                      <p className={cn('mt-3 text-lg leading-relaxed', theme.text)}>
                        Happy birthday, {page.recipient_name}. You were worth gathering all of this for.
                      </p>

                      <div className={cn('mt-4 rounded-2xl border p-4', keepsakePillClass)} data-no-nav="true">
                        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70', theme.text)}>Make moments unforgettable</p>
                        <p className={cn('mt-1.5 text-base font-semibold leading-snug', theme.titleClass, theme.font)}>
                          Create a celebration for someone special
                        </p>
                        <p className={cn('mt-1 text-xs opacity-75 leading-relaxed', theme.text)}>
                          Gather heartfelt messages, photos, and voice notes into one unforgettable digital keepsake.
                        </p>
                        <div className="mt-3.5">
                          <Link to="/create" className="group block">
                            <Button
                              variant="hero"
                              size="sm"
                              className="btn-press h-10 w-full gap-2 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-rose-500/25 active:scale-95 transition-all text-white border-0"
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
                )}
              </div>
            </article>
            </Fragment>
          ))}

          {!showRevealIntro && (
            <div className="story-scroll-reveal pt-2" data-scroll-reveal="true" style={getStoryDelayStyle(240)}>
              <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-40">
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
                    'mx-auto block w-fit max-w-full rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_50px_rgba(18,18,23,0.16)] backdrop-blur-md transition-colors',
                    user && isSaved
                      ? isDarkExperience
                        ? 'border-emerald-300/35 bg-emerald-500/90 text-white hover:bg-emerald-500'
                        : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                      : isDarkExperience
                        ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                        : 'border-white/70 bg-white/80 text-foreground hover:bg-white',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Heart className={cn('h-4 w-4', user && isSaved ? 'fill-current' : '')} />
                    {user ? (isSaved ? 'Saved to dashboard' : 'Save to dashboard') : 'Save to my dashboard'}
                  </span>
                </button>
              </div>
            </div>
          )}
      
          <Link to="/create" className={cn('mx-auto pt-2 text-sm font-medium opacity-70 transition-opacity hover:opacity-100', theme.text)}>
            Create your own
          </Link>
        </div>
      </section>
    </>
  );
});
