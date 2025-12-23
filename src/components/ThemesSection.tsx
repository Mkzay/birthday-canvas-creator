import React from 'react';

const themes = [
  {
    emoji: '✨',
    name: 'Elegant',
    gradient: 'from-violet-600 to-purple-700',
  },
  {
    emoji: '🎈',
    name: 'Playful',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    emoji: '🎯',
    name: 'Minimalist',
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    emoji: '🌈',
    name: 'Retro',
    gradient: 'from-amber-500 to-orange-600',
  },
];

const ThemesSection = () => {
  return (
    <section className="py-24 px-6 gradient-light">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-16">
          Choose Your Vibe
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {themes.map((theme, index) => (
            <div
              key={index}
              className={`aspect-square rounded-3xl bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all duration-300 shadow-soft hover:shadow-glow-lg group`}
            >
              <span className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {theme.emoji}
              </span>
              <span className="text-lg font-semibold text-primary-foreground">
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
