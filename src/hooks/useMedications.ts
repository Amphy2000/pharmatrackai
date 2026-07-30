import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Medication, MedicationFormData, DashboardMetrics } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import { addDays, isAfter, isBefore, parseISO, differenceInDays } from 'date-fns';

export const useMedications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();

  const { data: medications = [], isLoading, error } = useQuery({
    queryKey: ['medications', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];

      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!pharmacyId,
  });

  // Real-time subscription for medications updates
  useEffect(() => {
    const channel = supabase
      .channel('medications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['medications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const addMedication = useMutation({
    mutationFn: async (newMedication: MedicationFormData & { metadata?: Record<string, any> }) => {
      if (!pharmacyId) {
        throw new Error('No pharmacy selected. Please select a pharmacy and try again.');
      }

      const insertData: Record<string, any> = {
        name: newMedication.name,
        category: newMedication.category,
        batch_number: newMedication.batch_number,
        expiry_date: newMedication.expiry_date,
        current_stock: Number(newMedication.current_stock),
        reorder_level: Number(newMedication.reorder_level),
        unit_price: Number(newMedication.unit_price),
        dispensing_unit: newMedication.dispensing_unit,
        pharmacy_id: pharmacyId,
      };

      if (newMedication.selling_price !== undefined) {
        insertData.selling_price = Number(newMedication.selling_price);
      }
      if (newMedication.wholesale_price !== undefined) {
        insertData.wholesale_price = Number(newMedication.wholesale_price);
      }
      if (newMedication.wholesale_min_qty !== undefined) {
        insertData.wholesale_min_qty = Number(newMedication.wholesale_min_qty);
      }

      const { data, error } = await supabase
        .from('medications')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({
        title: 'Success',
        description: 'Medication added to inventory.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add medication.',
        variant: 'destructive',
      });
    },
  });

  const updateMedication = useMutation({
    mutationFn: async (medication: Partial<Medication> & { id: string }) => {
      const { id, ...updates } = medication;

      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update medication.',
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
        title: 'Success',
        description: 'Medication removed from inventory.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete medication.',
        variant: 'destructive',
      });
    },
  });

  const getMetrics = (): DashboardMetrics => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    const safeMeds = medications || [];

    return {
      totalSKUs: safeMeds.length,
      lowStockItems: safeMeds.filter(m => (m.current_stock || 0) <= (m.reorder_level || 0)).length,
      expiredItems: safeMeds.filter(m => m.expiry_date && isBefore(parseISO(m.expiry_date), today)).length,
      expiringWithin30Days: safeMeds.filter(m => {
        if (!m.expiry_date) return false;
        try {
          const expiryDate = parseISO(m.expiry_date);
          return isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow);
        } catch {
          return false;
        }
      }).length,
    };
  };

  const isExpired = (expiryDate?: string | null): boolean => {
    if (!expiryDate) return false;
    try {
      return isBefore(parseISO(expiryDate), new Date());
    } catch {
      return false;
    }
  };

  const isExpiringSoon = (expiryDate?: string | null, days: number = 30): boolean => {
    if (!expiryDate) return false;
    try {
      const expiry = parseISO(expiryDate);
      const today = new Date();
      const diff = differenceInDays(expiry, today);
      return diff > 0 && diff <= days;
    } catch {
      return false;
    }
  };

  const isLowStock = (currentStock?: number | null, reorderLevel?: number | null): boolean => {
    const stock = currentStock ?? 0;
    const reorder = reorderLevel ?? 0;
    return stock <= reorder;
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
    isExpiringSoon,
    isLowStock,
  };
};
