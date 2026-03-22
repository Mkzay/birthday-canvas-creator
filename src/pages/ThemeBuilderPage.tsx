import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Loader2, Palette, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch, apiForm } from '@/lib/api';
import Header from '@/components/Header';
import WishCanvasLoader from '@/components/WishCanvasLoader';

interface CustomTheme {
  id: string;
  name: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  gradient_mid: string | null;
  gradient_angle: number;
  accent_color: string | null;
  font: string;
  icon_url?: string | null;
}

const EMOJI_OPTIONS = ['🎨', '✨', '🌟', '💫', '🔥', '💖', '🌈', '🎭', '🎪', '🎯', '💎', '🦋', '🌸', '🍀', '⭐', '🌺', '🎵', '🎶', '🌙', '☀️'];

const FONT_OPTIONS = [
  { value: 'jakarta', label: 'Modern Sans', className: 'font-jakarta', sample: 'Happy Birthday' },
  { value: 'playfair', label: 'Classic Serif', className: 'font-playfair', sample: 'Happy Birthday' },
  { value: 'caveat', label: 'Handwritten', className: 'font-caveat', sample: 'Happy Birthday' },
  { value: 'nunito', label: 'Rounded', className: 'font-nunito', sample: 'Happy Birthday' },
  { value: 'sora', label: 'Display', className: 'font-sora', sample: 'Happy Birthday' },
  { value: 'cormorant', label: 'Elegant Serif', className: 'font-cormorant', sample: 'Happy Birthday' },
  { value: 'space-grotesk', label: 'Grotesk', className: 'font-space-grotesk', sample: 'Happy Birthday' },
  { value: 'dm-serif', label: 'Bold Serif', className: 'font-dm-serif', sample: 'Happy Birthday' },
  { value: 'inter', label: 'Neutral', className: 'font-inter', sample: 'Happy Birthday' },
  { value: 'outfit', label: 'Soft Modern', className: 'font-outfit', sample: 'Happy Birthday' },
];

const ANGLE_OPTIONS = [
  { value: 0, label: '↑' },
  { value: 45, label: '↗' },
  { value: 90, label: '→' },
  { value: 135, label: '↘' },
  { value: 180, label: '↓' },
  { value: 225, label: '↙' },
  { value: 270, label: '←' },
  { value: 315, label: '↖' },
];

function normalizeHex(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.slice(0, 7);
}

function fontClassForValue(value: string): string {
  if (value === 'sans') return 'font-jakarta';
  if (value === 'serif') return 'font-playfair';
  return FONT_OPTIONS.find((f) => f.value === value)?.className || 'font-sans';
}

function fontLabelForValue(value: string): string {
  if (value === 'sans') return 'Modern Sans';
  if (value === 'serif') return 'Classic Serif';
  return FONT_OPTIONS.find((f) => f.value === value)?.label || value;
}

function buildGradient(from: string, to: string, mid: string | null, angle: number): string {
  const stops = mid ? `${from}, ${mid}, ${to}` : `${from}, ${to}`;
  return `linear-gradient(${angle}deg, ${stops})`;
}

const ThemeBuilderPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<CustomTheme[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎨');
  const [gradientFrom, setGradientFrom] = useState('#f472b6');
  const [gradientTo, setGradientTo] = useState('#8b5cf6');
  const [gradientMid, setGradientMid] = useState('');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [accentColor, setAccentColor] = useState('');
  const [font, setFont] = useState('jakarta');
  const [showForm, setShowForm] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

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
    setGradientMid('');
    setGradientAngle(135);
    setAccentColor('');
    setFont('jakarta');
    setIconUrl(null);
    setShowForm(false);
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
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a theme name');
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
          body: JSON.stringify(payload),
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

  const previewGradient = buildGradient(gradientFrom, gradientTo, gradientMid || null, gradientAngle);

  const handleIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
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
      toast.error('Failed to upload icon');
    } finally {
      event.target.value = '';
    }
  };

  if (loading || authLoading) {
    return <WishCanvasLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header backTo={{ label: 'Back', useHistory: true, href: '/dashboard' }} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-8 sm:pt-28 sm:pb-12">
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

              {/* Gradient Colors */}
              <div>
                <Label className="text-foreground">Gradient Colors</Label>
                <div className={cn("grid gap-4 mt-2", gradientMid ? "grid-cols-3" : "grid-cols-2")}>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Start</p>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={normalizeHex(gradientFrom) || '#ffffff'}
                        onChange={(e) => setGradientFrom(normalizeHex(e.target.value))}
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={gradientFrom}
                        onChange={(e) => setGradientFrom(normalizeHex(e.target.value))}
                        className="flex-1 font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  {gradientMid && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-muted-foreground">Midpoint</p>
                        <button
                          type="button"
                          onClick={() => setGradientMid('')}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={normalizeHex(gradientMid) || '#ffffff'}
                          onChange={(e) => setGradientMid(normalizeHex(e.target.value))}
                          className="w-12 h-10 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={gradientMid}
                          onChange={(e) => setGradientMid(normalizeHex(e.target.value))}
                          className="flex-1 font-mono text-sm"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">End</p>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={normalizeHex(gradientTo) || '#ffffff'}
                        onChange={(e) => setGradientTo(normalizeHex(e.target.value))}
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={gradientTo}
                        onChange={(e) => setGradientTo(normalizeHex(e.target.value))}
                        className="flex-1 font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
                {!gradientMid && (
                  <button
                    type="button"
                    onClick={() => setGradientMid('#a855f7')}
                    className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    + Add midpoint color
                  </button>
                )}
              </div>

              {/* Gradient Angle */}
              <div>
                <Label className="text-foreground">Gradient Direction</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ANGLE_OPTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setGradientAngle(a.value)}
                      className={cn(
                        "w-10 h-10 rounded-lg text-base flex items-center justify-center transition-all",
                        gradientAngle === a.value
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <Label className="text-foreground">Accent Color</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Used for highlights, seals, and interactive elements</p>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={normalizeHex(accentColor || '#ef4444')}
                    onChange={(e) => setAccentColor(normalizeHex(e.target.value))}
                    className="w-12 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(normalizeHex(e.target.value))}
                    placeholder="Optional"
                    className="max-w-[10rem] font-mono text-sm"
                    maxLength={7}
                  />
                  {accentColor && (
                    <button
                      type="button"
                      onClick={() => setAccentColor('')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <Label className="text-foreground">Font Style</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFont(f.value)}
                      className={cn(
                        "py-3 px-3 rounded-xl border-2 transition-all text-left",
                        font === f.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className={cn("block text-lg font-bold leading-tight text-foreground", f.className)}>
                        {f.sample}
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-1">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label className="text-foreground">Preview</Label>
                <div
                  className="mt-2 aspect-video rounded-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden"
                  style={{ background: previewGradient }}
                >
                  <div className="mb-3 flex items-center justify-center">
                    {iconUrl ? (
                      <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-lg">
                        <img src={iconUrl} alt="Theme icon" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-5xl">{emoji}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xl font-bold text-white drop-shadow-lg',
                      fontClassForValue(font),
                    )}
                  >
                    {name || 'Your Theme Name'}
                  </span>
                  {accentColor && (
                    <div
                      className="absolute bottom-4 right-4 h-8 w-8 rounded-full border-2 border-white/40 shadow-lg"
                      style={{ background: accentColor }}
                      title="Accent color"
                    />
                  )}
                </div>
              </div>

              {/* Theme icon upload */}
              <div>
                <Label className="text-foreground">Theme icon (optional)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown in theme pickers and cards instead of the emoji.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/70 bg-muted/60 flex items-center justify-center">
                    {iconUrl ? (
                      <img src={iconUrl} alt="Theme icon" className="h-full w-full object-cover" />
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
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => document.getElementById('theme-icon-file')?.click()}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {iconUrl ? 'Change icon' : 'Upload icon'}
                  </Button>
                  {iconUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setIconUrl(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
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
                  <div
                    className="w-24 sm:w-32 flex items-center justify-center relative"
                    style={{
                      background: buildGradient(theme.gradient_from, theme.gradient_to, theme.gradient_mid, theme.gradient_angle || 135),
                    }}
                  >
                    <span className="text-3xl">{theme.emoji}</span>
                    {theme.accent_color && (
                      <div
                        className="absolute bottom-2 right-2 h-4 w-4 rounded-full border border-white/50"
                        style={{ background: theme.accent_color }}
                      />
                    )}
                  </div>

                  <div className="flex-1 p-4 flex items-center justify-between">
                    <div>
                      <h3 className={cn("font-bold text-foreground", fontClassForValue(theme.font))}>
                        {theme.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fontLabelForValue(theme.font)}
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
