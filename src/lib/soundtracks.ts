export interface SoundtrackOption {
  id: string;
  name: string;
  description: string;
  accent: string;
  notes: Array<{
    frequency: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
  }>;
}

export const soundtrackOptions: SoundtrackOption[] = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm piano-like pulses for softer birthday reveals.',
    accent: 'from-amber-400 to-orange-500',
    notes: [
      { frequency: 392, duration: 0.32, type: 'triangle', gain: 0.09 },
      { frequency: 440, duration: 0.28, type: 'triangle', gain: 0.08 },
      { frequency: 523.25, duration: 0.44, type: 'triangle', gain: 0.08 },
      { frequency: 587.33, duration: 0.36, type: 'triangle', gain: 0.08 },
      { frequency: 523.25, duration: 0.46, type: 'triangle', gain: 0.07 },
      { frequency: 440, duration: 0.32, type: 'triangle', gain: 0.08 },
    ],
  },
  {
    id: 'confetti-pop',
    name: 'Confetti Pop',
    description: 'A brighter, lighter sequence with a playful lift.',
    accent: 'from-pink-500 to-fuchsia-500',
    notes: [
      { frequency: 523.25, duration: 0.22, type: 'sine', gain: 0.08 },
      { frequency: 659.25, duration: 0.18, type: 'sine', gain: 0.08 },
      { frequency: 783.99, duration: 0.18, type: 'triangle', gain: 0.08 },
      { frequency: 659.25, duration: 0.24, type: 'triangle', gain: 0.07 },
      { frequency: 698.46, duration: 0.2, type: 'sine', gain: 0.08 },
      { frequency: 880, duration: 0.38, type: 'triangle', gain: 0.08 },
    ],
  },
  {
    id: 'starlight-chimes',
    name: 'Starlight Chimes',
    description: 'Dreamy, high-pitched bell-like tones.',
    accent: 'from-cyan-300 to-blue-500',
    notes: [
      { frequency: 1046.50, duration: 0.15, type: 'sine', gain: 0.06 },
      { frequency: 1318.51, duration: 0.20, type: 'sine', gain: 0.05 },
      { frequency: 1567.98, duration: 0.25, type: 'triangle', gain: 0.04 },
      { frequency: 1046.50, duration: 0.40, type: 'sine', gain: 0.06 },
    ],
  },
  {
    id: 'sunrise-acoustic',
    name: 'Sunrise Acoustic',
    description: 'A gentle, steady and uplifting rhythm.',
    accent: 'from-emerald-400 to-teal-500',
    notes: [
      { frequency: 261.63, duration: 0.35, type: 'triangle', gain: 0.07 },
      { frequency: 329.63, duration: 0.35, type: 'triangle', gain: 0.07 },
      { frequency: 392.00, duration: 0.35, type: 'triangle', gain: 0.07 },
      { frequency: 523.25, duration: 0.60, type: 'triangle', gain: 0.08 },
    ],
  },
  {
    id: 'ambient-waves',
    name: 'Ambient Waves',
    description: 'Slow, deep frequencies for a relaxed mood.',
    accent: 'from-slate-500 to-zinc-700',
    notes: [
      { frequency: 196.00, duration: 0.8, type: 'sine', gain: 0.08 },
      { frequency: 246.94, duration: 0.7, type: 'sine', gain: 0.07 },
      { frequency: 293.66, duration: 0.9, type: 'sine', gain: 0.08 },
    ],
  },
  {
    id: 'midnight-drift',
    name: 'Midnight Drift',
    description: 'A slower, cinematic sequence with more depth.',
    accent: 'from-indigo-500 to-violet-600',
    notes: [
      { frequency: 261.63, duration: 0.5, type: 'sawtooth', gain: 0.05 },
      { frequency: 329.63, duration: 0.38, type: 'triangle', gain: 0.06 },
      { frequency: 392, duration: 0.52, type: 'triangle', gain: 0.06 },
      { frequency: 349.23, duration: 0.34, type: 'triangle', gain: 0.06 },
      { frequency: 293.66, duration: 0.56, type: 'triangle', gain: 0.06 },
    ],
  },
];

export const soundtrackMap = Object.fromEntries(soundtrackOptions.map((soundtrack) => [soundtrack.id, soundtrack])) as Record<
  string,
  SoundtrackOption
>;

export interface SoundtrackController {
  stop: () => void;
}

export function playPresetSoundtrack(soundtrackId: string, options?: { loop?: boolean; volume?: number }) {
  if (typeof window === 'undefined') {
    return null;
  }

  const soundtrack = soundtrackMap[soundtrackId];
  if (!soundtrack) {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  const context = new AudioContextConstructor();
  const masterGain = context.createGain();
  masterGain.gain.value = options?.volume ?? 0.12;
  masterGain.connect(context.destination);

  let intervalId: number | null = null;
  let stopped = false;

  const scheduleSequence = () => {
    let cursor = context.currentTime + 0.04;

    soundtrack.notes.forEach((note) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const duration = note.duration;
      const gainValue = note.gain ?? 0.08;

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
    });

    return cursor - context.currentTime;
  };

  void context.resume();

  const sequenceDuration = scheduleSequence();

  if (options?.loop) {
    intervalId = window.setInterval(() => {
      if (!stopped) {
        scheduleSequence();
      }
    }, Math.max(sequenceDuration * 1000, 1000));
  }

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
      window.setTimeout(() => {
        void context.close();
      }, 220);
    },
  } satisfies SoundtrackController;
}
