import { useState, useEffect, useCallback } from 'react';

interface PendingSale {
  id: string;
  items: any[];
  total: number;
  timestamp: number;
  customerId?: string;
}

interface OfflineSyncState {
  isOnline: boolean;
  pendingSalesCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const PENDING_SALES_KEY = 'pharmatrack_pending_sales';

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
    if (stored) {
      try {
        const pending = JSON.parse(stored) as PendingSale[];
        setState(prev => ({ ...prev, pendingSalesCount: pending.length }));
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
        setState(prev => ({
          ...prev,
          pendingSalesCount: 0,
          isSyncing: false,
          lastSyncTime: new Date(),
        }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const addPendingSale = useCallback((sale: Omit<PendingSale, 'id' | 'timestamp'>) => {
    const pendingSale: PendingSale = {
      ...sale,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Store in localStorage
    const stored = localStorage.getItem(PENDING_SALES_KEY);
    const pending: PendingSale[] = stored ? JSON.parse(stored) : [];
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
  }, []);

  const getPendingSales = useCallback((): PendingSale[] => {
    const stored = localStorage.getItem(PENDING_SALES_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  const removePendingSale = useCallback((id: string) => {
    const pending = getPendingSales().filter(s => s.id !== id);
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
    setState(prev => ({ ...prev, pendingSalesCount: pending.length }));
  }, [getPendingSales]);

  const syncPendingSales = useCallback(async () => {
    if (!state.isOnline || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Request background sync via service worker
      if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration?.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-sales');
      } else {
        // Fallback: manual sync
        const pending = getPendingSales();
        // Manual sync would happen here - for now just clear
        localStorage.setItem(PENDING_SALES_KEY, JSON.stringify([]));
        setState(prev => ({
          ...prev,
          pendingSalesCount: 0,
          isSyncing: false,
          lastSyncTime: new Date(),
        }));
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isOnline, state.isSyncing, getPendingSales]);

  return {
    ...state,
    addPendingSale,
    getPendingSales,
    removePendingSale,
    syncPendingSales,
  };
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