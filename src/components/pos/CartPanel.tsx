import { Minus, Plus, Trash2, ShoppingCart, Package, Zap } from 'lucide-react';
import { CartItem } from '@/types/medication';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface CartPanelProps {
  items: CartItem[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  total: number;
  saleType?: 'retail' | 'wholesale';
}

export const CartPanel = ({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  total,
  saleType = 'retail',
}: CartPanelProps) => {
  const { formatPrice } = useCurrency();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-4 shadow-inner">
          <ShoppingCart className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium">Your cart is empty</p>
        <p className="text-xs opacity-70 mt-1">Select products to add</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable items - constrained height on mobile */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {items.map((item, index) => {
          // For quick items, use the quickItemPrice; for regular items, use wholesale or retail price
          const price = item.isQuickItem
            ? (item.quickItemPrice || item.medication.unit_price)
            : saleType === 'wholesale' && item.medication.wholesale_price
              ? item.medication.wholesale_price
              : (item.medication.selling_price || item.medication.unit_price);
          const itemTotal = price * item.quantity;
          const isMaxStock = !item.isQuickItem && item.quantity >= item.medication.current_stock;
          const isLastItem = index === items.length - 1;

          return (
            <div
              key={item.medication.id}
              className={cn(
                'group relative p-3 rounded-xl transition-all duration-200',
                item.isQuickItem
                  ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20'
                  : 'bg-gradient-to-r from-muted/40 to-transparent border border-transparent hover:border-border/50',
                isLastItem && !item.isQuickItem && 'ring-1 ring-primary/20 bg-primary/5'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Product icon */}
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  item.isQuickItem
                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5'
                    : 'bg-gradient-to-br from-primary/15 to-primary/5'
                )}>
                  {item.isQuickItem ? (
                    <Zap className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Package className="h-5 w-5 text-primary" />
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-sm leading-tight truncate">{item.medication.name}</h4>
                    {item.isQuickItem && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-amber-500/30 text-amber-600">
                        Quick
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted-foreground">{formatPrice(price)} ea.</p>
                    {saleType === 'wholesale' && item.medication.wholesale_price && !item.isQuickItem && (
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">W</Badge>
                    )}
                  </div>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1 bg-background/80 rounded-lg p-1 border border-border/30">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded hover:bg-muted"
                    onClick={() => onDecrement(item.medication.id)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded hover:bg-muted"
                    onClick={() => onIncrement(item.medication.id)}
                    disabled={isMaxStock}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Item total */}
                <div className="text-right min-w-[80px]">
                  <p className={cn(
                    'font-bold text-sm tabular-nums',
                    item.isQuickItem ? 'text-amber-600' : 'text-primary'
                  )}>{formatPrice(itemTotal)}</p>
                  {isMaxStock && <p className="text-[10px] text-amber-600 dark:text-amber-400">Max</p>}
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemove(item.medication.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals - always visible */}
      <div className="mt-3 pt-3 border-t border-border/50 flex-shrink-0">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          <span>
            {items.length} {items.length === 1 ? 'item' : 'items'}
            {items.some(i => i.isQuickItem) && (
              <span className="text-amber-600 ml-1">
                ({items.filter(i => i.isQuickItem).length} quick)
              </span>
            )}
          </span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <span className="font-bold text-sm">Total</span>
          <span className="font-bold text-lg sm:text-xl text-primary tabular-nums">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};