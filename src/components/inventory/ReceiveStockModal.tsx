import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Package, Search, ScanBarcode, Plus, Minus, Check, Zap, Volume2, VolumeX } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import type { Medication } from '@/types/medication';

interface ReceiveStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StockItem {
  medication: Medication;
  quantity: number;
}

// Audio feedback for rapid scan mode
const playBeep = (success: boolean = true) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = success ? 800 : 300;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported
  }
};

export const ReceiveStockModal = ({ open, onOpenChange }: ReceiveStockModalProps) => {
  const { medications, updateMedication } = useMedications();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [stockItems, setStockItems] = useState<Map<string, StockItem>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Rapid scan mode features
  const [rapidMode, setRapidMode] = useState(false);
  const [quantityMultiplier, setQuantityMultiplier] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setScanCount(0);
    }
  }, [open]);

  // Filter medications
  const filteredMedications = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return medications.slice(0, 50);

    return medications.filter(
      (med) =>
        med.name.toLowerCase().includes(query) ||
        med.category.toLowerCase().includes(query) ||
        med.batch_number.toLowerCase().includes(query) ||
        med.barcode_id?.toLowerCase().includes(query)
    );
  }, [medications, searchQuery]);

  // Handle barcode scan
  const handleBarcodeScan = useCallback((barcode: string) => {
    const medication = medications.find(
      (med) => med.barcode_id === barcode || med.batch_number === barcode
    );

    if (medication) {
      addOrIncrementItem(medication, quantityMultiplier);
      setScanCount(prev => prev + 1);
      
      if (soundEnabled) playBeep(true);
      
      toast({
        title: rapidMode ? `+${quantityMultiplier} scanned` : 'Item scanned',
        description: `${medication.name}`,
        duration: rapidMode ? 1500 : 3000,
      });
      
      // In rapid mode, keep scanner open
      if (!rapidMode) {
        setScannerOpen(false);
      }
    } else {
      if (soundEnabled) playBeep(false);
      setSearchQuery(barcode);
      toast({
        title: 'Item not found',
        description: `Searching for: ${barcode}`,
      });
      setScannerOpen(false);
    }
  }, [medications, toast, quantityMultiplier, soundEnabled, rapidMode]);

  // Auto-detect hardware barcode scanner
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: open && !scannerOpen,
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys 1-9 for quick multiplier in rapid mode
      if (rapidMode && e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT') {
          setQuantityMultiplier(parseInt(e.key));
          toast({
            title: `Multiplier: ×${e.key}`,
            description: 'Next scan will add this many',
            duration: 1500,
          });
        }
      }
      
      // S key to toggle scanner
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT') {
          setScannerOpen(true);
        }
      }
      
      // Enter to submit when items exist
      if (e.key === 'Enter' && e.ctrlKey && stockItems.size > 0) {
        handleReceiveStock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, rapidMode, stockItems.size]);

  const addOrIncrementItem = (medication: Medication, qty: number = 1) => {
    setStockItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(medication.id);
      
      if (existing) {
        newMap.set(medication.id, { ...existing, quantity: existing.quantity + qty });
      } else {
        newMap.set(medication.id, { medication, quantity: qty });
      }
      
      return newMap;
    });
  };

  const updateQuantity = (medicationId: string, quantity: number) => {
    setStockItems(prev => {
      const newMap = new Map(prev);
      const item = newMap.get(medicationId);
      
      if (item) {
        if (quantity <= 0) {
          newMap.delete(medicationId);
        } else {
          newMap.set(medicationId, { ...item, quantity });
        }
      }
      
      return newMap;
    });
  };

  const removeItem = (medicationId: string) => {
    setStockItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(medicationId);
      return newMap;
    });
  };

  const handleReceiveStock = async () => {
    if (stockItems.size === 0) return;
    
    setIsProcessing(true);
    
    try {
      const promises = Array.from(stockItems.values()).map(item => 
        updateMedication.mutateAsync({
          id: item.medication.id,
          current_stock: item.medication.current_stock + item.quantity,
        })
      );
      
      await Promise.all(promises);
      
      if (soundEnabled) {
        // Success sound
        playBeep(true);
        setTimeout(() => playBeep(true), 100);
      }
      
      toast({
        title: 'Stock Updated',
        description: `${stockItems.size} item(s) received and inventory updated.`,
      });
      
      setStockItems(new Map());
      setScanCount(0);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update some items. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = Array.from(stockItems.values()).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              Receive Stock
              {rapidMode && (
                <Badge variant="default" className="ml-2 gap-1 animate-pulse">
                  <Zap className="h-3 w-3" />
                  Rapid Mode
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Scan or select items to add to inventory after purchase
            </DialogDescription>
          </DialogHeader>

          {/* Rapid Mode Controls */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                id="rapid-mode"
                checked={rapidMode}
                onCheckedChange={setRapidMode}
              />
              <Label htmlFor="rapid-mode" className="flex items-center gap-1 cursor-pointer">
                <Zap className="h-4 w-4" />
                Rapid Scan
              </Label>
            </div>
            
            {rapidMode && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Qty:</Label>
                  <div className="flex items-center border rounded-md">
                    {[1, 5, 10, 12, 24].map(num => (
                      <Button
                        key={num}
                        variant={quantityMultiplier === num ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => setQuantityMultiplier(num)}
                      >
                        ×{num}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
                
                {scanCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {scanCount} scans this session
                  </Badge>
                )}
              </>
            )}
          </div>

          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* Left: Search & Select */}
            <div className="flex-1 flex flex-col">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search medications... (press S to scan)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={rapidMode ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setScannerOpen(true)}
                  className={rapidMode ? 'animate-pulse' : ''}
                >
                  <ScanBarcode className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredMedications.map(med => {
                    const isSelected = stockItems.has(med.id);
                    
                    return (
                      <div
                        key={med.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          addOrIncrementItem(med, rapidMode ? quantityMultiplier : 1);
                          if (soundEnabled && rapidMode) playBeep(true);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{med.name}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{med.category}</span>
                            <span>•</span>
                            <span>Stock: {med.current_stock}</span>
                            {med.barcode_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{med.barcode_id}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isSelected ? (
                          <Badge variant="default" className="ml-2">
                            +{stockItems.get(med.id)?.quantity}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Plus className="h-4 w-4" />
                            {rapidMode && <span className="text-xs">×{quantityMultiplier}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Selected Items */}
            <div className="w-80 flex flex-col">
              <div className="text-sm font-medium mb-3 flex items-center justify-between">
                <span>Items to Receive</span>
                {stockItems.size > 0 && (
                  <Badge variant="secondary">{totalItems} units</Badge>
                )}
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-2 space-y-2">
                  {stockItems.size === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Scan or select items</p>
                      <p className="text-xs mt-1 opacity-60">
                        {rapidMode ? 'Press 1-9 for quick multiplier' : 'Enable Rapid Mode for faster entry'}
                      </p>
                    </div>
                  ) : (
                    Array.from(stockItems.values()).map(({ medication, quantity }) => (
                      <div key={medication.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="font-medium text-sm truncate mb-2">
                          {medication.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(medication.id, quantity - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => updateQuantity(medication.id, parseInt(e.target.value) || 0)}
                              className="h-8 w-16 text-center text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(medication.id, quantity + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(medication.id);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          New stock: {medication.current_stock} → {medication.current_stock + quantity}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <div className="flex-1 text-xs text-muted-foreground hidden sm:block">
              {rapidMode && 'Press 1-9 for multiplier • S to scan • Ctrl+Enter to save'}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReceiveStock}
              disabled={stockItems.size === 0 || isProcessing}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? 'Updating...' : `Receive ${totalItems} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScan}
      />
    </>
  );
};
