import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Edit,
  Eye,
  FileText,
  MessageSquare,
  MoreVertical,
  Palette,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Search,
  Users,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
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
import AnimatedBackground from '@/components/AnimatedBackground';
import WishCanvasLoader from '@/components/WishCanvasLoader';

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

type SystemStatusPayload = {
  ok: boolean;
  checks: {
    db: { ok: boolean; latency_ms?: number; error?: string };
    uploads: { ok: boolean; error?: string };
  };
  ts: string;
  latency_ms: number;
  meta?: { node_env?: string };
};

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
  const [savedPages, setSavedPages] = useState<BirthdayPage[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagePendingDelete, setPagePendingDelete] = useState<BirthdayPage | null>(null);
  const [savedPagePendingRemove, setSavedPagePendingRemove] = useState<BirthdayPage | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusPayload | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchSavedPages = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiFetch<BirthdayPage[]>('/pages/saved');
      setSavedPages(data || []);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  const fetchSystemStatus = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiFetch<SystemStatusPayload>('/health');
      setSystemStatus(data);
    } catch (error) {
      console.error(error);
      setSystemStatus(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void Promise.all([fetchPages(), fetchSavedPages(), fetchCustomThemes(), fetchSystemStatus()]);
    }
  }, [fetchCustomThemes, fetchPages, fetchSavedPages, fetchSystemStatus, user]);

  const isArchivedPage = (page: BirthdayPage) => {
    const birthdayDate = parseLocalDate(page.birthday_date);
    const daysUntilBirthday = differenceInDays(birthdayDate, new Date());
    return page.status === 'delivered' || daysUntilBirthday < 0;
  };

  const filteredLivePages = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return pages.filter((page) => {
      const name = page.recipient_name || '';
      const matchesSearch = name.toLowerCase().includes(query);
      return matchesSearch && !isArchivedPage(page);
    });
  }, [pages, searchQuery]);

  const filteredArchivedPages = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return pages.filter((page) => {
      const name = page.recipient_name || '';
      const matchesSearch = name.toLowerCase().includes(query);
      return matchesSearch && isArchivedPage(page);
    });
  }, [pages, searchQuery]);

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
    () =>
      pages.reduce(
        (acc, page) => {
          acc.totalPages++;
          if (page.status === 'active') {
            acc.activePages++;
          }
          acc.totalMessages += page.message_count || 0;
          return acc;
        },
        { totalPages: 0, activePages: 0, totalMessages: 0 },
      ),
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
    navigate('/auth');
  };

  if (authLoading || loading) {
    return <WishCanvasLoader />;
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.10),transparent_24%),linear-gradient(180deg,#fffefe_0%,#fffaf5_48%,#ffffff_100%)] relative">
      <AnimatedBackground showStars={false} showWaves={true} className="opacity-40" />
      <Header showDashboardLabel />

      <main className="mx-auto max-w-7xl px-4 pb-6 pt-24 sm:px-6 sm:pb-8 sm:pt-28">
        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-[#fcece5] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,243,236,0.96),rgba(255,234,246,0.72))] p-5 shadow-[0_10px_0_0_#fcece5] sm:rounded-[2.5rem] sm:p-10">
            <div className="absolute -right-14 -bottom-14 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-8 top-8 animate-float text-primary/30">
              <Sparkles className="h-12 w-12" />
            </div>
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Birthday studio
              </span>
              <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                Welcome back,
                <span className="block text-primary">{displayName}</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Build, style, and manage every celebration from one cozy workspace. Start a new page or refine your themes before the next birthday reveal.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:gap-3 sm:flex-row">
                <Link to="/create">
                  <Button variant="hero" size="lg" className="w-full gap-2 rounded-full px-6 sm:w-auto sm:px-7">
                    <Plus className="h-4 w-4" />
                    Create birthday page
                  </Button>
                </Link>
                <Link to="/themes">
                  <Button variant="outline" size="lg" className="w-full gap-2 rounded-full border-2 border-primary/40 text-primary hover:bg-primary/5 sm:w-auto">
                    <Palette className="h-4 w-4" />
                    Theme builder
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
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
                className={`flex items-center gap-3 rounded-[1.3rem] border-2 border-[#fcece5] bg-gradient-to-br ${item.panelClassName} px-4 py-3.5 shadow-[0_8px_0_0_#fcece5] sm:gap-4 sm:rounded-[1.7rem] sm:px-5 sm:py-4`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconClassName} sm:h-12 sm:w-12 sm:rounded-2xl`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-foreground sm:text-lg">
                    {item.value} <span className="font-semibold">{item.label}</span>
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">{item.detail}</p>
                </div>
              </article>
            ))}

            {systemStatus && (
              <div className="rounded-[1.7rem] border-2 border-[#fcece5] bg-card/85 px-5 py-4 shadow-[0_8px_0_0_#fcece5]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">System</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {systemStatus.ok ? 'All systems operational' : 'Degraded'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      DB {systemStatus.checks.db.ok ? 'OK' : 'FAIL'} • Uploads {systemStatus.checks.uploads.ok ? 'OK' : 'FAIL'}
                    </p>
                  </div>
                  <div className={systemStatus.ok ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700' : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'}>
                    {systemStatus.ok ? <Activity className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-4 px-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your pages</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Birthday pages</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your journeys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#fcece5] bg-white pl-9 pr-3 focus-visible:ring-primary/25"
              />
            </div>
          </div>

          <div className="px-0 py-0">
            {pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-10">
                  <div className="relative flex h-56 w-56 items-center justify-center rounded-[2rem] border-2 border-dashed border-[#f0d9ce] bg-[#fff8f2] text-primary/30 shadow-[0_10px_0_0_#fcece5]">
                    <FileText className="h-24 w-24" />
                    <div className="absolute inset-3 rounded-[1.5rem] border border-[#f3dfd5]" />
                  </div>
                  <div className="absolute -left-6 -top-6 animate-float rounded-full bg-pink-100 p-3 text-pink-400">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="absolute -bottom-5 -right-5 animate-float rounded-full bg-amber-100 p-3 text-amber-500 [animation-delay:900ms]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground">No birthday pages yet</h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Start your first celebration journey. Create one page, pick a theme, and begin collecting wishes in one beautiful place.
                </p>
                <Link to="/create" className="mt-8 inline-flex">
                  <Button variant="hero" size="lg" className="rounded-2xl px-8">
                    Create your first page
                  </Button>
                </Link>
              </div>
            ) : filteredLivePages.length === 0 && filteredArchivedPages.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-border bg-card/80 px-6 py-14 text-center shadow-card">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground">No matching pages</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  We couldn&apos;t find any pages matching your search and filter criteria.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(''); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div>
                <div className="overflow-hidden rounded-[2rem] border-2 border-[#fcece5] bg-card/95 shadow-[0_10px_0_0_#fcece5] sm:rounded-[2.5rem]">
                  <div className="border-b-2 border-[#fcece5] px-4 py-5 sm:px-8 sm:py-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">In progress</h3>
                    <span className="text-xs text-muted-foreground">{filteredLivePages.length} active</span>
                  </div>
                  </div>
                  <div className="px-4 py-6 sm:px-8 sm:py-8">
                    {filteredLivePages.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 sm:gap-5">
                      {filteredLivePages.map((page) => {
                    const theme = getThemeDisplay(page.theme);
                    const status = getStatusBadge(page);
                    const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');
                    const closeDate = page.close_date ? parseLocalDate(page.close_date) : parseLocalDate(page.birthday_date);
                    const closesLabel = format(closeDate, 'MMM d, yyyy');
                    const daysLeft = differenceInDays(closeDate, new Date());

                        return (
                          <article
                            key={page.id}
                            className="group overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/94 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover sm:rounded-[2rem]"
                            style={{ borderColor: `${theme.accent}30` }}
                          >
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:gap-4 sm:p-5">
                          <div className="relative h-40 w-full overflow-hidden rounded-[1.2rem] sm:h-auto sm:w-56 sm:min-w-56 sm:rounded-[1.5rem]">
                            {page.cover_photo_url ? (
                              <img
                                src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                                alt={`${page.recipient_name}'s cover`}
                                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            ) : theme.isCustom ? (
                              <div
                                className="h-full w-full"
                                style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                              />
                            ) : (
                              <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent" />
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold text-foreground sm:text-xl">{page.recipient_name}&apos;s Birthday</h3>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    {theme.emoji} {theme.name}
                                  </span>
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground transition-colors hover:bg-background"
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

                            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">
                              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                  <CalendarDays className="h-4 w-4" />
                                  <span>Birthday</span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-foreground">{birthdayLabel}</p>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>Wishes</span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-foreground">{page.message_count || 0} collected</p>
                              </div>
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-3 sm:gap-3">
                              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                <p className="text-xs font-semibold text-muted-foreground">Closes</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{closesLabel}</p>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                <p className="text-xs font-semibold text-muted-foreground">Countdown</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Closed'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2 sm:mt-5">
                              <Link to={`/preview/${page.public_code}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full gap-2">
                                  <Eye className="h-4 w-4" />
                                  Preview
                                </Button>
                              </Link>
                              <Link to={`/edit/${page.public_code}`} className="flex-1">
                                <Button variant="hero" size="sm" className="w-full gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                          </article>
                        );
                      })}
                    </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-card/80 px-5 py-8 text-center">
                        <p className="text-sm text-muted-foreground">No active pages right now.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {pages.length > 0 && !(filteredLivePages.length === 0 && filteredArchivedPages.length === 0) && (
          <section className="mt-8">
            <div className="overflow-hidden rounded-[2rem] border-2 border-[#fcece5] bg-card/95 shadow-[0_10px_0_0_#fcece5] sm:rounded-[2.5rem]">
              <div className="border-b-2 border-[#fcece5] px-4 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Archived & Past</h3>
                  <span className="text-xs text-muted-foreground">{filteredArchivedPages.length} completed</span>
                </div>
              </div>
              <div className="px-4 py-6 sm:px-8 sm:py-8">
                {filteredArchivedPages.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 sm:gap-5">
                    {filteredArchivedPages.map((page) => {
                      const theme = getThemeDisplay(page.theme);
                      const status = { label: 'Revealed', className: 'bg-slate-900/8 text-slate-700' };
                      const collectionCloses = page.close_date ? format(parseLocalDate(page.close_date), 'MMM d') : 'Birthday date';
                      const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');

                      return (
                        <article
                          key={page.id}
                          className="group overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/94 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover sm:rounded-[2rem]"
                          style={{ borderColor: `${theme.accent}30` }}
                        >
                          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:gap-4 sm:p-5">
                            <div className="relative h-40 w-full overflow-hidden rounded-[1.2rem] sm:h-auto sm:w-56 sm:min-w-56 sm:rounded-[1.5rem]">
                              {page.cover_photo_url ? (
                                <img
                                  src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                                  alt={`${page.recipient_name}'s cover`}
                                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                                  loading="lazy"
                                />
                              ) : theme.isCustom ? (
                                <div
                                  className="h-full w-full"
                                  style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                                />
                              ) : (
                                <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent" />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-lg font-bold text-foreground sm:text-xl">{page.recipient_name}&apos;s Birthday</h3>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                      {theme.emoji} {theme.name}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground transition-colors hover:bg-background"
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

                              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">
                                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>Birthday</span>
                                  </div>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{birthdayLabel}</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>Wishes</span>
                                  </div>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{page.message_count || 0} collected</p>
                                </div>
                              </div>

                              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-3 sm:gap-3">
                                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                  <p className="text-xs font-semibold text-muted-foreground">Collection closed</p>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{collectionCloses}</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                  <p className="text-xs font-semibold text-muted-foreground">Status</p>
                                  <p className="mt-2 text-sm font-semibold text-foreground">Revealed</p>
                                </div>
                              </div>

                              <div className="mt-4 flex gap-2 sm:mt-5">
                                <Link to={`/preview/${page.public_code}`} className="flex-1">
                                  <Button variant="outline" size="sm" className="w-full gap-2">
                                    <Eye className="h-4 w-4" />
                                    Preview
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-card/80 px-5 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No archived pages yet.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {savedPages.length > 0 && (
          <section className="mt-10 pt-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Saved for later</p>
                <h2 className="mt-2 text-xl font-bold text-foreground">Pages you&apos;re keeping</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-5">
              {savedPages.map((page) => {
                const theme = getThemeDisplay(page.theme);
                const status = getStatusBadge(page);
                const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');

                return (
                  <article
                    key={page.id}
                    className="group overflow-hidden rounded-[1.5rem] border-2 border-[#fcece5] bg-card/94 shadow-[0_10px_0_0_#fcece5] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_0_0_#fcece5] sm:rounded-[2rem]"
                    style={{ borderColor: `${theme.accent}30` }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      {page.cover_photo_url ? (
                        <>
                          <img
                            src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                            alt={`${page.recipient_name}'s cover`}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        </>
                      ) : theme.isCustom ? (
                        <div
                          className="h-full w-full"
                          style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
                      )}
                      <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Saved celebration</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {page.recipient_name}&apos;s birthday
                          </p>
                          <p className="text-xs text-white/80">Birthday on {birthdayLabel}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{page.message_count || 0} wishes</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => setSavedPagePendingRemove(page)}
                        >
                          Remove
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => copyLink(page.public_code, 'birthday')}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <footer className="py-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground/70">Magical moments await</p>
        </footer>
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

      <AlertDialog open={Boolean(savedPagePendingRemove)} onOpenChange={(open) => { if (!open) setSavedPagePendingRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will only remove the page from your saved list. The birthday page itself will stay active for its organizer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <span>You&apos;ll still be able to visit this celebration later if you receive the link again.</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSavedPagePendingRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!savedPagePendingRemove) return;
                try {
                  await apiFetch<void>(`/pages/${savedPagePendingRemove.id}/save`, { method: 'DELETE' });
                  setSavedPages((current) => current.filter((p) => p.id !== savedPagePendingRemove.id));
                  toast.success('Removed from your dashboard');
                } catch (error) {
                  console.error(error);
                  toast.error('Unable to remove saved page');
                } finally {
                  setSavedPagePendingRemove(null);
                }
              }}
            >
              Remove saved page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
