import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const CTASection = () => {
  const { user } = useAuth();
  const scrollToSetupFlow = () => {
    const section = document.getElementById('setup-flow');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="absolute inset-0 gradient-cta" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.14),transparent_26%)]" />
      <div className="absolute left-[8%] top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute right-[12%] bottom-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 text-primary-foreground shadow-[0_24px_90px_rgba(102,37,143,0.24)] backdrop-blur-sm sm:p-8 md:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/85">
            <Sparkles className="h-3.5 w-3.5" />
            Ready when you are
          </span>
          <h2 className="mt-5 max-w-xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Start the surprise before the logistics kill the mood
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base md:text-lg">
            Create the page, send the link, and let the birthday messages collect themselves while you focus on the
            actual celebration.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to={user ? '/create' : '/auth'}>
              <Button variant="light" size="lg" className="group w-full text-base sm:w-auto">
                {user ? 'Create another page' : 'Get started free'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="glass" size="lg" className="w-full border-white/20 text-base text-primary-foreground hover:bg-white/12 sm:w-auto">
                  Open dashboard
                </Button>
              </Link>
            ) : (
              <Button
                variant="glass"
                size="lg"
                className="w-full border-white/20 text-base text-primary-foreground hover:bg-white/12 sm:w-auto"
                onClick={scrollToSetupFlow}
              >
                See the setup flow
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[1.9rem] border border-white/15 bg-slate-950/22 p-6 text-primary-foreground shadow-[0_20px_70px_rgba(69,24,113,0.22)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">What you avoid</p>
            <div className="mt-4 space-y-3">
              {[
                'No digging through chat threads for scattered wishes',
                'No forcing guests to sign up before they can contribute',
                'No last-minute scramble to make the reveal feel presentable',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-foreground" />
                  <p className="text-sm text-primary-foreground/82">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.9rem] border border-white/15 bg-white/12 p-6 text-primary-foreground shadow-[0_20px_70px_rgba(69,24,113,0.18)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">Typical setup</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { value: '2 min', label: 'to create the page' },
                { value: '1 link', label: 'to invite everyone' },
                { value: '0 clutter', label: 'inside the reveal' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                  <p className="text-2xl font-bold text-primary-foreground">{item.value}</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">{item.label}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
