import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

type WishCanvasLoaderProps = {
  className?: string;
  message?: string;
};

const letters = 'WishCanvas'.split('');

const celebratoryCues = [
  'Lighting celebration candles...',
  'Preparing your creative atelier...',
  'Gathering heartfelt wishes...',
  'Polishing keepsake canvases...',
];

const WishCanvasLoader = ({ className = '', message }: WishCanvasLoaderProps) => {
  const [cueIndex, setCueIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setCueIndex((prev) => (prev + 1) % celebratoryCues.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [message]);

  const displayCue = message || celebratoryCues[cueIndex];

  return (
    <div className={`wc-loader-shell ${className}`.trim()}>
      {/* Ambient Celebratory Glows */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-amber-300/35 to-rose-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-gradient-to-bl from-rose-300/30 to-amber-300/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-amber-100/40 blur-2xl" />

      <div className="wc-loader-card" role="status" aria-label="Loading WishCanvas">
        {/* Illuminated Painted Artwork Logo */}
        <div className="relative mb-1 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-amber-400/30 via-rose-400/25 to-amber-300/30 blur-xl animate-pulse" />
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white p-2.5 shadow-md shadow-amber-500/10 border border-stone-200/90 transition-transform duration-500 hover:scale-105">
            <img
              src="/wish-canvas-logo.png"
              onError={(e) => {
                e.currentTarget.src = '/wish-canvas-logo.svg';
              }}
              alt="WishCanvas"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Brand Wordmark with Animated Letters */}
        <div className="wc-loader-wordmark" aria-hidden="true">
          {letters.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="wc-loader-letter"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Studio Atelier Tag */}
        <span className="font-serif italic text-xs sm:text-sm text-stone-500 -mt-1 tracking-wide">
          creator atelier
        </span>

        {/* Golden Shimmering Progress Track */}
        <div className="wc-loader-track" aria-hidden="true">
          <div className="wc-loader-fill" />
        </div>

        {/* Celebratory Reassuring Status Cue */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium transition-opacity duration-300">
          <Sparkles className="h-3 w-3 text-amber-500 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{displayCue}</span>
        </div>
      </div>
    </div>
  );
};

export default WishCanvasLoader;
