import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveAssetUrl } from '@/lib/api';
import { playPresetSoundtrack, soundtrackMap, type SoundtrackController } from '@/lib/soundtracks';
import { extractYouTubeId } from './formatUtils';
import type { BirthdayPageData } from './types';

export interface UseCelebrationSoundtrackOptions {
  page: BirthdayPageData | null;
  isCoarsePointerDevice: boolean;
  showRevealIntro: boolean;
  shouldShowRevealExperience: boolean;
  activeWishAudioId: string | null;
}

export interface UseCelebrationSoundtrackReturn {
  startSoundtrack: (withLoop?: boolean) => Promise<void>;
  stopSoundtrack: () => void;
  toggleSoundtrackMute: () => void;
  pauseSoundtrackForWishAudio: () => void;
  resumeSoundtrackAfterWishAudio: () => Promise<void>;
  isSoundtrackMuted: boolean;
  startYoutube: boolean;
  youtubeIframeRef: React.RefObject<HTMLIFrameElement | null>;
  ytId: string | null;
  soundtrackAudioRef: React.RefObject<HTMLAudioElement | null>;
  hasSoundtrack: boolean;
}

export function useCelebrationSoundtrack({
  page,
  isCoarsePointerDevice,
  showRevealIntro,
  shouldShowRevealExperience,
  activeWishAudioId,
}: UseCelebrationSoundtrackOptions): UseCelebrationSoundtrackReturn {
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const presetControllerRef = useRef<SoundtrackController | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [startYoutube, setStartYoutube] = useState(false);
  const [isSoundtrackMuted, setIsSoundtrackMuted] = useState(false);

  const ytId = useMemo(() => extractYouTubeId(page?.custom_audio_url), [page?.custom_audio_url]);
  const hasSoundtrack = Boolean(page?.custom_audio_url || page?.soundtrack_id);

  const shouldResumeSoundtrackRef = useRef(false);
  const userPausedSoundtrackRef = useRef(false);
  const soundtrackWasDuckedRef = useRef(false);
  const soundtrackPrevVolumeRef = useRef<number | null>(null);
  const presetPrevVolumeRef = useRef<number | null>(null);

  const stopSoundtrack = useCallback(() => {
    userPausedSoundtrackRef.current = true;
    shouldResumeSoundtrackRef.current = false;
    presetControllerRef.current?.stop();
    presetControllerRef.current = null;

    if (soundtrackAudioRef.current) {
      soundtrackAudioRef.current.pause();
      soundtrackAudioRef.current.currentTime = 0;
      soundtrackAudioRef.current.src = '';
      soundtrackAudioRef.current = null;
    }

    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), '*');
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    }
  }, []);

  const startSoundtrack = useCallback(
    async (withLoop = true) => {
      if (!page) return;
      userPausedSoundtrackRef.current = false;

      presetControllerRef.current?.stop();
      presetControllerRef.current = null;

      if (ytId) {
        setStartYoutube(true);
        if (youtubeIframeRef.current?.contentWindow) {
          youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [isCoarsePointerDevice ? 85 : 65] }), '*');
        }
        return;
      }

      const resolvedCustomAudioUrl = resolveAssetUrl(page.custom_audio_url);

      if (resolvedCustomAudioUrl) {
        if (!soundtrackAudioRef.current || soundtrackAudioRef.current.src !== resolvedCustomAudioUrl) {
          soundtrackAudioRef.current = new Audio(resolvedCustomAudioUrl);
        }

        soundtrackAudioRef.current.loop = withLoop;
        soundtrackAudioRef.current.volume = isCoarsePointerDevice ? 0.78 : 0.45;

        try {
          await soundtrackAudioRef.current.play();
        } catch (error) {
          console.error('Audio autoplay blocked', error);
        }
        return;
      }

      if (page.soundtrack_id && soundtrackMap[page.soundtrack_id]) {
        presetControllerRef.current = playPresetSoundtrack(page.soundtrack_id, {
          loop: withLoop,
          volume: isCoarsePointerDevice ? 0.2 : 0.12,
        });
      }
    },
    [isCoarsePointerDevice, page, ytId],
  );

  const toggleSoundtrackMute = useCallback(() => {
    setIsSoundtrackMuted((muted) => {
      const nextMuted = !muted;
      if (nextMuted) {
        userPausedSoundtrackRef.current = true;
        if (soundtrackAudioRef.current) {
          soundtrackAudioRef.current.pause();
        }
        if (presetControllerRef.current) {
          presetControllerRef.current.stop();
        }
        if (youtubeIframeRef.current?.contentWindow) {
          youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        }
      } else {
        userPausedSoundtrackRef.current = false;
        void startSoundtrack(true);
      }
      return nextMuted;
    });
  }, [startSoundtrack]);

  const pauseSoundtrackForWishAudio = useCallback(() => {
    let hadPlayingSoundtrack = false;

    if (soundtrackWasDuckedRef.current) {
      shouldResumeSoundtrackRef.current = true;
      return;
    }

    if (presetControllerRef.current) {
      presetControllerRef.current.stop?.();
      presetControllerRef.current = null;
      presetPrevVolumeRef.current = null;
      hadPlayingSoundtrack = true;
    }

    const customAudio = soundtrackAudioRef.current;
    if (customAudio && !customAudio.paused && !customAudio.ended) {
      customAudio.pause();
      soundtrackPrevVolumeRef.current = null;
      hadPlayingSoundtrack = true;
    }

    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      hadPlayingSoundtrack = true;
    }

    soundtrackWasDuckedRef.current = hadPlayingSoundtrack;
    shouldResumeSoundtrackRef.current = hadPlayingSoundtrack;
  }, []);

  const resumeSoundtrackAfterWishAudio = useCallback(async () => {
    if (!shouldResumeSoundtrackRef.current || showRevealIntro) {
      return;
    }
    if (userPausedSoundtrackRef.current) {
      shouldResumeSoundtrackRef.current = false;
      return;
    }

    shouldResumeSoundtrackRef.current = false;
    soundtrackWasDuckedRef.current = false;
    presetPrevVolumeRef.current = null;
    soundtrackPrevVolumeRef.current = null;

    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      return;
    }

    const customAudio = soundtrackAudioRef.current;
    if (customAudio && customAudio.paused && !customAudio.ended && customAudio.currentTime > 0) {
      try {
        await customAudio.play();
        return;
      } catch (error) {
        console.error('Audio autoplay blocked', error);
      }
    }

    await startSoundtrack(true);
  }, [showRevealIntro, startSoundtrack]);

  // Unlock audio during intro on touch devices
  useEffect(() => {
    if (showRevealIntro && shouldShowRevealExperience) {
      if (!isCoarsePointerDevice) {
        void startSoundtrack(true);
        return;
      }

      const unlockAudio = () => {
        if (userPausedSoundtrackRef.current) return;
        void startSoundtrack(true);
      };

      window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

      return () => {
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
    }
  }, [isCoarsePointerDevice, shouldShowRevealExperience, showRevealIntro, startSoundtrack]);

  // Touch listener for touch screens outside intro
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isCoarsePointerDevice) return;
    if (!page?.is_revealed) return;
    if (showRevealIntro) return;

    const unlockAudio = () => {
      if (userPausedSoundtrackRef.current) return;
      void startSoundtrack(true);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('scroll', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('scroll', unlockAudio);
    };
  }, [isCoarsePointerDevice, page?.is_revealed, showRevealIntro, startSoundtrack]);

  // Loop soundtrack after it finishes playing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!page?.is_revealed) return;
    if (showRevealIntro) return;

    const audio = soundtrackAudioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (activeWishAudioId) return;
      if (userPausedSoundtrackRef.current) return;
      void startSoundtrack(true);
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [activeWishAudioId, page?.is_revealed, showRevealIntro, startSoundtrack]);

  // Watchdog timer to ensure soundtrack keeps playing unless explicitly paused
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!page?.is_revealed) return;
    if (showRevealIntro) return;

    const watchdogId = window.setInterval(() => {
      if (activeWishAudioId) return;
      if (userPausedSoundtrackRef.current) return;
      if (soundtrackWasDuckedRef.current || soundtrackPrevVolumeRef.current !== null || presetPrevVolumeRef.current !== null) return;

      const audio = soundtrackAudioRef.current;
      if (!audio) return;

      if (audio.paused && audio.currentTime > 0) {
        void startSoundtrack(true);
      }
    }, 4000);

    return () => window.clearInterval(watchdogId);
  }, [activeWishAudioId, page?.is_revealed, showRevealIntro, startSoundtrack]);

  // Clean unmount
  useEffect(() => {
    return () => {
      stopSoundtrack();
    };
  }, [stopSoundtrack]);

  return {
    startSoundtrack,
    stopSoundtrack,
    toggleSoundtrackMute,
    pauseSoundtrackForWishAudio,
    resumeSoundtrackAfterWishAudio,
    isSoundtrackMuted,
    startYoutube,
    youtubeIframeRef,
    ytId,
    soundtrackAudioRef,
    hasSoundtrack,
  };
}
