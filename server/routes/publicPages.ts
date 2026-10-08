import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import sanitizeHtml from "sanitize-html";
import { sql } from "../db";
import { validateParams, validateBody } from "../validateRequest";
import {
  pageIdParamSchema,
  publicUnlockBodySchema,
  publicMessageBodySchema,
  publicMessageEditBodySchema,
  pageMessageParamsSchema,
} from "../schemas";
import {
  publicPhotoUploadLimiter,
  publicAudioUploadLimiter,
  publicMessageLimiter,
  publicWishEditLimiter,
} from "../rateLimits";
import { messageUpload, wishAudioUpload, fileUrl, removeFileByUrl } from "../uploads";
import {
  resolvePageId,
  publicPageQuery,
  fetchMessagesForPage,
  fetchPublicCanvasProjection,
  serializePageDates,
  normalizeContributionPhotos,
  batchInsertMessagePhotos,
  batchInsertMessageStickers,
} from "../services/pageQueries";
import {
  getRequestIp,
  routeParamString,
  sanitizeDisplayName,
  sanitizeEmail,
  sanitizeAmountKobo,
  rejectInvalidUpload,
  logRequestFailure,
  getClientOriginForRequest,
} from "../services/requestUtils";
import { buildBrandedPagePdf } from "../services/pdfService";
import { sendNewMessageAlertEmail } from "../emailFlows";
import { verifyPassword } from "../auth";
import {
  EXPORTS_DISABLED_IN_PRODUCTION,
  FREE_CONTRIBUTOR_LIMIT,
  hasValidPublicUnlock,
  setPublicUnlockCookie,
  extractWishEditToken,
  verifyEditToken,
  checkTokenEditRateLimit,
  isCanvasWishLocked,
} from "../services/publicPageService";

export const publicPagesRouter = express.Router();

// Keepsake PDF Export
publicPagesRouter.get("/:id/export", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];
  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!page.is_revealed) {
    response.status(403).json({ error: "Birthday wishes are not available yet" });
    return;
  }

  if (!hasValidPublicUnlock(request, resolvedPageId, typeof page.reveal_pin_hash === "string" ? page.reveal_pin_hash : null)) {
    response.status(423).json({ error: "PIN unlock required", code: "PIN_REQUIRED" });
    return;
  }

  const messages = await fetchMessagesForPage(resolvedPageId);
  const slug = String(page.recipient_name || "birthday-page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "birthday-page";
  const requestedFormat = typeof request.query.format === "string" ? request.query.format.toLowerCase() : "pdf";
  const siteUrl = getClientOriginForRequest(request);

  if (requestedFormat === "slides") {
    const pdfBytes = await buildBrandedPagePdf(page, messages, {
      orientation: "landscape",
      siteUrl,
    });
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${slug}-story-presentation-deck.pdf"`);
    response.send(Buffer.from(pdfBytes));
    return;
  }

  const pdfBytes = await buildBrandedPagePdf(page, messages, {
    orientation: "portrait",
    siteUrl,
  });
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${slug}-editorial-keepsake-book.pdf"`);
  response.send(Buffer.from(pdfBytes));
});

// Unlock protected page with PIN
publicPagesRouter.post("/:id/unlock", validateParams(pageIdParamSchema), validateBody(publicUnlockBodySchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await sql`
    SELECT reveal_pin_hash
    FROM birthday_pages
    WHERE id = ${resolvedPageId}
      AND status = 'active'
      AND owner_deleted IS NOT TRUE
    LIMIT 1
  `;

  const revealPinHash = typeof rows[0]?.reveal_pin_hash === "string" ? rows[0].reveal_pin_hash : null;
  if (!revealPinHash) {
    response.json({ unlocked: true });
    return;
  }

  const isValid = await verifyPassword(String(request.body.pin), revealPinHash);
  if (!isValid) {
    response.status(401).json({ error: "Incorrect PIN", code: "PIN_INVALID" });
    return;
  }

  setPublicUnlockCookie(response, resolvedPageId, revealPinHash);
  response.json({ unlocked: true });
});

