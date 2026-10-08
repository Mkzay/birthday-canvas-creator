import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  Crown,
  Palette,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  BrandMenuIcon,
} from '@/components/BrandIcons';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { ApiError, apiFetch, getApiOrigin } from '@/lib/api';
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
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ExportKeepsakeModal } from '@/components/ExportKeepsakeModal';
import type { BirthdayPage, CustomTheme, PageAnalytics, ThemeDisplay } from '@/pages/dashboardPage';
import {
  DashboardCalendarTimeline,
  DashboardCelebrationDrawer,
  DashboardKanbanPipeline,
  DashboardSidebar,
  themeAccentMap,
} from '@/pages/dashboardPage';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isPro, loading: authLoading, signOut } = useAuth();
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [savedPages, setSavedPages] = useState<BirthdayPage[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawer State
  const [pagePendingDelete, setPagePendingDelete] = useState<BirthdayPage | null>(null);
  const [savedPagePendingRemove, setSavedPagePendingRemove] = useState<BirthdayPage | null>(null);
  const [analyticsByPage, setAnalyticsByPage] = useState<Record<string, PageAnalytics>>({});
  const [analyticsLoadingPage, setAnalyticsLoadingPage] = useState<string | null>(null);
  const [exportingPage, setExportingPage] = useState<string | null>(null);
  const [exportModalPage, setExportModalPage] = useState<BirthdayPage | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // New Hybrid App Shell State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerPage, setDrawerPage] = useState<BirthdayPage | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wishcanvas_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wishcanvas_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isProUser = isPro;
  const canShowExportOptions = true;

  const handleOpenExportModal = (page: BirthdayPage) => {
    setExportModalPage(page);
    setIsExportModalOpen(true);
  };

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
      toast.error('Failed to load celebration pages');
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

  const stats = useMemo(() => {
    const totalPages = pages.length;
    const deliveredPages = pages.filter((page) => {
      if (page.status === 'draft') return false;
      if (page.status === 'delivered') return true;
      const bday = parseLocalDate(page.birthday_date);
      return differenceInDays(new Date(), bday) > 3;
    }).length;
    const activePages = pages.filter((page) => {
      if (page.status === 'draft') return false;
      if (page.status === 'delivered') return false;
      const bday = parseLocalDate(page.birthday_date);
      return differenceInDays(new Date(), bday) <= 3;
    }).length;
    const totalMessages = pages.reduce((accumulator, page) => accumulator + (page.message_count || 0), 0);

    return {
      totalPages,
      activePages,
      deliveredPages,
      totalMessages,
    };
  }, [pages]);

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

  const handleDelete = async (page: BirthdayPage) => {
    try {
      if (page.user_role === 'co_organizer' && user?.id) {
        await apiFetch<void>(`/pages/${page.public_code}/collaborators/${user.id}`, {
          method: 'DELETE',
        });
        setPages((currentPages) => currentPages.filter((p) => p.id !== page.id));
        if (drawerPage?.id === page.id) {
          setIsDrawerOpen(false);
          setDrawerPage(null);
        }
        toast.success(`Removed yourself from "${page.recipient_name}'s" celebration`);
        return;
      }

      await apiFetch<void>(`/pages/${page.id}`, {
        method: 'DELETE',
      });
      setPages((currentPages) => currentPages.filter((p) => p.id !== page.id));
      if (drawerPage?.id === page.id) {
        setIsDrawerOpen(false);
        setDrawerPage(null);
      }
      toast.success(`"${page.recipient_name}'s" celebration canvas deleted`);
    } catch (error) {
      console.error(error);
      toast.error(page.user_role === 'co_organizer' ? 'Failed to leave celebration' : 'Failed to delete page');
    }
  };

  const copyLink = async (pageCode: string, type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const link = type === 'contribute' ? `${baseUrl}/contribute/${pageCode}` : `${baseUrl}/birthday/${pageCode}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success(type === 'contribute' ? 'Contribution invite copied' : 'Birthday celebration link copied');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  const handleShareWhatsApp = (page: BirthdayPage) => {
    const url = `${window.location.origin}/contribute/${page.public_code}`;
    const text = `Hi! Leave a birthday wish, voice note, or memory for ${page.recipient_name} here: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenDrawer = (page: BirthdayPage) => {
    setDrawerPage(page);
    setIsDrawerOpen(true);
    if (isProUser && !analyticsByPage[page.public_code]) {
      void handleAnalytics(page.public_code);
    }
  };

  const handleAnalytics = async (pageCode: string) => {
    if (!isProUser) {
      toast.info('Creator participation analytics is available on Pro.');
      navigate('/upgrade?feature=creator-analytics');
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
      toast.success('PDF keepsake downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export page');
    } finally {
      setExportingPage(null);
    }
  };

  // Filtered by Search Query
  const searchedPages = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) return pages;

    return pages.filter((page) => {
      const name = page.recipient_name || '';
      return name.toLowerCase().includes(query);
    });
  }, [pages, searchQuery]);

  if (authLoading || loading) {
    return <WishCanvasLoader />;
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';

  return (
    <div className="relative h-[100dvh] min-h-[100dvh] bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 flex overflow-hidden">
      {/* Background Celebratory Glows with richer saturated warmth */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-amber-400/30 via-rose-300/25 to-amber-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[540px] w-[540px] rounded-full bg-gradient-to-bl from-rose-400/25 via-pink-300/20 to-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[380px] w-[380px] rounded-full bg-amber-200/35 blur-3xl" />

      {/* 1. PERSISTENT STUDIO APP SHELL SIDEBAR (Desktop) */}
      <DashboardSidebar
        user={user}
        profile={profile}
        activePagesCount={stats.activePages}
        deliveredPagesCount={stats.deliveredPages}
        totalPagesCount={stats.totalPages}
        isProUser={isProUser}
        onSignOut={signOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* MOBILE SIDEBAR DRAWER (When on phone / tablet) */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" hideDefaultClose className="p-0 w-80 bg-[#FAF7F2] text-slate-900 border-r border-stone-300">
          <DashboardSidebar
            isMobileDrawer
            user={user}
            profile={profile}
            activePagesCount={stats.activePages}
            deliveredPagesCount={stats.deliveredPages}
            totalPagesCount={stats.totalPages}
            isProUser={isProUser}
            onSignOut={() => {
              setIsMobileSidebarOpen(false);
              signOut();
            }}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 2. MAIN STUDIO WORKBENCH (Fluid flex container) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        
        {/* Top Command Bar (Search moved to main area, sidebar toggle added) */}
        <header className="bg-white/95 backdrop-blur-md border-b border-stone-300 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Custom On-Brand Menu Button on Mobile/Tablet */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 transition-colors shadow-xs active:scale-95"
              aria-label="Open sidebar menu"
              title="Open menu"
            >
              <BrandMenuIcon className="h-4 w-4 text-stone-800" />
            </button>

            {/* Studio Context Title */}
            <div className="flex items-center gap-2 pl-1">
              <span className="font-serif font-bold text-slate-950 text-sm sm:text-base tracking-tight">
                Celebration Atelier
              </span>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-stone-400" />
              <span className="hidden sm:inline-block text-[11px] text-stone-700 font-semibold">
                {stats.totalPages} {stats.totalPages === 1 ? 'Milestone' : 'Milestones'} Total
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="hidden sm:flex items-center gap-4 border-r border-stone-300 pr-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  Live
                </span>
                <p className="font-serif font-bold text-emerald-700 text-sm">
                  {stats.activePages} Collecting
                </p>
              </div>
              <div className="w-px h-6 bg-stone-300" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  Wishes
                </span>
                <p className="font-serif font-bold text-slate-950 text-sm">
                  {stats.totalMessages} Pinned
                </p>
              </div>
            </div>

            <Link to="/settings" className="flex items-center gap-2" title="Account settings">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover border border-stone-300"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Main Workbench Body */}
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-7 max-w-7xl w-full mx-auto">
          
          {/* Creator Greeting & Context Bar (Fulfilling user request for welcome back username) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Welcome back, <span className="italic text-rose-500">{displayName}</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-900 font-semibold">creator atelier</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-700 max-w-xl leading-relaxed font-medium">
                Track upcoming birthday milestones on the calendar, gather heartfelt memories, and orchestrate slide reveals.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/themes">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-2xl border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 shadow-xs"
                >
                  <Palette className="h-3.5 w-3.5 text-amber-600" />
                  Custom Themes
                </Button>
              </Link>
              <Link to="/create">
                <Button
                  size="sm"
                  className="btn-press gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="h-4 w-4 text-amber-100" />
                  Craft Canvas
                </Button>
              </Link>
            </div>
          </div>

          {pages.length === 0 ? (
            /* Empty State */
            <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-300 bg-white p-8 sm:p-14 text-center shadow-card">
              <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-amber-500/15 blur-2xl" />
              <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-rose-500/15 blur-2xl" />
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300 bg-amber-50 text-4xl shadow-sm">
                🎂
              </div>
              <h3 className="relative mt-6 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                No birthday canvases yet
              </h3>
              <p className="relative mx-auto mt-2 max-w-md text-sm text-stone-700 leading-relaxed font-medium">
                Start by creating a keepsake canvas for someone special. Pick a soundtrack, collect wishes from friends and family, and reveal it on their day.
              </p>
              <div className="relative mt-7 inline-flex">
                <Link to="/create">
                  <Button
                    size="lg"
                    className="btn-press rounded-2xl bg-slate-950 px-8 py-5 text-sm font-bold text-white shadow-card hover:bg-slate-900 active:scale-[0.98]"
                  >
                    Craft your first canvas
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* HYBRID DECK 1: THE INTERACTIVE CALENDAR MILESTONE TIMELINE */}
              <DashboardCalendarTimeline
                pages={searchedPages}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelectPage={handleOpenDrawer}
              />

              {/* STUDIO SEARCH & FILTER BAR (Directly above the celebration cards) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-stone-300 rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                  <Input
                    placeholder="Search celebrations, recipients, or milestones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-xl border border-stone-300 bg-stone-50/80 pl-10 pr-8 text-xs font-medium text-slate-950 placeholder:text-stone-500 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors text-xs font-bold"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <span className="font-bold text-slate-900">
                    {searchedPages.length} {searchedPages.length === 1 ? 'Celebration' : 'Celebrations'}
                  </span>
                  {searchQuery && (
                    <span className="text-[11px] bg-amber-100 text-amber-950 border border-amber-300 rounded-full px-2.5 py-0.5 font-bold">
                      filtered
                    </span>
                  )}
                </div>
              </div>

              {/* HYBRID DECK 2: THE LIFECYCLE KANBAN PIPELINE (CARDS) */}
              <DashboardKanbanPipeline
                pages={searchedPages}
                selectedDate={selectedDate}
                getThemeDisplay={getThemeDisplay}
                onSelectPage={handleOpenDrawer}
                onCopyContribute={(page) => void copyLink(page.public_code, 'contribute')}
                onShareWhatsApp={handleShareWhatsApp}
                onRequestDelete={(page) => setPagePendingDelete(page)}
                onExport={handleOpenExportModal}
                canShowExportOptions={canShowExportOptions}
              />
            </>
          )}

          {/* SAVED CELEBRATIONS SECTION (IF ANY) */}
          {savedPages.length > 0 && (
            <section className="pt-8 border-t border-stone-300 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900">
                    Saved Keepsakes
                  </span>
                  <h3 className="font-serif text-xl font-bold text-slate-950">
                    Celebrations you&apos;re keeping
                  </h3>
                </div>
                <span className="rounded-full bg-stone-100 border border-stone-300 px-2.5 py-0.5 text-xs font-bold text-stone-800">
                  {savedPages.length} Saved
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedPages.map((page) => {
                  const bday = parseLocalDate(page.birthday_date);
                  return (
                    <div
                      key={page.id}
                      className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-600 font-bold uppercase">
                          {format(bday, 'MMM d, yyyy')}
                        </span>
                        <h4 className="font-serif font-bold text-slate-950 truncate">
                          {page.recipient_name}&apos;s Canvas
                        </h4>
                        <p className="text-xs text-stone-600 font-medium">
                          {page.message_count || 0} wishes collected
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-stone-600 hover:text-rose-600"
                          onClick={() => setSavedPagePendingRemove(page)}
                        >
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-slate-950 text-white text-xs font-bold px-3 shadow-xs hover:bg-slate-900"
                          onClick={() => navigate(`/birthday/${page.public_code}`)}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </main>
      </div>

      {/* 3. CELEBRATION INSPECTOR DRAWER (Overlay Sheet: Does NOT push or reflow layout!) */}
      <DashboardCelebrationDrawer
        page={drawerPage}
        theme={drawerPage ? getThemeDisplay(drawerPage.theme) : null}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onCopyContribute={(page) => void copyLink(page.public_code, 'contribute')}
        onShareWhatsApp={handleShareWhatsApp}
        onCopyBirthday={(page) => void copyLink(page.public_code, 'birthday')}
        onRequestDelete={(page) => {
          setIsDrawerOpen(false);
          setPagePendingDelete(page);
        }}
        onAnalytics={(page) => handleAnalytics(page.public_code)}
        onExport={handleOpenExportModal}
        canShowExportOptions={canShowExportOptions}
        analytics={drawerPage ? analyticsByPage[drawerPage.public_code] : undefined}
        analyticsLoading={drawerPage ? analyticsLoadingPage === drawerPage.public_code : false}
        exporting={false}
        isProUser={isProUser}
      />

      <ExportKeepsakeModal
        page={exportModalPage}
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        isProUser={Boolean(isProUser)}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog
        open={Boolean(pagePendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPagePendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pagePendingDelete?.user_role === 'co_organizer'
                ? 'Leave this celebration?'
                : 'Delete this celebration canvas?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pagePendingDelete?.user_role === 'co_organizer'
                ? 'You will be removed as a co-organizer and this canvas will no longer appear in your atelier.'
                : 'This permanently removes the canvas, all contributed audio recordings, photos, and messages.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              {pagePendingDelete?.user_role === 'co_organizer'
                ? `You will surrender co-organizer editing access to ${pagePendingDelete?.recipient_name}'s canvas.`
                : `${pagePendingDelete?.recipient_name}'s canvas will be deleted permanently.`}
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPagePendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pagePendingDelete) {
                  void handleDelete(pagePendingDelete);
                }
                setPagePendingDelete(null);
              }}
            >
              {pagePendingDelete?.user_role === 'co_organizer' ? 'Leave celebration' : 'Delete canvas'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REMOVE SAVED PAGE DIALOG */}
      <AlertDialog
        open={Boolean(savedPagePendingRemove)}
        onOpenChange={(open) => {
          if (!open) setSavedPagePendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved celebration?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the celebration from your dashboard. The canvas remains active for its organizer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSavedPagePendingRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!savedPagePendingRemove) return;
                try {
                  await apiFetch<void>(`/pages/${savedPagePendingRemove.id}/save`, { method: 'DELETE' });
                  setSavedPages((current) => current.filter((p) => p.id !== savedPagePendingRemove.id));
                  toast.success('Removed from saved list');
                } catch (error) {
                  console.error(error);
                  toast.error('Unable to remove saved page');
                } finally {
                  setSavedPagePendingRemove(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
