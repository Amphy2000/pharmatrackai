import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Trash2, Package, Layers, Save, AlertCircle } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ALL_CATEGORIES, type MedicationCategory } from '@/types/medication';
import { format, addMonths } from 'date-fns';

interface BatchExpiryEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BatchProduct {
  id: string;
  name: string;
  category: MedicationCategory;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  batchNumber: string;
}

export const BatchExpiryEntryModal = ({ open, onOpenChange }: BatchExpiryEntryModalProps) => {
  const { addMedication } = useMedications();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  
  // Shared expiry date for all products in this batch
  const [expiryDate, setExpiryDate] = useState(format(addMonths(new Date(), 24), 'yyyy-MM-dd'));
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [products, setProducts] = useState<BatchProduct[]>([createEmptyProduct()]);
  const [isSaving, setIsSaving] = useState(false);

  // Get default margin from pharmacy settings
  const defaultMargin = (pharmacy as any)?.default_margin_percent || 20;

  function createEmptyProduct(): BatchProduct {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      category: 'Tablet' as MedicationCategory,
      quantity: 1,
      unitPrice: 0,
      sellingPrice: 0,
      batchNumber: `BN${Date.now().toString(36).toUpperCase().slice(-6)}`,
    };
  }

  const addProduct = () => {
    setProducts(prev => [...prev, createEmptyProduct()]);
  };

  const removeProduct = (id: string) => {
    if (products.length === 1) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof BatchProduct, value: any) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const updated = { ...p, [field]: value };
      
      // Auto-calculate selling price when unit price changes
      if (field === 'unitPrice' && typeof value === 'number') {
        updated.sellingPrice = Math.round(value * (1 + defaultMargin / 100));
      }
      
      return updated;
    }));
  };

  const handleSaveAll = async () => {
    // Validate
    const validProducts = products.filter(p => p.name.trim() && p.quantity > 0);
    
    if (validProducts.length === 0) {
      toast({
        title: 'No valid products',
        description: 'Add at least one product with a name and quantity',
        variant: 'destructive',
      });
      return;
    }

    if (!expiryDate) {
      toast({
        title: 'Missing expiry date',
        description: 'Please set the shared expiry date',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const promises = validProducts.map(product => 
        addMedication.mutateAsync({
          name: product.name.trim(),
          category: product.category,
          batch_number: product.batchNumber,
          current_stock: product.quantity,
          reorder_level: Math.max(5, Math.floor(product.quantity * 0.2)),
          expiry_date: expiryDate,
          manufacturing_date: manufacturingDate || undefined,
          unit_price: product.unitPrice,
          selling_price: product.sellingPrice || undefined,
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Products saved',
        description: `${validProducts.length} products added with expiry ${expiryDate}`,
      });

      // Reset and close
      setProducts([createEmptyProduct()]);
      setExpiryDate(format(addMonths(new Date(), 24), 'yyyy-MM-dd'));
      setManufacturingDate('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving products:', err);
      toast({
        title: 'Error',
        description: 'Failed to save some products',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const validCount = products.filter(p => p.name.trim() && p.quantity > 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);

  // Quick expiry presets
  const setExpiryPreset = (months: number) => {
    setExpiryDate(format(addMonths(new Date(), months), 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85dvh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Layers className="h-5 w-5 text-primary" />
            Batch Entry Mode
          </DialogTitle>
          <DialogDescription>
            Add multiple products with the same expiry date - perfect for new stock arrivals
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
          {/* Shared Expiry Date Section */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Calendar className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm font-medium">Shared Expiry Date</Label>
                  <p className="text-xs text-muted-foreground">All products below will use this expiry date</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-40"
                  />
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setExpiryPreset(12)}
                    >
                      +1 Year
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setExpiryPreset(24)}
                    >
                      +2 Years
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setExpiryPreset(36)}
                    >
                      +3 Years
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Manufacturing Date (optional):</Label>
                  <Input
                    type="date"
                    value={manufacturingDate}
                    onChange={(e) => setManufacturingDate(e.target.value)}
                    className="w-40 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Products List */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({products.length})
            </h3>
            <Button variant="outline" size="sm" onClick={addProduct} className="gap-1">
              <Plus className="h-3 w-3" />
              Add Row
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Product Name</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-2">Cost Price</div>
                <div className="col-span-2">Sell Price</div>
                <div className="col-span-1"></div>
              </div>

              {products.map((product, index) => (
                <Card key={product.id} className="p-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Product Name */}
                    <div className="col-span-4">
                      <Input
                        placeholder="Product name"
                        value={product.name}
                        onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <Select
                        value={product.category}
                        onValueChange={(v) => updateProduct(product.id, 'category', v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-9 text-center"
                      />
                    </div>

                    {/* Cost Price */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={product.unitPrice || ''}
                        onChange={(e) => updateProduct(product.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>

                    {/* Selling Price */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Auto"
                        value={product.sellingPrice || ''}
                        onChange={(e) => updateProduct(product.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeProduct(product.id)}
                        disabled={products.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="flex items-center justify-between py-2 border-t">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Valid products:</span>
              <Badge variant="secondary">{validCount}</Badge>
              {totalValue > 0 && (
                <>
                  <span className="text-muted-foreground">Total value:</span>
                  <Badge variant="outline">{formatPrice(totalValue)}</Badge>
                </>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              Auto-margin: {defaultMargin}%
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={validCount === 0 || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save {validCount} Products
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
