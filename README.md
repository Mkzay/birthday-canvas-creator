# WishCanvas

WishCanvas is a Vite + React app with an Express API backed by Neon Postgres.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Express
- Neon Postgres

## Local development

1. Install dependencies:

```sh
npm install
```

2. Configure environment variables in `.env`:

```sh
DATABASE_URL=...
JWT_SECRET=...
API_PORT=3001
CLIENT_URL=http://localhost:8080
VITE_API_ORIGIN=http://localhost:3001
PAYSTACK_SECRET_KEY=...
```

3. Start the client and API together:

```sh
npm run dev
```

The frontend runs on `http://localhost:8080` and proxies `/api` and `/uploads` to the Express server on `http://localhost:3001`.

## Deploying with Vercel + Railway

Use Vercel for the frontend and Railway for the Express API.

### Railway

1. Create a Railway service from this repo.
2. Set the start command to:

```sh
npm run start
```

3. Configure these environment variables in Railway:

```sh
DATABASE_URL=...
JWT_SECRET=...
CLIENT_URLS=https://your-production-domain.com,https://your-vercel-preview.vercel.app
ALLOW_VERCEL_PREVIEWS=true
# Cross-origin SPA (Vercel) + API (Railway): required
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
# Same-site deployments can omit these (defaults: SameSite=Strict, Secure in production)
PAYSTACK_SECRET_KEY=...
UPLOADS_ROOT=/data/uploads
```

Notes:

- Railway provides `PORT` automatically.
- If you use file uploads in production, mount a Railway volume and point `UPLOADS_ROOT` at that mounted path. Without persistent storage, uploaded photos and audio will be lost on redeploy or restart.
- `CLIENT_URLS` accepts a comma-separated list of allowed frontend origins.
- Configure a Paystack webhook to `POST` to `/api/billing/paystack/webhook` on your API domain. Example: `https://your-railway-service.up.railway.app/api/billing/paystack/webhook`.
- Pro is currently a fixed one-time unlock of `N5,000` (500000 kobo).
- Useful billing endpoints:
	- `GET /api/billing/pro-offer`
	- `POST /api/billing/paystack/initialize`
	- `POST /api/billing/paystack/verify`
	- `POST /api/billing/paystack/webhook`

### Birthday email cron with GitHub Actions

This repo includes a scheduled GitHub Actions workflow at `.github/workflows/birthday-notify-cron.yml`.

Set these repository secrets in GitHub:

- `BIRTHDAY_NOTIFY_URL`: your cron endpoint URL, e.g. `https://your-api-domain/api/system/notify-birthdays/cron`
- `CRON_SECRET`: must match the `CRON_SECRET` env var on your API service

The workflow runs daily at `00:05 UTC` and can also be run manually from the Actions tab.

### Vercel

1. Create a Vercel project from this repo.
2. Set this frontend environment variable:

```sh
VITE_API_ORIGIN=https://your-railway-service.up.railway.app
```

3. Keep the existing `vercel.json` rewrite so React Router routes resolve to `index.html`.

### Cross-domain auth

Authentication uses cookies. For Vercel and Railway to work together:

- the frontend must call the Railway API using `VITE_API_ORIGIN`
- the backend must allow the frontend origin in `CLIENT_URLS`
- **Cross-site** browser requests to the API need `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` (Set-Cookie is still on the API host; the browser will send it on credentialed XHR/fetch to that host).
- **Same-site** (e.g. API proxies under one domain) can rely on defaults: `SameSite=Strict` and `Secure` in production.

## Scripts

- `npm run dev` starts the Vite client and the Express API together
- `npm run dev:client` starts only the frontend
- `npm run dev:server` starts only the API
- `npm run start` starts only the API in a deployment environment
- `npm run lint` runs ESLint
- `npm run typecheck` runs TypeScript checks for client, Vite config, and server
- `npm run build` builds the frontend
