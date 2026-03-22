import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import { sql } from "./db";
import type { AuthedRequest, SessionUser } from "./types";

const ACCESS_COOKIE_NAME = "wishcanvas_access";
const REFRESH_COOKIE_NAME = "wishcanvas_refresh";
const ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;
/** Sliding idle expiry for all sessions (30-day inactivity logout, capped by absolute_expires_at). */
const DEFAULT_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REMEMBER_ME_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ABSOLUTE_SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000;

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return value.toLowerCase() === "true";
}

function getCookieOptions(maxAgeMs: number) {
  const inProduction = process.env.NODE_ENV === "production";
  const configuredSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  // Default Strict for CSRF protection. Use COOKIE_SAME_SITE=lax|none if API and SPA are on different sites.
  const sameSite = configuredSameSite === "strict" || configuredSameSite === "lax" || configuredSameSite === "none"
    ? configuredSameSite
    : "strict";
  const secure = readBooleanEnv(process.env.COOKIE_SECURE, sameSite === "none" || inProduction);
  // When COOKIE_DOMAIN is explicitly set, honour it (e.g. ".example.com" for production).
  // Otherwise leave domain undefined so the browser scopes the cookie to the request's
  // own origin — this lets Vercel preview deployments (*.vercel.app) authenticate against
  // the Railway backend without needing a per-preview COOKIE_DOMAIN update.
  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    sameSite,
    secure,
    domain,
    maxAge: maxAgeMs,
  } as const;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addMilliseconds(date: Date, milliseconds: number) {
  return new Date(date.getTime() + milliseconds);
}

function getRefreshWindowMs(rememberMe: boolean) {
  return rememberMe ? REMEMBER_ME_REFRESH_TOKEN_TTL_MS : DEFAULT_REFRESH_TOKEN_TTL_MS;
}

function clampSessionExpiry(now: Date, absoluteExpiresAt: Date, rememberMe: boolean) {
  const refreshWindowExpiry = addMilliseconds(now, getRefreshWindowMs(rememberMe));
  return refreshWindowExpiry < absoluteExpiresAt ? refreshWindowExpiry : absoluteExpiresAt;
}

function sessionUserFromRow(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    email: String(row.email),
    planTier: row.plan_tier === "pro" ? "pro" : "free",
    emailVerifiedAt: typeof row.email_verified_at === "string" ? row.email_verified_at : null,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    defaultTheme: typeof row.default_theme === "string" ? row.default_theme : "elegant",
    defaultAllowPhotos: Boolean(row.default_allow_photos ?? true),
    defaultAllowAudio: Boolean(row.default_allow_audio ?? true),
    defaultRequireNames: Boolean(row.default_require_names ?? true),
    emailNotifications: Boolean(row.email_notifications ?? true),
    newMessageNotifications: Boolean(row.new_message_notifications ?? true),
    birthdayReminders: Boolean(row.birthday_reminders ?? true),
  };
}

