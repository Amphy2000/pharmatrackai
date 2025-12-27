import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, X, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Medication } from '@/types/medication';
import { useEffect, useRef } from 'react';
import { trackUpsellSuggestion, markUpsellAccepted } from '@/hooks/useUpsellAnalytics';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchContext } from '@/contexts/BranchContext';

interface UpsellSuggestion {
  product_id: string;
  product_name: string;
  reason: string;
  confidence: number;
  medication?: Medication;
  analyticsId?: string;
}

interface SmartUpsellPanelProps {
  suggestions: UpsellSuggestion[];
  isLoading: boolean;
  onAddToCart: (medication: Medication) => void;
  onDismiss: (productId: string) => void;
  cartItems?: Array<{ medication: Medication }>;
}

export const SmartUpsellPanel = ({
  suggestions,
  isLoading,
  onAddToCart,
  onDismiss,
  cartItems = [],
}: SmartUpsellPanelProps) => {
  const { formatPrice } = useCurrency();
  const { pharmacy } = usePharmacy();
  const { currentBranchId } = useBranchContext();
  
  // Track which suggestions have been logged to analytics
  const trackedSuggestions = useRef<Map<string, string>>(new Map());

  // Track suggestions when they appear
  useEffect(() => {
    if (!pharmacy?.id || isLoading || suggestions.length === 0) return;

    const trackSuggestions = async () => {
      const cartMedicationIds = cartItems.map(item => item.medication.id);
      
      for (const suggestion of suggestions) {
        // Skip if already tracked
        if (trackedSuggestions.current.has(suggestion.product_id)) continue;
        
        const analyticsId = await trackUpsellSuggestion(
          pharmacy.id,
          currentBranchId || null,
          null, // staff_id would require additional lookup
          suggestion.product_id,
          cartMedicationIds,
          suggestion.reason,
          suggestion.confidence
        );
        
        if (analyticsId) {
          trackedSuggestions.current.set(suggestion.product_id, analyticsId);
        }
      }
    };

    trackSuggestions();
  }, [suggestions, pharmacy?.id, isLoading, currentBranchId, cartItems]);

  // Handle adding to cart with analytics tracking
  const handleAddToCart = async (medication: Medication, productId: string) => {
    const analyticsId = trackedSuggestions.current.get(productId);
    if (analyticsId) {
      await markUpsellAccepted(analyticsId);
    }
    onAddToCart(medication);
  };

  if (!isLoading && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Smart Suggestions</span>
        </div>
        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-primary/10 text-primary border-0">
          AI
        </Badge>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      )}

      {/* Suggestions List */}
      <AnimatePresence mode="popLayout">
        {!isLoading && suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.product_id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ 
              duration: 0.2, 
              delay: index * 0.05,
              ease: "easeOut"
            }}
            className="group relative flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 border border-primary/10 hover:border-primary/20 transition-all mb-2 last:mb-0"
          >
            {/* Confidence Indicator */}
            <div className="relative h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
              {suggestion.confidence >= 0.9 && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight">
                {suggestion.product_name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {suggestion.reason}
              </p>
              {suggestion.medication && (
                <p className="text-[10px] font-semibold text-primary">
                  {formatPrice(suggestion.medication.selling_price || suggestion.medication.unit_price)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {suggestion.medication && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddToCart(suggestion.medication!, suggestion.product_id)}
                  className="h-7 px-2 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary"
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Add
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(suggestion.product_id)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
