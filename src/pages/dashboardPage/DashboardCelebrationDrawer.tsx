import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  Check,
  Copy,
  Download,
  Edit,
  Expand,
  Eye,
  MessageSquare,
  Music4,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
} from '@/components/ui/sheet';
import { resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import type { BirthdayPage, PageAnalytics, ThemeDisplay } from './types';

type DashboardCelebrationDrawerProps = {
  page: BirthdayPage | null;
  theme: ThemeDisplay | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyContribute: (page: BirthdayPage) => void;
  onShareWhatsApp: (page: BirthdayPage) => void;
  onCopyBirthday: (page: BirthdayPage) => void;
  onRequestDelete: (page: BirthdayPage) => void;
  onAnalytics: (page: BirthdayPage) => void;
  onExport: (page: BirthdayPage) => void;
  canShowExportOptions: boolean;
  analytics: PageAnalytics | undefined;
  analyticsLoading: boolean;
  exporting: boolean;
};

export function DashboardCelebrationDrawer({
  page,
  theme,
  isOpen,
  onOpenChange,
  onCopyContribute,
  onShareWhatsApp,
  onCopyBirthday,
  onRequestDelete,
  onAnalytics,
  onExport,
  canShowExportOptions,
  analytics,
  analyticsLoading,
  exporting,
}: DashboardCelebrationDrawerProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  if (!page || !theme) {
    return null;
  }

  const birthdayDate = parseLocalDate(page.birthday_date);
  const birthdayLabel = format(birthdayDate, 'MMMM d, yyyy');
  const closeDate = page.close_date ? parseLocalDate(page.close_date) : birthdayDate;
  const closesLabel = format(closeDate, 'MMMM d, yyyy');
  const daysLeft = differenceInDays(closeDate, new Date());
  const isLive = page.status === 'active';

  const contributeUrl = `${window.location.origin}/contribute/${page.public_code}`;

  const handleCopyLink = () => {
    onCopyContribute(page);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 bg-white border-l border-stone-200/90 shadow-2xl flex flex-col justify-between overflow-hidden z-50"
      >
        {/* Drawer Header (Clean, minimal, uncluttered) */}
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
              Celebration Inspector
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {isLive ? 'Active' : 'Delivered'}
            </span>
          </div>

          <SheetClose className="h-8 w-8 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors">
            <X className="h-4 w-4" />
          </SheetClose>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Framed Celebration Portrait (Shows Face & Head Clearly without Awkward Cropping) */}
          <div className="space-y-2.5">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-stone-100 rounded-3xl overflow-hidden border border-stone-200/80 shadow-xs group/photo">
              {page.cover_photo_url ? (
                <img
                  src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                  alt={`${page.recipient_name}'s celebration portrait`}
                  className={`h-full w-full object-top transition-all duration-300 ${
                    fitMode === 'cover' ? 'object-cover' : 'object-contain bg-stone-900/5'
                  }`}
                />
              ) : theme.isCustom ? (
                <div
                  className="h-full w-full flex items-center justify-center text-4xl"
                  style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                >
                  🎂
                </div>
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${theme.primary} flex items-center justify-center text-4xl`}>
                  🎂
                </div>
              )}

              {/* View mode toggle button (Cover vs Contain) */}
              {page.cover_photo_url && (
                <button
                  type="button"
                  onClick={() => setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                  className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold backdrop-blur-md transition-colors flex items-center gap-1 shadow-sm"
                  title="Toggle photo fit"
                >
                  <Expand className="h-3 w-3" />
                  <span>{fitMode === 'cover' ? 'Fit Full' : 'Fill'}</span>
                </button>
              )}
            </div>

            {/* Recipient & Celebration Header Placed CLEANLY Below the Photo */}
            <div className="px-1 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950">
                  {page.recipient_name}&apos;s Canvas
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {birthdayLabel} · {theme.emoji} {theme.name}
                </p>
              </div>

              <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full text-xs shrink-0">
                {isLive ? (daysLeft > 0 ? `${daysLeft} days left` : 'Closes today') : 'Preserved'}
              </span>
            </div>
          </div>

          {/* Milestone Status Context */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/70 to-rose-50/50 border border-amber-200/70 p-3.5 space-y-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-amber-700" />
              <span>Milestone Schedule</span>
            </span>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              {isLive
                ? `Wishes, voice recordings, and memories are collecting before the reveal trigger on ${closesLabel}.`
                : 'This celebration has been safely archived in your keepsake library.'}
            </p>
          </div>

          {/* 1-Click WhatsApp Invite Hub */}
          {isLive && (
            <div className="rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-950">Guest Contribution Hub</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready to Share
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xs">
                <span className="flex-1 truncate pl-2 font-mono text-[11px] text-stone-500 select-all">
                  {contributeUrl}
                </span>
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="btn-press shrink-0 gap-1 rounded-lg bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold hover:bg-amber-400"
                >
                  {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>

              <button
                type="button"
                onClick={() => onShareWhatsApp(page)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <span>📱 Share Invite via WhatsApp</span>
              </button>
            </div>
          )}

          {/* Quick Metrics Ticker */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200/90 bg-white p-3.5 text-center shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Wishes Collected
              </span>
              <p className="mt-0.5 font-serif text-xl font-bold text-slate-950">
                {page.message_count || 0}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Soundtrack Mood
              </span>
              <p className="mt-0.5 font-serif text-sm font-bold text-amber-800 truncate">
                {theme.mood || 'Acoustic'}
              </p>
            </div>
          </div>

          {/* Live Analytics Pill if Available */}
          {analytics && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 space-y-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70">
                Real-Time Audience Analytics
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-500">Total Visitors</span>
                  <p className="font-serif font-bold text-slate-900 text-lg">{analytics.view_count}</p>
                </div>
                <div>
                  <span className="text-stone-500">Contributors</span>
                  <p className="font-serif font-bold text-slate-900 text-lg">{analytics.contributor_count}</p>
                </div>
              </div>
            </div>
          )}

          {/* Direct celebration link */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span>Celebration reveal link:</span>
            <button
              type="button"
              onClick={() => onCopyBirthday(page)}
              className="font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              <Share2 className="h-3 w-3" />
              <span>Copy Reveal Link</span>
            </button>
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {isLive ? (
              <>
                <Link to={`/edit/${page.public_code}`} className="w-full">
                  <Button
                    size="sm"
                    className="btn-press w-full gap-1.5 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-900"
                  >
                    <Edit className="h-3.5 w-3.5 text-amber-300" />
                    Edit Content
                  </Button>
                </Link>
                <Link to={`/preview/${page.public_code}`} className="w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 rounded-xl border-stone-200 bg-white text-stone-800 text-xs font-semibold hover:bg-stone-50"
                  >
                    <Eye className="h-3.5 w-3.5 text-stone-600" />
                    Live Preview
                  </Button>
                </Link>
              </>
            ) : (
              <Link to={`/birthday/${page.public_code}`} className="col-span-2 w-full">
                <Button
                  size="sm"
                  className="btn-press w-full gap-1.5 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-900"
                >
                  <Eye className="h-3.5 w-3.5 text-amber-300" />
                  Open Keepsake Slide Deck
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 rounded-xl border-stone-200 bg-white text-xs font-semibold text-stone-800 hover:bg-stone-50"
              onClick={() => onAnalytics(page)}
              disabled={analyticsLoading}
            >
              <Activity className="h-3.5 w-3.5 text-stone-600" />
              {analyticsLoading ? 'Loading...' : 'Analytics'}
            </Button>

            {canShowExportOptions && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 rounded-xl border-stone-200 bg-white text-xs font-semibold text-stone-800 hover:bg-stone-50"
                onClick={() => onExport(page)}
                disabled={exporting}
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl border-stone-200 bg-white text-rose-600 hover:bg-rose-50"
              onClick={() => onRequestDelete(page)}
              title="Delete Canvas"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
