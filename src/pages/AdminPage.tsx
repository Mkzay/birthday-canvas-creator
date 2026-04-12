import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, differenceInCalendarDays } from 'date-fns';
import { Activity, AlertTriangle, CheckCircle2, Database, Mail, RefreshCw, ServerCrash, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminBirthdayRow, BirthdayNotifyPayload, SystemStatusPayload } from '@/pages/admin';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [systemStatus, setSystemStatus] = useState<SystemStatusPayload | null>(null);
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null);
  const [adminBirthdayRows, setAdminBirthdayRows] = useState<AdminBirthdayRow[]>([]);
  const [adminBirthdayRowsLoading, setAdminBirthdayRowsLoading] = useState(false);
  const [adminBirthdayRowsError, setAdminBirthdayRowsError] = useState<string | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [adminPlanFilter, setAdminPlanFilter] = useState('all');
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(25);
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  const [runDate, setRunDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [notifyRunLoading, setNotifyRunLoading] = useState(false);
  const [notifyRun, setNotifyRun] = useState<BirthdayNotifyPayload | null>(null);
  const [notifyRunError, setNotifyRunError] = useState<string | null>(null);

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

  const fetchSystemStatus = useCallback(async () => {
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
        toast.success('Dry run completed. No emails were sent.');
      } else {
        toast.success(`Notification run complete. Sent ${payload.sent} email batch(es).`);
      }
    } catch (error) {
      console.error(error);
      setNotifyRun(null);
      setNotifyRunError(error instanceof Error ? error.message : 'Unable to run notifications.');
    } finally {
      setNotifyRunLoading(false);
    }
  }, [runDate]);

  useEffect(() => {
    if (!user?.isAdmin) return;

    void Promise.all([fetchSystemStatus(), fetchAdminBirthdayRows()]);
  }, [fetchAdminBirthdayRows, fetchSystemStatus, user]);

  const adminInsights = useMemo(() => {
    const today = new Date();
    const upcomingSevenDays = adminBirthdayRows.filter((row) => {
      const daysUntilBirthday = differenceInCalendarDays(parseLocalDate(row.birthday_date), today);
      return daysUntilBirthday >= 0 && daysUntilBirthday <= 7;
    }).length;

    const missingRecipientEmail = adminBirthdayRows.filter((row) => !row.recipient_email).length;
    const activePages = adminBirthdayRows.filter((row) => row.status === 'active').length;

    return {
      totalRows: adminBirthdayRows.length,
      upcomingSevenDays,
      missingRecipientEmail,
      activePages,
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

  if (authLoading || !user) {
    return <WishCanvasLoader />;
  }

  if (!user.isAdmin) {
    return <WishCanvasLoader />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.10),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#fffdf9_52%,#ffffff_100%)] relative">
      <AnimatedBackground showStars={false} showWaves={true} className="opacity-35" />
      <Header sectionLabel="Admin" />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pt-28">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-border/60 bg-card/90 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">System</p>
              {systemStatus?.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ServerCrash className="h-4 w-4 text-destructive" />}
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{systemStatus?.ok ? 'Operational' : 'Degraded or unavailable'}</p>
            <p className="mt-2 text-xs text-muted-foreground">DB {systemStatus?.checks.db.ok ? 'OK' : 'FAIL'} • Uploads {systemStatus?.checks.uploads.ok ? 'OK' : 'FAIL'}</p>
          </article>

          <article className="rounded-3xl border border-border/60 bg-card/90 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Platform</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{systemStatus?.stats?.total_users ?? 0} users</p>
            <p className="mt-2 text-xs text-muted-foreground">{systemStatus?.stats?.total_pages ?? 0} pages • {systemStatus?.stats?.total_visitors ?? 0} visitors</p>
          </article>

          <article className="rounded-3xl border border-border/60 bg-card/90 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Birthdays Soon</p>
              <Activity className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{adminInsights.upcomingSevenDays} in next 7 days</p>
            <p className="mt-2 text-xs text-muted-foreground">{adminInsights.activePages} active pages out of {adminInsights.totalRows} total</p>
          </article>

          <article className="rounded-3xl border border-border/60 bg-card/90 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Data Hygiene</p>
              <Database className="h-4 w-4 text-fuchsia-600" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{adminInsights.missingRecipientEmail} pages missing recipient email</p>
            <p className="mt-2 text-xs text-muted-foreground">Useful for reminder deliverability checks</p>
          </article>
        </section>

        <section className="mt-8 rounded-[2rem] border border-border/60 bg-card/90 p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Email operations</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Birthday notification runs</h2>
              <p className="mt-2 text-sm text-muted-foreground">Preview eligible recipients with dry-run, then trigger live sends when ready.</p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Input
                type="date"
                value={runDate}
                onChange={(event) => setRunDate(event.target.value)}
                className="sm:w-[170px]"
              />
              <Button variant="outline" className="gap-2" disabled={notifyRunLoading} onClick={() => void runBirthdayNotification(true)}>
                <RefreshCw className="h-4 w-4" />
                {notifyRunLoading ? 'Running...' : 'Dry run'}
              </Button>
              <Button className="gap-2" disabled={notifyRunLoading} onClick={() => void runBirthdayNotification(false)}>
                <Mail className="h-4 w-4" />
                {notifyRunLoading ? 'Sending...' : 'Send now'}
              </Button>
            </div>
          </div>

          {notifyRunError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{notifyRunError}</span>
            </div>
          )}

          {notifyRun && runSummary && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{notifyRun.dryRun ? 'Dry run' : 'Live send'}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Success</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{notifyRun.sent}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Failures</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{runSummary.failed}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Would Send</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{runSummary.wouldSend}</p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-border/60 bg-background/70">
                <table className="min-w-[920px] w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Page</th>
                      <th className="px-4 py-3 font-semibold">Recipient</th>
                      <th className="px-4 py-3 font-semibold">Delivery Email</th>
                      <th className="px-4 py-3 font-semibold">Messages</th>
                      <th className="px-4 py-3 font-semibold">Result</th>
                      <th className="px-4 py-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifyRun.results.map((entry) => {
                      const stateLabel = entry.sent ? 'Success' : (entry.reason === 'dry-run' ? 'Preview' : 'Failed');
                      const stateClass = entry.sent
                        ? 'bg-emerald-100 text-emerald-700'
                        : (entry.reason === 'dry-run' ? 'bg-amber-100 text-amber-700' : 'bg-destructive/10 text-destructive');

                      return (
                        <tr key={`${entry.pageId}-${entry.reason || 'ok'}`} className="border-t border-border/50 align-top">
                          <td className="px-4 py-3">
                            <Link to={`/preview/${entry.publicCode}`} className="font-medium text-primary hover:underline">
                              {entry.publicCode}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-foreground">{entry.recipientName}</td>
                          <td className="px-4 py-3 text-foreground">{entry.recipientDeliveryEmail || 'Missing email'}</td>
                          <td className="px-4 py-3 text-foreground">{entry.messageCount}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stateClass}`}>{stateLabel}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.reason || 'sent'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {runSummary.blocked > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{runSummary.blocked} pages are blocked because no delivery email is available.</p>
              )}
            </>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-border/60 bg-card/90 p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin table</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">All birthday pages</h2>
              <p className="mt-2 text-sm text-muted-foreground">Account owner, page code, recipient birthday date, contact details, and engagement stats.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void Promise.all([fetchSystemStatus(), fetchAdminBirthdayRows()])} disabled={adminBirthdayRowsLoading}>
              {adminBirthdayRowsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input
              placeholder="Search page, recipient, account..."
              value={adminSearchQuery}
              onChange={(event) => setAdminSearchQuery(event.target.value)}
              className="xl:col-span-2"
            />
            <select
              aria-label="Filter admin rows by status"
              value={adminStatusFilter}
              onChange={(event) => setAdminStatusFilter(event.target.value)}
              className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All statuses</option>
              {adminStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              aria-label="Filter admin rows by plan"
              value={adminPlanFilter}
              onChange={(event) => setAdminPlanFilter(event.target.value)}
              className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All plans</option>
              {adminPlanOptions.map((plan) => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
            <select
              aria-label="Rows per page"
              value={String(adminRowsPerPage)}
              onChange={(event) => setAdminRowsPerPage(Number(event.target.value))}
              className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>

          {systemStatusError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{systemStatusError}</span>
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-border/60 bg-background/70">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Owner Email</th>
                  <th className="px-4 py-3 font-semibold">Page</th>
                  <th className="px-4 py-3 font-semibold">Recipient</th>
                  <th className="px-4 py-3 font-semibold">Birthday</th>
                  <th className="px-4 py-3 font-semibold">Messages</th>
                  <th className="px-4 py-3 font-semibold">Views</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {adminBirthdayRowsLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={9}>Loading birthday pages...</td>
                  </tr>
                ) : adminBirthdayRowsError ? (
                  <tr>
                    <td className="px-4 py-6 text-destructive" colSpan={9}>{adminBirthdayRowsError}</td>
                  </tr>
                ) : filteredAdminBirthdayRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={9}>No birthday pages match your current filters.</td>
                  </tr>
                ) : (
                  paginatedAdminBirthdayRows.map((row) => (
                    <tr key={row.id} className="border-t border-border/50 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{row.owner_display_name || 'Unnamed user'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{row.owner_plan_tier || 'free'} plan</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.owner_email}</td>
                      <td className="px-4 py-3">
                        <Link to={`/preview/${row.public_code}`} className="font-medium text-primary hover:underline">
                          {row.public_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{row.recipient_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{row.recipient_email || 'No recipient email'}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{format(parseLocalDate(row.birthday_date), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 text-foreground">{row.message_count || 0}</td>
                      <td className="px-4 py-3 text-foreground">{row.view_count || 0}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{format(new Date(row.created_at), 'MMM d, yyyy')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!adminBirthdayRowsLoading && !adminBirthdayRowsError && filteredAdminBirthdayRows.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {adminPageStart}-{adminPageEnd} of {filteredAdminBirthdayRows.length} rows
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdminCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={adminCurrentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {adminCurrentPage} of {adminTotalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdminCurrentPage((page) => Math.min(adminTotalPages, page + 1))}
                  disabled={adminCurrentPage >= adminTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
