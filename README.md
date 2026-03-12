# WishCanvas

WishCanvas is a Vite + React app with a local Express API backed by Neon Postgres.

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
```

3. Start the client and API together:

```sh
npm run dev
```

The frontend runs on `http://localhost:8080` and proxies `/api` and `/uploads` to the Express server on `http://localhost:3001`.

## Scripts

- `npm run dev` starts the Vite client and the Express API together
- `npm run dev:client` starts only the frontend
- `npm run dev:server` starts only the API
- `npm run lint` runs ESLint
- `npm run typecheck` runs TypeScript checks for client, Vite config, and server
- `npm run build` builds the frontend
