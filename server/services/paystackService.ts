import crypto from "node:crypto";
import { sql } from "../db";
import { resolvePageId } from "./pageQueries";
import { sanitizeDisplayName, sanitizeEmail, sanitizeAmountKobo } from "./requestUtils";

export const PAYSTACK_BASE_URL = "https://api.paystack.co";
export const BPS_BASE = 10_000;
export const POOL_CONTRIBUTION_PLATFORM_FEE_BPS = 150;
export const POOL_PAYOUT_FEE_BPS = 200;
export const PAYSTACK_TRANSACTION_FEE_BPS = 150;
export const PAYSTACK_TRANSACTION_FLAT_FEE_KOBO = 10_000;
export const PAYSTACK_TRANSACTION_MAX_FEE_KOBO = 200_000;
export const PRO_ONE_TIME_AMOUNT_KOBO = 500000;
export const PRO_OFFER_CURRENCY = "NGN";
export const PRO_OFFER_PURCHASE_TYPE = "one_time";
export const PAYSTACK_BANKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export const PRO_OFFER_FEATURES = [
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

export type PaystackBank = {
  name?: string;
  code?: string;
  active?: boolean;
  country?: string;
  currency?: string;
};

export type PaystackPaymentData = {
  status: string;
  amount: number;
  currency: string;
  reference: string;
  fees?: number;
  customer?: { email?: string };
  metadata?: {
    userId?: string;
    planTier?: string;
    purpose?: string;
    pageId?: string;
    contributorName?: string;
    contributorEmail?: string;
    contributionAmountKobo?: number;
    purchaseType?: string;
  };
};

export type ProcessPaystackPaymentResult = {
  status: "upgraded" | "already-pro" | "ignored" | "conflict" | "user-not-found";
  userId: string | null;
};

export type PoolContributionUpsertResult = {
  ok: boolean;
  code: "SUCCESS" | "PAYMENT_NOT_SUCCESS" | "PAYMENT_TYPE_MISMATCH" | "PAYMENT_PAGE_MISMATCH" | "PAYMENT_REFERENCE_CONFLICT";
  message?: string;
};

let paystackBanksCache: Array<{ name: string; code: string }> = [];
let paystackBanksCacheExpiresAt = 0;

export function getPaystackSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || "";
}

export function isValidPaystackSignature(rawBody: string, signature: string, secretKey: string): boolean {
  if (!rawBody || !signature || !secretKey) return false;

  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function getProAmountKobo(): number {
  return PRO_ONE_TIME_AMOUNT_KOBO;
}

export function percentageFeeKobo(amountKobo: number, bps: number): number {
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) return 0;
  return Math.round((amountKobo * bps) / BPS_BASE);
}

export function calculatePoolContributionCharge(contributionAmountKobo: number) {
  const normalizedContribution = Math.max(0, Math.trunc(contributionAmountKobo));
  const platformFeeKobo = percentageFeeKobo(normalizedContribution, POOL_CONTRIBUTION_PLATFORM_FEE_BPS);
  const totalChargeKobo = normalizedContribution + platformFeeKobo;

  return {
    contributionAmountKobo: normalizedContribution,
    platformFeeKobo,
    totalChargeKobo,
  };
}

export function calculatePaystackFeeKobo(totalChargeKobo: number): number {
  const normalizedCharge = Math.max(0, Math.trunc(totalChargeKobo));
  const percentageComponent = percentageFeeKobo(normalizedCharge, PAYSTACK_TRANSACTION_FEE_BPS);
  const flatFee = normalizedCharge < 250000 ? 0 : PAYSTACK_TRANSACTION_FLAT_FEE_KOBO;
  return Math.min(PAYSTACK_TRANSACTION_MAX_FEE_KOBO, percentageComponent + flatFee);
}

export function calculateNetReceivedKobo(totalChargeKobo: number) {
  const normalizedCharge = Math.max(0, Math.trunc(totalChargeKobo));
  const paystackFeeKobo = calculatePaystackFeeKobo(normalizedCharge);
  const netReceivedKobo = Math.max(normalizedCharge - paystackFeeKobo, 0);

  return {
    paystackFeeKobo,
    netReceivedKobo,
  };
}

export function calculatePoolPayout(grossPoolBalanceKobo: number) {
  const normalizedBalance = Math.max(0, Math.trunc(grossPoolBalanceKobo));
  const payoutFeeKobo = percentageFeeKobo(normalizedBalance, POOL_PAYOUT_FEE_BPS);
  const payoutAmountKobo = Math.max(normalizedBalance - payoutFeeKobo, 0);

  return {
    grossPoolBalanceKobo: normalizedBalance,
    payoutFeeKobo,
    payoutAmountKobo,
  };
}

