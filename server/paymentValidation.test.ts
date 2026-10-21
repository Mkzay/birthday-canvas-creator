import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createTestDatabase } from './testSupport/postgres';

const database = await createTestDatabase();
after(() => database.close());
const { processBachsSuccessfulPayment } = await import('./services/bachsService');
const { processPaystackSuccessfulPayment, upsertSuccessfulPoolContributionFromPayment, calculatePaystackFeeKobo } = await import('./services/paystackService');
const userId = '00000000-0000-4000-8000-000000000001';
const pageId = '00000000-0000-4000-8000-000000000002';
await database.query('INSERT INTO users (id,email,password_hash) VALUES ($1,$2,$3)', [userId, 'test@example.invalid', 'test-only']);
await database.query("INSERT INTO birthday_pages (id,user_id,recipient_name,birthday_date,public_code) VALUES ($1,$2,'Test','2026-10-21','test-page')", [pageId, userId]);
const options = { source: 'verify-endpoint' as const, expectedUserId: userId, expectedUserEmail: 'test@example.invalid', rawPayload: {} };
const bachsPayment = { reference: 'bachs-1', status: 'succeeded', amount: '5000.00', currency: 'NGN', customer: { email: 'test@example.invalid' }, metadata: { userId, planTier: 'pro', purchaseType: 'one_time' } };
for (const patch of [{ amount: '1.00' }, { amount: '' }, { amount: '5000oops' }, { amount: '-5000' }, { currency: 'USD' }, { status: 'failed' }, { status: undefined }, { metadata: undefined, customer: undefined }]) {
  test(`Bachs rejects incomplete/unpaid payment ${JSON.stringify(patch)}`, async () => {
    await database.query("UPDATE users SET plan_tier = 'free' WHERE id=$1", [userId]);
    const result = await processBachsSuccessfulPayment({ ...bachsPayment, ...patch }, options);
    assert.notEqual(result.status, 'upgraded');
    assert.equal((await database.query<{ plan_tier: string }>('SELECT plan_tier FROM users WHERE id=$1', [userId])).rows[0].plan_tier, 'free');
  });
}
const paystackPayment = { reference: 'paystack-1', status: 'success', amount: 500000, currency: 'NGN', customer: { email: 'test@example.invalid' }, metadata: { userId, planTier: 'pro', purchaseType: 'one_time' } };
for (const patch of [{ amount: NaN }, { amount: 500000.5 }, { currency: 'USD' }, { metadata: { userId, purpose: 'pool_gift', pageId } }, { metadata: undefined, customer: undefined }]) {
  test(`Paystack Pro rejects wrong amount/currency/purpose/identity ${JSON.stringify(patch)}`, async () => {
    await database.query("UPDATE users SET plan_tier = 'free' WHERE id=$1", [userId]);
    const result = await processPaystackSuccessfulPayment({ ...paystackPayment, ...patch }, options);
    assert.notEqual(result.status, 'upgraded');
  });
}
test('valid Pro payment upgrades once; a duplicate is idempotent', async () => {
  await database.query("UPDATE users SET plan_tier='free' WHERE id=$1", [userId]);
  assert.equal((await processPaystackSuccessfulPayment(paystackPayment, options)).status, 'upgraded');
  assert.equal((await processPaystackSuccessfulPayment(paystackPayment, options)).status, 'already-pro');
  assert.equal((await database.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM billing_payments WHERE provider_reference=$1', [paystackPayment.reference])).rows[0].count, 1);
});
test('Bachs valid payment is accepted by the migrated database schema', async () => {
  await database.query("UPDATE users SET plan_tier='free' WHERE id=$1", [userId]);
  assert.equal((await processBachsSuccessfulPayment({ ...bachsPayment, reference: 'valid-bachs' }, options)).status, 'upgraded');
});
for (const patch of [{ amount: 0 }, { amount: 100 }, { currency: 'USD' }, { metadata: { purpose: 'other', pageId } }, { metadata: { purpose: 'pool_gift', pageId: 'unknown' } }]) {
  test(`pool rejects invalid contribution ${JSON.stringify(patch)}`, async () => {
    const payment = { ...paystackPayment, reference: 'pool-1', amount: 101500, metadata: { purpose: 'pool_gift', pageId, contributionAmountKobo: 100000 }, ...patch };
    assert.equal((await upsertSuccessfulPoolContributionFromPayment(pageId, payment, {})).ok, false);
  });
}
test('a valid gift is credited once and cannot unlock Pro', async () => {
  const payment = { ...paystackPayment, reference: 'pool-valid', amount: 101500, fees: 700, metadata: { purpose: 'pool_gift', pageId, contributionAmountKobo: 100000 } };
  await database.query("INSERT INTO pool_contributions(page_id,provider_reference,amount_kobo,contribution_amount_kobo,platform_fee_kobo,total_charge_kobo,status) VALUES ($1,$2,101500,100000,1500,101500,'pending')", [pageId, payment.reference]);
  assert.equal((await upsertSuccessfulPoolContributionFromPayment(pageId, payment, {})).ok, true);
  assert.equal((await upsertSuccessfulPoolContributionFromPayment(pageId, payment, {})).ok, true);
  assert.equal((await database.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM pool_contributions WHERE provider_reference=$1', [payment.reference])).rows[0].count, 1);
  assert.equal((await processPaystackSuccessfulPayment(payment, options)).status, 'ignored');
  const settled = (await database.query<{ net_received_kobo: number }>("SELECT net_received_kobo FROM pool_contributions WHERE provider_reference='pool-valid'")).rows[0];
  assert.equal(settled.net_received_kobo, 100800, 'use verified provider fees rather than a pricing estimate');
});
test('Paystack local fee estimate waives the flat fee below NGN 2500 and caps fees', () => {
  assert.equal(calculatePaystackFeeKobo(100000), 1500);
  assert.equal(calculatePaystackFeeKobo(250000), 13750);
  assert.equal(calculatePaystackFeeKobo(100000000), 200000);
  assert.equal(calculatePaystackFeeKobo(0), 0);
});
