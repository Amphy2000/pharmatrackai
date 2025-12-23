import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';

interface CompleteSaleParams {
  items: CartItem[];
  customerName?: string;
  customerId?: string;
  shiftId?: string;
  staffName?: string;
  paymentMethod?: string;
  prescriptionImages?: string[];
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

export const useSales = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();

  // Query to fetch sales
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      const { data, error } = await supabase
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
          created_at,
          medication:medications (
            name,
            category
          )
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('sale_date', { ascending: false })
        .limit(500);
      
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
          queryClient.invalidateQueries({ queryKey: ['sales', pharmacyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacyId, queryClient]);

  const completeSale = useMutation({
    mutationFn: async ({ items, customerName, customerId, shiftId, staffName, paymentMethod, prescriptionImages }: CompleteSaleParams) => {
      if (!pharmacyId) {
        throw new Error('No pharmacy associated with your account. Please complete onboarding first.');
      }

      // Get current user for sold_by
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      let totalSaleAmount = 0;
      
      // Generate a single receipt ID for this transaction batch
      const receiptId = generateReceiptId();
      
      // Results array
      const results: { item: CartItem; newStock: number; receiptId: string }[] = [];

      // Process items sequentially for reliability
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const price = item.medication.selling_price || item.medication.unit_price;
        const totalPrice = price * item.quantity;
        totalSaleAmount += totalPrice;

        // Get the current stock from DB
        const { data: medicationData } = await supabase
          .from('medications')
          .select('current_stock')
          .eq('id', item.medication.id)
          .maybeSingle();
        
        const currentStock = medicationData?.current_stock ?? item.medication.current_stock ?? 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        // Generate unique receipt_id for each sale record
        const itemReceiptId = items.length > 1 ? `${receiptId}-${index + 1}` : receiptId;

        // Insert sale record
        const { data: saleData, error: saleError } = await supabase.from('sales').insert({
          medication_id: item.medication.id,
          quantity: item.quantity,
          unit_price: price,
          total_price: totalPrice,
          customer_name: customerName || null,
          customer_id: customerId || null,
          pharmacy_id: pharmacyId,
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

        // Update medication stock
        await supabase
          .from('medications')
          .update({ current_stock: newStock })
          .eq('id', item.medication.id);

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

      return { results, receiptId };
    },
    onSuccess: async ({ results, receiptId }) => {
      // Force immediate refetch of medications
      await queryClient.refetchQueries({ queryKey: ['medications'], type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      
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