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

  const mediaOverlayClass =
    variant === 'live' || page.cover_photo_url
      ? 'from-black/35 via-black/0 to-transparent'
      : 'from-black/25 via-black/0 to-transparent';

  const closesRowLabel = variant === 'live' ? 'Closes' : 'Collection closed';

  return (
    <article
      className="group overflow-hidden rounded-[2rem] border border-border/60 bg-card/94 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      style={{ borderColor: `${theme.accent}30` }}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
        <div className="relative h-[42dvh] min-h-[14rem] max-h-[24rem] w-full overflow-hidden rounded-[1.5rem] sm:h-auto sm:w-56 sm:min-w-56">
          {page.cover_photo_url ? (
            <img
              src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
              alt={`${page.recipient_name}'s cover`}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
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
          <div className={`absolute inset-0 bg-gradient-to-t ${mediaOverlayClass}`} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-foreground">{page.recipient_name}&apos;s Birthday</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {theme.emoji} {theme.name}
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground transition-colors hover:bg-background"
                  aria-label={`Open actions for ${page.recipient_name}`}
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCopyContribute}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy contribution link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopyBirthday}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy birthday link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onRequestDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>Birthday</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{birthdayLabel}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Wishes</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{page.message_count || 0} collected</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">{closesRowLabel}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{closesLabel}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">Countdown</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Closed'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {variant === 'live' ? (
              <>
                <Link to={`/preview/${page.public_code}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </Link>
                <Link to={`/edit/${page.public_code}`} className="flex-1">
                  <Button variant="hero" size="sm" className="w-full gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </>
            ) : (
              <Link to={`/birthday/${page.public_code}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              </Link>
            )}
          </div>

          <div className={canShowExportOptions ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3'}>
            <Button
              variant="outline"
              size="sm"
              className={variant === 'live' ? 'w-full gap-2' : 'gap-2'}
              onClick={() => void onAnalytics()}
              disabled={analyticsLoading}
            >
              <Activity className="h-4 w-4" />
              {analyticsLoading ? 'Loading...' : 'Analytics'}
            </Button>
            {canShowExportOptions && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void onExport()} disabled={exporting}>
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            )}
          </div>

          {analytics && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/70 p-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Views</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{analytics.view_count}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contributors</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{analytics.contributor_count}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
