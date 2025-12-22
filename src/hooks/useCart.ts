import { useState, useCallback, useEffect, useRef } from 'react';
import { Medication, CartItem } from '@/types/medication';

const CART_STORAGE_KEY = 'pharmatrack_cart';

// Helper to load cart from storage (called only once during init)
const loadCartFromStorage = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load cart from storage:', e);
  }
  return [];
};

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const isInitialMount = useRef(true);

  // Persist to localStorage whenever items change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage:', e);
    }
  }, [items]);

  const addItem = useCallback((medication: Medication, quantity: number = 1) => {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.medication.id === medication.id
      );

      if (existingIndex >= 0) {
        const updated = [...current];
        const newQuantity = updated[existingIndex].quantity + quantity;
        
        // Don't exceed available stock
        if (newQuantity <= medication.current_stock) {
          updated[existingIndex].quantity = newQuantity;
        }
        return updated;
      }

      // Don't add if quantity exceeds stock
      if (quantity > medication.current_stock) {
        return current;
      }

      return [...current, { medication, quantity }];
    });
  }, []);

  const removeItem = useCallback((medicationId: string) => {
    setItems((current) => current.filter((item) => item.medication.id !== medicationId));
  }, []);

  const updateQuantity = useCallback((medicationId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.medication.id === medicationId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.medication.current_stock)) }
          : item
      )
    );
  }, []);

  const incrementQuantity = useCallback((medicationId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.medication.id === medicationId && item.quantity < item.medication.current_stock
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }, []);

  const decrementQuantity = useCallback((medicationId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.medication.id === medicationId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.medication.selling_price || item.medication.unit_price;
      return total + price * item.quantity;
    }, 0);
  }, [items]);

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  // Get last added item ID for keyboard shortcuts
  const getLastItemId = useCallback(() => {
    if (items.length === 0) return null;
    return items[items.length - 1].medication.id;
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getTotal,
    getTotalItems,
    getLastItemId,
  };
};
