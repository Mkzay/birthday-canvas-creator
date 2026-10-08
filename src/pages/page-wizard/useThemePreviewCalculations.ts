import { useMemo } from 'react';
import { builtInThemeMap, visualThemeConfig } from '@/lib/themes';
import { fontClassForValue } from '@/pages/theme-builder';
import { getEffectiveColors } from './getEffectiveColors';
import type { CustomTheme, Theme } from './types';

export function findCustomTheme(themeId: string, themes: CustomTheme[]): CustomTheme | null {
  if (!themeId || !themeId.startsWith('custom_')) return null;
  const realId = themeId.replace('custom_', '');
  return themes.find((t) => String(t.id) === realId) || null;
}

export interface UseThemePreviewCalculationsOptions {
  selectedTheme: Theme;
  selectedLetterTheme: Theme;
  letterColor: string;
  customThemes: CustomTheme[];
}

export interface UseThemePreviewCalculationsReturn {
  resolvedCustomTheme: CustomTheme | null;
  resolvedLetterCustomTheme: CustomTheme | null;
  previewColors: { start: string; end: string; mid?: string | null };
  previewGradient: string;
  previewEmoji: string;
  previewIconUrl: string | null;
  previewFontClass: string;
  currentThemeName: string;
  letterColors: { start: string; mid: string | null; end: string; angle: number | null };
  currentLetterThemeName: string;
}

export function useThemePreviewCalculations({
  selectedTheme,
  selectedLetterTheme,
  letterColor,
  customThemes,
}: UseThemePreviewCalculationsOptions): UseThemePreviewCalculationsReturn {
  const resolvedCustomTheme = useMemo(
    () => findCustomTheme(selectedTheme, customThemes),
    [customThemes, selectedTheme],
  );

  const previewColors = useMemo(() => {
    if (resolvedCustomTheme) {
      return {
        start: resolvedCustomTheme.gradient_from,
        end: resolvedCustomTheme.gradient_to,
        mid: resolvedCustomTheme.gradient_mid || null,
      };
    }
    const builtIn = builtInThemeMap[selectedTheme];
    if (builtIn) {
      return {
        start: builtIn.gradientColors[0],
        end: builtIn.gradientColors[1],
        mid: null,
      };
    }
    return {
      start: '#fbbf24',
      end: '#f97316',
      mid: null,
    };
  }, [resolvedCustomTheme, selectedTheme]);

  const previewGradient = useMemo(() => {
    if (resolvedCustomTheme) {
      const angle = resolvedCustomTheme.gradient_angle ?? 135;
      if (resolvedCustomTheme.gradient_mid) {
        return `linear-gradient(${angle}deg, ${resolvedCustomTheme.gradient_from} 0%, ${resolvedCustomTheme.gradient_mid} 50%, ${resolvedCustomTheme.gradient_to} 100%)`;
      }
      return `linear-gradient(${angle}deg, ${resolvedCustomTheme.gradient_from} 0%, ${resolvedCustomTheme.gradient_to} 100%)`;
    }
    const builtIn = builtInThemeMap[selectedTheme];
    if (builtIn) {
      return `linear-gradient(135deg, ${builtIn.gradientColors[0]} 0%, ${builtIn.gradientColors[1]} 100%)`;
    }
    return 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)';
  }, [resolvedCustomTheme, selectedTheme]);

  const previewEmoji = useMemo(() => {
    if (resolvedCustomTheme) return resolvedCustomTheme.emoji || '✨';
    return builtInThemeMap[selectedTheme]?.emoji || '✨';
  }, [resolvedCustomTheme, selectedTheme]);

  const previewIconUrl = resolvedCustomTheme?.icon_url || null;

  const previewFontClass = useMemo(() => {
    if (resolvedCustomTheme) {
      return fontClassForValue(resolvedCustomTheme.font || 'jakarta');
    }
    return visualThemeConfig[selectedTheme as keyof typeof visualThemeConfig]?.font || 'font-serif';
  }, [resolvedCustomTheme, selectedTheme]);

  const currentThemeName = useMemo(() => {
    if (resolvedCustomTheme) return resolvedCustomTheme.name;
    return builtInThemeMap[selectedTheme]?.name || 'Signature Gold';
  }, [resolvedCustomTheme, selectedTheme]);

  const resolvedLetterCustomTheme = useMemo(
    () => findCustomTheme(selectedLetterTheme, customThemes),
    [customThemes, selectedLetterTheme],
  );

  const letterColors = useMemo(
    () => getEffectiveColors(selectedLetterTheme, letterColor, customThemes),
    [customThemes, letterColor, selectedLetterTheme],
  );

  const currentLetterThemeName = useMemo(() => {
    if (resolvedLetterCustomTheme) return resolvedLetterCustomTheme.name;
    return builtInThemeMap[selectedLetterTheme]?.name || 'Signature Gold';
  }, [resolvedLetterCustomTheme, selectedLetterTheme]);

  return {
    resolvedCustomTheme,
    resolvedLetterCustomTheme,
    previewColors,
    previewGradient,
    previewEmoji,
    previewIconUrl,
    previewFontClass,
    currentThemeName,
    letterColors,
    currentLetterThemeName,
  };
}
