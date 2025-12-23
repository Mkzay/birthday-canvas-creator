import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Activity, 
  MessageSquare,
  MoreVertical,
  Eye,
  Edit,
  Share2,
  Trash2,
  LogOut,
  Settings,
  User,
  Loader2,
  Palette
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface BirthdayPage {
  id: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  status: string;
  created_at: string;
  message_count?: number;
}

const themeConfig: Record<string, { name: string; emoji: string; primary: string; accent: string }> = {
  elegant: { name: 'Elegant', emoji: '✨', primary: 'from-amber-400 to-orange-500', accent: '#fbbf24' },
  playful: { name: 'Playful', emoji: '🎈', primary: 'from-pink-500 to-purple-500', accent: '#ec4899' },
  minimalist: { name: 'Minimalist', emoji: '🎯', primary: 'from-slate-600 to-slate-800', accent: '#64748b' },
  retro: { name: 'Retro', emoji: '🌈', primary: 'from-cyan-400 to-purple-500', accent: '#06b6d4' },
  tropical: { name: 'Tropical', emoji: '🌴', primary: 'from-green-400 to-emerald-500', accent: '#22c55e' },
  cosmic: { name: 'Cosmic', emoji: '🚀', primary: 'from-violet-500 to-indigo-600', accent: '#8b5cf6' },
  sunset: { name: 'Sunset', emoji: '🌅', primary: 'from-orange-400 to-rose-500', accent: '#f97316' },
  ocean: { name: 'Ocean', emoji: '🌊', primary: 'from-sky-400 to-cyan-500', accent: '#0ea5e9' },
  candyland: { name: 'Candyland', emoji: '🍭', primary: 'from-pink-400 to-purple-500', accent: '#f472b6' },
  midnight: { name: 'Midnight', emoji: '🌙', primary: 'from-indigo-500 to-violet-600', accent: '#6366f1' },
};

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPages();
      fetchCustomThemes();
    }
  }, [user]);

  const fetchCustomThemes = async () => {
    const { data } = await supabase
      .from('custom_themes')
      .select('id, name, emoji, gradient_from, gradient_to')
      .eq('user_id', user!.id);
    setCustomThemes(data || []);
  };

  const getThemeDisplay = (themeKey: string) => {
    // Check if it's a custom theme
    if (themeKey.startsWith('custom_')) {
      const customId = themeKey.replace('custom_', '');
      const customTheme = customThemes.find(t => t.id === customId);
      if (customTheme) {
        return {
          name: customTheme.name,
          emoji: customTheme.emoji,
          primary: '',
          accent: customTheme.gradient_from,
          isCustom: true,
          gradientFrom: customTheme.gradient_from,
          gradientTo: customTheme.gradient_to,
        };
      }
    }
    // Return predefined theme or default
    return {
      ...themeConfig[themeKey] || themeConfig.elegant,
      isCustom: false,
    };
  };

  const fetchPages = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('birthday_pages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load pages');
      console.error(error);
    } else {
      // Fetch message counts for each page
      const pagesWithCounts = await Promise.all((data || []).map(async (page) => {
        const { count } = await supabase
          .from('birthday_messages')
          .select('*', { count: 'exact', head: true })
          .eq('page_id', page.id);
        return { ...page, message_count: count || 0 };
      }));
      setPages(pagesWithCounts);
    }
    setLoading(false);
  };

  const stats = {
    totalPages: pages.length,
    activePages: pages.filter(p => p.status === 'active').length,
    totalMessages: pages.reduce((acc, p) => acc + (p.message_count || 0), 0),
  };

  const getStatusBadge = (page: BirthdayPage) => {
    const daysUntil = differenceInDays(new Date(page.birthday_date), new Date());
    
    if (page.status === 'delivered') {
      return <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">Delivered</span>;
    }
    if (daysUntil <= 0) {
      return <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Ready!</span>;
    }
    if (daysUntil <= 7) {
      return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{daysUntil} days left</span>;
    }
    return <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Active</span>;
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from('birthday_pages').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete page');
    } else {
      setPages(pages.filter(p => p.id !== id));
      toast.success(`"${name}'s" birthday page deleted`);
    }
  };

  const copyLink = (pageId: string, type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const link = type === 'contribute' 
      ? `${baseUrl}/contribute/${pageId}`
      : `${baseUrl}/birthday/${pageId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-cta flex items-center justify-center text-lg sm:text-xl">
              🎨
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">WishCanvas</span>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
                <span className="text-sm font-medium text-foreground hidden sm:block">{displayName}</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full gradient-cta flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-base">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                My Pages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero/Welcome */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your birthday pages and spread the joy.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border shadow-soft">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalPages}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border shadow-soft">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-green-100 flex items-center justify-center">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.activePages}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border shadow-soft">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-secondary/50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalMessages}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Messages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-6 sm:mb-8">
          <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
            <Link to="/create" className="flex-1 sm:flex-none">
              <Button variant="hero" size="default" className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">New Page</span>
                <span className="hidden sm:inline">Create New Birthday Page</span>
              </Button>
            </Link>
            <Link to="/themes" className="flex-1 sm:flex-none">
              <Button variant="outline" size="default" className="gap-2 w-full sm:w-auto">
                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">Themes</span>
                <span className="hidden sm:inline">Theme Builder</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Pages Grid */}
        {pages.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4 bg-muted/30 rounded-2xl sm:rounded-3xl">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎂</div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">No birthday pages yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Create your first birthday page and start collecting wishes!</p>
            <Link to="/create">
              <Button variant="hero" size="default">Create Your First Page</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {pages.map((page) => {
              const theme = getThemeDisplay(page.theme);
              return (
                <div 
                  key={page.id}
                  className="bg-card rounded-xl sm:rounded-2xl border-2 border-border hover:shadow-soft-lg transition-all duration-300 overflow-hidden group"
                  style={{ borderColor: theme.accent + '40' }}
                >
                  {/* Theme Header */}
                  {theme.isCustom ? (
                    <div 
                      className="h-1.5 sm:h-2" 
                      style={{ background: `linear-gradient(to right, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                    />
                  ) : (
                    <div className={`h-1.5 sm:h-2 bg-gradient-to-r ${theme.primary}`} />
                  )}
                  
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1 pr-2">
                        <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{page.recipient_name}'s Birthday</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(page.birthday_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyLink(page.id, 'contribute')}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Copy Contribution Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(page.id, 'birthday')}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Copy Birthday Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(page.id, page.recipient_name)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Theme Badge */}
                    {theme.isCustom ? (
                      <div 
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-white text-xs font-medium mb-3 sm:mb-4"
                        style={{ background: `linear-gradient(to right, ${theme.gradientFrom}, ${theme.gradientTo})` }}
                      >
                        <span>{theme.emoji}</span>
                        <span>{theme.name}</span>
                      </div>
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r ${theme.primary} text-primary-foreground text-xs font-medium mb-3 sm:mb-4`}>
                        <span>{theme.emoji}</span>
                        <span>{theme.name}</span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                      <span>{page.message_count || 0} messages</span>
                    </div>

                    {/* Status */}
                    <div className="mb-3 sm:mb-4">
                      {getStatusBadge(page)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`/preview/${page.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1 text-xs sm:text-sm">
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          View
                        </Button>
                      </Link>
                      <Link to={`/edit/${page.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1 text-xs sm:text-sm">
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
