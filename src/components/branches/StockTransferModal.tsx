import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowRight, 
  ArrowLeftRight, 
  Package, 
  Building2, 
  Search,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const { pharmacyId, pharmacy } = usePharmacy();
  const { medications: allMedications } = useMedications();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    from_branch_id: '',
    to_branch_id: '',
    medication_id: '',
    quantity: 1,
    notes: '',
  });
  const [medicationSearch, setMedicationSearch] = useState('');

  // Get or create the main branch (HQ)
  const { data: mainBranch } = useQuery({
    queryKey: ['main-branch', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return null;
      
      const { data: existing, error: fetchError } = await supabase
        .from('branches')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_main_branch', true)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      if (existing) return existing;
      
      const { data: newMain, error: createError } = await supabase
        .from('branches')
        .insert({
          pharmacy_id: pharmacyId,
          name: pharmacy?.name ? `${pharmacy.name} (HQ)` : 'Main Warehouse (HQ)',
          is_main_branch: true,
          is_active: true,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      queryClient.invalidateQueries({ queryKey: ['branches', pharmacyId] });
      return newMain;
    },
    enabled: !!pharmacyId && open,
  });

  // All active branches
  const activeBranches = useMemo(() => {
    const active = branches.filter(b => b.is_active);
    if (mainBranch && !active.find(b => b.id === mainBranch.id)) {
      return [mainBranch as any, ...active];
    }
    return active;
  }, [branches, mainBranch]);

  // Fetch branch inventory for all non-main branches
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
    const isMainBranchSource = sourceBranch?.is_main_branch;
    
    if (isMainBranchSource) {
      return allMedications
        .filter(m => m.current_stock > 0)
        .map(m => ({
          id: m.id,
          name: m.name,
          stock: m.current_stock,
          category: m.category,
        }));
    } else {
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

  // Filter medications by search
  const filteredMedications = useMemo(() => {
    if (!medicationSearch.trim()) return availableMedications;
    const search = medicationSearch.toLowerCase();
    return availableMedications.filter(
      m => m.name.toLowerCase().includes(search) || m.category.toLowerCase().includes(search)
    );
  }, [availableMedications, medicationSearch]);

  const selectedMed = availableMedications.find(m => m.id === formData.medication_id);
  const sourceBranch = activeBranches.find(b => b.id === formData.from_branch_id);
  const destBranch = activeBranches.find(b => b.id === formData.to_branch_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTransfer.mutateAsync(formData);
    onOpenChange(false);
    setFormData({ from_branch_id: '', to_branch_id: '', medication_id: '', quantity: 1, notes: '' });
    setMedicationSearch('');
  };

  const handleSourceChange = (branchId: string) => {
    setFormData({ 
      ...formData, 
      from_branch_id: branchId, 
      medication_id: '',
      quantity: 1,
    });
    setMedicationSearch('');
  };

  const swapBranches = () => {
    if (formData.from_branch_id && formData.to_branch_id) {
      setFormData({
        ...formData,
        from_branch_id: formData.to_branch_id,
        to_branch_id: formData.from_branch_id,
        medication_id: '',
        quantity: 1,
      });
      setMedicationSearch('');
    }
  };

  const isFormValid = 
    formData.from_branch_id && 
    formData.to_branch_id && 
    formData.medication_id && 
    formData.quantity >= 1 && 
    (!selectedMed || formData.quantity <= selectedMed.stock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-5 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-lg">Stock Transfer</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Move inventory between locations
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Branch Selection - Compact Dropdowns */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Select value={formData.from_branch_id} onValueChange={handleSourceChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select source">
                      {sourceBranch && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{sourceBranch.name}</span>
                          {sourceBranch.is_main_branch && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-auto">HQ</Badge>
                          )}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {activeBranches.filter(b => b.id !== formData.to_branch_id).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{branch.name}</span>
                          {branch.is_main_branch && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">HQ</Badge>
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
                className="h-10 w-10 shrink-0"
                onClick={swapBranches}
                disabled={!formData.from_branch_id || !formData.to_branch_id}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>

              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Select 
                  value={formData.to_branch_id} 
                  onValueChange={(v) => setFormData({ ...formData, to_branch_id: v })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select destination">
                      {destBranch && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{destBranch.name}</span>
                          {destBranch.is_main_branch && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-auto">HQ</Badge>
                          )}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {activeBranches.filter(b => b.id !== formData.from_branch_id).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{branch.name}</span>
                          {branch.is_main_branch && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">HQ</Badge>
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
              <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium truncate">{sourceBranch.name}</span>
                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{destBranch.name}</span>
              </div>
            )}

            {/* Medication Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Medication</Label>
              
              {!formData.from_branch_id ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">Select a source branch first</p>
                </div>
              ) : availableMedications.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">No stock at {sourceBranch?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medications..."
                      value={medicationSearch}
                      onChange={(e) => setMedicationSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  
                  <ScrollArea className="h-[140px] rounded-lg border bg-card">
                    <div className="p-1">
                      {filteredMedications.length === 0 ? (
                        <p className="text-center py-4 text-sm text-muted-foreground">No results</p>
                      ) : (
                        filteredMedications.map(med => (
                          <button
                            key={med.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, medication_id: med.id, quantity: 1 })}
                            className={cn(
                              "w-full p-2.5 rounded-md text-left transition-colors",
                              "hover:bg-muted/80",
                              formData.medication_id === med.id && "bg-primary/10 ring-1 ring-primary"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Package className={cn(
                                  "h-4 w-4 shrink-0",
                                  formData.medication_id === med.id ? "text-primary" : "text-muted-foreground"
                                )} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{med.name}</p>
                                  <p className="text-xs text-muted-foreground">{med.category}</p>
                                </div>
                              </div>
                              <Badge variant={med.stock > 10 ? "secondary" : "destructive"} className="shrink-0 text-xs">
                                {med.stock}
                              </Badge>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Quantity & Notes */}
            {selectedMed && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={selectedMed.stock}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="h-9"
                    />
                    <Badge variant="outline" className="shrink-0 text-xs">
                      /{selectedMed.stock}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional..."
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 pt-4 border-t bg-muted/30 shrink-0">
            <Button type="submit" className="w-full" disabled={!isFormValid || createTransfer.isPending}>
              {createTransfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Create Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
