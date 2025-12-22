import { Link } from 'react-router-dom';
import { Pill, Activity } from 'lucide-react';

interface LogoProps {
  showText?: boolean;
  linkTo?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo = ({ showText = true, linkTo = '/dashboard', size = 'md', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: {
      container: 'h-8 w-8',
      icon: 'h-3.5 w-3.5',
      badge: 'h-3 w-3',
      badgeIcon: 'h-1.5 w-1.5',
      text: 'text-base',
      subtitle: 'text-[9px]'
    },
    md: {
      container: 'h-9 w-9 sm:h-11 sm:w-11',
      icon: 'h-4 w-4 sm:h-5 sm:w-5',
      badge: 'h-3.5 w-3.5',
      badgeIcon: 'h-2 w-2',
      text: 'text-lg',
      subtitle: 'text-[10px]'
    },
    lg: {
      container: 'h-12 w-12 sm:h-14 sm:w-14',
      icon: 'h-5 w-5 sm:h-6 sm:w-6',
      badge: 'h-4 w-4',
      badgeIcon: 'h-2.5 w-2.5',
      text: 'text-xl sm:text-2xl',
      subtitle: 'text-[10px] sm:text-xs'
    }
  };

  const s = sizeClasses[size];

  const content = (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <div className="relative">
        <div className={`flex ${s.container} items-center justify-center rounded-xl bg-gradient-primary shadow-glow-primary`}>
          <Pill className={`${s.icon} text-primary-foreground`} />
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 flex ${s.badge} items-center justify-center rounded-full bg-success`}>
          <Activity className={`${s.badgeIcon} text-success-foreground`} />
        </div>
      </div>
      {showText && (
        <div>
          <h1 className={`${s.text} font-bold font-display tracking-tight`}>
            <span className="text-foreground">Pharma</span>
            <span className="text-gradient">Track</span>
          </h1>
          {size === 'lg' && (
            <p className={`${s.subtitle} text-muted-foreground hidden sm:block`}>AI Pharmacy Intelligence</p>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex-shrink-0">
        {content}
      </Link>
    );
  }

  return content;
};
