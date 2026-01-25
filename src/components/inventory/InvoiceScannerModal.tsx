import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Camera, FileImage, Upload, Check, X, Loader2, AlertCircle,
  Plus, Minus, ZoomIn, ZoomOut, Play, FileUp, Sparkles, Edit2
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/lib/supabase';
import type { Medication } from '@/types/medication';
import sampleInvoiceImage from '@/assets/sample-invoice.png';

// Mock invoice data for demo mode
const DEMO_INVOICE_ITEMS = [
  { productName: 'Amoxicillin 500mg Capsules', quantity: 50, unitPrice: 850, batchNumber: 'BN24087', expiryDate: '2026-06-15' },
  { productName: 'Paracetamol 500mg Tablets', quantity: 100, unitPrice: 350, batchNumber: 'BN24092', expiryDate: '2026-08-20' },
  { productName: 'Metformin 500mg Tablets', quantity: 60, unitPrice: 1200, batchNumber: 'BN24103', expiryDate: '2026-05-10' },
  { productName: 'Vitamin C 1000mg Tablets', quantity: 80, unitPrice: 450, batchNumber: 'BN24115', expiryDate: '2027-01-15' },
  { productName: 'Ibuprofen 400mg Tablets', quantity: 40, unitPrice: 520, batchNumber: 'BN24078', expiryDate: '2026-09-30' },
];

interface InvoiceScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractedItem {
  productName: string;
  quantity: number;
  unitPrice?: number;
  suggestedSellingPrice?: number;
  suggestedWholesalePrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  matched?: Medication;
  isNew?: boolean;
  isEditing?: boolean;
}

export const InvoiceScannerModal = ({ open, onOpenChange }: InvoiceScannerModalProps) => {
  const { medications, addMedication, updateMedication } = useMedications();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const defaultMargin = (pharmacy as any)?.default_margin_percent || 20;
  const defaultWholesaleMargin = 10;

  const calculateSellingPrice = (costPrice: number): number => {
    return Math.round(costPrice * (1 + defaultMargin / 100));
  };

  const calculateWholesalePrice = (costPrice: number): number => {
    return Math.round(costPrice * (1 + defaultWholesaleMargin / 100));
  };

  // Handle file upload - supports multiple files and PDFs
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    setExtractedItems([]);
    setZoomLevel(1);
    setIsDemoMode(false);
    setCurrentPageIndex(0);

    const newImageUrls: string[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf') {
        // For PDFs, we'll convert pages to images using canvas
        // For now, we'll read as data URL and let the AI handle it
        toast({
          title: 'PDF detected',
          description: 'Processing PDF - AI will extract from all visible content',
        });
      }

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          newImageUrls.push(base64);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setImageUrls(newImageUrls);
  };

  // Run demo mode
  const handleDemoMode = async () => {
    setImageUrls([sampleInvoiceImage]);
    setError(null);
    setZoomLevel(1);
    setIsDemoMode(true);
    setIsProcessing(true);
    setExtractedItems([]);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const items: ExtractedItem[] = DEMO_INVOICE_ITEMS.map((item) => {
      const matched = medications.find(
        (med) =>
          med.name.toLowerCase().includes(item.productName.toLowerCase()) ||
          item.productName.toLowerCase().includes(med.name.toLowerCase())
      );

      return {
        ...item,
        suggestedSellingPrice: calculateSellingPrice(item.unitPrice),
        suggestedWholesalePrice: calculateWholesalePrice(item.unitPrice),
        matched,
        isNew: !matched,
      };
    });

    setExtractedItems(items);
    setIsProcessing(false);

    toast({
      title: '🎬 Demo Mode Active',
      description: `Found ${items.length} items, ${items.filter(i => i.matched).length} matched`,
    });
  };

  // Process images with AI - calls Lovable Cloud edge function
  const handleProcessImage = async () => {
    if (imageUrls.length === 0) return;

    setIsProcessing(true);
    setError(null);

    console.log('[InvoiceScanner] Calling scan-invoice via bridge...');
    const { callAI } = await import('@/utils/ai-bridge');

    const { data, error: fnError } = await callAI('scan-invoice', {
      images: imageUrls,
      imageUrl: imageUrls[0],
    });

    console.log('[InvoiceScanner] Response:', { data, fnError });

    if (fnError) {
      console.error('[InvoiceScanner] Edge function error:', fnError);
      const errMsg = fnError.message || String(fnError);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate')) {
        setError('AI is busy (rate limited). Please wait a moment and try again.');
      } else if (errMsg.includes('402')) {
        setError('AI credits exhausted. Please contact support.');
      } else {
        setError(errMsg || 'Failed to process invoice');
      }
      return;
    }

    if (data?.error) {
      console.log('[InvoiceScanner] Data contains error:', data.error);
      setError(data.error);
      return;
    }

    const rawItems = data?.items || [];
    console.log('[InvoiceScanner] Extracted items count:', rawItems.length);

    if (rawItems.length === 0) {
      setError('No products found. Please ensure the invoice shows a clear product list with names and prices.');
      return;
    }

    // Match to existing medications
    const items: ExtractedItem[] = rawItems.map((raw: any) => {
      const productName = String(raw.productName || raw.name || '').trim();
      const batchNumber = raw.batchNumber || null;

      const matched = medications.find((med) => {
        const medName = med.name.toLowerCase();
        const name = productName.toLowerCase();
        return (
          (name && (medName.includes(name) || name.includes(medName))) ||
          (batchNumber && med.batch_number === batchNumber)
        );
      });

      const unitPrice = Number(raw.unitPrice) || undefined;

      return {
        productName,
        quantity: Number(raw.quantity) || 1,
        unitPrice,
        batchNumber: batchNumber || undefined,
        expiryDate: raw.expiryDate || undefined,
        manufacturingDate: raw.manufacturingDate || undefined,
        suggestedSellingPrice: unitPrice ? calculateSellingPrice(unitPrice) : undefined,
        suggestedWholesalePrice: unitPrice ? calculateWholesalePrice(unitPrice) : undefined,
        matched,
        isNew: !matched,
      };
    });

    setExtractedItems(items);

    toast({
      title: 'Invoice processed',
      description: `Found ${items.length} items, ${items.filter(i => i.matched).length} matched to inventory`,
    });
  } catch (err) {
    console.error('[InvoiceScanner] Error processing invoice:', err);
    setError(err instanceof Error ? err.message : 'Failed to process invoice');
  } finally {
    setIsProcessing(false);
  }
};

