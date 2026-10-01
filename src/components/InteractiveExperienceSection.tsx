import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  Volume2,
  Sparkles,
  ArrowRight,
  Gift,
  LayoutGrid,
  BookOpen,
  Share2,
  Lock,
  Music,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'story' | 'bento' | 'pool';

interface ThemePreset {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  cardBg: string;
  accent: string;
  badgeClass: string;
  borderGlow: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'twilight',
    name: 'Twilight Gold',
    emoji: '✨',
    tagline: 'Warm champagne & amber radiance',
    cardBg: 'from-amber-950/80 via-stone-900 to-amber-900/60',
    accent: 'from-amber-400 to-orange-500',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderGlow: 'border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.18)]',
  },
  {
    id: 'rose',
    name: 'Rose Velvet',
    emoji: '🌹',
    tagline: 'Romantic blush & rich berry tones',
    cardBg: 'from-rose-950/80 via-neutral-900 to-pink-900/60',
    accent: 'from-rose-400 to-pink-500',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    borderGlow: 'border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.18)]',
  },
  {
    id: 'cosmic',
    name: 'Midnight Cosmic',
    emoji: '🌌',
    tagline: 'Deep space indigo & starry purples',
    cardBg: 'from-indigo-950/80 via-slate-900 to-purple-950/60',
    accent: 'from-violet-400 to-indigo-500',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    borderGlow: 'border-violet-500/30 shadow-[0_0_50px_rgba(139,92,246,0.18)]',
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    emoji: '🌊',
    tagline: 'Breezy cyan & calm azure horizons',
    cardBg: 'from-cyan-950/80 via-slate-900 to-sky-950/60',
    accent: 'from-cyan-400 to-blue-500',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    borderGlow: 'border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.18)]',
  },
];

