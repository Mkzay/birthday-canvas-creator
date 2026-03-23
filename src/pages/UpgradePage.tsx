import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Crown, Loader2, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProFeature = {
  id: string;
  title: string;
  status: 'live' | 'coming-soon';
};

type FeatureDetails = {
  summary: string;
  value: string;
};

const DEFAULT_FEATURES: ProFeature[] = [
  { id: 'unlimited-contributors', title: 'Unlimited contributors per page', status: 'live' },
  { id: 'scheduled-delivery', title: 'Scheduled delivery automation', status: 'live' },
  { id: 'advanced-view-modes', title: 'Advanced page view modes', status: 'live' },
  { id: 'advanced-custom-themes', title: 'Advanced custom theme tools', status: 'live' },
  { id: 'advanced-reveal-effects', title: 'Advanced reveal effects', status: 'coming-soon' },
  { id: 'privacy-controls', title: 'Private and secure options', status: 'coming-soon' },
  { id: 'creator-analytics', title: 'Creator analytics', status: 'live' },
  { id: 'vanity-links-branding', title: 'Custom branding and vanity links', status: 'live' },
  { id: 'team-collaboration', title: 'Team collaboration', status: 'coming-soon' },
  { id: 'keepsake-export', title: 'Export and keepsake features', status: 'coming-soon' },
  { id: 'priority-support', title: 'Priority support and recovery', status: 'coming-soon' },
];

const FEATURE_DETAILS: Record<string, FeatureDetails> = {
  'unlimited-contributors': {
    summary: 'Collect wishes from as many friends and family as you want.',
    value: 'No free-tier contributor cap on your birthday pages.',
  },
  'scheduled-delivery': {
    summary: 'Pick an exact future reveal date and time for each birthday page.',
    value: 'No manual midnight publish. Every reveal can be timed precisely.',
  },
  'advanced-view-modes': {
    summary: 'Choose Story, Freeform, or Bento page views as the organizer.',
    value: 'Shape the final viewing style instead of using one fixed layout.',
  },
  'advanced-custom-themes': {
    summary: 'Unlock premium theme controls like midpoint gradients, premium fonts, and theme icons.',
    value: 'Create richer visual styles without free-plan theme restrictions.',
  },
  'advanced-reveal-effects': {
    summary: 'More immersive reveal transitions and storytelling presentation.',
    value: 'Stronger emotional moment when the birthday page opens.',
  },
  'privacy-controls': {
    summary: 'Protect reveal pages with private access controls and audience restrictions.',
    value: 'Only invited recipients can open sensitive birthday memories.',
  },
  'creator-analytics': {
    summary: 'View page traffic and contributor activity from your dashboard.',
    value: 'See performance at a glance without guessing engagement.',
  },
  'vanity-links-branding': {
    summary: 'Use custom public links that match the event and person.',
    value: 'Cleaner, shareable links that feel personalized and premium.',
  },
  'team-collaboration': {
    summary: 'Multi-admin workflows for planning larger birthday campaigns.',
    value: 'Coordinate with helpers without sharing one account login.',
  },
  'keepsake-export': {
    summary: 'Keepsake exports are returning soon as a Pro capability.',
    value: 'This feature is currently incoming and will be re-enabled in a future release.',
  },
  'priority-support': {
    summary: 'Faster support and improved recovery help when issues happen.',
    value: 'Less downtime and quicker resolution for important events.',
  },
};

type VerifyState = 'idle' | 'verifying' | 'success' | 'failed';

const UpgradePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, refreshSession } = useAuth();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [offerLoading, setOfferLoading] = useState(true);
  const [priceLabel, setPriceLabel] = useState('N5,000 one-time');
  const [features, setFeatures] = useState<ProFeature[]>(DEFAULT_FEATURES);

  const paystackReference = useMemo(() => {
    return searchParams.get('reference') || searchParams.get('trxref');
  }, [searchParams]);

  const liveFeatures = useMemo(() => features.filter((feature) => feature.status === 'live'), [features]);
  const upcomingFeatures = useMemo(() => features.filter((feature) => feature.status === 'coming-soon'), [features]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

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
        setPriceLabel(`N${formatted} one-time`);
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
    if (user.planTier === 'pro') return;
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
        setVerifyMessage('Payment confirmed. Your account is now on Pro.');
        toast.success('Upgrade successful. Welcome to Pro!');

        searchParams.delete('reference');
        searchParams.delete('trxref');
        setSearchParams(searchParams, { replace: true });
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Could not verify payment.';
        setVerifyState('failed');
        setVerifyMessage(message);
        toast.error(message);
      }
    };

    void runVerify();
  }, [paystackReference, refreshSession, searchParams, setSearchParams, user, verifyState]);

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const data = await apiFetch<{
        authorizationUrl: string | null;
        alreadyPro?: boolean;
        message?: string;
      }>('/billing/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({ callbackPath: '/upgrade' }),
      });

      if (data.alreadyPro) {
        toast.success(data.message || 'You are already on Pro.');
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
    <div className="min-h-screen bg-background">
      <Header backTo={{ label: 'Back', useHistory: true, href: '/themes' }} />

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-rose-300/20 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800">
              <Crown className="h-3.5 w-3.5" />
              WishCanvas Pro
            </span>

            <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
              Unlock WishCanvas Pro forever
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              One payment, lifetime Pro. No subscription. Everything below is what your payment unlocks.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-emerald-300/40 bg-emerald-50/60 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/80">Included today</p>
                <div className="mt-3 grid gap-3">
                  {liveFeatures.map((feature) => {
                    const details = FEATURE_DETAILS[feature.id];
                    return (
                      <div key={feature.id} className="rounded-xl border border-emerald-200/70 bg-white/85 p-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Check className="h-4 w-4 text-emerald-600" />
                          {feature.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{details?.summary || 'Pro feature included in your plan.'}</p>
                        <p className="mt-1 text-xs font-medium text-emerald-800">{details?.value || 'Immediate value on every birthday page.'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!!upcomingFeatures.length && (
                <div className="rounded-2xl border border-amber-300/45 bg-amber-50/55 p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900/80">On the Pro roadmap</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {upcomingFeatures.map((feature) => {
                      const details = FEATURE_DETAILS[feature.id];
                      return (
                        <div key={feature.id} className="rounded-xl border border-amber-200/70 bg-white/85 p-3">
                          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Lock className="h-4 w-4 text-amber-700" />
                            {feature.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{details?.summary || 'Planned Pro enhancement.'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Free vs Pro at a glance</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                  <p className="font-medium text-foreground">Contributors per birthday page</p>
                  <p className="text-right text-muted-foreground">Free: 6 max · Pro: unlimited</p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                  <p className="font-medium text-foreground">Page link control</p>
                  <p className="text-right text-muted-foreground">Free: auto link · Pro: custom public link</p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                  <p className="font-medium text-foreground">Reveal control</p>
                  <p className="text-right text-muted-foreground">Free: birthday date · Pro: schedule + secret PIN</p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                  <p className="font-medium text-foreground">Page view modes</p>
                  <p className="text-right text-muted-foreground">Free: Story only · Pro: Story + Freeform + Bento</p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                  <p className="font-medium text-foreground">Analytics and keepsake export</p>
                  <p className="text-right text-muted-foreground">Free: not included · Pro: dashboard analytics (keepsake export incoming)</p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                  <p className="font-medium text-foreground">Custom themes</p>
                  <p className="text-right text-muted-foreground">Free: up to 3 themes · Pro: unlimited + premium options</p>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Plan</p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-2xl font-bold text-foreground">{offerLoading ? 'Loading...' : priceLabel}</p>
                <p className="pb-1 text-sm text-muted-foreground">Paystack one-time checkout</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Secure payment redirect. Your account upgrades to Pro after payment verification.</p>
            </div>

            {verifyMessage && (
              <div
                className={cn(
                  'mt-5 rounded-xl border p-3 text-sm',
                  verifyState === 'success' && 'border-emerald-300/60 bg-emerald-100/70 text-emerald-900',
                  verifyState === 'failed' && 'border-rose-300/60 bg-rose-100/70 text-rose-900',
                  verifyState === 'verifying' && 'border-amber-300/60 bg-amber-100/70 text-amber-900',
                )}
              >
                <p className="flex items-center gap-2">
                  {(verifyState === 'verifying' || checkoutLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {verifyState === 'success' && <Sparkles className="h-4 w-4" />}
                  {verifyState === 'failed' && <Lock className="h-4 w-4" />}
                  {verifyMessage}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="hero"
                size="lg"
                onClick={startCheckout}
                disabled={checkoutLoading || verifyState === 'verifying' || user?.planTier === 'pro'}
                className="gap-2"
              >
                {(checkoutLoading || verifyState === 'verifying') && <Loader2 className="h-4 w-4 animate-spin" />}
                {user?.planTier === 'pro' ? 'You are on Pro' : 'Upgrade with Paystack'}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default UpgradePage;
