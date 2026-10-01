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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#FAF7F2] px-4 py-12 sm:px-6 text-slate-900">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-16 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute right-[8%] bottom-16 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-lg">
        <div className="relative rounded-[2.2rem] sm:rounded-[2.5rem] border border-stone-200/80 bg-white p-8 shadow-card-lg sm:p-10 text-slate-900">
          <div className="flex justify-center">
            <BrandLogo compact to="/" textClassName="text-2xl font-black text-slate-950" />
          </div>

          <div className="mt-8 text-center">
            {state === 'verifying' && (
              <div className="flex flex-col items-center gap-5">
                <div className="overflow-hidden rounded-2xl shadow-xs border border-stone-200/70">
                  <WishCanvasLoader className="relative min-h-[16rem] w-full max-w-[22rem]" />
                </div>
                <div>
                  <h1 className="font-playfair text-2xl font-extrabold text-slate-950 sm:text-3xl">Verifying your email</h1>
                  <p className="mt-2 text-sm text-slate-600">Please wait while we confirm your account.</p>
                </div>
              </div>
            )}

            {state === 'success' && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="mt-5 font-playfair text-2xl font-extrabold text-slate-950 sm:text-3xl">Email verified</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Your account is active. Taking you to your dashboard...
                </p>
                <Button
                  size="lg"
                  className="btn-press mt-6 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl hover:bg-slate-800"
                  onClick={() => navigate('/dashboard')}
                >
                  Continue to dashboard
                </Button>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
                  <MailWarning className="h-7 w-7" />
                </div>
                <h1 className="mt-5 font-playfair text-2xl font-extrabold text-slate-950 sm:text-3xl">Verification issue</h1>
                <p className="mt-2 text-sm text-slate-600">{errorMessage || 'This link is invalid or expired.'}</p>
                <div className="mt-6 grid gap-3">
                  <Button
                    size="lg"
                    className="btn-press w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl hover:bg-slate-800"
                    onClick={() => navigate('/auth')}
                  >
                    Go to sign in
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="btn-press w-full rounded-full border border-stone-200 bg-white py-6 text-sm font-bold text-slate-800 hover:bg-stone-50"
                    asChild
                  >
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
