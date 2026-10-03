import type { FC } from 'react';
import { Check, Loader2, Pencil, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ContributorWishPreview } from './ContributorWishPreview';
import type { PendingPhoto } from './types';
import type { StickerData } from '@/components/StickerPicker';

export interface ContributeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  recipientName: string;
  senderName: string;
  message: string;
  selectedPhotos: PendingPhoto[];
  wishAudioPreviewUrl: string | null;
  stickers: StickerData[];
  poolAmountNaira?: string;
  poolFundraisingEnabled?: boolean;
  pageTheme?: string;
  customGradient?: {
    from: string;
    to: string;
    mid?: string | null;
    angle?: number;
  };
  themeGradientFrom?: string | null;
  themeGradientTo?: string | null;
  themeGradientMid?: string | null;
  themeGradientAngle?: number | null;
  themeEmoji?: string | null;
  themeFont?: string | null;
  displayMode?: string | null;
  letterTheme?: string | null;
  coverPhotoUrl?: string | null;
}

export const ContributeConfirmModal: FC<ContributeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  isEditMode,
  recipientName,
  senderName,
  message,
  selectedPhotos,
  wishAudioPreviewUrl,
  stickers,
  poolAmountNaira,
  poolFundraisingEnabled,
  pageTheme,
  customGradient,
  themeGradientFrom,
  themeGradientTo,
  themeGradientMid,
  themeGradientAngle,
  themeEmoji,
  themeFont,
  displayMode,
  letterTheme,
  coverPhotoUrl,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 px-5 pt-5 pb-4 text-left sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold text-foreground sm:text-xl">
              {isEditMode ? 'Review your updated wish' : `Review your wish for ${recipientName}`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
            Here is how your card will appear on the canvas. You can edit any details or confirm to post.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] sm:max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6 custom-scrollbar">
          <div className="mx-auto max-w-xl">
            <ContributorWishPreview
              recipientName={recipientName}
              senderName={senderName}
              message={message}
              selectedPhotos={selectedPhotos}
              wishAudioPreviewUrl={wishAudioPreviewUrl}
              stickers={stickers}
              poolAmountNaira={poolAmountNaira}
              poolFundraisingEnabled={poolFundraisingEnabled}
              pageTheme={pageTheme}
              customGradient={customGradient}
              themeGradientFrom={themeGradientFrom}
              themeGradientTo={themeGradientTo}
              themeGradientMid={themeGradientMid}
              themeGradientAngle={themeGradientAngle}
              themeEmoji={themeEmoji}
              themeFont={themeFont}
              displayMode={displayMode}
              letterTheme={letterTheme}
              coverPhotoUrl={coverPhotoUrl}
              className="w-full shadow-sm"
            />
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {isEditMode
              ? 'Changes will update your wish on the celebration canvas immediately.'
              : 'You will also receive a private edit link to make updates anytime until the canvas is sealed.'}
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-5 py-3.5 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full gap-2 rounded-xl text-xs font-semibold sm:w-auto sm:text-sm"
          >
            <Pencil className="h-4 w-4" />
            Edit wish
          </Button>

          <Button
            type="button"
            variant="hero"
            size="default"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full gap-2 rounded-xl text-xs font-semibold sm:w-auto sm:text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditMode ? 'Saving changes...' : 'Posting your wish...'}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isEditMode ? 'Confirm and save' : 'Confirm and add wish'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
