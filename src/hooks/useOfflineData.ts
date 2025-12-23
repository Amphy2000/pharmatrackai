import { useState, useEffect, useCallback } from 'react';

const CACHE_KEYS = {
  USER_DATA: 'pharmatrack_user_data',
  PHARMACY_DATA: 'pharmatrack_pharmacy_data',
  MEDICATIONS: 'pharmatrack_medications',
  CUSTOMERS: 'pharmatrack_customers',
  LAST_SYNC: 'pharmatrack_last_sync',
} as const;

interface CachedUserData {
  userId: string;
  email: string;
  fullName: string | null;
  pharmacyStaffId: string | null;
  pharmacyId: string | null;
  role: string | null;
  cachedAt: number;
}

interface CachedPharmacyData {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  cachedAt: number;
}

export const useOfflineData = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasCachedData, setHasCachedData] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if we have cached data
    const cachedUser = localStorage.getItem(CACHE_KEYS.USER_DATA);
    setHasCachedData(!!cachedUser);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheUserData = useCallback((data: Omit<CachedUserData, 'cachedAt'>) => {
    const cacheData: CachedUserData = {
      ...data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(cacheData));
    setHasCachedData(true);
  }, []);

  const getCachedUserData = useCallback((): CachedUserData | null => {
    const cached = localStorage.getItem(CACHE_KEYS.USER_DATA);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as CachedUserData;
    } catch {
      return null;
    }
  }, []);

  const cachePharmacyData = useCallback((data: Omit<CachedPharmacyData, 'cachedAt'>) => {
    const cacheData: CachedPharmacyData = {
      ...data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEYS.PHARMACY_DATA, JSON.stringify(cacheData));
  }, []);

  const getCachedPharmacyData = useCallback((): CachedPharmacyData | null => {
    const cached = localStorage.getItem(CACHE_KEYS.PHARMACY_DATA);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as CachedPharmacyData;
    } catch {
      return null;
    }
  }, []);

  const cacheMedications = useCallback((medications: any[]) => {
    localStorage.setItem(CACHE_KEYS.MEDICATIONS, JSON.stringify({
      data: medications,
      cachedAt: Date.now(),
    }));
  }, []);

  const getCachedMedications = useCallback((): any[] => {
    const cached = localStorage.getItem(CACHE_KEYS.MEDICATIONS);
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      return parsed.data || [];
    } catch {
      return [];
    }
  }, []);

  const cacheCustomers = useCallback((customers: any[]) => {
    localStorage.setItem(CACHE_KEYS.CUSTOMERS, JSON.stringify({
      data: customers,
      cachedAt: Date.now(),
    }));
  }, []);

  const getCachedCustomers = useCallback((): any[] => {
    const cached = localStorage.getItem(CACHE_KEYS.CUSTOMERS);
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      return parsed.data || [];
    } catch {
      return [];
    }
  }, []);

  const updateLastSync = useCallback(() => {
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
  }, []);

  const getLastSync = useCallback((): Date | null => {
    const timestamp = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (!timestamp) return null;
    return new Date(parseInt(timestamp));
  }, []);

  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    setHasCachedData(false);
  }, []);

  return {
    isOnline,
    hasCachedData,
    cacheUserData,
    getCachedUserData,
    cachePharmacyData,
    getCachedPharmacyData,
    cacheMedications,
    getCachedMedications,
    cacheCustomers,
    getCachedCustomers,
    updateLastSync,
    getLastSync,
    clearCache,
  };
};
