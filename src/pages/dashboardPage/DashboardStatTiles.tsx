import type { LucideIcon } from 'lucide-react';
import { Sparkles, Radio, Heart } from 'lucide-react';

export type DashboardStats = {
  totalPages: number;
  activePages: number;
  totalMessages: number;
};

type StatTile = {
  label: string;
  detail: string;
  icon: LucideIcon;
  iconClassName: string;
  badge?: string;
  badgeClassName?: string;
};

const TILES: StatTile[] = [
  {
    label: 'Total Canvases',
    detail: 'organized celebrations',
    icon: Sparkles,
    iconClassName: 'bg-amber-50 text-amber-800 border border-amber-200/80',
  },
  {
    label: 'Live Canvases',
    detail: 'currently gathering wishes',
    icon: Radio,
    iconClassName: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    badge: 'Live',
    badgeClassName: 'bg-emerald-100/70 text-emerald-800',
  },
  {
    label: 'Heartfelt Wishes',
    detail: 'voice notes and memories',
    icon: Heart,
    iconClassName: 'bg-rose-50 text-rose-600 border border-rose-200/80',
  },
];

type DashboardStatTilesProps = {
  stats: DashboardStats;
};

export function DashboardStatTiles({ stats }: DashboardStatTilesProps) {
  const values = [stats.totalPages, stats.activePages, stats.totalMessages];

  return (
    <div className="flex flex-col gap-3.5">
      {TILES.map((item, index) => (
        <article
          key={item.label}
          className="card-lift relative flex items-center justify-between overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white p-5 shadow-card hover:shadow-card-lg transition-all text-slate-900"
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${item.iconClassName}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                  {item.label}
                </span>
                {item.badge && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${item.badgeClassName}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">{item.detail}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="font-playfair text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              {values[index]}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
