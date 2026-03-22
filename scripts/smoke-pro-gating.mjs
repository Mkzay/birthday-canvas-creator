#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3001';

async function check(name, path, init, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const ok = response.status === expectedStatus;
  const symbol = ok ? 'PASS' : 'FAIL';
  console.log(`${symbol} ${name}: expected ${expectedStatus}, got ${response.status}`);

  if (!ok) {
    const body = await response.text();
    console.log(`  Response body: ${body}`);
  }

  return ok;
}

async function run() {
  console.log(`Running pro-gating smoke checks against ${baseUrl}`);

  const checks = await Promise.all([
    check('pro offer endpoint', '/api/billing/pro-offer', { method: 'GET' }, 200),
    check('paystack initialize requires auth', '/api/billing/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callbackPath: '/upgrade' }),
    }, 401),
    check('analytics requires auth', '/api/pages/test/analytics', { method: 'GET' }, 401),
    check('export requires auth', '/api/pages/test/export', { method: 'GET' }, 401),
  ]);

  const failed = checks.filter((result) => !result).length;
  if (failed > 0) {
    console.error(`\n${failed} smoke check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll smoke checks passed.');
}

run().catch((error) => {
  console.error('Smoke checks crashed:', error);
  process.exitCode = 1;
});
