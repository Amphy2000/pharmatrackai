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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-indigo-500/20">
      {/* Background glow decorations */}
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-300 tracking-wider uppercase">
                Autopilot Daily Briefing
              </span>
              <h2 className="text-xl font-bold font-display text-white">
                {briefing.greeting}, {userName || 'Pharmacist'} 👋
              </h2>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            0ms Local Engine Active
          </span>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-rose-400 tabular-nums leading-none">{briefing.lowStockCount}</p>
            <p className="text-[11px] text-slate-400">medicines to restock</p>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expiring</span>
            </div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums leading-none">{briefing.expiringCount30Days}</p>
            <p className="text-[11px] text-slate-400">expire this month</p>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier Est.</span>
            </div>
            <p className="text-lg font-bold text-emerald-400 tabular-nums leading-none truncate">
              ₦{(briefing.estimatedSupplierOrderCost || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400">purchase draft total</p>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Yesterday</span>
            </div>
            <p className={cn(
              'text-2xl font-bold tabular-nums leading-none',
              briefing.yesterdaySalesChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {briefing.yesterdaySalesChange >= 0 ? '+' : ''}{briefing.yesterdaySalesChange}%
            </p>
            <p className="text-[11px] text-slate-400">vs. previous day</p>
          </div>
        </div>

        {/* Stagnant warning if available */}
        {briefing.stagnantMedName && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1 mb-4">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              Idle inventory: <strong className="text-slate-200">{briefing.stagnantMedName}</strong> has not sold in over {briefing.stagnantDays} days.
            </span>
          </div>
        )}

        {/* Recommended First Action Callout */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex-wrap sm:flex-nowrap">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              Recommended First Action
            </span>
            <p className="text-sm font-semibold text-white mt-0.5">
              {briefing.recommendedActionText}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleActionClick}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold gap-2 shadow-md shrink-0"
          >
            <span>{briefing.recommendedActionBtnText}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