// Update item fields
const updateItem = (index: number, updates: Partial<ExtractedItem>) => {
  setExtractedItems(prev => {
    const newItems = [...prev];
    newItems[index] = { ...newItems[index], ...updates };
    return newItems;
  });
};

const removeItem = (index: number) => {
  setExtractedItems(prev => prev.filter((_, i) => i !== index));
};

// Apply to inventory - update matched items AND create new items
const handleApplyToInventory = async () => {
  if (extractedItems.length === 0) {
    toast({ title: 'No items to add', variant: 'destructive' });
    return;
  }

  setIsApplying(true);

  try {
    const matchedItems = extractedItems.filter(item => item.matched);
    const newItems = extractedItems.filter(item => item.isNew && item.productName);

    // Update existing matched items
    if (matchedItems.length > 0) {
      const updatePromises = matchedItems.map(item =>
        updateMedication.mutateAsync({
          id: item.matched!.id,
          current_stock: item.matched!.current_stock + item.quantity,
          ...(item.suggestedSellingPrice ? { selling_price: item.suggestedSellingPrice } : {}),
          ...(item.suggestedWholesalePrice ? { wholesale_price: item.suggestedWholesalePrice } : {}),
        })
      );
      await Promise.all(updatePromises);
    }

    // Create new items
    if (newItems.length > 0) {
      const createPromises = newItems.map(item =>
        addMedication.mutateAsync({
          name: item.productName,
          batch_number: item.batchNumber || `BATCH-${Date.now()}`,
          expiry_date: item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          current_stock: item.quantity,
          unit_price: item.unitPrice || 0,
          selling_price: item.suggestedSellingPrice || item.unitPrice || 0,
          wholesale_price: item.suggestedWholesalePrice || null,
          category: 'Other',
          reorder_level: 10,
          dispensing_unit: 'unit',
        })
      );
      await Promise.all(createPromises);
    }

    toast({
      title: 'Inventory updated!',
      description: `${matchedItems.length} items updated, ${newItems.length} new items created`,
    });

    // Reset and close
    setImageUrls([]);
    setExtractedItems([]);
    onOpenChange(false);
  } catch (err) {
    console.error('Error updating inventory:', err);
    toast({
      title: 'Error',
      description: 'Failed to update some items. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setIsApplying(false);
  }
};

const matchedCount = extractedItems.filter(i => i.matched).length;
const newCount = extractedItems.filter(i => i.isNew).length;
const totalQty = extractedItems.reduce((sum, i) => sum + i.quantity, 0);

return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-5xl max-h-[90vh] sm:max-h-[90vh] h-[95vh] sm:h-auto overflow-hidden flex flex-col p-4 sm:p-6">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          AI Invoice Scanner
          <Badge variant="outline" className="ml-2 text-[10px] sm:text-xs hidden sm:inline-flex">
            Auto-Margin: {defaultMargin}%
          </Badge>
        </DialogTitle>
        <DialogDescription className="text-xs sm:text-sm">
          Upload invoice images or PDFs - AI extracts products and creates/updates inventory
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 overflow-hidden min-h-0">
        {/* Left: Image upload - hidden on mobile when items exist */}
        <div className={`${extractedItems.length > 0 ? 'hidden sm:flex' : 'flex'} sm:w-2/5 flex-col flex-shrink-0`}>
          {imageUrls.length === 0 ? (
            <div className="flex-1 flex flex-col">
              <label className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground font-medium">Upload Invoice</span>
                <span className="text-xs text-muted-foreground mt-1">JPG, PNG, or PDF (multi-page supported)</span>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span>or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={handleDemoMode} disabled={isProcessing}>
                  <Play className="h-4 w-4" />
                  Try Demo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Page navigation for multiple images */}
              {imageUrls.length > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    Page {currentPageIndex + 1} of {imageUrls.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
                      disabled={currentPageIndex === 0}
                    >
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPageIndex(i => Math.min(imageUrls.length - 1, i + 1))}
                      disabled={currentPageIndex === imageUrls.length - 1}
                    >
                      →
                    </Button>
                  </div>
                </div>
              )}

              {/* Zoom controls */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Zoom: {Math.round(zoomLevel * 100)}%</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}>
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 relative border rounded-lg overflow-auto bg-muted/20">
                <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
                  <img src={imageUrls[currentPageIndex]} alt="Invoice" className="w-full h-auto" />
                </div>
                {isDemoMode && (
                  <Badge className="absolute top-2 left-2 bg-primary/90">🎬 Demo Mode</Badge>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => {
                    setImageUrls([]);
                    setExtractedItems([]);
                    setZoomLevel(1);
                    setIsDemoMode(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2 mt-3">
                {!isDemoMode && (
                  <Button className="flex-1" onClick={handleProcessImage} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Extract All Items
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Extracted items - Editable verification table */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Verification Table</span>
            {extractedItems.length > 0 && (
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {matchedCount} matched
                </Badge>
                <Badge variant="outline" className="text-xs border-warning/50 text-warning">
                  {newCount} new
                </Badge>
              </div>
            )}
          </div>

          {error ? (
            <div className="flex-1 flex items-center justify-center border rounded-lg border-destructive/30 bg-destructive/5">
              <div className="text-center p-4">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-2">
                {extractedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <FileImage className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Upload an invoice and click "Extract All Items"</p>
                    <p className="text-xs mt-1">AI extracts products from all pages</p>
                  </div>
                ) : (
                  extractedItems.map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all ${item.matched
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-amber-500/30 bg-amber-500/5'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Editable product name */}
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(index, { productName: e.target.value })}
                            className="h-7 text-sm font-medium mb-1"
                          />

                          {item.matched ? (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Matched: {item.matched.name}
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600 flex items-center gap-1">
                              <Plus className="h-3 w-3" />
                              New Product - will be created
                            </div>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                            className="h-7 w-14 text-center text-sm"
                          />
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItem(index, { quantity: item.quantity + 1 })}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(index)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Editable price fields */}
                      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Cost Price</label>
                          <Input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => {
                              const cost = parseFloat(e.target.value) || 0;
                              updateItem(index, {
                                unitPrice: cost,
                                suggestedSellingPrice: calculateSellingPrice(cost),
                                suggestedWholesalePrice: calculateWholesalePrice(cost),
                              });
                            }}
                            className="h-6 text-xs"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Selling Price</label>
                          <Input
                            type="number"
                            value={item.suggestedSellingPrice || ''}
                            onChange={(e) => updateItem(index, { suggestedSellingPrice: parseFloat(e.target.value) || 0 })}
                            className="h-6 text-xs"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Batch / Expiry</label>
                          <div className="flex gap-1">
                            <Input
                              value={item.batchNumber || ''}
                              onChange={(e) => updateItem(index, { batchNumber: e.target.value })}
                              className="h-6 text-xs flex-1"
                              placeholder="BN"
                            />
                            <Input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) => updateItem(index, { expiryDate: e.target.value })}
                              className="h-6 text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {extractedItems.length > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{extractedItems.length} items</span> totaling{' '}
                <span className="font-medium">{totalQty} units</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {matchedCount} will update existing stock, {newCount} will be created as new products
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="flex-shrink-0 gap-2 mt-4 pt-4 border-t border-border/30 flex-col-reverse sm:flex-row">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleApplyToInventory}
          disabled={extractedItems.length === 0 || isApplying}
          className="gap-2 w-full sm:w-auto"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Apply {extractedItems.length} Items
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
};
