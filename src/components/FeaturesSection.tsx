import {
  Sparkles,
  Volume2,
  Gift,
  Lock,
  Palette,
  LayoutGrid,
  FileDown,
  CheckCircle2,
  Share2,
  Heart,
} from 'lucide-react';

const FeaturesSection = () => {
  return (
    <section id="features" className="relative overflow-hidden bg-background py-20 px-4 sm:px-6 sm:py-28">
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-[8%] bottom-20 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Product Features
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Crafted for Unforgettable Reactions
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Every feature in Wishcanvas is designed around one goal: making someone feel profoundly loved on their birthday.
          </p>
        </div>

        {/* BENTO GRID */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* TILE 1: Large Featured Card - Voice Notes (Spans 2 cols on lg) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-border/70 bg-gradient-to-br from-violet-500/10 via-card to-card p-6 sm:p-8 shadow-card transition-all duration-300 hover:shadow-card-lg lg:col-span-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
                  <Volume2 className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Signature Feature
                </span>
              </div>

              <div className="mt-6 max-w-xl">
                <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
                  Hear their laughter, not just text emojis
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Text messages are nice, but hearing your grandmother’s laughter, your best friend singing off-key, or family across the globe brings an emotional depth no greeting card can match.
                </p>
              </div>
            </div>

            {/* Visual simulation of voice note component */}
            <div className="mt-8 rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold shadow-sm">
                  🎙️
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Auntie Ngozi (London, UK)</span>
                    <span className="text-muted-foreground">0:48 Voice Wish</span>
                  </div>
                  {/* Waveform graphic */}
                  <div className="mt-2 flex h-6 items-center gap-1">
                    {[35, 60, 85, 45, 90, 70, 40, 80, 100, 65, 90, 50, 75, 40, 65, 80, 95, 45, 60, 35, 75, 50].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-purple-400"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TILE 2: Cash Gift Pool */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-border/70 bg-gradient-to-br from-emerald-500/10 via-card to-card p-6 sm:p-8 shadow-card transition-all duration-300 hover:shadow-card-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                  <Gift className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Paystack Powered
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                  Collaborative Cash Gift Pool
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Crowdfund their dream gadget, flight ticket, or weekend trip. Guests chip in with bank transfer or cards, without messy WhatsApp tracking.
                </p>
              </div>
            </div>

            {/* Visual Gift Pool Tracker */}
            <div className="mt-8 rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-sm">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-foreground">$380 collected</span>
                <span className="text-emerald-600">Goal: $500</span>
              </div>
              <div className="mt-2 h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full w-[76%] rounded-full bg-emerald-500" />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground text-center">12 contributors &middot; Instant payouts</p>
            </div>
          </div>

          {/* TILE 3: The Midnight Reveal Lock */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-border/70 bg-gradient-to-br from-amber-500/10 via-card to-card p-6 sm:p-8 shadow-card transition-all duration-300 hover:shadow-card-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                  <Lock className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Zero Spoilers
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                  Midnight Reveal Lock
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  The page stays sealed with a live countdown clock until their birthday arrives. Friends can add wishes secretly in advance.
                </p>
              </div>
            </div>

            {/* Countdown Clock preview */}
            <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-stone-200/80 bg-white/95 p-3 text-center shadow-sm">
              <div className="rounded-xl bg-stone-50 p-2">
                <p className="text-lg font-black text-foreground">03</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Days</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-2">
                <p className="text-lg font-black text-foreground">14</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Hours</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-2">
                <p className="text-lg font-black text-foreground">52</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Mins</p>
              </div>
            </div>
          </div>

          {/* TILE 4: 10+ Aesthetic Themes & Builder */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-border/70 bg-gradient-to-br from-rose-500/10 via-card to-card p-6 sm:p-8 shadow-card transition-all duration-300 hover:shadow-card-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md">
                  <Palette className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Customizable
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                  10+ Mood Themes & Builder
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  From golden luxury to playful confetti and cyberpunk cosmic vibes. You can also craft custom gradients, emojis, and typography.
                </p>
              </div>
            </div>

            {/* Themes Palette preview */}
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-xs">✨ Twilight</span>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-xs">🌹 Rose Velvet</span>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-xs">🌌 Cosmic</span>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-xs">🌊 Ocean</span>
            </div>
          </div>

          {/* TILE 5: Keepsake Memory PDF Export */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-border/70 bg-gradient-to-br from-sky-500/10 via-card to-card p-6 sm:p-8 shadow-card transition-all duration-300 hover:shadow-card-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md">
                  <FileDown className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Keepsake Ready
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                  Printable Keepsake PDF
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Turn the digital experience into a bound memory booklet. Export all wishes, photos, and signatures as a beautifully formatted PDF.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-stone-200/80 bg-white/95 p-3.5 text-xs text-muted-foreground flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>High-resolution export with photo spreads</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
