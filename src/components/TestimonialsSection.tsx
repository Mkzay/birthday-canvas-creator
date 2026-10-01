import { Heart, Sparkles, Volume2, MapPin } from 'lucide-react';

const CELEBRATION_STORIES = [
  {
    name: 'Chioma Adebayo',
    relationship: 'Organized for her Mom’s 60th',
    location: 'Lagos & London',
    photoUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    photoCaption: 'Mom’s 60th Birthday Dinner',
    handwrittenNote: 'She listened to every single voice note three times 🥹',
    quote:
      'Organized this for my mom’s 60th birthday with family scattered across Nigeria, the UK, and Canada. She listened to every voice note three times and cried happy tears. Seeing 30 people show up on one canvas made her feel so deeply loved.',
    tag: 'Mom’s 60th Milestone',
    badge: '30 Voice Notes Gathered',
    tilt: 'rotate-[-1deg]',
    tapeColor: 'bg-amber-200/90',
  },
  {
    name: 'Elena Rostova',
    relationship: 'Surprise for her partner David',
    location: 'Berlin & New York',
    photoUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    photoCaption: 'Midnight Birthday in Berlin',
    handwrittenNote: 'Opened at midnight while traveling abroad ✈️',
    quote:
      'My boyfriend was traveling abroad on his birthday. When he opened the link at midnight, the soft background music started and he saw 25 friends wishing him happy birthday with photos from the last 7 years. Best birthday gift ever.',
    tag: 'Long-Distance Partner',
    badge: '25 Friends Showed Up',
    tilt: 'rotate-[1deg]',
    tapeColor: 'bg-rose-200/90',
  },
  {
    name: 'Marcus Vance',
    relationship: 'Organized for his brother Tobi',
    location: 'San Francisco & Abuja',
    photoUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    photoCaption: 'Brother’s 21st Milestone',
    handwrittenNote: 'Ten times better than an awkward group chat ◡̈',
    quote:
      'Ten times better than an awkward group chat or passing around a paper card at the office. Everyone recorded a 30-second audio clip and the final Wrapped slide reveal looked like an Apple presentation. He was completely blown away.',
    tag: 'Brother’s 21st Surprise',
    badge: 'Audio Notes from 4 Countries',
    tilt: 'rotate-[-0.8deg]',
    tapeColor: 'bg-amber-200/90',
  },
];

const TestimonialsSection = () => {
  return (
    <section className="relative overflow-hidden bg-white py-20 px-4 sm:px-6 sm:py-28">
      {/* Background soft ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-1/3 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute right-[10%] bottom-1/3 h-80 w-80 rounded-full bg-rose-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-12 border-b border-stone-200/70">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
              Real Stories From Real People
            </span>
            <h2 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1]">
              Celebrations They Will <br />
              <span className="italic font-normal text-rose-500">Never Forget</span>
            </h2>
          </div>

          <div className="font-caveat text-xl sm:text-2xl text-slate-600 select-none sm:text-right">
            Real memories, real tears of joy ◡̈
          </div>
        </div>

        {/* 3 HIGHLY PERSONAL STORY CARDS */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {CELEBRATION_STORIES.map((story, i) => (
            <div
              key={i}
              className={`relative flex flex-col justify-between rounded-[2.2rem] border border-stone-200/90 bg-[#FAF7F2] p-6 sm:p-7 shadow-card transition-[transform,box-shadow] duration-250 ease-emil hover:shadow-card-lg hover:-translate-y-1.5 ${story.tilt} hover:rotate-0`}
            >
              {/* Washi Tape on Top Center */}
              <div
                className={`pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-xs shadow-xs rotate-[-1.5deg] ${story.tapeColor}`}
                aria-hidden="true"
              />

              <div>
                {/* Top Milestone Badge & Story Type */}
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="rounded-full bg-white px-3 py-1 font-bold text-slate-700 border border-stone-200 shadow-xs">
                    {story.tag}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-800 text-[11px]">
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    <span>{story.badge}</span>
                  </span>
                </div>

                {/* Polaroid Photo Snapshot */}
                <div className="relative rounded-2xl bg-white p-3 border border-stone-200/80 shadow-xs">
                  <div className="aspect-[16/10] overflow-hidden rounded-xl bg-stone-100">
                    <img
                      src={story.photoUrl}
                      alt={story.photoCaption}
                      className="h-full w-full object-cover transition-transform duration-300 ease-emil hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Handwritten Annotation Tape below Photo */}
                  <div className="pt-2.5 pb-1 text-center">
                    <p className="font-caveat text-lg text-slate-800 font-bold leading-tight">
                      &ldquo;{story.handwrittenNote}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Full Emotional Quote */}
                <blockquote className="mt-5 text-sm leading-relaxed text-slate-700 font-medium">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
              </div>

              {/* Storyteller Author Footer */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-200/60 text-xs">
                <div>
                  <p className="font-extrabold text-slate-950 text-sm">{story.name}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">{story.relationship}</p>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{story.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Social Proof Counter Bar */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-stone-200/80 bg-white p-5 text-center shadow-xs">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            <span className="text-xs font-bold text-slate-900">Over 10,000 birthday moments created</span>
          </div>
          <span className="hidden sm:inline text-stone-300">•</span>
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-900">45,000+ voice blessings delivered</span>
          </div>
          <span className="hidden sm:inline text-stone-300">•</span>
          <div className="font-caveat text-base text-slate-600">
            From Lagos to London, New York to Nairobi ◡̈
          </div>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
