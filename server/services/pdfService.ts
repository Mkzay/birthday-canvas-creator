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
    primary: [0.12, 0.14, 0.18], // Slate charcoal
    accent: [0.85, 0.65, 0.25], // Champagne gold
    background: [0.985, 0.98, 0.97], // Warm parchment
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
      // Local upload path
      const cleaned = urlOrPath.replace(/^\/+/, "");
      const fullPath = path.resolve(process.cwd(), cleaned);
      rawBuffer = await fs.readFile(fullPath);
    }

    if (!rawBuffer || rawBuffer.length === 0) return null;

    // Convert any incoming image format (WebP, PNG, HEIC, JPEG) into optimized JPEG
    const processed = await sharp(rawBuffer)
      .rotate() // auto-orient based on EXIF
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

export async function buildBrandedPagePdf(
  page: Record<string, unknown>,
  messages: Array<Record<string, unknown>>,
  options?: { siteUrl?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const obliqueFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  const serifFont = await doc.embedFont(StandardFonts.TimesRomanBold);

  const recipientName = cleanPdfText(String(page.recipient_name || "Someone Special"));
  const birthdayDateLabel = formatAlbumDate(page.birthday_date);
  const creatorMessage = typeof page.creator_message === "string" ? page.creator_message.trim() : "";
  const publicCode = String(page.public_code || "");
  const siteUrl = options?.siteUrl || "https://wishcanvas.app";
  const celebrationUrl = publicCode ? `${siteUrl}/birthday/${publicCode}` : siteUrl;

  const palette = getThemePalette(page.theme);
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 44;

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

  const createStyledPage = () => {
    const p = doc.addPage([pageWidth, pageHeight]);
    pageIndex += 1;

    // Fill page background with warm parchment texture
    p.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(...palette.background),
    });

    // Top thin accent rule
    p.drawRectangle({
      x: 0,
      y: pageHeight - 6,
      width: pageWidth,
      height: 6,
      color: rgb(...palette.accent),
    });

    // Subtle header on subsequent pages
    if (pageIndex > 1) {
      p.drawText("WISHCANVAS CELEBRATION ALBUM", {
        x: margin,
        y: pageHeight - 28,
        size: 8,
        font: titleFont,
        color: rgb(...palette.textMuted),
      });

      p.drawText(`For ${recipientName}`, {
        x: pageWidth - margin - 120,
        y: pageHeight - 28,
        size: 8,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });

      // Hairline rule under header
      p.drawLine({
        start: { x: margin, y: pageHeight - 34 },
        end: { x: pageWidth - margin, y: pageHeight - 34 },
        thickness: 0.5,
        color: rgb(...palette.border),
      });
    }

    // Elegant footer
    p.drawLine({
      start: { x: margin, y: 34 },
      end: { x: pageWidth - margin, y: 34 },
      thickness: 0.5,
      color: rgb(...palette.border),
    });

    p.drawText("Preserved with love on WishCanvas", {
      x: margin,
      y: 20,
      size: 8,
      font: obliqueFont,
      color: rgb(...palette.textMuted),
    });

    p.drawText(`${pageIndex}`, {
      x: pageWidth - margin - 16,
      y: 20,
      size: 9,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    return p;
  };

  // ==========================================
  // PAGE 1: THE GRAND EDITORIAL COVER
  // ==========================================
  const coverPage = createStyledPage();

  coverPage.drawText("W I S H C A N V A S", {
    x: margin,
    y: pageHeight - 50,
    size: 10,
    font: titleFont,
    color: rgb(...palette.accent),
  });

  coverPage.drawText("MEMORIES & BLESSINGS KEEPSAKE", {
    x: margin,
    y: pageHeight - 64,
    size: 8,
    font: bodyFont,
    color: rgb(...palette.textMuted),
  });

  // Hero Cover Photo Frame
  let coverEmbedded = false;
  const coverUrl = typeof page.cover_photo_url === "string" ? page.cover_photo_url.trim() : "";
  if (coverUrl) {
    const coverBuffer = await fetchAndProcessImage(coverUrl, 700, 700);
    if (coverBuffer) {
      try {
        const coverImg = await doc.embedJpg(coverBuffer);
        const imgWidth = 280;
        const imgHeight = 260;
        const imgX = (pageWidth - imgWidth) / 2;
        const imgY = pageHeight - 350;

        // Card container shadow border
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

        coverEmbedded = true;
      } catch (err) {
        console.warn("Failed to embed cover image:", err);
      }
    }
  }

  // Cover typography placement
  const textStartY = coverEmbedded ? pageHeight - 390 : pageHeight - 160;

  coverPage.drawText(`Happy Birthday,`, {
    x: margin,
    y: textStartY,
    size: 18,
    font: serifFont,
    color: rgb(...palette.accent),
  });

  coverPage.drawText(recipientName, {
    x: margin,
    y: textStartY - 36,
    size: 32,
    font: titleFont,
    color: rgb(...palette.primary),
  });

  coverPage.drawText(birthdayDateLabel, {
    x: margin,
    y: textStartY - 60,
    size: 13,
    font: bodyFont,
    color: rgb(...palette.textMuted),
  });

  // Creator Foreword / Note
  if (creatorMessage) {
    const quoteY = textStartY - 90;
    const quoteLines = wrapPdfText(creatorMessage, 68).slice(0, 5);
    const cardHeight = quoteLines.length * 16 + 24;

    coverPage.drawRectangle({
      x: margin,
      y: quoteY - cardHeight,
      width: pageWidth - margin * 2,
      height: cardHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 0.5,
    });

    // Accent line on left edge of quote
    coverPage.drawRectangle({
      x: margin,
      y: quoteY - cardHeight,
      width: 3.5,
      height: cardHeight,
      color: rgb(...palette.accent),
    });

    let lineCursorY = quoteY - 18;
    for (const line of quoteLines) {
      coverPage.drawText(line, {
        x: margin + 14,
        y: lineCursorY,
        size: 10,
        font: obliqueFont,
        color: rgb(...palette.textDark),
      });
      lineCursorY -= 15;
    }
  }

  // Bottom Tally summary bar
  const summaryBoxY = 60;
  coverPage.drawRectangle({
    x: margin,
    y: summaryBoxY,
    width: pageWidth - margin * 2,
    height: 38,
    color: rgb(...palette.cardBackground),
    borderColor: rgb(...palette.border),
    borderWidth: 0.5,
  });

  coverPage.drawText(
    `${messages.length} wishes gathered   ·   ${totalPhotos} photos preserved   ·   ${totalAudio} voice blessings`,
    {
      x: margin + 16,
      y: summaryBoxY + 14,
      size: 9,
      font: titleFont,
      color: rgb(...palette.textDark),
    }
  );

  // ==========================================
  // PAGE 2: THE GATHERING & CELEBRATION QR
  // ==========================================
  const storyPage = createStyledPage();

  storyPage.drawText("The Milestone Gathering", {
    x: margin,
    y: pageHeight - 70,
    size: 22,
    font: serifFont,
    color: rgb(...palette.primary),
  });

  storyPage.drawText(
    `A heartfelt collective tribute lovingly assembled for ${recipientName}.`,
    {
      x: margin,
      y: pageHeight - 92,
      size: 11,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    }
  );

  // Stats Card Row (3 columns)
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
    storyPage.drawRectangle({
      x: boxX,
      y: statY,
      width: statBoxWidth,
      height: statBoxHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 0.5,
    });

    storyPage.drawText(stat.value, {
      x: boxX + 16,
      y: statY + 34,
      size: 22,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    storyPage.drawText(stat.label, {
      x: boxX + 16,
      y: statY + 16,
      size: 9,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });
  });

  // Interactive QR Code Section
  const qrBoxY = pageHeight - 330;
  const qrBoxHeight = 130;

  storyPage.drawRectangle({
    x: margin,
    y: qrBoxY,
    width: pageWidth - margin * 2,
    height: qrBoxHeight,
    color: rgb(...palette.cardBackground),
    borderColor: rgb(...palette.accent),
    borderWidth: 1,
  });

  try {
    const qrBuffer = await generateQrBuffer(celebrationUrl, 220);
    const qrImg = await doc.embedPng(qrBuffer);
    const qrSize = 104;

    storyPage.drawImage(qrImg, {
      x: margin + 14,
      y: qrBoxY + 13,
      width: qrSize,
      height: qrSize,
    });

    storyPage.drawText("Scan to Experience the Live Celebration", {
      x: margin + 130,
      y: qrBoxY + 92,
      size: 13,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    const qrExplainer = [
      "Open your smartphone camera and point it at the code to access",
      "the interactive digital canvas. Relive audio voice recordings,",
      "browse original high-resolution photos, and enjoy the ambient soundtrack.",
    ];

    let qrTextCursor = qrBoxY + 70;
    for (const line of qrExplainer) {
      storyPage.drawText(line, {
        x: margin + 130,
        y: qrTextCursor,
        size: 9,
        font: bodyFont,
        color: rgb(...palette.textMuted),
      });
      qrTextCursor -= 14;
    }
  } catch (err) {
    console.warn("Failed to embed celebration QR code:", err);
  }

  // Contributor Roll Call
  const rollCallY = pageHeight - 380;
  storyPage.drawText("Contributors & Well-Wishers", {
    x: margin,
    y: rollCallY,
    size: 14,
    font: titleFont,
    color: rgb(...palette.primary),
  });

  const rollCallLines = wrapPdfText(
    uniqueContributors.map((c) => c.replace(/\b\w/g, (l) => l.toUpperCase())).join(", ") || "All friends and family",
    80
  ).slice(0, 8);

  let rollCursor = rollCallY - 22;
  for (const line of rollCallLines) {
    storyPage.drawText(line, {
      x: margin,
      y: rollCursor,
      size: 9.5,
      font: bodyFont,
      color: rgb(...palette.textDark),
    });
    rollCursor -= 16;
  }

  // ==========================================
  // PAGES 3+: EDITORIAL WISH SPREADS
  // ==========================================
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const wishPage = createStyledPage();

    const senderName = cleanPdfText(String(message.sender_name || "Loving Contributor"));
    const initial = senderName.charAt(0).toUpperCase() || "W";
    const dateSubmitted = message.created_at ? formatAlbumDate(message.created_at) : birthdayDateLabel;

    const rawContent = sanitizeHtml(String(message.message || ""), {
      allowedTags: [],
      allowedAttributes: {},
    })
      .replace(/\s+/g, " ")
      .trim();

    // Contributor Header Card
    const headerBoxY = pageHeight - 110;
    wishPage.drawRectangle({
      x: margin,
      y: headerBoxY,
      width: pageWidth - margin * 2,
      height: 52,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 0.5,
    });

    // Decorative initial seal
    wishPage.drawCircle({
      x: margin + 26,
      y: headerBoxY + 26,
      size: 16,
      color: rgb(...palette.accent),
    });

    wishPage.drawText(initial, {
      x: margin + 21,
      y: headerBoxY + 20,
      size: 14,
      font: titleFont,
      color: rgb(1, 1, 1),
    });

    wishPage.drawText(senderName, {
      x: margin + 52,
      y: headerBoxY + 31,
      size: 13,
      font: titleFont,
      color: rgb(...palette.primary),
    });

    wishPage.drawText(`Shared on ${dateSubmitted}`, {
      x: margin + 52,
      y: headerBoxY + 16,
      size: 9,
      font: bodyFont,
      color: rgb(...palette.textMuted),
    });

    // Wish Message Box
    const messageLines = wrapPdfText(rawContent || "(Sent a warm blessing with heartfelt affection)", 70);
    const contentLinesToShow = messageLines.slice(0, 16);
    const contentBoxHeight = Math.max(70, contentLinesToShow.length * 17 + 26);
    const contentBoxY = headerBoxY - contentBoxHeight - 14;

    wishPage.drawRectangle({
      x: margin,
      y: contentBoxY,
      width: pageWidth - margin * 2,
      height: contentBoxHeight,
      color: rgb(...palette.cardBackground),
      borderColor: rgb(...palette.border),
      borderWidth: 0.5,
    });

    // Opening quotation mark ornament
    wishPage.drawText('"', {
      x: margin + 14,
      y: contentBoxY + contentBoxHeight - 24,
      size: 24,
      font: serifFont,
      color: rgb(...palette.accent),
    });

    let msgCursorY = contentBoxY + contentBoxHeight - 22;
    for (const line of contentLinesToShow) {
      wishPage.drawText(line, {
        x: margin + 28,
        y: msgCursorY,
        size: 10.5,
        font: bodyFont,
        color: rgb(...palette.textDark),
      });
      msgCursorY -= 17;
    }

    // Attachments area: Contributor Photos
    const rawPhotos = Array.isArray(message.photos)
      ? message.photos
      : (message.photo_url || message.legacy_photo_url)
      ? [{ url: message.photo_url || message.legacy_photo_url, caption: null }]
      : [];

    const photosToEmbed = rawPhotos
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
      .filter((p) => Boolean(p && p.url))
      .slice(0, 2);

    let photoSectionY = contentBoxY - 14;

    if (photosToEmbed.length === 1) {
      const pData = photosToEmbed[0]!;
      const photoBuffer = await fetchAndProcessImage(pData.url, 600, 450);
      if (photoBuffer) {
        try {
          const img = await doc.embedJpg(photoBuffer);
          const pWidth = 320;
          const pHeight = 220;
          const pX = (pageWidth - pWidth) / 2;
          const pY = Math.max(70, photoSectionY - pHeight);

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
          photoSectionY = pY - 24;
        } catch (err) {
          console.warn("Failed to embed photo:", err);
        }
      }
    } else if (photosToEmbed.length >= 2) {
      const [p1, p2] = photosToEmbed;
      const b1 = p1 ? await fetchAndProcessImage(p1.url, 400, 320) : null;
      const b2 = p2 ? await fetchAndProcessImage(p2.url, 400, 320) : null;

      const pWidth = 230;
      const pHeight = 170;
      const pY = Math.max(70, photoSectionY - pHeight);

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
            borderWidth: 0.5,
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
            borderWidth: 0.5,
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

      photoSectionY = pY - 20;
    }

    // Audio Voice Note Tag
    if (message.audio_url) {
      const audioY = Math.max(50, photoSectionY - 26);
      wishPage.drawRectangle({
        x: margin,
        y: audioY,
        width: pageWidth - margin * 2,
        height: 24,
        color: rgb(...palette.cardBackground),
        borderColor: rgb(...palette.accent),
        borderWidth: 0.5,
      });

      wishPage.drawText(
        "Audio voice note recorded. Scan the QR code on page 2 to listen.",
        {
          x: margin + 12,
          y: audioY + 7,
          size: 8.5,
          font: titleFont,
          color: rgb(...palette.primary),
        }
      );
    }
  }

  // ==========================================
  // FINAL PAGE: COMMEMORATIVE COLOPHON
  // ==========================================
  const closingPage = createStyledPage();

  const colophonY = pageHeight / 2 + 60;

  closingPage.drawText("Preserved Forever", {
    x: margin,
    y: colophonY,
    size: 24,
    font: serifFont,
    color: rgb(...palette.primary),
  });

  const closingLines = [
    `This commemorative keepsake was assembled for ${recipientName}`,
    `to celebrate a meaningful milestone surrounded by loved ones.`,
    "",
    `Every wish, shared photograph, and spoken blessing collected`,
    `remains preserved in the permanent digital archive at wishcanvas.app.`,
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
