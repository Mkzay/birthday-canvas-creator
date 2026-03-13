import React from 'react';
import BrandLogo from '@/components/BrandLogo';

const Footer = () => {
  return (
    <footer className="py-8 sm:py-10 md:py-12 px-4 sm:px-6 bg-violet-900">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo compact textClassName="text-primary-foreground" markClassName="bg-white/10" />
          <p className="text-primary-foreground/70 text-xs sm:text-sm text-center sm:text-right">
            Making birthdays unforgettable, one page at a time.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
