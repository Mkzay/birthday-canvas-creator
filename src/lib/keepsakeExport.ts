export interface PdfThemePalette {
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
    primary: [0.12, 0.14, 0.18], // Slate charcoal
    accent: [0.85, 0.65, 0.25], // Champagne gold
    background: [0.985, 0.98, 0.97], // Warm parchment
    cardBackground: [1, 1, 1], // Pure white card
    textDark: [0.1, 0.12, 0.16],
    textMuted: [0.45, 0.48, 0.52],
    border: [0.9, 0.88, 0.84],
  },
  champagne: {
    primary: [0.2, 0.15, 0.12], // Deep bronze
    accent: [0.88, 0.72, 0.35], // Warm gold
    background: [0.99, 0.98, 0.96],
    cardBackground: [1, 1, 1],
    textDark: [0.18, 0.14, 0.1],
    textMuted: [0.5, 0.46, 0.42],
    border: [0.92, 0.88, 0.82],
  },
  midnight: {
    primary: [0.08, 0.1, 0.16], // Deep midnight navy
    accent: [0.4, 0.65, 0.95], // Celestial blue
    background: [0.97, 0.98, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.08, 0.1, 0.16],
    textMuted: [0.42, 0.46, 0.52],
    border: [0.86, 0.89, 0.94],
  },
  lavender: {
    primary: [0.22, 0.16, 0.28], // Regal plum
    accent: [0.65, 0.45, 0.8], // Soft lavender
    background: [0.98, 0.97, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.18, 0.12, 0.24],
    textMuted: [0.48, 0.42, 0.52],
    border: [0.9, 0.86, 0.94],
  },
  rose: {
    primary: [0.28, 0.12, 0.16], // Deep ruby
    accent: [0.85, 0.4, 0.5], // Soft rose
    background: [0.99, 0.97, 0.98],
    cardBackground: [1, 1, 1],
    textDark: [0.22, 0.1, 0.14],
    textMuted: [0.52, 0.42, 0.46],
    border: [0.94, 0.86, 0.9],
  },
  emerald: {
    primary: [0.08, 0.2, 0.14], // Deep forest
    accent: [0.2, 0.65, 0.4], // Emerald
    background: [0.97, 0.99, 0.98],
    cardBackground: [1, 1, 1],
    textDark: [0.08, 0.18, 0.12],
    textMuted: [0.42, 0.5, 0.46],
    border: [0.86, 0.92, 0.88],
  },
  sunset: {
    primary: [0.28, 0.14, 0.1], // Terra cotta
    accent: [0.92, 0.45, 0.25], // Sunset coral
    background: [0.99, 0.975, 0.96],
    cardBackground: [1, 1, 1],
    textDark: [0.22, 0.12, 0.08],
    textMuted: [0.52, 0.44, 0.4],
    border: [0.94, 0.88, 0.84],
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
      margin: 36,
      aspectRatio: '16:9',
    };
  }
  return {
    width: 595,
    height: 842,
    margin: 42,
    aspectRatio: 'A4',
  };
}
