import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import sanitizeHtml from "sanitize-html";
import sharp from "sharp";

export interface PdfThemePalette {
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
    primary: [0.12, 0.14, 0.18],
    accent: [0.85, 0.65, 0.25],
    background: [0.985, 0.98, 0.97],
    cardBackground: [1, 1, 1],
    textDark: [0.1, 0.12, 0.16],
    textMuted: [0.45, 0.48, 0.52],
    border: [0.9, 0.88, 0.84],
  },
  champagne: {
    primary: [0.2, 0.15, 0.12],
    accent: [0.88, 0.72, 0.35],
    background: [0.99, 0.98, 0.96],
    cardBackground: [1, 1, 1],
    textDark: [0.18, 0.14, 0.1],
    textMuted: [0.5, 0.46, 0.42],
    border: [0.92, 0.88, 0.82],
  },
  midnight: {
    primary: [0.08, 0.1, 0.16],
    accent: [0.4, 0.65, 0.95],
    background: [0.97, 0.98, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.08, 0.1, 0.16],
    textMuted: [0.42, 0.46, 0.52],
    border: [0.86, 0.89, 0.94],
  },
  lavender: {
    primary: [0.22, 0.16, 0.28],
    accent: [0.65, 0.45, 0.8],
    background: [0.98, 0.97, 0.99],
    cardBackground: [1, 1, 1],
    textDark: [0.18, 0.12, 0.24],
    textMuted: [0.48, 0.42, 0.52],
    border: [0.9, 0.86, 0.94],
  },
  rose: {
    primary: [0.28, 0.12, 0.16],
    accent: [0.85, 0.4, 0.5],
    background: [0.99, 0.97, 0.98],
    cardBackground: [1, 1, 1],
    textDark: [0.22, 0.1, 0.14],
    textMuted: [0.52, 0.42, 0.46],
    border: [0.94, 0.86, 0.9],
  },
  emerald: {
    primary: [0.08, 0.2, 0.14],
    accent: [0.2, 0.65, 0.4],
    background: [0.97, 0.99, 0.98],
    cardBackground: [1, 1, 1],
    textDark: [0.08, 0.18, 0.12],
    textMuted: [0.42, 0.5, 0.46],
    border: [0.86, 0.92, 0.88],
  },
  sunset: {
    primary: [0.28, 0.14, 0.1],
    accent: [0.92, 0.45, 0.25],
    background: [0.99, 0.975, 0.96],
    cardBackground: [1, 1, 1],
    textDark: [0.22, 0.12, 0.08],
    textMuted: [0.52, 0.44, 0.4],
    border: [0.94, 0.88, 0.84],
  },
};

