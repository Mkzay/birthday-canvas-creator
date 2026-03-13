import type { Request } from "express";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  defaultTheme: string;
  defaultAllowPhotos: boolean;
  defaultRequireNames: boolean;
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}
