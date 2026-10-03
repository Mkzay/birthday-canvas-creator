import type express from "express";
import crypto from "node:crypto";
import { sql } from "../db";
import { PRO_ONE_TIME_AMOUNT_KOBO, PRO_OFFER_CURRENCY } from "./paystackService";
import { logRequestFailure } from "./requestUtils";

export type ProcessBachsPaymentResult = {
  status: "upgraded" | "already-pro" | "conflict" | "user-not-found" | "ignored";
  userId: string | null;
  message?: string;
};

export function getBachsApiKey(): string {
  return process.env.BACHS_API_KEY?.trim() || "";
}

export function getBachsWebhookSecret(): string {
  return process.env.BACHS_WEBHOOK_SECRET?.trim() || "";
}

export function getBachsBaseUrl(): string {
  const apiKey = getBachsApiKey();
  const env = (process.env.BACHS_ENVIRONMENT || "").trim().toLowerCase();
  if (env === "production" || apiKey.startsWith("sk_live_")) {
    return "https://api.bachs.io";
  }
  return "https://sandbox-api.bachs.io";
}

export function getProAmountBachsDecimal(): string {
  const naira = Math.round(PRO_ONE_TIME_AMOUNT_KOBO / 100);
  return `${naira}.00`;
}

export function isValidBachsSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secretKey: string,
): boolean {
  if (!rawBody || !secretKey) return false;

  const v2Header = typeof headers["x-bachs-signature-v2"] === "string" ? headers["x-bachs-signature-v2"] : "";
  const v1Header = typeof headers["x-bachs-signature"] === "string" ? headers["x-bachs-signature"] : "";
  const timestampHeader = typeof headers["x-bachs-timestamp"] === "string" ? headers["x-bachs-timestamp"] : "";

  const nowSec = Math.floor(Date.now() / 1000);
  const toleranceSec = 300;

  if (v2Header) {
    const pairs = v2Header.split(",");
    let timestamp = 0;
    const signatures: string[] = [];

    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key === "t") timestamp = parseInt(val, 10);
      if (key === "v1") signatures.push(val);
    }

    if (!Number.isFinite(timestamp) || Math.abs(nowSec - timestamp) > toleranceSec) {
      return false;
    }

    const message = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", secretKey).update(message, "utf8").digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    return signatures.some((sig) => {
      try {
        const sigBuffer = Buffer.from(sig, "hex");
        return sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
      } catch {
        return false;
      }
    });
  }

  if (v1Header && timestampHeader) {
    const timestamp = parseInt(timestampHeader, 10);
    if (!Number.isFinite(timestamp) || Math.abs(nowSec - timestamp) > toleranceSec) {
      return false;
    }

    const message = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", secretKey).update(message, "utf8").digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    try {
      const actualBuffer = Buffer.from(v1Header, "hex");
      return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  return false;
}

export async function bachsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = getBachsApiKey();
  if (!apiKey) {
    throw new Error("BACHS_NOT_CONFIGURED");
  }

  const baseUrl = getBachsBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json() as any;

  if (!response.ok) {
    const errMsg = payload?.detail || payload?.message || payload?.error || payload?.error_description || "BACHS_REQUEST_FAILED";
    throw new Error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
  }

  return payload as T;
}

