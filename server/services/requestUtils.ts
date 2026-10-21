import express, { type Response } from "express";
import fs from "node:fs/promises";
import { isAdminEmail, issueAuthSession, sessionUserFromRow } from "../auth";
import type { SessionUser } from "../types";
import { validateImageMagicBytes, validateAudioMagicBytes } from "../fileSignatures";
import { issueEmailToken, revokeOutstandingEmailTokens } from "../emailTokens";
import { sendVerificationEmail } from "../emailFlows";

export function logRequestFailure(scope: string, details: Record<string, unknown>) {
  console.warn(`[${scope}]`, JSON.stringify(details));
}

export function getRequestIp(request: express.Request): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.ip || "unknown";
}

export function routeParamString(value: string | string[] | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export function sanitizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

export function sanitizeBankCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[a-zA-Z0-9]{2,12}$/.test(trimmed) ? trimmed : null;
}

export function sanitizeAccountNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 20 ? digits : null;
}

export function sanitizeAmountKobo(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n) || n < 0 || n > 500000000) return null;
  return n;
}

export function sanitizePublicCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/.test(normalized)) return null;
  return normalized;
}

export async function rejectInvalidUpload(
  file: Express.Multer.File,
  kind: "image" | "audio",
  response: Response,
  logScope: string,
): Promise<boolean> {
  const ok = kind === "image"
    ? (file.path.startsWith("http") ? true : await validateImageMagicBytes(file.path))
    : (file.path.startsWith("http") ? true : await validateAudioMagicBytes(file.path));

  if (ok) {
    return true;
  }

  if (!file.path.startsWith("http")) {
    await fs.rm(file.path, { force: true });
  }

  logRequestFailure(logScope, { reason: "invalid-file-signature", filename: file.filename });
  response.status(400).json({ error: "Invalid or corrupted file upload" });
  return false;
}

export async function sendAuth(response: Response, user: SessionUser, rememberMe = false) {
  await issueAuthSession(response, user, rememberMe);
  response.json({ user });
}

export async function sendVerificationEmailForUser(row: Record<string, unknown>) {
  const userId = String(row.id);
  await revokeOutstandingEmailTokens(userId, "verify_email");
  const issued = await issueEmailToken({ userId, purpose: "verify_email" });
  await sendVerificationEmail({
    to: String(row.email),
    token: issued.token,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
  });
}

export { sessionUserFromRow };

export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function getAllowedOrigins(): string[] {
  const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:8080";
  return rawOrigins
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

export function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  const normalizedRequestOrigin = normalizeOrigin(origin);
  if (!normalizedRequestOrigin) return false;

  if (allowedOrigins.includes(normalizedRequestOrigin)) {
    return true;
  }

  return false;
}

export function getClientOriginForRequest(request: express.Request): string {
  const allowed = getAllowedOrigins();
  const requestOrigin = typeof request.headers.origin === "string"
    ? normalizeOrigin(request.headers.origin)
    : null;

  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowed[0] || "http://localhost:8080";
}

export function hasProThemeAccess(user: SessionUser): boolean {
  return user.planTier === "pro";
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
