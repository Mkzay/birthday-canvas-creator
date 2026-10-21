import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { sql } from "../db";
import { requireAuth, optionalAuth, hashPassword, verifyPassword } from "../auth";
import type { AuthedRequest, SessionUser } from "../types";
import { validateParams, validateBody } from "../validateRequest";
import {
  pageIdParamSchema,
  pageCreateBodySchema,
  pagePatchBodySchema,
  pageMessageParamsSchema,
  pagePhotoParamsSchema,
  uploadPageIdBodySchema,
} from "../schemas";
import {
  resolvePageId,
  privatePageQuery,
  fetchMessagesForPage,
  serializePageDates,
  createUniquePublicCode,
  fetchCollaboratorsForPage,
  fetchActiveCollaboratorInvite,
  createCollaboratorInvite,
  revokeCollaboratorInvite,
  removeCollaborator,
  fetchCollaboratorInviteByHash,
  addCollaboratorToPage,
} from "../services/pageQueries";
import {
  routeParamString,
  sanitizeDisplayName,
  sanitizeEmail,
  sanitizePublicCode,
  sanitizeAmountKobo,
  sanitizeBankCode,
  sanitizeAccountNumber,
  rejectInvalidUpload,
  logRequestFailure,
  hasProThemeAccess,
  getClientOriginForRequest,
} from "../services/requestUtils";
import { fileUrl, removeFileByUrl, normalizeCoverUpload } from "../uploads";
import { buildBrandedPagePdf } from "../services/pdfService";
import { EXPORTS_DISABLED_IN_PRODUCTION } from "../services/publicPageService";
import { sendGuestCanvasCreatedEmail } from "../emailFlows";

export const pagesRouter = express.Router();

