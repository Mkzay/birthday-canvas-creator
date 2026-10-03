import crypto from "node:crypto";
import { sql } from "../db";

export function sanitizePhotoCaption(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 140) : null;
}

export function normalizeContributionPhotos(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 6)
    .map((photo, index) => {
      if (!photo || typeof photo !== "object") return null;

      const url = typeof photo.url === "string" ? photo.url.trim() : "";
      if (!url) return null;

      return {
        url,
        caption: sanitizePhotoCaption(photo.caption),
        sortOrder: index,
      };
    })
    .filter(Boolean);
}

export function formatDateOnly(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

export function serializePageDates<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    birthday_date: formatDateOnly(row.birthday_date),
    close_date: formatDateOnly(row.close_date),
  };
}

export function buildPublicCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}

export async function createUniquePublicCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildPublicCode();
    const rows = await sql`
      SELECT id
      FROM birthday_pages
      WHERE public_code = ${candidate}
      LIMIT 1
    `;

    if (!rows[0]) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique public code");
}

export async function resolvePageId(identifier: string): Promise<string | null> {
  const normalizedIdentifier = String(identifier || "").trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const rows = await sql`
    SELECT id
    FROM birthday_pages
    WHERE id::text = ${normalizedIdentifier}
       OR public_code = ${normalizedIdentifier}
       OR LOWER(public_code) = LOWER(${normalizedIdentifier})
    LIMIT 1
  `;

  if (rows[0]) {
    return String(rows[0].id);
  }

  return null;
}

export function publicPageQuery(pageId: string) {
  return sql`
    SELECT
      bp.id,
      bp.public_code,
      bp.recipient_name,
      bp.birthday_date,
      bp.theme,
      bp.letter_theme,
      bp.display_mode,
      bp.letter_color,
      ct.emoji AS theme_emoji,
      ct.gradient_from AS theme_gradient_from,
      ct.gradient_to AS theme_gradient_to,
      ct.gradient_mid AS theme_gradient_mid,
      ct.gradient_angle AS theme_gradient_angle,
      ct.accent_color AS theme_accent_color,
      ct.font AS theme_font,
      lct.gradient_from AS letter_theme_gradient_from,
      lct.gradient_to AS letter_theme_gradient_to,
      lct.gradient_mid AS letter_theme_gradient_mid,
      lct.gradient_angle AS letter_theme_gradient_angle,
      CASE WHEN NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) THEN bp.creator_message ELSE NULL END AS creator_message,
      bp.cover_photo_url,
      bp.soundtrack_id,
      bp.custom_audio_url,
      bp.pool_fundraising_enabled,
      bp.pool_goal_kobo,
      bp.pooled_amount_kobo,
      bp.pool_description,
      bp.reveal_at,
      bp.reveal_pin_hash,
      bp.view_count,
      bp.allow_photos,
      bp.allow_audio,
      bp.require_names,
      bp.close_date,
      COALESCE(u.plan_tier, 'free') AS owner_plan_tier,
      (bp.user_id IS NULL AND bp.guest_email IS NOT NULL) AS is_guest,
      bp.reveal_pin_hash IS NOT NULL AS requires_unlock,
      NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) AS is_revealed,
      CURRENT_DATE <= COALESCE(bp.close_date, bp.birthday_date) AND bp.status = 'active' AS can_contribute,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    LEFT JOIN custom_themes ct ON bp.theme = CONCAT('custom_', ct.id::text)
    LEFT JOIN custom_themes lct ON bp.letter_theme = CONCAT('custom_', lct.id::text)
    LEFT JOIN users u ON u.id = bp.user_id
    WHERE bp.id = ${pageId}
      AND bp.status = 'active'
    GROUP BY bp.id, ct.id, lct.id, u.id
  `;
}

