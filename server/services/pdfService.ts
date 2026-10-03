import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sanitizeHtml from "sanitize-html";

export function wrapPdfText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!current.length) {
      current = word;
      return;
    }

    const next = `${current} ${word}`;
    if (next.length > maxCharsPerLine) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current.length) {
    lines.push(current);
  }

  return lines;
}

export async function buildBrandedPagePdf(
  page: Record<string, unknown>,
  messages: Array<Record<string, unknown>>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let currentPage = doc.addPage([595, 842]);
  const { width, height } = currentPage.getSize();
  const margin = 44;
  const lineHeight = 16;
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const smallFont = await doc.embedFont(StandardFonts.HelveticaOblique);

  const recipientName = String(page.recipient_name || "Someone special");
  const creatorMessage = typeof page.creator_message === "string" ? page.creator_message.trim() : "";
  const birthdayDateLabel = (() => {
    const raw = String(page.birthday_date || "");
    const parsed = raw ? new Date(raw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return raw || "-";
    return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const uniqueContributors = Array.from(new Set(messages.map((message) => String(message.sender_name || "Anonymous").trim().toLowerCase())));
  const totalPhotos = messages.reduce((count, message) => {
    if (Array.isArray(message.photos) && message.photos.length) {
      return count + message.photos.length;
    }
    return count + (message.photo_url ? 1 : 0);
  }, 0);
  const totalAudio = messages.reduce((count, message) => count + (message.audio_url ? 1 : 0), 0);

  let pageNumber = 0;

  const startNewPage = () => {
    if (pageNumber > 0) {
      currentPage = doc.addPage([595, 842]);
    }
    pageNumber += 1;
    currentPage.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.996, 0.989, 0.978) });
    currentPage.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: rgb(0.972, 0.627, 0.125) });
    currentPage.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: rgb(0.902, 0.298, 0.235), opacity: 0.19 });
  };

  const drawHeader = () => {
    startNewPage();
    currentPage.drawText("WishCanvas Birthday Keepsake", {
      x: margin,
      y: height - 68,
      size: 20,
      font: titleFont,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText(`For ${recipientName}`, {
      x: margin,
      y: height - 92,
      size: 12,
      font: bodyFont,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText(`Slide export : ${new Date().toLocaleString()}`, {
      x: margin,
      y: height - 111,
      size: 9,
      font: smallFont,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText(`${pageNumber}`, {
      x: width - margin - 8,
      y: 20,
      size: 10,
      font: bodyFont,
      color: rgb(0.47, 0.39, 0.31),
    });
  };

  let cursorY = height - 160;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight > margin) {
      return;
    }
    drawHeader();
    cursorY = height - 160;
  };

function cleanPdfText(text: string): string {
  // Strip characters outside WinAnsi range (e.g. emojis) to prevent pdf-lib encoding crash
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

  const drawLine = (text: string, size = 11, bold = false) => {
    ensureSpace(lineHeight + 2);
    const sanitized = cleanPdfText(text);
    currentPage.drawText(sanitized, {
      x: margin,
      y: cursorY,
      size,
      font: bold ? titleFont : bodyFont,
      color: rgb(0.13, 0.15, 0.2),
    });
    cursorY -= lineHeight;
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    drawHeader();
    cursorY = height - 168;
    drawLine(title, 18, true);
    if (subtitle) {
      drawLine(subtitle, 11, false);
    }
    drawLine("");
  };

  drawSectionTitle("Slide 1 : Cover", `Happy Birthday, ${recipientName}`);
  drawLine(`Birthday date: ${birthdayDateLabel}`);
  if (creatorMessage) {
    drawLine("");
    drawLine("Creator note", 12, true);
    wrapPdfText(creatorMessage, 88).slice(0, 8).forEach((line) => drawLine(line));
  }
  drawLine("");

  drawSectionTitle("Slide 2 : The shape of the celebration");
  drawLine(`Wishes collected: ${messages.length}`);
  drawLine(`Contributors: ${uniqueContributors.length}`);
  drawLine(`Photos attached: ${totalPhotos}`);
  drawLine(`Voice notes attached: ${totalAudio}`);
  drawLine("");

  if (creatorMessage) {
    drawSectionTitle("Slide 3 : Organizer", "A note from the organizer");
    wrapPdfText(creatorMessage, 88).slice(0, 12).forEach((line) => drawLine(line));
    drawLine("");
  }

  messages.forEach((message, index) => {
    const senderName = String(message.sender_name || "Anonymous");
    const plainMessage = sanitizeHtml(String(message.message || ""), { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
    const photoCount = Array.isArray(message.photos) ? message.photos.length : (message.photo_url ? 1 : 0);
    const hasAudio = Boolean(message.audio_url);

    drawSectionTitle(`Slide ${index + 4} : Wish`, `${senderName}'s message`);
    const lines = wrapPdfText(plainMessage || "(No message text)", 88);
    lines.slice(0, 22).forEach((line) => drawLine(line));
    drawLine("");
    drawLine(`Attachments: ${photoCount} photo${photoCount === 1 ? "" : "s"}${hasAudio ? " : voice note" : ""}`, 10, false);
    if (Array.isArray(message.photos) && message.photos.length) {
      const captions = message.photos
        .map((photo) => (typeof photo.caption === "string" ? photo.caption.trim() : ""))
        .filter(Boolean)
        .slice(0, 3);
      captions.forEach((caption, captionIndex) => drawLine(`Photo note ${captionIndex + 1}: ${caption}`, 10, false));
    }
    drawLine("");
  });

  drawSectionTitle(`Slide ${messages.length + (creatorMessage ? 4 : 3)} : Closing`, `Keep this close, ${recipientName}.`);
  drawLine(`Total wishes: ${messages.length}`);
  drawLine(`Contributors: ${uniqueContributors.length}`);
  drawLine(`Photos: ${totalPhotos}`);
  drawLine(`Voice notes: ${totalAudio}`);

  const contributorSample = Array.from(new Set(messages.map((message) => String(message.sender_name || "Anonymous").trim()))).filter(Boolean);
  if (contributorSample.length) {
    drawLine("");
    drawLine("Signed by", 11, true);
    drawLine(contributorSample.slice(0, 12).join(", "), 10, false);
  }

  return doc.save();
}
