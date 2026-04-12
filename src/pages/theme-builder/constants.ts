export const EMOJI_OPTIONS = ['🎨', '✨', '🌟', '💫', '🔥', '💖', '🌈', '🎭', '🎪', '🎯', '💎', '🦋', '🌸', '🍀', '⭐', '🌺', '🎵', '🎶', '🌙', '☀️'];

export const FONT_OPTIONS = [
  { value: 'jakarta', label: 'Modern Sans', className: 'font-jakarta', sample: 'Happy Birthday' },
  { value: 'playfair', label: 'Classic Serif', className: 'font-playfair', sample: 'Happy Birthday' },
  { value: 'caveat', label: 'Handwritten', className: 'font-caveat', sample: 'Happy Birthday' },
  { value: 'nunito', label: 'Rounded', className: 'font-nunito', sample: 'Happy Birthday' },
  { value: 'sora', label: 'Display', className: 'font-sora', sample: 'Happy Birthday' },
  { value: 'cormorant', label: 'Elegant Serif', className: 'font-cormorant', sample: 'Happy Birthday' },
  { value: 'space-grotesk', label: 'Grotesk', className: 'font-space-grotesk', sample: 'Happy Birthday' },
  { value: 'dm-serif', label: 'Bold Serif', className: 'font-dm-serif', sample: 'Happy Birthday' },
  { value: 'inter', label: 'Neutral', className: 'font-inter', sample: 'Happy Birthday' },
  { value: 'outfit', label: 'Soft Modern', className: 'font-outfit', sample: 'Happy Birthday' },
] as const;

export const ANGLE_OPTIONS = [
  { value: 0, label: '↑' },
  { value: 45, label: '↗' },
  { value: 90, label: '→' },
  { value: 135, label: '↘' },
  { value: 180, label: '↓' },
  { value: 225, label: '↙' },
  { value: 270, label: '←' },
  { value: 315, label: '↖' },
] as const;

export const FREE_THEME_LIMIT = 3;
export const PREMIUM_THEME_FONTS = new Set(['caveat', 'sora', 'cormorant', 'space-grotesk', 'dm-serif']);
