import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import type { AuthedRequest, SessionUser } from "./types";

const sessionCookieName = "wishcanvas_session";

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return value.toLowerCase() === "true";
}

function getCookieOptions() {
  const inProduction = process.env.NODE_ENV === "production";
  const configuredSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  const sameSite = configuredSameSite === "strict" || configuredSameSite === "lax" || configuredSameSite === "none"
    ? configuredSameSite
    : inProduction
      ? "none"
      : "lax";
  const secure = readBooleanEnv(process.env.COOKIE_SECURE, sameSite === "none" || inProduction);
  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    sameSite,
    secure,
    domain,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  } as const;
}

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
  response.cookie(sessionCookieName, token, getCookieOptions());
}

export function clearSessionCookie(response: Response) {
  const { maxAge: _maxAge, ...cookieOptions } = getCookieOptions();
  response.clearCookie(sessionCookieName, cookieOptions);
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

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function requireAdmin(request: AuthedRequest, response: Response, next: NextFunction) {
  const session = readSession(request);
  if (!session) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.length) {
    response.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!adminEmails.includes(String(session.email).toLowerCase())) {
    response.status(403).json({ error: "Forbidden" });
    return;
  }

  request.user = session;
  next();
}
