# Ops runbook (WishCanvas)

## Health checks

- **Liveness + readiness**: `GET /api/health`
  - Returns `200` when DB + uploads storage are OK.
  - Returns `503` when any readiness check fails.
- **Admin system status**: `GET /api/system/status`
  - Requires a valid session + allowlisted admin email (`ADMIN_EMAILS`).
  - Returns the same payload as `/api/health` plus `meta`.

## Required / common environment variables

### API (Railway / server)

- **`JWT_SECRET`**: required for sessions.
- **`DATABASE_URL`**: Neon connection string.
- **`CLIENT_URLS`**: comma-separated allowed origins for CORS (e.g. `https://wish-canvas.vercel.app,http://localhost:5173`).
- **`ALLOW_VERCEL_PREVIEWS`**: set `true` if you want `*.vercel.app` preview origins allowed.
- **`TRUST_PROXY`**: set `true` if the API sits behind a reverse proxy and you need accurate client IPs for rate limiting (otherwise rely on production default `trust proxy`).
- **`API_GLOBAL_RATE_LIMIT_MAX`**: optional override for the default per-IP cap on `/api/*` (see `server/rateLimits.ts`).
- **Cookie/session**
  - **`COOKIE_DOMAIN`**
  - **`COOKIE_SAME_SITE`**: default **`strict`**. Set `none` (+ `COOKIE_SECURE=true`) when the SPA and API are on different sites (e.g. Vercel + Railway). Use `lax` if you need a middle ground.
  - **`COOKIE_SECURE`**: defaults `true` in production; required `true` when `sameSite=none`.
- **Admin status tile / endpoint**
  - **`ADMIN_EMAILS`**: comma-separated allowlist (lower/upper case doesn’t matter).
- **Sentry (server)**
  - **`SENTRY_DSN`**: enables server error reporting when set.

### Frontend (Vercel / client)

- **`VITE_API_ORIGIN`**: optional; if unset, dev uses `http://localhost:3001` and prod uses same-origin.
- **Sentry (client)**
  - **`VITE_SENTRY_DSN`**: enables client error reporting when set.

## Common incidents

### Birthday notification automation (GitHub Actions)

Two workflows drive birthday email automation:

- `.github/workflows/birthday-notify-cron.yml`
  - Daily run at `00:05 UTC`
  - Also supports manual runs with optional `date` (`YYYY-MM-DD`)
- `.github/workflows/birthday-notify-backfill-monthly.yml`
  - Monthly run on day 1 at `00:30 UTC`
  - Replays the previous `35` days by default

Required GitHub repository secrets:

- `BIRTHDAY_NOTIFY_URL` → API endpoint, e.g. `https://<api-domain>/api/system/notify-birthdays/cron`
- `CRON_SECRET` → must match API env var `CRON_SECRET`

Optional (failure alert email via Resend):

- `RESEND_API_KEY`
- `ALERT_EMAIL_FROM`
- `ALERT_EMAIL_TO`

If the alert-email secrets are missing, workflows still run but skip alert email delivery on failures.

### iOS “Unauthorized” on reload

Likely cookie domain / sameSite / secure mismatch.

- **Cross-origin API** (SPA on Vercel, API on Railway): set `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, and correct `COOKIE_DOMAIN` if sharing a parent domain.
- **First-party** (same site): defaults use `Strict`; prefer proxying `/api/*` through the frontend origin when possible.

### Images/audio not loading (uploads 404)

- Confirm the asset URLs exist on the API host: `/uploads/...`
- If the frontend is on a different origin, either:
  - Proxy `/uploads/*` through the frontend domain, or
  - Ensure `resolveAssetUrl()` prefixes the correct API origin.

### CSP / blocked API or Sentry requests (production SPA)

Vercel sets a `Content-Security-Policy` on static responses. If you point `VITE_API_ORIGIN` at a **new API host**, add that origin to `connect-src` in `vercel.json` (or relax policy deliberately). Sentry ingest hosts are already allowlisted by pattern where possible.

### CORS errors in dev

- Add your dev origin to `CLIENT_URLS` (e.g. `http://localhost:5173`).
- If cookies are involved across origins, ensure `credentials: true` clients + correct cookie settings.

## Rollback / recovery

- **Frontend**: redeploy previous Vercel deployment.
- **API**: redeploy previous Railway release.
- **DB**: use Neon branching/restore (create a branch from a safe point-in-time if needed).

