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
  DashboardStudioHeader,
  DashboardSpotlightStage,
  DashboardPagesToolbar,
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

  const spotlightPage = useMemo(() => {
    if (searchQuery.trim() || pageFilter !== 'all') return null;
    const live = pages.filter((p) => !isArchivedPage(p));
    if (live.length > 0) return live[0];
    if (pages.length > 0) return pages[0];
    return null;
  }, [pageFilter, pages, searchQuery]);

  const galleryLivePages = useMemo(() => {
    if (spotlightPage) {
      return filteredLivePages.filter((p) => p.id !== spotlightPage.id);
    }
    return filteredLivePages;
  }, [filteredLivePages, spotlightPage]);

  const galleryArchivedPages = useMemo(() => {
    if (spotlightPage && isArchivedPage(spotlightPage)) {
      return filteredArchivedPages.filter((p) => p.id !== spotlightPage.id);
    }
    return filteredArchivedPages;
  }, [filteredArchivedPages, spotlightPage]);

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
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-rose-200/20 blur-3xl" />
      <AnimatedBackground showStars={false} showWaves={true} className="opacity-25" />
      <Header showDashboardLabel />

      <main className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 space-y-10">
        {/* 1. Integrated Studio Header with Inline Ledger */}
        <DashboardStudioHeader displayName={displayName} stats={stats} />

        {/* 2. Spotlight Stage (Primary upcoming celebration) */}
        {spotlightPage && (
          <DashboardSpotlightStage
            page={spotlightPage}
            theme={getThemeDisplay(spotlightPage.theme)}
            isLive={!isArchivedPage(spotlightPage)}
            canShowExportOptions={canShowExportOptions}
            analytics={analyticsByPage[spotlightPage.public_code]}
            analyticsLoading={analyticsLoadingPage === spotlightPage.public_code}
            exporting={exportingPage === spotlightPage.public_code}
            onCopyContribute={() => void copyLink(spotlightPage.public_code, 'contribute')}
            onCopyBirthday={() => void copyLink(spotlightPage.public_code, 'birthday')}
            onRequestDelete={() => setPagePendingDelete(spotlightPage)}
            onAnalytics={() => handleAnalytics(spotlightPage.public_code)}
            onExport={() => handleExport(spotlightPage.public_code, spotlightPage.recipient_name)}
          />
        )}

        {/* 3. Exhibition Gallery & Archive */}
        <section className="space-y-6">
          <DashboardPagesToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            pageFilter={pageFilter}
            onPageFilterChange={setPageFilter}
            isProUser={isProUser}
          />

          {pages.length === 0 ? (
            <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-10 sm:p-16 text-center shadow-card">
              <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-2xl" />
              <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-rose-500/10 blur-2xl" />
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-200/80 bg-amber-50/80 text-4xl shadow-sm">
                🎂
              </div>
              <h3 className="relative mt-6 font-serif text-2xl sm:text-3xl font-medium tracking-tight text-slate-950">
                No birthday pages yet
              </h3>
              <p className="relative mx-auto mt-3 max-w-md text-sm sm:text-base leading-relaxed text-stone-600">
                Start by creating a keepsake canvas for someone special. Choose a mood, gather wishes from friends and family, and reveal it on their day.
              </p>
              <div className="relative mt-8 inline-flex">
                <Link to="/create">
                  <Button
                    size="lg"
                    className="btn-press rounded-2xl bg-slate-950 px-8 py-6 text-sm sm:text-base font-medium text-white shadow-card transition-all hover:bg-slate-900 active:scale-[0.98]"
                  >
                    Create your first canvas
                  </Button>
                </Link>
              </div>
            </div>
          ) : galleryLivePages.length === 0 && galleryArchivedPages.length === 0 && filteredSavedPages.length === 0 && !spotlightPage ? (
            <div className="rounded-[2.5rem] border border-dashed border-stone-300/80 bg-white/70 p-10 sm:p-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-2xl text-stone-500">
                🔍
              </div>
              <h3 className="mt-5 font-serif text-xl sm:text-2xl font-medium text-slate-950">No matching pages</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                We could not find any celebration canvases matching your search or filter criteria.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-xl border-stone-200 bg-white font-medium text-stone-800 hover:bg-stone-50 active:scale-[0.98]"
                onClick={() => {
                  setSearchQuery('');
                  setPageFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {galleryLivePages.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-950">
                        {spotlightPage ? 'Other Live Canvases' : 'Live Canvases'}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {galleryLivePages.length} collecting
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {galleryLivePages.map((page) => {
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
                </div>
              )}

              {galleryArchivedPages.length > 0 && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-950">Keepsake Archive</h2>
                      <span className="inline-flex items-center rounded-full border border-stone-200/80 bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                        {galleryArchivedPages.length} archived
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {galleryArchivedPages.map((page) => {
                      const theme = getThemeDisplay(page.theme);
                      const status = { label: 'Revealed', className: 'bg-stone-100 text-stone-700' };
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
                </div>
              )}
            </>
          )}
        </section>

        {filteredSavedPages.length > 0 && (
          <section className="mt-14 border-t border-stone-200/80 pt-10">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/80">Saved Collection</span>
                <h2 className="mt-1 font-serif text-2xl font-medium text-slate-950">Pages you&apos;re keeping</h2>
              </div>
              <span className="inline-flex items-center rounded-full border border-stone-200/80 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                {filteredSavedPages.length} saved
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSavedPages.map((page) => {
                const theme = getThemeDisplay(page.theme);
                const status = getDashboardStatusBadge(page);
                const birthdayLabel = format(parseLocalDate(page.birthday_date), 'MMM d, yyyy');

                return (
                  <article
                    key={page.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <div className="relative h-48 overflow-hidden rounded-[1.4rem] border border-stone-200/70 bg-stone-100/80">
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
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </>
                      ) : theme.isCustom ? (
                        <div
                          className="h-full w-full"
                          style={{ background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${theme.primary}`} />
                      )}
                      <div className="absolute inset-0 flex items-end justify-between p-4">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Saved celebration</span>
                          <p className="mt-0.5 font-serif text-base font-medium text-white">
                            {page.recipient_name}&apos;s birthday
                          </p>
                          <p className="text-xs text-white/80">{birthdayLabel}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-1 pt-3.5 pb-1">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Users className="h-3.5 w-3.5 text-amber-700" />
                        <span className="font-medium text-stone-700">{page.message_count || 0} wishes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                          onClick={() => setSavedPagePendingRemove(page)}
                        >
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-medium px-3.5 active:scale-[0.98]"
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
