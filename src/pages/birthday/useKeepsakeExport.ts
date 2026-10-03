import { useCallback, useState } from 'react';
import { ApiError, getApiOrigin, resolveAssetUrl } from '@/lib/api';
import { soundtrackMap } from '@/lib/soundtracks';
import { stripHtml } from '@/lib/wish-utils';
import { toast } from 'sonner';
import {
  drawRoundedRect,
  loadImageForVideo,
  normalizeHexColor,
  resolveVideoMimeType,
  schedulePresetSoundtrackForVideo,
  wrapCanvasText,
} from '@/pages/birthday';
import type { BirthdayPageData, Message } from './types';

export interface UseKeepsakeExportOptions {
  page: BirthdayPageData | null;
  pageId: string | undefined;
  messages: Message[];
  ytId: string | null;
}

export interface UseKeepsakeExportReturn {
  handleDownloadKeepsake: () => Promise<void>;
  handleDownloadVideoKeepsake: () => Promise<void>;
  downloadingPdf: boolean;
  downloadingVideo: boolean;
  includeSoundtrackInVideo: boolean;
  setIncludeSoundtrackInVideo: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useKeepsakeExport({
  page,
  pageId,
  messages,
  ytId,
}: UseKeepsakeExportOptions): UseKeepsakeExportReturn {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [includeSoundtrackInVideo, setIncludeSoundtrackInVideo] = useState(true);

  const handleDownloadKeepsake = useCallback(async () => {
    if (!pageId) return;

    setDownloadingPdf(true);
    try {
      const response = await fetch(`${getApiOrigin()}/api/public/pages/${pageId}/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new ApiError(payload.error || 'Download failed', response.status, payload.code);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug = (page?.recipient_name || 'birthday-page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'birthday-page';
      anchor.href = url;
      anchor.download = `${slug}-wishcanvas-keepsake.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PIN_REQUIRED') {
        toast.error('Unlock this page with the PIN first');
      } else if (error instanceof ApiError && error.code === 'FEATURE_PRO_ONLY') {
        toast.info('This is a Pro feature. Upgrade to unlock keepsake downloads.');
      } else {
        toast.error('Could not download keepsake');
      }
    } finally {
      setDownloadingPdf(false);
    }
  }, [page?.recipient_name, pageId]);

  const handleDownloadVideoKeepsake = useCallback(async () => {
    if (!pageId || !page) return;

    if ((page.owner_plan_tier || 'free') !== 'pro') {
      toast.info('Video download is a Pro feature. Upgrade to unlock it.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      toast.error('Your browser does not support video export');
      return;
    }

    const mimeType = resolveVideoMimeType();
    if (!mimeType) {
      toast.error('This browser cannot export WebM video');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;

    if (typeof canvas.captureStream !== 'function') {
      toast.error('Video export is not supported on this device');
      return;
    }

    setDownloadingVideo(true);

    const context = canvas.getContext('2d');
    if (!context) {
      setDownloadingVideo(false);
      toast.error('Could not initialize video renderer');
      return;
    }

    const stream = canvas.captureStream(30);
    const stopTrackFns: Array<() => void> = [];
    let exportAudioContext: AudioContext | null = null;
    let exportAudioElement: HTMLAudioElement | null = null;
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });
    const chunks: BlobPart[] = [];
    let rafId = 0;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    try {
      let coverImage: HTMLImageElement | null = null;
      const coverUrl = resolveAssetUrl(page.cover_photo_url);
      if (coverUrl) {
        try {
          coverImage = await loadImageForVideo(coverUrl);
        } catch {
          coverImage = null;
        }
      }

      const storyMessages = messages
        .map((message) => ({
          sender: (message.sender_name || 'Someone').trim(),
          content: stripHtml(message.message || '').replace(/\s+/g, ' ').trim(),
        }))
        .filter((entry) => entry.content.length > 0)
        .slice(0, 5);

      const slides = [
        {
          title: `${page.recipient_name}'s Birthday`,
          subtitle: `${messages.length} wishes collected`,
          body: 'A keepsake reel from WishCanvas',
        },
        ...storyMessages.map((entry, index) => ({
          title: `Wish ${index + 1}`,
          subtitle: `From ${entry.sender || 'Someone'}`,
          body: entry.content,
        })),
        {
          title: 'Happy Birthday!',
          subtitle: `Made for ${page.recipient_name}`,
          body: 'Thanks to everyone who shared a memory.',
        },
      ];

      const totalDurationMs = Math.max(9000, slides.length * 1800);
      const perSlideMs = totalDurationMs / slides.length;
      const gradientFrom = normalizeHexColor(page.theme_gradient_from) || '#ff8a5b';
      const gradientTo = normalizeHexColor(page.theme_gradient_to) || '#7c3aed';
      const gradientMid = normalizeHexColor(page.theme_gradient_mid) || '#f59e0b';

      if (includeSoundtrackInVideo) {
        const AudioContextConstructor =
          window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextConstructor) {
          toast.info('Video created without audio: this browser cannot capture soundtrack audio.');
        } else if (ytId) {
          toast.info('Video created without audio: YouTube tracks cannot be captured in export.');
        } else {
          const destinationSetupContext = new AudioContextConstructor();
          exportAudioContext = destinationSetupContext;
          await exportAudioContext.resume();
          const destination = exportAudioContext.createMediaStreamDestination();

          if (page.custom_audio_url) {
            const customAudioUrl = resolveAssetUrl(page.custom_audio_url);
            if (customAudioUrl) {
              const audioEl = new Audio(customAudioUrl);
              audioEl.crossOrigin = 'anonymous';
              audioEl.preload = 'auto';
              audioEl.loop = true;
              audioEl.currentTime = 0;

              const source = exportAudioContext.createMediaElementSource(audioEl);
              const gain = exportAudioContext.createGain();
              gain.gain.value = 0.9;
              source.connect(gain);
              gain.connect(destination);

              destination.stream.getAudioTracks().forEach((track) => {
                stream.addTrack(track);
                stopTrackFns.push(() => track.stop());
              });

              await audioEl.play();
              exportAudioElement = audioEl;
              stopTrackFns.push(() => {
                source.disconnect();
                gain.disconnect();
              });
            }
          } else if (page.soundtrack_id && soundtrackMap[page.soundtrack_id]) {
            const hasPresetTrack = schedulePresetSoundtrackForVideo(exportAudioContext, destination, page.soundtrack_id, totalDurationMs);
            if (hasPresetTrack) {
              destination.stream.getAudioTracks().forEach((track) => {
                stream.addTrack(track);
                stopTrackFns.push(() => track.stop());
              });
            }
          } else {
            toast.info('Video created without audio: no soundtrack selected for this page.');
          }
        }
      }

      const stopped = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error('Video recording failed'));
      });

