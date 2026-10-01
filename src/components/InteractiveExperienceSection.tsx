import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  Volume2,
  Sparkles,
  ArrowRight,
  BookOpen,
  LayoutGrid,
  Music,
  Share2,
  Lock,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'wrapped' | 'bento' | 'envelope';

interface Slide {
  id: number;
  author: string;
  relation: string;
  initials: string;
  avatarBg: string;
  message: string;
  hasAudio: boolean;
  audioDuration: string;
  photoEmoji: string;
  photoLabel: string;
  photoGradient: string;
}

const SAMPLE_SLIDES: Slide[] = [
  {
    id: 1,
    author: 'Tobi & Femi',
    relation: 'Best Friends since UNILAG',
    initials: 'TF',
    avatarBg: 'from-amber-400 to-orange-500',
    message: 'Happy 25th birthday, Kemi! From 2am coding jams to surviving third mainland bridge traffic, having you as a brother is one of life’s greatest blessings. You deserve all the joy coming your way today.',
    hasAudio: true,
    audioDuration: '0:38',
    photoEmoji: '🎓✨',
    photoLabel: 'Convocation Day · Dec 2023',
    photoGradient: 'from-amber-200 via-orange-100 to-amber-300',
  },
  {
    id: 2,
    author: 'Amina Bello',
    relation: 'Cousin & Travel Partner',
    initials: 'AB',
    avatarBg: 'from-rose-500 to-pink-500',
    message: 'Happy birthday to my favorite human! Remember when we got completely stranded in Obudu and ended up singing Afrobeats until sunrise? May this new age bring you boundless peace, laughter, and open doors.',
    hasAudio: false,
    audioDuration: '',
    photoEmoji: '⛰️🌅',
    photoLabel: 'Obudu Trip · April 2024',
    photoGradient: 'from-rose-200 via-pink-100 to-rose-300',
  },
  {
    id: 3,
    author: 'Mama',
    relation: 'Your Biggest Fan',
    initials: 'M',
    avatarBg: 'from-orange-500 to-amber-600',
    message: 'My precious daughter, watching you blossom into this brilliant, kind soul fills my heart with unspeakable pride. I recorded a special blessing for you in the voice note. Listen to it with your headphones on!',
    hasAudio: true,
    audioDuration: '1:12',
    photoEmoji: '🌸❤️',
    photoLabel: 'Family Sunday · Jan 2025',
    photoGradient: 'from-orange-200 via-amber-100 to-yellow-200',
  },
];

