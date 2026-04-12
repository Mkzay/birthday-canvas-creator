import { soundtrackMap } from '@/lib/soundtracks';

export function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = '';
    }

    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (words.length && lines.length === maxLines) {
    const consumed = lines.join(' ').trim();
    const original = words.join(' ');
    if (consumed.length < original.length) {
      const lastLineIndex = lines.length - 1;
      lines[lastLineIndex] = `${lines[lastLineIndex].replace(/[.]{3}$/g, '').trimEnd()}...`;
    }
  }

  return lines;
}

export function resolveVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;

  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || null;
}

export async function loadImageForVideo(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = url;
  });
}

export function schedulePresetSoundtrackForVideo(
  context: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  soundtrackId: string,
  totalDurationMs: number,
) {
  const soundtrack = soundtrackMap[soundtrackId];
  if (!soundtrack) return false;

  const masterGain = context.createGain();
  masterGain.gain.value = 0.32;
  masterGain.connect(destination);

  let cursor = context.currentTime + 0.04;
  const cutoff = context.currentTime + totalDurationMs / 1000 + 0.2;

  while (cursor < cutoff) {
    for (const note of soundtrack.notes) {
      if (cursor >= cutoff) break;

      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const gainValue = note.gain ?? 0.08;
      const duration = note.duration;

      oscillator.type = note.type || 'triangle';
      oscillator.frequency.setValueAtTime(note.frequency, cursor);

      noteGain.gain.setValueAtTime(0.0001, cursor);
      noteGain.gain.exponentialRampToValueAtTime(gainValue, cursor + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);

      oscillator.connect(noteGain);
      noteGain.connect(masterGain);
      oscillator.start(cursor);
      oscillator.stop(cursor + duration + 0.06);

      cursor += duration + 0.08;
    }
  }

  return true;
}
