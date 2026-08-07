import { useState, useMemo } from 'react';
import { Tag, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Clock, CheckCircle2, Percent, TrendingUp, Sparkles, Loader2, Sparkle } from 'lucide-react';
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
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-all duration-300', cfg.row)}>
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
          className="h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1 text-xs shadow-sm transition-transform active:scale-95"
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
  const { updateMedication, medications } = useMedications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Filter out processed items & items already marked as clearance_applied
  const visibleItems = useMemo(() => {
    if (!queue?.items) return [];
    return queue.items
      .filter(item => !processedIds.has(item.medicationId))
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [queue?.items, processedIds]);

  const totalValueAtRisk = useMemo(() => visibleItems.reduce((sum, i) => sum + i.valueAtRisk, 0), [visibleItems]);
  const totalPotentialRecovery = useMemo(() => visibleItems.reduce((sum, i) => sum + i.potentialRecovery, 0), [visibleItems]);

  const handleApplyDiscount = async (item: ClearanceQueueItem) => {
    setApplyingId(item.medicationId);
    try {
      // Find full medication object to preserve existing metadata
      const currentMed = medications.find(m => m.id === item.medicationId);
      const existingMetadata = currentMed?.metadata || {};

      await updateMedication.mutateAsync({
        id: item.medicationId,
        selling_price: item.discountedPrice,
        metadata: {
          ...existingMetadata,
          clearance_applied: true,
          clearance_discount: item.recommendedDiscountPercent,
          clearance_applied_at: new Date().toISOString(),
        },
      });

      // Mark as processed so it immediately vanishes from queue UI
      setProcessedIds(prev => new Set(prev).add(item.medicationId));

      toast({
        title: 'Clearance price updated in inventory!',
        description: `${item.medicationName} is now ${formatPrice(item.discountedPrice)} (-${item.recommendedDiscountPercent}%). Removed from clearance queue.`,
      });
      if (onRecordAction) onRecordAction('/inventory?filter=expiring');
    } catch (error) {
      toast({
        title: 'Failed to apply discount',
        description: 'Please check connection or try again from Inventory.',
        variant: 'destructive',
      });
    } finally {
      setApplyingId(null);
    }
  };

  if (!queue || visibleItems.length === 0) {
    return null; // All clearance items cleared or zero items
  }

  // Collapsed View — Premium left-border design
  if (!isExpanded) {
    const hasCritical = visibleItems.some(i => i.urgency === 'critical');
    const borderColor = hasCritical ? 'border-l-red-500' : 'border-l-amber-500';

    return (
      <div className={cn(
        'relative rounded-xl bg-card border border-border/60 border-l-4 p-4 text-white shadow-sm',
        'flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap',
        'hover:bg-muted/30 transition-colors cursor-pointer',
        borderColor
      )} onClick={() => setIsExpanded(true)}>
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-400/20">
          <Tag className="h-4 w-4 text-amber-400" />
        </div>

        {/* Label + summary */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">
            Clearance Queue
          </p>
          <p className="text-sm font-semibold text-foreground truncate">
            {visibleItems.length} medicines expiring soon
            {hasCritical && (
              <span className="ml-2 text-red-400 font-bold">• {visibleItems.filter(i => i.urgency === 'critical').length} critical (≤7d)</span>
            )}
          </p>
        </div>

        {/* Primary stat */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Value at Risk</p>
          <p className="text-2xl font-bold text-rose-400 tabular-nums leading-none">{formatPrice(totalValueAtRisk)}</p>
          <p className="text-[11px] text-emerald-400 font-semibold">Recoverable: {formatPrice(totalPotentialRecovery)}</p>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
          className="h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1 px-3 shrink-0"
        >
          Review <ChevronDown className="h-3.5 w-3.5" />
        </Button>
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
                {visibleItems.length} Product{visibleItems.length > 1 ? 's' : ''} Approaching Expiry
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-rose-500/20 border-rose-400/30 text-rose-300 text-[11px] py-1">
              Risk: {formatPrice(totalValueAtRisk)}
            </Badge>
            <Badge className="bg-emerald-500/20 border-emerald-400/30 text-emerald-300 text-[11px] py-1">
              Recoverable: {formatPrice(totalPotentialRecovery)}
            </Badge>
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-2 mb-4 max-h-[360px] overflow-y-auto pr-1">
          {visibleItems.map(item => (
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
