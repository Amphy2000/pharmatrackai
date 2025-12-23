import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheMedicationsForOffline, getCachedMedications, getMedicationsCacheAge } from './useOfflineSync';

interface Medication {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  selling_price: number | null;
  unit_price: number;
  barcode_id: string | null;
  expiry_date: string;
  batch_number: string;
  dispensing_unit: string;
  reorder_level: number;
  is_shelved: boolean;
}

export const useOfflineMedications = (pharmacyId: string | undefined) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const queryClient = useQueryClient();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch medications from Supabase
  const { data: onlineMedications, isLoading, error, refetch } = useQuery({
    queryKey: ['medications', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_shelved', true)
        .order('name');

      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!pharmacyId && !isOffline,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Cache medications when fetched
  useEffect(() => {
    if (onlineMedications && onlineMedications.length > 0) {
      cacheMedicationsForOffline(onlineMedications);
    }
  }, [onlineMedications]);

  // Get cached medications when offline
  const cachedMedications = useMemo(() => {
    if (isOffline || !onlineMedications) {
      return getCachedMedications();
    }
    return [];
  }, [isOffline, onlineMedications]);

  // Combine online and cached data
  const medications = useMemo(() => {
    if (!isOffline && onlineMedications) {
      return onlineMedications;
    }
    return cachedMedications;
  }, [isOffline, onlineMedications, cachedMedications]);

  // Get cache age for display
  const cacheAge = getMedicationsCacheAge();
  const cacheAgeMinutes = cacheAge ? Math.floor(cacheAge / 60000) : null;

  // Search medications by barcode (works offline)
  const findByBarcode = useCallback((barcode: string): Medication | null => {
    if (!barcode) return null;
    return medications.find(m => m.barcode_id === barcode) || null;
  }, [medications]);

  // Search medications by name (works offline)
  const searchByName = useCallback((query: string): Medication[] => {
    if (!query || query.length < 2) return medications;
    
    const lowerQuery = query.toLowerCase();
    return medications.filter(m => 
      m.name.toLowerCase().includes(lowerQuery) ||
      m.category.toLowerCase().includes(lowerQuery)
    );
  }, [medications]);

  // Force refresh cache
  const refreshCache = useCallback(async () => {
    if (!isOffline && pharmacyId) {
      await refetch();
    }
  }, [isOffline, pharmacyId, refetch]);

  // Update local stock (for offline mode)
  const updateLocalStock = useCallback((medicationId: string, quantitySold: number) => {
    const cached = getCachedMedications();
    const updated = cached.map(m => 
      m.id === medicationId 
        ? { ...m, current_stock: Math.max(0, m.current_stock - quantitySold) }
        : m
    );
    cacheMedicationsForOffline(updated);
    
    // Also update react-query cache
    queryClient.setQueryData(['medications', pharmacyId], updated);
  }, [pharmacyId, queryClient]);

  return {
    medications,
    isLoading: !isOffline && isLoading,
    error,
    isOffline,
    cacheAgeMinutes,
    findByBarcode,
    searchByName,
    refreshCache,
    updateLocalStock,
    hasCachedData: cachedMedications.length > 0,
  };
};
