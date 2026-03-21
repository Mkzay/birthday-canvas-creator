import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import type { Response } from "express";
import * as Sentry from "@sentry/node";
import {
  clearSessionCookie,
  getActiveSession,
  hashPassword,
  issueAuthSession,
  requireAdmin,
  requireAuth,
  revokeAllSessionsForUser,
  revokeCurrentSession,
  verifyPassword,
} from "./auth";
import { initializeDatabase, sql } from "./db";
import type { AuthedRequest, SessionUser } from "./types";
import { avatarUpload, coverUpload, fileUrl, messageUpload, pageAudioUpload, removeFileByUrl, uploadsRoot, wishAudioUpload, themeIconUpload, ensureUploadDirs, normalizeCoverUpload } from "./uploads";
import sanitizeHtml from "sanitize-html";
import { isMailerConfigured, sendTransactionalEmail } from "./mailer";
import { consumeEmailToken, issueEmailToken, revokeOutstandingEmailTokens } from "./emailTokens";
import {
  sendBirthdayRecipientEmail,
  sendBirthdayReminderEmail,
  sendNewMessageAlertEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "./emailFlows";
import { exposeErrorToClient } from "./errors";
import { securityHeadersMiddleware } from "./securityHeaders";
import { validateImageMagicBytes, validateAudioMagicBytes } from "./fileSignatures";
import { validateBody, validateParams } from "./validateRequest";
import {
  signupBodySchema,
  loginBodySchema,
  emailBodySchema,
  tokenBodySchema,
  passwordResetConfirmBodySchema,
  profilePatchBodySchema,
  preferencesPatchBodySchema,
  notificationsPatchBodySchema,
  passwordChangeBodySchema,
  themeCreateBodySchema,
  themePatchBodySchema,
  pageCreateBodySchema,
  pagePatchBodySchema,
  publicMessageBodySchema,
  uploadPageIdBodySchema,
  systemTestEmailBodySchema,
  birthdayNotifyBodySchema,
  cronNotifyBodySchema,
  pageIdParamSchema,
  themeIdParamSchema,
  pageMessageParamsSchema,
  pagePhotoParamsSchema,
} from "./schemas";
import {
  createGlobalApiLimiter,
  authSignupLimiter,
  authLoginLimiter,
  authSessionLimiter,
  authLogoutLimiter,
  authVerifySendLimiter,
  authVerifyConfirmLimiter,
  authPasswordResetRequestLimiter,
  authPasswordResetConfirmLimiter,
  authNotificationsLimiter,
  systemTestEmailLimiter,
  systemBirthdayNotifyLimiter,
  systemBirthdayCronLimiter,
  publicPhotoUploadLimiter,
  publicAudioUploadLimiter,
  publicMessageLimiter,
  healthEndpointLimiter,
} from "./rateLimits";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);

if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
  });
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    // Normalize to origin so values like https://site.com/ still match.
    return new URL(trimmed).origin;
  } catch {
    // Keep fallback behavior for already-origin-like strings.
    return trimmed.replace(/\/+$/, "");
  }
}

function getAllowedOrigins() {
  const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:8080";
  return rawOrigins
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  const normalizedRequestOrigin = normalizeOrigin(origin);
  if (normalizedRequestOrigin && allowedOrigins.includes(normalizedRequestOrigin)) {
    return true;
  }

  if (process.env.ALLOW_VERCEL_PREVIEWS === "true" && /^https:\/\/.*\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

const allowedOrigins = getAllowedOrigins();
const loginFailureStore = new Map<string, { count: number; lockedUntil: number | null }>();

function shouldLogRequest(request: express.Request, status: number, durationMs: number) {
  if (status >= 500) return true;
  if (durationMs >= 750) return true;
  if (status >= 400 && /^\/api\/(auth|uploads)\b/i.test(request.path)) return true;
  return false;
}

function logRequestFailure(scope: string, details: Record<string, unknown>) {
  console.warn(`[${scope}]`, JSON.stringify(details));
}

function getRequestIp(request: express.Request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.ip || "unknown";
}

function routeParamString(value: string | string[] | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(securityHeadersMiddleware);
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use((request, response, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  (request as express.Request & { requestId?: string }).requestId = requestId;
  response.setHeader("x-request-id", requestId);

  response.on("finish", () => {
    const durationMs = Date.now() - start;
    if (!shouldLogRequest(request, response.statusCode, durationMs)) return;

    const authed = request as AuthedRequest;
    const userId = authed.user?.id;

    console.warn(JSON.stringify({
      scope: "request",
      requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      duration_ms: durationMs,
      ip: getRequestIp(request),
      userId,
    }));
  });

  next();
});
app.use(express.json({ limit: "2mb" }));
app.use("/api", createGlobalApiLimiter());
app.use("/uploads", express.static(uploadsRoot));

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function rejectInvalidUpload(
  file: Express.Multer.File,
  kind: "image" | "audio",
  response: Response,
  logScope: string,
): Promise<boolean> {
  const ok = kind === "image" ? await validateImageMagicBytes(file.path) : await validateAudioMagicBytes(file.path);
  if (ok) {
    return true;
  }
  await fs.rm(file.path, { force: true });
  logRequestFailure(logScope, { reason: "invalid-file-signature", filename: file.filename });
  response.status(400).json({ error: "Invalid or corrupted file upload" });
  return false;
}

function sanitizeDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function sanitizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

async function sendAuth(response: Response, user: SessionUser, rememberMe = false) {
  await issueAuthSession(response, user, rememberMe);
  response.json({ user });
}

async function sendVerificationEmailForUser(row: Record<string, unknown>) {
  const userId = String(row.id);
  await revokeOutstandingEmailTokens(userId, "verify_email");
  const issued = await issueEmailToken({ userId, purpose: "verify_email" });
  await sendVerificationEmail({
    to: String(row.email),
    token: issued.token,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
  });
}

function sessionUserFromRow(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    email: String(row.email),
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

function parsePageTheme(theme: string) {
  return theme.startsWith("custom_") ? theme.slice("custom_".length) : null;
}

function sanitizePhotoCaption(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 140) : null;
}

function normalizeContributionPhotos(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 6)
    .map((photo, index) => {
      if (!photo || typeof photo !== "object") return null;

      const url = typeof photo.url === "string" ? photo.url.trim() : "";
      if (!url) return null;

      return {
        url,
        caption: sanitizePhotoCaption(photo.caption),
        sortOrder: index,
      };
    })
    .filter(Boolean);
}

function formatDateOnly(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function serializePageDates<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    birthday_date: formatDateOnly(row.birthday_date),
    close_date: formatDateOnly(row.close_date),
  };
}

function buildPublicCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}

async function createUniquePublicCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildPublicCode();
    const rows = await sql`
      SELECT id
      FROM birthday_pages
      WHERE public_code = ${candidate}
      LIMIT 1
    `;

    if (!rows[0]) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique public code");
}

