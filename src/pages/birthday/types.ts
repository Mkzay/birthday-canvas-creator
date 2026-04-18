export interface BirthdayPageData {
  id: string;
  public_code?: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  letter_theme?: string | null;
  display_mode?: 'story' | 'freeform' | 'bento';
  theme_emoji?: string | null;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
  theme_gradient_mid?: string | null;
  theme_gradient_angle?: number | null;
  theme_accent_color?: string | null;
  theme_font?: string | null;
  letter_theme_gradient_from?: string | null;
  letter_theme_gradient_to?: string | null;
  letter_theme_gradient_mid?: string | null;
  letter_theme_gradient_angle?: number | null;
  letter_color?: string | null;
  creator_message: string | null;
  cover_photo_url: string | null;
  soundtrack_id?: string | null;
  custom_audio_url?: string | null;
  allow_photos?: boolean;
  require_names?: boolean;
  is_revealed?: boolean;
  requires_unlock?: boolean;
  is_unlocked?: boolean;
  owner_plan_tier?: 'free' | 'pro';
  message_count?: number;
  pool_fundraising_enabled?: boolean;
  pool_goal_kobo?: number | null;
  pooled_amount_kobo?: number | null;
  pool_description?: string | null;
}

export interface PublicPoolSummary {
  pool_fundraising_enabled: boolean;
  pool_goal_kobo: number | null;
  pooled_amount_kobo: number;
  pool_description: string | null;
  contributors: string[];
  is_requested?: boolean;
}

export interface PrivatePoolSummary extends PublicPoolSummary {
  is_requested: boolean;
  is_released: boolean;
}

export interface PoolSummaryState {
  pool_fundraising_enabled: boolean;
  pool_goal_kobo: number | null;
  pooled_amount_kobo: number;
  pool_description: string | null;
  contributors: string[];
  is_requested: boolean;
  is_released: boolean;
}

export interface MessagePhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order?: number;
}

export interface MessageSticker {
  id: string;
  sticker_type: string;
  position_x: number;
  position_y: number;
  rotation: number;
  scale: number;
}

export interface Message {
  id: string;
  sender_name: string;
  message: string;
  photo_url?: string | null;
  audio_url?: string | null;
  photos?: MessagePhoto[];
  stickers?: MessageSticker[];
  created_at: string;
}

export type ExpandedPhoto = {
  url: string;
  caption: string | null;
  senderName: string;
} | null;

export type RevealPhase = 'idle' | 'opening' | 'burst';

export type RevealSlide =
  | { id: string; kind: 'cover' }
  | { id: string; kind: 'stats' }
  | { id: string; kind: 'organizer' }
  | { id: string; kind: 'wish'; message: Message; index: number }
  | { id: string; kind: 'closing' };

export type PageDisplayMode = 'story' | 'freeform' | 'bento';

export interface BirthdayPageProps {
  isPreview?: boolean;
  showRevealIntroInPreview?: boolean;
}

export type PendingDeleteAction =
  | { kind: 'message'; messageId: string; senderName: string }
  | { kind: 'photo'; photoId: string; messageId: string; senderName: string }
  | { kind: 'audio'; messageId: string; senderName: string };
