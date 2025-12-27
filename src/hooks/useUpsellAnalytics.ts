import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from './usePharmacy';
import { startOfDay, subDays, format } from 'date-fns';

export interface UpsellAnalyticsSummary {
  totalSuggestions: number;
  totalAccepted: number;
  acceptanceRate: number;
  revenueGenerated: number;
  topProducts: Array<{
    medicationId: string;
    medicationName: string;
    timesShown: number;
    timesAccepted: number;
    acceptanceRate: number;
  }>;
  dailyStats: Array<{
    date: string;
    suggestions: number;
    accepted: number;
    rate: number;
  }>;
}

export const useUpsellAnalytics = (days: number = 30) => {
  const { pharmacy } = usePharmacy();

  return useQuery({
    queryKey: ['upsell-analytics', pharmacy?.id, days],
    queryFn: async (): Promise<UpsellAnalyticsSummary> => {
      if (!pharmacy?.id) throw new Error('No pharmacy selected');

      const startDate = subDays(new Date(), days);

      // Fetch analytics data
      const { data: analytics, error } = await supabase
        .from('upsell_analytics')
        .select(`
          id,
          suggested_medication_id,
          was_accepted,
          confidence_score,
          suggested_at,
          sale_id
        `)
        .eq('pharmacy_id', pharmacy.id)
        .gte('suggested_at', startDate.toISOString())
        .order('suggested_at', { ascending: false });

      if (error) throw error;

      // Fetch medication names
      const medicationIds = [...new Set(analytics?.map(a => a.suggested_medication_id) || [])];
      const { data: medications } = await supabase
        .from('medications')
        .select('id, name, selling_price')
        .in('id', medicationIds);

      const medicationMap = new Map<string, { id: string; name: string; selling_price: number | null }>();
      medications?.forEach(m => medicationMap.set(m.id, m));

      // Fetch sales data for accepted upsells
      const acceptedSaleIds = analytics?.filter(a => a.was_accepted && a.sale_id).map(a => a.sale_id!) || [];
      const { data: sales } = acceptedSaleIds.length > 0 
        ? await supabase
            .from('sales')
            .select('id, total_price')
            .in('id', acceptedSaleIds)
        : { data: [] };

      const salesMap = new Map<string, number>();
      sales?.forEach(s => salesMap.set(s.id, s.total_price));

      // Calculate totals
      const totalSuggestions = analytics?.length || 0;
      const totalAccepted = analytics?.filter(a => a.was_accepted).length || 0;
      const acceptanceRate = totalSuggestions > 0 ? (totalAccepted / totalSuggestions) * 100 : 0;

      // Calculate revenue from accepted upsells
      const revenueGenerated = analytics?.reduce((sum, a) => {
        if (a.was_accepted && a.sale_id && salesMap.has(a.sale_id)) {
          return sum + (salesMap.get(a.sale_id) || 0);
        }
        return sum;
      }, 0) || 0;

      // Group by medication for top products
      const productStats = new Map<string, { shown: number; accepted: number; name: string }>();
      analytics?.forEach(a => {
        const med = medicationMap.get(a.suggested_medication_id);
        const key = a.suggested_medication_id;
        const existing = productStats.get(key) || { shown: 0, accepted: 0, name: med?.name || 'Unknown' };
        existing.shown += 1;
        if (a.was_accepted) existing.accepted += 1;
        productStats.set(key, existing);
      });

      const topProducts = Array.from(productStats.entries())
        .map(([medicationId, stats]) => ({
          medicationId,
          medicationName: stats.name,
          timesShown: stats.shown,
          timesAccepted: stats.accepted,
          acceptanceRate: stats.shown > 0 ? (stats.accepted / stats.shown) * 100 : 0,
        }))
        .sort((a, b) => b.timesAccepted - a.timesAccepted)
        .slice(0, 10);

      // Group by day for daily stats
      const dailyMap = new Map<string, { suggestions: number; accepted: number }>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap.set(date, { suggestions: 0, accepted: 0 });
      }

      analytics?.forEach(a => {
        const date = format(new Date(a.suggested_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(date);
        if (existing) {
          existing.suggestions += 1;
          if (a.was_accepted) existing.accepted += 1;
        }
      });

      const dailyStats = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          suggestions: stats.suggestions,
          accepted: stats.accepted,
          rate: stats.suggestions > 0 ? (stats.accepted / stats.suggestions) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalSuggestions,
        totalAccepted,
        acceptanceRate,
        revenueGenerated,
        topProducts,
        dailyStats,
      };
    },
    enabled: !!pharmacy?.id,
  });
};

// Function to track when a suggestion is shown
export const trackUpsellSuggestion = async (
  pharmacyId: string,
  branchId: string | null,
  staffId: string | null,
  suggestedMedicationId: string,
  cartMedicationIds: string[],
  reason: string,
  confidenceScore: number
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('upsell_analytics')
    .insert({
      pharmacy_id: pharmacyId,
      branch_id: branchId,
      staff_id: staffId,
      suggested_medication_id: suggestedMedicationId,
      cart_medication_ids: cartMedicationIds,
      suggestion_reason: reason,
      confidence_score: confidenceScore,
      was_accepted: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error tracking upsell suggestion:', error);
    return null;
  }

  return data.id;
};

// Function to mark a suggestion as accepted
export const markUpsellAccepted = async (analyticsId: string, saleId?: string) => {
  const { error } = await supabase
    .from('upsell_analytics')
    .update({
      was_accepted: true,
      accepted_at: new Date().toISOString(),
      sale_id: saleId || null,
    })
    .eq('id', analyticsId);

  if (error) {
    console.error('Error marking upsell as accepted:', error);
  }
};
