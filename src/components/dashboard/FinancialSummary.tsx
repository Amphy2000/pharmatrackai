import { DollarSign, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface FinancialSummaryProps {
  medications: Medication[];
}

export const FinancialSummary = ({ medications }: FinancialSummaryProps) => {
  const { formatPrice } = useCurrency();
  const financialMetrics = useMemo(() => {
    const today = new Date();
    
    let totalValue = 0;
    let expiredLoss = 0;
    let atRiskValue = 0;
    let potentialSavings = 0;

    medications.forEach(med => {
      const value = med.current_stock * Number(med.unit_price);
      const expiryDate = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      totalValue += value;

      if (daysUntilExpiry < 0) {
        expiredLoss += value;
        potentialSavings += value; // Could have been saved with better management
      } else if (daysUntilExpiry <= 30) {
        atRiskValue += value;
        potentialSavings += value * 0.5; // 50% could potentially be saved
      }
    });

    return {
      totalValue,
      expiredLoss,
      atRiskValue,
      potentialSavings,
      protectedValue: totalValue - expiredLoss - atRiskValue,
    };
  }, [medications]);

  const metrics = [
    {
      label: 'Total Inventory Value',
      value: financialMetrics.totalValue,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      label: 'Expired Loss',
      value: financialMetrics.expiredLoss,
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
      negative: true,
    },
    {
      label: 'At Risk (30 days)',
      value: financialMetrics.atRiskValue,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
    },
    {
      label: 'Protected Value',
      value: financialMetrics.protectedValue,
      icon: ShieldCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
  ];

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold font-display">Financial Overview</h3>
        <p className="text-sm text-muted-foreground">Real-time inventory valuation</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {metrics.map((metric, index) => (
          <div 
            key={index}
            className={cn(
              'p-3 md:p-4 rounded-xl border transition-all duration-300 hover:scale-105 min-w-0',
              metric.bgColor,
              metric.borderColor
            )}
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-2">
              <metric.icon className={cn('h-3 w-3 md:h-4 md:w-4 flex-shrink-0', metric.color)} />
              <span className="text-[10px] md:text-xs text-muted-foreground truncate">{metric.label}</span>
            </div>
            <p className={cn('text-base sm:text-lg md:text-2xl font-bold font-display truncate', metric.color)}>
              {metric.negative && metric.value > 0 && '-'}{formatPrice(metric.value)}
            </p>
          </div>
        ))}
      </div>

      {financialMetrics.potentialSavings > 0 && (
        <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Potential Annual Savings with PharmaTrack AI</p>
              <p className="text-lg sm:text-xl md:text-3xl font-bold font-display text-gradient mt-1 truncate">
                {formatPrice(financialMetrics.potentialSavings * 12)}
              </p>
            </div>
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <TrendingDown className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground transform rotate-180" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};