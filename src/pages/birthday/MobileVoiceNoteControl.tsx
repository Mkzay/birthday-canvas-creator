import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMediaTime } from './formatUtils';

export function MobileVoiceNoteControl({
  messageId,
  getAudioEl,
  onUserStartPlayback,
  onStopped,
}: {
  messageId: string;
  getAudioEl: () => HTMLAudioElement | null;
  onUserStartPlayback: () => void;
  onStopped: () => void;
}) {
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  // Tracks whether the user intentionally started playback via the button.
  // Only when this is true should we call onStopped (to resume the soundtrack).
  const isSessionActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const tryAttach = () => {
      if (cancelled) return;
      const el = getAudioEl();
      if (!el) {
        window.setTimeout(tryAttach, 120);
        return;
      }

      const handleLoaded = () => {
        if (cancelled) return;
        setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      };
      const handleTime = () => {
        if (cancelled) return;
        setCurrentTime(el.currentTime || 0);
      };
      const handlePlay = () => {
        if (cancelled) return;
        setIsBusy(false);
        setIsPlaying(true);
      };
      const handlePause = () => {
        if (cancelled) return;
        setIsBusy(false);
        setIsPlaying(false);
        // Scroll can fire spurious pause events. Only notify parent when this
        // was a real user-initiated session (button tap), not a scroll glitch.
        if (isSessionActiveRef.current) {
          const el = getAudioEl();
          if (el) {
            void el.play().catch(() => {
              isSessionActiveRef.current = false;
              onStopped();
            });
            return;
          }
          isSessionActiveRef.current = false;
          onStopped();
        }
      };
      const handleEnded = () => {
        if (cancelled) return;
        setIsBusy(false);
        setIsPlaying(false);
        if (isSessionActiveRef.current) {
          isSessionActiveRef.current = false;
          onStopped();
        }
      };
      const handleWaiting = () => {
        if (cancelled) return;
        if (!el.paused) setIsBusy(true);
      };
      const handlePlaying = () => {
        if (cancelled) return;
        setIsBusy(false);
      };

      handleLoaded();
      handleTime();
      setIsPlaying(!el.paused);

      el.addEventListener('loadedmetadata', handleLoaded);
      el.addEventListener('durationchange', handleLoaded);
      el.addEventListener('timeupdate', handleTime);
      el.addEventListener('play', handlePlay);
      el.addEventListener('pause', handlePause);
      el.addEventListener('ended', handleEnded);
      el.addEventListener('waiting', handleWaiting);
      el.addEventListener('playing', handlePlaying);

      cleanup = () => {
        el.removeEventListener('loadedmetadata', handleLoaded);
        el.removeEventListener('durationchange', handleLoaded);
        el.removeEventListener('timeupdate', handleTime);
        el.removeEventListener('play', handlePlay);
        el.removeEventListener('pause', handlePause);
        el.removeEventListener('ended', handleEnded);
        el.removeEventListener('waiting', handleWaiting);
        el.removeEventListener('playing', handlePlaying);
      };
    };

    tryAttach();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [getAudioEl, messageId, onStopped]);

  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <div
      data-no-nav="true"
      className="w-full rounded-[1.25rem] border border-white/45 bg-white/55 p-4 text-left shadow-[0_12px_30px_rgba(18,18,23,0.10)]"
      onPointerUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full gradient-cta" style={{ width: `${progress * 100}%` }} />
      </div>

      <button
        type="button"
        disabled={isBusy}
        className={cn(
          'mt-3 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
          isBusy ? 'bg-black/10 text-foreground/60' : 'bg-black/12 text-foreground hover:bg-black/15',
        )}
        onClick={(e) => {
          e.stopPropagation();
          const el = getAudioEl();
          if (!el) return;

          if (!el.paused) {
            // User explicitly paused — notify parent to resume soundtrack.
            isSessionActiveRef.current = false;
            el.pause();
            onStopped();
            return;
          }

          // User tapped play — stop soundtrack immediately, then start voice note.
          isSessionActiveRef.current = true;
          onUserStartPlayback();
          setIsBusy(true);

          void el.play().catch((err) => {
            console.error('Voice note play failed', err);
            isSessionActiveRef.current = false;
            setIsBusy(false);
            onStopped();
          });
        }}
      >
        {isBusy ? 'Starting…' : isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
