import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchContext } from '@/contexts/BranchContext';

const BRANCH_MEDICATIONS_CACHE_KEY = 'pharmatrack_branch_medications_cache';

export interface BranchMedication {
  id: string;
  name: string;
  category: string;
  batch_number: string;
  expiry_date: string;
  unit_price: number;
  selling_price: number | null;
  reorder_level: number;
  dispensing_unit: string;
  barcode_id: string | null;
  is_shelved: boolean;
  is_controlled: boolean;
  nafdac_reg_number: string | null;
  supplier: string | null;
  location: string | null;
  active_ingredients: string[] | null;
  manufacturing_date: string | null;
  min_stock_alert: number | null;
  metadata: any;
  pharmacy_id: string | null;
  created_at: string;
  updated_at: string;
  // Branch-specific stock
  branch_stock: number;
  branch_reorder_level: number;
  branch_inventory_id: string | null;
}

// Cache medications for offline use
const cacheBranchMedications = (branchId: string | null, medications: BranchMedication[]) => {
  try {
    const cacheKey = `${BRANCH_MEDICATIONS_CACHE_KEY}_${branchId || 'main'}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      data: medications,
      cachedAt: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to cache branch medications:', error);
  }
};

const getCachedBranchMedications = (branchId: string | null): BranchMedication[] => {
  try {
    const cacheKey = `${BRANCH_MEDICATIONS_CACHE_KEY}_${branchId || 'main'}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return parsed.data || [];
  } catch {
    return [];
  }
};

