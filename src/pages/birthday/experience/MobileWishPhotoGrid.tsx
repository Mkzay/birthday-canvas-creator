import { memo } from 'react';
import { resolveAssetUrl } from '@/lib/api';
import type { MessagePhoto } from '@/pages/birthday/types';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

export interface MobileWishPhotoGridProps {
  photos: MessagePhoto[];
  senderName: string;
  onOpenPhoto: (photo: MessagePhoto) => void;
  className?: string;
}

export const MobileWishPhotoGrid = memo(function MobileWishPhotoGrid({
  photos,
  senderName,
  onOpenPhoto,
  className,
}: MobileWishPhotoGridProps) {
  const photoCount = photos.length;
  if (photoCount === 0) return null;

  const renderSinglePhoto = (
    photo: MessagePhoto,
    aspectClass = 'aspect-[4/3]',
    extraOverlay?: React.ReactNode,
  ) => {
    const src = resolveAssetUrl(photo.photo_url) || photo.photo_url;
    return (
      <button
        key={photo.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPhoto(photo);
        }}
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border border-white/30 bg-black/10 shadow-sm active:scale-[0.98] transition-transform',
          aspectClass,
        )}
        aria-label={`View photo from ${senderName}`}
      >
        <img
          src={src}
          alt={photo.caption || `Photo from ${senderName}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        {photo.caption && (
          <p className="absolute bottom-2 left-2.5 right-2.5 text-[11px] font-medium text-white line-clamp-1 drop-shadow-sm text-left pointer-events-none">
            {photo.caption}
          </p>
        )}
        {extraOverlay}
      </button>
    );
  };

  if (photoCount === 1) {
    return (
      <div className={cn('w-full h-56 xs:h-64 sm:h-72', className)}>
        {renderSinglePhoto(photos[0], 'h-full w-full rounded-2xl')}
      </div>
    );
  }

  if (photoCount === 2) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 w-full h-44 sm:h-52', className)}>
        {photos.map((photo) => renderSinglePhoto(photo, 'h-full w-full rounded-2xl'))}
      </div>
    );
  }

  if (photoCount === 3) {
    return (
      <div className={cn('grid grid-cols-3 gap-2 w-full h-44 sm:h-52', className)}>
        <div className="col-span-2 h-full">
          {renderSinglePhoto(photos[0], 'h-full w-full rounded-2xl')}
        </div>
        <div className="col-span-1 flex flex-col gap-2 h-full">
          {photos.slice(1, 3).map((photo) =>
            renderSinglePhoto(photo, 'flex-1 h-1/2 w-full rounded-xl')
          )}
        </div>
      </div>
    );
  }

  if (photoCount === 4) {
    return (
      <div className={cn('grid grid-cols-2 grid-rows-2 gap-2 w-full h-44 sm:h-52', className)}>
        {photos.slice(0, 4).map((photo) =>
          renderSinglePhoto(photo, 'h-full w-full rounded-xl')
        )}
      </div>
    );
  }

  // 5 or more photos: 2x2 grid with +N badge on last item
  const extraCount = photoCount - 4;
  return (
    <div className={cn('grid grid-cols-2 grid-rows-2 gap-2 w-full h-44 sm:h-52', className)}>
      {photos.slice(0, 3).map((photo) =>
        renderSinglePhoto(photo, 'h-full w-full rounded-xl')
      )}
      {renderSinglePhoto(
        photos[3],
        'h-full w-full rounded-xl',
        extraCount > 0 ? (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
            <ImageIcon className="h-4 w-4 mb-1 text-amber-300" />
            <span className="text-xs font-bold">+{extraCount} more</span>
          </div>
        ) : undefined,
      )}
    </div>
  );
});
