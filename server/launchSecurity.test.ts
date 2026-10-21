import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import express from "express";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { v2 as cloudinary } from "cloudinary";

// Never use the developer's database or email service in regression tests.
process.env.DATABASE_URL = "postgresql://test:test@example.invalid/test";
delete process.env.RESEND_API_KEY;
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
const destroyedAssets: string[] = [];
mock.method(cloudinary.uploader, "destroy", async (publicId: string) => {
  destroyedAssets.push(publicId);
  return { result: "ok" };
});
const queries: string[] = [];
const tokenHash = await bcrypt.hash("private-owner-token", 4);
neonConfig.fetchFunction = async (_url: unknown, init: RequestInit) => {
  const { query } = JSON.parse(String(init.body)) as { query: string };
  queries.push(query);
  let rows: Record<string, unknown>[] = [];
  if (/SELECT.*(?:claim_token_hash|cover_photo_url|custom_audio_url)/s.test(query)) {
    rows = [{ id: "guest-page", claim_token_hash: tokenHash, user_id: null, guest_email: "owner@example.com", cover_photo_url: null, custom_audio_url: null }];
  } else if (/INSERT INTO users/.test(query)) {
    rows = [{ id: "new-user", email: "new@example.com" }];
  }
  const names = Object.keys(rows[0] || {});
  return new Response(JSON.stringify({ fields: names.map((name) => ({ name, dataTypeID: 25 })), rows: rows.map((row) => names.map((name) => row[name])), rowCount: rows.length, command: "SELECT" }));
};
const { authRouter } = await import("./routes/auth");
const { handleCoverUpload, handleSoundtrackUpload } = await import("./routes/pages");
const { isAllowedOrigin } = await import("./services/requestUtils");
const app = express();
app.use(express.json());
app.use("/auth", authRouter);
app.post("/cover", (req, _res, next) => {
  req.file = { path: "https://res.cloudinary.com/test/image/upload/v1/test-cover.png" } as Express.Multer.File;
  next();
}, handleCoverUpload);
app.post("/soundtrack", (req, _res, next) => {
  req.file = { path: "https://res.cloudinary.com/test/video/upload/v1/test-soundtrack.mp3" } as Express.Multer.File;
  next();
}, handleSoundtrackUpload);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}`;
after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
const post = (path: string, body: object) => fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("unlisted Vercel sites cannot access credentialed API responses", () => {
  assert.equal(isAllowedOrigin("https://attacker.vercel.app", ["https://wishcanvas.app"]), false);
  assert.equal(isAllowedOrigin("https://my-preview.vercel.app", ["https://my-preview.vercel.app"]), true);
});

test("a public link without its private token cannot claim a guest canvas during signup", async () => {
  queries.length = 0;
  const response = await post("/auth/signup", { email: "new@example.com", password: "password123", publicCode: "public-link" });
  assert.equal(response.status, 403);
  assert.equal(queries.some((query) => /INSERT INTO users|UPDATE birthday_pages/.test(query)), false);
});

test("an invalid private token cannot claim a guest canvas during signup", async () => {
  const response = await post("/auth/signup", { email: "new@example.com", password: "password123", publicCode: "public-link", claimToken: "wrong" });
  assert.equal(response.status, 403);
});

test("a valid private token can claim its guest canvas during signup", async () => {
  queries.length = 0;
  const response = await post("/auth/signup", { email: "new@example.com", password: "password123", publicCode: "public-link", claimToken: "private-owner-token" });
  assert.equal(response.status, 201);
  assert.ok(queries.some((query) => /UPDATE birthday_pages/.test(query)));
});

test("an unverified email alone does not transfer guest canvas ownership", async () => {
  queries.length = 0;
  const response = await post("/auth/signup", { email: "owner@example.com", password: "password123" });
  assert.equal(response.status, 201);
  assert.equal(queries.some((query) => /UPDATE birthday_pages/.test(query)), false);
});

for (const path of ["/cover", "/soundtrack"]) {
  test(`${path} rejects guest media replacement without a private token`, async () => {
    destroyedAssets.length = 0;
    const response = await post(path, { pageId: "public-link" });
    assert.equal(response.status, 403);
    assert.equal(destroyedAssets.length, 1, "rejected upload must be removed from Cloudinary");
  });
  test(`${path} rejects guest media replacement with an invalid private token`, async () => {
    const response = await post(path, { pageId: "public-link", claimToken: "wrong" });
    assert.equal(response.status, 403);
  });
  test(`${path} accepts guest media replacement with the correct private token`, async () => {
    const response = await post(path, { pageId: "public-link", claimToken: "private-owner-token" });
    assert.equal(response.status, 200);
  });
}
