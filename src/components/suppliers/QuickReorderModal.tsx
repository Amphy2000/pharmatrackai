import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSupplierProducts } from '@/hooks/useSupplierProducts';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { Check, Clock, TrendingDown, Plus, Printer } from 'lucide-react';
import { AddSupplierProductModal } from './AddSupplierProductModal';
import { generatePurchaseOrder, generateOrderNumber } from '@/utils/purchaseOrderGenerator';
import type { Medication } from '@/types/medication';
import type { SupplierProductWithDetails } from '@/hooks/useSupplierProducts';

interface QuickReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication?: Medication | null;
}

export const QuickReorderModal = ({ open, onOpenChange, medication }: QuickReorderModalProps) => {
  const { supplierProducts, bestPriceSupplier, isLoading: loadingProducts } = useSupplierProducts(medication?.id);
  const { pharmacy } = usePharmacy();
  const { formatPrice, currency } = useCurrency();
  const { toast } = useToast();
  
  const [selectedProduct, setSelectedProduct] = useState<SupplierProductWithDetails | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [quantity, setQuantity] = useState(10);

  // Auto-select best price supplier when products load
  useEffect(() => {
    if (bestPriceSupplier && !selectedProduct) {
      setSelectedProduct(bestPriceSupplier);
    }
  }, [bestPriceSupplier]);

  // Reset form when medication changes
  useEffect(() => {
    if (medication) {
      setQuantity(Math.max(medication.reorder_level - medication.current_stock, 10));
      setSelectedProduct(null);
    }
  }, [medication?.id]);

  const handleSupplierSelect = (product: SupplierProductWithDetails) => {
    setSelectedProduct(product);
  };

  const handlePrint = async () => {
    if (!selectedProduct || !medication) {
      toast({ title: 'Please select a supplier', variant: 'destructive' });
      return;
    }

    const totalPrice = quantity * selectedProduct.unit_price;
    
    // Generate POS receipt
    const orderNumber = generateOrderNumber();
    const doc = await generatePurchaseOrder({
      orders: [{
        supplierName: selectedProduct.supplier_name,
        items: [{
          medicationName: medication.name,
          quantity,
          unitPrice: selectedProduct.unit_price,
          totalPrice,
        }],
        totalAmount: totalPrice,
      }],
      pharmacyName: pharmacy?.name || 'My Pharmacy',
      pharmacyPhone: pharmacy?.phone || undefined,
      pharmacyLogoUrl: pharmacy?.logo_url || undefined,
      orderNumber,
      date: new Date(),
      currency: currency as 'NGN' | 'USD' | 'GBP',
    });

    // Open print dialog
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');

    toast({ 
      title: 'Purchase Order Printed', 
      description: `Order for ${medication.name} sent to printer.` 
    });

    onOpenChange(false);
  };

  const totalAmount = selectedProduct ? quantity * selectedProduct.unit_price : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Order{medication && `: ${medication.name}`}</DialogTitle>
            <DialogDescription>
              Select a supplier and print purchase order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
                        selectedProduct?.id === product.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleSupplierSelect(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedProduct?.id === product.id
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30'
                          }`}>
                            {selectedProduct?.id === product.id && (
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

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={selectedProduct?.min_order_quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                required
              />
              {selectedProduct?.min_order_quantity && selectedProduct.min_order_quantity > 1 && (
                <p className="text-xs text-muted-foreground">
                  Min. order: {selectedProduct.min_order_quantity}
                </p>
              )}
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="flex justify-between font-medium">
                <span>Total Amount:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!selectedProduct}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Order
            </Button>
          </DialogFooter>
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
