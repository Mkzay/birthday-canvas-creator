import { Heart, Quote, Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote:
      'Organized this for my mom’s 60th birthday with family across Nigeria, the UK, and Canada. She listened to every single voice note three times and cried happy tears. The group gift pool also funded her spa weekend!',
    author: 'Chioma Adebayo',
    role: 'Surprise Organizer for Mom’s 60th',
    location: 'Lagos & London',
    rating: 5,
    tag: 'Family Milestone',
    avatarBg: 'from-amber-400 to-orange-500',
    initials: 'CA',
  },
  {
    quote:
      'Ten times better than an awkward group chat or passing around a paper card at the office. Everyone recorded a 30-second audio clip and the final page looked like an Apple presentation. He was completely blown away.',
    author: 'Marcus Vance',
    role: 'Co-worker Birthday Surprise',
    location: 'San Francisco, CA',
    rating: 5,
    tag: 'Team Celebration',
    avatarBg: 'from-violet-500 to-indigo-600',
    initials: 'MV',
  },
  {
    quote:
      'My boyfriend was deployed abroad on his birthday. When he opened the link at midnight, the soft background music started and he saw 30 friends wishing him happy birthday. Truly the most meaningful gift.',
    author: 'Elena Rostova',
    role: 'Long-Distance Partner',
    location: 'New York, NY',
    rating: 5,
    tag: 'Long Distance',
    avatarBg: 'from-rose-500 to-pink-500',
    initials: 'ER',
  },
];

const TestimonialsSection = () => {
  return (
    <section className="relative overflow-hidden bg-card py-20 px-4 sm:px-6 sm:py-28">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-12 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
            Real Reactions
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            The tears are always happy ones
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            See how friends, families, and teams around the globe turn birthdays into treasured memories.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item, index) => (
            <article
              key={index}
              className="relative flex flex-col justify-between rounded-[2rem] border border-border/70 bg-gradient-to-br from-white/90 to-stone-50/80 p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-lg sm:p-8"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {item.tag}
                  </span>
                </div>

                <div className="mt-6">
                  <Quote className="h-8 w-8 text-primary/20" />
                  <p className="mt-2 text-sm leading-relaxed text-foreground font-medium sm:text-base">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3 border-t border-border/50 pt-5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.avatarBg} font-bold text-white shadow-sm`}
                >
                  {item.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{item.author}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                  <p className="text-[11px] text-primary/80 font-medium">{item.location}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Highlight trust metrics */}
        <div className="mt-14 grid grid-cols-2 gap-4 rounded-3xl border border-border/60 bg-muted/30 p-6 sm:grid-cols-4 sm:p-8 text-center">
          <div>
            <p className="text-3xl font-extrabold text-foreground sm:text-4xl">100%</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Free for Guests</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground sm:text-4xl">60s</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Contribution Time</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground sm:text-4xl">10+</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aesthetic Themes</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground sm:text-4xl">0</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apps Needed</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
