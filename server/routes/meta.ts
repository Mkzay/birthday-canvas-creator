import express from "express";
import sharp from "sharp";
import { validateParams } from "../validateRequest";
import { pageIdParamSchema } from "../schemas";
import { resolvePageId, publicPageQuery } from "../services/pageQueries";
import { routeParamString, escapeHtml } from "../services/requestUtils";

export const metaRouter = express.Router();

const themeGradientColors: Record<string, [string, string]> = {
  elegant: ["#f59e0b", "#f97316"],
  playful: ["#ec4899", "#a855f7"],
  minimalist: ["#475569", "#1e293b"],
  retro: ["#22d3ee", "#a855f7"],
  tropical: ["#4ade80", "#10b981"],
  cosmic: ["#8b5cf6", "#4f46e5"],
  sunset: ["#fb923c", "#f43f5e"],
  ocean: ["#38bdf8", "#06b6d4"],
  candyland: ["#f472b6", "#a855f7"],
  midnight: ["#6366f1", "#7c3aed"],
};

export function resolveThemeColors(page: Record<string, unknown>): [string, string] {
  const theme = String(page.theme || "elegant");
  if (theme.startsWith("custom_") && page.theme_gradient_from && page.theme_gradient_to) {
    return [String(page.theme_gradient_from), String(page.theme_gradient_to)];
  }
  return themeGradientColors[theme] || themeGradientColors.elegant;
}

