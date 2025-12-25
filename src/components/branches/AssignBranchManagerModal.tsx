import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserCog, Loader2, Building2, User } from 'lucide-react';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { useToast } from '@/hooks/use-toast';
import { Branch } from '@/types/branch';

interface AssignBranchManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
}

export const AssignBranchManagerModal = ({ open, onOpenChange, branch }: AssignBranchManagerModalProps) => {
  const { staff, updateStaffBranch, updateStaffRole, refetch } = useStaffManagement();
  const { toast } = useToast();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Get managers and staff who can be assigned (exclude owner)
  const eligibleStaff = staff.filter(s => s.role !== 'owner' && s.is_active);
  
  // Find current branch manager
  const currentManager = staff.find(s => s.branch_id === branch?.id && s.role === 'manager');

  // Reset selection when modal opens
  useEffect(() => {
    if (open && currentManager) {
      setSelectedStaffId(currentManager.id);
    } else if (open) {
      setSelectedStaffId('');
    }
  }, [open, currentManager]);

  const handleAssign = async () => {
    if (!branch || !selectedStaffId) return;
    
    setIsLoading(true);
    try {
      // If there was a previous manager for this branch, demote them
      if (currentManager && currentManager.id !== selectedStaffId) {
        await updateStaffBranch(currentManager.id, null);
      }

      // Assign selected staff to the branch and make them manager
      await updateStaffBranch(selectedStaffId, branch.id);
      await updateStaffRole(selectedStaffId, 'manager');
      
      toast({
        title: 'Manager Assigned',
        description: `Successfully assigned manager to ${branch.name}`,
      });

      await refetch();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning manager:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign branch manager',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveManager = async () => {
    if (!currentManager) return;
    
    setIsLoading(true);
    try {
      // Remove branch assignment and demote to staff
      await updateStaffBranch(currentManager.id, null);
      await updateStaffRole(currentManager.id, 'staff');
      
      toast({
        title: 'Manager Removed',
        description: `Removed manager from ${branch?.name}`,
      });

      await refetch();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing manager:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove branch manager',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Assign Branch Manager
          </DialogTitle>
          <DialogDescription>
            Select a staff member to manage {branch?.name}. They will have access to branch metrics, staff management, and analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Manager Display */}
          {currentManager && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <Label className="text-xs text-muted-foreground mb-2 block">Current Manager</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {currentManager.profile?.full_name?.charAt(0).toUpperCase() || 'M'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{currentManager.profile?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{currentManager.profile?.phone || 'No phone'}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">Manager</Badge>
              </div>
            </div>
          )}

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label>{currentManager ? 'Change Manager To' : 'Select Manager'}</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a staff member..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleStaff.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No eligible staff members found. Add staff members first.
                  </div>
                ) : (
                  eligibleStaff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{member.profile?.full_name || 'Unnamed'}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {member.role === 'manager' ? 'Manager' : 'Staff'}
                        </Badge>
                        {member.branch && member.branch.id !== branch?.id && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {member.branch.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The selected staff member will be promoted to Manager role and assigned to this branch.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentManager && (
            <Button 
              variant="outline" 
              onClick={handleRemoveManager}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              Remove Manager
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={isLoading || !selectedStaffId || selectedStaffId === currentManager?.id}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCog className="h-4 w-4 mr-2" />
                  Assign Manager
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
