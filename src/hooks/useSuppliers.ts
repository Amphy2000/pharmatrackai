import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import type { Supplier, SupplierProduct, ReorderRequest } from '@/types/supplier';

export const useSuppliers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();

  // Fetch suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!pharmacyId,
  });

  // Fetch supplier products with medication details
  const { data: supplierProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['supplier-products', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId || suppliers.length === 0) return [];
      const { data, error } = await supabase
        .from('supplier_products')
        .select(`
          *,
          suppliers (name),
          medications (name, current_stock, reorder_level)
        `)
        .in('supplier_id', suppliers.map(s => s.id));
      if (error) throw error;
      return data as SupplierProduct[];
    },
    enabled: !!pharmacyId && suppliers.length > 0,
  });

  // Fetch reorder requests
  const { data: reorderRequests = [], isLoading: reordersLoading } = useQuery({
    queryKey: ['reorder-requests', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('reorder_requests')
        .select(`
          *,
          suppliers (name),
          medications (name)
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReorderRequest[];
    },
    enabled: !!pharmacyId,
  });

  // Real-time subscription for suppliers
  useEffect(() => {
    if (!pharmacyId) return;

    const suppliersChannel = supabase
      .channel('suppliers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['suppliers', pharmacyId] });
        }
      )
      .subscribe();

    const reordersChannel = supabase
      .channel('reorders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reorder_requests',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reorder-requests', pharmacyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(suppliersChannel);
      supabase.removeChannel(reordersChannel);
    };
  }, [pharmacyId, queryClient]);

  // Add supplier
  const addSupplier = useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'pharmacy_id'>) => {
      if (!pharmacyId) throw new Error('No pharmacy found');
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...supplier, pharmacy_id: pharmacyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier Added', description: 'New supplier created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update supplier
  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier Updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete supplier
  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier Deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add supplier product
  const addSupplierProduct = useMutation({
    mutationFn: async (product: Omit<SupplierProduct, 'id' | 'created_at' | 'updated_at' | 'suppliers' | 'medications'>) => {
      const { data, error } = await supabase
        .from('supplier_products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      toast({ title: 'Product Added' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create reorder request
  const createReorder = useMutation({
    mutationFn: async (request: {
      supplier_id: string;
      medication_id?: string;
      supplier_product_id?: string;
      quantity: number;
      unit_price: number;
      notes?: string;
      expected_delivery?: string;
    }) => {
      if (!pharmacyId) throw new Error('No pharmacy found');
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('reorder_requests')
        .insert({
          ...request,
          pharmacy_id: pharmacyId,
          total_amount: request.quantity * request.unit_price,
          requested_by: userData.user?.id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-requests'] });
      toast({ title: 'Reorder Created', description: 'Stock reorder request submitted.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update reorder status
  const updateReorderStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ReorderRequest['status']; notes?: string }) => {
      const updates: Partial<ReorderRequest> = { status };
      if (notes) updates.notes = notes;
      if (status === 'delivered') {
        updates.actual_delivery = new Date().toISOString().split('T')[0];
      }
      const { data, error } = await supabase
        .from('reorder_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['reorder-requests'] });
      toast({ title: 'Reorder Updated', description: `Status changed to ${status}.` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    suppliers,
    supplierProducts,
    reorderRequests,
    isLoading: suppliersLoading || productsLoading || reordersLoading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierProduct,
    createReorder,
    updateReorderStatus,
  };
};
