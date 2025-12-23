export type Theme = 'elegant' | 'playful' | 'minimalist' | 'retro';

export interface Message {
  id: string;
  senderName: string;
  message: string;
  photo?: string;
  timestamp: Date;
}

export interface PageSettings {
  allowPhotos: boolean;
  requireNames: boolean;
  closeDate: Date;
}

export interface BirthdayPage {
  id: string;
  recipientName: string;
  birthdayDate: Date;
  theme: Theme;
  creatorMessage?: string;
  coverPhoto?: string;
  settings: PageSettings;
  messages: Message[];
  status: 'active' | 'delivered' | 'draft';
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export const themeConfig = {
  elegant: {
    name: 'Elegant',
    emoji: '✨',
    colors: {
      primary: 'from-amber-400 to-orange-500',
      secondary: 'from-amber-100 to-orange-100',
      accent: '#fbbf24',
      text: 'text-amber-900',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      card: 'bg-white border-amber-200',
      button: 'bg-gradient-to-r from-amber-400 to-orange-500',
    },
    font: 'font-serif',
  },
  playful: {
    name: 'Playful',
    emoji: '🎈',
    colors: {
      primary: 'from-pink-500 to-purple-500',
      secondary: 'from-pink-100 to-purple-100',
      accent: '#ec4899',
      text: 'text-pink-900',
      bg: 'bg-gradient-to-br from-pink-50 to-purple-50',
      card: 'bg-white border-pink-200',
      button: 'bg-gradient-to-r from-pink-500 to-purple-500',
    },
    font: 'font-sans',
  },
  minimalist: {
    name: 'Minimalist',
    emoji: '🎯',
    colors: {
      primary: 'from-slate-600 to-slate-800',
      secondary: 'from-slate-100 to-slate-200',
      accent: '#64748b',
      text: 'text-slate-900',
      bg: 'bg-gradient-to-br from-slate-50 to-gray-100',
      card: 'bg-white border-slate-200',
      button: 'bg-gradient-to-r from-slate-600 to-slate-800',
    },
    font: 'font-sans',
  },
  retro: {
    name: 'Retro',
    emoji: '🌈',
    colors: {
      primary: 'from-cyan-400 to-purple-500',
      secondary: 'from-cyan-100 to-purple-100',
      accent: '#06b6d4',
      text: 'text-purple-900',
      bg: 'bg-gradient-to-br from-cyan-50 to-purple-50',
      card: 'bg-white border-cyan-200',
      button: 'bg-gradient-to-r from-cyan-400 to-purple-500',
    },
    font: 'font-sans',
  },
} as const;
