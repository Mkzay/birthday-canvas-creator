import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music4, Pause, Play, Link as LinkIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { soundtrackOptions, playPresetSoundtrack, type SoundtrackController } from '@/lib/soundtracks';
import { cn } from '@/lib/utils';

interface SoundtrackSelectorProps {
  selectedSoundtrackId: string;
  onSelectSoundtrackId: (soundtrackId: string) => void;
  customAudioUrl: string | null;
  onChangeCustomAudioUrl: (url: string | null) => void;
  disabled?: boolean;
}

function extractYouTubeId(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

const SoundtrackSelector = ({
  selectedSoundtrackId,
  onSelectSoundtrackId,
  customAudioUrl,
  onChangeCustomAudioUrl,
  disabled = false,
}: SoundtrackSelectorProps) => {
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(customAudioUrl || '');

  useEffect(() => {
    return () => {
      presetControllerRef.current?.stop();
      presetControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setInputValue(customAudioUrl || '');
  }, [customAudioUrl]);

  const selectedPreset = useMemo(
    () => soundtrackOptions.find((soundtrack) => soundtrack.id === selectedSoundtrackId) || soundtrackOptions[0],
    [selectedSoundtrackId],
  );

  const togglePreview = (soundtrackId: string) => {
    if (activePreviewId === soundtrackId) {
      presetControllerRef.current?.stop();
      presetControllerRef.current = null;
      setActivePreviewId(null);
      return;
    }

    presetControllerRef.current?.stop();
    const controller = playPresetSoundtrack(soundtrackId, { volume: 0.12 });
    presetControllerRef.current = controller;
    setActivePreviewId(controller ? soundtrackId : null);

    if (controller) {
      window.setTimeout(() => {
        if (presetControllerRef.current === controller) {
          controller.stop();
          presetControllerRef.current = null;
          setActivePreviewId(null);
        }
      }, 4600);
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const ytid = extractYouTubeId(val);
    
    // Auto-save if it's a valid youtube link or empty
    if (ytid) {
      onChangeCustomAudioUrl(val);
    } else if (!val.trim()) {
      onChangeCustomAudioUrl(null);
    }
  };

  const clearLink = () => {
    setInputValue('');
    onChangeCustomAudioUrl(null);
  };

  const youtubeId = extractYouTubeId(customAudioUrl);
  const isValidYouTube = !!youtubeId;
  const isLegacyAudio = customAudioUrl && !isValidYouTube && customAudioUrl.startsWith('/uploads/');

  return (
    <div className="space-y-4">
      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1 snap-x">
        {soundtrackOptions.map((soundtrack) => {
          const isSelected = soundtrack.id === selectedSoundtrackId;
          const isPreviewing = soundtrack.id === activePreviewId;

          return (
            <button
              key={soundtrack.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSoundtrackId(soundtrack.id)}
              className={cn(
                'group relative flex w-[9.5rem] shrink-0 snap-start flex-col rounded-xl border p-3 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary/35 bg-white shadow-card'
                  : 'border-border/60 bg-card hover:border-primary/20 hover:bg-white',
                disabled && 'opacity-60',
              )}
            >
              {/* Accent bar */}
              <div
                className={cn('absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r', soundtrack.accent)}
              />

              <div className="flex items-center justify-between gap-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white', soundtrack.accent)}>
                  <Music4 className="h-3.5 w-3.5" />
                </div>
                <div
                  role="button"
                  aria-label={isPreviewing ? `Pause ${soundtrack.name} preview` : `Preview ${soundtrack.name}`}
                  aria-pressed={isPreviewing}
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!disabled) {
                      togglePreview(soundtrack.id);
                    }
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                    isPreviewing
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/60 bg-white text-muted-foreground hover:text-foreground',
                    disabled && 'opacity-60 cursor-default',
                  )}
                >
                  {isPreviewing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </div>
              </div>

              <p className="mt-2.5 truncate text-[13px] font-semibold text-foreground">{soundtrack.name}</p>

              {isSelected ? (
                <span className="mt-1.5 inline-flex self-start rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Selected
                </span>
              ) : (
                <span className="mt-1.5 text-[11px] text-muted-foreground">
                  Tap to use
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/80 p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Custom YouTube Music</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste a YouTube link here to use it as background music instead of a preset.
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={inputValue}
                onChange={handleLinkChange}
                disabled={disabled || isLegacyAudio}
                className="pl-9"
              />
            </div>
            {(customAudioUrl || inputValue) && (
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={clearLink} disabled={disabled}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {isValidYouTube && youtubeId ? (
          <div className="mt-3 rounded-lg overflow-hidden border border-border/60 bg-background/80">
            <iframe
              className="w-full aspect-video max-h-[160px]"
              src={`https://www.youtube.com/embed/${youtubeId}?controls=1&showinfo=0`}
              title="YouTube Preview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : isLegacyAudio ? (
          <div className="mt-3 rounded-lg border border-border/60 bg-background/80 p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Legacy Audio Upload Detected</p>
            <audio controls className="w-full h-10" src={customAudioUrl}>
              Your browser does not support audio playback.
            </audio>
            <p className="text-[11px] text-muted-foreground mt-2">Clear this to paste a YouTube link instead.</p>
          </div>
        ) : inputValue && !isValidYouTube ? (
          <p className="mt-3 rounded-lg border border-dashed border-destructive/50 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            Please enter a valid YouTube link.
          </p>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
            {selectedPreset.name} will be used as the opening soundtrack.
          </p>
        )}
      </div>
    </div>
  );
};

export default SoundtrackSelector;

