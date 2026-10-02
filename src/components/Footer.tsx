import { Link } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import { Heart, ShieldCheck } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-stone-800 bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-12 items-start">
          
          {/* Brand Col (Span 5) */}
          <div className="md:col-span-5">
            <BrandLogo compact textClassName="text-white text-2xl font-black" markClassName="bg-white/10" />
            <p className="mt-4 max-w-sm text-sm text-slate-400 leading-relaxed font-medium">
              WishCanvas transforms scattered birthday messages, voice notes, and photo memories into an unforgettable collaborative celebration.
            </p>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Payments secured by Bachs (Card, Bank Transfer, USSD)</span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>for unforgettable celebrations worldwide.</span>
            </div>
          </div>

          {/* Quick Links Col (Span 3) */}
          <div className="md:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
              Explore
            </p>
            <ul className="space-y-3 text-sm text-slate-300 font-medium">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#themes" className="hover:text-white transition-colors">
                  Theme Studio
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Audio & Voice Notes
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Flat Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Closing Handwritten Doodle (Span 4) */}
          <div className="md:col-span-4 flex flex-col sm:items-end justify-between h-full">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
                Start Celebrating
              </p>
              <Link to="/create">
                <button className="rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 shadow-md hover:bg-stone-100 transition-transform active:scale-95">
                  Create a Free Canvas &rarr;
                </button>
              </Link>
            </div>

            {/* Handwritten doodle from Festivo */}
            <div className="mt-8 font-caveat text-2xl text-amber-300 select-none sm:text-right">
              Better birthdays, brighter tomorrows ◡̈
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} WishCanvas. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-400">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
