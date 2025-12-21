import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Medication } from '@/types/medication';

interface QuickReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication?: Medication | null;
}

export const QuickReorderModal = ({ open, onOpenChange, medication }: QuickReorderModalProps) => {
  const { suppliers, createReorder } = useSuppliers();
  const { formatPrice } = useCurrency();
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    quantity: medication ? Math.max(medication.reorder_level - medication.current_stock, 10) : 10,
    unit_price: medication?.unit_price || 0,
    notes: '',
    expected_delivery: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) return;
    
    try {
      await createReorder.mutateAsync({
        supplier_id: formData.supplier_id,
        medication_id: medication?.id,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        notes: formData.notes || undefined,
        expected_delivery: formData.expected_delivery || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const totalAmount = formData.quantity * formData.unit_price;
  const activeSuppliers = suppliers.filter(s => s.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Reorder{medication && `: ${medication.name}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {medication && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between">
                <span>Current Stock:</span>
                <span className={medication.current_stock <= medication.reorder_level ? 'text-destructive font-bold' : ''}>
                  {medication.current_stock}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reorder Level:</span>
                <span>{medication.reorder_level}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {activeSuppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeSuppliers.length === 0 && (
              <p className="text-xs text-muted-foreground">No active suppliers. Add a supplier first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price *</Label>
              <Input
                id="unit_price"
                type="number"
                min={0}
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex justify-between font-medium">
              <span>Total Amount:</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_delivery">Expected Delivery</Label>
            <Input
              id="expected_delivery"
              type="date"
              value={formData.expected_delivery}
              onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Special instructions..."
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createReorder.isPending || !formData.supplier_id}
          >
            Create Reorder Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
