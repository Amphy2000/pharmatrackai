import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PharmacySettings {
  enable_logo_on_print?: boolean;
  pharmacist_in_charge?: string;
  termii_sender_id?: string;
}

export const usePharmacy = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pharmacyId, isLoading: isLoadingPharmacy } = useQuery({
    queryKey: ['user-pharmacy', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select('pharmacy_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data?.pharmacy_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: pharmacy, isLoading: isLoadingPharmacyDetails } = useQuery({
    queryKey: ['pharmacy-details', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return null;
      
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('id', pharmacyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!pharmacyId,
  });

  const updatePharmacySettings = useMutation({
    mutationFn: async (settings: PharmacySettings) => {
      if (!pharmacyId) throw new Error('No pharmacy ID');
      
      const { error } = await supabase
        .from('pharmacies')
        .update(settings)
        .eq('id', pharmacyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-details'] });
    },
  });

  return {
    pharmacyId,
    pharmacy: pharmacy as typeof pharmacy & PharmacySettings | null,
    isLoading: isLoadingPharmacy || isLoadingPharmacyDetails,
    updatePharmacySettings,
  };
};
