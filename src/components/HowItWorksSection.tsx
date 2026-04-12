import { ArrowRight, Gift, Share2, Sparkles } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: Gift,
    eyebrow: 'Set the stage',
    title: 'Start with the person, the date, and the mood',
    description:
      'Create the page, choose a theme, and write the short note that frames the whole surprise.',
    detail: 'You stay in control of the look and the reveal date from the first minute.',
    accent: 'from-amber-100 via-white to-orange-50',
    iconAccent: 'from-amber-400 to-orange-500',
  },
  {
    step: '02',
    icon: Share2,
    eyebrow: 'Invite the group',
    title: 'Send one link and let everyone contribute from their phone',
    description:
      'Friends and family can leave wishes, photos, and little memory notes without signing up.',
    detail: 'No chasing people across chats. Everything lands in one place.',
    accent: 'from-fuchsia-50 via-white to-pink-50',
    iconAccent: 'from-fuchsia-500 to-pink-500',
  },
  {
    step: '03',
    icon: Sparkles,
    eyebrow: 'Reveal the page',
    title: 'Turn collected messages into a real birthday moment',
    description:
      'On the birthday, open a page that feels deliberate, emotional, and ready to share.',
    detail: 'The result feels closer to a keepsake than a message thread.',
    accent: 'from-violet-50 via-white to-indigo-50',
    iconAccent: 'from-violet-500 to-indigo-500',
  },
];

const HowItWorksSection = () => {
  return (
    <section className="relative overflow-hidden bg-card px-4 py-20 sm:px-6 sm:py-24 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-24 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute right-[10%] top-10 h-52 w-52 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/5 to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
        <div className="lg:pr-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:text-sm">
            Process
          </span>
          <h2 className="mt-4 max-w-md text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A simple flow that still feels thoughtfully designed
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            WishCanvas works best when the organizer does very little and the birthday person still gets something that
            feels intentional.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Built for quick setup without flattening the experience',
              'Contribution flow that works on mobile without friction',
              'Reveal moment that feels like a finished page, not a dump of messages',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/70 px-4 py-3 shadow-card">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:max-w-[37rem] lg:justify-self-end">
          <div className="absolute left-7 top-10 hidden h-[calc(100%-5rem)] w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent lg:block" />
          <div className="space-y-4 sm:space-y-5">
            {steps.map((item, index) => (
              <article
                key={item.step}
                className={[
                  'relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br p-5 shadow-card transition-transform duration-300 hover:-translate-y-1 sm:p-6',
                  item.accent,
                  index === 1 ? 'lg:ml-8' : '',
                ].join(' ')}
              >
                <div className="absolute right-5 top-5 text-[1.7rem] font-medium tracking-tight text-foreground/5 sm:text-[2.15rem] lg:text-[2.35rem]">
                  {item.step}
                </div>
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.iconAccent} shadow-[0_18px_36px_rgba(118,62,186,0.18)]`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">{item.eyebrow}</p>
                    <h3 className="mt-2.5 text-lg font-bold leading-tight text-foreground sm:text-[1.75rem]">{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-[0.96rem]">{item.description}</p>
                    <p className="mt-3 text-sm font-medium text-foreground/80">{item.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
