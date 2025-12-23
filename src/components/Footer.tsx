import React from 'react';

const Footer = () => {
  return (
    <footer className="py-12 px-6 bg-violet-900">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
            🎨
          </div>
          <span className="text-xl font-bold text-primary-foreground">WishCanvas</span>
        </div>
        <p className="text-primary-foreground/70">
          Making birthdays unforgettable, one page at a time.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
