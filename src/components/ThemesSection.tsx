import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Check, Heart, Music4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { builtInThemeOptions } from '@/lib/themes';

const DISPLAY_THEMES = [
  {
    key: 'elegant',
    name: 'Twilight Gold',
    emoji: '✨',
    paletteName: 'Champagne & Gold Foil',
    badge: 'Most Popular',
    soundtrack: 'Golden Hour (Acoustic Piano)',
    bgClass: 'from-amber-200/40 via-amber-100/30 to-stone-100',
    cardBg: 'bg-white',
    cardBorder: 'border-amber-200/90',
    tapeColor: 'bg-amber-300/80',
    accentText: 'text-amber-900',
    swatches: ['#fbbf24', '#f59e0b', '#d97706'],
    quote: 'Happy 23rd birthday Chi! Having you as a sister is one of life’s greatest blessings.',
    author: 'Ebube & Angel',
    description: 'Warm candlelight, soft champagne parchment, and gold foil accents.',
  },
  {
    key: 'sunset',
    name: 'Sunset Rose',
    emoji: '🌅',
    paletteName: 'Velvet Rose & Peach Glow',
    badge: 'Warm & Romantic',
    soundtrack: 'Warm Memories (Acoustic Guitar)',
    bgClass: 'from-rose-200/40 via-pink-100/30 to-amber-50',
    cardBg: 'bg-white',
    cardBorder: 'border-rose-200/90',
    tapeColor: 'bg-rose-300/80',
    accentText: 'text-rose-900',
    swatches: ['#fb7185', '#f43f5e', '#e11d48'],
    quote: 'May this new milestone chapter bring you endless laughter, peace, and abundance.',
    author: 'Stephanie',
    description: 'Blush pink, peach candlelight, and warm emotional intimacy.',
  },
  {
    key: 'cosmic',
    name: 'Cosmic Starlight',
    emoji: '🚀',
    paletteName: 'Midnight Indigo & Stars',
    badge: 'Cinematic Night',
    soundtrack: 'Celestial Dream (Ambient Synth)',
    bgClass: 'from-slate-900 via-indigo-950 to-purple-950',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-indigo-500/40',
    tapeColor: 'bg-indigo-400/80',
    accentText: 'text-indigo-200',
    swatches: ['#6366f1', '#8b5cf6', '#a855f7'],
    quote: 'To the brightest star in every room. Here is to reaching heights only you could dream of!',
    author: 'Chidi & Dayo',
    description: 'Deep-space indigo and starlight glow for a cinematic midnight reveal.',
  },
  {
    key: 'playful',
    name: 'Pastel Confetti',
    emoji: '🎈',
    paletteName: 'Sherbet Sprinkles & Joy',
    badge: 'Lively & Playful',
    soundtrack: 'Sunny Day (Upbeat Ukulele)',
    bgClass: 'from-pink-100 via-purple-100/40 to-amber-100/50',
    cardBg: 'bg-white',
    cardBorder: 'border-purple-200/90',
    tapeColor: 'bg-pink-300/80',
    accentText: 'text-purple-900',
    swatches: ['#ec4899', '#a855f7', '#3b82f6'],
    quote: 'Never stop dancing and singing at the top of your lungs! Best celebration ever!',
    author: 'University Squad',
    description: 'Bubbly, confetti-forward colors for high energy friends and family groups.',
  },
  {
    key: 'tropical',
    name: 'Tropical Oasis',
    emoji: '🌴',
    paletteName: 'Sage, Palm & Emerald',
    badge: 'Fresh & Airy',
    soundtrack: 'Breeze on the Coast (Lo-Fi Piano)',
    bgClass: 'from-emerald-100/50 via-teal-50 to-stone-100',
    cardBg: 'bg-white',
    cardBorder: 'border-emerald-200/90',
    tapeColor: 'bg-emerald-300/80',
    accentText: 'text-emerald-950',
    swatches: ['#34d399', '#10b981', '#059669'],
    quote: 'Sending peace, sunshine, and boundless good energy your way on this special day!',
    author: 'Sarah & David',
    description: 'Lush botanical greens and breezy island vibes for calm milestone pages.',
  },
  {
    key: 'minimalist',
    name: 'Editorial Linen',
    emoji: '🎯',
    paletteName: 'Charcoal & Crisp Linen',
    badge: 'Timeless Luxury',
    soundtrack: 'Acoustic Solo (Classical Strings)',
    bgClass: 'from-stone-200/50 via-stone-100 to-[#FAF7F2]',
    cardBg: 'bg-white',
    cardBorder: 'border-stone-300',
    tapeColor: 'bg-stone-300/80',
    accentText: 'text-stone-900',
    swatches: ['#78716c', '#44403c', '#1c1917'],
    quote: 'Simple words for someone truly extraordinary. Happy birthday, my friend.',
    author: 'Uncle Bode',
    description: 'Refined typography and clean framing that honors every handwritten word.',
  },
];

