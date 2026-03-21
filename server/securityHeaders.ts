import type { NextFunction, Request, Response } from "express";

/**
 * API responses: no scripts expected; block framing and tighten defaults.
 * HTML routes (e.g. OG redirect) have no inline script — meta refresh still works.
 */
const API_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function securityHeadersMiddleware(request: Request, response: Response, next: NextFunction) {
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", API_CONTENT_SECURITY_POLICY);
  if (process.env.NODE_ENV === "production") {
    response.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
}
