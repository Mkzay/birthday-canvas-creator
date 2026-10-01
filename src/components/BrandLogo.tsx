import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface BrandLogoProps {
  to?: string;
  compact?: boolean;
  className?: string;
  textClassName?: string;
  markClassName?: string;
}

const BrandLogo = ({ to, compact = false, className, textClassName, markClassName }: BrandLogoProps) => {
  const { user } = useAuth();
  const target = to || (user ? '/dashboard' : '/');

  return (
    <Link to={target} className={cn('inline-flex items-center gap-1', className)}>
      <img
        src="/wish-canvas-logo.png"
        onError={(e) => {
          // Fallback to svg if png fails
          e.currentTarget.src = '/wish-canvas-logo.svg';
        }}
        alt="WishCanvas"
        className={cn(
          compact ? 'h-10 w-10 rounded-2xl relative top-[1px]' : 'h-11 w-11 rounded-2xl sm:h-12 sm:w-12 relative top-[1px]',
          markClassName,
        )}
      />
      <span
        className={cn(
          'text-[1.3rem] font-bold tracking-tight text-foreground sm:text-[1.45rem] leading-tight',
          textClassName,
        )}
      >
        WishCanvas
      </span>
    </Link>
  );
};

export default BrandLogo;
