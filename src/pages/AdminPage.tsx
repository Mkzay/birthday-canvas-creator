import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Heart,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Server,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch, resolveAssetUrl } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BrandMenuIcon } from '@/components/BrandIcons';
import { DashboardSidebar } from '@/pages/dashboardPage';
import type { BirthdayPage } from '@/pages/dashboardPage/types';
import type {
  AdminBirthdayRow,
  AdminPoolReconcileRequest,
  AdminPoolReconcileResponse,
  BirthdayNotifyPayload,
  SystemStatusPayload,
} from '@/pages/admin';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut, isPro } = useAuth();

  // Creator statistics & sidebar state
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('wishcanvas_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Admin Operational State
  const [systemStatus, setSystemStatus] = useState<SystemStatusPayload | null>(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null);

  const [adminBirthdayRows, setAdminBirthdayRows] = useState<AdminBirthdayRow[]>([]);
  const [adminBirthdayRowsLoading, setAdminBirthdayRowsLoading] = useState(false);
  const [adminBirthdayRowsError, setAdminBirthdayRowsError] = useState<string | null>(null);

  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [adminPlanFilter, setAdminPlanFilter] = useState('all');
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(25);
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  // Reconcile Drawer State
  const [selectedReconcileRow, setSelectedReconcileRow] = useState<AdminBirthdayRow | null>(null);
  const [reconcileReference, setReconcileReference] = useState('');
  const [reconcileLimit, setReconcileLimit] = useState(50);
  const [reconcileIncludeFailed, setReconcileIncludeFailed] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<AdminPoolReconcileResponse | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  // Birthday Notification Operations
  const [runDate, setRunDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [notifyRunLoading, setNotifyRunLoading] = useState(false);
  const [notifyRun, setNotifyRun] = useState<BirthdayNotifyPayload | null>(null);
  const [notifyRunError, setNotifyRunError] = useState<string | null>(null);

  const isProPlan = isPro;
  const currentDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'Admin';
  const initial = currentDisplayName.charAt(0).toUpperCase();
  const avatarSrc = resolveAssetUrl(profile?.avatar_url);

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('wishcanvas_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && user && !user.isAdmin) {
      toast.error('Admin access is required.');
      navigate('/dashboard');
    }
  }, [authLoading, navigate, user]);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<BirthdayPage[]>('/pages');
      setPages(data || []);
    } catch (error) {
      console.error('Failed to load user pages for admin sidebar', error);
    }
  }, [user]);

  const fetchSystemStatus = useCallback(async () => {
    setSystemStatusLoading(true);
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
      setSystemStatusError('Unable to load system status right now.');
    } finally {
      setSystemStatusLoading(false);
    }
  }, []);

  const fetchAdminBirthdayRows = useCallback(async () => {
    setAdminBirthdayRowsLoading(true);
    try {
      const data = await apiFetch<AdminBirthdayRow[]>('/admin/birthday-pages');
      setAdminBirthdayRows(data || []);
      setAdminBirthdayRowsError(null);
    } catch (error) {
      console.error(error);
      setAdminBirthdayRows([]);
      setAdminBirthdayRowsError('Unable to load birthday pages right now.');
    } finally {
      setAdminBirthdayRowsLoading(false);
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([fetchSystemStatus(), fetchAdminBirthdayRows(), fetchUserStats()]);
    toast.success('Admin metrics and registry refreshed');
  }, [fetchAdminBirthdayRows, fetchSystemStatus, fetchUserStats]);

  useEffect(() => {
    if (!user?.isAdmin) return;

    void Promise.all([fetchSystemStatus(), fetchAdminBirthdayRows(), fetchUserStats()]);
  }, [fetchAdminBirthdayRows, fetchSystemStatus, fetchUserStats, user]);

  const totalPages = pages.length;
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  const runBirthdayNotification = useCallback(async (dryRun: boolean) => {
    setNotifyRunLoading(true);
    setNotifyRunError(null);

    try {
      const payload = await apiFetch<BirthdayNotifyPayload>('/system/notify-birthdays', {
        method: 'POST',
        body: JSON.stringify({
          date: runDate || undefined,
          dryRun,
        }),
      });
      setNotifyRun(payload);

      if (dryRun) {
        toast.success('Dry run simulation completed. No live emails were dispatched.');
      } else {
        toast.success(`Notification run complete. Dispatched ${payload.sent} email batch(es).`);
      }
    } catch (error) {
      console.error(error);
      setNotifyRun(null);
      setNotifyRunError(error instanceof Error ? error.message : 'Unable to run notifications.');
    } finally {
      setNotifyRunLoading(false);
    }
  }, [runDate]);

  const runPoolReconcile = useCallback(async () => {
    if (!selectedReconcileRow) return;

    setReconcileLoading(true);
    setReconcileError(null);
    setReconcileResult(null);

    try {
      const payload: AdminPoolReconcileRequest = {
        includeFailed: reconcileIncludeFailed,
      };

      const normalizedReference = reconcileReference.trim();
      if (normalizedReference) {
        payload.reference = normalizedReference;
      } else {
        payload.limit = reconcileLimit;
      }

      const result = await apiFetch<AdminPoolReconcileResponse>(`/admin/pages/${selectedReconcileRow.id}/pool/reconcile`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setReconcileResult(result);
      toast.success(`Reconcile complete. Verified ${result.verified} payment(s).`);
      await fetchAdminBirthdayRows();
    } catch (error) {
      console.error(error);
      const message = error instanceof ApiError ? error.message : 'Could not reconcile pool payments.';
      setReconcileError(message);
      toast.error(message);
    } finally {
      setReconcileLoading(false);
    }
  }, [fetchAdminBirthdayRows, reconcileIncludeFailed, reconcileLimit, reconcileReference, selectedReconcileRow]);

  const adminInsights = useMemo(() => {
    const today = new Date();
    const upcomingSevenDays = adminBirthdayRows.filter((row) => {
      const daysUntilBirthday = differenceInCalendarDays(parseLocalDate(row.birthday_date), today);
      return daysUntilBirthday >= 0 && daysUntilBirthday <= 7;
    }).length;

    const missingRecipientEmail = adminBirthdayRows.filter((row) => !row.recipient_email).length;
    const activeRegistryPages = adminBirthdayRows.filter((row) => row.status === 'active').length;

    return {
      totalRows: adminBirthdayRows.length,
      upcomingSevenDays,
      missingRecipientEmail,
      activePages: activeRegistryPages,
    };
  }, [adminBirthdayRows]);

  const runSummary = useMemo(() => {
    if (!notifyRun) return null;

    const failed = notifyRun.results.filter((entry) => !entry.sent && entry.reason !== 'dry-run').length;
    const wouldSend = notifyRun.results.filter((entry) => entry.reason === 'dry-run' && Boolean(entry.recipientDeliveryEmail)).length;
    const blocked = notifyRun.results.filter((entry) => !entry.recipientDeliveryEmail).length;

    return {
      failed,
      wouldSend,
      blocked,
    };
  }, [notifyRun]);

  const adminStatusOptions = useMemo(() => {
    const options = Array.from(new Set(adminBirthdayRows.map((row) => (row.status || '').trim()).filter(Boolean)));
    return options.sort((left, right) => left.localeCompare(right));
  }, [adminBirthdayRows]);

  const adminPlanOptions = useMemo(() => {
    const options = Array.from(new Set(adminBirthdayRows.map((row) => (row.owner_plan_tier || '').trim()).filter(Boolean)));
    return options.sort((left, right) => left.localeCompare(right));
  }, [adminBirthdayRows]);

  const filteredAdminBirthdayRows = useMemo(() => {
    const query = adminSearchQuery.trim().toLowerCase();

    return adminBirthdayRows.filter((row) => {
      const matchesStatus = adminStatusFilter === 'all' || row.status === adminStatusFilter;
      const matchesPlan = adminPlanFilter === 'all' || row.owner_plan_tier === adminPlanFilter;

      if (!matchesStatus || !matchesPlan) return false;
      if (!query) return true;

      const searchableFields = [
        row.public_code,
        row.recipient_name,
        row.recipient_email || '',
        row.owner_email,
        row.owner_display_name || '',
      ];

      return searchableFields.some((field) => field.toLowerCase().includes(query));
    });
  }, [adminBirthdayRows, adminPlanFilter, adminSearchQuery, adminStatusFilter]);

  const adminTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAdminBirthdayRows.length / adminRowsPerPage));
  }, [adminRowsPerPage, filteredAdminBirthdayRows.length]);

  useEffect(() => {
    setAdminCurrentPage(1);
  }, [adminRowsPerPage, adminSearchQuery, adminStatusFilter, adminPlanFilter]);

  useEffect(() => {
    if (adminCurrentPage > adminTotalPages) {
      setAdminCurrentPage(adminTotalPages);
    }
  }, [adminCurrentPage, adminTotalPages]);

  const paginatedAdminBirthdayRows = useMemo(() => {
    const start = (adminCurrentPage - 1) * adminRowsPerPage;
    return filteredAdminBirthdayRows.slice(start, start + adminRowsPerPage);
  }, [adminCurrentPage, adminRowsPerPage, filteredAdminBirthdayRows]);

  const adminPageStart = filteredAdminBirthdayRows.length === 0 ? 0 : (adminCurrentPage - 1) * adminRowsPerPage + 1;
  const adminPageEnd = Math.min(adminCurrentPage * adminRowsPerPage, filteredAdminBirthdayRows.length);

  const getDaysBadge = (dateStr: string) => {
    try {
      const today = new Date();
      const bday = parseLocalDate(dateStr);
      const diff = differenceInCalendarDays(bday, today);
      if (diff === 0) return { label: 'Today 🎉', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
      if (diff === 1) return { label: 'Tomorrow', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' };
      if (diff > 1 && diff <= 7) return { label: `In ${diff} days`, badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' };
      if (diff > 7) return { label: `In ${diff} days`, badgeClass: 'bg-stone-100 text-stone-600 border-stone-200' };
      return { label: `${Math.abs(diff)}d ago`, badgeClass: 'bg-stone-100 text-stone-400 border-stone-200' };
    } catch {
      return null;
    }
  };

  if (authLoading || !user || !user.isAdmin) {
    return <WishCanvasLoader />;
  }

  const isRefreshing = systemStatusLoading || adminBirthdayRowsLoading;

  return (
    <div className="flex h-screen bg-[#FAF7F2] text-slate-900 overflow-hidden font-sans antialiased">
      {/* 1. DESKTOP ATELIER SIDEBAR */}
      <DashboardSidebar
        user={user}
        profile={profile}
        activePagesCount={activePages}
        deliveredPagesCount={deliveredPages}
        totalPagesCount={totalPages}
        isProUser={isProPlan}
        onSignOut={signOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* MOBILE SIDEBAR DRAWER */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" hideDefaultClose className="p-0 w-80 bg-[#FAF7F2] text-slate-900 border-r border-stone-200">
          <DashboardSidebar
            isMobileDrawer
            user={user}
            profile={profile}
            activePagesCount={activePages}
            deliveredPagesCount={deliveredPages}
            totalPagesCount={totalPages}
            isProUser={isProPlan}
            onSignOut={() => {
              setIsMobileSidebarOpen(false);
              signOut();
            }}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 2. MAIN ADMIN WORKBENCH */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        
        {/* Top Command Bar */}
        <header className="bg-white/85 backdrop-blur-md border-b border-stone-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors shadow-xs active:scale-95"
              aria-label="Open sidebar menu"
              title="Open menu"
            >
              <BrandMenuIcon className="h-4 w-4 text-stone-700" />
            </button>

            {/* Context Title */}
            <div className="flex items-center gap-2 pl-1">
              <Link
                to="/dashboard"
                className="font-serif font-bold text-slate-950 text-sm sm:text-base tracking-tight hover:text-amber-800 transition-colors"
              >
                Celebration Atelier
              </Link>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-stone-300" />
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                <ShieldCheck className="h-3 w-3 text-purple-600" />
                Admin Console
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            {/* System Status Pill */}
            <div className="flex items-center gap-2 bg-stone-100/80 border border-stone-200/90 px-3 py-1.5 rounded-xl">
              <span className={cn('h-2 w-2 rounded-full', systemStatus?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
              <span className="font-semibold text-slate-900 text-[11px] hidden sm:inline">
                {systemStatus?.ok ? 'System Healthy' : 'System Degraded'}
              </span>
            </div>

            <Link to="/settings" className="flex items-center gap-2" title="Account settings">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={currentDisplayName}
                  className="h-8 w-8 rounded-full object-cover border border-purple-300 shadow-xs ring-2 ring-purple-400/20"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {initial}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
          
          {/* Header Block & Refresh Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Admin Console <span className="italic text-purple-700">&amp; Operations</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">platform oversight</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-2xl leading-relaxed">
                Monitor system infrastructure, trigger scheduled birthday reminder notifications, inspect registered celebration canvases, and reconcile pool pledges.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="rounded-2xl border-stone-200 bg-white font-bold text-xs text-stone-700 hover:bg-stone-50 shadow-xs h-9 px-4 gap-2 self-start sm:self-auto"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-stone-600', isRefreshing && 'animate-spin')} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Operations'}</span>
            </Button>
          </div>

          {/* 4 Operations Vital Stat Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Infrastructure */}
            <article className="rounded-3xl border border-stone-200/90 bg-white p-5 shadow-card relative overflow-hidden flex flex-col justify-between">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-xl" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Infrastructure
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                    {systemStatus?.ok ? <CheckCircle2 className="h-4 w-4" /> : <ServerCrash className="h-4 w-4 text-rose-600" />}
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-serif font-bold text-slate-950">
                  {systemStatus?.ok ? 'Fully Operational' : 'Degraded System'}
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-stone-400" />
                  <span>DB: {systemStatus?.checks.db.ok ? 'Online' : 'Fail'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-stone-400" />
                  <span>Uploads: {systemStatus?.checks.uploads.ok ? 'Online' : 'Fail'}</span>
                </span>
              </div>
            </article>

            {/* 2. Platform Community */}
            <article className="rounded-3xl border border-stone-200/90 bg-white p-5 shadow-card relative overflow-hidden flex flex-col justify-between">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-500/10 blur-xl" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Platform Scale
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mt-3 text-2xl font-serif font-bold text-slate-950">
                  {systemStatus?.stats?.total_users ?? 0}
                  <span className="text-xs font-sans font-medium text-stone-500 ml-1.5">creators</span>
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span>{systemStatus?.stats?.total_pages ?? 0} canvases</span>
                <span>•</span>
                <span>{systemStatus?.stats?.total_visitors ?? 0} visitors</span>
              </div>
            </article>

            {/* 3. Imminent Milestones */}
            <article className="rounded-3xl border border-stone-200/90 bg-white p-5 shadow-card relative overflow-hidden flex flex-col justify-between">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-rose-500/10 blur-xl" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    7-Day Milestones
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mt-3 text-2xl font-serif font-bold text-rose-600">
                  {adminInsights.upcomingSevenDays}
                  <span className="text-xs font-sans font-medium text-stone-500 ml-1.5">birthdays soon</span>
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span>{adminInsights.activePages} active collecting</span>
                <span>•</span>
                <span>{adminInsights.totalRows} registered</span>
              </div>
            </article>

            {/* 4. Deliverability Hygiene */}
            <article className="rounded-3xl border border-stone-200/90 bg-white p-5 shadow-card relative overflow-hidden flex flex-col justify-between">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-purple-500/10 blur-xl" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Delivery Hygiene
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mt-3 text-2xl font-serif font-bold text-slate-950">
                  {adminInsights.missingRecipientEmail}
                  <span className="text-xs font-sans font-medium text-stone-500 ml-1.5">missing email</span>
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
                {adminInsights.missingRecipientEmail > 0 ? (
                  <span className="text-amber-800 font-medium">Recipient reminders blocked</span>
                ) : (
                  <span className="text-emerald-700 font-medium">All recipient emails present</span>
                )}
              </div>
            </article>
          </div>

          {/* SECTION A: BIRTHDAY NOTIFICATION RUNS */}
          <section className="rounded-[2.5rem] border border-stone-200/90 bg-white p-5 sm:p-7 shadow-card space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                      Scheduled Birthday Reminder Dispatcher
                    </h2>
                    <p className="text-xs text-stone-500">
                      Simulate delivery with a dry run, or trigger real-time reminder emails to celebrants on their milestone date.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  <Input
                    type="date"
                    value={runDate}
                    onChange={(event) => setRunDate(event.target.value)}
                    className="border-0 bg-transparent p-0 h-auto text-xs font-mono text-slate-950 focus-visible:ring-0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial rounded-xl border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 h-9 px-3 gap-1.5"
                    disabled={notifyRunLoading}
                    onClick={() => void runBirthdayNotification(true)}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', notifyRunLoading && 'animate-spin')} />
                    <span>Dry Run (Test)</span>
                  </Button>

                  <Button
                    size="sm"
                    className="btn-press flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:brightness-105 h-9 px-4 gap-1.5"
                    disabled={notifyRunLoading}
                    onClick={() => void runBirthdayNotification(false)}
                  >
                    <Mail className="h-3.5 w-3.5 text-amber-100" />
                    <span>Send Live Batch</span>
                  </Button>
                </div>
              </div>
            </div>

            {notifyRunError && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{notifyRunError}</span>
              </div>
            )}

            {/* Run Results Summary */}
            {notifyRun && runSummary && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Execution Mode</span>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {notifyRun.dryRun ? 'Dry Run (Preview)' : 'Live Send Batch'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Successful Sends</span>
                    <p className="mt-1 text-sm font-bold text-emerald-950">{notifyRun.sent}</p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Failures</span>
                    <p className="mt-1 text-sm font-bold text-rose-950">{runSummary.failed}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Eligible Recipients</span>
                    <p className="mt-1 text-sm font-bold text-amber-950">{runSummary.wouldSend}</p>
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto rounded-2xl border border-stone-200/90 shadow-2xs">
                  <table className="min-w-[840px] w-full text-left text-xs">
                    <thead className="bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                      <tr>
                        <th className="px-4 py-3">Canvas</th>
                        <th className="px-4 py-3">Celebrant</th>
                        <th className="px-4 py-3">Delivery Email</th>
                        <th className="px-4 py-3">Wishes</th>
                        <th className="px-4 py-3">Result</th>
                        <th className="px-4 py-3">Diagnostic Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {notifyRun.results.map((entry) => {
                        const stateLabel = entry.sent ? 'Success' : entry.reason === 'dry-run' ? 'Simulated' : 'Failed';
                        const stateClass = entry.sent
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : entry.reason === 'dry-run'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200';

                        return (
                          <tr key={`${entry.pageId}-${entry.reason || 'ok'}`} className="hover:bg-stone-50/50">
                            <td className="px-4 py-3">
                              <Link
                                to={`/preview/${entry.publicCode}`}
                                className="font-mono font-bold text-amber-900 hover:underline flex items-center gap-1"
                              >
                                <span>{entry.publicCode}</span>
                                <ExternalLink className="h-3 w-3 text-stone-400" />
                              </Link>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{entry.recipientName}</td>
                            <td className="px-4 py-3 text-stone-600 font-mono">
                              {entry.recipientDeliveryEmail || <span className="text-rose-600 italic font-sans">Missing email</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-bold">{entry.messageCount}</td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border', stateClass)}>
                                {stateLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">{entry.reason || 'dispatched'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {runSummary.blocked > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200 rounded-xl px-3 py-2">
                    {runSummary.blocked} celebration canvas(es) were skipped because no recipient email address was configured.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* SECTION B: MASTER BIRTHDAY CANVAS REGISTRY & RECONCILIATION */}
          <section className="rounded-[2.5rem] border border-stone-200/90 bg-white p-5 sm:p-7 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                      Master Celebration Canvas Registry
                    </h2>
                    <p className="text-xs text-stone-500">
                      Inspect all created canvases across the platform, verify engagement, and manage milestone delivery.
                    </p>
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-xl self-start sm:self-auto border border-stone-200">
                {filteredAdminBirthdayRows.length} Canvases Found
              </span>
            </div>

            {/* Search and Filters Bar */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search Query */}
              <div className="relative lg:col-span-2">
                <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search code, celebrant, creator email..."
                  value={adminSearchQuery}
                  onChange={(event) => setAdminSearchQuery(event.target.value)}
                  className="pl-9 text-xs rounded-xl border-stone-200 h-10 bg-stone-50/40 focus:bg-white"
                />
                {adminSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAdminSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                aria-label="Filter by canvas status"
                value={adminStatusFilter}
                onChange={(event) => setAdminStatusFilter(event.target.value)}
                className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 text-xs font-semibold text-stone-700 focus:bg-white"
              >
                <option value="all">All Statuses</option>
                {adminStatusOptions.map((status) => (
                  <option key={status} value={status}>Status: {status}</option>
                ))}
              </select>

              {/* Plan Filter */}
              <select
                aria-label="Filter by creator plan"
                value={adminPlanFilter}
                onChange={(event) => setAdminPlanFilter(event.target.value)}
                className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 text-xs font-semibold text-stone-700 focus:bg-white"
              >
                <option value="all">All Plan Tiers</option>
                {adminPlanOptions.map((plan) => (
                  <option key={plan} value={plan}>Plan: {plan}</option>
                ))}
              </select>

              {/* Rows Per Page */}
              <select
                aria-label="Rows per page"
                value={String(adminRowsPerPage)}
                onChange={(event) => setAdminRowsPerPage(Number(event.target.value))}
                className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 text-xs font-semibold text-stone-700 focus:bg-white"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>

            {/* SELECTED RECONCILE DRAWER / PANEL */}
            {selectedReconcileRow && (
              <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-amber-50/40 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-purple-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center shadow-2xs">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-slate-950 text-base">
                        Gift Pool Reconciliation: {selectedReconcileRow.public_code}
                      </h4>
                      <p className="text-xs text-stone-600">
                        Celebrant: <span className="font-semibold text-slate-900">{selectedReconcileRow.recipient_name}</span> • Created by: {selectedReconcileRow.owner_email}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 rounded-xl text-stone-500 hover:text-slate-950 self-start sm:self-auto"
                    onClick={() => {
                      setSelectedReconcileRow(null);
                      setReconcileReference('');
                      setReconcileResult(null);
                      setReconcileError(null);
                    }}
                  >
                    Close Reconcile
                  </Button>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1 block">
                      Paystack Reference (Optional)
                    </label>
                    <Input
                      placeholder="e.g. bday_pool_abc123"
                      value={reconcileReference}
                      onChange={(event) => setReconcileReference(event.target.value)}
                      className="text-xs rounded-xl border-purple-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1 block">
                      Batch Verification Limit
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      disabled={Boolean(reconcileReference.trim())}
                      value={String(reconcileLimit)}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next)) {
                          setReconcileLimit(Math.max(1, Math.min(200, Math.trunc(next))));
                        }
                      }}
                      className="text-xs rounded-xl border-purple-200 bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-purple-200 bg-white px-3 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reconcileIncludeFailed}
                        onChange={(event) => setReconcileIncludeFailed(event.target.checked)}
                        disabled={Boolean(reconcileReference.trim())}
                        className="rounded text-purple-600"
                      />
                      <span className="font-medium">Include failed refs</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={() => void runPoolReconcile()}
                    disabled={reconcileLoading}
                    size="sm"
                    className="btn-press rounded-xl bg-purple-900 text-white font-bold text-xs px-5 shadow-xs hover:bg-purple-950 gap-2"
                  >
                    {reconcileLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-200" />
                        <span>Reconciling...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-300" />
                        <span>Execute Reconcile</span>
                      </>
                    )}
                  </Button>

                  <span className="text-xs text-stone-500">
                    {reconcileReference.trim() ? 'Single Reference Verification' : `Batch mode verifying up to ${reconcileLimit} records`}
                  </span>
                </div>

                {reconcileError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{reconcileError}</span>
                  </div>
                )}

                {reconcileResult && (
                  <div className="rounded-2xl border border-purple-200 bg-white p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="font-bold text-slate-900 text-sm">Reconciliation Verified</span>
                      <span className="font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        Processed: {reconcileResult.processed} · Verified: {reconcileResult.verified}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Pooled Total</span>
                        <p className="font-bold text-slate-900">
                          ₦{((reconcileResult.summary.pooled_amount_kobo || 0) / 100).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Success</span>
                        <p className="font-bold text-emerald-700">{reconcileResult.summary.success_count}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Pending</span>
                        <p className="font-bold text-amber-700">{reconcileResult.summary.pending_count}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Failed</span>
                        <p className="font-bold text-rose-700">{reconcileResult.summary.failed_count}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table Container */}
            <div className="overflow-x-auto rounded-2xl border border-stone-200/90 shadow-2xs">
              <table className="min-w-[1040px] w-full text-left text-xs">
                <thead className="bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3.5">Creator Account</th>
                    <th className="px-4 py-3.5">Canvas Link</th>
                    <th className="px-4 py-3.5">Celebrant</th>
                    <th className="px-4 py-3.5">Celebration Date</th>
                    <th className="px-4 py-3.5">Wishes</th>
                    <th className="px-4 py-3.5">Views</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {adminBirthdayRowsLoading ? (
                    <tr>
                      <td className="px-4 py-12 text-center text-stone-500" colSpan={9}>
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                          <span>Loading platform celebration canvases...</span>
                        </div>
                      </td>
                    </tr>
                  ) : adminBirthdayRowsError ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-rose-600" colSpan={9}>
                        {adminBirthdayRowsError}
                      </td>
                    </tr>
                  ) : filteredAdminBirthdayRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-12 text-center text-stone-500" colSpan={9}>
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400">
                            <Search className="h-5 w-5" />
                          </div>
                          <span className="font-semibold text-slate-800">No birthday pages match your search</span>
                          <span className="text-[11px] text-stone-400">Try adjusting your query or filter selections.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAdminBirthdayRows.map((row) => {
                      const daysInfo = getDaysBadge(row.birthday_date);

                      return (
                        <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                          {/* Creator */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-bold text-slate-950 flex items-center gap-1.5">
                                  <span>{row.owner_display_name || 'Unnamed Creator'}</span>
                                  {row.owner_plan_tier === 'pro' && (
                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                      PRO
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-stone-500 font-mono">{row.owner_email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Canvas Link */}
                          <td className="px-4 py-3.5">
                            <Link
                              to={`/preview/${row.public_code}`}
                              className="inline-flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-50/80 border border-amber-200/80 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                              title="Open canvas preview"
                            >
                              <span>{row.public_code}</span>
                              <ExternalLink className="h-3 w-3 text-amber-700" />
                            </Link>
                          </td>

                          {/* Celebrant */}
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-950">{row.recipient_name}</p>
                            {row.recipient_email ? (
                              <p className="text-[11px] text-stone-500 font-mono">{row.recipient_email}</p>
                            ) : (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Missing email
                              </span>
                            )}
                          </td>

                          {/* Birthday Date & Days Tag */}
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900">
                              {format(parseLocalDate(row.birthday_date), 'MMM d, yyyy')}
                            </p>
                            {daysInfo && (
                              <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded border mt-0.5', daysInfo.badgeClass)}>
                                {daysInfo.label}
                              </span>
                            )}
                          </td>

                          {/* Messages */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-slate-900 font-bold">
                              <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                              <span>{row.message_count || 0}</span>
                            </div>
                          </td>

                          {/* Views */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-stone-600">
                              <Eye className="h-3 w-3 text-stone-400" />
                              <span>{row.view_count || 0}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize',
                                row.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : row.status === 'delivered'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full',
                                  row.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                                )}
                              />
                              <span>{row.status}</span>
                            </span>
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3.5 text-stone-500 font-medium">
                            {format(new Date(row.created_at), 'MMM d, yyyy')}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReconcileRow(row);
                                setReconcileReference('');
                                setReconcileResult(null);
                                setReconcileError(null);
                              }}
                              className="rounded-xl border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 h-7 px-2.5 gap-1 shadow-2xs"
                            >
                              <Wallet className="h-3 w-3 text-amber-700" />
                              <span>Reconcile</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!adminBirthdayRowsLoading && !adminBirthdayRowsError && filteredAdminBirthdayRows.length > 0 && (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <p className="text-stone-500">
                  Showing <span className="font-bold text-slate-900">{adminPageStart}</span> to{' '}
                  <span className="font-bold text-slate-900">{adminPageEnd}</span> of{' '}
                  <span className="font-bold text-slate-900">{filteredAdminBirthdayRows.length}</span> celebration canvases
                </p>

                <div className="flex items-center gap-2 self-center sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdminCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={adminCurrentPage <= 1}
                    className="rounded-xl border-stone-200 text-xs font-semibold h-8 px-2.5 gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Button>

                  <span className="px-3 py-1 bg-stone-100 rounded-lg text-stone-600 font-medium font-mono text-xs border border-stone-200">
                    Page {adminCurrentPage} of {adminTotalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdminCurrentPage((page) => Math.min(adminTotalPages, page + 1))}
                    disabled={adminCurrentPage >= adminTotalPages}
                    className="rounded-xl border-stone-200 text-xs font-semibold h-8 px-2.5 gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
};

export default AdminPage;
