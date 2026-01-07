import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';

export interface SupplierProductWithDetails {
  id: string;
  supplier_id: string;
  medication_id: string | null;
  product_name: string;
  unit_price: number;
  lead_time_days: number | null;
  min_order_quantity: number;
  is_available: boolean;
  supplier_name: string;
}

export const useSupplierProducts = (medicationId?: string) => {
  const { pharmacyId } = usePharmacy();

  // Fetch supplier products for a specific medication
  const { data: supplierProducts = [], isLoading } = useQuery({
    queryKey: ['supplier-products-for-medication', medicationId, pharmacyId],
    queryFn: async () => {
      if (!medicationId || !pharmacyId) return [];
      
      const { data, error } = await supabase
        .from('supplier_products')
        .select(`
          id,
          supplier_id,
          medication_id,
          product_name,
          unit_price,
          lead_time_days,
          min_order_quantity,
          is_available,
          suppliers!inner (
            id,
            name,
            is_active,
            pharmacy_id
          )
        `)
        .eq('medication_id', medicationId)
        .eq('is_available', true);
      
      if (error) throw error;
      
      // Filter by pharmacy and map to flat structure
      return (data || [])
        .filter((item: any) => item.suppliers?.pharmacy_id === pharmacyId && item.suppliers?.is_active)
        .map((item: any) => ({
          id: item.id,
          supplier_id: item.supplier_id,
          medication_id: item.medication_id,
          product_name: item.product_name,
          unit_price: Number(item.unit_price),
          lead_time_days: item.lead_time_days,
          min_order_quantity: item.min_order_quantity,
          is_available: item.is_available,
          supplier_name: item.suppliers?.name || 'Unknown',
        }))
        .sort((a: SupplierProductWithDetails, b: SupplierProductWithDetails) => a.unit_price - b.unit_price);
    },
    enabled: !!medicationId && !!pharmacyId,
  });

  const bestPriceSupplier = supplierProducts[0] || null;

  return {
    supplierProducts,
    bestPriceSupplier,
    isLoading,
  };
};