import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Module-level cache to prevent UI flicker when components remount between routes
// (e.g. Header living inside each page).
let permissionsCache:
  | {
      userId: string;
      initialized: true;
      role: 'owner' | 'manager' | 'staff' | null;
      permissions: string[]; // stored as strings to avoid Set serialization issues
    }
  | null = null;

// Permission keys
// NOTE: We keep legacy keys (e.g. view_dashboard) to avoid breaking existing staff accounts.
export type PermissionKey =
  // Dashboard / reporting
  | 'view_dashboard'
  | 'view_reports'
  | 'view_analytics'
  | 'view_financial_data'

  // Feature access (navigation)
  | 'access_inventory'
  | 'access_customers'
  | 'access_branches'
  | 'access_suppliers'

  // Granular data access
  | 'view_own_sales'
  | 'view_all_sales'
  | 'view_cost_prices'
  | 'view_profit_margins'

  // Actions
  | 'manage_stock_transfers'

  // Admin/management (may still be restricted by role screens)
  | 'manage_staff'
  | 'manage_settings';

export const PERMISSION_KEYS: PermissionKey[] = [
  'view_dashboard',
  'view_reports',
  'view_analytics',
  'view_financial_data',
  'access_inventory',
  'access_customers',
  'access_branches',
  'access_suppliers',
  'view_own_sales',
  'view_all_sales',
  'view_cost_prices',
  'view_profit_margins',
  'manage_stock_transfers',
  'manage_staff',
  'manage_settings',
];

// Map old/new keys → current keys (backwards compatibility)
const PERMISSION_KEY_ALIASES: Record<string, PermissionKey> = {
  // Older/alternate naming we shipped briefly
  access_dashboard: 'view_dashboard',
  access_sales_history: 'view_reports',
};

export const normalizePermissionKey = (key: string): PermissionKey | null => {
  const normalized = (PERMISSION_KEY_ALIASES[key] ?? key) as PermissionKey;
  return PERMISSION_KEYS.includes(normalized) ? normalized : null;
};

// Predefined role templates
export const ROLE_TEMPLATES: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  cashier: {
    name: 'Cashier',
    description: 'POS-only access with personal transaction history',
    permissions: ['view_own_sales'],
  },
  pharmacist: {
    name: 'Pharmacist',
    description: 'Clinical access: inventory, customers, prescriptions, branches',
    permissions: [
      'view_dashboard',
      'access_inventory',
      'access_customers',
      'access_branches',
      'view_reports',
      'view_own_sales',
    ],
  },
  inventory_clerk: {
    name: 'Inventory Clerk',
    description: 'Inventory + branches, can transfer stock',
    permissions: [
      'view_dashboard',
      'access_inventory',
      'access_branches',
      'manage_stock_transfers',
      'view_own_sales',
    ],
  },
  senior_staff: {
    name: 'Senior Staff',
    description: 'Most features + reports/analytics (no billing/settings)',
    permissions: [
      'view_dashboard',
      'access_inventory',
      'access_customers',
      'access_branches',
      'access_suppliers',
      'view_reports',
      'view_analytics',
      'view_all_sales',
      'manage_stock_transfers',
    ],
  },
};

// Permission labels for UI
export const PERMISSION_LABELS: Record<PermissionKey, { label: string; description: string; category: string }> = {
  view_dashboard: {
    label: 'Access Dashboard',
    description: 'View the main dashboard overview',
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
  access_suppliers: {
    label: 'Access Suppliers',
    description: 'View supplier information',
    category: 'Navigation',
  },
  view_reports: {
    label: 'View Reports',
    description: 'Access to sales history and reports',
    category: 'Data Access',
  },
  view_analytics: {
    label: 'View Analytics',
    description: 'Access to analytics and charts',
    category: 'Data Access',
  },
  view_financial_data: {
    label: 'View Financial Data',
    description: 'Access to revenue, profit margins, and costs',
    category: 'Data Access',
  },
  view_own_sales: {
    label: 'View Own Sales',
    description: 'Can view their own transaction history',
    category: 'Data Access',
  },
  view_all_sales: {
    label: 'View All Sales',
    description: 'Can view all staff transaction history',
    category: 'Data Access',
  },
  view_cost_prices: {
    label: 'View Cost Prices',
    description: 'Can see medication cost/purchase prices',
    category: 'Data Access',
  },
  view_profit_margins: {
    label: 'View Profit Margins',
    description: 'Can see profit margin data and analytics',
    category: 'Data Access',
  },
  manage_stock_transfers: {
    label: 'Manage Stock Transfers',
    description: 'Create stock transfers between branches',
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

  const cache = user && permissionsCache?.userId === user.id ? permissionsCache : null;
  const cacheHit = Boolean(cache?.initialized);

  const [permissions, setPermissions] = useState<Set<PermissionKey>>(() => {
    if (!cacheHit) return new Set();
    return new Set(
      (cache?.permissions || [])
        .map((p) => normalizePermissionKey(p))
        .filter((p): p is PermissionKey => Boolean(p))
    );
  });
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'staff' | null>(() => {
    return cacheHit ? cache!.role : null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If we already have a warm cache for this user, avoid the loading flash.
    if (!user) return false;
    return !cacheHit;
  });

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      permissionsCache = null;
      setPermissions(new Set());
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    const hasWarmCache = Boolean(
      permissionsCache?.userId === user.id && permissionsCache.initialized
    );

    // Only show a loading state if we don't already have cached permissions.
    if (!hasWarmCache) setIsLoading(true);

    try {
      // Get user's staff record with role
      const { data: staffData, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (staffError || !staffData) {
        setPermissions(new Set());
        setUserRole(null);
        permissionsCache = {
          userId: user.id,
          initialized: true,
          role: null,
          permissions: [],
        };
        return;
      }

      const role = staffData.role as 'owner' | 'manager' | 'staff';
      setUserRole(role);

      // Owner and manager have all permissions
      if (role === 'owner' || role === 'manager') {
        const allPermissions = new Set<PermissionKey>(
          Object.keys(PERMISSION_LABELS) as PermissionKey[]
        );
        setPermissions(allPermissions);
        permissionsCache = {
          userId: user.id,
          initialized: true,
          role,
          permissions: Array.from(allPermissions),
        };
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
        permissionsCache = {
          userId: user.id,
          initialized: true,
          role,
          permissions: [],
        };
        return;
      }

      const grantedPermissions = new Set<PermissionKey>(
        (permData || [])
          .filter((p) => p.is_granted)
          .map((p) => normalizePermissionKey(p.permission_key))
          .filter((p): p is PermissionKey => Boolean(p))
      );

      setPermissions(grantedPermissions);
      permissionsCache = {
        userId: user.id,
        initialized: true,
        role,
        permissions: (permData || [])
          .filter((p) => p.is_granted)
          .map((p) => p.permission_key),
      };
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
      setPermissions(new Set());
      permissionsCache = {
        userId: user.id,
        initialized: true,
        role: null,
        permissions: [],
      };
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
