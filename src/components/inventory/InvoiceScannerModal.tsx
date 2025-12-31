import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Camera, FileImage, Upload, Check, X, Loader2, AlertCircle, Plus, Minus, ZoomIn, ZoomOut, DollarSign, Play } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Medication } from '@/types/medication';
import sampleInvoiceImage from '@/assets/sample-invoice.png';
import { callPharmacyAiWithFallback, PharmacyAiError } from '@/lib/pharmacyAiClient';

// Mock invoice data for demo mode - realistic Nigerian pharmacy items
const DEMO_INVOICE_ITEMS = [
  {
    productName: 'Amoxicillin 500mg Capsules',
    quantity: 50,
    unitPrice: 850,
    batchNumber: 'BN24087',
    expiryDate: '2026-06-15',
    manufacturingDate: '2024-06-15',
  },
  {
    productName: 'Paracetamol 500mg Tablets',
    quantity: 100,
    unitPrice: 350,
    batchNumber: 'BN24092',
    expiryDate: '2026-08-20',
    manufacturingDate: '2024-08-20',
  },
  {
    productName: 'Metformin 500mg Tablets',
    quantity: 60,
    unitPrice: 1200,
    batchNumber: 'BN24103',
    expiryDate: '2026-05-10',
    manufacturingDate: '2024-05-10',
  },
  {
    productName: 'Vitamin C 1000mg Tablets',
    quantity: 80,
    unitPrice: 450,
    batchNumber: 'BN24115',
    expiryDate: '2027-01-15',
    manufacturingDate: '2024-07-15',
  },
  {
    productName: 'Ibuprofen 400mg Tablets',
    quantity: 40,
    unitPrice: 520,
    batchNumber: 'BN24078',
    expiryDate: '2026-09-30',
    manufacturingDate: '2024-03-30',
  },
  {
    productName: 'Omeprazole 20mg Capsules',
    quantity: 30,
    unitPrice: 1450,
    batchNumber: 'BN24129',
    expiryDate: '2026-04-25',
    manufacturingDate: '2024-04-25',
  },
  {
    productName: 'Ciprofloxacin 500mg Tablets',
    quantity: 25,
    unitPrice: 1650,
    batchNumber: 'BN24134',
    expiryDate: '2026-07-18',
    manufacturingDate: '2024-07-18',
  },
  {
    productName: 'Artemether-Lumefantrine 20/120mg',
    quantity: 45,
    unitPrice: 2200,
    batchNumber: 'BN24141',
    expiryDate: '2026-03-12',
    manufacturingDate: '2024-03-12',
  },
  {
    productName: 'Loratadine 10mg Tablets',
    quantity: 35,
    unitPrice: 780,
    batchNumber: 'BN24156',
    expiryDate: '2026-11-08',
    manufacturingDate: '2024-05-08',
  },
  {
    productName: 'Diclofenac 50mg Tablets',
    quantity: 55,
    unitPrice: 620,
    batchNumber: 'BN24162',
    expiryDate: '2026-10-22',
    manufacturingDate: '2024-04-22',
  },
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
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  matched?: Medication;
  isNew?: boolean;
  highlighted?: boolean;
}

