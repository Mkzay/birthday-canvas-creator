import express from "express";
import { requireAuth } from "../auth";
import type { AuthedRequest } from "../types";
import { validateBody } from "../validateRequest";
import { paystackResolveAccountBodySchema } from "../schemas";
import { fetchPaystackBanks, paystackRequest } from "../services/paystackService";
import { sanitizeBankCode, sanitizeAccountNumber, logRequestFailure } from "../services/requestUtils";

export const paymentsRouter = express.Router();

paymentsRouter.get("/paystack/banks", requireAuth, async (_request: AuthedRequest, response) => {
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

paymentsRouter.post(
  "/paystack/resolve-account",
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