export function toAbsoluteAssetUrl(value: string, apiBase: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${apiBase}${value.startsWith("/") ? "" : "/"}${value}`;
}

export async function buildCoverOgImageBuffer(
  coverUrl: string,
  meta: { recipientName: string; messageCount: number; isContribute: boolean }
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const result = await fetch(coverUrl, {
      redirect: "follow",
      signal: controller.signal,
    });

    if (!result.ok) {
      return null;
    }

    const sourceBuffer = Buffer.from(await result.arrayBuffer());

    const baseImage = await sharp(sourceBuffer)
      .rotate()
      .resize(1200, 630, {
        fit: "cover",
        position: "attention",
      })
      .toBuffer();

    const safeName = escapeHtml(meta.recipientName.length > 22 ? `${meta.recipientName.slice(0, 20)}…` : meta.recipientName);
    const countStr = Number(meta.messageCount) || 0;
    const headline = meta.isContribute ? `Add your wish for ${safeName}` : `Happy Birthday, ${safeName}!`;
    const subline = meta.isContribute
      ? "Join the celebration and drop a heartfelt wish or voice note."
      : `${countStr} ${countStr === 1 ? "wish" : "wishes"} collected. Open to start the birthday story.`;

    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="photoScrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a0518" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#0e0720" stop-opacity="0.80" />
      <stop offset="85%" stop-color="#0a0518" stop-opacity="0.55" />
      <stop offset="100%" stop-color="#0a0518" stop-opacity="0.75" />
    </linearGradient>
    <linearGradient id="verticalVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.4" />
      <stop offset="50%" stop-color="#000000" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
    </linearGradient>
    <linearGradient id="waxSeal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e11d48" />
      <stop offset="50%" stop-color="#be123c" />
      <stop offset="100%" stop-color="#881337" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <style>
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  </style>

  <rect width="1200" height="630" fill="url(#photoScrim)" />
  <rect width="1200" height="630" fill="url(#verticalVignette)" />
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="rgba(255, 255, 255, 0.22)" stroke-width="1.5" />

  <!-- Top Brand Pill -->
  <g transform="translate(68, 68)">
    <rect width="190" height="40" rx="20" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" />
    <path d="M22 11 Q22 20 13 20 Q22 20 22 29 Q22 20 31 20 Q22 20 22 11 Z" fill="#fbbf24" />
    <text x="38" y="26" class="font-sans" font-size="16" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">WishCanvas</text>
  </g>

  <!-- Main Headline -->
  <g transform="translate(68, 220)">
    <text x="0" y="0" class="font-sans" font-size="20" font-weight="700" fill="#fbbf24" letter-spacing="0.06em" text-transform="uppercase">
      ${meta.isContribute ? "INVITATION TO CONTRIBUTE" : "BIRTHDAY STORY REVEAL"}
    </text>
    <text x="0" y="60" class="font-sans" font-size="56" font-weight="900" fill="#ffffff" letter-spacing="-0.035em" filter="url(#shadow)">
      ${headline}
    </text>
    <text x="0" y="118" class="font-sans" font-size="22" font-weight="500" fill="#e2e8f0" opacity="0.95">
      ${subline}
    </text>
  </g>

  <!-- Badges Row -->
  <g transform="translate(68, 410)">
    <g transform="translate(0, 0)">
      <rect width="180" height="42" rx="21" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" />
      <g transform="translate(18, 12)">
        <rect x="2" y="3" width="14" height="11" rx="2" fill="none" stroke="#ffffff" stroke-width="1.4"/>
        <polyline points="2,4 9,9.5 16,4" fill="none" stroke="#ffffff" stroke-width="1.4"/>
      </g>
      <text x="44" y="27" class="font-sans" font-size="15" font-weight="700" fill="#ffffff">${countStr} Wishes</text>
    </g>
    <g transform="translate(196, 0)">
      <rect width="180" height="42" rx="21" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" />
      <g transform="translate(18, 12)">
        <rect x="4" y="2" width="6" height="8" rx="3" fill="#fbbf24"/>
        <path d="M2 7 A5 5 0 0 0 12 7" stroke="#fbbf24" stroke-width="1.4" fill="none"/>
        <line x1="7" y1="12" x2="7" y2="15" stroke="#fbbf24" stroke-width="1.4"/>
      </g>
      <text x="40" y="27" class="font-sans" font-size="15" font-weight="700" fill="#fbbf24">Voice Notes</text>
    </g>
  </g>

  <!-- Wax Seal Right Decoration -->
  <g transform="translate(1030, 490)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="44" fill="url(#waxSeal)" />
    <circle cx="0" cy="0" r="39" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1.5" />
    <circle cx="0" cy="0" r="33" fill="#9f1239" />
    <path d="M 0 -17 L 5 -5 L 18 -5 L 8 4 L 12 17 L 0 10 L -12 17 L -8 4 L -18 -5 L -5 -5 Z" fill="#fbbf24" />
  </g>

  <!-- Bottom Link Pill -->
  <g transform="translate(68, 514)">
    <text x="0" y="0" class="font-sans" font-size="16" font-weight="600" fill="#cbd5e1">
      wishcanvas.app : Tap to view the celebration story &rarr;
    </text>
  </g>
</svg>`;

    return await sharp(baseImage)
      .composite([{ input: Buffer.from(overlay), blend: "over" }])
      .png({ quality: 96 })
      .toBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ----------------------------------------------------
// GET /api/og-image-app (General app preview)
// ----------------------------------------------------
metaRouter.get("/og-image-app", async (_request, response) => {
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c071e" />
      <stop offset="45%" stop-color="#180b33" />
      <stop offset="100%" stop-color="#090514" />
    </linearGradient>

    <radialGradient id="glowViolet" cx="85%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowRose" cx="20%" cy="80%" r="55%">
      <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.32" />
      <stop offset="50%" stop-color="#e11d48" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowAmber" cx="50%" cy="0%" r="40%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.12)" />
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0.03)" />
    </linearGradient>

    <linearGradient id="cardBorder" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.35)" />
      <stop offset="50%" stop-color="rgba(244, 63, 94, 0.3)" />
      <stop offset="100%" stop-color="rgba(168, 85, 247, 0.25)" />
    </linearGradient>

    <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#fbbf24" />
      <stop offset="80%" stop-color="#fb923c" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>

    <linearGradient id="envelopeBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="100%" stop-color="#fef3c7" />
    </linearGradient>

    <linearGradient id="envelopeFlap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>

    <linearGradient id="waxSeal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e11d48" />
      <stop offset="50%" stop-color="#be123c" />
      <stop offset="100%" stop-color="#881337" />
    </linearGradient>

    <linearGradient id="badgeBorder" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>

    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45" />
    </filter>

    <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.3" />
    </filter>

    <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#fbbf24" flood-opacity="0.6" />
    </filter>
  </defs>

  <style>
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-serif { font-family: "Georgia", "Times New Roman", serif; }
  </style>

  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#glowViolet)" />
  <rect width="1200" height="630" fill="url(#glowRose)" />
  <rect width="1200" height="630" fill="url(#glowAmber)" />

  <g fill="#fbbf24" opacity="0.75" filter="url(#glowGold)">
    <path d="M120 70 Q120 86 104 86 Q120 86 120 102 Q120 86 136 86 Q120 86 120 70 Z" />
    <path d="M580 82 Q580 94 568 94 Q580 94 580 106 Q580 94 592 94 Q580 94 580 82 Z" opacity="0.6" />
    <path d="M1120 90 Q1120 104 1106 104 Q1120 104 1120 118 Q1120 104 1134 104 Q1120 104 1120 90 Z" />
    <path d="M680 540 Q680 550 670 550 Q680 550 680 560 Q680 550 690 550 Q680 550 680 540 Z" opacity="0.5" />
    <path d="M70 520 Q70 532 58 532 Q70 532 70 544 Q70 532 82 532 Q70 532 70 520 Z" opacity="0.4" />
  </g>

  <circle cx="160" cy="200" r="4" fill="#f43f5e" opacity="0.6" />
  <circle cx="240" cy="90" r="3" fill="#a855f7" opacity="0.5" />
  <circle cx="520" cy="210" r="4" fill="#fbbf24" opacity="0.5" />
  <circle cx="480" cy="560" r="3.5" fill="#38bdf8" opacity="0.6" />
  <rect x="640" y="70" width="8" height="5" rx="2" fill="#fb923c" opacity="0.6" transform="rotate(24 640 70)" />
  <rect x="1080" y="470" width="10" height="6" rx="2" fill="#f43f5e" opacity="0.5" transform="rotate(-35 1080 470)" />
  <rect x="1140" y="320" width="8" height="5" rx="2" fill="#a855f7" opacity="0.5" transform="rotate(45 1140 320)" />

  <!-- LEFT COLUMN: BRAND & VALUE PROP -->
  <g transform="translate(84, 0)">
    <!-- Brand Pill -->
    <g transform="translate(0, 78)">
      <rect width="216" height="42" rx="21" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1.2" />
      <path d="M26 12 Q26 21 17 21 Q26 21 26 30 Q26 21 35 21 Q26 21 26 12 Z" fill="#fbbf24" />
      <text x="44" y="27" class="font-sans" font-size="18" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">WishCanvas</text>
      <rect x="156" y="9" width="48" height="24" rx="12" fill="rgba(251, 191, 36, 0.18)" stroke="#fbbf24" stroke-width="1" />
      <text x="180" y="25" text-anchor="middle" class="font-sans" font-size="11" font-weight="700" fill="#fbbf24">PRO</text>
    </g>

    <!-- Main Headline -->
    <g transform="translate(0, 190)">
      <text x="0" y="0" class="font-sans" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-0.035em">
        Turn birthday wishes
      </text>
      <text x="0" y="62" class="font-sans" font-size="52" font-weight="900" fill="url(#goldText)" letter-spacing="-0.035em">
        into a reveal story.
      </text>
    </g>

    <!-- Subtitle / Value Statement -->
    <g transform="translate(0, 310)">
      <text x="0" y="0" class="font-sans" font-size="20" font-weight="500" fill="#cbd5e1" opacity="0.95">
        Collect heartfelt voice notes, photo memories, and sealed
      </text>
      <text x="0" y="30" class="font-sans" font-size="20" font-weight="500" fill="#cbd5e1" opacity="0.95">
        letters from friends. Revealed together in a midnight story.
      </text>
    </g>

    <!-- Feature Tags -->
    <g transform="translate(0, 404)">
      <!-- Pill 1: Voice Notes -->
      <g transform="translate(0, 0)">
        <rect width="144" height="38" rx="19" fill="rgba(255, 255, 255, 0.07)" stroke="rgba(255, 255, 255, 0.16)" stroke-width="1" />
        <g transform="translate(18, 10)">
          <rect x="4" y="2" width="6" height="8" rx="3" fill="#fb7185"/>
          <path d="M2 7 A5 5 0 0 0 12 7" stroke="#fb7185" stroke-width="1.4" fill="none"/>
          <line x1="7" y1="12" x2="7" y2="15" stroke="#fb7185" stroke-width="1.4"/>
        </g>
        <text x="44" y="24" class="font-sans" font-size="14" font-weight="600" fill="#f1f5f9">Voice Notes</text>
      </g>

      <!-- Pill 2: Photo Wall -->
      <g transform="translate(156, 0)">
        <rect width="144" height="38" rx="19" fill="rgba(255, 255, 255, 0.07)" stroke="rgba(255, 255, 255, 0.16)" stroke-width="1" />
        <g transform="translate(18, 10)">
          <path d="M2 5 A2 2 0 0 1 4 3 L5 3 L6 1 L10 1 L11 3 L12 3 A2 2 0 0 1 14 5 L14 11 A2 2 0 0 1 12 13 L4 13 A2 2 0 0 1 2 11 Z" fill="none" stroke="#f1f5f9" stroke-width="1.3"/>
          <circle cx="8" cy="8" r="2.5" stroke="#f1f5f9" stroke-width="1.3" fill="none"/>
        </g>
        <text x="44" y="24" class="font-sans" font-size="14" font-weight="600" fill="#f1f5f9">Photo Wall</text>
      </g>

      <!-- Pill 3: Wax Sealed -->
      <g transform="translate(312, 0)">
        <rect width="144" height="38" rx="19" fill="rgba(255, 255, 255, 0.07)" stroke="rgba(255, 255, 255, 0.16)" stroke-width="1" />
        <g transform="translate(18, 10)">
          <rect x="2" y="3" width="14" height="11" rx="2" fill="none" stroke="#f1f5f9" stroke-width="1.3"/>
          <polyline points="2,4 9,9.5 16,4" fill="none" stroke="#f1f5f9" stroke-width="1.3"/>
        </g>
        <text x="44" y="24" class="font-sans" font-size="14" font-weight="600" fill="#f1f5f9">Wax Sealed</text>
      </g>
    </g>

    <!-- Social Proof & Call to Action -->
    <g transform="translate(0, 498)">
      <circle cx="14" cy="14" r="5" fill="#22c55e" />
      <circle cx="14" cy="14" r="9" fill="none" stroke="#22c55e" stroke-opacity="0.4" stroke-width="1.5" />
      <text x="32" y="19" class="font-sans" font-size="16" font-weight="600" fill="#94a3b8">
        Free collaborative birthday pages : No app download required
      </text>
      <text x="32" y="44" class="font-sans" font-size="15" font-weight="700" fill="#fbbf24">
        Create yours at wishcanvas.app &rarr;
      </text>
    </g>
  </g>

  <!-- RIGHT COLUMN: THE CELEBRATION MOCKUP -->
  <g transform="translate(710, 80)">
    <g filter="url(#dropShadow)">
      <rect x="0" y="0" width="410" height="470" rx="32" fill="url(#cardBg)" stroke="url(#cardBorder)" stroke-width="1.5" />
    </g>

    <path d="M 0 32 Q 0 0 32 0 L 378 0 Q 410 0 410 32 L 410 140 L 0 80 Z" fill="rgba(255, 255, 255, 0.06)" rx="32" />

    <!-- Recipient Header Pill -->
    <g transform="translate(28, 28)">
      <rect width="354" height="64" rx="20" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
      <circle cx="34" cy="32" r="18" fill="#f43f5e" stroke="#180b33" stroke-width="2" />
      <text x="34" y="37" text-anchor="middle" class="font-sans" font-size="14" font-weight="700" fill="#ffffff">A</text>
      <circle cx="56" cy="32" r="18" fill="#8b5cf6" stroke="#180b33" stroke-width="2" />
      <text x="56" y="37" text-anchor="middle" class="font-sans" font-size="14" font-weight="700" fill="#ffffff">M</text>
      <circle cx="78" cy="32" r="18" fill="#38bdf8" stroke="#180b33" stroke-width="2" />
      <text x="78" y="37" text-anchor="middle" class="font-sans" font-size="14" font-weight="700" fill="#ffffff">K</text>
      
      <text x="110" y="27" class="font-sans" font-size="14" font-weight="700" fill="#f8fafc">Happy Birthday, Maya!</text>
      <text x="110" y="46" class="font-sans" font-size="12" font-weight="500" fill="#94a3b8">24 friends contributed wishes</text>
    </g>

    <!-- Sealed Parchment Envelope -->
    <g transform="translate(32, 114)" filter="url(#softShadow)">
      <rect width="346" height="190" rx="18" fill="url(#envelopeBg)" stroke="#fde68a" stroke-width="1.5" />
      <path d="M 0 190 L 173 105 L 346 190 Z" fill="#fef08a" opacity="0.45" />
      <path d="M 0 0 L 173 105 L 346 0 Z" fill="url(#envelopeFlap)" stroke="#fde68a" stroke-width="1" />

      <g transform="translate(30, 24)">
        <text x="0" y="0" class="font-serif" font-size="17" font-weight="bold" fill="#78350f" font-style="italic">
          &quot;Maya, you bring so much joy
        </text>
        <text x="0" y="24" class="font-serif" font-size="17" font-weight="bold" fill="#78350f" font-style="italic">
          to everyone around you...&quot;
        </text>
      </g>

      <g transform="translate(173, 105)" filter="url(#dropShadow)">
        <circle cx="0" cy="0" r="32" fill="url(#waxSeal)" />
        <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1.5" />
        <circle cx="0" cy="0" r="23" fill="#9f1239" />
        <path d="M 0 -12 L 4 -3 L 13 -3 L 6 3 L 9 12 L 0 7 L -9 12 L -6 3 L -13 -3 L -4 -3 Z" fill="#fbbf24" />
      </g>
    </g>

    <!-- Floating Audio Note Pill -->
    <g transform="translate(20, 324)" filter="url(#dropShadow)">
      <rect width="370" height="66" rx="20" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(244, 63, 94, 0.5)" stroke-width="1.5" />
      <circle cx="34" cy="33" r="18" fill="#f43f5e" />
      <polygon points="30,25 42,33 30,41" fill="#ffffff" />
      
      <g transform="translate(68, 33)">
        <rect x="0" y="-8" width="4" height="16" rx="2" fill="#fb7185" />
        <rect x="8" y="-15" width="4" height="30" rx="2" fill="#f43f5e" />
        <rect x="16" y="-22" width="4" height="44" rx="2" fill="#fbbf24" />
        <rect x="24" y="-12" width="4" height="24" rx="2" fill="#fb7185" />
        <rect x="32" y="-18" width="4" height="36" rx="2" fill="#f43f5e" />
        <rect x="40" y="-24" width="4" height="48" rx="2" fill="#fbbf24" />
        <rect x="48" y="-14" width="4" height="28" rx="2" fill="#fb7185" />
        <rect x="56" y="-8" width="4" height="16" rx="2" fill="#f43f5e" />
        <rect x="64" y="-16" width="4" height="32" rx="2" fill="#fbbf24" />
        <rect x="72" y="-20" width="4" height="40" rx="2" fill="#f43f5e" />
        <rect x="80" y="-10" width="4" height="20" rx="2" fill="#fb7185" />
        <rect x="88" y="-5" width="4" height="10" rx="2" fill="#f43f5e" />
      </g>

      <text x="178" y="28" class="font-sans" font-size="13" font-weight="700" fill="#f8fafc">Mom &amp; Dad</text>
      <text x="178" y="47" class="font-sans" font-size="12" font-weight="600" fill="#94a3b8">Voice Note : 0:42</text>

      <rect x="290" y="19" width="64" height="28" rx="14" fill="rgba(244, 63, 94, 0.2)" stroke="#f43f5e" stroke-width="1" />
      <text x="322" y="37" text-anchor="middle" class="font-sans" font-size="11" font-weight="700" fill="#fb7185">PLAY</text>
    </g>

    <!-- Floating Reveal Pill -->
    <g transform="translate(68, 412)" filter="url(#dropShadow)">
      <rect width="274" height="40" rx="20" fill="url(#badgeBorder)" />
      <rect x="1.5" y="1.5" width="271" height="37" rx="18.5" fill="#180b33" />
      <text x="137" y="25" text-anchor="middle" class="font-sans" font-size="13" font-weight="700" fill="#fbbf24">
        Unlocks at Midnight Birthday Reveal
      </text>
    </g>
  </g>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 96 }).toBuffer();
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(pngBuffer);
  } catch {
    response.status(500).send("Error generating image");
  }
});

