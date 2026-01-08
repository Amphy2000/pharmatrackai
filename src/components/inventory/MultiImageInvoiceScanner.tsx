import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Camera, FileImage, Upload, Check, X, Loader2, AlertCircle,
  Plus, Trash2, ChevronUp, RefreshCw, Wand2, TriangleAlert
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, addYears } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Medication } from '@/types/medication';

interface MultiImageInvoiceScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractedItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number | null; // cost price
  sellingPrice: number | null; // retail
  wholesalePrice: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
  matched: Medication | null;
  isNew: boolean;
  isEditing: boolean;
  hasError: boolean;
  rowTotal: number; // quantity * unitPrice
  hasMathError: boolean; // if row math doesn't match
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  processed: boolean;
}

export const MultiImageInvoiceScanner = ({ open, onOpenChange }: MultiImageInvoiceScannerProps) => {
  const { medications, updateMedication, addMedication } = useMedications();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  
  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingPage, setCurrentProcessingPage] = useState(0);
  
  // Extracted items state
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Review dashboard state
  const [showReviewDashboard, setShowReviewDashboard] = useState(false);
  const [globalExpiryDate, setGlobalExpiryDate] = useState('');
  const [verifyAll, setVerifyAll] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  
  // Margin state for auto-pricing
  const [retailMarginPercent, setRetailMarginPercent] = useState(20);
  const [wholesaleMarginPercent, setWholesaleMarginPercent] = useState(5);
  
  // Extracted invoice total from AI
  const [extractedInvoiceTotal, setExtractedInvoiceTotal] = useState<number | null>(null);
  
  // Removed zoom-on-focus feature - not practical with multiple invoices
  
  // Get default margin from pharmacy settings
  const defaultMargin = (pharmacy as any)?.default_margin_percent || 20;

  // Initialize retail margin from pharmacy settings
  useEffect(() => {
    if (defaultMargin) {
      setRetailMarginPercent(defaultMargin);
    }
  }, [defaultMargin]);

  // Calculate suggested selling price based on cost and margin
  const calculateRetailPrice = (costPrice: number): number => {
    return Math.round(costPrice * (1 + retailMarginPercent / 100));
  };

  // Calculate wholesale price based on cost and margin
  const calculateWholesalePrice = (costPrice: number): number => {
    return Math.round(costPrice * (1 + wholesaleMarginPercent / 100) * 100) / 100;
  };

  // Generate unique ID
  const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const compressInvoiceImage = async (dataUrl: string): Promise<string> => {
    // Keep payloads small to avoid slow uploads + rate limits
    const MAX_DIM = 1600;
    const QUALITY = 0.78;

    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });

      const maxSide = Math.max(img.width, img.height);
      const scale = maxSide > MAX_DIM ? MAX_DIM / maxSide : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;

      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', QUALITY);
    } catch {
      return dataUrl;
    }
  };

  // Handle multiple file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: UploadedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const original = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      const preview = await compressInvoiceImage(original);

      newImages.push({
        id: generateId(),
        file,
        preview,
        processed: false,
      });
    }

    setUploadedImages((prev) => [...prev, ...newImages]);
    setError(null);
  };

  // Remove image from upload queue
  const removeImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // Process all images with AI (Lovable AI via backend function)
  const handleProcessImages = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(5);
    setCurrentProcessingPage(1);
    setError(null);
    setExtractedItems([]);
    setExtractedInvoiceTotal(null);

    try {
      // Use the Lovable Cloud client for backend functions
      const { supabase: cloudSupabase } = await import('@/integrations/supabase/client');

      const images = uploadedImages.map((img) => img.preview);
      setProcessingProgress(15);

      const timeoutMs = 70_000;
      const invokePromise = cloudSupabase.functions.invoke('scan-invoice', {
        body: {
          images,
          imageUrl: images[0], // backward compatibility
        },
      });

      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        const t = setTimeout(() => {
          clearTimeout(t);
          reject(new Error('Invoice scan is taking too long. Try a clearer photo or fewer pages.'));
        }, timeoutMs);
      });

      const { data, error: fnError } = await Promise.race([invokePromise, timeoutPromise]);

      if (fnError) {
        const msg = fnError.message || String(fnError);
        if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
          setError('AI is busy (rate limited). Please wait a moment and try again.');
        } else if (msg.includes('402')) {
          setError('AI credits exhausted. Please contact support.');
        } else if (msg.includes('504') || msg.toLowerCase().includes('timeout')) {
          setError('Invoice scan timed out. Try a clearer photo or fewer pages.');
        } else {
          setError(msg || 'Failed to process invoice');
        }
        return;
      }

      if (data?.error) {
        setError(String(data.error));
        return;
      }

      const rawItems = Array.isArray(data?.items) ? data.items : [];

      // Mark all images as processed
      setUploadedImages((prev) => prev.map((img) => ({ ...img, processed: true })));
      setProcessingProgress(85);

      const processedItems: ExtractedItem[] = rawItems.map((raw: any) => {
        const productName = String(raw?.productName ?? raw?.name ?? raw?.product_name ?? '').trim();
        const batchNumber = (raw?.batchNumber ?? raw?.batch_number ?? null) as string | null;
        const expiryDate = (raw?.expiryDate ?? raw?.expiry_date ?? null) as string | null;

        const matched = medications.find((med) => {
          const medName = med.name.toLowerCase();
          const name = productName.toLowerCase();
          return (
            (name && (medName.includes(name) || name.includes(medName))) ||
            (batchNumber && med.batch_number === batchNumber)
          );
        });

        const unitPriceRaw = raw?.unitPrice ?? raw?.unit_price ?? raw?.cost_price ?? null;
        const unitPriceNum = typeof unitPriceRaw === 'number' ? unitPriceRaw : Number(unitPriceRaw);
        const unitPrice = Number.isFinite(unitPriceNum) ? unitPriceNum : null;

        const sellingPriceRaw = raw?.sellingPrice ?? raw?.selling_price ?? raw?.retail_price ?? raw?.unit_retail ?? null;
        const sellingPriceNum = typeof sellingPriceRaw === 'number' ? sellingPriceRaw : Number(sellingPriceRaw);
        const sellingPrice = Number.isFinite(sellingPriceNum) ? sellingPriceNum : null;

        const wholesalePriceRaw = raw?.wholesalePrice ?? raw?.wholesale_price ?? raw?.w_sale ?? raw?.wholesale ?? null;
        const wholesalePriceNum = typeof wholesalePriceRaw === 'number' ? wholesalePriceRaw : Number(wholesalePriceRaw);
        const wholesalePrice = Number.isFinite(wholesalePriceNum) ? wholesalePriceNum : null;

        const qty = Number(raw?.quantity ?? 1) || 1;
        const rowTotal = (unitPrice ?? 0) * qty;

        return {
          id: generateId(),
          productName,
          quantity: qty,
          unitPrice,
          sellingPrice,
          wholesalePrice,
          batchNumber,
          expiryDate,
          matched: matched || null,
          isNew: !matched,
          isEditing: false,
          hasError: false,
          rowTotal,
          hasMathError: false,
        };
      });

      // Extract invoice total if provided
      const invoiceTotalRaw = data?.invoiceTotal ?? data?.invoice_total ?? data?.grandTotal ?? data?.total;
      const invoiceTotal = typeof invoiceTotalRaw === 'number' ? invoiceTotalRaw : Number(invoiceTotalRaw);
      if (Number.isFinite(invoiceTotal) && invoiceTotal > 0) {
        setExtractedInvoiceTotal(invoiceTotal);
      }

      // Deduplicate items by product name + batch
      const deduplicatedItems = processedItems.reduce((acc, item) => {
        const existingIndex = acc.findIndex(
          (existing) =>
            existing.productName.toLowerCase() === item.productName.toLowerCase() &&
            existing.batchNumber === item.batchNumber
        );

        if (existingIndex >= 0) {
          acc[existingIndex].quantity += item.quantity;
          acc[existingIndex].rowTotal = (acc[existingIndex].unitPrice ?? 0) * acc[existingIndex].quantity;
        } else {
          acc.push(item);
        }

        return acc;
      }, [] as ExtractedItem[]);

      setExtractedItems(deduplicatedItems);
      setShowReviewDashboard(true);

      if (deduplicatedItems.length === 0) {
        toast({
          title: 'No items extracted',
          description:
            'AI could not read this invoice (often handwriting/blur). You can add items manually or retake a clearer photo.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Invoice processing complete',
          description: `Extracted ${deduplicatedItems.length} unique items from ${uploadedImages.length} page(s)`,
        });
      }
    } catch (err) {
      console.error('Error processing invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to process invoices. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(100);
    }
  };

  // Update item field inline with live row total sync
  const updateItem = (id: string, field: keyof ExtractedItem, value: any) => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate row total when quantity or unitPrice changes
          const qty = field === 'quantity' ? (value || 0) : (updated.quantity || 0);
          const unitPrice = field === 'unitPrice' ? (value || 0) : (updated.unitPrice || 0);
          updated.rowTotal = qty * unitPrice;
          // Validate for errors
          updated.hasError = !updated.quantity || updated.quantity <= 0 || !updated.unitPrice || updated.unitPrice <= 0;
          return updated;
        }
        return item;
      })
    );
  };

  // Remove item from list
  const removeItem = (id: string) => {
    setExtractedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addManualItem = () => {
    setExtractedItems((prev) => [
      {
        id: generateId(),
        productName: '',
        quantity: 1,
        unitPrice: null,
        sellingPrice: null,
        wholesalePrice: null,
        batchNumber: null,
        expiryDate: null,
        matched: null,
        isNew: true,
        isEditing: false,
        hasError: true,
        rowTotal: 0,
        hasMathError: false,
      },
      ...prev,
    ]);
  };

  // Apply default prices to all items with empty prices
  const applyDefaultPrices = () => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (!item.unitPrice || item.unitPrice <= 0) return item;
        
        const updatedItem = { ...item };
        
        // Apply retail price if empty
        if (!item.sellingPrice || item.sellingPrice <= 0) {
          updatedItem.sellingPrice = calculateRetailPrice(item.unitPrice);
        }
        
        // Apply wholesale price if empty
        if (!item.wholesalePrice || item.wholesalePrice <= 0) {
          updatedItem.wholesalePrice = calculateWholesalePrice(item.unitPrice);
        }
        
        return updatedItem;
      })
    );

    toast({
      title: 'Default prices applied',
      description: `Retail (+${retailMarginPercent}%) and Wholesale (+${wholesaleMarginPercent}%) prices filled for items with cost`,
    });
  };

  // Calculate grand total from all rows
  const calculatedGrandTotal = extractedItems.reduce((sum, item) => sum + item.rowTotal, 0);

  // Check if calculated total matches extracted total (within ₦1 tolerance)
  const hasTotalMismatch =
    extractedInvoiceTotal !== null &&
    Math.abs(calculatedGrandTotal - extractedInvoiceTotal) > 1;

  // Count items missing expiry
  const itemsMissingExpiry = extractedItems.filter((i) => !i.expiryDate).length;

  // Removed zoom feature - not practical with multiple invoices


  // Apply global expiry date to all empty fields
  const applyGlobalExpiry = () => {
    if (!globalExpiryDate) return;
    
    setExtractedItems(prev => prev.map(item => ({
      ...item,
      expiryDate: item.expiryDate || globalExpiryDate,
    })));

    toast({
      title: 'Expiry date applied',
      description: 'Date applied to all items with empty expiry fields',
    });
  };

  // Quick date presets
  const applyQuickExpiry = (years: number) => {
    const date = format(addYears(new Date(), years), 'yyyy-MM-dd');
    setGlobalExpiryDate(date);
  };

  // Grand total now uses rowTotal for live sync
  const grandTotal = calculatedGrandTotal;

  // Check if all items are valid
  const hasInvalidItems = extractedItems.some(item => 
    !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice <= 0
  );

  // Apply items to inventory
  const handleApplyToInventory = async () => {
    if (hasInvalidItems) {
      toast({
        title: 'Validation error',
        description: 'Please fix all highlighted fields before submitting',
        variant: 'destructive',
      });
      return;
    }

    setIsApplying(true);

    try {
      const matchedItems = extractedItems.filter(item => item.matched);
      const newItems = extractedItems.filter(item => !item.matched);

      // Update existing medications
      for (const item of matchedItems) {
        await updateMedication.mutateAsync({
          id: item.matched!.id,
          current_stock: item.matched!.current_stock + item.quantity,
          unit_price: item.unitPrice || item.matched!.unit_price,
          ...(item.sellingPrice != null ? { selling_price: item.sellingPrice } : {}),
          ...(item.wholesalePrice != null ? { wholesale_price: item.wholesalePrice } : {}),
          ...(item.expiryDate ? { expiry_date: item.expiryDate } : {}),
        });
      }

      // Add NEW items to inventory automatically
      for (const item of newItems) {
        if (item.unitPrice && item.expiryDate) {
          await addMedication.mutateAsync({
            name: item.productName,
            category: 'Other',
            batch_number: item.batchNumber || `BATCH-${Date.now()}`,
            current_stock: item.quantity,
            reorder_level: 10,
            expiry_date: item.expiryDate,
            unit_price: item.unitPrice,
            selling_price: item.sellingPrice || item.unitPrice,
            ...(item.wholesalePrice != null ? { wholesale_price: item.wholesalePrice } : {}),
          });
        }
      }

      // Log the invoice scan to audit for ROI tracking
      if (pharmacy?.id) {
        const { data: authData } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          pharmacy_id: pharmacy.id,
          user_id: authData?.user?.id || null,
          action: 'invoice_scanned',
          entity_type: 'invoice',
          details: {
            itemCount: extractedItems.length,
            matchedCount: matchedItems.length,
            newItemsCount: newItems.length,
            totalValue: grandTotal,
          },
        });
      }

      const addedNewItems = newItems.filter(i => i.unitPrice && i.expiryDate).length;
      const skippedNewItems = newItems.length - addedNewItems;

      toast({
        title: 'Inventory updated successfully',
        description: `Updated ${matchedItems.length} existing items, added ${addedNewItems} new items.${skippedNewItems > 0 ? ` ${skippedNewItems} items skipped (missing price/expiry).` : ''}`,
      });

      // Reset and close
      resetScanner();
      onOpenChange(false);

    } catch (err) {
      console.error('Error applying to inventory:', err);
      toast({
        title: 'Error',
        description: 'Failed to update inventory',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setUploadedImages([]);
    setExtractedItems([]);
    setShowReviewDashboard(false);
    setProcessingProgress(0);
    setCurrentProcessingPage(0);
    setGlobalExpiryDate('');
    setVerifyAll(false);
    setError(null);
    setExtractedInvoiceTotal(null);
  };

  const matchedCount = extractedItems.filter(i => i.matched).length;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetScanner();
      onOpenChange(open);
    }}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-3 sm:p-4">
        <DialogHeader className="pb-2 space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg flex-wrap">
            <FileImage className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Invoice Scanner</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {defaultMargin}% margin
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Upload invoice pages for AI extraction
          </DialogDescription>
        </DialogHeader>

        {!showReviewDashboard ? (
          // Upload & Processing View
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Image Upload Area */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <label className="flex-shrink-0 w-full sm:w-32 h-24 sm:h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Camera className="h-6 sm:h-8 w-6 sm:w-8 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground text-center">Add Pages</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Image Thumbnails */}
              <ScrollArea className="flex-1 w-full">
                <div className="flex flex-wrap sm:flex-nowrap gap-2 pb-2">
                  {uploadedImages.map((img, index) => (
                    <div key={img.id} className="relative flex-shrink-0">
                      <img
                        src={img.preview}
                        alt={`Page ${index + 1}`}
                        className={`w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-lg border-2 ${
                          img.processed ? 'border-green-500' : 'border-border'
                        }`}
                      />
                      <Badge 
                        variant="secondary" 
                        className="absolute top-1 left-1 text-[10px] h-5"
                      >
                        {index + 1}
                      </Badge>
                      {img.processed && (
                        <div className="absolute top-1 right-1 h-4 w-4 sm:h-5 sm:w-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute bottom-1 right-1 h-5 w-5 sm:h-6 sm:w-6"
                        onClick={() => removeImage(img.id)}
                        disabled={isProcessing}
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Processing Progress */}
            {isProcessing && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Page {currentProcessingPage} of {uploadedImages.length}...
                  </span>
                  <span className="text-muted-foreground">{Math.round(processingProgress)}%</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 border border-destructive/30 bg-destructive/5 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleProcessImages}
                disabled={isProcessing || uploadedImages.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Extract from {uploadedImages.length} Page{uploadedImages.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              {uploadedImages.length > 0 && (
                <Button variant="outline" onClick={resetScanner} disabled={isProcessing}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        ) : (
          // Review Dashboard
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            {/* Compact Margin & Expiry Controls - Responsive */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 p-2 border rounded-md bg-muted/20 text-xs overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="font-medium">Retail:</span>
                <Slider
                  value={[retailMarginPercent]}
                  onValueChange={([v]) => setRetailMarginPercent(v)}
                  min={5}
                  max={100}
                  step={1}
                  className="w-16 sm:w-20"
                />
                <span className="font-mono w-8">{retailMarginPercent}%</span>
              </div>
              
              <div className="hidden sm:block h-4 w-px bg-border" />
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Wholesale:</span>
                <Slider
                  value={[wholesaleMarginPercent]}
                  onValueChange={([v]) => setWholesaleMarginPercent(v)}
                  min={1}
                  max={50}
                  step={1}
                  className="w-16 sm:w-20"
                />
                <span className="font-mono w-8">{wholesaleMarginPercent}%</span>
              </div>
              
              <div className="hidden sm:block h-4 w-px bg-border" />
              
              <Button variant="secondary" size="sm" onClick={applyDefaultPrices} className="h-6 text-xs px-2">
                <Wand2 className="h-3 w-3 mr-1" />
                Apply
              </Button>
              
              <div className="h-4 w-px bg-border" />
              
              {/* Quick Expiry inline */}
              <span className="font-medium">Expiry:</span>
              <Button variant="outline" size="sm" onClick={() => applyQuickExpiry(1)} className="h-6 text-[10px] px-1.5">+1Y</Button>
              <Button variant="outline" size="sm" onClick={() => applyQuickExpiry(2)} className="h-6 text-[10px] px-1.5">+2Y</Button>
              <Input
                type="date"
                value={globalExpiryDate}
                onChange={(e) => setGlobalExpiryDate(e.target.value)}
                className="h-6 w-28 text-[10px] px-1"
              />
              <Button variant="outline" size="sm" onClick={applyGlobalExpiry} disabled={!globalExpiryDate} className="h-6 text-[10px] px-1.5">Set</Button>
              
              <div className="flex-1" />
              
              <Button variant="ghost" size="sm" onClick={addManualItem} className="h-6 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              
              <Badge variant="secondary" className="text-[10px] h-5">{matchedCount} matched</Badge>
              <Badge variant="outline" className="text-[10px] h-5">{Math.max(0, extractedItems.length - matchedCount)} new</Badge>
              {itemsMissingExpiry > 0 && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px] h-5">
                  {itemsMissingExpiry} no expiry
                </Badge>
              )}
            </div>

            {/* Removed duplicate toolbar - consolidated into single row above */}

            {extractedItems.length === 0 && (
              <div className="flex items-start gap-2 p-3 border border-warning/30 bg-warning/5 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <div className="font-medium">No items extracted</div>
                  <div className="text-muted-foreground">
                    If the invoice is handwritten/blurred, AI may not read it. You can add items manually (Add Item) or retake a clearer photo.
                  </div>
                </div>
              </div>
            )}

            {/* Data Table - Horizontally scrollable on mobile */}
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden flex flex-col">
              <div className="overflow-auto flex-1">
                <div className="min-w-[700px]">
                  <table className="w-full text-sm">
                    {/* Table Header */}
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                      <tr className="border-b">
                        <th className="text-left font-medium p-2 w-8">#</th>
                        <th className="text-left font-medium p-2 min-w-[140px]">Product</th>
                        <th className="text-center font-medium p-2 w-16">Qty</th>
                        <th className="text-right font-medium p-2 w-20">Cost</th>
                        <th className="text-right font-medium p-2 w-20">Total</th>
                        <th className="text-right font-medium p-2 w-20">Retail</th>
                        <th className="text-right font-medium p-2 w-20">W/Sale</th>
                        <th className="text-center font-medium p-2 w-28">Expiry</th>
                        <th className="w-8 p-2"></th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody>
                      <AnimatePresence>
                        {extractedItems.map((item, index) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`border-b ${
                              item.hasError
                                ? 'bg-destructive/10'
                                : item.matched
                                  ? 'bg-green-500/5'
                                  : 'bg-yellow-50/50'
                            }`}
                          >
                            {/* S/N */}
                            <td className="p-2 text-muted-foreground text-xs">{index + 1}</td>

                            {/* Product Name */}
                            <td className="p-2">
                              <Input
                                value={item.productName}
                                onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                                className="h-7 text-xs font-medium"
                              />
                              <span className={`text-[10px] ${item.matched ? 'text-green-600' : 'text-yellow-600'}`}>
                                {item.matched ? `✓ ${item.matched.name.substring(0, 20)}` : '⚠ New'}
                              </span>
                            </td>

                            {/* Quantity */}
                            <td className="p-2">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className={`h-7 text-center text-xs w-full ${!item.quantity ? 'border-destructive' : ''}`}
                              />
                            </td>

                            {/* Unit Cost */}
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                value={item.unitPrice || ''}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || null)}
                                className={`h-7 text-right text-xs w-full ${!item.unitPrice ? 'border-destructive' : ''}`}
                                placeholder="0"
                              />
                            </td>

                            {/* Row Total */}
                            <td className="p-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {formatPrice(item.rowTotal)}
                            </td>

                            {/* Retail */}
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                value={item.sellingPrice || ''}
                                onChange={(e) => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || null)}
                                className={`h-7 text-right text-xs w-full ${!item.sellingPrice ? 'bg-blue-50' : ''}`}
                                placeholder={item.unitPrice ? `~${calculateRetailPrice(item.unitPrice)}` : ''}
                              />
                            </td>

                            {/* Wholesale */}
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                value={item.wholesalePrice || ''}
                                onChange={(e) => updateItem(item.id, 'wholesalePrice', parseFloat(e.target.value) || null)}
                                className={`h-7 text-right text-xs w-full ${!item.wholesalePrice ? 'bg-blue-50' : ''}`}
                                placeholder={item.unitPrice ? `~${calculateWholesalePrice(item.unitPrice)}` : ''}
                              />
                            </td>

                            {/* Expiry Date */}
                            <td className="p-2">
                              <Input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value || null)}
                                className={`h-7 text-xs w-full ${!item.expiryDate ? 'bg-yellow-100 border-yellow-400' : ''}`}
                              />
                            </td>

                            {/* Remove */}
                            <td className="p-2">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.id)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Compact Footer - Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border rounded-md bg-muted/20 gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowReviewDashboard(false)} className="h-8">
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>

                {hasInvalidItems && (
                  <Badge variant="destructive" className="animate-pulse text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {extractedItems.filter(i => i.hasError).length} issues
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Totals */}
                {extractedInvoiceTotal !== null && (
                  <div className={`text-right px-2 py-1 rounded ${hasTotalMismatch ? 'bg-destructive/10' : 'bg-green-50'}`}>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {hasTotalMismatch && <TriangleAlert className="h-2.5 w-2.5 text-destructive" />}
                      Invoice
                    </div>
                    <div className={`text-sm font-semibold ${hasTotalMismatch ? 'text-destructive' : 'text-green-700'}`}>
                      {formatPrice(extractedInvoiceTotal)}
                    </div>
                  </div>
                )}

                <div className="text-right px-2">
                  <div className="text-[10px] text-muted-foreground">Calculated</div>
                  <div className={`text-sm sm:text-lg font-bold ${hasTotalMismatch ? 'text-destructive' : 'text-primary'}`}>
                    {formatPrice(grandTotal)}
                  </div>
                </div>

                <Button
                  onClick={handleApplyToInventory}
                  disabled={isApplying || hasInvalidItems || extractedItems.length === 0}
                  className="h-9"
                >
                  {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  {isApplying ? 'Applying...' : 'Apply'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Zoom feature removed - not practical with multiple invoices */}
      </DialogContent>
    </Dialog>
  );
};