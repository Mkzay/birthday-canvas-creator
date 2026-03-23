import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Crown,
  Download,
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
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApiError, apiFetch, getApiOrigin, resolveAssetUrl } from '@/lib/api';
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
  view_count?: number;
}

interface PageAnalytics {
  view_count: number;
  message_count: number;
  contributor_count: number;
  photo_message_count: number;
  audio_message_count: number;
  last_contribution_at: string | null;
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
  stats?: {
    total_users: number;
    total_pages: number;
    total_visitors: number;
  };
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
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null);
  const [analyticsByPage, setAnalyticsByPage] = useState<Record<string, PageAnalytics>>({});
  const [analyticsLoadingPage, setAnalyticsLoadingPage] = useState<string | null>(null);
  const [exportingPage, setExportingPage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<'all' | 'live' | 'archived'>('all');
  const isProUser = user?.planTier === 'pro';
  const canShowExportOptions = !import.meta.env.PROD;

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
    if (!user?.isAdmin) {
      setSystemStatus(null);
      setSystemStatusError(null);
      return;
    }

    try {
      const data = await apiFetch<SystemStatusPayload>('/system/status');
      setSystemStatus(data);
      setSystemStatusError(null);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setSystemStatus(null);
        setSystemStatusError('Admin permission is required to view system status.');
        return;
      }
      console.error(error);
      setSystemStatus(null);
      setSystemStatusError('Unable to load system status right now. Please try again in a moment.');
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
    const showLive = pageFilter === 'all' || pageFilter === 'live';
    if (!showLive) return [];

    return pages.filter((page) => {
      const name = page.recipient_name || '';
      const matchesSearch = name.toLowerCase().includes(query);
      return matchesSearch && !isArchivedPage(page);
    });
  }, [pageFilter, pages, searchQuery]);

  const filteredArchivedPages = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    const showArchived = pageFilter === 'all' || pageFilter === 'archived';
    if (!showArchived) return [];

    return pages.filter((page) => {
      const name = page.recipient_name || '';
      const matchesSearch = name.toLowerCase().includes(query);
      return matchesSearch && isArchivedPage(page);
    });
  }, [pageFilter, pages, searchQuery]);

  const filteredSavedPages = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();

    return savedPages.filter((page) => {
      const name = page.recipient_name || '';
      const matchesSearch = name.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (pageFilter === 'all') return true;
      const archived = isArchivedPage(page);
      return pageFilter === 'archived' ? archived : !archived;
    });
  }, [pageFilter, savedPages, searchQuery]);

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

  const handleAnalytics = async (pageCode: string) => {
    if (!isProUser) {
      toast.info('Creator analytics is available on Pro.');
      navigate('/upgrade');
      return;
    }

    setAnalyticsLoadingPage(pageCode);
    try {
      const data = await apiFetch<PageAnalytics>(`/pages/${pageCode}/analytics`);
      setAnalyticsByPage((current) => ({ ...current, [pageCode]: data }));
      toast.success('Analytics updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoadingPage(null);
    }
  };

  const handleExport = async (pageCode: string, recipientName: string) => {
    if (!isProUser) {
      toast.info('Page export is available on Pro.');
      navigate('/upgrade');
      return;
    }

    setExportingPage(pageCode);
    try {
      const response = await fetch(`${getApiOrigin()}/api/pages/${pageCode}/export`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new ApiError(payload.error || 'Export failed', response.status, payload.code);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug = recipientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'birthday-page';
      anchor.href = url;
      anchor.download = `${slug}-wishcanvas-keepsake.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('PDF export downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export page');
    } finally {
      setExportingPage(null);
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
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,246,241,0.98))] p-6 shadow-card-lg sm:p-8">
            <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-secondary/14 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Birthday studio
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Welcome to your WishCanvas dashboard. Create new birthday pages, collect heartfelt wishes from friends and family, and reveal them all in a beautiful birthday story.
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

          <div className="flex flex-col gap-4">
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
                className={`flex items-center gap-4 rounded-[1.35rem] border border-border/60 bg-gradient-to-br ${item.panelClassName} px-5 py-4 shadow-card`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground">
                    {item.value} <span className="font-semibold">{item.label}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </article>
            ))}

            {user?.isAdmin && (
              <div className="rounded-[1.35rem] border border-border/60 bg-card/80 px-5 py-4 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">System</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {systemStatus
                        ? (systemStatus.ok ? 'All systems operational' : 'Degraded')
                        : 'Status unavailable'}
                    </p>
                    {systemStatus ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        DB {systemStatus.checks.db.ok ? 'OK' : 'FAIL'} • Uploads {systemStatus.checks.uploads.ok ? 'OK' : 'FAIL'}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {systemStatusError || 'System status has not been loaded yet.'}
                      </p>
                    )}
                  </div>
                  <div className={systemStatus?.ok ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700' : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'}>
                    {systemStatus?.ok ? <Activity className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                </div>
              </div>
            )}

            {user?.isAdmin && (
              <div className="rounded-[1.35rem] border border-border/60 bg-card/80 px-5 py-4 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Platform totals</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">Audience and content overview</p>
                    <p className="mt-2 text-xs text-muted-foreground">Live aggregate counts across all active pages.</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Users</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{systemStatus?.stats?.total_users ?? '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Visitors</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{systemStatus?.stats?.total_visitors ?? '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pages</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{systemStatus?.stats?.total_pages ?? '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your pages</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Birthday pages in progress</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 sm:w-72"
                />
              </div>

              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  aria-label="Filter pages by status"
                  value={pageFilter}
                  onChange={(event) => setPageFilter(event.target.value as 'all' | 'live' | 'archived')}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-48"
                >
                  <option value="all">All pages</option>
                  <option value="live">Live only</option>
                  <option value="archived">Archived only</option>
                </select>
              </div>
            </div>
          </div>

          {!isProUser && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(255,255,255,0.96),rgba(255,247,239,0.96),rgba(255,236,228,0.94))] px-4 py-3 shadow-card">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Unlock creator analytics and keepsake PDF export</p>
                <p className="text-xs text-muted-foreground">Track page views, contributor growth, and download branded birthday keepsakes.</p>
              </div>
              <Link to="/upgrade" className="shrink-0">
                <Button variant="hero" size="sm" className="gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade
                </Button>
              </Link>
            </div>
          )}

          {pages.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-card/80 px-6 py-14 text-center shadow-card">
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
          ) : filteredLivePages.length === 0 && filteredArchivedPages.length === 0 && filteredSavedPages.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-card/80 px-6 py-14 text-center shadow-card">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-3xl">🔍</div>
              <h3 className="mt-5 text-xl font-bold text-foreground">No matching pages</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                We couldn&apos;t find any pages matching your search and filter criteria.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(''); setPageFilter('all'); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <>
            {filteredLivePages.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live</h3>
                  <span className="text-xs text-muted-foreground">{filteredLivePages.length} active</span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 mb-6">
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
                        className="group overflow-hidden rounded-[2rem] border border-border/60 bg-card/94 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                        style={{ borderColor: `${theme.accent}30` }}
                      >
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
                          <div className="relative h-[42dvh] min-h-[14rem] max-h-[24rem] w-full overflow-hidden rounded-[1.5rem] sm:h-auto sm:w-56 sm:min-w-56">
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
                                <h3 className="truncate text-xl font-bold text-foreground">{page.recipient_name}&apos;s Birthday</h3>
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

                            <div className="mt-4 grid grid-cols-2 gap-3">
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

                            <div className="mt-3 grid grid-cols-2 gap-3">
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

                            <div className="mt-5 flex gap-2">
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

                            <div className={canShowExportOptions ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3'}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => void handleAnalytics(page.public_code)}
                                disabled={analyticsLoadingPage === page.public_code}
                              >
                                <Activity className="h-4 w-4" />
                                {analyticsLoadingPage === page.public_code ? 'Loading...' : 'Analytics'}
                              </Button>
                              {canShowExportOptions && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => void handleExport(page.public_code, page.recipient_name)}
                                  disabled={exportingPage === page.public_code}
                                >
                                  <Download className="h-4 w-4" />
                                  {exportingPage === page.public_code ? 'Exporting...' : 'Export PDF'}
                                </Button>
                              )}
                            </div>

                            {analyticsByPage[page.public_code] && (
                              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Views</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">{analyticsByPage[page.public_code].view_count}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contributors</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">{analyticsByPage[page.public_code].contributor_count}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {filteredArchivedPages.length > 0 && (
              <>
                <div className="mt-4 mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Archived & Past</h3>
                  <span className="text-xs text-muted-foreground">{filteredArchivedPages.length} completed</span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 mb-6">
              {filteredArchivedPages.map((page) => {
                const theme = getThemeDisplay(page.theme);
                const status = { label: 'Revealed', className: 'bg-slate-900/8 text-slate-700' };
                const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');
                const closeDate = page.close_date ? parseLocalDate(page.close_date) : parseLocalDate(page.birthday_date);
                const closesLabel = format(closeDate, 'MMM d, yyyy');
                const daysLeft = differenceInDays(closeDate, new Date());

                return (
                  <article
                    key={page.id}
                    className="group overflow-hidden rounded-[2rem] border border-border/60 bg-card/94 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                    style={{ borderColor: `${theme.accent}30` }}
                  >
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
                      {page.cover_photo_url ? (
                        <div className="relative h-[42dvh] min-h-[14rem] max-h-[24rem] w-full overflow-hidden rounded-[1.5rem] sm:h-auto sm:w-56 sm:min-w-56">
                          <img
                            src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                            alt={`${page.recipient_name}'s cover`}
                            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent" />
                        </div>
                      ) : theme.isCustom ? (
                        <div className="relative h-[42dvh] min-h-[14rem] max-h-[24rem] w-full overflow-hidden rounded-[1.5rem] sm:h-auto sm:w-56 sm:min-w-56">
                          <div
                            className="h-full w-full"
                            style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-transparent" />
                        </div>
                      ) : (
                        <div className="relative h-[42dvh] min-h-[14rem] max-h-[24rem] w-full overflow-hidden rounded-[1.5rem] sm:h-auto sm:w-56 sm:min-w-56">
                          <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-transparent" />
                        </div>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-bold text-foreground">{page.recipient_name}&apos;s Birthday</h3>
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

                        <div className="mt-4 grid grid-cols-2 gap-3">
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

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                            <p className="text-xs font-semibold text-muted-foreground">Collection closed</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{closesLabel}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                            <p className="text-xs font-semibold text-muted-foreground">Countdown</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Closed'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                          <Link to={`/birthday/${page.public_code}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                        </div>

                        <div className={canShowExportOptions ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3'}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => void handleAnalytics(page.public_code)}
                            disabled={analyticsLoadingPage === page.public_code}
                          >
                            <Activity className="h-4 w-4" />
                            {analyticsLoadingPage === page.public_code ? 'Loading...' : 'Analytics'}
                          </Button>
                          {canShowExportOptions && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => void handleExport(page.public_code, page.recipient_name)}
                              disabled={exportingPage === page.public_code}
                            >
                              <Download className="h-4 w-4" />
                              {exportingPage === page.public_code ? 'Exporting...' : 'Export PDF'}
                            </Button>
                          )}
                        </div>

                        {analyticsByPage[page.public_code] && (
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Views</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{analyticsByPage[page.public_code].view_count}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contributors</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{analyticsByPage[page.public_code].contributor_count}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
                </div>
              </>
            )}
            </>
          )}
        </section>

        {filteredSavedPages.length > 0 && (
          <section className="mt-10 border-t border-border/60 pt-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Saved for later</p>
                <h2 className="mt-2 text-xl font-bold text-foreground">Pages you&apos;re keeping</h2>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSavedPages.map((page) => {
                const theme = getThemeDisplay(page.theme);
                const status = getStatusBadge(page);
                const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');

                return (
                  <article
                    key={page.id}
                    className="group overflow-hidden rounded-[2rem] border border-border/60 bg-card/94 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                    style={{ borderColor: `${theme.accent}30` }}
                  >
                    <div className="relative h-44 overflow-hidden sm:h-48">
                      {page.cover_photo_url ? (
                        <>
                          <img
                            src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                            alt={`${page.recipient_name}'s cover`}
                            className="absolute inset-0 h-full w-full scale-110 object-cover object-center blur-xl transition-transform duration-500 group-hover:scale-[1.12]"
                            aria-hidden="true"
                            loading="lazy"
                          />
                          <img
                            src={resolveAssetUrl(page.cover_photo_url) || page.cover_photo_url}
                            alt={`${page.recipient_name}'s cover`}
                            className="absolute inset-0 h-full w-full object-contain object-center p-2 transition-transform duration-500 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
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
                          onClick={() => navigate(`/birthday/${page.public_code}`)}
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