// ----------------------------------------------------
// GET /api/og-image/:id (Page specific OG preview image)
// ----------------------------------------------------
metaRouter.get("/og-image/:id", validateParams(pageIdParamSchema), async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) { response.status(404).send("Not found"); return; }

    const rows = await publicPageQuery(resolvedPageId);
    const page = rows[0];
    if (!page) { response.status(404).send("Not found"); return; }

    const [colorFrom, colorTo] = resolveThemeColors(page);
    const apiBase = process.env.API_URL || `${request.protocol}://${request.get("host")}`;
    const coverPhoto = typeof page.cover_photo_url === "string" ? page.cover_photo_url : "";
    const normalizedCover = toAbsoluteAssetUrl(coverPhoto, apiBase);
    const isContribute = request.query.view === "contribute";
    const recipientName = String(page.recipient_name || "Someone special");
    const messageCount = Number(page.message_count || 0);

    if (normalizedCover) {
      const coverPng = await buildCoverOgImageBuffer(normalizedCover, {
        recipientName,
        messageCount,
        isContribute,
      });
      if (coverPng) {
        response.setHeader("Content-Type", "image/png");
        response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
        response.send(coverPng);
        return;
      }
    }

    const safeName = escapeHtml(recipientName.length > 22 ? `${recipientName.slice(0, 20)}…` : recipientName);
    const countStr = Number(messageCount) || 0;
    const headline = isContribute ? `Add your wish for ${safeName}` : `Happy Birthday, ${safeName}!`;
    const subline = isContribute
      ? "Join the celebration. Drop a voice note, photo, or message."
      : `${countStr} ${countStr === 1 ? "heartfelt wish" : "heartfelt wishes"} and memories collected.`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="themeBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090514" />
      <stop offset="35%" stop-color="#140b2a" />
      <stop offset="100%" stop-color="#06030c" />
    </linearGradient>

    <radialGradient id="glowTheme1" cx="80%" cy="25%" r="65%">
      <stop offset="0%" stop-color="${colorTo}" stop-opacity="0.45" />
      <stop offset="60%" stop-color="${colorTo}" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowTheme2" cx="20%" cy="75%" r="60%">
      <stop offset="0%" stop-color="${colorFrom}" stop-opacity="0.4" />
      <stop offset="55%" stop-color="${colorFrom}" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="glassCard" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.12)" />
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0.03)" />
    </linearGradient>

    <linearGradient id="borderTheme" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.4)" />
      <stop offset="50%" stop-color="${colorFrom}" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${colorTo}" stop-opacity="0.4" />
    </linearGradient>

    <linearGradient id="envelopeSheet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="100%" stop-color="#fef3c7" />
    </linearGradient>

    <linearGradient id="waxSealGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e11d48" />
      <stop offset="50%" stop-color="#be123c" />
      <stop offset="100%" stop-color="#881337" />
    </linearGradient>

    <filter id="shadowLarge" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.5" />
    </filter>
    <filter id="shadowSmall" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <style>
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-serif { font-family: "Georgia", "Times New Roman", serif; }
  </style>

  <rect width="1200" height="630" fill="url(#themeBg)" />
  <rect width="1200" height="630" fill="url(#glowTheme1)" />
  <rect width="1200" height="630" fill="url(#glowTheme2)" />

  <g fill="#fbbf24" opacity="0.6">
    <path d="M140 80 Q140 94 126 94 Q140 94 140 108 Q140 94 154 94 Q140 94 140 80 Z" />
    <path d="M620 90 Q620 100 610 100 Q620 100 620 110 Q620 100 630 100 Q620 100 620 90 Z" opacity="0.5" />
    <path d="M1100 110 Q1100 122 1088 122 Q1100 122 1100 134 Q1100 122 1112 122 Q1100 122 1100 110 Z" />
    <path d="M80 520 Q80 530 70 530 Q80 530 80 540 Q80 530 90 530 Q80 530 80 520 Z" opacity="0.4" />
  </g>

  <!-- LEFT COLUMN -->
  <g transform="translate(84, 0)">
    <g transform="translate(0, 80)">
      <rect width="190" height="40" rx="20" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.2" />
      <path d="M22 11 Q22 20 13 20 Q22 20 22 29 Q22 20 31 20 Q22 20 22 11 Z" fill="#fbbf24" />
      <text x="38" y="26" class="font-sans" font-size="16" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">WishCanvas</text>
      <circle cx="160" cy="20" r="4" fill="${colorFrom}" />
    </g>

    <g transform="translate(0, 185)">
      <text x="0" y="0" class="font-sans" font-size="20" font-weight="700" fill="#fbbf24" letter-spacing="0.04em" text-transform="uppercase">
        ${isContribute ? "INVITATION TO CONTRIBUTE" : "A COLLABORATIVE CELEBRATION"}
      </text>
      <text x="0" y="58" class="font-sans" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-0.035em">
        ${headline}
      </text>
    </g>

    <g transform="translate(0, 310)">
      <text x="0" y="0" class="font-sans" font-size="21" font-weight="500" fill="#cbd5e1" opacity="0.95">
        ${subline}
      </text>
      <text x="0" y="32" class="font-sans" font-size="21" font-weight="500" fill="#cbd5e1" opacity="0.95">
        ${isContribute ? "Click to add your personal message or voice note." : "Open the letter to reveal the full birthday story."}
      </text>
    </g>

    <g transform="translate(0, 410)">
      <g transform="translate(0, 0)">
        <rect width="186" height="42" rx="21" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.2" />
        <g transform="translate(18, 12)">
          <rect x="2" y="3" width="14" height="11" rx="2" fill="none" stroke="#f8fafc" stroke-width="1.4"/>
          <polyline points="2,4 9,9.5 16,4" fill="none" stroke="#f8fafc" stroke-width="1.4"/>
        </g>
        <text x="44" y="27" class="font-sans" font-size="15" font-weight="700" fill="#f8fafc">${countStr} Wishes Added</text>
      </g>
      <g transform="translate(202, 0)">
        <rect width="176" height="42" rx="21" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.2" />
        <path d="M22 13 Q22 20 15 20 Q22 20 22 27 Q22 20 29 20 Q22 20 22 13 Z" fill="#fbbf24" />
        <text x="36" y="27" class="font-sans" font-size="15" font-weight="700" fill="#fbbf24">Midnight Reveal</text>
      </g>
    </g>

    <g transform="translate(0, 508)">
      <text x="0" y="0" class="font-sans" font-size="16" font-weight="600" fill="#94a3b8">
        wishcanvas.app : Celebrate together from anywhere
      </text>
    </g>
  </g>

  <!-- RIGHT COLUMN: THE KEEPSAKE MOCKUP -->
  <g transform="translate(710, 80)">
    <g filter="url(#shadowLarge)">
      <rect x="0" y="0" width="410" height="470" rx="32" fill="url(#glassCard)" stroke="url(#borderTheme)" stroke-width="1.5" />
    </g>

    <g transform="translate(28, 28)">
      <rect width="354" height="64" rx="20" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
      <circle cx="34" cy="32" r="18" fill="${colorFrom}" />
      <path d="M34 22 L36 29 L43 29 L37 34 L39 41 L34 37 L29 41 L31 34 L25 29 L32 29 Z" fill="#ffffff" />
      <text x="64" y="28" class="font-sans" font-size="15" font-weight="700" fill="#f8fafc">For ${safeName}</text>
      <text x="64" y="47" class="font-sans" font-size="12" font-weight="500" fill="#94a3b8">Collaborative Birthday Keepsake</text>
    </g>

    <g transform="translate(32, 114)" filter="url(#shadowSmall)">
      <rect width="346" height="190" rx="18" fill="url(#envelopeSheet)" stroke="#fde68a" stroke-width="1.5" />
      <path d="M 0 190 L 173 105 L 346 190 Z" fill="#fef08a" opacity="0.4" />
      <path d="M 0 0 L 173 105 L 346 0 Z" fill="#fef3c7" stroke="#fde68a" stroke-width="1" />

      <g transform="translate(173, 56)">
        <text x="0" y="0" text-anchor="middle" class="font-serif" font-size="20" font-weight="bold" fill="#78350f" font-style="italic">
          To Dearest ${safeName}
        </text>
      </g>

      <g transform="translate(173, 105)" filter="url(#shadowLarge)">
        <circle cx="0" cy="0" r="32" fill="url(#waxSealGrad)" />
        <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1.5" />
        <circle cx="0" cy="0" r="23" fill="#9f1239" />
        <path d="M 0 -12 L 4 -3 L 13 -3 L 6 3 L 9 12 L 0 7 L -9 12 L -6 3 L -13 -3 L -4 -3 Z" fill="#fbbf24" />
      </g>
    </g>

    <g transform="translate(20, 324)" filter="url(#shadowLarge)">
      <rect width="370" height="66" rx="20" fill="rgba(15, 23, 42, 0.94)" stroke="${colorFrom}" stroke-opacity="0.5" stroke-width="1.5" />
      <circle cx="34" cy="33" r="18" fill="${colorFrom}" />
      <polygon points="30,25 42,33 30,41" fill="#ffffff" />
      
      <g transform="translate(68, 33)">
        <rect x="0" y="-8" width="4" height="16" rx="2" fill="${colorFrom}" />
        <rect x="8" y="-16" width="4" height="32" rx="2" fill="${colorTo}" />
        <rect x="16" y="-22" width="4" height="44" rx="2" fill="#fbbf24" />
        <rect x="24" y="-12" width="4" height="24" rx="2" fill="${colorFrom}" />
        <rect x="32" y="-18" width="4" height="36" rx="2" fill="${colorTo}" />
        <rect x="40" y="-24" width="4" height="48" rx="2" fill="#fbbf24" />
        <rect x="48" y="-14" width="4" height="28" rx="2" fill="${colorFrom}" />
        <rect x="56" y="-8" width="4" height="16" rx="2" fill="${colorTo}" />
        <rect x="64" y="-16" width="4" height="32" rx="2" fill="#fbbf24" />
        <rect x="72" y="-10" width="4" height="20" rx="2" fill="${colorFrom}" />
      </g>

      <text x="165" y="28" class="font-sans" font-size="13" font-weight="700" fill="#f8fafc">Voice Note Included</text>
      <text x="165" y="47" class="font-sans" font-size="12" font-weight="600" fill="#94a3b8">Play during the story</text>
    </g>

    <g transform="translate(68, 412)">
      <rect width="274" height="40" rx="20" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" />
      <text x="137" y="25" text-anchor="middle" class="font-sans" font-size="13" font-weight="700" fill="#ffffff">
        ${isContribute ? "Tap to Add Your Wish" : "Tap to Open Celebration"}
      </text>
    </g>
  </g>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 94 }).toBuffer();
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(pngBuffer);
  } catch {
    response.status(500).send("Error generating image");
  }
});

