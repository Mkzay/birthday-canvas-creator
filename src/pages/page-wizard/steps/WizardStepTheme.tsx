import type React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OpenerThemePreview from '@/components/OpenerThemePreview';
import SoundtrackSelector from '@/components/SoundtrackSelector';
import ThemeSelector from '@/components/ThemeSelector';
import { cn } from '@/lib/utils';
import type { CustomTheme, DisplayMode, Theme } from '../types';
import { DEFAULT_LETTER_END, DEFAULT_LETTER_START, displayModes } from '../constants';
import { getEffectiveColors } from '../getEffectiveColors';
import { ModePreview } from '../ModePreview';
import { normalizePastedHex } from '../hexAndDate';

export type WizardStepThemeVariant = 'create' | 'edit';

export type WizardStepThemeProps = {
  variant: WizardStepThemeVariant;
  recipientName: string;
  selectedTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  customThemes: CustomTheme[];
  isProUser: boolean;
  selectedDisplayMode: DisplayMode;
  onSelectDisplayMode: (mode: DisplayMode) => void;
  letterColor: string;
  setLetterColor: (value: string) => void;
  letterGradientStart: string;
  setLetterGradientStart: (value: string) => void;
  letterGradientEnd: string;
  setLetterGradientEnd: (value: string) => void;
  letterStartHexInput: string;
  setLetterStartHexInput: (value: string) => void;
  letterEndHexInput: string;
  setLetterEndHexInput: (value: string) => void;
  selectedSoundtrackId: string;
  onSelectSoundtrackId: (id: string) => void;
  pageCustomAudioUrl: string | null;
  onChangeCustomAudioUrl: (url: string | null) => void;
  /** Create flow: Pro controls panel. Omit on edit (Pro lives on step 3). */
  footer?: React.ReactNode;
};

