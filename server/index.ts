import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import type { Response } from "express";
import { clearSessionCookie, hashPassword, readSession, requireAuth, setSessionCookie, signSession, verifyPassword } from "./auth";
import { initializeDatabase, sql } from "./db";
import type { AuthedRequest, SessionUser } from "./types";
import { avatarUpload, coverUpload, fileUrl, messageUpload, pageAudioUpload, removeFileByUrl, uploadsRoot, wishAudioUpload } from "./uploads";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);

function getAllowedOrigins() {
  const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:8080";
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (process.env.ALLOW_VERCEL_PREVIEWS === "true" && /^https:\/\/.*\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

const allowedOrigins = getAllowedOrigins();
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

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
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsRoot));

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
  return Math.random().toString(36).slice(2, 12);
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
    return null;
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
      bp.recipient_name,
      bp.birthday_date,
      bp.theme,
      ct.emoji AS theme_emoji,
      ct.gradient_from AS theme_gradient_from,
      ct.gradient_to AS theme_gradient_to,
      ct.font AS theme_font,
      CASE WHEN CURRENT_DATE >= bp.birthday_date THEN bp.creator_message ELSE NULL END AS creator_message,
      bp.cover_photo_url,
      bp.soundtrack_id,
      bp.custom_audio_url,
      bp.allow_photos,
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
      ct.font AS theme_font,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    LEFT JOIN custom_themes ct ON bp.theme = CONCAT('custom_', ct.id::text)
    WHERE bp.id = ${pageId}
      AND bp.user_id = ${userId}
    GROUP BY bp.id, ct.id
  `;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/auth/session", async (request, response) => {
  const session = readSession(request as AuthedRequest);
  if (!session) {
    response.json({ user: null });
    return;
  }

  const rows = await sql`
    SELECT id, email, display_name, avatar_url, default_theme, default_allow_photos, default_require_names
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
    RETURNING id, email, display_name, avatar_url, default_theme, default_allow_photos, default_require_names
  `;

  sendAuth(response, sessionUserFromRow(rows[0]));
});

app.post("/api/auth/login", rateLimit("auth-login", 10, 15 * 60 * 1000), async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";

  const rows = await sql`
    SELECT id, email, password_hash, display_name, avatar_url, default_theme, default_allow_photos, default_require_names
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  const user = rows[0];
  if (!user) {
    response.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const matches = await verifyPassword(password, user.password_hash);
  if (!matches) {
    response.status(401).json({ error: "Invalid email or password" });
    return;
  }

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
    RETURNING id, email, display_name, avatar_url, default_theme, default_allow_photos, default_require_names
  `;

  sendAuth(response, sessionUserFromRow(rows[0]));
});

app.patch("/api/auth/preferences", requireAuth, async (request: AuthedRequest, response) => {
  const defaultTheme = typeof request.body.defaultTheme === "string" ? request.body.defaultTheme.trim() : "elegant";
  const defaultAllowPhotos = Boolean(request.body.defaultAllowPhotos ?? true);
  const defaultRequireNames = Boolean(request.body.defaultRequireNames ?? true);

  const rows = await sql`
    UPDATE users
    SET
      default_theme = ${defaultTheme},
      default_allow_photos = ${defaultAllowPhotos},
      default_require_names = ${defaultRequireNames},
      updated_at = NOW()
    WHERE id = ${request.user!.id}
    RETURNING id, email, display_name, avatar_url, default_theme, default_allow_photos, default_require_names
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

  removeFileByUrl(existingRows[0]?.avatar_url);
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

  fileRows.forEach((row) => removeFileByUrl(row.url));

  await sql`
    DELETE FROM users
    WHERE id = ${userId}
  `;

  clearSessionCookie(response);
  response.status(204).end();
});

