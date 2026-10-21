import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { createTestDatabase } from './testSupport/postgres';

process.env.JWT_SECRET = 'isolated-test-only-secret-not-used-in-production';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_isolated';
delete process.env.RESEND_API_KEY;
const database = await createTestDatabase();
const { giftPoolRouter } = await import('./routes/giftPool');
const { signSession } = await import('./auth');
const { poolPayoutReleaseLimiter } = await import('./rateLimits');
const { handlePaystackWebhook } = await import('./routes/billing');
const { authRouter } = await import('./routes/auth');
const { pagesRouter } = await import('./routes/pages');
const { upsertSuccessfulPoolContributionFromPayment } = await import('./services/paystackService');
const userId = '00000000-0000-4000-8000-000000000011';
const otherId = '00000000-0000-4000-8000-000000000013';
const pageId = '00000000-0000-4000-8000-000000000012';
await database.query('INSERT INTO users (id,email,password_hash) VALUES ($1,$2,$3),($4,$5,$3)', [userId, 'owner@example.invalid', 'test-only', otherId, 'collaborator@example.invalid']);
await database.query("INSERT INTO birthday_pages (id,user_id,recipient_name,birthday_date,public_code,pool_fundraising_enabled,pooled_amount_kobo,recipient_bank_code,recipient_account_number,recipient_account_name) VALUES ($1,$2,'Test','2000-01-01','payout-test',true,100000,'058','0123456789','Test Recipient')", [pageId, userId]);
await database.query('INSERT INTO page_collaborators (page_id,user_id) VALUES ($1,$2)', [pageId,otherId]);
const app = express();
app.use(cookieParser());
app.post('/webhook', express.raw({ type: 'application/json' }), handlePaystackWebhook);
app.use(express.json());
app.use('/api', giftPoolRouter);
app.use('/api/auth', authRouter);
app.use('/api/pages', pagesRouter);
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
let transferStatus = 'pending';
let transferCalls = 0;
let throwOnTransfer = false;
let throwOnRecipient = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith('https://api.paystack.co/')) return originalFetch(input, init);
  const body = JSON.parse(String(init?.body || '{}'));
  if (url.endsWith('/transaction/initialize')) {
    const reserved = await database.query('SELECT provider_reference FROM pool_contributions WHERE provider_reference=$1', [body.reference]);
    assert.equal(reserved.rows.length, 1, 'reserve the checkout before any external request');
    return Response.json({ status: true, data: { authorization_url: 'https://checkout.example.invalid/test', reference: body.reference } });
  }
  if (url.endsWith('/transferrecipient')) {
    if (throwOnRecipient) throw new Error('recipient creation failed');
    return Response.json({ status: true, data: { recipient_code: 'RCP_test' } });
  }
  if (url.endsWith('/transfer')) {
    transferCalls++;
    if (throwOnTransfer) throw new Error('network timeout after provider acceptance');
    return Response.json({ status: true, data: { reference: body.reference, transfer_code: 'TRF_test', status: transferStatus } });
  }
  if (url.includes('/transfer/verify/')) {
    const reference = decodeURIComponent(url.split('/').at(-1)!);
    return Response.json({ status: true, data: { reference, amount: 98000, currency: 'NGN', status: transferStatus } });
  }
  throw new Error(`Unmocked provider endpoint: ${url}`);
};
after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await database.close();
});
const cookie = (id = userId) => `wishcanvas_access=${signSession({ id, email: id === userId ? 'owner@example.invalid' : 'collaborator@example.invalid', planTier: 'pro' } as never)}`;
const release = (id = userId) => fetch(`${base}/api/pages/${pageId}/pool/release`, { method: 'POST', headers: { Cookie: cookie(id), 'Content-Type': 'application/json' }, body: '{}' });
async function reset() {
  poolPayoutReleaseLimiter.resetKey('127.0.0.1');
  await database.query('DELETE FROM pool_payouts');
  await database.query('DELETE FROM pool_contributions');
  await database.query('UPDATE birthday_pages SET pooled_amount_kobo=100000,owner_deleted=false WHERE id=$1', [pageId]);
  transferCalls = 0;
  throwOnTransfer = false;
  throwOnRecipient = false;
}
test('recipient setup failure cannot move money and does not leave an uncertain transfer', async () => {
  await reset(); throwOnRecipient = true;
  const failed = await release();
  assert.equal(failed.status, 502);
  assert.equal(transferCalls, 0);
  assert.equal((await database.query<{ status: string }>("SELECT status FROM pool_payouts WHERE provider='paystack'")).rows[0].status, 'failed');
  throwOnRecipient = false; transferStatus = 'pending';
  assert.equal((await release()).status, 200);
  assert.equal(transferCalls, 1);
});
test('pending checkouts block payout and account/canvas deletion even with zero credited balance', async () => {
  await reset();
  await database.query("INSERT INTO pool_contributions(page_id,provider_reference,amount_kobo,status) VALUES ($1,'pending-checkout',101500,'pending')", [pageId]);
  assert.equal((await release()).status, 409);
  assert.equal(transferCalls, 0);
  await database.query('UPDATE birthday_pages SET pooled_amount_kobo=0 WHERE id=$1', [pageId]);
  assert.equal((await fetch(`${base}/api/auth/me/data`, { method: 'DELETE', headers: { Cookie: cookie() } })).status, 409);
  assert.equal((await fetch(`${base}/api/pages/${pageId}`, { method: 'DELETE', headers: { Cookie: cookie() } })).status, 409);
  await assert.rejects(database.query('DELETE FROM users WHERE id=$1', [userId]), /UNSETTLED_GIFT_POOL/);
  await database.query('DELETE FROM pool_contributions');
  await database.query('UPDATE birthday_pages SET pooled_amount_kobo=100000 WHERE id=$1', [pageId]);
});
test('canvas deletion cannot hide credited gift funds', async () => {
  await reset();
  assert.equal((await fetch(`${base}/api/pages/${pageId}`, { method: 'DELETE', headers: { Cookie: cookie() } })).status, 409);
});
test('an initialized checkout blocks payout until its successful payment is credited', async () => {
  await reset(); transferStatus = 'pending';
  await database.query("UPDATE birthday_pages SET close_date='2100-01-01' WHERE id=$1", [pageId]);
  const response = await fetch(`${base}/api/public/pages/${pageId}/pool/initialize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountKobo: 100000, contributorName: 'Test', contributorEmail: 'test@example.invalid' }) });
  assert.equal(response.status, 200);
  const { reference } = await response.json() as { reference: string };
  assert.equal((await release()).status, 409);
  assert.equal(transferCalls, 0);
  assert.equal((await upsertSuccessfulPoolContributionFromPayment(pageId, { reference, status: 'success', currency: 'NGN', amount: 101500, fees: 1500, metadata: { purpose: 'pool_gift', pageId, contributionAmountKobo: 100000 } }, {})).ok, true);
  assert.equal((await release()).status, 200);
  assert.equal(transferCalls, 1);
});
for (const state of ['pending', 'otp']) {
  test(`provider ${state} transfer remains processing`, async () => {
    await reset(); transferStatus = state;
    const response = await release();
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { status: string }).status, 'processing');
    assert.equal((await database.query<{ status: string }>('SELECT status FROM pool_payouts')).rows[0].status, 'processing');
  });
}
test('uncertain network outcome cannot create another transfer on retry', async () => {
  await reset(); throwOnTransfer = true;
  await release();
  const retry = await release();
  assert.equal(retry.status, 409);
  assert.equal(transferCalls, 1);
});
test('two concurrent release requests create only one transfer', async () => {
  await reset(); transferStatus = 'pending';
  await Promise.all([release(), release()]);
  assert.equal(transferCalls, 1);
});
test('recipient notification records can be superseded before payout', async () => {
  await reset(); transferStatus = 'success';
  await database.query("INSERT INTO pool_payouts(page_id,provider,amount_kobo,status) VALUES ($1,'request',100000,'processing')", [pageId]);
  const response = await release();
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
});
test('co-organizers cannot release money', async () => {
  await reset();
  assert.equal((await release(otherId)).status, 403);
  assert.equal(transferCalls, 0);
});
test('a signed transfer webhook reconciles a pending payout against the provider', async () => {
  await reset(); transferStatus = 'pending';
  const response = await release();
  assert.equal(response.status, 200);
  const { reference } = await response.json() as { reference: string };
  transferStatus = 'success';
  const payload = JSON.stringify({ event: 'transfer.success', data: { reference, amount: 98000, currency: 'NGN' } });
  const signature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(payload).digest('hex');
  assert.equal((await fetch(`${base}/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature }, body: payload })).status, 200);
  assert.equal((await database.query<{ status: string }>("SELECT status FROM pool_payouts WHERE provider='paystack'")).rows[0].status, 'success');
});
test('cash gift checkouts close once payout has started', async () => {
  await reset(); transferStatus = 'pending';
  await release();
  await database.query("UPDATE birthday_pages SET close_date='2100-01-01' WHERE id=$1", [pageId]);
  const response = await fetch(`${base}/api/public/pages/${pageId}/pool/initialize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountKobo: 100000, contributorName: 'Test', contributorEmail: 'test@example.invalid' }) });
  assert.equal(response.status, 409);
});
test('account deletion cannot discard unsettled pooled money', async () => {
  await reset();
  const response = await fetch(`${base}/api/auth/me/data`, { method: 'DELETE', headers: { Cookie: cookie() } });
  assert.equal(response.status, 409);
  assert.equal((await database.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM users WHERE id=$1', [userId])).rows[0].count, 1);
});
test('database rejects a second active payout even when application checks race', async () => {
  await reset();
  const insert = (reference: string) => database.query("INSERT INTO pool_payouts(page_id,provider,provider_reference,amount_kobo,gross_pool_amount_kobo,status) VALUES ($1,'paystack',$2,98000,100000,'processing')", [pageId,reference]);
  const outcomes = await Promise.allSettled([insert('race-one'), insert('race-two')]);
  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
});
