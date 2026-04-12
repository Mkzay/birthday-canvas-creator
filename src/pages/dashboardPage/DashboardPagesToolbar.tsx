import { Link } from 'react-router-dom';
import { Crown, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your pages</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">Birthday pages in progress</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pr-9 sm:w-72"
            />
          </div>

          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              aria-label="Filter pages by status"
              value={pageFilter}
              onChange={(event) => onPageFilterChange(event.target.value as PageFilter)}
              className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-48"
            >
              <option value="all">All pages</option>
              <option value="live">Live only</option>
              <option value="archived">Archived only</option>
            </select>
          </div>
        </div>
      </div>

      {!isProUser && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(255,255,255,0.96),rgba(255,247,239,0.96),rgba(255,236,228,0.94))] px-4 py-3 shadow-card">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Unlock creator analytics and keepsake PDF export</p>
            <p className="text-xs text-muted-foreground">Track page views, contributor growth, and download branded birthday keepsakes.</p>
          </div>
          <Link to="/billing" className="shrink-0">
            <Button variant="hero" size="sm" className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
