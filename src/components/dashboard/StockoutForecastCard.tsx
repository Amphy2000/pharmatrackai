import { useState } from 'react';
import { TrendingDown, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Clock, CheckCircle2, Zap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockoutForecast, StockoutPrediction } from '@/services/autopilotEngine';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StockoutForecastCardProps {
  forecast: StockoutForecast;
  onRecordAction?: (route: string) => void;
}

const URGENCY_CONFIG = {
  critical: {
    label: 'Hits Reorder in ≤3 days',
    badge: 'bg-red-500/20 border-red-400/30 text-red-300',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    row: 'border-red-500/20 bg-red-500/5',
    velColor: 'text-red-300',
  },
  high: {
    label: 'Hits Reorder in ≤7 days',
    badge: 'bg-orange-500/20 border-orange-400/30 text-orange-300',
    icon: AlertCircle,
    iconColor: 'text-orange-400',
    row: 'border-orange-500/20 bg-orange-500/5',
    velColor: 'text-orange-300',
  },
  medium: {
    label: 'Hits Reorder in ≤21 days',
    badge: 'bg-sky-500/20 border-sky-400/30 text-sky-300',
    icon: Clock,
    iconColor: 'text-sky-400',
    row: 'border-sky-500/20 bg-sky-500/5',
    velColor: 'text-sky-300',
  },
};

const HEADER_URGENCY: Record<string, string> = {
  critical: 'from-red-950 via-slate-900 to-slate-900 border-red-500/25',
  high: 'from-orange-950 via-slate-900 to-slate-900 border-orange-500/25',
  medium: 'from-sky-950 via-slate-900 to-slate-900 border-sky-500/20',
  none: 'from-slate-900 via-slate-900 to-slate-900 border-slate-500/20',
};

