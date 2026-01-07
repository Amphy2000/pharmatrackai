import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search, Package, Store, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Medication {
  id: string;
  name: string;
  shelf_quantity: number;
  store_quantity: number;
  current_stock: number;
  category: string;
}

interface QuickStockUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medications: Medication[];
}

export const QuickStockUpdateModal = ({
  open,
  onOpenChange,
  medications,
}: QuickStockUpdateModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [addToShelf, setAddToShelf] = useState('');
  const [addToStore, setAddToStore] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-focus search when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Filter medications based on search
  const filteredMedications = useMemo(() => {
    if (!searchQuery.trim()) return medications.slice(0, 15);
    const query = searchQuery.toLowerCase();
    return medications.filter(
      (med) =>
        med.name.toLowerCase().includes(query) ||
        med.category.toLowerCase().includes(query)
    ).slice(0, 15);
  }, [medications, searchQuery]);

  // Calculate new totals
  const newShelfQty = selectedMedication
    ? (selectedMedication.shelf_quantity || 0) + (parseInt(addToShelf) || 0)
    : 0;
  const newStoreQty = selectedMedication
    ? (selectedMedication.store_quantity || 0) + (parseInt(addToStore) || 0)
    : 0;
  const newTotalQty = newShelfQty + newStoreQty;

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMedication) throw new Error('No medication selected');
      
      const shelfAdd = parseInt(addToShelf) || 0;
      const storeAdd = parseInt(addToStore) || 0;
      
      if (shelfAdd === 0 && storeAdd === 0) {
        throw new Error('Enter a quantity to add');
      }

      const { error } = await supabase
        .from('medications')
        .update({
          shelf_quantity: newShelfQty,
          store_quantity: newStoreQty,
          current_stock: newTotalQty,
        })
        .eq('id', selectedMedication.id);

      if (error) throw error;

      return { medication: selectedMedication, shelfAdd, storeAdd };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['branch-medications'] });
      
      const parts = [];
      if (data.shelfAdd > 0) parts.push(`+${data.shelfAdd} to Shelf`);
      if (data.storeAdd > 0) parts.push(`+${data.storeAdd} to Store`);
      
      toast({
        title: 'Stock Updated',
        description: `${data.medication.name}: ${parts.join(', ')}`,
      });
      
      // Reset for next update (keep modal open for quick successive updates)
      setSelectedMedication(null);
      setSearchQuery('');
      setAddToShelf('');
      setAddToStore('');
      searchInputRef.current?.focus();
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedMedication && (addToShelf || addToStore)) {
      updateMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Stock Update
          </DialogTitle>
          <DialogDescription>
            Fast way to add received stock to Shelf or Store
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Search */}
          <div className="space-y-2">
            <Label>Search Product</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Type product name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedMedication) {
                    setSelectedMedication(null);
                    setAddToShelf('');
                    setAddToStore('');
                  }
                }}
                className="pl-10 h-11"
              />
            </div>
            
            {!selectedMedication && searchQuery && (
              <ScrollArea className="h-40 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredMedications.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        setSelectedMedication(med);
                        setSearchQuery(med.name);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{med.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(med.shelf_quantity || 0) + (med.store_quantity || 0)} total
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {filteredMedications.length === 0 && (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No products found
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Product - Quick Update Fields */}
          {selectedMedication && (
            <>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{selectedMedication.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMedication(null);
                      setSearchQuery('');
                      setAddToShelf('');
                      setAddToStore('');
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Change
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Store className="h-3 w-3" />
                    Shelf: {selectedMedication.shelf_quantity || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Store: {selectedMedication.store_quantity || 0}
                  </div>
                  <div className="font-medium text-foreground">
                    Total: {selectedMedication.current_stock || 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    Add to Shelf
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={addToShelf}
                    onChange={(e) => setAddToShelf(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    className="h-11 text-center text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    Add to Store
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={addToStore}
                    onChange={(e) => setAddToStore(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    className="h-11 text-center text-lg font-bold"
                  />
                </div>
              </div>

              {/* New Totals Preview */}
              {(addToShelf || addToStore) && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">After Update:</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      Shelf: <strong className="text-primary">{newShelfQty}</strong>
                    </div>
                    <div>
                      Store: <strong>{newStoreQty}</strong>
                    </div>
                    <div>
                      Total: <strong className="text-primary">{newTotalQty}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!selectedMedication || (!addToShelf && !addToStore) || updateMutation.isPending}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {updateMutation.isPending ? 'Updating...' : 'Add Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
