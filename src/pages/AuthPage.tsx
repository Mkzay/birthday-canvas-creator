import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, User2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';

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
}: PasswordFieldProps) => {
  return (
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
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const toggleMode = () => {
    setIsLogin((current) => !current);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
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
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success('Welcome back!');
        navigate('/dashboard');
        return;
      }

      const { error } = await signUp(email, password, displayName);
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Try signing in instead.');
        } else {
          toast.error(error.message);
        }
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-16 h-52 w-52 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute right-[8%] top-1/3 h-72 w-72 rounded-full bg-white/6 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(20,10,36,0.08),rgba(20,10,36,0.18))]" />
      </div>

      <div className="relative grid w-full max-w-sm gap-8 sm:max-w-2xl md:max-w-4xl lg:max-w-[68rem] lg:grid-cols-[0.9fr_1.1fr] lg:items-center xl:max-w-[74rem]">
        <div className="hidden text-primary-foreground lg:block">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 text-2xl backdrop-blur-sm">
              🎨
            </div>
            <span className="text-2xl font-bold">WishCanvas</span>
          </Link>

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
                  {isLogin ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {isLogin ? 'Sign in to manage your birthday pages' : 'Start creating polished birthday surprises'}
                </p>
              </div>

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

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <button onClick={toggleMode} className="font-medium text-foreground transition-opacity hover:opacity-75" type="button">
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
