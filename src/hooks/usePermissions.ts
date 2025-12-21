import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Available permission keys - organized by feature area
export type PermissionKey = 
  // Navigation access
  | 'access_dashboard'
  | 'access_inventory'
  | 'access_customers'
  | 'access_branches'
  | 'access_sales_history'
  | 'access_suppliers'
  // Data visibility
  | 'view_reports'
  | 'view_analytics'
  | 'view_financial_data'
  // Management
  | 'manage_stock_transfers'
  | 'manage_staff'
  | 'manage_settings';

// Predefined role templates
export const ROLE_TEMPLATES: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  cashier: {
    name: 'Cashier',
    description: 'POS access only, no reports or analytics',
    permissions: [],
  },
  inventory_clerk: {
    name: 'Inventory Clerk',
    description: 'POS + Inventory management, can transfer stock between branches',
    permissions: ['access_inventory', 'access_branches', 'manage_stock_transfers'],
  },
  senior_staff: {
    name: 'Senior Staff',
    description: 'Full access to most features, can view reports and analytics',
    permissions: [
      'access_dashboard', 'access_inventory', 'access_customers', 
      'access_branches', 'access_sales_history', 'view_reports', 
      'view_analytics', 'manage_stock_transfers'
    ],
  },
  full_access: {
    name: 'Full Access',
    description: 'Same access as manager (except staff management & settings)',
    permissions: [
      'access_dashboard', 'access_inventory', 'access_customers', 
      'access_branches', 'access_sales_history', 'access_suppliers',
      'view_reports', 'view_analytics', 'view_financial_data', 
      'manage_stock_transfers'
    ],
  },
};

// Permission labels for UI
export const PERMISSION_LABELS: Record<PermissionKey, { label: string; description: string; category: string }> = {
  access_dashboard: {
    label: 'Access Dashboard',
    description: 'View main dashboard with overview metrics',
    category: 'Navigation',
  },
  access_inventory: {
    label: 'Access Inventory',
    description: 'View and manage medication inventory',
    category: 'Navigation',
  },
  access_customers: {
    label: 'Access Customers',
    description: 'View and manage customer records',
    category: 'Navigation',
  },
  access_branches: {
    label: 'Access Branches',
    description: 'View branches and request stock transfers',
    category: 'Navigation',
  },
  access_sales_history: {
    label: 'Access Sales History',
    description: 'View sales history and transactions',
    category: 'Navigation',
  },
  access_suppliers: {
    label: 'Access Suppliers',
    description: 'View and manage supplier information',
    category: 'Navigation',
  },
  view_reports: {
    label: 'View Reports',
    description: 'Access to sales reports and summaries',
    category: 'Data Access',
  },
  view_analytics: {
    label: 'View Analytics',
    description: 'Access to detailed analytics and charts',
    category: 'Data Access',
  },
  view_financial_data: {
    label: 'View Financial Data',
    description: 'Access to revenue, profit margins, and costs',
    category: 'Data Access',
  },
  manage_stock_transfers: {
    label: 'Manage Stock Transfers',
    description: 'Create and approve stock transfers between branches',
    category: 'Management',
  },
  manage_staff: {
    label: 'Manage Staff',
    description: 'Add, edit, and remove staff members',
    category: 'Management',
  },
  manage_settings: {
    label: 'Manage Settings',
    description: 'Access to pharmacy settings and configuration',
    category: 'Management',
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
