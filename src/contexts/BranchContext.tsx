import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  const isManager = userRole === 'manager';
  const isOwner = userRole === 'owner';
  
  // Only owners can switch branches. Managers and staff are locked to their assigned branch.
  const canSwitchBranch = isOwner;

  // Auto-route non-owners to their assigned branch on mount
  useEffect(() => {
    if (branches.length === 0) return;
    
    // If user has an assigned branch and they're not the owner, lock them to it
    if (userAssignedBranchId && !isOwner) {
      setCurrentBranchIdState(userAssignedBranchId);
      localStorage.setItem('currentBranchId', userAssignedBranchId);
      return;
    }
    
    // Owners (or users without an assigned branch) use stored or default to main
    if (!currentBranchId || !branches.find(b => b.id === currentBranchId)) {
      const mainBranch = branches.find(b => b.is_main_branch) || branches[0];
      if (mainBranch) {
        setCurrentBranchIdState(mainBranch.id);
        localStorage.setItem('currentBranchId', mainBranch.id);
      }
    }
  }, [branches, userAssignedBranchId, isOwner, currentBranchId]);

  // Clear cart when branch changes (for owners switching branches) - prevents cross-branch cart leakage
  const prevBranchIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevBranchIdRef.current && prevBranchIdRef.current !== currentBranchId) {
      // Branch changed - clear cart to prevent cross-branch cart leakage
      localStorage.removeItem('pharmatrack_cart');
      console.log('Cart cleared due to branch switch');
    }
    prevBranchIdRef.current = currentBranchId;
  }, [currentBranchId]);

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
  
  // Consider it "main branch" if no branch is selected OR if the selected branch is explicitly marked as main
  // This ensures backward compatibility with pharmacies that haven't set up branches yet
  const isMainBranch = !currentBranchId || currentBranch?.is_main_branch || branches.length === 0;

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