app.get("/api/themes", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id, name, emoji, gradient_from, gradient_to, font, created_at, updated_at
    FROM custom_themes
    WHERE user_id = ${request.user!.id}
    ORDER BY created_at DESC
  `;

  response.json(rows);
});

app.post("/api/themes", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    INSERT INTO custom_themes (user_id, name, emoji, gradient_from, gradient_to, font)
    VALUES (
      ${request.user!.id},
      ${String(request.body.name || "").trim()},
      ${String(request.body.emoji || "🎨")},
      ${String(request.body.gradientFrom || "#f472b6")},
      ${String(request.body.gradientTo || "#8b5cf6")},
      ${String(request.body.font || "sans")}
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
      font = ${String(request.body.font || "sans")},
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
    GROUP BY bp.id
    ORDER BY bp.created_at DESC
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

  const messages = await fetchMessagesForPage(String(request.params.id));
  response.json(messages);
});

app.get("/api/pages/:id/ownership", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id, public_code
    FROM birthday_pages
    WHERE id = ${request.params.id}
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  response.json({ isOwner: Boolean(rows[0]), publicCode: rows[0] ? String(rows[0].public_code) : null });
});

app.patch("/api/pages/:id", requireAuth, async (request: AuthedRequest, response) => {
  const hasCoverPhotoUrl = Object.prototype.hasOwnProperty.call(request.body, "coverPhotoUrl");
  const hasCustomAudioUrl = Object.prototype.hasOwnProperty.call(request.body, "pageCustomAudioUrl");

  if (hasCustomAudioUrl) {
    const existingRows = await sql`
      SELECT custom_audio_url
      FROM birthday_pages
      WHERE id = ${request.params.id}
        AND user_id = ${request.user!.id}
      LIMIT 1
    `;

    if (!existingRows[0]) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const nextAudioUrl = request.body.pageCustomAudioUrl || null;
    if (existingRows[0].custom_audio_url && existingRows[0].custom_audio_url !== nextAudioUrl) {
      removeFileByUrl(existingRows[0].custom_audio_url);
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
          require_names = ${Boolean(request.body.requireNames ?? true)},
          close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
          cover_photo_url = ${request.body.coverPhotoUrl || null},
          custom_audio_url = ${request.body.pageCustomAudioUrl || null},
          updated_at = NOW()
        WHERE id = ${request.params.id}
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
          require_names = ${Boolean(request.body.requireNames ?? true)},
          close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
          updated_at = NOW()
        WHERE id = ${request.params.id}
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
    SELECT cover_photo_url, custom_audio_url
    FROM birthday_pages
    WHERE id = ${request.params.id}
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messagePhotos = await sql`
    SELECT bm.photo_url
    FROM birthday_messages bm
    INNER JOIN birthday_pages bp ON bp.id = bm.page_id
    WHERE bp.id = ${request.params.id}
      AND bp.user_id = ${request.user!.id}
      AND bm.photo_url IS NOT NULL
    UNION ALL
    SELECT bm.audio_url AS photo_url
    FROM birthday_messages bm
    INNER JOIN birthday_pages bp ON bp.id = bm.page_id
    WHERE bp.id = ${request.params.id}
      AND bp.user_id = ${request.user!.id}
      AND bm.audio_url IS NOT NULL
    UNION ALL
    SELECT bmp.photo_url
    FROM birthday_message_photos bmp
    INNER JOIN birthday_messages bm ON bm.id = bmp.message_id
    INNER JOIN birthday_pages bp ON bp.id = bm.page_id
    WHERE bp.id = ${request.params.id}
      AND bp.user_id = ${request.user!.id}
  `;

  removeFileByUrl(rows[0].cover_photo_url);
  removeFileByUrl(rows[0].custom_audio_url);
  messagePhotos.forEach((row) => removeFileByUrl(row.photo_url));

  await sql`
    DELETE FROM birthday_pages
    WHERE id = ${request.params.id}
      AND user_id = ${request.user!.id}
  `;

  response.status(204).end();
});

app.post("/api/uploads/cover", requireAuth, coverUpload.single("file"), async (request: AuthedRequest, response) => {
  const pageId = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageId) {
    response.status(400).json({ error: "Missing file upload or page id" });
    logRequestFailure("upload-cover", { userId: request.user?.id, pageId, reason: "missing-file-or-page" });
    return;
  }

  const rows = await sql`
    SELECT cover_photo_url
    FROM birthday_pages
    WHERE id = ${pageId}
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  removeFileByUrl(rows[0].cover_photo_url);
  const url = fileUrl(path.join("covers", file.filename));

  await sql`
    UPDATE birthday_pages
    SET cover_photo_url = ${url}, updated_at = NOW()
    WHERE id = ${pageId}
      AND user_id = ${request.user!.id}
  `;

  response.json({ url });
});

app.post("/api/uploads/page-soundtrack", requireAuth, pageAudioUpload.single("file"), async (request: AuthedRequest, response) => {
  const pageId = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageId) {
    response.status(400).json({ error: "Missing audio upload or page id" });
    return;
  }

  const rows = await sql`
    SELECT custom_audio_url
    FROM birthday_pages
    WHERE id = ${pageId}
      AND user_id = ${request.user!.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  removeFileByUrl(rows[0].custom_audio_url);
  const url = fileUrl(path.join("page-audio", file.filename));

  await sql`
    UPDATE birthday_pages
    SET custom_audio_url = ${url}, updated_at = NOW()
    WHERE id = ${pageId}
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

  if (!page.can_contribute) {
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
  const message = typeof request.body.message === "string" ? request.body.message.trim() : "";
  const photoUrl = typeof request.body.photoUrl === "string" ? request.body.photoUrl.trim() : null;
  const audioUrl = typeof request.body.audioUrl === "string" ? request.body.audioUrl.trim() : null;
  const normalizedPhotos = normalizeContributionPhotos(request.body.photos);
  const photos = normalizedPhotos.length
    ? normalizedPhotos
    : photoUrl
      ? [{ url: photoUrl, caption: null, sortOrder: 0 }]
      : [];

  if (!message) {
      response.status(400).json({ error: "Please write a message" });
      logRequestFailure("create-message", { pageId: resolvedPageId, reason: "empty-message" });
      return;
  }

  if (message.length > 500) {
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

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: error.message || "Internal server error" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`WishCanvas API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
