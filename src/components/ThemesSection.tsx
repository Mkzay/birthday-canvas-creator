import React from 'react';

const themes = [
  {
    emoji: '✨',
    name: 'Elegant',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    emoji: '🎈',
    name: 'Playful',
    gradient: 'from-pink-500 to-purple-500',
  },
  {
    emoji: '🎯',
    name: 'Minimalist',
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    emoji: '🌈',
    name: 'Retro',
    gradient: 'from-cyan-400 to-purple-500',
  },
  {
    emoji: '🌴',
    name: 'Tropical',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    emoji: '🚀',
    name: 'Cosmic',
    gradient: 'from-violet-500 to-indigo-600',
  },
  {
    emoji: '🌅',
    name: 'Sunset',
    gradient: 'from-orange-400 to-rose-500',
  },
  {
    emoji: '🌊',
    name: 'Ocean',
    gradient: 'from-sky-400 to-cyan-500',
  },
  {
    emoji: '🍭',
    name: 'Candyland',
    gradient: 'from-pink-400 to-purple-500',
  },
  {
    emoji: '🌙',
    name: 'Midnight',
    gradient: 'from-indigo-500 to-violet-600',
  },
];

const ThemesSection = () => {
  return (
    <section className="py-24 px-6 gradient-light">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-4">
          Choose Your Vibe
        </h2>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          10 stunning themes to match any celebration style
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
          {themes.map((theme, index) => (
            <div
              key={index}
              className={`aspect-square rounded-3xl bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all duration-300 shadow-soft hover:shadow-glow-lg group`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="text-4xl md:text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">
                {theme.emoji}
              </span>
              <span className="text-sm md:text-base font-semibold text-primary-foreground">
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
