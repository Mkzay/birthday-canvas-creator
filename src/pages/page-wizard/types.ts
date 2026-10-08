export type Theme = string;
export type DisplayMode = 'story' | 'freeform' | 'bento';
export type Step = 1 | 2 | 3;

export interface CustomTheme {
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

export interface BankOption {
  code: string;
  name: string;
}

export type PaystackBankOption = BankOption;
