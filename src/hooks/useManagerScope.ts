import { useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';

interface ManagerScope {
  // The branch this manager is assigned to (null = owner, has all access)
  assignedBranchId: string | null;
  assignedBranchName: string | null;
  
  // Permission checks
  isOwner: boolean;
  isManager: boolean;
  isBranchManager: boolean;
  
  // Staff management powers
  canCreateStaff: boolean;
  canAssignRoles: boolean;
  canResetPasswords: boolean;
  canDeactivateStaff: (staffRole: string, staffBranchId: string | null) => boolean;
  canManageStaff: (staffBranchId: string | null) => boolean;
  canPromoteToRole: (role: string) => boolean;
  
  // Data access scope
  canAccessBranch: (branchId: string | null) => boolean;
  
  isLoading: boolean;
}

export const useManagerScope = (): ManagerScope => {
  const { user } = useAuth();
  const { pharmacy } = usePharmacy();
  const { userRole, isLoading: permissionsLoading } = usePermissions();
  
  // Fetch the current user's staff record to get their assigned branch
  const { data: staffRecord, isLoading: staffLoading } = useQuery({
    queryKey: ['current-staff-record', user?.id, pharmacy?.id],
    queryFn: async () => {
      if (!user?.id || !pharmacy?.id) return null;
      
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select(`
          id,
          role,
          branch_id,
          branches:branch_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('pharmacy_id', pharmacy.id)
        .eq('is_active', true)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id && !!pharmacy?.id,
  });
  
  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager';
  const assignedBranchId = staffRecord?.branch_id || null;
  const assignedBranchName = (staffRecord?.branches as any)?.name || null;
  
  // A branch manager is a manager assigned to a specific branch
  const isBranchManager = isManager && !!assignedBranchId;
  
  // Owner can create any staff, managers can only create junior staff
  const canCreateStaff = isOwner || isManager;
  
  // Owner can assign any role, managers can only assign junior roles
  const canAssignRoles = isOwner || isManager;
  
  // Both owners and managers can reset passwords for staff they manage
  const canResetPasswords = isOwner || isManager;
  
  // Check if can manage a specific staff member based on their branch
  const canManageStaff = useMemo(() => {
    return (staffBranchId: string | null): boolean => {
      // Owners can manage all staff
      if (isOwner) return true;
      
      // Managers can only manage staff in their assigned branch
      if (isManager) {
        // Manager with no branch assignment can manage all (legacy support)
        if (!assignedBranchId) return true;
        
        // Manager with branch assignment can only manage staff in their branch
        // Staff with null branch_id are considered "all branches" - managers can't manage them
        if (!staffBranchId) return false;
        
        return staffBranchId === assignedBranchId;
      }
      
      return false;
    };
  }, [isOwner, isManager, assignedBranchId]);
  
  // Check if can deactivate a specific staff member
  const canDeactivateStaff = useMemo(() => {
    return (staffRole: string, staffBranchId: string | null): boolean => {
      // Only owners can deactivate managers
      if (staffRole === 'manager') {
        return isOwner;
      }
      
      // Only owners can deactivate other owners (edge case)
      if (staffRole === 'owner') {
        return false; // Nobody can deactivate owners
      }
      
      // For staff, check branch scope
      return canManageStaff(staffBranchId);
    };
  }, [isOwner, canManageStaff]);
  
  // Check if can promote to a specific role
  const canPromoteToRole = useMemo(() => {
    return (role: string): boolean => {
      // Owners can promote to any role
      if (isOwner) return true;
      
      // Managers cannot create managers or owners
      if (isManager) {
        return role === 'staff';
      }
      
      return false;
    };
  }, [isOwner, isManager]);
  
  // Check if can access data from a specific branch
  const canAccessBranch = useMemo(() => {
    return (branchId: string | null): boolean => {
      // Owners can access all branches
      if (isOwner) return true;
      
      // Managers with no assigned branch can access all (legacy)
      if (isManager && !assignedBranchId) return true;
      
      // Managers with assigned branch can only access their branch
      if (isManager && assignedBranchId) {
        // null branchId means "main branch" or "all" - managers can see main if they're assigned to it
        return branchId === assignedBranchId || branchId === null;
      }
      
      return false;
    };
  }, [isOwner, isManager, assignedBranchId]);
  
  return {
    assignedBranchId,
    assignedBranchName,
    isOwner,
    isManager,
    isBranchManager,
    canCreateStaff,
    canAssignRoles,
    canResetPasswords,
    canDeactivateStaff,
    canManageStaff,
    canPromoteToRole,
    canAccessBranch,
    isLoading: permissionsLoading || staffLoading,
  };
};