const handleGetDashboardPages: express.RequestHandler = async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT
      bp.*,
      (bp.user_id = ${request.user!.id}) AS is_owner,
      CASE WHEN bp.user_id = ${request.user!.id} THEN 'owner' ELSE 'co_organizer' END AS user_role,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    WHERE (
      bp.user_id = ${request.user!.id}
      OR EXISTS (
        SELECT 1
        FROM page_collaborators pc
        WHERE pc.page_id = bp.id
          AND pc.user_id = ${request.user!.id}
      )
    )
      AND bp.owner_deleted IS NOT TRUE
    GROUP BY bp.id
    ORDER BY bp.created_at DESC
  `;

  response.json(rows.map((row) => serializePageDates(row)));
};

pagesRouter.get("/", requireAuth, handleGetDashboardPages);
pagesRouter.get("/dashboard", requireAuth, handleGetDashboardPages);

pagesRouter.get("/saved", requireAuth, async (request: AuthedRequest, response) => {
  const rows = await sql`
    SELECT
      bp.*,
      COUNT(bm.id)::int AS message_count,
      MAX(s.created_at) AS saved_at
    FROM birthday_page_saves s
    JOIN birthday_pages bp ON bp.id = s.page_id
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    WHERE s.user_id = ${request.user!.id}
    GROUP BY bp.id
    ORDER BY saved_at DESC
  `;

  response.json(rows.map((row) => serializePageDates(row)));
});

pagesRouter.post("/", optionalAuth, validateBody(pageCreateBodySchema), async (request: AuthedRequest, response) => {
  const isGuest = !request.user;
  const guestEmail = isGuest ? sanitizeEmail(request.body.guestEmail) : null;

  if (isGuest && !guestEmail) {
    response.status(400).json({ error: "Please enter your email so we can send your canvas links." });
    return;
  }

  if (isGuest && request.body.poolFundraisingEnabled) {
    response.status(403).json({
      error: "Cash gift pools require a registered creator account.",
      code: "FEATURE_ACCOUNT_REQUIRED",
    });
    return;
  }

  const nextPublicCode = sanitizePublicCode(request.body.publicCode);
  const revealPin = typeof request.body.revealPin === "string" ? request.body.revealPin.trim() : null;
  const requestedDisplayMode = String(request.body.displayMode || "story");

  if (request.body.revealAt && (!request.user || !hasProThemeAccess(request.user))) {
    response.status(403).json({
      error: "Scheduled reveal is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (typeof request.body.publicCode === "string" && (!request.user || !hasProThemeAccess(request.user))) {
    response.status(403).json({
      error: "Custom public links are a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (revealPin && (!request.user || !hasProThemeAccess(request.user))) {
    response.status(403).json({
      error: "Secret reveal PIN is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (requestedDisplayMode !== "story" && (!request.user || !hasProThemeAccess(request.user))) {
    response.status(403).json({
      error: "Freeform and Bento page views are Pro features.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (typeof request.body.publicCode === "string" && !nextPublicCode) {
    response.status(400).json({ error: "Public code must be 6-40 chars and use lowercase letters, numbers, and hyphens." });
    return;
  }

  const publicCode = nextPublicCode || await createUniquePublicCode();
  const revealPinHash = revealPin ? await hashPassword(revealPin) : null;
  const recipientEmail = sanitizeEmail(request.body.recipientEmail);

  let claimToken: string | null = null;
  let claimTokenHash: string | null = null;
  if (isGuest) {
    claimToken = crypto.randomBytes(24).toString("hex");
    claimTokenHash = await hashPassword(claimToken);
  }

  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await sql`
      INSERT INTO birthday_pages (
        user_id,
        guest_email,
        claim_token_hash,
        public_code,
        recipient_name,
        recipient_email,
        birthday_date,
        theme,
        letter_theme,
        display_mode,
        letter_color,
        creator_message,
        soundtrack_id,
        allow_photos,
        allow_audio,
        require_names,
        close_date,
        reveal_at,
        reveal_pin_hash,
        pool_fundraising_enabled,
        pool_goal_kobo,
        pool_description,
        recipient_bank_code,
        recipient_account_number,
        recipient_account_name,
        status,
        custom_audio_url
      )
      VALUES (
        ${request.user ? request.user.id : null},
        ${guestEmail},
        ${claimTokenHash},
        ${publicCode},
        ${String(request.body.recipientName || "").trim()},
        ${recipientEmail},
        ${String(request.body.birthdayDate)},
        ${String(request.body.theme || "elegant")},
        ${String(request.body.letterTheme || request.body.theme || "elegant")},
        ${requestedDisplayMode},
        ${request.body.letterColor ?? null},
        ${sanitizeDisplayName(request.body.creatorMessage)},
        ${String(request.body.soundtrackId || "golden-hour")},
        ${Boolean(request.body.allowPhotos ?? true)},
        ${Boolean(request.body.allowAudio ?? true)},
        ${Boolean(request.body.requireNames ?? true)},
        ${String(request.body.closeDate || request.body.birthdayDate)},
        ${request.body.revealAt || null},
        ${revealPinHash},
        ${Boolean(request.body.poolFundraisingEnabled ?? false)},
        ${sanitizeAmountKobo(request.body.poolGoalKobo)},
        ${sanitizeDisplayName(request.body.poolDescription)},
        ${sanitizeBankCode(request.body.recipientBankCode)},
        ${sanitizeAccountNumber(request.body.recipientAccountNumber)},
        ${sanitizeDisplayName(request.body.recipientAccountName)},
        'active',
        ${request.body.pageCustomAudioUrl || null}
      )
      RETURNING *
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "page-create-failed";
    if (message.includes("idx_birthday_pages_public_code_unique") || message.includes("birthday_pages_public_code_key")) {
      response.status(409).json({ error: "That public link is already taken." });
      return;
    }
    throw error;
  }

  const createdPage = rows[0];

  if (isGuest && guestEmail && claimToken) {
    void sendGuestCanvasCreatedEmail({
      to: guestEmail,
      recipientName: String(request.body.recipientName || "the celebrant"),
      publicCode,
      claimToken,
    }).catch((err) => {
      console.error("Failed to send guest canvas email:", err);
    });
  }

  response.status(201).json({
    ...createdPage,
    claim_token: claimToken,
    is_guest: isGuest,
  });
});

