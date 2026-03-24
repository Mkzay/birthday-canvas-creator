import { hexToHsl } from '@/lib/colors';

type DisplayMode = 'story' | 'freeform' | 'bento';

interface OpenerThemePreviewProps {
  mode: DisplayMode;
  startColor: string;
  endColor: string;
  recipientName: string;
}

function mixHue(a: number, b: number) {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta / 2 + 360) % 360;
}

function StoryOpenerPreview({ startColor, endColor, recipientName }: Omit<OpenerThemePreviewProps, 'mode'>) {
  const { h: letterH, s: letterS, l: letterL } = hexToHsl(startColor);
  const { h: letterH2, s: letterS2, l: letterL2 } = hexToHsl(endColor);
  const clampedS = Math.min(letterS, 70);
  const clampedS2 = Math.min(letterS2, 70);
  const mixedLetterH = mixHue(letterH, letterH2);

  return (
    <div className="relative h-36 w-52 overflow-hidden rounded-[1.35rem] border border-border/60 bg-gradient-to-br from-white to-muted/50 p-3 shadow-card-sm">
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 rounded-[1rem]"
          style={{
            background: `linear-gradient(145deg, hsl(${letterH} ${clampedS * 0.45}% 95%), hsl(${letterH2} ${clampedS2 * 0.55}% 88%))`,
            boxShadow: `0 14px 28px hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 28% / 0.22)`,
          }}
        />
        <div className="absolute inset-[1px] rounded-[0.95rem] border border-white/60" />
        <div
          className="absolute left-1/2 top-0 h-[52%] w-[92%] -translate-x-1/2 origin-top rounded-[0.9rem]"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            background: `linear-gradient(145deg, hsl(${letterH2} ${clampedS2 * 0.6}% 78%), hsl(${letterH} ${clampedS * 0.5}% 88%))`,
          }}
        />
        <div
          className="absolute bottom-[10%] left-1/2 h-[55%] w-[90%] -translate-x-1/2 rounded-[0.85rem] border"
          style={{
            background: `linear-gradient(180deg, hsl(${letterH} ${clampedS * 0.4}% 97%), hsl(${letterH2} ${clampedS2 * 0.55}% 90%))`,
            borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 85% / 0.7)`,
          }}
        />
        <div
          className="absolute left-1/2 top-[24%] h-[40%] w-[74%] -translate-x-1/2 rounded-[0.7rem] border px-2.5 py-2 text-left"
          style={{
            background: `linear-gradient(180deg, hsl(${letterH2} ${clampedS2 * 0.35}% 97%), hsl(${letterH} ${clampedS * 0.45}% 93%))`,
            borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.4}% 78% / 0.8)`,
          }}
        >
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: `hsl(${mixedLetterH} 30% 42%)` }}>To</p>
          <p className="mt-1 line-clamp-1 text-xs font-bold" style={{ color: `hsl(${letterH} 28% 22%)` }}>{recipientName || 'Birthday Star'}</p>
          <p className="mt-1 line-clamp-1 text-[9px]" style={{ color: `hsl(${mixedLetterH} 18% 36%)` }}>Open when ready for the story.</p>
        </div>
        <div
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/65 shadow-sm"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${startColor}, ${endColor})`,
          }}
        />
      </div>
    </div>
  );
}

