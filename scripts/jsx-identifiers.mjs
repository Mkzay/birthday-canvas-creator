import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fragDir = path.join(__dirname, "../src/pages/birthday/experience/_fragments");
const files = fs.readdirSync(fragDir).filter((f) => f.endsWith(".fragment.txt"));

const reserved = new Set([
  "div", "span", "p", "h1", "h2", "h3", "button", "img", "section", "article", "br", "svg", "path", "iframe",
  "className", "style", "onClick", "onMouseEnter", "onMouseLeave", "onTouchStart", "onTouchEnd", "onPointerDown",
  "type", "key", "ref", "aria", "src", "alt", "width", "height", "fill", "stroke", "viewBox", "xmlns",
  "true", "false", "null", "undefined", "return", "const", "let", "var", "if", "else", "map", "filter",
  "length", "from", "to", "Date", "Math", "String", "Number", "Boolean", "Object", "Array",
  "React", "Fragment", "cn", "format", "DOMPurify", "Link", "Button", "BentoGridView", "BirthdayShareCard",
  "AlertDialog", "WishCanvasLoader", "BirthdayCountdown", "FloatingParticles", "AnimatedBackground", "DecorativeLayer",
  "MobileVoiceNoteControl", "Loader2", "Check", "Gift", "Wallet", "Video", "Music", "Music4", "ImageIcon",
  "Sparkles", "Share2", "Download", "Volume2", "Heart", "Mail", "ChevronLeft", "ChevronRight", "SkipForward", "Trash2",
]);

const identRe = /\b([A-Za-z_$][\w$]*)\b/g;
const ids = new Set();
for (const f of files) {
  const t = fs.readFileSync(path.join(fragDir, f), "utf8");
  let m;
  while ((m = identRe.exec(t))) {
    const id = m[1];
    if (reserved.has(id) || id.length <= 1) continue;
    ids.add(id);
  }
}

const sorted = [...ids].sort();
console.log(sorted.join("\n"));
console.log("COUNT", sorted.length);
