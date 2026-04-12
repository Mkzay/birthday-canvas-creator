import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const fragDir = path.join(root, "src/pages/birthday/experience/_fragments");
const fr = [
  "MobileStorySection.fragment.txt",
  "FreeformSection.fragment.txt",
  "DesktopStorySection.fragment.txt",
  "RevealIntroOverlay.fragment.txt",
  "BentoSections.fragment.txt",
]
  .map((f) => fs.readFileSync(path.join(fragDir, f), "utf8"))
  .join("\n");

const t = fs.readFileSync(path.join(root, "src/pages/BirthdayPage.tsx"), "utf8").split(/\r?\n/);

/** Top-level `const` in BirthdayPage body (two-space indent), excluding nested blocks (four+ spaces). */
function extractTopLevelBindings(lines, startLine, endLine) {
  const names = new Set();
  for (let i = startLine; i < endLine && i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("  const ")) continue;

    let m = line.match(/^  const \[([^\]]+)\]\s*=/);
    if (m) {
      m[1].split(",").forEach((part) => {
        const raw = part.trim();
        const name = raw.split(/\s+/)[0].split(":")[0];
        if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
      });
      continue;
    }

    m = line.match(/^  const \{([^}]+)\}\s*=\s*useParams/);
    if (m) {
      m[1].split(",").forEach((part) => {
        const seg = part.trim();
        const name = seg.split(/\s+/)[0].split(":")[0];
        if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
      });
      continue;
    }

    m = line.match(/^  const \{([^}]+)\}\s*=\s*useAuth/);
    if (m) {
      m[1].split(",").forEach((part) => {
        const seg = part.trim();
        const name = seg.split(/\s+/)[0].split(":")[0];
        if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
      });
      continue;
    }

    m = line.match(/^  const ([A-Za-z_$][\w$]*)\s*(?::[^=]+)?\s*=/);
    if (m) {
      names.add(m[1]);
    }
  }
  return names;
}

// BirthdayPage body: first top-level statement ~line 89 (index 88); main return with big tree ~2414 (index 2413).
const constNames = extractTopLevelBindings(t, 88, 2413);
constNames.add("isPreview");
constNames.add("showRevealIntroInPreview");

const identRe = /\b([A-Za-z_$][\w$]*)\b/g;
const used = new Set();
let m;
while ((m = identRe.exec(fr))) {
  const id = m[1];
  if (constNames.has(id)) used.add(id);
}

const expanded = new Set(used);
for (const name of constNames) {
  if (/^set[A-Z]/.test(name)) expanded.add(name);
}
expanded.add("isPreview");
expanded.add("showRevealIntroInPreview");

const sorted = [...expanded].sort();

console.log(sorted.join("\n"));
console.log("COUNT", sorted.length);
console.log("\n--- object ---\n");
console.log(
  `asBirthdayViewModel({\n${sorted.map((k) => `  ${k},`).join("\n")}\n})`,
);

fs.writeFileSync(path.join(__dirname, "birthday-vm-keys.json"), JSON.stringify(sorted, null, 2), "utf8");
