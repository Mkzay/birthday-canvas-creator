import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
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
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { themeConfig } from '@/types/birthday';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, pages, deletePage } = useApp();

  const stats = {
    totalPages: pages.length,
    activePages: pages.filter(p => p.status === 'active').length,
    totalMessages: pages.reduce((acc, p) => acc + p.messages.length, 0),
  };

  const getStatusBadge = (page: typeof pages[0]) => {
    const daysUntil = differenceInDays(new Date(page.birthdayDate), new Date());
    
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

  const handleDelete = (id: string, name: string) => {
    deletePage(id);
    toast.success(`"${name}'s" birthday page deleted`);
  };

  const copyLink = (pageId: string, type: 'contribute' | 'birthday') => {
    const baseUrl = window.location.origin;
    const link = type === 'contribute' 
      ? `${baseUrl}/contribute/${pageId}`
      : `${baseUrl}/birthday/${pageId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center text-xl">
              🎨
            </div>
            <span className="text-xl font-bold text-foreground">WishCanvas</span>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <span className="text-sm font-medium text-foreground hidden sm:block">{user?.name}</span>
                <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center text-primary-foreground font-bold">
                  {user?.name?.charAt(0)}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                My Pages
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero/Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-muted-foreground">Manage your birthday pages and spread the joy.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalPages}</p>
                <p className="text-sm text-muted-foreground">Total Pages</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activePages}</p>
                <p className="text-sm text-muted-foreground">Active Pages</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalMessages}</p>
                <p className="text-sm text-muted-foreground">Messages Received</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
          <Link to="/create">
            <Button variant="hero" size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create New Birthday Page
            </Button>
          </Link>
        </div>

        {/* Pages Grid */}
        {pages.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl">
            <div className="text-6xl mb-4">🎂</div>
            <h3 className="text-xl font-bold text-foreground mb-2">No birthday pages yet</h3>
            <p className="text-muted-foreground mb-6">Create your first birthday page and start collecting wishes!</p>
            <Link to="/create">
              <Button variant="hero">Create Your First Page</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => {
              const theme = themeConfig[page.theme];
              return (
                <div 
                  key={page.id}
                  className="bg-card rounded-2xl border-2 border-border hover:shadow-soft-lg transition-all duration-300 overflow-hidden group"
                  style={{ borderColor: theme.colors.accent + '40' }}
                >
                  {/* Theme Header */}
                  <div className={`h-2 bg-gradient-to-r ${theme.colors.primary}`} />
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{page.recipientName}'s Birthday</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(page.birthdayDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
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
                            onClick={() => handleDelete(page.id, page.recipientName)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Theme Badge */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${theme.colors.primary} text-primary-foreground text-xs font-medium mb-4`}>
                      <span>{theme.emoji}</span>
                      <span>{theme.name}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span>{page.messages.length} messages</span>
                      <span>•</span>
                      <span>{page.messages.filter(m => m.photo).length} photos</span>
                    </div>

                    {/* Status */}
                    <div className="mb-4">
                      {getStatusBadge(page)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`/preview/${page.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </Link>
                      <Link to={`/edit/${page.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Edit className="w-4 h-4" />
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