// Fetch public page projection
publicPagesRouter.get("/:id", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  if (!pageRows[0]) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  await sql`
    UPDATE birthday_pages
    SET view_count = view_count + 1
    WHERE id = ${resolvedPageId}
  `;

  const row = pageRows[0];
  const unlocked = hasValidPublicUnlock(request, resolvedPageId, typeof row.reveal_pin_hash === "string" ? row.reveal_pin_hash : null);

  const projection = await fetchPublicCanvasProjection(resolvedPageId, unlocked);
  if (!projection) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  response.json(projection);
});

// Fetch messages for revealed page
publicPagesRouter.get("/:id/messages", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!hasValidPublicUnlock(request, resolvedPageId, typeof page.reveal_pin_hash === "string" ? page.reveal_pin_hash : null)) {
    response.status(423).json({ error: "PIN unlock required", code: "PIN_REQUIRED" });
    return;
  }

  if (!page.is_revealed) {
    response.status(403).json({ error: "Birthday wishes are not available yet" });
    return;
  }

  const messages = await fetchMessagesForPage(resolvedPageId);
  response.json(messages);
});

// Upload message photo
publicPagesRouter.post("/:id/message-photo", validateParams(pageIdParamSchema), publicPhotoUploadLimiter, messageUpload.single("file"), async (request, response) => {
  const file = request.file;
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (page.contributor_limit_reached) {
    response.status(403).json({
      error: "This celebration canvas has reached its free plan limit of 6 contributors. Upgrade to Pro for unlimited contributors.",
      code: "CONTRIBUTOR_LIMIT_REACHED",
    });
    return;
  }

  if (!page.can_contribute || !page.allow_photos) {
    response.status(403).json({ error: "Photo uploads are disabled for this page" });
    return;
  }

  if (!file) {
    response.status(400).json({ error: "Missing photo upload" });
    logRequestFailure("upload-message-photo", { pageId: resolvedPageId, reason: "missing-file" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "image", response, "upload-message-photo"))) {
    return;
  }

  const url = file.path.startsWith("http")
    ? file.path
    : fileUrl(path.join("messages", file.filename));
  response.json({ url });
});

// Upload message voice note
publicPagesRouter.post("/:id/message-audio", validateParams(pageIdParamSchema), publicAudioUploadLimiter, wishAudioUpload.single("file"), async (request, response) => {
  const file = request.file;
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (page.contributor_limit_reached) {
    response.status(403).json({
      error: "This celebration canvas has reached its free plan limit of 6 contributors. Upgrade to Pro for unlimited contributors.",
      code: "CONTRIBUTOR_LIMIT_REACHED",
    });
    return;
  }

  if (!page.can_contribute || !page.allow_audio) {
    response.status(403).json({ error: "Audio uploads are disabled for this page" });
    return;
  }

  if (!file) {
    response.status(400).json({ error: "Missing audio upload" });
    logRequestFailure("upload-message-audio", { pageId: resolvedPageId, reason: "missing-file" });
    return;
  }

  if (!(await rejectInvalidUpload(file, "audio", response, "upload-message-audio"))) {
    return;
  }

  const audioUrl = file.path.startsWith("http")
    ? file.path
    : fileUrl(path.join("wish-audio", file.filename));
  response.json({ url: audioUrl });
});