function getThemePalette(themeKey?: unknown): PdfThemePalette {
  if (typeof themeKey !== "string") return THEME_PALETTES.elegant;
  const key = themeKey.toLowerCase().trim();
  return THEME_PALETTES[key] || THEME_PALETTES.elegant;
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

export function wrapPdfText(text: string, maxCharsPerLine: number): string[] {
  const sanitized = cleanPdfText(text);
  if (!sanitized) return [];

  const words = sanitized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    const candidate = `${current} ${word}`;
    if (candidate.length > maxCharsPerLine) {
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
  maxWidth = 600,
  maxHeight = 600
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

  // Typography system matching web app experience
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const obliqueFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  const serifBoldFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalicFont = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const monoFont = await doc.embedFont(StandardFonts.CourierBold);

  const recipientName = cleanPdfText(String(page.recipient_name || "Someone Special"));
  const birthdayDateLabel = formatAlbumDate(page.birthday_date);
  const creatorMessage = typeof page.creator_message === "string" ? page.creator_message.trim() : "";
  const publicCode = String(page.public_code || "");
  const siteUrl = options?.siteUrl || "https://wishcanvas.app";
  const celebrationUrl = publicCode ? `${siteUrl}/birthday/${publicCode}` : siteUrl;

  const palette = getThemePalette(page.theme);

  // Dimensions: Portrait A4 (595x842 pt) vs Landscape 16:9 Presentation Deck (960x540 pt)
  const pageWidth = isLandscape ? 960 : 595;
  const pageHeight = isLandscape ? 540 : 842;
  const margin = isLandscape ? 36 : 42;

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

    // Background fill
    p.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(...palette.background),
    });

    // Top thin theme accent line
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
    // 16:9 Widescreen Cover Slide
    const leftWidth = coverBuffer ? 520 : 880;
    const cardHeight = 460;
    const cardY = 38;

    // Left Editorial Card
    coverPage.drawRectangle({
      x: margin,
      y: cardY,
      width: leftWidth,
      height: cardHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 1,
    });

    // Top eyebrow tag
    coverPage.drawText("FIRST PAGE OUT OF THE ENVELOPE", {
      x: margin + 28,
      y: cardY + cardHeight - 38,
      size: 9.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    // Grand Birthday Heading
    coverPage.drawText("Happy Birthday,", {
      x: margin + 28,
      y: cardY + cardHeight - 78,
      size: 26,
      font: serifBoldFont,
      color: rgb(...palette.primary),
    });

    coverPage.drawText(`${recipientName}.`, {
      x: margin + 28,
      y: cardY + cardHeight - 120,
      size: 38,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    coverPage.drawText("Every note, photo, and voice clip inside was gathered to make this feel less like a page and more like a gift being opened.", {
      x: margin + 28,
      y: cardY + cardHeight - 150,
      size: 10,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    // Organizer Note (if present)
    const bentoMetricsY = cardY + 28;
    if (creatorMessage) {
      const orgBoxY = cardY + 110;
      const orgBoxHeight = 110;
      coverPage.drawRectangle({
        x: margin + 28,
        y: orgBoxY,
        width: leftWidth - 56,
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

      const quoteLines = wrapPdfText(`"${creatorMessage}"`, 55).slice(0, 4);
      let qCursor = orgBoxY + orgBoxHeight - 42;
      for (const line of quoteLines) {
        coverPage.drawText(line, {
          x: margin + 42,
          y: qCursor,
          size: 10.5,
          font: serifItalicFont,
          color: rgb(...palette.textDark),
        });
        qCursor -= 16;
      }
    }

    // Bottom Celebration Metrics Bento
    const metricBoxWidth = (leftWidth - 56 - 16) / 2;
    const metricBoxHeight = 62;

    // Tile 1: Wishes Gathered
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
      size: 22,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    // Tile 2: Reveal Date
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
      x: margin + 28 + metricBoxWidth + 28,
      y: bentoMetricsY + metricBoxHeight - 20,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });
    coverPage.drawText(birthdayDateLabel, {
      x: margin + 28 + metricBoxWidth + 28,
      y: bentoMetricsY + 18,
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

        // Photo inner image
        const imgPadding = 12;
        const imgWidth = photoCardWidth - imgPadding * 2;
        const imgHeight = photoCardHeight - 48;
        coverPage.drawImage(coverImg, {
          x: photoCardX + imgPadding,
          y: cardY + 36,
          width: imgWidth,
          height: imgHeight,
        });

        // Bottom caption tag
        coverPage.drawText(`${recipientName}'s birthday cover`, {
          x: photoCardX + imgPadding + 6,
          y: cardY + 16,
          size: 9.5,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });
      } catch (err) {
        console.warn("Failed to embed landscape cover image:", err);
      }
    }
  } else {
    // Portrait A4 Cover Page
    coverPage.drawText("W I S H C A N V A S", {
      x: margin,
      y: pageHeight - 52,
      size: 11,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    coverPage.drawText("MEMORIES & BLESSINGS KEEPSAKE BOOK", {
      x: margin,
      y: pageHeight - 68,
      size: 8.5,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    let currentCursor = pageHeight - 95;

    // Hero Cover Photo
    if (coverBuffer) {
      try {
        const coverImg = await doc.embedJpg(coverBuffer);
        const imgWidth = 320;
        const imgHeight = 270;
        const imgX = (pageWidth - imgWidth) / 2;
        const imgY = currentCursor - imgHeight;

        coverPage.drawRectangle({
          x: imgX - 6,
          y: imgY - 6,
          width: imgWidth + 12,
          height: imgHeight + 12,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.accent),
          borderWidth: 1.5,
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

    coverPage.drawText("Happy Birthday,", {
      x: margin,
      y: currentCursor,
      size: 20,
      font: serifBoldFont,
      color: rgb(...palette.accent),
    });

    coverPage.drawText(recipientName, {
      x: margin,
      y: currentCursor - 38,
      size: 34,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    coverPage.drawText(`Celebrated on ${birthdayDateLabel}`, {
      x: margin,
      y: currentCursor - 62,
      size: 11,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    currentCursor -= 95;

    // Organizer Foreword Card
    if (creatorMessage) {
      const qLines = wrapPdfText(`"${creatorMessage}"`, 64).slice(0, 5);
      const noteHeight = qLines.length * 17 + 34;

      coverPage.drawRectangle({
        x: margin,
        y: currentCursor - noteHeight,
        width: pageWidth - margin * 2,
        height: noteHeight,
        color: rgb(...palette.cardBackground),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });

      coverPage.drawText("A NOTE FROM THE ORGANIZER", {
        x: margin + 18,
        y: currentCursor - 18,
        size: 8,
        font: titleFont,
        color: rgb(...palette.accent),
      });

      let qc = currentCursor - 36;
      for (const line of qLines) {
        coverPage.drawText(line, {
          x: margin + 18,
          y: qc,
          size: 11,
          font: serifItalicFont,
          color: rgb(...palette.textDark),
        });
        qc -= 17;
      }

      currentCursor -= noteHeight + 20;
    }

    // Celebration Bento Tiles on Cover
    const tileWidth = (pageWidth - margin * 2 - 16) / 2;
    const tileHeight = 64;
    const tileY = Math.max(50, currentCursor - tileHeight);

    // Tile 1
    coverPage.drawRectangle({
      x: margin,
      y: tileY,
      width: tileWidth,
      height: tileHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 0.8,
    });
    coverPage.drawText("WISHES GATHERED", {
      x: margin + 16,
      y: tileY + tileHeight - 20,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });
    coverPage.drawText(String(messages.length), {
      x: margin + 16,
      y: tileY + 16,
      size: 22,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    // Tile 2
    coverPage.drawRectangle({
      x: margin + tileWidth + 16,
      y: tileY,
      width: tileWidth,
      height: tileHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 0.8,
    });
    coverPage.drawText("REVEAL DATE", {
      x: margin + tileWidth + 30,
      y: tileY + tileHeight - 20,
      size: 8,
      font: titleFont,
      color: rgb(...palette.textMuted),
    });
    coverPage.drawText(birthdayDateLabel, {
      x: margin + tileWidth + 30,
      y: tileY + 18,
      size: 11,
      font: titleFont,
      color: rgb(...palette.primary),
    });
  }

  // =========================================================================
  // SLIDE 2 / PAGE 2: STATS & LIVE CANVAS QR OVERVIEW
  // =========================================================================
  const statsPage = createBasePage();
  const qrBuffer = await generateQrBuffer(celebrationUrl, 240);

  if (isLandscape) {
    // 16:9 Overview Slide
    const leftW = 440;
    const cardH = 460;
    const cardY = 38;

    // Left Narrative & Bento Card
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
      y: cardY + cardH - 38,
      size: 9.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    statsPage.drawText("Collected with love.", {
      x: margin + 28,
      y: cardY + cardH - 74,
      size: 28,
      font: serifBoldFont,
      color: rgb(...palette.primary),
    });

    statsPage.drawText("Before the story started, loved ones left little pieces of themselves here. This is what made it into the envelope.", {
      x: margin + 28,
      y: cardY + cardH - 104,
      size: 10,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    // 3 Bento Stats Rows
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
        width: leftW - 56,
        height: 64,
        color: rgb(...palette.background),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });

      statsPage.drawText(stat.value, {
        x: margin + 44,
        y: bCursor + 22,
        size: 26,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      statsPage.drawText(stat.label.toUpperCase(), {
        x: margin + 110,
        y: bCursor + 38,
        size: 9,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      statsPage.drawText(stat.note, {
        x: margin + 110,
        y: bCursor + 20,
        size: 8.5,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });

      bCursor -= 76;
    }

    // Right Column: Interactive Live Canvas QR Card & Contributor Roll
    const rightX = margin + leftW + 20;
    const rightW = pageWidth - margin - rightX;

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
      const qrSize = 130;
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

      statsPage.drawText("Point your smartphone camera to access original audio recordings, full resolution photos, and ambient soundtrack playback.", {
        x: rightX + 28,
        y: qrY - 44,
        size: 9,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });
    } catch (err) {
      console.warn("Failed to embed landscape QR code:", err);
    }

    // Contributor Roll Call
    const rollHeaderY = cardY + 160;
    statsPage.drawText("CONTRIBUTORS & WELL-WISHERS", {
      x: rightX + 28,
      y: rollHeaderY,
      size: 8.5,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    const contribNames = uniqueContributors.map((c) => c.replace(/\b\w/g, (l) => l.toUpperCase())).join(", ") || "Friends and family";
    const rollLines = wrapPdfText(contribNames, 55).slice(0, 6);
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
    statsPage.drawText("THE SHAPE OF THE CELEBRATION", {
      x: margin,
      y: pageHeight - 50,
      size: 9,
      font: titleFont,
      color: rgb(...palette.accent),
    });

    statsPage.drawText("Collected with love.", {
      x: margin,
      y: pageHeight - 74,
      size: 26,
      font: serifBoldFont,
      color: rgb(...palette.primary),
    });

    statsPage.drawText(`A heartfelt collective keepsake assembled for ${recipientName}.`, {
      x: margin,
      y: pageHeight - 94,
      size: 10,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    // 3 Stat Tiles
    const statBoxWidth = (pageWidth - margin * 2 - 20) / 3;
    const statBoxHeight = 65;
    const statY = pageHeight - 175;

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
        y: statY + 34,
        size: 22,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      statsPage.drawText(stat.label, {
        x: boxX + 16,
        y: statY + 16,
        size: 9,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });
    });

    // Interactive QR Section
    const qrBoxY = pageHeight - 330;
    const qrBoxHeight = 125;

    statsPage.drawRectangle({
      x: margin,
      y: qrBoxY,
      width: pageWidth - margin * 2,
      height: qrBoxHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.accent),
      borderWidth: 1,
    });

    try {
      const qrImg = await doc.embedPng(qrBuffer);
      const qrSize = 100;

      statsPage.drawImage(qrImg, {
        x: margin + 14,
        y: qrBoxY + 12,
        width: qrSize,
        height: qrSize,
      });

      statsPage.drawText("Scan to Experience the Live Celebration", {
        x: margin + 130,
        y: qrBoxY + 88,
        size: 13,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      const qrExplainer = [
        "Open your smartphone camera and point it at the code to access",
        "the interactive digital canvas. Relive audio voice recordings,",
        "browse original high-resolution photos, and enjoy the ambient soundtrack.",
      ];

      let qrTextCursor = qrBoxY + 66;
      for (const line of qrExplainer) {
        statsPage.drawText(line, {
          x: margin + 130,
          y: qrTextCursor,
          size: 9,
          font: bodyFont,
          color: rgb(...palette.textMuted),
        });
        qrTextCursor -= 14;
      }
    } catch (err) {
      console.warn("Failed to embed portrait QR code:", err);
    }

    // Contributor Roll Call
    const rollCallY = pageHeight - 380;
    statsPage.drawText("Contributors & Well-Wishers", {
      x: margin,
      y: rollCallY,
      size: 13,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    const rollCallLines = wrapPdfText(
      uniqueContributors.map((c) => c.replace(/\b\w/g, (l) => l.toUpperCase())).join(", ") || "All friends and family",
      78
    ).slice(0, 10);

    let rollCursor = rollCallY - 22;
    for (const line of rollCallLines) {
      statsPage.drawText(line, {
        x: margin,
        y: rollCursor,
        size: 9.5,
        font: bodyFont,
        color: rgb(...palette.textDark),
      });
      rollCursor -= 16;
    }
  }

  // =========================================================================
  // PAGES 3+: AUTHENTIC PERSONAL LETTER KEEPSAKE SPREADS
  // Mirroring the exact anatomy of DesktopStorySection.tsx & DesktopWishPhotoGrid.tsx
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
      // ---------------------------------------------------------------------
      // 16:9 Widescreen Letter Slide
      // ---------------------------------------------------------------------
      const cardHeight = 460;
      const cardY = 38;

      if (!hasPhotos && !hasAudio) {
        // Scenario 1: Centerpiece Grand Letter Card
        const cardWidth = 720;
        const cardX = (pageWidth - cardWidth) / 2;

        wishPage.drawRectangle({
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.border),
          borderWidth: 1,
        });

        // Top Header Bar
        wishPage.drawText(`LETTER ${i + 1} OF ${messages.length}`, {
          x: cardX + 32,
          y: cardY + cardHeight - 36,
          size: 9.5,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });

        // Wish Pill Badge
        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 76;
        wishPage.drawRectangle({
          x: cardX + cardWidth - 32 - badgeW,
          y: cardY + cardHeight - 44,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: cardX + cardWidth - 32 - badgeW + 10,
          y: cardY + cardHeight - 37,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        // Hairline rule
        wishPage.drawLine({
          start: { x: cardX + 32, y: cardY + cardHeight - 54 },
          end: { x: cardX + cardWidth - 32, y: cardY + cardHeight - 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        // Sender Name
        wishPage.drawText(senderName, {
          x: cardX + 32,
          y: cardY + cardHeight - 92,
          size: 28,
          font: titleFont,
          color: rgb(...palette.primary),
        });

        // Serif Italic Quoted Message
        const quoteText = rawContent ? `"${rawContent}"` : '"Wishing you the happiest birthday filled with joy and blessings!"';
        const lines = wrapPdfText(quoteText, 56).slice(0, 11);
        let msgCursor = cardY + cardHeight - 140;
        for (const line of lines) {
          wishPage.drawText(line, {
            x: cardX + 32,
            y: msgCursor,
            size: 14,
            font: serifItalicFont,
            color: rgb(...palette.textDark),
          });
          msgCursor -= 22;
        }

        // Footer Bar
        wishPage.drawLine({
          start: { x: cardX + 32, y: cardY + 54 },
          end: { x: cardX + cardWidth - 32, y: cardY + 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        // Personal letter keepsake pill
        wishPage.drawRectangle({
          x: cardX + 32,
          y: cardY + 22,
          width: 140,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText("Personal letter keepsake", {
          x: cardX + 42,
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
        // Scenario 2: Letter Card (Left) + Voice Note Card (Right)
        const leftWidth = 480;
        const rightWidth = 380;
        const rightX = margin + leftWidth + 20;

        // Left Letter Card
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
          x: margin + 28,
          y: cardY + cardHeight - 36,
          size: 9,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });

        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 74;
        wishPage.drawRectangle({
          x: margin + leftWidth - 28 - badgeW,
          y: cardY + cardHeight - 44,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: margin + leftWidth - 28 - badgeW + 8,
          y: cardY + cardHeight - 37,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: margin + 28, y: cardY + cardHeight - 52 },
          end: { x: margin + leftWidth - 28, y: cardY + cardHeight - 52 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        wishPage.drawText(senderName, {
          x: margin + 28,
          y: cardY + cardHeight - 88,
          size: 24,
          font: titleFont,
          color: rgb(...palette.primary),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Sent with warmest affection."';
        const lines = wrapPdfText(quoteText, 45).slice(0, 11);
        let msgCursor = cardY + cardHeight - 128;
        for (const line of lines) {
          wishPage.drawText(line, {
            x: margin + 28,
            y: msgCursor,
            size: 13,
            font: serifItalicFont,
            color: rgb(...palette.textDark),
          });
          msgCursor -= 20;
        }

        // Voice note enclosed tag
        wishPage.drawRectangle({
          x: margin + 28,
          y: cardY + 22,
          width: 130,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.accent),
          borderWidth: 0.8,
        });
        wishPage.drawText("Voice note enclosed", {
          x: margin + 38,
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
          const qrSize = 130;
          const qrX = rightX + (rightWidth - qrSize) / 2;
          const qrY = cardY + cardHeight - qrSize - 70;

          wishPage.drawImage(qrImg, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });

          wishPage.drawText("Voice Note Keepsake", {
            x: rightX + 32,
            y: cardY + cardHeight - 44,
            size: 14,
            font: titleFont,
            color: rgb(...palette.primary),
          });

          wishPage.drawText(`Spoken with love by ${senderName}`, {
            x: rightX + 32,
            y: cardY + cardHeight - 62,
            size: 9.5,
            font: bodyFont,
            color: rgb(...palette.textMuted),
          });

          wishPage.drawText("Scan to Listen to this Wish", {
            x: rightX + 32,
            y: qrY - 30,
            size: 11,
            font: titleFont,
            color: rgb(...palette.primary),
          });

          wishPage.drawText("Point your smartphone camera to stream the spoken voice note directly.", {
            x: rightX + 32,
            y: qrY - 48,
            size: 8.5,
            font: bodyFont,
            color: rgb(...palette.textMuted),
          });
        } catch (err) {
          console.warn("Failed to embed wish audio QR code:", err);
        }
      } else {
        // Scenario 3: Letter Card (Left) + Framed Photo Grid (Right)
        const leftWidth = 460;
        const rightWidth = pageWidth - margin * 2 - leftWidth - 20;
        const rightX = margin + leftWidth + 20;

        // Left Letter Card
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
          x: margin + 28,
          y: cardY + cardHeight - 36,
          size: 9,
          font: titleFont,
          color: rgb(...palette.textMuted),
        });

        const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
        const badgeW = 74;
        wishPage.drawRectangle({
          x: margin + leftWidth - 28 - badgeW,
          y: cardY + cardHeight - 44,
          width: badgeW,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText(badgeText, {
          x: margin + leftWidth - 28 - badgeW + 8,
          y: cardY + cardHeight - 37,
          size: 9,
          font: monoFont,
          color: rgb(...palette.primary),
        });

        wishPage.drawLine({
          start: { x: margin + 28, y: cardY + cardHeight - 52 },
          end: { x: margin + leftWidth - 28, y: cardY + cardHeight - 52 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        wishPage.drawText(senderName, {
          x: margin + 28,
          y: cardY + cardHeight - 88,
          size: 24,
          font: titleFont,
          color: rgb(...palette.primary),
        });

        const quoteText = rawContent ? `"${rawContent}"` : '"Sent with warmest affection."';
        const lines = wrapPdfText(quoteText, 44).slice(0, 11);
        let msgCursor = cardY + cardHeight - 126;
        for (const line of lines) {
          wishPage.drawText(line, {
            x: margin + 28,
            y: msgCursor,
            size: 13,
            font: serifItalicFont,
            color: rgb(...palette.textDark),
          });
          msgCursor -= 20;
        }

        // Footer Bar
        wishPage.drawLine({
          start: { x: margin + 28, y: cardY + 54 },
          end: { x: margin + leftWidth - 28, y: cardY + 54 },
          thickness: 0.5,
          color: rgb(...palette.border),
        });

        wishPage.drawRectangle({
          x: margin + 28,
          y: cardY + 22,
          width: 140,
          height: 22,
          color: rgb(...palette.background),
          borderColor: rgb(...palette.border),
          borderWidth: 0.8,
        });
        wishPage.drawText("Personal letter keepsake", {
          x: margin + 38,
          y: cardY + 29,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.primary),
        });

        if (hasAudio) {
          wishPage.drawText("Voice note enclosed", {
            x: margin + leftWidth - 140,
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
              const pH = cardHeight - 48;
              wishPage.drawImage(img, {
                x: rightX + pPad,
                y: cardY + 36,
                width: pW,
                height: pH,
              });

              const cap = wishPhotos[0].caption || "Photo memory";
              wishPage.drawText(cap.slice(0, 48), {
                x: rightX + pPad + 6,
                y: cardY + 16,
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

          // Top Photo Card
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

          // Bottom Photo Card
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
      // Portrait A4 Letter Spread Page
      // Authentically modeled on DesktopStorySection Personal Letter Keepsake
      // ---------------------------------------------------------------------
      const cardWidth = pageWidth - margin * 2;
      const cardTopY = pageHeight - 50;

      // Header rule
      wishPage.drawText(`LETTER ${i + 1} OF ${messages.length}`, {
        x: margin,
        y: cardTopY,
        size: 9,
        font: titleFont,
        color: rgb(...palette.accent),
      });

      const badgeText = `Wish #${String(i + 1).padStart(2, "0")}`;
      const badgeW = 70;
      wishPage.drawRectangle({
        x: pageWidth - margin - badgeW,
        y: cardTopY - 7,
        width: badgeW,
        height: 20,
        color: rgb(...palette.cardBackground),
        borderColor: rgb(...palette.border),
        borderWidth: 0.8,
      });
      wishPage.drawText(badgeText, {
        x: pageWidth - margin - badgeW + 8,
        y: cardTopY - 1,
        size: 8.5,
        font: monoFont,
        color: rgb(...palette.primary),
      });

      wishPage.drawLine({
        start: { x: margin, y: cardTopY - 16 },
        end: { x: pageWidth - margin, y: cardTopY - 16 },
        thickness: 0.5,
        color: rgb(...palette.border),
      });

      // Sender Name
      const nameY = cardTopY - 44;
      wishPage.drawText(senderName, {
        x: margin,
        y: nameY,
        size: 22,
        font: titleFont,
        color: rgb(...palette.primary),
      });

      wishPage.drawText(`Shared with love for ${recipientName}`, {
        x: margin,
        y: nameY - 16,
        size: 9,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });

      // Letter Quoted Message Hero Card
      const quoteText = rawContent ? `"${rawContent}"` : '"Wishing you abundant joy, good health, and peace on your birthday!"';
      const maxMsgLines = hasPhotos ? 8 : 16;
      const lines = wrapPdfText(quoteText, 58).slice(0, maxMsgLines);
      const letterBoxHeight = Math.max(90, lines.length * 18 + 40);
      const letterBoxY = nameY - 32 - letterBoxHeight;

      wishPage.drawRectangle({
        x: margin,
        y: letterBoxY,
        width: cardWidth,
        height: letterBoxHeight,
        color: rgb(...palette.cardBackground),
        borderColor: rgb(...palette.border),
        borderWidth: 1,
      });

      let msgCursor = letterBoxY + letterBoxHeight - 28;
      for (const line of lines) {
        wishPage.drawText(line, {
          x: margin + 24,
          y: msgCursor,
          size: 12,
          font: serifItalicFont,
          color: rgb(...palette.textDark),
        });
        msgCursor -= 18;
      }

      let bottomCursor = letterBoxY - 16;

      // Photo Section (if present)
      if (wishPhotos.length === 1) {
        const pData = wishPhotos[0];
        const photoBuffer = await fetchAndProcessImage(pData.url, 600, 450);
        if (photoBuffer) {
          try {
            const img = await doc.embedJpg(photoBuffer);
            const pWidth = 320;
            const pHeight = Math.min(220, Math.max(140, bottomCursor - 100));
            const pX = (pageWidth - pWidth) / 2;
            const pY = bottomCursor - pHeight;

            wishPage.drawRectangle({
              x: pX - 4,
              y: pY - 4,
              width: pWidth + 8,
              height: pHeight + 8,
              color: rgb(...palette.cardBackground),
              borderColor: rgb(...palette.border),
              borderWidth: 1,
            });

            wishPage.drawImage(img, {
              x: pX,
              y: pY,
              width: pWidth,
              height: pHeight,
            });

            if (pData.caption) {
              wishPage.drawText(pData.caption.slice(0, 60), {
                x: pX,
                y: pY - 14,
                size: 8.5,
                font: obliqueFont,
                color: rgb(...palette.textMuted),
              });
            }

            bottomCursor = pY - 24;
          } catch (err) {
            console.warn("Failed to embed portrait photo:", err);
          }
        }
      } else if (wishPhotos.length >= 2) {
        const [p1, p2] = wishPhotos;
        const b1 = p1 ? await fetchAndProcessImage(p1.url, 400, 320) : null;
        const b2 = p2 ? await fetchAndProcessImage(p2.url, 400, 320) : null;

        const pWidth = 240;
        const pHeight = 160;
        const pY = bottomCursor - pHeight;

        if (b1) {
          try {
            const img1 = await doc.embedJpg(b1);
            wishPage.drawRectangle({
              x: margin - 3,
              y: pY - 3,
              width: pWidth + 6,
              height: pHeight + 6,
              color: rgb(...palette.cardBackground),
              borderColor: rgb(...palette.border),
              borderWidth: 0.8,
            });
            wishPage.drawImage(img1, {
              x: margin,
              y: pY,
              width: pWidth,
              height: pHeight,
            });
          } catch (err) {
            console.warn("Failed to embed pair photo 1:", err);
          }
        }

        if (b2) {
          try {
            const img2 = await doc.embedJpg(b2);
            const p2X = pageWidth - margin - pWidth;
            wishPage.drawRectangle({
              x: p2X - 3,
              y: pY - 3,
              width: pWidth + 6,
              height: pHeight + 6,
              color: rgb(...palette.cardBackground),
              borderColor: rgb(...palette.border),
              borderWidth: 0.8,
            });
            wishPage.drawImage(img2, {
              x: p2X,
              y: pY,
              width: pWidth,
              height: pHeight,
            });
          } catch (err) {
            console.warn("Failed to embed pair photo 2:", err);
          }
        }

        bottomCursor = pY - 20;
      }

      // Voice Note Pill (if present)
      if (hasAudio) {
        const audioY = Math.max(54, bottomCursor - 28);
        wishPage.drawRectangle({
          x: margin,
          y: audioY,
          width: cardWidth,
          height: 24,
          color: rgb(...palette.cardBackground),
          borderColor: rgb(...palette.accent),
          borderWidth: 0.8,
        });

        wishPage.drawText("Audio voice note recorded. Scan the QR code on page 2 to listen.", {
          x: margin + 14,
          y: audioY + 7,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.primary),
        });
      }

      // Elegant Footer Bar
      wishPage.drawLine({
        start: { x: margin, y: 34 },
        end: { x: pageWidth - margin, y: 34 },
        thickness: 0.5,
        color: rgb(...palette.border),
      });

      wishPage.drawText("Personal letter keepsake", {
        x: margin,
        y: 20,
        size: 8,
        font: obliqueFont,
        color: rgb(...palette.textMuted),
      });

      wishPage.drawText(`${pageIndex}`, {
        x: pageWidth - margin - 16,
        y: 20,
        size: 9,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });
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
    size: 24,
    font: serifBoldFont,
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

  let closeCursor = colophonY - 30;
  for (const line of closingLines) {
    closingPage.drawText(cleanPdfText(line), {
      x: margin,
      y: closeCursor,
      size: 11,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });
    closeCursor -= 18;
  }

  return doc.save();
}
