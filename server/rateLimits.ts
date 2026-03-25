import rateLimit from "express-rate-limit";

const window15m = 15 * 60 * 1000;
const strictAuthMax = Number(process.env.AUTH_STRICT_RATE_LIMIT_MAX || 10);

const jsonMessage = { error: "Too many requests. Please try again shortly." };

/** Cheap health checks — still bounded to avoid abuse. */
export const healthEndpointLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

/** Applies to all /api routes except /api/health (cheap monitoring). */
export function createGlobalApiLimiter() {
  return rateLimit({
    windowMs: window15m,
    max: Number(process.env.API_GLOBAL_RATE_LIMIT_MAX || 400),
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage,
    skip: (req) => req.path === "/health",
  });
}

export const authSignupLimiter = rateLimit({
  windowMs: window15m,
  max: strictAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const authLoginLimiter = rateLimit({
  windowMs: window15m,
  max: strictAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

/** Session polling from the SPA — generous but bounded. */
export const authSessionLimiter = rateLimit({
  windowMs: window15m,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const authLogoutLimiter = rateLimit({
  windowMs: window15m,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const authVerifySendLimiter = rateLimit({
  windowMs: window15m,
  max: strictAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const authVerifyConfirmLimiter = rateLimit({
  windowMs: window15m,
  max: strictAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const authPasswordResetRequestLimiter = rateLimit({
  windowMs: window15m,
  max: strictAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const authPasswordResetConfirmLimiter = rateLimit({
  windowMs: window15m,
  max: strictAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const paystackWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.PAYSTACK_WEBHOOK_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests. Please retry shortly." },
});

export const authNotificationsLimiter = rateLimit({
  windowMs: window15m,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const systemTestEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const systemBirthdayNotifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const systemBirthdayCronLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const publicPhotoUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 18,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const publicAudioUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const publicMessageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 24,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const publicPoolContributionInitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const publicPoolPayoutRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const poolPayoutReleaseLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});
