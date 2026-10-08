import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Download,
  Edit,
  Eye,
  Gift,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  MoreVertical,
  Plus,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { differenceInDays, format, isSameDay } from 'date-fns';
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
import type { BirthdayPage, ThemeDisplay } from './types';

type DashboardKanbanPipelineProps = {
  pages: BirthdayPage[];
  selectedDate: Date | null;
  getThemeDisplay: (themeKey: string) => ThemeDisplay;
  onSelectPage: (page: BirthdayPage) => void;
  onCopyContribute: (page: BirthdayPage) => void;
  onShareWhatsApp: (page: BirthdayPage) => void;
  onRequestDelete: (page: BirthdayPage) => void;
  onExport: (page: BirthdayPage) => void;
  canShowExportOptions: boolean;
};

function CelebrationCardCover({
  page,
  theme,
}: {
  page: BirthdayPage;
  theme: ThemeDisplay;
}) {
  const photoUrl = page.cover_photo_url ? resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url : null;

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 border border-stone-200/80 mb-2.5 group/cover">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${page.recipient_name}'s celebration`}
          className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : theme.isCustom ? (
        <div
          className="h-full w-full flex items-center justify-center text-3xl transition-transform duration-300 group-hover:scale-105"
          style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
        >
          <span>{theme.emoji || '🎂'}</span>
        </div>
      ) : (
        <div className={`h-full w-full bg-gradient-to-br ${theme.primary} flex items-center justify-center text-3xl transition-transform duration-300 group-hover:scale-105`}>
          <span>{theme.emoji || '🎂'}</span>
        </div>
      )}

      {page.user_role === 'co_organizer' && (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md">
          Co-organizer
        </span>
      )}

      {/* Subtle bottom vignette so photo cleanly anchors into the card */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
    </div>
  );
}

