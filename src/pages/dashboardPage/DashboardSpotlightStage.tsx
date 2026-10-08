import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  Check,
  Copy,
  Download,
  Edit,
  Eye,
  MessageSquare,
  MoreVertical,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
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

type DashboardSpotlightStageProps = {
  page: BirthdayPage;
  theme: ThemeDisplay;
  isLive: boolean;
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

export function DashboardSpotlightStage({
  page,
  theme,
  isLive,
  canShowExportOptions,
  analytics,
  analyticsLoading,
  exporting,
  onCopyContribute,
  onCopyBirthday,
  onRequestDelete,
  onAnalytics,
  onExport,
}: DashboardSpotlightStageProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const birthdayDate = parseLocalDate(page.birthday_date);
  const birthdayLabel = format(birthdayDate, 'MMMM d, yyyy');
  const closeDate = page.close_date ? parseLocalDate(page.close_date) : birthdayDate;
  const closesLabel = format(closeDate, 'MMMM d, yyyy');
  const daysLeft = differenceInDays(closeDate, new Date());

  const contributeUrl = `${window.location.origin}/contribute/${page.public_code}`;

  const handleQuickCopy = () => {
    onCopyContribute();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section className="space-y-3">
      {/* Editorial Stage Tagline */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-800">
            {isLive ? 'Upcoming Celebration Spotlight' : 'Featured Keepsake Canvas'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isLive
                ? 'border border-emerald-200/80 bg-emerald-50 text-emerald-800'
                : 'border border-stone-200/80 bg-stone-100 text-stone-700'
            }`}
          >
            {isLive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Collecting Wishes
              </>
            ) : (
              'Delivered Keepsake'
            )}
          </span>
        </div>

        <span className="text-xs font-medium text-stone-600">
          {isLive
            ? daysLeft > 0
              ? `Closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
              : 'Closes today'
            : `Celebrated on ${birthdayLabel}`}
        </span>
      </div>

      {/* Main Spotlight Exhibition Stage */}
      <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem] lg:rounded-[2.5rem] border-2 border-amber-300/80 bg-gradient-to-br from-amber-500/8 via-rose-500/5 to-white p-4 sm:p-7 lg:p-10 shadow-card">
        {/* Subtle Ambient Flares */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-rose-400/10 blur-3xl" />

        <div className="relative grid gap-6 sm:gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr] md:items-center">
          {/* Left: Polaroid Framed Artwork */}
          <div className="mx-auto w-full max-w-sm md:max-w-none">
            <div className="group/frame rounded-[1.6rem] sm:rounded-[2rem] border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-card transition-transform duration-500 hover:rotate-0 sm:-rotate-1">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.2rem] sm:rounded-[1.4rem] bg-stone-100">
                {page.cover_photo_url ? (
                  <img
                    src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                    alt={`${page.recipient_name}'s celebration cover`}
                    className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover/frame:scale-105"
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

                {/* Over-image metadata */}
                <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                      <span>{theme.emoji}</span>
                      <span className="truncate max-w-[100px] sm:max-w-[120px]">{theme.name}</span>
                    </span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                      {isLive ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <div className="text-white">
                    <p className="font-serif text-lg sm:text-2xl font-bold tracking-tight drop-shadow-sm">
                      {page.recipient_name}&apos;s Birthday
                    </p>
                    <p className="text-[11px] sm:text-xs text-white/80 drop-shadow-sm">{birthdayLabel}</p>
                  </div>
                </div>
              </div>

              {/* Polaroid Bottom Caption Slips */}
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between px-1 text-xs text-stone-500">
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <MessageSquare className="h-3.5 w-3.5 text-rose-600" />
                  {page.message_count || 0} {(page.message_count || 0) === 1 ? 'wish' : 'wishes'} collected
                </span>
                <span className="font-semibold text-amber-800">
                  {isLive ? (daysLeft > 0 ? `${daysLeft} days left` : 'Closes today') : 'Delivered'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Stage Command & Quick Share Panel */}
          <div className="flex flex-col justify-between space-y-5 sm:space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
                    Primary Celebration
                  </span>
                  <h2 className="mt-1 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-950">
                    {page.recipient_name}&apos;s Celebration Canvas
                  </h2>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition-all hover:bg-stone-50 active:scale-95"
                      aria-label="More options"
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

              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600 max-w-2xl">
                {isLive ? (
                  <>
                    Friends and family are leaving audio messages, memories, and photos. Share the invite link before collection wraps up on <strong className="font-semibold text-slate-900">{closesLabel}</strong>.
                  </>
                ) : (
                  <>
                    This celebration has been revealed and safely preserved in your archive. You can revisit the keepsake or export it anytime.
                  </>
                )}
              </p>
            </div>

            {/* Instant 1-Click Contribution Link Bar */}
            {isLive && (
              <div className="space-y-1.5">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Contribution Invite Link
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-stone-200/90 bg-white p-1.5 sm:p-2 shadow-sm">
                  <span className="flex-1 truncate pl-2 sm:pl-3 font-mono text-[11px] sm:text-xs text-stone-500 select-all">
                    {contributeUrl}
                  </span>
                  <Button
                    size="sm"
                    className="btn-press shrink-0 min-w-[85px] sm:min-w-[95px] gap-1.5 rounded-xl bg-amber-500/15 text-amber-900 border border-amber-300/80 px-3 sm:px-4 py-2 text-xs font-bold transition-all hover:bg-amber-500/25 active:scale-[0.98]"
                    onClick={handleQuickCopy}
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Stage Primary Actions */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 pt-1">
              {isLive ? (
                <>
                  <Link to={`/edit/${page.public_code}`} className="col-span-2 sm:col-auto sm:w-auto">
                    <Button
                      size="sm"
                      className="btn-press w-full gap-2 rounded-xl bg-slate-950 px-4 sm:px-5 py-2.5 text-xs font-semibold text-white shadow-card transition-all hover:bg-slate-900 active:scale-[0.98]"
                    >
                      <Edit className="h-3.5 w-3.5 text-amber-300" />
                      Edit Canvas & Music
                    </Button>
                  </Link>
                  <Link to={`/preview/${page.public_code}`} className="col-span-1 sm:col-auto sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 rounded-xl border-stone-200/90 bg-white px-3 sm:px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
                    >
                      <Eye className="h-3.5 w-3.5 text-stone-600" />
                      Preview
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to={`/birthday/${page.public_code}`} className="col-span-2 sm:col-auto sm:w-auto">
                  <Button
                    size="sm"
                    className="btn-press w-full gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-card transition-all hover:bg-slate-900 active:scale-[0.98]"
                  >
                    <Eye className="h-3.5 w-3.5 text-amber-300" />
                    Open Keepsake
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                size="sm"
                className={`${isLive ? 'col-span-1' : 'col-span-2'} sm:col-auto sm:w-auto gap-2 rounded-xl border-stone-200/90 bg-white px-3 sm:px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]`}
                onClick={() => void onAnalytics()}
                disabled={analyticsLoading}
              >
                <Activity className="h-3.5 w-3.5 text-stone-600" />
                {analyticsLoading ? 'Loading...' : 'Analytics'}
              </Button>

              {canShowExportOptions && (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 sm:col-auto sm:w-auto gap-2 rounded-xl border-stone-200/90 bg-white px-3 sm:px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
                  onClick={() => void onExport()}
                  disabled={exporting}
                >
                  <Download className="h-3.5 w-3.5 text-stone-600" />
                  {exporting ? 'Exporting...' : 'Download Keepsake'}
                </Button>
              )}
            </div>

            {/* Expandable Live Analytics Pill if Available */}
            {analytics && (
              <div className="space-y-2 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900/80">
                    Participation Analytics
                  </span>
                  {analytics.last_contribution_at && (
                    <span className="text-[10px] text-stone-500">
                      Latest wish: {format(new Date(analytics.last_contribution_at), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="rounded-xl bg-white/70 p-2 border border-amber-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/70">
                      Visitors
                    </span>
                    <p className="mt-0.5 font-serif text-lg font-bold text-amber-950">{analytics.view_count}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-2 border border-amber-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/70">
                      Contributors
                    </span>
                    <p className="mt-0.5 font-serif text-lg font-bold text-amber-950">{analytics.contributor_count}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-2 border border-amber-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/70">
                      Photos
                    </span>
                    <p className="mt-0.5 font-serif text-lg font-bold text-amber-950">{analytics.photo_message_count}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-2 border border-amber-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/70">
                      Voice Notes
                    </span>
                    <p className="mt-0.5 font-serif text-lg font-bold text-amber-950">{analytics.audio_message_count}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
