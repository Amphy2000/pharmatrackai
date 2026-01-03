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
        (item) => item.medication.id === medication.id && !item.isQuickItem
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

  // Add a Quick Item (Express Sale - no inventory tracking)
  const addQuickItem = useCallback((name: string, price: number, quantity: number = 1) => {
    const quickMedication: Medication = {
      id: `quick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category: 'Other',
      batch_number: 'QUICK',
      current_stock: 9999, // Unlimited for quick items
      reorder_level: 0,
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      unit_price: price,
      selling_price: price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setItems((current) => [
      ...current,
      { 
        medication: quickMedication, 
        quantity,
        isQuickItem: true,
        quickItemPrice: price,
      },
    ]);
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

  const getTotal = useCallback((saleType: 'retail' | 'wholesale' = 'retail') => {
    return items.reduce((total, item) => {
      // For quick items, always use the quickItemPrice
      if (item.isQuickItem) {
        return total + (item.quickItemPrice || item.medication.unit_price) * item.quantity;
      }
      // For regular items, use wholesale_price if sale type is wholesale and it exists
      const price = saleType === 'wholesale' && item.medication.wholesale_price
        ? item.medication.wholesale_price
        : item.medication.selling_price || item.medication.unit_price;
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

  // Get quick items for pending review
  const getQuickItems = useCallback(() => {
    return items.filter(item => item.isQuickItem);
  }, [items]);

  return {
    items,
    addItem,
    addQuickItem,
    removeItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getTotal,
    getTotalItems,
    getLastItemId,
    getQuickItems,
  };
};
