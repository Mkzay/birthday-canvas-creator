import { Link } from 'react-router-dom';
import { Palette, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DashboardHeroProps = {
  displayName: string;
};

export function DashboardHero({ displayName }: DashboardHeroProps) {
  return (
    <div className="card-lift relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-7 shadow-card-lg sm:p-10 text-slate-900">
      {/* Soft Ambient Glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
            Creator Studio
          </span>
          <span className="font-caveat text-base text-slate-500 font-bold select-none hidden sm:inline-block">
            Celebrating the ones who matter most ◡̈
          </span>
        </div>

        <h1 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.12]">
          Welcome back, <br className="sm:hidden" />
          <span className="italic font-normal text-rose-500">{displayName}</span>
        </h1>

        <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Track incoming wishes, listen to contributor voice notes, and coordinate midnight reveals for your loved ones.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/create" className="w-full sm:w-auto">
            <button
              type="button"
              className="btn-press w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Canvas</span>
            </button>
          </Link>
          <Link to="/themes" className="w-full sm:w-auto">
            <button
              type="button"
              className="btn-press w-full sm:w-auto flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-[#FAF7F2] px-6 py-4 text-sm font-bold text-slate-800 shadow-xs hover:bg-white active:scale-[0.98] transition-all"
            >
              <Palette className="h-4 w-4 text-amber-800" />
              <span>Explore Mood Themes</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
