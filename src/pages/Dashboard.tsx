import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Users } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';
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
import type { BirthdayPage, CustomTheme, PageAnalytics, ThemeDisplay } from '@/pages/dashboardPage';
import {
  DashboardHero,
  DashboardPagesToolbar,
  DashboardStatTiles,
  getDashboardStatusBadge,
  OwnedPageCard,
  themeAccentMap,
} from '@/pages/dashboardPage';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [savedPages, setSavedPages] = useState<BirthdayPage[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagePendingDelete, setPagePendingDelete] = useState<BirthdayPage | null>(null);
  const [savedPagePendingRemove, setSavedPagePendingRemove] = useState<BirthdayPage | null>(null);
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

  useEffect(() => {
    if (user) {
      void Promise.all([fetchPages(), fetchSavedPages(), fetchCustomThemes()]);
    }
  }, [fetchCustomThemes, fetchPages, fetchSavedPages, user]);

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
      navigate('/billing');
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
      navigate('/billing');
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
          <DashboardHero displayName={displayName} />
          <DashboardStatTiles stats={stats} />
        </section>

        <section className="mt-8">
          <DashboardPagesToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            pageFilter={pageFilter}
            onPageFilterChange={setPageFilter}
            isProUser={isProUser}
          />

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
                    const status = getDashboardStatusBadge(page);
                    return (
                      <OwnedPageCard
                        key={page.id}
                        page={page}
                        theme={theme}
                        variant="live"
                        status={status}
                        canShowExportOptions={canShowExportOptions}
                        analytics={analyticsByPage[page.public_code]}
                        analyticsLoading={analyticsLoadingPage === page.public_code}
                        exporting={exportingPage === page.public_code}
                        onCopyContribute={() => void copyLink(page.public_code, 'contribute')}
                        onCopyBirthday={() => void copyLink(page.public_code, 'birthday')}
                        onRequestDelete={() => setPagePendingDelete(page)}
                        onAnalytics={() => handleAnalytics(page.public_code)}
                        onExport={() => handleExport(page.public_code, page.recipient_name)}
                      />
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
                    return (
                      <OwnedPageCard
                        key={page.id}
                        page={page}
                        theme={theme}
                        variant="archived"
                        status={status}
                        canShowExportOptions={canShowExportOptions}
                        analytics={analyticsByPage[page.public_code]}
                        analyticsLoading={analyticsLoadingPage === page.public_code}
                        exporting={exportingPage === page.public_code}
                        onCopyContribute={() => void copyLink(page.public_code, 'contribute')}
                        onCopyBirthday={() => void copyLink(page.public_code, 'birthday')}
                        onRequestDelete={() => setPagePendingDelete(page)}
                        onAnalytics={() => handleAnalytics(page.public_code)}
                        onExport={() => handleExport(page.public_code, page.recipient_name)}
                      />
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
                const status = getDashboardStatusBadge(page);
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
