import crypto from "node:crypto";
import { sql } from "./db";

export type EmailTokenPurpose = "verify_email" | "password_reset";

const DEFAULT_EXPIRY_HOURS: Record<EmailTokenPurpose, number> = {
  verify_email: 24,
  password_reset: 1,
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function issueEmailToken(params: {
  userId: string;
  purpose: EmailTokenPurpose;
  expiresInHours?: number;
  metadata?: Record<string, unknown> | null;
}) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = addHours(new Date(), params.expiresInHours ?? DEFAULT_EXPIRY_HOURS[params.purpose]);

  await sql`
    INSERT INTO email_tokens (user_id, token_hash, purpose, expires_at, metadata)
    VALUES (${params.userId}, ${tokenHash}, ${params.purpose}, ${expiresAt.toISOString()}, ${params.metadata || null})
  `;

  return {
    token: rawToken,
    expiresAt,
  };
}

export async function consumeEmailToken(params: {
  token: string;
  purpose: EmailTokenPurpose;
}) {
  const tokenHash = hashToken(params.token);
  const rows = await sql`
    UPDATE email_tokens
    SET used_at = NOW()
    WHERE token_hash = ${tokenHash}
      AND purpose = ${params.purpose}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING id, user_id, metadata
  `;

  if (!rows[0]) return null;

  return {
    id: String(rows[0].id),
    userId: String(rows[0].user_id),
    metadata: rows[0].metadata ?? null,
  };
}

export async function revokeOutstandingEmailTokens(userId: string, purpose: EmailTokenPurpose) {
  await sql`
    UPDATE email_tokens
    SET used_at = NOW()
    WHERE user_id = ${userId}
      AND purpose = ${purpose}
      AND used_at IS NULL
      AND expires_at > NOW()
  `;
}

