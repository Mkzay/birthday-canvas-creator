import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Upload, Send, Plus, Sparkles, Loader2 } from 'lucide-react';
import Confetti from '@/components/Confetti';

interface BirthdayPageData {
  id: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  allow_photos: boolean;
  require_names: boolean;
}

const themeConfig = {
  elegant: { name: 'Elegant', emoji: '✨', text: 'text-amber-900', bg: 'bg-gradient-to-br from-amber-50 to-orange-50' },
  playful: { name: 'Playful', emoji: '🎈', text: 'text-pink-900', bg: 'bg-gradient-to-br from-pink-50 to-purple-50' },
  minimalist: { name: 'Minimalist', emoji: '🎯', text: 'text-slate-900', bg: 'bg-gradient-to-br from-slate-50 to-gray-100' },
  retro: { name: 'Retro', emoji: '🌈', text: 'text-purple-900', bg: 'bg-gradient-to-br from-cyan-50 to-purple-50' },
};

const ContributePage = () => {
  const { pageId } = useParams();
  const [page, setPage] = useState<BirthdayPageData | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  const fetchPage = async () => {
    const { data, error } = await supabase
      .from('birthday_pages')
      .select('*')
      .eq('id', pageId)
      .maybeSingle();

    if (error || !data) {
      setPage(null);
    } else {
      setPage(data);
      // Get message count
      const { count } = await supabase
        .from('birthday_messages')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', pageId);
      setMessageCount(count || 0);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-6">This birthday page doesn't exist or has been removed.</p>
          <Link to="/">
            <Button variant="hero">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const theme = themeConfig[page.theme as keyof typeof themeConfig] || themeConfig.elegant;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (page.require_names && !senderName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please write a message');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('birthday_messages')
      .insert({
        page_id: page.id,
        sender_name: senderName.trim() || 'Anonymous',
        message: message.trim(),
      });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to add message');
      console.error(error);
      return;
    }

    setShowConfetti(true);
    setIsSubmitted(true);
    setMessageCount(prev => prev + 1);
    
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const handleAddAnother = () => {
    setSenderName('');
    setMessage('');
    setIsSubmitted(false);
  };

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {showConfetti && <Confetti />}
      
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center flex-col">
          <Link to="/" className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center text-xl">
              🎨
            </div>
            <span className="text-xl font-bold text-foreground">WishCanvas</span>
          </Link>
          <p className={`text-sm ${theme.text} opacity-70`}>
            It's {page.recipient_name}'s birthday on {format(new Date(page.birthday_date), 'MMMM d')}!
          </p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        {!isSubmitted ? (
          <>
            {/* Hero */}
            <div className="text-center mb-8 animate-fade-in-up">
              <div className="text-6xl mb-4">{theme.emoji}</div>
              <h1 className={`text-3xl font-bold ${theme.text} mb-3`}>
                Add Your Birthday Wish for {page.recipient_name}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(messageCount, 3))].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-card" />
                  ))}
                </div>
                <span className={`text-sm ${theme.text} opacity-70`}>
                  {messageCount} {messageCount === 1 ? 'person has' : 'people have'} already contributed
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
                {page.require_names && (
                  <div className="mb-6">
                    <Label htmlFor="name" className="text-foreground">Your Name</Label>
                    <Input
                      id="name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Enter your name"
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="message" className="text-foreground">Your Message</Label>
                    <span className="text-xs text-muted-foreground">{message.length}/500</span>
                  </div>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                    placeholder={`Write your birthday wish for ${page.recipient_name}...`}
                    className="min-h-[120px]"
                  />
                </div>

                {page.allow_photos && (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer mb-6">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Upload a photo (optional)</p>
                  </div>
                )}

                <Button type="submit" variant="hero" size="lg" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submitting ? 'Adding...' : 'Add My Wish'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="text-center animate-scale-in">
            <div className="text-8xl mb-6">🎉</div>
            <h2 className={`text-3xl font-bold ${theme.text} mb-3`}>
              Your wish has been added!
            </h2>
            <p className="text-muted-foreground mb-8">
              {page.recipient_name} will see it on their special day
            </p>
            
            <div className="flex flex-col gap-4">
              <Button variant="outline" onClick={handleAddAnother} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Another Message
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
                </div>
              </div>
              
              <Link to="/create">
                <Button variant="hero" className="w-full gap-2">
                  <Sparkles className="w-4 h-4" />
                  Create Your Own Birthday Page
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContributePage;
