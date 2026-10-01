import { Link } from 'react-router-dom';
import { Palette, Paintbrush2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { builtInThemeOptions } from '@/lib/themes';

const ThemesSection = () => {
  return (
    <section id="themes" className="relative overflow-hidden bg-card py-20 px-4 sm:px-6 sm:py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-[8%] h-56 w-56 rounded-full bg-secondary/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl xl:max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Palette className="h-3.5 w-3.5" />
            Curated Themes
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Aesthetic Themes for Every Vibe
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Choose from our designer-crafted palettes, or build a totally custom theme tailored to the birthday person.
          </p>
        </div>

        {/* Themes Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {builtInThemeOptions.map((theme) => (
            <article
              key={theme.key}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-b from-white to-stone-50/60 p-6 shadow-card transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-card-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.primary} text-2xl shadow-md transition-transform duration-300 group-hover:scale-110`}
                  >
                    <span>{theme.emoji}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                    {theme.mood}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold text-foreground">{theme.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{theme.description}</p>
              </div>

              {/* Color swatch bar */}
              <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: theme.gradientColors[0] }}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: theme.gradientColors[1] }}
                  />
                </div>
                <Link
                  to="/create"
                  className="text-xs font-bold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center gap-1"
                >
                  Use Theme &rarr;
                </Link>
              </div>
            </article>
          ))}

          {/* Custom Theme Builder Card */}
          <article className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-card-lg sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
                <Paintbrush2 className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">Need Something Totally Unique?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-md">
                Our Custom Theme Studio lets you design two-color or three-color gradients, pick custom font families, select unique emoji stamps, and upload custom icons.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/create">
                <Button size="sm" className="gradient-cta text-white font-bold shadow-sm">
                  <span>Open Theme Builder</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <span className="text-xs font-semibold text-muted-foreground">Available on all plans</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default ThemesSection;
