import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/types/medication';
import { generateShortCode, generateBarcode } from '@/utils/htmlReceiptPrinter';
import { useBranchContext } from '@/contexts/BranchContext';

interface PendingTransaction {
  id: string;
  pharmacy_id: string;
  branch_id: string | null;
  short_code: string;
  barcode: string;
  items: CartItem[];
  total_amount: number;
  created_by: string | null;
  created_at: string;
  status: 'pending' | 'completed' | 'cancelled';
  completed_by: string | null;
  completed_at: string | null;
  payment_method: 'cash' | 'transfer' | 'pos' | null;
  notes: string | null;
}

export const usePendingTransactions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();
  const { currentBranchId } = useBranchContext();

  // Fetch pending transactions - filtered by branch for isolation
  const { data: pendingTransactions = [], isLoading } = useQuery({
    queryKey: ['pending-transactions', pharmacyId, currentBranchId],
    queryFn: async () => {
      if (!pharmacyId) return [];

      let query = supabase
        .from('pending_transactions')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Filter by branch for isolation
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Parse JSON items
      return (data || []).map(t => ({
        ...t,
        items: t.items as unknown as CartItem[],
      })) as PendingTransaction[];
    },
    enabled: !!pharmacyId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!pharmacyId) return;

    const channel = supabase
      .channel('pending-transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_transactions',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-transactions', pharmacyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacyId, queryClient]);

  // Create pending transaction
  const createPendingTransaction = useMutation({
    mutationFn: async ({ items, total }: { items: CartItem[]; total: number }) => {
      if (!pharmacyId) throw new Error('No pharmacy ID');

      const { data: { user } } = await supabase.auth.getUser();
      const shortCode = generateShortCode();
      const barcode = generateBarcode();

      // Serialize items for storage
      const serializedItems = items.map(item => {
        const isQuickItem =
          item.isQuickItem === true || String(item.medication?.id || '').startsWith('quick-');

        return {
          medication: {
            id: item.medication.id,
            name: item.medication.name,
            category: item.medication.category,
            unit_price: item.medication.unit_price,
            selling_price: item.medication.selling_price,
            current_stock: item.medication.current_stock,
            reorder_level: item.medication.reorder_level,
            dispensing_unit: item.medication.dispensing_unit,
            batch_number: item.medication.batch_number,
            expiry_date: item.medication.expiry_date,
          },
          quantity: item.quantity,
          isQuickItem,
          quickItemPrice: item.quickItemPrice ?? null,
        };
      });

      const { data, error } = await supabase
        .from('pending_transactions')
        .insert({
          pharmacy_id: pharmacyId,
          branch_id: currentBranchId || null, // Add branch isolation
          short_code: shortCode,
          barcode: barcode,
          items: serializedItems,
          total_amount: total,
          created_by: user?.id || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        items: data.items as unknown as CartItem[],
      } as PendingTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      toast({
        title: 'Invoice Created',
        description: `Invoice ${data.short_code} generated. Customer can pay at the cashier.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create invoice: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Find transaction by code or barcode
  const findTransaction = async (searchTerm: string): Promise<PendingTransaction | null> => {
    if (!pharmacyId) return null;

    const { data, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'pending')
      .or(`short_code.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
      .maybeSingle();

    if (error) {
      console.error('Find transaction error:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      items: data.items as unknown as CartItem[],
    } as PendingTransaction;
  };

  // Complete pending transaction
  const completePendingTransaction = useMutation({
    mutationFn: async ({ 
      transactionId, 
      paymentMethod 
    }: { 
      transactionId: string; 
      paymentMethod: 'cash' | 'transfer' | 'pos' 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('pending_transactions')
        .update({
          status: 'completed',
          payment_method: paymentMethod,
          completed_by: user?.id || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to complete transaction: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Cancel pending transaction
  const cancelPendingTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('pending_transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      toast({
        title: 'Transaction Cancelled',
        description: 'The pending transaction has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to cancel transaction: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    pendingTransactions,
    isLoading,
    createPendingTransaction,
    findTransaction,
    completePendingTransaction,
    cancelPendingTransaction,
    pendingCount: pendingTransactions.length,
  };
};