pagesRouter.post("/claim", optionalAuth, async (request: AuthedRequest, response) => {
  const publicCode = String(request.body.publicCode || "").trim();
  const claimToken = String(request.body.claimToken || "").trim();

  if (!publicCode || !claimToken) {
    response.status(400).json({ error: "Missing public code or claim token." });
    return;
  }

  const rows = await sql`
    SELECT id, guest_email, claim_token_hash, user_id, recipient_name
    FROM birthday_pages
    WHERE public_code = ${publicCode}
    LIMIT 1
  `;

  const page = rows[0];
  if (!page) {
    response.status(404).json({ error: "Canvas not found." });
    return;
  }

  if (page.user_id) {
    response.status(400).json({ error: "This canvas has already been claimed." });
    return;
  }

  if (!page.claim_token_hash) {
    response.status(400).json({ error: "Invalid claim state for this canvas." });
    return;
  }

  const validToken = await verifyPassword(claimToken, String(page.claim_token_hash));
  if (!validToken) {
    response.status(403).json({ error: "Invalid or expired claim token." });
    return;
  }

  if (request.user) {
    await sql`
      UPDATE birthday_pages
      SET user_id = ${request.user.id},
          guest_email = NULL,
          claim_token_hash = NULL,
          updated_at = NOW()
      WHERE id = ${page.id}
    `;

    response.json({
      success: true,
      message: "Canvas claimed successfully! It is now in your atelier.",
      pageId: page.id,
    });
    return;
  }

  response.json({
    valid: true,
    email: page.guest_email,
    recipientName: page.recipient_name,
  });
});

pagesRouter.get("/:id", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const rows = await privatePageQuery(String(request.params.id), request.user!.id);

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(serializePageDates(rows[0]));
});

pagesRouter.get("/:id/messages", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messages = await fetchMessagesForPage(String(pageRows[0].id));
  response.json(messages);
});

pagesRouter.get("/:id/ownership", optionalAuth, validateParams(pageIdParamSchema), async (request: express.Request & { user?: SessionUser }, response) => {
  const rows = await sql`
    SELECT id, public_code, user_id, guest_email, recipient_name
    FROM birthday_pages
    WHERE (id::text = ${request.params.id} OR public_code = ${request.params.id})
    LIMIT 1
  `;

  if (!rows[0]) {
    return response.json({ isOwner: false, publicCode: null, isGuest: false, recipientName: null, pageId: null });
  }

  const page = rows[0];
  const isOwner = Boolean(request.user && page.user_id && page.user_id === request.user.id);
  const isGuest = !page.user_id && Boolean(page.guest_email);

  response.json({
    isOwner: isOwner || isGuest,
    publicCode: page.public_code ? String(page.public_code) : null,
    recipientName: page.recipient_name ? String(page.recipient_name) : null,
    pageId: String(page.id),
    isGuest,
  });
});

pagesRouter.get("/:id/save-status", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await sql`
    SELECT 1
    FROM birthday_page_saves
    WHERE user_id = ${request.user!.id}
      AND page_id = ${resolvedPageId}
    LIMIT 1
  `;

  response.json({ isSaved: Boolean(rows[0]) });
});

pagesRouter.post("/:id/save", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await sql`
    INSERT INTO birthday_page_saves (user_id, page_id)
    VALUES (${request.user!.id}, ${resolvedPageId})
    ON CONFLICT (user_id, page_id) DO NOTHING
  `;

  response.status(204).end();
});

pagesRouter.delete("/:id/save", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await sql`
    DELETE FROM birthday_page_saves
    WHERE user_id = ${request.user!.id}
      AND page_id = ${resolvedPageId}
  `;

  response.status(204).end();
});

pagesRouter.delete("/:id/messages/:messageId", requireAuth, validateParams(pageMessageParamsSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messageRows = await sql`
    SELECT photo_url, audio_url
    FROM birthday_messages
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  if (!messageRows[0]) {
    response.status(404).json({ error: "Message not found" });
    return;
  }

  const messagePhotos = await sql`
    SELECT photo_url
    FROM birthday_message_photos
    WHERE message_id = ${request.params.messageId}
  `;

  await removeFileByUrl(messageRows[0].photo_url);
  await removeFileByUrl(messageRows[0].audio_url);
  await Promise.all(messagePhotos.map((photo) => removeFileByUrl(photo.photo_url)));

  await sql`
    DELETE FROM birthday_messages
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  response.status(204).end();
});

