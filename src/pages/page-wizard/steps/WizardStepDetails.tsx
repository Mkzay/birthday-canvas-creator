import type React from 'react';
import { format } from 'date-fns';
import { Calendar, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type WizardStepDetailsVariant = 'create' | 'edit';

export type WizardStepDetailsProps = {
  variant: WizardStepDetailsVariant;
  recipientName: string;
  setRecipientName: (value: string) => void;
  recipientEmail: string;
  setRecipientEmail: (value: string) => void;
  birthdayDate: Date | undefined;
  setBirthdayDate: (value: Date | undefined) => void;
  closeDate: Date | undefined;
  setCloseDate: (value: Date | undefined) => void;
  creatorMessage: string;
  setCreatorMessage: (value: string) => void;
  coverPreviewUrl: string | null;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onCoverSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
};

export function WizardStepDetails({
  variant,
  recipientName,
  setRecipientName,
  recipientEmail,
  setRecipientEmail,
  birthdayDate,
  setBirthdayDate,
  closeDate,
  setCloseDate,
  creatorMessage,
  setCreatorMessage,
  coverPreviewUrl,
  coverInputRef,
  onCoverSelect,
  onRemoveCover,
}: WizardStepDetailsProps) {
  const isCreate = variant === 'create';

  return (
    <div className="panel-card animate-fade-in-up p-6 sm:p-8">
      <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
        {isCreate ? "Who's the lucky one?" : 'Update the essentials'}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        {isCreate
          ? 'Tell us about the birthday person'
          : 'Tidy the page details first, then move on to styling and sharing.'}
      </p>

      <div className="space-y-6">
        <div>
          <Label htmlFor="name" className="text-foreground">
            {isCreate ? "Recipient's Name *" : "Recipient's Name"}
          </Label>
          <Input
            id="name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={isCreate ? 'e.g., Sarah' : undefined}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="recipientEmail" className={isCreate ? 'text-foreground' : undefined}>
            Recipient Email (optional)
          </Label>
          <Input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            placeholder={isCreate ? 'e.g., sarah@example.com' : 'e.g., esther@example.com'}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            If provided, birthday-day notification is sent to this address.
          </p>
        </div>

        <div>
          <Label className="text-foreground">{isCreate ? 'Birthday Date *' : 'Birthday Date'}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'mt-2 w-full justify-start text-left font-normal',
                  !birthdayDate && 'text-muted-foreground',
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {birthdayDate ? format(birthdayDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={birthdayDate}
                onSelect={setBirthdayDate}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-foreground">{isCreate ? 'Stop collecting wishes (optional)' : 'Stop collecting wishes'}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('mt-2 w-full justify-start text-left font-normal', !closeDate && 'text-muted-foreground')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {closeDate ? format(closeDate, 'PPP') : 'Defaults to the birthday date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={closeDate}
                onSelect={setCloseDate}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
          <p className="mt-2 text-xs text-muted-foreground">
            {isCreate
              ? 'New wishes and photo uploads will close after this date.'
              : 'New wishes and photo uploads will stop after this date.'}
          </p>
        </div>

        <div>
          <Label htmlFor="message" className="text-foreground">
            {isCreate ? 'Your Personal Message (optional)' : 'Your Personal Message'}
          </Label>
          <Textarea
            id="message"
            value={creatorMessage}
            onChange={(event) => setCreatorMessage(event.target.value)}
            placeholder={isCreate ? 'Add a special message from you...' : undefined}
            className="mt-2 min-h-[100px]"
          />
        </div>

        <div>
          <Label className="text-foreground">{isCreate ? 'Cover Photo (optional)' : 'Cover Photo'}</Label>
          <input ref={coverInputRef} type="file" accept="image/*,.gif" onChange={onCoverSelect} className="hidden" />

          {coverPreviewUrl ? (
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-border bg-muted/20">
              <div className="relative h-[58vw] min-h-[13rem] max-h-[32rem] sm:h-[24rem]">
                <img
                  src={coverPreviewUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-45"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-black/5" />
                <img src={coverPreviewUrl} alt="Cover preview" className="relative z-10 h-full w-full object-contain" />
              </div>
              <button
                type="button"
                onClick={onRemoveCover}
                className="absolute right-2 top-2 z-20 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-background"
                aria-label="Remove selected cover photo"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => coverInputRef.current?.click()}
              className="mt-2 cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
            >
              <Image className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload a cover photo</p>
              <p className="mt-1 text-xs text-muted-foreground">Preview shows the full image so you can frame it better</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
