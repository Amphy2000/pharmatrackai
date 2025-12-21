import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success';
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  className?: string;
  action?: ReactNode;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    glow: '',
    border: 'border-border/50',
  },
  primary: {
    icon: 'bg-primary/20 text-primary shadow-glow-primary',
    glow: 'hover:shadow-glow-primary',
    border: 'border-primary/20 hover:border-primary/40',
  },
  warning: {
    icon: 'bg-warning/20 text-warning shadow-glow-warning',
    glow: 'hover:shadow-glow-warning',
    border: 'border-warning/20 hover:border-warning/40',
  },
  danger: {
    icon: 'bg-destructive/20 text-destructive shadow-glow-danger',
    glow: 'hover:shadow-glow-danger',
    border: 'border-destructive/20 hover:border-destructive/40',
  },
  success: {
    icon: 'bg-success/20 text-success shadow-glow-success',
    glow: 'hover:shadow-glow-success',
    border: 'border-success/20 hover:border-success/40',
  },
};

export const MetricCard = ({
  title,
  value,
  icon,
  variant = 'default',
  subtitle,
  trend,
  trendLabel,
  className,
  action,
}: MetricCardProps) => {
  const styles = variantStyles[variant];

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? 'text-success' : trend && trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div 
      className={cn(
        'metric-card group cursor-pointer',
        styles.border,
        styles.glow,
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold font-display tracking-tight text-foreground">
              {value}
            </p>
            {trend !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          {(subtitle || trendLabel) && (
            <p className="text-sm text-muted-foreground">
              {trendLabel || subtitle}
            </p>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
        
        <div className={cn(
          'metric-card-icon group-hover:scale-110 group-hover:rotate-3',
          styles.icon
        )}>
          {icon}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl overflow-hidden">
        <div className="h-full w-0 group-hover:w-full bg-gradient-primary transition-all duration-500 ease-out" />
      </div>
    </div>
  );
};