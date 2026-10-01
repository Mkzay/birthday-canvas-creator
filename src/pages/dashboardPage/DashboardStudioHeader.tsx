import { Link } from 'react-router-dom';
import { Palette, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from './DashboardStatTiles';

type DashboardStudioHeaderProps = {
  displayName: string;
  stats: DashboardStats;
};

export function DashboardStudioHeader({ displayName, stats }: DashboardStudioHeaderProps) {
  const activeLabel = stats.activePages === 1 ? '1 Canvas' : `${stats.activePages} Canvases`;
  const keepsakesCount = Math.max(0, stats.totalPages - stats.activePages);

  return (
    <header className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-7 shadow-card">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-rose-500/10 blur-2xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Creator Greeting & Context */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Welcome back, <span className="italic text-rose-500">{displayName}</span>
            </h1>
            <span className="font-handwriting text-xl text-amber-800">creator studio</span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            {stats.activePages > 0 ? (
              <>
                You have <strong className="font-semibold text-slate-800">{stats.activePages} active celebration{stats.activePages === 1 ? '' : 's'}</strong> collecting wishes.
              </>
            ) : (
              'All current celebration canvases are archived. Ready to craft your next birthday memory?'
            )}
          </p>
        </div>

        {/* Integrated Studio Ledger */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-7 border-y lg:border-y-0 lg:border-x border-stone-100 py-3 lg:py-0 lg:px-8">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Live Collecting</span>
            <p className="mt-0.5 font-serif text-xl sm:text-2xl font-bold text-emerald-800 flex items-center gap-1.5">
              {stats.activePages > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
              {activeLabel}
            </p>
          </div>

          <div className="hidden sm:block w-px h-8 bg-stone-200/80" />

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Wishes Collected</span>
            <p className="mt-0.5 font-serif text-xl sm:text-2xl font-bold text-slate-950">
              {stats.totalMessages}
            </p>
          </div>

          <div className="hidden sm:block w-px h-8 bg-stone-200/80" />

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total Canvases</span>
            <p className="mt-0.5 font-serif text-xl sm:text-2xl font-bold text-slate-950">
              {stats.totalPages}
            </p>
          </div>
        </div>

        {/* Studio Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/themes">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-2xl border-stone-200/90 bg-stone-50/80 px-4 py-2 text-xs font-semibold text-stone-700 transition-all duration-200 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 active:scale-[0.98]"
            >
              <Palette className="h-3.5 w-3.5 text-amber-700" />
              Custom Themes
            </Button>
          </Link>

          <Link to="/create">
            <Button
              size="sm"
              className="btn-press gap-2 rounded-2xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white shadow-card transition-all duration-200 hover:bg-slate-900 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Create Canvas
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
