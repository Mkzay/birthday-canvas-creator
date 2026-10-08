import express from "express";
import { requireAuth, requireAdmin } from "../auth";
import { sql } from "../db";
import type { AuthedRequest } from "../types";
import { validateParams, validateBody } from "../validateRequest";
import {
  pageIdParamSchema,
  poolReleaseBodySchema,
  poolContributionInitializeBodySchema,
  paystackVerifyBodySchema,
  adminPoolReconcileBodySchema,
} from "../schemas";
import {
  poolPayoutReleaseLimiter,
  publicPoolPayoutRequestLimiter,
  publicPoolContributionInitLimiter,
} from "../rateLimits";
import {
  resolvePageId,
  publicPageQuery,
  privatePageQuery,
  fetchPublicPoolSummary,
} from "../services/pageQueries";
import {
  sanitizeBankCode,
  sanitizeAccountNumber,
  sanitizeDisplayName,
  sanitizeEmail,
  sanitizeAmountKobo,
  routeParamString,
  getClientOriginForRequest,
  logRequestFailure,
} from "../services/requestUtils";
import {
  calculatePoolPayout,
  calculatePoolContributionCharge,
  paystackRequest,
  classifyPayoutProviderError,
  upsertSuccessfulPoolContributionFromPayment,
  type PaystackPaymentData,
} from "../services/paystackService";
import { sendPoolReleaseRequestEmail } from "../emailFlows";
import { exposeErrorToClient } from "../errors";

export const giftPoolRouter = express.Router();

// ==========================================
// Authenticated Creator Pool Management
// ==========================================

giftPoolRouter.get(
  "/pages/:id/pool/summary",
  requireAuth,
  validateParams(pageIdParamSchema),
  async (request: AuthedRequest, response) => {
    const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
    if (!pageRows[0]) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const pageId = String(pageRows[0].id);
    const rows = await sql`
      SELECT
        bp.pool_fundraising_enabled,
        bp.pool_goal_kobo,
        bp.pooled_amount_kobo,
        bp.pool_description,
        COALESCE(array_remove(array_agg(DISTINCT pc.contributor_name), NULL), ARRAY[]::text[]) AS contributors,
        EXISTS(
          SELECT 1
          FROM pool_payouts pp
          WHERE pp.page_id = bp.id
            AND pp.status = 'processing'
        ) AS is_requested,
        EXISTS(
          SELECT 1
          FROM pool_payouts pp
          WHERE pp.page_id = bp.id
            AND pp.status = 'success'
        ) AS is_released
      FROM birthday_pages bp
      LEFT JOIN pool_contributions pc ON pc.page_id = bp.id AND pc.status = 'success'
      WHERE bp.id = ${pageId}
      GROUP BY bp.id
    `;

    response.json(rows[0] || {
      pool_fundraising_enabled: false,
      pool_goal_kobo: null,
      pooled_amount_kobo: 0,
      pool_description: null,
      contributors: [],
      is_requested: false,
      is_released: false,
    });
  },
);

