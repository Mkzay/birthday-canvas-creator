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
      email_verified_at TIMESTAMPTZ,
      display_name TEXT,
      avatar_url TEXT,
      default_theme TEXT NOT NULL DEFAULT 'elegant',
      default_allow_photos BOOLEAN NOT NULL DEFAULT TRUE,
      default_allow_audio BOOLEAN NOT NULL DEFAULT TRUE,
      default_require_names BOOLEAN NOT NULL DEFAULT TRUE,
      email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      new_message_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      birthday_reminders BOOLEAN NOT NULL DEFAULT TRUE,
      last_welcome_email_at TIMESTAMPTZ,
      last_birthday_notification_year INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB,
      CONSTRAINT email_tokens_purpose_check CHECK (purpose IN ('verify_email', 'password_reset'))
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      remember_me BOOLEAN NOT NULL DEFAULT FALSE,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      absolute_expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
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
    CREATE TABLE IF NOT EXISTS billing_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      provider_reference TEXT NOT NULL UNIQUE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      email TEXT,
      amount_kobo INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL,
      payment_event TEXT,
      raw_payload JSONB,
      verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT billing_payments_provider_check CHECK (provider IN ('paystack'))
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS birthday_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_code TEXT UNIQUE,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT,
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
      birthday_notified_year INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT birthday_pages_status_check CHECK (status IN ('active', 'delivered', 'draft'))
    );
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
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
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free';
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_plan_tier_check'
      ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_plan_tier_check
        CHECK (plan_tier IN ('free', 'pro'));
      END IF;
    END $$;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS new_message_notifications BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birthday_reminders BOOLEAN NOT NULL DEFAULT TRUE;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_welcome_email_at TIMESTAMPTZ;
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_birthday_notification_year INTEGER;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS public_code TEXT;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS recipient_email TEXT;
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
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS reveal_at TIMESTAMPTZ;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
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
    CREATE TABLE IF NOT EXISTS birthday_page_saves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      page_id UUID NOT NULL REFERENCES birthday_pages(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, page_id)
    );
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS owner_deleted BOOLEAN NOT NULL DEFAULT FALSE;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS letter_color TEXT;
  `;

  await sql`
    ALTER TABLE birthday_pages
    ADD COLUMN IF NOT EXISTS birthday_notified_year INTEGER;
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
    ALTER TABLE custom_themes
    ADD COLUMN IF NOT EXISTS gradient_mid TEXT;
  `;

  await sql`
    ALTER TABLE custom_themes
    ADD COLUMN IF NOT EXISTS gradient_angle INTEGER NOT NULL DEFAULT 135;
  `;

  await sql`
    ALTER TABLE custom_themes
    ADD COLUMN IF NOT EXISTS accent_color TEXT;
  `;

  await sql`
    ALTER TABLE custom_themes
    ADD COLUMN IF NOT EXISTS icon_url TEXT;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_tokens(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh_token_hash ON auth_sessions(refresh_token_hash);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
  `;
  await sql`
    ALTER TABLE auth_sessions
    ADD COLUMN IF NOT EXISTS remember_me BOOLEAN NOT NULL DEFAULT FALSE;
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_tokens_purpose_expires_at ON email_tokens(purpose, expires_at);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_email_verified_at ON users(email_verified_at);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_custom_themes_user_id ON custom_themes(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_billing_payments_user_id ON billing_payments(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_billing_payments_provider_reference ON billing_payments(provider_reference);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_pages_user_id ON birthday_pages(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_pages_public_code ON birthday_pages(public_code);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_page_saves_user_id ON birthday_page_saves(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_messages_page_id ON birthday_messages(page_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_message_photos_message_id ON birthday_message_photos(message_id);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS birthday_message_stickers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES birthday_messages(id) ON DELETE CASCADE,
      sticker_type TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      rotation REAL NOT NULL DEFAULT 0,
      scale REAL NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_birthday_message_stickers_message_id ON birthday_message_stickers(message_id);
  `;
}