export async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchPaystackBanks(): Promise<Array<{ name: string; code: string }>> {
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

export function classifyPayoutProviderError(error: unknown) {
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

export async function processPaystackSuccessfulPayment(
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
  if (payment.status !== "success" || !Number.isSafeInteger(paidAmount) || paidAmount < expectedAmount ||
      paidAmount > 500000000 || payment.currency !== PRO_OFFER_CURRENCY ||
      payment.metadata?.planTier !== 'pro' || payment.metadata?.purchaseType !== 'one_time' ||
      payment.metadata?.purpose === 'pool_gift') {
    return { status: "ignored", userId: null };
  }

  const normalizedEmail = typeof payment.customer?.email === "string"
    ? payment.customer.email.trim().toLowerCase()
    : "";
  const metadataUserId = typeof payment.metadata?.userId === "string"
    ? payment.metadata.userId
    : "";

  if (!metadataUserId && !normalizedEmail) return { status: 'conflict', userId: null };

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
      ${JSON.stringify({ reference: payment.reference, status: payment.status, amount: paidAmount, currency: payment.currency, source: options.source })}::jsonb,
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
    WHERE billing_payments.provider = EXCLUDED.provider AND billing_payments.user_id = EXCLUDED.user_id
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

export async function upsertSuccessfulPoolContributionFromPayment(
  resolvedPageId: string,
  payment: PaystackPaymentData,
  rawPayload: unknown,
): Promise<PoolContributionUpsertResult> {
  if (!payment || payment.status !== "success" || payment.currency !== PRO_OFFER_CURRENCY ||
      !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.amount > 500000000 || !payment.reference) {
    return { ok: false, code: "PAYMENT_NOT_SUCCESS", message: "Payment was not completed." };
  }

  const paymentPurpose = typeof payment.metadata?.purpose === "string" ? payment.metadata.purpose : "";
  const paymentPageId = typeof payment.metadata?.pageId === "string" ? payment.metadata.pageId : "";
  const resolvedPaymentPageId = paymentPageId ? await resolvePageId(paymentPageId) : null;

  if (paymentPurpose !== "pool_gift" || !paymentPageId) {
    return { ok: false, code: "PAYMENT_TYPE_MISMATCH", message: "Payment is not a pool gift." };
  }

  if (!resolvedPaymentPageId || resolvedPaymentPageId !== resolvedPageId) {
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
  if (!existingContribution) {
    return { ok: false, code: 'PAYMENT_NOT_SUCCESS', message: 'Checkout reference was not initialized here; contact support for reconciliation.' };
  }
  const existingPageId = existingContribution?.page_id ? String(existingContribution.page_id) : null;
  if (existingPageId && existingPageId !== resolvedPageId) {
    return { ok: false, code: "PAYMENT_REFERENCE_CONFLICT", message: "Payment reference belongs to another page." };
  }

  const metadataContributionAmountKobo = sanitizeAmountKobo(payment.metadata?.contributionAmountKobo);
  const fallbackContributionAmountKobo = Number(existingContribution?.contribution_amount_kobo || 0)
    || metadataContributionAmountKobo
    || 0;

  const contributionCharge = calculatePoolContributionCharge(fallbackContributionAmountKobo);
  const contributionAmountKobo = contributionCharge.contributionAmountKobo;
  const platformFeeKobo = Number(existingContribution?.platform_fee_kobo || 0) || contributionCharge.platformFeeKobo;
  const finalTotalChargeKobo = totalChargeKobo || Number(existingContribution?.total_charge_kobo || 0) || contributionCharge.totalChargeKobo;
  const expectedCharge = Number(existingContribution?.total_charge_kobo || contributionCharge.totalChargeKobo);
  if (!contributionAmountKobo || totalChargeKobo !== expectedCharge ||
      expectedCharge !== contributionCharge.totalChargeKobo) {
    return { ok: false, code: 'PAYMENT_NOT_SUCCESS', message: 'Payment amount does not match the initialized gift.' };
  }
  const settlement = Number.isSafeInteger(payment.fees) && payment.fees! >= 0 && payment.fees! <= finalTotalChargeKobo
    ? { paystackFeeKobo: payment.fees!, netReceivedKobo: finalTotalChargeKobo - payment.fees! }
    : calculateNetReceivedKobo(finalTotalChargeKobo);

  const credited = await sql`
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
      ${JSON.stringify({ reference: payment.reference, amount: finalTotalChargeKobo, currency: payment.currency, fees: settlement.paystackFeeKobo })}::jsonb,
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
    WHERE pool_contributions.page_id = EXCLUDED.page_id
    RETURNING page_id
  `;

  if (!credited[0]) return { ok: false, code: 'PAYMENT_REFERENCE_CONFLICT', message: 'Payment reference belongs to another page.' };

  // The database trigger refreshes the balance under the page lock in the credit transaction.

  return { ok: true, code: "SUCCESS" };
}
