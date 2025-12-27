import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, Medication } from '@/types/medication';

interface UpsellSuggestion {
  product_id: string;
  product_name: string;
  reason: string;
  confidence: number;
  medication?: Medication;
}

interface UseSmartUpsellOptions {
  cartItems: CartItem[];
  availableMedications: Medication[];
  enabled?: boolean;
  debounceMs?: number;
}

export const useSmartUpsell = ({
  cartItems,
  availableMedications,
  enabled = true,
  debounceMs = 1500,
}: UseSmartUpsellOptions) => {
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastCartHashRef = useRef<string>('');

  // Create a hash of cart items to detect changes
  const getCartHash = useCallback((items: CartItem[]) => {
    return items.map(i => `${i.medication.id}:${i.quantity}`).sort().join('|');
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (cartItems.length === 0 || availableMedications.length === 0) {
      setSuggestions([]);
      return;
    }

    const currentHash = getCartHash(cartItems);
    if (currentHash === lastCartHashRef.current) {
      return; // No change in cart
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('smart-upsell', {
        body: {
          cartItems: cartItems.map(item => ({
            name: item.medication.name,
            category: item.medication.category,
          })),
          availableInventory: availableMedications.map(med => ({
            id: med.id,
            name: med.name,
            category: med.category,
            selling_price: med.selling_price || med.unit_price,
            current_stock: med.current_stock,
          })),
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      // Enrich suggestions with full medication data
      const enrichedSuggestions: UpsellSuggestion[] = (data?.suggestions || [])
        .map((s: UpsellSuggestion) => {
          const medication = availableMedications.find(m => m.id === s.product_id);
          return medication ? { ...s, medication } : null;
        })
        .filter(Boolean) as UpsellSuggestion[];

      setSuggestions(enrichedSuggestions);
      lastCartHashRef.current = currentHash;
    } catch (err) {
      console.error('Smart upsell error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, availableMedications, getCartHash]);

  // Debounced fetch when cart changes
  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    if (cartItems.length === 0) {
      setSuggestions([]);
      lastCartHashRef.current = '';
      return;
    }

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      fetchSuggestions();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [cartItems, enabled, debounceMs, fetchSuggestions]);

  // Clear suggestions when cart is emptied
  useEffect(() => {
    if (cartItems.length === 0) {
      setSuggestions([]);
      lastCartHashRef.current = '';
    }
  }, [cartItems.length]);

  const dismissSuggestion = useCallback((productId: string) => {
    setSuggestions(prev => prev.filter(s => s.product_id !== productId));
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    dismissSuggestion,
    refetch: fetchSuggestions,
  };
};
