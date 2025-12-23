import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BirthdayShareCardProps {
  recipientName: string;
  messageCount: number;
  themeEmoji: string;
  themeColors: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = 640;
    const height = 640;
    canvas.width = width;
    canvas.height = height;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, themeColors[0] || '#8b5cf6');
    gradient.addColorStop(0.5, themeColors[1] || '#a855f7');
    gradient.addColorStop(1, themeColors[2] || '#ec4899');
    
    // Draw rounded rect background
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 40);
    ctx.fill();

    // Draw decorative elements
    ctx.font = '80px serif';
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'white';
    ctx.fillText('✨', 40, 100);
    ctx.fillText('🎉', width - 120, height - 40);
    ctx.fillText('🎂', width - 100, 160);
    ctx.fillText('🎁', 40, height - 120);
    ctx.globalAlpha = 1;

    // Draw main emoji
    ctx.font = '120px serif';
    ctx.textAlign = 'center';
    ctx.fillText(themeEmoji, width / 2, 200);

    // Draw title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText('Happy Birthday to Me!', width / 2, 290);

    // Draw name
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText(recipientName, width / 2, 370);

    // Draw wishes count badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    const badgeText = `🎈 ${messageCount} wishes received`;
    const badgeWidth = 340;
    const badgeHeight = 50;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = 420;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 25);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText(badgeText, width / 2, badgeY + 34);

    // Draw footer
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.globalAlpha = 0.7;
    ctx.fillText('Made with WishCanvas', width / 2, height - 50);
    ctx.globalAlpha = 1;

    return canvas;
  }, [recipientName, messageCount, themeEmoji, themeColors]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = drawCard();
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
      const canvas = drawCard();
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

  const handleNativeShare = async () => {
    try {
      const canvas = drawCard();
      if (!canvas) throw new Error('Canvas not available');
      
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          const file = new File([blob], `birthday-${recipientName}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: `${recipientName}'s Birthday Wishes`,
              text: `I received ${messageCount} birthday wishes! 🎂`,
              files: [file],
            });
          } catch {
            // User cancelled or share failed
          }
        } else {
          handleDownload();
        }
      }, 'image/png');
    } catch (error) {
      console.error(error);
      handleDownload();
    }
  };

  // Draw preview when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => drawCard(), 100);
    }
  }, [open, drawCard]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share Your Birthday Card</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {/* Canvas preview */}
          <canvas 
            ref={canvasRef}
            className="w-full max-w-[320px] rounded-3xl shadow-lg"
            style={{ aspectRatio: '1/1' }}
          />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            {'share' in navigator && (
              <Button 
                variant="hero" 
                className="gap-2" 
                onClick={handleNativeShare}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            )}
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
          
          <p className="text-xs text-muted-foreground text-center">
            Download or copy the image to share on your favorite social media!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayShareCard;