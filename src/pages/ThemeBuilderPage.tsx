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
  ChevronDown,
  ChevronUp,
  Compass,
  Crown,
  Eye,
  Heart,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
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

type InspectorTab = 'colors' | 'typography' | 'details';
type StudioView = 'studio' | 'gallery';

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
  const { user, profile, isPro, loading: authLoading, signOut } = useAuth();
  
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

  // Studio View: 'studio' (Split Studio) or 'gallery' (Saved Themes List)
  const [activeView, setActiveView] = useState<StudioView>('studio');
  // Inspector Tab inside Studio
  const [activeTab, setActiveTab] = useState<InspectorTab>('colors');

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
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const isProPlan = isPro;
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
    setName('Sunset Serenade');
    setEmoji('🎨');
    setGradientFrom('#f472b6');
    setGradientTo('#8b5cf6');
    setGradientMid('');
    setGradientAngle(135);
    setAccentColor('#f59e0b');
    setFont('playfair');
    setIconUrl(null);
    setActiveTab('colors');
  };

  const startNewTheme = () => {
    resetForm();
    setName('New Keepsake Theme');
    setEmoji('✨');
    setActiveView('studio');
    setActiveTab('colors');
  };

  const handleEdit = (theme: CustomTheme) => {
    setEditingId(theme.id);
    setName(theme.name);
    setEmoji(theme.emoji);
    setGradientFrom(theme.gradient_from);
    setGradientTo(theme.gradient_to);
    setGradientMid(theme.gradient_mid || '');
    setGradientAngle(theme.gradient_angle || 135);
    setAccentColor(theme.accent_color || '#f59e0b');
    const normalizedFont = theme.font === 'sans' ? 'jakarta' : theme.font === 'serif' ? 'playfair' : theme.font;
    setFont(normalizedFont || 'jakarta');
    setIconUrl(theme.icon_url || null);
    setActiveView('studio');
    setActiveTab('colors');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a theme name');
      setActiveTab('details');
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        
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

        {/* Main Workbench Body */}
        <main className="flex-1 p-4 sm:p-7 lg:p-8 space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
          
          {/* Creator Greeting & Mode Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Theme Studio <span className="italic text-rose-500">&amp; Color Lab</span>
                </h1>
                <span className="font-handwriting text-xl text-amber-800">interactive atelier</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
                Design signature gradient atmospheres and test them live against an authentic celebration card.
              </p>
            </div>

            {/* Mode Switcher Pills (Studio Workbench vs Saved Palettes) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
              <div className="flex items-center p-1 bg-stone-200/70 rounded-2xl border border-stone-300/60 shadow-2xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveView('studio')}
                  className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeView === 'studio'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-stone-600 hover:text-slate-950'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Studio Workbench</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('gallery')}
                  className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeView === 'gallery'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-stone-600 hover:text-slate-950'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Saved Palettes ({themes.length})</span>
                </button>
              </div>

              <Link to="/create" className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="btn-press gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all w-full sm:w-auto justify-center"
                >
                  <Sparkles className="h-4 w-4 text-amber-100 shrink-0" />
                  <span>Craft Canvas</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* VIEW 1: ZERO-SCROLL SPLIT STUDIO (Canvas on Left, Tabbed Inspector on Right) */}
          {activeView === 'studio' && (
            <div className="space-y-6">
              
              {/* Pro / Limit Notice Pill */}
              {!isProPlan && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-amber-950 font-medium">
                    <Crown className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>
                      Free Creator Tier: {themes.length} of {FREE_THEME_LIMIT} custom themes used. Upgrade to Pro Atelier for unlimited themes and midpoint gradients.
                    </span>
                  </div>
                  <Link to="/billing" className="shrink-0">
                    <Button size="sm" variant="outline" className="rounded-xl border-amber-300 bg-white font-bold text-[11px] text-amber-900 hover:bg-amber-100/60 shadow-xs h-7 px-2.5">
                      Upgrade to Pro
                    </Button>
                  </Link>
                </div>
              )}

              {/* The Split Screen Container */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* LEFT: THE LIVE CELEBRATION CANVAS STAGE (6 Cols on LG) */}
                <div className="lg:col-span-6 rounded-[2.5rem] border border-stone-200/90 bg-white p-4 sm:p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
                  <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-amber-500/10 blur-2xl" />

                  {/* Stage Top Bar */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 relative z-10 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-950 flex items-center gap-1.5 whitespace-nowrap">
                        <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Live Canvas Stage</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                        {gradientAngle}°
                      </span>
                      <span className="hidden xs:inline-block text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg truncate max-w-[110px]">
                        {fontLabelForValue(font)}
                      </span>

                      {/* Mobile Expand / Collapse Card Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                        className="lg:hidden flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs whitespace-nowrap active:scale-95"
                        aria-expanded={mobilePreviewOpen}
                      >
                        {mobilePreviewOpen ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5 text-amber-700" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5 text-amber-700" />
                            <span>View Card</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mobile Compact Gradient Ribbon (Shown when preview is collapsed on mobile) */}
                  {!mobilePreviewOpen && (
                    <button
                      type="button"
                      onClick={() => setMobilePreviewOpen(true)}
                      className="lg:hidden mt-3 h-12 rounded-2xl p-2.5 flex items-center justify-between shadow-xs border border-white/40 text-left transition-transform active:scale-[0.99] relative overflow-hidden"
                      style={{ background: previewGradient }}
                    >
                      <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                        <span>{emoji}</span>
                        <span className="truncate max-w-[140px]">{name || 'Custom Theme'}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-white/95 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                        <Eye className="h-3 w-3" />
                        <span>Tap to view card</span>
                      </span>
                    </button>
                  )}

                  {/* The Simulated Celebration Canvas Card */}
                  <div
                    className={cn(
                      'my-5 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-lg text-white transition-all duration-300 min-h-[320px] sm:min-h-[340px] flex-col justify-between relative',
                      mobilePreviewOpen ? 'flex' : 'hidden lg:flex'
                    )}
                    style={{ background: previewGradient }}
                  >
                    {/* Subtle top ambient sheen */}
                    <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-white/20 blur-xl" />

                    {/* Canvas Card Header */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-md">
                        {iconUrl ? (
                          <img src={iconUrl} alt="Emblem" className="h-full w-full object-cover rounded-2xl" />
                        ) : (
                          <span className="text-2xl">{emoji}</span>
                        )}
                      </div>
                      <span className="rounded-full bg-black/25 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/95 border border-white/20">
                        Celebration Keepsake
                      </span>
                    </div>

                    {/* Celebrant Headline & Note */}
                    <div className="my-4 relative z-10 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-white/80 font-medium">
                        Milestone Reveal
                      </p>
                      <h2 className={cn('text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md text-white', fontClassForValue(font))}>
                        Happy 30th Birthday, Chi!
                      </h2>
                      <p className="text-xs text-white/90 leading-relaxed max-w-sm drop-shadow-sm font-sans">
                        May your new decade be painted with immense laughter, gentle peace, and extraordinary memories.
                      </p>
                    </div>

                    {/* Interactive Accent Pill & Sign Button */}
                    <div className="relative z-10 pt-4 border-t border-white/25 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                        <Heart className="h-3.5 w-3.5 fill-white" />
                        <span>32 Wishes Pinned</span>
                      </div>

                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                        style={{
                          backgroundColor: accentColor || '#f59e0b',
                          boxShadow: `0 4px 14px ${accentColor || '#f59e0b'}55`,
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Leave a Note</span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Bottom Summary Pills */}
                  <div className={cn(
                    'items-center justify-between pt-2 text-[11px] text-stone-500 border-t border-stone-100 relative z-10',
                    mobilePreviewOpen ? 'flex' : 'hidden lg:flex'
                  )}>
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-slate-950 truncate">{name || 'Custom Theme'}</span>
                      <span className="h-1 w-1 rounded-full bg-stone-300 shrink-0" />
                      <span className="truncate">{editingId ? 'Refining Saved Theme' : 'New Palette Draft'}</span>
                    </div>
                    <span className="italic font-serif text-amber-800 shrink-0">
                      updates in real-time
                    </span>
                  </div>
                </div>

                {/* RIGHT: COMPACT TABBED INSPECTOR (6 Cols on LG - ZERO SCROLLING) */}
                <div className="lg:col-span-6 rounded-[2.5rem] border border-stone-200/90 bg-white p-4 sm:p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-rose-500/10 blur-2xl" />

                  <div className="space-y-5">
                    {/* Theme Identity Header */}
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center text-lg shadow-2xs shrink-0">
                          {emoji}
                        </div>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Name your theme..."
                          className="font-serif font-bold text-base sm:text-lg border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:border-b focus-visible:border-amber-400 rounded-none text-slate-950 placeholder:text-stone-400 min-w-0"
                          maxLength={32}
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Mobile quick card peek toggle */}
                        <button
                          type="button"
                          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                          className="lg:hidden flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 active:scale-95 transition-transform"
                          title="Toggle live card preview"
                        >
                          <Eye className="h-3 w-3 text-amber-700" />
                          <span>{mobilePreviewOpen ? 'Hide' : 'Card'}</span>
                        </button>

                        {editingId && (
                          <button
                            type="button"
                            onClick={resetForm}
                            className="text-[11px] font-semibold text-stone-500 hover:text-slate-950 flex items-center gap-1 shrink-0"
                            title="Reset to new draft"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span className="hidden xs:inline">Reset</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Segmented Inspector Tab Buttons */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100/80 rounded-2xl border border-stone-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('colors')}
                        className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                          activeTab === 'colors'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-600 hover:text-slate-950'
                        }`}
                      >
                        <Palette className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Colors</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('typography')}
                        className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                          activeTab === 'typography'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-600 hover:text-slate-950'
                        }`}
                      >
                        <Type className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Fonts</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('details')}
                        className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                          activeTab === 'details'
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-600 hover:text-slate-950'
                        }`}
                      >
                        <Compass className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">Emblem &amp; Angle</span>
                      </button>
                    </div>

                    {/* TAB 1: COLORS & ATMOSPHERE */}
                    {activeTab === 'colors' && (
                      <div className="space-y-4 animate-fade-in">
                        {/* 3 Color Pickers */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-900">
                              Gradient Palette
                            </Label>
                            {!gradientMid && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isProPlan) {
                                    toast.error('Midpoint gradients are available on Pro Atelier.');
                                    return;
                                  }
                                  setGradientMid('#a855f7');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900"
                              >
                                {!isProPlan && <Lock className="h-3 w-3 text-amber-700" />}
                                <span>+ Add Midpoint</span>
                              </button>
                            )}
                          </div>

                          <div className={`grid gap-2.5 ${gradientMid ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
                            {/* Start */}
                            <div className="p-2.5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-1">
                              <span className="text-[10px] font-bold uppercase text-stone-500">Start</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={normalizeHex(gradientFrom) || '#f472b6'}
                                  onChange={(e) => setGradientFrom(normalizeHex(e.target.value))}
                                  className="h-8 w-8 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                                />
                                <Input
                                  value={gradientFrom}
                                  onChange={(e) => setGradientFrom(normalizeHex(e.target.value))}
                                  className="font-mono text-xs uppercase h-8 rounded-lg border-stone-200 px-2"
                                  maxLength={7}
                                />
                              </div>
                            </div>

                            {/* Midpoint */}
                            {gradientMid && (
                              <div className="p-2.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1 relative">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase text-amber-900">Mid</span>
                                  <button
                                    type="button"
                                    onClick={() => setGradientMid('')}
                                    className="text-[10px] font-bold text-stone-400 hover:text-rose-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="color"
                                    value={normalizeHex(gradientMid) || '#ffffff'}
                                    onChange={(e) => setGradientMid(normalizeHex(e.target.value))}
                                    className="h-8 w-8 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                                  />
                                  <Input
                                    value={gradientMid}
                                    onChange={(e) => setGradientMid(normalizeHex(e.target.value))}
                                    className="font-mono text-xs uppercase h-8 rounded-lg border-stone-200 px-2"
                                    maxLength={7}
                                  />
                                </div>
                              </div>
                            )}

                            {/* End */}
                            <div className="p-2.5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-1">
                              <span className="text-[10px] font-bold uppercase text-stone-500">End</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={normalizeHex(gradientTo) || '#8b5cf6'}
                                  onChange={(e) => setGradientTo(normalizeHex(e.target.value))}
                                  className="h-8 w-8 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                                />
                                <Input
                                  value={gradientTo}
                                  onChange={(e) => setGradientTo(normalizeHex(e.target.value))}
                                  className="font-mono text-xs uppercase h-8 rounded-lg border-stone-200 px-2"
                                  maxLength={7}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Accent Color & Quick Presets */}
                        <div className="space-y-2 pt-2 border-t border-stone-100">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-900">
                              Interactive Accent Tint
                            </Label>
                            <span className="text-[10px] text-stone-400">
                              Used for buttons &amp; icons
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 mr-1">
                              <input
                                type="color"
                                value={normalizeHex(accentColor || '#f59e0b')}
                                onChange={(e) => setAccentColor(normalizeHex(e.target.value))}
                                className="h-8 w-8 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white shadow-2xs"
                              />
                              <Input
                                value={accentColor}
                                onChange={(e) => setAccentColor(normalizeHex(e.target.value))}
                                placeholder="#f59e0b"
                                className="w-20 font-mono text-xs uppercase h-8 rounded-lg border-stone-200 px-2"
                                maxLength={7}
                              />
                            </div>

                            {QUICK_ACCENTS.map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() => setAccentColor(preset.color)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] border transition-all ${
                                  accentColor.toLowerCase() === preset.color.toLowerCase()
                                    ? 'border-slate-950 bg-stone-100 text-slate-950 font-bold shadow-2xs'
                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                                }`}
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: preset.color }}
                                />
                                <span>{preset.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: TYPOGRAPHY & FONT STYLES */}
                    {activeTab === 'typography' && (
                      <div className="space-y-3 animate-fade-in">
                        <Label className="text-xs font-bold text-slate-900">
                          Select Font Style
                        </Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
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
                                className={`p-2.5 rounded-2xl border text-left transition-all relative ${
                                  isLocked ? 'opacity-60 bg-stone-50 cursor-not-allowed' : ''
                                } ${
                                  font === f.value
                                    ? 'border-amber-500 bg-amber-50/50 shadow-2xs ring-2 ring-amber-400/20'
                                    : 'border-stone-200 bg-stone-50/30 hover:bg-stone-50 hover:border-stone-300'
                                }`}
                                disabled={isLocked}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] font-bold text-stone-600 truncate">
                                    {f.label}
                                  </span>
                                  {isLocked ? (
                                    <Lock className="h-3 w-3 text-amber-700 shrink-0" />
                                  ) : font === f.value ? (
                                    <Check className="h-3 w-3 text-amber-600 stroke-[3] shrink-0" />
                                  ) : null}
                                </div>
                                <span className={cn('block text-sm font-bold text-slate-950 truncate', f.className)}>
                                  {f.sample}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: EMBLEM, EMOJI & GRADIENT ANGLE */}
                    {activeTab === 'details' && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Gradient Direction Angle */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-900">
                            Flow Direction ({gradientAngle}°)
                          </Label>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                            {ANGLE_OPTIONS.map((a) => (
                              <button
                                key={a.value}
                                type="button"
                                onClick={() => setGradientAngle(a.value)}
                                className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                  gradientAngle === a.value
                                    ? 'bg-slate-950 text-white shadow-xs'
                                    : 'bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700'
                                }`}
                                title={`${a.value} degrees`}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Celebratory Seal Emoji */}
                        <div className="space-y-1.5 pt-2 border-t border-stone-100">
                          <Label className="text-xs font-bold text-slate-900">
                            Celebratory Seal Emoji
                          </Label>
                          <div className="flex flex-wrap gap-1 p-1.5 rounded-xl bg-stone-50 border border-stone-200 max-h-[85px] overflow-y-auto">
                            {EMOJI_OPTIONS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => setEmoji(e)}
                                className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${
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

                        {/* Custom Image Seal Upload (Pro) */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center text-sm overflow-hidden shrink-0">
                              {iconUrl ? (
                                <img src={iconUrl} alt="Seal" className="h-full w-full object-cover" />
                              ) : (
                                <span>{emoji}</span>
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-950 truncate">Custom Monogram / Crest</p>
                              <p className="text-[10px] text-stone-400 truncate">
                                {isProPlan ? 'Replace emoji with image' : 'Pro Atelier feature'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
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
                              className="rounded-xl border-stone-200 text-xs font-semibold h-7 px-2.5"
                              onClick={() => document.getElementById('theme-icon-file')?.click()}
                              disabled={!isProPlan}
                            >
                              <ImageIcon className="h-3 w-3 mr-1" />
                              <span>{iconUrl ? 'Change' : 'Upload'}</span>
                            </Button>
                            {iconUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:bg-rose-50"
                                onClick={() => setIconUrl(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inspector Footer Actions (Always visible at bottom) */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="rounded-2xl border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 px-4 h-9"
                    >
                      Reset Draft
                    </Button>

                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-press rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs px-5 h-9 shadow-md shadow-amber-500/25 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-amber-100" />
                          <span>{editingId ? 'Update Palette' : 'Save Custom Palette'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW 2: SAVED CUSTOM PALETTES GALLERY (Organized Archive View) */}
          {activeView === 'gallery' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200/80 pb-4">
                <div>
                  <h3 className="font-serif font-bold text-slate-950 text-xl">
                    Your Saved Celebration Palettes
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select a palette to edit in the Studio Workbench or craft a new milestone canvas.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={startNewTheme}
                    disabled={isFreeThemeLimitReached}
                    className="btn-press rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 shadow-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5 text-amber-400" />
                    <span>Create New Palette</span>
                  </Button>
                </div>
              </div>

              {themes.length === 0 ? (
                <div className="rounded-[2.5rem] border border-dashed border-stone-300 p-12 text-center bg-white/70 space-y-4 shadow-xs">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto text-3xl shadow-xs">
                    🎨
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-slate-950 text-lg">
                      No custom themes crafted yet
                    </h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                      Switch to the Studio Workbench to pick your gradient flow, typography, and accent colors.
                    </p>
                  </div>
                  <Button
                    onClick={startNewTheme}
                    className="btn-press rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-6 py-2.5 shadow-card gap-2"
                  >
                    <Plus className="h-4 w-4 text-amber-400" />
                    <span>Open Studio Workbench</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        className={`rounded-3xl border p-4 flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                          isCurrentlyEditing
                            ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-2 ring-amber-400/20'
                            : 'border-stone-200/90 bg-white hover:border-stone-300 shadow-2xs'
                        }`}
                      >
                        {/* Top Banner Swatch */}
                        <div
                          className="h-28 w-full rounded-2xl flex items-center justify-between p-3.5 relative shadow-inner overflow-hidden text-white"
                          style={{ background: themeGradient }}
                        >
                          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xs">
                            {theme.icon_url ? (
                              <img src={theme.icon_url} alt={theme.name} className="h-full w-full object-cover rounded-xl" />
                            ) : (
                              <span className="text-xl">{theme.emoji}</span>
                            )}
                          </div>

                          {theme.accent_color && (
                            <div
                              className="h-5 w-5 rounded-full border-2 border-white shadow-xs"
                              style={{ backgroundColor: theme.accent_color }}
                              title="Accent color"
                            />
                          )}
                        </div>

                        {/* Theme details */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className={cn('text-sm font-bold text-slate-950 truncate', fontClassForValue(theme.font))}>
                              {theme.name}
                            </h4>
                            {isCurrentlyEditing && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                In Studio
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <span>{fontLabelForValue(theme.font)}</span>
                            <span>•</span>
                            <span>{theme.gradient_angle || 135}° angle</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(theme)}
                            className="flex-1 rounded-xl border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 h-8"
                          >
                            Edit in Studio
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
          )}

        </main>
      </div>
    </div>
  );
};

export default ThemeBuilderPage;
