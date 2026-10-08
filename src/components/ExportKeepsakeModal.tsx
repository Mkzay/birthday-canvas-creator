import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Crown,
  Download,
  Film,
  Loader2,
  Presentation,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, getApiOrigin } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { BirthdayPage } from '@/pages/dashboardPage/types';

interface ExportKeepsakeModalProps {
  page: BirthdayPage | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isProUser: boolean;
}

type ExportFormat = 'pdf' | 'slides';

export function ExportKeepsakeModal({
  page,
  isOpen,
  onOpenChange,
  isProUser,
}: ExportKeepsakeModalProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<ExportFormat | null>(null);

  if (!page) return null;

  const recipientSlug = (page.recipient_name || 'birthday-page')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'birthday-page';

  const handleDownload = async (format: ExportFormat) => {
    if (!isProUser) {
      toast.info('Keepsake export is available on Pro.');
      return;
    }

    setDownloadingFormat(format);

    try {
      const response = await fetch(
        `${getApiOrigin()}/api/pages/${page.public_code}/export?format=${format}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new ApiError(payload.error || 'Export failed', response.status, payload.code);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      const fileSuffixes: Record<ExportFormat, string> = {
        pdf: 'editorial-keepsake-book',
        slides: 'story-presentation-deck',
      };

      anchor.href = url;
      anchor.download = `${recipientSlug}-${fileSuffixes[format]}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      const formatLabels: Record<ExportFormat, string> = {
        pdf: 'Editorial Keepsake Book',
        slides: 'Widescreen Story Presentation',
      };

      toast.success(`${formatLabels[format]} downloaded`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to export keepsake');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleLaunchVideoExport = () => {
    if (!isProUser) {
      toast.info('Video download is a Pro feature.');
      return;
    }

    toast.info('Launching celebration story video recorder...');
    const videoUrl = `/birthday/${page.public_code}?export=video`;
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] max-w-lg md:max-w-xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-3xl p-4 sm:p-6 md:p-7 border-stone-200 bg-[#FAF8F5] shadow-2xl">
        <DialogHeader className="text-left space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
              Visual Keepsake Studio
            </span>
          </div>

          <DialogTitle className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-slate-950">
            Export {page.recipient_name}&apos;s Memories
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Download permanent heirloom formats to print, present, or share across devices.
          </DialogDescription>
        </DialogHeader>

        {!isProUser && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <Crown className="h-4 w-4 text-amber-700" />
              <span>Pro Keepsake Studio</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Export high-resolution widescreen presentation decks, printable editorial books, and animated story video reels.
            </p>
            <Link to="/upgrade?feature=keepsake-export" className="block">
              <Button size="sm" className="w-full rounded-xl bg-slate-950 text-white font-semibold text-xs hover:bg-slate-900">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                Unlock with Pro &rarr;
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-3 pt-1">
          {/* 1. Widescreen Story Presentation Deck */}
          <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-xs hover:border-indigo-200 transition-colors w-full box-border">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Presentation className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    Widescreen Story Deck (16:9 PDF)
                  </h4>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-800 shrink-0">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Presentation slides mirroring the live screen with side-by-side letter and photo cards
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={downloadingFormat !== null || !isProUser}
              onClick={() => void handleDownload('slides')}
              className="w-full md:w-auto shrink-0 rounded-xl border-stone-300 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-300 h-9 px-4"
            >
              {downloadingFormat === 'slides' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download Deck
                </>
              )}
            </Button>
          </div>

          {/* 2. Editorial Keepsake Book (A4 Portrait) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-xs hover:border-amber-200 transition-colors w-full box-border">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    Editorial Keepsake Book (A4 PDF)
                  </h4>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 shrink-0">
                    Print Ready
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Bound portrait album with generous letter spreads and photo layouts for printing or tablets
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={downloadingFormat !== null || !isProUser}
              onClick={() => void handleDownload('pdf')}
              className="w-full md:w-auto shrink-0 rounded-xl border-stone-300 text-xs font-bold hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 h-9 px-4"
            >
              {downloadingFormat === 'pdf' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download Book
                </>
              )}
            </Button>
          </div>

          {/* 3. Animated Story Video (MP4 Reel) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-xs hover:border-emerald-200 transition-colors w-full box-border">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Film className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    Animated Story Video (MP4 Reel)
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 shrink-0">
                    Motion &amp; Audio
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Full motion slideshow with animated transitions, original voice notes, and soundtrack
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={!isProUser}
              onClick={handleLaunchVideoExport}
              className="w-full md:w-auto shrink-0 rounded-xl border-stone-300 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 h-9 px-4"
            >
              <Film className="h-3.5 w-3.5 mr-1.5" />
              Generate Video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
