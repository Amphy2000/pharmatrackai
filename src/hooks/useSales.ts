import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, Medication } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useBranchContext } from '@/contexts/BranchContext';
import { isBefore, parseISO } from 'date-fns';

// Network timeout for sale operations (8 seconds)
const SALE_TIMEOUT_MS = 8000;

// Check if a medication batch is expired
export const isExpiredBatch = (expiryDate: string): boolean => {
  return isBefore(parseISO(expiryDate), new Date());
};

// FEFO: Find the batch with earliest expiry that's not expired
export const findFEFOBatch = (medications: Medication[], name: string): Medication | null => {
  const validBatches = medications
    .filter(med => 
      med.name === name && 
      med.current_stock > 0 && 
      !isExpiredBatch(med.expiry_date)
    )
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  
  return validBatches.length > 0 ? validBatches[0] : null;
};

interface CompleteSaleParams {
  items: CartItem[];
  customerName?: string;
  customerId?: string;
  shiftId?: string;
  staffName?: string;
  paymentMethod?: string;
  prescriptionImages?: string[];
  forceOffline?: boolean;
}

interface SaleWithMedication {
  id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_name: string | null;
  sale_date: string;
  sold_by: string | null;
  sold_by_name: string | null;
  receipt_id: string | null;
  shift_id: string | null;
  branch_id: string | null;
  created_at: string;
  medication: {
    name: string;
    category: string;
  } | null;
}

// Generate unique receipt ID like PH-ABC
const generateReceiptId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'PH-';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper: wrap a promise with a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutError: Error): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(timeoutError), ms))
  ]);
};

// Helper: queue sale for offline sync and return result
const queueOfflineSale = (
  items: CartItem[],
  receiptId: string,
  params: CompleteSaleParams,
  addPendingSale: (sale: any) => string
) => {
  const total = items.reduce((sum, item) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    return sum + (price * item.quantity);
  }, 0);

  addPendingSale({
    items: items.map(item => ({
      medicationId: item.medication.id,
      medicationName: item.medication.name,
      quantity: item.quantity,
      unitPrice: item.medication.selling_price || item.medication.unit_price,
      totalPrice: (item.medication.selling_price || item.medication.unit_price) * item.quantity,
    })),
    total,
    customerId: params.customerId,
    customerName: params.customerName,
    paymentMethod: params.paymentMethod,
    shiftId: params.shiftId,
    staffName: params.staffName,
  });

  return { 
    results: items.map(item => ({ 
      item, 
      newStock: Math.max(0, item.medication.current_stock - item.quantity), 
      receiptId 
    })), 
    receiptId,
    isOffline: true,
  };
};

export const useSales = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();
  const { isOnline, addPendingSale } = useOfflineSync();
  const { currentBranchId, isMainBranch } = useBranchContext();

  // Query to fetch sales - filtered by branch for staff
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', pharmacyId, currentBranchId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      let query = supabase
        .from('sales')
        .select(`
          id,
          medication_id,
          quantity,
          unit_price,
          total_price,
          customer_name,
          sale_date,
          sold_by,
          sold_by_name,
          receipt_id,
          shift_id,
          branch_id,
          created_at,
          medication:medications (
            name,
            category
          )
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('sale_date', { ascending: false })
        .limit(500);
      
      // Filter by branch if one is selected (for branch isolation)
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as SaleWithMedication[];
    },
    enabled: !!pharmacyId,
  });

  // Real-time subscription for sales updates
  useEffect(() => {
    if (!pharmacyId) return;

    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales', pharmacyId, currentBranchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacyId, currentBranchId, queryClient]);

  const completeSale = useMutation({
    mutationFn: async ({ items, customerName, customerId, shiftId, staffName, paymentMethod, prescriptionImages, forceOffline }: CompleteSaleParams) => {
      if (!pharmacyId) {
        throw new Error('No pharmacy associated with your account. Please complete onboarding first.');
      }

      // Generate receipt ID early
      const receiptId = generateReceiptId();

      // If forceOffline flag is set OR navigator says offline, queue immediately
      if (forceOffline || !isOnline) {
        console.log('[Sale] Offline mode detected, queuing sale locally');
        return queueOfflineSale(items, receiptId, { items, customerName, customerId, shiftId, staffName, paymentMethod, prescriptionImages }, addPendingSale);
      }

      // Attempt online sale with timeout fallback
      try {
        const onlineSaleResult = await withTimeout(
          processOnlineSale({
            items,
            customerName,
            customerId,
            shiftId,
            staffName,
            paymentMethod,
            prescriptionImages,
            receiptId,
            pharmacyId,
            currentBranchId,
            isMainBranch,
          }),
          SALE_TIMEOUT_MS,
          new Error('NETWORK_TIMEOUT')
        );
        return onlineSaleResult;
      } catch (error: any) {
        // If network timeout or fetch failed, queue offline
        if (error.message === 'NETWORK_TIMEOUT' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          console.log('[Sale] Network timeout/failure, falling back to offline queue');
          toast({
            title: 'Slow Connection',
            description: 'Sale saved offline due to poor network. Will sync automatically.',
          });
          return queueOfflineSale(items, receiptId, { items, customerName, customerId, shiftId, staffName, paymentMethod, prescriptionImages }, addPendingSale);
        }
        // Re-throw other errors (validation, stock issues, etc.)
        throw error;
      }
    },
    onSuccess: async ({ results, receiptId, isOffline: wasOffline }) => {
      // If offline/queued, show confirmation toast
      if (wasOffline) {
        toast({
          title: 'Sale Queued',
          description: `Transaction ${receiptId} saved locally. Will sync when online.`,
        });
        return;
      }

      // Force immediate refetch of medications
      await queryClient.refetchQueries({ queryKey: ['medications'], type: 'active' });
      await queryClient.refetchQueries({ queryKey: ['branch-medications'], type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] });
      
      // Check for low stock alerts
      const lowStockItems = results.filter(
        (r) => r.newStock <= r.item.medication.reorder_level
      );

      if (lowStockItems.length > 0) {
        toast({
          title: 'Low Stock Alert',
          description: `${lowStockItems.map((i) => i.item.medication.name).join(', ')} ${lowStockItems.length === 1 ? 'is' : 'are'} below reorder level!`,
          variant: 'destructive',
        });
      }

      toast({
        title: 'Sale Complete',
        description: `Transaction ${receiptId}: ${results.length} item(s) processed.`,
      });
    },
    onError: (error) => {
      console.error('Sale mutation error:', error);
      toast({
        title: 'Sale Failed',
        description: `Error processing sale: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return { sales, isLoading, completeSale };
};

