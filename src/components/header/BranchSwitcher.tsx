import { useState } from 'react';
import { Building2, ChevronDown, Check, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBranches } from '@/hooks/useBranches';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useBranchContext } from '@/contexts/BranchContext';
import { useNavigate } from 'react-router-dom';

interface BranchSwitcherProps {
  currentBranchId: string | null;
  onBranchChange: (branchId: string) => void;
}

export const BranchSwitcher = ({ currentBranchId, onBranchChange }: BranchSwitcherProps) => {
  const navigate = useNavigate();
  const { branches, isLoading } = useBranches();
  const { canAddBranches, plan } = usePlanLimits();
  const { canSwitchBranch, userAssignedBranchId } = useBranchContext();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Only show for Pro/Enterprise plans
  if (plan === 'starter') {
    return null;
  }

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches.find(b => b.is_main_branch) || branches[0];

  if (isLoading || branches.length === 0) {
    return null;
  }

  // If user cannot switch branches (cashiers), just show current branch name without dropdown
  if (!canSwitchBranch) {
    return (
      <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-muted/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium max-w-[120px] truncate">
          {currentBranch?.name || 'Main Branch'}
        </span>
        <Lock className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  const handleAddBranch = () => {
    if (!canAddBranches) {
      setShowUpgradeModal(true);
    } else {
      navigate('/branches');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-9 gap-2 px-3 rounded-lg hover:bg-muted/50"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">
              {currentBranch?.name || 'Main Branch'}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => onBranchChange(branch.id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{branch.name}</span>
              {branch.id === currentBranch?.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddBranch}>
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Multi-Branch Support
            </DialogTitle>
            <DialogDescription>
              Multi-branch support is a Pro feature. Upgrade now to manage all your locations from one login.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Pro Plan Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage up to 10 branches</li>
                <li>• Up to 5 staff accounts</li>
                <li>• AI Expiry Insights</li>
                <li>• Advanced Analytics</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => navigate('/settings?tab=subscription')}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
