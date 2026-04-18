import { useMemo } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { builtInThemeOptions, builtInThemeMap, type ThemeSelectorCustomTheme } from '@/lib/themes';

const fontClassMap: Record<string, string> = {
  sans: 'font-jakarta',
  serif: 'font-playfair',
  jakarta: 'font-jakarta',
  playfair: 'font-playfair',
  caveat: 'font-caveat',
  nunito: 'font-nunito',
  sora: 'font-sora',
  cormorant: 'font-cormorant',
  'space-grotesk': 'font-space-grotesk',
  'dm-serif': 'font-dm-serif',
  inter: 'font-inter',
  outfit: 'font-outfit',
};

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelect: (theme: string) => void;
  customThemes?: ThemeSelectorCustomTheme[];
  manageThemesHref?: string;
  recipientName?: string;
  showPreview?: boolean;
}

const ThemeSelector = ({
  selectedTheme,
  onSelect,
  customThemes = [],
  manageThemesHref = '/themes',
  recipientName,
  showPreview = true,
}: ThemeSelectorProps) => {
  const previewData = useMemo(() => {
    if (selectedTheme.startsWith('custom_')) {
      const customId = selectedTheme.slice('custom_'.length);
      const ct = customThemes.find((t) => String(t.id) === customId);
      if (ct) {
        const stops = ct.gradient_mid
          ? `${ct.gradient_from}, ${ct.gradient_mid}, ${ct.gradient_to}`
          : `${ct.gradient_from}, ${ct.gradient_to}`;
        return {
          gradient: `linear-gradient(${ct.gradient_angle ?? 135}deg, ${stops})`,
          name: ct.name,
          emoji: ct.emoji,
          iconUrl: ct.icon_url || null,
          fontClass: fontClassMap[ct.font || 'sans'] || 'font-jakarta',
          isDark: true,
        };
      }
    }
    const builtin = builtInThemeMap[selectedTheme];
    if (builtin) {
      const [from, to] = builtin.gradientColors;
      const isDark = ['minimalist', 'cosmic', 'midnight'].includes(builtin.key);
      return {
        gradient: `linear-gradient(135deg, ${from}, ${to})`,
        name: builtin.name,
        emoji: builtin.emoji,
        iconUrl: null,
        fontClass: 'font-jakarta',
        isDark,
      };
    }
    return {
      gradient: 'linear-gradient(135deg, #fbbf24, #f97316)',
      name: 'Elegant',
      emoji: '✨',
      iconUrl: null,
      fontClass: 'font-jakarta',
      isDark: false,
    };
  }, [customThemes, selectedTheme]);

  const displayName = recipientName?.trim() || 'Alex';

  return (
    <div className="space-y-5">
      {showPreview && (
        <div
          className="relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6"
          style={{ background: previewData.gradient }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.28em]', previewData.isDark ? 'text-white/60' : 'text-white/70')}>
              Preview
            </p>
            <h3 className={cn('mt-2 text-2xl font-bold leading-tight sm:text-3xl', previewData.fontClass, previewData.isDark ? 'text-white' : 'text-white')}>
              Happy Birthday, {displayName}.
            </h3>
            <div className="mt-4 flex items-center gap-3">
              <div className={cn('rounded-xl border px-4 py-2.5', previewData.isDark ? 'border-white/15 bg-white/10' : 'border-white/25 bg-white/20')}>
                <p className={cn('text-xs', previewData.isDark ? 'text-white/70' : 'text-white/80')}>Wish card</p>
                <p className={cn('mt-1 text-sm font-medium italic', previewData.isDark ? 'text-white/90' : 'text-white')}>&ldquo;Your message here...&rdquo;</p>
              </div>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-lg', previewData.isDark ? 'bg-white/12' : 'bg-white/22')}>
                {previewData.iconUrl ? (
                  <img src={previewData.iconUrl} alt={previewData.name} className="h-8 w-8 rounded-xl object-cover" />
                ) : (
                  previewData.emoji
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Built-in themes */}
      <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-white via-background to-primary/5 p-4 shadow-card sm:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
          Built-in themes
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {builtInThemeOptions.map((theme) => {
            const isSelected = selectedTheme === theme.key;

            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => onSelect(theme.key)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200',
                  'hover:border-primary/30 hover:bg-white',
                  isSelected
                    ? 'border-primary/40 bg-white shadow-card ring-2 ring-primary/15'
                    : 'border-border/60 bg-card',
                )}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${theme.gradientColors[0]}, ${theme.gradientColors[1]})` }}
                >
                  {theme.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">{theme.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{theme.mood}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom themes */}
      <div className="rounded-[2rem] border border-border/70 bg-card p-4 shadow-card sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Custom themes</p>
          </div>
          <Link
            to={manageThemesHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            Manage
          </Link>
        </div>

        {customThemes.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {customThemes.map((theme) => {
              const themeKey = `custom_${theme.id}`;
              const isSelected = selectedTheme === themeKey;
              const stops = theme.gradient_mid
                ? `${theme.gradient_from}, ${theme.gradient_mid}, ${theme.gradient_to}`
                : `${theme.gradient_from}, ${theme.gradient_to}`;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelect(themeKey)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200',
                    'hover:border-primary/30 hover:bg-white',
                    isSelected
                      ? 'border-primary/40 bg-white shadow-card ring-2 ring-primary/15'
                      : 'border-border/60 bg-card',
                  )}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-white shadow-sm overflow-hidden"
                    style={{ background: `linear-gradient(${theme.gradient_angle ?? 135}deg, ${stops})` }}
                  >
                    {theme.icon_url ? (
                      <img src={theme.icon_url} alt={theme.name} className="h-full w-full object-cover" />
                    ) : (
                      theme.emoji
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{theme.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Custom gradient</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
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
