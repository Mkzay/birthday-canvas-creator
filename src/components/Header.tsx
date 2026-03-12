import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 sm:px-6 sm:py-4">
      <div className="glass-card mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 shadow-soft">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <div className="gradient-cta flex h-8 w-8 items-center justify-center rounded-lg text-lg text-white shadow-[0_8px_24px_hsla(300,70%,45%,0.25)] sm:h-10 sm:w-10 sm:rounded-xl sm:text-xl">
            🎨
          </div>
          <span className="text-lg font-bold text-foreground sm:text-xl">WishCanvas</span>
        </Link>
        <Link to={user ? '/dashboard' : '/auth'}>
          <Button variant="light" size="sm" className="px-3 text-xs sm:px-4 sm:text-sm">
            {user ? 'Dashboard' : 'Sign In'}
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