function FreeformOpenerPreview({ startColor, endColor, recipientName }: Omit<OpenerThemePreviewProps, 'mode'>) {
  const { h: hStart, s: sStart, l: lStart } = hexToHsl(startColor);
  const { h: hEnd, s: sEnd, l: lEnd } = hexToHsl(endColor);
  const overlayHue = mixHue(hStart, hEnd);
  const overlaySat = Math.max(18, Math.min((sStart + sEnd) / 2, 72));
  const overlayLight = Math.max(18, Math.min((lStart + lEnd) / 2, 62));
  const floatCardBorder = `hsla(${overlayHue}, ${Math.min(overlaySat + 10, 86)}%, ${Math.max(overlayLight - 24, 18)}%, 0.36)`;
  const floatCardFill = `hsla(${overlayHue}, ${Math.min(overlaySat + 15, 90)}%, ${Math.min(overlayLight + 24, 86)}%, 0.2)`;
  const paperColor = `hsl(${overlayHue} ${Math.max(18, overlaySat * 0.32)}% ${Math.min(95, Math.max(88, overlayLight + 22))}%)`;
  const nameText = `hsl(${overlayHue} ${Math.max(24, overlaySat * 0.42)}% ${Math.max(22, overlayLight * 0.48)}%)`;
  const textPrimary = 'hsl(0 0% 94%)';
  const textSecondary = 'hsl(0 0% 86%)';
  const chipBg = `hsl(${overlayHue} ${Math.max(14, overlaySat * 0.35)}% 97% / 0.24)`;
  const chipBorder = `hsl(${overlayHue} ${Math.max(16, overlaySat * 0.38)}% 66% / 0.46)`;
  const chipText = `hsl(${overlayHue} ${Math.max(20, overlaySat * 0.44)}% 25%)`;

  return (
    <div className="relative h-44 w-52 overflow-hidden rounded-[1.35rem] border border-border/60 p-2.5 shadow-card-sm" style={{ background: `linear-gradient(180deg, hsl(${hEnd} ${Math.max(24, sEnd * 0.6)}% ${Math.max(12, lEnd * 0.36)}% / 0.78), hsl(${overlayHue} ${Math.max(30, overlaySat * 0.68)}% ${Math.max(10, overlayLight * 0.34)}% / 0.92))` }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `repeating-linear-gradient(180deg, hsl(${overlayHue} ${Math.max(8, overlaySat * 0.24)}% 96% / 0.035) 0px, hsl(${overlayHue} ${Math.max(8, overlaySat * 0.24)}% 96% / 0.035) 1px, transparent 1px, transparent 4px)` }} />
      <div className="pointer-events-none absolute left-[6%] top-[12%] h-9 w-16 rotate-[-6deg] rounded-md border" style={{ borderColor: floatCardBorder, backgroundColor: floatCardFill }} />
      <div className="pointer-events-none absolute right-[8%] top-[16%] h-8 w-14 rotate-[5deg] rounded-md border" style={{ borderColor: floatCardBorder, backgroundColor: floatCardFill }} />
      <div className="pointer-events-none absolute left-[14%] bottom-[11%] h-9 w-14 rotate-[2deg] rounded-md border" style={{ borderColor: floatCardBorder, backgroundColor: floatCardFill }} />

      <div className="relative mx-auto w-fit rounded-md px-3 pb-3 pt-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)]" style={{ backgroundColor: paperColor }}>
        <div className="relative mx-auto h-3 w-10 -translate-y-1.5 rounded-sm" style={{ backgroundColor: `${endColor}cc` }} />
        <div className="relative h-[8.3rem] w-[9.1rem] overflow-hidden rounded-sm p-2 text-center" style={{ background: `linear-gradient(145deg, ${startColor}, ${endColor})` }}>
          <p className="text-[7px] font-semibold uppercase tracking-[0.2em]" style={{ color: textSecondary }}>Happy Birthday</p>
          <p className="mt-1 text-base font-bold leading-tight" style={{ color: textPrimary }}>{recipientName || 'Name'}</p>
          <div className="mx-auto mt-2 h-0.5 w-6 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.45)' }} />
        </div>
        <p className="mt-2 text-center text-xs font-semibold leading-none" style={{ color: nameText }}>{recipientName || 'Name'}</p>
      </div>

      <div className="relative mt-2.5 flex items-center justify-center gap-1.5 text-[9px] font-medium">
        <span className="rounded-full border px-2 py-1" style={{ backgroundColor: chipBg, borderColor: chipBorder, color: chipText }}>Wishes</span>
        <span className="rounded-full border px-2 py-1" style={{ backgroundColor: chipBg, borderColor: chipBorder, color: chipText }}>Photos</span>
      </div>
    </div>
  );
}

export default function OpenerThemePreview({ mode, startColor, endColor, recipientName }: OpenerThemePreviewProps) {
  if (mode === 'story') {
    return <StoryOpenerPreview startColor={startColor} endColor={endColor} recipientName={recipientName} />;
  }
  if (mode === 'freeform') {
    return <FreeformOpenerPreview startColor={startColor} endColor={endColor} recipientName={recipientName} />;
  }
  return (
    <div className="flex h-36 w-52 items-center justify-center rounded-[1.35rem] border border-dashed border-border/60 bg-muted/20 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Bento Preview
    </div>
  );
}