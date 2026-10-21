# WishCanvas launch readiness — 21 October 2026

Local remediation is ready for final verification and staging acceptance. Public launch still requires deployment, production provider verification and real-device acceptance. Postal address is excluded at the owner's request.

## Implemented

- Private guest claim tokens protect ownership and cover/soundtrack edits. Email recovery requires verification. Credentialed origins use an explicit allowlist.
- Pricing consistently describes the ₦5,000 one-time account upgrade. Policy drafts include the confirmed operator/contact, refunds, deletion, provider disclosures and gift-pool rules.
- Removed the obsolete Cloudinary adapter and upgraded vulnerable runtime/build dependencies. Uploads stream through the supported SDK; Tailwind 4 and Router 7 migrations are included.
- Payments validate provider status, purpose, currency, amount and identity. Duplicate events cannot credit twice; verified provider fees are honored.
- Owner-only payouts prevent duplicate transfers and reconcile uncertain outcomes using the original reference. Pending/OTP does not mean success.
- Database locks/guards protect pending checkouts against payout and account/canvas deletion. References are reserved before provider initialization. Balance updates happen atomically with payment credit. New checkouts close after payout starts.
- Account deletion archives minimum financial records and cleans media. Retention commands, protected cron endpoint and daily workflow are included. Session replay is disabled.
- Audio cancellation discards recordings, failures release microphone tracks, actual recorder MIME determines the extension, and the upload limit matches the server's 8MB limit.
- Removed unverified usage counts and labeled illustrative stories as samples.

## Evidence and limits

Isolated PostgreSQL/Express tests cover claiming, verification, login/reset, contributor limits, Pro, reveal/PIN privacy, PDF export, deletion, payment validation, payout races and retention. External provider calls are mocked.

Read-only probes found Neon and Cloudinary reachable, Paystack test access connected and public frontend/API health HTTP 200. Local modes are Paystack test and Bachs sandbox; production live settings remain unverified.

One authorized Resend test email to hello@wishcanvas.app was accepted with HTTP 200. Inbox delivery is still unconfirmed. A sending-only key cannot list domains; its GET /domains denial is not evidence that sending is broken.

Existing birthday-cron repository secret names are configured, and the latest three GitHub runs succeeded (19–21 October). Local CRON_SECRET absence does not establish a production cron failure. The new retention workflow is not deployed.

The local API automatically initializes migrations against its configured database. Migrations 3–5 add financial constraints, the archive and lifecycle guards. These changes are not merely test-only changes. Preserve financial data during rollback.

## Remaining release acceptance

1. Deploy the reviewed frontend/API and retention workflow. Verify Node version, trusted origins, secure cookies, durable uploads, live payment credentials and signed webhooks. Production deployment is now authorized for owner testing; completion requires observing both hosting deployments.
2. Confirm test-email arrival; verify signup/reset links and birthday notifications through the deployed staging UI.
3. Test sandbox checkout, cancellation/failure, signed webhooks and payout reconciliation through the actual UI. No real-money transactions were performed.
4. Test recording/playback on real iPhone Safari and Android Chrome, including denied microphone permission, interruption and retry. Verify media after restart.
5. Verify provider backup/log retention, restoration, Sentry error delivery, production monitoring, and keyboard/focus/screen-reader behavior.
6. Prepare support for refund/deletion and pending-checkout reconciliation. Abandoned checkouts and uncertain provider initialization outcomes remain pending and can block payout/deletion indefinitely until resolved. Current admin reconciliation promotes successful payments; closing never-created or definitively failed checkouts requires a verified support procedure. Never mark a payment failed just to unblock payout. Unexpected late payments need manual review; no automated refund tool was added.
7. Publish approved policies with an effective date after deployment verification. Keep sample stories clearly labeled; publish real testimonials or usage counts only with evidence.

## Rollout

Start with an invited beta after acceptance passes. Keep prior deployment IDs and a verified backup. If errors occur, pause invitations, restore compatible frontend/API deployments and check health, sign-in, creation, contribution and playback. Preserve additive schema and financial records. Monitor submission/upload failures, payment discrepancies, authentication errors and API latency.

## Verification results

- 121 tests passed, zero failures. Tests use isolated PostgreSQL and mocked external providers.
- ESLint: zero errors; four pre-existing warnings remain.
- All client, tooling and server TypeScript checks passed.
- Production build passed; the largest JavaScript chunk is approximately 477 kB uncompressed. The complete npm run check finished successfully.
- Full npm audit: zero advisories across runtime and development dependencies.
- Browser: landing-page copy, guest creator navigation, privacy/terms navigation and policy text verified at a narrow viewport. This is not a physical-phone or comprehensive accessibility test.
- Final independent financial review found no further definite money-loss blocker in the revised lifecycle guards. Manual reconciliation and external provider acceptance remain release limitations.
- Read-only preflight confirmed configured database migrations 1–5, no historical duplicate active payouts, Cloudinary/Paystack connectivity and HTTP 200 public health. Its overall exit code remains 1 because local CRON_SECRET is absent; read access for the Resend domain-list endpoint is unavailable with the sending-only key. Existing production birthday-cron runs succeeded.

## Production test release

The owner confirmed the configured database is production and requested deployment to production for their own testing on 21 October 2026. Git deployment uses main. Prior deployment commit: 6ddd54dcfd40fcd0fe07ee71fc713b6317724f5f. Runtime is bounded to supported Node versions and .node-version selects Node 24. The API health response includes the host's release commit for deployment verification. Roll back application code if necessary; preserve applied financial schema and records.