// Separated online sale processing for cleaner timeout handling
async function processOnlineSale({
  items,
  customerName,
  customerId,
  shiftId,
  staffName,
  paymentMethod,
  prescriptionImages,
  receiptId,
  pharmacyId,
  currentBranchId,
  isMainBranch,
}: {
  items: CartItem[];
  customerName?: string;
  customerId?: string;
  shiftId?: string;
  staffName?: string;
  paymentMethod?: string;
  prescriptionImages?: string[];
  receiptId: string;
  pharmacyId: string;
  currentBranchId: string | null;
  isMainBranch: boolean;
}) {
  // Get current user for sold_by
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  
  let totalSaleAmount = 0;
  
  // Results array
  const results: { item: CartItem; newStock: number; receiptId: string }[] = [];

  // Process items sequentially for reliability
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const price = item.medication.selling_price || item.medication.unit_price;
    const totalPrice = price * item.quantity;
    totalSaleAmount += totalPrice;

    let currentStock = 0;

    if (currentBranchId && !isMainBranch) {
      const { data: branchInv, error: branchInvError } = await supabase
        .from('branch_inventory')
        .select('id, current_stock')
        .eq('branch_id', currentBranchId)
        .eq('medication_id', item.medication.id)
        .maybeSingle();

      if (branchInvError) throw branchInvError;
      if (!branchInv) {
        throw new Error('No stock record for this branch. Receive stock first.');
      }

      currentStock = branchInv.current_stock ?? 0;
    } else {
      const { data: medicationData, error: medicationError } = await supabase
        .from('medications')
        .select('current_stock')
        .eq('id', item.medication.id)
        .maybeSingle();

      if (medicationError) throw medicationError;
      currentStock = medicationData?.current_stock ?? item.medication.current_stock ?? 0;
    }

    const newStock = Math.max(0, currentStock - item.quantity);

    // Generate unique receipt_id for each sale record
    const itemReceiptId = items.length > 1 ? `${receiptId}-${index + 1}` : receiptId;

    // Insert sale record WITH branch_id for isolation
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      medication_id: item.medication.id,
      quantity: item.quantity,
      unit_price: price,
      total_price: totalPrice,
      customer_name: customerName || null,
      customer_id: customerId || null,
      pharmacy_id: pharmacyId,
      branch_id: currentBranchId || null,
      sold_by: user?.id || null,
      sold_by_name: staffName || null,
      receipt_id: itemReceiptId,
      shift_id: shiftId || null,
      payment_method: paymentMethod || null,
      prescription_images: prescriptionImages && prescriptionImages.length > 0 ? prescriptionImages : null,
    }).select('receipt_id').single();

    if (saleError) {
      console.error('Error inserting sale:', saleError);
      throw saleError;
    }

    // Update main (HQ) stock only when selling from HQ
    if (!currentBranchId || isMainBranch) {
      await supabase
        .from('medications')
        .update({ current_stock: newStock })
        .eq('id', item.medication.id);
    }

    // Update branch stock when selling from a non-HQ branch
    if (currentBranchId && !isMainBranch) {
      const { data: branchInv } = await supabase
        .from('branch_inventory')
        .select('id, current_stock')
        .eq('branch_id', currentBranchId)
        .eq('medication_id', item.medication.id)
        .maybeSingle();

      if (branchInv) {
        await supabase
          .from('branch_inventory')
          .update({ current_stock: Math.max(0, branchInv.current_stock - item.quantity) })
          .eq('id', branchInv.id);
      }
    }

    results.push({ item, newStock, receiptId: saleData?.receipt_id || itemReceiptId });
  }

  // Update shift stats if we have a shift
  if (shiftId) {
    const { data: currentShift } = await supabase
      .from('staff_shifts')
      .select('total_sales, total_transactions')
      .eq('id', shiftId)
      .single();

    if (currentShift) {
      await supabase
        .from('staff_shifts')
        .update({
          total_sales: (currentShift.total_sales || 0) + totalSaleAmount,
          total_transactions: (currentShift.total_transactions || 0) + 1,
        })
        .eq('id', shiftId);
    }
  }

  return { results, receiptId, isOffline: false };
}
