import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Crown,
  Download,
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-stone-200 bg-[#FAF8F5]">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
              Visual Keepsake Export
            </span>
          </div>

          <DialogTitle className="font-serif text-2xl font-bold text-slate-950">
            Export {page.recipient_name}&apos;s Keepsake
          </DialogTitle>

          <DialogDescription className="text-xs text-stone-600 leading-relaxed">
            Download a permanent heirloom copy of this celebration canvas to print, preserve, or present.
          </DialogDescription>
        </DialogHeader>

        {!isProUser && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <Crown className="h-4 w-4 text-amber-700" />
              <span>Pro Keepsake Feature</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              Export high-resolution printable PDF books and widescreen presentation story decks.
            </p>
            <Link to="/upgrade?feature=keepsake-export" className="block">
              <Button size="sm" className="w-full rounded-xl bg-slate-950 text-white font-semibold text-xs hover:bg-slate-900">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                Unlock with Pro &rarr;
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {/* 1. PDF Editorial Keepsake Book */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-serif text-sm font-bold text-slate-950 truncate">
                  Editorial Keepsake Book (A4 PDF)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Bound portrait album formatted with authentic letter cards and photo layouts
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={downloadingFormat !== null || !isProUser}
              onClick={() => void handleDownload('pdf')}
              className="shrink-0 rounded-xl border-stone-200 text-xs font-bold hover:bg-stone-50"
            >
              {downloadingFormat === 'pdf' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  PDF Book
                </>
              )}
            </Button>
          </div>

          {/* 2. Widescreen Story Presentation Deck */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Presentation className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-serif text-sm font-bold text-slate-950 truncate">
                  Widescreen Story Deck (16:9 PDF)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Presentation slides mirroring the live screen with side-by-side letter and photo cards
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={downloadingFormat !== null || !isProUser}
              onClick={() => void handleDownload('slides')}
              className="shrink-0 rounded-xl border-stone-200 text-xs font-bold hover:bg-stone-50"
            >
              {downloadingFormat === 'slides' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Slides Deck
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
