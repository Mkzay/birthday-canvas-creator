import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  Heart,
  Volume2,
  Gift,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';

const HeroSection = () => {
  const { user } = useAuth();
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [audioTimer, setAudioTimer] = useState(8);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(19);

  // Smooth voice note progress simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingVoice) {
      timer = setInterval(() => {
        setAudioTimer((prev) => (prev >= 36 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingVoice]);

  const scrollToDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    const demo = document.getElementById('demo');
    if (demo) {
      demo.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="gradient-hero relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
      <AnimatedBackground showWaves={true} showStars={true} />

      {/* Atmospheric lighting layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[5%] top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute right-[5%] bottom-24 h-56 w-56 rounded-full bg-white/10 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Bottom fade into page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-background/20 to-background" />

      <div className="relative z-10 mx-auto max-w-6xl text-center">
        {/* Floating pill badge */}
        <div className="mb-4 inline-block sm:mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md sm:px-4 sm:py-2 sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-200 animate-pulse" />
            <span>The Collaborative Birthday Experience</span>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">New</span>
          </span>
        </div>

        {/* Impactful Headline */}
        <h1 className="mx-auto max-w-4xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Turn Birthday Wishes Into An{' '}
          <span className="gradient-accent block sm:inline drop-shadow-sm">
            Unforgettable Story
          </span>
        </h1>

        {/* Eloquent Subtext */}
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl font-medium">
          Gather heartfelt voice notes, photo memories, and group gift contributions from friends and family worldwide. 
          Delivered as an emotional, interactive reveal on their special day.
        </p>

        {/* Dual CTA buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
          <Link to={user ? '/create' : '/auth'} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="group w-full rounded-2xl bg-white text-base font-extrabold text-foreground shadow-2xl transition-all duration-300 hover:bg-stone-50 hover:scale-105 active:scale-95 sm:w-auto px-7 py-6"
            >
              <span>{user ? 'Create a Birthday Page' : 'Start a Birthday Page Free'}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5 ml-1.5" />
            </Button>
          </Link>
          <a
            href="#demo"
            onClick={scrollToDemo}
            className="w-full sm:w-auto"
          >
            <Button
              variant="glass"
              size="lg"
              className="w-full rounded-2xl border-white/30 text-base font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/15 sm:w-auto px-6 py-6"
            >
              Explore Live Demo ↓
            </Button>
          </a>
        </div>

        {/* Trust Signals */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-white/80">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-200" />
            No guest signup needed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-200" />
            Audio voice notes
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-200" />
            Group gift cash pool
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-200" />
            Midnight reveal lock
          </span>
        </div>

        {/* HERO PRODUCT SHOWCASE CANVAS (Visual representation of an actual Wishcanvas page) */}
        <div className="mt-12 sm:mt-16 relative mx-auto max-w-4xl">
          {/* Outer floating container */}
          <div className="relative rounded-[2.2rem] border border-white/30 bg-white/15 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
            
            {/* Top Browser/Canvas Bar */}
            <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-stone-950/40 px-4 py-2.5 text-left text-white backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-400/80" />
                <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-medium text-white/70">wishcanvas.app/birthday/maya-25</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  ✨ Twilight Gold Theme
                </span>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Unlocked on Birthday
                </span>
              </div>
            </div>

            {/* Main Interactive Preview Card */}
            <div className="mt-3 overflow-hidden rounded-[1.8rem] border border-stone-200/40 bg-gradient-to-br from-amber-950/90 via-stone-900 to-amber-900/80 p-5 sm:p-7 text-left text-white shadow-inner">
              
              {/* Card Meta & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎂</span>
                    <h3 className="text-lg font-bold sm:text-xl">Happy 25th Birthday, Maya!</h3>
                  </div>
                  <p className="text-xs text-white/60">24 wishes &middot; 8 photos &middot; 6 voice notes</p>
                </div>
                
                {/* Gift pool mini pill */}
                <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 backdrop-blur-md">
                  <Gift className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Group Gift Pool</p>
                    <p className="text-xs font-extrabold text-emerald-300">$380 / $500 raised</p>
                  </div>
                </div>
              </div>

              {/* Central Wish Showcase */}
              <div className="mt-5 grid gap-5 sm:grid-cols-[1.1fr_0.9fr] items-center">
                {/* Wish Content */}
                <div className="rounded-2xl border border-white/15 bg-white/95 p-5 text-stone-900 shadow-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-bold text-white text-xs">
                      SJ
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sarah Jenkins</p>
                      <p className="text-[11px] text-stone-500">Best Friend &middot; Slide 1 of 24</p>
                    </div>
                  </div>

                  <p className="text-sm font-medium leading-relaxed text-stone-800">
                    &ldquo;Happy birthday Maya! You make the world 10x brighter. 
                    Can&apos;t wait to celebrate you this weekend! Listen to the voice note below for our favorite college memory 😂❤️&rdquo;
                  </p>

                  {/* Working Voice Note Simulation */}
                  <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-sm transition-transform active:scale-95 hover:opacity-90"
                      >
                        {isPlayingVoice ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>

                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                          <span className="flex items-center gap-1 text-primary">
                            <Volume2 className="h-3 w-3" />
                            Voice Note
                          </span>
                          <span>0:{audioTimer < 10 ? `0${audioTimer}` : audioTimer} / 0:36</span>
                        </div>

                        {/* Animated waveform bars */}
                        <div className="flex h-5 items-center gap-0.5">
                          {[30, 60, 90, 45, 75, 100, 50, 80, 40, 70, 95, 30, 60, 85, 40, 75, 90, 50].map((h, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full transition-all duration-200 ${
                                isPlayingVoice && i <= (audioTimer / 36) * 18
                                  ? 'bg-primary'
                                  : isPlayingVoice
                                  ? 'bg-primary/30'
                                  : 'bg-stone-300'
                              }`}
                              style={{
                                height: isPlayingVoice ? `${Math.max(25, (h * Math.sin(i + audioTimer)) % 100)}%` : `${h * 0.5}%`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Heart button */}
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setLiked(!liked);
                        setLikeCount((c) => (liked ? c - 1 : c + 1));
                      }}
                      className="flex items-center gap-1 font-bold text-stone-700 hover:text-rose-500 transition-colors"
                    >
                      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{likeCount} likes</span>
                    </button>
                    <span className="text-[11px] font-medium text-primary">Tap next wish &rarr;</span>
                  </div>
                </div>

                {/* Right: Attached Memory Polaroid & Wax Seal */}
                <div className="space-y-4">
                  <div className="relative rounded-2xl border border-white/20 bg-stone-900/60 p-3 backdrop-blur-md">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-amber-200 via-rose-200 to-violet-300 flex items-center justify-center text-center p-4">
                      <div>
                        <span className="text-3xl">✈️⛩️</span>
                        <p className="mt-1 text-xs font-bold text-stone-800">Tokyo Roadtrip &apos;24</p>
                        <p className="text-[10px] text-stone-600 font-medium">Memory attached by Sarah</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-red-600/80 border border-red-400 flex items-center justify-center font-serif text-white font-bold text-xs shadow-sm">
                        M
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">The Wax-Seal Reveal</p>
                        <p className="text-[10px] text-white/70">Unlocks smoothly with ambient background music.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
