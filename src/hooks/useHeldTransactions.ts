import { useState, useEffect, useCallback } from 'react';
import { CartItem } from '@/types/medication';

const HELD_TRANSACTIONS_KEY = 'pharmatrack_held_transactions';

export interface HeldTransaction {
  id: string;
  items: CartItem[];
  customerName: string;
  heldAt: string;
  total: number;
}

const generateId = () => `held_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useHeldTransactions = () => {
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(HELD_TRANSACTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HELD_TRANSACTIONS_KEY, JSON.stringify(heldTransactions));
    } catch (e) {
      console.error('Failed to save held transactions:', e);
    }
  }, [heldTransactions]);

  const holdTransaction = useCallback((items: CartItem[], customerName: string, total: number) => {
    const transaction: HeldTransaction = {
      id: generateId(),
      items,
      customerName,
      heldAt: new Date().toISOString(),
      total,
    };
    setHeldTransactions(prev => [transaction, ...prev]);
    return transaction.id;
  }, []);

  const resumeTransaction = useCallback((id: string) => {
    const transaction = heldTransactions.find(t => t.id === id);
    if (transaction) {
      setHeldTransactions(prev => prev.filter(t => t.id !== id));
    }
    return transaction;
  }, [heldTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    setHeldTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAllHeld = useCallback(() => {
    setHeldTransactions([]);
  }, []);

  return {
    heldTransactions,
    holdTransaction,
    resumeTransaction,
    deleteTransaction,
    clearAllHeld,
    count: heldTransactions.length,
  };
};
