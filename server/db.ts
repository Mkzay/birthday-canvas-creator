import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

export const sql = neon(databaseUrl);

export async function initializeDatabase() {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      default_theme TEXT NOT NULL DEFAULT 'elegant',
      default_allow_photos BOOLEAN NOT NULL DEFAULT TRUE,
      default_allow_audio BOOLEAN NOT NULL DEFAULT TRUE,
      default_require_names BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS custom_themes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🎨',
      gradient_from TEXT NOT NULL,
      gradient_to TEXT NOT NULL,
      font TEXT NOT NULL DEFAULT 'sans',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS birthday_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_code TEXT UNIQUE,
      recipient_name TEXT NOT NULL,
      birthday_date DATE NOT NULL,
      theme TEXT NOT NULL DEFAULT 'elegant',
      creator_message TEXT,
      cover_photo_url TEXT,
      soundtrack_id TEXT NOT NULL DEFAULT 'golden-hour',
      custom_audio_url TEXT,
      allow_photos BOOLEAN NOT NULL DEFAULT TRUE,
      allow_audio BOOLEAN NOT NULL DEFAULT TRUE,
      require_names BOOLEAN NOT NULL DEFAULT TRUE,
      close_date DATE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT birthday_pages_status_check CHECK (status IN ('active', 'delivered', 'draft'))
    );
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_theme TEXT NOT NULL DEFAULT 'elegant';
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_allow_photos BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_allow_audio BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_require_names BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS public_code TEXT;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS allow_audio BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS birthday_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id UUID NOT NULL REFERENCES birthday_pages(id) ON DELETE CASCADE,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      photo_url TEXT,
      audio_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS soundtrack_id TEXT NOT NULL DEFAULT 'golden-hour';
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS custom_audio_url TEXT;
  `;

  await sql`
    ALTER TABLE birthday_messages
    ADD COLUMN IF NOT EXISTS audio_url TEXT;
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_birthday_pages_public_code_unique
    ON birthday_pages(public_code)
    WHERE public_code IS NOT NULL;
  `;

  await sql`
    UPDATE birthday_pages
    SET public_code = LOWER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10))
    WHERE public_code IS NULL;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ALTER COLUMN public_code SET NOT NULL;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS letter_color TEXT;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS birthday_message_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES birthday_messages(id) ON DELETE CASCADE,
      photo_url TEXT NOT NULL,
      caption TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_custom_themes_user_id ON custom_themes(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_pages_user_id ON birthday_pages(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_pages_public_code ON birthday_pages(public_code);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_messages_page_id ON birthday_messages(page_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_message_photos_message_id ON birthday_message_photos(message_id);
  `;
}