async function resolvePageId(identifier: string) {
  const publicCodeRows = await sql`
    SELECT id
    FROM birthday_pages
    WHERE public_code = ${identifier}
    LIMIT 1
  `;

  if (publicCodeRows[0]) {
    return String(publicCodeRows[0].id);
  }

  if (/^[0-9a-f-]{36}$/i.test(identifier)) {
    const uuidRows = await sql`
      SELECT id
      FROM birthday_pages
      WHERE id = ${identifier}
      LIMIT 1
    `;
    if (uuidRows[0]) {
      return String(uuidRows[0].id);
    }
  }

  return null;
}

async function fetchMessagesForPage(pageId: string) {
  const rows = await sql`
    SELECT
      bm.id AS message_id,
      bm.sender_name,
      bm.message,
      bm.photo_url AS legacy_photo_url,
      bm.audio_url,
      bm.created_at,
      bmp.id AS photo_id,
      bmp.photo_url,
      bmp.caption,
      bmp.sort_order
    FROM birthday_messages bm
    LEFT JOIN birthday_message_photos bmp ON bmp.message_id = bm.id
    WHERE bm.page_id = ${pageId}
    ORDER BY bm.created_at ASC, bmp.sort_order ASC, bmp.created_at ASC
  `;

  const messages = new Map<string, Record<string, unknown>>();

  rows.forEach((row) => {
    const messageId = String(row.message_id);

    if (!messages.has(messageId)) {
      messages.set(messageId, {
        id: messageId,
        sender_name: String(row.sender_name),
        message: String(row.message),
        photo_url: typeof row.legacy_photo_url === "string" ? row.legacy_photo_url : null,
        audio_url: typeof row.audio_url === "string" ? row.audio_url : null,
        created_at: row.created_at,
        photos: [],
      });
    }

    const currentMessage = messages.get(messageId)!;
    const photos = currentMessage.photos as Array<Record<string, unknown>>;

    if (row.photo_id) {
      photos.push({
        id: String(row.photo_id),
        photo_url: String(row.photo_url),
        caption: typeof row.caption === "string" ? row.caption : null,
        sort_order: Number(row.sort_order || 0),
      });
    }
  });

  return Array.from(messages.values()).map((message) => {
    const photos = message.photos as Array<Record<string, unknown>>;
    const legacyPhotoUrl = typeof message.photo_url === "string" ? message.photo_url : null;

    if (!photos.length && legacyPhotoUrl) {
      return {
        ...message,
        photos: [
          {
            id: `legacy-${message.id}`,
            photo_url: legacyPhotoUrl,
            caption: null,
            sort_order: 0,
          },
        ],
      };
    }

    return message;
  });
}

function publicPageQuery(pageId: string) {
  return sql`
    SELECT
      bp.id,
      bp.public_code,
      bp.recipient_name,
      bp.birthday_date,
      bp.theme,
      bp.letter_color,
      ct.emoji AS theme_emoji,
      ct.gradient_from AS theme_gradient_from,
      ct.gradient_to AS theme_gradient_to,
      ct.gradient_mid AS theme_gradient_mid,
      ct.gradient_angle AS theme_gradient_angle,
      ct.accent_color AS theme_accent_color,
      ct.font AS theme_font,
      CASE WHEN CURRENT_DATE >= bp.birthday_date THEN bp.creator_message ELSE NULL END AS creator_message,
      bp.cover_photo_url,
      bp.soundtrack_id,
      bp.custom_audio_url,
      bp.allow_photos,
      bp.allow_audio,
      bp.require_names,
      bp.close_date,
      CURRENT_DATE >= bp.birthday_date AS is_revealed,
      CURRENT_DATE <= COALESCE(bp.close_date, bp.birthday_date) AND bp.status = 'active' AS can_contribute,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    LEFT JOIN custom_themes ct ON bp.theme = CONCAT('custom_', ct.id::text)
    WHERE bp.id = ${pageId}
      AND bp.status = 'active'
    GROUP BY bp.id, ct.id
  `;
}

function privatePageQuery(pageId: string, userId: string) {
  return sql`
    SELECT
      bp.*,
      ct.emoji AS theme_emoji,
      ct.gradient_from AS theme_gradient_from,
      ct.gradient_to AS theme_gradient_to,
      ct.gradient_mid AS theme_gradient_mid,
      ct.gradient_angle AS theme_gradient_angle,
      ct.accent_color AS theme_accent_color,
      ct.font AS theme_font,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    LEFT JOIN custom_themes ct ON bp.theme = CONCAT('custom_', ct.id::text)
    WHERE (bp.id::text = ${pageId} OR bp.public_code = ${pageId})
      AND bp.user_id = ${userId}
      AND bp.owner_deleted IS NOT TRUE
    GROUP BY bp.id, ct.id
  `;
}

async function buildHealthPayload() {
  const startedAt = Date.now();

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
    return Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          reject(new Error("timeout"));
        }, timeoutMs);
      }),
    ]);
  };

  const checkDb = async () => {
    const start = Date.now();
    try {
      await withTimeout(sql`SELECT 1`, 1500);
      return { ok: true, latency_ms: Date.now() - start };
    } catch (error) {
      return { ok: false, latency_ms: Date.now() - start, error: error instanceof Error ? error.message : "unknown" };
    }
  };

  const checkUploads = async () => {
    try {
      await fs.access(uploadsRoot);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "unknown" };
    }
  };

  const [db, uploads] = await Promise.all([checkDb(), checkUploads()]);
  const ok = Boolean(db.ok && uploads.ok);

  return {
    ok,
    checks: { db, uploads },
    services: {
      email_configured: isMailerConfigured(),
    },
    ts: new Date().toISOString(),
    latency_ms: Date.now() - startedAt,
  };
}

app.get("/api/health", healthEndpointLimiter, async (_request, response) => {
  const payload = await buildHealthPayload();
  response.status(payload.ok ? 200 : 503).json(payload);
});

app.get("/api/system/status", requireAdmin, async (_request, response) => {
  const payload = await buildHealthPayload();
  response.status(payload.ok ? 200 : 503).json({
    ...payload,
    meta: {
      node_env: process.env.NODE_ENV || "development",
    },
  });
});

