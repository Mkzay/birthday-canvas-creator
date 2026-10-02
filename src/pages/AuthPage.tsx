import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, User2, CheckCircle2, ArrowRight, ShieldCheck, Mic, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { z } from 'zod';
import AnimatedBackground from '@/components/AnimatedBackground';
import BrandLogo from '@/components/BrandLogo';
import { apiFetch } from '@/lib/api';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
  autoComplete?: string;
};

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder = 'Enter your password',
  autoComplete = 'current-password',
}: PasswordFieldProps) => (
  <div>
    <Label htmlFor={id} className="text-xs font-bold text-slate-800 uppercase tracking-wider">
      {label}
    </Label>
    <div className="relative mt-1.5">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-12 text-sm text-slate-900 shadow-xs transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15"
        required
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="btn-press absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-slate-800"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, refreshSession, user } = useAuth();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialMode = searchParams.get('mode') === 'signup' ? false : true;

  const [isLogin, setIsLogin] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [showVerificationResend, setShowVerificationResend] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [resetEmailSent, setResetEmailSent] = useState(false);

  const pendingSavePageId = searchParams.get('page');
  const shouldSaveAfterAuth = searchParams.get('save') === '1';
  const verifyToken = searchParams.get('verify');
  const resetToken = searchParams.get('reset');
  const claimToken = searchParams.get('claim_token');
  const claimPublicCode = searchParams.get('public_code');
  const urlEmail = searchParams.get('email');

  useEffect(() => {
    if (urlEmail && !email) {
      setEmail(urlEmail);
    }
  }, [urlEmail]);

  // Sync mode from search params if present
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup' || claimToken) {
      setIsLogin(false);
      setForgotMode(false);
      setResetEmailSent(false);
    } else if (mode === 'forgot') {
      setForgotMode(true);
      setIsLogin(true);
      setResetEmailSent(false);
    } else if (mode === 'login') {
      setIsLogin(true);
      setForgotMode(false);
      setResetEmailSent(false);
    }
  }, [searchParams, claimToken]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!verifyToken) return;
    navigate(`/verify-email?token=${encodeURIComponent(verifyToken)}`, { replace: true });
  }, [navigate, verifyToken]);

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setForgotMode(false);
    setResetEmailSent(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowVerificationResend(false);
  };

  const handleResendVerification = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error('Enter your account email, then try resend.');
      return;
    }

    setVerificationBusy(true);
    try {
      await apiFetch('/auth/verify/send', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast.success('Verification email sent. Check your inbox.');
      setShowVerificationResend(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Could not send verification email.';
      toast.error(message);
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleForgotPassword = async (event?: FormEvent) => {
    if (event) event.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    setResetBusy(true);
    try {
      await apiFetch('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast.success('Recovery link sent. Check your inbox.');
      setResetEmailSent(true);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Could not send password reset email.';
      toast.error(message);
    } finally {
      setResetBusy(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!resetToken) {
      toast.error('Reset token is missing.');
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setResetBusy(true);
    try {
      await apiFetch('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, password }),
      });
      await refreshSession();
      toast.success('Password reset complete. Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Reset link is invalid or expired.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error, code } = await signIn(email, password, rememberMe);
        if (error) {
          if (code === 'EMAIL_NOT_VERIFIED') {
            toast.error('Please verify your email before signing in.');
            setShowVerificationResend(true);
          } else if (error.message.includes('Invalid')) {
            toast.error('Invalid email or password.');
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success('Welcome back!');

        if (claimToken) {
          try {
            await apiFetch<{ success: boolean }>('/pages/claim', {
              method: 'POST',
              body: JSON.stringify({ claimToken }),
            });
            toast.success('Your celebration canvas has been claimed!');
          } catch (claimErr) {
            console.error('Failed to claim page on sign-in:', claimErr);
          }
        }

        if (shouldSaveAfterAuth && pendingSavePageId) {
          try {
            await apiFetch<void>(`/pages/${pendingSavePageId}/save`, { method: 'POST' });
            toast.success('Saved to your dashboard');
          } catch (saveError) {
            console.error(saveError);
          }
        }

        navigate('/dashboard');
        return;
      }

      const { error, requiresVerification, message } = await signUp(
        email,
        password,
        displayName,
        claimToken || undefined,
        claimPublicCode || undefined
      );
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Try signing in instead.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (requiresVerification) {
        toast.success(message || 'Account created! Please check your email to verify.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      toast.success(claimToken ? 'Account created and canvas claimed! Welcome to WishCanvas.' : 'Account created! Welcome to WishCanvas.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#FAF7F2] px-4 py-12 sm:px-6 text-slate-900">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-16 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute right-[8%] bottom-16 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 grid w-full max-w-sm gap-8 sm:max-w-xl md:max-w-3xl lg:max-w-5xl lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left Branding & Narrative Column (Desktop) */}
        <div className="hidden text-slate-900 lg:block lg:pr-8">
          <BrandLogo compact to="/" textClassName="text-2xl font-black text-slate-950" />

          {resetToken ? (
            <div className="mt-8 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                Account Security
              </span>
              <h1 className="mt-3 font-playfair text-4xl font-extrabold leading-[1.12] text-slate-950 xl:text-5xl">
                Choose your <br />
                <span className="italic font-normal text-rose-500">new password</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Create a strong password to protect your account and keep all your birthday memories safe.
              </p>

              <div className="card-lift mt-7 relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-white p-5 shadow-card">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Protected Account Access</h4>
                    <p className="text-xs text-slate-500">Verified single-use secure reset token</p>
                  </div>
                </div>
                <div className="mt-3.5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Instant automatic login upon saving</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>All your celebrations and voice notes stay intact</span>
                  </div>
                </div>
              </div>
            </div>
          ) : forgotMode ? (
            <div className="mt-8 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                Account Recovery
              </span>
              <h1 className="mt-3 font-playfair text-4xl font-extrabold leading-[1.12] text-slate-950 xl:text-5xl">
                Regain access to your <br />
                <span className="italic font-normal text-rose-500">celebrations</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Forgot your password? No worries. Enter your email and we will send a secure link to create a new one.
              </p>

              <div className="card-lift mt-7 relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-white p-5 shadow-card">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 shadow-xs">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Automated Magic Link</h4>
                    <p className="text-xs text-slate-500">Delivered straight to your inbox</p>
                  </div>
                </div>
                <div className="mt-3.5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Works on any mobile phone or browser</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Link expires automatically for your security</span>
                  </div>
                </div>
              </div>
            </div>
          ) : isLogin ? (
            <div className="mt-8 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                Returning Creator
              </span>
              <h1 className="mt-3 font-playfair text-4xl font-extrabold leading-[1.12] text-slate-950 xl:text-5xl">
                Welcome back to your <br />
                <span className="italic font-normal text-rose-500">celebrations</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Pick up right where you left off. Review incoming wishes, listen to voice notes, and prepare the midnight reveal.
              </p>

              {/* Tactile Mini Canvas Showcase Card */}
              <div className="card-lift mt-7 relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">Active Canvas: Maya's 30th</span>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200/70">
                    Unlocks at Midnight 🎂
                  </span>
                </div>
                
                <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-[#FAF7F2] p-3.5 border border-stone-200/70">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shadow-xs">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate">Uncle Femi's Voice Blessing</span>
                      <span className="text-[11px] text-slate-500 font-mono">0:34</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-rose-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex -space-x-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 border-2 border-white text-[10px] font-black text-amber-900 shadow-xs">DA</div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-200 border-2 border-white text-[10px] font-black text-rose-900 shadow-xs">KA</div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-200 border-2 border-white text-[10px] font-black text-purple-900 shadow-xs">TO</div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">18 contributors gathered</span>
                  </div>
                  <span className="text-xs font-caveat text-amber-800 font-bold">Live preview ◡̈</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                The Doorway to Magic
              </span>
              <h1 className="mt-3 font-playfair text-4xl font-extrabold leading-[1.12] text-slate-950 xl:text-5xl">
                Start something <br />
                <span className="italic font-normal text-rose-500">unforgettable</span> for them
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Create a collective birthday canvas in minutes. Friends leave voice notes, heartfelt photos, and memories with zero guest account required.
              </p>

              {/* Tactile Mini Canvas Showcase Card */}
              <div className="card-lift mt-7 relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800">How friends contribute</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200/70">
                    Zero Guest Signup
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-white p-4 border border-amber-200/60 shadow-xs">
                  <p className="font-caveat text-lg text-slate-800 leading-snug">
                    &ldquo;May this chapter bring you endless laughter, peace, and abundance. Happy birthday to the kindest soul!&rdquo;
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">From Sarah and Leo</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-600 shadow-xs border border-rose-100">
                      <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> Polaroid Wish
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-200/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Free to create</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-200/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Musical reveal</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Form Container */}
        <div className="w-full">
          <div className="relative mx-auto w-full max-w-[28rem] sm:max-w-[32rem]">
            <div className="relative rounded-[2rem] sm:rounded-[2.5rem] border border-stone-200/80 bg-white p-6 sm:p-9 shadow-card-lg text-slate-900">
              {/* Mobile Brand Logo */}
              <div className="mb-6 flex justify-center lg:hidden">
                <BrandLogo compact to="/" textClassName="text-xl font-black text-slate-950" />
              </div>

              {/* Canvas Claim Banner */}
              {claimToken && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs shadow-xs animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Claim Your Birthday Canvas</p>
                      <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                        Create your account (or sign in) to take full ownership of your canvas, moderate wishes, and edit settings anytime.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Segmented Switcher for Login / Signup with Emil Button Feedback */}
              {!resetToken && !forgotMode && (
                <div className="mb-6 flex rounded-2xl bg-stone-100 p-1.5 border border-stone-200/80">
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    className={`btn-press flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      isLogin
                        ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode(false)}
                    className={`btn-press flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      !isLogin
                        ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Card Title */}
              <div className="mb-6 text-center sm:text-left">
                <h2 className="font-playfair text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {resetToken
                    ? 'Reset Your Password'
                    : forgotMode
                    ? resetEmailSent
                      ? 'Recovery Link Sent'
                      : 'Forgot Password?'
                    : isLogin
                    ? 'Welcome Back'
                    : 'Start Your Canvas'}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
                  {resetToken
                    ? 'Choose a secure new password to continue.'
                    : forgotMode
                    ? resetEmailSent
                      ? 'Please check your email to proceed.'
                      : 'Enter your email and we will send a recovery link.'
                    : isLogin
                    ? 'Enter your details to access your celebrations.'
                    : 'Create your account to start a birthday surprise.'}
                </p>
              </div>

              {/* Form Content with Smooth Tab Crossfade */}
              <div key={resetToken ? 'reset' : forgotMode ? (resetEmailSent ? 'sent' : 'forgot') : isLogin ? 'login' : 'signup'} className="tab-crossfade">
                {/* Reset Password Form */}
                {resetToken ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <PasswordField
                      id="password"
                      label="New Password"
                      value={password}
                      onChange={setPassword}
                      showPassword={showPassword}
                      onToggleVisibility={() => setShowPassword((current) => !current)}
                      autoComplete="new-password"
                    />
                    <PasswordField
                      id="confirmPassword"
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      showPassword={showConfirmPassword}
                      onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="btn-press mt-3 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                      disabled={resetBusy}
                    >
                      {resetBusy ? 'Updating...' : 'Set New Password'}
                    </Button>
                  </form>
                ) : forgotMode ? (
                  resetEmailSent ? (
                    /* Sent Recovery Link Confirmation View */
                    <div className="py-2 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs border border-amber-200/70">
                        <Mail className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-playfair text-xl font-extrabold text-slate-950 sm:text-2xl">Check your inbox</h3>
                        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                          We sent a recovery link to <span className="font-bold text-slate-900">{email}</span>. Click the link in that email to set a new password.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 text-xs text-slate-600">
                        <p>If you do not see it within a minute, check your spam or junk folder.</p>
                      </div>

                      <div className="pt-2 space-y-2.5">
                        <Button
                          type="button"
                          onClick={() => void handleForgotPassword()}
                          disabled={resetBusy}
                          className="btn-press w-full rounded-full bg-slate-950 py-5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 disabled:opacity-60"
                        >
                          {resetBusy ? 'Resending...' : 'Resend recovery email'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotMode(false);
                            setResetEmailSent(false);
                          }}
                          className="font-bold text-xs text-amber-800 hover:text-amber-900 hover:underline pt-2 block mx-auto transition-colors"
                        >
                          &larr; Back to sign in
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Forgot Password Form */
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <Label htmlFor="email" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Account Email
                        </Label>
                        <div className="relative mt-1.5">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="h-12 rounded-xl border border-stone-200 bg-stone-50/60 pl-10 text-sm text-slate-900 shadow-xs transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15"
                            required
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="btn-press mt-3 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
                        disabled={resetBusy}
                      >
                        {resetBusy ? 'Sending...' : 'Send Recovery Link'}
                      </Button>
                    </form>
                  )
                ) : (
                  /* Main Login / Signup Form */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin ? (
                      /* Signup: Name and Email side-by-side in a responsive 2-column grid */
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="displayName" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Your Name
                          </Label>
                          <div className="relative mt-1.5">
                            <User2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <Input
                              id="displayName"
                              type="text"
                              value={displayName}
                              onChange={(event) => setDisplayName(event.target.value)}
                              placeholder="e.g. Tobi"
                              autoComplete="name"
                              className="h-12 rounded-xl border border-stone-200 bg-stone-50/60 pl-10 text-sm text-slate-900 shadow-xs transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Email Address
                          </Label>
                          <div className="relative mt-1.5">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="you@example.com"
                              autoComplete="email"
                              className="h-12 rounded-xl border border-stone-200 bg-stone-50/60 pl-10 text-sm text-slate-900 shadow-xs transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Login: Full-width Email */
                      <div>
                        <Label htmlFor="email" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Email Address
                        </Label>
                        <div className="relative mt-1.5">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="h-12 rounded-xl border border-stone-200 bg-stone-50/60 pl-10 text-sm text-slate-900 shadow-xs transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <PasswordField
                      id="password"
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      showPassword={showPassword}
                      onToggleVisibility={() => setShowPassword((current) => !current)}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />

                    {isLogin && (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            id="rememberMe"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                          />
                          <label
                            htmlFor="rememberMe"
                            className="cursor-pointer select-none font-medium text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            Remember this device
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => setForgotMode(true)}
                          className="font-bold text-amber-800 hover:text-amber-900 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="btn-press mt-3 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? (
                        'Please wait...'
                      ) : isLogin ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span>Sign In</span>
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <span>Create Free Account</span>
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>

              {/* Recovery and switch links */}
              {!resetToken && (
                <div className="mt-6 border-t border-stone-100 pt-5 text-center text-xs text-slate-600">
                  {forgotMode ? (
                    <button
                      onClick={() => {
                        setForgotMode(false);
                        setResetEmailSent(false);
                      }}
                      className="font-bold text-slate-900 hover:underline"
                      type="button"
                    >
                      &larr; Back to sign in
                    </button>
                  ) : (
                    <div>
                      {isLogin ? (
                        <p>
                          New to WishCanvas?{' '}
                          <button
                            onClick={() => toggleMode(false)}
                            className="font-bold text-amber-800 hover:text-amber-900 hover:underline"
                            type="button"
                          >
                            Create a free canvas
                          </button>
                        </p>
                      ) : (
                        <p>
                          Already have an account?{' '}
                          <button
                            onClick={() => toggleMode(true)}
                            className="font-bold text-amber-800 hover:text-amber-900 hover:underline"
                            type="button"
                          >
                            Sign in here
                          </button>
                        </p>
                      )}

                      {showVerificationResend && (
                        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-center shadow-xs">
                          <p className="text-amber-900 font-medium">
                            Your account needs email verification before signing in.
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleResendVerification()}
                            className="font-bold text-amber-800 underline hover:text-amber-900"
                            disabled={verificationBusy}
                          >
                            {verificationBusy ? 'Sending link...' : 'Resend verification link'}
                          </button>
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-stone-100 text-center">
                        <Link
                          to="/create"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-amber-900 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          <span>Just exploring? <span className="underline font-bold text-amber-800">Craft a Canvas as a Guest</span> without creating an account &rarr;</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom security reassurance */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Encrypted and secure &middot; Zero spam &middot; Private by default</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
