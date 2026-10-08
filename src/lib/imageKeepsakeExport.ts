import { resolveAssetUrl } from '@/lib/api';
import { stripHtml } from '@/lib/wish-utils';
import { drawRoundedRect, loadImageForVideo, wrapCanvasText } from '@/pages/birthday/canvasVideo';
import { normalizeHexColor } from '@/pages/birthday/formatUtils';
import { format } from 'date-fns';

export interface ImageExportPageData {
  recipient_name: string;
  birthday_date?: string;
  cover_photo_url?: string | null;
  creator_message?: string | null;
  theme?: string;
  theme_gradient_from?: string | null;
  theme_gradient_to?: string | null;
  theme_gradient_mid?: string | null;
  theme_accent_color?: string | null;
  theme_font?: string | null;
}

export interface ImageExportMessagePhoto {
  id?: string;
  photo_url: string;
  caption?: string | null;
}

export interface ImageExportMessageSticker {
  id?: string;
  sticker_type: string;
}

export interface ImageExportMessage {
  id: string;
  sender_name: string;
  message: string;
  photo_url?: string | null;
  audio_url?: string | null;
  photos?: ImageExportMessagePhoto[];
  stickers?: ImageExportMessageSticker[];
  created_at?: string;
}

const STICKER_MAP: Record<string, string> = {
  balloon: '🎈',
  heart: '❤️',
  cake: '🎂',
  party: '🎉',
  star: '⭐',
  gift: '🎁',
  fireworks: '🎆',
  sparkles: '✨',
  crown: '👑',
  unicorn: '🦄',
  pizza: '🍕',
  icecream: '🍦',
};