// ----------------------------------------------------
// GET /api/og/:id (Crawler HTML metadata tag rendering)
// ----------------------------------------------------
metaRouter.get("/og/:id", validateParams(pageIdParamSchema), async (request, response) => {
  try {
    const resolvedPageId = await resolvePageId(routeParamString(request.params.id));
    if (!resolvedPageId) { response.status(404).send("Not found"); return; }

    const rows = await publicPageQuery(resolvedPageId);
    const page = rows[0];
    if (!page) { response.status(404).send("Not found"); return; }

    const name = String(page.recipient_name || "Someone special");
    const count = Number(page.message_count || 0);
    const publicCode = String(page.public_code || resolvedPageId);
    const apiBase = process.env.API_URL || `${request.protocol}://${request.get("host")}`;
    const siteBase = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "https://wishcanvas.app").split(",")[0].trim();
    const previewMode = request.query.view === "contribute" ? "contribute" : "birthday";

    const title = previewMode === "contribute"
      ? `Add your wish for ${name}`
      : `Happy Birthday, ${name}!`;
    const description = previewMode === "contribute"
      ? `Join the birthday page and leave a wish, photo, or voice note for ${name}.`
      : `${count} birthday ${count === 1 ? "wish has" : "wishes have"} been collected. Open the letter to start the birthday story.`;
    const pageUrl = `${siteBase}/${previewMode === "contribute" ? "contribute" : "birthday"}/${publicCode}`;
    const imageVersion = encodeURIComponent(`${count}-${typeof page.cover_photo_url === "string" && page.cover_photo_url ? "cover" : "nocover"}`);
    const imageUrl = `${apiBase}/api/og-image/${publicCode}?v=${imageVersion}&view=${previewMode}`;

    const escapedTitle = escapeHtml(title);
    const escapedDesc = escapeHtml(description);
    const escapedImage = escapeHtml(imageUrl);
    const escapedPageUrl = escapeHtml(pageUrl);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    response.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />
  <meta property="og:site_name" content="WishCanvas" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapedPageUrl}" />
  <meta property="og:image" content="${escapedImage}" />
  <meta property="og:image:secure_url" content="${escapedImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  <meta name="twitter:image" content="${escapedImage}" />
  <meta name="twitter:image:alt" content="Birthday preview for ${escapeHtml(name)}" />
  <meta http-equiv="refresh" content="0;url=${escapedPageUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${escapedPageUrl}">${escapedTitle}</a></p>
</body>
</html>`);
  } catch {
    response.status(500).send("Error");
  }
});
