import { useState, useMemo } from 'react';
import { Tag, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Clock, CheckCircle2, Percent, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClearanceQueueSummary, ClearanceQueueItem } from '@/services/autopilotEngine';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMedications } from '@/hooks/useMedications';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClearanceQueueCardProps {
  queue: ClearanceQueueSummary;
  onRecordAction?: (route: string) => void;
}

const URGENCY_CONFIG = {
  critical: {
    label: 'Expires in <= 7d',
    badge: 'bg-red-500/20 border-red-400/30 text-red-300',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    row: 'border-red-500/20 bg-red-500/5',
  },
  urgent: {
    label: 'Expires in 8-30d',
    badge: 'bg-amber-500/20 border-amber-400/30 text-amber-300',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    row: 'border-amber-500/20 bg-amber-500/5',
  },
  warning: {
    label: 'Expires in 31-60d',
    badge: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300',
    icon: Clock,
    iconColor: 'text-yellow-400',
    row: 'border-yellow-500/20 bg-yellow-500/5',
  },
  notice: {
    label: 'Expires in 61-90d',
    badge: 'bg-blue-500/20 border-blue-400/30 text-blue-300',
    icon: Clock,
    iconColor: 'text-blue-400',
    row: 'border-blue-500/20 bg-blue-500/5',
  },
};

function ClearanceRow({
  item,
  formatPrice,
  onApply,
  isApplying,
}: {
  item: ClearanceQueueItem;
  formatPrice: (v: number) => string;
  onApply: (item: ClearanceQueueItem) => void;
  isApplying: boolean;
}) {
  const cfg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.notice;
  const UrgencyIcon = cfg.icon;

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border', cfg.row)}>
      {/* Left: name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <UrgencyIcon className={cn('h-4 w-4 shrink-0', cfg.iconColor)} />
          <span className="font-semibold text-sm text-white truncate">{item.medicationName}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>
            {item.daysUntilExpiry}d remaining
          </span>
          <span className="text-[10px] text-slate-400">Stock: {item.currentStock}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-slate-400">
            Original: <line-through className="line-through text-slate-400">{formatPrice(item.originalPrice)}</line-through>
          </span>
          <span className="text-xs font-bold text-emerald-400">
            Rec. Discounted: {formatPrice(item.discountedPrice)} (-{item.recommendedDiscountPercent}%)
          </span>
        </div>
      </div>

      {/* Right: action */}
      <div className="flex items-center gap-3 shrink-0">
        <Button
          size="sm"
          disabled={isApplying}
          onClick={() => onApply(item)}
          className="h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1 text-xs shadow-sm"
        >
          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
          Apply -{item.recommendedDiscountPercent}%
        </Button>
      </div>
    </div>
  );
}

export const ClearanceQueueCard = ({ queue, onRecordAction }: ClearanceQueueCardProps) => {
  const { formatPrice } = useCurrency();
  const { updateMedication } = useMedications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    if (!queue?.items) return [];
    return [...queue.items].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [queue?.items]);

  const handleApplyDiscount = async (item: ClearanceQueueItem) => {
    setApplyingId(item.medicationId);
    try {
      await updateMedication.mutateAsync({
        id: item.medicationId,
        selling_price: item.discountedPrice,
      });
      toast({
        title: 'Clearance price updated',
        description: `${item.medicationName} discounted by ${item.recommendedDiscountPercent}% to ${formatPrice(item.discountedPrice)}.`,
      });
      if (onRecordAction) onRecordAction('/inventory?filter=expiring');
    } catch {
      toast({
        title: 'Failed to apply discount',
        description: 'Please try again from Inventory.',
        variant: 'destructive',
      });
    } finally {
      setApplyingId(null);
    }
  };

  if (!queue || queue.totalItems === 0 || sortedItems.length === 0) {
    return null; // Don't show anything if zero items in clearance queue
  }

  // Collapsed View (Sleek 1-line bar)
  if (!isExpanded) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-500/25 p-3.5 text-white shadow-md flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300">
            <Tag className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Autopilot Clearance Queue
              </span>
              {queue.criticalCount > 0 && (
                <Badge className="bg-red-500/20 border-red-400/30 text-red-300 text-[10px] py-0 h-4">
                  {queue.criticalCount} Critical (&le;7d)
                </Badge>
              )}
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {queue.totalItems} medicines expiring soon • Value at risk: <span className="text-rose-300">{formatPrice(queue.totalValueAtRisk)}</span> • Recoverable: <span className="text-emerald-400">{formatPrice(queue.totalPotentialRecovery)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Button
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1 px-3 shadow-sm"
          >
            <span>Review Clearance ({queue.totalItems})</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Expanded View
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/90 via-slate-900 to-slate-900 p-5 sm:p-6 text-white shadow-xl border border-amber-500/30 transition-all">
      <div className="relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/30">
              <Tag className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-amber-300 tracking-widest uppercase block">
                Autopilot — Automatic Clearance Queue
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                {queue.totalItems} Product{queue.totalItems > 1 ? 's' : ''} Approaching Expiry
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-rose-500/20 border-rose-400/30 text-rose-300 text-[11px] py-1">
              Risk: {formatPrice(queue.totalValueAtRisk)}
            </Badge>
            <Badge className="bg-emerald-500/20 border-emerald-400/30 text-emerald-300 text-[11px] py-1">
              Recoverable: {formatPrice(queue.totalPotentialRecovery)}
            </Badge>
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-2 mb-4 max-h-[360px] overflow-y-auto pr-1">
          {sortedItems.map(item => (
            <ClearanceRow
              key={item.medicationId}
              item={item}
              formatPrice={formatPrice}
              onApply={handleApplyDiscount}
              isApplying={applyingId === item.medicationId}
            />
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (onRecordAction) onRecordAction('/inventory?filter=expiring');
              navigate('/inventory?filter=expiring');
            }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600/80 font-medium gap-2 text-xs"
          >
            <Tag className="h-3.5 w-3.5 text-amber-400" />
            Manage Expiring Stock in Inventory
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
