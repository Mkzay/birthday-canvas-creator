import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const logoHref = user && location.pathname !== '/' ? '/dashboard' : '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 sm:px-6 sm:py-4">
      <div className="glass-card mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 shadow-soft">
        <BrandLogo to={logoHref} compact className="gap-2 sm:gap-3" />
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
