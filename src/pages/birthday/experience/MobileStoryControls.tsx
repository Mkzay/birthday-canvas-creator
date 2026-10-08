import { memo } from 'react';
import {
  Download,
  Music,
  Music4,
  Share2,
  Video,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileStoryControlsProps {
  onOpenShareCard: () => void;
  onPlay: () => void;
  onPause: () => void;
  canShowKeepsakeDownload: boolean;
  onDownloadPdf: () => void;
  downloadingPdf: boolean;
  includeSoundtrackInVideo: boolean;
  onToggleVideoSoundtrack: () => void;
  onDownloadVideo: () => void;
  downloadingVideo: boolean;
  isDarkExperience?: boolean;
}

export const MobileStoryControls = memo(function MobileStoryControls({
  onOpenShareCard,
  onPlay,
  onPause,
  canShowKeepsakeDownload,
  onDownloadPdf,
  downloadingPdf,
  includeSoundtrackInVideo,
  onToggleVideoSoundtrack,
  onDownloadVideo,
  downloadingVideo,
  isDarkExperience = false,
}: MobileStoryControlsProps) {
  const btnBaseClass = cn(
    'inline-flex shrink-0 min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
    isDarkExperience ? 'hover:bg-white/12' : 'hover:bg-white'
  );

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-50 mx-auto flex w-full max-w-2xl items-center justify-center px-2',
        'pointer-events-none'
      )}
      aria-hidden="true"
    >
      <div
        className="pointer-events-auto w-fit max-w-[calc(100vw-0.75rem)] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        data-no-nav="true"
      >
        <div
          className={cn(
            'inline-flex w-max items-center gap-2 rounded-2xl border px-2 py-1.5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl',
            isDarkExperience ? 'border-white/18 bg-white/10 text-white' : 'border-white/70 bg-white/80 text-foreground'
          )}
        >
          <button
            type="button"
            onClick={onOpenShareCard}
            className={btnBaseClass}
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>

          <button
            type="button"
            onClick={onPlay}
            className={btnBaseClass}
          >
            <Music4 className="h-4 w-4" />
            Play
          </button>

          <button
            type="button"
            onClick={onPause}
            className={btnBaseClass}
          >
            <Volume2 className="h-4 w-4" />
            Pause
          </button>

          {canShowKeepsakeDownload && (
            <>
              <button
                type="button"
                onClick={onDownloadPdf}
                disabled={downloadingPdf}
                className={cn(btnBaseClass, 'disabled:cursor-not-allowed disabled:opacity-60')}
              >
                <Download className="h-4 w-4" />
                {downloadingPdf ? 'Preparing' : 'PDF'}
              </button>

              <button
                type="button"
                onClick={onToggleVideoSoundtrack}
                className={btnBaseClass}
              >
                <Music className="h-4 w-4" />
                {includeSoundtrackInVideo ? 'Sound on' : 'Sound off'}
              </button>

              <button
                type="button"
                onClick={onDownloadVideo}
                disabled={downloadingVideo}
                className={cn(btnBaseClass, 'disabled:cursor-not-allowed disabled:opacity-60')}
              >
                <Video className="h-4 w-4" />
                {downloadingVideo ? 'Rendering' : 'Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
