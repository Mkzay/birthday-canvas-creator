import express from "express";
import { requireAuth } from "../auth";
import { sql } from "../db";
import type { AuthedRequest } from "../types";
import { validateBody } from "../validateRequest";
import {
  paystackInitializeBodySchema,
  paystackVerifyBodySchema,
  bachsInitializeBodySchema,
  bachsVerifyBodySchema,
} from "../schemas";
import {
  PRO_ONE_TIME_AMOUNT_KOBO,
  PRO_OFFER_CURRENCY,
  PRO_OFFER_PURCHASE_TYPE,
  PRO_OFFER_FEATURES,
  getProAmountKobo,
  paystackRequest,
  processPaystackSuccessfulPayment,
  getPaystackSecretKey,
  isValidPaystackSignature,
  upsertSuccessfulPoolContributionFromPayment,
  type PaystackPaymentData,
} from "../services/paystackService";
import {
  getProAmountBachsDecimal,
  bachsRequest,
  processBachsSuccessfulPayment,
  handleBachsWebhook,
} from "../services/bachsService";
import {
  getClientOriginForRequest,
  logRequestFailure,
  sendAuth,
  sessionUserFromRow,
} from "../services/requestUtils";
import { resolvePageId } from "../services/pageQueries";

export { handleBachsWebhook };

export const billingRouter = express.Router();

billingRouter.get("/pro-offer", async (_request, response) => {
  response.json({
    amountKobo: PRO_ONE_TIME_AMOUNT_KOBO,
    currency: PRO_OFFER_CURRENCY,
    purchaseType: PRO_OFFER_PURCHASE_TYPE,
    features: PRO_OFFER_FEATURES,
  });
});

billingRouter.post(
  "/paystack/initialize",
  requireAuth,
  validateBody(paystackInitializeBodySchema),
  async (request: AuthedRequest, response) => {
    const user = request.user!;
    if (user.planTier === "pro") {
      response.json({
        alreadyPro: true,
        authorizationUrl: null,
        message: "Account is already on Pro.",
      });
      return;
    }

    try {
      const callbackPath = typeof request.body.callbackPath === "string" && request.body.callbackPath.startsWith("/")
        ? request.body.callbackPath
        : "/upgrade";

      const callbackUrl = `${getClientOriginForRequest(request)}${callbackPath}`;
      const amount = getProAmountKobo();

      const data = await paystackRequest<{ authorization_url: string; reference: string }>("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          amount,
          callback_url: callbackUrl,
          metadata: {
            userId: user.id,
            planTier: "pro",
            purchaseType: PRO_OFFER_PURCHASE_TYPE,
            offerAmountKobo: amount,
          },
        }),
      });

      response.json({
        authorizationUrl: data.authorization_url,
        reference: data.reference,
        amount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "paystack-initialize-failed";
      logRequestFailure("paystack-initialize", { userId: user.id, message });

      if (message === "PAYSTACK_NOT_CONFIGURED") {
        response.status(500).json({ error: "Paystack is not configured on the server." });
        return;
      }

      response.status(502).json({ error: "Could not initialize payment right now." });
    }
  },
);

billingRouter.post(
  "/paystack/verify",
  requireAuth,
  validateBody(paystackVerifyBodySchema),
  async (request: AuthedRequest, response) => {
    const user = request.user!;
    if (user.planTier === "pro") {
      response.json({ verified: true, alreadyPro: true, user });
      return;
    }

    const reference = String(request.body.reference);

    try {
      const data = await paystackRequest<PaystackPaymentData>(`/transaction/verify/${encodeURIComponent(reference)}`);
      const result = await processPaystackSuccessfulPayment(data, {
        source: "verify-endpoint",
        expectedUserId: user.id,
        expectedUserEmail: user.email,
        rawPayload: data,
      });

      if (result.status === "ignored") {
        response.status(400).json({ error: "Payment was not completed.", code: "PAYMENT_NOT_SUCCESS" });
        return;
      }

      if (result.status === "conflict") {
        response.status(403).json({ error: "Payment reference does not belong to this user.", code: "PAYMENT_ACCOUNT_MISMATCH" });
        return;
      }

      if (result.status === "user-not-found" || !result.userId) {
        response.status(404).json({ error: "User not found." });
        return;
      }

      const rows = await sql`
        SELECT id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
        FROM users
        WHERE id = ${result.userId}
        LIMIT 1
      `;

      if (!rows[0]) {
        response.status(404).json({ error: "User not found." });
        return;
      }

      await sendAuth(response, sessionUserFromRow(rows[0]));
    } catch (error) {
      const message = error instanceof Error ? error.message : "paystack-verify-failed";
      logRequestFailure("paystack-verify", { userId: user.id, reference, message });

      if (message === "PAYSTACK_NOT_CONFIGURED") {
        response.status(500).json({ error: "Paystack is not configured on the server." });
        return;
      }

      response.status(502).json({ error: "Could not verify payment right now." });
    }
  },
);

