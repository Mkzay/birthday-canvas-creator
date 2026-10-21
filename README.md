# WishCanvas

WishCanvas uses React, Vite, Tailwind CSS 4, Express and Neon Postgres. See [launch readiness](LAUNCH_READINESS.md) and [policy decisions](POLICY_REVIEW.md).

## Development

Use Node 24 LTS (minimum 22.12). Install with `npm ci`, copy .env.example to .env and configure secrets privately, then run `npm run dev`. The client runs on localhost:8080 and proxies the API to localhost:3001.

Starting the API initializes database migrations against DATABASE_URL. Use a separate development database.

## Production

The checked-in vercel.json proxies /api and /uploads to birthday-canvas-creator.onrender.com. Vercel builds with `npm run build`; Render starts with `npm run start`. Install development dependencies during frontend builds.

Prefer the existing same-origin proxy with VITE_API_ORIGIN unset. Cross-site API requests instead require COOKIE_SAME_SITE=none and COOKIE_SECURE=true. Set NODE_ENV=production and configure DATABASE_URL, JWT_SECRET, CLIENT_URL/CLIENT_URLS, Resend/email sender, Cloudinary, payment/webhook secrets and CRON_SECRET on the API host.

Only explicit trusted frontend origins are allowed. Use Cloudinary for durable production media; local uploads need a persistent disk at UPLOADS_ROOT. Ephemeral files disappear on redeploy. Verify playback after restarting.

Pro costs ₦5,000 once per account. Paystack webhook: POST /api/billing/paystack/webhook. Test/sandbox credentials do not accept real payments.

## Scheduled operations

The birthday workflow runs daily at 00:05 UTC. The new retention workflow runs at 00:35 UTC and derives its endpoint from BIRTHDAY_NOTIFY_URL. Both use repository secrets BIRTHDAY_NOTIFY_URL and CRON_SECRET, matching the API secret. Deploy the retention endpoint before enabling that workflow.

Retention removes eligible application records after 30 days and closed-account financial records after seven years, excluding legal holds. Hosting logs/backups depend on provider plans.

## Verification and support

- `npm run check`: tests, lint, TypeScript and build.
- `npm audit`: full dependency advisory check.
- `npm run preflight -- --services`: read-only connectivity/configuration checks; no email or payment initiation.
- `npm run retention:preview`: read-only cleanup counts.
- `npm run retention:apply`: deletes eligible records in configured DATABASE_URL.

Integration tests use isolated PostgreSQL and mocked external providers. They do not send mail, transfer funds or use the configured database.

Pending gift checkouts block payout and account/canvas deletion. Support must reconcile each original reference with Paystack; an uncertain checkout must not be marked failed just to unblock payout. New checkouts reserve their reference before contacting Paystack. Unknown provider outcomes stay pending. Automated refunds are not implemented; handle them through the provider dashboard and retain the reference.
