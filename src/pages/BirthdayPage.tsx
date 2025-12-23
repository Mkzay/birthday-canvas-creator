import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { themeConfig, Theme } from '@/types/birthday';
import { ChevronDown, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

// Theme-specific confetti component
const ThemeConfetti = ({ theme }: { theme: Theme }) => {
  const colors = {
    elegant: ['#fbbf24', '#f97316', '#fef3c7'],
    playful: ['#ec4899', '#a855f7', '#f9a8d4'],
    minimalist: ['#94a3b8', '#64748b', '#e2e8f0'],
    retro: ['#06b6d4', '#a855f7', '#f0abfc'],
  };

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 4 + Math.random() * 4,
    size: 6 + Math.random() * 8,
    color: colors[theme][Math.floor(Math.random() * colors[theme].length)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-confetti"
          style={{
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

const BirthdayPage = () => {
  const { pageId } = useParams();
  const { getPageById } = useApp();
  const [showMessages, setShowMessages] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  
  const page = pageId ? getPageById(pageId) : undefined;

  useEffect(() => {
    const timer = setTimeout(() => setEntranceComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  
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

  const themeStyles = {
    elegant: {
      heroClass: 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-100',
      titleClass: 'font-serif text-amber-800',
      cardClass: 'bg-white/90 border-2 border-amber-200 shadow-lg',
    },
    playful: {
      heroClass: 'bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100',
      titleClass: 'text-pink-700',
      cardClass: 'bg-white/90 border-2 border-pink-200 shadow-lg -rotate-1 hover:rotate-0',
    },
    minimalist: {
      heroClass: 'bg-gradient-to-br from-slate-50 to-gray-100',
      titleClass: 'text-slate-800',
      cardClass: 'bg-white border border-slate-200',
    },
    retro: {
      heroClass: 'bg-gradient-to-br from-cyan-100 via-purple-100 to-pink-100',
      titleClass: 'text-purple-800',
      cardClass: 'bg-white/90 border-4 border-cyan-400 shadow-lg',
    },
  };

  const styles = themeStyles[page.theme];

  return (
    <div className={`min-h-screen ${styles.heroClass}`}>
      <ThemeConfetti theme={page.theme} />
      
      {/* Hero Section - Full screen entrance */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        <div className={cn(
          "text-center transition-all duration-1000",
          entranceComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <div className="text-8xl mb-6 animate-float">{theme.emoji}</div>
          <h1 className={cn(
            "text-4xl sm:text-5xl md:text-6xl font-bold mb-4",
            styles.titleClass,
            theme.font
          )}>
            Happy Birthday, {page.recipientName}!
          </h1>
          <p className={cn("text-xl mb-8", theme.colors.text, "opacity-70")}>
            {page.messages.length} friends sent you wishes
          </p>
          
          {!showMessages && (
            <Button 
              variant="hero" 
              size="xl" 
              onClick={() => setShowMessages(true)}
              className="gap-2 animate-pulse"
            >
              <Sparkles className="w-5 h-5" />
              Open Your Wishes
            </Button>
          )}
        </div>

        {!showMessages && (
          <button 
            onClick={() => setShowMessages(true)}
            className={cn(
              "absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity",
              theme.colors.text, "opacity-50 hover:opacity-100"
            )}
          >
            <span className="text-sm">Scroll to see wishes</span>
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </button>
        )}
      </section>

      {/* Messages Section */}
      {showMessages && (
        <section className="px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            {page.creatorMessage && (
              <div className={cn(
                "rounded-3xl p-8 mb-8 text-center animate-fade-in-up",
                `bg-gradient-to-br ${theme.colors.primary}`
              )}>
                <Heart className="w-8 h-8 text-primary-foreground mx-auto mb-4" />
                <p className="text-lg text-primary-foreground italic">"{page.creatorMessage}"</p>
                <p className="text-sm text-primary-foreground/70 mt-4">— From the organizer</p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {page.messages.map((msg, index) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "rounded-2xl p-6 transition-all duration-300 animate-fade-in-up hover:scale-[1.02]",
                    styles.cardClass
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <p className={cn("text-lg mb-4", theme.colors.text)}>
                    "{msg.message}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold",
                      `bg-gradient-to-br ${theme.colors.primary}`
                    )}>
                      {msg.senderName.charAt(0)}
                    </div>
                    <span className={cn("font-medium", theme.colors.text)}>
                      {msg.senderName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 text-center">
        <p className={cn("text-sm mb-4", theme.colors.text, "opacity-50")}>
          Made with ❤️ on WishCanvas
        </p>
        <Link to="/create">
          <Button variant="ghost" size="sm" className={theme.colors.text}>
            Create your own birthday page
          </Button>
        </Link>
      </footer>
    </div>
  );
};

export default BirthdayPage;
