import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  to: string;
  compact?: boolean;
  className?: string;
  textClassName?: string;
  markClassName?: string;
}

const BrandLogo = ({ to, compact = false, className, textClassName, markClassName }: BrandLogoProps) => {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-3', className)}>
      <img
        src="/brand-mark.svg"
        alt="WishCanvas"
        className={cn(compact ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl sm:h-11 sm:w-11', markClassName)}
      />
      <span className={cn('text-lg font-bold tracking-tight text-foreground sm:text-xl', textClassName)}>WishCanvas</span>
    </Link>
  );
};

export default BrandLogo;
