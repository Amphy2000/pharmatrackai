import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBranches } from '@/hooks/useBranches';

interface BranchContextType {
  currentBranchId: string | null;
  setCurrentBranchId: (id: string) => void;
  currentBranchName: string;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { branches } = useBranches();
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(() => {
    return localStorage.getItem('currentBranchId');
  });

  // Set default branch on load
  useEffect(() => {
    if (branches.length > 0 && !currentBranchId) {
      const mainBranch = branches.find(b => b.is_main_branch) || branches[0];
      if (mainBranch) {
        setCurrentBranchId(mainBranch.id);
      }
    }
  }, [branches, currentBranchId]);

  // Persist to localStorage
  useEffect(() => {
    if (currentBranchId) {
      localStorage.setItem('currentBranchId', currentBranchId);
    }
  }, [currentBranchId]);

  const currentBranchName = branches.find(b => b.id === currentBranchId)?.name || 'Main Branch';

  return (
    <BranchContext.Provider value={{ currentBranchId, setCurrentBranchId, currentBranchName }}>
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
