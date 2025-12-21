import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierProducts } from '@/hooks/useSupplierProducts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Check, Clock, TrendingDown, Plus } from 'lucide-react';
import { AddSupplierProductModal } from './AddSupplierProductModal';
import type { Medication } from '@/types/medication';

interface QuickReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication?: Medication | null;
}

export const QuickReorderModal = ({ open, onOpenChange, medication }: QuickReorderModalProps) => {
  const { createReorder } = useSuppliers();
  const { supplierProducts, bestPriceSupplier, isLoading: loadingProducts } = useSupplierProducts(medication?.id);
  const { formatPrice } = useCurrency();
  
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 10,
    unit_price: 0,
    notes: '',
    expected_delivery: '',
  });

  // Auto-select best price supplier when products load
  useEffect(() => {
    if (bestPriceSupplier && !selectedSupplierId) {
      setSelectedSupplierId(bestPriceSupplier.supplier_id);
      setFormData(prev => ({ ...prev, unit_price: bestPriceSupplier.unit_price }));
    }
  }, [bestPriceSupplier]);

  // Reset form when medication changes
  useEffect(() => {
    if (medication) {
      setFormData(prev => ({
        ...prev,
        quantity: Math.max(medication.reorder_level - medication.current_stock, 10),
      }));
      setSelectedSupplierId('');
    }
  }, [medication?.id]);

  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const product = supplierProducts.find(p => p.supplier_id === supplierId);
    if (product) {
      setFormData(prev => ({ ...prev, unit_price: product.unit_price }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;
    
    try {
      await createReorder.mutateAsync({
        supplier_id: selectedSupplierId,
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
  const selectedProduct = supplierProducts.find(p => p.supplier_id === selectedSupplierId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Reorder{medication && `: ${medication.name}`}</DialogTitle>
            <DialogDescription>
              Select a supplier and create a reorder request
            </DialogDescription>
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

            {/* Supplier Recommendations */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Recommended Suppliers
                {bestPriceSupplier && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <TrendingDown className="h-3 w-3" />
                    Best: {formatPrice(bestPriceSupplier.unit_price)}
                  </Badge>
                )}
              </Label>
              
              {loadingProducts ? (
                <div className="text-sm text-muted-foreground">Loading suppliers...</div>
              ) : supplierProducts.length > 0 ? (
                <div className="space-y-2">
                  {supplierProducts.map((product, index) => (
                    <Card
                      key={product.id}
                      className={`p-3 cursor-pointer transition-all ${
                        selectedSupplierId === product.supplier_id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleSupplierSelect(product.supplier_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedSupplierId === product.supplier_id
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30'
                          }`}>
                            {selectedSupplierId === product.supplier_id && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {product.supplier_name}
                              {index === 0 && (
                                <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  Best Price
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                              <span className="font-semibold text-foreground">
                                {formatPrice(product.unit_price)}/unit
                              </span>
                              {product.lead_time_days && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {product.lead_time_days} days
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {index > 0 && bestPriceSupplier && (
                          <span className="text-xs text-muted-foreground">
                            +{formatPrice(product.unit_price - bestPriceSupplier.unit_price)}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No suppliers linked to this medication yet
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowAddSupplierModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Supplier
                  </Button>
                </div>
              )}

              {supplierProducts.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowAddSupplierModal(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add Another Supplier
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={selectedProduct?.min_order_quantity || 1}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  required
                />
                {selectedProduct?.min_order_quantity && selectedProduct.min_order_quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Min. order: {selectedProduct.min_order_quantity}
                  </p>
                )}
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
              disabled={createReorder.isPending || !selectedSupplierId}
            >
              Create Reorder Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AddSupplierProductModal
        open={showAddSupplierModal}
        onOpenChange={setShowAddSupplierModal}
        medication={medication || null}
      />
    </>
  );
};