import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Copy, Check, Share2, Link2, Smartphone, Square } from 'lucide-react';
import { toast } from 'sonner';

interface BirthdayShareCardProps {
  recipientName: string;
  messageCount: number;
  themeEmoji: string;
  themeColors: readonly string[];
  shareUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CardFormat = 'story' | 'square';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

const withAlpha = (color: string, alpha: number) => {
  const a = Math.max(0, Math.min(1, alpha));
  const c = (color || '').trim();

  if (!c) return `rgba(0,0,0,${a})`;
  if (c.startsWith('rgba(')) return c.replace(/rgba\(([^)]+),\s*[\d.]+\s*\)/, `rgba($1, ${a})`);
  if (c.startsWith('rgb(')) return c.replace('rgb(', 'rgba(').replace(')', `, ${a})`);

  const hex = c.startsWith('#') ? c.slice(1) : c;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  return c;
};

const BirthdayShareCard = ({
  recipientName,
  messageCount,
  themeEmoji,
  themeColors,
  shareUrl,
  open,
  onOpenChange,
}: BirthdayShareCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [downloading, setDownloading] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const drawCard = useCallback(async (selectedFormat: CardFormat = format) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const isStory = selectedFormat === 'story';
    const width = 1080;
    const height = isStory ? 1920 : 1080;
    const radius = 64;

    canvas.width = width;
    canvas.height = height;

    const colorA = themeColors[0] || '#fbbf24';
    const colorB = themeColors[1] || themeColors[0] || '#ec4899';
    const colorC = themeColors[2] || themeColors[1] || '#8b5cf6';

    // Midnight atmospheric backdrop with theme tints
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#090514');
    bg.addColorStop(0.4, '#140a28');
    bg.addColorStop(1, '#06030c');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    // Radial theme glow orbs
    const glow1 = ctx.createRadialGradient(width * 0.2, height * 0.2, 20, width * 0.2, height * 0.2, width * 0.7);
    glow1.addColorStop(0, withAlpha(colorA, 0.42));
    glow1.addColorStop(0.6, withAlpha(colorA, 0.08));
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    const glow2 = ctx.createRadialGradient(width * 0.85, isStory ? height * 0.6 : height * 0.75, 20, width * 0.85, isStory ? height * 0.6 : height * 0.75, width * 0.7);
    glow2.addColorStop(0, withAlpha(colorB, 0.38));
    glow2.addColorStop(0.6, withAlpha(colorB, 0.08));
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    const glow3 = ctx.createRadialGradient(width * 0.5, isStory ? height * 0.9 : height * 0.95, 20, width * 0.5, isStory ? height * 0.9 : height * 0.95, width * 0.65);
    glow3.addColorStop(0, withAlpha(colorC, 0.3));
    glow3.addColorStop(1, 'transparent');
    ctx.fillStyle = glow3;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    // Sparkles
    const drawStar = (x: number, y: number, r: number) => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.closePath();
      ctx.fill();
    };

    drawStar(140, isStory ? 240 : 120, 18);
    drawStar(width - 150, isStory ? 280 : 130, 24);
    drawStar(width - 180, isStory ? 1380 : 860, 16);
    drawStar(120, isStory ? 1420 : 880, 18);

    // If Story mode: Top header safe zone indicator
    if (isStory) {
      // Top Brand Pill
      const topPillX = width / 2 - 190;
      const topPillY = 130;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.beginPath();
      ctx.roundRect(topPillX, topPillY, 380, 52, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '700 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`${themeEmoji}  BIRTHDAY CELEBRATION STORY`, width / 2, topPillY + 34);
    }

    // Center luxury panel
    const panelX = isStory ? 74 : 76;
    const panelY = isStory ? 240 : 86;
    const panelW = width - (panelX * 2);
    const panelH = isStory ? 1220 : 908;
    const panelR = 48;

    // Outer glass shadow & border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 16;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, panelR);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Panel border
    const panelBorder = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    panelBorder.addColorStop(0, withAlpha(colorA, 0.6));
    panelBorder.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    panelBorder.addColorStop(1, withAlpha(colorC, 0.5));
    ctx.strokeStyle = panelBorder;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Brand row inside panel
    const brandY = panelY + 60;
    try {
      const logo = await loadImage('/wish-canvas-logo.png');
      const markSize = 64;
      const markX = panelX + 54;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(markX, brandY, markSize, markSize, 20);
      ctx.clip();
      ctx.drawImage(logo, markX, brandY, markSize, markSize);
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.font = '800 38px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('WishCanvas', markX + markSize + 18, brandY + 44);
    } catch {
      ctx.textAlign = 'left';
      ctx.font = '800 38px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('WishCanvas', panelX + 54, brandY + 44);
    }

    // Pro / Keepsake badge
    const badgeX = panelX + panelW - 190;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.beginPath();
    ctx.roundRect(badgeX, brandY + 8, 136, 40, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '700 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Keepsake', badgeX + 68, brandY + 34);

    // Recipient Title
    const clippedName = recipientName.length > 20 ? `${recipientName.slice(0, 18)}…` : recipientName;
    const titleY = panelY + 220;
    ctx.textAlign = 'left';
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`For ${clippedName}`, panelX + 54, titleY);

    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('A collaborative collection of birthday memories & voice notes.', panelX + 54, titleY + 44);

    // Decorative Parchment Envelope in panel center
    const envX = panelX + 54;
    const envY = titleY + 85;
    const envW = panelW - 108;
    const envH = isStory ? 380 : 250;
    const envR = 24;

    const envGrad = ctx.createLinearGradient(envX, envY, envX, envY + envH);
    envGrad.addColorStop(0, '#fffbeb');
    envGrad.addColorStop(1, '#fef3c7');
    ctx.fillStyle = envGrad;
    ctx.beginPath();
    ctx.roundRect(envX, envY, envW, envH, envR);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Envelope fold triangle
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(envX, envY + envH);
    ctx.lineTo(envX + envW / 2, envY + envH * 0.55);
    ctx.lineTo(envX + envW, envY + envH);
    ctx.closePath();
    ctx.fill();

    // Envelope flap
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(envX, envY);
    ctx.lineTo(envX + envW / 2, envY + envH * 0.55);
    ctx.lineTo(envX + envW, envY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Envelope message snippet
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 28px Georgia, serif';
    ctx.fillStyle = '#78350f';
    ctx.fillText(`To Dearest ${clippedName}`, envX + envW / 2, envY + (isStory ? 80 : 56));

    // Wax seal in center of envelope
    const sealX = envX + envW / 2;
    const sealY = envY + envH * 0.55;
    const sealR = isStory ? 48 : 38;

    const sealGrad = ctx.createRadialGradient(sealX, sealY, 5, sealX, sealY, sealR);
    sealGrad.addColorStop(0, '#e11d48');
    sealGrad.addColorStop(0.7, '#be123c');
    sealGrad.addColorStop(1, '#881337');
    ctx.fillStyle = sealGrad;
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner gold star on wax seal
    drawStar(sealX, sealY, isStory ? 20 : 16);

    // Audio Voice Note Preview Pill
    const audioY = envY + envH + 34;
    const audioH = 88;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(envX, audioY, envW, audioH, 24);
    ctx.fill();

    // Play icon circle
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(envX + 46, audioY + 44, 24, 0, Math.PI * 2);
    ctx.fill();

    // Play triangle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(envX + 42, audioY + 34);
    ctx.lineTo(envX + 54, audioY + 44);
    ctx.lineTo(envX + 42, audioY + 54);
    ctx.closePath();
    ctx.fill();

    // Waveform equalizer bars
    const waveStartX = envX + 92;
    const waveCenterY = audioY + 44;
    const barHeights = [14, 28, 44, 20, 36, 48, 26, 18, 34, 40, 22, 12, 30, 42, 20];
    barHeights.forEach((h, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#fb7185' : '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(waveStartX + idx * 10, waveCenterY - h / 2, 5, h, 2.5);
      ctx.fill();
    });

    ctx.textAlign = 'left';
    ctx.font = '700 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Voice Note Memories', waveStartX + 175, audioY + 38);
    ctx.font = '500 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Included in the birthday story', waveStartX + 175, audioY + 64);

    // Stat Pills Row
    const statY = audioY + audioH + (isStory ? 34 : 24);
    const statGap = 20;
    const statW = (envW - statGap) / 2;
    const statH = isStory ? 108 : 92;

    const drawStatPill = (x: number, value: string, label: string, color: string) => {
      ctx.fillStyle = withAlpha(color, 0.12);
      ctx.beginPath();
      ctx.roundRect(x, statY, statW, statH, 24);
      ctx.fill();
      ctx.strokeStyle = withAlpha(color, 0.35);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '900 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(value, x + 28, statY + (isStory ? 48 : 42));
      ctx.font = '600 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(label, x + 28, statY + (isStory ? 82 : 72));
    };

    drawStatPill(envX, `${messageCount}`, 'wishes collected', colorA);
    drawStatPill(envX + statW + statGap, 'Story Reveal', 'midnight experience', colorB);

    // If Story Mode: Render Dedicated Link Sticker Call To Action at Bottom
    if (isStory) {
      const ctaY = panelY + panelH + 60;
      const ctaW = width - 160;
      const ctaX = 80;
      const ctaH = 140;

      // Glow backing
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 36);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('TAP LINK STICKER TO VIEW STORY', width / 2, ctaY + 54);

      // Link text
      const cleanUrl = shareUrl.replace(/^https?:\/\//i, '');
      const displayUrl = cleanUrl.length > 36 ? `${cleanUrl.slice(0, 34)}…` : cleanUrl;
      ctx.font = '600 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(displayUrl, width / 2, ctaY + 98);
    } else {
      // Square footer
      ctx.textAlign = 'left';
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Created with WishCanvas : Collaborative Celebrations', panelX + 54, panelY + panelH - 32);

      ctx.textAlign = 'right';
      ctx.font = '700 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('wishcanvas.app', panelX + panelW - 54, panelY + panelH - 32);
    }

    return canvas;
  }, [recipientName, messageCount, themeEmoji, themeColors, shareUrl, format]);

  // Re-draw when modal opens or format changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        void drawCard(format);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [open, format, drawCard]);

  const getCanvasBlob = useCallback(async (fmt: CardFormat = format): Promise<Blob | null> => {
    const canvas = await drawCard(fmt);
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.98);
    });
  }, [drawCard, format]);

  const handleDownload = async (fmt: CardFormat = format) => {
    setDownloading(true);
    try {
      const canvas = await drawCard(fmt);
      if (!canvas) throw new Error('Canvas not available');

      const link = document.createElement('a');
      const suffix = fmt === 'story' ? 'story' : 'card';
      link.download = `wishcanvas-${recipientName.toLowerCase().replace(/\s+/g, '-')}-${suffix}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(`${fmt === 'story' ? 'Story' : 'Card'} image saved to downloads!`);
    } catch (error) {
      toast.error('Failed to download image');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      const blob = await getCanvasBlob(format);
      if (!blob) throw new Error('Failed to generate image');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopiedImage(true);
      toast.success('Image copied to clipboard!');
      setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      toast.error('Direct image copy not supported. Downloading instead.');
      void handleDownload(format);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Celebration link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      window.prompt('Copy this link:', shareUrl);
    }
  };

  // Native share sheet (triggers Instagram Stories, WhatsApp, Snapchat, AirDrop on mobile)
  const handleNativeShare = async (preferredFormat: CardFormat = format) => {
    try {
      const blob = await getCanvasBlob(preferredFormat);
      if (!blob) throw new Error('Could not create share image');

      const fileName = `wishcanvas-${recipientName.toLowerCase().replace(/\s+/g, '-')}-${preferredFormat}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Birthday celebration for ${recipientName}`,
          text: `Check out the birthday celebration for ${recipientName} on WishCanvas! 🎂 ${shareUrl}`,
        });
        toast.success('Shared successfully!');
        return;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.warn('Native file share failed or canceled, falling back:', err);
    }

    // Fallback: download the image and copy link
    await handleDownload(preferredFormat);
    await handleCopyLink();
    toast.success('Image downloaded and link copied! Ready to paste into your app.');
  };

  const handleWhatsAppShare = () => {
    const message = `🎂 Check out the birthday celebration for ${recipientName}! ${messageCount > 0 ? `${messageCount} heartfelt wishes and voice notes have been collected.` : ''} Open the story here: ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const text = `Celebrating ${recipientName}'s birthday with a collaborative story on @WishCanvas! 🎂✨`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleInstagramShare = async () => {
    if (format !== 'story') {
      setFormat('story');
    }
    // Attempt native file share if available
    try {
      const blob = await getCanvasBlob('story');
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'story.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'story.png', { type: 'image/png' })],
          title: `Happy Birthday ${recipientName}`,
          text: shareUrl,
        });
        return;
      }
    } catch {
      // Continue to fallback
    }

    await handleDownload('story');
    await handleCopyLink();
    toast.success('Story card saved & link copied! Upload to your Instagram story and add the Link sticker 🔗');
  };

  const handleSnapchatShare = async () => {
    if (format !== 'story') {
      setFormat('story');
    }
    // Attempt native file share if available
    try {
      const blob = await getCanvasBlob('story');
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'story.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'story.png', { type: 'image/png' })],
          title: `Happy Birthday ${recipientName}`,
          text: shareUrl,
        });
        return;
      }
    } catch {
      // Continue to fallback
    }

    await handleDownload('story');
    await handleCopyLink();
    toast.success('Story card saved & link copied! Share to Snapchat and attach the link 🔗');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-background/95 backdrop-blur-xl border-border/60">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-center">
            Share Celebration Card
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center">
            High-resolution visual cards designed for stories, feeds, and group chats
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-1">
          {/* Format Selector Tabs */}
          <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl border border-border/40 w-full max-w-[320px]">
            <button
              type="button"
              onClick={() => setFormat('story')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                format === 'story'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Story (9:16)
            </button>
            <button
              type="button"
              onClick={() => setFormat('square')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                format === 'square'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Post (1:1)
            </button>
          </div>

          {/* Canvas Preview Container */}
          <div className="relative group w-full flex justify-center py-1">
            <canvas
              ref={canvasRef}
              className="rounded-2xl shadow-2xl border border-border/40 object-contain transition-transform"
              style={{
                width: format === 'story' ? '200px' : '260px',
                aspectRatio: format === 'story' ? '9/16' : '1/1',
                maxHeight: '360px',
              }}
            />
          </div>

          {/* Primary Quick Share Bar */}
          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center">
              Quick share to social apps
            </p>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md"
                title="Share on WhatsApp"
                aria-label="Share celebration on WhatsApp"
                type="button"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>

              {/* Instagram Stories */}
              <button
                onClick={handleInstagramShare}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#833AB4] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md"
                title="Share to Instagram Stories"
                aria-label="Save story card for Instagram"
                type="button"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </button>

              {/* Snapchat */}
              <button
                onClick={handleSnapchatShare}
                className="w-11 h-11 rounded-full bg-[#FFFC00] text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md"
                title="Share to Snapchat"
                aria-label="Save story card for Snapchat"
                type="button"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.732-.271-1.258-.615-1.258-1.035-.016-.345.224-.645.598-.825.106-.060.27-.104.463-.104.165 0 .344.029.494.104.39.18.749.27 1.049.27.181 0 .326-.029.405-.074-.012-.18-.024-.344-.032-.509l-.003-.07c-.089-1.628-.219-3.654.311-4.833C7.847 1.069 11.216.793 12.206.793z"/>
                </svg>
              </button>

              {/* Twitter / X */}
              <button
                onClick={handleTwitterShare}
                className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md border border-white/10"
                title="Share on X"
                aria-label="Share celebration on X"
                type="button"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Save or Copy
            </span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 font-semibold text-xs col-span-2 sm:col-span-1 shadow-sm"
              onClick={() => handleNativeShare(format)}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
              onClick={() => handleDownload(format)}
              disabled={downloading}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Saving…' : 'Download'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
              onClick={handleCopyImage}
            >
              {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedImage ? 'Copied!' : 'Image'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied!' : 'Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayShareCard;
