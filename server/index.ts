import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import type { Response } from "express";
import * as Sentry from "@sentry/node";
import { clearSessionCookie, hashPassword, readSession, requireAdmin, requireAuth, setSessionCookie, signSession, verifyPassword } from "./auth";
import { initializeDatabase, sql } from "./db";
import type { AuthedRequest, SessionUser } from "./types";
import { avatarUpload, coverUpload, fileUrl, messageUpload, pageAudioUpload, removeFileByUrl, uploadsRoot, wishAudioUpload, themeIconUpload, ensureUploadDirs } from "./uploads";
import sanitizeHtml from "sanitize-html";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);

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
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();
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

function rateLimit(scope: string, limit: number, windowMs: number) {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const key = `${scope}:${getRequestIp(request)}`;
    const now = Date.now();
    const existing = rateLimitStore.get(key);

    if (!existing || existing.expiresAt <= now) {
      rateLimitStore.set(key, { count: 1, expiresAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= limit) {
      logRequestFailure("rate-limit", { scope, ip: getRequestIp(request), path: request.path });
      response.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }

    existing.count += 1;
    next();
  };
}

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
app.use("/uploads", express.static(uploadsRoot));

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function sendAuth(response: Response, user: SessionUser) {
  const token = signSession(user);
  setSessionCookie(response, token);
  response.json({ user });
}

function sessionUserFromRow(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: typeof row.display_name === "string" ? row.display_name : null,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    defaultTheme: typeof row.default_theme === "string" ? row.default_theme : "elegant",
    defaultAllowPhotos: Boolean(row.default_allow_photos ?? true),
    defaultAllowAudio: Boolean(row.default_allow_audio ?? true),
    defaultRequireNames: Boolean(row.default_require_names ?? true),
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
    ts: new Date().toISOString(),
    latency_ms: Date.now() - startedAt,
  };
}

