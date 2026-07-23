import { useState, useEffect } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generateSmartUpsell, type UpsellSuggestion } from '@/utils/smartUpsellEngine';
import type { CartItem, Medication } from '@/types/medication';

interface SmartUpsellSuggestionsProps {
  cartItems: CartItem[];
  availableInventory: Medication[];
  onAddToCart: (medication: Medication) => void;
}

export const SmartUpsellSuggestions = ({
  cartItems,
  availableInventory,
  onAddToCart,
}: SmartUpsellSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (!cartItems || cartItems.length === 0 || !availableInventory || availableInventory.length === 0) {
      setSuggestions([]);
      return;
    }

    const itemsContext = cartItems.map(c => ({
      id: c.medication.id,
      name: c.medication.name,
      category: c.medication.category
    }));

    const inventoryContext = availableInventory.map(inv => ({
      id: inv.id,
      name: inv.name,
      category: inv.category
    }));

    // Generate smart upsell suggestions in 0ms (Autopilot mode)
    const results = generateSmartUpsell(itemsContext, inventoryContext);
    setSuggestions(results);
  }, [cartItems, availableInventory]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-2 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-primary/5 to-transparent border border-purple-500/20">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
          Smart Cross-Sell Recommendations
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.slice(0, 2).map((sugg) => {
          const medObj = availableInventory.find(m => m.id === sugg.product_id);
          if (!medObj) return null;

          const price = medObj.selling_price || medObj.unit_price;

          return (
            <div
              key={sugg.product_id}
              className="flex items-center justify-between p-2 rounded-lg bg-background/80 border border-border/50 text-xs"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1">
                  <span className="font-semibold truncate text-foreground">{medObj.name}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 border-purple-500/30 text-purple-600">
                    Recommended
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{sugg.reason}</p>
                <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(price)}</p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2.5 text-xs gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                onClick={() => onAddToCart(medObj)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
