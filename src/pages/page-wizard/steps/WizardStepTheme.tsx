import type React from 'react';
import { Lock } from 'lucide-react';
import OpenerThemePreview from '@/components/OpenerThemePreview';
import SoundtrackSelector from '@/components/SoundtrackSelector';
import ThemeSelector from '@/components/ThemeSelector';
import { cn } from '@/lib/utils';
import type { CustomTheme, DisplayMode, Theme } from '../types';
import { displayModes } from '../constants';
import { getEffectiveColors } from '../getEffectiveColors';
import { ModePreview } from '../ModePreview';

export type WizardStepThemeVariant = 'create' | 'edit';

export type WizardStepThemeProps = {
  variant: WizardStepThemeVariant;
  recipientName: string;
  selectedTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  selectedLetterTheme: Theme;
  onSelectLetterTheme: (theme: Theme) => void;
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
  selectedSoundtrackId: string;
  onSelectSoundtrackId: (id: string) => void;
  pageCustomAudioUrl: string | null;
  onChangeCustomAudioUrl: (url: string | null) => void;
  /** When false, hides internal previews because parent container has live canvas preview stage. */
  showPreview?: boolean;
  /** Create flow: Pro controls panel. Omit on edit (Pro lives on step 3). */
  footer?: React.ReactNode;
};

export function WizardStepTheme({
  variant,
  recipientName,
  selectedTheme,
  onSelectTheme,
  selectedLetterTheme,
  onSelectLetterTheme,
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
  selectedSoundtrackId,
  onSelectSoundtrackId,
  pageCustomAudioUrl,
  onChangeCustomAudioUrl,
  showPreview = true,
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
        {isCreate ? 'Select themes for the page and letter' : 'Change the page mood and soundtrack without scrolling through unrelated fields.'}
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">Birthday page theme</h3>
          <p className="text-sm text-muted-foreground mb-4">This theme applies to the entire birthday page backdrop and wishes display.</p>
          <ThemeSelector
            selectedTheme={selectedTheme}
            onSelect={onSelectTheme}
            customThemes={customThemes}
            recipientName={recipientName}
            showPreview={showPreview}
          />
        </div>
      </div>

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
        {showPreview && <ModePreview mode={selectedDisplayMode} />}
      </div>

      <div className="mt-8">
        {showPreview && (() => {
          const { start, mid, end, angle } = getEffectiveColors(selectedLetterTheme, letterColor, customThemes);
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
                    ? 'Shows how the letter will appear with your selected letter theme.'
                    : 'Shows the polaroid-style reveal used in Freeform mode.'}
                </p>
              </div>
            </div>
          );
        })()}

        <div className={cn("border-t border-border/40 pt-6", showPreview ? "mt-6" : "mt-2")}>
          <h3 className="text-base font-semibold text-foreground mb-3">Letter / envelope theme</h3>
          <p className="text-sm text-muted-foreground mb-4">Pick the letter theme only. The page theme above remains unchanged.</p>
          <ThemeSelector
            selectedTheme={selectedLetterTheme}
            onSelect={onSelectLetterTheme}
            customThemes={customThemes}
            recipientName={recipientName}
            showPreview={false}
          />
        </div>
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
