import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { initializeDatabase, sql } from "../db";
import { normalizeCoverUpload, removeFileByUrl, uploadsRoot } from "../uploads";

type CoverRow = {
  id: string;
  cover_photo_url: string | null;
};

function toAbsoluteUploadPath(url: string) {
  const relativePath = url.slice("/uploads/".length);
  return path.resolve(uploadsRoot, relativePath);
}

async function main() {
  await initializeDatabase();

  const rows = await sql`
    SELECT id, cover_photo_url
    FROM birthday_pages
    WHERE cover_photo_url IS NOT NULL
      AND cover_photo_url LIKE '/uploads/covers/%'
    ORDER BY updated_at DESC
  ` as CoverRow[];

  let normalized = 0;
  let skipped = 0;

  for (const row of rows) {
    const currentUrl = row.cover_photo_url;
    if (!currentUrl) {
      skipped += 1;
      continue;
    }

    const absolutePath = toAbsoluteUploadPath(currentUrl);

    try {
      await fs.access(absolutePath);
    } catch {
      console.warn(`Skipping missing file for page ${row.id}: ${currentUrl}`);
      skipped += 1;
      continue;
    }

    const nextCover = await normalizeCoverUpload(absolutePath);

    await sql`
      UPDATE birthday_pages
      SET cover_photo_url = ${nextCover.url}, updated_at = NOW()
      WHERE id = ${row.id}
    `;

    await removeFileByUrl(currentUrl);
    normalized += 1;
    console.log(`Normalized cover for page ${row.id}: ${currentUrl} -> ${nextCover.url}`);
  }

  console.log(`Cover backfill complete. normalized=${normalized} skipped=${skipped}`);
}

main().catch((error) => {
  console.error("Failed to backfill cover uploads", error);
  process.exit(1);
});