// Submit new wish
publicPagesRouter.post("/:id/messages", validateParams(pageIdParamSchema), publicMessageLimiter, validateBody(publicMessageBodySchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(String(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];

  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  if (!page.can_contribute) {
    response.status(403).json({ error: "This birthday page is no longer accepting new wishes" });
    return;
  }

  const senderName = sanitizeDisplayName(request.body.senderName);
  const contributorKey = (senderName || "Anonymous").trim().toLowerCase();

  if (String(page.owner_plan_tier || "free") !== "pro") {
    const contributorRows = await sql`
      SELECT
        COUNT(DISTINCT LOWER(TRIM(sender_name)))::int AS contributor_count,
        BOOL_OR(LOWER(TRIM(sender_name)) = ${contributorKey}) AS has_sender
      FROM birthday_messages
      WHERE page_id = ${resolvedPageId}
        AND deleted_at IS NULL
    `;

    const contributorCount = Number(contributorRows[0]?.contributor_count || 0);
    const hasSenderAlready = Boolean(contributorRows[0]?.has_sender);
    if (contributorCount >= FREE_CONTRIBUTOR_LIMIT && !hasSenderAlready) {
      response.status(403).json({
        error: `This page has reached the free plan limit of ${FREE_CONTRIBUTOR_LIMIT} contributors. Upgrade to Pro for unlimited contributors.`,
        code: "CONTRIBUTOR_LIMIT_REACHED",
      });
      return;
    }
  }

  const rawMessage = typeof request.body.message === "string" ? request.body.message.trim() : "";
  const message = sanitizeHtml(rawMessage, {
    allowedTags: ["b", "i", "u", "strong", "em", "ul", "ol", "li", "br", "p"],
    allowedAttributes: {},
  });
  const plainTextLength = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).length;
  const photoUrl = typeof request.body.photoUrl === "string" ? request.body.photoUrl.trim() : null;
  const audioUrl = typeof request.body.audioUrl === "string" ? request.body.audioUrl.trim() : null;
  const normalizedPhotos = normalizeContributionPhotos(request.body.photos);
  const photos = normalizedPhotos.length
    ? normalizedPhotos
    : photoUrl
      ? [{ url: photoUrl, caption: null, sortOrder: 0 }]
      : [];

  if (!plainTextLength) {
    response.status(400).json({ error: "Please write a message" });
    logRequestFailure("create-message", { pageId: resolvedPageId, reason: "empty-message" });
    return;
  }

  if (plainTextLength > 500) {
    response.status(400).json({ error: "Messages must be 500 characters or fewer" });
    return;
  }

  if (page.require_names && !senderName) {
    response.status(400).json({ error: "Please enter your name" });
    logRequestFailure("create-message", { pageId: resolvedPageId, reason: "missing-name" });
    return;
  }

  if (photos.length > 6) {
    response.status(400).json({ error: "You can attach up to 6 photos" });
    return;
  }

  if (photos.some((photo) => photo.caption && photo.caption.length > 140)) {
    response.status(400).json({ error: "Photo notes must be 140 characters or fewer" });
    return;
  }

  if (photos.length > 0 && !page.allow_photos) {
    response.status(400).json({ error: "Photo uploads are disabled for this page" });
    return;
  }

  const contributionAmountKobo = sanitizeAmountKobo(request.body.contributionAmountKobo) || 0;
  const editToken = crypto.randomBytes(32).toString("hex");
  const editTokenHash = crypto.createHash("sha256").update(editToken).digest("hex");

  const rows = await sql`
    INSERT INTO birthday_messages (page_id, sender_name, message, photo_url, audio_url, contribution_amount_kobo, edit_token_hash)
    VALUES (
      ${resolvedPageId},
      ${senderName || "Anonymous"},
      ${message},
      ${photos[0]?.url || null},
      ${audioUrl},
      ${contributionAmountKobo},
      ${editTokenHash}
    )
    RETURNING *
  `;

  const createdMessage = rows[0];

  if (photos.length) {
    await batchInsertMessagePhotos(createdMessage.id, photos);
  }

  const stickers = Array.isArray(request.body.stickers) ? request.body.stickers : [];
  if (stickers.length) {
    await batchInsertMessageStickers(createdMessage.id, stickers);
  }

  // Note: pooled_amount_kobo is strictly updated through verified Paystack transactions in upsertSuccessfulPoolContributionFromPayment

  await sql`
    INSERT INTO wish_edit_logs (message_id, page_id, action, seconds_since_creation, client_ip)
    VALUES (${createdMessage.id}, ${resolvedPageId}, 'created', 0, ${getRequestIp(request)})
  `;

  const messages = await fetchMessagesForPage(String(createdMessage.page_id));
  const messageWithPhotos = messages.find((item) => item.id === createdMessage.id);

  void (async () => {
    try {
      const ownerRows = await sql`
        SELECT
          COALESCE(u.email, bp.guest_email) AS email,
          COALESCE(u.display_name, 'Guest Creator') AS display_name,
          COALESCE(u.email_notifications, true) AS email_notifications,
          COALESCE(u.new_message_notifications, true) AS new_message_notifications
        FROM birthday_pages bp
        LEFT JOIN users u ON u.id = bp.user_id
        WHERE bp.id = ${resolvedPageId}
        LIMIT 1
      `;

      const owner = ownerRows[0];
      const ownerEmail = owner ? sanitizeEmail(owner.email) : null;
      const canNotify = Boolean(owner?.email_notifications ?? true) && Boolean(owner?.new_message_notifications ?? true);

      if (ownerEmail && canNotify) {
        await sendNewMessageAlertEmail({
          to: ownerEmail,
          ownerName: typeof owner.display_name === "string" ? owner.display_name : null,
          recipientName: String(page.recipient_name),
          pageCode: String(page.public_code),
          senderName: senderName || "Anonymous",
          messageCount: Number(page.message_count || 0) + 1,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "new-message-email-send-failed";
      logRequestFailure("new-message-alert", { pageId: resolvedPageId, message });
    }
  })();

  response.status(201).json({
    ...(messageWithPhotos || createdMessage),
    editToken,
  });
});

// Fetch my wish via edit token
publicPagesRouter.get("/:id/my-wish", validateParams(pageIdParamSchema), async (request, response) => {
  const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
  if (!resolvedPageId) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const token = extractWishEditToken(request);
  if (!token) {
    response.status(401).json({ error: "Private edit token is required", code: "EDIT_TOKEN_REQUIRED" });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const pageRows = await publicPageQuery(resolvedPageId);
  const page = pageRows[0];
  if (!page) {
    response.status(404).json({ error: "Page not found" });
    return;
  }

  const rows = await sql`
    SELECT
      bm.id AS message_id,
      bm.sender_name,
      bm.message,
      bm.photo_url AS legacy_photo_url,
      bm.audio_url,
      bm.contribution_amount_kobo,
      bm.created_at,
      bm.last_edited_at,
      bm.edit_count,
      bm.deleted_at,
      bm.edit_token_hash,
      bmp.id AS photo_id,
      bmp.photo_url,
      bmp.caption,
      bmp.sort_order
    FROM birthday_messages bm
    LEFT JOIN birthday_message_photos bmp ON bmp.message_id = bm.id
    WHERE bm.page_id = ${resolvedPageId}
      AND bm.edit_token_hash = ${tokenHash}
    ORDER BY bmp.sort_order ASC, bmp.created_at ASC
  `;

  if (!rows.length) {
    response.status(404).json({ error: "No wish found for this edit link", code: "WISH_NOT_FOUND" });
    return;
  }

  const firstRow = rows[0];
  if (!verifyEditToken(token, String(firstRow.edit_token_hash))) {
    response.status(403).json({ error: "Invalid edit token", code: "INVALID_EDIT_TOKEN" });
    return;
  }

  const isDeleted = Boolean(firstRow.deleted_at);
  const deletedAtMs = firstRow.deleted_at ? new Date(String(firstRow.deleted_at)).getTime() : null;
  const undoAvailable = isDeleted && deletedAtMs !== null && (Date.now() - deletedAtMs <= 10 * 60 * 1000);

  const photos: Array<{ id: string; photo_url: string; caption: string | null; sort_order: number }> = [];
  rows.forEach((r) => {
    if (r.photo_id && !photos.some((p) => p.id === String(r.photo_id))) {
      photos.push({
        id: String(r.photo_id),
        photo_url: String(r.photo_url),
        caption: typeof r.caption === "string" ? r.caption : null,
        sort_order: Number(r.sort_order || 0),
      });
    }
  });

  const legacyPhotoUrl = typeof firstRow.legacy_photo_url === "string" ? firstRow.legacy_photo_url : null;
  if (!photos.length && legacyPhotoUrl) {
    photos.push({
      id: `legacy-${firstRow.message_id}`,
      photo_url: legacyPhotoUrl,
      caption: null,
      sort_order: 0,
    });
  }

  const lockCheck = isCanvasWishLocked(page);

  response.json({
    message: {
      id: String(firstRow.message_id),
      sender_name: String(firstRow.sender_name),
      message: String(firstRow.message),
      audio_url: typeof firstRow.audio_url === "string" ? firstRow.audio_url : null,
      photos,
      contribution_amount_kobo: Number(firstRow.contribution_amount_kobo || 0),
      created_at: firstRow.created_at,
      last_edited_at: firstRow.last_edited_at,
      edit_count: Number(firstRow.edit_count || 0),
    },
    isDeleted,
    undoAvailable,
    isLocked: lockCheck.isLocked,
    lockReason: lockCheck.reason,
    canEdit: !lockCheck.isLocked && !isDeleted,
  });
});

// Edit wish via edit token
publicPagesRouter.patch(
  "/:id/messages/:messageId",
  validateParams(pageMessageParamsSchema),
  publicWishEditLimiter,
  validateBody(publicMessageEditBodySchema),
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const token = extractWishEditToken(request);
    if (!token) {
      response.status(401).json({ error: "Private edit token is required", code: "EDIT_TOKEN_REQUIRED" });
      return;
    }

    const pageRows = await publicPageQuery(resolvedPageId);
    const page = pageRows[0];
    if (!page) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const lockCheck = isCanvasWishLocked(page);
    if (lockCheck.isLocked) {
      response.status(403).json({ error: lockCheck.reason, code: "WISH_LOCKED" });
      return;
    }

    const msgRows = await sql`
      SELECT id, page_id, sender_name, message, photo_url, audio_url, created_at, edit_token_hash, deleted_at, edit_count
      FROM birthday_messages
      WHERE id = ${request.params.messageId}
        AND page_id = ${resolvedPageId}
      LIMIT 1
    `;

    const existingMessage = msgRows[0];
    if (!existingMessage || existingMessage.deleted_at) {
      response.status(404).json({ error: "Wish not found or has been removed", code: "WISH_NOT_FOUND" });
      return;
    }

    if (!verifyEditToken(token, String(existingMessage.edit_token_hash))) {
      response.status(403).json({ error: "Invalid edit token", code: "INVALID_EDIT_TOKEN" });
      return;
    }

    if (!checkTokenEditRateLimit(String(existingMessage.edit_token_hash))) {
      response.status(429).json({ error: "Too many edits for this wish. Please try again shortly.", code: "RATE_LIMITED" });
      return;
    }

    const senderName = sanitizeDisplayName(request.body.senderName);
    if (page.require_names && !senderName) {
      response.status(400).json({ error: "Please enter your name" });
      return;
    }

    const rawMessage = typeof request.body.message === "string" ? request.body.message.trim() : "";
    const cleanMessage = sanitizeHtml(rawMessage, {
      allowedTags: ["b", "i", "u", "strong", "em", "ul", "ol", "li", "br", "p"],
      allowedAttributes: {},
    });
    const plainLength = sanitizeHtml(cleanMessage, { allowedTags: [], allowedAttributes: {} }).length;

    if (!plainLength) {
      response.status(400).json({ error: "Please write a message" });
      return;
    }

    if (plainLength > 500) {
      response.status(400).json({ error: "Messages must be 500 characters or fewer" });
      return;
    }

    const normalizedPhotos = normalizeContributionPhotos(request.body.photos);
    const photos = normalizedPhotos.length
      ? normalizedPhotos
      : typeof request.body.photoUrl === "string" && request.body.photoUrl.trim()
        ? [{ url: request.body.photoUrl.trim(), caption: null, sortOrder: 0 }]
        : [];

    if (photos.length > 6) {
      response.status(400).json({ error: "You can attach up to 6 photos" });
      return;
    }

    if (photos.length > 0 && !page.allow_photos) {
      response.status(400).json({ error: "Photo uploads are disabled for this page" });
      return;
    }

    const newAudioUrl = typeof request.body.audioUrl === "string" ? request.body.audioUrl.trim() : null;
    if (newAudioUrl && !page.allow_audio) {
      response.status(400).json({ error: "Audio uploads are disabled for this page" });
      return;
    }

    // Media replacement cleanup: delete old files that are no longer kept
    const oldPhotoRows = await sql`
      SELECT photo_url
      FROM birthday_message_photos
      WHERE message_id = ${existingMessage.id}
    `;
    const newPhotoUrls = new Set(photos.map((p) => p.url));
    const oldPhotoUrls = [
      ...oldPhotoRows.map((r) => String(r.photo_url)),
      ...(existingMessage.photo_url ? [String(existingMessage.photo_url)] : []),
    ];

    for (const oldUrl of oldPhotoUrls) {
      if (oldUrl && !newPhotoUrls.has(oldUrl)) {
        await removeFileByUrl(oldUrl);
      }
    }

    if (existingMessage.audio_url && existingMessage.audio_url !== newAudioUrl) {
      await removeFileByUrl(String(existingMessage.audio_url));
    }

    await sql`
      UPDATE birthday_messages
      SET
        sender_name = ${senderName || "Anonymous"},
        message = ${cleanMessage},
        photo_url = ${photos[0]?.url || null},
        audio_url = ${newAudioUrl},
        last_edited_at = NOW(),
        edit_count = edit_count + 1
      WHERE id = ${existingMessage.id}
    `;

    await sql`
      DELETE FROM birthday_message_photos
      WHERE message_id = ${existingMessage.id}
    `;

    if (photos.length) {
      await batchInsertMessagePhotos(existingMessage.id, photos);
    }

    const createdAtMs = new Date(String(existingMessage.created_at)).getTime();
    const secondsSinceCreation = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
    await sql`
      INSERT INTO wish_edit_logs (message_id, page_id, action, seconds_since_creation, client_ip)
      VALUES (${existingMessage.id}, ${resolvedPageId}, 'edited', ${secondsSinceCreation}, ${getRequestIp(request)})
    `;

    const allPageMessages = await fetchMessagesForPage(String(resolvedPageId));
    const updated = allPageMessages.find((m) => m.id === String(existingMessage.id));

    response.json({
      message: updated || {
        id: String(existingMessage.id),
        sender_name: senderName || "Anonymous",
        message: cleanMessage,
        audio_url: newAudioUrl,
        photos,
      },
    });
  },
);

// Soft delete wish via edit token
publicPagesRouter.delete(
  "/:id/messages/:messageId",
  validateParams(pageMessageParamsSchema),
  publicWishEditLimiter,
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const token = extractWishEditToken(request);
    if (!token) {
      response.status(401).json({ error: "Private edit token is required", code: "EDIT_TOKEN_REQUIRED" });
      return;
    }

    const pageRows = await publicPageQuery(resolvedPageId);
    const page = pageRows[0];
    if (!page) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const lockCheck = isCanvasWishLocked(page);
    if (lockCheck.isLocked) {
      response.status(403).json({ error: lockCheck.reason, code: "WISH_LOCKED" });
      return;
    }

    const msgRows = await sql`
      SELECT id, page_id, created_at, edit_token_hash, deleted_at
      FROM birthday_messages
      WHERE id = ${request.params.messageId}
        AND page_id = ${resolvedPageId}
      LIMIT 1
    `;

    const existingMessage = msgRows[0];
    if (!existingMessage || existingMessage.deleted_at) {
      response.status(404).json({ error: "Wish not found or already deleted", code: "WISH_NOT_FOUND" });
      return;
    }

    if (!verifyEditToken(token, String(existingMessage.edit_token_hash))) {
      response.status(403).json({ error: "Invalid edit token", code: "INVALID_EDIT_TOKEN" });
      return;
    }

    await sql`
      UPDATE birthday_messages
      SET deleted_at = NOW()
      WHERE id = ${existingMessage.id}
    `;

    const createdAtMs = new Date(String(existingMessage.created_at)).getTime();
    const secondsSinceCreation = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
    await sql`
      INSERT INTO wish_edit_logs (message_id, page_id, action, seconds_since_creation, client_ip)
      VALUES (${existingMessage.id}, ${resolvedPageId}, 'soft_deleted', ${secondsSinceCreation}, ${getRequestIp(request)})
    `;

    response.json({
      success: true,
      message: "Wish deleted. You have 10 minutes to undo.",
      undoExpiresAt: Date.now() + 10 * 60 * 1000,
    });
  },
);

// Undo wish delete
publicPagesRouter.post(
  "/:id/messages/:messageId/undo-delete",
  validateParams(pageMessageParamsSchema),
  publicWishEditLimiter,
  async (request, response) => {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const token = extractWishEditToken(request);
    if (!token) {
      response.status(401).json({ error: "Private edit token is required", code: "EDIT_TOKEN_REQUIRED" });
      return;
    }

    const pageRows = await publicPageQuery(resolvedPageId);
    const page = pageRows[0];
    if (!page) {
      response.status(404).json({ error: "Page not found" });
      return;
    }

    const lockCheck = isCanvasWishLocked(page);
    if (lockCheck.isLocked) {
      response.status(403).json({ error: lockCheck.reason, code: "WISH_LOCKED" });
      return;
    }

    const msgRows = await sql`
      SELECT id, page_id, created_at, edit_token_hash, deleted_at
      FROM birthday_messages
      WHERE id = ${request.params.messageId}
        AND page_id = ${resolvedPageId}
        AND deleted_at IS NOT NULL
      LIMIT 1
    `;

    const existingMessage = msgRows[0];
    if (!existingMessage) {
      response.status(404).json({ error: "No deleted wish found or undo window expired", code: "WISH_NOT_FOUND" });
      return;
    }

    if (!verifyEditToken(token, String(existingMessage.edit_token_hash))) {
      response.status(403).json({ error: "Invalid edit token", code: "INVALID_EDIT_TOKEN" });
      return;
    }

    const deletedAtMs = new Date(String(existingMessage.deleted_at)).getTime();
    if (Date.now() - deletedAtMs > 10 * 60 * 1000) {
      response.status(400).json({ error: "The 10-minute undo period has expired.", code: "UNDO_EXPIRED" });
      return;
    }

    await sql`
      UPDATE birthday_messages
      SET deleted_at = NULL
      WHERE id = ${existingMessage.id}
    `;

    const createdAtMs = new Date(String(existingMessage.created_at)).getTime();
    const secondsSinceCreation = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
    await sql`
      INSERT INTO wish_edit_logs (message_id, page_id, action, seconds_since_creation, client_ip)
      VALUES (${existingMessage.id}, ${resolvedPageId}, 'restored', ${secondsSinceCreation}, ${getRequestIp(request)})
    `;

    const allPageMessages = await fetchMessagesForPage(String(resolvedPageId));
    const restored = allPageMessages.find((m) => m.id === String(existingMessage.id));

    response.json({
      success: true,
      message: "Wish restored successfully.",
      restoredMessage: restored,
    });
  },
);
