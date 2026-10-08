import { useState } from 'react';
import {
  BookOpen,
  Crown,
  Download,
  Film,
  Image as ImageIcon,
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
import { exportLongKeepsakeImage } from '@/lib/imageKeepsakeExport';

export interface ExportKeepsakePage {
  id?: string;
  public_code: string;
  recipient_name: string;
  birthday_date?: string;
  cover_photo_url?: string | null;
  creator_message?: string | null;
  theme?: string;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
  theme_gradient_mid?: string | null;
  theme_accent_color?: string | null;
  theme_font?: string | null;
  owner_plan_tier?: string;
}

interface ExportKeepsakeModalProps {
  page: ExportKeepsakePage | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isProUser: boolean;
  onDownloadVideo?: () => Promise<void> | void;
  downloadingVideo?: boolean;
  videoProgress?: number;
}

type ExportPdfFormat = 'pdf' | 'slides';

export function ExportKeepsakeModal({
  page,
  isOpen,
  onOpenChange,
  isProUser,
  onDownloadVideo,
  downloadingVideo = false,
  videoProgress = 0,
}: ExportKeepsakeModalProps) {
  const [downloadingPdf, setDownloadingPdf] = useState<ExportPdfFormat | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);

  if (!page) return null;

  const recipientSlug = (page.recipient_name || 'birthday-page')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'birthday-page';

  const handleDownloadPdf = async (format: ExportPdfFormat) => {
    setDownloadingPdf(format);

    try {
      const response = await fetch(
        `${getApiOrigin()}/api/public/pages/${page.public_code}/export?format=${format}`,
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

      const fileSuffixes: Record<ExportPdfFormat, string> = {
        pdf: 'editorial-book',
        slides: 'presentation-deck',
      };

      anchor.href = url;
      anchor.download = `${recipientSlug}-${fileSuffixes[format]}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      const formatLabels: Record<ExportPdfFormat, string> = {
        pdf: 'Editorial Keepsake Book',
        slides: 'Widescreen Presentation Deck',
      };

      toast.success(`${formatLabels[format]} downloaded`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to export keepsake document');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadLongImage = async () => {
    setDownloadingImage(true);
    setImageProgress(10);
    toast.info('Stitching complete canvas into one high-resolution image...');

    try {
      // Fetch public page messages to stitch all cards
      const res = await fetch(`${getApiOrigin()}/api/public/pages/${page.public_code}`);
      if (!res.ok) {
        throw new Error('Could not fetch celebration wishes');
      }
      const data = await res.json();
      const messages = data.messages || [];

      const blob = await exportLongKeepsakeImage(page, messages, (percent) => {
        setImageProgress(percent);
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${recipientSlug}-wishcanvas-story.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success('Keepsake image downloaded! Ready to share or save.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to stitch keepsake image');
    } finally {
      setDownloadingImage(false);
      setImageProgress(0);
    }
  };

  const handleLaunchVideoExport = async () => {
    onOpenChange(false);
    if (onDownloadVideo) {
      void onDownloadVideo();
      return;
    }
    toast.info('Starting background video render...');
    // If opened from a view without an active canvas player, redirect directly without popup
    window.location.assign(`/birthday/${page.public_code}?export=video`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] max-w-lg md:max-w-xl max-h-[92dvh] overflow-y-auto overflow-x-hidden rounded-3xl p-4.5 sm:p-6 md:p-7 border-stone-200 bg-[#FAF8F5] shadow-2xl">
        <DialogHeader className="text-left space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
              Download your WishCanvas
            </span>
          </div>

          <DialogTitle className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-slate-950">
            Keep {page.recipient_name}&apos;s Memories
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Save a permanent copy to your device in your preferred format. No account required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-2">
          {/* OPTION 1: One Long Image (Zero ZIPs) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 shadow-xs hover:border-amber-300 transition-colors w-full box-border">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    One Long Image (PNG)
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 shrink-0">
                    Popular • 1 File
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Stitches all slides into a single continuous high-res image. No ZIP file needed, instantly saves to camera rolls.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={downloadingImage}
              onClick={handleDownloadLongImage}
              className="w-full md:w-auto shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 px-4 min-h-[40px]"
            >
              {downloadingImage ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Stitching ({imageProgress}%)
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Save Image
                </>
              )}
            </Button>
          </div>

          {/* OPTION 2: Video Reel (Animated MP4/WebM) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 shadow-xs hover:border-emerald-300 transition-colors w-full box-border">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Film className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    Animated Story Video
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 shrink-0">
                    Motion &amp; Audio
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Turn your canvas into a shareable reel with motion transitions, recorded voice clips, and background soundtrack.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleLaunchVideoExport}
              className="w-full md:w-auto shrink-0 rounded-xl border-stone-300 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 h-10 px-4 min-h-[40px]"
            >
              <Film className="h-3.5 w-3.5 mr-1.5" />
              Generate Video
            </Button>
          </div>

          {/* OPTION 3: Print / Save as PDF */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs hover:border-indigo-200 transition-colors w-full box-border">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    Print / Save as PDF
                  </h4>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-800 shrink-0">
                    Print &amp; Reading
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Permanently bound documents inheriting your selected fonts and vibrant canvas theme colors.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingPdf !== null}
                onClick={() => void handleDownloadPdf('slides')}
                className="w-full rounded-xl border-stone-300 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-300 h-10 min-h-[40px]"
              >
                {downloadingPdf === 'slides' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Presentation className="h-3.5 w-3.5 mr-1.5" />
                    Widescreen Deck (16:9)
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={downloadingPdf !== null}
                onClick={() => void handleDownloadPdf('pdf')}
                className="w-full rounded-xl border-stone-300 text-xs font-bold hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 h-10 min-h-[40px]"
              >
                {downloadingPdf === 'pdf' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Editorial Book (A4)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
