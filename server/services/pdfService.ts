import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import sanitizeHtml from "sanitize-html";
import sharp from "sharp";

export interface PdfThemePalette {
  name: string;
  isDark: boolean;
  fontFamily: "serif" | "sans";
  primary: [number, number, number];
  accent: [number, number, number];
  background: [number, number, number];
  cardBackground: [number, number, number];
  textDark: [number, number, number];
  textMuted: [number, number, number];
  border: [number, number, number];
}

const THEME_PALETTES: Record<string, PdfThemePalette> = {
  elegant: {
    name: "Elegant",
    isDark: false,
    fontFamily: "serif",
    primary: [0.18, 0.12, 0.08],
    accent: [0.85, 0.65, 0.22],
    background: [0.985, 0.98, 0.97],
    cardBackground: [1, 1, 1],
    textDark: [0.18, 0.12, 0.08],
    textMuted: [0.52, 0.46, 0.4],
    border: [0.9, 0.86, 0.8],
  },
  playful: {
    name: "Playful",
    isDark: false,
    fontFamily: "sans",
    primary: [0.32, 0.08, 0.28],
    accent: [0.92, 0.28, 0.6],
    background: [0.99, 0.965, 0.98],
    cardBackground: [1, 1, 1],
    textDark: [0.26, 0.08, 0.24],
    textMuted: [0.55, 0.42, 0.52],
    border: [0.94, 0.85, 0.92],
  },
  minimalist: {
    name: "Minimalist",
    isDark: false,
    fontFamily: "sans",
    primary: [0.12, 0.14, 0.18],
    accent: [0.4, 0.48, 0.58],
    background: [0.98, 0.985, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.1, 0.12, 0.16],
    textMuted: [0.48, 0.52, 0.56],
    border: [0.88, 0.9, 0.93],
  },
  retro: {
    name: "Retro",
    isDark: false,
    fontFamily: "sans",
    primary: [0.24, 0.1, 0.36],
    accent: [0.06, 0.68, 0.82],
    background: [0.98, 0.97, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.2, 0.08, 0.32],
    textMuted: [0.5, 0.42, 0.58],
    border: [0.9, 0.84, 0.94],
  },
  tropical: {
    name: "Tropical",
    isDark: false,
    fontFamily: "sans",
    primary: [0.06, 0.22, 0.14],
    accent: [0.14, 0.68, 0.4],
    background: [0.965, 0.985, 0.97],
    cardBackground: [1, 1, 1],
    textDark: [0.06, 0.2, 0.12],
    textMuted: [0.4, 0.52, 0.44],
    border: [0.86, 0.92, 0.88],
  },
  cosmic: {
    name: "Cosmic",
    isDark: true,
    fontFamily: "sans",
    primary: [0.95, 0.94, 0.99],
    accent: [0.65, 0.48, 0.98],
    background: [0.06, 0.05, 0.14],
    cardBackground: [0.12, 0.1, 0.22],
    textDark: [0.95, 0.94, 0.99],
    textMuted: [0.72, 0.7, 0.85],
    border: [0.26, 0.22, 0.42],
  },
  sunset: {
    name: "Sunset",
    isDark: false,
    fontFamily: "sans",
    primary: [0.28, 0.1, 0.08],
    accent: [0.94, 0.42, 0.2],
    background: [0.99, 0.965, 0.94],
    cardBackground: [1, 1, 1],
    textDark: [0.26, 0.1, 0.08],
    textMuted: [0.54, 0.42, 0.38],
    border: [0.94, 0.86, 0.82],
  },
  ocean: {
    name: "Ocean",
    isDark: false,
    fontFamily: "sans",
    primary: [0.06, 0.18, 0.28],
    accent: [0.06, 0.64, 0.88],
    background: [0.95, 0.98, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.06, 0.18, 0.26],
    textMuted: [0.42, 0.52, 0.58],
    border: [0.85, 0.91, 0.95],
  },
  candyland: {
    name: "Candyland",
    isDark: false,
    fontFamily: "sans",
    primary: [0.32, 0.08, 0.26],
    accent: [0.94, 0.36, 0.68],
    background: [0.99, 0.965, 0.975],
    cardBackground: [1, 1, 1],
    textDark: [0.28, 0.06, 0.22],
    textMuted: [0.55, 0.4, 0.52],
    border: [0.95, 0.86, 0.92],
  },
  midnight: {
    name: "Midnight",
    isDark: true,
    fontFamily: "serif",
    primary: [0.96, 0.97, 0.99],
    accent: [0.48, 0.55, 0.98],
    background: [0.04, 0.05, 0.09],
    cardBackground: [0.09, 0.11, 0.18],
    textDark: [0.96, 0.97, 0.99],
    textMuted: [0.68, 0.72, 0.82],
    border: [0.2, 0.24, 0.38],
  },
};

function parseHexToRgb(hex?: unknown, fallback: [number, number, number] = [0.2, 0.2, 0.2]): [number, number, number] {
  if (typeof hex !== "string") return fallback;
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return fallback;
}

export function getThemePalette(pageOrTheme?: unknown): PdfThemePalette {
  let themeKey = "elegant";
  let pageObj: Record<string, unknown> | null = null;

  if (typeof pageOrTheme === "string") {
    themeKey = pageOrTheme.toLowerCase().trim();
  } else if (pageOrTheme && typeof pageOrTheme === "object") {
    pageObj = pageOrTheme as Record<string, unknown>;
    themeKey = String(pageObj.theme || "elegant").toLowerCase().trim();
  }

  // Support custom user-created themes with custom gradient/accent colors
  if (pageObj && (themeKey.startsWith("custom_") || Boolean(pageObj.theme_gradient_from))) {
    const fromRgb = parseHexToRgb(pageObj.theme_gradient_from, [0.55, 0.36, 0.96]);
    const toRgb = parseHexToRgb(pageObj.theme_gradient_to, [0.92, 0.28, 0.60]);
    const accentRgb = parseHexToRgb(pageObj.theme_accent_color || pageObj.theme_gradient_to, toRgb);

    const fromLum = fromRgb[0] * 0.299 + fromRgb[1] * 0.587 + fromRgb[2] * 0.114;
    const toLum = toRgb[0] * 0.299 + toRgb[1] * 0.587 + toRgb[2] * 0.114;
    const avgLum = (fromLum + toLum) / 2;
    const isDark = avgLum < 0.45;

    const rawFont = String(pageObj.theme_font || "").toLowerCase();
    const isSerif =
      rawFont.includes("serif") ||
      rawFont.includes("playfair") ||
      rawFont.includes("cormorant") ||
      rawFont.includes("dm-serif");

    return {
      name: "Custom Theme",
      isDark,
      fontFamily: isSerif ? "serif" : "sans",
      primary: isDark
        ? [0.96, 0.97, 0.99]
        : [
            Math.max(0.08, Math.min(0.24, fromRgb[0] * 0.28)),
            Math.max(0.06, Math.min(0.22, fromRgb[1] * 0.24)),
            Math.max(0.08, Math.min(0.26, fromRgb[2] * 0.28)),
          ],
      accent: accentRgb,
      background: isDark
        ? [
            Math.max(0.04, Math.min(0.12, fromRgb[0] * 0.12)),
            Math.max(0.04, Math.min(0.10, fromRgb[1] * 0.10)),
            Math.max(0.07, Math.min(0.16, fromRgb[2] * 0.16)),
          ]
        : [0.985, 0.98, 0.975],
      cardBackground: isDark
        ? [
            Math.max(0.09, Math.min(0.18, fromRgb[0] * 0.22)),
            Math.max(0.08, Math.min(0.16, fromRgb[1] * 0.20)),
            Math.max(0.14, Math.min(0.26, fromRgb[2] * 0.28)),
          ]
        : [1, 1, 1],
      textDark: isDark ? [0.96, 0.96, 0.98] : [0.18, 0.12, 0.08],
      textMuted: isDark ? [0.72, 0.70, 0.84] : [0.52, 0.46, 0.42],
      border: isDark
        ? [
            Math.min(0.42, fromRgb[0] * 0.38 + 0.12),
            Math.min(0.42, fromRgb[1] * 0.38 + 0.12),
            Math.min(0.52, fromRgb[2] * 0.38 + 0.16),
          ]
        : [0.88, 0.86, 0.84],
    };
  }

  const basePalette = THEME_PALETTES[themeKey] || THEME_PALETTES.elegant;

  // Check if a built-in theme has a custom font specified
  if (pageObj && pageObj.theme_font) {
    const rawFont = String(pageObj.theme_font).toLowerCase();
    const isSerif =
      rawFont.includes("serif") ||
      rawFont.includes("playfair") ||
      rawFont.includes("cormorant") ||
      rawFont.includes("dm-serif");
    return {
      ...basePalette,
      fontFamily: isSerif ? "serif" : "sans",
    };
  }

  return basePalette;
}