function getInitials(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'W';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Renders all slides, cover photo, wishes, and colophon into a single vertical stitched keepsake image.
 * No ZIP extraction required, 100% client-side, zero friction for mobile camera rolls.
 */
export async function exportLongKeepsakeImage(
  page: ImageExportPageData,
  messages: ImageExportMessage[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const canvasWidth = 1200;
  const paddingX = 70;
  const contentWidth = canvasWidth - paddingX * 2;

  // Determine theme styling
  const gradientFrom = normalizeHexColor(page.theme_gradient_from) || '#ff8a5b';
  const gradientMid = normalizeHexColor(page.theme_gradient_mid) || '#f59e0b';
  const gradientTo = normalizeHexColor(page.theme_gradient_to) || '#7c3aed';
  const isSerif = page.theme_font?.toLowerCase().includes('serif') || page.theme === 'editorial' || page.theme === 'luxury';
  const headingFont = isSerif ? 'Georgia, "Times New Roman", serif' : '"Trebuchet MS", "Nunito", sans-serif';
  const bodyFont = isSerif ? 'Georgia, "Times New Roman", serif' : '"Trebuchet MS", "Nunito", sans-serif';

  // 1. Measure and pre-load assets
  onProgress?.(10);
  let coverImage: HTMLImageElement | null = null;
  const coverUrl = resolveAssetUrl(page.cover_photo_url);
  if (coverUrl) {
    try {
      coverImage = await loadImageForVideo(coverUrl);
    } catch {
      coverImage = null;
    }
  }

  // Preload wish photos (up to 4 per message)
  onProgress?.(25);
  const loadedPhotosMap = new Map<string, HTMLImageElement>();
  for (const msg of messages) {
    const rawPhotos = (msg.photos && msg.photos.length > 0)
      ? msg.photos
      : (msg.photo_url ? [{ photo_url: msg.photo_url }] : []);

    for (const p of rawPhotos.slice(0, 4)) {
      const pUrl = resolveAssetUrl(p.photo_url);
      if (pUrl && !loadedPhotosMap.has(pUrl)) {
        try {
          const img = await loadImageForVideo(pUrl);
          loadedPhotosMap.set(pUrl, img);
        } catch {
          // Skip unloadable photos gracefully
        }
      }
    }
  }

  onProgress?.(45);

  // Measure card heights using an offscreen canvas
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = canvasWidth;
  measureCanvas.height = 100;
  const mCtx = measureCanvas.getContext('2d')!;

  const cardSpacings = 40;
  let totalHeight = 0;

  // Header Cover Section Height
  let headerHeight = 440;
  if (coverImage) {
    headerHeight += 480;
  }
  if (page.creator_message?.trim()) {
    headerHeight += 160;
  }
  totalHeight += headerHeight + cardSpacings;

  // Measure each wish card
  interface CalculatedWishCard {
    message: ImageExportMessage;
    senderName: string;
    initials: string;
    cleanText: string;
    lines: string[];
    photos: HTMLImageElement[];
    cardHeight: number;
    stickerEmoji: string | null;
  }

  const calculatedCards: CalculatedWishCard[] = [];

  for (const msg of messages) {
    const senderName = (msg.sender_name || 'Someone').trim();
    const initials = getInitials(senderName);
    const cleanText = stripHtml(msg.message || '').replace(/\s+/g, ' ').trim();
    const stickerEmoji = msg.stickers?.[0] ? (STICKER_MAP[msg.stickers[0].sticker_type] || '✨') : null;

    mCtx.font = `400 36px ${bodyFont}`;
    const lines = wrapCanvasText(mCtx, cleanText || 'Wishing you the happiest birthday!', contentWidth - 100, 30);

    const rawPhotos = (msg.photos && msg.photos.length > 0)
      ? msg.photos
      : (msg.photo_url ? [{ photo_url: msg.photo_url }] : []);

    const validImgs: HTMLImageElement[] = [];
    for (const p of rawPhotos.slice(0, 4)) {
      const u = resolveAssetUrl(p.photo_url);
      if (u && loadedPhotosMap.has(u)) {
        validImgs.push(loadedPhotosMap.get(u)!);
      }
    }

    let cardH = 80; // top padding + sender header
    cardH += lines.length * 52 + 30; // text lines
    if (validImgs.length === 1) {
      cardH += 480; // single photo box
    } else if (validImgs.length >= 2) {
      cardH += 380; // grid photo box
    }
    if (msg.audio_url) {
      cardH += 60; // voice note badge
    }
    cardH += 50; // bottom padding

    calculatedCards.push({
      message: msg,
      senderName,
      initials,
      cleanText,
      lines,
      photos: validImgs,
      cardHeight: Math.max(220, cardH),
      stickerEmoji,
    });

    totalHeight += Math.max(220, cardH) + cardSpacings;
  }

  // Footer Colophon Height
  const footerHeight = 240;
  totalHeight += footerHeight + 60;

  onProgress?.(60);

  // 2. Render to final canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvasWidth;
  finalCanvas.height = Math.max(1200, totalHeight);
  const ctx = finalCanvas.getContext('2d')!;

  // Background Gradient Canvas
  const bgGrad = ctx.createLinearGradient(0, 0, 0, finalCanvas.height);
  bgGrad.addColorStop(0, gradientFrom);
  bgGrad.addColorStop(0.35, gradientMid);
  bgGrad.addColorStop(1, gradientTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Soft textured overlays
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < finalCanvas.height; i += 8) {
    ctx.fillRect(0, i, finalCanvas.width, 2);
  }
  ctx.restore();

  let yCursor = 60;

  // --- Render Header / Cover Card ---
  ctx.save();
  ctx.globalAlpha = 0.96;
  drawRoundedRect(ctx, paddingX, yCursor, contentWidth, headerHeight, 40);
  ctx.fillStyle = '#FAF8F5';
  ctx.fill();
  ctx.restore();

  // Cover Card Inner
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 54px ${headingFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Happy Birthday, ${page.recipient_name}!`, canvasWidth / 2, yCursor + 90);

  // Subtitle & Date Badge
  let formattedDate = 'Celebration Keepsake';
  if (page.birthday_date) {
    try {
      formattedDate = format(new Date(page.birthday_date), 'MMMM d, yyyy');
    } catch {
      formattedDate = page.birthday_date;
    }
  }

  ctx.fillStyle = '#475569';
  ctx.font = '600 28px "Trebuchet MS", sans-serif';
  ctx.fillText(`${formattedDate}  •  ${messages.length} heartfelt wishes collected`, canvasWidth / 2, yCursor + 145);

  let innerY = yCursor + 190;

  // Draw Cover Photo if available
  if (coverImage) {
    const photoBoxWidth = contentWidth - 80;
    const photoBoxHeight = 440;
    const photoX = paddingX + 40;
    const photoY = innerY;

    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoBoxWidth, photoBoxHeight, 28);
    ctx.clip();

    const scale = Math.max(photoBoxWidth / coverImage.width, photoBoxHeight / coverImage.height);
    const sw = coverImage.width * scale;
    const sh = coverImage.height * scale;
    const sx = photoX + (photoBoxWidth - sw) / 2;
    const sy = photoY + (photoBoxHeight - sh) / 2;
    ctx.drawImage(coverImage, sx, sy, sw, sh);
    ctx.restore();

    innerY += photoBoxHeight + 35;
  }

  // Draw Creator Message if available
  if (page.creator_message?.trim()) {
    ctx.save();
    drawRoundedRect(ctx, paddingX + 40, innerY, contentWidth - 80, 110, 20);
    ctx.fillStyle = '#f1ece4';
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = `italic 400 28px ${bodyFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(`"${page.creator_message.trim()}"`, canvasWidth / 2, innerY + 65);
    ctx.restore();
  }
  ctx.restore();

  yCursor += headerHeight + cardSpacings;
  onProgress?.(75);

  // --- Render Wish Cards ---
  for (let idx = 0; idx < calculatedCards.length; idx++) {
    const card = calculatedCards[idx];

    // Card background
    ctx.save();
    ctx.globalAlpha = 0.97;
    drawRoundedRect(ctx, paddingX, yCursor, contentWidth, card.cardHeight, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // Card Header: Avatar Initial & Sender Name
    const headerY = yCursor + 55;
    const avatarX = paddingX + 50;
    const avatarRadius = 26;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, headerY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#fce7f3';
    ctx.fill();

    ctx.fillStyle = '#be185d';
    ctx.font = '700 24px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.initials, avatarX + avatarRadius, headerY);
    ctx.restore();

    // Sender Name
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 36px ${headingFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.senderName, avatarX + avatarRadius * 2 + 18, headerY);

    if (card.stickerEmoji) {
      ctx.font = '32px sans-serif';
      ctx.fillText(card.stickerEmoji, avatarX + avatarRadius * 2 + 30 + ctx.measureText(card.senderName).width, headerY);
    }
    ctx.restore();

    // Wish Text Lines
    let textY = yCursor + 125;
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.font = `400 34px ${bodyFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (const line of card.lines) {
      ctx.fillText(line, paddingX + 50, textY);
      textY += 52;
    }
    ctx.restore();

    // Photos rendering
    if (card.photos.length === 1) {
      const pImg = card.photos[0];
      const pW = contentWidth - 100;
      const pH = 440;
      const pX = paddingX + 50;
      const pY = textY + 15;

      ctx.save();
      drawRoundedRect(ctx, pX, pY, pW, pH, 24);
      ctx.clip();
      const scale = Math.max(pW / pImg.width, pH / pImg.height);
      const dw = pImg.width * scale;
      const dh = pImg.height * scale;
      ctx.drawImage(pImg, pX + (pW - dw) / 2, pY + (pH - dh) / 2, dw, dh);
      ctx.restore();
      textY += pH + 30;
    } else if (card.photos.length >= 2) {
      const count = Math.min(4, card.photos.length);
      const gap = 16;
      const gridW = contentWidth - 100;
      const colW = (gridW - gap) / 2;
      const rowH = 340;
      const pY = textY + 15;

      for (let pIdx = 0; pIdx < Math.min(2, count); pIdx++) {
        const pImg = card.photos[pIdx];
        const pX = paddingX + 50 + pIdx * (colW + gap);

        ctx.save();
        drawRoundedRect(ctx, pX, pY, colW, rowH, 20);
        ctx.clip();
        const scale = Math.max(colW / pImg.width, rowH / pImg.height);
        const dw = pImg.width * scale;
        const dh = pImg.height * scale;
        ctx.drawImage(pImg, pX + (colW - dw) / 2, pY + (rowH - dh) / 2, dw, dh);
        ctx.restore();
      }
      textY += rowH + 30;
    }

    // Voice Note Badge
    if (card.message.audio_url) {
      ctx.save();
      const badgeX = paddingX + 50;
      const badgeY = textY + 5;
      drawRoundedRect(ctx, badgeX, badgeY, 210, 44, 22);
      ctx.fillStyle = '#fef2f2';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fecaca';
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.font = '600 20px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎙️ Voice note shared', badgeX + 16, badgeY + 22);
      ctx.restore();
    }

    yCursor += card.cardHeight + cardSpacings;
  }

  onProgress?.(90);

  // --- Render Footer / Colophon ---
  ctx.save();
  ctx.globalAlpha = 0.95;
  drawRoundedRect(ctx, paddingX, yCursor, contentWidth, footerHeight, 36);
  ctx.fillStyle = '#FAF8F5';
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 38px ${headingFont}`;
  ctx.textAlign = 'center';
  ctx.fillText('WishCanvas Celebration Keepsake', canvasWidth / 2, yCursor + 80);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 24px "Trebuchet MS", sans-serif';
  ctx.fillText('Created with heartfelt love by family and friends', canvasWidth / 2, yCursor + 130);
  ctx.fillText('wishcanvas.app', canvasWidth / 2, yCursor + 175);
  ctx.restore();

  onProgress?.(98);

  return await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          onProgress?.(100);
          resolve(blob);
        } else {
          reject(new Error('Failed to generate keepsake image blob'));
        }
      },
      'image/png'
    );
  });
}
