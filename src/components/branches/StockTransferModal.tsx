import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StockTransferModal = ({ open, onOpenChange }: StockTransferModalProps) => {
  const { branches, branchInventory, createTransfer } = useBranches();
  const [formData, setFormData] = useState({
    from_branch_id: '',
    to_branch_id: '',
    medication_id: '',
    quantity: 1,
    notes: '',
  });

  // All active branches can be source or destination (including main branch)
  const activeBranches = branches.filter(b => b.is_active);

  // Get medications available at selected source branch
  const availableMedications = useMemo(() => {
    if (!formData.from_branch_id) return [];
    
    // Get inventory for the source branch
    const branchStock = branchInventory.filter(
      inv => inv.branch_id === formData.from_branch_id && inv.current_stock > 0
    );
    
    return branchStock.map(inv => ({
      id: inv.medication_id,
      name: inv.medications?.name || 'Unknown',
      stock: inv.current_stock,
    }));
  }, [formData.from_branch_id, branchInventory]);

  const selectedMed = availableMedications.find(m => m.id === formData.medication_id);
  const sourceBranch = activeBranches.find(b => b.id === formData.from_branch_id);
  const destBranch = activeBranches.find(b => b.id === formData.to_branch_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTransfer.mutateAsync(formData);
    onOpenChange(false);
    setFormData({ from_branch_id: '', to_branch_id: '', medication_id: '', quantity: 1, notes: '' });
  };

  const handleSourceChange = (branchId: string) => {
    setFormData({ 
      ...formData, 
      from_branch_id: branchId, 
      medication_id: '', // Reset medication when source changes
      quantity: 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Stock Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>From Branch (Source)</Label>
              <Select
                value={formData.from_branch_id}
                onValueChange={handleSourceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source branch" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches
                    .filter(b => b.id !== formData.to_branch_id)
                    .map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          {branch.name}
                          {branch.is_main_branch && (
                            <Badge variant="outline" className="text-xs">HQ</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
            <div className="flex-1 space-y-2">
              <Label>To Branch (Destination)</Label>
              <Select
                value={formData.to_branch_id}
                onValueChange={(v) => setFormData({ ...formData, to_branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches
                    .filter(b => b.id !== formData.from_branch_id)
                    .map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          {branch.name}
                          {branch.is_main_branch && (
                            <Badge variant="outline" className="text-xs">HQ</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transfer Direction Summary */}
          {sourceBranch && destBranch && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <span className="font-medium">{sourceBranch.name}</span>
              <ArrowRight className="inline h-4 w-4 mx-2 text-muted-foreground" />
              <span className="font-medium">{destBranch.name}</span>
            </div>
          )}

          {/* Medication Selection */}
          <div className="space-y-2">
            <Label>Medication</Label>
            {!formData.from_branch_id ? (
              <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Select a source branch first to see available stock
              </div>
            ) : availableMedications.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                No stock available in selected branch
              </div>
            ) : (
              <Select
                value={formData.medication_id}
                onValueChange={(v) => setFormData({ ...formData, medication_id: v, quantity: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medication to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {availableMedications.map(med => (
                    <SelectItem key={med.id} value={med.id}>
                      {med.name} ({med.stock} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Transfer</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={selectedMed?.stock || 999}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
            {selectedMed && (
              <p className="text-xs text-muted-foreground">
                Max available: {selectedMed.stock} units
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Reason for transfer..."
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              createTransfer.isPending ||
              !formData.from_branch_id ||
              !formData.to_branch_id ||
              !formData.medication_id ||
              formData.quantity < 1 ||
              (selectedMed && formData.quantity > selectedMed.stock)
            }
          >
            {createTransfer.isPending ? 'Creating...' : 'Create Transfer Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
