import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Do my guests or contributors need to sign up or download an app?',
    answer:
      'Never! That is the magic of Wishcanvas. Anyone you share the link with can record a voice note, upload photos, or leave a heartfelt message right from their phone’s browser in under 60 seconds with zero signup required.',
  },
  {
    question: 'How does the Group Gift Cash Pool work?',
    answer:
      'When creating or editing your page, you can turn on the optional Cash Gift Pool and set a target goal (e.g. for a flight, birthday dinner, or gadget). Guests can securely chip in using Paystack (cards, bank transfer, or Apple Pay). Funds are held safely, and you can request a direct bank payout anytime.',
  },
  {
    question: 'Can I keep the birthday page secret until their actual birthday?',
    answer:
      'Yes! Wishcanvas has an automated Midnight Reveal Lock. When enabled, guests can contribute, but the birthday recipient only sees an elegant countdown timer until their birthday arrives. No accidental spoilers!',
  },
  {
    question: 'Can people record voice notes from their phones?',
    answer:
      'Yes, our audio recorder works seamlessly on iOS and Android browsers without any plugins. Friends tap record, speak their wish, listen to a preview, and submit. On the birthday, the recipient can listen to them with an ambient audio waveform visualizer.',
  },
  {
    question: 'Can I reorder or moderate wishes before revealing?',
    answer:
      'Absolutely. As the creator, your personal Dashboard gives you full moderation control. You can edit messages, reorder slides, hide inappropriate notes, and choose which memory polaroids to highlight before the big reveal.',
  },
  {
    question: 'Is Wishcanvas free to use?',
    answer:
      'Yes! You can create birthday pages, invite contributors, and collect messages and photos completely free. We also offer an optional one-time Pro upgrade for creators who want unlimited contributors, custom domain vanity links, advanced custom theme builders, and physical keepsake PDF exports.',
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative overflow-hidden bg-background py-20 px-4 sm:px-6 sm:py-28">
      <div className="relative mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <HelpCircle className="h-3.5 w-3.5" />
            Questions & Answers
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Everything you need to know
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Have questions about planning your group surprise? Here are the most common answers.
          </p>
        </div>

        <div className="mt-12 space-y-3.5">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left font-bold text-foreground hover:bg-muted/30 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg">{faq.question}</span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm leading-relaxed text-muted-foreground sm:text-base border-t border-border/40 pt-4 animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
