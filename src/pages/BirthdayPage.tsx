import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronDown, Sparkles, Heart, Loader2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BirthdayShareCard from '@/components/BirthdayShareCard';
import BirthdayCountdown from '@/components/BirthdayCountdown';
import { isBefore, startOfDay } from 'date-fns';

interface BirthdayPageData {
  id: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  creator_message: string | null;
  cover_photo_url: string | null;
}

interface Message {
  id: string;
  sender_name: string;
  message: string;
  photo_url: string | null;
  created_at: string;
}

const themeConfig = {
  elegant: {
    name: 'Elegant',
    emoji: '✨',
    colors: ['#fbbf24', '#f97316', '#fef3c7'],
    font: 'font-serif',
    heroClass: 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-100',
    titleClass: 'font-serif text-amber-800',
    cardClass: 'bg-white/90 border-2 border-amber-200 shadow-lg',
    primary: 'from-amber-400 to-orange-500',
    text: 'text-amber-900',
  },
  playful: {
    name: 'Playful',
    emoji: '🎈',
    colors: ['#ec4899', '#a855f7', '#f9a8d4'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100',
    titleClass: 'text-pink-700',
    cardClass: 'bg-white/90 border-2 border-pink-200 shadow-lg -rotate-1 hover:rotate-0',
    primary: 'from-pink-500 to-purple-500',
    text: 'text-pink-900',
  },
  minimalist: {
    name: 'Minimalist',
    emoji: '🎯',
    colors: ['#94a3b8', '#64748b', '#e2e8f0'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-slate-50 to-gray-100',
    titleClass: 'text-slate-800',
    cardClass: 'bg-white border border-slate-200',
    primary: 'from-slate-600 to-slate-800',
    text: 'text-slate-900',
  },
  retro: {
    name: 'Retro',
    emoji: '🌈',
    colors: ['#06b6d4', '#a855f7', '#f0abfc'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-cyan-100 via-purple-100 to-pink-100',
    titleClass: 'text-purple-800',
    cardClass: 'bg-white/90 border-4 border-cyan-400 shadow-lg',
    primary: 'from-cyan-400 to-purple-500',
    text: 'text-purple-900',
  },
  tropical: {
    name: 'Tropical',
    emoji: '🌴',
    colors: ['#22c55e', '#eab308', '#10b981'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-green-100 via-yellow-50 to-emerald-100',
    titleClass: 'text-emerald-800',
    cardClass: 'bg-white/90 border-2 border-green-300 shadow-lg',
    primary: 'from-green-400 to-emerald-500',
    text: 'text-emerald-900',
  },
  cosmic: {
    name: 'Cosmic',
    emoji: '🚀',
    colors: ['#8b5cf6', '#3b82f6', '#a78bfa'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-900',
    titleClass: 'text-violet-200',
    cardClass: 'bg-white/10 backdrop-blur-md border border-violet-400/30 shadow-xl',
    primary: 'from-violet-500 to-indigo-600',
    text: 'text-violet-100',
  },
  sunset: {
    name: 'Sunset',
    emoji: '🌅',
    colors: ['#f97316', '#ef4444', '#fbbf24'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-orange-200 via-rose-200 to-amber-200',
    titleClass: 'text-rose-800',
    cardClass: 'bg-white/90 border-2 border-orange-200 shadow-lg',
    primary: 'from-orange-400 to-rose-500',
    text: 'text-rose-900',
  },
  ocean: {
    name: 'Ocean',
    emoji: '🌊',
    colors: ['#0ea5e9', '#06b6d4', '#38bdf8'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-sky-200 via-cyan-100 to-blue-200',
    titleClass: 'text-sky-800',
    cardClass: 'bg-white/90 border-2 border-sky-200 shadow-lg',
    primary: 'from-sky-400 to-cyan-500',
    text: 'text-sky-900',
  },
  candyland: {
    name: 'Candyland',
    emoji: '🍭',
    colors: ['#f472b6', '#c084fc', '#a3e635'],
    font: 'font-sans',
    heroClass: 'bg-gradient-to-br from-pink-200 via-purple-100 to-lime-100',
    titleClass: 'text-fuchsia-700',
    cardClass: 'bg-white/90 border-4 border-pink-300 shadow-lg rotate-1 hover:rotate-0',
    primary: 'from-pink-400 to-purple-500',
    text: 'text-fuchsia-900',
  },
  midnight: {
    name: 'Midnight',
    emoji: '🌙',
    colors: ['#6366f1', '#4f46e5', '#818cf8'],
    font: 'font-serif',
    heroClass: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900',
    titleClass: 'text-indigo-200 font-serif',
    cardClass: 'bg-white/5 backdrop-blur-md border border-indigo-400/20 shadow-xl',
    primary: 'from-indigo-500 to-violet-600',
    text: 'text-indigo-100',
  },
};

// Floating shapes component for background decoration
const FloatingShapes = ({ theme }: { theme: keyof typeof themeConfig }) => {
  const colors = themeConfig[theme].colors;
  const shapes = ['circle', 'square', 'triangle', 'star'];
  
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 8,
    size: 20 + Math.random() * 40,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-slow"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        >
          {particle.shape === 'circle' && (
            <div className="w-full h-full rounded-full" style={{ backgroundColor: particle.color }} />
          )}
          {particle.shape === 'square' && (
            <div className="w-full h-full rounded-lg" style={{ backgroundColor: particle.color }} />
          )}
          {particle.shape === 'triangle' && (
            <div 
              className="w-0 h-0" 
              style={{ 
                borderLeft: `${particle.size/2}px solid transparent`,
                borderRight: `${particle.size/2}px solid transparent`,
                borderBottom: `${particle.size}px solid ${particle.color}`,
              }} 
            />
          )}
          {particle.shape === 'star' && (
            <div className="text-4xl" style={{ color: particle.color }}>★</div>
          )}
        </div>
      ))}
    </div>
  );
};

// Theme-specific confetti component with enhanced particles
const ThemeConfetti = ({ theme }: { theme: keyof typeof themeConfig }) => {
  const colors = themeConfig[theme].colors;

  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 4 + Math.random() * 4,
    size: 6 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    type: Math.random() > 0.5 ? 'circle' : 'rect',
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={cn(
            "absolute animate-confetti",
            particle.type === 'circle' ? 'rounded-full' : 'rounded-sm'
          )}
          style={{
            left: `${particle.left}%`,
            width: particle.type === 'rect' ? `${particle.size * 0.4}px` : `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

// Sparkle effect component
const SparkleEffect = ({ theme }: { theme: keyof typeof themeConfig }) => {
  const colors = themeConfig[theme].colors;
  
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 4,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute animate-sparkle"
          style={{
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: sparkle.color,
            animationDelay: `${sparkle.delay}s`,
            animationDuration: `${sparkle.duration}s`,
            borderRadius: '50%',
            boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`,
          }}
        />
      ))}
    </div>
  );
};

const BirthdayPage = () => {
  const { pageId } = useParams();
  const [page, setPage] = useState<BirthdayPageData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [customTheme, setCustomTheme] = useState<{ emoji: string; gradient_from: string; gradient_to: string; font: string } | null>(null);

  // Handle scroll to show messages
  useEffect(() => {
    const handleScroll = () => {
      if (!showMessages && window.scrollY > 100) {
        setShowMessages(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showMessages]);

  useEffect(() => {
    if (pageId) {
      fetchData();
    }
  }, [pageId]);

  useEffect(() => {
    const timer = setTimeout(() => setEntranceComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    const { data: pageData, error: pageError } = await supabase
      .from('birthday_pages')
      .select('*')
      .eq('id', pageId)
      .maybeSingle();

    if (pageError || !pageData) {
      setPage(null);
      setLoading(false);
      return;
    }

    setPage(pageData);

    // Check if it's a custom theme
    if (pageData.theme.startsWith('custom_')) {
      const customId = pageData.theme.replace('custom_', '');
      const { data: themeData } = await supabase
        .from('custom_themes')
        .select('emoji, gradient_from, gradient_to, font')
        .eq('id', customId)
        .maybeSingle();
      if (themeData) {
        setCustomTheme(themeData);
      }
    }

    const { data: messagesData } = await supabase
      .from('birthday_messages')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: true });

    setMessages(messagesData || []);
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

  // Get theme config - support custom themes
  const theme = customTheme 
    ? {
        name: 'Custom',
        emoji: customTheme.emoji,
        colors: [customTheme.gradient_from, customTheme.gradient_to, customTheme.gradient_from],
        font: customTheme.font === 'serif' ? 'font-serif' : 'font-sans',
        heroClass: '',
        titleClass: customTheme.font === 'serif' ? 'font-serif text-white' : 'text-white',
        cardClass: 'bg-white/90 border-2 border-white/30 shadow-lg',
        primary: '',
        text: 'text-white',
        isCustom: true,
        gradientFrom: customTheme.gradient_from,
        gradientTo: customTheme.gradient_to,
      }
    : { ...themeConfig[page.theme as keyof typeof themeConfig] || themeConfig.elegant, isCustom: false };

  const heroStyle = theme.isCustom 
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }
    : {};

  // Check if it's before the birthday
  const birthdayDate = startOfDay(new Date(page.birthday_date));
  const today = startOfDay(new Date());
  const isBeforeBirthday = isBefore(today, birthdayDate);

  // Show countdown if before birthday
  if (isBeforeBirthday) {
    return (
      <div 
        className={`min-h-screen ${!theme.isCustom ? theme.heroClass : ''} transition-colors duration-500`}
        style={heroStyle}
      >
        <FloatingShapes theme={page.theme as keyof typeof themeConfig} />
        <SparkleEffect theme={page.theme as keyof typeof themeConfig} />
        <BirthdayCountdown 
          targetDate={birthdayDate}
          recipientName={page.recipient_name}
          theme={theme}
          coverPhotoUrl={page.cover_photo_url}
        />
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen ${!theme.isCustom ? theme.heroClass : ''} transition-colors duration-500`}
      style={heroStyle}
    >
      <FloatingShapes theme={page.theme as keyof typeof themeConfig} />
      <ThemeConfetti theme={page.theme as keyof typeof themeConfig} />
      <SparkleEffect theme={page.theme as keyof typeof themeConfig} />
      
      {/* Photo lightbox with enhanced animation */}
      {expandedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer animate-fade-in backdrop-blur-sm"
          onClick={() => setExpandedPhoto(null)}
        >
          <img 
            src={expandedPhoto} 
            alt="Expanded photo" 
            className="max-w-full max-h-full object-contain rounded-2xl animate-scale-in shadow-2xl"
          />
        </div>
      )}
      
      {/* Hero Section - Full screen entrance with enhanced animations */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-current opacity-10 animate-pulse-slow z-0" />
        
        {/* Cover photo background with parallax effect */}
        {page.cover_photo_url && (
          <div className="absolute inset-0 z-0">
            <img 
              src={page.cover_photo_url} 
              alt="Cover" 
              className="w-full h-full object-cover opacity-20 scale-110 animate-slow-zoom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-current/20" />
          </div>
        )}
        
        <div className={cn(
          "text-center relative z-10",
          entranceComplete ? "animate-hero-entrance" : "opacity-0"
        )}>
          {/* Animated emoji with bounce and glow */}
          <div className="relative inline-block mb-8">
            <div className="text-8xl sm:text-9xl animate-bounce-slow filter drop-shadow-lg">
              {theme.emoji}
            </div>
            <div className="absolute inset-0 text-8xl sm:text-9xl animate-ping opacity-20">
              {theme.emoji}
            </div>
          </div>
          
          {/* Title with letter animation */}
          <h1 className={cn(
            "text-4xl sm:text-5xl md:text-7xl font-bold mb-6 animate-text-reveal",
            theme.titleClass,
            theme.font
          )}>
            Happy Birthday, {page.recipient_name}!
          </h1>
          
          {/* Subtitle with fade delay */}
          <p className={cn(
            "text-xl sm:text-2xl mb-10 animate-fade-in-delayed",
            theme.text, "opacity-80"
          )}>
            ✨ {messages.length} friends sent you wishes ✨
          </p>
          
          {!showMessages && (
            <Button 
              variant="hero" 
              size="xl" 
              onClick={() => setShowMessages(true)}
              className="gap-3 animate-glow-pulse text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 mb-32"
            >
              <Sparkles className="w-6 h-6 animate-spin-slow" />
              Open Your Wishes
            </Button>
          )}
        </div>

        {!showMessages && (
          <button 
            onClick={() => setShowMessages(true)}
            className={cn(
              "absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-300 z-10 group",
              theme.text, "opacity-60 hover:opacity-100"
            )}
          >
            <span className="text-xs font-medium tracking-wide uppercase">or scroll down</span>
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </button>
        )}
      </section>

      {/* Messages Section with staggered animations */}
      {showMessages && (
        <section className="px-6 pb-24 animate-section-reveal">
          <div className="max-w-4xl mx-auto">
            {page.creator_message && (
              <div className={cn(
                "rounded-3xl p-8 mb-12 text-center animate-slide-up transform hover:scale-[1.01] transition-transform duration-300",
                `bg-gradient-to-br ${theme.primary}`
              )}>
                <Heart className="w-10 h-10 text-primary-foreground mx-auto mb-4 animate-heartbeat" />
                <p className="text-xl text-primary-foreground italic font-medium">"{page.creator_message}"</p>
                <p className="text-sm text-primary-foreground/80 mt-4 font-medium">— From the organizer</p>
              </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "rounded-3xl p-6 transition-all duration-500 animate-card-entrance hover:scale-[1.03] hover:-translate-y-1",
                    theme.cardClass
                  )}
                  style={{ 
                    animationDelay: `${index * 0.15}s`,
                    animationFillMode: 'backwards'
                  }}
                >
                  {msg.photo_url && (
                    <div 
                      className="mb-5 -mx-2 -mt-2 cursor-pointer overflow-hidden rounded-2xl group"
                      onClick={() => setExpandedPhoto(msg.photo_url)}
                    >
                      <img 
                        src={msg.photo_url} 
                        alt={`Photo from ${msg.sender_name}`}
                        className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                  )}
                  <p className={cn("text-lg mb-5 leading-relaxed", theme.text)}>
                    "{msg.message}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md animate-avatar-pop",
                      `bg-gradient-to-br ${theme.primary}`
                    )}
                    style={{ animationDelay: `${index * 0.15 + 0.3}s` }}
                    >
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </div>
                    <span className={cn("font-semibold text-lg", theme.text)}>
                      {msg.sender_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {messages.length === 0 && (
              <div className="text-center py-16 animate-fade-in">
                <div className="text-6xl mb-6 animate-bounce-slow">💭</div>
                <p className={cn("text-xl", theme.text, "opacity-70")}>
                  No messages yet. Be the first to add one!
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Share Card Modal */}
      <BirthdayShareCard
        recipientName={page.recipient_name}
        messageCount={messages.length}
        themeEmoji={theme.emoji}
        themeColors={theme.colors}
        open={showShareCard}
        onOpenChange={setShowShareCard}
      />

      {/* Floating Share Button - Icon only */}
      {showMessages && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button 
            variant="hero" 
            size="icon"
            className="rounded-full shadow-xl w-14 h-14"
            onClick={() => setShowShareCard(true)}
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 text-center">
        <p className={cn("text-sm mb-4", theme.text, "opacity-50")}>
          Made with ❤️ on WishCanvas
        </p>
        <Link to="/create">
          <Button variant="ghost" size="sm" className={theme.text}>
            Create your own birthday page
          </Button>
        </Link>
      </footer>
    </div>
  );
};

export default BirthdayPage;
