import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import { Branch, BranchInventory, StockTransfer } from '@/types/branch';

export const useBranches = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();

  // Fetch all branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('is_main_branch', { ascending: false });
      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!pharmacyId,
  });

  // Fetch branch inventory with medication details
  const { data: branchInventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['branch-inventory', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('branch_inventory')
        .select(`
          *,
          branches (name),
          medications (name, category, unit_price, selling_price, expiry_date)
        `)
        .in('branch_id', branches.map(b => b.id));
      if (error) throw error;
      return data as BranchInventory[];
    },
    enabled: !!pharmacyId && branches.length > 0,
  });

  // Fetch stock transfers
  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ['stock-transfers', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          from_branch:branches!stock_transfers_from_branch_id_fkey (name),
          to_branch:branches!stock_transfers_to_branch_id_fkey (name),
          medications (name)
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StockTransfer[];
    },
    enabled: !!pharmacyId,
  });

  // Real-time subscription for branches and transfers
  useEffect(() => {
    if (!pharmacyId) return;

    const branchesChannel = supabase
      .channel('branches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branches',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['branches', pharmacyId] });
        }
      )
      .subscribe();

    const transfersChannel = supabase
      .channel('transfers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_transfers',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stock-transfers', pharmacyId] });
        }
      )
      .subscribe();

    const inventoryChannel = supabase
      .channel('branch-inventory-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branch_inventory',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['branch-inventory', pharmacyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(branchesChannel);
      supabase.removeChannel(transfersChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [pharmacyId, queryClient]);

  // Add branch
  const addBranch = useMutation({
    mutationFn: async (branch: Omit<Branch, 'id' | 'created_at' | 'updated_at' | 'pharmacy_id'>) => {
      if (!pharmacyId) throw new Error('No pharmacy found');
      const { data, error } = await supabase
        .from('branches')
        .insert({ ...branch, pharmacy_id: pharmacyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch Added', description: 'New branch created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update branch
  const updateBranch = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Branch> & { id: string }) => {
      const { data, error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch Updated', description: 'Branch details updated.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete branch
  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch Deleted', description: 'Branch removed successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create stock transfer
  const createTransfer = useMutation({
    mutationFn: async (transfer: {
      from_branch_id: string;
      to_branch_id: string;
      medication_id: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!pharmacyId) throw new Error('No pharmacy found');
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('stock_transfers')
        .insert({
          ...transfer,
          pharmacy_id: pharmacyId,
          requested_by: userData.user?.id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: 'Transfer Created', description: 'Stock transfer request submitted.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update transfer status
  const updateTransferStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StockTransfer['status'] }) => {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        const { data: userData } = await supabase.auth.getUser();
        updates.approved_by = userData.user?.id;
      }
      const { data, error } = await supabase
        .from('stock_transfers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // If completed, update inventory
      if (status === 'completed') {
        const transfer = data as StockTransfer;
        
        // Find source branch to check if it's main branch
        const sourceBranch = await supabase
          .from('branches')
          .select('is_main_branch')
          .eq('id', transfer.from_branch_id)
          .single();
        
        const destBranch = await supabase
          .from('branches')
          .select('is_main_branch')
          .eq('id', transfer.to_branch_id)
          .single();
        
        const isSourceMainBranch = sourceBranch.data?.is_main_branch || false;
        const isDestMainBranch = destBranch.data?.is_main_branch || false;
        
        // Decrease from source
        if (isSourceMainBranch) {
          // Main branch uses medications.current_stock
          const { data: med } = await supabase
            .from('medications')
            .select('current_stock')
            .eq('id', transfer.medication_id)
            .single();
          
          if (med) {
            await supabase
              .from('medications')
              .update({ current_stock: Math.max(0, med.current_stock - transfer.quantity) })
              .eq('id', transfer.medication_id);
          }
        } else {
          // Non-main branch uses branch_inventory
          const { data: sourceInv } = await supabase
            .from('branch_inventory')
            .select('*')
            .eq('branch_id', transfer.from_branch_id)
            .eq('medication_id', transfer.medication_id)
            .maybeSingle();
          
          if (sourceInv) {
            await supabase
              .from('branch_inventory')
              .update({ current_stock: Math.max(0, sourceInv.current_stock - transfer.quantity) })
              .eq('id', sourceInv.id);
          }
        }

        // Increase at destination
        if (isDestMainBranch) {
          // Main branch uses medications.current_stock
          const { data: med } = await supabase
            .from('medications')
            .select('current_stock')
            .eq('id', transfer.medication_id)
            .single();
          
          if (med) {
            await supabase
              .from('medications')
              .update({ current_stock: med.current_stock + transfer.quantity })
              .eq('id', transfer.medication_id);
          }
        } else {
          // Non-main branch uses branch_inventory
          const { data: destInv } = await supabase
            .from('branch_inventory')
            .select('*')
            .eq('branch_id', transfer.to_branch_id)
            .eq('medication_id', transfer.medication_id)
            .maybeSingle();

          if (destInv) {
            await supabase
              .from('branch_inventory')
              .update({ current_stock: destInv.current_stock + transfer.quantity })
              .eq('id', destInv.id);
          } else {
            // Create new branch_inventory entry for destination
            await supabase
              .from('branch_inventory')
              .insert({
                branch_id: transfer.to_branch_id,
                medication_id: transfer.medication_id,
                current_stock: transfer.quantity,
              });
          }
        }
      }

      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['branch-medications'] });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({
        title: status === 'completed' ? 'Transfer Completed' : 'Transfer Updated',
        description: `Transfer status changed to ${status}.`,
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    branches,
    branchInventory,
    transfers,
    isLoading: branchesLoading || inventoryLoading || transfersLoading,
    branchesLoading,
    addBranch,
    updateBranch,
    deleteBranch,
    createTransfer,
    updateTransferStatus,
  };
};
