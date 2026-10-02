import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Crown,
  LogOut,
  Palette,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  BrandDismissIcon,
  BrandSidebarExpandIcon,
  BrandSidebarRetractIcon,
} from '@/components/BrandIcons';
import type { User, UserProfile } from '@/context/AuthContext';

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
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const isThemes = location.pathname === '/themes';
  const isBilling = location.pathname === '/billing' || location.pathname.startsWith('/upgrade');
  const isSettings = location.pathname === '/settings';
  const isAdmin = location.pathname === '/admin';

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
                src="/wish-canvas-logo.png"
                onError={(e) => {
                  e.currentTarget.src = '/wish-canvas-logo.svg';
                }}
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
                className="group flex h-8 w-8 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-500 shadow-xs hover:border-stone-400 hover:text-slate-950 transition-all active:scale-95"
                title="Close menu"
                aria-label="Close menu"
              >
                <BrandDismissIcon className="h-3 w-3 transition-transform duration-200 group-hover:rotate-90 text-stone-600 group-hover:text-slate-950" />
              </button>
            )}
          </div>
        ) : isCollapsed ? (
          <div className="p-3 border-b border-stone-200/80 flex flex-col items-center gap-2">
            <Link to="/" className="flex items-center justify-center" title="WishCanvas">
              <img
                src="/wish-canvas-logo.png"
                onError={(e) => {
                  e.currentTarget.src = '/wish-canvas-logo.svg';
                }}
                alt="WishCanvas"
                className="h-8 w-8 rounded-xl object-contain shadow-xs shrink-0 transition-transform duration-200 hover:scale-105"
              />
            </Link>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-xl border border-stone-200/80 bg-white text-stone-500 hover:text-slate-950 hover:bg-stone-50 flex items-center justify-center transition-colors shadow-xs"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <BrandSidebarExpandIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-5 border-b border-stone-200/80 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group min-w-0">
              <img
                src="/wish-canvas-logo.png"
                onError={(e) => {
                  e.currentTarget.src = '/wish-canvas-logo.svg';
                }}
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
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 rounded-xl border border-stone-200/80 bg-white text-stone-500 hover:text-slate-950 hover:bg-stone-50 flex items-center justify-center transition-colors shadow-xs ml-0.5"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <BrandSidebarRetractIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Action Button (Celebratory, joyful warmth) */}
        {isCollapsed && !isMobileDrawer ? (
          <div className="p-3 flex justify-center">
            <Link to="/create" title="Craft New Canvas">
              <button
                type="button"
                className="btn-press h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 text-white font-bold shadow-md shadow-amber-500/25 transition-all flex items-center justify-center active:scale-95"
                aria-label="Craft New Canvas"
              >
                <Plus className="h-4 w-4 text-white stroke-[3]" />
              </button>
            </Link>
          </div>
        ) : (
          <div className="p-4">
            <Link to="/create">
              <button
                type="button"
                className="btn-press w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 text-amber-100" />
                <span>Craft New Canvas</span>
              </button>
            </Link>
          </div>
        )}

        {/* Navigation */}
        {isCollapsed && !isMobileDrawer ? (
          <nav className="px-2 space-y-3 text-xs flex flex-col items-center">
            <Link
              to="/dashboard"
              className={`h-10 w-10 rounded-xl flex items-center justify-center relative transition-colors ${
                isDashboard
                  ? 'bg-white border border-stone-200/90 text-slate-950 shadow-xs'
                  : 'text-stone-600 hover:bg-white hover:text-slate-950'
              }`}
              title={`Celebrations: ${totalPagesCount} total`}
            >
              <CalendarDays className="h-4 w-4 text-amber-700" />
              {totalPagesCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalPagesCount}
                </span>
              )}
            </Link>

            <Link
              to="/dashboard"
              className="h-10 w-10 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 flex items-center justify-center relative transition-colors"
              title={`Live Collecting: ${activePagesCount}`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </Link>

            <Link
              to="/dashboard"
              className="h-10 w-10 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 flex items-center justify-center relative transition-colors"
              title={`Delivered Keepsakes: ${deliveredPagesCount}`}
            >
              <Trophy className="h-4 w-4 text-stone-400" />
            </Link>

            <div className="w-8 h-px bg-stone-200/80 my-1" />

            <Link
              to="/themes"
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                isThemes
                  ? 'bg-white border border-stone-200/90 text-slate-950 shadow-xs'
                  : 'text-stone-600 hover:bg-white hover:text-slate-950'
              }`}
              title="Custom Themes"
            >
              <Palette className="h-4 w-4 text-amber-700" />
            </Link>

            <Link
              to="/billing"
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                isBilling
                  ? 'bg-white border border-stone-200/90 text-slate-950 shadow-xs'
                  : 'text-stone-600 hover:bg-white hover:text-slate-950'
              }`}
              title={isProUser ? 'Pro Membership' : 'Upgrade to Pro'}
            >
              <Crown className="h-4 w-4 text-amber-700" />
            </Link>

            <Link
              to="/settings"
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                isSettings
                  ? 'bg-white border border-stone-200/90 text-slate-950 shadow-xs'
                  : 'text-stone-600 hover:bg-white hover:text-slate-950'
              }`}
              title="Studio Settings"
            >
              <Settings className="h-4 w-4 text-amber-700" />
            </Link>

            {user?.isAdmin && (
              <Link
                to="/admin"
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  isAdmin
                    ? 'bg-purple-100 border border-purple-300 text-purple-950 shadow-xs'
                    : 'text-stone-600 hover:bg-white hover:text-purple-950'
                }`}
                title="Admin Console"
              >
                <ShieldCheck className="h-4 w-4 text-purple-700" />
              </Link>
            )}
          </nav>
        ) : (
          <nav className="px-3 space-y-6 text-xs">
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Celebrations
              </span>
              <Link
                to="/dashboard"
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  isDashboard
                    ? 'bg-white border border-stone-200/90 text-slate-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-white hover:text-slate-950 font-medium'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-amber-700" />
                  <span>Timeline &amp; Pipeline</span>
                </span>
                <span className="text-[11px] font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/80">
                  {totalPagesCount}
                </span>
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 font-medium transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Collecting</span>
                </span>
                <span className="text-[11px] text-stone-500 font-bold">
                  {activePagesCount}
                </span>
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-600 hover:bg-white hover:text-slate-950 font-medium transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <Trophy className="h-4 w-4 text-stone-400" />
                  <span>Delivered Keepsakes</span>
                </span>
                <span className="text-[11px] text-stone-500 font-bold">
                  {deliveredPagesCount}
                </span>
              </Link>
            </div>

            {/* Design Tools */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Creation Atelier
              </span>
              <Link
                to="/themes"
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                  isThemes
                    ? 'bg-white border border-stone-200/90 text-slate-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-white hover:text-slate-950 font-medium'
                }`}
              >
                <Palette className="h-4 w-4 text-amber-700" />
                <span>Custom Themes</span>
              </Link>
              <Link
                to="/billing"
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  isBilling
                    ? 'bg-white border border-stone-200/90 text-slate-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-white hover:text-slate-950 font-medium'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Crown className="h-4 w-4 text-amber-700" />
                  <span>{isProUser ? 'Atelier Perks' : 'Studio Perks'}</span>
                </span>
                {!isProUser ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    Upgrade
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Active
                  </span>
                )}
              </Link>
              <Link
                to="/settings"
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                  isSettings
                    ? 'bg-white border border-stone-200/90 text-slate-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-white hover:text-slate-950 font-medium'
                }`}
              >
                <Settings className="h-4 w-4 text-amber-700" />
                <span>Studio Settings</span>
              </Link>
              {user?.isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                    isAdmin
                      ? 'bg-purple-50/80 border border-purple-200 text-purple-950 font-bold shadow-xs'
                      : 'text-stone-600 hover:bg-white hover:text-purple-950 font-medium'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-purple-700" />
                  <span>Admin Console</span>
                </Link>
              )}
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
                className={`h-8 w-8 rounded-full object-cover shadow-xs ${
                  isProUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF7F2]' : 'border border-amber-300'
                }`}
              />
            ) : (
              <div
                className={`h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shadow-xs ${
                  isProUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF7F2]' : ''
                }`}
              >
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
                  className={`h-8 w-8 rounded-full object-cover shrink-0 ${
                    isProUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF7F2]' : 'border border-stone-200'
                  }`}
                />
              ) : (
                <div
                  className={`h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center shrink-0 ${
                    isProUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF7F2]' : ''
                  }`}
                >
                  {initial}
                </div>
              )}
              <div className="truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <p className="font-bold text-slate-950 truncate">{user ? displayName : 'Guest Creator'}</p>
                  {isProUser && (
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300/80 px-1.5 py-0.2 rounded-full shrink-0">
                      PRO
                    </span>
                  )}
                  {!user && (
                    <span className="text-[9px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded-full shrink-0">
                      Guest
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-500 truncate">
                  {user ? (isProUser ? 'Pro Atelier: Unlimited Canvases' : 'Free Creator: 5 Canvases') : 'Temporary Atelier Session'}
                </p>
              </div>
            </div>

            {user && (
              <Link
                to="/settings"
                className="p-1.5 text-stone-400 hover:text-slate-950 rounded-lg hover:bg-stone-50 transition-colors"
                title="Account Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}
          </div>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-950 text-white hover:bg-slate-900 text-xs font-bold transition-all shadow-xs"
            >
              <span>Sign In / Create Account</span>
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
