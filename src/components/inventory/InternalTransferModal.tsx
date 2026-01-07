import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Package, Search, Store } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchContext } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';

interface Medication {
  id: string;
  name: string;
  shelf_quantity: number;
  store_quantity: number;
  category: string;
}

interface InternalTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medications: Medication[];
  onTransferComplete?: () => void;
}

export const InternalTransferModal = ({
  open,
  onOpenChange,
  medications,
  onTransferComplete,
}: InternalTransferModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [transferType, setTransferType] = useState<'store_to_shelf' | 'shelf_to_store'>('store_to_shelf');
  const [quantity, setQuantity] = useState('');
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();
  const { currentBranchId } = useBranchContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter medications based on search
  const filteredMedications = useMemo(() => {
    if (!searchQuery.trim()) return medications.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return medications.filter(
      (med) =>
        med.name.toLowerCase().includes(query) ||
        med.category.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [medications, searchQuery]);

  // Get available quantity based on transfer direction
  const availableQuantity = selectedMedication
    ? transferType === 'store_to_shelf'
      ? selectedMedication.store_quantity
      : selectedMedication.shelf_quantity
    : 0;

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMedication || !pharmacyId) throw new Error('Missing data');
      
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0 || qty > availableQuantity) {
        throw new Error('Invalid quantity');
      }

      // Update medication quantities
      const newShelfQty = transferType === 'store_to_shelf'
        ? selectedMedication.shelf_quantity + qty
        : selectedMedication.shelf_quantity - qty;
      const newStoreQty = transferType === 'store_to_shelf'
        ? selectedMedication.store_quantity - qty
        : selectedMedication.store_quantity + qty;

      const { error: updateError } = await supabase
        .from('medications')
        .update({
          shelf_quantity: newShelfQty,
          store_quantity: newStoreQty,
          current_stock: newShelfQty + newStoreQty,
        })
        .eq('id', selectedMedication.id);

      if (updateError) throw updateError;

      // Log the transfer
      const { error: logError } = await supabase
        .from('internal_transfers')
        .insert({
          pharmacy_id: pharmacyId,
          branch_id: currentBranchId || null,
          medication_id: selectedMedication.id,
          transfer_type: transferType,
          quantity: qty,
          performed_by: user?.id || null,
        });

      if (logError) console.error('Failed to log transfer:', logError);

      return { medication: selectedMedication, quantity: qty };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['branch-medications'] });
      
      toast({
        title: 'Transfer Complete',
        description: `Moved ${data.quantity} ${data.medication.name} ${
          transferType === 'store_to_shelf' ? 'from Store to Shelf' : 'from Shelf to Store'
        }`,
      });
      
      // Reset form
      setSelectedMedication(null);
      setQuantity('');
      setSearchQuery('');
      onTransferComplete?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Transfer Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Internal Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer stock between Shelf (front desk) and Store (back room)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transfer Direction */}
          <div className="space-y-2">
            <Label>Transfer Direction</Label>
            <Select
              value={transferType}
              onValueChange={(v) => setTransferType(v as typeof transferType)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="store_to_shelf">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Store → Shelf (Restock front desk)
                  </span>
                </SelectItem>
                <SelectItem value="shelf_to_store">
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    Shelf → Store (Return to storage)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Search */}
          <div className="space-y-2">
            <Label>Select Product</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            
            {!selectedMedication && (
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredMedications.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        setSelectedMedication(med);
                        setSearchQuery(med.name);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{med.name}</p>
                          <p className="text-xs text-muted-foreground">{med.category}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="secondary" className="gap-1">
                              <Store className="h-3 w-3" />
                              {med.shelf_quantity}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Package className="h-3 w-3" />
                              {med.store_quantity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredMedications.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No products found
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Product Info */}
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
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    Change
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <span>Shelf: <strong>{selectedMedication.shelf_quantity}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Store: <strong>{selectedMedication.store_quantity}</strong></span>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Quantity to Transfer</Label>
                  <span className="text-xs text-muted-foreground">
                    Max: {availableQuantity}
                  </span>
                </div>
                <Input
                  type="number"
                  min="1"
                  max={availableQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="h-11"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            disabled={!selectedMedication || !quantity || parseInt(quantity) <= 0 || parseInt(quantity) > availableQuantity || transferMutation.isPending}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            {transferMutation.isPending ? 'Transferring...' : 'Transfer Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
