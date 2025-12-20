import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { CartItem } from '@/types/medication';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm">Add items to start a sale</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-3">
          {items.map((item) => {
            const price = item.medication.selling_price || item.medication.unit_price;
            const itemTotal = price * item.quantity;

            return (
              <div
                key={item.medication.id}
                className="group relative p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-medium truncate">{item.medication.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ₦{price.toLocaleString()} each
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemove(item.medication.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md hover:bg-primary/20"
                      onClick={() => onDecrement(item.medication.id)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md hover:bg-primary/20"
                      onClick={() => onIncrement(item.medication.id)}
                      disabled={item.quantity >= item.medication.current_stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-semibold text-primary tabular-nums">
                    ₦{itemTotal.toLocaleString()}
                  </p>
                </div>

                {item.quantity >= item.medication.current_stock && (
                  <p className="text-xs text-warning mt-2">Max stock reached</p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Separator className="my-4" />

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">₦{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total</span>
          <span className="text-primary tabular-nums">₦{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