const InteractiveExperienceSection = () => {
  const [activeView, setActiveView] = useState<ViewMode>('wrapped');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(12);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(32);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

  const activeSlide = SAMPLE_SLIDES[currentSlideIndex];

  // Audio timer simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress((prev) => (prev >= 38 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  const nextSlide = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setCurrentSlideIndex((prev) => (prev + 1) % SAMPLE_SLIDES.length);
  };

  const prevSlide = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setCurrentSlideIndex((prev) => (prev - 1 + SAMPLE_SLIDES.length) % SAMPLE_SLIDES.length);
  };

  return (
    <section id="demo" className="relative overflow-hidden bg-slate-950 py-20 px-4 sm:px-6 sm:py-28 text-white">
      {/* Background ambient stars */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute right-[10%] bottom-10 h-80 w-80 rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Live Experience Demo
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            See What Your Birthday Person Feels
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base md:text-lg">
            Not a boring message thread or flat card. WishCanvas delivers collected wishes as an interactive, Spotify Wrapped-style journey with voice notes, memory snapshots, and ambient music.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('wrapped')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeView === 'wrapped'
                ? 'bg-amber-400 text-amber-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Wrapped-Style Story</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('envelope')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeView === 'envelope'
                ? 'bg-amber-400 text-amber-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>The Wax-Seal Reveal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('bento')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              activeView === 'bento'
                ? 'bg-amber-400 text-amber-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Bento Canvas Grid</span>
          </button>
        </div>

        {/* STAGE CONTAINER */}
        <div className="mt-8 relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-slate-900 via-stone-900 to-slate-950 p-5 sm:p-8 md:p-10 shadow-[0_0_60px_rgba(245,158,11,0.12)]">
          {/* Top Stage Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 border border-amber-400/30 text-lg shadow-inner">
                🎂
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white sm:text-lg">Kemi&apos;s 25th Birthday Canvas</h3>
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    Twilight Gold
                  </span>
                </div>
                <p className="text-xs text-slate-400">19 friends showed up &middot; 8 voice notes &middot; 14 photos</p>
              </div>
            </div>

            {/* Ambient soundtrack pill */}
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
              <Music className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span className="text-xs font-medium text-slate-200">Playing: Warm Sunset Acoustic</span>
              <div className="flex items-center gap-0.5 ml-1">
                {[12, 18, 8, 16, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full bg-amber-300 animate-pulse"
                    style={{ height: `${h}px`, animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* VIEW 1: SPOTIFY WRAPPED-STYLE STORY SLIDES */}
          {activeView === 'wrapped' && (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
              {/* Left: The Active Story Slide */}
              <div className="relative rounded-3xl border border-stone-200/20 bg-white p-6 sm:p-8 text-slate-900 shadow-2xl transition-all">
                {/* Progress bar line indicators across top */}
                <div className="flex gap-1.5 mb-5">
                  {SAMPLE_SLIDES.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        idx === currentSlideIndex
                          ? 'bg-amber-500'
                          : idx < currentSlideIndex
                          ? 'bg-amber-300'
                          : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Author Info */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${activeSlide.avatarBg} text-white font-bold text-xs shadow-sm`}>
                      {activeSlide.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{activeSlide.author}</p>
                      <p className="text-xs text-slate-500">{activeSlide.relation}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    Wish {currentSlideIndex + 1} of {SAMPLE_SLIDES.length}
                  </span>
                </div>

                {/* Attached Photo Snapshot */}
                <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200/70 shadow-inner">
                  <div className={`aspect-[16/10] w-full bg-gradient-to-br ${activeSlide.photoGradient} flex items-center justify-center p-6 text-center`}>
                    <div>
                      <span className="text-4xl">{activeSlide.photoEmoji}</span>
                      <p className="mt-2 text-xs font-bold text-slate-800 uppercase tracking-wider">{activeSlide.photoLabel}</p>
                      <p className="text-[11px] text-slate-600">Attached memory polaroid</p>
                    </div>
                  </div>
                </div>

                {/* Wish Message */}
                <p className="mt-5 text-sm sm:text-base font-medium leading-relaxed text-slate-800">
                  &ldquo;{activeSlide.message}&rdquo;
                </p>

                {/* Audio voice note component if slide has audio */}
                {activeSlide.hasAudio && (
                  <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-amber-950 font-bold shadow-sm transition-transform active:scale-95 hover:bg-amber-400"
                        aria-label={isPlayingAudio ? 'Pause' : 'Play voice note'}
                      >
                        {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span className="flex items-center gap-1.5 text-amber-700">
                            <Volume2 className="h-3.5 w-3.5" />
                            Voice Note
                          </span>
                          <span>0:{audioProgress < 10 ? `0${audioProgress}` : audioProgress} / {activeSlide.audioDuration}</span>
                        </div>
                        {/* Audio equalizer bars */}
                        <div className="flex h-5 items-center gap-1">
                          {[30, 65, 90, 45, 80, 100, 50, 75, 95, 40, 85, 60, 90, 50, 70, 85, 40, 65, 80, 50].map((h, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full transition-all duration-200 ${
                                isPlayingAudio && i <= (audioProgress / 38) * 20
                                  ? 'bg-amber-600'
                                  : isPlayingAudio
                                  ? 'bg-amber-300'
                                  : 'bg-stone-300'
                              }`}
                              style={{
                                height: isPlayingAudio ? `${Math.max(25, (h * Math.sin(i + audioProgress)) % 100)}%` : `${h * 0.5}%`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slide Navigation and Reactions */}
                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLiked(!liked);
                      setLikeCount((c) => (liked ? c - 1 : c + 1));
                    }}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 ${
                      liked
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-stone-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-500'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{likeCount} hearts</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevSlide}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-slate-700 hover:bg-stone-100 transition-colors"
                      aria-label="Previous wish"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextSlide}
                      className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <span>Next Wish</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Why This Format Works */}
              <div className="space-y-5">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                    The Wrapped Slide Language
                  </span>
                  <h4 className="mt-2 text-2xl font-bold text-white">Turn scattered notes into a cinematic story</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Instead of dumping 30 messages in a chat, WishCanvas sequences every memory, photo, and voice clip into an intimate, one-wish-at-a-time celebration slide deck that feels like an emotional gift.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <p className="text-xs font-bold text-amber-300">🎙️ Audio That Stays</p>
                    <p className="mt-1 text-xs text-slate-300">Hearing their actual voice and laughter beats any text message.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <p className="text-xs font-bold text-amber-300">📱 Mobile First</p>
                    <p className="mt-1 text-xs text-slate-300">Smooth swiping on Android and iOS with zero lag.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: THE WAX-SEAL REVEAL */}
          {activeView === 'envelope' && (
            <div className="mt-8 max-w-xl mx-auto text-center py-6">
              <div
                onClick={() => setEnvelopeOpen(!envelopeOpen)}
                className="group cursor-pointer inline-block transition-transform duration-300 hover:scale-105 active:scale-95"
              >
                <div className="relative mx-auto flex h-36 w-56 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 shadow-2xl border border-amber-300/80">
                  <div
                    className="absolute inset-x-0 top-0 h-16 bg-amber-300/40 rounded-t-2xl transition-all"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                  />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-xl border-2 border-red-400">
                    <span className="font-serif text-lg font-black">K</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-3.5 py-1 text-xs font-bold text-amber-300">
                    {envelopeOpen ? '✨ Unlocked · Tap to close' : '💌 Tap to preview wax seal unlock'}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                <p className="font-bold text-white text-base mb-1">Zero Spoilers Before the Date</p>
                Until the birthday clock strikes midnight, your recipient only sees this sealed letter and an animated countdown. When the date arrives, the seal breaks with sound and confetti!
              </div>
            </div>
          )}

          {/* VIEW 3: BENTO CANVAS GRID */}
          {activeView === 'bento' && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-slate-900">
              {SAMPLE_SLIDES.map((slide, i) => (
                <div key={slide.id} className="rounded-3xl border border-stone-200/30 bg-white p-5 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${slide.avatarBg} text-white flex items-center justify-center text-xs font-bold`}>
                        {slide.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{slide.author}</p>
                        <p className="text-[10px] text-slate-500">{slide.relation}</p>
                      </div>
                    </div>
                    <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${slide.photoGradient} flex items-center justify-center text-2xl`}>
                      {slide.photoEmoji}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-700 font-medium">
                      &ldquo;{slide.message.slice(0, 95)}...&rdquo;
                    </p>
                  </div>
                  {slide.hasAudio && (
                    <div className="mt-4 rounded-xl bg-amber-50 p-2 flex items-center gap-2 text-xs font-bold text-amber-800">
                      <Volume2 className="h-3.5 w-3.5 text-amber-600" />
                      <span>{slide.audioDuration} Voice Note</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Callout */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:px-6">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 sm:text-sm">
              <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
              <span>Ready to start a canvas for someone special? Free to begin.</span>
            </div>
            <Link to="/create">
              <Button size="sm" className="bg-amber-400 text-amber-950 font-bold hover:bg-amber-300 shadow-md">
                Create a Canvas
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveExperienceSection;
