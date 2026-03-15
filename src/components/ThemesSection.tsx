import React from 'react';
import { Palette, Paintbrush2 } from 'lucide-react';
import { builtInThemeOptions } from '@/lib/themes';

const showcasedThemes = builtInThemeOptions.slice(0, 5);

const ThemesSection = () => {
  return (
    <section className="relative overflow-hidden gradient-light px-4 py-20 sm:px-6 sm:py-24 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-12 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-[8%] h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl xl:max-w-[82rem]">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-3 py-1 text-xs font-semibold text-primary shadow-sm sm:text-sm">
            <Palette className="h-3.5 w-3.5" />
            Themes
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pick a mood for the page
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Keep it playful, polished, modern, or build something custom for the birthday person.
          </p>
        </div>

        <div className="mt-14 grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-9">
          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-[repeat(5,minmax(0,1fr))] xl:gap-5">
            {showcasedThemes.map((theme) => (
              <article
                key={theme.key}
                className="aspect-square flex flex-col items-center justify-center text-center rounded-[2rem] border border-border/60 bg-white/82 p-5 shadow-card transition-transform duration-300 hover:-translate-y-1 xl:p-6"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.primary} text-xl shadow-lg`}>
                  <span>{theme.emoji}</span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary/65">{theme.mood}</p>
                <h3 className="mt-2 text-lg font-bold text-foreground">{theme.name}</h3>
              </article>
            ))}
          </div>

          <aside className="rounded-[2rem] border border-border/60 bg-white/82 p-6 shadow-card lg:sticky lg:top-24 xl:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Paintbrush2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">Need something more personal?</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Use the custom theme builder to choose your own emoji, gradient, and type feel.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">Custom emoji</span>
              <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">Two-color gradient</span>
              <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">Serif or modern</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default ThemesSection;