const InteractiveExperienceSection = () => {
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(THEME_PRESETS[0]);
  const [activeView, setActiveView] = useState<ViewMode>('story');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(14);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(24);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

  // Simulated audio playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioSeconds((prev) => {
          if (prev >= 42) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
    } else {
      setLiked(false);
      setLikesCount((prev) => prev - 1);
    }
  };

  return (
    <section id="demo" className="relative overflow-hidden bg-foreground py-20 px-4 sm:px-6 sm:py-28 text-primary-foreground">
      {/* Subtle atmospheric ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-10 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-[10%] bottom-10 h-80 w-80 rounded-full bg-secondary/20 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Live Product Demo
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Experience what the birthday person actually sees
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/75 sm:text-base md:text-lg">
            Wishcanvas isn’t a flat page of text. It’s an interactive, sensory gift with sealed letter reveals, ambient soundtracks, voice notes, and group gift goals.
          </p>
        </div>

        {/* Live Controls Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-md sm:flex-row sm:p-4">
          {/* View mode toggle */}
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-black/30 p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveView('story')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all sm:text-sm ${
                activeView === 'story'
                  ? 'bg-white text-foreground shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Story Reveal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('bento')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all sm:text-sm ${
                activeView === 'bento'
                  ? 'bg-white text-foreground shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Bento Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('pool')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all sm:text-sm ${
                activeView === 'pool'
                  ? 'bg-white text-foreground shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Gift className="h-4 w-4" />
              <span>Gift Pool</span>
            </button>
          </div>

          {/* Theme switcher pills */}
          <div className="flex w-full items-center justify-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-white/50 lg:inline-block">Theme:</span>
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedTheme(preset)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedTheme.id === preset.id
                    ? 'border border-white/60 bg-white/20 text-white shadow-sm'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{preset.emoji}</span>
                <span className="hidden sm:inline">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* The Live Interactive Canvas Stage */}
        <div
          className={`mt-6 relative overflow-hidden rounded-[2.5rem] border bg-gradient-to-br p-4 sm:p-8 md:p-10 transition-all duration-500 ${selectedTheme.cardBg} ${selectedTheme.borderGlow}`}
        >
          {/* Top Canvas Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 text-xl shadow-inner">
                {selectedTheme.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white sm:text-xl">Maya&apos;s 25th Birthday Canvas</h3>
                  <span className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${selectedTheme.badgeClass}`}>
                    {selectedTheme.name}
                  </span>
                </div>
                <p className="text-xs text-white/60">Curated with love by Sarah & 18 friends</p>
              </div>
            </div>

            {/* Audio soundtrack chip */}
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
              <Music className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span className="text-xs font-medium text-white/80">Soft Lofi Birthday Melodies</span>
              <div className="flex items-center gap-0.5 ml-1">
                {[12, 18, 8, 16, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full bg-amber-300/80 animate-pulse"
                    style={{ height: `${h}px`, animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: STORY VIEW (Envelope & Card Flip) */}
          {activeView === 'story' && (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
              {/* Left: The Card Letter Flip */}
              <div className="relative rounded-3xl border border-white/20 bg-white/95 p-6 text-foreground shadow-2xl transition-all duration-300 sm:p-8">
                {/* Stamp & Seal Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20">
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-400 to-fuchsia-500 font-bold text-white">
                        SJ
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground sm:text-base">Sarah Jenkins</p>
                      <p className="text-xs text-muted-foreground">Best friend & roommate · 11:42 AM</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Wish #1 of 19
                  </span>
                </div>

                {/* Attached Photo Polaroid */}
                <div className="mt-5 overflow-hidden rounded-2xl border border-border/50 bg-stone-100 shadow-sm">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-amber-200 via-rose-200 to-violet-300 flex items-center justify-center">
                    <div className="text-center p-6">
                      <span className="text-4xl">📸</span>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-stone-700">Trip to Kyoto · Summer &apos;24</p>
                      <p className="text-[11px] text-stone-600">&ldquo;You lost the metro tickets twice but we laughed all day&rdquo;</p>
                    </div>
                    <span className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                      Memory Polaroid
                    </span>
                  </div>
                </div>

                {/* Heartfelt Letter Text */}
                <div className="mt-5 space-y-2">
                  <p className="text-base font-medium leading-relaxed text-stone-800">
                    &ldquo;Happy 25th birthday Maya!! 🎂 Words cannot describe how lucky I am to have you in my corner. 
                    From surviving finals week on iced matcha to dancing in the rain in Tokyo, you make every ordinary day feel magical. Here is to 25 more years of adventures!&rdquo;
                  </p>
                </div>

                {/* Interactive Voice Note Player */}
                <div className="mt-6 rounded-2xl border border-border/80 bg-stone-50 p-4 transition-all hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-md transition-transform active:scale-95 hover:opacity-90"
                      aria-label={isPlayingAudio ? 'Pause voice note' : 'Play voice note'}
                    >
                      {isPlayingAudio ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
                        <span className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Volume2 className="h-3.5 w-3.5 text-primary" />
                          Voice Note from Sarah
                        </span>
                        <span>0:{audioSeconds < 10 ? `0${audioSeconds}` : audioSeconds} / 0:42</span>
                      </div>

                      {/* Equalizer Soundwave Bars */}
                      <div className="flex h-6 items-center gap-1">
                        {[40, 75, 55, 90, 30, 65, 100, 45, 80, 60, 95, 40, 70, 85, 50, 90, 65, 45, 80, 55, 95, 35, 75, 60].map(
                          (pct, idx) => (
                            <span
                              key={idx}
                              className={`w-1 rounded-full transition-all duration-200 ${
                                isPlayingAudio && idx <= (audioSeconds / 42) * 24
                                  ? 'bg-primary'
                                  : isPlayingAudio
                                  ? 'bg-primary/30'
                                  : 'bg-stone-300'
                              }`}
                              style={{
                                height: isPlayingAudio ? `${Math.max(20, (pct * Math.sin(idx + audioSeconds)) % 100)}%` : `${pct * 0.6}%`,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer with Heart Reaction */}
                <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLike}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition-transform active:scale-90 ${
                        liked
                          ? 'border-rose-300 bg-rose-50 text-rose-600'
                          : 'border-border bg-white hover:border-rose-200 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{likesCount}</span>
                    </button>
                    <span className="text-muted-foreground">Tap to heart</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">Slide 1 of 19 →</span>
                </div>
              </div>

              {/* Right: The Interactive Wax-Seal Envelope Feature */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                    Signature Reveal Moment
                  </p>
                  <h4 className="mt-2 text-2xl font-bold text-white">The Letter Seal Envelope</h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">
                    Before the birthday person sees a single message, they are greeted by an elegant, animated wax seal envelope that unlocks with ambient chimes and custom confetti.
                  </p>

                  <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-black/30 p-6 text-center">
                    <div
                      onClick={() => setEnvelopeOpen(!envelopeOpen)}
                      className="group cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95"
                    >
                      <div className="relative mx-auto flex h-24 w-36 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 shadow-xl border border-amber-300/60">
                        <div className="absolute inset-x-0 top-0 h-10 bg-amber-300/40 rounded-t-xl" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg border border-red-400">
                          <span className="text-xs font-black">M</span>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1">
                        <span>{envelopeOpen ? '🎉 Envelope Opened' : '💌 Tap to preview wax seal'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                    <p className="text-xs font-bold text-white">🎙️ Voice Note Studio</p>
                    <p className="mt-1 text-xs text-white/60">Friends can speak from the heart directly from their mobile browser.</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                    <p className="text-xs font-bold text-white">🔒 Midnight Reveal Lock</p>
                    <p className="mt-1 text-xs text-white/60">Zero spoilers. Sealed tight until the clock strikes twelve.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: BENTO GRID VIEW */}
          {activeView === 'bento' && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Tile 1: Photo & Quote Card */}
              <div className="rounded-3xl border border-white/15 bg-white/95 p-5 text-foreground shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">AK</div>
                  <div>
                    <p className="text-xs font-bold">Alex K.</p>
                    <p className="text-[10px] text-muted-foreground">High School Crew</p>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden bg-gradient-to-br from-amber-200 to-orange-200 aspect-[4/3] flex items-center justify-center text-3xl">
                  🎂✨
                </div>
                <p className="mt-3 text-xs text-stone-700 font-medium">
                  &ldquo;Happy quarter-century! You haven&apos;t changed a bit since AP Chemistry.&rdquo;
                </p>
              </div>

              {/* Tile 2: Audio Voice Note Tile */}
              <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-primary/30 to-secondary/30 p-5 text-white shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    🎙️ Voice Message
                  </span>
                  <h4 className="mt-3 text-lg font-bold">Mama & Dad</h4>
                  <p className="mt-1 text-xs text-white/80">&ldquo;We recorded this together while looking at your baby pictures...&rdquo;</p>
                </div>
                <div className="mt-4 rounded-2xl bg-black/40 p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white text-foreground flex items-center justify-center font-bold">
                    <Play className="h-4 w-4 ml-0.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold">1:15 Voice Note</p>
                    <div className="h-1.5 w-full rounded-full bg-white/20 mt-1">
                      <div className="h-full w-2/3 rounded-full bg-amber-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tile 3: Group Cash Gift Tracker */}
              <div className="rounded-3xl border border-white/15 bg-white/95 p-5 text-foreground shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      🎁 Group Gift Pool
                    </span>
                    <span className="text-xs font-bold text-emerald-600">76% Funded</span>
                  </div>
                  <h4 className="mt-3 text-base font-bold">Maya&apos;s Sony Mirrorless Camera Fund</h4>
                  <p className="mt-1 text-xs text-muted-foreground">12 friends chipped in to buy Maya her dream camera!</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>$380 raised</span>
                    <span className="text-muted-foreground">Goal: $500</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                    <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center pt-1">Powered by Paystack &middot; Instant safe payouts</p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: GIFT POOL VIEW */}
          {activeView === 'pool' && (
            <div className="mt-8 max-w-2xl mx-auto rounded-3xl border border-white/20 bg-white/95 p-6 sm:p-8 text-foreground shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl">
                  🎁
                </div>
                <div>
                  <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Collaborative Cash Gift Pool
                  </span>
                  <h4 className="mt-1 text-xl font-bold text-foreground">Maya&apos;s Dream Camera & Tokyo Trip</h4>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-stone-50 border border-stone-200 p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</p>
                    <p className="mt-1 text-3xl font-extrabold text-foreground">$380.00</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goal</p>
                    <p className="mt-1 text-lg font-bold text-muted-foreground">$500.00</p>
                  </div>
                </div>

                <div className="mt-4 h-3 w-full rounded-full bg-stone-200 overflow-hidden">
                  <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                </div>
                <p className="mt-2 text-right text-xs font-semibold text-emerald-600">76% of target reached &middot; 12 contributors</p>
              </div>

              {/* Contributor List Preview */}
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Recent Contributions</p>
                <div className="space-y-2.5">
                  {[
                    { name: 'Sarah Jenkins', amount: '$50', note: 'Can’t wait to see your photos! 📸' },
                    { name: 'David & Marcus', amount: '$75', note: 'Have a drink in Tokyo on us! 🍣' },
                    { name: 'Grandma Rosa', amount: '$100', note: 'So proud of you darling, happy birthday!' },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-stone-100 p-3 shadow-xs">
                      <div>
                        <p className="text-xs font-bold text-foreground">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.note}</p>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-600">{c.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Live Banner CTA */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:px-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-xs text-white/80 sm:text-sm">
                Ready to surprise someone special? Create their page in under 2 minutes.
              </p>
            </div>
            <Link to="/create">
              <Button size="sm" className="gradient-cta text-white font-bold shadow-md hover:opacity-95">
                Create Page Now
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
