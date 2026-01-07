import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';

export interface PendingQuickItem {
  id: string;
  pharmacy_id: string;
  branch_id: string | null;
  name: string;
  selling_price: number;
  quantity_sold: number;
  sold_by: string | null;
  sold_by_name: string | null;
  sale_id: string | null;
  status: 'pending' | 'reviewed' | 'linked';
  reviewed_by: string | null;
  reviewed_at: string | null;
  linked_medication_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQuickItems = () => {
  const queryClient = useQueryClient();
  const { pharmacyId } = usePharmacy();
  const { toast } = useToast();

  // Fetch pending quick items for manager review
  const { data: pendingItems = [], isLoading } = useQuery({
    queryKey: ['pending-quick-items', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      const { data, error } = await supabase
        .from('pending_quick_items')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingQuickItem[];
    },
    enabled: !!pharmacyId,
  });

  // Create a quick item (used during Express Sale)
  const createQuickItem = useMutation({
    mutationFn: async (params: {
      name: string;
      sellingPrice: number;
      quantitySold: number;
      soldBy?: string;
      soldByName?: string;
      branchId?: string;
    }) => {
      if (!pharmacyId) throw new Error('No pharmacy selected');

      const { data, error } = await supabase
        .from('pending_quick_items')
        .insert({
          pharmacy_id: pharmacyId,
          branch_id: params.branchId || null,
          name: params.name,
          selling_price: params.sellingPrice,
          quantity_sold: params.quantitySold,
          sold_by: params.soldBy || null,
          sold_by_name: params.soldByName || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-quick-items'] });
    },
  });

  // Link a quick item to an existing medication (manager action)
  const linkToMedication = useMutation({
    mutationFn: async (params: {
      quickItemId: string;
      medicationId: string;
      reviewedBy: string;
    }) => {
      const { error } = await supabase
        .from('pending_quick_items')
        .update({
          status: 'linked',
          linked_medication_id: params.medicationId,
          reviewed_by: params.reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.quickItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-quick-items'] });
      toast({
        title: 'Item Linked',
        description: 'Quick item has been linked to inventory.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to link item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark as reviewed without linking (manager decided not to add to inventory)
  const markAsReviewed = useMutation({
    mutationFn: async (params: {
      quickItemId: string;
      reviewedBy: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('pending_quick_items')
        .update({
          status: 'reviewed',
          reviewed_by: params.reviewedBy,
          reviewed_at: new Date().toISOString(),
          notes: params.notes || null,
        })
        .eq('id', params.quickItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-quick-items'] });
      toast({
        title: 'Item Reviewed',
        description: 'Quick item has been marked as reviewed.',
      });
    },
  });

  return {
    pendingItems,
    isLoading,
    createQuickItem,
    linkToMedication,
    markAsReviewed,
    pendingCount: pendingItems.length,
  };
};
