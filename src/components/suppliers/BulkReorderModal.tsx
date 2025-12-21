import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Printer, TrendingDown, AlertTriangle, Package, Building2 } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { generatePurchaseOrder, generateOrderNumber } from '@/utils/purchaseOrderGenerator';
import type { Medication } from '@/types/medication';
import type { SupplierProduct, Supplier } from '@/types/supplier';

interface BulkReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedItem {
  medication: Medication;
  quantity: number;
  selectedSupplierProduct: SupplierProduct | null;
  supplier: Supplier | null;
}

export const BulkReorderModal = ({ open, onOpenChange }: BulkReorderModalProps) => {
  const { medications } = useMedications();
  const { suppliers, supplierProducts, createReorder } = useSuppliers();
  const { pharmacy } = usePharmacy();
  const { formatPrice, currency } = useCurrency();
  const { toast } = useToast();
  
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  // Get low stock medications
  const lowStockMedications = useMemo(() => 
    medications.filter(med => med.current_stock <= med.reorder_level),
    [medications]
  );

  // Get best supplier for a medication
  const getBestSupplierProduct = (medicationId: string): { product: SupplierProduct | null; supplier: Supplier | null } => {
    const products = supplierProducts
      .filter(p => p.medication_id === medicationId && p.is_available)
      .sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
    
    if (products.length === 0) return { product: null, supplier: null };
    
    const product = products[0];
    const supplier = suppliers.find(s => s.id === product.supplier_id) || null;
    return { product, supplier };
  };

  // Toggle selection of a medication
  const toggleSelection = (medication: Medication) => {
    const newSelected = new Map(selectedItems);
    
    if (newSelected.has(medication.id)) {
      newSelected.delete(medication.id);
    } else {
      const { product, supplier } = getBestSupplierProduct(medication.id);
      const suggestedQty = Math.max(medication.reorder_level * 2 - medication.current_stock, product?.min_order_quantity || 10);
      
      newSelected.set(medication.id, {
        medication,
        quantity: suggestedQty,
        selectedSupplierProduct: product,
        supplier,
      });
    }
    
    setSelectedItems(newSelected);
  };

  // Select all items
  const selectAll = () => {
    const newSelected = new Map<string, SelectedItem>();
    lowStockMedications.forEach(med => {
      const { product, supplier } = getBestSupplierProduct(med.id);
      const suggestedQty = Math.max(med.reorder_level * 2 - med.current_stock, product?.min_order_quantity || 10);
      newSelected.set(med.id, {
        medication: med,
        quantity: suggestedQty,
        selectedSupplierProduct: product,
        supplier,
      });
    });
    setSelectedItems(newSelected);
  };

  // Update quantity for a selected item
  const updateQuantity = (medicationId: string, quantity: number) => {
    const item = selectedItems.get(medicationId);
    if (item) {
      const newSelected = new Map(selectedItems);
      newSelected.set(medicationId, { ...item, quantity: Math.max(1, quantity) });
      setSelectedItems(newSelected);
    }
  };

  // Group items by supplier
  const itemsBySupplier = useMemo(() => {
    const grouped = new Map<string, { supplier: Supplier | null; items: SelectedItem[] }>();
    
    selectedItems.forEach(item => {
      const supplierKey = item.supplier?.id || 'no-supplier';
      const existing = grouped.get(supplierKey);
      
      if (existing) {
        existing.items.push(item);
      } else {
        grouped.set(supplierKey, { supplier: item.supplier, items: [item] });
      }
    });
    
    return grouped;
  }, [selectedItems]);

  // Calculate totals
  const totals = useMemo(() => {
    let grandTotal = 0;
    let itemCount = 0;
    
    selectedItems.forEach(item => {
      if (item.selectedSupplierProduct) {
        grandTotal += Number(item.selectedSupplierProduct.unit_price) * item.quantity;
      }
      itemCount++;
    });
    
    return { grandTotal, itemCount };
  }, [selectedItems]);

  // Generate and print purchase orders
  const handlePrintPurchaseOrders = async () => {
    if (selectedItems.size === 0) {
      toast({ title: 'No items selected', variant: 'destructive' });
      return;
    }

    // Group items by supplier for printing
    const ordersForPrint: Array<{
      supplierName: string;
      supplierPhone?: string;
      supplierEmail?: string;
      supplierAddress?: string;
      items: Array<{
        medicationName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      totalAmount: number;
    }> = [];

    itemsBySupplier.forEach(({ supplier, items }) => {
      if (!supplier) return; // Skip items without suppliers
      
      const orderItems = items
        .filter(item => item.selectedSupplierProduct)
        .map(item => ({
          medicationName: item.medication.name,
          quantity: item.quantity,
          unitPrice: Number(item.selectedSupplierProduct!.unit_price),
          totalPrice: Number(item.selectedSupplierProduct!.unit_price) * item.quantity,
        }));

      if (orderItems.length > 0) {
        ordersForPrint.push({
          supplierName: supplier.name,
          supplierPhone: supplier.phone || undefined,
          supplierEmail: supplier.email || undefined,
          supplierAddress: supplier.address || undefined,
          items: orderItems,
          totalAmount: orderItems.reduce((sum, i) => sum + i.totalPrice, 0),
        });
      }
    });

    if (ordersForPrint.length === 0) {
      toast({ 
        title: 'No printable orders', 
        description: 'Selected items need to have suppliers linked.',
        variant: 'destructive' 
      });
      return;
    }

    // Generate PDF
    const orderNumber = generateOrderNumber();
    const doc = generatePurchaseOrder({
      orders: ordersForPrint,
      pharmacyName: pharmacy?.name || 'My Pharmacy',
      pharmacyAddress: pharmacy?.address || undefined,
      pharmacyPhone: pharmacy?.phone || undefined,
      pharmacyEmail: pharmacy?.email || undefined,
      orderNumber,
      date: new Date(),
      currency: currency as 'NGN' | 'USD' | 'GBP',
    });

    // Open print dialog
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');

    toast({ 
      title: 'Purchase Orders Generated', 
      description: `${ordersForPrint.length} purchase order(s) ready to print.` 
    });
  };

  // Create reorder requests and print
  const handleCreateOrdersAndPrint = async () => {
    if (selectedItems.size === 0) {
      toast({ title: 'No items selected', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      // Create reorder requests for each item
      const promises: Promise<unknown>[] = [];
      
      selectedItems.forEach(item => {
        if (item.selectedSupplierProduct && item.supplier) {
          promises.push(
            createReorder.mutateAsync({
              supplier_id: item.supplier.id,
              medication_id: item.medication.id,
              supplier_product_id: item.selectedSupplierProduct.id,
              quantity: item.quantity,
              unit_price: Number(item.selectedSupplierProduct.unit_price),
            })
          );
        }
      });

      await Promise.all(promises);

      // Generate and print purchase orders
      await handlePrintPurchaseOrders();

      toast({ 
        title: 'Orders Created Successfully', 
        description: `${promises.length} reorder request(s) created and purchase orders generated.` 
      });

      setSelectedItems(new Map());
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to create some orders. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            Bulk Reorder - Low Stock Items
          </DialogTitle>
          <DialogDescription>
            Select items to reorder. Best prices are automatically suggested. Orders will be grouped by supplier.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {lowStockMedications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>All items are well stocked!</p>
            </div>
          ) : (
            <div className="flex gap-4 h-[500px]">
              {/* Left: Item Selection */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">
                    {lowStockMedications.length} items need restocking
                  </span>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {lowStockMedications.map(med => {
                      const { product, supplier } = getBestSupplierProduct(med.id);
                      const isSelected = selectedItems.has(med.id);
                      const selectedItem = selectedItems.get(med.id);
                      
                      return (
                        <div 
                          key={med.id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleSelection(med)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(med)}
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{med.name}</span>
                                <Badge variant="destructive" className="text-xs shrink-0">
                                  {med.current_stock} left
                                </Badge>
                              </div>
                              
                              {product && supplier ? (
                                <div className="flex items-center gap-2 mt-1 text-sm">
                                  <TrendingDown className="h-3 w-3 text-green-600" />
                                  <span className="text-muted-foreground">Best:</span>
                                  <span className="font-medium text-green-600">
                                    {supplier.name} @ {formatPrice(Number(product.unit_price))}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>No supplier linked</span>
                                </div>
                              )}
                              
                              {isSelected && selectedItem && (
                                <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                  <span className="text-xs text-muted-foreground">Qty:</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={selectedItem.quantity}
                                    onChange={e => updateQuantity(med.id, parseInt(e.target.value) || 1)}
                                    className="h-7 w-20 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Order Summary by Supplier */}
              <div className="w-80 flex flex-col">
                <span className="text-sm font-medium mb-3">Order Summary</span>
                
                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="p-3 space-y-4">
                    {itemsBySupplier.size === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Select items to see order summary
                      </div>
                    ) : (
                      Array.from(itemsBySupplier.entries()).map(([key, { supplier, items }]) => {
                        const supplierTotal = items.reduce((sum, item) => {
                          if (item.selectedSupplierProduct) {
                            return sum + Number(item.selectedSupplierProduct.unit_price) * item.quantity;
                          }
                          return sum;
                        }, 0);

                        return (
                          <Card key={key} className={!supplier ? 'border-dashed opacity-60' : ''}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {supplier?.name || 'No Supplier'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {items.map(item => (
                                  <div key={item.medication.id} className="flex justify-between text-xs">
                                    <span className="truncate flex-1">{item.medication.name}</span>
                                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              {supplier && (
                                <>
                                  <Separator className="my-2" />
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>Subtotal:</span>
                                    <span className="text-primary">{formatPrice(supplierTotal)}</span>
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Grand Total */}
                {totals.itemCount > 0 && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Total Items:</span>
                      <span className="font-medium">{totals.itemCount}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-1">
                      <span>Grand Total:</span>
                      <span className="text-primary">{formatPrice(totals.grandTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePrintPurchaseOrders}
            disabled={selectedItems.size === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Only
          </Button>
          <Button 
            onClick={handleCreateOrdersAndPrint}
            disabled={selectedItems.size === 0 || isProcessing}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isProcessing ? 'Creating...' : 'Create Orders & Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
