export interface BuiltInThemeOption {
  key: string;
  name: string;
  emoji: string;
  primary: string;
  gradientColors: [string, string];
  mood: string;
  description: string;
}

export interface ThemeSelectorCustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  gradient_mid?: string | null;
  gradient_angle?: number | null;
  accent_color?: string | null;
  font?: string | null;
  icon_url?: string | null;
}

export const builtInThemeOptions: BuiltInThemeOption[] = [
  {
    key: 'elegant',
    name: 'Elegant',
    emoji: '✨',
    primary: 'from-amber-400 to-orange-500',
    gradientColors: ['#fbbf24', '#f97316'],
    mood: 'Warm and polished',
    description: 'Soft gold tones for heartfelt messages and refined reveals.',
  },
  {
    key: 'playful',
    name: 'Playful',
    emoji: '🎈',
    primary: 'from-pink-500 to-purple-500',
    gradientColors: ['#ec4899', '#a855f7'],
    mood: 'Bright and joyful',
    description: 'Color-forward and bubbly for lively friends and family groups.',
  },
  {
    key: 'minimalist',
    name: 'Minimalist',
    emoji: '🎯',
    primary: 'from-slate-600 to-slate-800',
    gradientColors: ['#475569', '#1e293b'],
    mood: 'Clean and modern',
    description: 'Simple framing that keeps the focus on the words themselves.',
  },
  {
    key: 'retro',
    name: 'Retro',
    emoji: '🌈',
    primary: 'from-cyan-400 to-purple-500',
    gradientColors: ['#22d3ee', '#a855f7'],
    mood: 'Bold and nostalgic',
    description: 'A punchier palette with a throwback poster feel.',
  },
  {
    key: 'tropical',
    name: 'Tropical',
    emoji: '🌴',
    primary: 'from-green-400 to-emerald-500',
    gradientColors: ['#4ade80', '#10b981'],
    mood: 'Fresh and sunny',
    description: 'Lush greens for relaxed celebrations and destination vibes.',
  },
  {
    key: 'cosmic',
    name: 'Cosmic',
    emoji: '🚀',
    primary: 'from-violet-500 to-indigo-600',
    gradientColors: ['#8b5cf6', '#4f46e5'],
    mood: 'Dreamy and dramatic',
    description: 'Deep-space gradients for a more cinematic birthday reveal.',
  },
  {
    key: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    primary: 'from-orange-400 to-rose-500',
    gradientColors: ['#fb923c', '#f43f5e'],
    mood: 'Romantic and glowing',
    description: 'Peach-to-rose warmth that feels personal and celebratory.',
  },
  {
    key: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    primary: 'from-sky-400 to-cyan-500',
    gradientColors: ['#38bdf8', '#06b6d4'],
    mood: 'Cool and airy',
    description: 'A light, breezy look for calm, modern birthday pages.',
  },
  {
    key: 'candyland',
    name: 'Candyland',
    emoji: '🍭',
    primary: 'from-pink-400 to-purple-500',
    gradientColors: ['#f472b6', '#a855f7'],
    mood: 'Sweet and colorful',
    description: 'Extra playful with a party-first, high-energy tone.',
  },
  {
    key: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    primary: 'from-indigo-500 to-violet-600',
    gradientColors: ['#6366f1', '#7c3aed'],
    mood: 'Moody and luxe',
    description: 'Dark, rich colors that make photos and messages feel premium.',
  },
];

export const builtInThemeMap = Object.fromEntries(
  builtInThemeOptions.map((theme) => [theme.key, theme]),
) as Record<string, BuiltInThemeOption>;

export const visualThemeConfig = {
  elegant: {
    emoji: '✨',
    colors: ['#fbbf24', '#f97316', '#fef3c7'],
    font: 'font-serif',
    heroClass: 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-100',
    titleClass: 'font-serif text-amber-900',
    cardClass: 'bg-white/78 border-amber-200/70',
    text: 'text-amber-950',
  },
  playful: {
    emoji: '🎈',
    colors: ['#ec4899', '#a855f7', '#f9a8d4'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100',
    titleClass: 'text-pink-800',
    cardClass: 'bg-white/78 border-pink-200/70',
    text: 'text-pink-950',
  },
  minimalist: {
    emoji: '🎯',
    colors: ['#94a3b8', '#64748b', '#e2e8f0'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-slate-50 to-gray-100',
    titleClass: 'text-slate-900',
    cardClass: 'bg-white/82 border-slate-200/80',
    text: 'text-slate-950',
  },
  retro: {
    emoji: '🌈',
    colors: ['#06b6d4', '#a855f7', '#f0abfc'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-cyan-100 via-purple-100 to-pink-100',
    titleClass: 'text-purple-900',
    cardClass: 'bg-white/76 border-cyan-200/80',
    text: 'text-purple-950',
  },
  tropical: {
    emoji: '🌴',
    colors: ['#22c55e', '#eab308', '#10b981'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-green-100 via-yellow-50 to-emerald-100',
    titleClass: 'text-emerald-900',
    cardClass: 'bg-white/78 border-green-200/80',
    text: 'text-emerald-950',
  },
  cosmic: {
    emoji: '🚀',
    colors: ['#8b5cf6', '#3b82f6', '#a78bfa'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-violet-950 via-indigo-950 to-purple-950',
    titleClass: 'text-violet-100',
    cardClass: 'bg-white/10 border-white/14',
    text: 'text-white',
  },
  sunset: {
    emoji: '🌅',
    colors: ['#f97316', '#ef4444', '#fbbf24'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-orange-200 via-rose-200 to-amber-200',
    titleClass: 'text-rose-900',
    cardClass: 'bg-white/78 border-orange-200/80',
    text: 'text-rose-950',
  },
  ocean: {
    emoji: '🌊',
    colors: ['#0ea5e9', '#06b6d4', '#38bdf8'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-sky-200 via-cyan-100 to-blue-200',
    titleClass: 'text-sky-900',
    cardClass: 'bg-white/78 border-sky-200/80',
    text: 'text-sky-950',
  },
  candyland: {
    emoji: '🍭',
    colors: ['#f472b6', '#c084fc', '#a3e635'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-pink-200 via-purple-100 to-lime-100',
    titleClass: 'text-fuchsia-900',
    cardClass: 'bg-white/78 border-pink-200/80',
    text: 'text-fuchsia-950',
  },
  midnight: {
    emoji: '🌙',
    colors: ['#6366f1', '#4f46e5', '#818cf8'],
    font: 'font-serif',
    heroClass: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950',
    titleClass: 'text-indigo-100 font-serif',
    cardClass: 'bg-white/8 border-white/12',
    text: 'text-white',
  },
} as const;

export const fontClassMap: Record<string, string> = {
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
