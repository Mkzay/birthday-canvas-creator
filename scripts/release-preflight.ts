import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { v2 as cloudinary } from 'cloudinary';

// Read-only checks. Never sends emails, initializes payments, or runs migrations.
const checks: Array<{ name: string; status: string; detail?: unknown }> = [];
const online = process.argv.includes('--services');
for (const name of ['DATABASE_URL', 'JWT_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CRON_SECRET']) {
  checks.push({ name, status: process.env[name] ? 'configured' : 'missing' });
}
checks.push({ name: 'Paystack mode', status: process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live_') ? 'live' : process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'missing' });
checks.push({ name: 'Bachs mode', status: process.env.BACHS_API_KEY?.startsWith('sk_live_') || process.env.BACHS_ENVIRONMENT === 'production' ? 'live' : 'sandbox' });

if (online) {
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
      const rows = await sql`SELECT version FROM _schema_migrations ORDER BY version`;
      const versions = rows.map((row) => Number(row.version));
      checks.push({ name: 'Database connection/schema', status: versions.includes(5) ? 'ready' : 'migration pending', detail: { appliedVersions: versions, requiredVersion: 5 } });
      const conflicts = await sql`SELECT COUNT(*)::int AS count FROM (SELECT page_id FROM pool_payouts WHERE provider = 'paystack' AND status IN ('success','processing') GROUP BY page_id HAVING COUNT(*) > 1) AS conflicting_pages`;
      checks.push({ name: 'Historical payout conflicts', status: Number(conflicts[0].count) ? 'needs reconciliation before migration' : 'none' });
    } catch { checks.push({ name: 'Database connection/schema', status: 'unverified: connection/query failed' }); }
  }
  if (process.env.CLOUDINARY_API_KEY) {
    try {
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, timeout: 15000 });
      await cloudinary.api.ping();
      checks.push({ name: 'Cloudinary account', status: 'connected' });
    } catch { checks.push({ name: 'Cloudinary account', status: 'unverified: ping denied or failed' }); }
  }
  for (const [name, url, key] of [
    ['Resend domain access', 'https://api.resend.com/domains', process.env.RESEND_API_KEY],
    ['Paystack account access', 'https://api.paystack.co/balance', process.env.PAYSTACK_SECRET_KEY],
  ]) {
    if (!key) continue;
    try {
      const response = await fetch(url!, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
      let status = response.ok ? 'connected' : `unverified: HTTP ${response.status}`;
      if (name === 'Resend domain access' && [401, 403].includes(response.status)) {
        status = 'not verified: domains endpoint requires read permission; a sending-only key may still work';
      }
      checks.push({ name: name!, status });
      if (name === 'Resend domain access' && response.ok) {
        const payload = await response.json() as { data?: Array<{ name: string; status: string }> };
        const domain = payload.data?.find((item) => item.name === 'wishcanvas.app');
        checks.push({ name: 'wishcanvas.app sending domain', status: domain?.status || 'not found' });
      }
    } catch { checks.push({ name: name!, status: 'unverified: request failed' }); }
  }
  for (const url of ['https://wishcanvas.app/', 'https://birthday-canvas-creator.onrender.com/api/health']) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      checks.push({ name: url, status: `HTTP ${response.status}` });
    } catch { checks.push({ name: url, status: 'unverified: request failed' }); }
  }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), readOnly: true, checks }, null, 2));
if (checks.some((check) => check.status === 'missing' || check.status.includes('unverified') || check.status === 'migration pending')) process.exitCode = 1;
