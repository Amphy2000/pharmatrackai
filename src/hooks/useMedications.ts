import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Medication, MedicationFormData, DashboardMetrics } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';
import { addDays, isAfter, isBefore, parseISO } from 'date-fns';

export const useMedications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: medications = [], isLoading, error } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Medication[];
    },
  });

  const addMedication = useMutation({
    mutationFn: async (newMedication: MedicationFormData) => {
      const { data, error } = await supabase
        .from('medications')
        .insert([newMedication])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({
        title: 'Medication Added',
        description: 'New medication has been added to inventory.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add medication: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateMedication = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Medication> & { id: string }) => {
      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Medication not found');
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({
        title: 'Medication Updated',
        description: 'Medication details have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update medication: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteMedication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({
        title: 'Medication Deleted',
        description: 'Medication has been removed from inventory.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete medication: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const getMetrics = (): DashboardMetrics => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    return {
      totalSKUs: medications.length,
      lowStockItems: medications.filter(m => m.current_stock <= m.reorder_level).length,
      expiredItems: medications.filter(m => isBefore(parseISO(m.expiry_date), today)).length,
      expiringWithin30Days: medications.filter(m => {
        const expiryDate = parseISO(m.expiry_date);
        return isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow);
      }).length,
    };
  };

  const isExpired = (expiryDate: string): boolean => {
    return isBefore(parseISO(expiryDate), new Date());
  };

  const isLowStock = (currentStock: number, reorderLevel: number): boolean => {
    return currentStock <= reorderLevel;
  };

  const isExpiringSoon = (expiryDate: string): boolean => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    const expiry = parseISO(expiryDate);
    return isAfter(expiry, today) && isBefore(expiry, thirtyDaysFromNow);
  };

  return {
    medications,
    isLoading,
    error,
    addMedication,
    updateMedication,
    deleteMedication,
    getMetrics,
    isExpired,
    isLowStock,
    isExpiringSoon,
  };
};
