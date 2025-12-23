import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Doctor {
  id: string;
  pharmacy_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  hospital_clinic: string | null;
  specialty: string | null;
  license_number: string | null;
  address: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorFormData {
  full_name: string;
  phone?: string;
  email?: string;
  hospital_clinic?: string;
  specialty?: string;
  license_number?: string;
  address?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export const useDoctors = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: doctors, isLoading, error } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as Doctor[];
    },
  });

  const addDoctor = useMutation({
    mutationFn: async (doctor: DoctorFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: staffData, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select('pharmacy_id')
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (staffError) throw staffError;
      if (!staffData) throw new Error('No pharmacy found');

      const { data, error } = await supabase
        .from('doctors')
        .insert({
          ...doctor,
          pharmacy_id: staffData.pharmacy_id,
          metadata: doctor.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (error) => {
      toast({
        title: 'Error adding doctor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateDoctor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Doctor> & { id: string }) => {
      const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating doctor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDoctor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast({
        title: 'Doctor removed',
        description: 'Doctor has been removed from the directory.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing doctor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    doctors: doctors || [],
    isLoading,
    error,
    addDoctor,
    updateDoctor,
    deleteDoctor,
  };
};
