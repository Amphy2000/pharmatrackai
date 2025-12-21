import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Plus, X } from 'lucide-react';
import type { Medication } from '@/types/medication';

interface SupplierEntry {
  name: string;
  unit_price: number;
  lead_time_days: number;
  min_order_quantity: number;
}

interface AddSupplierProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: Medication | null;
  onSupplierAdded?: () => void;
}

export const AddSupplierProductModal = ({
  open,
  onOpenChange,
  medication,
  onSupplierAdded,
}: AddSupplierProductModalProps) => {
  const { suppliers, addSupplier, addSupplierProduct } = useSuppliers();
  const { formatPrice } = useCurrency();
  
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSupplier, setNewSupplier] = useState<SupplierEntry>({
    name: '',
    unit_price: medication?.unit_price || 0,
    lead_time_days: 3,
    min_order_quantity: 1,
  });
  const [unitPrice, setUnitPrice] = useState(medication?.unit_price || 0);
  const [leadTimeDays, setLeadTimeDays] = useState(3);
  const [minOrderQty, setMinOrderQty] = useState(1);

  useEffect(() => {
    if (medication) {
      setNewSupplier(prev => ({ ...prev, unit_price: medication.unit_price }));
      setUnitPrice(medication.unit_price);
    }
  }, [medication]);

  const handleAddExistingSupplier = async () => {
    if (!selectedSupplierId || !medication) return;
    
    try {
      await addSupplierProduct.mutateAsync({
        supplier_id: selectedSupplierId,
        medication_id: medication.id,
        product_name: medication.name,
        unit_price: unitPrice,
        lead_time_days: leadTimeDays,
        min_order_quantity: minOrderQty,
        is_available: true,
        sku: null,
      });
      onSupplierAdded?.();
      resetForm();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleAddNewSupplier = async () => {
    if (!newSupplier.name || !medication) return;
    
    try {
      // First add the supplier
      const supplier = await addSupplier.mutateAsync({
        name: newSupplier.name,
        is_active: true,
        contact_person: null,
        email: null,
        phone: null,
        address: null,
        website: null,
        payment_terms: null,
        notes: null,
      });
      
      // Then link to this medication
      await addSupplierProduct.mutateAsync({
        supplier_id: supplier.id,
        medication_id: medication.id,
        product_name: medication.name,
        unit_price: newSupplier.unit_price,
        lead_time_days: newSupplier.lead_time_days,
        min_order_quantity: newSupplier.min_order_quantity,
        is_available: true,
        sku: null,
      });
      
      onSupplierAdded?.();
      resetForm();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const resetForm = () => {
    setSelectedSupplierId('');
    setIsAddingNew(false);
    setNewSupplier({
      name: '',
      unit_price: medication?.unit_price || 0,
      lead_time_days: 3,
      min_order_quantity: 1,
    });
    setUnitPrice(medication?.unit_price || 0);
    setLeadTimeDays(3);
    setMinOrderQty(1);
    onOpenChange(false);
  };

  const activeSuppliers = suppliers.filter(s => s.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Supplier for {medication?.name}</DialogTitle>
          <DialogDescription>
            Link a supplier to this medication with their pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isAddingNew ? (
            <>
              <div className="space-y-2">
                <Label>Select Existing Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSuppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplierId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lead Time (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={leadTimeDays}
                        onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Min. Order Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={minOrderQty}
                      onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <Button 
                    onClick={handleAddExistingSupplier} 
                    className="w-full"
                    disabled={addSupplierProduct.isPending}
                  >
                    Link Supplier
                  </Button>
                </>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="h-4 w-4" />
                Add New Supplier
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1"
                onClick={() => setIsAddingNew(false)}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>

              <div className="space-y-2">
                <Label>Supplier Name *</Label>
                <Input
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="e.g., Net Pharmacy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price *</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={newSupplier.unit_price}
                    onChange={(e) => setNewSupplier({ 
                      ...newSupplier, 
                      unit_price: parseFloat(e.target.value) || 0 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lead Time (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newSupplier.lead_time_days}
                    onChange={(e) => setNewSupplier({ 
                      ...newSupplier, 
                      lead_time_days: parseInt(e.target.value) || 1 
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Min. Order Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={newSupplier.min_order_quantity}
                  onChange={(e) => setNewSupplier({ 
                    ...newSupplier, 
                    min_order_quantity: parseInt(e.target.value) || 1 
                  })}
                />
              </div>

              <Button 
                onClick={handleAddNewSupplier} 
                className="w-full"
                disabled={!newSupplier.name || addSupplier.isPending || addSupplierProduct.isPending}
              >
                Add Supplier & Link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};