export interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  gradient_mid: string | null;
  gradient_angle: number;
  accent_color: string | null;
  font: string;
  icon_url?: string | null;
}