giftPoolRouter.post(
  "/pages/:id/pool/release",
  requireAuth,
  poolPayoutReleaseLimiter,
  validateParams(pageIdParamSchema),
  validateBody(poolReleaseBodySchema),
  async (request: AuthedRequest, response) => {
    const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
    const page = pageRows[0];
    if (!page) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    if (!page.is_revealed) {
      response.status(403).json({ error: "Payout can only be released after reveal time.", code: "PAYOUT_TOO_EARLY" });
      return;
    }

    const payout = calculatePoolPayout(Number(page.pooled_amount_kobo || 0));
    if (!payout.grossPoolBalanceKobo || payout.grossPoolBalanceKobo <= 0) {
      response.status(400).json({ error: "No pooled amount available for release.", code: "PAYOUT_EMPTY" });
      return;
    }

    if (!payout.payoutAmountKobo || payout.payoutAmountKobo <= 0) {
      response.status(400).json({ error: "Payout amount is too small after fees.", code: "PAYOUT_BELOW_MINIMUM" });
      return;
    }

    const recipientBankCode = sanitizeBankCode(page.recipient_bank_code);
    const recipientAccountNumber = sanitizeAccountNumber(page.recipient_account_number);
    const recipientAccountName = sanitizeDisplayName(page.recipient_account_name);

    if (!recipientBankCode || !recipientAccountNumber || !recipientAccountName) {
      response.status(400).json({ error: "Recipient bank details are incomplete.", code: "PAYOUT_ACCOUNT_REQUIRED" });
      return;
    }

    const payoutStatusCheck = await sql`
      SELECT id, status
      FROM pool_payouts
      WHERE page_id = ${String(page.id)}
        AND provider = 'paystack'
        AND status IN ('success', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (payoutStatusCheck[0]) {
      if (payoutStatusCheck[0].status === "success") {
        response.status(409).json({ error: "Payout already released for this page.", code: "PAYOUT_ALREADY_RELEASED" });
      } else {
        response.status(409).json({ error: "Payout is currently being processed. Please wait a moment.", code: "PAYOUT_IN_PROGRESS" });
      }
      return;
    }

    // Supersede any recipient notification request records
    await sql`
      UPDATE pool_payouts
      SET status = 'superseded', updated_at = NOW()
      WHERE page_id = ${String(page.id)}
        AND provider = 'request'
        AND status = 'processing'
    `;

    const transferRef = `wishcanvas_payout_${String(page.id).replace(/-/g, "").slice(0, 16)}_${Date.now().toString(36)}`;

    const lockRows = await sql`
      INSERT INTO pool_payouts (
        page_id,
        provider,
        provider_reference,
        amount_kobo,
        gross_pool_amount_kobo,
        payout_fee_kobo,
        status,
        created_by_user_id,
        updated_at
      )
      VALUES (
        ${String(page.id)},
        'paystack',
        ${transferRef},
        ${payout.payoutAmountKobo},
        ${payout.grossPoolBalanceKobo},
        ${payout.payoutFeeKobo},
        'processing',
        ${request.user!.id},
        NOW()
      )
      RETURNING id
    `;
    const payoutRecordId = lockRows[0].id;

    try {
      const recipientData = await paystackRequest<{ recipient_code: string }>("/transferrecipient", {
        method: "POST",
        body: JSON.stringify({
          type: "nuban",
          name: recipientAccountName,
          account_number: recipientAccountNumber,
          bank_code: recipientBankCode,
          currency: "NGN",
        }),
      });

      const transferData = await paystackRequest<{ reference: string; transfer_code: string }>("/transfer", {
        method: "POST",
        body: JSON.stringify({
          source: "balance",
          amount: payout.payoutAmountKobo,
          recipient: recipientData.recipient_code,
          reason: `Birthday pooled gift release for ${String(page.recipient_name || "recipient")}`,
          reference: transferRef,
        }),
      });

      await sql`
        UPDATE pool_payouts
        SET status = 'success',
            provider_reference = ${transferData.reference || transferRef},
            response_payload = ${JSON.stringify({ transfer: transferData, recipient: recipientData })}::jsonb,
            updated_at = NOW()
        WHERE id = ${payoutRecordId}
      `;

      response.json({
        status: "success",
        amount_kobo: payout.payoutAmountKobo,
        gross_pool_amount_kobo: payout.grossPoolBalanceKobo,
        payout_fee_kobo: payout.payoutFeeKobo,
        reference: transferData.reference || transferRef,
        transfer_code: transferData.transfer_code,
      });
    } catch (error) {
      const classifiedError = classifyPayoutProviderError(error);
      logRequestFailure("pool-payout-release", {
        pageId: String(page.id),
        userId: request.user?.id || null,
        message: classifiedError.rawMessage,
        code: classifiedError.code,
      });
      await sql`
        UPDATE pool_payouts
        SET status = 'failed',
            response_payload = ${JSON.stringify({ error: classifiedError.rawMessage, code: classifiedError.code })}::jsonb,
            updated_at = NOW()
        WHERE id = ${payoutRecordId}
      `;
      response.status(classifiedError.status).json({
        error: exposeErrorToClient(error, classifiedError.message),
        code: classifiedError.code,
      });
    }
  },
);

// ==========================================
// Public Contributor Crowdfunding Routes
// ==========================================

giftPoolRouter.get(
  "/public/pages/:id/pool/summary",
  validateParams(pageIdParamSchema),
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const pageRows = await publicPageQuery(resolvedPageId);
    if (!pageRows[0]) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const summary = await fetchPublicPoolSummary(resolvedPageId);
    response.json(summary);
  },
);

giftPoolRouter.post(
  "/public/pages/:id/pool/request-release",
  validateParams(pageIdParamSchema),
  publicPoolPayoutRequestLimiter,
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const rows = await sql`
      SELECT
        bp.id,
        bp.public_code,
        bp.recipient_name,
        bp.pool_fundraising_enabled,
        bp.pooled_amount_kobo,
        bp.reveal_at,
        bp.birthday_date,
        NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) AS is_revealed,
        bp.status,
        u.email AS owner_email,
        u.display_name AS owner_name
      FROM birthday_pages bp
      INNER JOIN users u ON u.id = bp.user_id
      WHERE bp.id = ${resolvedPageId}
      LIMIT 1
    `;

    const page = rows[0];
    if (!page || page.status !== "active") {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    if (!page.pool_fundraising_enabled) {
      response.status(403).json({ error: "Pool gifting is not enabled for this page", code: "POOL_DISABLED" });
      return;
    }

    const amountKobo = Number(page.pooled_amount_kobo || 0);
    if (amountKobo <= 0) {
      response.status(400).json({ error: "No pooled amount available.", code: "PAYOUT_EMPTY" });
      return;
    }

    if (!page.is_revealed) {
      response.status(403).json({ error: "Gift can be requested after reveal time.", code: "PAYOUT_TOO_EARLY" });
      return;
    }

    const payoutExists = await sql`
      SELECT id
      FROM pool_payouts
      WHERE page_id = ${String(page.id)}
        AND status = 'success'
      LIMIT 1
    `;

    if (payoutExists[0]) {
      response.status(409).json({ error: "Gift has already been released.", code: "PAYOUT_ALREADY_RELEASED" });
      return;
    }

    const requestExists = await sql`
      SELECT id
      FROM pool_payouts
      WHERE page_id = ${String(page.id)}
        AND status = 'processing'
      LIMIT 1
    `;

    if (requestExists[0]) {
      response.status(409).json({ error: "Gift request is already pending.", code: "PAYOUT_ALREADY_REQUESTED" });
      return;
    }

    const organizerEmail = sanitizeEmail(page.owner_email);
    if (!organizerEmail) {
      response.status(500).json({ error: "Could not notify the organizer right now." });
      return;
    }

    try {
      await sendPoolReleaseRequestEmail({
        to: organizerEmail,
        ownerName: sanitizeDisplayName(page.owner_name) || null,
        recipientName: String(page.recipient_name || "Recipient"),
        pageCode: String(page.public_code || page.id),
      });

      await sql`
        INSERT INTO pool_payouts (
          page_id,
          provider,
          amount_kobo,
          status,
          response_payload,
          updated_at
        )
        VALUES (
          ${String(page.id)},
          'request',
          ${amountKobo},
          'processing',
          ${JSON.stringify({ requested_via: 'recipient', notified_organizer_email: organizerEmail })}::jsonb,
          NOW()
        )
      `;

      response.json({ status: "requested" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "pool-request-release-email-failed";
      logRequestFailure("pool-request-release", {
        pageId: String(page.id),
        message,
      });
      response.status(502).json({ error: "Could not notify the organizer right now." });
    }
  },
);

giftPoolRouter.post(
  "/public/pages/:id/pool/initialize",
  validateParams(pageIdParamSchema),
  publicPoolContributionInitLimiter,
  validateBody(poolContributionInitializeBodySchema),
  async (request, response) => {
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

    if (!page.can_contribute) {
      response.status(403).json({ error: "This birthday page is no longer accepting contributions" });
      return;
    }

    if (!page.pool_fundraising_enabled) {
      response.status(403).json({ error: "Money contribution is disabled for this page", code: "POOL_DISABLED" });
      return;
    }

    const contributionAmountKobo = sanitizeAmountKobo(request.body.amountKobo);
    if (!contributionAmountKobo || contributionAmountKobo < 100) {
      response.status(400).json({ error: "Minimum amount is 100 kobo", code: "INVALID_AMOUNT" });
      return;
    }

    try {
      const callbackPath = typeof request.body.callbackPath === "string" && request.body.callbackPath.startsWith("/")
        ? request.body.callbackPath
        : `/birthday/${String(page.public_code || resolvedPageId)}`;

      const callbackUrl = `${getClientOriginForRequest(request)}${callbackPath}`;
      const contributorName = sanitizeDisplayName(request.body.contributorName) || "Anonymous";
      const contributorEmail = sanitizeEmail(request.body.contributorEmail) || undefined;
      const contributionCharge = calculatePoolContributionCharge(contributionAmountKobo);

      const data = await paystackRequest<{ authorization_url: string; reference: string }>("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: contributorEmail || "hello@wishcanvas.app",
          amount: contributionCharge.totalChargeKobo,
          currency: "NGN",
          callback_url: callbackUrl,
          metadata: {
            purpose: "pool_gift",
            pageId: resolvedPageId,
            pageCode: String(page.public_code || resolvedPageId),
            contributorName,
            contributorEmail: contributorEmail || null,
            contributionAmountKobo: contributionCharge.contributionAmountKobo,
            platformFeeKobo: contributionCharge.platformFeeKobo,
            totalChargeKobo: contributionCharge.totalChargeKobo,
          },
        }),
      });

      await sql`
        INSERT INTO pool_contributions (
          page_id,
          provider,
          provider_reference,
          amount_kobo,
          contribution_amount_kobo,
          platform_fee_kobo,
          total_charge_kobo,
          contributor_name,
          contributor_email,
          status,
          payment_metadata,
          updated_at
        )
        VALUES (
          ${resolvedPageId},
          'paystack',
          ${data.reference},
          ${contributionCharge.totalChargeKobo},
          ${contributionCharge.contributionAmountKobo},
          ${contributionCharge.platformFeeKobo},
          ${contributionCharge.totalChargeKobo},
          ${contributorName},
          ${contributorEmail || null},
          'pending',
          ${JSON.stringify({
            contributionAmountKobo: contributionCharge.contributionAmountKobo,
            platformFeeKobo: contributionCharge.platformFeeKobo,
            totalChargeKobo: contributionCharge.totalChargeKobo,
            callbackUrl,
          })}::jsonb,
          NOW()
        )
        ON CONFLICT (provider_reference)
        DO UPDATE SET
          amount_kobo = EXCLUDED.amount_kobo,
          contribution_amount_kobo = EXCLUDED.contribution_amount_kobo,
          platform_fee_kobo = EXCLUDED.platform_fee_kobo,
          total_charge_kobo = EXCLUDED.total_charge_kobo,
          contributor_name = EXCLUDED.contributor_name,
          contributor_email = EXCLUDED.contributor_email,
          payment_metadata = EXCLUDED.payment_metadata,
          updated_at = NOW()
      `;

      response.json({
        authorizationUrl: data.authorization_url,
        reference: data.reference,
        amountKobo: contributionCharge.contributionAmountKobo,
        contributionAmountKobo: contributionCharge.contributionAmountKobo,
        totalChargeKobo: contributionCharge.totalChargeKobo,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "pool-initialize-failed";
      logRequestFailure("pool-initialize", { pageId: resolvedPageId, message });

      if (message === "PAYSTACK_NOT_CONFIGURED") {
        response.status(500).json({ error: "Paystack is not configured on the server." });
        return;
      }

      response.status(502).json({ error: "Could not initialize contribution payment right now." });
    }
  },
);

giftPoolRouter.post(
  "/public/pages/:id/pool/verify",
  validateParams(pageIdParamSchema),
  validateBody(paystackVerifyBodySchema),
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const reference = String(request.body.reference || "").trim();
    if (!reference) {
      response.status(400).json({ error: "Payment reference is required.", code: "INVALID_REFERENCE" });
      return;
    }

    try {
      const payment = await paystackRequest<PaystackPaymentData>(`/transaction/verify/${encodeURIComponent(reference)}`);
      const result = await upsertSuccessfulPoolContributionFromPayment(resolvedPageId, payment, payment);
      if (!result.ok) {
        const status = result.code === "PAYMENT_PAGE_MISMATCH"
          ? 403
          : result.code === "PAYMENT_REFERENCE_CONFLICT"
            ? 409
            : 400;
        response.status(status).json({ error: result.message || "Could not verify payment.", code: result.code });
        return;
      }

      response.json({ verified: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "pool-verify-failed";
      logRequestFailure("pool-verify", { pageId: resolvedPageId, reference, message });

      if (message === "PAYSTACK_NOT_CONFIGURED") {
        response.status(500).json({ error: "Paystack is not configured on the server." });
        return;
      }

      response.status(502).json({ error: "Could not verify payment right now." });
    }
  },
);

// ==========================================
// Admin Pool Management & Reconciliation
// ==========================================

giftPoolRouter.get(
  "/admin/pages/:id/pool/payout-attempts",
  requireAdmin,
  validateParams(pageIdParamSchema),
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const rawLimit = Number(request.query.limit ?? 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50)
      : 10;

    const rows = await sql`
      SELECT
        id,
        status,
        provider,
        provider_reference,
        amount_kobo,
        gross_pool_amount_kobo,
        payout_fee_kobo,
        response_payload,
        created_by_user_id,
        created_at,
        updated_at
      FROM pool_payouts
      WHERE page_id = ${resolvedPageId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    response.json({
      pageId: resolvedPageId,
      attempts: rows.map((row) => ({
        id: String(row.id),
        status: String(row.status || "unknown"),
        provider: String(row.provider || "unknown"),
        provider_reference: row.provider_reference ? String(row.provider_reference) : null,
        amount_kobo: Number(row.amount_kobo || 0),
        gross_pool_amount_kobo: Number(row.gross_pool_amount_kobo || 0),
        payout_fee_kobo: Number(row.payout_fee_kobo || 0),
        created_by_user_id: row.created_by_user_id ? String(row.created_by_user_id) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        response_payload: row.response_payload || null,
      })),
    });
  },
);

