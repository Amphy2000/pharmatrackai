import { useState, useMemo } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, CheckCircle2, Package, Clock, BadgeCheck, FileText, MessageSquare, Printer, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PurchaseOrderDraft, PurchaseOrderLineItem } from '@/services/autopilotEngine';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { generatePurchaseOrder, generateOrderNumber } from '@/utils/purchaseOrderGenerator';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PurchaseOrderDraftCardProps {
  draft: PurchaseOrderDraft;
  onRecordAction?: (route: string) => void;
}

const URGENCY_CONFIG = {
  critical: {
    label: 'Out of Stock',
    badge: 'bg-red-500/20 border-red-400/30 text-red-300',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    row: 'border-red-500/20 bg-red-500/5',
  },
  high: {
    label: 'Running Low',
    badge: 'bg-orange-500/20 border-orange-400/30 text-orange-300',
    icon: AlertCircle,
    iconColor: 'text-orange-400',
    row: 'border-orange-500/20 bg-orange-500/5',
  },
  medium: {
    label: 'Below Reorder',
    badge: 'bg-amber-500/20 border-amber-400/30 text-amber-300',
    icon: Clock,
    iconColor: 'text-amber-400',
    row: 'border-amber-500/20 bg-amber-500/5',
  },
  low: {
    label: 'Monitor',
    badge: 'bg-blue-500/20 border-blue-400/30 text-blue-300',
    icon: Info,
    iconColor: 'text-blue-400',
    row: 'border-blue-500/20 bg-blue-500/5',
  },
};

const HEADER_URGENCY = {
  critical: 'from-red-950 via-slate-900 to-slate-900 border-red-500/25',
  high: 'from-orange-950 via-slate-900 to-slate-900 border-orange-500/25',
  medium: 'from-amber-950 via-slate-900 to-slate-900 border-amber-500/25',
  low: 'from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/20',
};

