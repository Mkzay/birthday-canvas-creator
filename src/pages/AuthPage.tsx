import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, User2, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <Label htmlFor={id} className="text-xs font-bold text-foreground uppercase tracking-wider">
      {label}
    </Label>
    <div className="relative mt-1.5">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 rounded-xl border-border/80 bg-background pl-10 pr-12 text-sm shadow-xs transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        required
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

  const pendingSavePageId = searchParams.get('page');
  const shouldSaveAfterAuth = searchParams.get('save') === '1';
  const verifyToken = searchParams.get('verify');
  const resetToken = searchParams.get('reset');

  // Sync mode from search params if present
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

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

  const handleForgotPassword = async (event: FormEvent) => {
    event.preventDefault();

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
      toast.success('If that email exists, a password reset link has been sent.');
      setForgotMode(false);
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

    if (!isLogin && password !== confirmPassword) {
      toast.error('Passwords do not match');
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

      const { error, requiresVerification, message } = await signUp(email, password, displayName);
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

      toast.success('Account created! Welcome to WishCanvas.');
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
        <div className="hidden text-slate-900 lg:block lg:pr-6">
          <BrandLogo compact to="/" textClassName="text-2xl font-black text-slate-950" />

          {isLogin ? (
            <div className="mt-10 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                Returning Creator
              </span>
              <h1 className="mt-3 font-playfair text-4xl font-extrabold leading-tight text-slate-950 xl:text-5xl">
                Welcome back to your birthday canvas
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Your celebrations, gathered memories, and contributor voice notes are right where you left them.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
                  <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-slate-700">Track incoming messages and audio notes in real time</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
                  <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-slate-700">Reorder slides and moderate memories before midnight</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
                The Doorway to Magic
              </span>
              <h1 className="mt-3 font-playfair text-4xl font-extrabold leading-tight text-slate-950 xl:text-5xl">
                Start something magical for someone you love
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Create a personalized birthday canvas in 2 minutes. Free to start, no credit card required.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
                  <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-slate-700">Free to create and gather wishes from close circles</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
                  <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-slate-700">Guests contribute voice notes and photos without an account</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
                  <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-slate-700">Sealed with a countdown until their birthday arrives</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Form Container */}
        <div className="w-full">
          <div className="relative mx-auto w-full max-w-[28rem] sm:max-w-[32rem]">
            <div className="relative rounded-[2.5rem] border border-stone-200/80 bg-white p-6 sm:p-9 shadow-2xl text-foreground">
              {/* Mobile Brand Logo */}
              <div className="mb-6 flex justify-center lg:hidden">
                <BrandLogo compact to="/" textClassName="text-xl font-black text-foreground" />
              </div>

              {/* Segmented Switcher for Login / Signup */}
              {!resetToken && !forgotMode && (
                <div className="mb-6 flex rounded-xl bg-muted/60 p-1 border border-border/60">
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      isLogin
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode(false)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      !isLogin
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Card Title */}
              <div className="mb-6 text-center sm:text-left">
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {resetToken
                    ? 'Reset Your Password'
                    : forgotMode
                    ? 'Forgot Password?'
                    : isLogin
                    ? 'Welcome Back'
                    : 'Start Your Canvas'}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  {resetToken
                    ? 'Choose a secure new password to continue.'
                    : forgotMode
                    ? 'Enter your email and we will send a recovery link.'
                    : isLogin
                    ? 'Enter your details to access your celebrations.'
                    : 'Create your account to start a birthday surprise.'}
                </p>
              </div>

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
                    className="mt-3 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-98"
                    disabled={resetBusy}
                  >
                    {resetBusy ? 'Updating...' : 'Set New Password'}
                  </Button>
                </form>
              ) : forgotMode ? (
                /* Forgot Password Form */
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Account Email
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-12 rounded-xl border-border/80 bg-background pl-10 text-sm shadow-xs transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-3 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-98"
                    disabled={resetBusy}
                  >
                    {resetBusy ? 'Sending...' : 'Send Recovery Link'}
                  </Button>
                </form>
              ) : (
                /* Main Login / Signup Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <Label htmlFor="displayName" className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Your Name
                      </Label>
                      <div className="relative mt-1.5">
                        <User2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="displayName"
                          type="text"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          placeholder="e.g. Tobi"
                          autoComplete="name"
                          className="h-12 rounded-xl border-border/80 bg-background pl-10 text-sm shadow-xs transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="email" className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Email Address
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-12 rounded-xl border-border/80 bg-background pl-10 text-sm shadow-xs transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        required
                      />
                    </div>
                  </div>

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
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(event) => setRememberMe(event.target.checked)}
                          className="h-4 w-4 rounded border-border text-amber-500 focus:ring-amber-400"
                        />
                        <span>Remember this device</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="font-bold text-amber-600 hover:text-amber-500 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {!isLogin && (
                    <PasswordField
                      id="confirmPassword"
                      label="Confirm Password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      showPassword={showConfirmPassword}
                      onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-3 w-full rounded-full bg-slate-950 py-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:bg-slate-800 active:scale-98"
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

              {/* Recovery and switch links */}
              {!resetToken && (
                <div className="mt-6 border-t border-border/50 pt-5 text-center text-xs text-muted-foreground">
                  {forgotMode ? (
                    <button
                      onClick={() => setForgotMode(false)}
                      className="font-bold text-foreground hover:underline"
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
                            className="font-bold text-amber-600 hover:underline"
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
                            className="font-bold text-amber-600 hover:underline"
                            type="button"
                          >
                            Sign in here
                          </button>
                        </p>
                      )}

                      {showVerificationResend && (
                        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-center">
                          <p className="text-amber-900 font-medium">
                            Your account needs email verification before signing in.
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleResendVerification()}
                            className="font-bold text-amber-700 underline hover:text-amber-800"
                            disabled={verificationBusy}
                          >
                            {verificationBusy ? 'Sending link...' : 'Resend verification link'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom security reassurance */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Private & safe &middot; Encrypted connections</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
