import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const metaContent = fs.readFileSync(path.resolve("server/routes/meta.ts"), "utf8");

// 1. Validate & generate /og-image-app SVG
const appSvgMatch = metaContent.match(/metaRouter\.get\("\/og-image-app"[\s\S]*?const svg = `(<svg[\s\S]*?<\/svg>)`/);
if (!appSvgMatch) {
  throw new Error("Could not find /og-image-app SVG");
}

const appSvg = appSvgMatch[1];
const pngBuffer = await sharp(Buffer.from(appSvg)).png({ quality: 92, compressionLevel: 9 }).toBuffer();
const metadata = await sharp(pngBuffer).metadata();
console.log(`[1/3] /og-image-app -> public/og-image.png: ${metadata.width}x${metadata.height}, format=${metadata.format}, size=${pngBuffer.length} bytes`);
fs.writeFileSync(path.resolve("public/og-image.png"), pngBuffer);

// 2. Validate buildCoverOgImageBuffer overlay SVG
const overlaySvgMatch = metaContent.match(/const overlay = `(<svg[\s\S]*?<\/svg>)`/);
if (!overlaySvgMatch) {
  throw new Error("Could not find buildCoverOgImageBuffer overlay SVG");
}
const overlaySvg = overlaySvgMatch[1]
  .replace(/\$\{meta\.isContribute \? "INVITATION TO CONTRIBUTE" : "BIRTHDAY STORY REVEAL"\}/g, "BIRTHDAY STORY REVEAL")
  .replace(/\$\{headline\}/g, "Happy Birthday, Maya!")
  .replace(/\$\{subline\}/g, "12 wishes collected. Open to start the birthday story.")
  .replace(/\$\{countStr\}/g, "12");
const overlayPng = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
console.log(`[2/3] buildCoverOgImageBuffer overlay SVG valid: ${overlayPng.length} bytes`);

// 3. Validate /og-image/:id SVG
const pageSvgMatch = metaContent.match(/metaRouter\.get\("\/og-image\/:id"[\s\S]*?const svg = `(<svg[\s\S]*?<\/svg>)`/);
if (!pageSvgMatch) {
  throw new Error("Could not find /og-image/:id SVG");
}
const pageSvg = pageSvgMatch[1]
  .replace(/\$\{colorFrom\}/g, "#f59e0b")
  .replace(/\$\{colorTo\}/g, "#f97316")
  .replace(/\$\{isContribute \? "INVITATION TO CONTRIBUTE" : "A COLLABORATIVE CELEBRATION"\}/g, "A COLLABORATIVE CELEBRATION")
  .replace(/\$\{headline\}/g, "Happy Birthday, Maya!")
  .replace(/\$\{subline\}/g, "12 heartfelt wishes and memories collected.")
  .replace(/\$\{isContribute \? "Click to add your personal message or voice note\." : "Open the letter to reveal the full birthday story\."\}/g, "Open the letter to reveal the full birthday story.")
  .replace(/\$\{countStr\}/g, "12")
  .replace(/\$\{safeName\}/g, "Maya")
  .replace(/\$\{isContribute \? "Tap to Add Your Wish" : "Tap to Open Celebration"\}/g, "Tap to Open Celebration");
const pagePng = await sharp(Buffer.from(pageSvg)).png().toBuffer();
console.log(`[3/3] /og-image/:id SVG valid: ${pagePng.length} bytes`);
