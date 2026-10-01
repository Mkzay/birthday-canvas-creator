import { Link } from 'react-router-dom';
import { Check, ShieldCheck, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PricingSection = () => {
  return (
    <section id="pricing" className="relative overflow-hidden bg-[#FAF7F2] py-20 px-4 sm:px-6 sm:py-28">
      {/* Background soft ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[10%] top-12 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute left-[10%] bottom-10 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
            Simple, Transparent Pricing
          </span>
          <h2 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            One Flat Price. Zero Subscriptions.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base md:text-lg">
            Start completely free for intimate circles. Upgrade to Pro for a flat one-time payment when you want unlimited contributors.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-8 md:grid-cols-2 items-stretch max-w-4xl mx-auto">
          
          {/* FREE STARTER PLAN */}
          <div className="card-lift flex flex-col justify-between rounded-[2.5rem] border border-stone-200/90 bg-white p-7 sm:p-9 shadow-card hover:shadow-card-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-stone-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-stone-700">
                  Free Starter
                </span>
                <span className="text-xs font-bold text-slate-400">For small circles</span>
              </div>

              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-playfair text-4xl sm:text-5xl font-extrabold text-slate-950">₦0</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">/ free forever</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">
                  Perfect for an intimate family surprise or close-knit friends.
                </p>
              </div>

              <div className="mt-8 space-y-3.5 border-t border-stone-200/60 pt-6">
                {[
                  'Up to 6 contributors per canvas',
                  'Voice notes with animated audio waveform',
                  'Photo memories and heartfelt notes',
                  'The wax-seal letter reveal moment',
                  'Spotify Wrapped-style slide view',
                  '10 curated birthday themes',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 font-medium">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Link to="/create" className="block w-full">
                <Button variant="outline" className="btn-press w-full rounded-full py-6 font-bold text-slate-900 border-stone-300 hover:bg-stone-50 shadow-xs">
                  Start a Free Canvas
                </Button>
              </Link>
              <p className="mt-3 text-center text-[11px] text-slate-400 font-medium">
                No credit card needed · Free forever
              </p>
            </div>
          </div>

          {/* PRO CANVAS PLAN (Refined: No "Most Popular" Tag, Warm Gold Foil Framing) */}
          <div className="card-lift relative flex flex-col justify-between rounded-[2.5rem] border-2 border-amber-300/90 bg-gradient-to-b from-white via-white to-amber-50/25 p-7 sm:p-9 shadow-xl hover:shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-50 border border-amber-200/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 shadow-xs">
                  Pro Canvas
                </span>
                <span className="text-xs font-bold text-amber-800">One-time payment</span>
              </div>

              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-playfair text-4xl sm:text-5xl font-extrabold text-slate-950">₦5,000</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">/ single canvas</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">
                  Pay once when you are ready to reveal. No recurring charges and zero hidden fees.
                </p>
              </div>

              <div className="mt-8 space-y-3.5 border-t border-stone-200/60 pt-6">
                {[
                  'Unlimited contributors per canvas',
                  'Scheduled midnight reveal automation',
                  'Advanced custom theme studio',
                  'All 3 view modes (Story, Bento, Freeform)',
                  'Custom vanity links for easy sharing',
                  'Printable keepsake memory book export',
                  'Creator moderation dashboard',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs sm:text-sm text-slate-900 font-bold">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-xs">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Link to="/create" className="block w-full">
                <Button className="btn-press w-full rounded-full py-6 font-bold text-white bg-slate-950 hover:bg-slate-800 shadow-xl">
                  <span>Create with Pro</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <div className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-slate-600 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Secured by Paystack (Card, Transfer, USSD)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Reassurance Footer Banner */}
        <div className="mt-12 text-center">
          <p className="font-caveat text-lg sm:text-xl text-slate-600">
            One birthday, one flat price, memories saved forever ◡̈
          </p>
        </div>

      </div>
    </section>
  );
};

export default PricingSection;
