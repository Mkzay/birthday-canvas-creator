import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, Heart, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const CTASection = () => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 md:py-32">
      <div className="absolute inset-0 gradient-cta" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.18),transparent_30%)]" />
      <div className="absolute left-[8%] top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute right-[12%] bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl text-center text-primary-foreground">
        <div className="inline-block">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-200 animate-pulse" />
            Make Magic Happen
          </span>
        </div>

        <h2 className="mt-6 text-3xl font-black leading-tight sm:text-5xl md:text-6xl text-white">
          Ready to Make Someone&apos;s Birthday Unforgettable?
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl font-medium">
          Create the page in two minutes. Share the link with friends. Sit back and watch the heartfelt messages and voice notes roll in.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to={user ? '/create' : '/auth'} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="group w-full rounded-2xl bg-white px-8 py-6 text-base font-extrabold text-foreground shadow-2xl transition-all duration-300 hover:bg-stone-50 hover:scale-105 active:scale-95 sm:w-auto"
            >
              <span>{user ? 'Create a Birthday Page' : 'Start a Birthday Page Free'}</span>
              <ArrowRight className="h-5 w-5 ml-1.5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          {user ? (
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="glass"
                size="lg"
                className="w-full rounded-2xl border-white/30 px-7 py-6 text-base font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/15 sm:w-auto"
              >
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                variant="glass"
                size="lg"
                className="w-full rounded-2xl border-white/30 px-7 py-6 text-base font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/15 sm:w-auto"
              >
                Sign In to Existing Account
              </Button>
            </Link>
          )}
        </div>

        {/* Feature Checkpoints */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-white/85 sm:text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-200" />
            100% Free to get started
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-200" />
            No apps or signups for guests
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-200" />
            Sealed until birthday midnight
          </span>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