pagesRouter.delete("/:id/messages/:messageId/audio", requireAuth, validateParams(pageMessageParamsSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const messageRows = await sql`
    SELECT audio_url
    FROM birthday_messages
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  if (!messageRows[0] || !messageRows[0].audio_url) {
    response.status(404).json({ error: "Audio not found" });
    return;
  }

  await removeFileByUrl(messageRows[0].audio_url);

  await sql`
    UPDATE birthday_messages
    SET audio_url = NULL
    WHERE id = ${request.params.messageId}
      AND page_id = ${pageRows[0].id}
  `;

  response.status(204).end();
});

pagesRouter.delete("/:id/messages/photos/:photoId", requireAuth, validateParams(pagePhotoParamsSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const photoRows = await sql`
    SELECT bmp.photo_url
    FROM birthday_message_photos bmp
    INNER JOIN birthday_messages bm ON bm.id = bmp.message_id
    WHERE bmp.id = ${request.params.photoId}
      AND bm.page_id = ${pageRows[0].id}
  `;

  if (!photoRows[0]) {
    const legacyPhotoRows = await sql`
      SELECT photo_url
      FROM birthday_messages
      WHERE id::text = ${request.params.photoId}
        AND page_id = ${pageRows[0].id}
    `;

    if (legacyPhotoRows[0] && legacyPhotoRows[0].photo_url) {
      await removeFileByUrl(legacyPhotoRows[0].photo_url);
      await sql`
        UPDATE birthday_messages
        SET photo_url = NULL
        WHERE id::text = ${request.params.photoId}
          AND page_id = ${pageRows[0].id}
      `;
      response.status(204).end();
      return;
    }

    response.status(404).json({ error: "Photo not found" });
    return;
  }

  await removeFileByUrl(photoRows[0].photo_url);

  await sql`
    DELETE FROM birthday_message_photos
    WHERE id = ${request.params.photoId}
  `;

  response.status(204).end();
});

pagesRouter.patch("/:id", requireAuth, validateParams(pageIdParamSchema), validateBody(pagePatchBodySchema), async (request: AuthedRequest, response) => {
  const hasCoverPhotoUrl = Object.prototype.hasOwnProperty.call(request.body, "coverPhotoUrl");
  const hasCustomAudioUrl = Object.prototype.hasOwnProperty.call(request.body, "pageCustomAudioUrl");
  const hasPublicCode = Object.prototype.hasOwnProperty.call(request.body, "publicCode");
  const hasRevealAt = Object.prototype.hasOwnProperty.call(request.body, "revealAt");
  const hasRevealPin = Object.prototype.hasOwnProperty.call(request.body, "revealPin");
  const revealPin = typeof request.body.revealPin === "string" ? request.body.revealPin.trim() : null;
  const requestedDisplayMode = String(request.body.displayMode || "story");
  const nextPublicCode = request.body.publicCode === null ? null : sanitizePublicCode(request.body.publicCode);

  if (hasRevealAt && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Scheduled reveal is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (hasPublicCode && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Custom public links are a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (hasRevealPin && revealPin && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Secret reveal PIN is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (requestedDisplayMode !== "story" && !hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Freeform and Bento page views are Pro features.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  if (hasPublicCode && request.body.publicCode === null) {
    response.status(400).json({ error: "Public code cannot be empty." });
    return;
  }

  if (hasPublicCode && request.body.publicCode !== null && !nextPublicCode) {
    response.status(400).json({ error: "Public code must be 6-40 chars and use lowercase letters, numbers, and hyphens." });
    return;
  }

  const revealPinHash = hasRevealPin
    ? (revealPin ? await hashPassword(revealPin) : null)
    : null;

  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const isOwner = Boolean(pageRows[0].is_owner);
  const targetPageId = pageRows[0].id;

  const attemptsToModifyBank =
    request.body.recipientBankCode !== undefined ||
    request.body.recipientAccountNumber !== undefined ||
    request.body.recipientAccountName !== undefined;

  if (!isOwner && attemptsToModifyBank) {
    response.status(403).json({
      error: "Only the primary canvas creator can update payout bank details.",
      code: "ONLY_OWNER_CAN_MODIFY_BANK_DETAILS",
    });
    return;
  }

  if (hasCustomAudioUrl) {
    const nextAudioUrl = request.body.pageCustomAudioUrl || null;
    if (pageRows[0].custom_audio_url && pageRows[0].custom_audio_url !== nextAudioUrl) {
      await removeFileByUrl(pageRows[0].custom_audio_url);
    }
  }

  let rows: Array<Record<string, unknown>> = [];

  try {
    rows = hasCoverPhotoUrl || hasCustomAudioUrl
      ? await sql`
          UPDATE birthday_pages
          SET
            recipient_name = ${String(request.body.recipientName || "").trim()},
            recipient_email = ${sanitizeEmail(request.body.recipientEmail)},
            birthday_date = ${String(request.body.birthdayDate)},
            theme = ${String(request.body.theme || "elegant")},
            letter_theme = ${String(request.body.letterTheme || request.body.theme || "elegant")},
            display_mode = ${requestedDisplayMode},
            creator_message = ${sanitizeDisplayName(request.body.creatorMessage)},
            soundtrack_id = ${String(request.body.soundtrackId || "golden-hour")},
            allow_photos = ${Boolean(request.body.allowPhotos ?? true)},
            allow_audio = ${Boolean(request.body.allowAudio ?? true)},
            require_names = ${Boolean(request.body.requireNames ?? true)},
            close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
            reveal_at = CASE WHEN ${hasRevealAt} THEN ${request.body.revealAt || null} ELSE reveal_at END,
            reveal_pin_hash = CASE WHEN ${hasRevealPin} THEN ${revealPinHash} ELSE reveal_pin_hash END,
            public_code = CASE WHEN ${hasPublicCode} THEN ${nextPublicCode} ELSE public_code END,
            cover_photo_url = ${request.body.coverPhotoUrl || null},
            custom_audio_url = ${request.body.pageCustomAudioUrl || null},
            letter_color = ${request.body.letterColor ?? null},
            pool_fundraising_enabled = ${Boolean(request.body.poolFundraisingEnabled ?? false)},
            pool_goal_kobo = ${sanitizeAmountKobo(request.body.poolGoalKobo)},
            pool_description = ${sanitizeDisplayName(request.body.poolDescription)},
            recipient_bank_code = CASE WHEN ${isOwner} THEN ${sanitizeBankCode(request.body.recipientBankCode)} ELSE recipient_bank_code END,
            recipient_account_number = CASE WHEN ${isOwner} THEN ${sanitizeAccountNumber(request.body.recipientAccountNumber)} ELSE recipient_account_number END,
            recipient_account_name = CASE WHEN ${isOwner} THEN ${sanitizeDisplayName(request.body.recipientAccountName)} ELSE recipient_account_name END,
            updated_at = NOW()
          WHERE id = ${targetPageId}
          RETURNING *
        `
      : await sql`
          UPDATE birthday_pages
          SET
            recipient_name = ${String(request.body.recipientName || "").trim()},
            recipient_email = ${sanitizeEmail(request.body.recipientEmail)},
            birthday_date = ${String(request.body.birthdayDate)},
            theme = ${String(request.body.theme || "elegant")},
            letter_theme = ${String(request.body.letterTheme || request.body.theme || "elegant")},
            display_mode = ${requestedDisplayMode},
            creator_message = ${sanitizeDisplayName(request.body.creatorMessage)},
            soundtrack_id = ${String(request.body.soundtrackId || "golden-hour")},
            allow_photos = ${Boolean(request.body.allowPhotos ?? true)},
            allow_audio = ${Boolean(request.body.allowAudio ?? true)},
            require_names = ${Boolean(request.body.requireNames ?? true)},
            close_date = ${String(request.body.closeDate || request.body.birthdayDate)},
            reveal_at = CASE WHEN ${hasRevealAt} THEN ${request.body.revealAt || null} ELSE reveal_at END,
            reveal_pin_hash = CASE WHEN ${hasRevealPin} THEN ${revealPinHash} ELSE reveal_pin_hash END,
            public_code = CASE WHEN ${hasPublicCode} THEN ${nextPublicCode} ELSE public_code END,
            letter_color = ${request.body.letterColor ?? null},
            pool_fundraising_enabled = ${Boolean(request.body.poolFundraisingEnabled ?? false)},
            pool_goal_kobo = ${sanitizeAmountKobo(request.body.poolGoalKobo)},
            pool_description = ${sanitizeDisplayName(request.body.poolDescription)},
            recipient_bank_code = CASE WHEN ${isOwner} THEN ${sanitizeBankCode(request.body.recipientBankCode)} ELSE recipient_bank_code END,
            recipient_account_number = CASE WHEN ${isOwner} THEN ${sanitizeAccountNumber(request.body.recipientAccountNumber)} ELSE recipient_account_number END,
            recipient_account_name = CASE WHEN ${isOwner} THEN ${sanitizeDisplayName(request.body.recipientAccountName)} ELSE recipient_account_name END,
            updated_at = NOW()
          WHERE id = ${targetPageId}
          RETURNING *
        `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "page-update-failed";
    if (message.includes("idx_birthday_pages_public_code_unique") || message.includes("birthday_pages_public_code_key")) {
      response.status(409).json({ error: "That public link is already taken." });
      return;
    }
    throw error;
  }

  if (!rows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(rows[0]);
});

pagesRouter.get("/:id/analytics", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  if (!hasProThemeAccess(request.user!)) {
    response.status(403).json({ error: "Page analytics are a Pro feature.", code: "FEATURE_PRO_ONLY" });
    return;
  }

  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageId = String(pageRows[0].id);
  const metricsRows = await sql`
    SELECT
      bp.view_count::int AS view_count,
      COUNT(DISTINCT bm.id)::int AS message_count,
      COUNT(DISTINCT NULLIF(TRIM(bm.sender_name), ''))::int AS contributor_count,
      COUNT(DISTINCT CASE WHEN bm.photo_url IS NOT NULL OR bmp.id IS NOT NULL THEN bm.id END)::int AS photo_message_count,
      COUNT(DISTINCT CASE WHEN bm.audio_url IS NOT NULL THEN bm.id END)::int AS audio_message_count,
      MAX(bm.created_at) AS last_contribution_at
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    LEFT JOIN birthday_message_photos bmp ON bmp.message_id = bm.id
    WHERE bp.id = ${pageId}
    GROUP BY bp.id
  `;

  response.json(metricsRows[0] || {
    view_count: 0,
    message_count: 0,
    contributor_count: 0,
    photo_message_count: 0,
    audio_message_count: 0,
    last_contribution_at: null,
  });
});

pagesRouter.get("/:id/export", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  if (!hasProThemeAccess(request.user!)) {
    response.status(403).json({ error: "Page export is a Pro feature.", code: "FEATURE_PRO_ONLY" });
    return;
  }

  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const page = serializePageDates(pageRows[0]);
  const messages = await fetchMessagesForPage(String(pageRows[0].id));
  const slug = String(page.recipient_name || "birthday-page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "birthday-page";

  const requestedFormat = typeof request.query.format === "string" ? request.query.format.toLowerCase() : "pdf";
  const siteUrl = getClientOriginForRequest(request);

  if (requestedFormat === "slides") {
    const pdfBytes = await buildBrandedPagePdf(pageRows[0], messages, {
      orientation: "landscape",
      siteUrl,
    });
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${slug}-story-presentation-deck.pdf"`);
    response.send(Buffer.from(pdfBytes));
    return;
  }

  const pdfBytes = await buildBrandedPagePdf(pageRows[0], messages, {
    orientation: "portrait",
    siteUrl,
  });
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${slug}-editorial-keepsake-book.pdf"`);
  response.send(Buffer.from(pdfBytes));
});

