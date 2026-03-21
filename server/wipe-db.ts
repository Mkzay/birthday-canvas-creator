import "dotenv/config";
import { sql, initializeDatabase } from "./db";

async function wipe() {
  console.log("⚠️  Wiping database...");
  
  const tables = [
    "birthday_message_stickers",
    "birthday_message_photos",
    "birthday_messages",
    "birthday_page_saves",
    "birthday_pages",
    "custom_themes",
    "auth_sessions",
    "email_tokens",
    "users"
  ];

  for (const table of tables) {
    console.log(`Dropping table ${table}...`);
    await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  console.log("✅ Tables dropped. Reinitializing schema...");
  await initializeDatabase();
  console.log("✨ Database wiped and reinitialized successfully.");
  process.exit(0);
}

wipe().catch((err) => {
  console.error("❌ Wipe failed:", err);
  process.exit(1);
});
