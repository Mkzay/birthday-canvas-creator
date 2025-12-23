import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface CountdownProps {
  targetDate: Date;
  recipientName: string;
  theme: {
    emoji: string;
    titleClass: string;
    font: string;
    text: string;
    primary: string;
    isCustom?: boolean;
    gradientFrom?: string;
    gradientTo?: string;
  };
  coverPhotoUrl?: string | null;
}

const BirthdayCountdown = ({ targetDate, recipientName, theme, coverPhotoUrl }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showGotcha, setShowGotcha] = useState(false);
  const [gotchaPhase, setGotchaPhase] = useState<'loading' | 'gotcha' | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      
      // Set target to start of day for accurate countdown
      target.setHours(0, 0, 0, 0);
      
      if (now >= target) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const totalSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      return { days, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const handleEarlyReveal = () => {
    setShowGotcha(true);
    setGotchaPhase('loading');
    
    // Fake loading for suspense
    setTimeout(() => {
      setGotchaPhase('gotcha');
    }, 2000);
    
    // Reset after animation
    setTimeout(() => {
      setShowGotcha(false);
      setGotchaPhase(null);
    }, 6000);
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div 
        className={cn(
          "w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-4xl md:text-5xl font-bold shadow-lg sm:shadow-xl backdrop-blur-sm",
          theme.isCustom 
            ? "bg-white/20 text-white border border-white/30" 
            : `bg-gradient-to-br ${theme.primary} text-white`
        )}
        style={theme.isCustom ? {
          background: `linear-gradient(135deg, ${theme.gradientFrom}dd, ${theme.gradientTo}dd)`
        } : undefined}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className={cn(
        "mt-2 sm:mt-3 text-xs sm:text-sm font-medium uppercase tracking-wider",
        theme.text,
        theme.isCustom && "text-white/80"
      )}>
        {label}
      </span>
    </div>
  );

  // Gotcha overlay
  if (showGotcha) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden">
        {gotchaPhase === 'loading' && (
          <div className="text-center animate-fade-in">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 animate-bounce">🎁</div>
            <h2 className={cn(
              "text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4",
              theme.titleClass,
              theme.font,
              theme.isCustom && "text-white"
            )}>
              Revealing wishes early...
            </h2>
            <div className="flex justify-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        
        {gotchaPhase === 'gotcha' && (
          <div className="text-center animate-scale-in px-4">
            <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6 animate-wiggle">😜</div>
            <h2 className={cn(
              "text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4",
              theme.titleClass,
              theme.font,
              theme.isCustom && "text-white"
            )}>
              GOTCHA!
            </h2>
            <p className={cn(
              "text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6 opacity-90",
              theme.text,
              theme.isCustom && "text-white"
            )}>
              Nice try! 🎉
            </p>
            <p className={cn(
              "text-sm sm:text-base md:text-lg opacity-70 max-w-xs sm:max-w-none mx-auto",
              theme.text,
              theme.isCustom && "text-white/80"
            )}>
              You'll have to wait for your birthday like everyone else! 😄
            </p>
            
            {/* Floating teasing emojis - reduced for mobile */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-2xl sm:text-3xl md:text-4xl animate-float-away"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  {['😝', '🤭', '😏', '🙈', '🎊', '🎈'][i % 6]}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-0 relative overflow-hidden">

      <div className="text-center relative z-10 animate-fade-in w-full max-w-lg mx-auto">
        {/* Animated emoji */}
        <div className="relative inline-block mb-4 sm:mb-8">
          <div className="text-5xl sm:text-6xl md:text-7xl animate-bounce-slow filter drop-shadow-lg">
            {theme.emoji}
          </div>
        </div>

        {/* Title */}
        <h1 className={cn(
          "text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 px-2",
          theme.titleClass,
          theme.font,
          theme.isCustom && "text-white drop-shadow-lg"
        )}>
          {recipientName}'s Birthday
        </h1>

        <p className={cn(
          "text-base sm:text-lg md:text-xl mb-8 sm:mb-12 opacity-80",
          theme.text,
          theme.isCustom && "text-white/90"
        )}>
          Something special is coming... 🎁
        </p>

        {/* Countdown */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          <TimeBlock value={timeLeft.days} label="Days" />
          <TimeBlock value={timeLeft.hours} label="Hours" />
          <TimeBlock value={timeLeft.minutes} label="Mins" />
          <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>

        {/* Message */}
        <div className={cn(
          "max-w-sm sm:max-w-md mx-auto p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm mb-6 sm:mb-8",
          theme.isCustom 
            ? "bg-white/10 border border-white/20" 
            : "bg-white/50 border border-white/50"
        )}>
          <p className={cn(
            "text-sm sm:text-base md:text-lg",
            theme.text,
            theme.isCustom && "text-white"
          )}>
            ✨ Your friends are preparing something special. Come back on your birthday! ✨
          </p>
        </div>

        {/* Early reveal button */}
        <Button
          onClick={handleEarlyReveal}
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 backdrop-blur-sm transition-all hover:scale-105 text-sm",
            theme.isCustom 
              ? "bg-white/10 border-white/30 text-white hover:bg-white/20" 
              : "bg-white/50 border-white/50"
          )}
        >
          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Reveal early? 👀
        </Button>

        {/* Floating decorations - hidden on very small screens, reduced on mobile */}
        <div className="hidden sm:block absolute top-1/4 left-4 sm:left-10 text-2xl sm:text-3xl md:text-4xl animate-float-slow opacity-60">🎈</div>
        <div className="hidden sm:block absolute top-1/3 right-4 sm:right-10 text-2xl sm:text-3xl md:text-4xl animate-float-slow opacity-60" style={{ animationDelay: '1s' }}>🎁</div>
        <div className="hidden md:block absolute bottom-1/4 left-1/4 text-3xl md:text-4xl animate-float-slow opacity-60" style={{ animationDelay: '2s' }}>🎉</div>
        <div className="hidden md:block absolute bottom-1/3 right-1/4 text-3xl md:text-4xl animate-float-slow opacity-60" style={{ animationDelay: '0.5s' }}>⭐</div>
      </div>
    </section>
  );
};

export default BirthdayCountdown;