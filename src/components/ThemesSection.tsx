import React from 'react';

const themes = [
  { emoji: '✨', name: 'Elegant', gradient: 'from-amber-400 to-orange-500' },
  { emoji: '🎈', name: 'Playful', gradient: 'from-pink-500 to-purple-500' },
  { emoji: '🎯', name: 'Minimalist', gradient: 'from-slate-600 to-slate-800' },
  { emoji: '🌈', name: 'Retro', gradient: 'from-cyan-400 to-purple-500' },
  { emoji: '🌴', name: 'Tropical', gradient: 'from-green-400 to-emerald-500' },
  { emoji: '🚀', name: 'Cosmic', gradient: 'from-violet-500 to-indigo-600' },
  { emoji: '🌅', name: 'Sunset', gradient: 'from-orange-400 to-rose-500' },
  { emoji: '🌊', name: 'Ocean', gradient: 'from-sky-400 to-cyan-500' },
  { emoji: '🍭', name: 'Candyland', gradient: 'from-pink-400 to-purple-500' },
  { emoji: '🌙', name: 'Midnight', gradient: 'from-indigo-500 to-violet-600' },
];

const ThemesSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 gradient-light">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Personalize
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Choose Your Vibe
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-md mx-auto">
            10 stunning themes to match any celebration style
          </p>
        </div>
        
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4">
          {themes.map((theme, index) => (
            <div
              key={index}
              className={`aspect-square rounded-2xl sm:rounded-3xl bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 shadow-soft hover:shadow-glow-lg group`}
            >
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                {theme.emoji}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-primary-foreground">
                {theme.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThemesSection;
