import type { Request } from "express";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}