app.post("/api/system/test-email", requireAdmin, systemTestEmailLimiter, validateBody(systemTestEmailBodySchema), async (request: AuthedRequest, response) => {
  const defaultRecipient = request.user?.email || "";
  const to = typeof request.body.to === "string" ? request.body.to.trim() : defaultRecipient;

  if (!to || !to.includes("@")) {
    response.status(400).json({ error: "Please provide a valid recipient email." });
    return;
  }

  const appName = process.env.APP_NAME || "WishCanvas";
  const subject = typeof request.body.subject === "string" && request.body.subject.trim()
    ? request.body.subject.trim()
    : `${appName} Resend test`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Resend is connected</h2>
      <p style="margin: 0 0 12px;">This is a test email from ${appName}.</p>
      <p style="margin: 0; color: #6b7280; font-size: 13px;">Sent at ${new Date().toISOString()}</p>
    </div>
  `;

  const text = `Resend is connected. This is a test email from ${appName}. Sent at ${new Date().toISOString()}`;

  try {
    const result = await sendTransactionalEmail({
      to,
      subject,
      html,
      text,
      tags: [{ name: "type", value: "system-test" }],
    });

    response.json({ ok: true, id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test email";
    logRequestFailure("email-test", { to, message });
    response.status(500).json({ error: exposeErrorToClient(error, "Failed to send test email.") });
  }
});

async function sendBirthdayNotifications(targetDate: string | null) {
  const normalizedDate = targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null;
  if (!isMailerConfigured()) {
    throw new Error("Email service is not configured.");
  }

  const rows = await sql`
    SELECT
      bp.id,
      bp.public_code,
      bp.recipient_name,
      bp.recipient_email,
      bp.birthday_date,
      bp.birthday_notified_year,
      COUNT(bm.id)::int AS message_count,
      u.email AS owner_email,
      u.email_notifications,
      u.birthday_reminders,
      u.display_name AS owner_display_name
    FROM birthday_pages bp
    INNER JOIN users u ON u.id = bp.user_id
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    WHERE bp.status = 'active'
      AND bp.owner_deleted IS NOT TRUE
      AND bp.birthday_date = COALESCE(${normalizedDate}::date, CURRENT_DATE)
    GROUP BY bp.id, u.id
  `;

  const currentYear = normalizedDate ? Number(normalizedDate.slice(0, 4)) : new Date().getUTCFullYear();
  const results: Array<{ pageId: string; sent: boolean; reason?: string }> = [];

  for (const row of rows) {
    const pageId = String(row.id);
    const alreadyNotified = Number(row.birthday_notified_year || 0) >= currentYear;
    if (alreadyNotified) {
      results.push({ pageId, sent: false, reason: "already-notified-this-year" });
      continue;
    }

    const toEmail = sanitizeEmail(row.recipient_email) || sanitizeEmail(row.owner_email);
    if (!toEmail) {
      results.push({ pageId, sent: false, reason: "missing-recipient-email" });
      continue;
    }

    try {
      const ownerEmail = sanitizeEmail(row.owner_email);
      const ownerCanReceiveNotifications = Boolean(row.email_notifications ?? true) && Boolean(row.birthday_reminders ?? true);

      if (ownerEmail && ownerCanReceiveNotifications) {
        await sendBirthdayReminderEmail({
          to: ownerEmail,
          recipientName: String(row.recipient_name),
          publicCode: String(row.public_code),
          messageCount: Number(row.message_count || 0),
          birthdayDate: String(row.birthday_date),
          ownerName: typeof row.owner_display_name === "string" ? row.owner_display_name : null,
        });
      }

      await sendBirthdayRecipientEmail({
        to: toEmail,
        recipientName: String(row.recipient_name),
        publicCode: String(row.public_code),
        messageCount: Number(row.message_count || 0),
      });

      await sql`
        UPDATE birthday_pages
        SET birthday_notified_year = ${currentYear}, updated_at = NOW()
        WHERE id = ${pageId}
      `;

      results.push({ pageId, sent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "birthday-email-send-failed";
      logRequestFailure("birthday-notification", { pageId, message });
      results.push({
        pageId,
        sent: false,
        reason: exposeErrorToClient(error, "Email send failed."),
      });
    }
  }

  return {
    ok: true,
    date: normalizedDate || "today",
    total: rows.length,
    sent: results.filter((item) => item.sent).length,
    results,
  };
}

app.post("/api/system/notify-birthdays", requireAdmin, systemBirthdayNotifyLimiter, validateBody(birthdayNotifyBodySchema), async (request, response) => {
  const targetDate = typeof request.body.date === "string" ? request.body.date : null;
  try {
    const payload = await sendBirthdayNotifications(targetDate);
    response.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "birthday-notification-run-failed";
    logRequestFailure("birthday-notification-manual", { message });
    response.status(500).json({ error: exposeErrorToClient(error, "Could not run birthday notifications.") });
  }
});

app.post("/api/system/notify-birthdays/cron", systemBirthdayCronLimiter, validateBody(cronNotifyBodySchema), async (request, response) => {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const providedSecret = typeof request.headers["x-cron-secret"] === "string"
    ? request.headers["x-cron-secret"]
    : (typeof request.body.secret === "string"
      ? request.body.secret
      : (typeof request.query.secret === "string" ? request.query.secret : ""));

  if (!cronSecret || providedSecret !== cronSecret) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const targetDate = typeof request.body.date === "string" ? request.body.date : null;
  try {
    const payload = await sendBirthdayNotifications(targetDate);
    response.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "birthday-notification-run-failed";
    logRequestFailure("birthday-notification-cron", { message });
    response.status(500).json({ error: exposeErrorToClient(error, "Could not run birthday notifications.") });
  }
});

app.get("/api/auth/session", authSessionLimiter, async (request, response) => {
  const session = await getActiveSession(request as AuthedRequest, response);
  if (!session) {
    response.json({ user: null });
    return;
  }

  const rows = await sql`
    SELECT id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
    FROM users
    WHERE id = ${session.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    clearSessionCookie(response);
    response.json({ user: null });
    return;
  }

  response.json({ user: sessionUserFromRow(rows[0]) });
});