pagesRouter.delete("/:id", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);

  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!pageRows[0].is_owner) {
    response.status(403).json({
      error: "Only the primary canvas creator can delete this celebration.",
      code: "ONLY_OWNER_CAN_DELETE",
    });
    return;
  }

  const resolvedPageId = pageRows[0].id;

  const unsettled = await sql`SELECT gift_pool_unsettled(${String(resolvedPageId)}::uuid) AS unsettled`;
  if (unsettled[0]?.unsettled) {
    response.status(409).json({ error: 'Settle pending gift payments before deleting this canvas. Contact hello@wishcanvas.app.', code: 'UNSETTLED_GIFT_POOL' });
    return;
  }

  try {
  await sql`
    UPDATE birthday_pages
    SET owner_deleted = TRUE, updated_at = NOW()
    WHERE id = ${resolvedPageId}
      AND user_id = ${request.user!.id}
  `;
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNSETTLED_GIFT_POOL')) {
      response.status(409).json({ error: 'This canvas has unsettled gift payments.', code: 'UNSETTLED_GIFT_POOL' });
      return;
    }
    throw error;
  }

  response.status(204).end();
});

pagesRouter.get("/:id/collaborators", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageId = String(pageRows[0].id);
  const [collaborators, activeInvite] = await Promise.all([
    fetchCollaboratorsForPage(pageId),
    fetchActiveCollaboratorInvite(pageId),
  ]);

  response.json({
    is_owner: Boolean(pageRows[0].is_owner),
    collaborators,
    active_invite: activeInvite
      ? {
          expires_at: activeInvite.expires_at,
          created_at: activeInvite.created_at,
        }
      : null,
  });
});

