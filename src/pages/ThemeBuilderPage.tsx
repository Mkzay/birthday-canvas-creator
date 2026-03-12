import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Loader2, Palette, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  font: string;
}

const EMOJI_OPTIONS = ['🎨', '✨', '🌟', '💫', '🔥', '💖', '🌈', '🎭', '🎪', '🎯', '💎', '🦋', '🌸', '🍀', '⭐', '🌺', '🎵', '🎶', '🌙', '☀️'];

const FONT_OPTIONS = [
  { value: 'sans', label: 'Modern (Sans)' },
  { value: 'serif', label: 'Classic (Serif)' },
];

const ThemeBuilderPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  
  // Form state for new/edit theme
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎨');
  const [gradientFrom, setGradientFrom] = useState('#f472b6');
  const [gradientTo, setGradientTo] = useState('#8b5cf6');
  const [font, setFont] = useState('sans');
  const [showForm, setShowForm] = useState(false);

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
      toast.error('Failed to load themes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchThemes();
    }
  }, [fetchThemes, user]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmoji('🎨');
    setGradientFrom('#f472b6');
    setGradientTo('#8b5cf6');
    setFont('sans');
    setShowForm(false);
  };

  const handleEdit = (theme: CustomTheme) => {
    setEditingId(theme.id);
    setName(theme.name);
    setEmoji(theme.emoji);
    setGradientFrom(theme.gradient_from);
    setGradientTo(theme.gradient_to);
    setFont(theme.font);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    setSaving(true);

    if (editingId) {
      // Update existing theme
      try {
        await apiFetch(`/themes/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            emoji,
            gradientFrom,
            gradientTo,
            font,
          }),
        });
        toast.success('Theme updated!');
        void fetchThemes();
        resetForm();
      } catch (error) {
        toast.error('Failed to update theme');
        console.error(error);
      }
    } else {
      try {
        await apiFetch('/themes', {
          method: 'POST',
          body: JSON.stringify({
            name,
            emoji,
            gradientFrom,
            gradientTo,
            font,
          }),
        });
        toast.success('Theme created!');
        void fetchThemes();
        resetForm();
      } catch (error) {
        toast.error('Failed to create theme');
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
      toast.success('Theme deleted');
      setThemes(themes.filter(t => t.id !== id));
    } catch (error) {
      toast.error('Failed to delete theme');
      console.error(error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-cta flex items-center justify-center text-lg sm:text-xl">
              🎨
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">WishCanvas</span>
          </Link>
          
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 sm:gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Theme Builder
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Create and manage your custom themes</p>
          </div>
          {!showForm && (
            <Button variant="hero" onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Theme
            </Button>
          )}
        </div>

        {/* Theme Form */}
        {showForm && (
          <div className="bg-card rounded-2xl p-6 border border-border mb-8 animate-fade-in">
            <h2 className="font-bold text-foreground mb-6">
              {editingId ? 'Edit Theme' : 'Create New Theme'}
            </h2>

            <div className="space-y-6">
              {/* Theme Name */}
              <div>
                <Label htmlFor="name" className="text-foreground">Theme Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Birthday Theme"
                  className="mt-2"
                  maxLength={30}
                />
              </div>

              {/* Emoji Picker */}
              <div>
                <Label className="text-foreground">Choose an Emoji</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                        emoji === e 
                          ? "bg-primary text-primary-foreground scale-110 ring-2 ring-primary/50" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gradientFrom" className="text-foreground">Gradient Start</Label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      id="gradientFrom"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="gradientTo" className="text-foreground">Gradient End</Label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      id="gradientTo"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <Label className="text-foreground">Font Style</Label>
                <div className="flex gap-3 mt-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFont(f.value)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-lg border-2 transition-all text-sm",
                        font === f.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className={f.value === 'serif' ? 'font-serif' : 'font-sans'}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label className="text-foreground">Preview</Label>
                <div 
                  className="mt-2 aspect-video rounded-2xl flex flex-col items-center justify-center p-6"
                  style={{ 
                    background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` 
                  }}
                >
                  <span className="text-5xl mb-3">{emoji}</span>
                  <span className={cn(
                    "text-xl font-bold text-white drop-shadow-lg",
                    font === 'serif' ? 'font-serif' : 'font-sans'
                  )}>
                    {name || 'Your Theme Name'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button variant="hero" onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {editingId ? 'Update Theme' : 'Create Theme'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Themes */}
        <div>
          <h2 className="font-bold text-foreground mb-4">Your Themes ({themes.length})</h2>
          
          {themes.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 border border-border text-center">
              <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No custom themes yet</p>
              <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Theme
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="bg-card rounded-xl border border-border overflow-hidden flex"
                >
                  {/* Theme preview */}
                  <div 
                    className="w-24 sm:w-32 flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.gradient_from}, ${theme.gradient_to})` 
                    }}
                  >
                    <span className="text-3xl">{theme.emoji}</span>
                  </div>
                  
                  {/* Theme info */}
                  <div className="flex-1 p-4 flex items-center justify-between">
                    <div>
                      <h3 className={cn(
                        "font-bold text-foreground",
                        theme.font === 'serif' ? 'font-serif' : 'font-sans'
                      )}>
                        {theme.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {theme.font === 'serif' ? 'Classic' : 'Modern'} style
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(theme)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(theme.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ThemeBuilderPage;
