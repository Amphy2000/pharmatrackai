import { Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { CartItem } from '@/types/medication';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface CartPanelProps {
  items: CartItem[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  total: number;
}

export const CartPanel = ({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  total,
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
    <div className="flex flex-col">
      {/* Scrollable items - compact height */}
      <ScrollArea className="max-h-[220px] pr-1 -mr-1">
        <div className="space-y-1.5">
          {items.map((item, index) => {
            const price = item.medication.selling_price || item.medication.unit_price;
            const itemTotal = price * item.quantity;
            const isMaxStock = item.quantity >= item.medication.current_stock;
            const isLastItem = index === items.length - 1;

            return (
              <div
                key={item.medication.id}
                className={cn(
                  "group relative p-2.5 rounded-xl transition-all duration-200",
                  "bg-gradient-to-r from-muted/40 to-transparent",
                  "border border-transparent hover:border-border/50",
                  isLastItem && "ring-1 ring-primary/20 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {/* Compact product icon */}
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs leading-tight truncate">
                      {item.medication.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {formatPrice(price)} ea.
                    </p>
                  </div>

                  {/* Quantity controls - inline */}
                  <div className="flex items-center gap-0.5 bg-background/80 rounded-lg p-0.5 border border-border/30">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded hover:bg-muted"
                      onClick={() => onDecrement(item.medication.id)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded hover:bg-muted"
                      onClick={() => onIncrement(item.medication.id)}
                      disabled={isMaxStock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Item total */}
                  <div className="text-right min-w-[70px]">
                    <p className="font-bold text-xs text-primary tabular-nums">
                      {formatPrice(itemTotal)}
                    </p>
                    {isMaxStock && (
                      <p className="text-[9px] text-amber-600 dark:text-amber-400">Max</p>
                    )}
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemove(item.medication.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Totals - premium design */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <span className="font-bold">Total</span>
          <span className="font-bold text-xl text-primary tabular-nums">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};