app.get("/api/health", async (_request, response) => {
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

app.get("/api/auth/session", async (request, response) => {
  const session = readSession(request as AuthedRequest);
  if (!session) {
    response.json({ user: null });
    return;
  }

  const rows = await sql`
    SELECT id, email, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names
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

app.post("/api/auth/signup", rateLimit("auth-signup", 6, 15 * 60 * 1000), async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const displayName = sanitizeDisplayName(request.body.displayName);

  if (!email || !email.includes("@")) {
    response.status(400).json({ error: "Please enter a valid email" });
    return;
  }

  if (password.length < 6) {
    response.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

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
    RETURNING id, email, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names
  `;

  sendAuth(response, sessionUserFromRow(rows[0]));
});

app.post("/api/auth/login", rateLimit("auth-login", 10, 15 * 60 * 1000), async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";

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
    SELECT id, email, password_hash, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names
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

  loginFailureStore.delete(key);
  sendAuth(response, sessionUserFromRow(user));
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});

app.patch("/api/auth/profile", requireAuth, async (request: AuthedRequest, response) => {
  const displayName = sanitizeDisplayName(request.body.displayName);
  const avatarUrl = typeof request.body.avatarUrl === "string" ? request.body.avatarUrl.trim() : "";

  const rows = await sql`
    UPDATE users
    SET
      display_name = ${displayName},
      avatar_url = ${avatarUrl || null},
      updated_at = NOW()
    WHERE id = ${request.user!.id}
    RETURNING id, email, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names
  `;

  sendAuth(response, sessionUserFromRow(rows[0]));
});

app.patch("/api/auth/preferences", requireAuth, async (request: AuthedRequest, response) => {
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
    RETURNING id, email, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names
  `;

  sendAuth(response, sessionUserFromRow(rows[0]));
});

app.post("/api/uploads/avatar", requireAuth, avatarUpload.single("file"), async (request: AuthedRequest, response) => {
  const file = request.file;

  if (!file) {
    response.status(400).json({ error: "Missing avatar upload" });
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

app.patch("/api/auth/password", requireAuth, async (request: AuthedRequest, response) => {
  const password = typeof request.body.password === "string" ? request.body.password : "";

  if (password.length < 6) {
    response.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${request.user!.id}
  `;

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

app.post("/api/themes", requireAuth, async (request: AuthedRequest, response) => {
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

app.patch("/api/themes/:id", requireAuth, async (request: AuthedRequest, response) => {
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

  const url = fileUrl(path.join("theme-icons", file.filename));
  response.json({ url });
});

app.delete("/api/themes/:id", requireAuth, async (request: AuthedRequest, response) => {
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

app.post("/api/pages", requireAuth, async (request: AuthedRequest, response) => {
  const publicCode = await createUniquePublicCode();
  const rows = await sql`
    INSERT INTO birthday_pages (
      user_id,
      public_code,
      recipient_name,
      birthday_date,
      theme,
      creator_message,
      soundtrack_id,
      allow_photos,
      allow_audio,
      require_names,
      close_date,
      status
    )
    VALUES (
      ${request.user!.id},
      ${publicCode},
      ${String(request.body.recipientName || "").trim()},
      ${String(request.body.birthdayDate)},
      ${String(request.body.theme || "elegant")},
      ${sanitizeDisplayName(request.body.creatorMessage)},
      ${String(request.body.soundtrackId || "golden-hour")},
      ${Boolean(request.body.allowPhotos ?? true)},
      ${Boolean(request.body.allowAudio ?? true)},
      ${Boolean(request.body.requireNames ?? true)},
      ${String(request.body.closeDate || request.body.birthdayDate)},
      'active'
    )
    RETURNING *
  `;

  response.status(201).json(rows[0]);
});

app.get("/api/pages/:id", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await privatePageQuery(String(request.params.id), request.user!.id);

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(serializePageDates(rows[0]));
});

app.get("/api/pages/:id/messages", requireAuth, async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messages = await fetchMessagesForPage(String(pageRows[0].id));
  response.json(messages);
});

app.get("/api/pages/:id/ownership", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id, public_code
    FROM birthday_pages
    WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  response.json({ isOwner: Boolean(rows[0]), publicCode: rows[0] ? String(rows[0].public_code) : null });
});

app.get("/api/pages/:id/save-status", requireAuth, async (request: AuthedRequest, response) => {
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

app.post("/api/pages/:id/save", requireAuth, async (request: AuthedRequest, response) => {
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

app.delete("/api/pages/:id/save", requireAuth, async (request: AuthedRequest, response) => {
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

app.delete("/api/pages/:id/messages/:messageId", requireAuth, async (request: AuthedRequest, response) => {
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

app.delete("/api/pages/:id/messages/:messageId/audio", requireAuth, async (request: AuthedRequest, response) => {
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

app.delete("/api/pages/:id/messages/photos/:photoId", requireAuth, async (request: AuthedRequest, response) => {
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

app.patch("/api/pages/:id", requireAuth, async (request: AuthedRequest, response) => {
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

app.delete("/api/pages/:id", requireAuth, async (request: AuthedRequest, response) => {
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

app.post("/api/uploads/cover", requireAuth, coverUpload.single("file"), async (request: AuthedRequest, response) => {
  const pageIdOrCode = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageIdOrCode) {
    response.status(400).json({ error: "Missing file upload or page id" });
    logRequestFailure("upload-cover", { userId: request.user?.id, pageId: pageIdOrCode, reason: "missing-file-or-page" });
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
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await removeFileByUrl(page.cover_photo_url);
  const url = fileUrl(path.join("covers", file.filename));

  await sql`
    UPDATE birthday_pages
    SET cover_photo_url = ${url}, updated_at = NOW()
    WHERE id = ${page.id}
      AND user_id = ${request.user!.id}
  `;

  response.json({ url });
});

app.post("/api/uploads/page-soundtrack", requireAuth, pageAudioUpload.single("file"), async (request: AuthedRequest, response) => {
  const pageIdOrCode = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageIdOrCode) {
    response.status(400).json({ error: "Missing audio upload or page id" });
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

app.get("/api/public/pages/:id", async (request, response) => {
  const resolvedPageId = await resolvePageId(request.params.id);
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

app.get("/api/public/pages/:id/messages", async (request, response) => {
  const resolvedPageId = await resolvePageId(request.params.id);
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

app.post("/api/public/pages/:id/message-photo", rateLimit("public-photo", 18, 10 * 60 * 1000), messageUpload.single("file"), async (request, response) => {
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

  response.json({ url: fileUrl(path.join("messages", file.filename)) });
});

app.post("/api/public/pages/:id/message-audio", rateLimit("public-audio", 12, 10 * 60 * 1000), wishAudioUpload.single("file"), async (request, response) => {
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

  response.json({ url: fileUrl(path.join("wish-audio", file.filename)) });
});

app.post("/api/public/pages/:id/messages", rateLimit("public-message", 24, 10 * 60 * 1000), async (request, response) => {
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

app.get("/api/og-image/:id", async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(request.params.id);
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

app.get("/api/og/:id", async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(request.params.id);
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
  response.status(500).json({ error: error.message || "Internal server error" });
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
