import express from "express";
import { requireAuth } from "../auth";
import type { AuthedRequest } from "../types";
import { validateBody } from "../validateRequest";
import { paystackResolveAccountBodySchema } from "../schemas";
import { fetchPaystackBanks, paystackRequest } from "../services/paystackService";
import { sanitizeBankCode, sanitizeAccountNumber, logRequestFailure } from "../services/requestUtils";

export const paymentsRouter = express.Router();

const handleGetBanks = async (_request: AuthedRequest, response: express.Response) => {
  try {
    const banks = await fetchPaystackBanks();
    response.json({ banks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "bank-list-failed";
    logRequestFailure("bank-list", { message });

    if (message === "PAYSTACK_NOT_CONFIGURED") {
      response.status(500).json({ error: "Payment gateway is not configured on the server." });
      return;
    }

    response.status(502).json({ error: "Could not load bank list right now." });
  }
};

const handleResolveAccount = async (request: AuthedRequest, response: express.Response) => {
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
    const message = error instanceof Error ? error.message : "account-resolve-failed";
    logRequestFailure("account-resolve", { message, bankCode });

    if (message === "PAYSTACK_NOT_CONFIGURED") {
      response.status(500).json({ error: "Payment gateway is not configured on the server." });
      return;
    }

    response.status(400).json({ error: "Could not resolve account details." });
  }
};

// Generic conventional endpoints
paymentsRouter.get("/banks", requireAuth, handleGetBanks);
paymentsRouter.post("/resolve-account", requireAuth, validateBody(paystackResolveAccountBodySchema), handleResolveAccount);

// Legacy vendor endpoints for backwards compatibility
paymentsRouter.get("/paystack/banks", requireAuth, handleGetBanks);
paymentsRouter.post("/paystack/resolve-account", requireAuth, validateBody(paystackResolveAccountBodySchema), handleResolveAccount);
