import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePharmacy = () => {
  const { user } = useAuth();

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

  return {
    pharmacyId,
    pharmacy,
    isLoading: isLoadingPharmacy || isLoadingPharmacyDetails,
  };
};