async function loadSessionUser(userId: string) {
  const rows = await sql`
    SELECT id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (!rows[0]) {
    return null;
  }

  return sessionUserFromRow(rows[0]);
}

async function createRefreshSession(userId: string, rememberMe = false) {
  const now = new Date();
  const issuedAt = now;
  const absoluteExpiresAt = addMilliseconds(now, ABSOLUTE_SESSION_TTL_MS);
  const expiresAt = clampSessionExpiry(now, absoluteExpiresAt, rememberMe);
  const sessionId = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);

  await sql`
    INSERT INTO auth_sessions (
      id,
      user_id,
      refresh_token_hash,
      remember_me,
      issued_at,
      last_used_at,
      expires_at,
      absolute_expires_at
    )
    VALUES (
      ${sessionId},
      ${userId},
      ${refreshTokenHash},
      ${rememberMe},
      ${issuedAt.toISOString()},
      ${issuedAt.toISOString()},
      ${expiresAt.toISOString()},
      ${absoluteExpiresAt.toISOString()}
    )
  `;

  return { sessionId, refreshToken, expiresAt };
}

async function touchSessionById(sessionId: string) {
  const rows = await sql`
    UPDATE auth_sessions
    SET last_used_at = NOW(),
        expires_at = CASE
          WHEN absolute_expires_at < NOW() + INTERVAL '30 days' AND remember_me THEN absolute_expires_at
          WHEN remember_me THEN NOW() + INTERVAL '30 days'
          WHEN absolute_expires_at < NOW() + INTERVAL '30 days' THEN absolute_expires_at
          ELSE NOW() + INTERVAL '30 days'
        END
    WHERE id = ${sessionId}
      AND revoked_at IS NULL
      AND expires_at > NOW()
      AND absolute_expires_at > NOW()
    RETURNING expires_at
  `;

  if (!rows[0]) {
    return null;
  }

  return new Date(String(rows[0].expires_at));
}

/**
 * Validates the current refresh token, issues a new one (rotation), and invalidates the old hash in one UPDATE.
 * Reuse of a stale refresh token after rotation yields no row → caller should clear cookies.
 */
async function rotateRefreshToken(oldRefreshToken: string) {
  const oldHash = hashToken(oldRefreshToken);
  const newRefreshToken = crypto.randomBytes(48).toString("hex");
  const newHash = hashToken(newRefreshToken);

  const rows = await sql`
    UPDATE auth_sessions
    SET refresh_token_hash = ${newHash},
        last_used_at = NOW(),
        expires_at = CASE
          WHEN remember_me AND absolute_expires_at < NOW() + INTERVAL '30 days' THEN absolute_expires_at
          WHEN remember_me THEN NOW() + INTERVAL '30 days'
          WHEN absolute_expires_at < NOW() + INTERVAL '30 days' THEN absolute_expires_at
          ELSE NOW() + INTERVAL '30 days'
        END
    WHERE refresh_token_hash = ${oldHash}
      AND revoked_at IS NULL
      AND expires_at > NOW()
      AND absolute_expires_at > NOW()
    RETURNING id, user_id, expires_at
  `;

  if (!rows[0]) {
    return null;
  }

  return {
    sessionId: String(rows[0].id),
    userId: String(rows[0].user_id),
    expiresAt: new Date(String(rows[0].expires_at)),
    newRefreshToken,
  };
}

async function revokeSessionByRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await sql`
    UPDATE auth_sessions
    SET revoked_at = NOW()
    WHERE refresh_token_hash = ${tokenHash}
      AND revoked_at IS NULL
  `;
}

async function revokeSessionsByUserId(userId: string) {
  await sql`
    UPDATE auth_sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
  `;
}

function signAccessToken(user: SessionUser, sessionId: string) {
  return jwt.sign(
    {
      ...user,
      sessionId,
    },
    getJwtSecret(),
    {
      expiresIn: Math.round(ACCESS_TOKEN_TTL_MS / 1000),
    },
  );
}

function readAccessSession(request: AuthedRequest) {
  const token = request.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser & { sessionId: string };
  } catch {
    return null;
  }
}

function setAccessCookie(response: Response, token: string) {
  response.cookie(ACCESS_COOKIE_NAME, token, getCookieOptions(ACCESS_TOKEN_TTL_MS));
}

function setRefreshCookie(response: Response, token: string, expiresAt: Date) {
  const maxAge = Math.max(1000, expiresAt.getTime() - Date.now());
  response.cookie(REFRESH_COOKIE_NAME, token, getCookieOptions(maxAge));
}

export function clearAuthCookies(response: Response) {
  const { maxAge: _accessMaxAge, ...accessOptions } = getCookieOptions(ACCESS_TOKEN_TTL_MS);
  const { maxAge: _refreshMaxAge, ...refreshOptions } = getCookieOptions(REMEMBER_ME_REFRESH_TOKEN_TTL_MS);
  response.clearCookie(ACCESS_COOKIE_NAME, accessOptions);
  response.clearCookie(REFRESH_COOKIE_NAME, refreshOptions);
}

export async function issueAuthSession(response: Response, user: SessionUser, rememberMe = false) {
  const session = await createRefreshSession(user.id, rememberMe);
  const accessToken = signAccessToken(user, session.sessionId);

  setAccessCookie(response, accessToken);
  setRefreshCookie(response, session.refreshToken, session.expiresAt);
}

async function refreshFromAccess(request: AuthedRequest, response?: Response) {
  const session = readAccessSession(request);
  if (!session) return null;

  const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    const touched = await touchSessionById(session.sessionId);
    if (touched && response) {
      setRefreshCookie(response, refreshToken, touched);
    }
  }

  const { sessionId: _sessionId, ...user } = session;
  return user;
}

async function refreshFromRefreshToken(request: AuthedRequest, response?: Response) {
  const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) return null;

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    if (response) clearAuthCookies(response);
    return null;
  }

  const user = await loadSessionUser(rotated.userId);
  if (!user) {
    if (response) clearAuthCookies(response);
    return null;
  }

  if (response) {
    const accessToken = signAccessToken(user, rotated.sessionId);
    setAccessCookie(response, accessToken);
    setRefreshCookie(response, rotated.newRefreshToken, rotated.expiresAt);
  }

  return user;
}

export async function getActiveSession(request: AuthedRequest, response?: Response) {
  const fromAccess = await refreshFromAccess(request, response);
  if (fromAccess) return fromAccess;

  return refreshFromRefreshToken(request, response);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(user: SessionUser) {
  // Backwards-compatible helper for any legacy callers.
  return signAccessToken(user, crypto.randomUUID());
}

export function setSessionCookie(response: Response, token: string) {
  setAccessCookie(response, token);
}

export function clearSessionCookie(response: Response) {
  clearAuthCookies(response);
}

export function readSession(request: AuthedRequest) {
  const session = readAccessSession(request);
  if (!session) return null;

  const { sessionId: _sessionId, ...user } = session;
  return user;
}

export async function requireAuth(request: AuthedRequest, response: Response, next: NextFunction) {
  const session = await getActiveSession(request, response);

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

export async function requireAdmin(request: AuthedRequest, response: Response, next: NextFunction) {
  const session = await getActiveSession(request, response);
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

export async function revokeCurrentSession(request: AuthedRequest) {
  const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) return;

  await revokeSessionByRefreshToken(refreshToken);
}

export async function revokeAllSessionsForUser(userId: string) {
  await revokeSessionsByUserId(userId);
}
