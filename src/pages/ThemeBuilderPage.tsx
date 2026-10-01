import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  ArrowLeft,
  Check,
  Crown,
  Eye,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Music,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { BrandMenuIcon } from '@/components/BrandIcons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ApiError, apiFetch, apiForm, resolveAssetUrl } from '@/lib/api';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { DashboardSidebar } from '@/pages/dashboardPage';
import type { BirthdayPage } from '@/pages/dashboardPage/types';
import type { CustomTheme } from '@/pages/theme-builder';
import {
  ANGLE_OPTIONS,
  EMOJI_OPTIONS,
  FONT_OPTIONS,
  FREE_THEME_LIMIT,
  PREMIUM_THEME_FONTS,
  buildGradient,
  fontClassForValue,
  fontLabelForValue,
  normalizeHex,
} from '@/pages/theme-builder';

const QUICK_ACCENTS = [
  { label: 'Rose Gold', color: '#f43f5e' },
  { label: 'Royal Amber', color: '#f59e0b' },
  { label: 'Emerald Sage', color: '#10b981' },
  { label: 'Midnight Sapphire', color: '#6366f1' },
  { label: 'Warm Champagne', color: '#d97706' },
  { label: 'Velvet Plum', color: '#a855f7' },
];

const ThemeBuilderPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  
  // App Shell navigation and sidebar state
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

  // Creator statistics
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<CustomTheme[]>([]);

  // Theme Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Sunset Serenade');
  const [emoji, setEmoji] = useState('🎨');
  const [gradientFrom, setGradientFrom] = useState('#f472b6');
  const [gradientTo, setGradientTo] = useState('#8b5cf6');
  const [gradientMid, setGradientMid] = useState('');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [font, setFont] = useState('playfair');
  const [showForm, setShowForm] = useState(true);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  const isProPlan = user?.planTier === 'pro' || Boolean(user?.is_pro || profile?.is_pro);
  const isFreeThemeLimitReached = !isProPlan && !editingId && themes.length >= FREE_THEME_LIMIT;

  const currentDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';
  const initial = currentDisplayName.charAt(0).toUpperCase();
  const avatarSrc = resolveAssetUrl(profile?.avatar_url);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchThemes = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<CustomTheme[]>('/themes');
      setThemes(data || []);
    } catch (error) {
      toast.error('Failed to load custom themes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<BirthdayPage[]>('/pages');
      setPages(data || []);
    } catch (error) {
      console.error('Failed to load stats for themes page', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchThemes();
      void fetchUserStats();
    }
  }, [fetchThemes, fetchUserStats, user]);

  const totalPages = pages.length;
  const totalWishes = pages.reduce((acc, p) => acc + (p.message_count || 0), 0);
  const activePages = pages.filter((p) => p.status === 'active').length;
  const deliveredPages = pages.filter((p) => p.status === 'delivered').length;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmoji('🎨');
    setGradientFrom('#f472b6');
    setGradientTo('#8b5cf6');
    setGradientMid('');
    setGradientAngle(135);
    setAccentColor('#f59e0b');
    setFont('playfair');
    setIconUrl(null);
    setShowForm(false);
  };

  const startNewTheme = () => {
    setEditingId(null);
    setName('New Keepsake Theme');
    setEmoji('✨');
    setGradientFrom('#f472b6');
    setGradientTo('#8b5cf6');
    setGradientMid('');
    setGradientAngle(135);
    setAccentColor('#f59e0b');
    setFont('playfair');
    setIconUrl(null);
    setShowForm(true);
  };

  const handleEdit = (theme: CustomTheme) => {
    setEditingId(theme.id);
    setName(theme.name);
    setEmoji(theme.emoji);
    setGradientFrom(theme.gradient_from);
    setGradientTo(theme.gradient_to);
    setGradientMid(theme.gradient_mid || '');
    setGradientAngle(theme.gradient_angle || 135);
    setAccentColor(theme.accent_color || '');
    const normalizedFont = theme.font === 'sans' ? 'jakarta' : theme.font === 'serif' ? 'playfair' : theme.font;
    setFont(normalizedFont || 'jakarta');
    setIconUrl(theme.icon_url || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    if (!editingId && !isProPlan && themes.length >= FREE_THEME_LIMIT) {
      toast.error(`Free tier supports up to ${FREE_THEME_LIMIT} custom themes. Upgrade to Pro for unlimited themes.`);
      return;
    }

    if (!isProPlan && gradientMid) {
      toast.error('Midpoint gradients are available on Pro.');
      return;
    }

    if (!isProPlan && PREMIUM_THEME_FONTS.has(font)) {
      toast.error('That font is part of Pro Atelier.');
      return;
    }

    if (!isProPlan && iconUrl) {
      toast.error('Theme icon upload is available on Pro.');
      return;
    }

    setSaving(true);

    const payload = {
      name,
      emoji,
      gradientFrom,
      gradientTo,
      gradientMid: gradientMid || null,
      gradientAngle,
      accentColor: accentColor || null,
      font,
      iconUrl: iconUrl || null,
    };

    if (editingId) {
      try {
        await apiFetch(`/themes/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Custom theme updated successfully');
        void fetchThemes();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : 'Failed to update theme');
        console.error(error);
      }
    } else {
      try {
        await apiFetch('/themes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('New custom theme crafted and saved!');
        void fetchThemes();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : 'Failed to create theme');
        console.error(error);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch<void>(`/themes/${id}`, {
        method: 'DELETE',
      });
      toast.success('Theme deleted from your atelier');
      setThemes((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      toast.error('Failed to delete theme');
      console.error(error);
    }
  };

  const previewGradient = buildGradient(gradientFrom, gradientTo, gradientMid || null, gradientAngle);

  const handleIconFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isProPlan) {
      toast.error('Theme icon upload is available on Pro.');
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await apiForm<{ url: string }>('/uploads/theme-icon', formData);
      setIconUrl(data.url);
      toast.success('Theme icon uploaded');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof ApiError ? error.message : 'Failed to upload icon');
    } finally {
      event.target.value = '';
    }
  };

  if (loading || authLoading) {
    return <WishCanvasLoader />;
  }

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-slate-900 selection:bg-amber-200 selection:text-amber-900 flex overflow-hidden">
      {/* Background Celebratory Glows identical to Dashboard, Settings, Billing */}
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
        isProUser={isProPlan}
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
            isProUser={isProPlan}
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
                Custom Theme Studio
              </span>
            </div>
          </div>

          {/* Quick Metrics & User Chip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="hidden sm:flex items-center gap-4 border-r border-stone-200 pr-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Custom Themes
                </span>
                <p className="font-serif font-bold text-amber-800 text-sm">
                  {themes.length} {isProPlan ? 'Crafted' : `/ ${FREE_THEME_LIMIT}`}
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
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-7 max-w-7xl w-full mx-auto">
          
          {/* Creator Greeting & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Bespoke Theme Studio <span className="italic text-rose-500">&amp; Color Lab</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">artisan palettes</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-2xl leading-relaxed">
                Design signature gradient atmospheres, curated typography, and customized seals for your celebration canvases.
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
              {!showForm ? (
                <Button
                  size="sm"
                  onClick={startNewTheme}
                  disabled={isFreeThemeLimitReached}
                  className="btn-press gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Plus className="h-4 w-4 text-amber-100" />
                  Craft New Theme
                </Button>
              ) : (
                <Link to="/create">
                  <Button
                    size="sm"
                    className="btn-press gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-amber-100" />
                    Craft Canvas
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Tier Limit Reminder Banner (if approaching free cap) */}
          {!isProPlan && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-950 font-medium">
                <Crown className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  Free Creator tier includes up to {FREE_THEME_LIMIT} custom themes ({themes.length} crafted). Upgrade to Pro Atelier for unlimited themes, midpoint gradients, and premium Google fonts.
                </span>
              </div>
              <Link to="/billing" className="shrink-0">
                <Button size="sm" variant="outline" className="rounded-xl border-amber-300 bg-white font-bold text-xs text-amber-900 hover:bg-amber-100/60 shadow-xs h-8 px-3">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          )}

          {/* 2-COLUMN ARTISAN WORKBENCH */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: THEME PALETTE CONTROLS (7 Cols on LG) */}
            <div className="lg:col-span-7 space-y-6">
              
              {showForm ? (
                <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/90 bg-white p-6 sm:p-8 shadow-card space-y-8">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

                  {/* Form Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        {editingId ? 'Refining Palette' : 'New Theme Creation'}
                      </span>
                      <h3 className="font-serif text-2xl font-bold tracking-tight text-slate-950 mt-0.5">
                        {editingId ? `Edit: ${name || 'Theme'}` : 'Craft Custom Atmosphere'}
                      </h3>
                    </div>
                    {editingId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetForm}
                        className="rounded-xl text-stone-500 hover:text-slate-950 text-xs gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Cancel Edit</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Theme Name & Emoji Seal */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                      <div className="sm:col-span-8 space-y-2">
                        <Label htmlFor="theme-name" className="text-xs font-bold text-slate-900">
                          Theme Name
                        </Label>
                        <Input
                          id="theme-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Midnight Velvet, Royal Amber"
                          className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 text-xs sm:text-sm font-medium"
                          maxLength={32}
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-2">
                        <Label className="text-xs font-bold text-slate-900">
                          Active Seal
                        </Label>
                        <div className="h-10 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-center text-xl shadow-2xs">
                          {emoji}
                        </div>
                      </div>
                    </div>

                    {/* Emoji Seal Picker */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-stone-600">
                        Choose Celebratory Seal Emoji
                      </Label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-stone-50 border border-stone-200/80">
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setEmoji(e)}
                            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                              emoji === e
                                ? 'bg-white border-2 border-amber-500 shadow-xs scale-105'
                                : 'hover:bg-white/80 text-stone-700'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gradient Lab */}
                    <div className="space-y-3 pt-2 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900">
                          Gradient Color Palette
                        </Label>
                        {!gradientMid && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isProPlan) {
                                toast.error('Midpoint color gradients are unlocked on Pro Atelier.');
                                return;
                              }
                              setGradientMid('#a855f7');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900"
                          >
                            {!isProPlan && <Lock className="h-3 w-3 text-amber-700" />}
                            <span>+ Add Midpoint Color</span>
                          </button>
                        )}
                      </div>

                      <div className={`grid gap-3 ${gradientMid ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {/* Start Color */}
                        <div className="p-3 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            1. Start Color
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={normalizeHex(gradientFrom) || '#f472b6'}
                              onChange={(e) => setGradientFrom(normalizeHex(e.target.value))}
                              className="h-9 w-9 rounded-xl cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                            />
                            <Input
                              value={gradientFrom}
                              onChange={(e) => setGradientFrom(normalizeHex(e.target.value))}
                              className="font-mono text-xs uppercase h-9 rounded-xl border-stone-200"
                              maxLength={7}
                            />
                          </div>
                        </div>

                        {/* Midpoint Color (Optional/Pro) */}
                        {gradientMid && (
                          <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1.5 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                2. Midpoint
                              </span>
                              <button
                                type="button"
                                onClick={() => setGradientMid('')}
                                className="text-[10px] font-bold text-stone-400 hover:text-rose-600"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={normalizeHex(gradientMid) || '#ffffff'}
                                onChange={(e) => setGradientMid(normalizeHex(e.target.value))}
                                className="h-9 w-9 rounded-xl cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                              />
                              <Input
                                value={gradientMid}
                                onChange={(e) => setGradientMid(normalizeHex(e.target.value))}
                                className="font-mono text-xs uppercase h-9 rounded-xl border-stone-200"
                                maxLength={7}
                              />
                            </div>
                          </div>
                        )}

                        {/* End Color */}
                        <div className="p-3 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            {gradientMid ? '3. End Color' : '2. End Color'}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={normalizeHex(gradientTo) || '#8b5cf6'}
                              onChange={(e) => setGradientTo(normalizeHex(e.target.value))}
                              className="h-9 w-9 rounded-xl cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                            />
                            <Input
                              value={gradientTo}
                              onChange={(e) => setGradientTo(normalizeHex(e.target.value))}
                              className="font-mono text-xs uppercase h-9 rounded-xl border-stone-200"
                              maxLength={7}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Angle Direction */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-900">
                        Gradient Angle Direction ({gradientAngle}°)
                      </Label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {ANGLE_OPTIONS.map((a) => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => setGradientAngle(a.value)}
                            className={`h-10 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all ${
                              gradientAngle === a.value
                                ? 'bg-slate-950 text-white shadow-xs scale-105'
                                : 'bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700'
                            }`}
                          >
                            <span className="text-sm leading-none">{a.label}</span>
                            <span className="text-[9px] opacity-75">{a.value}°</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accent Color Selection with Quick Presets */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold text-slate-900">
                            Accent Color (Buttons &amp; Highlights)
                          </Label>
                          <p className="text-[11px] text-stone-400">
                            Tint for interactive buttons, audio visualizers, and keepsake seals.
                          </p>
                        </div>
                        {accentColor && (
                          <button
                            type="button"
                            onClick={() => setAccentColor('')}
                            className="text-[11px] font-bold text-stone-400 hover:text-stone-700"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-2 mr-2">
                          <input
                            type="color"
                            value={normalizeHex(accentColor || '#f59e0b')}
                            onChange={(e) => setAccentColor(normalizeHex(e.target.value))}
                            className="h-8 w-8 rounded-xl cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                          />
                          <Input
                            value={accentColor}
                            onChange={(e) => setAccentColor(normalizeHex(e.target.value))}
                            placeholder="#f59e0b"
                            className="w-24 font-mono text-xs uppercase h-8 rounded-xl border-stone-200"
                            maxLength={7}
                          />
                        </div>

                        {QUICK_ACCENTS.map((preset) => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => setAccentColor(preset.color)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all ${
                              accentColor.toLowerCase() === preset.color.toLowerCase()
                                ? 'border-slate-950 bg-stone-100 text-slate-950 font-bold'
                                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Typography Style */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <Label className="text-xs font-bold text-slate-900">
                        Keepsake Typography &amp; Font Family
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {FONT_OPTIONS.map((f) => {
                          const isPremiumFont = PREMIUM_THEME_FONTS.has(f.value);
                          const isLocked = !isProPlan && isPremiumFont;

                          return (
                            <button
                              key={f.value}
                              type="button"
                              onClick={() => {
                                if (isLocked) {
                                  toast.error('This font is included in Pro Atelier.');
                                  return;
                                }
                                setFont(f.value);
                              }}
                              className={`p-3 rounded-2xl border text-left transition-all relative ${
                                isLocked ? 'opacity-60 bg-stone-50 cursor-not-allowed' : ''
                              } ${
                                font === f.value
                                  ? 'border-amber-500 bg-amber-50/50 shadow-2xs ring-2 ring-amber-400/20'
                                  : 'border-stone-200 bg-stone-50/30 hover:bg-stone-50 hover:border-stone-300'
                              }`}
                              disabled={isLocked}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-stone-600">
                                  {f.label}
                                </span>
                                {isLocked && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                                    <Lock className="h-3 w-3" />
                                    PRO
                                  </span>
                                )}
                                {font === f.value && (
                                  <span className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <span className={cn('block text-base font-bold text-slate-950', f.className)}>
                                {f.sample}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pro Custom Seal Icon Upload */}
                    <div className="pt-2 border-t border-stone-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold text-slate-900">
                            Custom Emblem or Seal Image (Optional)
                          </Label>
                          <p className="text-[11px] text-stone-400">
                            Replaces the default emoji seal with your uploaded monogram or family crest.
                          </p>
                        </div>
                        {!isProPlan && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                            <Crown className="h-3 w-3" />
                            PRO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <div className="relative h-12 w-12 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center shadow-2xs overflow-hidden">
                          {iconUrl ? (
                            <img src={iconUrl} alt="Seal icon" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl">{emoji}</span>
                          )}
                        </div>

                        <input
                          id="theme-icon-file"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIconFileChange}
                          disabled={!isProPlan}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-stone-200 text-xs font-semibold gap-1.5"
                          onClick={() => document.getElementById('theme-icon-file')?.click()}
                          disabled={!isProPlan}
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-stone-500" />
                          <span>{iconUrl ? 'Change Emblem' : 'Upload Custom Emblem'}</span>
                        </Button>

                        {iconUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs gap-1"
                            onClick={() => setIconUrl(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="rounded-2xl border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 px-5"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-press rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs px-6 py-2.5 shadow-md shadow-amber-500/25 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Saving Palette...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-amber-100" />
                          <span>{editingId ? 'Update Theme' : 'Save Custom Theme'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[2.5rem] border border-dashed border-stone-300 p-8 text-center bg-white/70 space-y-4 shadow-xs">
                  <div className="h-16 w-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto text-3xl shadow-xs">
                    🎨
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-slate-950">
                      Craft a New Signature Palette
                    </h3>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                      Pick your own gradient flow, typography, and accent colors to give celebrations a tailored aesthetic.
                    </p>
                  </div>
                  <Button
                    onClick={startNewTheme}
                    disabled={isFreeThemeLimitReached}
                    className="btn-press rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-6 py-2.5 shadow-card gap-2"
                  >
                    <Plus className="h-4 w-4 text-amber-400" />
                    <span>Open Theme Creator</span>
                  </Button>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: LIVE SIMULATION STAGE & SAVED PALETTES (5 Cols on LG) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              
              {/* LIVE SIMULATION CANVAS STAGE */}
              <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-amber-600" />
                    Live Canvas Simulation
                  </span>
                  <span className="text-[11px] font-serif italic text-stone-500">
                    real celebrant preview
                  </span>
                </div>

                {/* Simulated Birthday Keepsake Card */}
                <div
                  className="rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-lg text-white transition-all duration-300 min-h-[320px] flex flex-col justify-between"
                  style={{ background: previewGradient }}
                >
                  {/* Subtle top glare */}
                  <div className="pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-white/20 blur-xl" />

                  {/* Header with seal */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-md">
                      {iconUrl ? (
                        <img src={iconUrl} alt="Theme seal" className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        <span className="text-2xl">{emoji}</span>
                      )}
                    </div>
                    <span className="rounded-full bg-black/25 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 border border-white/20">
                      Celebration Canvas
                    </span>
                  </div>

                  {/* Sample celebrant headline */}
                  <div className="my-6 relative z-10 space-y-2">
                    <p className="text-xs uppercase tracking-widest text-white/80 font-medium">
                      Milestone Keepsake
                    </p>
                    <h3 className={cn('text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md text-white', fontClassForValue(font))}>
                      Happy 30th Birthday, Chi!
                    </h3>
                    <p className="text-xs text-white/90 leading-relaxed max-w-xs drop-shadow-sm font-sans">
                      May your year be filled with immense warmth, laughter, and endless adventure.
                    </p>
                  </div>

                  {/* Sample Interactive Button & Pill with Accent */}
                  <div className="relative z-10 pt-4 border-t border-white/25 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                      <Heart className="h-3.5 w-3.5 fill-white" />
                      <span>28 Heartfelt Wishes</span>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                      style={{
                        backgroundColor: accentColor || '#f59e0b',
                        boxShadow: `0 4px 14px ${accentColor || '#f59e0b'}55`,
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Sign Canvas</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 text-center leading-relaxed">
                  Reflects the exact gradient angle, seal, typography font, and accent buttons seen by recipients and contributors.
                </div>
              </div>

              {/* SAVED CUSTOM PALETTES GALLERY */}
              <div className="rounded-[2.5rem] border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-amber-700" />
                    <h4 className="font-serif font-bold text-slate-950 text-base">
                      Your Theme Atelier ({themes.length})
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {isProPlan ? 'Unlimited' : `${themes.length} of ${FREE_THEME_LIMIT}`}
                  </span>
                </div>

                {themes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500 space-y-2">
                    <p>No custom themes created yet.</p>
                    <p className="text-[11px] text-stone-400">
                      Use the studio form on the left to design your first signature celebration palette.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {themes.map((theme) => {
                      const themeGradient = buildGradient(
                        theme.gradient_from,
                        theme.gradient_to,
                        theme.gradient_mid,
                        theme.gradient_angle || 135,
                      );
                      const isCurrentlyEditing = editingId === theme.id;

                      return (
                        <div
                          key={theme.id}
                          className={`rounded-2xl border p-3 flex items-center justify-between gap-3 transition-all ${
                            isCurrentlyEditing
                              ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                              : 'border-stone-200/90 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Swatch disc */}
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-2xs shrink-0 relative overflow-hidden"
                              style={{ background: themeGradient }}
                            >
                              {theme.icon_url ? (
                                <img src={theme.icon_url} alt={theme.name} className="h-full w-full object-cover" />
                              ) : (
                                <span>{theme.emoji}</span>
                              )}
                              {theme.accent_color && (
                                <div
                                  className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white"
                                  style={{ backgroundColor: theme.accent_color }}
                                />
                              )}
                            </div>

                            <div className="truncate">
                              <p className={cn('text-xs font-bold text-slate-950 truncate', fontClassForValue(theme.font))}>
                                {theme.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                                <span>{fontLabelForValue(theme.font)}</span>
                                <span>•</span>
                                <span>{theme.gradient_angle || 135}°</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(theme)}
                              className="rounded-xl border-stone-200 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 h-8 px-2.5"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(theme.id)}
                              className="h-8 w-8 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete theme"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default ThemeBuilderPage;