const ThemesSection = () => {
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const activeTheme = DISPLAY_THEMES[selectedThemeIndex];
  const isDark = activeTheme.key === 'cosmic';

  return (
    <section id="themes" className="relative overflow-hidden bg-[#FAF7F2] py-20 px-4 sm:px-6 sm:py-28">
      <div className="relative mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-12 border-b border-stone-200/60">
          <div className="text-center lg:text-left">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
              Personalized Moods
            </span>
            <h2 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1]">
              A Canvas Styled For <br />
              <span className="italic font-normal text-rose-500">Their</span> Personality
            </h2>
          </div>

          <div className="font-caveat text-xl sm:text-2xl text-slate-600 select-none text-center lg:text-right">
            Every birthday has its own mood ◡̈
          </div>
        </div>

        {/* INTERACTIVE LIVE THEME EXPLORER STAGE */}
        <div className="mt-10 sm:mt-12 rounded-[2rem] sm:rounded-[2.5rem] border border-stone-200/80 bg-white p-4 sm:p-10 shadow-card">
          
          {/* Top Pill Switcher */}
          <div className="flex items-center gap-2 border-b border-stone-100 pb-6 overflow-x-auto scrollbar-hide sm:flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 hidden sm:inline">
              Select Mood:
            </span>
            {DISPLAY_THEMES.map((theme, idx) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => setSelectedThemeIndex(idx)}
                className={`btn-press flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedThemeIndex === idx
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                <span>{theme.emoji}</span>
                <span>{theme.name}</span>
              </button>
            ))}
          </div>

          {/* Live Dynamic Preview Board */}
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-center">
            
            {/* Left: Theme Details & Palette Story (Span 5) */}
            <div key={`theme-info-${selectedThemeIndex}`} className="tab-crossfade text-left lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-slate-800">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>{activeTheme.badge}</span>
              </div>

              <h3 className="mt-4 font-playfair text-3xl font-extrabold text-slate-950 sm:text-4xl">
                {activeTheme.name}
              </h3>

              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                {activeTheme.paletteName}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {activeTheme.description}
              </p>

              {/* Color Swatch Dots */}
              <div className="mt-6 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Palette Tokens:</span>
                <div className="flex gap-2">
                  {activeTheme.swatches.map((color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Soundtrack Pairing */}
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-[#FAF7F2] border border-stone-200/80 p-3 text-xs text-slate-700">
                <Music4 className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900 leading-tight">Curated Soundtrack</p>
                  <p className="text-[11px] text-slate-500">{activeTheme.soundtrack}</p>
                </div>
              </div>

              <div className="mt-8">
                <Link to="/create">
                  <Button className="btn-press rounded-full bg-slate-950 px-7 py-5 text-xs font-bold text-white shadow-md hover:bg-slate-800">
                    <span>Create with {activeTheme.name}</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Live Dynamic Canvas Card Showcase (Span 7) */}
            <div className="lg:col-span-7">
              <div
                key={`theme-preview-${selectedThemeIndex}`}
                className={`tab-crossfade relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.5rem] sm:rounded-[2.2rem] border p-4 sm:p-8 shadow-xl bg-gradient-to-br ${activeTheme.bgClass} ${
                  isDark ? 'border-indigo-500/30 text-white' : 'border-stone-200 text-slate-900'
                }`}
              >
                {/* Header of the Canvas */}
                <div className="flex items-center justify-between border-b pb-4 text-xs opacity-75 border-current/20">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeTheme.emoji}</span>
                    <span className="font-bold uppercase tracking-wider">{activeTheme.name} Theme</span>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-xs">
                    Live Sample
                  </span>
                </div>

                {/* Wish Card inside Canvas */}
                <div
                  className={`relative mt-6 rounded-2xl border p-5 shadow-lg text-left transition-all duration-300 ${activeTheme.cardBg} ${activeTheme.cardBorder} ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  {/* Washi tape strip */}
                  <div
                    className={`pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-xs shadow-xs rotate-[-1deg] ${activeTheme.tapeColor}`}
                    aria-hidden="true"
                  />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black uppercase tracking-wider text-[11px] opacity-80">
                        {activeTheme.author}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold opacity-60">
                      Letter 1 of 24
                    </span>
                  </div>

                  <blockquote className="mt-3 font-playfair text-lg sm:text-xl font-bold leading-snug">
                    &ldquo;{activeTheme.quote}&rdquo;
                  </blockquote>

                  {/* Audio pill indicator */}
                  <div
                    className={`mt-4 flex items-center justify-between rounded-xl p-2.5 text-xs font-bold ${
                      isDark ? 'bg-white/10 text-white' : 'bg-stone-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Music4 className="h-3.5 w-3.5 text-amber-500" />
                      <span>Includes 0:42 Voice Blessing</span>
                    </div>
                    <span className="opacity-70 font-mono text-[10px]">0:18 / 0:42</span>
                  </div>

                  {/* Reactions */}
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-current/10 text-xs">
                    <span className="opacity-50 text-[10px]">WishCanvas · Verified Contributor</span>
                    <div className="flex items-center gap-1 font-bold text-rose-500">
                      <Heart className="h-3.5 w-3.5 fill-rose-500" />
                      <span>28</span>
                    </div>
                  </div>
                </div>

                {/* Floating stickers */}
                <div className="pointer-events-none absolute bottom-4 right-4 text-2xl select-none animate-float">
                  ✨
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BALANCED 6-THEME GALLERY GRID (2 rows of 3 on desktop, perfectly balanced) */}
        <div className="mt-14">
          <div className="text-center mb-8">
            <h3 className="font-playfair text-2xl font-bold text-slate-950 sm:text-3xl">
              All 6 Signature Aesthetics
            </h3>
            <p className="mt-2 text-xs text-slate-500 font-medium">
              Click any aesthetic to preview it on the canvas above
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DISPLAY_THEMES.map((theme, idx) => {
              const isSelected = selectedThemeIndex === idx;
              return (
                <div
                  key={theme.key}
                  onClick={() => setSelectedThemeIndex(idx)}
                  className={`btn-press card-lift group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border p-4 sm:p-6 text-left cursor-pointer ${
                    isSelected
                      ? 'border-slate-950 bg-white shadow-xl ring-2 ring-slate-950'
                      : 'border-stone-200/80 bg-white shadow-xs hover:border-stone-300'
                  }`}
                >
                  {/* Top Row: Emoji & Badge */}
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl shadow-xs border border-stone-200/60">
                      {theme.emoji}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? 'bg-slate-950 text-white'
                          : 'bg-stone-100 text-slate-600'
                      }`}
                    >
                      {theme.badge}
                    </span>
                  </div>

                  {/* Middle Row: Name & Palette Dots */}
                  <div className="mt-6">
                    <h4 className="text-lg font-extrabold text-slate-950 group-hover:text-amber-800 transition-colors">
                      {theme.name}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                      {theme.description}
                    </p>

                    {/* Color Swatches */}
                    <div className="mt-4 flex items-center gap-1.5">
                      {theme.swatches.map((color) => (
                        <span
                          key={color}
                          className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <span className="ml-2 text-[10px] font-bold text-slate-400">
                        {theme.paletteName.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Preview Button */}
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100">
                    <span className="text-xs font-bold text-slate-700">
                      {isSelected ? 'Currently Previewing' : 'Click to Preview'}
                    </span>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                        isSelected ? 'bg-slate-950 text-white' : 'bg-stone-100 text-slate-700'
                      }`}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default ThemesSection;
