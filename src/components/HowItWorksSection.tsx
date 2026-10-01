import { Sparkles, ArrowRight, Share2, Gift, Clock, Smartphone, Music, Check } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    eyebrow: 'Set the Stage',
    title: 'Create the canvas in 2 minutes',
    description:
      'Enter the recipient’s name, pick a date, choose an ambient theme, and select a soothing background melody.',
    highlight: 'No design skills needed',
    color: 'from-amber-400 to-orange-500',
    bgTint: 'from-amber-500/10 via-white to-orange-500/5',
    border: 'border-amber-200/80',
    card: (
      <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm text-left">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <span className="text-xs font-bold text-foreground">🎂 New Birthday Page</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Setup Mode</span>
        </div>
        <div className="mt-3 space-y-2 text-xs">
          <div className="rounded-lg bg-stone-50 border border-stone-100 p-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Recipient</span>
            <p className="font-bold text-foreground">Maya Adebayo (25th)</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-stone-50 border border-stone-100 p-2">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Theme</span>
              <p className="font-bold text-foreground">✨ Twilight Gold</p>
            </div>
            <div className="rounded-lg bg-stone-50 border border-stone-100 p-2">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Soundtrack</span>
              <p className="font-bold text-foreground">🎵 Soft Lofi</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: '02',
    eyebrow: 'Invite the World',
    title: 'Share one link. No apps or signups for guests.',
    description:
      'Send the link on WhatsApp, group chats, or iMessage. Friends and family tap once, record voice notes, attach photos, and chip into the gift fund.',
    highlight: 'Takes 60 seconds from any phone',
    color: 'from-rose-400 to-pink-500',
    bgTint: 'from-rose-500/10 via-white to-pink-500/5',
    border: 'border-rose-200/80',
    card: (
      <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm text-left">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-bold text-foreground">Mobile Guest Experience</span>
        </div>
        <div className="rounded-xl bg-stone-50 border border-stone-200/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700">🎙️ Record Voice Note</span>
            <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold">Tap to speak</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700">📸 Attach Photo Memory</span>
            <span className="text-muted-foreground text-[10px]">JPG, PNG</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-stone-200/50 pt-1.5">
            <span className="font-semibold text-stone-700">🎁 Chip in $25 to Gift Pool</span>
            <span className="text-emerald-600 font-bold text-[10px]">Secure Paystack</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: '03',
    eyebrow: 'The Big Moment',
    title: 'The midnight reveal & timeless keepsake',
    description:
      'When the birthday arrives, the countdown unlocks. The recipient opens the wax-sealed letter, soft music plays, and every heartfelt wish comes alive.',
    highlight: 'Downloadable PDF memory book',
    color: 'from-violet-500 to-indigo-600',
    bgTint: 'from-violet-500/10 via-white to-indigo-500/5',
    border: 'border-violet-200/80',
    card: (
      <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm text-left">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <span className="text-xs font-bold text-foreground">🎉 The Reveal Moment</span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Unlocked!</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
            💌
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">19 Wishes Unlocked</p>
            <p className="text-[11px] text-muted-foreground">Ambient music playing &middot; Confetti active</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-stone-500 bg-stone-50 rounded-lg p-1.5">
          <Check className="h-3 w-3 text-emerald-500" />
          <span>Keepsake PDF ready to print or save</span>
        </div>
      </div>
    ),
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-card py-20 px-4 sm:px-6 sm:py-28">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[5%] top-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-[5%] bottom-1/4 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Clock className="h-3.5 w-3.5" />
            Simple 3-Step Journey
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            How Wishcanvas Works
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            No messy group chats, no chasing people across apps, and no awkward split-bill calculations.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {STEPS.map((s, index) => (
            <div
              key={s.step}
              className={`relative flex flex-col justify-between rounded-[2.2rem] border bg-gradient-to-b p-6 sm:p-8 shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-card-lg ${s.bgTint} ${s.border}`}
            >
              <div>
                {/* Step badge & number */}
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} font-black text-white text-base shadow-md`}>
                    {s.step}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {s.highlight}
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{s.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-bold text-foreground sm:text-2xl leading-snug">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
              </div>

              {/* Graphic Mock Card */}
              <div className="mt-8 pt-4 border-t border-stone-200/60">
                {s.card}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
