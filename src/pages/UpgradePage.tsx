import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  HelpCircle,
  Infinity as InfinityIcon,
  Layout,
  Loader2,
  Lock,
  Mail,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import { BrandMenuIcon } from '@/components/BrandIcons';
import { toast } from 'sonner';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch, resolveAssetUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DashboardSidebar } from '@/pages/dashboardPage';
import type { BirthdayPage } from '@/pages/dashboardPage/types';

type ProFeature = {
  id: string;
  title: string;
  status: 'live' | 'coming-soon';
};

type FeaturePillar = {
  icon: typeof Sparkles;
  title: string;
  description: string;
  perks: string[];
};

const FEATURE_PILLARS: FeaturePillar[] = [
  {
    icon: Users,
    title: 'Limitless Milestone Gathering',
    description: 'Collect heartfelt contributions from all your circles without worrying about guest caps.',
    perks: [
      'Unlimited contributors per canvas (Free tier capped at 6)',
      'Unlimited celebration canvases in your atelier',
      'High-res photo memories and voice audio recordings',
    ],
  },
  {
    icon: Palette,
    title: 'Bespoke Theme Atelier',
    description: 'Design keepsake aesthetics that feel like personalized stationery cards.',
    perks: [
      'Unlock midpoint custom gradient palettes',
      'Artisan typography and curated Google fonts',
      'Custom vanity links tailored to the celebrant',
    ],
  },
  {
    icon: Layout,
    title: 'Cinematic Reveal Experiences',
    description: 'Transform messages into an interactive experience on the celebrant big day.',
    perks: [
      'Story, Freeform, and Bento celebration presentation modes',
      'Scheduled reveal automation timed to their birthday hour',
      'Confetti and ambient soundscape accompaniment',
    ],
  },
  {
    icon: Shield,
    title: 'Privacy and Guardian Controls',
    description: 'Keep intimate birthday tributes safe and coordinate effortlessly.',
    perks: [
      'Secret PIN protection for private family moments',
      'Creator analytics on contributor participation',
      'Priority concierge assistance from the atelier team',
    ],
  },
];

const DEFAULT_FEATURES: ProFeature[] = [
  { id: 'unlimited-contributors', title: 'Unlimited contributors per canvas', status: 'live' },
  { id: 'scheduled-delivery', title: 'Scheduled delivery automation', status: 'live' },
  { id: 'advanced-view-modes', title: 'Story, Freeform, and Bento presentation modes', status: 'live' },
  { id: 'advanced-custom-themes', title: 'Full custom theme design studio', status: 'live' },
  { id: 'creator-analytics', title: 'Creator participation analytics', status: 'live' },
  { id: 'vanity-links-branding', title: 'Custom branding and vanity links', status: 'live' },
  { id: 'advanced-reveal-effects', title: 'Advanced reveal effects', status: 'coming-soon' },
  { id: 'privacy-controls', title: 'Secret PIN access controls', status: 'coming-soon' },
  { id: 'team-collaboration', title: 'Multi-organizer co-editing', status: 'coming-soon' },
  { id: 'keepsake-export', title: 'Keepsake archive export', status: 'coming-soon' },
  { id: 'priority-support', title: 'Priority concierge recovery', status: 'coming-soon' },
];

type VerifyState = 'idle' | 'verifying' | 'success' | 'failed';

const UpgradePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, isPro, loading: authLoading, refreshSession, signOut } = useAuth();

  // App Shell Navigation & Sidebar state synced with Dashboard
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

  // Creator statistics for sidebar
  const [pages, setPages] = useState<BirthdayPage[]>([]);

  // Payment states
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [offerLoading, setOfferLoading] = useState(true);
  const [priceLabel, setPriceLabel] = useState('₦5,000 one-time');
  const [features, setFeatures] = useState<ProFeature[]>(DEFAULT_FEATURES);

  const isProUser = isPro;
  const currentDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';
  const initial = currentDisplayName.charAt(0).toUpperCase();
  const avatarSrc = resolveAssetUrl(profile?.avatar_url);

  const paystackReference = useMemo(() => {
    return searchParams.get('reference') || searchParams.get('trxref');
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      try {
        const data = await apiFetch<BirthdayPage[]>('/pages');
        setPages(data || []);
      } catch (error) {
        console.error('Failed to load stats for perks page', error);
      }
    };

    fetchUserStats();
  }, [user]);

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  useEffect(() => {
    const loadOffer = async () => {
      try {
        const offer = await apiFetch<{
          amountKobo: number;
          currency: string;
          purchaseType: string;
          features: ProFeature[];
        }>('/billing/pro-offer');

        const amountNaira = Math.round((offer.amountKobo || 0) / 100);
        const formatted = new Intl.NumberFormat('en-NG').format(amountNaira);
        setPriceLabel(`₦${formatted} one-time`);
        if (Array.isArray(offer.features) && offer.features.length) {
          setFeatures(offer.features);
        }
      } catch {
        setFeatures(DEFAULT_FEATURES);
      } finally {
        setOfferLoading(false);
      }
    };

    void loadOffer();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (isProUser) return;
    if (!paystackReference) return;
    if (verifyState !== 'idle') return;

    const runVerify = async () => {
      setVerifyState('verifying');
      setVerifyMessage('Verifying payment with Paystack...');

      try {
        await apiFetch<{ user: unknown }>('/billing/paystack/verify', {
          method: 'POST',
          body: JSON.stringify({ reference: paystackReference }),
        });
        await refreshSession();
        setVerifyState('success');
        setVerifyMessage('Payment confirmed. Your account is now upgraded to Pro Atelier.');
        toast.success('Upgrade successful. Welcome to Pro Atelier!');

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('reference');
        nextParams.delete('trxref');
        setSearchParams(nextParams, { replace: true });

        setTimeout(() => {
          navigate('/themes');
        }, 1500);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Could not verify payment.';
        setVerifyState('failed');
        setVerifyMessage(message);
        toast.error(message);
      }
    };

    void runVerify();
  }, [isProUser, paystackReference, refreshSession, searchParams, setSearchParams, user, verifyState, navigate]);

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const data = await apiFetch<{
        authorizationUrl: string | null;
        alreadyPro?: boolean;
        message?: string;
      }>('/billing/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({ callbackPath: '/billing' }),
      });

      if (data.alreadyPro) {
        toast.success(data.message || 'You are already on Pro Atelier.');
        return;
      }

      if (!data.authorizationUrl) {
        throw new Error('Missing authorization URL from Paystack.');
      }

      window.location.assign(data.authorizationUrl);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not start checkout.';
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (authLoading) {
    return <WishCanvasLoader />;
  }

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 flex overflow-hidden">
      {/* Background Celebratory Glows identical to Dashboard & Settings */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-amber-200/35 to-rose-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-rose-200/30 to-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[360px] w-[360px] rounded-full bg-amber-100/30 blur-3xl" />

      {/* 1. PERSISTENT STUDIO APP SHELL SIDEBAR (Desktop) */}
      <DashboardSidebar
        user={user}
        profile={profile}
        activePagesCount={activePages}
        deliveredPagesCount={deliveredPages}
        totalPagesCount={totalPages}
        isProUser={isProUser}
        onSignOut={signOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* MOBILE SIDEBAR DRAWER (When on phone / tablet) */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" hideDefaultClose className="p-0 w-80 bg-[#FAF7F2] text-slate-900 border-r border-stone-200">
          <DashboardSidebar
            isMobileDrawer
            user={user}
            profile={profile}
            activePagesCount={activePages}
            deliveredPagesCount={deliveredPages}
            totalPagesCount={totalPages}
            isProUser={isProUser}
            onSignOut={() => {
              setIsMobileSidebarOpen(false);
              signOut();
            }}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 2. MAIN STUDIO WORKBENCH */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
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

            {/* Studio Context Title */}
            <div className="flex items-center gap-2 pl-1">
              <Link
                to="/dashboard"
                className="font-serif font-bold text-slate-950 text-sm sm:text-base tracking-tight hover:text-amber-800 transition-colors"
              >
                Celebration Atelier
              </Link>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-stone-300" />
              <span className="hidden sm:inline-block text-[11px] text-stone-500 font-medium">
                Atelier Perks &amp; Plans
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="hidden sm:flex items-center gap-4 border-r border-stone-200 pr-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Live
                </span>
                <p className="font-serif font-bold text-emerald-800 text-sm">
                  {activePages} Collecting
                </p>
              </div>
              <div className="w-px h-6 bg-stone-200" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Wishes
                </span>
                <p className="font-serif font-bold text-slate-950 text-sm">
                  {totalWishes} Pinned
                </p>
              </div>
            </div>

            <Link to="/settings" className="flex items-center gap-2" title="Account settings">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={currentDisplayName}
                  className="h-8 w-8 rounded-full object-cover border border-stone-300"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {initial}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Main Workbench Content */}
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Atelier Membership <span className="italic text-rose-500">&amp; Perks</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">lifetime creator access</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-2xl leading-relaxed">
                One-time contribution to unlock unlimited celebration canvases, custom themes, secret PIN security, and priority concierge.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-2xl border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
                  Return to Timeline
                </Button>
              </Link>
              <Link to="/create">
                <Button
                  size="sm"
                  className="btn-press gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="h-4 w-4 text-amber-100" />
                  Craft Canvas
                </Button>
              </Link>
            </div>
          </div>

          {/* Payment Verification Alerts (if returning from Paystack) */}
          {verifyMessage && (
            <div
              className={`rounded-2xl border p-4 text-xs sm:text-sm transition-all ${
                verifyState === 'success'
                  ? 'border-emerald-300/80 bg-emerald-50 text-emerald-950 shadow-xs'
                  : verifyState === 'failed'
                  ? 'border-rose-300/80 bg-rose-50 text-rose-950 shadow-xs'
                  : 'border-amber-300/80 bg-amber-50 text-amber-950 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2.5 font-medium">
                  {verifyState === 'verifying' && <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />}
                  {verifyState === 'success' && <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />}
                  {verifyState === 'failed' && <Lock className="h-4 w-4 text-rose-600 shrink-0" />}
                  <span>{verifyMessage}</span>
                </p>
                {verifyState === 'success' && (
                  <Link to="/themes">
                    <Button size="sm" className="rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs gap-1.5 shadow-xs">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>Explore Theme Studio</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* TWO-TIER ATELIER STAGE (Free Creator Studio vs Pro Atelier) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* TIER 1: FREE CREATOR STUDIO (5 Cols on LG) */}
            <div className="lg:col-span-5 rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-stone-100 pb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Standard Membership
                    </span>
                    <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-1">
                      Free Creator
                    </h3>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-600">
                    Always Free
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold text-slate-950">₦0</span>
                    <span className="text-xs text-stone-500">free forever</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Ideal for individual birthday gifts and small circles of close family.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Included Capabilities
                  </span>
                  <ul className="space-y-2.5 text-xs text-stone-600">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>Up to <strong>6 contributors</strong> per birthday canvas</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>Up to <strong>5 celebration canvases</strong> active at once</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>Full photo upload and voice audio note recording</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>Classic Story presentation layout</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>Standard built-in celebration soundtracks</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <div className="w-full py-2.5 px-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-center text-xs font-semibold text-stone-500">
                  {!isProUser ? 'Your current active tier' : 'Standard baseline included'}
                </div>
              </div>
            </div>

            {/* TIER 2: PRO ATELIER LIFETIME PASS (7 Cols on LG - Featured Hero Card) */}
            <div className="lg:col-span-7 rounded-[2.5rem] border-2 border-amber-300/80 bg-gradient-to-br from-white via-amber-50/30 to-rose-50/20 p-6 sm:p-8 shadow-card flex flex-col justify-between relative overflow-hidden">
              {/* Paper tape accent */}
              <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 h-4 w-28 rounded-xs bg-amber-200/90 rotate-[1deg] shadow-xs" />
              {/* Background ambient glow */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />
              <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-rose-400/15 blur-2xl" />

              <div className="space-y-6 relative">
                <div className="flex items-center justify-between border-b border-amber-100 pb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center shadow-xs">
                      <Crown className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950">
                          Pro Atelier
                        </h3>
                        <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                          Lifetime Pass
                        </span>
                      </div>
                      <span className="font-serif italic text-xs text-amber-800">
                        complete creative liberty
                      </span>
                    </div>
                  </div>

                  {isProUser && (
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      Active Member
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl sm:text-4xl font-bold text-slate-950">
                      {offerLoading ? 'Loading...' : priceLabel}
                    </span>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                      Single Purchase
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Zero subscriptions. Pay once via Paystack and keep Pro on your account forever.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <p className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                      <InfinityIcon className="h-3.5 w-3.5 text-amber-600" />
                      <span>Unlimited Contributors</span>
                    </p>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Invite school classes, companies, or entire extended families with no limits.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <p className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-rose-600" />
                      <span>Full Custom Theme Engine</span>
                    </p>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Midpoint gradients, bespoke fonts, custom accents, and personalized vanity links.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <p className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                      <Layout className="h-3.5 w-3.5 text-amber-600" />
                      <span>Story, Freeform &amp; Bento</span>
                    </p>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Choose between fluid storytelling, freeform canvas, or interactive bento grid cards.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-3.5 shadow-2xs space-y-1">
                    <p className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-rose-600" />
                      <span>Secret PIN &amp; Automation</span>
                    </p>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Scheduled midnight deliveries, PIN access protection, and live creator analytics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkout Trigger */}
              <div className="pt-8 relative">
                {isProUser ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 w-full py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>Pro Atelier is active on your account</span>
                    </div>
                    <Link to="/themes" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto btn-press rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-5 py-3 shadow-xs">
                        Open Theme Studio
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={startCheckout}
                      disabled={checkoutLoading || verifyState === 'verifying'}
                      className="btn-press w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all"
                    >
                      {checkoutLoading || verifyState === 'verifying' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Securing Checkout Session...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-amber-100" />
                          <span>Unlock Pro Atelier with Paystack ({priceLabel})</span>
                          <ArrowRight className="h-4 w-4 text-amber-100" />
                        </>
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-3 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Encrypted by Paystack
                      </span>
                      <span>•</span>
                      <span>Cards, Bank Transfer, USSD</span>
                      <span>•</span>
                      <span>Instant verification</span>
                    </div>
                    <div className="pt-1 text-center">
                      <p className="text-[11px] text-stone-500">
                        Paid via bank transfer? Your atelier unlocks automatically within 1 to 2 minutes once confirmed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* BENTO VALUE PILLARS (Organized Craft Showcase) */}
          <div className="space-y-4 pt-4">
            <div className="border-b border-stone-200/80 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Atelier Standards
              </span>
              <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-1">
                Everything inside your Pro Atelier
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FEATURE_PILLARS.map((pillar) => {
                const IconComponent = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-[2rem] border border-stone-200/90 bg-white p-6 shadow-xs space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-slate-950 text-base">
                          {pillar.title}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {pillar.description}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-stone-600 pt-1 border-t border-stone-100">
                      {pillar.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ATELIER CONCIERGE & FREQUENT QUESTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {/* Left FAQ Box (7 Cols on LG) */}
            <div className="lg:col-span-7 rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-amber-800">
                <HelpCircle className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Frequently Clarified</span>
              </div>
              <h4 className="font-serif font-bold text-slate-950 text-xl">
                Common questions about Atelier perks
              </h4>

              <div className="space-y-3 pt-2 text-xs text-stone-600">
                <div className="rounded-2xl bg-stone-50/70 p-4 space-y-1">
                  <p className="font-bold text-slate-950">Is this truly a one-time payment?</p>
                  <p className="leading-relaxed text-stone-500">
                    Yes. We do not do monthly subscriptions. When you upgrade once, your creator account remains on Pro Atelier permanently.
                  </p>
                </div>

                <div className="rounded-2xl bg-stone-50/70 p-4 space-y-1">
                  <p className="font-bold text-slate-950">Do contributors need to pay anything?</p>
                  <p className="leading-relaxed text-stone-500">
                    Never. Friends, family, and coworkers who leave messages, voice recordings, or photos never need an account or payment.
                  </p>
                </div>

                <div className="rounded-2xl bg-stone-50/70 p-4 space-y-1">
                  <p className="font-bold text-slate-950">What happens to canvases created during the free tier?</p>
                  <p className="leading-relaxed text-stone-500">
                    All existing canvases are automatically upgraded with unlimited capacity, custom theme controls, and advanced view modes.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Concierge Support Box (5 Cols on LG) */}
            <div className="lg:col-span-5 rounded-[2.5rem] border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-rose-50/30 to-amber-50/50 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-white border border-amber-200 text-amber-800 flex items-center justify-center shadow-2xs">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Personal Atelier Service
                  </span>
                  <h4 className="font-serif font-bold text-slate-950 text-xl mt-0.5">
                    Concierge &amp; Corporate Inquiries
                  </h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Organizing a corporate milestone, wedding anniversary celebration, or have questions about custom payment methods? Our concierge is on standby.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-amber-200/60">
                <a
                  href="mailto:support@wishcanvas.art?subject=Atelier%20Billing%20Support"
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl border-amber-300 bg-white font-bold text-xs text-amber-950 hover:bg-amber-100/60 shadow-xs gap-2 py-3"
                  >
                    <Mail className="h-4 w-4 text-amber-700" />
                    <span>Contact Atelier Concierge</span>
                  </Button>
                </a>
                <p className="text-[11px] text-center text-stone-400">
                  Response within 24 hours: support@wishcanvas.art
                </p>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default UpgradePage;
