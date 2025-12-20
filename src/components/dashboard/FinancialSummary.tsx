import { DollarSign, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface FinancialSummaryProps {
  medications: Medication[];
}

export const FinancialSummary = ({ medications }: FinancialSummaryProps) => {
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div 
            key={index}
            className={cn(
              'p-4 rounded-xl border transition-all duration-300 hover:scale-105',
              metric.bgColor,
              metric.borderColor
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <metric.icon className={cn('h-4 w-4', metric.color)} />
              <span className="text-xs text-muted-foreground">{metric.label}</span>
            </div>
            <p className={cn('text-2xl font-bold font-display', metric.color)}>
              {metric.negative && metric.value > 0 && '-'}${metric.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {financialMetrics.potentialSavings > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Potential Annual Savings with PharmaTrack AI</p>
              <p className="text-3xl font-bold font-display text-gradient mt-1">
                ${(financialMetrics.potentialSavings * 12).toLocaleString()}
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <TrendingDown className="h-8 w-8 text-primary-foreground transform rotate-180" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};