export function cleanPdfText(text: string): string {
  if (!text) return "";
  return text
    // Replace em dashes and en dashes with hyphens or colons
    .replace(/[\u2014\u2015]/g, " - ")
    .replace(/[\u2012\u2013]/g, "-")
    // Replace curved quotes with standard straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace horizontal ellipsis
    .replace(/\u2026/g, "...")
    // Strip non-WinAnsi characters to prevent pdf-lib encoding crash
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number
): string[] {
  const sanitized = cleanPdfText(text);
  if (!sanitized) return [];

  const rawWords = sanitized.split(/\s+/).filter(Boolean);
  const words: string[] = [];

  // Break up any word wider than maxWidth so long tokens cannot spill over card borders
  for (const rawWord of rawWords) {
    if (font.widthOfTextAtSize(rawWord, fontSize) <= maxWidth) {
      words.push(rawWord);
    } else {
      let remaining = rawWord;
      while (remaining.length > 0) {
        let fitLength = remaining.length;
        while (fitLength > 1 && font.widthOfTextAtSize(remaining.slice(0, fitLength), fontSize) > maxWidth) {
          fitLength -= 1;
        }
        words.push(remaining.slice(0, fitLength));
        remaining = remaining.slice(fitLength);
      }
    }
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    const candidate = `${current} ${word}`;
    const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);
    if (candidateWidth > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawWrappedParagraph(
  page: PDFPage,
  text: string,
  startX: number,
  startY: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  color: RGB,
  lineGapMultiplier = 1.45
): number {
  const lines = wrapTextToWidth(text, maxWidth, font, fontSize);
  const lineGap = fontSize * lineGapMultiplier;
  let cursorY = startY;

  for (const line of lines) {
    page.drawText(line, {
      x: startX,
      y: cursorY,
      size: fontSize,
      font,
      color,
    });
    cursorY -= lineGap;
  }

  return cursorY;
}

function renderContainedText(
  page: PDFPage,
  text: string,
  boxX: number,
  boxTopY: number,
  boxWidth: number,
  maxAvailableHeight: number,
  font: PDFFont,
  options?: {
    color?: RGB;
    preferredSize?: number;
    minSize?: number;
    lineGapMultiplier?: number;
    verticalCenter?: boolean;
  }
): number {
  const sanitized = cleanPdfText(text);
  if (!sanitized) return boxTopY;

  let fontSize = options?.preferredSize || 13;
  const minFontSize = options?.minSize || 9.5;
  const textColor = options?.color || rgb(0.12, 0.12, 0.14);
  const safeBoxWidth = Math.max(80, boxWidth - 12);
  const gapMult = options?.lineGapMultiplier || 1.42;

  let lines: string[] = [];
  let lineHeight = fontSize * gapMult;

  while (fontSize >= minFontSize) {
    lineHeight = fontSize * gapMult;
    lines = wrapTextToWidth(sanitized, safeBoxWidth, font, fontSize);
    const totalNeededHeight = lines.length * lineHeight;

    if (totalNeededHeight <= maxAvailableHeight || fontSize <= minFontSize) {
      break;
    }
    fontSize -= 0.5;
  }

  const maxLinesAllowed = Math.max(1, Math.floor(maxAvailableHeight / lineHeight));
  if (lines.length > maxLinesAllowed) {
    lines = lines.slice(0, maxLinesAllowed);
    const lastIdx = lines.length - 1;
    if (lines[lastIdx]) {
      let trimmed = lines[lastIdx].replace(/[.,;:!?\s]+$/, "");
      while (
        font.widthOfTextAtSize(`${trimmed}...`, fontSize) > safeBoxWidth &&
        trimmed.length > 3
      ) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[lastIdx] = `${trimmed}...`;
    }
  }

  // Ensure every line strictly obeys safeBoxWidth
  for (let i = 0; i < lines.length; i++) {
    if (font.widthOfTextAtSize(lines[i], fontSize) > safeBoxWidth) {
      let trimmed = lines[i];
      while (font.widthOfTextAtSize(`${trimmed}...`, fontSize) > safeBoxWidth && trimmed.length > 2) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[i] = `${trimmed}...`;
    }
  }

  let cursorY = boxTopY;
  if (options?.verticalCenter && lines.length > 0) {
    const totalRenderedHeight = (lines.length - 1) * lineHeight + fontSize;
    if (totalRenderedHeight < maxAvailableHeight) {
      const topOffset = (maxAvailableHeight - totalRenderedHeight) / 2;
      cursorY = boxTopY - topOffset;
    }
  }

  for (const line of lines) {
    page.drawText(line, {
      x: boxX,
      y: cursorY,
      size: fontSize,
      font,
      color: textColor,
    });
    cursorY -= lineHeight;
  }

  return cursorY;
}

function formatAlbumDate(rawDate?: unknown): string {
  if (!rawDate) return "Special Occasion";
  try {
    const raw = String(rawDate);
    const parts = raw.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {
    // Ignore error
  }
  return "Special Occasion";
}

async function fetchAndProcessImage(
  urlOrPath: string,
  maxWidth = 700,
  maxHeight = 700
): Promise<Buffer | null> {
  if (!urlOrPath) return null;

  try {
    let rawBuffer: Buffer | null = null;

    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(urlOrPath, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
    } else {
      const cleaned = urlOrPath.replace(/^\/+/, "");
      const fullPath = path.resolve(process.cwd(), cleaned);
      rawBuffer = await fs.readFile(fullPath);
    }

    if (!rawBuffer || rawBuffer.length === 0) return null;

    const processed = await sharp(rawBuffer)
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    return processed;
  } catch (error) {
    console.warn("Failed to process image for PDF export:", error);
    return null;
  }
}

async function generateQrBuffer(text: string, size = 180): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: "png",
    margin: 1,
    width: size,
    color: {
      dark: "#1A202C",
      light: "#FFFFFF",
    },
  });
}

export interface PdfExportOptions {
  siteUrl?: string;
  orientation?: "portrait" | "landscape";
}

