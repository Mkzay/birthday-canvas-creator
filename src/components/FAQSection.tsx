import React, { useState } from 'react';
import {
  ChevronDown,
  MessageCircle,
  Heart,
  Quote,
} from 'lucide-react';

// Custom Unique SVG Icons for WishCanvas FAQ
const IconGuestShare = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-5 w-5 text-amber-800"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="2" width="14" height="20" rx="3" fill="#FDF6ED" />
    <path d="M12 18h.01" />
    <path d="M9 7l3 3 3-3" stroke="currentColor" />
    <path d="M12 10v-3" stroke="currentColor" />
    <circle cx="17" cy="6" r="2" fill="#E06D53" stroke="none" />
  </svg>
);

const IconWrappedStory = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-5 w-5 text-purple-800"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="14" rx="2.5" fill="#FAF5FF" />
    <path d="M8 2v4M16 2v4" />
    <circle cx="10" cy="11" r="2" fill="#9333EA" fillOpacity="0.2" />
    <path d="M12 9v4l3 2" />
    <path d="M7 21h10" />
  </svg>
);

const IconMidnightLock = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-5 w-5 text-rose-800"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="10" width="16" height="11" rx="2.5" fill="#FFF1F2" />
    <circle cx="12" cy="15.5" r="1.5" fill="#E11D48" />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    <path d="M12 4v2" stroke="#E11D48" />
  </svg>
);

const IconVoiceMic = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-5 w-5 text-amber-800"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="3" width="6" height="11" rx="3" fill="#FEF3C7" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <path d="M19 8c1 1.5 1 3.5 0 5" stroke="#D97706" />
    <path d="M22 6c2 3 2 7 0 9" stroke="#D97706" strokeOpacity="0.5" />
  </svg>
);

const IconOrganizeCards = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-5 w-5 text-indigo-800"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="3" width="11" height="13" rx="2" fill="#EEF2FF" transform="rotate(-6 4 3)" />
    <rect x="9" y="7" width="11" height="13" rx="2" fill="#FFFFFF" />
    <line x1="12" y1="11" x2="17" y2="11" stroke="#4F46E5" />
    <line x1="12" y1="14" x2="15" y2="14" stroke="#4F46E5" />
  </svg>
);

const IconFlatPrice = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-5 w-5 text-emerald-800"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="3" fill="#ECFDF5" />
    <path d="M3 10h18" />
    <circle cx="7.5" cy="15" r="1.5" fill="#059669" />
    <path d="M15 13l2 2 4-4" stroke="#059669" />
  </svg>
);

interface FAQItem {
  category: 'all' | 'guests' | 'reveal' | 'pricing';
  iconRenderer: () => React.JSX.Element;
  question: string;
  answer: string;
  creatorNote?: string;
}