giftPoolRouter.post(
  "/admin/pages/:id/pool/reconcile",
  requireAdmin,
  validateParams(pageIdParamSchema),
  validateBody(adminPoolReconcileBodySchema),
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const reference = typeof request.body.reference === "string" ? request.body.reference.trim() : "";
    const limit = Number(request.body.limit ?? 50);
    const includeFailed = Boolean(request.body.includeFailed);

    const referencesToVerify: string[] = [];
    if (reference) {
      referencesToVerify.push(reference);
    } else {
      const rows = includeFailed
        ? await sql`
            SELECT provider_reference
            FROM pool_contributions
            WHERE page_id = ${resolvedPageId}
              AND status IN ('pending', 'failed')
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT provider_reference
            FROM pool_contributions
            WHERE page_id = ${resolvedPageId}
              AND status = 'pending'
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `;

      for (const row of rows) {
        const value = typeof row.provider_reference === "string" ? row.provider_reference.trim() : "";
        if (value) referencesToVerify.push(value);
      }
    }

    if (referencesToVerify.length === 0) {
      response.json({
        ok: true,
        pageId: resolvedPageId,
        processed: 0,
        verified: 0,
        skipped: [],
        failures: [],
      });
      return;
    }

    const skipped: Array<{ reference: string; code: string; reason: string }> = [];
    const failures: Array<{ reference: string; reason: string }> = [];
    let verified = 0;

    for (const ref of referencesToVerify) {
      try {
        const payment = await paystackRequest<PaystackPaymentData>(`/transaction/verify/${encodeURIComponent(ref)}`);
        const result = await upsertSuccessfulPoolContributionFromPayment(resolvedPageId, payment, {
          source: "admin-reconcile",
          reference: ref,
        });

        if (result.ok) {
          verified += 1;
        } else {
          skipped.push({
            reference: ref,
            code: result.code,
            reason: result.message || "Skipped",
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "verify-failed";
        failures.push({ reference: ref, reason });
      }
    }

    const summaryRows = await sql`
      SELECT
        COALESCE(
          SUM(COALESCE(net_received_kobo, amount_kobo))
            FILTER (WHERE status = 'success'),
          0
        )::bigint AS pooled_amount_kobo,
        COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
      FROM pool_contributions
      WHERE page_id = ${resolvedPageId}
    `;

    const summary = summaryRows[0] || {
      pooled_amount_kobo: 0,
      success_count: 0,
      pending_count: 0,
      failed_count: 0,
    };

    response.json({
      ok: true,
      pageId: resolvedPageId,
      processed: referencesToVerify.length,
      verified,
      skipped,
      failures,
      summary: {
        pooled_amount_kobo: Number(summary.pooled_amount_kobo || 0),
        success_count: Number(summary.success_count || 0),
        pending_count: Number(summary.pending_count || 0),
        failed_count: Number(summary.failed_count || 0),
      },
    });
  },
);
