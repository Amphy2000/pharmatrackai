import { useState, useEffect, useCallback } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Brain, Zap, Target, DollarSign, Clock, Package, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Medication } from '@/types/medication';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { useAutopilotEngine } from '@/hooks/useAutopilotEngine';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AIInsightsPanelProps {
  medications?: Medication[];
  branchName?: string;
}

export const AIInsightsPanel = ({ medications, branchName }: AIInsightsPanelProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { currentBranchName } = useBranchContext();
  const { intelligence, reorderSuggestions, expiryBuckets, isLoading, runAutopilotBackgroundCheck } = useAutopilotEngine();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayBranchName = branchName || currentBranchName || 'Your Branch';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await runAutopilotBackgroundCheck();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'expiry': return Clock;
      case 'stock': return Package;
      case 'growth': return TrendingUp;
      case 'slow_moving': return DollarSign;
      default: return Lightbulb;
    }
  };

  const getTypeStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          icon: 'text-destructive bg-destructive/20',
          badge: 'bg-destructive/20 text-destructive border-destructive/30',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800/30',
          icon: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200',
        };
      default:
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/20',
          icon: 'text-primary bg-primary/10',
          badge: 'bg-primary/10 text-primary border-primary/20',
        };
    }
  };

  const insightsList = intelligence.insights || [];

  return (
    <div id="tour-ai-insights" className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-sm">
                <Brain className="h-6 w-6" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success border-2 border-background">
                <Zap className="h-3 w-3 text-success-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                Autopilot Business Insights
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> AUTOPILOT ACTIVE
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Deterministic inventory & sales intelligence for {displayBranchName} ($0 cost)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isRefreshing) && "animate-spin")} />
              Refresh
            </Button>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              <Target className="h-4 w-4 text-emerald-500" />
              <span>{insightsList.length} insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Autopilot analyzing inventory velocity...</p>
          </div>
        ) : insightsList.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Inventory in Excellent Health!</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No critical stockouts or expired items detected. Autopilot is continuously monitoring your stock.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insightsList.map((insight, index) => {
              const IconComp = getInsightIcon(insight.type);
              const style = getTypeStyle(insight.priority);

              return (
                <div
                  key={insight.id || index}
                  className={cn(
                    'relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between',
                    style.bg,
                    style.border
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-2 rounded-lg', style.icon)}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                          {insight.title}
                        </span>
                      </div>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', style.badge)}>
                        {insight.priority}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {insight.message}
                    </p>
                  </div>

                  {insight.valueAmount !== undefined && insight.valueAmount > 0 && (
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                      Value at risk / impact: {formatPrice(insight.valueAmount)}
                    </div>
                  )}

                  {insight.actionText && insight.actionRoute && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(insight.actionRoute!)}
                      className="w-full text-xs gap-1.5 justify-between font-semibold mt-1"
                    >
                      <span>{insight.actionText}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
