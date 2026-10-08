export interface PdfThemePalette {
  name: string;
  isDark: boolean;
  fontFamily: 'serif' | 'sans';
  primary: [number, number, number];
  accent: [number, number, number];
  background: [number, number, number];
  cardBackground: [number, number, number];
  textDark: [number, number, number];
  textMuted: [number, number, number];
  border: [number, number, number];
}

const THEME_PALETTES: Record<string, PdfThemePalette> = {
  elegant: {
    name: 'Elegant',
    isDark: false,
    fontFamily: 'serif',
    primary: [0.18, 0.12, 0.08],
    accent: [0.85, 0.65, 0.22],
    background: [0.985, 0.98, 0.97],
    cardBackground: [1, 1, 1],
    textDark: [0.18, 0.12, 0.08],
    textMuted: [0.52, 0.46, 0.4],
    border: [0.9, 0.86, 0.8],
  },
  playful: {
    name: 'Playful',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.32, 0.08, 0.28],
    accent: [0.92, 0.28, 0.6],
    background: [0.99, 0.965, 0.98],
    cardBackground: [1, 1, 1],
    textDark: [0.26, 0.08, 0.24],
    textMuted: [0.55, 0.42, 0.52],
    border: [0.94, 0.85, 0.92],
  },
  minimalist: {
    name: 'Minimalist',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.12, 0.14, 0.18],
    accent: [0.4, 0.48, 0.58],
    background: [0.98, 0.985, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.1, 0.12, 0.16],
    textMuted: [0.48, 0.52, 0.56],
    border: [0.88, 0.9, 0.93],
  },
  retro: {
    name: 'Retro',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.24, 0.1, 0.36],
    accent: [0.06, 0.68, 0.82],
    background: [0.98, 0.97, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.2, 0.08, 0.32],
    textMuted: [0.5, 0.42, 0.58],
    border: [0.9, 0.84, 0.94],
  },
  tropical: {
    name: 'Tropical',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.06, 0.22, 0.14],
    accent: [0.14, 0.68, 0.4],
    background: [0.965, 0.985, 0.97],
    cardBackground: [1, 1, 1],
    textDark: [0.06, 0.2, 0.12],
    textMuted: [0.4, 0.52, 0.44],
    border: [0.86, 0.92, 0.88],
  },
  cosmic: {
    name: 'Cosmic',
    isDark: true,
    fontFamily: 'sans',
    primary: [0.95, 0.94, 0.99],
    accent: [0.65, 0.48, 0.98],
    background: [0.06, 0.05, 0.14],
    cardBackground: [0.12, 0.1, 0.22],
    textDark: [0.95, 0.94, 0.99],
    textMuted: [0.72, 0.7, 0.85],
    border: [0.26, 0.22, 0.42],
  },
  sunset: {
    name: 'Sunset',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.28, 0.1, 0.08],
    accent: [0.94, 0.42, 0.2],
    background: [0.99, 0.965, 0.94],
    cardBackground: [1, 1, 1],
    textDark: [0.26, 0.1, 0.08],
    textMuted: [0.54, 0.42, 0.38],
    border: [0.94, 0.86, 0.82],
  },
  ocean: {
    name: 'Ocean',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.06, 0.18, 0.28],
    accent: [0.06, 0.64, 0.88],
    background: [0.95, 0.98, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.06, 0.18, 0.26],
    textMuted: [0.42, 0.52, 0.58],
    border: [0.85, 0.91, 0.95],
  },
  candyland: {
    name: 'Candyland',
    isDark: false,
    fontFamily: 'sans',
    primary: [0.32, 0.08, 0.26],
    accent: [0.94, 0.36, 0.68],
    background: [0.99, 0.965, 0.975],
    cardBackground: [1, 1, 1],
    textDark: [0.28, 0.06, 0.22],
    textMuted: [0.55, 0.4, 0.52],
    border: [0.95, 0.86, 0.92],
  },
  midnight: {
    name: 'Midnight',
    isDark: true,
    fontFamily: 'serif',
    primary: [0.96, 0.97, 0.99],
    accent: [0.48, 0.55, 0.98],
    background: [0.04, 0.05, 0.09],
    cardBackground: [0.09, 0.11, 0.18],
    textDark: [0.96, 0.97, 0.99],
    textMuted: [0.68, 0.72, 0.82],
    border: [0.2, 0.24, 0.38],
  },
};

export function getPdfThemePalette(themeKey?: string | null): PdfThemePalette {
  if (!themeKey) return THEME_PALETTES.elegant;
  const key = themeKey.toLowerCase().trim();
  return THEME_PALETTES[key] || THEME_PALETTES.elegant;
}

export function formatKeepsakeDate(rawDate?: string | null): string {
  if (!rawDate) return 'Special Occasion';
  try {
    const parts = String(rawDate).split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    const fallback = new Date(rawDate);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch {
    // Ignore error and return fallback
  }
  return 'Special Occasion';
}

export function sanitizePdfText(text: string): string {
  if (!text) return '';
  return text
    // Replace em dashes and en dashes with hyphens or colons
    .replace(/[\u2014\u2015]/g, ' - ')
    .replace(/[\u2012\u2013]/g, '-')
    // Replace curved quotes with straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace horizontal ellipsis
    .replace(/\u2026/g, '...')
    // Remove characters outside standard WinAnsi printable range
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

export function wrapTextForPdf(text: string, maxCharsPerLine: number): string[] {
  const sanitized = sanitizePdfText(text);
  if (!sanitized) return [];

  const words = sanitized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    const candidate = `${current} ${word}`;
    if (candidate.length > maxCharsPerLine) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export type KeepsakeVisualFormat = 'pdf' | 'slides';

export interface KeepsakeCanvasDimensions {
  width: number;
  height: number;
  margin: number;
  aspectRatio: string;
}

export function getKeepsakeCanvasDimensions(format: KeepsakeVisualFormat): KeepsakeCanvasDimensions {
  if (format === 'slides') {
    return {
      width: 960,
      height: 540,
      margin: 32,
      aspectRatio: '16:9',
    };
  }
  return {
    width: 595,
    height: 842,
    margin: 38,
    aspectRatio: 'A4',
  };
}
