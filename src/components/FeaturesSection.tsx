import React from 'react';
import {
  Check,
  Edit,
  Heart,
  Image,
  Infinity as InfinityIcon,
  Palette,
  Share2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

type SupportingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight: string;
  panelClassName: string;
  iconClassName: string;
  wide?: boolean;
};

const supportingFeatures: SupportingFeature[] = [
  {
    icon: Image,
    title: 'Photo memories',
    description: 'Let guests attach the moments behind the message, not just text.',
    highlight: 'Photos stay optional',
    panelClassName: 'from-amber-50 via-white to-rose-50',
    iconClassName: 'from-amber-400 to-rose-500',
  },
  {
    icon: Heart,
    title: 'A real reveal moment',
    description: 'Birthday pages stay hidden until the date arrives, so the surprise lands properly.',
    highlight: 'Built for the big day',
    panelClassName: 'from-fuchsia-50 via-white to-pink-50',
    iconClassName: 'from-fuchsia-500 to-pink-500',
  },
  {
    icon: Palette,
    title: 'Themes with personality',
    description: 'Switch from playful to polished, or build a custom look for the birthday person.',
    highlight: '10 presets plus custom themes',
    panelClassName: 'from-violet-50 via-white to-indigo-50',
    iconClassName: 'from-violet-500 to-indigo-500',
  },
  {
    icon: Share2,
    title: 'Sharing that feels effortless',
    description: 'Send one link and let friends contribute from their phones in seconds.',
    highlight: 'Link-friendly and mobile-first',
    panelClassName: 'from-sky-50 via-white to-cyan-50',
    iconClassName: 'from-sky-500 to-cyan-500',
  },
  {
    icon: Edit,
    title: 'Change your mind without starting over',
    description: 'Update copy, swap themes, and refine the page as the surprise comes together.',
    highlight: 'Edit anytime',
    panelClassName: 'from-emerald-50 via-white to-teal-50',
    iconClassName: 'from-emerald-500 to-teal-500',
    wide: true,
  },
];

const FeaturesSection = () => {
  return (
    <section className="relative overflow-hidden bg-card px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-20 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-10 right-[10%] h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14 md:mb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Features
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Built for group surprises, not messy group chats
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Collect wishes, memories, and photos in one place, then reveal everything in a way that still feels personal.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          <article className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(245,241,255,0.96))] p-6 shadow-card-lg sm:p-8">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute -right-10 top-10 h-32 w-32 rounded-full bg-secondary/15 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative flex h-full flex-col">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="gradient-cta flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_18px_36px_rgba(194,58,196,0.22)]">
                  <InfinityIcon className="h-7 w-7 text-white" />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    No signup for guests
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Unlimited wishes
                  </span>
                </div>
              </div>

              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Main advantage
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  Everyone can leave a message without turning the surprise into admin work
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Share one page, let friends contribute from anywhere, and keep everything organized until reveal time.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  'Collect messages, photos, and names in one flow',
                  'Keep contributions tidy instead of scattered across chats',
                  'Reveal everything on the birthday instead of leaking early',
                  'Update the page while plans are still changing',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white/70 px-4 py-3 backdrop-blur-sm"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[2rem] border border-border/60 bg-slate-950 p-5 text-slate-50 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    <span>Birthday board</span>
                    <span>Live preview</span>
                  </div>
                  <div className="mt-5 flex items-start gap-3">
                    <div className="gradient-cta flex h-12 w-12 items-center justify-center rounded-2xl text-xl">
                      🎂
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">Sarah&apos;s surprise page</p>
                      <p className="text-sm text-slate-400">23 wishes gathered before midnight</p>
                    </div>
                  </div>
                  <div className="mt-5 flex -space-x-2">
                    <div className="h-9 w-9 rounded-full border-2 border-slate-950 bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                    <div className="h-9 w-9 rounded-full border-2 border-slate-950 bg-gradient-to-br from-pink-400 to-rose-400" />
                    <div className="h-9 w-9 rounded-full border-2 border-slate-950 bg-gradient-to-br from-amber-400 to-orange-500" />
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-xs font-semibold text-slate-200">
                      +20
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="gradient-cta h-full w-4/5 rounded-full" />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[1.5rem] border border-border/60 bg-white/80 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Contribution mode
                    </p>
                    <p className="mt-3 text-3xl font-bold text-foreground">2 min</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Typical time for a guest to add a wish from their phone.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                      Surprise-friendly
                    </p>
                    <p className="mt-3 text-base font-semibold text-foreground">
                      Built to feel thoughtful, not chaotic
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The page keeps the sentiment while removing the coordination friction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {supportingFeatures.map((feature) => (
              <article
                key={feature.title}
                className={[
                  'group rounded-[2rem] border border-border/60 bg-gradient-to-br p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_60px_rgba(118,62,186,0.12)] sm:p-6',
                  feature.panelClassName,
                  feature.wide ? 'sm:col-span-2' : '',
                ].join(' ')}
              >
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.iconClassName} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/65">
                  {feature.highlight}
                </p>
                <h3 className="mt-3 text-lg font-bold leading-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