pagesRouter.post("/:id/collaborators/invite", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  if (!hasProThemeAccess(request.user!)) {
    response.status(403).json({
      error: "Multi-organizer co-editing is a Pro feature.",
      code: "FEATURE_PRO_ONLY",
    });
    return;
  }

  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!pageRows[0].is_owner) {
    response.status(403).json({
      error: "Only the primary canvas creator can invite co-organizers.",
      code: "ONLY_OWNER_CAN_INVITE",
    });
    return;
  }

  const pageId = String(pageRows[0].id);
  await revokeCollaboratorInvite(pageId);

  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invite = await createCollaboratorInvite(pageId, request.user!.id, tokenHash, 7);
  const origin = getClientOriginForRequest(request);

  response.status(201).json({
    invite_url: `${origin}/organize/${rawToken}`,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
  });
});

pagesRouter.delete("/:id/collaborators/invite", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!pageRows[0].is_owner) {
    response.status(403).json({
      error: "Only the primary canvas creator can revoke invite links.",
      code: "ONLY_OWNER_CAN_REVOKE",
    });
    return;
  }

  await revokeCollaboratorInvite(String(pageRows[0].id));
  response.status(204).end();
});

pagesRouter.delete("/:id/collaborators/:userId", requireAuth, validateParams(pageIdParamSchema), async (request: AuthedRequest, response) => {
  const pageRows = await privatePageQuery(String(request.params.id), request.user!.id);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const isOwner = Boolean(pageRows[0].is_owner);
  const targetUserId = String(request.params.userId);

  if (!isOwner && request.user!.id !== targetUserId) {
    response.status(403).json({
      error: "You can only remove yourself as a co-organizer.",
      code: "PERMISSION_DENIED",
    });
    return;
  }

  await removeCollaborator(String(pageRows[0].id), targetUserId);
  response.status(204).end();
});

