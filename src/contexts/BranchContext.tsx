import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface BranchContextType {
  currentBranchId: string | null;
  setCurrentBranchId: (id: string) => void;
  currentBranchName: string;
  isMainBranch: boolean;
  canSwitchBranch: boolean;
  userAssignedBranchId: string | null;
  isLoadingBranchAccess: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { branches } = useBranches();
  const { userRole } = usePermissions();
  const { user } = useAuth();
  
  const [currentBranchId, setCurrentBranchIdState] = useState<string | null>(() => {
    return localStorage.getItem('currentBranchId');
  });

  // Fetch user's assigned branch from pharmacy_staff
  const { data: staffRecord, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff-branch-assignment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select('branch_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const userAssignedBranchId = staffRecord?.branch_id || null;
  const isCashier = userRole === 'staff'; // Cashiers are 'staff' role
  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';
  
  // Cashiers cannot switch branches - they're locked to their assigned branch
  const canSwitchBranch = isOwnerOrManager;

  // Auto-route staff to their assigned branch on mount
  useEffect(() => {
    if (branches.length === 0) return;
    
    // If staff has an assigned branch and they're not owner/manager, lock them to it
    if (userAssignedBranchId && !isOwnerOrManager) {
      setCurrentBranchIdState(userAssignedBranchId);
      localStorage.setItem('currentBranchId', userAssignedBranchId);
      return;
    }
    
    // For owners/managers or staff without assigned branch, use stored or default to main
    if (!currentBranchId || !branches.find(b => b.id === currentBranchId)) {
      const mainBranch = branches.find(b => b.is_main_branch) || branches[0];
      if (mainBranch) {
        setCurrentBranchIdState(mainBranch.id);
        localStorage.setItem('currentBranchId', mainBranch.id);
      }
    }
  }, [branches, userAssignedBranchId, isOwnerOrManager, currentBranchId]);

  // Custom setter that respects role restrictions
  const setCurrentBranchId = (id: string) => {
    // Cashiers cannot switch branches
    if (!canSwitchBranch && userAssignedBranchId && id !== userAssignedBranchId) {
      return;
    }
    setCurrentBranchIdState(id);
    localStorage.setItem('currentBranchId', id);
  };

  const currentBranch = branches.find(b => b.id === currentBranchId);
  const currentBranchName = currentBranch?.name || 'Main Branch';
  const isMainBranch = currentBranch?.is_main_branch || false;

  return (
    <BranchContext.Provider value={{ 
      currentBranchId, 
      setCurrentBranchId, 
      currentBranchName,
      isMainBranch,
      canSwitchBranch,
      userAssignedBranchId,
      isLoadingBranchAccess: isLoadingStaff,
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};
