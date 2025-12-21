import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/types/customer';

export const useCustomers = () => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('full_name');

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!pharmacy?.id,
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'loyalty_points'>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add customer', description: error.message, variant: 'destructive' });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update customer', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete customer', description: error.message, variant: 'destructive' });
    },
  });

  const addLoyaltyPoints = useMutation({
    mutationFn: async ({ customerId, points }: { customerId: string; points: number }) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Customer not found');
      
      const { data, error } = await supabase
        .from('customers')
        .update({ loyalty_points: customer.loyalty_points + points })
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { points }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: `${points > 0 ? 'Added' : 'Redeemed'} ${Math.abs(points)} loyalty points` });
    },
  });

  return {
    customers,
    isLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addLoyaltyPoints,
  };
};