app.post("/api/auth/signup", authSignupLimiter, validateBody(signupBodySchema), async (request, response) => {
  const email = request.body.email as string;
  const password = request.body.password as string;
  const displayName = sanitizeDisplayName(request.body.displayName);

  const existing = await sql`
    SELECT id
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existing[0]) {
    response.status(409).json({ error: "This email is already registered. Try signing in instead." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    INSERT INTO users (email, password_hash, display_name)
    VALUES (${email}, ${passwordHash}, ${displayName})
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;
  const createdUser = rows[0];

  if (isMailerConfigured()) {
    try {
      await sendVerificationEmailForUser(createdUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : "welcome-or-verify-email-send-failed";
      logRequestFailure("signup-email", { email, message });
    }
  }

  response.status(201).json({
    requiresVerification: true,
    message: "Account created. Verify your email to continue.",
  });
});

app.post("/api/auth/login", authLoginLimiter, validateBody(loginBodySchema), async (request, response) => {
  const email = request.body.email as string;
  const password = request.body.password as string;
  const rememberMe = Boolean(request.body.rememberMe ?? false);

  const clientIp = getRequestIp(request);
  const key = `${email || "unknown"}:${clientIp}`;
  const now = Date.now();
  const failureWindowMs = 15 * 60 * 1000;
  const maxFailures = 8;
  const lockoutMs = 15 * 60 * 1000;

  const existingFailure = loginFailureStore.get(key);
  if (existingFailure?.lockedUntil && existingFailure.lockedUntil > now) {
    response.status(429).json({ error: "Too many failed login attempts. Please try again later." });
    return;
  }

  const rows = await sql`
    SELECT id, email, email_verified_at, password_hash, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  const user = rows[0];
  if (!user) {
    const previous = loginFailureStore.get(key);
    const baseCount = previous && previous.lockedUntil && previous.lockedUntil <= now ? 0 : previous?.count || 0;
    const nextCount = baseCount + 1;
    loginFailureStore.set(key, {
      count: nextCount,
      lockedUntil: nextCount >= maxFailures ? now + lockoutMs : null,
    });
    response.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const matches = await verifyPassword(password, user.password_hash);
  if (!matches) {
    const previous = loginFailureStore.get(key);
    const baseCount = previous && previous.lockedUntil && previous.lockedUntil <= now ? 0 : previous?.count || 0;
    const nextCount = baseCount + 1;
    loginFailureStore.set(key, {
      count: nextCount,
      lockedUntil: nextCount >= maxFailures ? now + lockoutMs : null,
    });
    response.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.email_verified_at) {
    response.status(403).json({ error: "Please verify your email before signing in.", code: "EMAIL_NOT_VERIFIED" });
    return;
  }

  loginFailureStore.delete(key);
  await sendAuth(response, sessionUserFromRow(user), rememberMe);
});

app.post("/api/auth/logout", authLogoutLimiter, async (request: AuthedRequest, response) => {
  await revokeCurrentSession(request);
  clearSessionCookie(response);
  response.status(204).end();
});

app.post("/api/auth/verify/send", authVerifySendLimiter, validateBody(emailBodySchema), async (request, response) => {
  if (!isMailerConfigured()) {
    response.status(500).json({ error: "Email service is not configured." });
    return;
  }

  const emailInput = request.body.email as string;

  const rows = await sql`
    SELECT id, email, email_verified_at, display_name
    FROM users
    WHERE email = ${emailInput}
    LIMIT 1
  `;
  const user = rows[0];

  if (!user) {
    response.json({ ok: true });
    return;
  }

  if (user.email_verified_at) {
    response.json({ ok: true, alreadyVerified: true });
    return;
  }

  try {
    await sendVerificationEmailForUser(user);
    response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "verification-email-send-failed";
    logRequestFailure("verify-send", { email: emailInput, message });
    response.status(500).json({ error: "Failed to send verification email." });
  }
});

app.post("/api/auth/verify/confirm", authVerifyConfirmLimiter, validateBody(tokenBodySchema), async (request, response) => {
  const token = request.body.token as string;

  const consumed = await consumeEmailToken({ token, purpose: "verify_email" });
  if (!consumed) {
    response.status(400).json({ error: "Verification link is invalid or expired." });
    return;
  }

  const rows = await sql`
    UPDATE users
    SET email_verified_at = NOW(), updated_at = NOW()
    WHERE id = ${consumed.userId}
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  if (isMailerConfigured()) {
    try {
      await sendWelcomeEmail({
        to: String(rows[0].email),
        displayName: typeof rows[0].display_name === "string" ? rows[0].display_name : null,
      });
      await sql`
        UPDATE users
        SET last_welcome_email_at = NOW()
        WHERE id = ${String(rows[0].id)}
      `;
    } catch (error) {
      const message = error instanceof Error ? error.message : "welcome-email-send-failed";
      logRequestFailure("verify-confirm-welcome", { userId: String(rows[0].id), message });
    }
  }

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

app.post("/api/auth/password-reset/request", authPasswordResetRequestLimiter, validateBody(emailBodySchema), async (request, response) => {
  if (!isMailerConfigured()) {
    response.status(500).json({ error: "Email service is not configured." });
    return;
  }

  const emailInput = request.body.email as string;

  const rows = await sql`
    SELECT id, email, display_name
    FROM users
    WHERE email = ${emailInput}
    LIMIT 1
  `;
  const user = rows[0];

  // Always return ok to avoid leaking account existence.
  if (!user) {
    response.json({ ok: true });
    return;
  }

  try {
    await revokeOutstandingEmailTokens(String(user.id), "password_reset");
    const issued = await issueEmailToken({ userId: String(user.id), purpose: "password_reset" });
    await sendPasswordResetEmail({
      to: String(user.email),
      token: issued.token,
      displayName: typeof user.display_name === "string" ? user.display_name : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "password-reset-email-send-failed";
    logRequestFailure("password-reset-request", { email: emailInput, message });
  }

  response.json({ ok: true });
});

app.post("/api/auth/password-reset/confirm", authPasswordResetConfirmLimiter, validateBody(passwordResetConfirmBodySchema), async (request, response) => {
  const token = request.body.token as string;
  const password = request.body.password as string;

  const consumed = await consumeEmailToken({ token, purpose: "password_reset" });
  if (!consumed) {
    response.status(400).json({ error: "Reset link is invalid or expired." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${consumed.userId}
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  await revokeAllSessionsForUser(String(rows[0].id));
  await sendAuth(response, sessionUserFromRow(rows[0]));
});

app.patch("/api/auth/profile", requireAuth, validateBody(profilePatchBodySchema), async (request: AuthedRequest, response) => {
  const displayName = sanitizeDisplayName(request.body.displayName);
  const avatarUrl = typeof request.body.avatarUrl === "string" ? request.body.avatarUrl.trim() : "";

  const rows = await sql`
    UPDATE users
    SET
      display_name = ${displayName},
      avatar_url = ${avatarUrl || null},
      updated_at = NOW()
    WHERE id = ${request.user!.id}
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

app.patch("/api/auth/preferences", requireAuth, validateBody(preferencesPatchBodySchema), async (request: AuthedRequest, response) => {
  const defaultTheme = typeof request.body.defaultTheme === "string" ? request.body.defaultTheme : "elegant";
  const defaultAllowPhotos = Boolean(request.body.defaultAllowPhotos ?? true);
  const defaultAllowAudio = Boolean(request.body.defaultAllowAudio ?? true);
  const defaultRequireNames = Boolean(request.body.defaultRequireNames ?? true);

  const rows = await sql`
    UPDATE users
    SET
      default_theme = ${defaultTheme},
      default_allow_photos = ${defaultAllowPhotos},
      default_allow_audio = ${defaultAllowAudio},
      default_require_names = ${defaultRequireNames},
      updated_at = NOW()
    WHERE id = ${request.user!.id}
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

app.patch("/api/auth/notifications", requireAuth, authNotificationsLimiter, validateBody(notificationsPatchBodySchema), async (request: AuthedRequest, response) => {
  const emailNotifications = Boolean(request.body.emailNotifications ?? true);
  const newMessageNotifications = Boolean(request.body.newMessageNotifications ?? true);
  const birthdayReminders = Boolean(request.body.birthdayReminders ?? true);

  const rows = await sql`
    UPDATE users
    SET
      email_notifications = ${emailNotifications},
      new_message_notifications = ${newMessageNotifications},
      birthday_reminders = ${birthdayReminders},
      updated_at = NOW()
    WHERE id = ${request.user!.id}
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

app.post("/api/uploads/avatar", requireAuth, avatarUpload.single("file"), async (request: AuthedRequest, response) => {
  const file = request.file;

  if (!file) {
    response.status(400).json({ error: "Missing avatar upload" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-avatar"))) {
    return;
  }

  const existingRows = await sql`
    SELECT avatar_url
    FROM users
    WHERE id = ${request.user!.id}
    LIMIT 1
  `;

  await removeFileByUrl(existingRows[0]?.avatar_url);
  const url = fileUrl(path.join("avatars", file.filename));

  await sql`
    UPDATE users
    SET avatar_url = ${url}, updated_at = NOW()
    WHERE id = ${request.user!.id}
  `;

  response.json({ url });
});

app.patch("/api/auth/password", requireAuth, validateBody(passwordChangeBodySchema), async (request: AuthedRequest, response) => {
  const password = request.body.password as string;

  const passwordHash = await hashPassword(password);
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${request.user!.id}
  `;

  await revokeAllSessionsForUser(request.user!.id);
  clearSessionCookie(response);
  response.status(204).end();
});

app.delete("/api/auth/me/data", requireAuth, async (request: AuthedRequest, response) => {
  const userId = request.user!.id;

  const fileRows = await sql`
    SELECT cover_photo_url AS url
    FROM birthday_pages
    WHERE user_id = ${userId}
    UNION ALL
    SELECT custom_audio_url AS url
    FROM birthday_pages
    WHERE user_id = ${userId}
      AND custom_audio_url IS NOT NULL
    UNION ALL
    SELECT bm.photo_url AS url
    FROM birthday_messages bm
    INNER JOIN birthday_pages bp ON bp.id = bm.page_id
    WHERE bp.user_id = ${userId}
      AND bm.photo_url IS NOT NULL
    UNION ALL
    SELECT bm.audio_url AS url
    FROM birthday_messages bm
    INNER JOIN birthday_pages bp ON bp.id = bm.page_id
    WHERE bp.user_id = ${userId}
      AND bm.audio_url IS NOT NULL
    UNION ALL
    SELECT bmp.photo_url AS url
    FROM birthday_message_photos bmp
    INNER JOIN birthday_messages bm ON bm.id = bmp.message_id
    INNER JOIN birthday_pages bp ON bp.id = bm.page_id
    WHERE bp.user_id = ${userId}
  `;

  await Promise.all(fileRows.map((row) => removeFileByUrl(row.url)));

  await sql`
    DELETE FROM users
    WHERE id = ${userId}
  `;

  clearSessionCookie(response);
  response.status(204).end();
});

app.get("/api/themes", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id, name, emoji, gradient_from, gradient_to, gradient_mid, gradient_angle, accent_color, font, icon_url, created_at, updated_at
    FROM custom_themes
    WHERE user_id = ${request.user!.id}
    ORDER BY created_at DESC
  `;

  response.json(rows);
});

app.post("/api/themes", requireAuth, validateBody(themeCreateBodySchema), async (request: AuthedRequest, response) => {
  const rows = await sql`
    INSERT INTO custom_themes (user_id, name, emoji, gradient_from, gradient_to, gradient_mid, gradient_angle, accent_color, font, icon_url)
    VALUES (
      ${request.user!.id},
      ${String(request.body.name || "").trim()},
      ${String(request.body.emoji || "🎨")},
      ${String(request.body.gradientFrom || "#f472b6")},
      ${String(request.body.gradientTo || "#8b5cf6")},
      ${request.body.gradientMid || null},
      ${Number(request.body.gradientAngle) || 135},
      ${request.body.accentColor || null},
      ${String(request.body.font || "sans")},
      ${request.body.iconUrl || null}
    )
    RETURNING *
  `;

  response.status(201).json(rows[0]);
});

app.patch("/api/themes/:id", requireAuth, validateParams(themeIdParamSchema), validateBody(themePatchBodySchema), async (request: AuthedRequest, response) => {
  const rows = await sql`
    UPDATE custom_themes
    SET
      name = ${String(request.body.name || "").trim()},
      emoji = ${String(request.body.emoji || "🎨")},
      gradient_from = ${String(request.body.gradientFrom || "#f472b6")},
      gradient_to = ${String(request.body.gradientTo || "#8b5cf6")},
      gradient_mid = ${request.body.gradientMid || null},
      gradient_angle = ${Number(request.body.gradientAngle) || 135},
      accent_color = ${request.body.accentColor || null},
      font = ${String(request.body.font || "sans")},
      icon_url = ${request.body.iconUrl || null},
      updated_at = NOW()
    WHERE id = ${request.params.id}
      AND user_id = ${request.user!.id}
    RETURNING *
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Theme not found" });
    return;
  }

  response.json(rows[0]);
});

app.post("/api/uploads/theme-icon", requireAuth, themeIconUpload.single("file"), async (request: AuthedRequest, response) => {
  const file = request.file;

  if (!file) {
    response.status(400).json({ error: "Missing icon upload" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-theme-icon"))) {
    return;
  }

  const url = fileUrl(path.join("theme-icons", file.filename));
  response.json({ url });
});

app.delete("/api/themes/:id", requireAuth, validateParams(themeIdParamSchema), async (request: AuthedRequest, response) => {
  await sql`
    DELETE FROM custom_themes
    WHERE id = ${request.params.id}
      AND user_id = ${request.user!.id}
  `;

  response.status(204).end();
});

app.get("/api/pages/dashboard", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT
      bp.*,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    WHERE bp.user_id = ${request.user!.id}
      AND bp.owner_deleted IS NOT TRUE
    GROUP BY bp.id
    ORDER BY bp.created_at DESC
  `;

  response.json(rows.map((row) => serializePageDates(row)));
});

app.get("/api/pages/saved", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT
      bp.*,
      COUNT(bm.id)::int AS message_count,
      MAX(s.created_at) AS saved_at
    FROM birthday_page_saves s
    JOIN birthday_pages bp ON bp.id = s.page_id
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    WHERE s.user_id = ${request.user!.id}
    GROUP BY bp.id
    ORDER BY saved_at DESC
  `;

  response.json(rows.map((row) => serializePageDates(row)));
});

app.post("/api/pages", requireAuth, validateBody(pageCreateBodySchema), async (request: AuthedRequest, response) => {
  const publicCode = await createUniquePublicCode();
  const recipientEmail = sanitizeEmail(request.body.recipientEmail);
  const rows = await sql`
    INSERT INTO birthday_pages (
      user_id,
      public_code,
      recipient_name,
      recipient_email,
      birthday_date,
      theme,
      creator_message,
      soundtrack_id,
      allow_photos,
      allow_audio,
      require_names,
      close_date,
      status,
      custom_audio_url
    )
    VALUES (
      ${request.user!.id},
      ${publicCode},
      ${String(request.body.recipientName || "").trim()},
      ${recipientEmail},
      ${String(request.body.birthdayDate)},
      ${String(request.body.theme || "elegant")},
      ${sanitizeDisplayName(request.body.creatorMessage)},
      ${String(request.body.soundtrackId || "golden-hour")},
      ${Boolean(request.body.allowPhotos ?? true)},
      ${Boolean(request.body.allowAudio ?? true)},
      ${Boolean(request.body.requireNames ?? true)},
      ${String(request.body.closeDate || request.body.birthdayDate)},
      'active',
      ${request.body.pageCustomAudioUrl || null}
    )
    RETURNING *
  `;

  response.status(201).json(rows[0]);
});

app.get("/api/pages/:id", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const rows = await privatePageQuery(String(request.params.id), request.user!.id);

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(serializePageDates(rows[0]));
});

app.get("/api/pages/:id/messages", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messages = await fetchMessagesForPage(String(pageRows[0].id));
  response.json(messages);
});

app.get("/api/pages/:id/ownership", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id, public_code
    FROM birthday_pages
    WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  response.json({ isOwner: Boolean(rows[0]), publicCode: rows[0] ? String(rows[0].public_code) : null });
});

app.get("/api/pages/:id/save-status", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await sql`
    SELECT 1
    FROM birthday_page_saves
    WHERE user_id = ${request.user!.id}
      AND page_id = ${resolvedPageId}
    LIMIT 1
  `;

  response.json({ isSaved: Boolean(rows[0]) });
});

app.post("/api/pages/:id/save", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await sql`
    INSERT INTO birthday_page_saves (user_id, page_id)
    VALUES (${request.user!.id}, ${resolvedPageId})
    ON CONFLICT (user_id, page_id) DO NOTHING
  `;

  response.status(204).end();
});

app.delete("/api/pages/:id/save", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await sql`
    DELETE FROM birthday_page_saves
    WHERE user_id = ${request.user!.id}
      AND page_id = ${resolvedPageId}
  `;

  response.status(204).end();
});

app.delete("/api/pages/:id/messages/:messageId", requireAuth, validateParams(pageMessageParamsSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messageRows = await sql`
    SELECT photo_url, audio_url
    FROM birthday_messages
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  if (!messageRows[0]) {
    response.status(404).json({ error: "Message not found" });
    return;
  }

  const messagePhotos = await sql`
    SELECT photo_url
    FROM birthday_message_photos
    WHERE message_id = ${request.params.messageId}
  `;

  await removeFileByUrl(messageRows[0].photo_url);
  await removeFileByUrl(messageRows[0].audio_url);
  await Promise.all(messagePhotos.map((photo) => removeFileByUrl(photo.photo_url)));

  await sql`
    DELETE FROM birthday_messages
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  response.status(204).end();
});

app.delete("/api/pages/:id/messages/:messageId/audio", requireAuth, validateParams(pageMessageParamsSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messageRows = await sql`
    SELECT audio_url
    FROM birthday_messages
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  if (!messageRows[0] || !messageRows[0].audio_url) {
    response.status(404).json({ error: "Audio not found" });
    return;
  }

  await removeFileByUrl(messageRows[0].audio_url);

  await sql`
    UPDATE birthday_messages
    SET audio_url = NULL
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  response.status(204).end();
});

app.delete("/api/pages/:id/messages/photos/:photoId", requireAuth, validateParams(pagePhotoParamsSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const photoRows = await sql`
    SELECT bmp.photo_url
    FROM birthday_message_photos bmp
    INNER JOIN birthday_messages bm ON bm.id = bmp.message_id
    WHERE bmp.id = ${request.params.photoId}
      AND bm.page_id = ${pageRows[0].id}
  `;

  if (!photoRows[0]) {
    // Check if it's the legacy main photo
    const legacyPhotoRows = await sql`
      SELECT photo_url
      FROM birthday_messages
      WHERE id::text = ${request.params.photoId}
        AND page_id = ${pageRows[0].id}
    `;

    if (legacyPhotoRows[0] && legacyPhotoRows[0].photo_url) {
      await removeFileByUrl(legacyPhotoRows[0].photo_url);
      await sql`
        UPDATE birthday_messages
        SET photo_url = NULL
        WHERE id::text = ${request.params.photoId}
          AND page_id = ${pageRows[0].id}
      `;
      response.status(204).end();
      return;
    }

    response.status(404).json({ error: "Photo not found" });
    return;
  }

  await removeFileByUrl(photoRows[0].photo_url);

  await sql`
    DELETE FROM birthday_message_photos
    WHERE id = ${request.params.photoId}
  `;

  response.status(204).end();
});

app.patch("/api/pages/:id", requireAuth, validateParams(pageIdParamSchema), validateBody(pagePatchBodySchema), async (request: AuthedRequest, response) => {
  const hasCoverPhotoUrl = Object.prototype.hasOwnProperty.call(request.body, "coverPhotoUrl");
  const hasCustomAudioUrl = Object.prototype.hasOwnProperty.call(request.body, "pageCustomAudioUrl");

  if (hasCustomAudioUrl) {
    const existingRows = await sql`
      SELECT custom_audio_url
      FROM birthday_pages
      WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
        AND user_id = ${request.user!.id}
      LIMIT 1
    `;

    if (!existingRows[0]) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const nextAudioUrl = request.body.pageCustomAudioUrl || null;
    if (existingRows[0].custom_audio_url && existingRows[0].custom_audio_url !== nextAudioUrl) {
      await removeFileByUrl(existingRows[0].custom_audio_url);
    }
  }

  const rows = hasCoverPhotoUrl || hasCustomAudioUrl
    ? await sql`
        UPDATE birthday_pages
        SET
          recipient_name = ${String(request.body.recipientName || "").trim()},
          recipient_email = ${sanitizeEmail(request.body.recipientEmail)},
          birthday_date = ${String(request.body.birthdayDate)},
          theme = ${String(request.body.theme || "elegant")},
          creator_message = ${sanitizeDisplayName(request.body.creatorMessage)},
          soundtrack_id = ${String(request.body.soundtrackId || "golden-hour")},
          allow_photos = ${Boolean(request.body.allowPhotos ?? true)},
          allow_audio = ${Boolean(request.body.allowAudio ?? true)},
          require_names = ${Boolean(request.body.requireNames ?? true)},
          close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
          cover_photo_url = ${request.body.coverPhotoUrl || null},
          custom_audio_url = ${request.body.pageCustomAudioUrl || null},
          letter_color = ${request.body.letterColor ?? null},
          updated_at = NOW()
        WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
          AND user_id = ${request.user!.id}
        RETURNING *
      `
    : await sql`
        UPDATE birthday_pages
        SET
          recipient_name = ${String(request.body.recipientName || "").trim()},
          recipient_email = ${sanitizeEmail(request.body.recipientEmail)},
          birthday_date = ${String(request.body.birthdayDate)},
          theme = ${String(request.body.theme || "elegant")},
          creator_message = ${sanitizeDisplayName(request.body.creatorMessage)},
          soundtrack_id = ${String(request.body.soundtrackId || "golden-hour")},
          allow_photos = ${Boolean(request.body.allowPhotos ?? true)},
          allow_audio = ${Boolean(request.body.allowAudio ?? true)},
          require_names = ${Boolean(request.body.requireNames ?? true)},
          close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
          letter_color = ${request.body.letterColor ?? null},
          updated_at = NOW()
        WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
          AND user_id = ${request.user!.id}
        RETURNING *
      `;

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(rows[0]);
});

app.delete("/api/pages/:id", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id
    FROM birthday_pages
    WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const resolvedPageId = rows[0].id;

  await sql`
    UPDATE birthday_pages
    SET owner_deleted = TRUE, updated_at = NOW()
    WHERE id = ${resolvedPageId}
      AND user_id = ${request.user!.id}
  `;

  response.status(204).end();
});

app.post("/api/uploads/cover", requireAuth, coverUpload.single("file"), validateBody(uploadPageIdBodySchema), async (request: AuthedRequest, response) => {
  const pageIdOrCode = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageIdOrCode) {
    response.status(400).json({ error: "Missing file upload or page id" });
    logRequestFailure("upload-cover", { userId: request.user?.id, pageId: pageIdOrCode, reason: "missing-file-or-page" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-cover"))) {
    return;
  }

  // Allow either the internal UUID id or the public_code to be sent from the client.
  // Compare against id::text to avoid Postgres attempting to cast arbitrary strings to uuid.
  const rows = await sql`
    SELECT id, cover_photo_url
    FROM birthday_pages
    WHERE (id::text = ${pageIdOrCode} OR public_code = ${pageIdOrCode})
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  const page = rows[0] as undefined | { id: string; cover_photo_url: string | null };

  if (!page) {
    await fs.rm(file.path, { force: true });
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const normalizedCover = await normalizeCoverUpload(file.path);
  await removeFileByUrl(page.cover_photo_url);
  const url = normalizedCover.url;

  await sql`
    UPDATE birthday_pages
    SET cover_photo_url = ${url}, updated_at = NOW()
    WHERE id = ${page.id}
      AND user_id = ${request.user!.id}
  `;

  response.json({ url });
});

app.post("/api/uploads/page-soundtrack", requireAuth, pageAudioUpload.single("file"), validateBody(uploadPageIdBodySchema), async (request: AuthedRequest, response) => {
  const pageIdOrCode = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageIdOrCode) {
    response.status(400).json({ error: "Missing audio upload or page id" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "audio", response, "upload-page-soundtrack"))) {
    return;
  }

  // Allow either the internal UUID id or the public_code to be sent from the client.
  // Compare against id::text to avoid Postgres attempting to cast arbitrary strings to uuid.
  const rows = await sql`
    SELECT id, custom_audio_url
    FROM birthday_pages
    WHERE (id::text = ${pageIdOrCode} OR public_code = ${pageIdOrCode})
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  const page = rows[0] as undefined | { id: string; custom_audio_url: string | null };

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await removeFileByUrl(page.custom_audio_url);
  const url = fileUrl(path.join("page-audio", file.filename));

  await sql`
    UPDATE birthday_pages
    SET custom_audio_url = ${url}, updated_at = NOW()
    WHERE id = ${page.id}
      AND user_id = ${request.user!.id}
  `;

  response.json({ url });
});

app.get("/api/public/pages/:id", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await publicPageQuery(resolvedPageId);
  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(serializePageDates(rows[0]));
});

app.get("/api/public/pages/:id/messages", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!page.is_revealed) {
    response.status(403).json({ error: "Birthday wishes are not available yet" });
    return;
  }

  const messages = await fetchMessagesForPage(resolvedPageId);
  response.json(messages);
});

app.post("/api/public/pages/:id/message-photo", validateParams(pageIdParamSchema), publicPhotoUploadLimiter, messageUpload.single("file"), async (request, response) => {
  const file = request.file;
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!page.can_contribute || !page.allow_photos) {
    response.status(403).json({ error: "Photo uploads are disabled for this page" });
    return;
  }

  if (!file) {
    response.status(400).json({ error: "Missing photo upload" });
    logRequestFailure("upload-message-photo", { pageId: resolvedPageId, reason: "missing-file" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-message-photo"))) {
    return;
  }

  response.json({ url: fileUrl(path.join("messages", file.filename)) });
});

app.post("/api/public/pages/:id/message-audio", validateParams(pageIdParamSchema), publicAudioUploadLimiter, wishAudioUpload.single("file"), async (request, response) => {
  const file = request.file;
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!page.can_contribute || !page.allow_audio) {
    response.status(403).json({ error: "Audio uploads are disabled for this page" });
    return;
  }

  if (!file) {
    response.status(400).json({ error: "Missing audio upload" });
    logRequestFailure("upload-message-audio", { pageId: resolvedPageId, reason: "missing-file" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "audio", response, "upload-message-audio"))) {
    return;
  }

  response.json({ url: fileUrl(path.join("wish-audio", file.filename)) });
});

app.post("/api/public/pages/:id/messages", validateParams(pageIdParamSchema), publicMessageLimiter, validateBody(publicMessageBodySchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!page.can_contribute) {
    response.status(403).json({ error: "This birthday page is no longer accepting new wishes" });
    return;
  }

  const senderName = sanitizeDisplayName(request.body.senderName);
  const rawMessage = typeof request.body.message === "string" ? request.body.message.trim() : "";
  const message = sanitizeHtml(rawMessage, {
    allowedTags: ["b", "i", "u", "strong", "em", "ul", "ol", "li", "br", "p"],
    allowedAttributes: {},
  });
  const plainTextLength = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).length;
  const photoUrl = typeof request.body.photoUrl === "string" ? request.body.photoUrl.trim() : null;
  const audioUrl = typeof request.body.audioUrl === "string" ? request.body.audioUrl.trim() : null;
  const normalizedPhotos = normalizeContributionPhotos(request.body.photos);
  const photos = normalizedPhotos.length
    ? normalizedPhotos
    : photoUrl
      ? [{ url: photoUrl, caption: null, sortOrder: 0 }]
      : [];

  if (!plainTextLength) {
      response.status(400).json({ error: "Please write a message" });
      logRequestFailure("create-message", { pageId: resolvedPageId, reason: "empty-message" });
      return;
  }

  if (plainTextLength > 500) {
    response.status(400).json({ error: "Messages must be 500 characters or fewer" });
    return;
  }

  if (page.require_names && !senderName) {
    response.status(400).json({ error: "Please enter your name" });
    logRequestFailure("create-message", { pageId: resolvedPageId, reason: "missing-name" });
    return;
  }

  if (photos.length > 6) {
    response.status(400).json({ error: "You can attach up to 6 photos" });
    return;
  }

  if (photos.some((photo) => photo.caption && photo.caption.length > 140)) {
    response.status(400).json({ error: "Photo notes must be 140 characters or fewer" });
    return;
  }

  if (photos.length > 0 && !page.allow_photos) {
    response.status(400).json({ error: "Photo uploads are disabled for this page" });
    return;
  }

  const rows = await sql`
    INSERT INTO birthday_messages (page_id, sender_name, message, photo_url, audio_url)
    VALUES (
      ${resolvedPageId},
      ${senderName || "Anonymous"},
      ${message},
      ${photos[0]?.url || null},
      ${audioUrl}
    )
    RETURNING *
  `;

  const createdMessage = rows[0];

  if (photos.length) {
    await Promise.all(
      photos.map((photo) => sql`
        INSERT INTO birthday_message_photos (message_id, photo_url, caption, sort_order)
        VALUES (${createdMessage.id}, ${photo.url}, ${photo.caption}, ${photo.sortOrder})
      `),
    );
  }

  const messages = await fetchMessagesForPage(String(createdMessage.page_id));
  const messageWithPhotos = messages.find((item) => item.id === createdMessage.id);

  void (async () => {
    try {
      const ownerRows = await sql`
        SELECT
          u.email,
          u.display_name,
          u.email_notifications,
          u.new_message_notifications
        FROM birthday_pages bp
        INNER JOIN users u ON u.id = bp.user_id
        WHERE bp.id = ${resolvedPageId}
        LIMIT 1
      `;

      const owner = ownerRows[0];
      const ownerEmail = owner ? sanitizeEmail(owner.email) : null;
      const canNotify = Boolean(owner?.email_notifications ?? true) && Boolean(owner?.new_message_notifications ?? true);

      if (ownerEmail && canNotify) {
        await sendNewMessageAlertEmail({
          to: ownerEmail,
          ownerName: typeof owner.display_name === "string" ? owner.display_name : null,
          recipientName: String(page.recipient_name),
          pageCode: String(page.public_code),
          senderName: senderName || "Anonymous",
          messageCount: Number(page.message_count || 0) + 1,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "new-message-email-send-failed";
      logRequestFailure("new-message-alert", { pageId: resolvedPageId, message });
    }
  })();

  response.status(201).json(messageWithPhotos || createdMessage);
});

// --- Social Preview / OG endpoints ---

const themeGradientColors: Record<string, [string, string]> = {
  elegant: ["#f59e0b", "#f97316"],
  playful: ["#ec4899", "#a855f7"],
  minimalist: ["#475569", "#1e293b"],
  retro: ["#22d3ee", "#a855f7"],
  tropical: ["#4ade80", "#10b981"],
  cosmic: ["#8b5cf6", "#4f46e5"],
  sunset: ["#fb923c", "#f43f5e"],
  ocean: ["#38bdf8", "#06b6d4"],
  candyland: ["#f472b6", "#a855f7"],
  midnight: ["#6366f1", "#7c3aed"],
};

function resolveThemeColors(page: Record<string, unknown>): [string, string] {
  const theme = String(page.theme || "elegant");
  if (theme.startsWith("custom_") && page.theme_gradient_from && page.theme_gradient_to) {
    return [String(page.theme_gradient_from), String(page.theme_gradient_to)];
  }
  return themeGradientColors[theme] || themeGradientColors.elegant;
}

app.get("/api/og-image/:id", validateParams(pageIdParamSchema), async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) { response.status(404).send("Not found"); return; }

    const rows = await publicPageQuery(resolvedPageId);
    const page = rows[0];
    if (!page) { response.status(404).send("Not found"); return; }

    const [colorFrom, colorTo] = resolveThemeColors(page);
    const name = String(page.recipient_name || "Someone special");
    const count = Number(page.message_count || 0);

    const escapedName = escapeHtml(name);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}" />
      <stop offset="100%" stop-color="${colorTo}" />
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.35)" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#overlay)" />
  <circle cx="200" cy="130" r="180" fill="rgba(255,255,255,0.08)" />
  <circle cx="1000" cy="500" r="220" fill="rgba(255,255,255,0.06)" />
  <text x="100" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" letter-spacing="6" fill="rgba(255,255,255,0.7)" text-transform="uppercase">BIRTHDAY POST</text>
  <text x="100" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="800" fill="white">Happy Birthday,</text>
  <text x="100" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="800" fill="white">${escapedName}.</text>
  <text x="100" y="500" font-family="system-ui, -apple-system, sans-serif" font-size="26" fill="rgba(255,255,255,0.8)">${count} birthday ${count === 1 ? "wish" : "wishes"} waiting inside</text>
  <text x="100" y="580" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" letter-spacing="3" fill="rgba(255,255,255,0.5)">WISHCANVAS</text>
</svg>`;

    response.setHeader("Content-Type", "image/svg+xml");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(svg);
  } catch {
    response.status(500).send("Error generating image");
  }
});

app.get("/api/og/:id", validateParams(pageIdParamSchema), async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) { response.status(404).send("Not found"); return; }

    const rows = await publicPageQuery(resolvedPageId);
    const page = rows[0];
    if (!page) { response.status(404).send("Not found"); return; }

    const name = String(page.recipient_name || "Someone special");
    const count = Number(page.message_count || 0);
    const publicCode = String(page.public_code || resolvedPageId);
    const apiBase = process.env.API_URL || `${request.protocol}://${request.get("host")}`;
    const siteBase = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "https://wishcanvas.app").split(",")[0].trim();

    const title = `Happy Birthday, ${name}!`;
    const description = `${count} birthday ${count === 1 ? "wish has" : "wishes have"} been collected. Open the letter to start the birthday story.`;
    const pageUrl = `${siteBase}/birthday/${publicCode}`;
    const imageUrl = `${apiBase}/api/og-image/${publicCode}`;

    const escapedTitle = escapeHtml(title);
    const escapedDesc = escapeHtml(description);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${pageUrl}">${escapedTitle}</a></p>
</body>
</html>`);
  } catch {
    response.status(500).send("Error");
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  console.error(error);
  response.status(500).json({
    error: exposeErrorToClient(error, "Internal server error"),
  });
});

initializeDatabase()
  .then(async () => {
    await ensureUploadDirs();
    app.listen(port, () => {
      console.log(`WishCanvas API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