export function WizardStepTheme({
  variant,
  recipientName,
  selectedTheme,
  onSelectTheme,
  customThemes,
  isProUser,
  selectedDisplayMode,
  onSelectDisplayMode,
  letterColor,
  setLetterColor,
  letterGradientStart,
  setLetterGradientStart,
  letterGradientEnd,
  setLetterGradientEnd,
  letterStartHexInput,
  setLetterStartHexInput,
  letterEndHexInput,
  setLetterEndHexInput,
  selectedSoundtrackId,
  onSelectSoundtrackId,
  pageCustomAudioUrl,
  onChangeCustomAudioUrl,
  footer,
}: WizardStepThemeProps) {
  const isCreate = variant === 'create';
  const viewModeDescription = isProUser
    ? isCreate
      ? 'You control how recipients will view this page.'
      : 'Only you can choose the recipient-facing view style.'
    : 'Free plan uses Story view. Upgrade to Pro to unlock Freeform and Bento.';

  const soundtrackDescription = isCreate
    ? 'Choose one of the in-app soundtracks or paste a YouTube custom link for the reveal.'
    : 'Choose one of the in-app tracks or paste a YouTube custom link for the reveal.';

  return (
    <div className="panel-card animate-fade-in-up p-6 sm:p-8">
      <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
        {isCreate ? 'Choose a vibe' : 'Adjust the visual direction'}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        {isCreate ? 'Select a theme that matches their personality' : 'Change the page mood and soundtrack without scrolling through unrelated fields.'}
      </p>

      <ThemeSelector selectedTheme={selectedTheme} onSelect={onSelectTheme} customThemes={customThemes} recipientName={recipientName} />

      <div className="panel-inset mt-4 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-foreground">Birthday page view</h3>
        <p className="mt-2 text-sm text-muted-foreground">{viewModeDescription}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {displayModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                if (!isProUser && mode.id !== 'story') return;
                onSelectDisplayMode(mode.id);
              }}
              disabled={!isProUser && mode.id !== 'story'}
              className={cn(
                'rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                selectedDisplayMode === mode.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/70 bg-background/70 text-foreground hover:border-primary/40',
              )}
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {mode.label}
                {!isProUser && mode.id !== 'story' && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{mode.description}</p>
              {!isProUser && mode.id !== 'story' && (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700">Pro</p>
              )}
            </button>
          ))}
        </div>
        <ModePreview mode={selectedDisplayMode} />
      </div>

      <div className="mt-8">
        <Label className="text-foreground">Letter / envelope color</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional. Use one or two tones for the paper mood. Leave empty to use the theme default.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
            <Label htmlFor="letter-color-start" className="text-xs text-muted-foreground">
              Start
            </Label>
            <input
              type="color"
              id="letter-color-start"
              value={letterGradientStart}
              onChange={(e) => {
                const nextStart = e.target.value;
                setLetterGradientStart(nextStart);
                setLetterColor(`${nextStart},${letterGradientEnd}`);
              }}
              className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background"
              aria-label="Choose letter gradient start color"
            />
          </div>
          <Input
            value={letterStartHexInput}
            onChange={(event) => setLetterStartHexInput(event.target.value)}
            onBlur={() => {
              const normalized = normalizePastedHex(letterStartHexInput);
              if (!normalized) {
                setLetterStartHexInput(letterGradientStart);
                return;
              }
              setLetterGradientStart(normalized);
              setLetterColor(`${normalized},${letterGradientEnd}`);
            }}
            placeholder="#f5f0e8"
            className="h-10 w-[8.5rem] font-mono text-xs"
            aria-label="Paste letter gradient start color code"
          />
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
            <Label htmlFor="letter-color-end" className="text-xs text-muted-foreground">
              End
            </Label>
            <input
              type="color"
              id="letter-color-end"
              value={letterGradientEnd}
              onChange={(e) => {
                const nextEnd = e.target.value;
                setLetterGradientEnd(nextEnd);
                setLetterColor(`${letterGradientStart},${nextEnd}`);
              }}
              className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background"
              aria-label="Choose letter gradient end color"
            />
          </div>
          <Input
            value={letterEndHexInput}
            onChange={(event) => setLetterEndHexInput(event.target.value)}
            onBlur={() => {
              const normalized = normalizePastedHex(letterEndHexInput);
              if (!normalized) {
                setLetterEndHexInput(letterGradientEnd);
                return;
              }
              setLetterGradientEnd(normalized);
              setLetterColor(`${letterGradientStart},${normalized}`);
            }}
            placeholder="#eadfce"
            className="h-10 w-[8.5rem] font-mono text-xs"
            aria-label="Paste letter gradient end color code"
          />
          {letterColor ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLetterColor('');
                setLetterGradientStart(DEFAULT_LETTER_START);
                setLetterGradientEnd(DEFAULT_LETTER_END);
                setLetterStartHexInput(DEFAULT_LETTER_START);
                setLetterEndHexInput(DEFAULT_LETTER_END);
              }}
            >
              Use default
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">You can paste hex values like #f5f0e8, f5f0e8, or #abc.</p>

        {(() => {
          const { start, mid, end, angle } = getEffectiveColors(selectedTheme, letterColor, customThemes);
          return (
            <div className="mt-4 flex w-full flex-col items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:pr-4">
              <div className="order-2 sm:order-1">
                <OpenerThemePreview
                  mode={selectedDisplayMode}
                  startColor={start}
                  endColor={end}
                  midColor={mid}
                  gradientAngle={angle}
                  recipientName={recipientName}
                />
              </div>
              <div className="order-1 space-y-0.5 text-xs sm:order-2">
                <p className="font-semibold text-foreground">
                  {selectedDisplayMode === 'story' ? 'Letter theme preview' : 'Freeform opener preview'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedDisplayMode === 'story'
                    ? 'Mirrors the opening envelope layout used on the birthday page.'
                    : 'Shows the polaroid-style reveal used in Freeform mode.'}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="panel-inset mt-8 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-foreground">Opening soundtrack</h3>
        <p className="mt-2 text-sm text-muted-foreground">{soundtrackDescription}</p>
        <div className="mt-5">
          <SoundtrackSelector
            selectedSoundtrackId={selectedSoundtrackId}
            onSelectSoundtrackId={onSelectSoundtrackId}
            customAudioUrl={pageCustomAudioUrl}
            onChangeCustomAudioUrl={onChangeCustomAudioUrl}
          />
        </div>
      </div>

      {footer}
    </div>
  );
}
