import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success';
  subtitle?: string;
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    icon: 'bg-medical-blue-light text-medical-blue',
    value: 'text-medical-blue',
  },
  warning: {
    icon: 'bg-amber-light text-amber-warning',
    value: 'text-amber-warning',
  },
  danger: {
    icon: 'bg-alert-red-light text-alert-red',
    value: 'text-alert-red',
  },
  success: {
    icon: 'bg-teal-light text-teal',
    value: 'text-teal',
  },
};

export const MetricCard = ({
  title,
  value,
  icon,
  variant = 'default',
  subtitle,
  className,
}: MetricCardProps) => {
  const styles = variantStyles[variant];

  return (
    <div className={cn('metric-card group', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-3xl font-bold font-display tracking-tight', styles.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn('metric-card-icon transition-transform duration-300 group-hover:scale-110', styles.icon)}>
          {icon}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
};
