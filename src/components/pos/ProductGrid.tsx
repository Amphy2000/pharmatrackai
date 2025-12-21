import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, ScanBarcode, AlertTriangle, XCircle } from 'lucide-react';
import { Medication } from '@/types/medication';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarcodeScanner } from './BarcodeScanner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import { isBefore, parseISO } from 'date-fns';

interface ProductGridProps {
  medications: Medication[];
  onAddToCart: (medication: Medication) => void;
  isLoading: boolean;
}

export const ProductGrid = ({ medications, onAddToCart, isLoading }: ProductGridProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const isExpired = (expiryDate: string): boolean => {
    return isBefore(parseISO(expiryDate), new Date());
  };

  // Handle barcode scan (from camera or hardware scanner)
  const handleBarcodeScan = useCallback((barcode: string) => {
    const medication = medications.find(
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
  }, [medications, onAddToCart, toast]);

  // Auto-detect hardware barcode scanner input
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !scannerOpen, // Disable when camera scanner is open
  });

  const filteredMedications = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return medications;

    return medications.filter(
      (med) =>
        med.name.toLowerCase().includes(query) ||
        med.category.toLowerCase().includes(query) ||
        med.batch_number.toLowerCase().includes(query) ||
        med.barcode_id?.toLowerCase().includes(query)
    );
  }, [medications, searchQuery]);

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
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50"
          />
        </div>
        <Button
          onClick={() => setScannerOpen(true)}
          variant="outline"
          className="h-12 gap-2 px-4 rounded-xl border-primary/30 hover:bg-primary/10"
        >
          <ScanBarcode className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Scan</span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        {filteredMedications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-30" />
            <p>No medications found</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
            {filteredMedications.map((medication) => {
              const expired = isExpired(medication.expiry_date);
              const lowStock = isLowStock(medication.current_stock, medication.reorder_level);
              const outOfStock = medication.current_stock === 0;
              const price = medication.selling_price || medication.unit_price;

              return (
                <button
                  key={medication.id}
                  onClick={() => onAddToCart(medication)}
                  disabled={expired || outOfStock}
                  className={`group relative p-4 rounded-xl text-left transition-all duration-200 border
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
                    {expired && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {!expired && lowStock && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
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
                          <Plus className="h-4 w-4 text-primary-foreground" />
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
    </div>
  );
};
