import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';

export interface StaffShift {
  id: string;
  pharmacy_id: string;
  staff_id: string;
  clock_in: string;
  clock_out: string | null;
  total_sales: number;
  total_transactions: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    user_id: string;
    role: 'owner' | 'manager' | 'staff';
    profile?: {
      full_name: string | null;
    };
  };
}

export const useShifts = () => {
  const { user } = useAuth();
  const { pharmacyId } = usePharmacy();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current staff record
  const { data: staffRecord } = useQuery({
    queryKey: ['staff-record', user?.id, pharmacyId],
    queryFn: async () => {
      if (!user?.id || !pharmacyId) return null;
      
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!pharmacyId,
  });

  // Get current active shift for the logged-in user
  const { data: activeShift, isLoading: isLoadingActiveShift } = useQuery({
    queryKey: ['active-shift', staffRecord?.id],
    queryFn: async () => {
      if (!staffRecord?.id) return null;
      
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('staff_id', staffRecord.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as StaffShift | null;
    },
    enabled: !!staffRecord?.id,
  });

  // Get all shifts for the pharmacy (managers only)
  const { data: allShifts = [], isLoading: isLoadingAllShifts } = useQuery({
    queryKey: ['all-shifts', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      const { data, error } = await supabase
        .from('staff_shifts')
        .select(`
          *,
          staff:pharmacy_staff(
            id,
            user_id,
            role,
            profile:profiles(full_name)
          )
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('clock_in', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Transform the nested profile data
      return (data || []).map(shift => ({
        ...shift,
        staff: shift.staff ? {
          ...shift.staff,
          profile: Array.isArray(shift.staff.profile) 
            ? shift.staff.profile[0] 
            : shift.staff.profile
        } : null
      })) as StaffShift[];
    },
    enabled: !!pharmacyId,
  });

  // Real-time subscription for shifts
  useEffect(() => {
    if (!pharmacyId) return;

    const channel = supabase
      .channel('shifts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_shifts',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-shifts', pharmacyId] });
          queryClient.invalidateQueries({ queryKey: ['active-shift'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacyId, queryClient]);

  // Clock in mutation
  const clockIn = useMutation({
    mutationFn: async (notes?: string) => {
      if (!staffRecord?.id || !pharmacyId) {
        throw new Error('No staff record found');
      }

      const { data, error } = await supabase
        .from('staff_shifts')
        .insert({
          pharmacy_id: pharmacyId,
          staff_id: staffRecord.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['all-shifts'] });
      toast({
        title: 'Clocked In',
        description: 'Your shift has started. Good luck!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Clock In Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clock out mutation
  const clockOut = useMutation({
    mutationFn: async (shiftId: string) => {
      const { data, error } = await supabase
        .from('staff_shifts')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', shiftId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['all-shifts'] });
      toast({
        title: 'Clocked Out',
        description: 'Your shift has ended. Great work!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Clock Out Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update shift stats (called when a sale is made)
  const updateShiftStats = useMutation({
    mutationFn: async ({ shiftId, saleAmount }: { shiftId: string; saleAmount: number }) => {
      // First get current stats
      const { data: currentShift, error: fetchError } = await supabase
        .from('staff_shifts')
        .select('total_sales, total_transactions')
        .eq('id', shiftId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('staff_shifts')
        .update({
          total_sales: (currentShift?.total_sales || 0) + saleAmount,
          total_transactions: (currentShift?.total_transactions || 0) + 1,
        })
        .eq('id', shiftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['all-shifts'] });
    },
  });

  return {
    staffRecord,
    activeShift,
    allShifts,
    isLoadingActiveShift,
    isLoadingAllShifts,
    clockIn,
    clockOut,
    updateShiftStats,
  };
};
