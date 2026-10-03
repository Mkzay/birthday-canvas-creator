import express from "express";
import path from "node:path";
import { sql } from "../db";
import { avatarUpload, fileUrl, removeFileByUrl } from "../uploads";
import { isMailerConfigured } from "../mailer";
import { consumeEmailToken } from "../emailTokens";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../emailFlows";
import {
  clearSessionCookie,
  getActiveSession,
  hashPassword,
  issueAuthSession,
  requireAuth,
  revokeAllSessionsForUser,
  revokeCurrentSession,
  verifyPassword,
} from "../auth";
import {
  authSessionLimiter,
  authSignupLimiter,
  authLoginLimiter,
  authLogoutLimiter,
  authVerifySendLimiter,
  authVerifyConfirmLimiter,
  authPasswordResetRequestLimiter,
  authPasswordResetConfirmLimiter,
  authNotificationsLimiter,
} from "../rateLimits";
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
} from "../schemas";
import { validateBody } from "../validateRequest";
import type { AuthedRequest } from "../types";
import {
  getRequestIp,
  logRequestFailure,
  sanitizeDisplayName,
  sessionUserFromRow,
  sendAuth,
  sendVerificationEmailForUser,
  rejectInvalidUpload,
} from "../services/requestUtils";

export const authRouter = express.Router();

const loginFailureStore = new Map<string, { count: number; lockedUntil: number | null }>();

authRouter.get("/session", authSessionLimiter, async (request, response) => {
  const session = await getActiveSession(request as AuthedRequest, response);
  if (!session) {
    response.json({ user: null });
    return;
  }

  const rows = await sql`
    SELECT id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
    FROM users
    WHERE id = ${session.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    clearSessionCookie(response);
    response.json({ user: null });
    return;
  }

  const freshUser = sessionUserFromRow(rows[0]);
  if (freshUser.planTier !== session.planTier) {
    await issueAuthSession(response, freshUser);
  }

  response.json({ user: freshUser });
});

authRouter.post("/signup", authSignupLimiter, validateBody(signupBodySchema), async (request, response) => {
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
    RETURNING id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
  `;
  const createdUser = rows[0];

  // Automatically claim any guest canvases created with this email
  try {
    await sql`
      UPDATE birthday_pages
      SET user_id = ${createdUser.id},
          guest_email = NULL,
          claim_token_hash = NULL,
          updated_at = NOW()
      WHERE (LOWER(guest_email) = LOWER(${email}) OR (public_code = ${request.body.publicCode || null} AND user_id IS NULL))
        AND user_id IS NULL
    `;
  } catch (claimErr) {
    console.error("Failed to auto-claim guest canvas on signup:", claimErr);
  }

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

authRouter.post("/login", authLoginLimiter, validateBody(loginBodySchema), async (request, response) => {
  const email = request.body.email as string;
  const password = request.body.password as string;
  const rememberMe = Boolean(request.body.rememberMe ?? false);

  const clientIp = getRequestIp(request);
  const key = `${email || "unknown"}:${clientIp}`;
  const now = Date.now();
  const maxFailures = 8;
  const lockoutMs = 15 * 60 * 1000;

  const existingFailure = loginFailureStore.get(key);
  if (existingFailure?.lockedUntil && existingFailure.lockedUntil > now) {
    response.status(429).json({ error: "Too many failed login attempts. Please try again later." });
    return;
  }

  const rows = await sql`
    SELECT id, email, password_hash, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
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

  if (isMailerConfigured() && !user.email_verified_at) {
    response.status(403).json({ error: "Please verify your email before signing in.", code: "EMAIL_NOT_VERIFIED" });
    return;
  }

  loginFailureStore.delete(key);
  await sendAuth(response, sessionUserFromRow(user), rememberMe);
});

authRouter.post("/logout", authLogoutLimiter, async (request: AuthedRequest, response) => {
  await revokeCurrentSession(request);
  clearSessionCookie(response);
  response.status(204).end();
});

authRouter.post("/verify/send", authVerifySendLimiter, validateBody(emailBodySchema), async (request, response) => {
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

authRouter.post("/verify/confirm", authVerifyConfirmLimiter, validateBody(tokenBodySchema), async (request, response) => {
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
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

authRouter.post("/password-reset/request", authPasswordResetRequestLimiter, validateBody(emailBodySchema), async (request, response) => {
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
    const { issueEmailToken, revokeOutstandingEmailTokens } = await import("../emailTokens");
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

authRouter.post("/password-reset/confirm", authPasswordResetConfirmLimiter, validateBody(passwordResetConfirmBodySchema), async (request, response) => {
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  await revokeAllSessionsForUser(String(rows[0].id));
  await sendAuth(response, sessionUserFromRow(rows[0]));
});

authRouter.patch("/profile", requireAuth, validateBody(profilePatchBodySchema), async (request: AuthedRequest, response) => {
  const displayName = sanitizeDisplayName(request.body.displayName);
  const avatarUrl = typeof request.body.avatarUrl === "string" ? request.body.avatarUrl.trim() : "";

  const rows = await sql`
    UPDATE users
    SET
      display_name = ${displayName},
      avatar_url = ${avatarUrl || null},
      updated_at = NOW()
    WHERE id = ${request.user!.id}
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

authRouter.patch("/preferences", requireAuth, validateBody(preferencesPatchBodySchema), async (request: AuthedRequest, response) => {
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

authRouter.patch("/notifications", requireAuth, authNotificationsLimiter, validateBody(notificationsPatchBodySchema), async (request: AuthedRequest, response) => {
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

authRouter.patch("/password", requireAuth, validateBody(passwordChangeBodySchema), async (request: AuthedRequest, response) => {
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

authRouter.delete("/me/data", requireAuth, async (request: AuthedRequest, response) => {
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

export const handleAvatarUpload = async (request: AuthedRequest, response: express.Response) => {
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
  const url = file.path.startsWith("http")
    ? file.path
    : fileUrl(path.join("avatars", file.filename));

  await sql`
    UPDATE users
    SET avatar_url = ${url}, updated_at = NOW()
    WHERE id = ${request.user!.id}
  `;

  response.json({ url });
};

authRouter.post("/avatar", requireAuth, avatarUpload.single("file"), handleAvatarUpload);
