import React from 'react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
            🎨
          </div>
          <span className="text-xl font-bold text-primary-foreground">WishCanvas</span>
        </div>
        <Button variant="light" size="sm">
          Sign In
        </Button>
      </div>
    </header>
  );
};

export default Header;
