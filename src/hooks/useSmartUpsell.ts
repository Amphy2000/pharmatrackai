import { useState, useEffect, useCallback, useRef } from 'react';
import { CartItem, Medication } from '@/types/medication';
import { usePharmacy } from '@/hooks/usePharmacy';
import { callPharmacyAiWithFallback } from '@/lib/pharmacyAiClient';
import { getPharmacyAiUiError } from '@/utils/pharmacyAiUiError';

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
  const { pharmacyId } = usePharmacy();

  // Create a hash of cart items to detect changes
  const getCartHash = useCallback((items: CartItem[]) => {
    return items.map(i => `${i.medication.id}:${i.quantity}`).sort().join('|');
  }, []);

  // Deterministic fallback suggestions (keeps the UI useful if AI is temporarily rate-limited)
  const getFallbackSuggestions = useCallback((): UpsellSuggestion[] => {
    const cartIds = new Set(cartItems.map(i => i.medication.id));
    const cartCategories = new Set(
      cartItems.map(i => i.medication.category).filter(Boolean)
    );

    const candidates = availableMedications
      .filter(m => !cartIds.has(m.id))
      .filter(m => (m.current_stock ?? 0) > 0)
      .sort((a, b) => {
        const aCat = cartCategories.has(a.category) ? 1 : 0;
        const bCat = cartCategories.has(b.category) ? 1 : 0;
        if (aCat !== bCat) return bCat - aCat;
        return (b.current_stock ?? 0) - (a.current_stock ?? 0);
      })
      .slice(0, 2);

    return candidates.map((m) => ({
      product_id: m.id,
      product_name: m.name,
      reason: cartCategories.has(m.category)
        ? `Popular add-on from ${m.category}`
        : 'Popular add-on item',
      confidence: 0.6,
      medication: m,
    }));
  }, [availableMedications, cartItems]);

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
      // Don't blank the UI on temporary AI failures.
      const { message, status, debug } = getPharmacyAiUiError(err);
      if (status) console.warn('[smart-upsell] pharmacy-ai error', { status, debug });
      setError(message);

      setSuggestions((prev) => {
        if (prev.length > 0) return prev;
        return getFallbackSuggestions();
      });

      // Prevent repeated failing calls for the same cart state
      lastCartHashRef.current = currentHash;
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, availableMedications, getCartHash, getFallbackSuggestions, pharmacyId]);

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
