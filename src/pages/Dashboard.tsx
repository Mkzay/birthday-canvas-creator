import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Edit,
  Eye,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  MoreVertical,
  Palette,
  Plus,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch, resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { builtInThemeMap } from '@/lib/themes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BirthdayPage {
  id: string;
  public_code: string;
  recipient_name: string;
  birthday_date: string;
  close_date: string | null;
  theme: string;
  status: string;
  created_at: string;
  cover_photo_url?: string | null;
  message_count?: number;
}

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
}

type ThemeDisplay = {
  name: string;
  emoji: string;
  primary: string;
  accent: string;
  isCustom: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  mood?: string;
};

const themeAccentMap: Record<string, string> = {
  elegant: '#fbbf24',
  playful: '#ec4899',
  minimalist: '#64748b',
  retro: '#06b6d4',
  tropical: '#22c55e',
  cosmic: '#8b5cf6',
  sunset: '#f97316',
  ocean: '#0ea5e9',
  candyland: '#f472b6',
  midnight: '#6366f1',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagePendingDelete, setPagePendingDelete] = useState<BirthdayPage | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  const fetchCustomThemes = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiFetch<CustomTheme[]>('/themes');
      setCustomThemes(data || []);
    } catch (error) {
      console.error(error);
      setCustomThemes([]);
    }
  }, [user]);

  const fetchPages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await apiFetch<BirthdayPage[]>('/pages/dashboard');
      setPages(data || []);
    } catch (error) {
      toast.error('Failed to load pages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void Promise.all([fetchPages(), fetchCustomThemes()]);
    }
  }, [fetchCustomThemes, fetchPages, user]);

  const getThemeDisplay = useCallback(
    (themeKey: string): ThemeDisplay => {
      if (themeKey.startsWith('custom_')) {
        const customId = themeKey.replace('custom_', '');
        const customTheme = customThemes.find((theme) => theme.id === customId);

        if (customTheme) {
          return {
            name: customTheme.name,
            emoji: customTheme.emoji,
            primary: '',
            accent: customTheme.gradient_from,
            isCustom: true,
            gradientFrom: customTheme.gradient_from,
            gradientTo: customTheme.gradient_to,
            mood: 'Custom theme',
          };
        }
      }

      const builtInTheme = builtInThemeMap[themeKey] || builtInThemeMap.elegant;

      return {
        name: builtInTheme.name,
        emoji: builtInTheme.emoji,
        primary: builtInTheme.primary,
        accent: themeAccentMap[builtInTheme.key] || '#fbbf24',
        isCustom: false,
        mood: builtInTheme.mood,
      };
    },
    [customThemes],
  );

  const stats = useMemo(
    () => ({
      totalPages: pages.length,
      activePages: pages.filter((page) => page.status === 'active').length,
      totalMessages: pages.reduce((accumulator, page) => accumulator + (page.message_count || 0), 0),
    }),
    [pages],
  );

  const getStatusBadge = (page: BirthdayPage) => {
    const birthdayDate = parseLocalDate(page.birthday_date);
    const closeDate = page.close_date ? parseLocalDate(page.close_date) : birthdayDate;
    const daysUntilBirthday = differenceInDays(birthdayDate, new Date());
    const collectionWindowClosed = differenceInDays(closeDate, new Date()) < 0 && daysUntilBirthday > 0;

    if (page.status === 'delivered') {
      return { label: 'Delivered', className: 'bg-slate-900/8 text-slate-700' };
    }
    if (collectionWindowClosed) {
      return { label: 'Collection closed', className: 'bg-destructive/10 text-destructive' };
    }
    if (daysUntilBirthday <= 0) {
      return { label: 'Ready to reveal', className: 'bg-emerald-100 text-emerald-700' };
    }
    if (daysUntilBirthday <= 7) {
      return { label: `${daysUntilBirthday} day${daysUntilBirthday === 1 ? '' : 's'} left`, className: 'bg-amber-100 text-amber-700' };
    }

    return { label: 'Collecting wishes', className: 'bg-primary/10 text-primary' };
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await apiFetch<void>(`/pages/${id}`, {
        method: 'DELETE',
      });
      setPages((currentPages) => currentPages.filter((page) => page.id !== id));
      toast.success(`"${name}'s" birthday page deleted`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete page');
    }
  };

  const copyLink = async (pageCode: string, type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const link = type === 'contribute' ? `${baseUrl}/contribute/${pageCode}` : `${baseUrl}/birthday/${pageCode}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success(type === 'contribute' ? 'Contribution link copied' : 'Birthday link copied');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.10),transparent_24%),linear-gradient(180deg,#fffefe_0%,#fffaf5_48%,#ffffff_100%)]">
      <header className="border-b border-border/60 bg-white/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="gradient-cta flex h-10 w-10 items-center justify-center rounded-xl text-xl text-white shadow-[0_12px_32px_rgba(194,58,196,0.22)]">
              🎨
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">WishCanvas</p>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Dashboard</p>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 rounded-full border border-border/60 bg-card/90 px-2 py-2 shadow-sm transition-colors hover:border-primary/20"
                aria-label="Open account menu"
                type="button"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="gradient-cta flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                My Pages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,246,241,0.98))] p-6 shadow-[0_24px_80px_rgba(18,18,23,0.08)] sm:p-8">
            <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-secondary/14 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Birthday studio
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Keep pages moving, check what is closest to reveal day, and jump straight into editing or sharing from one place.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/create">
                  <Button variant="hero" size="lg" className="w-full gap-2 sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Create birthday page
                  </Button>
                </Link>
                <Link to="/themes">
                  <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                    <Palette className="h-4 w-4" />
                    Open theme builder
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              {
                label: 'Pages',
                value: stats.totalPages,
                detail: 'total celebrations',
                icon: FileText,
                panelClassName: 'from-amber-50 via-white to-orange-50',
                iconClassName: 'bg-amber-100 text-amber-700',
              },
              {
                label: 'Active',
                value: stats.activePages,
                detail: 'still collecting',
                icon: Activity,
                panelClassName: 'from-emerald-50 via-white to-teal-50',
                iconClassName: 'bg-emerald-100 text-emerald-700',
              },
              {
                label: 'Messages',
                value: stats.totalMessages,
                detail: 'wishes collected',
                icon: MessageSquare,
                panelClassName: 'from-fuchsia-50 via-white to-pink-50',
                iconClassName: 'bg-fuchsia-100 text-fuchsia-700',
              },
            ].map((item) => (
              <article
                key={item.label}
                className={`rounded-[1.6rem] border border-border/60 bg-gradient-to-br ${item.panelClassName} p-5 shadow-[0_18px_55px_rgba(18,18,23,0.05)]`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-3xl font-bold text-foreground">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Your pages</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Birthday pages in progress</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} total
            </p>
          </div>

          {pages.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-card/80 px-6 py-14 text-center shadow-[0_18px_55px_rgba(18,18,23,0.04)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-3xl">🎂</div>
              <h3 className="mt-5 text-xl font-bold text-foreground">No birthday pages yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Start with one page, choose a mood, and send the contribution link when you are ready to collect wishes.
              </p>
              <Link to="/create" className="mt-6 inline-flex">
                <Button variant="hero" size="lg">
                  Create your first page
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pages.map((page) => {
                const theme = getThemeDisplay(page.theme);
                const status = getStatusBadge(page);
                const collectionCloses = page.close_date ? format(parseLocalDate(page.close_date), 'MMM d') : 'Birthday date';

                return (
                  <article
                    key={page.id}
                    className="group overflow-hidden rounded-[1.9rem] border border-border/60 bg-card/94 shadow-[0_22px_70px_rgba(18,18,23,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(18,18,23,0.10)]"
                    style={{ borderColor: `${theme.accent}30` }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      {page.cover_photo_url ? (
                        <>
                          <img
                            src={page.cover_photo_url}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover opacity-35 blur-xl transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-slate-950/10 to-black/30" />
                          <div className="absolute inset-x-4 bottom-4 top-4 overflow-hidden rounded-[1.35rem] border border-white/18 bg-black/18 shadow-[0_20px_55px_rgba(15,23,42,0.28)] backdrop-blur-[2px]">
                            <img
                              src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                              alt={`${page.recipient_name}'s cover`}
                              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/12 to-transparent" />
                        </>
                      ) : theme.isCustom ? (
                        <div
                          className="h-full w-full"
                          style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
                      )}

                      <div className="absolute left-5 top-5 flex items-center gap-2">
                        <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                          {theme.emoji} {theme.name}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white">{page.recipient_name}&apos;s Birthday</h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
                              aria-label={`Open actions for ${page.recipient_name}`}
                              type="button"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyLink(page.public_code, 'contribute')}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Copy contribution link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyLink(page.public_code, 'birthday')}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Copy birthday link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setPagePendingDelete(page)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete page
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Birthday
                          </div>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {format(parseLocalDate(page.birthday_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Wishes
                          </div>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {page.message_count || 0} collected
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Collection window</p>
                        <p className="mt-2 text-sm font-medium text-foreground">Closes {collectionCloses}</p>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Link to={`/preview/${page.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        </Link>
                        <Link to={`/edit/${page.id}`} className="flex-1">
                          <Button variant="hero" size="sm" className="w-full gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <AlertDialog open={Boolean(pagePendingDelete)} onOpenChange={(open) => { if (!open) setPagePendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this birthday page?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the page, wishes, photos, and voice notes attached to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>{pagePendingDelete?.recipient_name}&apos;s celebration will be removed for good.</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPagePendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pagePendingDelete) {
                  void handleDelete(pagePendingDelete.id, pagePendingDelete.recipient_name);
                }
                setPagePendingDelete(null);
              }}
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
