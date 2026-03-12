export interface BuiltInThemeOption {
  key: string;
  name: string;
  emoji: string;
  primary: string;
  mood: string;
  description: string;
}

export interface ThemeSelectorCustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
}

export const builtInThemeOptions: BuiltInThemeOption[] = [
  {
    key: 'elegant',
    name: 'Elegant',
    emoji: '✨',
    primary: 'from-amber-400 to-orange-500',
    mood: 'Warm and polished',
    description: 'Soft gold tones for heartfelt messages and refined reveals.',
  },
  {
    key: 'playful',
    name: 'Playful',
    emoji: '🎈',
    primary: 'from-pink-500 to-purple-500',
    mood: 'Bright and joyful',
    description: 'Color-forward and bubbly for lively friends and family groups.',
  },
  {
    key: 'minimalist',
    name: 'Minimalist',
    emoji: '🎯',
    primary: 'from-slate-600 to-slate-800',
    mood: 'Clean and modern',
    description: 'Simple framing that keeps the focus on the words themselves.',
  },
  {
    key: 'retro',
    name: 'Retro',
    emoji: '🌈',
    primary: 'from-cyan-400 to-purple-500',
    mood: 'Bold and nostalgic',
    description: 'A punchier palette with a throwback poster feel.',
  },
  {
    key: 'tropical',
    name: 'Tropical',
    emoji: '🌴',
    primary: 'from-green-400 to-emerald-500',
    mood: 'Fresh and sunny',
    description: 'Lush greens for relaxed celebrations and destination vibes.',
  },
  {
    key: 'cosmic',
    name: 'Cosmic',
    emoji: '🚀',
    primary: 'from-violet-500 to-indigo-600',
    mood: 'Dreamy and dramatic',
    description: 'Deep-space gradients for a more cinematic birthday reveal.',
  },
  {
    key: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    primary: 'from-orange-400 to-rose-500',
    mood: 'Romantic and glowing',
    description: 'Peach-to-rose warmth that feels personal and celebratory.',
  },
  {
    key: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    primary: 'from-sky-400 to-cyan-500',
    mood: 'Cool and airy',
    description: 'A light, breezy look for calm, modern birthday pages.',
  },
  {
    key: 'candyland',
    name: 'Candyland',
    emoji: '🍭',
    primary: 'from-pink-400 to-purple-500',
    mood: 'Sweet and colorful',
    description: 'Extra playful with a party-first, high-energy tone.',
  },
  {
    key: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    primary: 'from-indigo-500 to-violet-600',
    mood: 'Moody and luxe',
    description: 'Dark, rich colors that make photos and messages feel premium.',
  },
];

export const builtInThemeMap = Object.fromEntries(
  builtInThemeOptions.map((theme) => [theme.key, theme]),
) as Record<string, BuiltInThemeOption>;