export async function processBachsSuccessfulPayment(
  paymentData: {
    checkout_id?: string;
    charge_id?: string;
    reference?: string;
    status?: string;
    amount?: string;
    currency?: string;
    customer?: { id?: string | null; email?: string | null; name?: string | null } | null;
    metadata?: Record<string, unknown> | null;
  },
  options: {
    source: "verify-endpoint" | "webhook";
    expectedUserId?: string;
    expectedUserEmail?: string;
    rawPayload: unknown;
  },
): Promise<ProcessBachsPaymentResult> {
  const reference = paymentData.reference || paymentData.checkout_id || paymentData.charge_id;
  if (!reference) {
    return { status: "ignored", userId: null };
  }

  const normalizedEmail = typeof paymentData.customer?.email === "string"
    ? paymentData.customer.email.trim().toLowerCase()
    : "";
  const metadataUserId = typeof paymentData.metadata?.userId === "string"
    ? String(paymentData.metadata.userId).trim()
    : "";

  if (options.expectedUserEmail && normalizedEmail && normalizedEmail !== options.expectedUserEmail.toLowerCase()) {
    return { status: "conflict", userId: null };
  }

  if (options.expectedUserId && metadataUserId && metadataUserId !== options.expectedUserId) {
    return { status: "conflict", userId: null };
  }

  let targetUserId = options.expectedUserId || metadataUserId;
  if (!targetUserId && normalizedEmail) {
    const rows = await sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `;
    targetUserId = rows[0] ? String(rows[0].id) : "";
  }

  if (!targetUserId) {
    return { status: "user-not-found", userId: null };
  }

  const parsedAmountNaira = parseFloat(paymentData.amount || "5000.00");
  const paidAmountKobo = Number.isFinite(parsedAmountNaira) ? Math.round(parsedAmountNaira * 100) : PRO_ONE_TIME_AMOUNT_KOBO;

  const paymentRows = await sql`
    INSERT INTO billing_payments (
      provider,
      provider_reference,
      user_id,
      email,
      amount_kobo,
      currency,
      status,
      payment_event,
      raw_payload,
      verified_at,
      updated_at
    )
    VALUES (
      'bachs',
      ${reference},
      ${targetUserId},
      ${normalizedEmail || null},
      ${paidAmountKobo},
      ${String(paymentData.currency || PRO_OFFER_CURRENCY)},
      ${String(paymentData.status || 'success')},
      ${options.source},
      ${JSON.stringify(options.rawPayload)}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_reference)
    DO UPDATE
      SET
        user_id = CASE
          WHEN billing_payments.user_id IS NULL OR billing_payments.user_id = EXCLUDED.user_id
            THEN EXCLUDED.user_id
          ELSE billing_payments.user_id
        END,
        email = CASE
          WHEN billing_payments.user_id IS NULL OR billing_payments.user_id = EXCLUDED.user_id
            THEN EXCLUDED.email
          ELSE billing_payments.email
        END,
        amount_kobo = GREATEST(billing_payments.amount_kobo, EXCLUDED.amount_kobo),
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        payment_event = EXCLUDED.payment_event,
        raw_payload = EXCLUDED.raw_payload,
        verified_at = NOW(),
        updated_at = NOW()
    RETURNING user_id
  `;

  const persistedUserId = paymentRows[0]?.user_id ? String(paymentRows[0].user_id) : null;
  if (!persistedUserId || persistedUserId !== targetUserId) {
    return { status: "conflict", userId: persistedUserId };
  }

  const rows = await sql`
    UPDATE users
    SET plan_tier = 'pro', updated_at = NOW()
    WHERE id = ${persistedUserId}
      AND plan_tier <> 'pro'
    RETURNING id
  `;

  return {
    status: rows[0] ? "upgraded" : "already-pro",
    userId: persistedUserId,
  };
}

export const handleBachsWebhook: express.RequestHandler = async (request, response) => {
  const secretKey = getBachsWebhookSecret();
  if (!secretKey) {
    response.status(503).json({ error: "Bachs webhook secret is not configured on the server." });
    return;
  }

  const rawBody = Buffer.isBuffer(request.body)
    ? request.body.toString("utf8")
    : typeof request.body === "string"
      ? request.body
      : "";

  if (!isValidBachsSignature(rawBody, request.headers, secretKey)) {
    response.status(401).json({ error: "Invalid Bachs signature." });
    return;
  }

  type BachsWebhookEvent = {
    id?: string;
    type?: string;
    data?: {
      charge_id?: string;
      checkout_id?: string;
      reference?: string;
      status?: string;
      amount?: string;
      currency?: string;
      customer?: { id?: string | null; email?: string | null; name?: string | null } | null;
      metadata?: Record<string, unknown> | null;
    };
  };

  let eventPayload: BachsWebhookEvent;
  try {
    eventPayload = JSON.parse(rawBody) as BachsWebhookEvent;
  } catch {
    response.status(400).json({ error: "Invalid webhook payload." });
    return;
  }

  const eventType = eventPayload.type || "";
  const allowedEvents = new Set(["collection.succeeded", "checkout.completed"]);
  if (!allowedEvents.has(eventType)) {
    response.json({ ok: true, ignored: true });
    return;
  }

  const eventData = eventPayload.data;
  if (!eventData) {
    response.json({ ok: true, ignored: true });
    return;
  }

  try {
    const result = await processBachsSuccessfulPayment(eventData, {
      source: "webhook",
      rawPayload: eventPayload,
    });

    if (result.status === "conflict") {
      logRequestFailure("bachs-webhook-conflict", {
        reference: eventData.reference || eventData.checkout_id || "",
      });
      response.status(409).json({ error: "Payment reference conflict." });
      return;
    }

    if (result.status === "user-not-found" || result.status === "ignored") {
      response.json({ ok: true, ignored: true });
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "bachs-webhook-db-update-failed";
    logRequestFailure("bachs-webhook", {
      reference: eventData.reference || eventData.checkout_id || "",
      message,
    });
    response.status(500).json({ error: "Could not process webhook." });
    return;
  }

  response.json({ ok: true });
};
