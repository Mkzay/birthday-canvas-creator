import { visualThemeConfig } from '@/lib/themes';
import type { CustomTheme } from './types';

export function getEffectiveColors(
  selectedTheme: string,
  letterColor: string | null | undefined,
  customThemes: CustomTheme[],
) {
  if (letterColor) {
    const [first, second, third] = letterColor.split(',').map((c) => c.trim()).filter(Boolean);
    if (third) {
      return { start: first, mid: second, end: third, angle: null as number | null };
    }
    return { start: first, mid: null as string | null, end: second || first, angle: null as number | null };
  }

  const custom = customThemes.find((t) => t.id === selectedTheme);
  if (custom) {
    return {
      start: custom.gradient_from,
      mid: custom.gradient_mid || null,
      end: custom.gradient_to,
      angle: custom.gradient_angle ?? null,
    };
  }

  const config = visualThemeConfig[selectedTheme as keyof typeof visualThemeConfig];
  if (config && config.colors && config.colors.length >= 2) {
    const end = config.colors[config.colors.length - 1];
    return {
      start: config.colors[0],
      mid: config.colors.length > 2 ? config.colors[1] : null,
      end,
      angle: null as number | null,
    };
  }

  return { start: '#f5f0e8', mid: null as string | null, end: '#eadfce', angle: null as number | null };
}
