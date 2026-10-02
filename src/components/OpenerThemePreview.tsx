import { hexToHsl } from '@/lib/colors';

type DisplayMode = 'story' | 'freeform' | 'bento';

interface OpenerThemePreviewProps {
  mode: DisplayMode;
  startColor: string;
  endColor: string;
  midColor?: string | null;
  gradientAngle?: number | null;
  recipientName: string;
  coverPhotoUrl?: string | null;
}

function mixHue(a: number, b: number) {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta / 2 + 360) % 360;
}

function StoryOpenerPreview({ startColor, endColor, midColor, gradientAngle, recipientName }: Omit<OpenerThemePreviewProps, 'mode'>) {
  const resolvedMid = midColor || endColor;
  const angle = Number.isFinite(gradientAngle) ? Number(gradientAngle) : 145;
  const { h: letterH, s: letterS } = hexToHsl(startColor);
  const { h: letterHM, s: letterSM } = hexToHsl(resolvedMid);
  const { h: letterH2, s: letterS2 } = hexToHsl(endColor);
  const clampedS = Math.min(letterS, 70);
  const clampedSM = Math.min(letterSM, 70);
  const clampedS2 = Math.min(letterS2, 70);
  const mixedLetterH = mixHue(letterH, letterH2);
  const backdrop = `linear-gradient(${angle}deg, ${startColor} 0%, ${resolvedMid} 52%, ${endColor} 100%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.22), transparent 62%)`;
  const shellGradient = `linear-gradient(${angle}deg, hsl(${letterH} ${Math.max(42, clampedS * 0.94)}% 74%), hsl(${letterHM} ${Math.max(40, clampedSM * 0.92)}% 68%) 52%, hsl(${letterH2} ${Math.max(40, clampedS2 * 0.92)}% 62%))`;
  const flapGradient = `linear-gradient(${angle}deg, hsl(${letterHM} ${Math.max(44, clampedSM * 0.96)}% 68%), hsl(${letterH2} ${Math.max(42, clampedS2 * 0.92)}% 58%) 58%, hsl(${letterH} ${Math.max(42, clampedS * 0.92)}% 70%))`;
  const pocketGradient = `linear-gradient(180deg, hsl(${letterH} ${Math.max(38, clampedS * 0.86)}% 86%), hsl(${letterHM} ${Math.max(36, clampedSM * 0.82)}% 80%) 58%, hsl(${letterH2} ${Math.max(34, clampedS2 * 0.8)}% 74%))`;
  const letterGradient = `linear-gradient(180deg, hsl(${letterH2} ${Math.max(28, clampedS2 * 0.68)}% 96%), hsl(${letterHM} ${Math.max(30, clampedSM * 0.72)}% 92%) 55%, hsl(${letterH} ${Math.max(30, clampedS * 0.72)}% 88%))`;

  return (
    <div className="relative h-36 w-52 overflow-hidden rounded-[1.35rem] border border-border/60 p-3 shadow-card-sm" style={{ background: backdrop }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.2), transparent 44%)' }} />
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 rounded-[1rem]"
          style={{
            background: shellGradient,
            boxShadow: `0 14px 28px hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 28% / 0.22)`,
          }}
        />
        <div className="absolute inset-[1px] rounded-[0.95rem] border border-white/60" />
        <div
          className="absolute left-1/2 top-0 h-[52%] w-[92%] -translate-x-1/2 origin-top rounded-[0.9rem]"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            background: flapGradient,
          }}
        />
        <div
          className="absolute bottom-[10%] left-1/2 h-[55%] w-[90%] -translate-x-1/2 rounded-[0.85rem] border"
          style={{
            background: pocketGradient,
            borderColor: `hsl(${mixedLetterH} ${((clampedS + clampedS2) / 2) * 0.3}% 85% / 0.7)`,
          }}
        />
        <div
          className="absolute left-1/2 top-[24%] h-[40%] w-[74%] -translate-x-1/2 rounded-[0.7rem] border px-2.5 py-2 text-left"
          style={{
            background: letterGradient,
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
            background: `radial-gradient(circle at 30% 30%, ${startColor}, ${resolvedMid} 55%, ${endColor})`,
          }}
        />
      </div>
    </div>
  );
}

