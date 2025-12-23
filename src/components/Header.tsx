import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg sm:text-xl">
            🎨
          </div>
          <span className="text-lg sm:text-xl font-bold text-primary-foreground">WishCanvas</span>
        </Link>
        <Link to={user ? "/dashboard" : "/auth"}>
          <Button variant="light" size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            {user ? 'Dashboard' : 'Sign In'}
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
