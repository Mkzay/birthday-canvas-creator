import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import type { AuthedRequest, SessionUser } from "./types";

const sessionCookieName = "wishcanvas_session";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(user: SessionUser) {
  return jwt.sign(user, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function readSession(request: AuthedRequest) {
  const token = request.cookies?.[sessionCookieName];
  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser;
  } catch {
    return null;
  }
}

export function requireAuth(request: AuthedRequest, response: Response, next: NextFunction) {
  const session = readSession(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  request.user = session;
  next();
}
