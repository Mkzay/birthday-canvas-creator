import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Crown,
  LogOut,
  Music4,
  Palette,
  Plus,
  Radio,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { User } from '@/context/AuthContext';

type DashboardSidebarProps = {
  user: User | null;
  profile: UserProfile | null;
  activePagesCount: number;
  deliveredPagesCount: number;
  totalPagesCount: number;
  isProUser: boolean;
  onSignOut: () => void;
};

export function DashboardSidebar({
  user,
  profile,
  activePagesCount,
  deliveredPagesCount,
  totalPagesCount,
  isProUser,
  onSignOut,
}: DashboardSidebarProps) {
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="w-64 bg-[#18181B] text-stone-300 flex flex-col justify-between border-r border-stone-800/90 shrink-0 hidden lg:flex select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-amber-300 flex items-center justify-center text-base shadow-md transition-transform duration-300 group-hover:scale-105">
              🎂
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-white tracking-tight leading-none group-hover:text-amber-300 transition-colors">
                WishCanvas
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono">
                Creator Atelier
              </span>
            </div>
          </Link>

          {isProUser ? (
            <span className="text-[10px] font-bold bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
              <Crown className="h-2.5 w-2.5 text-amber-400" />
              PRO
            </span>
          ) : (
            <Link to="/billing">
              <span className="text-[10px] font-semibold bg-stone-800 text-stone-400 hover:text-amber-300 px-2 py-0.5 rounded-full border border-stone-700 transition-colors">
                Free
              </span>
            </Link>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <Link to="/create">
            <button
              type="button"
              className="btn-press w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-rose-400 hover:from-amber-400 hover:to-rose-300 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 text-slate-950 stroke-[3]" />
              <span>Craft New Canvas</span>
            </button>
          </Link>
        </div>

        {/* Workspace Navigation */}
        <nav className="px-3 space-y-6 text-xs">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Workspace
            </span>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-800/90 text-white font-semibold shadow-xs">
              <span className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-amber-400" />
                <span>Timeline &amp; Pipeline</span>
              </span>
              <span className="text-[11px] font-bold bg-stone-700/80 text-amber-300 px-1.5 py-0.5 rounded-md">
                {totalPagesCount}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-stone-400 font-medium">
              <span className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Collecting</span>
              </span>
              <span className="text-[11px] text-stone-400 font-bold">
                {activePagesCount}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-stone-400 font-medium">
              <span className="flex items-center gap-2.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Delivered Keepsakes</span>
              </span>
              <span className="text-[11px] text-stone-400 font-bold">
                {deliveredPagesCount}
              </span>
            </div>
          </div>

          {/* Design Tools */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Studio Tools
            </span>
            <Link
              to="/themes"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-stone-400 hover:bg-stone-800/60 hover:text-white font-medium transition-all"
            >
              <Palette className="h-4 w-4 text-amber-400" />
              <span>Custom Themes</span>
            </Link>
            <Link
              to="/billing"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-stone-400 hover:bg-stone-800/60 hover:text-white font-medium transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Crown className="h-4 w-4 text-amber-400" />
                <span>Pro Membership</span>
              </span>
              {!isProUser && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                  Upgrade
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-stone-800/80 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-stone-900/90 border border-stone-800 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover border border-amber-400/40 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center shrink-0">
                {initial}
              </div>
            )}
            <div className="truncate">
              <p className="font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-stone-400 truncate">
                {isProUser ? 'Pro Studio Plan' : 'Free Creator'}
              </p>
            </div>
          </div>

          <Link
            to="/settings"
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            title="Account Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
