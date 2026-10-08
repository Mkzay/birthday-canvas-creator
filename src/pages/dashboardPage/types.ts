export interface BirthdayPage {
  id: string;
  public_code: string;
  recipient_name: string;
  birthday_date: string;
  close_date: string | null;
  theme: string;
  status: string;
  created_at: string;
  cover_photo_url?: string | null;
  message_count?: number;
  view_count?: number;
  is_owner?: boolean;
  user_role?: 'owner' | 'co_organizer';
}

export type PageAnalytics = {
  view_count: number;
  message_count: number;
  contributor_count: number;
  photo_message_count: number;
  audio_message_count: number;
  last_contribution_at: string | null;
};

export interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
}

export type ThemeDisplay = {
  name: string;
  emoji: string;
  primary: string;
  accent: string;
  isCustom: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  mood?: string;
};
