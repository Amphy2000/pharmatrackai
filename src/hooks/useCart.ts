import { useState, useCallback } from 'react';
import { Medication, CartItem } from '@/types/medication';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

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
  };
};