export const InvoiceScannerModal = ({ open, onOpenChange }: InvoiceScannerModalProps) => {
  const { medications, updateMedication } = useMedications();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Get default margin from pharmacy settings
  const defaultMargin = (pharmacy as any)?.default_margin_percent || 20;

  // Calculate suggested selling price based on cost and margin
  const calculateSellingPrice = (costPrice: number): number => {
    return Math.round(costPrice * (1 + defaultMargin / 100));
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageUrl(base64);
      setExtractedItems([]);
      setError(null);
      setZoomLevel(1);
    };
    reader.readAsDataURL(file);
    setIsDemoMode(false);
  };

  // Run demo mode with sample invoice and mock data
  const handleDemoMode = async () => {
    setImageUrl(sampleInvoiceImage);
    setError(null);
    setZoomLevel(1);
    setIsDemoMode(true);
    setIsProcessing(true);
    setExtractedItems([]);

    // Simulate processing delay for realistic experience
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Match demo items to existing medications and calculate suggested prices
    const items: ExtractedItem[] = DEMO_INVOICE_ITEMS.map((item) => {
      const matched = medications.find(
        (med) =>
          med.name.toLowerCase().includes(item.productName.toLowerCase()) ||
          item.productName.toLowerCase().includes(med.name.toLowerCase())
      );

      const suggestedSellingPrice = calculateSellingPrice(item.unitPrice);

      return {
        ...item,
        suggestedSellingPrice,
        matched,
        isNew: !matched,
      };
    });

    setExtractedItems(items);
    setIsProcessing(false);

    const matchedCount = items.filter(i => i.matched).length;
    toast({
      title: '🎬 Demo Mode Active',
      description: `Found ${items.length} items, ${matchedCount} matched. Auto-margin: ${defaultMargin}%`,
    });
  };

  // Process image with AI
  const handleProcessImage = async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (!pharmacy?.id) {
        setError('No pharmacy selected. Please reload and try again.');
        return;
      }

      const data = await callPharmacyAiWithFallback<any>({
        actions: ['scan_invoice', 'invoice_scan'],
        payload: { imageUrl, imageBase64: imageUrl },
        pharmacy_id: pharmacy.id,
      });

      // Graceful backpressure handling
      if (data?.rateLimited) {
        setError('AI is busy. Please wait and try again.');
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      const rawItems = (data?.items ?? data?.result?.items ?? []) as any[];

      // Match extracted items to existing medications and calculate suggested prices
      const items: ExtractedItem[] = rawItems.map((raw: any) => {
        const productName = String(raw?.productName ?? raw?.name ?? raw?.product_name ?? '').trim();
        const batchNumber = (raw?.batchNumber ?? raw?.batch_number ?? null) as string | null;

        const matched = medications.find((med) => {
          const medName = med.name.toLowerCase();
          const name = productName.toLowerCase();
          return (
            (name && (medName.includes(name) || name.includes(medName))) ||
            (batchNumber && med.batch_number === batchNumber)
          );
        });

        const unitPriceRaw = raw?.unitPrice ?? raw?.unit_price ?? raw?.cost_price ?? null;
        const unitPrice = typeof unitPriceRaw === 'number' ? unitPriceRaw : Number(unitPriceRaw);
        const suggestedSellingPrice = Number.isFinite(unitPrice) ? calculateSellingPrice(unitPrice) : undefined;

        return {
          productName,
          quantity: Number(raw?.quantity ?? 0) || 0,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : undefined,
          batchNumber: (batchNumber ?? undefined) as any,
          expiryDate: (raw?.expiryDate ?? raw?.expiry_date ?? undefined) as any,
          manufacturingDate: (raw?.manufacturingDate ?? raw?.manufacturing_date ?? null) as any,
          suggestedSellingPrice,
          matched,
          isNew: !matched,
        };
      });

      setExtractedItems(items);

      toast({
        title: 'Invoice processed',
        description: `Found ${items.length} items, ${items.filter(i => i.matched).length} matched. Auto-margin: ${defaultMargin}%`,
      });
    } catch (err) {
      console.error('Error processing invoice:', err);
      
      if (err instanceof PharmacyAiError) {
        if (err.status === 429) {
          setError('AI is busy (rate limited). Please wait 10 seconds and try again.');
        } else if (err.status === 401 || err.status === 403) {
          setError('Authentication error. Check VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY in Vercel.');
        } else {
          setError(`AI error: ${err.message || `Status ${err.status}`}`);
        }
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to process invoice. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update quantity for an item
  const updateItemQuantity = (index: number, qty: number) => {
    setExtractedItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity: Math.max(0, qty) };
      return newItems;
    });
  };

  // Update suggested selling price
  const updateSellingPrice = (index: number, price: number) => {
    setExtractedItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], suggestedSellingPrice: price };
      return newItems;
    });
  };

  // Accept suggested price for a matched item
  const acceptSuggestedPrice = async (index: number) => {
    const item = extractedItems[index];
    if (!item.matched || !item.suggestedSellingPrice) return;

    try {
      await updateMedication.mutateAsync({
        id: item.matched.id,
        selling_price: item.suggestedSellingPrice,
      });
      toast({
        title: 'Price updated',
        description: `${item.matched.name} selling price set to ${formatPrice(item.suggestedSellingPrice)}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update price',
        variant: 'destructive',
      });
    }
  };

  // Remove item from list
  const removeItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Highlight item on image (simulated - in real app would use coordinates)
  const handleItemHover = (index: number | null) => {
    setHighlightedIndex(index);
  };

  // Apply matched items to inventory
  const handleApplyToInventory = async () => {
    const matchedItems = extractedItems.filter(item => item.matched);
    
    if (matchedItems.length === 0) {
      toast({
        title: 'No matched items',
        description: 'No items could be matched to existing inventory',
        variant: 'destructive',
      });
      return;
    }

    setIsApplying(true);

    try {
      const promises = matchedItems.map(item =>
        updateMedication.mutateAsync({
          id: item.matched!.id,
          current_stock: item.matched!.current_stock + item.quantity,
          // Update selling price if suggested and different
          ...(item.suggestedSellingPrice && item.suggestedSellingPrice !== item.matched!.selling_price 
            ? { selling_price: item.suggestedSellingPrice } 
            : {}),
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Inventory updated',
        description: `${matchedItems.length} items added to stock with auto-calculated margins`,
      });

      // Reset and close
      setImageUrl(null);
      setExtractedItems([]);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update some items',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const matchedCount = extractedItems.filter(i => i.matched).length;
  const totalQty = extractedItems.filter(i => i.matched).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileImage className="h-5 w-5 text-primary" />
            AI Invoice Scanner
            <Badge variant="outline" className="ml-2 text-xs">
              Auto-Margin: {defaultMargin}%
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Upload an invoice photo - AI extracts products and auto-calculates selling prices
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left: Image upload with zoom */}
          <div className="w-2/5 flex flex-col">
            {!imageUrl ? (
              <div className="flex-1 flex flex-col">
                <label className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload Invoice</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, or PDF</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
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
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleDemoMode}
                    disabled={isProcessing}
                  >
                    <Play className="h-4 w-4" />
                    Try Demo
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    See how it works with sample data
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Zoom controls */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Zoom: {Math.round(zoomLevel * 100)}%</span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                    >
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 relative border rounded-lg overflow-auto bg-muted/20">
                  <div 
                    className="relative transition-transform duration-200"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                  >
                    <img
                      src={imageUrl}
                      alt="Invoice"
                      className="w-full h-auto"
                    />
                    {/* Highlight overlay when hovering over items */}
                    {highlightedIndex !== null && (
                      <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-lg pointer-events-none animate-pulse" />
                    )}
                  </div>
                  {isDemoMode && (
                    <Badge className="absolute top-2 left-2 bg-primary/90">
                      🎬 Demo Mode
                    </Badge>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => {
                      setImageUrl(null);
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
                    <Button
                      className="flex-1"
                      onClick={handleProcessImage}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Extract Items
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant={isDemoMode ? "default" : "outline"}
                    className={isDemoMode ? "flex-1 gap-2" : "gap-2"}
                    onClick={handleDemoMode}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isDemoMode ? 'Processing...' : ''}
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        {isDemoMode ? 'Re-run Demo' : 'Try Demo'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Extracted items with pricing */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Extracted Items</span>
              {extractedItems.length > 0 && (
                <Badge variant="secondary">
                  {matchedCount}/{extractedItems.length} matched
                </Badge>
              )}
            </div>

            {error ? (
              <div className="flex-1 flex items-center justify-center border rounded-lg border-destructive/30 bg-destructive/5">
                <div className="text-center p-4">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-3 space-y-2">
                  {extractedItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <FileImage className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Upload and process an invoice</p>
                      <p className="text-xs mt-1">AI extracts products + auto-calculates margins</p>
                    </div>
                  ) : (
                    extractedItems.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          item.matched 
                            ? 'border-green-500/30 bg-green-500/5' 
                            : 'border-warning/30 bg-warning/5'
                        } ${highlightedIndex === index ? 'ring-2 ring-primary' : ''}`}
                        onMouseEnter={() => handleItemHover(index)}
                        onMouseLeave={() => handleItemHover(null)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {item.productName}
                            </div>
                            {item.matched ? (
                              <div className="text-xs text-green-600">
                                ✓ Matched: {item.matched.name}
                              </div>
                            ) : (
                              <div className="text-xs text-warning">
                                ⚠ No match found
                              </div>
                            )}
                            {item.batchNumber && (
                              <div className="text-xs text-muted-foreground">
                                Batch: {item.batchNumber}
                              </div>
                            )}
                            {item.expiryDate && (
                              <div className="text-xs text-muted-foreground">
                                Exp: {item.expiryDate}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                              className="h-7 w-14 text-center text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeItem(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Auto-margin pricing section */}
                        {item.unitPrice && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Cost: {formatPrice(item.unitPrice)}
                              </span>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3 text-success" />
                                <span className="text-success font-medium">
                                  Suggested: {formatPrice(item.suggestedSellingPrice || 0)}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  +{defaultMargin}%
                                </Badge>
                              </div>
                            </div>
                            {item.matched && item.suggestedSellingPrice && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Current: {formatPrice(item.matched.selling_price || item.matched.unit_price)}
                                </span>
                                {item.suggestedSellingPrice !== (item.matched.selling_price || item.matched.unit_price) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-success hover:text-success"
                                    onClick={() => acceptSuggestedPrice(index)}
                                  >
                                    Apply New Price
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {matchedCount > 0 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">{matchedCount} items</span> will add{' '}
                  <span className="font-medium">{totalQty} units</span> to inventory
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Prices auto-calculated with {defaultMargin}% margin
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyToInventory}
            disabled={matchedCount === 0 || isApplying}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {isApplying ? 'Updating...' : `Add ${matchedCount} Items to Stock`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};