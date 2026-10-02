import type { DisplayMode } from './types';

export function ModePreview({ mode }: { mode: DisplayMode }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/35 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live preview</p>
        <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {mode === 'story' ? 'Story flow' : mode === 'freeform' ? 'Freeform board' : 'Bento grid'}
        </span>
      </div>

      {mode === 'story' && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
            <div className="flex w-full gap-2 px-2 py-2">
              <div className="w-[70%] shrink-0 rounded-lg border border-border/60 bg-gradient-to-br from-amber-100/70 to-rose-100/70 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">Slide 1</p>
                <p className="mt-1 text-xs font-medium text-foreground">Cover reveal</p>
              </div>
              <div className="w-[70%] shrink-0 rounded-lg border border-border/50 bg-background/75 p-2 opacity-80">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Slide 2</p>
                <p className="mt-1 text-xs text-foreground">Birthday stats</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-foreground/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/35" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/35" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/35" />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Swipe or next controls</p>
          </div>
        </div>
      )}

      {mode === 'freeform' && (
        <div className="columns-2 [column-gap:0.5rem]">
          <article className="relative mb-2 inline-block w-full break-inside-avoid rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-900 shadow-sm [transform:rotate(-1.5deg)]">
            <span className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-sm bg-amber-200/80" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Nora</p>
            <p className="mt-1 text-[11px] leading-snug">You made this year brighter for everyone.</p>
          </article>
          <article className="relative mb-2 inline-block w-full break-inside-avoid rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-900 shadow-sm [transform:rotate(1.2deg)]">
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-rose-400/85" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Jules</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <div className="h-7 rounded-md border border-white/65 bg-white/70" />
              <div className="h-7 rounded-md border border-white/65 bg-white/70" />
            </div>
          </article>
          <article className="relative mb-2 inline-block w-full break-inside-avoid rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2 text-sky-900 shadow-sm [transform:rotate(-0.8deg)]">
            <span className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-sm bg-sky-200/85" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Amara</p>
            <p className="mt-1 text-[11px]">Voice note + message</p>
          </article>
        </div>
      )}

      {mode === 'bento' && (
        <div className="grid grid-cols-2 gap-1.5 text-left text-xs">
          {/* Tile 1: Milestone Hero Header */}
          <div className="col-span-2 rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 p-2 shadow-2xs">
            <div className="flex items-center justify-between text-[9px]">
              <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">✨ Bento Vault</span>
              <span className="font-medium text-muted-foreground">Milestone</span>
            </div>
            <p className="mt-0.5 font-serif text-xs font-bold text-foreground">Happy Birthday, Alex! 🎂</p>
          </div>

          {/* Tile 2: Moments Vault */}
          <div className="rounded-xl border border-border/70 bg-background/80 p-2 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Moments</span>
            <p className="text-[10px] font-semibold text-foreground">📸 6 photos · 🎙️ 3 clips</p>
          </div>

          {/* Tile 3: Voice Note */}
          <div className="rounded-xl border border-border/70 bg-background/80 p-2 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Voice Note</span>
            <div className="flex items-center gap-1 text-[10px] font-medium text-foreground">
              <span className="h-2 w-0.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="h-3 w-0.5 bg-amber-500 rounded-full animate-pulse delay-75" />
              <span className="h-1.5 w-0.5 bg-amber-500 rounded-full" />
              <span className="ml-1 text-[9px] text-muted-foreground">0:42 Sarah</span>
            </div>
          </div>

          {/* Tile 4: Pinned Wish */}
          <div className="col-span-2 rounded-xl border border-border/70 bg-background/90 p-2 shadow-2xs">
            <div className="flex items-center justify-between text-[9px] mb-0.5">
              <span className="font-bold text-foreground">David K.</span>
              <span className="text-muted-foreground">Friend</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic line-clamp-1">&quot;Wishing you an incredible year ahead filled with joy!&quot;</p>
          </div>
        </div>
      )}
    </div>
  );
}