export function privatePageQuery(pageId: string, userId: string) {
  return sql`
    SELECT
      bp.*,
      NOW() >= COALESCE(bp.reveal_at, bp.birthday_date::timestamptz) AS is_revealed,
      bp.reveal_pin_hash IS NOT NULL AS reveal_pin_set,
      ct.emoji AS theme_emoji,
      ct.gradient_from AS theme_gradient_from,
      ct.gradient_to AS theme_gradient_to,
      ct.gradient_mid AS theme_gradient_mid,
      ct.gradient_angle AS theme_gradient_angle,
      ct.accent_color AS theme_accent_color,
      ct.font AS theme_font,
      COUNT(bm.id)::int AS message_count
    FROM birthday_pages bp
    LEFT JOIN birthday_messages bm ON bm.page_id = bp.id AND bm.deleted_at IS NULL
    LEFT JOIN custom_themes ct ON bp.theme = CONCAT('custom_', ct.id::text)
    WHERE (bp.id::text = ${pageId} OR bp.public_code = ${pageId})
      AND bp.user_id = ${userId}
      AND bp.owner_deleted IS NOT TRUE
    GROUP BY bp.id, ct.id
  `;
}

export async function fetchMessagesForPage(pageId: string) {
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
      bmp.id AS photo_id,
      bmp.photo_url,
      bmp.caption,
      bmp.sort_order,
      bms.id AS sticker_id,
      bms.sticker_type,
      bms.position_x,
      bms.position_y,
      bms.rotation,
      bms.scale
    FROM birthday_messages bm
    LEFT JOIN birthday_message_photos bmp ON bmp.message_id = bm.id
    LEFT JOIN birthday_message_stickers bms ON bms.message_id = bm.id
    WHERE bm.page_id = ${pageId}
      AND bm.deleted_at IS NULL
    ORDER BY bm.created_at ASC, bmp.sort_order ASC, bmp.created_at ASC
  `;

  const messages = new Map<string, Record<string, unknown>>();

  rows.forEach((row) => {
    const messageId = String(row.message_id);

    if (!messages.has(messageId)) {
      messages.set(messageId, {
        id: messageId,
        sender_name: String(row.sender_name),
        message: String(row.message),
        photo_url: typeof row.legacy_photo_url === "string" ? row.legacy_photo_url : null,
        audio_url: typeof row.audio_url === "string" ? row.audio_url : null,
        contribution_amount_kobo: Number(row.contribution_amount_kobo || 0),
        created_at: row.created_at,
        last_edited_at: row.last_edited_at,
        edit_count: Number(row.edit_count || 0),
        photos: [],
        stickers: [],
      });
    }

    const currentMessage = messages.get(messageId)!;
    const photos = currentMessage.photos as Array<Record<string, unknown>>;
    const stickers = currentMessage.stickers as Array<Record<string, unknown>>;

    if (row.photo_id && !photos.some((p) => p.id === String(row.photo_id))) {
      photos.push({
        id: String(row.photo_id),
        photo_url: String(row.photo_url),
        caption: typeof row.caption === "string" ? row.caption : null,
        sort_order: Number(row.sort_order || 0),
      });
    }

    if (row.sticker_id && !stickers.some((s) => s.id === String(row.sticker_id))) {
      stickers.push({
        id: String(row.sticker_id),
        sticker_type: String(row.sticker_type),
        position_x: Number(row.position_x),
        position_y: Number(row.position_y),
        rotation: Number(row.rotation || 0),
        scale: Number(row.scale || 1),
      });
    }
  });

  return Array.from(messages.values()).map((message) => {
    const photos = message.photos as Array<Record<string, unknown>>;
    const legacyPhotoUrl = typeof message.photo_url === "string" ? message.photo_url : null;

    if (!photos.length && legacyPhotoUrl) {
      return {
        ...message,
        photos: [
          {
            id: `legacy-${message.id}`,
            photo_url: legacyPhotoUrl,
            caption: null,
            sort_order: 0,
          },
        ],
      };
    }

    return message;
  });
}
