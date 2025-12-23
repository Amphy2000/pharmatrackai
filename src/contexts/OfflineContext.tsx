import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useOfflineSync, PendingSale, cacheMedicationsForOffline, getCachedMedications } from '@/hooks/useOfflineSync';
import { useToast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean;
  pendingSalesCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  addPendingSale: (sale: Omit<PendingSale, 'id' | 'timestamp' | 'syncStatus'>) => string;
  getPendingSales: () => PendingSale[];
  syncNow: () => Promise<void>;
  cacheMedications: (medications: any[]) => void;
  getCachedMeds: () => any[];
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider = ({ children }: OfflineProviderProps) => {
  const { toast } = useToast();
  const {
    isOnline,
    pendingSalesCount,
    isSyncing,
    lastSyncTime,
    addPendingSale,
    getPendingSales,
    syncPendingSales,
  } = useOfflineSync();

  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  // Show toast when connection status changes
  useEffect(() => {
    if (isOnline && wasOffline) {
      toast({
        title: 'Back Online',
        description: pendingSalesCount > 0 
          ? `Syncing ${pendingSalesCount} pending sale(s)...`
          : 'Connection restored',
      });
    } else if (!isOnline && !wasOffline) {
      toast({
        title: 'Offline Mode',
        description: 'You can continue working. Data will sync when connection returns.',
        variant: 'destructive',
      });
    }
    setWasOffline(!isOnline);
  }, [isOnline, wasOffline, pendingSalesCount, toast]);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: 'No Connection',
        description: 'Cannot sync while offline',
        variant: 'destructive',
      });
      return;
    }
    await syncPendingSales();
  }, [isOnline, syncPendingSales, toast]);

  const cacheMedications = useCallback((medications: any[]) => {
    cacheMedicationsForOffline(medications);
  }, []);

  const getCachedMeds = useCallback(() => {
    return getCachedMedications();
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingSalesCount,
        isSyncing,
        lastSyncTime,
        addPendingSale,
        getPendingSales,
        syncNow,
        cacheMedications,
        getCachedMeds,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