function LineItemRow({ item, formatPrice }: { item: PurchaseOrderLineItem; formatPrice: (v: number) => string }) {
  const cfg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.low;
  const UrgencyIcon = cfg.icon;

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border', cfg.row)}>
      {/* Left: name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <UrgencyIcon className={cn('h-4 w-4 shrink-0', cfg.iconColor)} />
          <span className="font-semibold text-sm text-white truncate">{item.medicationName}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>
            {cfg.label}
          </span>
          {item.supplierHint && (
            <span className="text-[10px] text-slate-400 truncate">{item.supplierHint}</span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="text-xs text-slate-400">
            Stock: <strong className="text-slate-200">{item.currentStock}</strong>
          </span>
          <span className="text-xs text-slate-400">
            Reorder at: <strong className="text-slate-200">{item.reorderLevel}</strong>
          </span>
          {item.avgDailyConsumption > 0 && (
            <span className="text-xs text-slate-400">
              ~{item.avgDailyConsumption} units/day
            </span>
          )}
        </div>
      </div>

      {/* Right: order quantity + cost + post-reorder days */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap">
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Order Qty</p>
          <p className="text-lg font-bold text-white tabular-nums">{item.suggestedQuantity}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Est. Cost</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatPrice(item.lineTotalCost || 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">After Restock</p>
          <p className="text-sm font-semibold text-indigo-300 tabular-nums">
            {item.daysOfStockAfterReorder >= 999 ? '—' : `~${item.daysOfStockAfterReorder}d`}
          </p>
        </div>
      </div>
    </div>
  );
}

export const PurchaseOrderDraftCard = ({ draft, onRecordAction }: PurchaseOrderDraftCardProps) => {
  const { formatPrice, currency } = useCurrency();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Daily persistent reviewed state in localStorage
  const todayKey = useMemo(() => `pharmatrack_draft_reviewed_${new Date().toISOString().split('T')[0]}`, []);
  const [isApproved, setIsApproved] = useState<boolean>(() => {
    try {
      return localStorage.getItem(todayKey) === 'true';
    } catch {
      return false;
    }
  });

  const handleMarkReviewed = () => {
    setIsApproved(true);
    try {
      localStorage.setItem(todayKey, 'true');
    } catch {
      // Ignore localStorage errors
    }
    toast({
      title: 'Draft Marked as Reviewed',
      description: "Today's reorder draft has been reviewed. This status will stay saved for today.",
    });
    if (onRecordAction) onRecordAction('/inventory?filter=low-stock');
  };

  // Generate WhatsApp text for reps/wholesalers in Nigeria
  const handleWhatsAppExport = () => {
    if (!draft?.lineItems || draft.lineItems.length === 0) return;
    
    const pharmacyName = pharmacy?.name || 'Pharmacy';
    const dateStr = new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
    
    let text = `📋 *RESTOCK REORDER LIST - ${pharmacyName}*\n📅 Date: ${dateStr}\n\n`;
    draft.lineItems.forEach((item, idx) => {
      text += `${idx + 1}. *${item.medicationName}* — Qty: *${item.suggestedQuantity}*`;
      if (item.supplierHint) text += ` (Supplier: ${item.supplierHint})`;
      text += `\n`;
    });
    
    text += `\nTotal Items: ${draft.totalItems}\nEst. Cost: ${formatPrice(draft.totalEstimatedCost || 0)}\n\n_Generated via PharmaTrack Autopilot_`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(text);
    
    // Open WhatsApp with text prefilled
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    
    toast({
      title: 'WhatsApp Reorder List Copied!',
      description: 'The list has been copied to your clipboard and opened in WhatsApp.',
    });
  };

  // Print PDF purchase order receipt
  const handlePrintPDF = async () => {
    if (!draft?.lineItems || draft.lineItems.length === 0) return;

    // Group items by supplierHint or fallback
    const itemsBySupplier = new Map<string, Array<{ medicationName: string; quantity: number; unitPrice: number; totalPrice: number }>>();

    draft.lineItems.forEach(item => {
      const supplierName = item.supplierHint || 'General Supplier';
      const existing = itemsBySupplier.get(supplierName) || [];
      existing.push({
        medicationName: item.medicationName,
        quantity: item.suggestedQuantity,
        unitPrice: item.costPrice || 0,
        totalPrice: item.lineTotalCost || 0,
      });
      itemsBySupplier.set(supplierName, existing);
    });

    const orders = Array.from(itemsBySupplier.entries()).map(([supplierName, items]) => ({
      supplierName,
      items,
      totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0),
    }));

    const orderNumber = generateOrderNumber();
    const doc = await generatePurchaseOrder({
      orders,
      pharmacyName: pharmacy?.name || 'Pharmacy',
      pharmacyPhone: pharmacy?.phone || undefined,
      orderNumber,
      date: new Date(),
      currency: currency as 'NGN' | 'USD' | 'GBP',
    });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    
    toast({
      title: 'Purchase Order PDF Generated!',
      description: 'Sending purchase order document to printer / preview.',
    });
  };

  // Sort: critical first, then high, medium, low
  const sortedItems = useMemo(() => {
    if (!draft?.lineItems) return [];
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...draft.lineItems].sort((a, b) => (rank[a.urgency] ?? 3) - (rank[b.urgency] ?? 3));
  }, [draft?.lineItems]);

  if (!draft || draft.totalItems === 0 || sortedItems.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-slate-900/80 p-4 text-white border border-emerald-500/20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-400/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-300">All Stock Levels Healthy</p>
            <p className="text-[11px] text-slate-400">Autopilot monitored — no reorders needed right now.</p>
          </div>
        </div>
      </div>
    );
  }

  const headerGradient = HEADER_URGENCY[draft.overallUrgency] || HEADER_URGENCY.low;

  // Collapsed View — Premium left-border design
  if (!isExpanded) {
    const borderColor =
      draft.overallUrgency === 'critical' ? 'border-l-red-500' :
      draft.overallUrgency === 'high' ? 'border-l-orange-500' :
      draft.overallUrgency === 'medium' ? 'border-l-amber-500' :
      'border-l-indigo-500';

    return (
      <div className={cn(
        'relative rounded-xl bg-card border border-border/80 border-l-4 p-4 text-card-foreground shadow-sm',
        'flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap',
        'hover:bg-muted/40 transition-colors cursor-pointer',
        borderColor
      )} onClick={() => setIsExpanded(true)}>
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Label + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Purchase Draft Ready
            </p>
            {isApproved && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Reviewed Today
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-foreground truncate mt-0.5">
            {draft.totalItems} items need restocking
            {draft.criticalCount > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400 font-extrabold">• {draft.criticalCount} out of stock</span>
            )}
          </p>
        </div>

        {/* Primary stat */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est. Cost</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">{formatPrice(draft.totalEstimatedCost || 0)}</p>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
          className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1 px-3 shrink-0 shadow-sm"
        >
          Review <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Expanded View
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 sm:p-6 text-white shadow-xl border transition-all', headerGradient)}>

      {/* Background glow blobs */}
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-rose-500/8 blur-3xl pointer-events-none" />

      <div className="relative z-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30">
              <ShoppingCart className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-indigo-300 tracking-widest uppercase block">
                Autopilot — Smart Purchase Draft
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                {draft.totalItems} Medicine{draft.totalItems > 1 ? 's' : ''} Need Restocking
              </h3>
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex flex-wrap items-center gap-2">
            {draft.criticalCount > 0 && (
              <Badge className="bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-semibold gap-1">
                <AlertTriangle className="h-3 w-3" />
                {draft.criticalCount} Critical
              </Badge>
            )}
            {draft.lowStockCount > 0 && (
              <Badge className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-semibold gap-1">
                <Package className="h-3 w-3" />
                {draft.lowStockCount} Low Stock
              </Badge>
            )}
          </div>
        </div>

        {/* ── All Line Items ────────────────────────────────────────── */}
        <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
          {sortedItems.map(item => (
            <LineItemRow key={item.medicationId} item={item} formatPrice={formatPrice} />
          ))}
        </div>

        {/* ── Total Cost Summary ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Estimated Total Purchase
              </p>
              <p className="text-xl font-bold text-white tabular-nums">
                {formatPrice(draft.totalEstimatedCost || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Based on cost price × order qty</p>
            {draft.generatedAt && (
              <p className="text-[10px] text-slate-500">
                Draft generated {new Date(draft.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* ── Action Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleWhatsAppExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm text-xs"
          >
            <MessageSquare className="h-4 w-4" />
            Send on WhatsApp
          </Button>

          <Button
            size="sm"
            onClick={handlePrintPDF}
            variant="outline"
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600 font-medium gap-2 text-xs"
          >
            <Printer className="h-3.5 w-3.5 text-indigo-300" />
            Print PDF Invoice
          </Button>

          {!isApproved ? (
            <Button
              size="sm"
              onClick={handleMarkReviewed}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-md text-xs"
            >
              <BadgeCheck className="h-4 w-4" />
              Mark Reviewed
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Reviewed for Today
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="text-xs text-slate-400 hover:text-white gap-1 ml-auto"
          >
            Collapse <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
