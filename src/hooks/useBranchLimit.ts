import { useMemo } from 'react';
import { usePharmacy } from './usePharmacy';
import { useBranches } from './useBranches';

export interface BranchLimitInfo {
  activeBranchesLimit: number;
  currentBranchCount: number;
  canAddBranch: boolean;
  isAtLimit: boolean;
  remainingSlots: number;
  branchFeePerMonth: number;
}

export const useBranchLimit = () => {
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { branches, isLoading: branchesLoading } = useBranches();

  const limitInfo = useMemo((): BranchLimitInfo => {
    const activeBranchesLimit = pharmacy?.active_branches_limit ?? 1;
    const branchFeePerMonth = pharmacy?.branch_fee_per_month ?? 15000;
    
    // Count active branches
    const activeBranches = branches?.filter(b => b.is_active) || [];
    const currentBranchCount = activeBranches.length;
    
    const canAddBranch = currentBranchCount < activeBranchesLimit;
    const isAtLimit = currentBranchCount >= activeBranchesLimit;
    const remainingSlots = Math.max(0, activeBranchesLimit - currentBranchCount);

    return {
      activeBranchesLimit,
      currentBranchCount,
      canAddBranch,
      isAtLimit,
      remainingSlots,
      branchFeePerMonth,
    };
  }, [pharmacy, branches]);

  // Check if a specific branch is within the paid limit
  const isBranchWithinLimit = (branchId: string): boolean => {
    if (!branches || branches.length === 0) return true;
    
    const activeBranchesLimit = pharmacy?.active_branches_limit ?? 1;
    const activeBranches = branches
      .filter(b => b.is_active)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const branchIndex = activeBranches.findIndex(b => b.id === branchId);
    if (branchIndex === -1) return true; // Branch not found, assume ok
    
    // Branch position is 1-indexed
    return (branchIndex + 1) <= activeBranchesLimit;
  };

  // Get branch position (1-indexed)
  const getBranchPosition = (branchId: string): number => {
    if (!branches || branches.length === 0) return 1;
    
    const activeBranches = branches
      .filter(b => b.is_active)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const branchIndex = activeBranches.findIndex(b => b.id === branchId);
    return branchIndex === -1 ? 1 : branchIndex + 1;
  };

  return {
    ...limitInfo,
    isBranchWithinLimit,
    getBranchPosition,
    isLoading: pharmacyLoading || branchesLoading,
  };
};
