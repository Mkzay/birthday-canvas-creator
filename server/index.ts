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
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import {
  clearSessionCookie,
  getActiveSession,
  hashPassword,
  isAdminEmail,
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
  sendPoolReleaseRequestEmail,
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
  paystackInitializeBodySchema,
  paystackVerifyBodySchema,
  paystackResolveAccountBodySchema,
  poolContributionInitializeBodySchema,
  poolReleaseBodySchema,
  adminPoolReconcileBodySchema,
  pageCreateBodySchema,
  pagePatchBodySchema,
  publicUnlockBodySchema,
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
  publicPoolContributionInitLimiter,
  publicPoolPayoutRequestLimiter,
  poolPayoutReleaseLimiter,
  healthEndpointLimiter,
  paystackWebhookLimiter,
} from "./rateLimits";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const FREE_THEME_LIMIT = 3;
const PREMIUM_THEME_FONTS = new Set(["caveat", "sora", "cormorant", "space-grotesk", "dm-serif"]);
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const BPS_BASE = 10_000;
const POOL_CONTRIBUTION_PLATFORM_FEE_BPS = 150;
const POOL_PAYOUT_FEE_BPS = 200;
const PAYSTACK_TRANSACTION_FEE_BPS = 150;
const PAYSTACK_TRANSACTION_FLAT_FEE_KOBO = 10_000;
const PAYSTACK_TRANSACTION_MAX_FEE_KOBO = 200_000;
const PRO_ONE_TIME_AMOUNT_KOBO = 500000;
const PRO_OFFER_CURRENCY = "NGN";
const PRO_OFFER_PURCHASE_TYPE = "one_time";
const PAYSTACK_BANKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FREE_CONTRIBUTOR_LIMIT = 6;
const PUBLIC_UNLOCK_COOKIE_NAME = "wishcanvas_public_unlock";
const EXPORTS_DISABLED_IN_PRODUCTION = process.env.NODE_ENV === "production";
const PRO_OFFER_FEATURES = [
  { id: "unlimited-contributors", title: "Unlimited contributors per page", status: "live" },
  { id: "scheduled-delivery", title: "Scheduled delivery automation", status: "live" },
  { id: "advanced-view-modes", title: "Advanced page view modes", status: "live" },
  { id: "advanced-custom-themes", title: "Advanced custom theme tools", status: "live" },
  { id: "advanced-reveal-effects", title: "Advanced reveal effects", status: "coming-soon" },
  { id: "privacy-controls", title: "Private and secure options", status: "coming-soon" },
  { id: "creator-analytics", title: "Creator analytics", status: "live" },
  { id: "vanity-links-branding", title: "Custom branding and vanity links", status: "live" },
  { id: "team-collaboration", title: "Team collaboration", status: "coming-soon" },
  { id: "keepsake-export", title: "Export and keepsake features", status: "coming-soon" },
  { id: "priority-support", title: "Priority support and recovery", status: "coming-soon" },
] as const;

type PaystackBank = {
  name?: string;
  code?: string;
  active?: boolean;
  country?: string;
  currency?: string;
};

let paystackBanksCache: Array<{ name: string; code: string }> = [];
let paystackBanksCacheExpiresAt = 0;

