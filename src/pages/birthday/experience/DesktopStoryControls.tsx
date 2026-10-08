import { memo } from 'react';
import {
  Download,
  Heart,
  Music,
  Music4,
  Share2,
  Video,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DesktopStoryControlsProps {
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
  hasUser: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
  isDarkExperience?: boolean;
  onOpenExportModal?: () => void;
}

export const DesktopStoryControls = memo(function DesktopStoryControls({
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
  hasUser,
  isSaved,
  onToggleSave,
  isDarkExperience = false,
  onOpenExportModal,
}: DesktopStoryControlsProps) {
  const btnBaseClass = cn(
    'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
    isDarkExperience ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/78 text-foreground hover:bg-white'
  );

  return (
    <div className="hidden items-center gap-2 sm:flex shrink-0" data-no-nav="true">
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
            onClick={onOpenExportModal || onDownloadPdf}
            disabled={downloadingPdf}
            className={cn(btnBaseClass, 'disabled:cursor-not-allowed disabled:opacity-60')}
          >
            <Download className="h-4 w-4" />
            {downloadingPdf ? 'Preparing' : 'Download'}
          </button>

          <button
            type="button"
            onClick={onToggleVideoSoundtrack}
            className={btnBaseClass}
          >
            <Music className="h-4 w-4" />
            {includeSoundtrackInVideo ? 'Video sound on' : 'Video sound off'}
          </button>

          <button
            type="button"
            onClick={onDownloadVideo}
            disabled={downloadingVideo}
            className={cn(btnBaseClass, 'disabled:cursor-not-allowed disabled:opacity-60')}
          >
            <Video className="h-4 w-4" />
            {downloadingVideo ? 'Rendering video' : 'Download video'}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onToggleSave}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-4 py-0.5 text-sm font-medium transition-colors',
          hasUser && isSaved
            ? isDarkExperience
              ? 'bg-emerald-500/90 text-white hover:bg-emerald-500'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
            : btnBaseClass
        )}
      >
        <Heart className={cn('h-4 w-4', hasUser && isSaved ? 'fill-current' : '')} />
        {hasUser ? (isSaved ? 'Saved' : 'Save to dashboard') : 'Save to my dashboard'}
      </button>
    </div>
  );
});
