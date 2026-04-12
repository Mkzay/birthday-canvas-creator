import { Link } from 'react-router-dom';
import { Palette, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DashboardHeroProps = {
  displayName: string;
};

export function DashboardHero({ displayName }: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,246,241,0.98))] p-6 shadow-card-lg sm:p-8">
      <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-secondary/14 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Birthday studio
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">Welcome back, {displayName}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Welcome to your WishCanvas dashboard. Create new birthday pages, collect heartfelt wishes from friends and family, and reveal them all in a beautiful birthday story.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/create">
            <Button variant="hero" size="lg" className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Create birthday page
            </Button>
          </Link>
          <Link to="/themes">
            <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
              <Palette className="h-4 w-4" />
              Open theme builder
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
