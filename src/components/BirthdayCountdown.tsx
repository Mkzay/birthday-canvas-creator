import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

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

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div 
        className={cn(
          "w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-3xl sm:text-5xl md:text-6xl font-bold shadow-xl backdrop-blur-sm",
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
        "mt-3 text-sm sm:text-base font-medium uppercase tracking-wider",
        theme.text,
        theme.isCustom && "text-white/80"
      )}>
        {label}
      </span>
    </div>
  );

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Cover photo background */}
      {coverPhotoUrl && (
        <div className="absolute inset-0 z-0">
          <img 
            src={coverPhotoUrl} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-20 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-current/20" />
        </div>
      )}

      <div className="text-center relative z-10 animate-fade-in">
        {/* Animated emoji */}
        <div className="relative inline-block mb-8">
          <div className="text-7xl sm:text-8xl animate-bounce-slow filter drop-shadow-lg">
            {theme.emoji}
          </div>
        </div>

        {/* Title */}
        <h1 className={cn(
          "text-3xl sm:text-4xl md:text-5xl font-bold mb-4",
          theme.titleClass,
          theme.font,
          theme.isCustom && "text-white drop-shadow-lg"
        )}>
          {recipientName}'s Birthday
        </h1>

        <p className={cn(
          "text-lg sm:text-xl mb-12 opacity-80",
          theme.text,
          theme.isCustom && "text-white/90"
        )}>
          Something special is coming... 🎁
        </p>

        {/* Countdown */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
          <TimeBlock value={timeLeft.days} label="Days" />
          <TimeBlock value={timeLeft.hours} label="Hours" />
          <TimeBlock value={timeLeft.minutes} label="Minutes" />
          <TimeBlock value={timeLeft.seconds} label="Seconds" />
        </div>

        {/* Message */}
        <div className={cn(
          "max-w-md mx-auto p-6 rounded-2xl backdrop-blur-sm",
          theme.isCustom 
            ? "bg-white/10 border border-white/20" 
            : "bg-white/50 border border-white/50"
        )}>
          <p className={cn(
            "text-base sm:text-lg",
            theme.text,
            theme.isCustom && "text-white"
          )}>
            ✨ Your friends are preparing something special for you. Come back on your birthday to see all the wishes! ✨
          </p>
        </div>

        {/* Floating decorations */}
        <div className="absolute top-1/4 left-10 text-4xl animate-float-slow opacity-60">🎈</div>
        <div className="absolute top-1/3 right-10 text-4xl animate-float-slow opacity-60" style={{ animationDelay: '1s' }}>🎁</div>
        <div className="absolute bottom-1/4 left-1/4 text-4xl animate-float-slow opacity-60" style={{ animationDelay: '2s' }}>🎉</div>
        <div className="absolute bottom-1/3 right-1/4 text-4xl animate-float-slow opacity-60" style={{ animationDelay: '0.5s' }}>⭐</div>
      </div>
    </section>
  );
};

export default BirthdayCountdown;