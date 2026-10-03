import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { sql } from "../db";
import { themeIconUpload, fileUrl } from "../uploads";
import { requireAuth } from "../auth";
import { themeCreateBodySchema, themePatchBodySchema, themeIdParamSchema } from "../schemas";
import { validateBody, validateParams } from "../validateRequest";
import type { AuthedRequest, SessionUser } from "../types";
import { rejectInvalidUpload } from "../services/requestUtils";

export const PREMIUM_THEME_FONTS = new Set(["caveat", "sora", "cormorant", "space-grotesk", "dm-serif"]);

export function hasProThemeAccess(user: SessionUser): boolean {
  return user.planTier === "pro";
}

export const themesRouter = express.Router();

themesRouter.get("/", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT id, name, emoji, gradient_from, gradient_to, gradient_mid, gradient_angle, accent_color, font, icon_url, created_at, updated_at
    FROM custom_themes
    WHERE user_id = ${request.user!.id}
    ORDER BY created_at DESC
  `;

  response.json(rows);
});

themesRouter.post("/", requireAuth, validateBody(themeCreateBodySchema), async (request: AuthedRequest, response) => {
  const user = request.user!;
  const isPro = hasProThemeAccess(user);
  const requestedFont = String(request.body.font || "sans");
  const hasGradientMid = typeof request.body.gradientMid === "string" && request.body.gradientMid.trim().length > 0;
  const hasIconUrl = typeof request.body.iconUrl === "string" && request.body.iconUrl.trim().length > 0;

  if (!isPro) {
    const themeCountRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM custom_themes
      WHERE user_id = ${user.id}
    `;

    const count = Number(themeCountRows[0]?.count || 0);
    if (count >= 1) {
      response.status(403).json({
        error: "Free plan allows 1 custom theme. Upgrade to Pro for unlimited custom themes.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }

    if (hasGradientMid) {
      response.status(403).json({
        error: "Midpoint gradients are a Pro feature.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }

    if (PREMIUM_THEME_FONTS.has(requestedFont)) {
      response.status(403).json({
        error: "This font is a Pro feature.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }

    if (hasIconUrl) {
      response.status(403).json({
        error: "Theme icon uploads are a Pro feature.",
        code: "FEATURE_PRO_ONLY",
      });
      return;
    }
  }

  const rows = await sql`
    INSERT INTO custom_themes (user_id, name, emoji, gradient_from, gradient_to, gradient_mid, gradient_angle, accent_color, font, icon_url)
    VALUES (
      ${user.id},
      ${String(request.body.name || "").trim()},
      ${String(request.body.emoji || "🎨")},
      ${String(request.body.gradientFrom || "#f472b6")},
      ${String(request.body.gradientTo || "#8b5cf6")},
      ${request.body.gradientMid || null},
      ${Number(request.body.gradientAngle) || 135},
      ${request.body.accentColor || null},
      ${String(request.body.font || "sans")},
      ${request.body.iconUrl || null}
    )
    RETURNING *
  `;

  response.status(201).json(rows[0]);
});

themesRouter.patch("/:id", requireAuth, validateParams(themeIdParamSchema), validateBody(themePatchBodySchema), async (request: AuthedRequest, response) => {
  const user = request.user!;

  if (!hasProThemeAccess(user)) {
    if (Object.prototype.hasOwnProperty.call(request.body, "gradientMid")) {
      const requestedMid = request.body.gradientMid;
      if (typeof requestedMid === "string" && requestedMid.trim().length > 0) {
        response.status(403).json({
          error: "Midpoint gradients are a Pro feature.",
          code: "FEATURE_PRO_ONLY",
        });
        return;
      }
    }

    if (Object.prototype.hasOwnProperty.call(request.body, "font")) {
      const requestedFont = String(request.body.font || "");
      if (PREMIUM_THEME_FONTS.has(requestedFont)) {
        response.status(403).json({
          error: "This font is a Pro feature.",
          code: "FEATURE_PRO_ONLY",
        });
        return;
      }
    }

    if (Object.prototype.hasOwnProperty.call(request.body, "iconUrl")) {
      const requestedIconUrl = request.body.iconUrl;
      if (typeof requestedIconUrl === "string" && requestedIconUrl.trim().length > 0) {
        response.status(403).json({
          error: "Theme icon uploads are a Pro feature.",
          code: "FEATURE_PRO_ONLY",
        });
        return;
      }
    }
  }

  const rows = await sql`
    UPDATE custom_themes
    SET
      name = ${String(request.body.name || "").trim()},
      emoji = ${String(request.body.emoji || "🎨")},
      gradient_from = ${String(request.body.gradientFrom || "#f472b6")},
      gradient_to = ${String(request.body.gradientTo || "#8b5cf6")},
      gradient_mid = ${request.body.gradientMid || null},
      gradient_angle = ${Number(request.body.gradientAngle) || 135},
      accent_color = ${request.body.accentColor || null},
      font = ${String(request.body.font || "sans")},
      icon_url = ${request.body.iconUrl || null},
      updated_at = NOW()
    WHERE id = ${request.params.id}
      AND user_id = ${user.id}
    RETURNING *
  `;

  if (!rows[0]) {
    response.status(404).json({ error: "Theme not found" });
    return;
  }

  response.json(rows[0]);
});

export const handleThemeIconUpload = async (request: AuthedRequest, response: express.Response) => {
  const file = request.file;

  if (!file) {
    response.status(400).json({ error: "Missing icon upload" });
    return;
  }

  if (!hasProThemeAccess(request.user!)) {
    try {
      if (!file.path.startsWith("http")) {
        await fs.unlink(file.path);
      }
    } catch {
      // Best-effort cleanup for rejected uploads.
    }
    response.status(403).json({
      error: "Theme icon uploads are a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-theme-icon"))) {
    return;
  }

  const url = file.path.startsWith("http")
    ? file.path
    : fileUrl(path.join("theme-icons", file.filename));
  response.json({ url });
};

themesRouter.post("/icon", requireAuth, themeIconUpload.single("file"), handleThemeIconUpload);

themesRouter.delete("/:id", requireAuth, validateParams(themeIdParamSchema), async (request: AuthedRequest, response) => {
  await sql`
    DELETE FROM custom_themes
    WHERE id = ${request.params.id}
      AND user_id = ${request.user!.id}
  `;

  response.status(204).end();
});
