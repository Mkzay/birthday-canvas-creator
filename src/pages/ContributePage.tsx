import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { themeConfig } from '@/types/birthday';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Upload, Send, Plus, Sparkles } from 'lucide-react';
import Confetti from '@/components/Confetti';

const ContributePage = () => {
  const { pageId } = useParams();
  const { getPageById, addMessage } = useApp();
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const page = pageId ? getPageById(pageId) : undefined;
  
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

  const theme = themeConfig[page.theme];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (page.settings.requireNames && !senderName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please write a message');
      return;
    }

    addMessage(page.id, {
      senderName: senderName.trim() || 'Anonymous',
      message: message.trim(),
    });

    setShowConfetti(true);
    setIsSubmitted(true);
    
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const handleAddAnother = () => {
    setSenderName('');
    setMessage('');
    setIsSubmitted(false);
  };

  return (
    <div className={`min-h-screen ${theme.colors.bg}`}>
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
          <p className={`text-sm ${theme.colors.text} opacity-70`}>
            It's {page.recipientName}'s birthday on {format(new Date(page.birthdayDate), 'MMMM d')}!
          </p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        {!isSubmitted ? (
          <>
            {/* Hero */}
            <div className="text-center mb-8 animate-fade-in-up">
              <div className="text-6xl mb-4">{theme.emoji}</div>
              <h1 className={`text-3xl font-bold ${theme.colors.text} mb-3 ${theme.font}`}>
                Add Your Birthday Wish for {page.recipientName}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(page.messages.length, 3))].map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.colors.primary} border-2 border-card`} />
                  ))}
                </div>
                <span className={`text-sm ${theme.colors.text} opacity-70`}>
                  {page.messages.length} {page.messages.length === 1 ? 'person has' : 'people have'} already contributed
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
                {page.settings.requireNames && (
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
                    placeholder={`Write your birthday wish for ${page.recipientName}...`}
                    className="min-h-[120px]"
                  />
                </div>

                {page.settings.allowPhotos && (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer mb-6">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Upload a photo (optional)</p>
                  </div>
                )}

                <Button type="submit" variant="hero" size="lg" className="w-full gap-2">
                  <Send className="w-5 h-5" />
                  Add My Wish
                </Button>
              </div>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="text-center animate-scale-in">
            <div className="text-8xl mb-6">🎉</div>
            <h2 className={`text-3xl font-bold ${theme.colors.text} mb-3`}>
              Your wish has been added!
            </h2>
            <p className="text-muted-foreground mb-8">
              {page.recipientName} will see it on their special day
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
