import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Plus, ScanBarcode, AlertTriangle, XCircle, Link2, WifiOff, RefreshCw, Zap } from 'lucide-react';
import { Medication, CartItem } from '@/types/medication';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarcodeScanner } from './BarcodeScanner';
import { LinkBarcodeModal } from './LinkBarcodeModal';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/contexts/OfflineContext';
import { isBefore, parseISO } from 'date-fns';

interface ProductGridProps {
  medications: Medication[];
  onAddToCart: (medication: Medication) => void;
  isLoading: boolean;
  onQuickItemClick?: () => void;
  autoFocusSearch?: boolean;
}

export const ProductGrid = ({ medications, onAddToCart, isLoading, onQuickItemClick, autoFocusSearch = true }: ProductGridProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [linkBarcodeOpen, setLinkBarcodeOpen] = useState(false);
  const [medicationToLink, setMedicationToLink] = useState<Medication | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { isOnline, cacheMedications, getCachedMeds } = useOffline();

  // Auto-focus search input for keyboard-first experience
  useEffect(() => {
    if (autoFocusSearch && !isLoading) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [autoFocusSearch, isLoading]);

  // Cache medications whenever they update (for offline use)
  useEffect(() => {
    if (medications && medications.length > 0 && isOnline) {
      cacheMedications(medications);
    }
  }, [medications, isOnline, cacheMedications]);

  // Use cached medications if offline and no medications loaded
  const effectiveMedications = useMemo(() => {
    if (!isOnline && (!medications || medications.length === 0)) {
      return getCachedMeds() as Medication[];
    }
    return medications;
  }, [medications, isOnline, getCachedMeds]);

  const isExpired = (expiryDate: string): boolean => {
    return isBefore(parseISO(expiryDate), new Date());
  };

  // Handle barcode scan (from camera or hardware scanner)
  const handleBarcodeScan = useCallback((barcode: string) => {
    const medication = effectiveMedications.find(
      (med) => med.barcode_id === barcode || med.batch_number === barcode
    );

    if (medication) {
      if (medication.current_stock > 0 && !isExpired(medication.expiry_date)) {
        onAddToCart(medication);
        toast({
          title: 'Added to cart',
          description: `${medication.name} scanned and added`,
        });
      } else if (isExpired(medication.expiry_date)) {
        toast({
          title: 'Cannot add expired item',
          description: medication.name,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Out of stock',
          description: medication.name,
          variant: 'destructive',
        });
      }
    } else {
      setSearchQuery(barcode);
      toast({
        title: 'Item not found',
        description: `Searching for: ${barcode}`,
      });
    }
    setScannerOpen(false);
  }, [effectiveMedications, onAddToCart, toast]);

  // Auto-detect hardware barcode scanner input
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !scannerOpen, // Disable when camera scanner is open
  });

  const filteredMedications = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return effectiveMedications;

    return effectiveMedications.filter(
      (med) =>
        med.name.toLowerCase().includes(query) ||
        med.category.toLowerCase().includes(query) ||
        med.batch_number.toLowerCase().includes(query) ||
        med.barcode_id?.toLowerCase().includes(query) ||
        // Clinical search: match active ingredients
        (med as any).active_ingredients?.some((ingredient: string) => 
          ingredient.toLowerCase().includes(query)
        )
    );
  }, [effectiveMedications, searchQuery]);

  const isLowStock = (currentStock: number, reorderLevel: number): boolean => {
    return currentStock <= reorderLevel;
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search by name, ingredient, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 w-full rounded-xl bg-muted/30 border-border/50"
          />
        </div>
        {onQuickItemClick && (
          <Button
            onClick={onQuickItemClick}
            variant="outline"
            className="h-12 w-12 sm:w-auto shrink-0 gap-2 px-0 sm:px-3 rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            title="Quick Item (Express Sale)"
          >
            <Zap className="h-5 w-5" />
            <span className="hidden sm:inline">Quick</span>
          </Button>
        )}
        <Button
          onClick={() => setScannerOpen(true)}
          variant="outline"
          className="h-12 w-12 sm:w-auto shrink-0 gap-2 px-0 sm:px-4 rounded-xl border-primary/30 hover:bg-primary/10"
        >
          <ScanBarcode className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Scan</span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {filteredMedications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-30" />
            <p>No medications found</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 pr-4">
            {filteredMedications.map((medication) => {
              const expired = isExpired(medication.expiry_date);
              const lowStock = isLowStock(medication.current_stock, medication.reorder_level);
              const outOfStock = medication.current_stock === 0;
              const price = medication.selling_price || medication.unit_price;
              const hasNoBarcode = !medication.barcode_id;

              const handleClick = () => {
                // If no barcode and item is available, show link barcode modal
                if (hasNoBarcode && !expired && !outOfStock) {
                  setMedicationToLink(medication);
                  setLinkBarcodeOpen(true);
                } else {
                  onAddToCart(medication);
                }
              };

              return (
                <button
                  key={medication.id}
                  onClick={handleClick}
                  disabled={expired || outOfStock}
                  className={`group relative p-5 rounded-xl text-left transition-all duration-200 border min-h-[140px]
                    ${expired 
                      ? 'bg-destructive/5 border-destructive/20 cursor-not-allowed opacity-60' 
                      : outOfStock
                        ? 'bg-muted/30 border-border/50 cursor-not-allowed opacity-60'
                        : 'bg-muted/30 border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:shadow-glow-primary'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {medication.category}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {hasNoBarcode && !expired && !outOfStock && (
                        <Link2 className="h-4 w-4 text-amber-500" />
                      )}
                      {expired && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {!expired && lowStock && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </div>

                  <h4 className="font-medium text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                    {medication.name}
                  </h4>

                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <p className="text-lg font-bold text-primary tabular-nums">
                        {formatPrice(price)}
                      </p>
                      <p className={`text-xs ${outOfStock ? 'text-destructive' : lowStock ? 'text-warning' : 'text-muted-foreground'}`}>
                        {outOfStock ? 'Out of stock' : `${medication.current_stock} in stock`}
                      </p>
                    </div>

                    {!expired && !outOfStock && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          {hasNoBarcode ? (
                            <Link2 className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Plus className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {expired && (
                    <p className="text-xs text-destructive mt-2">Expired</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScan}
      />

      <LinkBarcodeModal
        medication={medicationToLink}
        open={linkBarcodeOpen}
        onOpenChange={setLinkBarcodeOpen}
        onLinked={() => {
          // After linking, add to cart
          if (medicationToLink) {
            onAddToCart(medicationToLink);
          }
          setMedicationToLink(null);
        }}
      />
    </div>
  );
};
