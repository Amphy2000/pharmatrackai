import { useState, useEffect } from 'react';
import { Sparkles, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (!cartItems?.length || !availableInventory?.length) {
      setSuggestions([]);
      return;
    }

    const itemsContext = cartItems.map(c => ({
      id: c.medication.id,
      name: c.medication.name,
      category: c.medication.category,
    }));

    const inventoryContext = availableInventory.map(inv => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
    }));

    const results = generateSmartUpsell(itemsContext, inventoryContext);
    setSuggestions(results);
    setExpanded(false); // collapse on cart change
  }, [cartItems, availableInventory]);

  if (suggestions.length === 0) return null;

  const visible = expanded ? suggestions : suggestions.slice(0, 1);

  return (
    <div className="w-full mt-2 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 via-primary/5 to-transparent border border-purple-500/20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Clinical Upsell
          </span>
          <Badge className="h-4 px-1.5 text-[9px] bg-purple-500 text-white border-0">
            {suggestions.length}
          </Badge>
        </div>
        {suggestions.length > 1 && (
          <button
            className="text-[10px] text-purple-500 flex items-center gap-0.5 hover:underline"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Less</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> +{suggestions.length - 1} more</>
            )}
          </button>
        )}
      </div>

      {/* Suggestion Cards */}
      <div className="space-y-1.5">
        {visible.map((sugg) => {
          const medObj = availableInventory.find(m => m.id === sugg.product_id);
          if (!medObj) return null;

          const price = medObj.selling_price || medObj.unit_price;

          return (
            <div
              key={sugg.product_id}
              className="flex items-start justify-between p-2 rounded-lg bg-background/90 border border-purple-500/15 text-xs gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                  <span className="font-semibold text-foreground truncate">{medObj.name}</span>
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-purple-400/40 text-purple-600 shrink-0">
                    Recommended
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{sugg.reason}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-primary">{formatPrice(price)}</span>
                  {sugg.triggeredBy !== 'general' && (
                    <span className="text-[9px] text-muted-foreground italic truncate">
                      for: {sugg.triggeredBy}
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2.5 text-xs gap-1 bg-purple-500/10 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/20 shrink-0 self-center"
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
