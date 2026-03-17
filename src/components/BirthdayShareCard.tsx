import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BirthdayShareCardProps {
  recipientName: string;
  messageCount: number;
  themeEmoji: string;
  themeColors: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

const BirthdayShareCard = ({
  recipientName,
  messageCount,
  themeEmoji,
  themeColors,
  open,
  onOpenChange,
}: BirthdayShareCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Square 1080x1080 for story / post friendly aspect
    const width = 1080;
    const height = 1080;
    const radius = 68;
    canvas.width = width;
    canvas.height = height;

    // Dashboard-style background wash (soft + airy)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    const a = themeColors[0] || '#fbbf24';
    const b = themeColors[1] || themeColors[0] || '#ec4899';
    const c = themeColors[2] || themeColors[1] || '#60a5fa';

    const wash1 = ctx.createRadialGradient(width * 0.18, height * 0.12, 10, width * 0.18, height * 0.12, width * 0.62);
    wash1.addColorStop(0, `${a}2A`);
    wash1.addColorStop(1, 'transparent');
    ctx.fillStyle = wash1;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    const wash2 = ctx.createRadialGradient(width * 0.86, height * 0.14, 10, width * 0.86, height * 0.14, width * 0.58);
    wash2.addColorStop(0, `${b}26`);
    wash2.addColorStop(1, 'transparent');
    ctx.fillStyle = wash2;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    const wash3 = ctx.createRadialGradient(width * 0.72, height * 0.88, 10, width * 0.72, height * 0.88, width * 0.6);
    wash3.addColorStop(0, `${c}1F`);
    wash3.addColorStop(1, 'transparent');
    ctx.fillStyle = wash3;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    // Gentle vignette for depth
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.9);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(0.85, 'transparent');
    vignette.addColorStop(1, 'rgba(2,6,23,0.10)');
    ctx.fillStyle = vignette;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    // Outer card stroke
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, radius - 1);
    ctx.stroke();

    // Center panel
    const panelX = 90;
    const panelY = 120;
    const panelW = width - 180;
    const panelH = height - 220;
    const panelR = 70;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = 'rgba(226,232,240,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, panelR);
    ctx.fill();
    ctx.stroke();

    // Brand row (logo + wordmark)
    try {
      const logo = await loadImage('/wish-canvas-logo.png');
      const markSize = 74;
      const markX = panelX + 62;
      const markY = panelY + 54;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(markX, markY, markSize, markSize, 26);
      ctx.clip();
      ctx.drawImage(logo, markX, markY, markSize, markSize);
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.font = '800 44px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(2,6,23,0.92)';
      ctx.fillText('WishCanvas', markX + markSize + 22, markY + 52);
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(100,116,139,0.96)';
      ctx.fillText('Birthday wishes', markX + markSize + 22, markY + 80);
    } catch {
      // If logo fails to load, still render cleanly with text fallback.
      ctx.textAlign = 'left';
      ctx.font = '800 44px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(2,6,23,0.92)';
      ctx.fillText('WishCanvas', panelX + 62, panelY + 106);
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(100,116,139,0.96)';
      ctx.fillText('Birthday wishes', panelX + 62, panelY + 134);
    }

    // Accent chip (theme emoji)
    const chipX = panelX + 62;
    const chipY = panelY + 164;
    const chipW = 230;
    const chipH = 52;
    ctx.fillStyle = 'rgba(2,6,23,0.04)';
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 999);
    ctx.fill();
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(`${themeEmoji}  Birthday card`, chipX + 18, chipY + 34);

    // Main title
    const clippedName = recipientName.length > 24 ? `${recipientName.slice(0, 22)}…` : recipientName;
    ctx.font = '900 78px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(2,6,23,0.94)';
    ctx.fillText(`For ${clippedName}`, panelX + 60, panelY + 330);

    ctx.font = '500 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(51,65,85,0.92)';
    ctx.fillText('A whole page of birthday wishes in one link.', panelX + 62, panelY + 385);

    // Stat pills (match dashboard feel)
    const pillY = panelY + 440;
    const pillH = 92;
    const pillR = 36;
    const pillGap = 22;
    const pillW = (panelW - 124 - pillGap) / 2;

    const drawPill = (x: number, gradFrom: string, gradTo: string, label: string, value: string) => {
      const g = ctx.createLinearGradient(x, pillY, x + pillW, pillY + pillH);
      g.addColorStop(0, `${gradFrom}24`);
      g.addColorStop(1, `${gradTo}18`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, pillY, pillW, pillH, pillR);
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,240,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '800 34px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(2,6,23,0.92)';
      ctx.fillText(value, x + 28, pillY + 52);
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(71,85,105,0.95)';
      ctx.fillText(label, x + 28, pillY + 76);
    };

    const leftPillX = panelX + 62;
    const rightPillX = leftPillX + pillW + pillGap;
    drawPill(leftPillX, a, b, 'messages collected', `${messageCount}`);
    drawPill(rightPillX, b, c, 'ready to share', '1 card');

    // Footer
    ctx.textAlign = 'left';
    ctx.font = '600 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(100,116,139,0.96)';
    ctx.fillText('Share this as a story, post, or status.', panelX + 62, panelY + panelH - 88);

    ctx.font = '500 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.96)';
    ctx.fillText('Made with WishCanvas', panelX + 62, panelY + panelH - 48);

    ctx.textAlign = 'right';
    ctx.font = '700 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.96)';
    ctx.fillText('wishcanvas.app', panelX + panelW - 62, panelY + panelH - 48);

    return canvas;
  }, [recipientName, messageCount, themeEmoji, themeColors]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await drawCard();
      if (!canvas) throw new Error('Canvas not available');
      
      const link = document.createElement('a');
      link.download = `birthday-wishes-${recipientName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
      console.error(error);
    }
    setDownloading(false);
  };

  const handleCopyImage = async () => {
    try {
      const canvas = await drawCard();
      if (!canvas) throw new Error('Canvas not available');
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopied(true);
            toast.success('Image copied! Paste it anywhere');
            setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error('Use download instead - clipboard not supported');
          }
        }
      }, 'image/png');
    } catch (error) {
      toast.error('Failed to copy image');
      console.error(error);
    }
  };

  const handleSocialShare = (platform: 'whatsapp' | 'twitter' | 'facebook') => {
    // First trigger download so user has the image
    handleDownload();
    
    const message = `I received ${messageCount} birthday wishes! 🎂🎉`;
    const encodedMessage = encodeURIComponent(message);
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodedMessage}`,
    };
    
    window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleInstagramShare = () => {
    handleDownload();
    toast.success('Image downloaded! Upload it to your Instagram story');
  };

  const handleSnapchatShare = () => {
    handleDownload();
    toast.success('Image downloaded! Share it on Snapchat');
  };

  // Draw preview when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        void drawCard();
      }, 100);
    }
  }, [open, drawCard]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Share Your Birthday Card</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {/* Canvas preview */}
          <canvas 
            ref={canvasRef}
            className="w-full max-w-[280px] rounded-3xl shadow-lg"
            style={{ aspectRatio: '1/1' }}
          />

          {/* Social share buttons */}
          <div className="w-full">
            <p className="text-xs text-muted-foreground text-center mb-3">Share on social media</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* WhatsApp */}
              <button
                onClick={() => handleSocialShare('whatsapp')}
                className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center hover:scale-110 transition-transform"
                title="Share on WhatsApp"
                aria-label="Share birthday card on WhatsApp"
                type="button"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>

              {/* Twitter/X */}
              <button
                onClick={() => handleSocialShare('twitter')}
                className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform"
                title="Share on X (Twitter)"
                aria-label="Share birthday card on X"
                type="button"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* Facebook */}
              <button
                onClick={() => handleSocialShare('facebook')}
                className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform"
                title="Share on Facebook"
                aria-label="Share birthday card on Facebook"
                type="button"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* Instagram */}
              <button
                onClick={handleInstagramShare}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#833AB4] flex items-center justify-center hover:scale-110 transition-transform"
                title="Share on Instagram"
                aria-label="Download birthday card for Instagram"
                type="button"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </button>

              {/* Snapchat */}
              <button
                onClick={handleSnapchatShare}
                className="w-10 h-10 rounded-full bg-[#FFFC00] flex items-center justify-center hover:scale-110 transition-transform"
                title="Share on Snapchat"
                aria-label="Download birthday card for Snapchat"
                type="button"
              >
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.732-.271-1.258-.615-1.258-1.035-.016-.345.224-.645.598-.825.106-.060.27-.104.463-.104.165 0 .344.029.494.104.39.18.749.27 1.049.27.181 0 .326-.029.405-.074-.012-.18-.024-.344-.032-.509l-.003-.07c-.089-1.628-.219-3.654.311-4.833C7.847 1.069 11.216.793 12.206.793z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or save the image</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 w-full">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Saving...' : 'Download'}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleCopyImage}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayShareCard;
