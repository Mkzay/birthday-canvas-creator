import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-8 sm:py-10 md:py-12 px-4 sm:px-6 bg-violet-900">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center text-lg sm:text-xl">
              🎨
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary-foreground">WishCanvas</span>
          </Link>
          <p className="text-primary-foreground/70 text-xs sm:text-sm text-center sm:text-right">
            Making birthdays unforgettable, one page at a time.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
