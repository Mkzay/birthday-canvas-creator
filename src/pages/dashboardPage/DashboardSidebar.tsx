import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Crown,
  LogOut,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
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
  isMobileDrawer?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
};

export function DashboardSidebar({
  user,
  profile,
  activePagesCount,
  deliveredPagesCount,
  totalPagesCount,
  isProUser,
  onSignOut,
  isMobileDrawer = false,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
}: DashboardSidebarProps) {
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';
  const initial = displayName.charAt(0).toUpperCase();

  const containerClasses = isMobileDrawer
    ? 'w-full h-full bg-[#FAF7F2] text-slate-900 flex flex-col justify-between select-none p-5 overflow-y-auto'
    : `bg-[#FAF7F2] text-slate-900 flex flex-col justify-between border-r border-stone-200/90 shrink-0 hidden lg:flex select-none transition-[width] duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`;

  return (
    <aside className={containerClasses}>
      <div>
        {/* Brand Header */}
        {isMobileDrawer ? (
          <div className="flex items-center justify-between pb-4 border-b border-stone-200/80">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/wish-canvas-logo.svg"
                alt="WishCanvas"
                className="h-9 w-9 rounded-xl object-contain shadow-xs shrink-0"
              />
              <div>
                <h1 className="font-serif text-lg font-bold text-slate-950 tracking-tight leading-none">
                  WishCanvas
                </h1>
                <span className="font-serif italic text-xs text-stone-500">
                  creator atelier
                </span>
              </div>
            </Link>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="group flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-xs hover:border-stone-400 hover:text-slate-950 transition-all active:scale-95"
                aria-label="Close menu"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform duration-200 group-hover:rotate-90 text-stone-600 group-hover:text-slate-950"
                >
                  <path
                    d="M2 2L10 10M10 2L2 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : isCollapsed ? (
          <div className="p-3 border-b border-stone-200/80 flex flex-col items-center gap-2">
            <Link to="/" className="flex items-center justify-center" title="WishCanvas">
              <img
                src="/wish-canvas-logo.svg"
                alt="WishCanvas"
                className="h-8 w-8 rounded-xl object-contain shadow-xs shrink-0 transition-transform duration-200 hover:scale-105"
              />
            </Link>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="h-7 w-7 rounded-lg border border-stone-200/80 bg-white text-stone-500 hover:text-slate-950 hover:bg-stone-50 flex items-center justify-center transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-5 border-b border-stone-200/80 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group min-w-0">
              <img
                src="/wish-canvas-logo.svg"
                alt="WishCanvas"
                className="h-9 w-9 rounded-xl object-contain shadow-xs shrink-0 transition-transform duration-200 group-hover:scale-105"
              />
              <div className="truncate">
                <h1 className="font-serif text-lg font-bold text-slate-950 tracking-tight leading-none group-hover:text-amber-800 transition-colors">
                  WishCanvas
                </h1>
                <span className="font-serif italic text-xs text-stone-500">
                  creator atelier
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              {isProUser ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 text-amber-700" />
                  PRO
                </span>
              ) : (
                <Link to="/billing">
                  <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 hover:text-slate-950 px-2 py-0.5 rounded-full border border-stone-200 transition-colors">
                    Free
                  </span>
                </Link>
              )}

              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="h-7 w-7 rounded-lg border border-stone-200/80 bg-white text-stone-500 hover:text-slate-950 hover:bg-stone-50 flex items-center justify-center transition-colors ml-0.5"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        {isCollapsed && !isMobileDrawer ? (
          <div className="p-3 flex justify-center">
            <Link to="/create" title="Craft New Canvas">
              <button
                type="button"
                className="btn-press h-10 w-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold shadow-card transition-all flex items-center justify-center active:scale-95"
                aria-label="Craft New Canvas"
              >
                <Plus className="h-4 w-4 text-amber-300 stroke-[3]" />
              </button>
            </Link>
          </div>
        ) : (
          <div className="p-4">
            <Link to="/create">
              <button
                type="button"
                className="btn-press w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs shadow-card transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 text-amber-300 stroke-[3]" />
                <span>Craft New Canvas</span>
              </button>
            </Link>
          </div>
        )}

        {/* Workspace Navigation */}
        {isCollapsed && !isMobileDrawer ? (
          <nav className="px-2 space-y-3 text-xs flex flex-col items-center">
            <div
              className="h-10 w-10 rounded-xl bg-white border border-stone-200/90 text-slate-950 flex items-center justify-center relative shadow-xs"
              title={`Timeline and Pipeline: ${totalPagesCount} total`}
            >
              <CalendarDays className="h-4 w-4 text-amber-700" />
              {totalPagesCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalPagesCount}
                </span>
              )}
            </div>

            <div
              className="h-10 w-10 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 flex items-center justify-center relative transition-colors cursor-pointer"
              title={`Live Collecting: ${activePagesCount}`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div
              className="h-10 w-10 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 flex items-center justify-center relative transition-colors cursor-pointer"
              title={`Delivered Keepsakes: ${deliveredPagesCount}`}
            >
              <Trophy className="h-4 w-4 text-stone-400" />
            </div>

            <div className="w-8 h-px bg-stone-200/80 my-1" />

            <Link
              to="/themes"
              className="h-10 w-10 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 flex items-center justify-center transition-colors"
              title="Custom Themes"
            >
              <Palette className="h-4 w-4 text-amber-700" />
            </Link>

            <Link
              to="/billing"
              className="h-10 w-10 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 flex items-center justify-center transition-colors"
              title={isProUser ? 'Pro Membership' : 'Upgrade to Pro'}
            >
              <Crown className="h-4 w-4 text-amber-700" />
            </Link>
          </nav>
        ) : (
          <nav className="px-3 space-y-6 text-xs">
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Workspace
              </span>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-stone-200/90 text-slate-950 font-bold shadow-xs">
                <span className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-amber-700" />
                  <span>Timeline &amp; Pipeline</span>
                </span>
                <span className="text-[11px] font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/80">
                  {totalPagesCount}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-600 font-medium">
                <span className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Collecting</span>
                </span>
                <span className="text-[11px] text-stone-500 font-bold">
                  {activePagesCount}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-600 font-medium">
                <span className="flex items-center gap-2.5">
                  <Trophy className="h-4 w-4 text-stone-400" />
                  <span>Delivered Keepsakes</span>
                </span>
                <span className="text-[11px] text-stone-500 font-bold">
                  {deliveredPagesCount}
                </span>
              </div>
            </div>

            {/* Design Tools */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Studio Tools
              </span>
              <Link
                to="/themes"
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 font-medium transition-all"
              >
                <Palette className="h-4 w-4 text-amber-700" />
                <span>Custom Themes</span>
              </Link>
              <Link
                to="/billing"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 font-medium transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <Crown className="h-4 w-4 text-amber-700" />
                  <span>Pro Membership</span>
                </span>
                {!isProUser && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    Upgrade
                  </span>
                )}
              </Link>
            </div>
          </nav>
        )}
      </div>

      {/* User Profile Footer */}
      {isCollapsed && !isMobileDrawer ? (
        <div className="p-3 border-t border-stone-200/80 space-y-3 flex flex-col items-center">
          <Link to="/settings" title={`Settings (${displayName})`}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover border border-amber-300 shadow-xs"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {initial}
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-stone-200/80 space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-stone-200/90 text-xs shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover border border-amber-300 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center shrink-0">
                  {initial}
                </div>
              )}
              <div className="truncate">
                <p className="font-bold text-slate-950 truncate">{displayName}</p>
                <p className="text-[10px] text-stone-500 truncate">
                  {isProUser ? 'Pro Studio Plan' : 'Free Creator'}
                </p>
              </div>
            </div>

            <Link
              to="/settings"
              className="p-1.5 text-stone-400 hover:text-slate-950 rounded-lg hover:bg-stone-50 transition-colors"
              title="Account Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