function FreeformOpenerPreview({ startColor, endColor, midColor, gradientAngle, recipientName, coverPhotoUrl }: Omit<OpenerThemePreviewProps, 'mode'>) {
  const resolvedMid = midColor || endColor;
  const angle = Number.isFinite(gradientAngle) ? Number(gradientAngle) : 145;
  const { h: hStart, s: sStart, l: lStart } = hexToHsl(startColor);
  const { h: hMid, s: sMid, l: lMid } = hexToHsl(resolvedMid);
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
  const backdrop = `linear-gradient(${angle}deg, ${startColor} 0%, ${resolvedMid} 52%, ${endColor} 100%)`;
  const overlay = `linear-gradient(180deg, hsl(${hEnd} ${Math.max(24, sEnd * 0.6)}% ${Math.max(12, lEnd * 0.36)}% / 0.78), hsl(${hMid} ${Math.max(26, sMid * 0.62)}% ${Math.max(11, lMid * 0.34)}% / 0.86) 52%, hsl(${overlayHue} ${Math.max(30, overlaySat * 0.68)}% ${Math.max(10, overlayLight * 0.34)}% / 0.92))`;

  return (
    <div className="relative h-44 w-56 overflow-hidden rounded-[1.35rem] border border-border/60 p-2.5 shadow-card-sm" style={{ background: `${overlay}, ${backdrop}` }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `repeating-linear-gradient(180deg, hsl(${overlayHue} ${Math.max(8, overlaySat * 0.24)}% 96% / 0.035) 0px, hsl(${overlayHue} ${Math.max(8, overlaySat * 0.24)}% 96% / 0.035) 1px, transparent 1px, transparent 4px)` }} />
      <div className="pointer-events-none absolute left-[6%] top-[12%] h-9 w-16 rotate-[-6deg] rounded-md border" style={{ borderColor: floatCardBorder, backgroundColor: floatCardFill }} />
      <div className="pointer-events-none absolute right-[8%] top-[16%] h-8 w-14 rotate-[5deg] rounded-md border" style={{ borderColor: floatCardBorder, backgroundColor: floatCardFill }} />
      <div className="pointer-events-none absolute left-[14%] bottom-[11%] h-9 w-14 rotate-[2deg] rounded-md border" style={{ borderColor: floatCardBorder, backgroundColor: floatCardFill }} />

      <div className="relative mx-auto w-fit rounded-md px-3 pb-2.5 pt-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)]" style={{ backgroundColor: paperColor }}>
        <div className="relative mx-auto h-2.5 w-10 -translate-y-1.5 rounded-xs" style={{ backgroundColor: `${endColor}cc` }} />
        <div className="relative h-[7.2rem] w-[8.6rem] overflow-hidden rounded-xs text-center" style={{ background: `linear-gradient(${angle}deg, ${startColor}, ${resolvedMid} 52%, ${endColor})` }}>
          {coverPhotoUrl ? (
            <img src={coverPhotoUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full p-2 flex flex-col justify-center items-center">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em]" style={{ color: textSecondary }}>Happy Birthday</p>
              <p className="mt-1 text-sm font-bold leading-tight line-clamp-1" style={{ color: textPrimary }}>{recipientName || 'Alex'}</p>
              <div className="mx-auto mt-1.5 h-0.5 w-6 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.45)' }} />
            </div>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] font-semibold leading-none line-clamp-1" style={{ color: nameText }}>{recipientName || 'Alex'}</p>
      </div>

      <div className="relative mt-1.5 flex items-center justify-center gap-1.5 text-[8.5px] font-medium">
        <span className="rounded-full border px-2 py-0.5" style={{ backgroundColor: chipBg, borderColor: chipBorder, color: chipText }}>Wishes</span>
        <span className="rounded-full border px-2 py-0.5" style={{ backgroundColor: chipBg, borderColor: chipBorder, color: chipText }}>Photos</span>
      </div>
    </div>
  );
}

function BentoOpenerPreview({ startColor, endColor, midColor, gradientAngle, recipientName, coverPhotoUrl }: Omit<OpenerThemePreviewProps, 'mode'>) {
  const resolvedMid = midColor || endColor;
  const angle = Number.isFinite(gradientAngle) ? Number(gradientAngle) : 145;
  const backdropGradient = `linear-gradient(${angle}deg, ${startColor} 0%, ${resolvedMid} 52%, ${endColor} 100%)`;

  return (
    <div className="relative h-44 w-56 overflow-hidden rounded-[1.35rem] border border-border/60 p-2 shadow-card-sm bg-slate-950 flex flex-col justify-between">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute -top-8 -left-8 h-28 w-28 rounded-full blur-xl opacity-45"
        style={{ background: startColor }}
      />
      <div
        className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-xl opacity-45"
        style={{ background: endColor }}
      />

      {/* 3D Bento Vault Shell Container */}
      <div className="relative z-10 rounded-[1.1rem] border border-white/20 bg-slate-900/80 p-2 shadow-md backdrop-blur-md ring-1 ring-white/10 flex-1 flex flex-col justify-between">
        {/* Bento Compartments Grid */}
        <div className="grid grid-cols-2 gap-1.5 text-left">
          {/* Tile 1: Milestone Honoree Header (Spans 2 cols) */}
          <div
            className="col-span-2 rounded-xl p-2 border border-white/20 shadow-2xs relative overflow-hidden"
            style={{
              background: `linear-gradient(${angle}deg, ${startColor}33, ${resolvedMid}22, ${endColor}33)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 px-1.5 py-0.2 text-[7.5px] font-bold uppercase tracking-wider text-amber-200">
                <span>✨ Vault</span>
              </span>
              <span className="text-[7.5px] font-semibold text-white/75">
                Milestone
              </span>
            </div>
            <h3 className="mt-1 font-serif text-[11px] font-bold text-white tracking-tight leading-tight line-clamp-1">
              Happy Birthday, {recipientName || 'Alex'}! ✨
            </h3>
          </div>

          {/* Tile 2: Cover Photo Portrait */}
          <div className="col-span-1 rounded-lg bg-white/10 border border-white/15 p-1 flex flex-col items-center justify-center text-center h-12 relative overflow-hidden">
            {coverPhotoUrl ? (
              <img src={coverPhotoUrl} alt="Cover" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            ) : (
              <span className="text-sm">📸</span>
            )}
            <div className="relative z-10 mt-auto bg-black/60 rounded px-1 text-[7.5px] font-semibold text-amber-200">
              Portrait
            </div>
          </div>

          {/* Tile 3: Collected Memories Metrics */}
          <div className="col-span-1 rounded-lg bg-white/10 border border-white/15 p-1.5 flex flex-col justify-between h-12">
            <span className="text-[7.5px] font-bold uppercase text-white/70">Wishes</span>
            <div className="flex items-center justify-between text-[8px] text-white/90 font-medium">
              <span className="font-bold text-[10px] text-white">12</span>
              <span>📸 6 · 🎙️ 3</span>
            </div>
          </div>
        </div>

        {/* Action Button: Unwrap Bento */}
        <div className="mt-1.5 pt-1.5 border-t border-white/15 flex flex-col items-center gap-0.5">
          <div
            className="w-full py-1 px-2 rounded-lg text-white font-bold text-[9px] flex items-center justify-center gap-1 shadow-sm"
            style={{ background: backdropGradient }}
          >
            <span>🎁</span>
            <span className="line-clamp-1">Unwrap Celebration Bento</span>
          </div>
          <span className="text-[7px] text-white/50 tracking-wider">skip intro</span>
        </div>
      </div>
    </div>
  );
}

export default function OpenerThemePreview({ mode, startColor, endColor, midColor, gradientAngle, recipientName, coverPhotoUrl }: OpenerThemePreviewProps) {
  if (mode === 'story') {
    return <StoryOpenerPreview startColor={startColor} endColor={endColor} midColor={midColor} gradientAngle={gradientAngle} recipientName={recipientName} coverPhotoUrl={coverPhotoUrl} />;
  }
  if (mode === 'freeform') {
    return <FreeformOpenerPreview startColor={startColor} endColor={endColor} midColor={midColor} gradientAngle={gradientAngle} recipientName={recipientName} coverPhotoUrl={coverPhotoUrl} />;
  }
  return <BentoOpenerPreview startColor={startColor} endColor={endColor} midColor={midColor} gradientAngle={gradientAngle} recipientName={recipientName} coverPhotoUrl={coverPhotoUrl} />;
}