const FAQS: FAQItem[] = [
  {
    category: 'guests',
    iconRenderer: IconGuestShare,
    question: 'Do my guests or contributors need to sign up or download an app?',
    answer:
      'Zero downloads, zero passwords, zero friction. Anyone with your link opens it directly in their phone browser, records a voice note or attaches a photo, and submits in under 60 seconds.',
    creatorNote: 'Drop the link into your WhatsApp family group chat and watch wishes roll in!',
  },
  {
    category: 'reveal',
    iconRenderer: IconWrappedStory,
    question: 'What is the Spotify Wrapped-style reveal experience?',
    answer:
      'Instead of an endless chat scroll, WishCanvas turns every note, voice clip, and photo into a full-screen cinematic musical presentation. When the birthday person taps their sealed letter, ambient music plays and wishes unfold slide by slide.',
    creatorNote: 'Have a box of tissues ready. Almost everyone cries happy tears hearing voices from afar 🥹',
  },
  {
    category: 'reveal',
    iconRenderer: IconMidnightLock,
    question: 'Can I keep the birthday page secret until their actual birthday?',
    answer:
      'Yes! That is what the Midnight Reveal Lock is built for. Friends can contribute days or weeks in advance, but the recipient only sees an elegant countdown clock ticking toward midnight on their birthday. No accidental spoilers.',
    creatorNote: 'Locks automatically until 12:00 AM on their special day.',
  },
  {
    category: 'guests',
    iconRenderer: IconVoiceMic,
    question: 'Can people record voice notes straight from their phones?',
    answer:
      'Yes, works seamlessly on both iPhone and Android browsers with zero extra plugins. Contributors tap record, speak their prayer or memory, review their audio, and pin it to the canvas. When revealed, it plays with dancing waveform visualizers.',
    creatorNote: 'Grandparents love this because speaking is so much easier than typing long messages ◡̈',
  },
  {
    category: 'all',
    iconRenderer: IconOrganizeCards,
    question: 'Can I reorder or moderate wishes before revealing?',
    answer:
      'Of course! You are the host. From your private Creator Dashboard, you can edit typos, reorder the slide sequence, hide any accidental duplicates, and select the best cover photo before the birthday reveal.',
    creatorNote: 'You have full editorial control from start to finish.',
  },
  {
    category: 'pricing',
    iconRenderer: IconFlatPrice,
    question: 'How does pricing work? Are there any hidden fees?',
    answer:
      'Completely transparent and simple. WishCanvas is 100% free for up to 6 contributors. When you want unlimited contributors, custom theme studio tools, and permanent keepsake export, it is a single flat one-time payment of ₦5,000 via Paystack. No recurring monthly subscriptions ever.',
    creatorNote: 'Pay once, keep the memory canvas and download your keepsake forever.',
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'guests' | 'reveal' | 'pricing'>('all');

  const filteredFaqs =
    activeCategory === 'all'
      ? FAQS
      : FAQS.filter((f) => f.category === activeCategory || f.category === 'all');

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative overflow-hidden bg-white py-20 px-4 sm:px-6 sm:py-28">
      {/* Background Soft Ambient Light */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[5%] top-1/4 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute left-[5%] bottom-1/4 h-80 w-80 rounded-full bg-rose-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        
        {/* Section Header */}
        <div className="text-center">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
            Common Questions
          </span>
          <h2 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Everything You Need To Know
          </h2>
          <p className="mt-4 font-caveat text-xl sm:text-2xl text-slate-600">
            No boring tech talk here, promise ◡̈
          </p>
        </div>

        {/* Clean Filter Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'guests', label: 'For Guests & Voice' },
            { id: 'reveal', label: 'Midnight Reveal' },
            { id: 'pricing', label: 'Flat ₦5,000 Pricing' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id as any);
                setOpenIndex(0);
              }}
              className={`btn-press rounded-full px-4 py-2 text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List with Custom Handcrafted Icons */}
        <div className="mt-10 space-y-4">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const Icon = faq.iconRenderer;

            return (
              <div
                key={index}
                className={`overflow-hidden rounded-3xl border transition-[border-color,background-color,box-shadow] duration-200 ease-emil ${
                  isOpen
                    ? 'border-amber-300/90 bg-[#FAF7F2] shadow-md'
                    : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50 shadow-xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="btn-press flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Custom Unique Vector Icon Frame */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                      <Icon />
                    </div>

                    <span className="text-base sm:text-lg font-extrabold text-slate-950 leading-snug">
                      {faq.question}
                    </span>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-250 ease-emil ${
                      isOpen
                        ? 'rotate-180 bg-slate-950 text-white border-slate-950'
                        : 'bg-stone-100 text-slate-600 border-stone-200'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {/* Emil Kowalski Smooth Grid-Based Accordion Expansion */}
                <div className={`accordion-grid-wrapper ${isOpen ? 'is-open' : ''}`}>
                  <div className="accordion-grid-inner">
                    <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-sm leading-relaxed text-slate-700 sm:text-base border-t border-stone-200/60 pt-4">
                      <p>{faq.answer}</p>

                      {/* Authentic Handwritten Creator Note (No AI Sparkle Pill) */}
                      {faq.creatorNote && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs text-amber-950 shadow-xs">
                          <Heart className="h-4 w-4 text-rose-500 fill-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-[11px] uppercase tracking-wider text-amber-900">
                              Creator note:
                            </p>
                            <p className="font-caveat text-base sm:text-lg text-slate-800 font-semibold leading-tight mt-0.5">
                              {faq.creatorNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warm Personal Support Card */}
        <div className="mt-14 relative overflow-hidden rounded-[2.2rem] border border-amber-200/80 bg-gradient-to-br from-[#FFFDF9] via-[#FAF7F2] to-amber-50/50 p-6 sm:p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 mb-3 shadow-xs">
            <MessageCircle className="h-6 w-6 text-amber-800" />
          </div>
          <h4 className="font-playfair text-xl font-bold text-slate-950">
            Still wondering about something? Talk to us!
          </h4>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            We are real humans who love celebrations. Drop us a note anytime and we will reply faster than you can blow out candles 🕯️⚡
          </p>
          <div className="mt-5 flex justify-center">
            <a
              href="mailto:hello@wishcanvas.app"
              className="btn-press inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Ask Us Anything</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FAQSection;
