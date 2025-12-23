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
      <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <ShoppingCart className="h-6 w-6 opacity-40" />
        </div>
        <p className="text-xs font-medium">Cart is empty</p>
        <p className="text-[10px] opacity-60 mt-0.5">Add products to begin</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[160px] pr-2 -mr-2">
      <div className="space-y-1">
        {items.map((item, index) => {
          const price = item.medication.selling_price || item.medication.unit_price;
          const itemTotal = price * item.quantity;
          const isMaxStock = item.quantity >= item.medication.current_stock;
          const isLastItem = index === items.length - 1;

          return (
            <div
              key={item.medication.id}
              className={cn(
                "group flex items-center gap-2 p-2 rounded-lg transition-colors",
                "hover:bg-muted/40",
                isLastItem && "bg-primary/5 border border-primary/10"
              )}
            >
              {/* Product icon */}
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="h-3 w-3 text-primary" />
              </div>
              
              {/* Product info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[11px] leading-tight truncate">
                  {item.medication.name}
                </h4>
                <p className="text-[9px] text-muted-foreground">
                  {formatPrice(price)} × {item.quantity}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded hover:bg-muted"
                  onClick={() => onDecrement(item.medication.id)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                <span className="w-5 text-center text-[10px] font-bold tabular-nums">
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
              <div className="text-right min-w-[50px]">
                <p className="font-bold text-[10px] text-primary tabular-nums">
                  {formatPrice(itemTotal)}
                </p>
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
          );
        })}
      </div>
    </ScrollArea>
  );
};