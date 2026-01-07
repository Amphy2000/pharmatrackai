import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import type { PermissionKey } from './usePermissions';
import { normalizePermissionKey } from './usePermissions';

interface StaffMember {
  id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'staff';
  is_active: boolean;
  created_at: string;
  branch_id: string | null;
  profile?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  branch?: {
    id: string;
    name: string;
  } | null;
  permissions: PermissionKey[];
}

interface CreateStaffData {
  email: string;
  password: string;
  fullName: string;
  role: 'manager' | 'staff';
  permissions: PermissionKey[];
}

export const useStaffManagement = () => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      // Fetch staff members with branch info
      const { data: staffData, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select(`
          *,
          branches:branch_id (
            id,
            name
          )
        `)
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: true });

      if (staffError) throw staffError;

      // Fetch profiles for each staff member
      const staffWithProfiles = await Promise.all(
        (staffData || []).map(async (s) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone, avatar_url')
            .eq('user_id', s.user_id)
            .single();

          // Fetch permissions for staff members
          let permissions: PermissionKey[] = [];
          if (s.role === 'staff') {
            const { data: permData } = await supabase
              .from('staff_permissions')
              .select('permission_key')
              .eq('staff_id', s.id)
              .eq('is_granted', true);

            permissions = (permData || [])
              .map(p => normalizePermissionKey(p.permission_key))
              .filter((p): p is PermissionKey => Boolean(p));
          }

          return {
            ...s,
            profile: profileData || undefined,
            branch: s.branches || null,
            permissions,
          } as StaffMember;
        })
      );

      setStaff(staffWithProfiles);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [pharmacy?.id, toast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const updateStaffPermissions = async (staffId: string, permissions: PermissionKey[]) => {
    try {
      // Delete existing permissions
      await supabase
        .from('staff_permissions')
        .delete()
        .eq('staff_id', staffId);

      // Insert new permissions
      if (permissions.length > 0) {
        const { error } = await supabase
          .from('staff_permissions')
          .insert(
            permissions.map(perm => ({
              staff_id: staffId,
              permission_key: perm,
              is_granted: true,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Staff permissions updated',
      });

      await fetchStaff();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: 'destructive',
      });
    }
  };

  const updateStaffRole = async (staffId: string, role: 'manager' | 'staff') => {
    try {
      const { error } = await supabase
        .from('pharmacy_staff')
        .update({ role })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff role updated',
      });

      await fetchStaff();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const updateStaffBranch = async (staffId: string, branchId: string | null) => {
    try {
      const { error } = await supabase
        .from('pharmacy_staff')
        .update({ branch_id: branchId })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: branchId ? 'Staff assigned to branch' : 'Staff can access all branches',
      });

      await fetchStaff();
    } catch (error) {
      console.error('Error updating branch:', error);
      toast({
        title: 'Error',
        description: 'Failed to update branch assignment',
        variant: 'destructive',
      });
    }
  };

  const toggleStaffActive = async (staffId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('pharmacy_staff')
        .update({ is_active: isActive })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: isActive ? 'Staff member activated' : 'Staff member deactivated',
      });

      await fetchStaff();
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff status',
        variant: 'destructive',
      });
    }
  };

  return {
    staff,
    isLoading,
    refetch: fetchStaff,
    updateStaffPermissions,
    updateStaffRole,
    updateStaffBranch,
    toggleStaffActive,
  };
};
