import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { sql } from "../db";
import { requireAdmin } from "../auth";
import type { AuthedRequest } from "../types";
import { validateBody } from "../validateRequest";
import {
  systemTestEmailBodySchema,
  birthdayNotifyBodySchema,
  cronNotifyBodySchema,
} from "../schemas";
import {
  systemTestEmailLimiter,
  systemBirthdayNotifyLimiter,
  systemBirthdayCronLimiter,
  healthEndpointLimiter,
} from "../rateLimits";
import { isMailerConfigured, sendTransactionalEmail } from "../mailer";
import { sendBirthdayRecipientEmail, sendBirthdayReminderEmail } from "../emailFlows";
import { uploadsRoot } from "../uploads";
import { serializePageDates } from "../services/pageQueries";
import { sanitizeEmail, logRequestFailure } from "../services/requestUtils";
import { exposeErrorToClient } from "../errors";

export const adminRouter = express.Router();
export const systemRouter = express.Router();

export async function buildHealthPayload() {
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

export const handleHealthCheck: express.RequestHandler = async (_request, response) => {
  const payload = await buildHealthPayload();
  response.status(payload.ok ? 200 : 503).json(payload);
};

// ==========================================
// Admin Routes (/api/admin/*)
// ==========================================

adminRouter.get("/birthday-pages", requireAdmin, async (_request, response) => {
  const rows = await sql`
    SELECT
      bp.id,
      bp.public_code,
      bp.recipient_name,
      bp.recipient_email,
      bp.birthday_date,
      bp.reveal_at,
      bp.close_date,
      bp.theme,
      bp.status,
      bp.created_at,
      bp.updated_at,
      bp.view_count,
      bp.pool_fundraising_enabled,
      bp.pooled_amount_kobo,
      u.id AS owner_user_id,
      COALESCE(u.display_name, 'Guest Creator') AS owner_display_name,
      COALESCE(u.email, bp.guest_email) AS owner_email,
      COALESCE(u.plan_tier, 'free') AS owner_plan_tier,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN users u ON u.id = bp.user_id
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    WHERE bp.owner_deleted IS NOT TRUE
    GROUP BY bp.id, u.id
    ORDER BY bp.created_at DESC
    LIMIT 1000
  `;

  response.json(rows.map((row) => serializePageDates(row)));
});

// ==========================================
// System Routes (/api/system/*)
// ==========================================

systemRouter.get("/status", requireAdmin, async (_request, response) => {
  const payload = await buildHealthPayload();
  const statsRows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM birthday_pages WHERE COALESCE(owner_deleted, FALSE) = FALSE) AS total_pages,
      (SELECT COALESCE(SUM(view_count), 0)::int FROM birthday_pages WHERE COALESCE(owner_deleted, FALSE) = FALSE) AS total_visitors
  `;

  const stats = statsRows[0] || { total_users: 0, total_pages: 0, total_visitors: 0 };

  response.status(payload.ok ? 200 : 503).json({
    ...payload,
    meta: {
      node_env: process.env.NODE_ENV || "development",
    },
    stats: {
      total_users: Number(stats.total_users || 0),
      total_pages: Number(stats.total_pages || 0),
      total_visitors: Number(stats.total_visitors || 0),
    },
  });
});

systemRouter.post(
  "/test-email",
  requireAdmin,
  systemTestEmailLimiter,
  validateBody(systemTestEmailBodySchema),
  async (request: AuthedRequest, response) => {
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
      <div style="background-color: #fbf9f6; padding: 36px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #f1e5dc; box-shadow: 0 10px 28px rgba(15,23,42,0.06); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #090514 0%, #170b2e 50%, #29081a 100%); padding: 28px 32px; color: #ffffff;">
            <span style="display: inline-block; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px;">
              &#10024; System Diagnostic
            </span>
            <h2 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.02em;">Resend is Connected</h2>
          </div>
          <div style="padding: 28px 32px; color: #0f172a; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 14px;">This is a test notification from <strong style="color: #e11d48;">${appName}</strong> confirming that your transactional email pipeline is operating smoothly.</p>
            <div style="background: #faf8f5; border: 1px solid #f1e5dc; border-radius: 12px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #64748b;">
              Timestamp : <strong>${new Date().toISOString()}</strong>
            </div>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">All system emails are formatted in the modern WishCanvas celebration design system.</p>
          </div>
        </div>
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
  },
);

export async function sendBirthdayNotifications(targetDate: string | null, options?: { dryRun?: boolean }) {
  const normalizedDate = targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null;
  const dryRun = Boolean(options?.dryRun);
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
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    WHERE bp.status = 'active'
      AND bp.owner_deleted IS NOT TRUE
      AND bp.birthday_date = COALESCE(${normalizedDate}::date, CURRENT_DATE)
    GROUP BY bp.id, u.id
  `;

  const currentYear = normalizedDate ? Number(normalizedDate.slice(0, 4)) : new Date().getUTCFullYear();
  const results: Array<{
    pageId: string;
    publicCode: string;
    recipientName: string;
    birthdayDate: string;
    messageCount: number;
    recipientEmail: string | null;
    ownerEmail: string | null;
    ownerWillBeNotified: boolean;
    recipientDeliveryEmail: string | null;
    sent: boolean;
    reason?: string;
  }> = [];

  for (const row of rows) {
    const pageId = String(row.id);
    const publicCode = String(row.public_code);
    const recipientName = String(row.recipient_name);
    const birthdayDate = String(row.birthday_date);
    const messageCount = Number(row.message_count || 0);
    const ownerEmail = sanitizeEmail(row.owner_email);
    const ownerCanReceiveNotifications = Boolean(row.email_notifications ?? true) && Boolean(row.birthday_reminders ?? true);
    const ownerWillBeNotified = Boolean(ownerEmail && ownerCanReceiveNotifications);
    const recipientEmail = sanitizeEmail(row.recipient_email);
    const toEmail = recipientEmail || ownerEmail;

    const alreadyNotified = Number(row.birthday_notified_year || 0) >= currentYear;
    if (alreadyNotified) {
      results.push({
        pageId,
        publicCode,
        recipientName,
        birthdayDate,
        messageCount,
        recipientEmail,
        ownerEmail,
        ownerWillBeNotified,
        recipientDeliveryEmail: toEmail,
        sent: false,
        reason: "already-notified-this-year",
      });
      continue;
    }

    if (!toEmail) {
      results.push({
        pageId,
        publicCode,
        recipientName,
        birthdayDate,
        messageCount,
        recipientEmail,
        ownerEmail,
        ownerWillBeNotified,
        recipientDeliveryEmail: null,
        sent: false,
        reason: "missing-recipient-email",
      });
      continue;
    }

    if (dryRun) {
      results.push({
        pageId,
        publicCode,
        recipientName,
        birthdayDate,
        messageCount,
        recipientEmail,
        ownerEmail,
        ownerWillBeNotified,
        recipientDeliveryEmail: toEmail,
        sent: false,
        reason: "dry-run",
      });
      continue;
    }

    try {
      if (ownerWillBeNotified && ownerEmail) {
        await sendBirthdayReminderEmail({
          to: ownerEmail,
          recipientName,
          publicCode,
          messageCount,
          birthdayDate,
          ownerName: typeof row.owner_display_name === "string" ? row.owner_display_name : null,
        });
      }

      await sendBirthdayRecipientEmail({
        to: toEmail,
        recipientName,
        publicCode,
        messageCount,
      });

      await sql`
        UPDATE birthday_pages
        SET birthday_notified_year = ${currentYear}, updated_at = NOW()
        WHERE id = ${pageId}
      `;

      results.push({
        pageId,
        publicCode,
        recipientName,
        birthdayDate,
        messageCount,
        recipientEmail,
        ownerEmail,
        ownerWillBeNotified,
        recipientDeliveryEmail: toEmail,
        sent: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "birthday-email-send-failed";
      logRequestFailure("birthday-notification", { pageId, message });
      results.push({
        pageId,
        publicCode,
        recipientName,
        birthdayDate,
        messageCount,
        recipientEmail,
        ownerEmail,
        ownerWillBeNotified,
        recipientDeliveryEmail: toEmail,
        sent: false,
        reason: exposeErrorToClient(error, "Email send failed."),
      });
    }
  }

  return {
    ok: true,
    dryRun,
    date: normalizedDate || "today",
    total: rows.length,
    sent: results.filter((item) => item.sent).length,
    results,
  };
}

systemRouter.post(
  "/notify-birthdays",
  requireAdmin,
  systemBirthdayNotifyLimiter,
  validateBody(birthdayNotifyBodySchema),
  async (request, response) => {
    const targetDate = typeof request.body.date === "string" ? request.body.date : null;
    const dryRun = Boolean(request.body.dryRun);
    try {
      const payload = await sendBirthdayNotifications(targetDate, { dryRun });
      response.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "birthday-notification-run-failed";
      logRequestFailure("birthday-notification-manual", { message });
      response.status(500).json({ error: exposeErrorToClient(error, "Could not run birthday notifications.") });
    }
  },
);

systemRouter.post(
  "/notify-birthdays/cron",
  systemBirthdayCronLimiter,
  validateBody(cronNotifyBodySchema),
  async (request, response) => {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const providedSecret = typeof request.headers["x-cron-secret"] === "string"
      ? request.headers["x-cron-secret"]
      : (typeof request.body.secret === "string"
        ? request.body.secret
        : (typeof request.query.secret === "string" ? request.query.secret : ""));

    if (!cronSecret || !providedSecret) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const cronSecretBuf = Buffer.from(cronSecret);
    const providedSecretBuf = Buffer.from(providedSecret);
    const isAuthorized =
      cronSecretBuf.length === providedSecretBuf.length &&
      crypto.timingSafeEqual(cronSecretBuf, providedSecretBuf);

    if (!isAuthorized) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const targetDate = typeof request.body.date === "string" ? request.body.date : null;
    const dryRun = Boolean(request.body.dryRun);
    try {
      const payload = await sendBirthdayNotifications(targetDate, { dryRun });
      response.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "birthday-notification-run-failed";
      logRequestFailure("birthday-notification-cron", { message });
      response.status(500).json({ error: exposeErrorToClient(error, "Could not run birthday notifications.") });
    }
  },
);
