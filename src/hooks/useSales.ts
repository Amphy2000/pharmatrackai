import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';

interface CompleteSaleParams {
  items: CartItem[];
  customerName?: string;
}

export const useSales = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const completeSale = useMutation({
    mutationFn: async ({ items, customerName }: CompleteSaleParams) => {
      // Process each item in the cart
      const salePromises = items.map(async (item) => {
        const price = item.medication.selling_price || item.medication.unit_price;
        const totalPrice = price * item.quantity;

        // Insert sale record
        const { error: saleError } = await supabase.from('sales').insert({
          medication_id: item.medication.id,
          quantity: item.quantity,
          unit_price: price,
          total_price: totalPrice,
          customer_name: customerName || null,
          pharmacy_id: item.medication.pharmacy_id || null,
        } as any);

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

      return Promise.all(salePromises);
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

  return { completeSale };
};