export const useBranchInventory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();
  const { currentBranchId, isMainBranch } = useBranchContext();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  // Fetch ALL medications with branch-specific stock (full catalog)
  const { data: onlineMedications = [], isLoading: isLoadingOnline, error } = useQuery({
    queryKey: ['branch-medications', pharmacyId, currentBranchId, isMainBranch],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      // Get all medications for the pharmacy (shared catalog)
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('name');
      
      if (medsError) throw medsError;
      
      // Main branch uses the "central" stock on the medications table
      if (!currentBranchId || isMainBranch) {
        return (meds || []).map(m => ({
          ...m,
          branch_stock: m.current_stock,
          branch_reorder_level: m.reorder_level,
          branch_inventory_id: null,
        })) as BranchMedication[];
      }
      
      // Get branch-specific inventory for non-main branches
      const { data: branchInv, error: invError } = await supabase
        .from('branch_inventory')
        .select('*')
        .eq('branch_id', currentBranchId);
      
      if (invError) throw invError;
      
      // Map medications with branch stock
      const branchStockMap = new Map(
        (branchInv || []).map(inv => [inv.medication_id, inv])
      );
      
      return (meds || []).map(m => {
        const branchData = branchStockMap.get(m.id);
        return {
          ...m,
          branch_stock: branchData?.current_stock ?? 0,
          branch_reorder_level: branchData?.reorder_level ?? m.reorder_level,
          branch_inventory_id: branchData?.id ?? null,
        };
      }) as BranchMedication[];
    },
    enabled: !!pharmacyId && !isOffline,
  });

  // Cache medications when fetched online
  useEffect(() => {
    if (onlineMedications && onlineMedications.length > 0) {
      cacheBranchMedications(currentBranchId, onlineMedications);
    }
  }, [onlineMedications, currentBranchId]);

  // Get cached medications when offline
  const cachedMedications = useMemo(() => {
    if (isOffline || !onlineMedications || onlineMedications.length === 0) {
      return getCachedBranchMedications(currentBranchId);
    }
    return [];
  }, [isOffline, onlineMedications, currentBranchId]);

  // Use online data when available, fall back to cache when offline
  const allMedications = useMemo(() => {
    if (!isOffline && onlineMedications && onlineMedications.length > 0) {
      return onlineMedications;
    }
    return cachedMedications;
  }, [isOffline, onlineMedications, cachedMedications]);

  const isLoading = !isOffline && isLoadingOnline;

  // For non-main branches, only return medications that have been stocked (branch_stock > 0)
  // This ensures new branches start with a clean slate until stock is transferred
  const medications = useMemo(() => {
    if (isMainBranch || !currentBranchId) {
      // Main branch sees everything in the catalog
      return allMedications;
    }
    // Non-main branches only see items they have stock for
    return allMedications.filter(m => m.branch_stock > 0);
  }, [allMedications, isMainBranch, currentBranchId]);

  // Update local cache after offline sale
  const updateLocalStock = (medicationId: string, quantitySold: number) => {
    const cached = getCachedBranchMedications(currentBranchId);
    const updated = cached.map(m => 
      m.id === medicationId 
        ? { ...m, branch_stock: Math.max(0, m.branch_stock - quantitySold) }
        : m
    );
    cacheBranchMedications(currentBranchId, updated);
    // Also update react-query cache
    queryClient.setQueryData(['branch-medications', pharmacyId, currentBranchId, isMainBranch], updated);
  };

  // Real-time subscription
  useEffect(() => {
    if (!pharmacyId) return;

    const medsChannel = supabase
      .channel('branch-meds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['branch-medications', pharmacyId] });
        }
      )
      .subscribe();

    const invChannel = supabase
      .channel('branch-inv-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branch_inventory',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['branch-medications', pharmacyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(medsChannel);
      supabase.removeChannel(invChannel);
    };
  }, [pharmacyId, currentBranchId, queryClient]);

  // Update branch stock
  const updateBranchStock = useMutation({
    mutationFn: async ({ medicationId, newStock }: { medicationId: string; newStock: number }) => {
      if (!currentBranchId || isMainBranch) {
        // Update main (HQ) stock directly on medications table
        const { error } = await supabase
          .from('medications')
          .update({ current_stock: newStock })
          .eq('id', medicationId);
        if (error) throw error;
        return;
      }
      
      // Check if branch inventory exists
      const { data: existing } = await supabase
        .from('branch_inventory')
        .select('id')
        .eq('branch_id', currentBranchId)
        .eq('medication_id', medicationId)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('branch_inventory')
          .update({ current_stock: newStock })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branch_inventory')
          .insert({
            branch_id: currentBranchId,
            medication_id: medicationId,
            current_stock: newStock,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-medications'] });
      toast({ title: 'Stock Updated', description: 'Branch stock updated successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Receive stock to branch
  const receiveStockToBranch = useMutation({
    mutationFn: async ({ medicationId, quantity }: { medicationId: string; quantity: number }) => {
      const medication = medications.find(m => m.id === medicationId);
      if (!medication) throw new Error('Medication not found');
      
      const newStock = medication.branch_stock + quantity;
      
      if (!currentBranchId || isMainBranch) {
        // Update main (HQ) stock
        const { error } = await supabase
          .from('medications')
          .update({ current_stock: newStock })
          .eq('id', medicationId);
        if (error) throw error;
        return;
      }
      
      // Update branch inventory
      const { data: existing } = await supabase
        .from('branch_inventory')
        .select('id, current_stock')
        .eq('branch_id', currentBranchId)
        .eq('medication_id', medicationId)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('branch_inventory')
          .update({ current_stock: existing.current_stock + quantity })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branch_inventory')
          .insert({
            branch_id: currentBranchId,
            medication_id: medicationId,
            current_stock: quantity,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-medications'] });
      toast({ title: 'Stock Received', description: 'Inventory updated for this branch.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Deduct stock from branch (for sales)
  const deductBranchStock = useMutation({
    mutationFn: async ({ medicationId, quantity }: { medicationId: string; quantity: number }) => {
      const medication = medications.find(m => m.id === medicationId);
      if (!medication) throw new Error('Medication not found');
      if (medication.branch_stock < quantity) throw new Error('Insufficient stock');
      
      const newStock = medication.branch_stock - quantity;
      
      if (!currentBranchId || isMainBranch) {
        // Update main (HQ) stock
        const { error } = await supabase
          .from('medications')
          .update({ current_stock: newStock })
          .eq('id', medicationId);
        if (error) throw error;
        return;
      }
      
      // Update branch inventory
      const { data: existing } = await supabase
        .from('branch_inventory')
        .select('id')
        .eq('branch_id', currentBranchId)
        .eq('medication_id', medicationId)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('branch_inventory')
          .update({ current_stock: newStock })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-medications'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate metrics for current branch
  const getMetrics = () => {
    const lowStock = medications.filter(m => m.branch_stock <= m.branch_reorder_level).length;
    const expired = medications.filter(m => new Date(m.expiry_date) <= new Date()).length;
    const expiringSoon = medications.filter(m => {
      const expiryDate = new Date(m.expiry_date);
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return expiryDate > today && expiryDate <= thirtyDaysFromNow;
    }).length;
    
    return {
      totalSKUs: medications.length,
      lowStock,
      expired,
      expiringSoon,
      totalValue: medications.reduce((sum, m) => sum + (m.branch_stock * (m.selling_price || m.unit_price)), 0),
    };
  };

  return {
    medications, // Only stocked items for non-main branches
    allCatalogMedications: allMedications, // Full catalog for inventory management
    isLoading,
    isOffline,
    updateBranchStock,
    receiveStockToBranch,
    deductBranchStock,
    getMetrics,
    currentBranchId,
    isMainBranch,
    updateLocalStock,
    hasCachedData: cachedMedications.length > 0,
  };
};