interface ProcessedPhoto {
  url: string;
  caption: string;
}

function extractPhotosFromMessage(message: Record<string, unknown>): ProcessedPhoto[] {
  const rawPhotos = Array.isArray(message.photos)
    ? message.photos
    : (message.photo_url || message.legacy_photo_url)
    ? [{ url: message.photo_url || message.legacy_photo_url, caption: "" }]
    : [];

  return rawPhotos
    .map((p) => {
      if (typeof p === "string") return { url: p, caption: "" };
      if (p && typeof p === "object") {
        return {
          url: String(p.url || p.photo_url || ""),
          caption: cleanPdfText(String(p.caption || "")),
        };
      }
      return null;
    })
    .filter((p): p is ProcessedPhoto => Boolean(p && p.url));
}

export async function buildBrandedPagePdf(
  page: Record<string, unknown>,
  messages: Array<Record<string, unknown>>,
  options?: PdfExportOptions
): Promise<Uint8Array> {
  const isLandscape = options?.orientation === "landscape";
  const doc = await PDFDocument.create();

  // Typography system: strictly inherits serif vs sans from theme
  const palette = getThemePalette(page);
  const isSerif = palette.fontFamily === "serif";

  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaRegular = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const monoFont = await doc.embedFont(StandardFonts.CourierBold);

  const headingFont = isSerif ? timesBold : helveticaBold;
  const titleFont = isSerif ? timesBold : helveticaBold;
  const bodyFont = isSerif ? timesRegular : helveticaRegular;
  const quoteFont = isSerif ? timesItalic : helveticaOblique;
  const obliqueFont = isSerif ? timesItalic : helveticaOblique;

  const recipientName = cleanPdfText(String(page.recipient_name || "Someone Special"));
  const birthdayDateLabel = formatAlbumDate(page.birthday_date);
  const creatorMessage = typeof page.creator_message === "string" ? page.creator_message.trim() : "";
  const publicCode = String(page.public_code || "");
  const siteUrl = options?.siteUrl || "https://wishcanvas.app";
  const celebrationUrl = publicCode ? `${siteUrl}/birthday/${publicCode}` : siteUrl;

  // Dimensions
  const pageWidth = isLandscape ? 960 : 595;
  const pageHeight = isLandscape ? 540 : 842;
  const margin = isLandscape ? 32 : 38;

  const uniqueContributors = Array.from(
    new Set(
      messages
        .map((m) => cleanPdfText(String(m.sender_name || "Anonymous")).toLowerCase())
        .filter(Boolean)
    )
  );

  const totalPhotos = messages.reduce((count, m) => {
    if (Array.isArray(m.photos) && m.photos.length) {
      return count + m.photos.length;
    }
    return count + (m.photo_url || m.legacy_photo_url ? 1 : 0);
  }, 0);

  const totalAudio = messages.reduce((count, m) => count + (m.audio_url ? 1 : 0), 0);

  let pageIndex = 0;

  const createBasePage = () => {
    const p = doc.addPage([pageWidth, pageHeight]);
    pageIndex += 1;

    p.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(...palette.background),
    });

    p.drawRectangle({
      x: 0,
      y: pageHeight - 5,
      width: pageWidth,
      height: 5,
      color: rgb(...palette.accent),
    });

    return p;
  };

  // =========================================================================
  // COVER SLIDE / PAGE
  // =========================================================================
  const coverPage = createBasePage();
  const coverUrl = typeof page.cover_photo_url === "string" ? page.cover_photo_url.trim() : "";
  const coverBuffer = coverUrl ? await fetchAndProcessImage(coverUrl, 800, 800) : null;

  if (isLandscape) {
    const leftWidth = coverBuffer ? 520 : 896;
    const cardHeight = 480;
    const cardY = 28;
    const usableLeftTextWidth = leftWidth - 56;

    coverPage.drawRectangle({
      x: margin,
      y: cardY,
      width: leftWidth,
      height: cardHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 1,
    });

    coverPage.drawText("FIRST PAGE OUT OF THE ENVELOPE", {
      x: margin + 28,
      y: cardY + cardHeight - 38,
      size: 9.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    coverPage.drawText("Happy Birthday,", {
      x: margin + 28,
      y: cardY + cardHeight - 74,
      size: 26,
      font: headingFont,
      color: rgb(...palette.primary),
    });

    // Dynamically scale recipient name to fit perfectly inside the card width
    let recNameSize = 38;
    while (
      headingFont.widthOfTextAtSize(`${recipientName}.`, recNameSize) > usableLeftTextWidth &&
      recNameSize > 20
    ) {
      recNameSize -= 2;
    }

    coverPage.drawText(`${recipientName}.`, {
      x: margin + 28,
      y: cardY + cardHeight - 116,
      size: recNameSize,
      font: headingFont,
      color: rgb(...palette.primary),
    });

    // Wrapped subtitle paragraph: guaranteed to stay inside card width
    drawWrappedParagraph(
      coverPage,
      "Every note, photo, and voice clip inside was gathered to make this feel less like a page and more like a gift being opened.",
      margin + 28,
      cardY + cardHeight - 146,
      usableLeftTextWidth,
      bodyFont,
      10,
      rgb(...palette.textMuted)
    );

    // Organizer Note
    const bentoMetricsY = cardY + 28;
    if (creatorMessage) {
      const orgBoxY = cardY + 114;
      const orgBoxHeight = 114;
      coverPage.drawRectangle({
        x: margin + 28,
        y: orgBoxY,
        width: usableLeftTextWidth,
        height: orgBoxHeight,
        color: rgb(...palette.background),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });

      coverPage.drawText("PACKED WITH A NOTE FROM THE ORGANIZER", {
        x: margin + 42,
        y: orgBoxY + orgBoxHeight - 22,
        size: 8,
        font: titleFont,
        color: rgb(...palette.accent),
      });

      renderContainedText(
        coverPage,
        `"${creatorMessage}"`,
        margin + 42,
        orgBoxY + orgBoxHeight - 42,
        usableLeftTextWidth - 28,
        64,
        quoteFont,
        {
          color: rgb(...palette.textDark),
          preferredSize: 11,
          minSize: 9.5,
          verticalCenter: true,
        }
      );
    } else {
      const bannerY = cardY + 114;
      const bannerHeight = 114;
      coverPage.drawRectangle({
        x: margin + 28,
        y: bannerY,
        width: usableLeftTextWidth,
        height: bannerHeight,
        color: rgb(...palette.background),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });

      coverPage.drawText("A COMMEMORATIVE KEEPSAKE CELEBRATION", {
        x: margin + 42,
        y: bannerY + bannerHeight - 22,
        size: 8,
        font: titleFont,
        color: rgb(...palette.accent),
      });

      renderContainedText(
        coverPage,
        `Lovingly assembled for ${recipientName} to hold every heartfelt wish, photograph, and blessing from loved ones in one permanent keepsake.`,
        margin + 42,
        bannerY + bannerHeight - 42,
        usableLeftTextWidth - 28,
        64,
        quoteFont,
        {
          color: rgb(...palette.textDark),
          preferredSize: 11,
          minSize: 9.5,
          verticalCenter: true,
        }
      );
    }

    // Celebration Metrics Bento
    const metricBoxWidth = (usableLeftTextWidth - 16) / 2;
    const metricBoxHeight = 68;

    coverPage.drawRectangle({
      x: margin + 28,
      y: bentoMetricsY,
      width: metricBoxWidth,
      height: metricBoxHeight,
      color: rgb(...palette.background),
      borderColor: rgb(...palette.border),
      borderWidth: 0.8,
    });
    coverPage.drawText("WISHES GATHERED", {
      x: margin + 40,
      y: bentoMetricsY + metricBoxHeight - 20,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });
    coverPage.drawText(String(messages.length), {
      x: margin + 40,
      y: bentoMetricsY + 16,
      size: 24,
      font: headingFont,
      color: rgb(...palette.primary),
    });

    coverPage.drawRectangle({
      x: margin + 28 + metricBoxWidth + 16,
      y: bentoMetricsY,
      width: metricBoxWidth,
      height: metricBoxHeight,
      color: rgb(...palette.background),
      borderColor: rgb(...palette.border),
      borderWidth: 0.8,
    });
    coverPage.drawText("REVEAL DATE", {
      x: margin + 28 + metricBoxWidth + 26,
      y: bentoMetricsY + metricBoxHeight - 20,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });
    coverPage.drawText(birthdayDateLabel, {
      x: margin + 28 + metricBoxWidth + 26,
      y: bentoMetricsY + 20,
      size: 11,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    // Right Column: Full Cover Photo Card
    if (coverBuffer) {
      try {
        const coverImg = await doc.embedJpg(coverBuffer);
        const photoCardX = margin + leftWidth + 20;
        const photoCardWidth = pageWidth - margin - photoCardX;
        const photoCardHeight = cardHeight;

        coverPage.drawRectangle({
          x: photoCardX,
          y: cardY,
          width: photoCardWidth,
          height: photoCardHeight,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        const imgPadding = 12;
        const imgWidth = photoCardWidth - imgPadding * 2;
        const imgHeight = photoCardHeight - 52;
        coverPage.drawImage(coverImg, {
          x: photoCardX + imgPadding,
          y: cardY + 40,
          width: imgWidth,
          height: imgHeight,
        });

        coverPage.drawText(`${recipientName}'s birthday cover`, {
          x: photoCardX + imgPadding + 6,
          y: cardY + 18,
          size: 9.5,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });
      } catch (err) {
        console.warn("Failed to embed landscape cover image:", err);
      }
    }
  } else {
    // -----------------------------------------------------------------------
    // Portrait A4 Luxury Magazine Cover (Kinfolk / Vogue Style)
    // -----------------------------------------------------------------------
    const usableCardWidth = pageWidth - margin * 2;

    // Top metadata running folio
    coverPage.drawText("THE CELEBRATION ISSUE", {
      x: margin,
      y: pageHeight - 36,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });

    const issueRightText = `VOL. I  /  ${birthdayDateLabel.toUpperCase()}`;
    const issueRightW = titleFont.widthOfTextAtSize(issueRightText, 8);
    coverPage.drawText(issueRightText, {
      x: pageWidth - margin - issueRightW,
      y: pageHeight - 36,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });

    // Top hairline rule
    coverPage.drawLine({
      start: { x: margin, y: pageHeight - 44 },
      end: { x: pageWidth - margin, y: pageHeight - 44 },
      thickness: 0.7,
      color: rgb(...palette.accent),
    });

    // Majestic Magazine Masthead
    const masthead = "W I S H C A N V A S";
    const mastheadSize = 28;
    const mastheadW = titleFont.widthOfTextAtSize(masthead, mastheadSize);
    coverPage.drawText(masthead, {
      x: (pageWidth - mastheadW) / 2,
      y: pageHeight - 74,
      size: mastheadSize,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    // Sub-masthead rule
    coverPage.drawLine({
      start: { x: margin, y: pageHeight - 84 },
      end: { x: pageWidth - margin, y: pageHeight - 84 },
      thickness: 0.7,
      color: rgb(...palette.accent),
    });

    let currentCursor = pageHeight - 96;

    if (coverBuffer) {
      try {
        const coverImg = await doc.embedJpg(coverBuffer);
        const imgWidth = usableCardWidth;
        const imgHeight = 420;
        const imgX = margin;
        const imgY = currentCursor - imgHeight;

        // Elegant double mat luxury frame
        coverPage.drawRectangle({
          x: imgX - 2,
          y: imgY - 2,
          width: imgWidth + 4,
          height: imgHeight + 4,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.accent),
          borderWidth: 1,
        });

        coverPage.drawImage(coverImg, {
          x: imgX,
          y: imgY,
          width: imgWidth,
          height: imgHeight,
        });

        currentCursor = imgY - 32;
      } catch (err) {
        console.warn("Failed to embed portrait cover image:", err);
      }
    } else {
      currentCursor -= 40;
    }

    // Magazine Headline Section
    coverPage.drawText("SPECIAL EDITION", {
      x: margin,
      y: currentCursor,
      size: 8.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    currentCursor -= 22;

    coverPage.drawText("Happy Birthday,", {
      x: margin,
      y: currentCursor,
      size: 20,
      font: quoteFont,
      color: rgb(...palette.textMuted),
    });

    currentCursor -= 36;

    let recNamePortraitSize = 36;
    while (
      headingFont.widthOfTextAtSize(recipientName, recNamePortraitSize) > usableCardWidth &&
      recNamePortraitSize > 20
    ) {
      recNamePortraitSize -= 2;
    }

    coverPage.drawText(recipientName, {
      x: margin,
      y: currentCursor,
      size: recNamePortraitSize,
      font: headingFont,
      color: rgb(...palette.primary),
    });

    currentCursor -= 22;

    coverPage.drawText(
      `A life celebrated in love, memories, and personal letters from those who cherish you most.`,
      {
        x: margin,
        y: currentCursor,
        size: 9.5,
        font: bodyFont,
        color: rgb(...palette.textDark),
      }
    );

    // Magazine Bottom Folio Footer
    coverPage.drawLine({
      start: { x: margin, y: 54 },
      end: { x: pageWidth - margin, y: 54 },
      thickness: 0.6,
      color: rgb(...palette.border),
    });

    coverPage.drawText("WISHCANVAS PRINTED ARCHIVE", {
      x: margin,
      y: 40,
      size: 8,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    const footerRightText = `${messages.length} PERSONAL LETTERS  •  COLLECTED WITH LOVE`;
    const footerRightW = titleFont.widthOfTextAtSize(footerRightText, 8);
    coverPage.drawText(footerRightText, {
      x: pageWidth - margin - footerRightW,
      y: 40,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });
  }

  // =========================================================================
  // OVERVIEW SLIDE / PAGE: STATS & LIVE EXPERIENCE QR
  // =========================================================================
  const statsPage = createBasePage();
  const qrBuffer = await generateQrBuffer(celebrationUrl, 260);

  if (isLandscape) {
    const leftW = 440;
    const cardH = 480;
    const cardY = 28;
    const usableLeftW = leftW - 56;

    statsPage.drawRectangle({
      x: margin,
      y: cardY,
      width: leftW,
      height: cardH,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 1,
    });

    statsPage.drawText("THE SHAPE OF THE CELEBRATION", {
      x: margin + 28,
      y: cardY + cardH - 36,
      size: 9.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    statsPage.drawText("Collected with love.", {
      x: margin + 28,
      y: cardY + cardH - 72,
      size: 28,
      font: headingFont,
      color: rgb(...palette.primary),
    });

    drawWrappedParagraph(
      statsPage,
      "Before the story started, loved ones left little pieces of themselves here. This is what made it into the envelope.",
      margin + 28,
      cardY + cardH - 98,
      usableLeftW,
      bodyFont,
      10,
      rgb(...palette.textMuted)
    );

    const statsData = [
      { label: "Wishes written", value: String(messages.length), note: "Each written with this exact milestone in mind." },
      { label: "Photos added", value: String(totalPhotos), note: "Real snapshots that make the story grounded." },
      { label: "Voice notes", value: String(totalAudio), note: "Voices that make the celebration feel present." },
    ];

    let bCursor = cardY + cardH - 180;
    for (const stat of statsData) {
      statsPage.drawRectangle({
        x: margin + 28,
        y: bCursor,
        width: usableLeftW,
        height: 68,
        color: rgb(...palette.background),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });

      statsPage.drawText(stat.value, {
        x: margin + 44,
        y: bCursor + 22,
        size: 26,
        font: headingFont,
        color: rgb(...palette.primary),
      });

      statsPage.drawText(stat.label.toUpperCase(), {
        x: margin + 114,
        y: bCursor + 40,
        size: 9,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      statsPage.drawText(stat.note, {
        x: margin + 114,
        y: bCursor + 22,
        size: 8.5,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });

      bCursor -= 80;
    }

    // Right Column
    const rightX = margin + leftW + 20;
    const rightW = pageWidth - margin - rightX;
    const usableRightW = rightW - 56;

    statsPage.drawRectangle({
      x: rightX,
      y: cardY,
      width: rightW,
      height: cardH,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 1,
    });

    try {
      const qrImg = await doc.embedPng(qrBuffer);
      const qrSize = 136;
      const qrX = rightX + (rightW - qrSize) / 2;
      const qrY = cardY + cardH - qrSize - 40;

      statsPage.drawImage(qrImg, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });

      statsPage.drawText("Scan to Experience the Live Celebration", {
        x: rightX + 28,
        y: qrY - 26,
        size: 13,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      drawWrappedParagraph(
        statsPage,
        "Point your smartphone camera to access original audio recordings, full resolution photos, and ambient soundtrack playback.",
        rightX + 28,
        qrY - 44,
        usableRightW,
        bodyFont,
        9,
        rgb(...palette.textMuted)
      );
    } catch (err) {
      console.warn("Failed to embed landscape QR code:", err);
    }

    const rollHeaderY = cardY + 160;
    statsPage.drawText("CONTRIBUTORS & WELL-WISHERS", {
      x: rightX + 28,
      y: rollHeaderY,
      size: 8.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    const contribNames = uniqueContributors.map((c) => c.replace(/\b\w/g, (l) => l.toUpperCase())).join(", ") || "Friends and family";
    const rollLines = wrapTextToWidth(contribNames, usableRightW, bodyFont, 9).slice(0, 6);
    let rCursor = rollHeaderY - 20;
    for (const line of rollLines) {
      statsPage.drawText(line, {
        x: rightX + 28,
        y: rCursor,
        size: 9,
        font: bodyFont,
        color: rgb(...palette.textDark),
      });
      rCursor -= 15;
    }
  } else {
    // Portrait Overview Page
    const usablePageW = pageWidth - margin * 2;

    statsPage.drawText("THE SHAPE OF THE CELEBRATION", {
      x: margin,
      y: pageHeight - 48,
      size: 9.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    statsPage.drawText("Collected with love.", {
      x: margin,
      y: pageHeight - 74,
      size: 28,
      font: headingFont,
      color: rgb(...palette.primary),
    });

    statsPage.drawText(`A heartfelt collective tribute lovingly assembled for ${recipientName}.`, {
      x: margin,
      y: pageHeight - 94,
      size: 10.5,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    const statBoxWidth = (usablePageW - 20) / 3;
    const statBoxHeight = 72;
    const statY = pageHeight - 185;

    const statsData = [
      { label: "Loved Ones", value: String(uniqueContributors.length || messages.length) },
      { label: "Photo Memories", value: String(totalPhotos) },
      { label: "Voice Notes", value: String(totalAudio) },
    ];

    statsData.forEach((stat, i) => {
      const boxX = margin + i * (statBoxWidth + 10);
      statsPage.drawRectangle({
        x: boxX,
        y: statY,
        width: statBoxWidth,
        height: statBoxHeight,
        color: rgb(...palette.cardBackground),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });

      statsPage.drawText(stat.value, {
        x: boxX + 16,
        y: statY + 38,
        size: 24,
        font: headingFont,
        color: rgb(...palette.primary),
      });

      statsPage.drawText(stat.label, {
        x: boxX + 16,
        y: statY + 18,
        size: 9.5,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });
    });

    const qrBoxY = pageHeight - 345;
    const qrBoxHeight = 135;

    statsPage.drawRectangle({
      x: margin,
      y: qrBoxY,
      width: usablePageW,
      height: qrBoxHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.accent),
      borderWidth: 1,
    });

    try {
      const qrImg = await doc.embedPng(qrBuffer);
      const qrSize = 108;

      statsPage.drawImage(qrImg, {
        x: margin + 14,
        y: qrBoxY + 13,
        width: qrSize,
        height: qrSize,
      });

      statsPage.drawText("Scan to Experience the Live Celebration", {
        x: margin + 134,
        y: qrBoxY + 96,
        size: 13,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      drawWrappedParagraph(
        statsPage,
        "Open your smartphone camera and point it at the code to access the interactive digital canvas. Relive audio voice recordings, browse original high-resolution photos, and enjoy the ambient soundtrack.",
        margin + 134,
        qrBoxY + 74,
        usablePageW - 148,
        bodyFont,
        9.5,
        rgb(...palette.textMuted),
        1.45
      );
    } catch (err) {
      console.warn("Failed to embed portrait QR code:", err);
    }

    const rollCallY = pageHeight - 400;
    statsPage.drawText("Contributors & Well-Wishers", {
      x: margin,
      y: rollCallY,
      size: 13.5,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    const rollCallLines = wrapTextToWidth(
      uniqueContributors.map((c) => c.replace(/\b\w/g, (l) => l.toUpperCase())).join(", ") || "All friends and family",
      usablePageW,
      bodyFont,
      10
    ).slice(0, 12);

    let rollCursor = rollCallY - 24;
    for (const line of rollCallLines) {
      statsPage.drawText(line, {
        x: margin,
        y: rollCursor,
        size: 10,
        font: bodyFont,
        color: rgb(...palette.textDark),
      });
      rollCursor -= 17;
    }
  }

  // =========================================================================
  // WISH SPREAD PAGES
  // =========================================================================
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const wishPage = createBasePage();

    const senderName = cleanPdfText(String(message.sender_name || "Loving Contributor"));
    const wishPhotos = extractPhotosFromMessage(message);
    const hasPhotos = wishPhotos.length > 0;
    const hasAudio = Boolean(message.audio_url);

    const rawContent = sanitizeHtml(String(message.message || ""), {
      allowedTags: [],
      allowedAttributes: {},
    })
      .replace(/\s+/g, " ")
      .trim();

    if (isLandscape) {
      const cardHeight = 480;
      const cardY = 28;

      if (!hasPhotos && !hasAudio) {
        const cardWidth = 760;
        const cardX = (pageWidth - cardWidth) / 2;
        const usableW = cardWidth - 72;

        wishPage.drawRectangle({
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        wishPage.drawText(`LETTER ${i + 1} OF ${messages.length}`, {
          x: cardX + 36,
          y: cardY + cardHeight - 36,
          size: 9.5,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });

        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 78;
        wishPage.drawRectangle({
          x: cardX + cardWidth - 36 - badgeW,
          y: cardY + cardHeight - 44,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: cardX + cardWidth - 36 - badgeW + 10,
          y: cardY + cardHeight - 37,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: cardX + 36, y: cardY + cardHeight - 54 },
          end: { x: cardX + cardWidth - 36, y: cardY + cardHeight - 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        let sNameSize = 28;
        while (headingFont.widthOfTextAtSize(senderName, sNameSize) > usableW && sNameSize > 16) {
          sNameSize -= 1;
        }

        wishPage.drawText(senderName, {
          x: cardX + 36,
          y: cardY + cardHeight - 92,
          size: sNameSize,
          font: headingFont,
          color: rgb(...palette.primary),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Wishing you the happiest birthday filled with joy and blessings!"';
        const isShortWish = quoteText.length < 120;
        const preferredQuoteSize = isShortWish ? 21 : quoteText.length < 260 ? 17 : 14.5;
        renderContainedText(
          wishPage,
          quoteText,
          cardX + 36,
          cardY + cardHeight - 126,
          usableW,
          cardHeight - 195,
          quoteFont,
          {
            color: rgb(...palette.textDark),
            preferredSize: preferredQuoteSize,
            minSize: 10,
            verticalCenter: true,
          }
        );

        wishPage.drawLine({
          start: { x: cardX + 36, y: cardY + 54 },
          end: { x: cardX + cardWidth - 36, y: cardY + 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        wishPage.drawRectangle({
          x: cardX + 36,
          y: cardY + 22,
          width: 140,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText("Personal letter keepsake", {
          x: cardX + 46,
          y: cardY + 29,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawText("CELEBRATION MEMORY", {
          x: cardX + cardWidth - 170,
          y: cardY + 29,
          size: 8,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });
      } else if (!hasPhotos && hasAudio) {
        const leftWidth = 500;
        const rightWidth = 380;
        const rightX = margin + leftWidth + 20;
        const usableW = leftWidth - 60;

        wishPage.drawRectangle({
          x: margin,
          y: cardY,
          width: leftWidth,
          height: cardHeight,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        wishPage.drawText(`LETTER ${i + 1} OF ${messages.length}`, {
          x: margin + 30,
          y: cardY + cardHeight - 36,
          size: 9,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });

        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 76;
        wishPage.drawRectangle({
          x: margin + leftWidth - 30 - badgeW,
          y: cardY + cardHeight - 44,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: margin + leftWidth - 30 - badgeW + 8,
          y: cardY + cardHeight - 37,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: margin + 30, y: cardY + cardHeight - 52 },
          end: { x: margin + leftWidth - 30, y: cardY + cardHeight - 52 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        let sNameSize = 24;
        while (headingFont.widthOfTextAtSize(senderName, sNameSize) > usableW && sNameSize > 15) {
          sNameSize -= 1;
        }

        wishPage.drawText(senderName, {
          x: margin + 30,
          y: cardY + cardHeight - 88,
          size: sNameSize,
          font: headingFont,
          color: rgb(...palette.primary),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Sent with warmest affection."';
        const isShortWish = quoteText.length < 120;
        const preferredQuoteSize = isShortWish ? 18.5 : quoteText.length < 240 ? 15.5 : 13.5;
        renderContainedText(
          wishPage,
          quoteText,
          margin + 30,
          cardY + cardHeight - 120,
          usableW,
          cardHeight - 190,
          quoteFont,
          {
            color: rgb(...palette.textDark),
            preferredSize: preferredQuoteSize,
            minSize: 10,
            verticalCenter: true,
          }
        );

        wishPage.drawRectangle({
          x: margin + 30,
          y: cardY + 22,
          width: 130,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.accent),
          borderWidth: 0.8,
        });
        wishPage.drawText("Voice note enclosed", {
          x: margin + 40,
          y: cardY + 29,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.accent),
        });

        // Right Audio Card
        wishPage.drawRectangle({
          x: rightX,
          y: cardY,
          width: rightWidth,
          height: cardHeight,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        try {
          const qrImg = await doc.embedPng(qrBuffer);
          const qrSize = 136;
          const qrX = rightX + (rightWidth - qrSize) / 2;
          const qrY = cardY + cardHeight - qrSize - 74;

          wishPage.drawImage(qrImg, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });

          wishPage.drawText("Voice Note Keepsake", {
            x: rightX + 32,
            y: cardY + cardHeight - 44,
            size: 15,
            font: titleFont,
            color: rgb(...palette.primary),
          });

          wishPage.drawText(`Spoken with love by ${senderName}`, {
            x: rightX + 32,
            y: cardY + cardHeight - 64,
            size: 10,
            font: bodyFont,
            color: rgb(...palette.textMuted),
          });

          wishPage.drawText("Scan to Listen to this Wish", {
            x: rightX + 32,
            y: qrY - 30,
            size: 11.5,
            font: titleFont,
            color: rgb(...palette.primary),
          });

          drawWrappedParagraph(
            wishPage,
            "Point your smartphone camera to stream the spoken voice note directly.",
            rightX + 32,
            qrY - 48,
            rightWidth - 64,
            bodyFont,
            9,
            rgb(...palette.textMuted)
          );
        } catch (err) {
          console.warn("Failed to embed wish audio QR code:", err);
        }
      } else {
        const leftWidth = 460;
        const rightWidth = pageWidth - margin * 2 - leftWidth - 20;
        const rightX = margin + leftWidth + 20;
        const usableW = leftWidth - 60;

        wishPage.drawRectangle({
          x: margin,
          y: cardY,
          width: leftWidth,
          height: cardHeight,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        wishPage.drawText(`LETTER ${i + 1} OF ${messages.length}`, {
          x: margin + 30,
          y: cardY + cardHeight - 36,
          size: 9,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });

        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 76;
        wishPage.drawRectangle({
          x: margin + leftWidth - 30 - badgeW,
          y: cardY + cardHeight - 44,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: margin + leftWidth - 30 - badgeW + 8,
          y: cardY + cardHeight - 37,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: margin + 30, y: cardY + cardHeight - 52 },
          end: { x: margin + leftWidth - 30, y: cardY + cardHeight - 52 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        let sNameSize = 24;
        while (headingFont.widthOfTextAtSize(senderName, sNameSize) > usableW && sNameSize > 15) {
          sNameSize -= 1;
        }

        wishPage.drawText(senderName, {
          x: margin + 30,
          y: cardY + cardHeight - 88,
          size: sNameSize,
          font: headingFont,
          color: rgb(...palette.primary),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Sent with warmest affection."';
        const isShortWish = quoteText.length < 120;
        const preferredQuoteSize = isShortWish ? 17 : quoteText.length < 240 ? 15 : 13;
        renderContainedText(
          wishPage,
          quoteText,
          margin + 30,
          cardY + cardHeight - 118,
          usableW,
          cardHeight - 185,
          quoteFont,
          {
            color: rgb(...palette.textDark),
            preferredSize: preferredQuoteSize,
            minSize: 9.5,
            verticalCenter: true,
          }
        );

        wishPage.drawLine({
          start: { x: margin + 30, y: cardY + 54 },
          end: { x: margin + leftWidth - 30, y: cardY + 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        wishPage.drawRectangle({
          x: margin + 30,
          y: cardY + 22,
          width: 140,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText("Personal letter keepsake", {
          x: margin + 40,
          y: cardY + 29,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.primary),
        });

        if (hasAudio) {
          wishPage.drawText("Voice note enclosed", {
            x: margin + leftWidth - 145,
            y: cardY + 29,
            size: 8,
            font: titleFont,
            color: rgb(...palette.accent),
          });
        }

        // Right Photo Grid
        if (wishPhotos.length === 1) {
          const photoBuffer = await fetchAndProcessImage(wishPhotos[0].url, 700, 700);
          if (photoBuffer) {
            try {
              const img = await doc.embedJpg(photoBuffer);
              wishPage.drawRectangle({
                x: rightX,
                y: cardY,
                width: rightWidth,
                height: cardHeight,
                color: rgb(...palette.cardBackground),
                borderColor: rgb(...palette.border),
                borderWidth: 1,
              });

              const pPad = 12;
              const pW = rightWidth - pPad * 2;
              const pH = cardHeight - 52;
              wishPage.drawImage(img, {
                x: rightX + pPad,
                y: cardY + 40,
                width: pW,
                height: pH,
              });

              const cap = wishPhotos[0].caption || "Photo memory";
              wishPage.drawText(cap.slice(0, 48), {
                x: rightX + pPad + 6,
                y: cardY + 18,
                size: 9.5,
                font: titleFont,
                color: rgb(...palette.textMuted),
              });
            } catch (err) {
              console.warn("Failed to embed landscape photo 1:", err);
            }
          }
        } else if (wishPhotos.length >= 2) {
          const [p1, p2] = wishPhotos;
          const b1 = p1 ? await fetchAndProcessImage(p1.url, 600, 400) : null;
          const b2 = p2 ? await fetchAndProcessImage(p2.url, 600, 400) : null;
          const photoCardH = (cardHeight - 16) / 2;

          if (b1) {
            try {
              const img1 = await doc.embedJpg(b1);
              const topY = cardY + photoCardH + 16;
              wishPage.drawRectangle({
                x: rightX,
                y: topY,
                width: rightWidth,
                height: photoCardH,
                color: rgb(...palette.cardBackground),
                borderColor: rgb(...palette.border),
                borderWidth: 1,
              });
              wishPage.drawImage(img1, {
                x: rightX + 10,
                y: topY + 28,
                width: rightWidth - 20,
                height: photoCardH - 38,
              });
              wishPage.drawText((p1.caption || "Photo memory").slice(0, 45), {
                x: rightX + 14,
                y: topY + 10,
                size: 8.5,
                font: titleFont,
                color: rgb(...palette.textMuted),
              });
            } catch (err) {
              console.warn("Failed to embed top photo:", err);
            }
          }

          if (b2) {
            try {
              const img2 = await doc.embedJpg(b2);
              wishPage.drawRectangle({
                x: rightX,
                y: cardY,
                width: rightWidth,
                height: photoCardH,
                color: rgb(...palette.cardBackground),
                borderColor: rgb(...palette.border),
                borderWidth: 1,
              });
              wishPage.drawImage(img2, {
                x: rightX + 10,
                y: cardY + 28,
                width: rightWidth - 20,
                height: photoCardH - 38,
              });
              wishPage.drawText((p2.caption || "Photo memory").slice(0, 45), {
                x: rightX + 14,
                y: cardY + 10,
                size: 8.5,
                font: titleFont,
                color: rgb(...palette.textMuted),
              });
            } catch (err) {
              console.warn("Failed to embed bottom photo:", err);
            }
          }
        }
      }
    } else {
      // ---------------------------------------------------------------------
      // Portrait A4 Luxury Magazine Letter Spread Page
      // ---------------------------------------------------------------------
      const cardWidth = pageWidth - margin * 2;

      // Top running magazine folio
      wishPage.drawText("W I S H C A N V A S", {
        x: margin,
        y: pageHeight - 34,
        size: 7.5,
        font: titleFont,
        color: rgb(...palette.textMuted),
      });

      const headerCenter = `LETTER ${i + 1} OF ${messages.length}`;
      const headerCenterW = titleFont.widthOfTextAtSize(headerCenter, 7.5);
      wishPage.drawText(headerCenter, {
        x: (pageWidth - headerCenterW) / 2,
        y: pageHeight - 34,
        size: 7.5,
        font: titleFont,
        color: rgb(...palette.accent),
      });

      const headerRight = `PAGE ${pageIndex}`;
      const headerRightW = titleFont.widthOfTextAtSize(headerRight, 7.5);
      wishPage.drawText(headerRight, {
        x: pageWidth - margin - headerRightW,
        y: pageHeight - 34,
        size: 7.5,
        font: titleFont,
        color: rgb(...palette.textMuted),
      });

      wishPage.drawLine({
        start: { x: margin, y: pageHeight - 42 },
        end: { x: pageWidth - margin, y: pageHeight - 42 },
        thickness: 0.6,
        color: rgb(...palette.border),
      });

      if (!hasPhotos) {
        // Literary feature article spread (No photos)
        const cardY = 54;
        const cardH = pageHeight - 110;
        const usableW = cardWidth - 64;

        wishPage.drawRectangle({
          x: margin,
          y: cardY,
          width: cardWidth,
          height: cardH,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        // Top chapter indicator
        wishPage.drawText(`COLLECTED BLESSING`, {
          x: margin + 32,
          y: cardY + cardH - 34,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.accent),
        });

        const badgeText = `Letter #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 76;
        wishPage.drawRectangle({
          x: margin + cardWidth - 32 - badgeW,
          y: cardY + cardH - 42,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: margin + cardWidth - 32 - badgeW + 10,
          y: cardY + cardH - 35,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: margin + 32, y: cardY + cardH - 52 },
          end: { x: margin + cardWidth - 32, y: cardY + cardH - 52 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        let sNameSize = 30;
        while (headingFont.widthOfTextAtSize(senderName, sNameSize) > usableW && sNameSize > 18) {
          sNameSize -= 1;
        }

        wishPage.drawText(senderName, {
          x: margin + 32,
          y: cardY + cardH - 96,
          size: sNameSize,
          font: headingFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawText(`Personal wish written for ${recipientName}`, {
          x: margin + 32,
          y: cardY + cardH - 118,
          size: 10,
          font: bodyFont,
          color: rgb(...palette.textMuted),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Wishing you abundant joy, good health, and peace on your birthday!"';
        const isShortWish = quoteText.length < 100;
        const isMediumWish = quoteText.length < 260;
        const preferredQuoteSize = isShortWish ? 22 : isMediumWish ? 17.5 : quoteText.length < 500 ? 14.5 : 12;

        renderContainedText(
          wishPage,
          quoteText,
          margin + 32,
          cardY + cardH - 165,
          usableW,
          cardH - 260,
          quoteFont,
          {
            color: rgb(...palette.textDark),
            preferredSize: preferredQuoteSize,
            minSize: 10,
            verticalCenter: true,
          }
        );

        if (hasAudio) {
          wishPage.drawRectangle({
            x: margin + 32,
            y: cardY + 68,
            width: cardWidth - 64,
            height: 26,
            color: rgb(...palette.background),
            borderColor: rgb(...palette.accent),
            borderWidth: 0.8,
          });
          wishPage.drawText("Audio voice note recorded. Scan the QR code on page 2 to listen.", {
            x: margin + 46,
            y: cardY + 76,
            size: 9,
            font: titleFont,
            color: rgb(...palette.primary),
          });
        }

        wishPage.drawLine({
          start: { x: margin + 32, y: cardY + 54 },
          end: { x: margin + cardWidth - 32, y: cardY + 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        wishPage.drawText("WishCanvas Commemorative Archive", {
          x: margin + 32,
          y: cardY + 26,
          size: 8.5,
          font: obliqueFont,
          color: rgb(...palette.textMuted),
        });

        wishPage.drawText(`${pageIndex}`, {
          x: margin + cardWidth - 32 - 16,
          y: cardY + 26,
          size: 9.5,
          font: bodyFont,
          color: rgb(...palette.textMuted),
        });
      } else {
        // Magazine Photo Spread: Photo at the TOP (Hero), Letter below!
        const photoSectionY = 380;
        const photoSectionH = 370;

        if (wishPhotos.length === 1) {
          const photoBuffer = await fetchAndProcessImage(wishPhotos[0].url, 700, 600);
          if (photoBuffer) {
            try {
              const img = await doc.embedJpg(photoBuffer);
              wishPage.drawRectangle({
                x: margin,
                y: photoSectionY,
                width: cardWidth,
                height: photoSectionH,
                color: rgb(...palette.cardBackground),
                borderColor: rgb(...palette.border),
                borderWidth: 1,
              });

              const pPad = 12;
              const pW = cardWidth - pPad * 2;
              const pH = photoSectionH - 46;

              wishPage.drawImage(img, {
                x: margin + pPad,
                y: photoSectionY + 34,
                width: pW,
                height: pH,
              });

              const cap = wishPhotos[0].caption || `Photograph shared by ${senderName}`;
              wishPage.drawText(cap.slice(0, 60), {
                x: margin + pPad + 6,
                y: photoSectionY + 14,
                size: 9,
                font: titleFont,
                color: rgb(...palette.textMuted),
              });
            } catch (err) {
              console.warn("Failed to embed portrait single photo:", err);
            }
          }
        } else if (wishPhotos.length >= 2) {
          const [p1, p2] = wishPhotos;
          const b1 = p1 ? await fetchAndProcessImage(p1.url, 500, 500) : null;
          const b2 = p2 ? await fetchAndProcessImage(p2.url, 500, 500) : null;
          const halfWidth = (cardWidth - 14) / 2;

          if (b1) {
            try {
              const img1 = await doc.embedJpg(b1);
              wishPage.drawRectangle({
                x: margin,
                y: photoSectionY,
                width: halfWidth,
                height: photoSectionH,
                color: rgb(...palette.cardBackground),
                borderColor: rgb(...palette.border),
                borderWidth: 1,
              });
              wishPage.drawImage(img1, {
                x: margin + 8,
                y: photoSectionY + 34,
                width: halfWidth - 16,
                height: photoSectionH - 46,
              });
              wishPage.drawText((p1.caption || "Photo memory").slice(0, 35), {
                x: margin + 12,
                y: photoSectionY + 14,
                size: 8.5,
                font: titleFont,
                color: rgb(...palette.textMuted),
              });
            } catch (err) {
              console.warn("Failed to embed pair photo 1:", err);
            }
          }

          if (b2) {
            try {
              const img2 = await doc.embedJpg(b2);
              const p2X = margin + halfWidth + 14;
              wishPage.drawRectangle({
                x: p2X,
                y: photoSectionY,
                width: halfWidth,
                height: photoSectionH,
                color: rgb(...palette.cardBackground),
                borderColor: rgb(...palette.border),
                borderWidth: 1,
              });
              wishPage.drawImage(img2, {
                x: p2X + 8,
                y: photoSectionY + 34,
                width: halfWidth - 16,
                height: photoSectionH - 46,
              });
              wishPage.drawText((p2.caption || "Photo memory").slice(0, 35), {
                x: p2X + 12,
                y: photoSectionY + 14,
                size: 8.5,
                font: titleFont,
                color: rgb(...palette.textMuted),
              });
            } catch (err) {
              console.warn("Failed to embed pair photo 2:", err);
            }
          }
        }

        // Letter Section Below the Photo Plate
        const letterCardY = 54;
        const letterCardH = 312;
        const usableW = cardWidth - 48;

        wishPage.drawRectangle({
          x: margin,
          y: letterCardY,
          width: cardWidth,
          height: letterCardH,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        wishPage.drawText(`PERSONAL LETTER`, {
          x: margin + 24,
          y: letterCardY + letterCardH - 26,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.accent),
        });

        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 72;
        wishPage.drawRectangle({
          x: margin + cardWidth - 24 - badgeW,
          y: letterCardY + letterCardH - 33,
          width: badgeW,
          height: 20,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: margin + cardWidth - 24 - badgeW + 8,
          y: letterCardY + letterCardH - 27,
          size: 8.5,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: margin + 24, y: letterCardY + letterCardH - 40 },
          end: { x: margin + cardWidth - 24, y: letterCardY + letterCardH - 40 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        let sNameSize = 22;
        while (headingFont.widthOfTextAtSize(senderName, sNameSize) > usableW && sNameSize > 14) {
          sNameSize -= 1;
        }

        wishPage.drawText(senderName, {
          x: margin + 24,
          y: letterCardY + letterCardH - 66,
          size: sNameSize,
          font: headingFont,
          color: rgb(...palette.primary),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Wishing you abundant joy, good health, and peace on your birthday!"';
        const isShortWish = quoteText.length < 120;
        const preferredQuoteSize = isShortWish ? 16 : quoteText.length < 240 ? 14 : 11.5;
        renderContainedText(
          wishPage,
          quoteText,
          margin + 24,
          letterCardY + letterCardH - 92,
          usableW,
          letterCardH - 130,
          quoteFont,
          {
            color: rgb(...palette.textDark),
            preferredSize: preferredQuoteSize,
            minSize: 9.5,
            verticalCenter: true,
          }
        );

        if (hasAudio) {
          wishPage.drawText("Voice note recorded - scan QR code on page 2 to listen", {
            x: margin + 24,
            y: letterCardY + 16,
            size: 8,
            font: titleFont,
            color: rgb(...palette.accent),
          });
        }
      }
    }
  }

  // =========================================================================
  // CLOSING COMMEMORATIVE COLOPHON
  // =========================================================================
  const closingPage = createBasePage();
  const colophonY = pageHeight / 2 + 50;

  closingPage.drawText("Preserved Forever", {
    x: margin,
    y: colophonY,
    size: 26,
    font: headingFont,
    color: rgb(...palette.primary),
  });

  const closingLines = [
    `This commemorative keepsake was assembled for ${recipientName}`,
    "to celebrate a meaningful milestone surrounded by loved ones.",
    "",
    "Every wish, shared photograph, and spoken blessing collected",
    `remains preserved in the permanent digital archive at ${siteUrl}.`,
    "",
    `Published on ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}.`,
  ];

  let closeCursor = colophonY - 32;
  const usableCloseWidth = pageWidth - margin * 2;
  for (const rawLine of closingLines) {
    if (!rawLine) {
      closeCursor -= 14;
      continue;
    }
    const wrapped = wrapTextToWidth(cleanPdfText(rawLine), usableCloseWidth, bodyFont, 11);
    for (const line of wrapped) {
      closingPage.drawText(line, {
        x: margin,
        y: closeCursor,
        size: 11,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });
      closeCursor -= 18;
    }
  }

  return doc.save();
}
