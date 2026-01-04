import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Camera, Scan, Loader2, Check, X, Plus, Calendar, Package, Trash2, AlertCircle } from 'lucide-react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { callPharmacyAiWithFallback } from '@/lib/pharmacyAiClient';
import { getPharmacyAiUiError } from '@/utils/pharmacyAiUiError';
import { format, isValid, parse } from 'date-fns';

interface PhotoExpiryScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpiryExtracted: (productName: string, expiryDate: string, manufacturingDate?: string) => void;
}

interface ScannedProduct {
  id: string;
  imageUrl: string;
  productName: string;
  expiryDate: string;
  manufacturingDate?: string;
  batchNumber?: string;
  confidence: 'high' | 'medium' | 'low';
  isProcessing?: boolean;
  error?: string;
}

export const PhotoExpiryScanModal = ({ open, onOpenChange, onExpiryExtracted }: PhotoExpiryScanModalProps) => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const processImage = async (imageUrl: string) => {
    const productId = generateId();
    
    // Add placeholder entry
    setScannedProducts(prev => [...prev, {
      id: productId,
      imageUrl,
      productName: '',
      expiryDate: '',
      confidence: 'low',
      isProcessing: true,
    }]);

    try {
      if (!pharmacy?.id) {
        throw new Error('No pharmacy selected');
      }

      const data = await callPharmacyAiWithFallback<any>({
        actions: ['scan_expiry', 'extract_expiry'],
        payload: { 
          imageUrl, 
          imageBase64: imageUrl,
          extractionType: 'product_packaging'
        },
        pharmacy_id: pharmacy.id,
      });

      if (data?.rateLimited) {
        throw new Error('AI is busy. Please wait and retry.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Parse the response
      const productName = data?.product_name || data?.productName || data?.name || 'Unknown Product';
      const expiryDate = data?.expiry_date || data?.expiryDate || '';
      const manufacturingDate = data?.manufacturing_date || data?.manufacturingDate || '';
      const batchNumber = data?.batch_number || data?.batchNumber || '';
      const confidence = data?.confidence || 'medium';

      // Normalize date format
      const normalizedExpiry = normalizeDate(expiryDate);

      setScannedProducts(prev => prev.map(p => 
        p.id === productId ? {
          ...p,
          productName,
          expiryDate: normalizedExpiry,
          manufacturingDate: normalizeDate(manufacturingDate),
          batchNumber,
          confidence,
          isProcessing: false,
        } : p
      ));

      if (normalizedExpiry) {
        toast({
          title: 'Expiry detected',
          description: `${productName}: Expires ${normalizedExpiry}`,
        });
      }
    } catch (err) {
      console.error('Error scanning expiry:', err);
      const { message } = getPharmacyAiUiError(err);
      
      setScannedProducts(prev => prev.map(p => 
        p.id === productId ? {
          ...p,
          isProcessing: false,
          error: message,
        } : p
      ));
    }
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Try various date formats
    const formats = [
      'yyyy-MM-dd',
      'dd/MM/yyyy',
      'MM/yyyy',
      'MMM yyyy',
      'MMMM yyyy',
      'dd-MM-yyyy',
      'yyyy/MM/dd',
    ];

    for (const fmt of formats) {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }

    // If it's just month/year, assume end of month
    const monthYearMatch = dateStr.match(/(\d{1,2})\/(\d{4})/);
    if (monthYearMatch) {
      const [, month, year] = monthYearMatch;
      return `${year}-${month.padStart(2, '0')}-28`;
    }

    return dateStr;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsCapturing(true);

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }

    setIsCapturing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateProduct = (id: string, field: keyof ScannedProduct, value: string) => {
    setScannedProducts(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const removeProduct = (id: string) => {
    setScannedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleApplyProduct = (product: ScannedProduct) => {
    if (!product.expiryDate) {
      toast({
        title: 'Missing expiry date',
        description: 'Please enter an expiry date before applying',
        variant: 'destructive',
      });
      return;
    }

    onExpiryExtracted(product.productName, product.expiryDate, product.manufacturingDate);
    removeProduct(product.id);
    
    toast({
      title: 'Applied to form',
      description: `${product.productName} expiry: ${product.expiryDate}`,
    });
  };

  const handleApplyAll = () => {
    const validProducts = scannedProducts.filter(p => p.expiryDate && !p.isProcessing && !p.error);
    
    if (validProducts.length === 0) {
      toast({
        title: 'No valid products',
        description: 'Scan products and ensure expiry dates are detected',
        variant: 'destructive',
      });
      return;
    }

    validProducts.forEach(product => {
      onExpiryExtracted(product.productName, product.expiryDate, product.manufacturingDate);
    });

    setScannedProducts([]);
    onOpenChange(false);

    toast({
      title: 'All products applied',
      description: `${validProducts.length} products ready for entry`,
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-700 border-green-300">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">Medium</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-700 border-red-300">Low</Badge>;
    }
  };

  const validCount = scannedProducts.filter(p => p.expiryDate && !p.isProcessing && !p.error).length;
  const processingCount = scannedProducts.filter(p => p.isProcessing).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scan className="h-5 w-5 text-primary" />
            Photo Expiry Scanner
          </DialogTitle>
          <DialogDescription>
            Take photos of product packaging - AI automatically extracts expiry dates
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Upload area */}
          <div className="flex gap-2">
            <label className="flex-1">
              <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Camera className="h-6 w-6 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Capture Product Photos</p>
                  <p className="text-xs text-muted-foreground">Tap to take photos or select from gallery</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Status bar */}
          {scannedProducts.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scanned:</span>
                <Badge variant="secondary">{scannedProducts.length} products</Badge>
                {processingCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {processingCount} processing
                  </Badge>
                )}
              </div>
              <Badge className="bg-green-500/20 text-green-700">
                {validCount} ready
              </Badge>
            </div>
          )}

          {/* Scanned products list */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {scannedProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No products scanned yet</p>
                  <p className="text-sm">Take photos of product packaging to extract expiry dates</p>
                </div>
              ) : (
                scannedProducts.map((product) => (
                  <Card key={product.id} className="p-3">
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={product.imageUrl} 
                          alt="Product" 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {product.isProcessing ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Processing image...</span>
                          </div>
                        ) : product.error ? (
                          <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {product.error}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Input
                                value={product.productName}
                                onChange={(e) => updateProduct(product.id, 'productName', e.target.value)}
                                placeholder="Product name"
                                className="h-8 text-sm"
                              />
                              {getConfidenceBadge(product.confidence)}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                                <Input
                                  type="date"
                                  value={product.expiryDate}
                                  onChange={(e) => updateProduct(product.id, 'expiryDate', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                              {product.batchNumber && (
                                <div className="flex-shrink-0">
                                  <Label className="text-xs text-muted-foreground">Batch</Label>
                                  <p className="text-sm font-mono">{product.batchNumber}</p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        {!product.isProcessing && !product.error && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600"
                            onClick={() => handleApplyProduct(product)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {validCount > 0 && (
            <Button onClick={handleApplyAll} className="gap-2">
              <Plus className="h-4 w-4" />
              Apply All ({validCount})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
