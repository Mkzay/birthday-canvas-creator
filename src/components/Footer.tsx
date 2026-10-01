import { Link } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import { Heart, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-foreground text-primary-foreground py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand Col */}
          <div>
            <BrandLogo compact textClassName="text-white text-xl font-black" markClassName="bg-white/10" />
            <p className="mt-4 max-w-sm text-sm text-primary-foreground/70 leading-relaxed">
              Wishcanvas transforms birthday wishes, voice notes, and photo memories into an unforgettable collaborative story.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/60">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>for unforgettable celebrations worldwide.</span>
            </div>
          </div>

          {/* Quick Links Col */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">
              Explore
            </p>
            <ul className="space-y-2.5 text-sm text-primary-foreground/80 font-medium">
              <li>
                <a href="#demo" className="hover:text-white transition-colors">
                  Interactive Demo
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features & Voice Notes
                </a>
              </li>
              <li>
                <a href="#themes" className="hover:text-white transition-colors">
                  Theme Studio
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Actions Col */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">
              Get Started
            </p>
            <ul className="space-y-2.5 text-sm text-primary-foreground/80 font-medium">
              <li>
                <Link to="/create" className="text-amber-300 font-bold hover:underline flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Create a Page</span>
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  My Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/50">
          <p>&copy; {new Date().getFullYear()} Wishcanvas. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Privacy Friendly &middot; No Guest Tracking</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
