import { sql } from '../db';
import { paystackRequest } from './paystackService';

/** Read the provider's current state before completing or retrying money movement. */
export async function reconcilePoolPayout(reference: string) {
  const rows = await sql`
    SELECT id, amount_kobo FROM pool_payouts
    WHERE provider = 'paystack' AND provider_reference = ${reference} LIMIT 1
  `;
  if (!rows[0]) return { status: 'ignored' as const };
  const transfer = await paystackRequest<{ reference: string; amount: number; currency: string; status: string }>(
    `/transfer/verify/${encodeURIComponent(reference)}`,
  );
  if (transfer.reference !== reference || transfer.currency !== 'NGN' ||
      !Number.isSafeInteger(transfer.amount) || transfer.amount !== Number(rows[0].amount_kobo)) {
    throw new Error('Transfer details do not match the recorded payout');
  }
  const status = transfer.status === 'success' ? 'success'
    : ['failed', 'reversed', 'abandoned'].includes(transfer.status) ? 'failed' : 'processing';
  await sql`
    UPDATE pool_payouts SET status = ${status},
      response_payload = ${JSON.stringify({ reference, status: transfer.status, amount: transfer.amount, currency: transfer.currency, reconciled: true })}::jsonb,
      updated_at = NOW() WHERE id = ${rows[0].id}
  `;
  return { status, reference };
}
