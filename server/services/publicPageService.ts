import type express from "express";
import type { Response } from "express";
import crypto from "node:crypto";

export const PUBLIC_UNLOCK_COOKIE_NAME = "wishcanvas_public_unlock";
export const FREE_CONTRIBUTOR_LIMIT = 6;
export const EXPORTS_DISABLED_IN_PRODUCTION = process.env.NODE_ENV === "production";

export function getPublicUnlockSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export function buildPublicUnlockToken(pageId: string, revealPinHash: string): string {
  return crypto.createHmac("sha256", getPublicUnlockSecret()).update(`${pageId}:${revealPinHash}`).digest("hex");
}

export function hasValidPublicUnlock(
  request: express.Request,
  pageId: string,
  revealPinHash: string | null | undefined,
): boolean {
  if (!revealPinHash) return true;

  const rawCookie = request.cookies?.[PUBLIC_UNLOCK_COOKIE_NAME];
  if (typeof rawCookie !== "string" || !rawCookie.includes(".")) {
    return false;
  }

  const [cookiePageId, providedToken] = rawCookie.split(".");
  if (!cookiePageId || !providedToken || cookiePageId !== pageId) {
    return false;
  }

  const expectedToken = buildPublicUnlockToken(pageId, revealPinHash);
  const providedBuffer = Buffer.from(providedToken, "hex");
  const expectedBuffer = Buffer.from(expectedToken, "hex");
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function setPublicUnlockCookie(response: Response, pageId: string, revealPinHash: string): void {
  const inProduction = process.env.NODE_ENV === "production";
  const token = buildPublicUnlockToken(pageId, revealPinHash);
  response.cookie(PUBLIC_UNLOCK_COOKIE_NAME, `${pageId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: inProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function extractWishEditToken(request: express.Request): string | null {
  const customHeader = request.headers["x-wish-edit-token"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }
  const authHeader = request.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  return null;
}

export function verifyEditToken(rawToken: string, storedHash: string): boolean {
  if (!rawToken || !storedHash) return false;
  const computedHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  const storedBuf = Buffer.from(storedHash, "hex");
  const computedBuf = Buffer.from(computedHash, "hex");
  if (storedBuf.length !== computedBuf.length) return false;
  return crypto.timingSafeEqual(storedBuf, computedBuf);
}

const tokenEditRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkTokenEditRateLimit(tokenHash: string): boolean {
  const now = Date.now();
  if (tokenEditRateLimitStore.size > 2000) {
    for (const [k, v] of tokenEditRateLimitStore.entries()) {
      if (v.resetAt <= now) {
        tokenEditRateLimitStore.delete(k);
      }
    }
    while (tokenEditRateLimitStore.size > 2000) {
      const oldestKey = tokenEditRateLimitStore.keys().next().value;
      if (!oldestKey) break;
      tokenEditRateLimitStore.delete(oldestKey);
    }
  }
  const entry = tokenEditRateLimitStore.get(tokenHash);
  if (!entry || entry.resetAt <= now) {
    tokenEditRateLimitStore.set(tokenHash, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 15) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function isCanvasWishLocked(page: {
  status?: string | null;
  reveal_at?: string | Date | null;
  close_date?: string | Date | null;
  birthday_date?: string | Date | null;
  can_contribute?: boolean | null;
}): { isLocked: boolean; reason?: string } {
  if (page.status === "delivered") {
    return { isLocked: true, reason: "This canvas has been delivered to the recipient and is now sealed." };
  }
  if (page.reveal_at && new Date() >= new Date(page.reveal_at)) {
    return { isLocked: true, reason: "The reveal time for this canvas has passed and wishes are now locked." };
  }
  if (page.can_contribute === false) {
    return { isLocked: true, reason: "Contributions for this canvas have closed." };
  }
  return { isLocked: false };
}
