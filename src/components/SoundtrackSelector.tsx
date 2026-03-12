import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music4, Pause, Play, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { soundtrackOptions, playPresetSoundtrack, type SoundtrackController } from '@/lib/soundtracks';

interface SoundtrackSelectorProps {
  selectedSoundtrackId: string;
  onSelectSoundtrackId: (soundtrackId: string) => void;
  customAudioUrl: string | null;
  onSelectCustomAudio: (file: File) => void;
  onRemoveCustomAudio: () => void;
  disabled?: boolean;
}

const SoundtrackSelector = ({
  selectedSoundtrackId,
  onSelectSoundtrackId,
  customAudioUrl,
  onSelectCustomAudio,
  onRemoveCustomAudio,
  disabled = false,
}: SoundtrackSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      presetControllerRef.current?.stop();
      presetControllerRef.current = null;
    };
  }, []);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      event.target.value = '';
      return;
    }

    onSelectCustomAudio(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {soundtrackOptions.map((soundtrack) => {
          const isSelected = soundtrack.id === selectedSoundtrackId;
          const isPreviewing = soundtrack.id === activePreviewId;

          return (
            <article
              key={soundtrack.id}
              className={[
                'rounded-[1.5rem] border p-5 transition-all duration-300',
                isSelected
                  ? 'border-primary/30 bg-white shadow-[0_18px_55px_rgba(18,18,23,0.06)]'
                  : 'border-border/60 bg-background/70 hover:border-primary/20 hover:bg-white',
                disabled ? 'opacity-60' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${soundtrack.accent} text-white shadow-lg`}>
                  <Music4 className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePreview(soundtrack.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white text-foreground transition-colors hover:border-primary/20 hover:text-primary"
                  aria-label={isPreviewing ? `Pause ${soundtrack.name} preview` : `Preview ${soundtrack.name}`}
                >
                  {isPreviewing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-4 text-base font-semibold text-foreground">{soundtrack.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{soundtrack.description}</p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectSoundtrackId(soundtrack.id)}
                className={[
                  'mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {isSelected ? 'Selected' : 'Use soundtrack'}
              </button>
            </article>
          );
        })}
      </div>

      <div className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Custom opening audio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your own short audio clip. If present, it overrides the selected preset on the birthday page.
            </p>
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} disabled={disabled} />
            <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
              <Upload className="h-4 w-4" />
              Upload audio
            </Button>
            {customAudioUrl && (
              <Button type="button" variant="ghost" className="gap-2" onClick={onRemoveCustomAudio} disabled={disabled}>
                <X className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>

        {customAudioUrl ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Custom audio preview</p>
            <audio controls className="w-full" src={customAudioUrl}>
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
            {selectedPreset.name} will be used as the opening soundtrack.
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundtrackSelector;