function ForecastRow({
  item,
  formatPrice,
}: {
  item: StockoutPrediction;
  formatPrice: (v: number) => string;
}) {
  const cfg = URGENCY_CONFIG[item.urgency];
  const UrgencyIcon = cfg.icon;

  // Stockout progress: how close is the current stock to reorder level
  const stockRange = item.currentStock - item.reorderLevel;
  const totalRange = item.currentStock; // from 0 to current
  const progressPct = totalRange > 0 ? Math.round((stockRange / totalRange) * 100) : 0;

  return (
    <div className={cn('flex flex-col gap-2 p-3 rounded-xl border', cfg.row)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Left: name + urgency */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <UrgencyIcon className={cn('h-4 w-4 shrink-0', cfg.iconColor)} />
            <span className="font-semibold text-sm text-white truncate">{item.medicationName}</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="text-xs text-slate-400">
              Stock: <strong className="text-slate-200">{item.currentStock}</strong>
            </span>
            <span className="text-xs text-slate-400">
              Reorder at: <strong className="text-slate-200">{item.reorderLevel}</strong>
            </span>
            <span className={cn('text-xs font-semibold', cfg.velColor)}>
              ~{item.avgDailyVelocity} units/day
            </span>
            {item.supplierHint && (
              <span className="text-[10px] text-slate-500 truncate">{item.supplierHint}</span>
            )}
          </div>
        </div>

        {/* Right: metrics */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap">
          <div className="text-center">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Stockout In</p>
            <p className="text-lg font-bold text-white tabular-nums">
              {item.daysUntilStockout >= 999 ? '—' : `${item.daysUntilStockout}d`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Pre-Order</p>
            <p className="text-sm font-bold text-sky-300 tabular-nums">{item.suggestedPreOrderQty} units</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Est. Cost</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">
              {formatPrice(item.estimatedPreOrderCost || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Velocity depletion progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Stock buffer above reorder level</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="h-3 w-3" />
            <span>Projected stockout: {item.projectedStockoutDate}</span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              item.urgency === 'critical' ? 'bg-red-500' :
              item.urgency === 'high' ? 'bg-orange-500' : 'bg-sky-500'
            )}
            style={{ width: `${Math.max(2, progressPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export const StockoutForecastCard = ({ forecast, onRecordAction }: StockoutForecastCardProps) => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine overall urgency for header gradient
  const overallUrgency =
    forecast.criticalCount > 0 ? 'critical' :
    forecast.highCount > 0 ? 'high' :
    forecast.mediumCount > 0 ? 'medium' : 'none';

  if (!forecast || forecast.totalAtRisk === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-slate-900/80 p-4 text-white border border-sky-500/20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 border border-sky-400/30">
            <CheckCircle2 className="h-4 w-4 text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-300">No Stockout Risk Detected</p>
            <p className="text-[11px] text-slate-400">All selling medicines have sufficient stock for the next 21 days.</p>
          </div>
        </div>
      </div>
    );
  }

  const headerGradient = HEADER_URGENCY[overallUrgency] || HEADER_URGENCY.none;

  // ── Collapsed View ────────────────────────────────────────────────────────
  if (!isExpanded) {
    const borderColor =
      forecast.criticalCount > 0 ? 'border-l-red-500' :
      forecast.highCount > 0 ? 'border-l-orange-500' :
      'border-l-sky-500';

    return (
      <div className={cn(
        'relative rounded-xl bg-card border border-border/60 border-l-4 p-4 text-white shadow-sm',
        'flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap',
        'hover:bg-muted/30 transition-colors cursor-pointer',
        borderColor
      )} onClick={() => setIsExpanded(true)}>
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-400/20">
          <TrendingDown className="h-4 w-4 text-sky-400" />
        </div>

        {/* Label + summary */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mb-0.5">
            Stockout Forecast · 21-Day Horizon
          </p>
          <p className="text-sm font-semibold text-foreground truncate">
            {forecast.totalAtRisk} medicines approaching reorder level
            {forecast.criticalCount > 0 && (
              <span className="ml-2 text-red-400 font-bold">• {forecast.criticalCount} critical</span>
            )}
          </p>
        </div>

        {/* Primary stat */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pre-Order Est.</p>
          <p className="text-2xl font-bold text-sky-400 tabular-nums leading-none">{formatPrice(forecast.totalPreOrderCost || 0)}</p>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
          className="h-8 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white gap-1 px-3 shrink-0"
        >
          View Forecast <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ── Expanded View ─────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 sm:p-6 text-white shadow-xl border transition-all',
      headerGradient
    )}>
      {/* Background glow blobs */}
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-500/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-400/30">
              <TrendingDown className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-sky-300 tracking-widest uppercase block">
                Autopilot — Predictive Stockout Prevention
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                {forecast.totalAtRisk} Medicine{forecast.totalAtRisk > 1 ? 's' : ''} Will Hit Reorder Level Soon
              </h3>
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex flex-wrap items-center gap-2">
            {forecast.criticalCount > 0 && (
              <Badge className="bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-semibold gap-1">
                <AlertTriangle className="h-3 w-3" />
                {forecast.criticalCount} Critical
              </Badge>
            )}
            {forecast.highCount > 0 && (
              <Badge className="bg-orange-500/20 border border-orange-400/30 text-orange-300 text-[10px] font-semibold gap-1">
                <AlertCircle className="h-3 w-3" />
                {forecast.highCount} High Risk
              </Badge>
            )}
            {forecast.mediumCount > 0 && (
              <Badge className="bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-semibold gap-1">
                <Clock className="h-3 w-3" />
                {forecast.mediumCount} Upcoming
              </Badge>
            )}
          </div>
        </div>

        {/* Explainer */}
        <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
          These medicines are currently <span className="text-slate-200 font-medium">above their reorder level</span> but will
          reach it within 21 days based on 14-day sales velocity. Order early to prevent stockouts.
        </p>

        {/* ── Forecast Rows ──────────────────────────────────────────────── */}
        <div className="space-y-2 mb-4 max-h-[420px] overflow-y-auto pr-1">
          {forecast.predictions.map(item => (
            <ForecastRow key={item.medicationId} item={item} formatPrice={formatPrice} />
          ))}
        </div>

        {/* ── Total Pre-Order Cost Summary ───────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Pre-Order Estimate
              </p>
              <p className="text-xl font-bold text-white tabular-nums">
                {formatPrice(forecast.totalPreOrderCost || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Based on 14-day sales velocity × 30-day pre-order</p>
            {forecast.generatedAt && (
              <p className="text-[10px] text-slate-500">
                Forecast generated {new Date(forecast.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* ── Action Bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (onRecordAction) onRecordAction('/inventory?filter=low-stock');
              navigate('/inventory?filter=low-stock');
            }}
            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 shadow-md text-xs"
          >
            <TrendingDown className="h-4 w-4" />
            View Inventory & Pre-Order
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="text-xs text-slate-400 hover:text-white gap-1"
          >
            Collapse <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
