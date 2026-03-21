import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import AnimatedBackground from '@/components/AnimatedBackground';
import BrandLogo from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import WishCanvasLoader from '@/components/WishCanvasLoader';

type VerifyState = 'verifying' | 'success' | 'error';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const [state, setState] = useState<VerifyState>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() || '';
  }, [location.search]);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    let active = true;
    setState('verifying');

    void (async () => {
      try {
        await apiFetch('/auth/verify/confirm', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        await refreshSession();
        if (!active) return;
        setState('success');
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Verification link is invalid or expired.';
        setErrorMessage(message);
        setState('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshSession, token]);

  useEffect(() => {
    if (state !== 'success') return;
    const timeout = window.setTimeout(() => {
      toast.success('Email verified. Redirecting to dashboard.');
      navigate('/dashboard');
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [navigate, state]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-hero px-6 py-10">
      <AnimatedBackground showWaves={true} showStars={true} className="opacity-80" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-16 h-52 w-52 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute right-[8%] top-1/3 h-72 w-72 rounded-full bg-white/6 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-lg">
        <div className="absolute inset-0 rounded-[2rem] bg-white/16 blur-2xl" />
        <div className="relative rounded-[2rem] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,253,0.92))] p-8 shadow-[0_32px_110px_rgba(18,18,23,0.24)] backdrop-blur-xl sm:p-10">
          <BrandLogo compact to="/" textClassName="text-xl font-semibold text-foreground" />

          <div className="mt-8 text-center">
            {state === 'verifying' && (
              <div className="flex flex-col items-center gap-5">
                <div className="overflow-hidden rounded-[1.5rem] shadow-[0_18px_55px_rgba(18,18,23,0.08)]">
                  <WishCanvasLoader className="relative min-h-[18rem] w-full max-w-[24rem]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Verifying your email</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your account.</p>
                </div>
              </div>
            )}

            {state === 'success' && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-foreground">Email verified</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your account is active. Taking you to your dashboard...
                </p>
                <Button variant="hero" size="lg" className="mt-6 w-full" onClick={() => navigate('/dashboard')}>
                  Continue to dashboard
                </Button>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <MailWarning className="h-6 w-6" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-foreground">Verification link issue</h1>
                <p className="mt-2 text-sm text-muted-foreground">{errorMessage || 'This link is invalid or expired.'}</p>
                <div className="mt-6 grid gap-3">
                  <Button variant="hero" size="lg" className="w-full" onClick={() => navigate('/auth')}>
                    Go to sign in
                  </Button>
                  <Button variant="outline" size="lg" className="w-full" asChild>
                    <Link to="/auth">Request a new verification email</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