export function DashboardKanbanPipeline({
  pages,
  selectedDate,
  getThemeDisplay,
  onSelectPage,
  onCopyContribute,
  onShareWhatsApp,
  onRequestDelete,
  onExport,
  canShowExportOptions,
}: DashboardKanbanPipelineProps) {
  const now = new Date();
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Categorize pages into the 4 life stages
  const draftingPages: BirthdayPage[] = [];
  const collectingPages: BirthdayPage[] = [];
  const revealReadyPages: BirthdayPage[] = [];
  const deliveredPages: BirthdayPage[] = [];

  for (const page of pages) {
    if (page.status === 'draft') {
      draftingPages.push(page);
      continue;
    }

    if (page.status === 'delivered') {
      deliveredPages.push(page);
      continue;
    }

    const bday = parseLocalDate(page.birthday_date);
    const close = page.close_date ? parseLocalDate(page.close_date) : bday;
    const daysUntilClose = differenceInDays(close, now);
    const daysSinceBirthday = differenceInDays(now, bday);

    if (daysSinceBirthday > 3) {
      // More than 3 days after birthday: archived delivered keepsake
      deliveredPages.push(page);
    } else if (daysUntilClose <= 0) {
      // Reveal date has arrived or collection closed, within 3 days: active reveal ready window
      revealReadyPages.push(page);
    } else {
      // Actively collecting
      collectingPages.push(page);
    }
  }

  // Filter helper if a specific calendar date is selected
  const filterByDate = (list: BirthdayPage[]) => {
    if (!selectedDate) return list;
    return list.filter((page) => isSameDay(parseLocalDate(page.birthday_date), selectedDate));
  };

  const filteredDrafting = filterByDate(draftingPages);
  const filteredCollecting = filterByDate(collectingPages);
  const filteredRevealReady = filterByDate(revealReadyPages);
  const filteredDelivered = filterByDate(deliveredPages);

  return (
    <div className="space-y-4">
      {/* Kanban Header & Density Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
            Celebration Lifecycle Pipeline
          </span>
          {selectedDate && (
            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              Filtered: {format(selectedDate, 'MMMM d, yyyy')}
            </span>
          )}
        </div>

        {/* View Density Switcher (Comfortable vs Compact) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-400 font-medium hidden md:inline">View density:</span>
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                density === 'comfortable'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-stone-500 hover:text-slate-900'
              }`}
              title="Comfortable view with large celebration portraits"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Comfortable</span>
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                density === 'compact'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-stone-500 hover:text-slate-900'
              }`}
              title="Compact view for managing many celebrations easily"
            >
              <List className="h-3.5 w-3.5" />
              <span>Compact</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Stage Kanban Pipeline with Contained Internal Column Scrolling */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        
        {/* COLUMN 1: DRAFTING & PLANNED */}
        <div className="rounded-3xl border border-stone-200/90 bg-stone-100/90 p-4 shadow-xs flex flex-col max-h-[740px]">
          <div className="sticky top-0 z-10 bg-stone-100/95 backdrop-blur-xs pb-3 pt-0.5 flex items-center justify-between border-b border-stone-200/70 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-stone-700">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              <span>1. Drafting &amp; Planned</span>
            </div>
            <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-bold text-stone-600">
              {filteredDrafting.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {filteredDrafting.map((page) => {
              const theme = getThemeDisplay(page.theme);
              const bday = parseLocalDate(page.birthday_date);

              if (density === 'compact') {
                return (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page)}
                    className="group cursor-pointer rounded-xl border border-stone-200 bg-white p-2.5 shadow-xs transition-all hover:border-amber-300 hover:shadow-sm flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center text-base shrink-0 border border-stone-200">
                        {theme.emoji || '🎂'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-serif text-xs font-bold text-slate-950 truncate group-hover:text-amber-800">
                            {page.recipient_name}&apos;s Birthday
                          </h4>
                          {page.user_role === 'co_organizer' && (
                            <span className="shrink-0 rounded bg-amber-100 text-amber-950 border border-amber-300 px-1 py-0.5 text-[9px] font-bold">
                              Co-org
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500">
                          {format(bday, 'MMM d')} &middot; Draft
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/edit/${page.public_code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-bold text-amber-800 hover:underline shrink-0"
                    >
                      Resume
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page)}
                  className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 space-y-2.5"
                >
                  <CelebrationCardCover page={page} theme={theme} />

                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                      Draft
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {format(bday, 'MMM d')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-base font-bold text-slate-950 group-hover:text-amber-800 transition-colors">
                      {page.recipient_name}&apos;s Birthday
                    </h4>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {theme.emoji} {theme.name} Theme
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
                    <span className="text-stone-400">Not published</span>
                    <Link
                      to={`/edit/${page.public_code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-slate-900 hover:text-amber-800"
                    >
                      Resume Setup &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}

            {filteredDrafting.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-200 p-5 text-center text-xs text-stone-500">
                No planned drafts
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: LIVE COLLECTING (ACTIVE) */}
        <div className="rounded-3xl border border-amber-200/90 bg-amber-50/70 p-4 shadow-xs flex flex-col max-h-[740px]">
          <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-xs pb-3 pt-0.5 flex items-center justify-between border-b border-amber-200/70 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>2. Live Collecting</span>
            </div>
            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900">
              {filteredCollecting.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {filteredCollecting.map((page) => {
              const theme = getThemeDisplay(page.theme);
              const bday = parseLocalDate(page.birthday_date);
              const close = page.close_date ? parseLocalDate(page.close_date) : bday;
              const daysLeft = differenceInDays(close, now);

              if (density === 'compact') {
                return (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page)}
                    className="group cursor-pointer rounded-xl border border-amber-200 bg-white p-2.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-sm flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-base shrink-0 border border-amber-200">
                        {theme.emoji || '🎂'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-serif text-xs font-bold text-slate-950 truncate group-hover:text-amber-800">
                            {page.recipient_name}
                          </h4>
                          {page.user_role === 'co_organizer' && (
                            <span className="shrink-0 rounded bg-amber-100 text-amber-950 border border-amber-300 px-1 py-0.5 text-[9px] font-bold">
                              Co-org
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                          <span className="font-bold text-emerald-700">
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Today'}
                          </span>
                          <span>&middot;</span>
                          <span>{page.message_count || 0} wishes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareWhatsApp(page);
                        }}
                        className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition-colors"
                        title="Share on WhatsApp"
                      >
                        WA
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyContribute(page);
                        }}
                        className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-100"
                        title="Copy link"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page)}
                  className="group cursor-pointer rounded-2xl border-2 border-amber-300/90 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-amber-400 space-y-2.5"
                >
                  <CelebrationCardCover page={page} theme={theme} />

                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Closes today'}
                    </span>
                    <span className="text-xs font-bold text-rose-500">
                      {format(bday, 'MMM d')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-base font-bold text-slate-950 group-hover:text-amber-800 transition-colors">
                      {page.recipient_name}&apos;s Celebration
                    </h4>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {theme.emoji} {theme.name}
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-stone-600">
                        {page.message_count || 0} {(page.message_count || 0) === 1 ? 'wish' : 'wishes'} collected
                      </span>
                      <span className="font-bold text-amber-800">Collecting</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(15, (page.message_count || 0) * 10))}%` }}
                      />
                    </div>
                  </div>

                  {/* 1-Click Action Hub */}
                  <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareWhatsApp(page);
                        }}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                        title="Share on WhatsApp"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyContribute(page);
                        }}
                        className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100"
                        title="Copy invite link"
                      >
                        Copy
                      </button>
                    </div>

                    <span className="font-bold text-amber-800 group-hover:underline">
                      Inspect &rarr;
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCollecting.length === 0 && (
              <div className="rounded-2xl border border-dashed border-amber-200 p-5 text-center text-xs text-stone-500">
                No active wish collections
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: REVEAL READY / SEALED */}
        <div className="rounded-3xl border border-rose-200/90 bg-rose-50/70 p-4 shadow-xs flex flex-col max-h-[740px]">
          <div className="sticky top-0 z-10 bg-rose-50/95 backdrop-blur-xs pb-3 pt-0.5 flex items-center justify-between border-b border-rose-200/70 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-950">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>3. Reveal Ready</span>
            </div>
            <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[11px] font-bold text-rose-900">
              {filteredRevealReady.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {filteredRevealReady.map((page) => {
              const theme = getThemeDisplay(page.theme);
              const bday = parseLocalDate(page.birthday_date);

              if (density === 'compact') {
                return (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page)}
                    className="group cursor-pointer rounded-xl border border-rose-200 bg-white p-2.5 shadow-xs transition-all hover:border-rose-400 hover:shadow-sm flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-base shrink-0 border border-rose-200">
                        {theme.emoji || '🎉'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-serif text-xs font-bold text-slate-950 truncate group-hover:text-rose-600">
                            {page.recipient_name}&apos;s Surprise
                          </h4>
                          {page.user_role === 'co_organizer' && (
                            <span className="shrink-0 rounded bg-amber-100 text-amber-950 border border-amber-300 px-1 py-0.5 text-[9px] font-bold">
                              Co-org
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500">
                          Ready &middot; {page.message_count || 0} wishes
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/birthday/${page.public_code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-800 shrink-0"
                    >
                      Reveal
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page)}
                  className="group cursor-pointer rounded-2xl border-2 border-rose-300 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg space-y-2.5"
                >
                  <CelebrationCardCover page={page} theme={theme} />

                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                      Birthday Arrived!
                    </span>
                    <span className="text-xs font-bold text-rose-600">
                      {format(bday, 'MMM d')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-base font-bold text-slate-950 group-hover:text-rose-600 transition-colors">
                      {page.recipient_name}&apos;s Surprise
                    </h4>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {page.message_count || 0} memories safely collected
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
                    <Link
                      to={`/birthday/${page.public_code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg bg-slate-950 px-3 py-1 font-bold text-white hover:bg-slate-800 shadow-xs"
                    >
                      Trigger Reveal
                    </Link>

                    <span className="font-bold text-slate-900 group-hover:underline">
                      Open &rarr;
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredRevealReady.length === 0 && (
              <div className="rounded-2xl border border-dashed border-rose-200 p-5 text-center text-xs text-stone-500">
                No celebrations awaiting reveal
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 4: DELIVERED KEEPSAKES */}
        <div className="rounded-3xl border border-stone-200/90 bg-stone-100/90 p-4 shadow-xs flex flex-col max-h-[740px]">
          <div className="sticky top-0 z-10 bg-stone-100/95 backdrop-blur-xs pb-3 pt-0.5 flex items-center justify-between border-b border-stone-200/70 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-stone-700">
              <Gift className="h-3.5 w-3.5 text-stone-500" />
              <span>4. Delivered Keepsakes</span>
            </div>
            <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-bold text-stone-600">
              {filteredDelivered.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {filteredDelivered.map((page) => {
              const theme = getThemeDisplay(page.theme);
              const bday = parseLocalDate(page.birthday_date);

              if (density === 'compact') {
                return (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page)}
                    className="group cursor-pointer rounded-xl border border-stone-200 bg-white p-2.5 shadow-xs transition-all hover:border-amber-300 hover:shadow-sm flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center text-base shrink-0 border border-stone-200">
                        {theme.emoji || '🎁'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-serif text-xs font-bold text-slate-950 truncate group-hover:text-amber-800">
                            {page.recipient_name}&apos;s Keepsake
                          </h4>
                          {page.user_role === 'co_organizer' && (
                            <span className="shrink-0 rounded bg-amber-100 text-amber-950 border border-amber-300 px-1 py-0.5 text-[9px] font-bold">
                              Co-org
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500">
                          {format(bday, 'MMM d, yyyy')} &middot; {page.message_count || 0} wishes
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/birthday/${page.public_code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-bold text-slate-900 hover:underline shrink-0"
                    >
                      Revisit
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page)}
                  className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md space-y-2.5"
                >
                  <CelebrationCardCover page={page} theme={theme} />

                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>{format(bday, 'MMM d, yyyy')}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                      Keepsake
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-base font-bold text-slate-950 group-hover:text-amber-800 transition-colors">
                      {page.recipient_name}&apos;s Birthday
                    </h4>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {page.message_count || 0} memories preserved
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
                    {canShowExportOptions && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExport(page);
                        }}
                        className="flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </button>
                    )}

                    <Link
                      to={`/birthday/${page.public_code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-slate-900 group-hover:underline ml-auto"
                    >
                      Revisit &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}

            {filteredDelivered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-200 p-5 text-center text-xs text-stone-500">
                No archived keepsakes yet
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
