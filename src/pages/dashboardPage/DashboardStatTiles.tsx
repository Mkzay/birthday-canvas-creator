import type { LucideIcon } from 'lucide-react';
import { Activity, FileText, MessageSquare } from 'lucide-react';

export type DashboardStats = {
  totalPages: number;
  activePages: number;
  totalMessages: number;
};

type StatTile = {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  panelClassName: string;
  iconClassName: string;
};

const TILES: StatTile[] = [
  {
    label: 'Pages',
    value: 0,
    detail: 'total celebrations',
    icon: FileText,
    panelClassName: 'from-amber-50 via-white to-orange-50',
    iconClassName: 'bg-amber-100 text-amber-700',
  },
  {
    label: 'Active',
    value: 0,
    detail: 'still collecting',
    icon: Activity,
    panelClassName: 'from-emerald-50 via-white to-teal-50',
    iconClassName: 'bg-emerald-100 text-emerald-700',
  },
  {
    label: 'Messages',
    value: 0,
    detail: 'wishes collected',
    icon: MessageSquare,
    panelClassName: 'from-fuchsia-50 via-white to-pink-50',
    iconClassName: 'bg-fuchsia-100 text-fuchsia-700',
  },
];

type DashboardStatTilesProps = {
  stats: DashboardStats;
};

export function DashboardStatTiles({ stats }: DashboardStatTilesProps) {
  const values = [stats.totalPages, stats.activePages, stats.totalMessages];

  return (
    <div className="flex flex-col gap-4">
      {TILES.map((item, index) => (
        <article
          key={item.label}
          className={`flex items-center gap-4 rounded-[1.35rem] border border-border/60 bg-gradient-to-br ${item.panelClassName} px-5 py-4 shadow-card`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClassName}`}>
            <item.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground">
              {values[index]} <span className="font-semibold">{item.label}</span>
            </p>
            <p className="text-sm text-muted-foreground">{item.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
