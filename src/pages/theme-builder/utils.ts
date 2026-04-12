import { FONT_OPTIONS } from './constants';

export function normalizeHex(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.slice(0, 7);
}

export function fontClassForValue(value: string): string {
  if (value === 'sans') return 'font-jakarta';
  if (value === 'serif') return 'font-playfair';
  return FONT_OPTIONS.find((f) => f.value === value)?.className || 'font-sans';
}

export function fontLabelForValue(value: string): string {
  if (value === 'sans') return 'Modern Sans';
  if (value === 'serif') return 'Classic Serif';
  return FONT_OPTIONS.find((f) => f.value === value)?.label || value;
}

export function buildGradient(from: string, to: string, mid: string | null, angle: number): string {
  const stops = mid ? `${from}, ${mid}, ${to}` : `${from}, ${to}`;
  return `linear-gradient(${angle}deg, ${stops})`;
}
