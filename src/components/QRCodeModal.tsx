import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  recipientName: string;
}

const QRCodeModal = ({ open, onOpenChange, url, title, recipientName }: QRCodeModalProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && url) {
      generateQRCode();
    }
  }, [open, url]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `${recipientName.replace(/\s+/g, '-')}-birthday-qr.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success('QR code downloaded!');
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${recipientName}'s Birthday</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              h1 {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
                color: #1a1a1a;
              }
              p {
                color: #666;
                margin-bottom: 1.5rem;
                font-size: 0.875rem;
              }
              img {
                max-width: 300px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
              }
              .url {
                margin-top: 1rem;
                font-size: 0.75rem;
                color: #999;
                word-break: break-all;
                max-width: 300px;
              }
              @media print {
                body { margin: 0; }
                .container { padding: 1rem; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎂 ${recipientName}'s Birthday</h1>
              <p>Scan to add your birthday wishes!</p>
              <img src="${qrDataUrl}" alt="QR Code" />
              <p class="url">${url}</p>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-4">
          {loading ? (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : qrDataUrl ? (
            <>
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <img 
                  src={qrDataUrl} 
                  alt="QR Code" 
                  className="w-56 h-56"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Scan this code to add birthday wishes for {recipientName}
              </p>
            </>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-xl">
              <p className="text-muted-foreground">Failed to generate QR code</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={handlePrint}
            disabled={!qrDataUrl}
          >
            🖨️ Print
          </Button>
          <Button 
            variant="hero" 
            className="flex-1 gap-2" 
            onClick={handleDownload}
            disabled={!qrDataUrl}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;