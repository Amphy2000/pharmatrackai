import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useMedications } from '@/hooks/useMedications';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowLeftRight, AlertTriangle, Package, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AvailableMedication {
  id: string;
  name: string;
  stock: number;
  category: string;
}

export const StockTransferModal = ({ open, onOpenChange }: StockTransferModalProps) => {
  const { branches, createTransfer } = useBranches();
  const { pharmacyId } = usePharmacy();
  const { medications: allMedications } = useMedications();
  
  const [formData, setFormData] = useState({
    from_branch_id: '',
    to_branch_id: '',
    medication_id: '',
    quantity: 1,
    notes: '',
  });

  // All active branches can be source or destination (including main branch)
  const activeBranches = branches.filter(b => b.is_active);

  // Fetch branch inventory for all branches
  const { data: branchInventoryData = [] } = useQuery({
    queryKey: ['all-branch-inventory-for-transfer', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const branchIds = activeBranches.filter(b => !b.is_main_branch).map(b => b.id);
      if (branchIds.length === 0) return [];
      const { data, error } = await supabase
        .from('branch_inventory')
        .select('*')
        .in('branch_id', branchIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId && activeBranches.length > 0,
  });

  // Get medications available at selected source branch
  const availableMedications: AvailableMedication[] = useMemo(() => {
    if (!formData.from_branch_id) return [];
    
    const sourceBranch = activeBranches.find(b => b.id === formData.from_branch_id);
    
    if (sourceBranch?.is_main_branch) {
      // Main branch uses medications table current_stock
      return allMedications
        .filter(m => m.current_stock > 0)
        .map(m => ({
          id: m.id,
          name: m.name,
          stock: m.current_stock,
          category: m.category,
        }));
    } else {
      // Other branches use branch_inventory
      const branchStock = branchInventoryData.filter(
        inv => inv.branch_id === formData.from_branch_id && inv.current_stock > 0
      );
      
      return branchStock.map(inv => {
        const med = allMedications.find(m => m.id === inv.medication_id);
        return {
          id: inv.medication_id,
          name: med?.name || 'Unknown',
          stock: inv.current_stock,
          category: med?.category || 'Unknown',
        };
      });
    }
  }, [formData.from_branch_id, branchInventoryData, allMedications, activeBranches]);

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

  const swapBranches = () => {
    if (formData.from_branch_id && formData.to_branch_id) {
      setFormData({
        ...formData,
        from_branch_id: formData.to_branch_id,
        to_branch_id: formData.from_branch_id,
        medication_id: '', // Reset medication when swapping
        quantity: 1,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer stock between branches. Select source and destination.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <form onSubmit={handleSubmit} className="space-y-5 pb-4">
            {/* Branch Selection - Horizontal with Swap Button */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Transfer Direction</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs text-muted-foreground">From (Source)</span>
                  <Select
                    value={formData.from_branch_id}
                    onValueChange={handleSourceChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select source">
                        {sourceBranch && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate">{sourceBranch.name}</span>
                            {sourceBranch.is_main_branch && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">HQ</Badge>
                            )}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {activeBranches
                        .filter(b => b.id !== formData.to_branch_id)
                        .map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5" />
                              {branch.name}
                              {branch.is_main_branch && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">HQ</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-5 h-9 w-9 shrink-0"
                  onClick={swapBranches}
                  disabled={!formData.from_branch_id || !formData.to_branch_id}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs text-muted-foreground">To (Destination)</span>
                  <Select
                    value={formData.to_branch_id}
                    onValueChange={(v) => setFormData({ ...formData, to_branch_id: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select destination">
                        {destBranch && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate">{destBranch.name}</span>
                            {destBranch.is_main_branch && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">HQ</Badge>
                            )}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {activeBranches
                        .filter(b => b.id !== formData.from_branch_id)
                        .map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5" />
                              {branch.name}
                              {branch.is_main_branch && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">HQ</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Transfer Summary Pill */}
            {sourceBranch && destBranch && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-primary/10 border border-primary/20 text-sm">
                <span className="font-medium">{sourceBranch.name}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium">{destBranch.name}</span>
              </div>
            )}

            {/* Medication Selection */}
            <div className="space-y-2">
              <Label>Select Medication</Label>
              {!formData.from_branch_id ? (
                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-xl flex items-center gap-3 bg-muted/30">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>Select a source branch first to see available stock</span>
                </div>
              ) : availableMedications.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-xl flex items-center gap-3 bg-muted/30">
                  <Package className="h-5 w-5 shrink-0" />
                  <span>No stock available at {sourceBranch?.name}</span>
                </div>
              ) : (
                <Select
                  value={formData.medication_id}
                  onValueChange={(v) => setFormData({ ...formData, medication_id: v, quantity: 1 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose medication to transfer" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="max-h-[200px]">
                      {availableMedications.map(med => (
                        <SelectItem key={med.id} value={med.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="truncate">{med.name}</span>
                            <Badge variant="secondary" className="shrink-0">
                              {med.stock} available
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Transfer</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={selectedMed?.stock || 999}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="flex-1"
                />
                {selectedMed && (
                  <Badge variant="outline" className="shrink-0">
                    Max: {selectedMed.stock}
                  </Badge>
                )}
              </div>
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
                className="resize-none"
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
              {createTransfer.isPending ? 'Creating Transfer...' : 'Create Transfer Request'}
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
