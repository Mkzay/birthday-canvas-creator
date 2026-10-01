import type { StickerData } from '@/components/StickerPicker';

export interface PublicBirthdayPageData {
  id: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  theme_emoji: string | null;
  theme_gradient_from: string | null;
  theme_gradient_to: string | null;
  theme_gradient_mid?: string | null;
  theme_gradient_angle?: number | null;
  theme_font?: string | null;
  allow_photos: boolean;
  allow_audio: boolean;
  require_names: boolean;
  can_contribute: boolean;
  message_count: number;
  pool_fundraising_enabled: boolean;
  pool_goal_kobo: number | null;
  pooled_amount_kobo: number;
  pool_description: string | null;
  display_mode?: string | null;
  letter_theme?: string | null;
  cover_photo_url?: string | null;
}

export interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

export interface ContributionDraft {
  senderName: string;
  message: string;
  poolAmountNaira: string;
  poolContributorEmail: string;
  stickers: StickerData[];
  updatedAt: number;
}
