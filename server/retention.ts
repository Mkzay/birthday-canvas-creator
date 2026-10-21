import { sql } from './db';

// Fixed application retention windows; hosting logs/backups follow provider plans.
const tasks = [
  { name: 'emailTokens', table: 'email_tokens', where: "expires_at < NOW() - INTERVAL '30 days' OR used_at < NOW() - INTERVAL '30 days'" },
  { name: 'authSessions', table: 'auth_sessions', where: "expires_at < NOW() - INTERVAL '30 days' OR revoked_at < NOW() - INTERVAL '30 days'" },
  { name: 'editLogs', table: 'wish_edit_logs', where: "created_at < NOW() - INTERVAL '30 days'" },
  { name: 'billingPayloads', table: 'billing_payments', where: "raw_payload IS NOT NULL AND status IN ('success','failed') AND created_at < NOW() - INTERVAL '30 days'", column: 'raw_payload' },
  { name: 'poolPayloads', table: 'pool_contributions', where: "payment_metadata IS NOT NULL AND status IN ('success','failed') AND created_at < NOW() - INTERVAL '30 days'", column: 'payment_metadata' },
  { name: 'payoutPayloads', table: 'pool_payouts', where: "response_payload IS NOT NULL AND status IN ('success','failed','superseded') AND created_at < NOW() - INTERVAL '30 days'", column: 'response_payload' },
  { name: 'financialRecords', table: 'financial_records', where: 'expires_at < NOW() AND legal_hold = FALSE' },
  { name: 'closedAccountPayments', table: 'billing_payments', where: "user_id IS NULL AND updated_at < NOW() - INTERVAL '7 years' AND NOT EXISTS (SELECT 1 FROM financial_records fr WHERE fr.provider = billing_payments.provider AND fr.provider_reference = billing_payments.provider_reference AND fr.legal_hold = TRUE)" },
] as const;

export async function runRetentionCleanup({ apply = false }: { apply?: boolean } = {}) {
  const summary: Record<string, number | boolean> = { applied: apply };
  for (const task of tasks) {
    // Every identifier/clause here is a source constant, never request input.
    const mutation = 'column' in task ? `UPDATE ${task.table} SET ${task.column} = NULL WHERE ${task.where}`
      : `DELETE FROM ${task.table} WHERE ${task.where}`;
    const query = apply ? `WITH affected AS (${mutation} RETURNING 1) SELECT COUNT(*)::int AS count FROM affected`
      : `SELECT COUNT(*)::int AS count FROM ${task.table} WHERE ${task.where}`;
    const rows = await sql.query(query);
    summary[task.name] = Number(rows[0].count);
  }
  return summary;
}
