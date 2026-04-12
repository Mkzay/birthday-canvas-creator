import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fragDir = path.join(root, "src/pages/birthday/experience/_fragments");

const keysPath = path.join(__dirname, "birthday-vm-keys.json");
if (!fs.existsSync(keysPath)) {
  throw new Error("Run: node scripts/vm-keys.mjs (generates birthday-vm-keys.json)");
}
const keys = JSON.parse(fs.readFileSync(keysPath, "utf8"));

const header = `import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Mail,
  Music4,
  Share2,
  Download,
  SkipForward,
  Sparkles,
  Volume2,
  Trash2,
  Music,
  Image as ImageIcon,
  Video,
  Wallet,
  Gift,
  Check,
} from 'lucide-react';
import BentoGridView from '@/components/BentoGridView';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/api';
import { stripHtml, isRichHtml, sanitizeWishHtmlForDisplay, wishMessageHtmlWithQuotes } from '@/lib/wish-utils';
import {
  formatNairaNumberFromKobo,
  getMessagePhotos,
  getMobileSectionCaption,
  getMobileSectionLabel,
  getMobileSectionMarker,
  getMobileSectionTone,
  getStoryMotionDuration,
  STICKER_EMOJI_MAP,
} from '@/pages/birthday';
import type { Message, MessagePhoto } from '@/pages/birthday/types';
import { useBirthdayView } from '@/pages/birthday/view/BirthdayPageViewContext';
import FloatingParticles from '@/components/FloatingParticles';
`;

function dedentBlock(text, spacesToRemove) {
  return text
    .split("\n")
    .map((line) => (line.length >= spacesToRemove ? line.slice(spacesToRemove) : line))
    .join("\n");
}

function stripFreeformWrapper(text) {
  const lines = text.split("\n");
  let start = 0;
  if (lines[0]?.includes("effectiveViewMode === 'freeform'")) {
    start = 1;
  }
  let end = lines.length;
  while (end > start && lines[end - 1].trim() === "") end -= 1;
  if (lines[end - 1]?.trim() === ")}") {
    end -= 1;
  }
  return lines.slice(start, end).join("\n");
}

function makeComponent(name, fragmentFile, dedentSpaces, options = {}) {
  let body = fs.readFileSync(path.join(fragDir, fragmentFile), "utf8").trimEnd();
  if (options.stripFreeform) {
    body = stripFreeformWrapper(body);
  }
  body = dedentBlock(body, dedentSpaces);
  const destructure = `const {\n  ${keys.join(",\n  ")},\n} = useBirthdayView() as any;`;
  const inner = body
    .split("\n")
    .map((l) => `      ${l}`)
    .join("\n");
  return `${header}

export const ${name} = memo(function ${name}() {
  ${destructure}
  return (
    <>
${inner}
    </>
  );
});
`;
}

const outDir = path.join(root, "src/pages/birthday/experience");

fs.writeFileSync(
  path.join(outDir, "MobileStorySection.tsx"),
  makeComponent("MobileStorySection", "MobileStorySection.fragment.txt", 6),
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "FreeformSection.tsx"),
  makeComponent("FreeformSection", "FreeformSection.fragment.txt", 6, { stripFreeform: true }),
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "DesktopStorySection.tsx"),
  makeComponent("DesktopStorySection", "DesktopStorySection.fragment.txt", 6),
  "utf8",
);

// Reveal intro: fragment includes outer {showRevealIntro && ( — strip first two lines and last )}
let revealRaw = fs.readFileSync(path.join(fragDir, "RevealIntroOverlay.fragment.txt"), "utf8").trimEnd();
const revealLines = revealRaw.split("\n");
// Remove line 0-1 if they are {showRevealIntro && ( and spaces
let startIdx = 0;
if (revealLines[0].includes("showRevealIntro")) startIdx = 1;
revealRaw = revealLines.slice(startIdx).join("\n");
// Remove trailing `)}`
revealRaw = revealRaw.replace(/\s*\)\}\s*$/, "");
revealRaw = dedentBlock(revealRaw, 6);

const revealInner = revealRaw
  .split("\n")
  .map((l) => `      ${l}`)
  .join("\n");

const revealComp = `${header}

export const RevealIntroOverlay = memo(function RevealIntroOverlay() {
  const {\n  ${keys.join(",\n  ")},\n} = useBirthdayView() as any;
  return (
    <>
${revealInner}
    </>
  );
});
`;

fs.writeFileSync(path.join(outDir, "RevealIntroOverlay.tsx"), revealComp, "utf8");

const bentoRaw = dedentBlock(
  fs.readFileSync(path.join(fragDir, "BentoSections.fragment.txt"), "utf8").trimEnd(),
  6,
);
const bentoInner = bentoRaw
  .split("\n")
  .map((l) => `      ${l}`)
  .join("\n");

const bentoComp = `${header}

export const BentoStorySections = memo(function BentoStorySections() {
  const {\n  ${keys.join(",\n  ")},\n} = useBirthdayView() as any;
  return (
    <>
${bentoInner}
    </>
  );
});
`;

fs.writeFileSync(path.join(outDir, "BentoStorySections.tsx"), bentoComp, "utf8");

console.log("Wrote experience components to", outDir);