      const render = (now: number, startAt: number) => {
        const elapsed = now - startAt;
        const cappedElapsed = Math.min(elapsed, totalDurationMs);
        const slideIndex = Math.min(slides.length - 1, Math.floor(cappedElapsed / perSlideMs));
        const currentSlide = slides[slideIndex];
        const localProgress = (cappedElapsed - slideIndex * perSlideMs) / perSlideMs;
        const fadeIn = Math.min(1, localProgress / 0.16);
        const fadeOut = Math.min(1, (1 - localProgress) / 0.16);
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, gradientFrom);
        gradient.addColorStop(0.45, gradientMid);
        gradient.addColorStop(1, gradientTo);
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        const pulse = 0.12 + Math.sin(cappedElapsed / 620) * 0.08;
        context.save();
        context.globalAlpha = 0.2 + pulse;
        const glow = context.createRadialGradient(canvas.width * 0.8, canvas.height * 0.2, 80, canvas.width * 0.8, canvas.height * 0.2, 680);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = glow;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        if (coverImage) {
          context.save();
          context.globalAlpha = 0.22;
          const coverScale = Math.max(canvas.width / coverImage.width, canvas.height / coverImage.height);
          const drawWidth = coverImage.width * coverScale;
          const drawHeight = coverImage.height * coverScale;
          const dx = (canvas.width - drawWidth) / 2;
          const dy = (canvas.height - drawHeight) / 2;
          context.drawImage(coverImage, dx, dy, drawWidth, drawHeight);
          context.restore();
        }

        context.save();
        context.globalAlpha = 0.35;
        drawRoundedRect(context, 72, 72, canvas.width - 144, canvas.height - 144, 60);
        context.fillStyle = 'rgba(0, 0, 0, 0.26)';
        context.fill();
        context.restore();

        context.save();
        context.globalAlpha = alpha;
        drawRoundedRect(context, 120, 420, canvas.width - 240, 1080, 42);
        context.fillStyle = 'rgba(255, 255, 255, 0.92)';
        context.fill();

        context.fillStyle = '#0f172a';
        context.font = '700 72px Georgia, "Times New Roman", serif';
        context.textAlign = 'left';
        context.fillText(currentSlide.title, 170, 560);

        context.fillStyle = '#475569';
        context.font = '500 38px "Trebuchet MS", sans-serif';
        context.fillText(currentSlide.subtitle, 170, 622);

        context.fillStyle = '#111827';
        context.font = '400 48px "Trebuchet MS", sans-serif';
        const lines = wrapCanvasText(context, currentSlide.body, canvas.width - 340, 8);
        lines.forEach((line, index) => {
          context.fillText(line, 170, 736 + index * 62);
        });

        context.fillStyle = 'rgba(15, 23, 42, 0.45)';
        context.font = '600 30px "Trebuchet MS", sans-serif';
        context.fillText('wishcanvas.app', 170, 1400);
        context.restore();

        const progress = Math.max(0, Math.min(1, cappedElapsed / totalDurationMs));
        drawRoundedRect(context, 170, 1450, canvas.width - 340, 16, 8);
        context.fillStyle = 'rgba(255,255,255,0.28)';
        context.fill();

        drawRoundedRect(context, 170, 1450, (canvas.width - 340) * progress, 16, 8);
        context.fillStyle = '#ffffff';
        context.fill();

        if (elapsed >= totalDurationMs) {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        rafId = window.requestAnimationFrame((time) => render(time, startAt));
      };

      recorder.start(100);
      rafId = window.requestAnimationFrame((time) => render(time, time));
      await stopped;

      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) {
        throw new Error('Empty video output');
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug = (page.recipient_name || 'birthday-page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'birthday-page';
      anchor.href = url;
      anchor.download = `${slug}-wishcanvas-reel.webm`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('Video download started');
    } catch (error) {
      console.error(error);
      toast.error('Could not export video');
    } finally {
      window.cancelAnimationFrame(rafId);
      if (exportAudioElement) {
        exportAudioElement.pause();
        exportAudioElement.src = '';
      }
      stopTrackFns.forEach((stop) => stop());
      if (exportAudioContext) {
        void exportAudioContext.close();
      }
      stream.getTracks().forEach((track) => track.stop());
      setDownloadingVideo(false);
    }
  }, [includeSoundtrackInVideo, messages, page, pageId, ytId]);

  return {
    handleDownloadKeepsake,
    handleDownloadVideoKeepsake,
    downloadingPdf,
    downloadingVideo,
    includeSoundtrackInVideo,
    setIncludeSoundtrackInVideo,
  };
}