billingRouter.post(
  "/bachs/initialize",
  requireAuth,
  validateBody(bachsInitializeBodySchema),
  async (request: AuthedRequest, response) => {
    const user = request.user!;
    if (user.planTier === "pro") {
      response.json({
        alreadyPro: true,
        authorizationUrl: null,
        checkoutUrl: null,
        message: "Account is already on Pro.",
      });
      return;
    }

    try {
      const callbackPath = typeof request.body.callbackPath === "string" && request.body.callbackPath.startsWith("/")
        ? request.body.callbackPath
        : "/billing";

      let clientOrigin = getClientOriginForRequest(request);
      const callbackOverride = (process.env.BACHS_CALLBACK_ORIGIN || "").trim();
      if (callbackOverride) {
        clientOrigin = callbackOverride.replace(/\/+$/, "");
      } else if (clientOrigin.includes("localhost") || clientOrigin.includes("127.0.0.1")) {
        // Bachs rejects localhost in success_url and cancel_url with a 400 validation error.
        // In local dev without a tunnel, fallback to the public web origin so session creation succeeds.
        clientOrigin = "https://wishcanvas.app";
      }

      const callbackUrl = `${clientOrigin}${callbackPath}`;
      const successUrl = `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}checkout_id={CHECKOUT_ID}`;
      const cancelUrl = callbackUrl;
      const amountDecimal = getProAmountBachsDecimal();
      const reference = `wc_pro_${user.id}_${Date.now()}`;

      const data = await bachsRequest<{
        checkout_id: string;
        checkout_url: string;
        status: string;
      }>("/v1/checkout-sessions", {
        method: "POST",
        body: JSON.stringify({
          pricing: {
            currency: PRO_OFFER_CURRENCY,
            amount: amountDecimal,
          },
          customer: {
            email: user.email,
            name: user.displayName || user.email,
          },
          reference,
          metadata: {
            userId: user.id,
            planTier: "pro",
            purchaseType: PRO_OFFER_PURCHASE_TYPE,
            offerAmountKobo: getProAmountKobo(),
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      response.json({
        authorizationUrl: data.checkout_url,
        checkoutUrl: data.checkout_url,
        checkoutId: data.checkout_id,
        reference,
        amountDecimal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "bachs-initialize-failed";
      logRequestFailure("bachs-initialize", { userId: user.id, message });

      if (message === "BACHS_NOT_CONFIGURED") {
        response.status(500).json({ error: "Bachs is not configured on the server." });
        return;
      }

      response.status(502).json({
        error: "Could not initialize payment with Bachs right now.",
        detail: message,
      });
    }
  },
);

billingRouter.post(
  "/bachs/verify",
  requireAuth,
  validateBody(bachsVerifyBodySchema),
  async (request: AuthedRequest, response) => {
    const user = request.user!;
    if (user.planTier === "pro") {
      response.json({ verified: true, alreadyPro: true, user });
      return;
    }

    const checkoutId = request.body.checkoutId ? String(request.body.checkoutId) : "";
    const reference = request.body.reference ? String(request.body.reference) : "";
    const lookupKey = checkoutId || reference;

    if (!lookupKey) {
      response.status(400).json({ error: "Missing checkout ID or reference." });
      return;
    }

    try {
      const existingPaymentRows = await sql`
        SELECT user_id, status
        FROM billing_payments
        WHERE provider = 'bachs'
          AND (provider_reference = ${lookupKey} OR provider_reference = ${checkoutId} OR provider_reference = ${reference})
          AND status IN ('success', 'succeeded', 'SUCCEEDED', 'completed', 'COMPLETED')
        LIMIT 1
      `;

      if (existingPaymentRows[0]) {
        const refreshedUserRows = await sql`
          SELECT id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
          FROM users
          WHERE id = ${user.id}
          LIMIT 1
        `;
        if (refreshedUserRows[0]) {
          await sendAuth(response, sessionUserFromRow(refreshedUserRows[0]));
          return;
        }
      }

      const sessionData = await bachsRequest<any>(`/v1/checkout-sessions/${encodeURIComponent(lookupKey)}`);
      const sessionStatus = String(sessionData.status || "").toLowerCase();
      const paymentStatus = String(sessionData.payment_status || "").toLowerCase();

      const isCompleted = sessionStatus === "completed" || sessionStatus === "succeeded" || sessionStatus === "paid" || paymentStatus === "paid";
      if (!isCompleted) {
        response.status(400).json({
          error: "Payment was not completed yet.",
          code: "PAYMENT_NOT_SUCCESS",
          status: sessionData.status,
        });
        return;
      }

      const result = await processBachsSuccessfulPayment(
        {
          checkout_id: sessionData.checkout_id || lookupKey,
          reference: sessionData.reference || lookupKey,
          status: "succeeded",
          amount: sessionData.amount || sessionData.pricing?.amount || getProAmountBachsDecimal(),
          currency: sessionData.currency || sessionData.pricing?.currency || PRO_OFFER_CURRENCY,
          customer: sessionData.customer || { email: user.email, name: user.displayName },
          metadata: sessionData.metadata,
        },
        {
          source: "verify-endpoint",
          expectedUserId: user.id,
          expectedUserEmail: user.email,
          rawPayload: sessionData,
        },
      );

      if (result.status === "conflict") {
        response.status(403).json({ error: "Payment reference does not belong to this user.", code: "PAYMENT_ACCOUNT_MISMATCH" });
        return;
      }

      if (result.status === "user-not-found" || !result.userId) {
        response.status(404).json({ error: "User not found." });
        return;
      }

      const rows = await sql`
        SELECT id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
        FROM users
        WHERE id = ${result.userId}
        LIMIT 1
      `;

      if (!rows[0]) {
        response.status(404).json({ error: "User not found." });
        return;
      }

      await sendAuth(response, sessionUserFromRow(rows[0]));
    } catch (error) {
      const message = error instanceof Error ? error.message : "bachs-verify-failed";
      logRequestFailure("bachs-verify", { userId: user.id, lookupKey, message });

      if (message === "BACHS_NOT_CONFIGURED") {
        response.status(500).json({ error: "Bachs is not configured on the server." });
        return;
      }

      response.status(502).json({ error: "Could not verify payment with Bachs right now." });
    }
  },
);

export const handlePaystackWebhook: express.RequestHandler = async (request, response) => {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    response.status(503).json({ error: "Paystack is not configured on the server." });
    return;
  }

  const signature = typeof request.headers["x-paystack-signature"] === "string"
    ? request.headers["x-paystack-signature"]
    : "";

  const rawBody = Buffer.isBuffer(request.body)
    ? request.body.toString("utf8")
    : typeof request.body === "string"
      ? request.body
      : "";

  if (!isValidPaystackSignature(rawBody, signature, secretKey)) {
    response.status(401).json({ error: "Invalid Paystack signature." });
    return;
  }

  type PaystackWebhookEvent = {
    event?: string;
    data?: PaystackPaymentData;
  };

  let eventPayload: PaystackWebhookEvent;
  try {
    eventPayload = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    response.status(400).json({ error: "Invalid webhook payload." });
    return;
  }

  if (eventPayload.event !== "charge.success") {
    response.json({ ok: true, ignored: true });
    return;
  }

  const eventData = eventPayload.data;
  if (!eventData || eventData.status !== "success") {
    response.json({ ok: true, ignored: true });
    return;
  }

  try {
    const webhookPurpose = typeof eventData.metadata?.purpose === "string" ? eventData.metadata.purpose : "";
    const webhookPageId = typeof eventData.metadata?.pageId === "string" ? eventData.metadata.pageId : "";

    if (webhookPurpose === "pool_gift" || webhookPageId) {
      const resolvedPageId = await resolvePageId(webhookPageId);
      if (!resolvedPageId) {
        response.json({ ok: true, ignored: true });
        return;
      }

      await upsertSuccessfulPoolContributionFromPayment(resolvedPageId, eventData, eventPayload);
      response.json({ ok: true });
      return;
    }

    const result = await processPaystackSuccessfulPayment(eventData, {
      source: "webhook",
      rawPayload: eventPayload,
    });

    if (result.status === "conflict") {
      logRequestFailure("paystack-webhook-conflict", {
        reference: eventData.reference || "",
      });
      response.status(409).json({ error: "Payment reference conflict." });
      return;
    }

    if (result.status === "user-not-found" || result.status === "ignored") {
      response.json({ ok: true, ignored: true });
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "paystack-webhook-db-update-failed";
    logRequestFailure("paystack-webhook", {
      reference: eventData.reference || "",
      message,
    });
    response.status(500).json({ error: "Could not process webhook." });
    return;
  }

  response.json({ ok: true });
};
