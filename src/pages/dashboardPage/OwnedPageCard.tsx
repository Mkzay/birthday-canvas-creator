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
  const birthdayDate = parseLocalDate(page.birthday_date);
  const birthdayLabel = format(birthdayDate, 'MMM d, yyyy');
  const closeDate = page.close_date ? parseLocalDate(page.close_date) : birthdayDate;
  const daysLeft = differenceInDays(closeDate, new Date());

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] lg:rounded-[2.25rem] border border-stone-300 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Subtle top ambient glow with rich warmth */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-400/10 blur-xl transition-all duration-500 group-hover:bg-amber-400/20" />

      <div>
        {/* Archival Polaroid Cover Frame */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden rounded-[1.4rem] sm:rounded-[1.6rem] border border-stone-300 bg-stone-100 p-1.5 sm:p-2">
          <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] sm:rounded-[1.2rem]">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Quick Status Tag on Cover */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                <span>{theme.emoji}</span>
                <span className="truncate max-w-[100px]">{theme.name}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {page.user_role === 'co_organizer' && (
                  <span className="inline-flex items-center rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-sm">
                    Co-organizer
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md ${
                    variant === 'live'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-stone-900 shadow-sm'
                  }`}
                >
                  {variant === 'live' ? 'Live' : 'Keepsake'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Header & Recipient Info */}
        <div className="mt-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-950">
              {birthdayLabel}
            </span>
            <h3 className="mt-0.5 truncate font-serif text-xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-amber-800">
              {page.recipient_name}&apos;s Birthday
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition-all hover:bg-stone-100 hover:text-stone-950 active:scale-95 shadow-xs"
                aria-label={`Open actions for ${page.recipient_name}`}
                type="button"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-stone-300 p-1.5 shadow-xl bg-white">
              <DropdownMenuItem
                onClick={onCopyContribute}
                className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-100"
              >
                <Share2 className="mr-2 h-4 w-4 text-amber-700" />
                Copy contribution link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onCopyBirthday}
                className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-100"
              >
                <Share2 className="mr-2 h-4 w-4 text-rose-600" />
                Copy birthday link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void onAnalytics()}
                className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-100"
              >
                <Activity className="mr-2 h-4 w-4 text-indigo-600" />
                {analyticsLoading ? 'Loading Analytics...' : 'View Analytics'}
              </DropdownMenuItem>
              {canShowExportOptions && (
                <DropdownMenuItem
                  onClick={() => void onExport()}
                  disabled={exporting}
                  className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-100"
                >
                  <Download className="mr-2 h-4 w-4 text-emerald-600" />
                  {exporting ? 'Exporting...' : 'Export Keepsake'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1 border-stone-200" />
              <DropdownMenuItem
                className="cursor-pointer rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                onClick={onRequestDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {page.user_role === 'co_organizer' ? 'Leave celebration' : 'Delete canvas'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tactile Mini Metric Pills */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-100/90 px-3 py-2 text-xs text-stone-800">
          <span className="flex items-center gap-1.5 font-bold text-stone-800">
            <MessageSquare className="h-3.5 w-3.5 text-rose-600" />
            {page.message_count || 0} {(page.message_count || 0) === 1 ? 'wish' : 'wishes'}
          </span>
          <span className="font-bold text-amber-950">
            {variant === 'live' ? (daysLeft > 0 ? `${daysLeft}d left` : 'Closes today') : 'Delivered'}
          </span>
        </div>

        {/* Analytics Dropdown Pill if Loaded */}
        {analytics && (
          <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs space-y-1">
            <div className="grid grid-cols-4 gap-1">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-950">Views</span>
                <p className="font-serif font-bold text-slate-900">{analytics.view_count}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-950">Wishes</span>
                <p className="font-serif font-bold text-slate-900">{analytics.contributor_count}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-950">Photos</span>
                <p className="font-serif font-bold text-slate-900">{analytics.photo_message_count}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-950">Audio</span>
                <p className="font-serif font-bold text-slate-900">{analytics.audio_message_count}</p>
              </div>
            </div>
            {analytics.last_contribution_at && (
              <p className="text-[10px] text-stone-600 font-medium border-t border-amber-200 pt-1">
                Last wish: {format(new Date(analytics.last_contribution_at), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons Tray */}
      <div className="mt-5 flex items-center gap-2 pt-3 border-t border-stone-200">
        {variant === 'live' ? (
          <>
            <Link to={`/preview/${page.public_code}`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 rounded-xl border-stone-300 bg-white text-xs font-bold text-stone-800 shadow-xs transition-all hover:bg-stone-50 active:scale-[0.98]"
              >
                <Eye className="h-3.5 w-3.5 text-stone-600" />
                Preview
              </Button>
            </Link>
            <Link to={`/edit/${page.public_code}`} className="flex-1">
              <Button
                size="sm"
                className="btn-press w-full gap-1.5 rounded-xl bg-slate-950 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-900 active:scale-[0.98]"
              >
                <Edit className="h-3.5 w-3.5 text-amber-300" />
                Edit
              </Button>
            </Link>
          </>
        ) : (
          <Link to={`/birthday/${page.public_code}`} className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 rounded-xl border-stone-300 bg-white text-xs font-bold text-stone-800 shadow-xs transition-all hover:bg-stone-50 active:scale-[0.98]"
            >
              <Eye className="h-3.5 w-3.5 text-stone-600" />
              Open Keepsake
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}
