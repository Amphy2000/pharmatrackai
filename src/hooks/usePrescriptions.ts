import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import type { Prescription, PrescriptionItem } from '@/types/customer';

export const usePrescriptions = (customerId?: string) => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', pharmacy?.id, customerId],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          customer:customers(*),
          items:prescription_items(*)
        `)
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Prescription[];
    },
    enabled: !!pharmacy?.id,
  });

  const addPrescription = useMutation({
    mutationFn: async ({ 
      prescription, 
      items 
    }: { 
      prescription: Omit<Prescription, 'id' | 'created_at' | 'updated_at' | 'customer' | 'items'>; 
      items: Omit<PrescriptionItem, 'id' | 'prescription_id' | 'created_at'>[];
    }) => {
      // Insert prescription
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert(prescription)
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Insert prescription items
      if (items.length > 0) {
        const itemsWithPrescriptionId = items.map(item => ({
          ...item,
          prescription_id: prescriptionData.id,
        }));

        const { error: itemsError } = await supabase
          .from('prescription_items')
          .insert(itemsWithPrescriptionId);

        if (itemsError) throw itemsError;
      }

      return prescriptionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast({ title: 'Prescription created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create prescription', description: error.message, variant: 'destructive' });
    },
  });

  const updatePrescription = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prescription> & { id: string }) => {
      const { data, error } = await supabase
        .from('prescriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast({ title: 'Prescription updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update prescription', description: error.message, variant: 'destructive' });
    },
  });

  const recordRefill = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const prescription = prescriptions.find(p => p.id === prescriptionId);
      if (!prescription) throw new Error('Prescription not found');
      
      if (prescription.refill_count >= prescription.max_refills) {
        throw new Error('Maximum refills reached');
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .update({ 
          refill_count: prescription.refill_count + 1,
          last_refill_date: new Date().toISOString(),
        })
        .eq('id', prescriptionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast({ title: 'Refill recorded successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to record refill', description: error.message, variant: 'destructive' });
    },
  });

  const deletePrescription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast({ title: 'Prescription deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete prescription', description: error.message, variant: 'destructive' });
    },
  });

  // Get prescriptions due for refill reminder
  const prescriptionsDueForReminder = prescriptions.filter(p => {
    if (p.status !== 'active' || !p.next_refill_reminder) return false;
    const reminderDate = new Date(p.next_refill_reminder);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reminderDate <= today && p.refill_count < p.max_refills;
  });

  return {
    prescriptions,
    isLoading,
    addPrescription,
    updatePrescription,
    recordRefill,
    deletePrescription,
    prescriptionsDueForReminder,
  };
};
