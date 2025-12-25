import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchContext } from '@/contexts/BranchContext';

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

export const useBranchInventory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();
  const { currentBranchId, isMainBranch } = useBranchContext();

  // Fetch ALL medications with branch-specific stock (full catalog)
  const { data: allMedications = [], isLoading } = useQuery({
    queryKey: ['branch-medications', pharmacyId, currentBranchId],
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
    enabled: !!pharmacyId,
  });

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
          queryClient.invalidateQueries({ queryKey: ['branch-medications', pharmacyId, currentBranchId] });
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
          queryClient.invalidateQueries({ queryKey: ['branch-medications', pharmacyId, currentBranchId] });
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
    updateBranchStock,
    receiveStockToBranch,
    deductBranchStock,
    getMetrics,
    currentBranchId,
    isMainBranch,
  };
};
