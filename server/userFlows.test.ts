import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createTestDatabase } from './testSupport/postgres';

process.env.JWT_SECRET = 'isolated-flow-test-secret';
process.env.RESEND_API_KEY = 'test-only';
process.env.EMAIL_FROM = 'WishCanvas <hello@example.invalid>';
process.env.CLIENT_URLS = 'https://staging.example.invalid';
const database = await createTestDatabase();
const { authRouter } = await import('./routes/auth');
const { pagesRouter } = await import('./routes/pages');
const { publicPagesRouter } = await import('./routes/publicPages');
const originalFetch = globalThis.fetch;
const emails: Array<{ text: string }> = [];
globalThis.fetch = async (input, init) => {
  if (String(input) === 'https://api.resend.com/emails') {
    emails.push(JSON.parse(String(init?.body)));
    return Response.json({ id: 'test-email' });
  }
  if (!String(input).startsWith('http://127.0.0.1:')) throw new Error('Unexpected external request in isolated test');
  return originalFetch(input, init);
};
const app = express();
app.use(cookieParser()); app.use(express.json());
app.use('/api/auth', authRouter); app.use('/api/pages', pagesRouter); app.use('/api/public/pages', publicPagesRouter);
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const address = server.address(); assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}/api`;
after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await database.close();
});
let cookie = '';
async function request(path: string, body?: object, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const newCookies = response.headers.getSetCookie();
  if (newCookies.length) cookie = newCookies.map((value) => value.split(';')[0]).join('; ');
  return response;
}
test('guest creation, private claim, verification, password reset, free limit, reveal/PIN and deletion work together', async () => {
  const created = await request('/pages', { guestEmail: 'flow@example.invalid', recipientName: 'Test Celebrant', birthdayDate: '2100-01-01', closeDate: '2100-01-01' });
  assert.equal(created.status, 201, await created.clone().text());
  const page = await created.json() as { id: string; public_code: string; claim_token: string };
  const signup = await request('/auth/signup', { email: 'flow@example.invalid', password: 'test-password123', displayName: 'Tester', publicCode: page.public_code, claimToken: page.claim_token });
  assert.equal(signup.status, 201, await signup.clone().text());
  assert.equal((await request('/auth/login', { email: 'flow@example.invalid', password: 'test-password123' })).status, 403);
  const verifyMail = emails.find((mail) => mail.text.includes('/verify-email?token='));
  assert.ok(verifyMail);
  const verifyToken = verifyMail.text.match(/token=([a-f0-9]+)/)![1];
  const verified = await request('/auth/verify/confirm', { token: verifyToken });
  assert.equal(verified.status, 200, await verified.clone().text());
  const ownedPage = await request(`/pages/${page.id}`);
  assert.equal(ownedPage.status, 200, await ownedPage.clone().text());
  for (let index = 0; index < 6; index++) {
    const response = await request(`/public/pages/${page.id}/messages`, { senderName: `Guest ${index}`, message: `Happy birthday ${index}` });
    assert.equal(response.status, 201, await response.clone().text());
  }
  assert.equal((await request(`/public/pages/${page.id}/messages`, { senderName: 'Seventh Guest', message: 'Happy birthday' })).status, 403);
  const locked = await (await request(`/public/pages/${page.id}`)).json() as { messages: unknown[] };
  assert.equal(locked.messages.length, 0);
  const user = (await database.query<{ id: string }>("SELECT id FROM users WHERE email='flow@example.invalid'")).rows[0];
  await database.query("UPDATE users SET plan_tier='pro' WHERE id=$1", [user.id]);
  await request('/auth/logout', {});
  assert.equal((await request('/auth/login', { email: 'flow@example.invalid', password: 'test-password123' })).status, 200);
  assert.equal((await request(`/pages/${page.id}`, { birthdayDate: '2000-01-01', recipientName: 'Test Celebrant', closeDate: '2100-01-01', revealPin: '1234' }, 'PATCH')).status, 200);
  assert.equal((await request(`/public/pages/${page.id}/messages`, { senderName: 'Pro Guest', message: 'Happy birthday' })).status, 201);
  assert.equal((await request(`/public/pages/${page.id}/unlock`, { pin: '9999' })).status, 401);
  const protectedPage = await (await request(`/public/pages/${page.id}`)).json() as { messages: unknown[] };
  assert.equal(protectedPage.messages.length, 0);
  const authCookie = cookie;
  assert.equal((await request(`/public/pages/${page.id}/unlock`, { pin: '1234' })).status, 200);
  cookie = `${authCookie}; ${cookie}`;
  const revealed = await (await request(`/public/pages/${page.id}`)).json() as { messages: unknown[] };
  assert.equal(revealed.messages.length, 7);
  const exportResponse = await request(`/public/pages/${page.id}/export`);
  assert.equal(exportResponse.status, 200, await exportResponse.clone().text());
  assert.equal(Buffer.from(await exportResponse.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  assert.equal((await request('/auth/password-reset/request', { email: 'flow@example.invalid' })).status, 200);
  const resetMail = emails.find((mail) => mail.text.includes('/auth?reset=')); assert.ok(resetMail);
  const resetToken = resetMail.text.match(/reset=([a-f0-9]+)/)![1];
  assert.equal((await request('/auth/password-reset/confirm', { token: resetToken, password: 'changed-password123' })).status, 200);
  assert.equal((await request('/auth/login', { email: 'flow@example.invalid', password: 'test-password123' })).status, 401);
  assert.equal((await request('/auth/login', { email: 'flow@example.invalid', password: 'changed-password123' })).status, 200);
  await database.query("INSERT INTO billing_payments(provider,provider_reference,user_id,email,amount_kobo,status,raw_payload) VALUES ('paystack','flow-paid',$1,'flow@example.invalid',500000,'success','{\"customer\":\"private\"}')", [user.id]);
  assert.equal((await request('/auth/me/data', undefined, 'DELETE')).status, 204);
  assert.equal((await request(`/public/pages/${page.id}`)).status, 404);
  assert.equal((await database.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM users WHERE id=$1', [user.id])).rows[0].count, 0);
  const retained = (await database.query<{ email: string | null; raw_payload: unknown }>("SELECT email,raw_payload FROM billing_payments WHERE provider_reference='flow-paid'")).rows[0];
  assert.equal(retained.email, null);
  assert.equal(retained.raw_payload, null);
  assert.equal((await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM financial_records WHERE provider_reference='flow-paid'")).rows[0].count, 1);
});