async function fetchPaystackBanks() {
  const now = Date.now();
  if (paystackBanksCache.length > 0 && now < paystackBanksCacheExpiresAt) {
    return paystackBanksCache;
  }

  const data = await paystackRequest<PaystackBank[]>("/bank?country=nigeria");
  const banks = (Array.isArray(data) ? data : [])
    .filter((bank) => {
      const code = typeof bank.code === "string" ? bank.code.trim() : "";
      const name = typeof bank.name === "string" ? bank.name.trim() : "";
      const country = typeof bank.country === "string" ? bank.country.toLowerCase() : "";
      const currency = typeof bank.currency === "string" ? bank.currency.toUpperCase() : "";
      const isActive = bank.active !== false;

      return Boolean(code && name && isActive && (country === "" || country === "nigeria") && (currency === "" || currency === "NGN"));
    })
    .map((bank) => ({
      code: String(bank.code).trim(),
      name: String(bank.name).trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  paystackBanksCache = banks;
  paystackBanksCacheExpiresAt = now + PAYSTACK_BANKS_CACHE_TTL_MS;
  return banks;
}

function hasProThemeAccess(user: SessionUser) {
  return user.planTier === "pro";
}

function getPublicUnlockSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function buildPublicUnlockToken(pageId: string, revealPinHash: string) {
  return crypto.createHmac("sha256", getPublicUnlockSecret()).update(`${pageId}:${revealPinHash}`).digest("hex");
}

function hasValidPublicUnlock(request: express.Request, pageId: string, revealPinHash: string | null | undefined) {
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

function setPublicUnlockCookie(response: Response, pageId: string, revealPinHash: string) {
  const inProduction = process.env.NODE_ENV === "production";
  const token = buildPublicUnlockToken(pageId, revealPinHash);
  response.cookie(PUBLIC_UNLOCK_COOKIE_NAME, `${pageId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: inProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function getPaystackSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || "";
}

function isValidPaystackSignature(rawBody: string, signature: string, secretKey: string) {
  if (!rawBody || !signature || !secretKey) return false;

  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function getProAmountKobo() {
  return PRO_ONE_TIME_AMOUNT_KOBO;
}

function percentageFeeKobo(amountKobo: number, bps: number) {
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) return 0;
  return Math.round((amountKobo * bps) / BPS_BASE);
}

function calculatePoolContributionCharge(contributionAmountKobo: number) {
  const normalizedContribution = Math.max(0, Math.trunc(contributionAmountKobo));
  const platformFeeKobo = percentageFeeKobo(normalizedContribution, POOL_CONTRIBUTION_PLATFORM_FEE_BPS);
  const totalChargeKobo = normalizedContribution + platformFeeKobo;

  return {
    contributionAmountKobo: normalizedContribution,
    platformFeeKobo,
    totalChargeKobo,
  };
}

function calculatePaystackFeeKobo(totalChargeKobo: number) {
  const normalizedCharge = Math.max(0, Math.trunc(totalChargeKobo));
  const percentageComponent = percentageFeeKobo(normalizedCharge, PAYSTACK_TRANSACTION_FEE_BPS);
  return Math.min(PAYSTACK_TRANSACTION_MAX_FEE_KOBO, percentageComponent + PAYSTACK_TRANSACTION_FLAT_FEE_KOBO);
}

function calculateNetReceivedKobo(totalChargeKobo: number) {
  const normalizedCharge = Math.max(0, Math.trunc(totalChargeKobo));
  const paystackFeeKobo = calculatePaystackFeeKobo(normalizedCharge);
  const netReceivedKobo = Math.max(normalizedCharge - paystackFeeKobo, 0);

  return {
    paystackFeeKobo,
    netReceivedKobo,
  };
}

function calculatePoolPayout(grossPoolBalanceKobo: number) {
  const normalizedBalance = Math.max(0, Math.trunc(grossPoolBalanceKobo));
  const payoutFeeKobo = percentageFeeKobo(normalizedBalance, POOL_PAYOUT_FEE_BPS);
  const payoutAmountKobo = Math.max(normalizedBalance - payoutFeeKobo, 0);

  return {
    grossPoolBalanceKobo: normalizedBalance,
    payoutFeeKobo,
    payoutAmountKobo,
  };
}

function getClientOriginForRequest(request: express.Request) {
  const requestOrigin = typeof request.headers.origin === "string"
    ? normalizeOrigin(request.headers.origin)
    : null;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] || "http://localhost:8080";
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error("PAYSTACK_NOT_CONFIGURED");
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json() as {
    status?: boolean;
    message?: string;
    data?: T;
  };

  if (!response.ok || !payload.status || payload.data == null) {
    throw new Error(payload.message || "PAYSTACK_REQUEST_FAILED");
  }

  return payload.data;
}

function classifyPayoutProviderError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "payout-release-failed";
  const normalized = rawMessage.toLowerCase();

  if (rawMessage === "PAYSTACK_NOT_CONFIGURED") {
    return {
      status: 503,
      code: "PAYOUT_PROVIDER_NOT_CONFIGURED",
      message: "Payout provider is not configured.",
      rawMessage,
    };
  }

  if (normalized.includes("insufficient balance")) {
    return {
      status: 502,
      code: "PAYOUT_PROVIDER_BALANCE_LOW",
      message: "Payout provider balance is insufficient for this transfer.",
      rawMessage,
    };
  }

  if (normalized.includes("transfer has been disabled") || normalized.includes("transfer is not allowed")) {
    return {
      status: 502,
      code: "PAYOUT_PROVIDER_TRANSFER_DISABLED",
      message: "Payout transfers are not enabled on the provider account.",
      rawMessage,
    };
  }

  if (
    normalized.includes("starter business")
    || normalized.includes("third party payouts")
    || normalized.includes("third-party payouts")
    || normalized.includes("cannot initiate third party")
    || normalized.includes("upgrade your business")
    || normalized.includes("complete your business verification")
    || normalized.includes("kyc")
  ) {
    return {
      status: 502,
      code: "PAYOUT_PROVIDER_ACCOUNT_UNVERIFIED",
      message:
        "Payouts are disabled until the Paystack business account is upgraded from Starter to Registered Business and verified.",
      rawMessage,
    };
  }

  if (normalized.includes("otp") || normalized.includes("two-factor") || normalized.includes("two factor")) {
    return {
      status: 502,
      code: "PAYOUT_PROVIDER_OTP_REQUIRED",
      message: "Payout provider requires OTP confirmation that is not yet configured.",
      rawMessage,
    };
  }

  return {
    status: 502,
    code: "PAYOUT_PROVIDER_REJECTED",
    message: "Payout provider rejected this transfer.",
    rawMessage,
  };
}

type PaystackPaymentData = {
  status: string;
  amount: number;
  currency: string;
  reference: string;
  customer?: { email?: string };
  metadata?: {
    userId?: string;
    planTier?: string;
    purpose?: string;
    pageId?: string;
    contributorName?: string;
    contributorEmail?: string;
    contributionAmountKobo?: number;
  };
};

type ProcessPaystackPaymentResult = {
  status: "upgraded" | "already-pro" | "ignored" | "conflict" | "user-not-found";
  userId: string | null;
};

type PoolContributionUpsertResult = {
  ok: boolean;
  code: "SUCCESS" | "PAYMENT_NOT_SUCCESS" | "PAYMENT_TYPE_MISMATCH" | "PAYMENT_PAGE_MISMATCH" | "PAYMENT_REFERENCE_CONFLICT";
  message?: string;
};

async function processPaystackSuccessfulPayment(
  payment: PaystackPaymentData,
  options: {
    source: "verify-endpoint" | "webhook";
    expectedUserId?: string;
    expectedUserEmail?: string;
    rawPayload: unknown;
  },
): Promise<ProcessPaystackPaymentResult> {
  const expectedAmount = getProAmountKobo();
  const paidAmount = Number(payment.amount || 0);
  if (payment.status !== "success" || paidAmount < expectedAmount) {
    return { status: "ignored", userId: null };
  }

  const normalizedEmail = typeof payment.customer?.email === "string"
    ? payment.customer.email.trim().toLowerCase()
    : "";
  const metadataUserId = typeof payment.metadata?.userId === "string"
    ? payment.metadata.userId
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
      'paystack',
      ${payment.reference},
      ${targetUserId},
      ${normalizedEmail || null},
      ${paidAmount},
      ${String(payment.currency || PRO_OFFER_CURRENCY)},
      ${payment.status},
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

async function upsertSuccessfulPoolContributionFromPayment(
  resolvedPageId: string,
  payment: PaystackPaymentData,
  rawPayload: unknown,
): Promise<PoolContributionUpsertResult> {
  if (!payment || payment.status !== "success") {
    return { ok: false, code: "PAYMENT_NOT_SUCCESS", message: "Payment was not completed." };
  }

  const paymentPurpose = typeof payment.metadata?.purpose === "string" ? payment.metadata.purpose : "";
  const paymentPageId = typeof payment.metadata?.pageId === "string" ? payment.metadata.pageId : "";
  const resolvedPaymentPageId = paymentPageId ? await resolvePageId(paymentPageId) : null;

  if (paymentPurpose !== "pool_gift" && !paymentPageId) {
    return { ok: false, code: "PAYMENT_TYPE_MISMATCH", message: "Payment is not a pool gift." };
  }

  if (resolvedPaymentPageId && resolvedPaymentPageId !== resolvedPageId) {
    return { ok: false, code: "PAYMENT_PAGE_MISMATCH", message: "Payment does not belong to this page." };
  }

  const contributorName = sanitizeDisplayName(payment.metadata?.contributorName) || "Anonymous";
  const contributorEmail = sanitizeEmail(payment.metadata?.contributorEmail || payment.customer?.email) || null;
  const totalChargeKobo = Math.max(0, Number(payment.amount || 0));

  const existingContributionRows = await sql`
    SELECT page_id, contribution_amount_kobo, platform_fee_kobo, total_charge_kobo, amount_kobo
    FROM pool_contributions
    WHERE provider_reference = ${payment.reference}
    LIMIT 1
  `;

  const existingContribution = existingContributionRows[0];
  const existingPageId = existingContribution?.page_id ? String(existingContribution.page_id) : null;
  if (existingPageId && existingPageId !== resolvedPageId) {
    return { ok: false, code: "PAYMENT_REFERENCE_CONFLICT", message: "Payment reference belongs to another page." };
  }

  const metadataContributionAmountKobo = sanitizeAmountKobo(payment.metadata?.contributionAmountKobo);
  const fallbackContributionAmountKobo = Number(existingContribution?.contribution_amount_kobo || 0)
    || metadataContributionAmountKobo
    || Number(existingContribution?.amount_kobo || 0)
    || totalChargeKobo;

  const contributionCharge = calculatePoolContributionCharge(fallbackContributionAmountKobo);
  const contributionAmountKobo = contributionCharge.contributionAmountKobo;
  const platformFeeKobo = Number(existingContribution?.platform_fee_kobo || 0) || contributionCharge.platformFeeKobo;
  const finalTotalChargeKobo = totalChargeKobo || Number(existingContribution?.total_charge_kobo || 0) || contributionCharge.totalChargeKobo;
  const settlement = calculateNetReceivedKobo(finalTotalChargeKobo);

  await sql`
    INSERT INTO pool_contributions (
      page_id,
      provider,
      provider_reference,
      amount_kobo,
      contribution_amount_kobo,
      platform_fee_kobo,
      total_charge_kobo,
      paystack_fee_kobo,
      net_received_kobo,
      contributor_name,
      contributor_email,
      status,
      payment_metadata,
      verified_at,
      updated_at
    )
    VALUES (
      ${resolvedPageId},
      'paystack',
      ${payment.reference},
      ${finalTotalChargeKobo},
      ${contributionAmountKobo},
      ${platformFeeKobo},
      ${finalTotalChargeKobo},
      ${settlement.paystackFeeKobo},
      ${settlement.netReceivedKobo},
      ${contributorName},
      ${contributorEmail},
      'success',
      ${JSON.stringify(rawPayload)}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_reference)
    DO UPDATE SET
      amount_kobo = EXCLUDED.amount_kobo,
      contribution_amount_kobo = EXCLUDED.contribution_amount_kobo,
      platform_fee_kobo = EXCLUDED.platform_fee_kobo,
      total_charge_kobo = EXCLUDED.total_charge_kobo,
      paystack_fee_kobo = EXCLUDED.paystack_fee_kobo,
      net_received_kobo = EXCLUDED.net_received_kobo,
      contributor_name = EXCLUDED.contributor_name,
      contributor_email = EXCLUDED.contributor_email,
      status = EXCLUDED.status,
      payment_metadata = EXCLUDED.payment_metadata,
      verified_at = NOW(),
      updated_at = NOW()
  `;

  await sql`
    UPDATE birthday_pages bp
    SET pooled_amount_kobo = COALESCE(agg.total_kobo, 0),
        updated_at = NOW()
    FROM (
      SELECT page_id, SUM(COALESCE(net_received_kobo, amount_kobo))::bigint AS total_kobo
      FROM pool_contributions
      WHERE page_id = ${resolvedPageId}
        AND status = 'success'
      GROUP BY page_id
    ) AS agg
    WHERE bp.id = ${resolvedPageId}
  `;

  return { ok: true, code: "SUCCESS" };
}

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
  if (!normalizedRequestOrigin) return false;

  // Allow explicitly listed origins
  if (allowedOrigins.includes(normalizedRequestOrigin)) {
    return true;
  }

  // Allow all Vercel preview and production domains
  if (/^https:\/\/.*\.vercel\.app$/i.test(normalizedRequestOrigin)) {
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

app.use("/uploads", express.static(uploadsRoot));

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

app.post("/api/billing/paystack/webhook", paystackWebhookLimiter, express.raw({ type: "application/json" }), async (request, response) => {
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

      const contributorName = sanitizeDisplayName(eventData.metadata?.contributorName) || "Anonymous";
      const contributorEmail = sanitizeEmail(eventData.metadata?.contributorEmail || eventData.customer?.email) || null;
      const totalChargeKobo = Math.max(0, Number(eventData.amount || 0));

      const existingContributionRows = await sql`
        SELECT contribution_amount_kobo, platform_fee_kobo, total_charge_kobo, amount_kobo
        FROM pool_contributions
        WHERE provider_reference = ${eventData.reference}
        LIMIT 1
      `;

      const existingContribution = existingContributionRows[0];
      const metadataContributionAmountKobo = sanitizeAmountKobo(eventData.metadata?.contributionAmountKobo);
      const fallbackContributionAmountKobo = Number(existingContribution?.contribution_amount_kobo || 0)
        || metadataContributionAmountKobo
        || Number(existingContribution?.amount_kobo || 0)
        || totalChargeKobo;

      const contributionCharge = calculatePoolContributionCharge(fallbackContributionAmountKobo);
      const contributionAmountKobo = contributionCharge.contributionAmountKobo;
      const platformFeeKobo = Number(existingContribution?.platform_fee_kobo || 0) || contributionCharge.platformFeeKobo;
      const finalTotalChargeKobo = totalChargeKobo || Number(existingContribution?.total_charge_kobo || 0) || contributionCharge.totalChargeKobo;
      const settlement = calculateNetReceivedKobo(finalTotalChargeKobo);

      await sql`
        INSERT INTO pool_contributions (
          page_id,
          provider,
          provider_reference,
          amount_kobo,
          contribution_amount_kobo,
          platform_fee_kobo,
          total_charge_kobo,
          paystack_fee_kobo,
          net_received_kobo,
          contributor_name,
          contributor_email,
          status,
          payment_metadata,
          verified_at,
          updated_at
        )
        VALUES (
          ${resolvedPageId},
          'paystack',
          ${eventData.reference},
          ${finalTotalChargeKobo},
          ${contributionAmountKobo},
          ${platformFeeKobo},
          ${finalTotalChargeKobo},
          ${settlement.paystackFeeKobo},
          ${settlement.netReceivedKobo},
          ${contributorName},
          ${contributorEmail},
          'success',
          ${JSON.stringify(eventPayload)}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (provider_reference)
        DO UPDATE SET
          amount_kobo = EXCLUDED.amount_kobo,
          contribution_amount_kobo = EXCLUDED.contribution_amount_kobo,
          platform_fee_kobo = EXCLUDED.platform_fee_kobo,
          total_charge_kobo = EXCLUDED.total_charge_kobo,
          paystack_fee_kobo = EXCLUDED.paystack_fee_kobo,
          net_received_kobo = EXCLUDED.net_received_kobo,
          contributor_name = EXCLUDED.contributor_name,
          contributor_email = EXCLUDED.contributor_email,
          status = EXCLUDED.status,
          payment_metadata = EXCLUDED.payment_metadata,
          verified_at = NOW(),
          updated_at = NOW()
      `;

      await sql`
        UPDATE birthday_pages bp
        SET pooled_amount_kobo = COALESCE(agg.total_kobo, 0),
            updated_at = NOW()
        FROM (
          SELECT page_id, SUM(COALESCE(net_received_kobo, amount_kobo))::bigint AS total_kobo
          FROM pool_contributions
          WHERE page_id = ${resolvedPageId}
            AND status = 'success'
          GROUP BY page_id
        ) AS agg
        WHERE bp.id = ${resolvedPageId}
      `;

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
});

app.use(express.json({ limit: "2mb" }));
app.use("/api", createGlobalApiLimiter());
// Removed duplicate static serving moved up for security bypass

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

function sanitizeBankCode(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[a-zA-Z0-9]{2,12}$/.test(trimmed) ? trimmed : null;
}

function sanitizeAccountNumber(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 20 ? digits : null;
}

function sanitizeAmountKobo(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n) || n < 0 || n > 500000000) return null;
  return n;
}

function sanitizePublicCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/.test(normalized)) return null;
  return normalized;
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
    isAdmin: isAdminEmail(String(row.email)),
    planTier: row.plan_tier === "pro" ? "pro" : "free",
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
  const normalizedIdentifier = String(identifier || "").trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const rows = await sql`
    SELECT id
    FROM birthday_pages
    WHERE id::text = ${normalizedIdentifier}
       OR public_code = ${normalizedIdentifier}
       OR LOWER(public_code) = LOWER(${normalizedIdentifier})
    LIMIT 1
  `;

  if (rows[0]) {
    return String(rows[0].id);
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
      bm.contribution_amount_kobo,
      bm.created_at,
      bmp.id AS photo_id,
      bmp.photo_url,
      bmp.caption,
      bmp.sort_order,
      bms.id AS sticker_id,
      bms.sticker_type,
      bms.position_x,
      bms.position_y,
      bms.rotation,
      bms.scale
    FROM birthday_messages bm
    LEFT JOIN birthday_message_photos bmp ON bmp.message_id = bm.id
    LEFT JOIN birthday_message_stickers bms ON bms.message_id = bm.id
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
        contribution_amount_kobo: Number(row.contribution_amount_kobo || 0),
        created_at: row.created_at,
        photos: [],
        stickers: [],
      });
    }

    const currentMessage = messages.get(messageId)!;
    const photos = currentMessage.photos as Array<Record<string, unknown>>;
    const stickers = currentMessage.stickers as Array<Record<string, unknown>>;

    if (row.photo_id && !photos.some(p => p.id === String(row.photo_id))) {
      photos.push({
        id: String(row.photo_id),
        photo_url: String(row.photo_url),
        caption: typeof row.caption === "string" ? row.caption : null,
        sort_order: Number(row.sort_order || 0),
      });
    }

    if (row.sticker_id && !stickers.some(s => s.id === String(row.sticker_id))) {
      stickers.push({
        id: String(row.sticker_id),
        sticker_type: String(row.sticker_type),
        position_x: Number(row.position_x),
        position_y: Number(row.position_y),
        rotation: Number(row.rotation || 0),
        scale: Number(row.scale || 1),
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

function wrapPdfText(text: string, maxCharsPerLine: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!current.length) {
      current = word;
      return;
    }

    const next = `${current} ${word}`;
    if (next.length > maxCharsPerLine) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current.length) {
    lines.push(current);
  }

  return lines;
}

async function buildBrandedPagePdf(page: Record<string, unknown>, messages: Array<Record<string, unknown>>) {
  const doc = await PDFDocument.create();
  let currentPage = doc.addPage([595, 842]);
  const { width, height } = currentPage.getSize();
  const margin = 44;
  const lineHeight = 16;
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const smallFont = await doc.embedFont(StandardFonts.HelveticaOblique);

  const recipientName = String(page.recipient_name || "Someone special");
  const creatorMessage = typeof page.creator_message === "string" ? page.creator_message.trim() : "";
  const birthdayDateLabel = (() => {
    const raw = String(page.birthday_date || "");
    const parsed = raw ? new Date(raw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return raw || "-";
    return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const uniqueContributors = Array.from(new Set(messages.map((message) => String(message.sender_name || "Anonymous").trim().toLowerCase())));
  const totalPhotos = messages.reduce((count, message) => {
    if (Array.isArray(message.photos) && message.photos.length) {
      return count + message.photos.length;
    }
    return count + (message.photo_url ? 1 : 0);
  }, 0);
  const totalAudio = messages.reduce((count, message) => count + (message.audio_url ? 1 : 0), 0);

  let pageNumber = 0;

  const startNewPage = () => {
    if (pageNumber > 0) {
      currentPage = doc.addPage([595, 842]);
    }
    pageNumber += 1;
    currentPage.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.996, 0.989, 0.978) });
    currentPage.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: rgb(0.972, 0.627, 0.125) });
    currentPage.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: rgb(0.902, 0.298, 0.235), opacity: 0.19 });
  };

  const drawHeader = () => {
    startNewPage();
    currentPage.drawText("WishCanvas Birthday Keepsake", {
      x: margin,
      y: height - 68,
      size: 20,
      font: titleFont,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText(`For ${recipientName}`, {
      x: margin,
      y: height - 92,
      size: 12,
      font: bodyFont,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText(`Slide export · ${new Date().toLocaleString()}`, {
      x: margin,
      y: height - 111,
      size: 9,
      font: smallFont,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText(`${pageNumber}`, {
      x: width - margin - 8,
      y: 20,
      size: 10,
      font: bodyFont,
      color: rgb(0.47, 0.39, 0.31),
    });
  };

  let cursorY = height - 160;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight > margin) {
      return;
    }
    drawHeader();
    cursorY = height - 160;
  };

  const drawLine = (text: string, size = 11, bold = false) => {
    ensureSpace(lineHeight + 2);
    currentPage.drawText(text, {
      x: margin,
      y: cursorY,
      size,
      font: bold ? titleFont : bodyFont,
      color: rgb(0.13, 0.15, 0.2),
    });
    cursorY -= lineHeight;
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    drawHeader();
    cursorY = height - 168;
    drawLine(title, 18, true);
    if (subtitle) {
      drawLine(subtitle, 11, false);
    }
    drawLine("");
  };

  drawSectionTitle("Slide 1 · Cover", `Happy Birthday, ${recipientName}`);
  drawLine(`Birthday date: ${birthdayDateLabel}`);
  if (creatorMessage) {
    drawLine("");
    drawLine("Creator note", 12, true);
    wrapPdfText(creatorMessage, 88).slice(0, 8).forEach((line) => drawLine(line));
  }
  drawLine("");

  drawSectionTitle("Slide 2 · The shape of the celebration");
  drawLine(`Wishes collected: ${messages.length}`);
  drawLine(`Contributors: ${uniqueContributors.length}`);
  drawLine(`Photos attached: ${totalPhotos}`);
  drawLine(`Voice notes attached: ${totalAudio}`);
  drawLine("");

  if (creatorMessage) {
    drawSectionTitle("Slide 3 · Organizer", "A note from the organizer");
    wrapPdfText(creatorMessage, 88).slice(0, 12).forEach((line) => drawLine(line));
    drawLine("");
  }

  messages.forEach((message, index) => {
    const senderName = String(message.sender_name || "Anonymous");
    const plainMessage = sanitizeHtml(String(message.message || ""), { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
    const photoCount = Array.isArray(message.photos) ? message.photos.length : (message.photo_url ? 1 : 0);
    const hasAudio = Boolean(message.audio_url);

    drawSectionTitle(`Slide ${index + 4} · Wish`, `${senderName}'s message`);
    const lines = wrapPdfText(plainMessage || "(No message text)", 88);
    lines.slice(0, 22).forEach((line) => drawLine(line));
    drawLine("");
    drawLine(`Attachments: ${photoCount} photo${photoCount === 1 ? "" : "s"}${hasAudio ? " · voice note" : ""}`, 10, false);
    if (Array.isArray(message.photos) && message.photos.length) {
      const captions = message.photos
        .map((photo) => (typeof photo.caption === "string" ? photo.caption.trim() : ""))
        .filter(Boolean)
        .slice(0, 3);
      captions.forEach((caption, captionIndex) => drawLine(`Photo note ${captionIndex + 1}: ${caption}`, 10, false));
    }
    drawLine("");
  });

  drawSectionTitle(`Slide ${messages.length + (creatorMessage ? 4 : 3)} · Closing`, `Keep this close, ${recipientName}.`);
  drawLine(`Total wishes: ${messages.length}`);
  drawLine(`Contributors: ${uniqueContributors.length}`);
  drawLine(`Photos: ${totalPhotos}`);
  drawLine(`Voice notes: ${totalAudio}`);

  const contributorSample = Array.from(new Set(messages.map((message) => String(message.sender_name || "Anonymous").trim()))).filter(Boolean);
  if (contributorSample.length) {
    drawLine("");
    drawLine("Signed by", 11, true);
    drawLine(contributorSample.slice(0, 12).join(", "), 10, false);
  }

  return doc.save();
}

function publicPageQuery(pageId: string) {
  return sql`
    SELECT
      bp.id,
      bp.public_code,
      bp.recipient_name,
      bp.birthday_date,
      bp.theme,
      bp.letter_theme,
      bp.display_mode,
      bp.letter_color,
      ct.emoji AS theme_emoji,
      ct.gradient_from AS theme_gradient_from,
      ct.gradient_to AS theme_gradient_to,
      ct.gradient_mid AS theme_gradient_mid,
      ct.gradient_angle AS theme_gradient_angle,
      ct.accent_color AS theme_accent_color,
      ct.font AS theme_font,
      lct.gradient_from AS letter_theme_gradient_from,
      lct.gradient_to AS letter_theme_gradient_to,
      lct.gradient_mid AS letter_theme_gradient_mid,
      lct.gradient_angle AS letter_theme_gradient_angle,
      CASE WHEN NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) THEN bp.creator_message ELSE NULL END AS creator_message,
      bp.cover_photo_url,
      bp.soundtrack_id,
      bp.custom_audio_url,
      bp.pool_fundraising_enabled,
      bp.pool_goal_kobo,
      bp.pooled_amount_kobo,
      bp.pool_description,
      bp.reveal_at,
      bp.reveal_pin_hash,
      bp.view_count,
      bp.allow_photos,
      bp.allow_audio,
      bp.require_names,
      bp.close_date,
      u.plan_tier AS owner_plan_tier,
      bp.reveal_pin_hash IS NOT NULL AS requires_unlock,
      NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) AS is_revealed,
      CURRENT_DATE <= COALESCE(bp.close_date, bp.birthday_date) AND bp.status = 'active' AS can_contribute,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    LEFT JOIN custom_themes ct ON bp.theme = CONCAT('custom_', ct.id::text)
    LEFT JOIN custom_themes lct ON bp.letter_theme = CONCAT('custom_', lct.id::text)
    INNER JOIN users u ON u.id = bp.user_id
    WHERE bp.id = ${pageId}
      AND bp.status = 'active'
    GROUP BY bp.id, ct.id, lct.id, u.id
  `;
}

function privatePageQuery(pageId: string, userId: string) {
  return sql`
    SELECT
      bp.*,
      NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) AS is_revealed,
      bp.reveal_pin_hash IS NOT NULL AS reveal_pin_set,
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

app.get("/api/admin/birthday-pages", requireAdmin, async (_request, response) => {
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
      u.display_name AS owner_display_name,
      u.email AS owner_email,
      u.plan_tier AS owner_plan_tier,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    INNER JOIN users u ON u.id = bp.user_id
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    WHERE bp.owner_deleted IS NOT TRUE
    GROUP BY bp.id, u.id
    ORDER BY bp.created_at DESC
    LIMIT 1000
  `;

  response.json(rows.map((row) => serializePageDates(row)));
});

app.get(
  "/api/admin/pages/:id/pool/payout-attempts",
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

app.post(
  "/api/admin/pages/:id/pool/reconcile",
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

async function sendBirthdayNotifications(targetDate: string | null, options?: { dryRun?: boolean }) {
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
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
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

app.post("/api/system/notify-birthdays", requireAdmin, systemBirthdayNotifyLimiter, validateBody(birthdayNotifyBodySchema), async (request, response) => {
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
  const dryRun = Boolean(request.body.dryRun);
  try {
    const payload = await sendBirthdayNotifications(targetDate, { dryRun });
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
    RETURNING id, email, plan_tier, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
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
    SELECT id, email, plan_tier, email_verified_at, password_hash, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
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
    RETURNING id, email, email_verified_at, display_name, avatar_url, default_theme, default_allow_photos, default_allow_audio, default_require_names, email_notifications, new_message_notifications, birthday_reminders, plan_tier
  `;

  await sendAuth(response, sessionUserFromRow(rows[0]));
});

app.get("/api/billing/pro-offer", async (_request, response) => {
  response.json({
    amountKobo: PRO_ONE_TIME_AMOUNT_KOBO,
    currency: PRO_OFFER_CURRENCY,
    purchaseType: PRO_OFFER_PURCHASE_TYPE,
    features: PRO_OFFER_FEATURES,
  });
});

app.post("/api/billing/paystack/initialize", requireAuth, validateBody(paystackInitializeBodySchema), async (request: AuthedRequest, response) => {
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
});

app.post("/api/billing/paystack/verify", requireAuth, validateBody(paystackVerifyBodySchema), async (request: AuthedRequest, response) => {
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
});

app.get("/api/payments/paystack/banks", requireAuth, async (_request: AuthedRequest, response) => {
  try {
    const banks = await fetchPaystackBanks();
    response.json({ banks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "paystack-bank-list-failed";
    logRequestFailure("paystack-bank-list", { message });

    if (message === "PAYSTACK_NOT_CONFIGURED") {
      response.status(500).json({ error: "Paystack is not configured on the server." });
      return;
    }

    response.status(502).json({ error: "Could not load bank list right now." });
  }
});

app.post(
  "/api/payments/paystack/resolve-account",
  requireAuth,
  validateBody(paystackResolveAccountBodySchema),
  async (request: AuthedRequest, response) => {
    const bankCode = sanitizeBankCode(request.body.bankCode);
    const accountNumber = sanitizeAccountNumber(request.body.accountNumber);

    if (!bankCode || !accountNumber) {
      response.status(400).json({ error: "Invalid account details" });
      return;
    }

    try {
      const data = await paystackRequest<{ account_number: string; account_name: string }>(
        `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      );

      response.json({
        accountNumber: String(data.account_number || accountNumber),
        accountName: String(data.account_name || "").trim(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "paystack-account-resolve-failed";
      logRequestFailure("paystack-account-resolve", { message, bankCode });

      if (message === "PAYSTACK_NOT_CONFIGURED") {
        response.status(500).json({ error: "Paystack is not configured on the server." });
        return;
      }

      response.status(400).json({ error: "Could not resolve account details." });
    }
  },
);

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
  const user = request.user!;
  const isPro = hasProThemeAccess(user);
  const requestedFont = String(request.body.font || "sans");
  const hasGradientMid = typeof request.body.gradientMid === "string" && request.body.gradientMid.trim().length > 0;
  const hasIconUrl = typeof request.body.iconUrl === "string" && request.body.iconUrl.trim().length > 0;

  if (!isPro) {
    const themeCountRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM custom_themes
      WHERE user_id = ${user.id}
    `;
    const themeCount = Number(themeCountRows[0]?.count || 0);

    if (themeCount >= FREE_THEME_LIMIT) {
      response.status(403).json({
        error: `Free plan supports up to ${FREE_THEME_LIMIT} custom themes. Upgrade to Pro for unlimited themes.`,
        code: "THEME_LIMIT_REACHED",
      });
      return;
    }

    if (hasGradientMid) {
      response.status(403).json({
        error: "Midpoint gradients are a Pro feature.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }

    if (PREMIUM_THEME_FONTS.has(requestedFont)) {
      response.status(403).json({
        error: "This font is a Pro feature.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }

    if (hasIconUrl) {
      response.status(403).json({
        error: "Theme icon uploads are a Pro feature.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }
  }

  const rows = await sql`
    INSERT INTO custom_themes (user_id, name, emoji, gradient_from, gradient_to, gradient_mid, gradient_angle, accent_color, font, icon_url)
    VALUES (
      ${user.id},
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
  const user = request.user!;

  if (!hasProThemeAccess(user)) {
    if (Object.prototype.hasOwnProperty.call(request.body, "gradientMid")) {
      const requestedMid = request.body.gradientMid;
      if (typeof requestedMid === "string" && requestedMid.trim().length > 0) {
        response.status(403).json({
          error: "Midpoint gradients are a Pro feature.",
          code: "FEATURE_PRO_ONLY",
        });
        return;
      }
    }

    if (Object.prototype.hasOwnProperty.call(request.body, "font")) {
      const requestedFont = String(request.body.font || "");
      if (PREMIUM_THEME_FONTS.has(requestedFont)) {
        response.status(403).json({
          error: "This font is a Pro feature.",
          code: "FEATURE_PRO_ONLY",
        });
        return;
      }
    }

    if (Object.prototype.hasOwnProperty.call(request.body, "iconUrl")) {
      const requestedIconUrl = request.body.iconUrl;
      if (typeof requestedIconUrl === "string" && requestedIconUrl.trim().length > 0) {
        response.status(403).json({
          error: "Theme icon uploads are a Pro feature.",
          code: "FEATURE_PRO_ONLY",
        });
        return;
      }
    }
  }

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
      AND user_id = ${user.id}
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

  if (!hasProThemeAccess(request.user!)) {
    try {
      await fs.unlink(file.path);
    } catch {
      // Best-effort cleanup for rejected uploads.
    }
    response.status(403).json({
      error: "Theme icon uploads are a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
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
  const nextPublicCode = sanitizePublicCode(request.body.publicCode);
  const revealPin = typeof request.body.revealPin === "string" ? request.body.revealPin.trim() : null;
  const requestedDisplayMode = String(request.body.displayMode || "story");

  if (request.body.revealAt && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Scheduled reveal is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (typeof request.body.publicCode === "string" && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Custom public links are a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (revealPin && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Secret reveal PIN is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (requestedDisplayMode !== "story" && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Freeform and Bento page views are Pro features.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (typeof request.body.publicCode === "string" && !nextPublicCode) {
    response.status(400).json({ error: "Public code must be 6-40 chars and use lowercase letters, numbers, and hyphens." });
    return;
  }

  const publicCode = nextPublicCode || await createUniquePublicCode();
  const revealPinHash = revealPin ? await hashPassword(revealPin) : null;
  const recipientEmail = sanitizeEmail(request.body.recipientEmail);
  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await sql`
      INSERT INTO birthday_pages (
        user_id,
        public_code,
        recipient_name,
        recipient_email,
        birthday_date,
        theme,
        letter_theme,
        display_mode,
        letter_color,
        creator_message,
        soundtrack_id,
        allow_photos,
        allow_audio,
        require_names,
        close_date,
        reveal_at,
        reveal_pin_hash,
        pool_fundraising_enabled,
        pool_goal_kobo,
        pool_description,
        recipient_bank_code,
        recipient_account_number,
        recipient_account_name,
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
        ${String(request.body.letterTheme || request.body.theme || "elegant")},
        ${requestedDisplayMode},
        ${request.body.letterColor ?? null},
        ${sanitizeDisplayName(request.body.creatorMessage)},
        ${String(request.body.soundtrackId || "golden-hour")},
        ${Boolean(request.body.allowPhotos ?? true)},
        ${Boolean(request.body.allowAudio ?? true)},
        ${Boolean(request.body.requireNames ?? true)},
        ${String(request.body.closeDate || request.body.birthdayDate)},
        ${request.body.revealAt || null},
        ${revealPinHash},
        ${Boolean(request.body.poolFundraisingEnabled ?? false)},
        ${sanitizeAmountKobo(request.body.poolGoalKobo)},
        ${sanitizeDisplayName(request.body.poolDescription)},
        ${sanitizeBankCode(request.body.recipientBankCode)},
        ${sanitizeAccountNumber(request.body.recipientAccountNumber)},
        ${sanitizeDisplayName(request.body.recipientAccountName)},
        'active',
        ${request.body.pageCustomAudioUrl || null}
      )
      RETURNING *
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "page-create-failed";
    if (message.includes("idx_birthday_pages_public_code_unique") || message.includes("birthday_pages_public_code_key")) {
      response.status(409).json({ error: "That public link is already taken." });
      return;
    }
    throw error;
  }

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

app.get("/api/pages/:id/pool/summary", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
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
});

app.post("/api/pages/:id/pool/release", requireAuth, poolPayoutReleaseLimiter, validateParams(pageIdParamSchema), validateBody(poolReleaseBodySchema), async (request: AuthedRequest, response) => {
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

  const payoutExists = await sql`
    SELECT id
    FROM pool_payouts
    WHERE page_id = ${String(page.id)}
      AND status = 'success'
    LIMIT 1
  `;

  if (payoutExists[0]) {
    response.status(409).json({ error: "Payout already released for this page.", code: "PAYOUT_ALREADY_RELEASED" });
    return;
  }

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

    const transferRef = `wishcanvas_pool_${String(page.id).slice(0, 8)}_${Date.now()}`;
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
      INSERT INTO pool_payouts (
        page_id,
        provider,
        provider_reference,
        amount_kobo,
        gross_pool_amount_kobo,
        payout_fee_kobo,
        status,
        response_payload,
        created_by_user_id,
        updated_at
      )
      VALUES (
        ${String(page.id)},
        'paystack',
        ${transferData.reference || transferRef},
        ${payout.payoutAmountKobo},
        ${payout.grossPoolBalanceKobo},
        ${payout.payoutFeeKobo},
        'success',
        ${JSON.stringify({ transfer: transferData, recipient: recipientData })}::jsonb,
        ${request.user!.id},
        NOW()
      )
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
      INSERT INTO pool_payouts (
        page_id,
        provider,
        amount_kobo,
        gross_pool_amount_kobo,
        payout_fee_kobo,
        status,
        response_payload,
        created_by_user_id,
        updated_at
      )
      VALUES (
        ${String(page.id)},
        'paystack',
        ${payout.payoutAmountKobo},
        ${payout.grossPoolBalanceKobo},
        ${payout.payoutFeeKobo},
        'failed',
        ${JSON.stringify({ error: classifiedError.rawMessage, code: classifiedError.code })}::jsonb,
        ${request.user!.id},
        NOW()
      )
    `;
    response.status(classifiedError.status).json({
      error: exposeErrorToClient(error, classifiedError.message),
      code: classifiedError.code,
    });
  }
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
  const hasPublicCode = Object.prototype.hasOwnProperty.call(request.body, "publicCode");
  const hasRevealAt = Object.prototype.hasOwnProperty.call(request.body, "revealAt");
  const hasRevealPin = Object.prototype.hasOwnProperty.call(request.body, "revealPin");
  const revealPin = typeof request.body.revealPin === "string" ? request.body.revealPin.trim() : null;
  const requestedDisplayMode = String(request.body.displayMode || "story");
  const nextPublicCode = request.body.publicCode === null ? null : sanitizePublicCode(request.body.publicCode);

  if (hasRevealAt && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Scheduled reveal is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (hasPublicCode && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Custom public links are a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (hasRevealPin && revealPin && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Secret reveal PIN is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (requestedDisplayMode !== "story" && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Freeform and Bento page views are Pro features.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (hasPublicCode && request.body.publicCode === null) {
    response.status(400).json({ error: "Public code cannot be empty." });
    return;
  }

  if (hasPublicCode && request.body.publicCode !== null && !nextPublicCode) {
    response.status(400).json({ error: "Public code must be 6-40 chars and use lowercase letters, numbers, and hyphens." });
    return;
  }

  const revealPinHash = hasRevealPin
    ? (revealPin ? await hashPassword(revealPin) : null)
    : null;

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

  let rows: Array<Record<string, unknown>> = [];

  try {
    rows = hasCoverPhotoUrl || hasCustomAudioUrl
      ? await sql`
          UPDATE birthday_pages
          SET
            recipient_name = ${String(request.body.recipientName || "").trim()},
            recipient_email = ${sanitizeEmail(request.body.recipientEmail)},
            birthday_date = ${String(request.body.birthdayDate)},
            theme = ${String(request.body.theme || "elegant")},
            letter_theme = ${String(request.body.letterTheme || request.body.theme || "elegant")},
            display_mode = ${requestedDisplayMode},
            creator_message = ${sanitizeDisplayName(request.body.creatorMessage)},
            soundtrack_id = ${String(request.body.soundtrackId || "golden-hour")},
            allow_photos = ${Boolean(request.body.allowPhotos ?? true)},
            allow_audio = ${Boolean(request.body.allowAudio ?? true)},
            require_names = ${Boolean(request.body.requireNames ?? true)},
            close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
            reveal_at = CASE WHEN ${hasRevealAt} THEN ${request.body.revealAt || null} ELSE reveal_at END,
            reveal_pin_hash = CASE WHEN ${hasRevealPin} THEN ${revealPinHash} ELSE reveal_pin_hash END,
            public_code = CASE WHEN ${hasPublicCode} THEN ${nextPublicCode} ELSE public_code END,
            cover_photo_url = ${request.body.coverPhotoUrl || null},
            custom_audio_url = ${request.body.pageCustomAudioUrl || null},
            letter_color = ${request.body.letterColor ?? null},
            pool_fundraising_enabled = ${Boolean(request.body.poolFundraisingEnabled ?? false)},
            pool_goal_kobo = ${sanitizeAmountKobo(request.body.poolGoalKobo)},
            pool_description = ${sanitizeDisplayName(request.body.poolDescription)},
            recipient_bank_code = ${sanitizeBankCode(request.body.recipientBankCode)},
            recipient_account_number = ${sanitizeAccountNumber(request.body.recipientAccountNumber)},
            recipient_account_name = ${sanitizeDisplayName(request.body.recipientAccountName)},
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
            letter_theme = ${String(request.body.letterTheme || request.body.theme || "elegant")},
            display_mode = ${requestedDisplayMode},
            creator_message = ${sanitizeDisplayName(request.body.creatorMessage)},
            soundtrack_id = ${String(request.body.soundtrackId || "golden-hour")},
            allow_photos = ${Boolean(request.body.allowPhotos ?? true)},
            allow_audio = ${Boolean(request.body.allowAudio ?? true)},
            require_names = ${Boolean(request.body.requireNames ?? true)},
            close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
            reveal_at = CASE WHEN ${hasRevealAt} THEN ${request.body.revealAt || null} ELSE reveal_at END,
            reveal_pin_hash = CASE WHEN ${hasRevealPin} THEN ${revealPinHash} ELSE reveal_pin_hash END,
            public_code = CASE WHEN ${hasPublicCode} THEN ${nextPublicCode} ELSE public_code END,
            letter_color = ${request.body.letterColor ?? null},
            pool_fundraising_enabled = ${Boolean(request.body.poolFundraisingEnabled ?? false)},
            pool_goal_kobo = ${sanitizeAmountKobo(request.body.poolGoalKobo)},
            pool_description = ${sanitizeDisplayName(request.body.poolDescription)},
            recipient_bank_code = ${sanitizeBankCode(request.body.recipientBankCode)},
            recipient_account_number = ${sanitizeAccountNumber(request.body.recipientAccountNumber)},
            recipient_account_name = ${sanitizeDisplayName(request.body.recipientAccountName)},
            updated_at = NOW()
          WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
            AND user_id = ${request.user!.id}
          RETURNING *
        `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "page-update-failed";
    if (message.includes("idx_birthday_pages_public_code_unique") || message.includes("birthday_pages_public_code_key")) {
      response.status(409).json({ error: "That public link is already taken." });
      return;
    }
    throw error;
  }

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(rows[0]);
});

app.get("/api/pages/:id/analytics", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  if (!hasProThemeAccess(request.user!)) {
    response.status(403).json({ error: "Page analytics are a Pro feature.", code: "FEATURE_PRO_ONLY" });
    return;
  }

  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageId = String(pageRows[0].id);
  const metricsRows = await sql`
    SELECT
      bp.view_count::int AS view_count,
      COUNT(DISTINCT bm.id)::int AS message_count,
      COUNT(DISTINCT NULLIF(TRIM(bm.sender_name), ''))::int AS contributor_count,
      COUNT(DISTINCT CASE WHEN bm.photo_url IS NOT NULL OR bmp.id IS NOT NULL THEN bm.id END)::int AS photo_message_count,
      COUNT(DISTINCT CASE WHEN bm.audio_url IS NOT NULL THEN bm.id END)::int AS audio_message_count,
      MAX(bm.created_at) AS last_contribution_at
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id
    LEFT JOIN birthday_message_photos bmp ON bmp.message_id = bm.id
    WHERE bp.id = ${pageId}
    GROUP BY bp.id
  `;

  response.json(metricsRows[0] || {
    view_count: 0,
    message_count: 0,
    contributor_count: 0,
    photo_message_count: 0,
    audio_message_count: 0,
    last_contribution_at: null,
  });
});

app.get("/api/pages/:id/export", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  if (EXPORTS_DISABLED_IN_PRODUCTION) {
    response.status(404).json({ error: "Not found" });
    return;
  }

  if (!hasProThemeAccess(request.user!)) {
    response.status(403).json({ error: "Page export is a Pro feature.", code: "FEATURE_PRO_ONLY" });
    return;
  }

  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const page = serializePageDates(pageRows[0]);
  const messages = await fetchMessagesForPage(String(pageRows[0].id));

  const requestedFormat = typeof request.query.format === "string" ? request.query.format.toLowerCase() : "pdf";
  if (requestedFormat === "json") {
    response.json({
      exportType: "wishcanvas-page-v1",
      exportedAt: new Date().toISOString(),
      page,
      messages,
    });
    return;
  }

  const pdfBytes = await buildBrandedPagePdf(pageRows[0], messages);
  const slug = String(page.recipient_name || "birthday-page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "birthday-page";
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${slug}-wishcanvas-keepsake.pdf"`);
  response.send(Buffer.from(pdfBytes));
});

app.get("/api/public/pages/:id/export", validateParams(pageIdParamSchema), async (request, response) => {
  if (EXPORTS_DISABLED_IN_PRODUCTION) {
    response.status(404).json({ error: "Not found" });
    return;
  }

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

  if (String(page.owner_plan_tier || "free") !== "pro") {
    response.status(403).json({ error: "Download is available when the page creator is on Pro.", code: "FEATURE_PRO_ONLY" });
    return;
  }

  if (!page.is_revealed) {
    response.status(403).json({ error: "Birthday wishes are not available yet" });
    return;
  }

  if (!hasValidPublicUnlock(request, resolvedPageId, typeof page.reveal_pin_hash === "string" ? page.reveal_pin_hash : null)) {
    response.status(423).json({ error: "PIN unlock required", code: "PIN_REQUIRED" });
    return;
  }

  const messages = await fetchMessagesForPage(resolvedPageId);
  const pdfBytes = await buildBrandedPagePdf(page, messages);
  const slug = String(page.recipient_name || "birthday-page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "birthday-page";
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${slug}-wishcanvas-keepsake.pdf"`);
  response.send(Buffer.from(pdfBytes));
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

app.post("/api/public/pages/:id/unlock", validateParams(pageIdParamSchema), validateBody(publicUnlockBodySchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await sql`
    SELECT reveal_pin_hash
    FROM birthday_pages
    WHERE id = ${resolvedPageId}
      AND status = 'active'
      AND owner_deleted IS NOT TRUE
    LIMIT 1
  `;

  const revealPinHash = typeof rows[0]?.reveal_pin_hash === "string" ? rows[0].reveal_pin_hash : null;
  if (!revealPinHash) {
    response.json({ unlocked: true });
    return;
  }

  const isValid = await verifyPassword(String(request.body.pin), revealPinHash);
  if (!isValid) {
    response.status(401).json({ error: "Incorrect PIN", code: "PIN_INVALID" });
    return;
  }

  setPublicUnlockCookie(response, resolvedPageId, revealPinHash);
  response.json({ unlocked: true });
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

  await sql`
    UPDATE birthday_pages
    SET view_count = view_count + 1
    WHERE id = ${resolvedPageId}
  `;

  const row = rows[0];
  const unlocked = hasValidPublicUnlock(request, resolvedPageId, typeof row.reveal_pin_hash === "string" ? row.reveal_pin_hash : null);
  const { reveal_pin_hash: _revealPinHash, ...safeRow } = row;

  response.json({
    ...serializePageDates(safeRow),
    requires_unlock: Boolean(row.requires_unlock),
    is_unlocked: unlocked,
  });
});

app.get("/api/public/pages/:id/pool/summary", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await sql`
    SELECT
      bp.pool_fundraising_enabled,
      bp.pool_goal_kobo,
      COALESCE(
        SUM(COALESCE(pc.net_received_kobo, pc.amount_kobo))
          FILTER (WHERE pc.status = 'success'),
        0
      )::bigint AS pooled_amount_kobo,
      bp.pool_description,
      EXISTS(
        SELECT 1
        FROM pool_payouts pp
        WHERE pp.page_id = bp.id
          AND pp.status = 'processing'
      ) AS is_requested,
      COALESCE(
        array_remove(
          array_agg(DISTINCT CASE WHEN pc.status = 'success' THEN pc.contributor_name END),
          NULL
        ),
        ARRAY[]::text[]
      ) AS contributors
    FROM birthday_pages bp
    LEFT JOIN pool_contributions pc ON pc.page_id = bp.id
    WHERE bp.id = ${resolvedPageId}
      AND bp.status = 'active'
    GROUP BY bp.id
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(rows[0]);
});

app.post(
  "/api/public/pages/:id/pool/request-release",
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

app.post(
  "/api/public/pages/:id/pool/initialize",
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
          email: contributorEmail || "pool@wishcanvas.app",
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

app.post(
  "/api/public/pages/:id/pool/verify",
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

  if (!hasValidPublicUnlock(request, resolvedPageId, typeof page.reveal_pin_hash === "string" ? page.reveal_pin_hash : null)) {
    response.status(423).json({ error: "PIN unlock required", code: "PIN_REQUIRED" });
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
  const contributorKey = (senderName || "Anonymous").trim().toLowerCase();

  if (String(page.owner_plan_tier || "free") !== "pro") {
    const contributorRows = await sql`
      SELECT
        COUNT(DISTINCT LOWER(TRIM(sender_name)))::int AS contributor_count,
        BOOL_OR(LOWER(TRIM(sender_name)) = ${contributorKey}) AS has_sender
      FROM birthday_messages
      WHERE page_id = ${resolvedPageId}
    `;

    const contributorCount = Number(contributorRows[0]?.contributor_count || 0);
    const hasSenderAlready = Boolean(contributorRows[0]?.has_sender);
    if (contributorCount >= FREE_CONTRIBUTOR_LIMIT && !hasSenderAlready) {
      response.status(403).json({
        error: `This page has reached the free plan limit of ${FREE_CONTRIBUTOR_LIMIT} contributors. Upgrade to Pro for unlimited contributors.`,
        code: "CONTRIBUTOR_LIMIT_REACHED",
      });
      return;
    }
  }

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

  const contributionAmountKobo = sanitizeAmountKobo(request.body.contributionAmountKobo) || 0;

  const rows = await sql`
    INSERT INTO birthday_messages (page_id, sender_name, message, photo_url, audio_url, contribution_amount_kobo)
    VALUES (
      ${resolvedPageId},
      ${senderName || "Anonymous"},
      ${message},
      ${photos[0]?.url || null},
      ${audioUrl},
      ${contributionAmountKobo}
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

  const stickers = Array.isArray(request.body.stickers) ? request.body.stickers : [];
  if (stickers.length) {
    await Promise.all(
      stickers.map((sticker: {
        stickerType: string;
        positionX: number;
        positionY: number;
        rotation?: number;
        scale?: number;
      }) => sql`
        INSERT INTO birthday_message_stickers (message_id, sticker_type, position_x, position_y, rotation, scale)
        VALUES (
          ${createdMessage.id},
          ${String(sticker.stickerType)},
          ${Number(sticker.positionX)},
          ${Number(sticker.positionY)},
          ${Number(sticker.rotation || 0)},
          ${Number(sticker.scale || 1)}
        )
      `),
    );
  }

  if (contributionAmountKobo > 0) {
    await sql`
      UPDATE birthday_pages
      SET pooled_amount_kobo = pooled_amount_kobo + ${contributionAmountKobo},
          updated_at = NOW()
      WHERE id = ${resolvedPageId}
    `;
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

function toAbsoluteAssetUrl(value: string, apiBase: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${apiBase}${value.startsWith("/") ? "" : "/"}${value}`;
}

async function buildCoverOgImageBuffer(coverUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const result = await fetch(coverUrl, {
      redirect: "follow",
      signal: controller.signal,
    });

    if (!result.ok) {
      return null;
    }

    const sourceBuffer = Buffer.from(await result.arrayBuffer());

    const baseImage = await sharp(sourceBuffer)
      .rotate()
      .resize(1200, 630, {
        fit: "cover",
        position: "attention",
      })
      .toBuffer();

    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.06)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.42)" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#shade)" />
  <rect x="52" y="44" width="1096" height="542" rx="34" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="8" />
  <circle cx="110" cy="104" r="34" fill="rgba(255,255,255,0.26)" />
  <circle cx="1060" cy="542" r="52" fill="rgba(255,255,255,0.18)" />
</svg>`;

    return await sharp(baseImage)
      .composite([{ input: Buffer.from(overlay), blend: "over" }])
      .png({ quality: 96 })
      .toBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/og-image-app", async (_request, response) => {
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ea580c" />
      <stop offset="52%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="cardGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.04)" />
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffaf0" />
      <stop offset="100%" stop-color="#f4efe6" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="140" cy="116" r="154" fill="rgba(255,255,255,0.18)" />
  <circle cx="1048" cy="516" r="214" fill="rgba(255,255,255,0.12)" />
  <rect x="88" y="62" width="1024" height="506" rx="34" fill="url(#cardGlow)" stroke="rgba(255,255,255,0.38)" stroke-width="4" />

  <rect x="126" y="112" width="948" height="400" rx="28" fill="url(#paper)" />
  <rect x="156" y="146" width="420" height="332" rx="22" fill="#ddd6fe" />
  <rect x="170" y="160" width="392" height="304" rx="18" fill="#c4b5fd" />
  <circle cx="338" cy="286" r="82" fill="rgba(255,255,255,0.7)" />
  <rect x="445" y="360" width="102" height="74" rx="18" fill="rgba(255,255,255,0.58)" />

  <rect x="618" y="162" width="394" height="20" rx="10" fill="#f97316" opacity="0.78" />
  <rect x="618" y="206" width="356" height="66" rx="16" fill="#fb923c" opacity="0.82" />
  <rect x="618" y="286" width="316" height="66" rx="16" fill="#ec4899" opacity="0.74" />
  <rect x="618" y="382" width="394" height="18" rx="9" fill="#6d28d9" opacity="0.6" />
  <rect x="618" y="418" width="244" height="18" rx="9" fill="#6d28d9" opacity="0.46" />

  <circle cx="958" cy="478" r="18" fill="#f97316" opacity="0.78" />
  <circle cx="994" cy="478" r="18" fill="#ec4899" opacity="0.72" />
  <circle cx="1030" cy="478" r="18" fill="#8b5cf6" opacity="0.68" />
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 94 }).toBuffer();
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(pngBuffer);
  } catch {
    response.status(500).send("Error generating image");
  }
});

app.get("/api/og-image/:id", validateParams(pageIdParamSchema), async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) { response.status(404).send("Not found"); return; }

    const rows = await publicPageQuery(resolvedPageId);
    const page = rows[0];
    if (!page) { response.status(404).send("Not found"); return; }

    const [colorFrom, colorTo] = resolveThemeColors(page);
    const apiBase = process.env.API_URL || `${request.protocol}://${request.get("host")}`;
    const coverPhoto = typeof page.cover_photo_url === "string" ? page.cover_photo_url : "";
    const normalizedCover = toAbsoluteAssetUrl(coverPhoto, apiBase);

    if (normalizedCover) {
      const coverPng = await buildCoverOgImageBuffer(normalizedCover);
      if (coverPng) {
        response.setHeader("Content-Type", "image/png");
        response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
        response.send(coverPng);
        return;
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}" />
      <stop offset="100%" stop-color="${colorTo}" />
    </linearGradient>
    <linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffaf0" />
      <stop offset="100%" stop-color="#f5efe3" />
    </linearGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.05)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.28)" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#vignette)" />
  <circle cx="188" cy="124" r="170" fill="rgba(255,255,255,0.16)" />
  <circle cx="1028" cy="520" r="208" fill="rgba(255,255,255,0.12)" />

  <rect x="104" y="74" width="992" height="482" rx="36" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.34)" stroke-width="4" />
  <rect x="140" y="112" width="920" height="406" rx="28" fill="url(#sheet)" />

  <rect x="178" y="152" width="370" height="326" rx="22" fill="#fde68a" opacity="0.58" />
  <rect x="194" y="168" width="338" height="294" rx="18" fill="#fef3c7" opacity="0.9" />
  <circle cx="330" cy="288" r="78" fill="rgba(251,146,60,0.35)" />
  <rect x="432" y="352" width="84" height="84" rx="14" fill="rgba(234,88,12,0.24)" />

  <rect x="580" y="168" width="424" height="18" rx="9" fill="rgba(17,24,39,0.3)" />
  <rect x="580" y="210" width="396" height="64" rx="16" fill="rgba(17,24,39,0.16)" />
  <rect x="580" y="288" width="356" height="64" rx="16" fill="rgba(17,24,39,0.14)" />
  <rect x="580" y="384" width="424" height="18" rx="9" fill="rgba(17,24,39,0.22)" />
  <rect x="580" y="420" width="258" height="18" rx="9" fill="rgba(17,24,39,0.16)" />

  <circle cx="962" cy="474" r="16" fill="rgba(234,88,12,0.58)" />
  <circle cx="994" cy="474" r="16" fill="rgba(236,72,153,0.52)" />
  <circle cx="1026" cy="474" r="16" fill="rgba(124,58,237,0.48)" />
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(pngBuffer);
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
    const previewMode = request.query.view === "contribute" ? "contribute" : "birthday";

    const title = previewMode === "contribute"
      ? `Add your wish for ${name}`
      : `Happy Birthday, ${name}!`;
    const description = previewMode === "contribute"
      ? `Join the birthday page and leave a wish, photo, or voice note for ${name}.`
      : `${count} birthday ${count === 1 ? "wish has" : "wishes have"} been collected. Open the letter to start the birthday story.`;
    const pageUrl = `${siteBase}/${previewMode === "contribute" ? "contribute" : "birthday"}/${publicCode}`;
    const imageVersion = encodeURIComponent(`${count}-${typeof page.cover_photo_url === "string" && page.cover_photo_url ? "cover" : "nocover"}`);
    const imageUrl = `${apiBase}/api/og-image/${publicCode}?v=${imageVersion}`;

    const escapedTitle = escapeHtml(title);
    const escapedDesc = escapeHtml(description);
    const escapedImage = escapeHtml(imageUrl);
    const escapedPageUrl = escapeHtml(pageUrl);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />
  <meta property="og:site_name" content="WishCanvas" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapedPageUrl}" />
  <meta property="og:image" content="${escapedImage}" />
  <meta property="og:image:secure_url" content="${escapedImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  <meta name="twitter:image" content="${escapedImage}" />
  <meta name="twitter:image:alt" content="Birthday preview for ${escapeHtml(name)}" />
  <meta http-equiv="refresh" content="0;url=${escapedPageUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${escapedPageUrl}">${escapedTitle}</a></p>
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
    app.listen(port, "0.0.0.0", () => {
      console.log(`WishCanvas API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
