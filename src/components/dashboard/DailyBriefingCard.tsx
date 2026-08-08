import { Sparkles, ArrowRight, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DailyBriefing } from '@/services/autopilotEngine';
import { cn } from '@/lib/utils';

interface DailyBriefingCardProps {
  briefing: DailyBriefing;
  userName?: string;
  onRecordAction?: (actionId: string) => void;
}

export const DailyBriefingCard = ({ briefing, userName, onRecordAction }: DailyBriefingCardProps) => {
  const navigate = useNavigate();

  const handleActionClick = () => {
    if (onRecordAction) onRecordAction(briefing.recommendedActionRoute);
    navigate(briefing.recommendedActionRoute);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-5 sm:p-6 text-card-foreground shadow-sm">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
                Autopilot Daily Briefing
              </span>
              <h2 className="text-xl font-extrabold font-display text-foreground">
                {briefing.greeting}, {userName || 'Pharmacist'} 👋
              </h2>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Low Stock</span>
            </div>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums leading-none">{briefing.lowStockCount}</p>
            <p className="text-[11px] font-medium text-muted-foreground">medicines to restock</p>
          </div>

          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiring</span>
            </div>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums leading-none">{briefing.expiringCount30Days}</p>
            <p className="text-[11px] font-medium text-muted-foreground">expire this month</p>
          </div>

          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Supplier Est.</span>
            </div>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none truncate">
              ₦{(briefing.estimatedSupplierOrderCost || 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">purchase draft total</p>
          </div>

          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yesterday</span>
            </div>
            <p className={cn(
              'text-2xl font-extrabold tabular-nums leading-none',
              briefing.yesterdaySalesChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}>
              {briefing.yesterdaySalesChange >= 0 ? '+' : ''}{briefing.yesterdaySalesChange}%
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">vs. previous day</p>
          </div>
        </div>

        {/* Stagnant warning if available */}
        {briefing.stagnantMedName && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1 mb-4">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>
              Idle inventory: <strong className="text-foreground font-semibold">{briefing.stagnantMedName}</strong> has not sold in over {briefing.stagnantDays} days.
            </span>
          </div>
        )}

        {/* Recommended First Action Callout */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex-wrap sm:flex-nowrap">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Recommended First Action
            </span>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {briefing.recommendedActionText}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleActionClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-sm shrink-0"
          >
            <span>{briefing.recommendedActionBtnText}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
