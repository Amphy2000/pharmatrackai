import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Available permission keys
export type PermissionKey = 
  | 'view_dashboard'
  | 'view_reports'
  | 'view_analytics'
  | 'view_financial_data'
  | 'manage_staff'
  | 'manage_settings';

// Predefined role templates
export const ROLE_TEMPLATES: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  cashier: {
    name: 'Cashier',
    description: 'POS access only, no reports or analytics',
    permissions: [],
  },
  inventory_manager: {
    name: 'Inventory Manager',
    description: 'Full inventory access, basic reports',
    permissions: ['view_dashboard', 'view_reports'],
  },
  senior_staff: {
    name: 'Senior Staff',
    description: 'Full access to all reports and analytics',
    permissions: ['view_dashboard', 'view_reports', 'view_analytics', 'view_financial_data'],
  },
  full_access: {
    name: 'Full Access',
    description: 'Same access as manager (except staff management)',
    permissions: ['view_dashboard', 'view_reports', 'view_analytics', 'view_financial_data'],
  },
};

// Permission labels for UI
export const PERMISSION_LABELS: Record<PermissionKey, { label: string; description: string }> = {
  view_dashboard: {
    label: 'View Dashboard',
    description: 'Access to main dashboard with overview metrics',
  },
  view_reports: {
    label: 'View Reports',
    description: 'Access to sales history and basic reports',
  },
  view_analytics: {
    label: 'View Analytics',
    description: 'Access to detailed analytics and charts',
  },
  view_financial_data: {
    label: 'View Financial Data',
    description: 'Access to revenue, profit, and financial summaries',
  },
  manage_staff: {
    label: 'Manage Staff',
    description: 'Add, edit, and remove staff members',
  },
  manage_settings: {
    label: 'Manage Settings',
    description: 'Access to pharmacy settings and configuration',
  },
};

interface UsePermissionsReturn {
  hasPermission: (permission: PermissionKey) => boolean;
  permissions: Set<PermissionKey>;
  isLoading: boolean;
  userRole: 'owner' | 'manager' | 'staff' | null;
  isOwnerOrManager: boolean;
  refetch: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'staff' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions(new Set());
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    try {
      // Get user's staff record with role
      const { data: staffData, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (staffError || !staffData) {
        setPermissions(new Set());
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      setUserRole(staffData.role as 'owner' | 'manager' | 'staff');

      // Owner and manager have all permissions
      if (staffData.role === 'owner' || staffData.role === 'manager') {
        const allPermissions = new Set<PermissionKey>(Object.keys(PERMISSION_LABELS) as PermissionKey[]);
        setPermissions(allPermissions);
        setIsLoading(false);
        return;
      }

      // For staff, fetch explicit permissions
      const { data: permData, error: permError } = await supabase
        .from('staff_permissions')
        .select('permission_key, is_granted')
        .eq('staff_id', staffData.id);

      if (permError) {
        console.error('Error fetching permissions:', permError);
        setPermissions(new Set());
        setIsLoading(false);
        return;
      }

      const grantedPermissions = new Set<PermissionKey>(
        (permData || [])
          .filter(p => p.is_granted)
          .map(p => p.permission_key as PermissionKey)
      );

      setPermissions(grantedPermissions);
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
      setPermissions(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    // Owner and manager always have all permissions
    if (userRole === 'owner' || userRole === 'manager') {
      return true;
    }
    return permissions.has(permission);
  }, [permissions, userRole]);

  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';

  return {
    hasPermission,
    permissions,
    isLoading,
    userRole,
    isOwnerOrManager,
    refetch: fetchPermissions,
  };
};
