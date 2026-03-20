import BrandLogo from '@/components/BrandLogo';

const pulseDelays = ['[animation-delay:0ms]', '[animation-delay:180ms]', '[animation-delay:360ms]'];

const DashboardEntryLoader = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.14),transparent_34%),radial-gradient(circle_at_85%_16%,rgba(236,72,153,0.14),transparent_32%),linear-gradient(180deg,#fffefc_0%,#fff8f2_44%,#ffffff_100%)] px-6">
      <div className="absolute inset-0">
        <div className="absolute left-[8%] top-20 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute right-[9%] top-24 h-52 w-52 rounded-full bg-fuchsia-200/45 blur-3xl" />
        <div className="absolute bottom-8 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/78 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-md sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo to="/" compact textClassName="text-xl font-semibold text-foreground" />
          <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            Preparing dashboard
          </span>
        </div>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Bringing your pages in...</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Pulling your active pages, saved links, and story stats.
        </p>

        <div className="mt-8 grid gap-3">
          {pulseDelays.map((delayClass, index) => (
            <div
              key={index}
              className={`h-16 rounded-2xl border border-border/60 bg-[linear-gradient(110deg,rgba(255,255,255,0.82),rgba(255,255,255,0.45),rgba(255,255,255,0.82))] animate-pulse ${delayClass}`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Syncing celebration data
        </div>
      </section>
    </div>
  );
};

export default DashboardEntryLoader;
