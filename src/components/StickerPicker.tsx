import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCw, Maximize2, Minimize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isRichHtml, wishMessageHtmlWithQuotes } from '@/lib/wish-utils';
import { visualThemeConfig } from '@/lib/themes';
import DOMPurify from 'dompurify';

export interface StickerData {
  id: string;
  stickerType: string;
  positionX: number;
  positionY: number;
  rotation: number;
  scale: number;
}

interface StickerPickerProps {
  stickers: StickerData[];
  onChange: (stickers: StickerData[]) => void;
  className?: string;
  message?: string;
  photos?: File[];
  themeId?: string;
}

const AVAILABLE_STICKERS = [
  { type: 'balloon', emoji: '🎈' },
  { type: 'heart', emoji: '❤️' },
  { type: 'cake', emoji: '🎂' },
  { type: 'party', emoji: '🎉' },
  { type: 'star', emoji: '⭐' },
  { type: 'gift', emoji: '🎁' },
  { type: 'fireworks', emoji: '🎆' },
  { type: 'sparkles', emoji: '✨' },
  { type: 'crown', emoji: '👑' },
  { type: 'unicorn', emoji: '🦄' },
  { type: 'pizza', emoji: '🍕' },
  { type: 'icecream', emoji: '🍦' },
];

const StickerPicker: React.FC<StickerPickerProps> = ({ 
  stickers, 
  onChange, 
  className, 
  message, 
  photos = [],
  themeId = 'elegant'
}) => {
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const theme = visualThemeConfig[themeId as keyof typeof visualThemeConfig] || visualThemeConfig.elegant;
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const urls = photos.map(file => URL.createObjectURL(file));
    setPhotoUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [photos]);

  const addSticker = (type: string, emoji: string) => {
    const newSticker: StickerData = {
      id: crypto.randomUUID(),
      stickerType: type,
      positionX: 40 + Math.random() * 20,
      positionY: 40 + Math.random() * 20,
      rotation: (Math.random() - 0.5) * 30,
      scale: 1,
    };
    onChange([...stickers, newSticker]);
    setActiveStickerId(newSticker.id);
  };

  const removeSticker = (id: string) => {
    onChange(stickers.filter((s) => s.id !== id));
    if (activeStickerId === id) setActiveStickerId(null);
  };

  const updateSticker = useCallback((id: string, updates: Partial<StickerData>) => {
    onChange(stickers.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, [onChange, stickers]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    setActiveStickerId(id);
    isDraggingRef.current = true;
    
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;

    startPosRef.current = {
      x: e.clientX,
      y: e.clientY
    };
    
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !activeStickerId || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startPosRef.current.x) / containerRect.width) * 100;
    const deltaY = ((e.clientY - startPosRef.current.y) / containerRect.height) * 100;

    const sticker = stickers.find(s => s.id === activeStickerId);
    if (!sticker) return;

    let nextX = sticker.positionX + deltaX;
    let nextY = sticker.positionY + deltaY;

    // Bounds check
    nextX = Math.max(0, Math.min(100, nextX));
    nextY = Math.max(0, Math.min(100, nextY));

    updateSticker(activeStickerId, {
      positionX: nextX,
      positionY: nextY
    });

    startPosRef.current = {
      x: e.clientX,
      y: e.clientY
    };
  }, [activeStickerId, stickers, updateSticker]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeStickerId, handleMouseMove, handleMouseUp]);

  const rotateSticker = (id: string) => {
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;
    updateSticker(id, { rotation: (sticker.rotation + 45) % 360 });
  };

  const scaleSticker = (id: string, delta: number) => {
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;
    updateSticker(id, { scale: Math.max(0.5, Math.min(3, sticker.scale + delta)) });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border border-border">
        {AVAILABLE_STICKERS.map((s) => (
          <button
            key={s.type}
            type="button"
            onClick={() => addSticker(s.type, s.emoji)}
            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-background rounded-lg transition-colors border border-transparent hover:border-border active:scale-95"
            title={`Add ${s.type}`}
          >
            {s.emoji}
          </button>
        ))}
      </div>

      <div 
        ref={containerRef}
        className={cn(
          "relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border overflow-hidden touch-none p-6",
          theme.heroClass
        )}
        onClick={() => setActiveStickerId(null)}
      >
        {/* Preview Background */}
        <div className={cn("absolute inset-0 pointer-events-none p-6 flex flex-col gap-4", theme.font)}>
          {message && (
            <div className="flex-1 overflow-hidden">
              {isRichHtml(message) ? (
                <div 
                  className={cn("wish-rich-text text-lg sm:text-2xl font-medium line-clamp-6", theme.text)}
                  dangerouslySetInnerHTML={{ __html: wishMessageHtmlWithQuotes(message) }}
                />
              ) : (
                <p className={cn("text-lg sm:text-2xl font-medium line-clamp-6 italic", theme.text)}>
                  &quot;{message}&quot;
                </p>
              )}
            </div>
          )}
          
          {photoUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 h-[45%] mt-auto">
              {photoUrls.slice(0, 2).map((url, i) => (
                <div key={i} className={cn("relative rounded-xl overflow-hidden border aspect-square", theme.cardClass)}>
                  <img src={url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                </div>
              ))}
              {photoUrls.length > 2 && (
                <div className="absolute bottom-10 right-10 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                  +{photoUrls.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
        {stickers.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Move className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Click an emoji above to decorate your card</p>
            <p className="text-xs mt-1">Drag to position, tap to rotate or resize</p>
          </div>
        )}

        {stickers.map((s) => {
          const config = AVAILABLE_STICKERS.find(a => a.type === s.stickerType);
          const isActive = activeStickerId === s.id;

          return (
            <div
              key={s.id}
              className={cn(
                "absolute cursor-move select-none group touch-none",
                isActive ? "z-50" : "z-10"
              )}
              style={{
                left: `${s.positionX}%`,
                top: `${s.positionY}%`,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})`,
              }}
              onMouseDown={(e) => handleMouseDown(e, s.id)}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "text-4xl sm:text-5xl drop-shadow-md transition-transform active:scale-110",
                isActive && "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
              )}>
                {config?.emoji}
              </div>

              {isActive && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border p-1 rounded-full shadow-lg">
                  <button
                    type="button"
                    onClick={() => rotateSticker(s.id)}
                    className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scaleSticker(s.id, 0.2)}
                    className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scaleSticker(s.id, -0.2)}
                    className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <button
                    type="button"
                    onClick={() => removeSticker(s.id)}
                    className="p-1.5 hover:bg-destructive/10 text-destructive rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StickerPicker;
