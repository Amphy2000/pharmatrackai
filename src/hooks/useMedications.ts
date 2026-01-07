import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Medication, MedicationFormData, DashboardMetrics } from '@/types/medication';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';
import { addDays, isAfter, isBefore, parseISO } from 'date-fns';

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
          // Invalidate and refetch medications on any change
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

      // Build insert object with only core required fields first
      const insertData: Record<string, any> = {
        name: newMedication.name,
        category: newMedication.category,
        batch_number: newMedication.batch_number,
        current_stock: newMedication.current_stock,
        reorder_level: newMedication.reorder_level,
        expiry_date: newMedication.expiry_date,
        unit_price: newMedication.unit_price,
        pharmacy_id: pharmacyId,
        metadata: newMedication.metadata || {},
      };

      // Only add optional fields if they have values (skip wholesale_price - may not exist on all dbs)
      if (newMedication.selling_price != null) insertData.selling_price = newMedication.selling_price;
      if (newMedication.manufacturing_date) insertData.manufacturing_date = newMedication.manufacturing_date;
      if (newMedication.barcode_id) insertData.barcode_id = newMedication.barcode_id;
      if (newMedication.dispensing_unit) insertData.dispensing_unit = newMedication.dispensing_unit;
      if (newMedication.is_controlled != null) insertData.is_controlled = newMedication.is_controlled;
      if (newMedication.nafdac_reg_number) insertData.nafdac_reg_number = newMedication.nafdac_reg_number;
      if (newMedication.active_ingredients) insertData.active_ingredients = newMedication.active_ingredients;

      // Try to insert first
      const result = await supabase
        .from('medications')
        .insert([insertData as any])
        .select()
        .single();

      if (result.error) throw result.error;
      
      let finalData = result.data;

      // If success and wholesale_price provided, try to update it separately (may fail if column doesn't exist)
      if (finalData && newMedication.wholesale_price != null) {
        try {
          const updateResult = await supabase
            .from('medications')
            .update({ wholesale_price: newMedication.wholesale_price } as any)
            .eq('id', finalData.id)
            .select()
            .single();
          
          if (!updateResult.error && updateResult.data) {
            finalData = updateResult.data;
          }
          // Silently ignore errors - column might not exist on external database
        } catch {
          // Silently ignore - wholesale_price column may not exist
        }
      }

      return finalData;
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
      // First verify the medication exists (use maybeSingle to avoid error on 0 rows)
      const { data: existing, error: fetchError } = await supabase
        .from('medications')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      
      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }
      
      if (!existing) {
        throw new Error('Medication not found or you do not have access to it');
      }

      // Build update object explicitly to avoid sending undefined fields
      const updateData: Record<string, any> = {};
      
      // Copy over all defined values
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const { data, error } = await supabase
        .from('medications')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to update medication');
      return data;
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
