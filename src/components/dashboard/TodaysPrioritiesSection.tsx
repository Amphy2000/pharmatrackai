import { useNavigate } from 'react-router-dom';
import { PriorityActionItem } from '@/services/autopilotEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, AlertTriangle, ArrowRight, Clock, Package, TrendingUp, Sparkles, Flame, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TodaysPrioritiesSectionProps {
  priorities: PriorityActionItem[];
  onRecordAction?: (actionRoute: string) => void;
}

export const TodaysPrioritiesSection = ({ priorities, onRecordAction }: TodaysPrioritiesSectionProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  if (!priorities || priorities.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold">No Urgent Priorities Today</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          Autopilot engine reports all inventory levels and expiry dates are in good health.
        </p>
      </div>
    );
  }

  const getPriorityBadgeStyle = (score: number) => {
    if (score >= 95) return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    if (score >= 85) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    if (score >= 75) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical_out': return AlertOctagon;
      case 'expired': return ShieldAlert;
      case 'critical_expiry': return Clock;
      case 'low_stock': return Package;
      case 'fast_mover_risk': return Flame;
      default: return AlertTriangle;
    }
  };

  const handleAction = (item: PriorityActionItem) => {
    if (onRecordAction) onRecordAction(item.actionRoute);
    navigate(item.actionRoute);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            Today's Priorities
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Sorted by Urgency Score
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked deterministically by stock risk and financial impact
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {priorities.map((item) => {
          const IconComp = getIcon(item.type);
          const badgeClass = getPriorityBadgeStyle(item.priorityScore);

          return (
            <div
              key={item.id}
              className={cn(
                'relative p-5 rounded-2xl border bg-card transition-all duration-300 flex flex-col justify-between hover:shadow-md',
                item.priorityScore >= 90 ? 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/10' :
                item.priorityScore >= 80 ? 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10' :
                'border-border/60'
              )}
            >
              <div>
                {/* Header: Score Badge & Title */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'p-2 rounded-xl flex items-center justify-center shrink-0',
                      item.priorityScore >= 90 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                      item.priorityScore >= 80 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                      'bg-primary/10 text-primary'
                    )}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {item.medName}
                      </span>
                    </div>
                  </div>

                  <Badge variant="outline" className={cn('text-xs font-bold shrink-0', badgeClass)}>
                    Score {item.priorityScore}
                  </Badge>
                </div>

                {/* Reason & Action Description */}
                <div className="space-y-1.5 my-3 text-xs">
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Reason:</strong> {item.reason}
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">Recommended:</strong> {item.recommendedAction}
                  </p>
                </div>

                {/* Impact if available */}
                {item.valueImpact !== undefined && item.valueImpact > 0 && (
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                    Value Impact: {formatPrice(item.valueImpact)}
                  </div>
                )}
              </div>

              {/* 1-Click Action CTA */}
              <Button
                size="sm"
                onClick={() => handleAction(item)}
                className={cn(
                  'w-full text-xs font-bold gap-2 justify-between mt-2 shadow-sm',
                  item.priorityScore >= 90
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : item.priorityScore >= 80
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                )}
              >
                <span>{item.btnLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
