import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  Download,
  Edit,
  Eye,
  MessageSquare,
  MoreVertical,
  Share2,
  Trash2,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import type { BirthdayPage, PageAnalytics, ThemeDisplay } from './types';

export type OwnedPageCardVariant = 'live' | 'archived';

export type OwnedPageCardProps = {
  page: BirthdayPage;
  theme: ThemeDisplay;
  variant: OwnedPageCardVariant;
  status: { label: string; className: string };
  canShowExportOptions: boolean;
  analytics: PageAnalytics | undefined;
  analyticsLoading: boolean;
  exporting: boolean;
  onCopyContribute: () => void;
  onCopyBirthday: () => void;
  onRequestDelete: () => void;
  onAnalytics: () => void;
  onExport: () => void;
};

export function OwnedPageCard({
  page,
  theme,
  variant,
  status,
  canShowExportOptions,
  analytics,
  analyticsLoading,
  exporting,
  onCopyContribute,
  onCopyBirthday,
  onRequestDelete,
  onAnalytics,
  onExport,
}: OwnedPageCardProps) {
  const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');
  const closeDate = page.close_date ? parseLocalDate(page.close_date) : parseLocalDate(page.birthday_date);
  const closesLabel = format(closeDate, 'MMM d, yyyy');
  const daysLeft = differenceInDays(closeDate, new Date());

  const closesRowLabel = variant === 'live' ? 'Closes' : 'Collection closed';

  return (
    <article
      className="group relative overflow-hidden rounded-[2.25rem] border border-stone-200/90 bg-white p-5 sm:p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      style={{
        boxShadow: '0 4px 20px -2px rgba(28, 25, 23, 0.05), 0 2px 6px -1px rgba(28, 25, 23, 0.03)',
      }}
    >
      {/* Subtle top ambient sheen */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-500/5 blur-2xl transition-all duration-500 group-hover:bg-amber-500/10" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-stretch">
        {/* Archival Polaroid Cover Frame */}
        <div className="relative h-56 min-h-[14rem] w-full overflow-hidden rounded-[1.75rem] border border-stone-200/70 bg-stone-100/60 p-2 sm:h-auto sm:w-56 sm:min-w-56">
          <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
            {page.cover_photo_url ? (
              <img
                src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                alt={`${page.recipient_name}'s celebration cover`}
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
            ) : theme.isCustom ? (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
              />
            ) : (
              <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

            {/* Quick Status Tag on Cover */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                <span>{theme.emoji}</span>
                <span className="truncate max-w-[90px]">{theme.name}</span>
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md ${
                  variant === 'live'
                    ? 'bg-emerald-500/90 text-white shadow-sm'
                    : 'bg-white/80 text-stone-800 shadow-sm'
                }`}
              >
                {variant === 'live' ? 'Live' : 'Keepsake'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Content & Metadata */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            {/* Header: Title and Dropdown */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/80">
                  Birthday Canvas
                </span>
                <h3 className="mt-0.5 truncate font-serif text-xl sm:text-2xl font-medium tracking-tight text-slate-950">
                  {page.recipient_name}&apos;s Birthday
                </h3>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50/80 text-stone-600 transition-all duration-200 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 active:scale-95"
                    aria-label={`Open actions for ${page.recipient_name}`}
                    type="button"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-stone-200/90 p-1.5 shadow-xl">
                  <DropdownMenuItem
                    onClick={onCopyContribute}
                    className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-stone-100"
                  >
                    <Share2 className="mr-2 h-4 w-4 text-amber-700" />
                    Copy contribution link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onCopyBirthday}
                    className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-stone-100"
                  >
                    <Share2 className="mr-2 h-4 w-4 text-rose-600" />
                    Copy birthday link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 border-stone-100" />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    onClick={onRequestDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete canvas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tactile Metric Slips */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3.5 py-2.5 transition-colors group-hover:bg-stone-50">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                  <CalendarDays className="h-3.5 w-3.5 text-amber-700" />
                  <span>Birthday</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{birthdayLabel}</p>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3.5 py-2.5 transition-colors group-hover:bg-stone-50">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                  <MessageSquare className="h-3.5 w-3.5 text-rose-600" />
                  <span>Wishes</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {page.message_count || 0} {page.message_count === 1 ? 'wish' : 'wishes'}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3.5 py-2.5 transition-colors group-hover:bg-stone-50">
                <span className="text-[11px] font-semibold text-stone-500">{closesRowLabel}</span>
                <p className="mt-1 text-sm font-semibold text-slate-900">{closesLabel}</p>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3.5 py-2.5 transition-colors group-hover:bg-stone-50">
                <span className="text-[11px] font-semibold text-stone-500">Countdown</span>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {daysLeft > 0 ? (
                    <span className="text-amber-800">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>
                  ) : (
                    <span className="text-stone-500">Ready</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Primary Action Row */}
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-2">
              {variant === 'live' ? (
                <>
                  <Link to={`/preview/${page.public_code}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 rounded-xl border-stone-200 bg-white font-medium text-stone-800 shadow-sm transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98]"
                    >
                      <Eye className="h-4 w-4 text-stone-600" />
                      Preview
                    </Button>
                  </Link>
                  <Link to={`/edit/${page.public_code}`} className="flex-1">
                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full gap-2 rounded-xl bg-slate-950 font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-900 active:scale-[0.98]"
                    >
                      <Edit className="h-4 w-4 text-amber-300" />
                      Edit
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to={`/birthday/${page.public_code}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-xl border-stone-200 bg-white font-medium text-stone-800 shadow-sm transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98]"
                  >
                    <Eye className="h-4 w-4 text-stone-600" />
                    Open Keepsake
                  </Button>
                </Link>
              )}
            </div>

            {/* Secondary Actions (Analytics & PDF) */}
            <div className={canShowExportOptions ? 'grid grid-cols-2 gap-2' : ''}>
              <Button
                variant="outline"
                size="sm"
                className={`gap-2 rounded-xl border-stone-200/80 bg-stone-50/60 text-xs font-medium text-stone-700 transition-all duration-200 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 active:scale-[0.98] ${
                  variant === 'live' ? 'w-full' : ''
                }`}
                onClick={() => void onAnalytics()}
                disabled={analyticsLoading}
              >
                <Activity className="h-3.5 w-3.5 text-stone-500" />
                {analyticsLoading ? 'Loading...' : 'Analytics'}
              </Button>

              {canShowExportOptions && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl border-stone-200/80 bg-stone-50/60 text-xs font-medium text-stone-700 transition-all duration-200 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 active:scale-[0.98]"
                  onClick={() => void onExport()}
                  disabled={exporting}
                >
                  <Download className="h-3.5 w-3.5 text-stone-500" />
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </Button>
              )}
            </div>

            {/* Expandable Live Analytics Pill */}
            {analytics && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-3 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900/70">Views</p>
                  <p className="mt-0.5 font-serif text-lg font-medium text-amber-950">{analytics.view_count}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900/70">Contributors</p>
                  <p className="mt-0.5 font-serif text-lg font-medium text-amber-950">{analytics.contributor_count}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
