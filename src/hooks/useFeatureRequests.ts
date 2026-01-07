import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface FeatureRequest {
  id: string;
  pharmacy_id: string;
  requested_by: string | null;
  field_name: string;
  field_value: string | null;
  entity_type: string;
  entity_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useFeatureRequests = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: featureRequests, isLoading, error } = useQuery({
    queryKey: ['feature-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FeatureRequest[];
    },
  });

  const createFeatureRequest = useMutation({
    mutationFn: async (request: {
      field_name: string;
      field_value?: string;
      entity_type: string;
      entity_id?: string;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: staffRows, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select('pharmacy_id')
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (staffError) throw staffError;
      const pharmacyId = staffRows?.[0]?.pharmacy_id;
      if (!pharmacyId) throw new Error('No pharmacy found');

      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          ...request,
          pharmacy_id: pharmacyId,
          requested_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast({
        title: 'Feature request submitted',
        description: 'Your request has been sent to the admin team.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error submitting request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateFeatureRequest = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeatureRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('feature_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pendingCount = featureRequests?.filter(r => r.status === 'pending').length || 0;

  return {
    featureRequests: featureRequests || [],
    pendingCount,
    isLoading,
    error,
    createFeatureRequest,
    updateFeatureRequest,
  };
};
