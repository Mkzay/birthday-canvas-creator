import { useRef, useMemo, type FC, type FormEvent } from 'react';
import {
  ImagePlus,
  GripVertical,
  X,
  Mic,
  Mic2,
  Square,
  HandCoins,
  Send,
  Check,
  Loader2,
  Lock,
  AlertCircle,
  Trash2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { calculateTotalChargeKobo, formatKobo, formatNairaInputWithCommas } from './utils';
import { MAX_PHOTOS, MAX_WISH_MESSAGE_CHARACTERS } from './constants';
import type { PublicBirthdayPageData } from './types';
import type { UseWishSubmissionEngineReturn } from './useWishSubmissionEngine';

export interface ContributeFormProps {
  page: PublicBirthdayPageData;
  engine: UseWishSubmissionEngineReturn;
  onPreviewClick?: () => void;
}

const STICKER_EMOJIS: Record<string, string> = {
  balloon: '🎈',
  heart: '❤️',
  cake: '🎂',
  party: '🎉',
  star: '⭐',
  gift: '🎁',
  fireworks: '🎆',
  sparkles: '✨',
  crown: '👑',
  unicorn: '🦄',
  pizza: '🍕',
  icecream: '🍦',
};

export const ContributeForm: FC<ContributeFormProps> = ({ page, engine, onPreviewClick }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const poolAmountInputRef = useRef<HTMLInputElement>(null);

  const {
    senderName,
    setSenderName,
    message,
    setMessage,
    selectedPhotos,
    draggedPhotoId,
    setDraggedPhotoId,
    stickers,
    setStickers,
    poolAmountNaira,
    setPoolAmountNaira,
    poolContributorEmail,
    setPoolContributorEmail,
    currentPlaceholder,
    audioRecorder,
    isEditMode,
    isLocked,
    lockReason,
    recognizedWish,
    isDeletingWish,
    submitting,
    handlePhotoSelect,
    handlePhotoCaptionChange,
    removePhoto,
    reorderPhotos,
    validateAndOpenConfirmModal,
    handleWishDelete,
    handleLoadRecognizedWish,
  } = engine;

  const poolContributionAmountKobo = useMemo(() => {
    const raw = Number(poolAmountNaira.replace(/,/g, ''));
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) : 0;
  }, [poolAmountNaira]);

  const poolTotalChargeKobo = useMemo(() => {
    return poolContributionAmountKobo > 0 ? calculateTotalChargeKobo(poolContributionAmountKobo) : 0;
  }, [poolContributionAmountKobo]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    validateAndOpenConfirmModal();
  };

  const isFormDisabled = !page.can_contribute || (isEditMode && isLocked);

  return (
    <div className="space-y-5">
      {/* 1. Closed or Contributor Limit Reached Alert */}
      {!page.can_contribute && !isEditMode && (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 text-center shadow-soft">
          <div className="mb-2 flex items-center justify-center gap-2 text-amber-950">
            <Lock className="h-4 w-4 text-amber-700" />
            <span className="font-serif font-bold text-base">
              {page.contributor_limit_reached
                ? 'Free Contributor Limit Reached'
                : 'Wish collection is closed'}
            </span>
          </div>
          <p className="text-sm text-stone-700 max-w-md mx-auto leading-relaxed">
            {page.contributor_limit_reached
              ? `This celebration canvas has gathered all 6 free contributor wishes. The organizer can upgrade to Pro to unlock unlimited memories, photos, and voice notes.`
              : 'This page is no longer accepting new messages or photos.'}
          </p>
          {page.contributor_limit_reached && (
            <div className="mt-3">
              <a
                href="/upgrade"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-4"
              >
                Organizer of this celebration? Upgrade to Pro &rarr;
              </a>
            </div>
          )}
        </div>
      )}

      {isEditMode && isLocked && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-soft">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4" />
            <span>Wish is locked from editing</span>
          </div>
          <p className="mt-1 text-sm text-amber-800">
            {lockReason || 'This canvas has been revealed or sealed. Existing wishes can no longer be updated.'}
          </p>
        </div>
      )}

      {/* 2. Recognized Returning Contributor Notification */}
      {recognizedWish && !isEditMode && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold text-foreground">Welcome back, {recognizedWish.senderName}!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You already left a wish for {page.recipient_name}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadRecognizedWish}
            className="rounded-xl border-primary/30 text-xs font-semibold hover:bg-primary/10 shrink-0"
          >
            Edit your wish
          </Button>
        </div>
      )}

      {/* 3. Main Form Container */}
      <form onSubmit={handleSubmit} className="animate-fade-in-up space-y-5">
        <div className="rounded-[1.9rem] border border-border bg-card/96 p-4 shadow-soft sm:p-6">
          {/* SENDER NAME */}
          {page.require_names && (
            <div className="mb-6">
              <Label htmlFor="name" className="text-foreground">
                Your Name
              </Label>
              <Input
                id="name"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder="Enter your name"
                className="mt-2 h-12 rounded-xl"
                disabled={isFormDisabled}
              />
            </div>
          )}

          {/* MESSAGE WITH RICHTEXTEDITOR */}
          <div className="mb-6">
            <Label htmlFor="message" className="mb-2 block text-foreground">
              Your Message
            </Label>
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder={currentPlaceholder}
              maxLength={MAX_WISH_MESSAGE_CHARACTERS}
              disabled={isFormDisabled}
            />
          </div>

          {/* STICKER TRAY & ACTIVE STICKERS */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="text-foreground">Add Stickers (Optional)</Label>
              <span className="text-xs text-muted-foreground">{stickers.length}/8 stickers</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border/80 bg-muted/20">
              {Object.entries(STICKER_EMOJIS).map(([type, emoji]) => (
                <button
                  key={type}
                  type="button"
                  disabled={isFormDisabled || stickers.length >= 8}
                  onClick={() => {
                    if (stickers.length >= 8) return;
                    const newSticker = {
                      id: crypto.randomUUID(),
                      stickerType: type,
                      positionX: Math.floor(Math.random() * 60) + 20,
                      positionY: Math.floor(Math.random() * 60) + 20,
                      scale: 1,
                      rotation: Math.floor(Math.random() * 30) - 15,
                    };
                    setStickers([...stickers, newSticker]);
                  }}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-background rounded-lg transition-all border border-transparent hover:border-border active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={`Add ${type}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {stickers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2.5">
                {stickers.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm shadow-2xs"
                  >
                    <span>{STICKER_EMOJIS[s.stickerType] || '🎉'}</span>
                    <button
                      type="button"
                      onClick={() => setStickers(stickers.filter((item) => item.id !== s.id))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove sticker"
                      disabled={isFormDisabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* PHOTOS SECTION */}
          {page.allow_photos && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <Label className="text-foreground">Photos and memory notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add up to {MAX_PHOTOS} photos. Each one can include a short note.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFormDisabled || selectedPhotos.length >= MAX_PHOTOS}
                >
                  <ImagePlus className="h-4 w-4" />
                  Add photos
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.gif"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isFormDisabled}
              />

              {selectedPhotos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-[1.4rem] border-2 border-dashed border-border bg-background/60 p-8 text-center transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isFormDisabled}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    Add photos that make the message feel lived-in
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or HEIC, up to 15MB each
                  </p>
                </button>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedPhotos.map((photo, photoIndex) => (
                    <div
                      key={photo.id}
                      draggable={!isFormDisabled}
                      onDragStart={() => setDraggedPhotoId(photo.id)}
                      onDragEnd={() => setDraggedPhotoId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedPhotoId) {
                          reorderPhotos(draggedPhotoId, photo.id);
                        }
                        setDraggedPhotoId(null);
                      }}
                      className={[
                        'overflow-hidden rounded-[1.5rem] border border-border bg-background/70 transition-shadow',
                        draggedPhotoId === photo.id ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.24)]' : '',
                      ].join(' ')}
                    >
                      <div className="relative">
                        <img
                          src={photo.previewUrl}
                          alt="Selected memory preview"
                          className="h-52 w-full object-cover"
                        />
                        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          Drag to reorder
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
                          aria-label="Remove selected photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                            {photo.file?.name || `Photo ${photoIndex + 1}`}
                          </p>
                          <span className="text-xs text-muted-foreground">{photo.caption.length}/140</span>
                        </div>
                        <Input
                          value={photo.caption}
                          onChange={(event) => handlePhotoCaptionChange(photo.id, event.target.value)}
                          placeholder="Add a short memory note for this photo"
                          className="h-11 rounded-xl"
                          disabled={isFormDisabled}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VOICE NOTE AUDIO RECORDER */}
          {page.allow_audio && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <Label className="text-foreground">Voice note (optional)</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a short audio wish so they can hear your voice on the birthday page.
                  </p>
                </div>
                {!audioRecorder.wishAudioPreviewUrl && !audioRecorder.isRecording && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
                      onClick={audioRecorder.startRecording}
                      disabled={isFormDisabled}
                    >
                      <Mic className="h-4 w-4" />
                      Record
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isFormDisabled}
                    >
                      <Mic2 className="h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) audioRecorder.setAudioFromFile(file);
                }}
                className="hidden"
                disabled={isFormDisabled}
              />

              {audioRecorder.isRecording ? (
                <div className="flex items-center justify-between rounded-[1.4rem] border border-primary/30 bg-primary/5 p-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-lg font-medium text-foreground">
                      {audioRecorder.formattedDuration}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs text-muted-foreground"
                      onClick={audioRecorder.cancelRecording}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-2 rounded-full"
                      onClick={audioRecorder.stopRecording}
                    >
                      <Square className="h-4 w-4 fill-current" />
                      Stop Recording
                    </Button>
                  </div>
                </div>
              ) : audioRecorder.wishAudioPreviewUrl ? (
                <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {audioRecorder.wishAudio?.name || 'Voice note'}
                      </p>
                      <p className="text-xs text-muted-foreground">One audio clip per wish</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2"
                      onClick={audioRecorder.clearAudio}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <audio controls className="w-full" src={audioRecorder.wishAudioPreviewUrl}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                  Upload a short audio clip or record one directly here if you want the person to hear your voice.
                </div>
              )}
            </div>
          )}

          {/* GIFT POOL FUNDRAISING SECTION */}
          {page.pool_fundraising_enabled && !isEditMode && (
            <div className="mb-6 rounded-[1.2rem] border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <HandCoins className="h-4 w-4" />
                    Send {page.recipient_name} money
                  </p>
                  <p className="mt-1 text-xs text-emerald-800/90">
                    Funds are securely processed and pooled for the final gift release.
                  </p>
                  {page.pool_description && (
                    <p className="mt-2 text-xs text-emerald-900">{page.pool_description}</p>
                  )}
                  {typeof page.pool_goal_kobo === 'number' && page.pool_goal_kobo > 0 && (
                    <p className="mt-1 text-xs text-emerald-900/90">
                      Goal: {formatKobo(page.pool_goal_kobo)}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Amount Suggestion Chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['2,000', '5,000', '10,000', '20,000', '50,000'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setPoolAmountNaira(chip)}
                    className="rounded-lg border border-emerald-300 bg-white/90 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-100"
                    disabled={isFormDisabled}
                  >
                    ₦{chip}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Input
                  ref={poolAmountInputRef}
                  type="text"
                  inputMode="decimal"
                  value={poolAmountNaira}
                  onChange={(event) => setPoolAmountNaira(formatNairaInputWithCommas(event.target.value))}
                  placeholder="Amount (NGN)"
                  className="bg-white"
                  disabled={isFormDisabled}
                />
                <Input
                  type="email"
                  value={poolContributorEmail}
                  onChange={(event) => setPoolContributorEmail(event.target.value)}
                  placeholder="Email for receipt (optional)"
                  className="bg-white sm:col-span-2"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <p className="self-center text-[11px] text-emerald-900/80">
                  If you enter an amount, we will redirect you to checkout right after you add your wish.
                </p>
                {poolTotalChargeKobo > 0 && (
                  <p className="self-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                    You will be charged {formatKobo(poolTotalChargeKobo)}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* MOBILE PREVIEW ACTION PEEK */}
          {onPreviewClick && (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="mb-3 w-full gap-2 rounded-xl border-stone-300 bg-white/80 font-sans font-semibold text-stone-700 shadow-2xs hover:bg-white lg:hidden"
              onClick={onPreviewClick}
            >
              <Eye className="h-4 w-4" />
              <span>Preview How Your Card Looks</span>
            </Button>
          )}

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full gap-2"
            disabled={submitting || audioRecorder.isRecording || isFormDisabled}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isEditMode ? (
              <Check className="h-5 w-5" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {submitting
              ? isEditMode
                ? 'Saving changes...'
                : 'Adding your wish...'
              : isEditMode
              ? 'Save changes to my wish'
              : page.contributor_limit_reached && !page.can_contribute
              ? 'Free limit reached (6 wishes)'
              : !page.can_contribute
              ? 'Submissions closed'
              : page.pool_fundraising_enabled && poolAmountNaira.trim().length > 0
              ? 'Add my wish and continue to payment'
              : 'Add my wish'}
          </Button>

          {/* EDIT MODE: DESTRUCTIVE DELETE ACTION */}
          {isEditMode && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Need to withdraw your wish?</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleWishDelete}
                disabled={isDeletingWish || isLocked}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                {isDeletingWish ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete wish</span>
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
