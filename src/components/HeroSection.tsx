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
          <div className="glass-card mx-auto max-w-sm rounded-2xl p-4 shadow-soft-lg animate-float sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex items-center gap-3 sm:mb-4 sm:gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 text-xl sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">
                🎂
              </div>
              <div className="min-w-0 text-left">
                <h3 className="truncate text-base font-bold text-foreground sm:text-lg">Sarah&apos;s Birthday</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">23 wishes collected</p>
              </div>
            </div>
            <div className="mb-3 flex gap-2 sm:mb-4">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 ring-2 ring-white sm:h-10 sm:w-10" />
              <div className="-ml-3 h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 ring-2 ring-white sm:h-10 sm:w-10" />
              <div className="-ml-3 h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white sm:h-10 sm:w-10" />
              <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-white sm:h-10 sm:w-10 sm:text-xs">
                +20
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted sm:h-2">
              <div className="h-full w-4/5 rounded-full gradient-cta" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
