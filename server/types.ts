import type { Request } from "express";

export interface SessionUser {
  id: string;
  email: string;
  planTier: "free" | "pro";
  emailVerifiedAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  defaultTheme: string;
  defaultAllowPhotos: boolean;
  defaultAllowAudio: boolean;
  defaultRequireNames: boolean;
  emailNotifications: boolean;
  newMessageNotifications: boolean;
  birthdayReminders: boolean;
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}