pagesRouter.get("/invites/:token", async (request, response) => {
  const token = String(request.params.token || "").trim();
  if (!token) {
    response.status(400).json({ error: "Invalid token" });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invite = await fetchCollaboratorInviteByHash(tokenHash);

  if (!invite) {
    response.status(404).json({ error: "Invitation not found." });
    return;
  }

  const isExpired = new Date(invite.expires_at).getTime() <= Date.now();
  const isRevoked = invite.revoked_at !== null;

  response.json({
    public_code: invite.public_code,
    recipient_name: invite.recipient_name,
    birthday_date: invite.birthday_date,
    theme: invite.theme,
    cover_photo_url: invite.cover_photo_url,
    owner_name: invite.owner_name || "The organizer",
    is_expired: isExpired,
    is_revoked: isRevoked,
  });
});

pagesRouter.post("/invites/:token/accept", requireAuth, async (request: AuthedRequest, response) => {
  const token = String(request.params.token || "").trim();
  if (!token) {
    response.status(400).json({ error: "Invalid token" });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invite = await fetchCollaboratorInviteByHash(tokenHash);

  if (!invite) {
    response.status(404).json({ error: "Invitation not found." });
    return;
  }

  const isExpired = new Date(invite.expires_at).getTime() <= Date.now();
  const isRevoked = invite.revoked_at !== null;

  if (isRevoked || isExpired) {
    response.status(410).json({
      error: "This invitation link has expired or been revoked.",
      code: "INVITE_EXPIRED_OR_REVOKED",
    });
    return;
  }

  if (request.user!.id === invite.owner_user_id) {
    response.json({
      status: "already_owner",
      public_code: invite.public_code,
      message: "You are already the primary owner of this celebration.",
    });
    return;
  }

  await addCollaboratorToPage(String(invite.page_id), request.user!.id, "co_organizer");

  response.json({
    status: "accepted",
    public_code: invite.public_code,
    message: "You have joined as a co-organizer!",
  });
});

// Upload handlers for canvas cover and custom soundtrack
async function discardMediaUpload(file: Express.Multer.File) {
  if (file.path.startsWith("http")) await removeFileByUrl(file.path);
  else await fs.rm(file.path, { force: true });
}

async function authorizeGuestMediaUpload(
  request: AuthedRequest,
  response: express.Response,
  page: { user_id: string | null; claim_token_hash: string | null },
  file: Express.Multer.File,
) {
  if (page.user_id) return true; // Owner/co-organizer checked in the SELECT below.
  const token = request.body.claimToken;
  if (typeof token === "string" && token.length <= 120 && page.claim_token_hash &&
      await verifyPassword(token, page.claim_token_hash)) return true;
  await discardMediaUpload(file);
  response.status(403).json({ error: "A valid private claim token is required to edit this guest canvas." });
  return false;
}

export const handleCoverUpload: express.RequestHandler = async (request: AuthedRequest, response) => {
  const pageIdOrCode = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageIdOrCode) {
    response.status(400).json({ error: "Missing file upload or page id" });
    logRequestFailure("upload-cover", { userId: request.user?.id, pageId: pageIdOrCode, reason: "missing-file-or-page" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-cover"))) {
    return;
  }

  let rows: Array<Record<string, unknown>> = [];
  if (request.user) {
    rows = await sql`
      SELECT id, user_id, claim_token_hash, cover_photo_url
      FROM birthday_pages
      WHERE (id::text = ${pageIdOrCode} OR public_code = ${pageIdOrCode})
        AND (
          user_id = ${request.user.id}
          OR EXISTS (
            SELECT 1
            FROM page_collaborators pc
            WHERE pc.page_id = birthday_pages.id
              AND pc.user_id = ${request.user.id}
          )
          OR (user_id IS NULL AND guest_email IS NOT NULL)
        )
      LIMIT 1
    `;
  } else {
    rows = await sql`
      SELECT id, user_id, claim_token_hash, cover_photo_url
      FROM birthday_pages
      WHERE (id::text = ${pageIdOrCode} OR public_code = ${pageIdOrCode})
        AND user_id IS NULL
        AND guest_email IS NOT NULL
      LIMIT 1
    `;
  }

  const page = rows[0] as undefined | { id: string; user_id: string | null; claim_token_hash: string | null; cover_photo_url: string | null };

  if (!page) {
    await discardMediaUpload(file);
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!(await authorizeGuestMediaUpload(request, response, page, file))) return;

  const url = file.path.startsWith("http")
    ? file.path
    : (await normalizeCoverUpload(file.path)).url;

  await removeFileByUrl(page.cover_photo_url);

  await sql`
    UPDATE birthday_pages
    SET cover_photo_url = ${url}, updated_at = NOW()
    WHERE id = ${page.id}
  `;

  response.json({ url });
};

export const handleSoundtrackUpload: express.RequestHandler = async (request: AuthedRequest, response) => {
  const pageIdOrCode = String(request.body.pageId || "");
  const file = request.file;

  if (!file || !pageIdOrCode) {
    response.status(400).json({ error: "Missing audio upload or page id" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "audio", response, "upload-page-soundtrack"))) {
    return;
  }

  let rows: Array<Record<string, unknown>> = [];
  if (request.user) {
    rows = await sql`
      SELECT id, user_id, claim_token_hash, custom_audio_url
      FROM birthday_pages
      WHERE (id::text = ${pageIdOrCode} OR public_code = ${pageIdOrCode})
        AND (
          user_id = ${request.user.id}
          OR EXISTS (
            SELECT 1
            FROM page_collaborators pc
            WHERE pc.page_id = birthday_pages.id
              AND pc.user_id = ${request.user.id}
          )
          OR (user_id IS NULL AND guest_email IS NOT NULL)
        )
      LIMIT 1
    `;
  } else {
    rows = await sql`
      SELECT id, user_id, claim_token_hash, custom_audio_url
      FROM birthday_pages
      WHERE (id::text = ${pageIdOrCode} OR public_code = ${pageIdOrCode})
        AND user_id IS NULL
        AND guest_email IS NOT NULL
      LIMIT 1
    `;
  }

  const page = rows[0] as undefined | { id: string; user_id: string | null; claim_token_hash: string | null; custom_audio_url: string | null };

  if (!page) {
    await discardMediaUpload(file);
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!(await authorizeGuestMediaUpload(request, response, page, file))) return;

  await removeFileByUrl(page.custom_audio_url);
  const url = file.path.startsWith("http")
    ? file.path
    : fileUrl(path.join("page-audio", file.filename));

  await sql`
    UPDATE birthday_pages
    SET custom_audio_url = ${url}, updated_at = NOW()
    WHERE id = ${page.id}
  `;

  response.json({ url });
};
