import type { DisplayMode } from './types';

export const displayModes: Array<{ id: DisplayMode; label: string; description: string }> = [
  { id: 'story', label: 'Story', description: 'Guided reveal flow' },
  { id: 'freeform', label: 'Freeform', description: 'Scrapbook-style layout' },
  { id: 'bento', label: 'Bento', description: 'Structured card grid' },
];

export const WIZARD_STEPS = [
  { number: 1, label: 'Details' },
  { number: 2, label: 'Theme' },
  { number: 3, label: 'Share' },
] as const;

export const DEFAULT_LETTER_START = '#f5f0e8';
export const DEFAULT_LETTER_END = '#eadfce';
