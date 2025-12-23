import { Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { CartItem } from '@/types/medication';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
      <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ShoppingCart className="h-10 w-10 opacity-40" />
        </div>
        <p className="text-base font-medium">Cart is empty</p>
        <p className="text-sm opacity-70">Add items to start a sale</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Fixed height scrollable area */}
      <ScrollArea className="h-[280px] pr-2 -mr-2">
        <div className="space-y-2">
          {items.map((item, index) => {
            const price = item.medication.selling_price || item.medication.unit_price;
            const itemTotal = price * item.quantity;
            const isMaxStock = item.quantity >= item.medication.current_stock;

            return (
              <div
                key={item.medication.id}
                className={cn(
                  "group relative p-3 rounded-xl border transition-all duration-200",
                  "bg-gradient-to-br from-card/80 to-card/40",
                  "border-border/40 hover:border-primary/30 hover:shadow-sm",
                  index === items.length - 1 && "ring-2 ring-primary/20 border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Product icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm leading-tight truncate pr-1">
                          {item.medication.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatPrice(price)} × {item.quantity}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemove(item.medication.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => onDecrement(item.medication.id)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => onIncrement(item.medication.id)}
                          disabled={isMaxStock}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {/* Item total */}
                      <p className="font-bold text-sm text-primary tabular-nums">
                        {formatPrice(itemTotal)}
                      </p>
                    </div>

                    {isMaxStock && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                        Max stock reached
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Separator className="my-4" />

      {/* Totals - always visible */}
      <div className="space-y-2 bg-muted/30 rounded-xl p-3">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-xl text-primary tabular-nums">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};