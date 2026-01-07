import { useState, useEffect, useCallback } from 'react';

export interface PendingSale {
  id: string;
  items: {
    medicationId: string;
    medicationName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  total: number;
  timestamp: number;
  customerId?: string;
  customerName?: string;
  paymentMethod?: string;
  shiftId?: string;
  staffName?: string;
  syncStatus?: 'pending' | 'syncing' | 'failed';
  syncError?: string;
}

interface OfflineSyncState {
  isOnline: boolean;
  pendingSalesCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const PENDING_SALES_KEY = 'pharmatrack_pending_sales';
const LAST_SYNC_KEY = 'pharmatrack_last_sync';
const MEDICATIONS_CACHE_KEY = 'pharmatrack_medications_cache';

export const useOfflineSync = () => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    pendingSalesCount: 0,
    isSyncing: false,
    lastSyncTime: null,
  });

  // Load pending sales count on mount
  useEffect(() => {
    const stored = localStorage.getItem(PENDING_SALES_KEY);
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (stored) {
      try {
        const pending = JSON.parse(stored) as PendingSale[];
        setState(prev => ({ 
          ...prev, 
          pendingSalesCount: pending.length,
          lastSyncTime: lastSync ? new Date(parseInt(lastSync)) : null,
        }));
      } catch {
        localStorage.removeItem(PENDING_SALES_KEY);
      }
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      syncPendingSales();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker sync completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        const pending = getPendingSales();
        setState(prev => ({
          ...prev,
          pendingSalesCount: pending.length,
          isSyncing: false,
          lastSyncTime: new Date(),
        }));
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const getPendingSales = useCallback((): PendingSale[] => {
    try {
      const stored = localStorage.getItem(PENDING_SALES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addPendingSale = useCallback((sale: Omit<PendingSale, 'id' | 'timestamp' | 'syncStatus'>) => {
    const pendingSale: PendingSale = {
      ...sale,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      syncStatus: 'pending',
    };

    // Store in localStorage
    const pending = getPendingSales();
    pending.push(pendingSale);
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));

    setState(prev => ({ ...prev, pendingSalesCount: pending.length }));

    // Queue for background sync via service worker
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_SALE',
        sale: pendingSale,
      });
    }

    return pendingSale.id;
  }, [getPendingSales]);

  const updatePendingSale = useCallback((id: string, updates: Partial<PendingSale>) => {
    const pending = getPendingSales().map(sale => 
      sale.id === id ? { ...sale, ...updates } : sale
    );
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
    setState(prev => ({ ...prev, pendingSalesCount: pending.length }));
  }, [getPendingSales]);

  const removePendingSale = useCallback((id: string) => {
    const pending = getPendingSales().filter(s => s.id !== id);
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
    setState(prev => ({ ...prev, pendingSalesCount: pending.length }));
  }, [getPendingSales]);

  const clearAllPendingSales = useCallback(() => {
    localStorage.removeItem(PENDING_SALES_KEY);
    setState(prev => ({ ...prev, pendingSalesCount: 0 }));
  }, []);

  const syncPendingSales = useCallback(async () => {
    if (!navigator.onLine || state.isSyncing) return;

    const pending = getPendingSales();
    if (pending.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Dynamic import to avoid circular deps
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      const { data: staffRows } = await supabase
        .from('pharmacy_staff')
        .select('pharmacy_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const pharmacyId = staffRows?.[0]?.pharmacy_id;

      if (!pharmacyId) {
        setState(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      for (const sale of pending) {
        updatePendingSale(sale.id, { syncStatus: 'syncing' });
        
        try {
          // Generate receipt ID
          const { data: receiptId } = await supabase.rpc('generate_receipt_id');

          // Insert each sale item
          for (const item of sale.items) {
            await supabase.from('sales').insert({
              pharmacy_id: pharmacyId,
              medication_id: item.medicationId,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice,
              customer_id: sale.customerId || null,
              customer_name: sale.customerName || null,
              shift_id: sale.shiftId || null,
              sold_by_name: sale.staffName || null,
              payment_method: sale.paymentMethod || 'cash',
              receipt_id: receiptId,
              sold_by: user.id,
            });

            // Update stock
            const { data: medication } = await supabase
              .from('medications')
              .select('current_stock')
              .eq('id', item.medicationId)
              .single();

            if (medication) {
              await supabase
                .from('medications')
                .update({ current_stock: Math.max(0, medication.current_stock - item.quantity) })
                .eq('id', item.medicationId);
            }
          }

          // Remove synced sale
          removePendingSale(sale.id);
        } catch (error) {
          console.error('Failed to sync sale:', sale.id, error);
          updatePendingSale(sale.id, { 
            syncStatus: 'failed', 
            syncError: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
      }));
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isSyncing, getPendingSales, updatePendingSale, removePendingSale]);

  return {
    ...state,
    addPendingSale,
    getPendingSales,
    updatePendingSale,
    removePendingSale,
    clearAllPendingSales,
    syncPendingSales,
  };
};

// Cache medications for offline use
export const cacheMedicationsForOffline = (medications: any[]) => {
  try {
    localStorage.setItem(MEDICATIONS_CACHE_KEY, JSON.stringify({
      data: medications,
      cachedAt: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to cache medications:', error);
  }
};

export const getCachedMedications = (): any[] => {
  try {
    const cached = localStorage.getItem(MEDICATIONS_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return parsed.data || [];
  } catch {
    return [];
  }
};

export const getMedicationsCacheAge = (): number | null => {
  try {
    const cached = localStorage.getItem(MEDICATIONS_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.cachedAt ? Date.now() - parsed.cachedAt : null;
  } catch {
    return null;
  }
};

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('ServiceWorker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
      return null;
    }
  }
  return null;
};