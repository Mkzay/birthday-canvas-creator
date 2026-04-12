import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src", "pages", "BirthdayPage.tsx");
const lines = fs.readFileSync(src, "utf8").split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

// Line numbers are 1-based inclusive start, inclusive end (from current BirthdayPage.tsx)
const blocks = {
  "RevealIntroOverlay.fragment.txt": [2454, 2725],
  "MobileStorySection.fragment.txt": [2727, 3138],
  "BentoSections.fragment.txt": [3140, 3168],
  "FreeformSection.fragment.txt": [3170, 3893],
  "DesktopStorySection.fragment.txt": [3895, 4630],
};

const outDir = path.join(root, "src", "pages", "birthday", "experience", "_fragments");
fs.mkdirSync(outDir, { recursive: true });

for (const [name, [a, b]] of Object.entries(blocks)) {
  fs.writeFileSync(path.join(outDir, name), slice(a, b), "utf8");
  console.log("wrote", name, "lines", b - a + 1);
}
