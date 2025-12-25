import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const { data: mainBranch, isLoading: isLoadingMainBranch } = useQuery({
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
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>Stock Transfer</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Move inventory between locations
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-6">
            {/* Branch Selection Cards */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
              {/* Source Branch */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Source Branch
                </Label>
                <div className="space-y-2">
                  {activeBranches
                    .filter(b => b.id !== formData.to_branch_id)
                    .map(branch => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => handleSourceChange(branch.id)}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 text-left transition-all duration-200",
                          "hover:border-primary/50 hover:bg-primary/5",
                          formData.from_branch_id === branch.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            formData.from_branch_id === branch.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate text-sm">{branch.name}</span>
                              {branch.is_main_branch && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                  HQ
                                </Badge>
                              )}
                            </div>
                          </div>
                          {formData.from_branch_id === branch.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Swap Button */}
              <div className="pb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-2 hover:border-primary hover:bg-primary/10"
                  onClick={swapBranches}
                  disabled={!formData.from_branch_id || !formData.to_branch_id}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Destination Branch */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Destination Branch
                </Label>
                <div className="space-y-2">
                  {activeBranches
                    .filter(b => b.id !== formData.from_branch_id)
                    .map(branch => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, to_branch_id: branch.id })}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 text-left transition-all duration-200",
                          "hover:border-primary/50 hover:bg-primary/5",
                          formData.to_branch_id === branch.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            formData.to_branch_id === branch.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate text-sm">{branch.name}</span>
                              {branch.is_main_branch && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                  HQ
                                </Badge>
                              )}
                            </div>
                          </div>
                          {formData.to_branch_id === branch.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Transfer Direction Summary */}
            {sourceBranch && destBranch && (
              <div className="flex items-center justify-center gap-4 py-3 px-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{sourceBranch.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-px w-6 bg-primary/40" />
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <div className="h-px w-6 bg-primary/40" />
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{destBranch.name}</span>
                </div>
              </div>
            )}

            {/* Medication Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Select Medication
              </Label>
              
              {!formData.from_branch_id ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-dashed">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a source branch to view available stock
                  </p>
                </div>
              ) : availableMedications.length === 0 ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-dashed">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No stock available at <span className="font-medium">{sourceBranch?.name}</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medications..."
                      value={medicationSearch}
                      onChange={(e) => setMedicationSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Medication Grid */}
                  <ScrollArea className="h-[180px] rounded-xl border bg-card">
                    <div className="p-2 space-y-1">
                      {filteredMedications.length === 0 ? (
                        <p className="text-center py-6 text-sm text-muted-foreground">
                          No medications match your search
                        </p>
                      ) : (
                        filteredMedications.map(med => (
                          <button
                            key={med.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, medication_id: med.id, quantity: 1 })}
                            className={cn(
                              "w-full p-3 rounded-lg text-left transition-all duration-150",
                              "hover:bg-muted/80",
                              formData.medication_id === med.id
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-transparent"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                  formData.medication_id === med.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}>
                                  <Package className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{med.name}</p>
                                  <p className="text-xs text-muted-foreground">{med.category}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge 
                                  variant={med.stock > 10 ? "secondary" : "destructive"}
                                  className="font-mono"
                                >
                                  {med.stock} units
                                </Badge>
                                {formData.medication_id === med.id && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Quantity & Notes - Side by Side */}
            {selectedMed && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Quantity
                  </Label>
                  <div className="relative">
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={selectedMed.stock}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="pr-20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Badge variant="outline" className="text-xs">
                        max {selectedMed.stock}
                      </Badge>
                    </div>
                  </div>
                  {formData.quantity > selectedMed.stock && (
                    <p className="text-xs text-destructive">
                      Exceeds available stock
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Notes (Optional)
                  </Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Reason for transfer..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t bg-muted/30">
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={!isFormValid || createTransfer.isPending}
            >
              {createTransfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Create Transfer Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
