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
      COUNT(DISTINCT NULLIF(TRIM(bm.sender_name), ''))::int AS contributor_count,
      (COALESCE(u.plan_tier, 'free') != 'pro' AND COUNT(DISTINCT NULLIF(TRIM(bm.sender_name), '')) >= 6) AS contributor_limit_reached,
      (
        CURRENT_DATE <= COALESCE(bp.close_date, bp.birthday_date)
        AND bp.status = 'active'
        AND (COALESCE(u.plan_tier, 'free') = 'pro' OR COUNT(DISTINCT NULLIF(TRIM(bm.sender_name), '')) < 6)
      ) AS can_contribute,
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
      bm.id,
      bm.sender_name,
      bm.message,
      bm.photo_url AS legacy_photo_url,
      bm.audio_url,
      bm.contribution_amount_kobo,
      bm.created_at,
      bm.last_edited_at,
      bm.edit_count,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', bmp.id::text,
              'photo_url', bmp.photo_url,
              'caption', bmp.caption,
              'sort_order', bmp.sort_order
            ) ORDER BY bmp.sort_order ASC, bmp.created_at ASC
          )
          FROM birthday_message_photos bmp
          WHERE bmp.message_id = bm.id
        ),
        '[]'::json
      ) AS photos,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', bms.id::text,
              'sticker_type', bms.sticker_type,
              'position_x', bms.position_x,
              'position_y', bms.position_y,
              'rotation', bms.rotation,
              'scale', bms.scale
            )
          )
          FROM birthday_message_stickers bms
          WHERE bms.message_id = bm.id
        ),
        '[]'::json
      ) AS stickers
    FROM birthday_messages bm
    WHERE bm.page_id = ${pageId}
      AND bm.deleted_at IS NULL
    ORDER BY bm.created_at ASC
  `;

  return rows.map((row) => {
    const messageId = String(row.id);
    const legacyPhotoUrl = typeof row.legacy_photo_url === "string" ? row.legacy_photo_url : null;
    const rawPhotos = Array.isArray(row.photos) ? row.photos : [];
    const stickers = Array.isArray(row.stickers) ? row.stickers : [];

    const photos = rawPhotos.length
      ? rawPhotos
      : legacyPhotoUrl
        ? [
            {
              id: `legacy-${messageId}`,
              photo_url: legacyPhotoUrl,
              caption: null,
              sort_order: 0,
            },
          ]
        : [];

    return {
      id: messageId,
      sender_name: String(row.sender_name),
      message: String(row.message),
      photo_url: legacyPhotoUrl,
      audio_url: typeof row.audio_url === "string" ? row.audio_url : null,
      contribution_amount_kobo: Number(row.contribution_amount_kobo || 0),
      created_at: row.created_at,
      last_edited_at: row.last_edited_at,
      edit_count: Number(row.edit_count || 0),
      photos,
      stickers,
    };
  });
}

export async function fetchPublicPoolSummary(pageId: string) {
  const rows = await sql`
    SELECT
      bp.pool_fundraising_enabled,
      bp.pool_goal_kobo,
      COALESCE(
        SUM(COALESCE(pc.net_received_kobo, pc.amount_kobo))
          FILTER (WHERE pc.status = 'success'),
        0
      )::bigint AS pooled_amount_kobo,
      bp.pool_description,
      EXISTS(
        SELECT 1
        FROM pool_payouts pp
        WHERE pp.page_id = bp.id
          AND pp.status = 'processing'
      ) AS is_requested,
      COALESCE(
        array_remove(
          array_agg(DISTINCT CASE WHEN pc.status = 'success' THEN pc.contributor_name END),
          NULL
        ),
        ARRAY[]::text[]
      ) AS contributors
    FROM birthday_pages bp
    LEFT JOIN pool_contributions pc ON pc.page_id = bp.id
    WHERE bp.id = ${pageId}
      AND bp.status = 'active'
    GROUP BY bp.id
  `;

  const row = rows[0];
  if (!row) {
    return {
      pool_fundraising_enabled: false,
      pool_goal_kobo: null,
      pooled_amount_kobo: 0,
      pool_description: null,
      contributors: [],
      is_requested: false,
    };
  }

  return {
    pool_fundraising_enabled: Boolean(row.pool_fundraising_enabled),
    pool_goal_kobo: typeof row.pool_goal_kobo === "number" ? row.pool_goal_kobo : null,
    pooled_amount_kobo: Number(row.pooled_amount_kobo || 0),
    pool_description: typeof row.pool_description === "string" ? row.pool_description : null,
    contributors: Array.isArray(row.contributors) ? (row.contributors as string[]) : [],
    is_requested: Boolean(row.is_requested),
  };
}

export async function fetchPublicCanvasProjection(pageId: string, isUnlocked: boolean) {
  const pageRows = await publicPageQuery(pageId);
  const row = pageRows[0];
  if (!row) return null;

  const { reveal_pin_hash: _revealPinHash, ...safeRow } = row;
  const isRevealed = Boolean(row.is_revealed);

  const [poolSummary, messages] = await Promise.all([
    fetchPublicPoolSummary(pageId),
    isRevealed && isUnlocked ? fetchMessagesForPage(pageId) : Promise.resolve([]),
  ]);

  return {
    ...serializePageDates(safeRow),
    requires_unlock: Boolean(row.requires_unlock),
    is_unlocked: isUnlocked,
    pool_summary: poolSummary,
    messages,
  };
}

export async function batchInsertMessagePhotos(
  messageId: string,
  photos: Array<{ url: string; caption: string | null; sortOrder: number }>
) {
  if (!photos.length) return;
  const payload = JSON.stringify(
    photos.map((p) => ({
      url: p.url,
      caption: p.caption,
      sort_order: p.sortOrder,
    }))
  );
  await sql`
    INSERT INTO birthday_message_photos (message_id, photo_url, caption, sort_order)
    SELECT
      ${messageId}::uuid,
      p.url,
      p.caption,
      p.sort_order
    FROM jsonb_to_recordset(${payload}::jsonb) AS p(url text, caption text, sort_order int)
  `;
}

export async function batchInsertMessageStickers(
  messageId: string,
  stickers: Array<{
    stickerType: string;
    positionX: number;
    positionY: number;
    rotation?: number;
    scale?: number;
  }>
) {
  if (!stickers.length) return;
  const payload = JSON.stringify(
    stickers.map((s) => ({
      sticker_type: String(s.stickerType),
      position_x: Number.isFinite(Number(s.positionX)) ? Number(s.positionX) : 50,
      position_y: Number.isFinite(Number(s.positionY)) ? Number(s.positionY) : 50,
      rotation: Number.isFinite(Number(s.rotation)) ? Number(s.rotation) : 0,
      scale: Number.isFinite(Number(s.scale)) ? Number(s.scale) : 1,
    }))
  );
  await sql`
    INSERT INTO birthday_message_stickers (message_id, sticker_type, position_x, position_y, rotation, scale)
    SELECT
      ${messageId}::uuid,
      s.sticker_type,
      s.position_x,
      s.position_y,
      s.rotation,
      s.scale
    FROM jsonb_to_recordset(${payload}::jsonb) AS s(sticker_type text, position_x real, position_y real, rotation real, scale real)
  `;
}
