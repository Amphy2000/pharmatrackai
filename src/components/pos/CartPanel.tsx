import { Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { CartItem } from '@/types/medication';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-4 shadow-inner">
          <ShoppingCart className="h-7 w-7 opacity-50" />
        </div>
        <p className="text-sm font-medium">Your cart is empty</p>
        <p className="text-xs opacity-70 mt-1">Select products to add</p>
      </div>
    );
  }

  return (
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
            <div className="flex items-center gap-2">
              {/* Product icon */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0">
                <Package className="h-3.5 w-3.5 text-primary" />
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

              {/* Quantity controls */}
              <div className="flex items-center gap-0.5 bg-background/80 rounded-lg p-0.5 border border-border/30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded hover:bg-muted"
                  onClick={() => onDecrement(item.medication.id)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                <span className="w-5 text-center text-[11px] font-bold tabular-nums">
                  {item.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded hover:bg-muted"
                  onClick={() => onIncrement(item.medication.id)}
                  disabled={isMaxStock}
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>
              </div>
              
              {/* Item total */}
              <div className="text-right min-w-[60px]">
                <p className="font-bold text-[11px] text-primary tabular-nums">
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
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(item.medication.id)}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};