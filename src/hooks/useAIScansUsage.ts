import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from './usePharmacy';

interface AIScansUsage {
  scansUsed: number;
  scansLimit: number;
  scansRemaining: number;
  isLimitReached: boolean;
  resetAt: string | null;
}

export const useAIScansUsage = () => {
  const { pharmacyId } = usePharmacy();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-scans-usage', pharmacyId],
    queryFn: async (): Promise<AIScansUsage> => {
      if (!pharmacyId) {
        return {
          scansUsed: 0,
          scansLimit: 5,
          scansRemaining: 5,
          isLimitReached: false,
          resetAt: null,
        };
      }

      const { data: pharmacy, error } = await supabase
        .from('pharmacies')
        .select('subscription_plan, ai_scans_used_this_month, ai_scans_reset_at')
        .eq('id', pharmacyId)
        .single();

      if (error || !pharmacy) {
        console.error('Error fetching AI scans usage:', error);
        return {
          scansUsed: 0,
          scansLimit: 5,
          scansRemaining: 5,
          isLimitReached: false,
          resetAt: null,
        };
      }

      const plan = pharmacy.subscription_plan as string;
      const isLitePlan = plan === 'lite' || plan === 'starter';
      const scansLimit = isLitePlan ? 5 : 999999;
      
      // Check if we need to reset (start of new month)
      const resetAt = pharmacy.ai_scans_reset_at ? new Date(pharmacy.ai_scans_reset_at) : null;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let scansUsed = pharmacy.ai_scans_used_this_month || 0;
      
      // If reset date is before start of current month, the counter should be reset
      if (resetAt && resetAt < startOfMonth) {
        scansUsed = 0;
      }

      const scansRemaining = Math.max(0, scansLimit - scansUsed);
      const isLimitReached = isLitePlan && scansUsed >= scansLimit;

      return {
        scansUsed,
        scansLimit,
        scansRemaining,
        isLimitReached,
        resetAt: pharmacy.ai_scans_reset_at,
      };
    },
    enabled: !!pharmacyId,
    staleTime: 30000, // 30 seconds
  });

  return {
    scansUsed: data?.scansUsed ?? 0,
    scansLimit: data?.scansLimit ?? 5,
    scansRemaining: data?.scansRemaining ?? 5,
    isLimitReached: data?.isLimitReached ?? false,
    resetAt: data?.resetAt ?? null,
    isLoading,
    refetch,
  };
};
