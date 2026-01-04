import { useState, useCallback, useEffect, useRef } from 'react';
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
  Plus, Minus, Trash2, Calendar, ChevronDown, ChevronUp,
  Edit3, Save, RefreshCw, Eye, Wand2, ZoomIn, TriangleAlert
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, addYears } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Medication } from '@/types/medication';
import { callPharmacyAiWithFallback, PharmacyAiError } from '@/lib/pharmacyAiClient';
import { getPharmacyAiUiError } from '@/utils/pharmacyAiUiError';


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
  
  // Zoom-on-focus state
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomVisible, setZoomVisible] = useState(false);
  
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

  // Process all images with AI
  const handleProcessImages = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);
    setExtractedItems([]);

    const allItems: ExtractedItem[] = [];
    const totalImages = uploadedImages.length;

    try {
      if (!pharmacy?.id) {
        setError('No pharmacy selected. Please reload and try again.');
        return;
      }

      for (let i = 0; i < uploadedImages.length; i++) {
        setCurrentProcessingPage(i + 1);
        setProcessingProgress(((i) / totalImages) * 100);

        const image = uploadedImages[i];

        try {
          const maxAttempts = 3;
          let lastErr: unknown = null;
          let data: any = null;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              data = await callPharmacyAiWithFallback<any>({
                actions: ['scan_invoice', 'invoice_scan'],
                payload: {
                  imageUrl: image.preview,
                  imageBase64: image.preview,
                  isMultiPage: true,
                  pageNumber: i + 1,
                  totalPages: totalImages,
                },
                pharmacy_id: pharmacy.id,
              });
              break;
            } catch (err) {
              lastErr = err;
              if (err instanceof PharmacyAiError && err.status === 429 && attempt < maxAttempts) {
                // Client-side backoff (the backend may also be retrying)
                await new Promise((r) => setTimeout(r, 1200 * attempt));
                continue;
              }
              throw err;
            }
          }

          if (!data) {
            throw lastErr ?? new Error('AI request failed');
          }

          if (data?.rateLimited) {
            // Some backends respond with 200 + { rateLimited: true } instead of HTTP 429
            throw new PharmacyAiError('Rate limited', { status: 429, bodyText: JSON.stringify(data) });
          }

          if (data.items && Array.isArray(data.items)) {
            const processedItems: ExtractedItem[] = data.items.map((raw: any) => {
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
              const unitPrice = typeof unitPriceRaw === 'number' ? unitPriceRaw : Number(unitPriceRaw);
              const normalizedUnitPrice = Number.isFinite(unitPrice) ? unitPrice : null;

              const sellingPriceRaw = raw?.sellingPrice ?? raw?.selling_price ?? raw?.retail_price ?? raw?.unit_retail ?? null;
              const sellingPriceNum = typeof sellingPriceRaw === 'number' ? sellingPriceRaw : Number(sellingPriceRaw);
              const sellingPrice = Number.isFinite(sellingPriceNum) ? sellingPriceNum : null;

              const wholesalePriceRaw = raw?.wholesalePrice ?? raw?.wholesale_price ?? raw?.w_sale ?? raw?.wholesale ?? null;
              const wholesalePriceNum = typeof wholesalePriceRaw === 'number' ? wholesalePriceRaw : Number(wholesalePriceRaw);
              const wholesalePrice = Number.isFinite(wholesalePriceNum) ? wholesalePriceNum : null;

              const qty = Number(raw?.quantity ?? 1) || 1;
              const rowTotal = (normalizedUnitPrice ?? 0) * qty;

              return {
                id: generateId(),
                productName,
                quantity: qty,
                unitPrice: normalizedUnitPrice,
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

            // Extract invoice total if available
            const invoiceTotalRaw = data.invoiceTotal ?? data.invoice_total ?? data.grandTotal ?? data.total;
            const invoiceTotal = typeof invoiceTotalRaw === 'number' ? invoiceTotalRaw : Number(invoiceTotalRaw);
            if (Number.isFinite(invoiceTotal) && invoiceTotal > 0) {
              setExtractedInvoiceTotal((prev) => (prev ?? 0) + invoiceTotal);
            }

            allItems.push(...processedItems);
          }

          // Mark image as processed
          setUploadedImages(prev => prev.map(img =>
            img.id === image.id ? { ...img, processed: true } : img
          ));

          setProcessingProgress(((i + 1) / totalImages) * 100);
        } catch (err) {
          console.error(`Error processing page ${i + 1}:`, err);

          const { message, status, debug } = getPharmacyAiUiError(err);
          if (status) console.warn('[multi-invoice-scan] pharmacy-ai error', { status, debug, page: i + 1 });

          if (status === 401 || status === 403) {
            setError(message);
            break;
          }

          // For rate-limit and other per-page errors, continue scanning the next page
          continue;
        }
      }

      // Deduplicate items by product name (combine quantities for same products)
      const deduplicatedItems = allItems.reduce((acc, item) => {
        const existingIndex = acc.findIndex(
          (existing) =>
            existing.productName.toLowerCase() === item.productName.toLowerCase() &&
            existing.batchNumber === item.batchNumber
        );

        if (existingIndex >= 0) {
          acc[existingIndex].quantity += item.quantity;
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
          description: `Extracted ${deduplicatedItems.length} unique items from ${totalImages} pages`,
        });
      }

    } catch (err) {
      console.error('Error processing invoices:', err);
      setError('Failed to process invoices. Please try again.');
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

  // Show zoom preview of invoice
  const handleFocusZoom = (fieldIndex: number) => {
    // Use the first uploaded image for zoom preview
    if (uploadedImages.length > 0) {
      setZoomImageUrl(uploadedImages[0].preview);
      setZoomVisible(true);
    }
  };

  const closeZoom = () => {
    setZoomVisible(false);
    setZoomImageUrl(null);
  };


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
    setZoomVisible(false);
    setZoomImageUrl(null);
  };

  const matchedCount = extractedItems.filter(i => i.matched).length;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetScanner();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-6xl max-h-[95vh] min-h-0 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileImage className="h-5 w-5 text-primary" />
            AI Multi-Page Invoice Scanner
            <Badge variant="outline" className="ml-2 text-xs">
              Auto-Margin: {defaultMargin}%
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Upload multiple invoice pages - AI extracts and combines all products
          </DialogDescription>
        </DialogHeader>

        {!showReviewDashboard ? (
          // Upload & Processing View
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Image Upload Area */}
            <div className="flex gap-4">
              <label className="flex-shrink-0 w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Camera className="h-8 w-8 text-muted-foreground mb-1" />
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
              <ScrollArea className="flex-1">
                <div className="flex gap-2 pb-2">
                  {uploadedImages.map((img, index) => (
                    <div key={img.id} className="relative flex-shrink-0">
                      <img
                        src={img.preview}
                        alt={`Page ${index + 1}`}
                        className={`w-28 h-28 object-cover rounded-lg border-2 ${
                          img.processed ? 'border-green-500' : 'border-border'
                        }`}
                      />
                      <Badge 
                        variant="secondary" 
                        className="absolute top-1 left-1 text-[10px] h-5"
                      >
                        Page {index + 1}
                      </Badge>
                      {img.processed && (
                        <div className="absolute top-1 right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute bottom-1 right-1 h-6 w-6"
                        onClick={() => removeImage(img.id)}
                        disabled={isProcessing}
                      >
                        <X className="h-3 w-3" />
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
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Margin Controls */}
            <div className="flex flex-wrap items-center gap-4 p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium whitespace-nowrap">Retail Margin:</span>
                <div className="flex items-center gap-2 w-40">
                  <Slider
                    value={[retailMarginPercent]}
                    onValueChange={([v]) => setRetailMarginPercent(v)}
                    min={5}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{retailMarginPercent}%</span>
                </div>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium whitespace-nowrap">Wholesale Margin:</span>
                <div className="flex items-center gap-2 w-40">
                  <Slider
                    value={[wholesaleMarginPercent]}
                    onValueChange={([v]) => setWholesaleMarginPercent(v)}
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{wholesaleMarginPercent}%</span>
                </div>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={applyDefaultPrices}
                      className="h-8"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Defaults
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fill empty Retail & Wholesale prices using margins above</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg bg-muted/20">
              {/* Quick Expiry Picker */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Quick Expiry:</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickExpiry(1)}
                    className="h-7 text-xs"
                  >
                    +1 Year
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickExpiry(2)}
                    className="h-7 text-xs"
                  >
                    +2 Years
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickExpiry(3)}
                    className="h-7 text-xs"
                  >
                    +3 Years
                  </Button>
                </div>
              </div>

              <div className="h-6 w-px bg-border" />

              {/* Global Expiry Input */}
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={globalExpiryDate}
                  onChange={(e) => setGlobalExpiryDate(e.target.value)}
                  className="h-7 w-36 text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={applyGlobalExpiry}
                  disabled={!globalExpiryDate}
                  className="h-7 text-xs"
                >
                  Apply to Empty
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={addManualItem}
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Item
              </Button>

              <div className="flex-1" />

              {/* Summary */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{matchedCount} matched</Badge>
                <Badge variant="outline">{Math.max(0, extractedItems.length - matchedCount)} new</Badge>
                {itemsMissingExpiry > 0 && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {itemsMissingExpiry} missing expiry
                  </Badge>
                )}
              </div>
            </div>

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

            {/* Data Table - Scrollable container with fixed height */}
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
              <div className="overflow-auto flex-1">
                <div className="min-w-[1100px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[50px_1fr_70px_100px_100px_100px_100px_120px_50px] gap-2 p-3 border-b bg-muted/30 font-medium text-sm sticky top-0 z-10 bg-background">
                    <div>S/N</div>
                    <div>Product Name</div>
                    <div className="text-center">Qty</div>
                    <div className="text-right">Unit Cost</div>
                    <div className="text-right">Row Total</div>
                    <div className="text-right">Retail</div>
                    <div className="text-right">Wholesale</div>
                    <div className="text-center">Expiry Date</div>
                    <div></div>
                  </div>

                  {/* Table Body */}
                  <AnimatePresence>
                    {extractedItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.03 }}
                        className={`grid grid-cols-[50px_1fr_70px_100px_100px_100px_100px_120px_50px] gap-2 p-3 border-b items-center text-sm ${
                          item.hasError
                            ? 'bg-destructive/10 border-destructive/30'
                            : item.matched
                              ? 'bg-green-500/5'
                              : 'bg-warning/5'
                        }`}
                      >
                        {/* S/N */}
                        <div className="text-muted-foreground">{index + 1}</div>

                        {/* Product Name */}
                        <div className="flex flex-col">
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                            className="h-7 text-sm font-medium border-transparent hover:border-border focus:border-primary"
                          />
                          {item.matched ? (
                            <span className="text-xs text-green-600 mt-0.5">✓ {item.matched.name}</span>
                          ) : (
                            <span className="text-xs text-warning mt-0.5">⚠ New item</span>
                          )}
                        </div>

                        {/* Quantity */}
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className={`h-7 text-center text-sm ${
                            !item.quantity || item.quantity <= 0 ? 'border-destructive' : ''
                          }`}
                        />

                        {/* Unit Cost */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.unitPrice || ''}
                                  onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || null)}
                                  onFocus={() => handleFocusZoom(index)}
                                  className={`h-7 text-right text-sm pr-6 ${
                                    !item.unitPrice || item.unitPrice <= 0 ? 'border-destructive' : ''
                                  }`}
                                  placeholder="0.00"
                                />
                                <ZoomIn className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Click to zoom into invoice</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Row Total (live calculated) */}
                        <div className="text-right text-sm font-medium text-muted-foreground">
                          {formatPrice(item.rowTotal)}
                        </div>

                        {/* Retail */}
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.sellingPrice || ''}
                          onChange={(e) => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || null)}
                          className={`h-7 text-right text-sm ${
                            !item.sellingPrice ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          placeholder={item.unitPrice ? `~${calculateRetailPrice(item.unitPrice)}` : '0.00'}
                        />

                        {/* Wholesale */}
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.wholesalePrice || ''}
                          onChange={(e) => updateItem(item.id, 'wholesalePrice', parseFloat(e.target.value) || null)}
                          className={`h-7 text-right text-sm ${
                            !item.wholesalePrice ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          placeholder={item.unitPrice ? `~${calculateWholesalePrice(item.unitPrice)}` : '0.00'}
                        />

                        {/* Expiry Date - highlight yellow if missing */}
                        <Input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value || null)}
                          className={`h-7 text-xs ${
                            !item.expiryDate ? 'bg-yellow-100 border-yellow-400' : ''
                          }`}
                        />

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer with Grand Total and Math Validation */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewDashboard(false)}
                >
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Back to Upload
                </Button>

                {hasInvalidItems && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {extractedItems.filter(i => i.hasError).length} items need attention
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Invoice Total Comparison */}
                {extractedInvoiceTotal !== null && (
                  <div className={`text-right p-2 rounded-lg ${hasTotalMismatch ? 'bg-destructive/10 border border-destructive/30' : 'bg-green-50 border border-green-200'}`}>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {hasTotalMismatch && <TriangleAlert className="h-3 w-3 text-destructive" />}
                      Invoice Total
                    </div>
                    <div className={`text-lg font-semibold ${hasTotalMismatch ? 'text-destructive' : 'text-green-700'}`}>
                      {formatPrice(extractedInvoiceTotal)}
                    </div>
                    {hasTotalMismatch && (
                      <div className="text-xs text-destructive mt-0.5">
                        Diff: {formatPrice(Math.abs(calculatedGrandTotal - extractedInvoiceTotal))}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Calculated Total</div>
                  <div className={`text-2xl font-bold ${hasTotalMismatch ? 'text-destructive' : 'text-primary'}`}>
                    {formatPrice(grandTotal)}
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={handleApplyToInventory}
                  disabled={isApplying || hasInvalidItems || extractedItems.length === 0}
                  className="min-w-[150px]"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply to Inventory
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Zoom Modal for Invoice Preview */}
        {zoomVisible && zoomImageUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={closeZoom}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-auto bg-background rounded-lg p-2">
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={closeZoom}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={zoomImageUrl}
                alt="Invoice zoom"
                className="max-w-full max-h-[85vh] object-contain"
              />
              <div className="text-center text-sm text-muted-foreground mt-2">
                Click anywhere to close
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};