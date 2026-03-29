import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import { resolveAssetUrl } from '@/lib/api';
import { User, Settings, LogOut, LayoutDashboard, ArrowLeft, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  showDashboardLabel?: boolean;
  backTo?: { label: string; href?: string; useHistory?: boolean };
}

const Header = ({ showDashboardLabel = false, backTo }: HeaderProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (!backTo) return;
    if (backTo.useHistory && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(backTo.href || '/dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 sm:px-6 sm:py-4">
      <div className="glass-card mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 shadow-soft">
        <div className="flex items-center gap-3">
          <BrandLogo compact />
          {showDashboardLabel && (
            <div className="hidden border-l border-border/60 pl-3 sm:block">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Dashboard</p>
            </div>
          )}
          {backTo && (
            <div className="hidden border-l border-border/60 pl-3 sm:block">
              {backTo.useHistory ? (
                <button
                  type="button"
                  onClick={handleBackClick}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backTo.label}
                </button>
              ) : (
                <Link to={backTo.href || '/dashboard'} className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backTo.label}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {backTo && (
            backTo.useHistory ? (
              <button
                type="button"
                onClick={handleBackClick}
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            ) : (
              <Link to={backTo.href || '/dashboard'} className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:hidden">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Link>
            )
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 p-1 pr-3 transition-all hover:bg-primary/10 group"
                  aria-label="Open account menu"
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full border border-primary/20 shadow-sm transition-transform group-hover:scale-105">
                    {profile?.avatar_url ? (
                      <img
                        src={resolveAssetUrl(profile.avatar_url)!}
                        alt={displayName}
                        className="block h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <span className="hidden text-sm font-semibold text-foreground sm:block">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 shadow-soft-lg border-border/40 backdrop-blur-md">
                <div className="px-2 py-2 mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
                  <p className="text-sm font-medium text-foreground truncate mt-1">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="rounded-xl cursor-pointer py-2.5">
                  <LayoutDashboard className="mr-3 h-4 w-4 text-primary/70" />
                  <span className="font-medium">My Pages</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-xl cursor-pointer py-2.5">
                  <Settings className="mr-3 h-4 w-4 text-primary/70" />
                  <span className="font-medium">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/billing')} className="rounded-xl cursor-pointer py-2.5">
                  <CreditCard className="mr-3 h-4 w-4 text-primary/70" />
                  <span className="font-medium">Billing</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl cursor-pointer py-2.5" onClick={handleSignOut}>
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="light" size="sm" className="px-3 text-xs sm:px-4 sm:text-sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
