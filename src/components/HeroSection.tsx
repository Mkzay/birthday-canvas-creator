import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="gradient-hero relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-8 pt-16 sm:px-6 sm:pb-16 sm:pt-20">
      <AnimatedBackground showWaves={true} showStars={true} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-10 top-20 h-32 w-32 rounded-full bg-white/5 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-white/5 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/3 blur-3xl" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-background/15 to-background/70 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="mb-4 animate-fade-in-up sm:mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary-foreground/90 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            Guests can contribute without signup
          </span>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="mb-4 text-3xl font-extrabold leading-[1.1] tracking-tight text-primary-foreground sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Create Birthday Magic <span className="gradient-accent block sm:inline">Together</span>
          </h1>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <p className="mx-auto mb-6 max-w-xl px-2 text-base leading-relaxed text-primary-foreground/80 sm:mb-8 sm:max-w-2xl sm:text-lg md:text-xl">
            Gather heartfelt messages, photos, and wishes from friends and family.
            Build a collaborative birthday page that still feels personal.
          </p>
        </div>

        <div className="animate-fade-in-up flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <Link to={user ? '/create' : '/auth'}>
            <Button variant="light" size="lg" className="group w-full text-base sm:w-auto">
              Create Your First Page
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <span className="hidden text-sm text-primary-foreground/60 sm:block">Takes less than 2 minutes</span>
        </div>

        <div className="mt-8 animate-scale-in sm:mt-12 md:mt-16" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="mx-auto max-w-sm animate-float rounded-[2rem] border border-white/20 bg-white/95 p-4 text-foreground shadow-soft-lg backdrop-blur-sm sm:max-w-md sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard card preview
            </p>
            <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-border/60 bg-card shadow-card">
              <div className="flex gap-3 p-3 sm:p-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-200 via-fuchsia-200 to-amber-200">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold text-foreground sm:text-base">Esther&apos;s Birthday</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">🎂 Twilight Gold</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Collecting wishes</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div className="rounded-lg border border-border/60 bg-background/80 px-2 py-1.5">
                      <p className="font-semibold text-foreground">Apr 1, 2026</p>
                      <p>Birthday</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 px-2 py-1.5">
                      <p className="font-semibold text-foreground">23 collected</p>
                      <p>Wishes</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/70 mx-3 mb-3 sm:mx-4 sm:mb-4">
                <div className="gradient-cta h-full w-4/5 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
