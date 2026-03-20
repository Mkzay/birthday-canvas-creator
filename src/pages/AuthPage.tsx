import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, User2 } from 'lucide-react';
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
};

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder = 'Enter your password',
}: PasswordFieldProps) => (
  <div>
    <Label htmlFor={id} className="text-foreground">
      {label}
    </Label>
    <div className="relative mt-2">
      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl border-border/80 bg-white pl-10 pr-12 shadow-sm"
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
  const [isLogin, setIsLogin] = useState(true);
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

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pendingSavePageId = searchParams.get('page');
  const shouldSaveAfterAuth = searchParams.get('save') === '1';
  const verifyToken = searchParams.get('verify');
  const resetToken = searchParams.get('reset');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!verifyToken) return;
    navigate(`/verify-email?token=${encodeURIComponent(verifyToken)}`, { replace: true });
  }, [navigate, verifyToken]);

  const toggleMode = () => {
    setIsLogin((current) => !current);
    setForgotMode(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
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
      toast.success('Verification email sent.');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Could not send verification email.';
      toast.error(message);
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
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

  const handleResetPassword = async (event: React.FormEvent) => {
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
      toast.success('Password reset complete. You are signed in.');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Reset link is invalid or expired.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
        const { error, code } = await signIn(email, password);
        if (error) {
          if (code === 'EMAIL_NOT_VERIFIED') {
            toast.error('Please verify your email before signing in.');
          } else if (error.message.includes('Invalid')) {
            toast.error('Invalid email or password');
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
        toast.success(message || 'Account created. Check your email to verify your account.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      toast.success('Account created! Welcome to WishCanvas!');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-hero px-6 py-10">
      <AnimatedBackground showWaves={true} showStars={true} className="opacity-80" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-16 h-52 w-52 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute right-[8%] top-1/3 h-72 w-72 rounded-full bg-white/6 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(20,10,36,0.08),rgba(20,10,36,0.18))]" />
      </div>

      <div className="relative grid w-full max-w-sm gap-8 sm:max-w-2xl md:max-w-4xl lg:max-w-[68rem] lg:grid-cols-[0.9fr_1.1fr] lg:items-center xl:max-w-[74rem]">
        <div className="hidden text-primary-foreground lg:block">
          <BrandLogo compact to="/" textClassName="text-2xl font-bold text-white" />

          <div className="mt-10 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              <Sparkles className="h-3.5 w-3.5" />
              Surprise-friendly setup
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Build the page before the group chat gets chaotic
            </h1>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/78">
              Create birthday pages that collect wishes, photos, and memory notes in one place, then reveal everything
              in a finished layout on the big day.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {[
              'Guests can contribute without creating an account',
              'Themes and covers make each page feel personal',
              'The final reveal feels like a keepsake, not a thread',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-primary-foreground/82 backdrop-blur-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full">
          <div className="relative mx-auto w-full max-w-[33rem] sm:max-w-[36rem] lg:max-w-[37rem]">
            <div className="absolute inset-0 rounded-[2rem] bg-white/18 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,253,0.92))] p-8 shadow-[0_32px_110px_rgba(18,18,23,0.24)] backdrop-blur-xl sm:p-10 md:px-12 md:py-11">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-foreground">
                  {resetToken ? 'Reset your password' : forgotMode ? 'Forgot your password?' : isLogin ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {resetToken
                    ? 'Set a new password to continue.'
                    : forgotMode
                      ? 'Enter your email and we will send a reset link.'
                      : isLogin
                        ? 'Sign in to manage your birthday pages'
                        : 'Start creating polished birthday surprises'}
                </p>
              </div>

              {resetToken ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <PasswordField
                    id="password"
                    label="New Password"
                    value={password}
                    onChange={setPassword}
                    showPassword={showPassword}
                    onToggleVisibility={() => setShowPassword((current) => !current)}
                  />
                  <PasswordField
                    id="confirmPassword"
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    showPassword={showConfirmPassword}
                    onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                    placeholder="Repeat your new password"
                  />

                  <Button type="submit" variant="hero" size="lg" className="mt-2 w-full" disabled={resetBusy}>
                    {resetBusy ? 'Please wait...' : 'Reset Password'}
                  </Button>
                </form>
              ) : forgotMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-foreground">
                      Email
                    </Label>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-12 rounded-xl border-border/80 bg-white pl-10 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="hero" size="lg" className="mt-2 w-full" disabled={resetBusy}>
                    {resetBusy ? 'Please wait...' : 'Send Reset Link'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <Label htmlFor="displayName" className="text-foreground">
                        Display Name
                      </Label>
                      <div className="relative mt-2">
                        <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="displayName"
                          type="text"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          placeholder="Your name"
                          className="h-12 rounded-xl border-border/80 bg-white pl-10 shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="email" className="text-foreground">
                      Email
                    </Label>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-12 rounded-xl border-border/80 bg-white pl-10 shadow-sm"
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
                  />

                  {!isLogin && (
                    <PasswordField
                      id="confirmPassword"
                      label="Confirm Password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      showPassword={showConfirmPassword}
                      onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                      placeholder="Repeat your password"
                    />
                  )}

                  <Button type="submit" variant="hero" size="lg" className="mt-2 w-full" disabled={loading}>
                    {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
              )}

              {!resetToken && (
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  {forgotMode ? (
                    <button
                      onClick={() => setForgotMode(false)}
                      className="font-medium text-foreground transition-opacity hover:opacity-75"
                      type="button"
                    >
                      Back to sign in
                    </button>
                  ) : (
                    <>
                      <button onClick={toggleMode} className="font-medium text-foreground transition-opacity hover:opacity-75" type="button">
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                      </button>
                      {isLogin && (
                        <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => setForgotMode(true)}
                            className="text-foreground/80 transition-opacity hover:opacity-75"
                          >
                            Forgot password?
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => void handleResendVerification()}
                            className="text-foreground/80 transition-opacity hover:opacity-75"
                            disabled={verificationBusy}
                          >
                            {verificationBusy ? 'Sending...' : 'Resend verification'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
