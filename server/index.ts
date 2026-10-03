import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import crypto from "node:crypto";
import * as Sentry from "@sentry/node";
import multer from "multer";

import { initializeDatabase } from "./db";
import { optionalAuth, requireAuth } from "./auth";
import { authRouter } from "./routes/auth";
import { themesRouter, handleThemeIconUpload } from "./routes/themes";
import { billingRouter, handlePaystackWebhook, handleBachsWebhook } from "./routes/billing";
import { paymentsRouter } from "./routes/payments";
import { giftPoolRouter } from "./routes/giftPool";
import { publicPagesRouter } from "./routes/publicPages";
import { pagesRouter, handleCoverUpload, handleSoundtrackUpload } from "./routes/pages";
import { adminRouter, systemRouter, handleHealthCheck } from "./routes/admin";
import { metaRouter } from "./routes/meta";

import {
  getAllowedOrigins,
  isAllowedOrigin,
  getRequestIp,
} from "./services/requestUtils";
import {
  coverUpload,
  pageAudioUpload,
  themeIconUpload,
  uploadsRoot,
  ensureUploadDirs,
} from "./uploads";
import { exposeErrorToClient } from "./errors";
import { securityHeadersMiddleware } from "./securityHeaders";
import { validateBody } from "./validateRequest";
import { uploadPageIdBodySchema } from "./schemas";
import {
  createGlobalApiLimiter,
  paystackWebhookLimiter,
  bachsWebhookLimiter,
  healthEndpointLimiter,
} from "./rateLimits";
import type { AuthedRequest } from "./types";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);

if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
  });
}

const allowedOrigins = getAllowedOrigins();

function shouldLogRequest(request: express.Request, status: number, durationMs: number) {
  if (status >= 500) return true;
  if (durationMs >= 750) return true;
  if (status >= 400 && /^\/api\/(auth|uploads)\b/i.test(request.path)) return true;
  return false;
}

// Uploads static directory with Cloudinary fallback
app.use("/uploads", express.static(uploadsRoot));
app.use("/uploads", (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "lomqtnaz";
  res.redirect(`https://res.cloudinary.com/${cloudName}/image/upload/v1/birthday-app${req.path}`);
});

// Security & CORS middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(securityHeadersMiddleware);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(cookieParser());

// Request tracking and logging
app.use((request, response, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  (request as express.Request & { requestId?: string }).requestId = requestId;
  response.setHeader("x-request-id", requestId);

  response.on("finish", () => {
    const durationMs = Date.now() - start;
    if (!shouldLogRequest(request, response.statusCode, durationMs)) return;

    const authed = request as AuthedRequest;
    const userId = authed.user?.id;

    console.warn(
      JSON.stringify({
        scope: "request",
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        duration_ms: durationMs,
        ip: getRequestIp(request),
        userId,
      }),
    );
  });

  next();
});

// Basic awake and health check endpoints
app.get("/", (_req, res) => {
  res.status(200).send("API is awake!");
});
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});
app.get("/api/health", healthEndpointLimiter, handleHealthCheck);

// Raw webhook endpoints (MUST be mounted before express.json())
app.post(
  "/api/billing/paystack/webhook",
  paystackWebhookLimiter,
  express.raw({ type: "application/json" }),
  handlePaystackWebhook,
);
app.post(
  "/api/billing/bachs/webhook",
  bachsWebhookLimiter,
  express.raw({ type: "application/json" }),
  handleBachsWebhook,
);
app.post(
  "/api/webhooks/bachs",
  bachsWebhookLimiter,
  express.raw({ type: "application/json" }),
  handleBachsWebhook,
);

// Body parser & global API rate limiter
app.use(express.json({ limit: "2mb" }));
app.use("/api", createGlobalApiLimiter());

// Modular API Routers
app.use("/api/auth", authRouter);
app.use("/api/billing", billingRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api", giftPoolRouter);
app.use("/api/public/pages", publicPagesRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/themes", themesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/system", systemRouter);
app.use("/api", metaRouter);

// Upload endpoints
app.post(
  "/api/uploads/cover",
  optionalAuth,
  coverUpload.single("file"),
  validateBody(uploadPageIdBodySchema),
  handleCoverUpload,
);
app.post(
  "/api/uploads/page-soundtrack",
  optionalAuth,
  pageAudioUpload.single("file"),
  validateBody(uploadPageIdBodySchema),
  handleSoundtrackUpload,
);
app.post(
  "/api/uploads/theme-icon",
  requireAuth,
  themeIconUpload.single("file"),
  handleThemeIconUpload,
);

// 404 handler
app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(
  (
    error: Error,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Uploaded file is too large. Please select a file under 15MB."
          : error.message;
      response.status(400).json({ error: message });
      return;
    }

    if (
      error.message === "Only image uploads are supported" ||
      error.message === "Only audio uploads are supported"
    ) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    console.error(error);
    response.status(500).json({
      error: exposeErrorToClient(error, "Internal server error"),
    });
  },
);

// Database initialization & server start
initializeDatabase()
  .then(async () => {
    await ensureUploadDirs();
    app.listen(port, "0.0.0.0", () => {
      console.log(`WishCanvas API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
