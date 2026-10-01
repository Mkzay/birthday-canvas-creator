import { Link } from 'react-router-dom';
import { Crown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type PageFilter = 'all' | 'live' | 'archived';

type DashboardPagesToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  pageFilter: PageFilter;
  onPageFilterChange: (value: PageFilter) => void;
  isProUser: boolean;
};

export function DashboardPagesToolbar({
  searchQuery,
  onSearchQueryChange,
  pageFilter,
  onPageFilterChange,
  isProUser,
}: DashboardPagesToolbarProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-amber-800">
            Your Collection
          </span>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Birthday Canvases in Progress
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Tactile Pill Filter Tabs */}
          <div className="flex items-center rounded-2xl bg-stone-100 p-1 sm:p-1.5 border border-stone-200/80 overflow-x-auto scrollbar-none flex-nowrap w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => onPageFilterChange('all')}
              className={`btn-press whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all ${
                pageFilter === 'all'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              All Canvases
            </button>
            <button
              type="button"
              onClick={() => onPageFilterChange('live')}
              className={`btn-press whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                pageFilter === 'live'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live &amp; Collecting</span>
            </button>
            <button
              type="button"
              onClick={() => onPageFilterChange('archived')}
              className={`btn-press whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all ${
                pageFilter === 'archived'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Revealed &amp; Past
            </button>
          </div>

          {/* Search input with warm rounded-full styling */}
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search celebrations..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-10 sm:h-11 w-full rounded-full border border-stone-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-900 shadow-xs transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 sm:w-64"
            />
          </div>
        </div>
      </div>

      {!isProUser && (
        <div className="card-lift mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 rounded-[1.75rem] sm:rounded-[2rem] border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-white to-rose-50/60 p-4 sm:p-5 shadow-xs text-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs border border-amber-200/70">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">Unlock Creator Analytics &amp; Archival PDF Keepsakes</p>
              <p className="text-xs text-slate-600">Export high-res 300 DPI memory booklets and view contributor analytics.</p>
            </div>
          </div>
          <Link to="/billing" className="shrink-0 w-full sm:w-auto">
            <button
              type="button"
              className="btn-press flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>Upgrade to Pro</span>
            </button>
          </Link>
        </div>
      )}
    </>
  );
}
