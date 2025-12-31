import { useState, useEffect, useCallback, useRef } from 'react';
import { CartItem, Medication } from '@/types/medication';
import { usePharmacy } from '@/hooks/usePharmacy';
import { callPharmacyAiWithFallback } from '@/lib/pharmacyAiClient';
import { getPharmacyAiUiError } from '@/utils/pharmacyAiUiError';

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
  const { pharmacyId } = usePharmacy();

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
      const data = await callPharmacyAiWithFallback<{ suggestions?: UpsellSuggestion[] }>({
        actions: ['upsell_suggestion', 'smart_upsell'],
        payload: {
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
        pharmacy_id: pharmacyId,
      });

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
      const { message, status, debug } = getPharmacyAiUiError(err);
      if (status) console.warn('[smart-upsell] pharmacy-ai error', { status, debug });
      setError(message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, availableMedications, getCartHash, pharmacyId]);

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
