import React from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { builtInThemeOptions, type ThemeSelectorCustomTheme } from '@/lib/themes';

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelect: (theme: string) => void;
  customThemes?: ThemeSelectorCustomTheme[];
  manageThemesHref?: string;
}

const ThemeSelector = ({
  selectedTheme,
  onSelect,
  customThemes = [],
  manageThemesHref = '/themes',
}: ThemeSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-white via-background to-primary/5 p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
              Built-in themes
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a visual mood, not just a color swatch.
            </p>
          </div>
          <div className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:block">
            {builtInThemeOptions.length} moods
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builtInThemeOptions.map((theme) => {
            const isSelected = selectedTheme === theme.key;

            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => onSelect(theme.key)}
                className={cn(
                  'group relative overflow-hidden rounded-[1.6rem] border bg-card text-left transition-all duration-300',
                  'hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_45px_rgba(118,62,186,0.12)]',
                  isSelected
                    ? 'border-primary/40 shadow-[0_20px_55px_rgba(118,62,186,0.18)] ring-2 ring-primary/15'
                    : 'border-border/60',
                )}
              >
                <div className={cn('aspect-square min-h-[10.5rem] bg-gradient-to-br', theme.primary)}>
                  <div className="flex h-full items-start justify-between p-4">
                    <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                      {theme.mood}
                    </div>
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-sm transition-all duration-300',
                        isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100',
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl text-white shadow-md', theme.primary)}>
                      <span>{theme.emoji}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{theme.name}</h3>
                        {isSelected && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{theme.description}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Custom themes</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your saved gradients when a built-in theme is too safe.
            </p>
          </div>
          <Link
            to={manageThemesHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            Manage themes
          </Link>
        </div>

        {customThemes.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {customThemes.map((theme) => {
              const themeKey = `custom_${theme.id}`;
              const isSelected = selectedTheme === themeKey;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelect(themeKey)}
                  className={cn(
                    'group relative overflow-hidden rounded-[1.6rem] border text-left transition-all duration-300',
                    'hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(18,18,23,0.12)]',
                    isSelected ? 'border-white/50 ring-2 ring-primary/15' : 'border-transparent',
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${theme.gradient_from}, ${theme.gradient_to})`,
                  }}
                >
                  <div className="flex aspect-square min-h-[10.5rem] flex-col justify-between p-4">
                    <div className="flex items-start justify-between">
                      <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                        Custom
                      </div>
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-sm transition-all duration-300',
                          isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100',
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/18 text-xl text-white shadow-md backdrop-blur-sm">
                        <span>{theme.emoji}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white drop-shadow-sm">{theme.name}</h3>
                        <p className="mt-1 text-sm text-white/85">Your own gradient and mood, ready to reuse.</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No custom themes yet. Create one to give the page a more personal visual style.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeSelector;
