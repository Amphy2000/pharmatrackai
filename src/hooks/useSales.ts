import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';

interface CompleteSaleParams {
  items: CartItem[];
  customerName?: string;
  shiftId?: string;
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
  shift_id: string | null;
  created_at: string;
  medication: {
    name: string;
    category: string;
  } | null;
}

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

  const completeSale = useMutation({
    mutationFn: async ({ items, customerName, shiftId }: CompleteSaleParams) => {
      if (!pharmacyId) {
        throw new Error('No pharmacy associated with your account. Please complete onboarding first.');
      }

      // Get current user for sold_by
      const { data: { user } } = await supabase.auth.getUser();
      let totalSaleAmount = 0;

      // Process each item in the cart
      const salePromises = items.map(async (item) => {
        const price = item.medication.selling_price || item.medication.unit_price;
        const totalPrice = price * item.quantity;
        totalSaleAmount += totalPrice;

        // Insert sale record with shift_id and sold_by
        const { error: saleError } = await supabase.from('sales').insert({
          medication_id: item.medication.id,
          quantity: item.quantity,
          unit_price: price,
          total_price: totalPrice,
          customer_name: customerName || null,
          pharmacy_id: pharmacyId,
          sold_by: user?.id || null,
          shift_id: shiftId || null,
        });

        if (saleError) throw saleError;

        // Update medication stock
        const newStock = item.medication.current_stock - item.quantity;
        const { error: updateError } = await supabase
          .from('medications')
          .update({ current_stock: newStock })
          .eq('id', item.medication.id);

        if (updateError) throw updateError;

        return { item, newStock };
      });

      const results = await Promise.all(salePromises);

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

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      
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
        description: `Successfully processed ${results.length} item(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sale Failed',
        description: `Error processing sale: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return { sales, isLoading, completeSale };
};
