import { memo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/api';
import type { MessagePhoto } from '@/pages/birthday/types';

export interface DesktopWishPhotoGridProps {
  photos: MessagePhoto[];
  senderName: string;
  messageId: string;
  isPreview?: boolean;
  onOpenPhoto: (photo: MessagePhoto) => void;
  onDeletePhoto?: (photoId: string, messageId: string, senderName: string) => void;
}

export const DesktopWishPhotoGrid = memo(function DesktopWishPhotoGrid({
  photos,
  senderName,
  messageId,
  isPreview = false,
  onOpenPhoto,
  onDeletePhoto,
}: DesktopWishPhotoGridProps) {
  const photoCount = photos.length;
  if (photoCount === 0) return null;

  const photoFrameClass =
    'group relative min-h-0 overflow-hidden rounded-[1.4rem] border border-white/45 bg-white/55 p-1.5 sm:p-2 text-left shadow-[0_18px_50px_rgba(18,18,23,0.16)] transition-all duration-300 hover:shadow-xl hover:scale-[1.01]';

  const renderPhotoCard = (photo: MessagePhoto, className?: string, containerAspect?: string) => (
    <button
      key={photo.id}
      type="button"
      className={cn(photoFrameClass, className, containerAspect)}
      onClick={() => onOpenPhoto(photo)}
      aria-label={`Expand photo from ${senderName}`}
    >
      <div className="relative isolate h-full min-h-[14rem] sm:min-h-[18rem] lg:min-h-[22rem] overflow-hidden rounded-[1.1rem] sm:rounded-[1.25rem] bg-[#dfe7dc]">
        <img
          className="story-photo-layer absolute inset-0 z-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          src={resolveAssetUrl(photo.photo_url) || photo.photo_url}
          alt={`Photo from ${senderName}`}
          decoding="async"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-x-0 bottom-0 z-10 h-[46%] bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-2.5 sm:p-3.5">
          <div className="min-w-0">
            <p className="line-clamp-1 text-xs font-medium text-white">{photo.caption || 'Photo memory'}</p>
            {!photo.caption && <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">From the story</p>}
          </div>
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">Open</span>
        </div>
        {isPreview && onDeletePhoto && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2.5 top-2.5 z-30 h-7 w-7 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePhoto(photo.id, messageId, senderName);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </button>
  );

  let layout: ReactNode = null;
  if (photoCount === 1) {
    layout = (
      <div className="h-full w-full">
        {renderPhotoCard(photos[0], 'h-full w-full rounded-[1.85rem]')}
      </div>
    );
  } else if (photoCount === 2) {
    layout = (
      <div className="h-full grid grid-rows-2 gap-3 sm:gap-3.5">
        {photos.map((photo, photoIndex) =>
          renderPhotoCard(photo, 'h-full min-h-0 w-full rounded-[1.6rem]', photoIndex === 0 ? 'rotate-[-0.5deg]' : 'rotate-[0.5deg]')
        )}
      </div>
    );
  } else if (photoCount === 3) {
    layout = (
      <div className="h-full grid grid-rows-2 gap-3 sm:gap-3.5">
        {renderPhotoCard(photos[0], 'h-full min-h-0 w-full rounded-[1.6rem]')}
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 min-h-0">
          {photos.slice(1).map((photo, photoIndex) =>
            renderPhotoCard(photo, 'h-full min-h-0 w-full rounded-[1.4rem]', photoIndex === 0 ? 'rotate-[-0.8deg]' : 'rotate-[0.8deg]')
          )}
        </div>
      </div>
    );
  } else if (photoCount === 4) {
    layout = (
      <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 sm:gap-3.5">
        {photos.map((photo, photoIndex) =>
          renderPhotoCard(
            photo,
            'h-full min-h-0 w-full rounded-[1.4rem]',
            photoIndex === 0 ? 'rotate-[-0.6deg]' : photoIndex === 1 ? 'rotate-[0.6deg]' : photoIndex === 2 ? 'rotate-[0.4deg]' : 'rotate-[-0.4deg]'
          )
        )}
      </div>
    );
  } else if (photoCount === 5) {
    layout = (
      <div className="h-full grid grid-rows-2 gap-3 sm:gap-3.5">
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 min-h-0">
          {photos.slice(0, 2).map((photo, photoIndex) =>
            renderPhotoCard(photo, 'h-full min-h-0 w-full rounded-[1.4rem]', photoIndex === 0 ? 'rotate-[-0.5deg]' : 'rotate-[0.5deg]')
          )}
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 min-h-0">
          {photos.slice(2).map((photo, photoIndex) =>
            renderPhotoCard(photo, 'h-full min-h-0 w-full rounded-[1.25rem]', photoIndex === 1 ? 'scale-[1.02] z-10' : undefined)
          )}
        </div>
      </div>
    );
  } else {
    layout = (
      <div className="h-full grid grid-cols-3 grid-rows-2 gap-2.5 sm:gap-3">
        {photos.slice(0, 6).map((photo, photoIndex) =>
          renderPhotoCard(
            photo,
            'h-full min-h-0 w-full rounded-[1.25rem]',
            photoIndex % 2 === 0 ? 'rotate-[-0.4deg]' : 'rotate-[0.4deg]'
          )
        )}
      </div>
    );
  }

  return (
    <div className="story-stage-reveal relative flex-1 min-h-0 w-full">
      {layout}
    </div>
  );
});
