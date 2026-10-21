import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Pause,
  Heart,
  Sparkles,
  Palette,
  Mic,
  Share2,
  Lock,
  Music4,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import WrappedStoryModal from '@/components/WrappedStoryModal';

const HeroSection = () => {
  const { user } = useAuth();
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [audioTimer, setAudioTimer] = useState(14);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);
  const [showWrappedModal, setShowWrappedModal] = useState(false);

  // Voice note timer simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingVoice) {
      timer = setInterval(() => {
        setAudioTimer((prev) => (prev >= 48 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingVoice]);

  return (
    <section className="relative overflow-hidden bg-[#FAF7F2] pt-24 pb-12 sm:pt-36 sm:pb-24">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-[5%] top-10 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-rose-200/40 via-amber-200/30 to-pink-100/40 blur-3xl" />
        <div className="absolute left-[5%] top-1/3 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* HERO MAIN ROW: Left Editorial Text, Right Celebration Canvas Preview */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* LEFT COLUMN: Editorial Typography (Span 6 cols on lg) */}
          <div className="text-center lg:text-left lg:col-span-6">
            {/* Eyebrow */}
            <div className="mb-4 inline-block">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                Make Every Year More Special
              </span>
            </div>

            {/* Editorial Display Headline */}
            <h1 className="font-playfair text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl leading-[1.06]">
              Birthday <span className="italic font-normal text-rose-500">Moments</span> <br />
              That Last
            </h1>

            {/* Emotional Job Subheading */}
            <p className="mt-4 text-sm font-semibold text-slate-700 sm:text-base tracking-wide">
              &ldquo;Someone made this for you, and everyone showed up.&rdquo;
            </p>

            {/* Explanatory Body */}
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base md:text-lg">
              WishCanvas turns birthday messages into a tactile, living canvas of voice notes, photos, and heartfelt memories. Delivered as a cinematic Spotify Wrapped-style slide reveal on their special day.
            </p>

            {/* CTA Buttons Row */}
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <Link to={user ? '/create' : '/auth?mode=signup'}>
                <Button className="btn-press w-full sm:w-auto justify-center rounded-full bg-slate-950 px-8 py-6 text-sm font-bold text-white shadow-xl hover:bg-slate-800 hover:shadow-2xl">
                  <span>{user ? 'Create a Canvas' : 'Start a Birthday Canvas'}</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <button
                type="button"
                onClick={() => setShowWrappedModal(true)}
                className="btn-press group flex w-full sm:w-auto items-center justify-center gap-3 rounded-full border border-stone-300 bg-white/90 px-6 py-3.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-white hover:border-slate-400"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-200 group-hover:scale-110">
                  <Play className="h-3 w-3 fill-white ml-0.5" />
                </div>
                <span>Watch How It Unfolds</span>
              </button>
            </div>

            {/* Direct Guest Studio Access */}
            {!user && (
              <div className="mt-3.5 text-center lg:text-left">
                <Link
                  to="/create"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-amber-900 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>No account needed: <span className="underline font-bold text-amber-800">Craft a Canvas as a Guest</span> &rarr;</span>
                </Link>
              </div>
            )}

            {/* Social Proof + Handwritten Doodle */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-8 pt-4 border-t border-stone-200/60">
              {/* Overlapping Avatar Stack */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5 overflow-hidden">
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-[#FAF7F2] bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white text-xs flex items-center justify-center">
                    TF
                  </div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-[#FAF7F2] bg-gradient-to-br from-rose-500 to-pink-500 font-bold text-white text-xs flex items-center justify-center">
                    AF
                  </div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-[#FAF7F2] bg-gradient-to-br from-violet-500 to-indigo-500 font-bold text-white text-xs flex items-center justify-center">
                    DS
                  </div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-[#FAF7F2] bg-gradient-to-br from-emerald-400 to-teal-500 font-bold text-white text-xs flex items-center justify-center">
                    KA
                  </div>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Bring everyone together</p>
                  <p className="text-xs text-slate-500 font-medium">Messages, photos and voice notes</p>
                </div>
              </div>

              {/* Handwritten micro-doodle (Caveat font) */}
              <div className="font-caveat text-xl sm:text-2xl text-slate-600 rotate-[-3deg] select-none">
                More than just a card ◡̈
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Authentic Freeform Product Canvas (Span 6 cols on lg) */}
          <div className="relative lg:col-span-6">
            
            {/* The Authentic Canvas Board Surface matching FreeformSection.tsx */}
            <div className="relative mx-auto w-full max-w-lg rounded-[2.5rem] border border-amber-200/80 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] p-5 sm:p-7 shadow-2xl">
              
              {/* Top Board Label Badge */}
              <div className="mb-4 flex items-center justify-between border-b border-stone-200/70 pb-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Chi&apos;s 23rd Birthday Canvas</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>24 Wishes Inside</span>
                </div>
              </div>

              {/* CARD 1: Cover Header Card ("First Note off the Board" - FreeformSection style) */}
              <div className="relative mb-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm text-left">
                {/* Washi tape on cover card */}
                <div
                  className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 h-3.5 w-20 rounded-xs bg-amber-200/90 shadow-xs rotate-[-1deg]"
                  aria-hidden="true"
                />
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>First Note Off The Board</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-slate-600 font-semibold">Organized by Ayo</span>
                </div>
                <h3 className="mt-2 font-playfair text-xl sm:text-2xl font-bold text-slate-950">
                  Happy 23rd Birthday, Chi. ✨
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Every note, photo, and voice clip here was gathered to make this feel less like a page and more like a warm room full of friends.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-700">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5">24 wishes</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5">12 voice notes</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5">18 photos</span>
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5">Reveal Apr 1</span>
                </div>
              </div>

              {/* CARD 2: Authentic Contributor Wish Card with Real Voice Note */}
              <div className="relative mb-4 rounded-2xl border border-amber-200/70 bg-white p-4 shadow-sm text-left rotate-[-0.8deg] transition-transform hover:rotate-0">
                {/* Pin dot decorator */}
                <div
                  className="pointer-events-none absolute -top-2 left-6 h-3 w-3 rounded-full bg-rose-400 shadow-xs border border-white"
                  aria-hidden="true"
                />

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-500 text-white font-bold text-[10px]">
                      AY
                    </div>
                    <div>
                      <p className="font-extrabold uppercase tracking-wider text-slate-900 text-[11px]">
                        Ayomikun
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Lagos, Nigeria · Best Friend</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100">
                    Voice Note Attached 🎙️
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  &ldquo;Happy 23rd birthday to my day one, Chi! From late night gist and surviving Lagos traffic to celebrating every big win together, having you in my corner is a blessing. Keep shining!&rdquo;
                </p>

                {/* Real Interactive Audio Waveform Player */}
                <div className="mt-3 rounded-xl border border-amber-200/60 bg-amber-50/80 p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 mb-1.5">
                    <span>Ayomikun&apos;s Birthday Note</span>
                    <span>0:{audioTimer < 10 ? `0${audioTimer}` : audioTimer} / 0:48</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                      aria-label={isPlayingVoice ? 'Pause voice note' : 'Play voice note'}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-xs transition-transform active:scale-90 hover:bg-slate-800"
                    >
                      {isPlayingVoice ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </button>

                    {/* Animated waveform bars */}
                    <div className="flex h-5 flex-1 items-center gap-0.5">
                      {[35, 65, 90, 50, 85, 100, 55, 95, 45, 75, 90, 40, 70, 95, 60, 45, 80, 65, 40, 85].map(
                        (h, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isPlayingVoice && i <= (audioTimer / 48) * 20
                                ? 'bg-amber-600'
                                : isPlayingVoice
                                ? 'bg-amber-400'
                                : 'bg-stone-300'
                            }`}
                            style={{
                              height: isPlayingVoice
                                ? `${Math.max(25, (h * Math.sin(i + audioTimer)) % 100)}%`
                                : `${h * 0.45}%`,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Reaction button */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <span className="text-[10px] font-bold text-slate-400">Tap to react</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLiked(!liked);
                      setLikeCount((c) => (liked ? c - 1 : c + 1));
                    }}
                    className="flex items-center gap-1 font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-rose-500' : ''}`} />
                    <span>{likeCount}</span>
                  </button>
                </div>
              </div>

              {/* CARD 3: Authentic Polaroid Photo Memory with Washi Tape */}
              <div className="relative rounded-2xl border border-stone-200/80 bg-white p-3 shadow-md rotate-[1.2deg] transition-transform hover:rotate-0">
                {/* Washi tape on photo */}
                <div
                  className="pointer-events-none absolute -top-2.5 right-8 h-3.5 w-16 rounded-xs bg-rose-200/90 shadow-xs rotate-[3deg]"
                  aria-hidden="true"
                />

                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 border border-stone-200">
                    <img
                      src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=300&q=80"
                      alt="UNILAG Convocation memory"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎓</span>
                      <p className="font-bold text-xs text-slate-900 leading-tight">
                        UNILAG Convocation &apos;23
                      </p>
                    </div>
                    <p className="font-caveat text-sm text-slate-600 mt-0.5">
                      &ldquo;Brothers for life, from Akoka to the world!&rdquo;
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Attached by Ebube &amp; Angel
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowWrappedModal(true)}
                    className="btn-press shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 shadow-xs"
                  >
                    View Reveal
                  </button>
                </div>
              </div>

              {/* Floating stickers matching FreeformSection */}
              <div className="pointer-events-none absolute -top-3 -right-3 text-3xl select-none animate-float">
                ✨
              </div>
              <div className="pointer-events-none absolute -bottom-3 -left-3 text-3xl select-none animate-float" style={{ animationDelay: '1.2s' }}>
                🍰
              </div>

            </div>

          </div>
        </div>

        {/* BOTTOM VALUE PILLARS BAR */}
        <div className="mt-16 sm:mt-20">
          <div className="grid grid-cols-2 gap-4 rounded-[2rem] border border-stone-200/80 bg-white p-5 sm:p-8 shadow-card lg:grid-cols-4 lg:gap-6">
            
            {/* Col 1: Custom Themes */}
            <div className="card-lift flex flex-col items-center sm:items-start p-3 text-center sm:text-left rounded-2xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-slate-950 sm:text-base">Curated Themes</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">From classic luxury to cosmic night skies</p>
            </div>

            {/* Col 2: Audio Voice Notes */}
            <div className="card-lift flex flex-col items-center sm:items-start p-3 text-center sm:text-left rounded-2xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-xs">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-slate-950 sm:text-base">Real Voice Notes</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Hear blessings, laughter and prayers</p>
            </div>

            {/* Col 3: Zero Guest Signup */}
            <div className="card-lift flex flex-col items-center sm:items-start p-3 text-center sm:text-left rounded-2xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-slate-950 sm:text-base">Zero Guest Signup</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Contribute in 60 seconds from any phone</p>
            </div>

            {/* Col 4: Wrapped Slide Reveal */}
            <div className="card-lift flex flex-col items-center sm:items-start p-3 text-center sm:text-left rounded-2xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-slate-950 sm:text-base">Wrapped Slide Reveal</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Delivered as a cinematic musical story</p>
            </div>

          </div>
        </div>

      </div>

      {/* LIGHT THEMED AUTHENTIC WRAPPED MODAL */}
      <WrappedStoryModal
        isOpen={showWrappedModal}
        onClose={() => setShowWrappedModal(false)}
      />
    </section>
  );
};

export default HeroSection;
