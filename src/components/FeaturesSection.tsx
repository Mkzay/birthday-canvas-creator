import { useState, useEffect } from 'react';
import {
  Volume2,
  Lock,
  BookOpen,
  FileDown,
  CheckCircle2,
  Play,
  Pause,
  Sparkles,
  Share2,
  Clock,
  Heart,
  Music4,
  ArrowRight,
  Send,
  Mic,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import WrappedStoryModal from '@/components/WrappedStoryModal';

const FeaturesSection = () => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(18);
  const [showWrappedModal, setShowWrappedModal] = useState(false);

  // Live ticking countdown ticker simulation
  const [countdownSeconds, setCountdownSeconds] = useState(38);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev <= 0 ? 59 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice note player progression
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioSeconds((prev) => (prev >= 48 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  return (
    <section id="features" className="relative overflow-hidden bg-[#FAF7F2] py-20 px-4 sm:px-6 sm:py-28">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[5%] top-20 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute right-[5%] bottom-20 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        
        {/* Section Header with Editorial Flair */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-12 border-b border-stone-200/70">
          <div className="text-center lg:text-left">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
              Beyond The Standard Greeting Card
            </span>
            <h2 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1]">
              Crafted For The Moment <br />
              <span className="italic font-normal text-rose-500">They Open It</span>
            </h2>
          </div>

          <div className="font-caveat text-xl sm:text-2xl text-slate-600 select-none text-center lg:text-right">
            Every detail built to spark tears of joy 🥹
          </div>
        </div>

        {/* HIGH-CRAFT ASYMMETRIC BENTO GRID */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-12">
          
          {/* TILE 1: Large Featured Card - Voice Notes & Blessings (Span 2 cols on tablet, 7 cols on lg) */}
          <div className="card-lift relative flex flex-col justify-between rounded-[2.5rem] border border-amber-200/80 bg-white p-6 sm:p-8 md:p-8 lg:p-9 shadow-card hover:shadow-card-lg md:col-span-2 lg:col-span-7 text-left">
            <div>
              {/* Card Tag & Clean Consumer Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/80 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-xs">
                  <Volume2 className="h-4 w-4 text-amber-600" />
                  <span>Voice Notes &amp; Blessings</span>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 sm:text-[11px] sm:px-3">
                  Recorded from any phone 📱
                </span>
              </div>

              <div className="mt-6 max-w-xl">
                <h3 className="font-playfair text-2xl font-bold text-slate-950 sm:text-3xl leading-tight">
                  Hear their laughter, not just text emojis
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Text comments fade quickly. But hearing your grandmother’s blessings in Yoruba, your best friend singing off-key from London, or family voices laughing together delivers warmth no greeting card can replicate.
                </p>
              </div>
            </div>

            {/* Authentic Heartfelt Wish Card with Integrated Audio Player */}
            <div className="mt-8 rounded-2xl border border-stone-200/90 bg-[#FAF7F2] p-5 shadow-xs">
              {/* Contributor Header */}
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-xs font-bold shadow-xs">
                    AF
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Auntie Folake (London, UK)
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">Family · Birthday Blessing</p>
                  </div>
                </div>

                <span className="rounded-full bg-amber-100/80 px-3 py-1 text-[11px] font-bold text-amber-900">
                  {isPlayingAudio ? 'Playing 🔊' : 'Voice Note Inside 🎙️'}
                </span>
              </div>

              {/* Heartfelt Wish Quote */}
              <blockquote className="mt-4 font-playfair text-base sm:text-lg leading-relaxed text-slate-800 font-medium">
                &ldquo;Happy 25th my dearest Kem-Kem! May the good Lord enlarge your coast, grant you peace, and fill your days with boundless laughter and divine favor.&rdquo;
              </blockquote>

              {/* Clean, Prominent Audio Player Bar */}
              <div className="mt-4 rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    aria-label={isPlayingAudio ? 'Pause voice note' : 'Play voice note'}
                    className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-md hover:bg-slate-800"
                  >
                    {isPlayingAudio ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                      <span>Folake&apos;s Birthday Prayer</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        0:{audioSeconds < 10 ? `0${audioSeconds}` : audioSeconds} / 0:48
                      </span>
                    </div>

                    {/* Animated Waveform Bars */}
                    <div className="flex h-6 items-center gap-0.5 sm:gap-1">
                      {[35, 60, 95, 45, 80, 100, 65, 90, 50, 75, 95, 40, 70, 90, 60, 45, 80, 65, 40, 85, 95, 55, 75, 40, 60, 80].map(
                        (h, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isPlayingAudio && i <= (audioSeconds / 48) * 26
                                ? 'bg-amber-600'
                                : isPlayingAudio
                                ? 'bg-amber-400'
                                : 'bg-stone-300'
                            }`}
                            style={{
                              height: isPlayingAudio
                                ? `${Math.max(25, (h * Math.sin(i + audioSeconds)) % 100)}%`
                                : `${h * 0.45}%`,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Context: More contributors preview */}
              <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-stone-200/50">
                <span className="font-medium">Attached to Kemi&apos;s 25th Birthday Canvas</span>
                <span className="font-caveat text-sm text-amber-800 font-bold">12 more voice notes on board ◡̈</span>
              </div>
            </div>
          </div>

          {/* TILE 2: Live Midnight Reveal & Luxury Countdown Lock (Span 1 col on tablet, 5 cols on lg) */}
          <div className="card-lift relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-amber-200/90 bg-gradient-to-b from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFE6] p-6 sm:p-8 md:p-8 lg:p-9 shadow-card hover:shadow-card-lg md:col-span-1 lg:col-span-5 text-left">
            <div>
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1 text-xs font-bold text-rose-800 shadow-xs">
                  <Lock className="h-3.5 w-3.5 text-rose-600" />
                  <span>The Midnight Reveal</span>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 border border-stone-200 shadow-xs">
                  Zero Spoilers 🔒
                </span>
              </div>

              <div className="mt-6">
                <h3 className="font-playfair text-2xl font-bold text-slate-950 sm:text-3xl leading-tight">
                  Sealed until their birthday arrives
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Friends contribute secretly in advance. The canvas stays locked behind a golden wax seal until 12:00 AM on their special day, when it unlocks with music and celebration.
                </p>
              </div>
            </div>

            {/* Luxury Milestone Countdown Lock Box */}
            <div className="mt-8 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm text-center">
              {/* Wax Seal Graphic Header */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-900 mb-3.5">
                <span className="text-base select-none">💌</span>
                <span>Unlocks October 12 at 12:00 AM Sharp</span>
              </div>

              {/* Flip Card Dials */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                <div className="rounded-xl bg-[#FAF7F2] border border-stone-200/90 p-2.5 shadow-xs">
                  <p className="font-mono text-lg font-black sm:text-2xl text-slate-950">03</p>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">Days</p>
                </div>
                <div className="rounded-xl bg-[#FAF7F2] border border-stone-200/90 p-2.5 shadow-xs">
                  <p className="font-mono text-lg font-black sm:text-2xl text-slate-950">14</p>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">Hours</p>
                </div>
                <div className="rounded-xl bg-[#FAF7F2] border border-stone-200/90 p-2.5 shadow-xs">
                  <p className="font-mono text-lg font-black sm:text-2xl text-slate-950">52</p>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">Mins</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 shadow-xs ring-2 ring-amber-400/30">
                  <p className="font-mono text-lg font-black sm:text-2xl text-amber-700 animate-pulse">
                    {countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 mt-0.5">Secs</p>
                </div>
              </div>

              {/* Status footer pill */}
              <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-stone-100">
                <span className="font-medium">24 secret wishes safely vaulted</span>
                <span className="font-bold text-amber-800">Auto-unlocks 🔓</span>
              </div>
            </div>
          </div>

          {/* TILE 3: Spotify Wrapped-Style Slide Deck (Span 4 cols on lg) */}
          <div className="card-lift relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-stone-200/80 bg-white p-6 sm:p-8 shadow-card hover:shadow-card-lg lg:col-span-4 text-left">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-800 shadow-xs">
                  <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                  <span>Cinematic Reveal</span>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  Spotify Wrapped Flow
                </span>
              </div>

              <div className="mt-5">
                <h3 className="font-playfair text-xl font-bold text-slate-950 sm:text-2xl">
                  Slide-By-Slide Story Reveal
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                  Wishes unfold one by one with soft background music, full-screen slide transitions, and Polaroid memory photos.
                </p>
              </div>
            </div>

            {/* Mini Slide Deck Preview Artifact */}
            <div className="mt-6 rounded-2xl border border-stone-200/80 bg-[#FAF7F2] p-4 shadow-xs">
              {/* Segmented bar */}
              <div className="flex gap-1.5 mb-3">
                <div className="h-1 flex-1 rounded-full bg-amber-500" />
                <div className="h-1 flex-1 rounded-full bg-stone-300" />
                <div className="h-1 flex-1 rounded-full bg-stone-300" />
              </div>

              {/* Soundtrack status */}
              <div className="flex items-center justify-between text-xs text-slate-700 mb-3">
                <div className="flex items-center gap-1.5 font-bold">
                  <Music4 className="h-3.5 w-3.5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Golden Hour (Piano)</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Slide 1 of 24</span>
              </div>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setShowWrappedModal(true)}
                className="btn-press w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
              >
                <Play className="h-3 w-3 fill-white ml-0.5" />
                <span>Test Slide Reveal</span>
              </button>
            </div>
          </div>

          {/* TILE 4: Printable Memory Keepsake PDF (Span 4 cols on lg) */}
          <div className="card-lift relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-stone-200/80 bg-white p-6 sm:p-8 shadow-card hover:shadow-card-lg lg:col-span-4 text-left">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900 shadow-xs">
                  <FileDown className="h-3.5 w-3.5 text-amber-700" />
                  <span>Physical Keepsake</span>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  300 DPI Export
                </span>
              </div>

              <div className="mt-5">
                <h3 className="font-playfair text-xl font-bold text-slate-950 sm:text-2xl">
                  Printable Memory Book
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                  Export all wishes, photos, and signatures into a high-res printable PDF booklet that they can bind and hold forever.
                </p>
              </div>
            </div>

            {/* Physical Album Simulation Artifact */}
            <div className="mt-6 rounded-2xl border border-stone-200/80 bg-[#FAF7F2] p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-700 pb-2.5 border-b border-stone-200/60">
                <span className="font-extrabold text-slate-900">Archival Photo Book</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Print Ready
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Permanent archival spreads</span>
                </div>
                <span className="font-caveat text-sm text-amber-900 font-bold">Forever keepsake</span>
              </div>
            </div>
          </div>

          {/* TILE 5: Zero Guest Signup / WhatsApp Link (Span 4 cols on lg) */}
          <div className="card-lift relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-stone-200/80 bg-white p-6 sm:p-8 shadow-card hover:shadow-card-lg lg:col-span-4 text-left">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 shadow-xs">
                  <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Zero Friction</span>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                  60s Flow ⚡
                </span>
              </div>

              <div className="mt-5">
                <h3 className="font-playfair text-xl font-bold text-slate-950 sm:text-2xl">
                  Zero Guest Signup
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                  Shared directly on WhatsApp or iMessage. Contributors open the link on mobile and submit their message in under 60 seconds with no app needed.
                </p>
              </div>
            </div>

            {/* Mobile WhatsApp Chat Bubble Artifact */}
            <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 shadow-xs text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  💬
                </div>
                <span className="font-extrabold text-emerald-950 text-[11px]">WhatsApp Group Share</span>
              </div>

              <p className="text-slate-700 text-[11px] leading-snug">
                &ldquo;Drop your voice notes and photos for Kemi here! 🎂&rdquo;
              </p>

              <div className="mt-2 flex items-center justify-between pt-2 border-t border-emerald-200/60 text-[10px] font-mono text-emerald-800 font-bold">
                <span>wishcanvas.app/kemi-25</span>
                <span className="text-[10px] font-sans font-bold text-slate-500">100% Mobile Ready</span>
              </div>
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

export default FeaturesSection;
