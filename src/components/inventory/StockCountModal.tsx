import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, ScanBarcode, Check, Printer, Upload, Trash2, Edit2 } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import { generateStockCountSheet } from '@/utils/stockCountSheetGenerator';
import type { Medication } from '@/types/medication';

interface StockCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CountItem {
  medication: Medication;
  countedQty: number;
  systemQty: number;
  variance: number;
}

export const StockCountModal = ({ open, onOpenChange }: StockCountModalProps) => {
  const { medications, updateMedication } = useMedications();
  const { toast } = useToast();
  
  const [scannerOpen, setScannerOpen] = useState(false);
  const [countItems, setCountItems] = useState<Map<string, CountItem>>(new Map());
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [activeTab, setActiveTab] = useState<string>('scan');
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input
  useEffect(() => {
    if (open && activeTab === 'scan') {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [open, activeTab]);

  // Handle barcode scan
  const handleBarcodeScan = useCallback((barcode: string) => {
    const medication = medications.find(
      (med) => med.barcode_id === barcode || med.batch_number === barcode
    );

    if (medication) {
      setCurrentBarcode(medication.barcode_id || medication.batch_number);
      toast({
        title: 'Item found',
        description: medication.name,
        duration: 1500,
      });
      // Focus on quantity input
      setTimeout(() => qtyInputRef.current?.focus(), 50);
    } else {
      toast({
        title: 'Item not found',
        description: `No medication with barcode: ${barcode}`,
        variant: 'destructive',
      });
    }
    setScannerOpen(false);
  }, [medications, toast]);

  // Auto-detect hardware barcode scanner
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: open && !scannerOpen && activeTab === 'scan',
  });

  // Add count from barcode/qty inputs
  const handleAddCount = () => {
    if (!currentBarcode || !currentQty) {
      toast({
        title: 'Missing data',
        description: 'Enter both barcode and quantity',
        variant: 'destructive',
      });
      return;
    }

    const medication = medications.find(
      (med) => 
        med.barcode_id === currentBarcode || 
        med.batch_number === currentBarcode ||
        med.name.toLowerCase() === currentBarcode.toLowerCase()
    );

    if (!medication) {
      toast({
        title: 'Item not found',
        description: `No medication matches: ${currentBarcode}`,
        variant: 'destructive',
      });
      return;
    }

    const qty = parseInt(currentQty);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Please enter a valid number',
        variant: 'destructive',
      });
      return;
    }

    setCountItems(prev => {
      const newMap = new Map(prev);
      newMap.set(medication.id, {
        medication,
        countedQty: qty,
        systemQty: medication.current_stock,
        variance: qty - medication.current_stock,
      });
      return newMap;
    });

    // Clear inputs and focus back to barcode
    setCurrentBarcode('');
    setCurrentQty('');
    barcodeInputRef.current?.focus();

    toast({
      title: 'Count recorded',
      description: `${medication.name}: ${qty} units`,
      duration: 1500,
    });
  };

  // Handle Enter key for auto-advance
  const handleKeyDown = (e: React.KeyboardEvent, field: 'barcode' | 'qty') => {
    if (e.key === 'Enter') {
      if (field === 'barcode' && currentBarcode) {
        qtyInputRef.current?.focus();
      } else if (field === 'qty' && currentQty) {
        handleAddCount();
      }
    }
  };

  // Bulk import from CSV-style text
  const handleBulkImport = () => {
    const lines = bulkImportText.trim().split('\n');
    let imported = 0;
    let failed = 0;

    lines.forEach(line => {
      const parts = line.split(/[,\t;]/);
      if (parts.length >= 2) {
        const barcode = parts[0].trim();
        const qty = parseInt(parts[1].trim());

        const medication = medications.find(
          (med) => 
            med.barcode_id === barcode || 
            med.batch_number === barcode ||
            med.name.toLowerCase() === barcode.toLowerCase()
        );

        if (medication && !isNaN(qty)) {
          setCountItems(prev => {
            const newMap = new Map(prev);
            newMap.set(medication.id, {
              medication,
              countedQty: qty,
              systemQty: medication.current_stock,
              variance: qty - medication.current_stock,
            });
            return newMap;
          });
          imported++;
        } else {
          failed++;
        }
      }
    });

    toast({
      title: 'Import complete',
      description: `${imported} items imported, ${failed} failed`,
    });
    setBulkImportText('');
  };

  // Update system stock with counted values
  const handleApplyCounts = async () => {
    if (countItems.size === 0) return;

    setIsProcessing(true);

    try {
      const promises = Array.from(countItems.values()).map(item =>
        updateMedication.mutateAsync({
          id: item.medication.id,
          current_stock: item.countedQty,
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Stock updated',
        description: `${countItems.size} items updated to counted values`,
      });

      setCountItems(new Map());
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update some items',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Print count sheet
  const handlePrintCountSheet = () => {
    const doc = generateStockCountSheet(medications);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const removeItem = (id: string) => {
    setCountItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const totalVariance = Array.from(countItems.values()).reduce((sum, item) => sum + Math.abs(item.variance), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5 text-primary" />
              Quick Stock Count
            </DialogTitle>
            <DialogDescription>
              Fast inventory counting with barcode scanning and bulk import
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scan">Scan Count</TabsTrigger>
              <TabsTrigger value="import">Bulk Import</TabsTrigger>
              <TabsTrigger value="print">Print Sheet</TabsTrigger>
            </TabsList>

            {/* Scan Count Tab */}
            <TabsContent value="scan" className="flex-1 flex flex-col overflow-hidden mt-4">
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex gap-2">
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Scan or enter barcode/name"
                    value={currentBarcode}
                    onChange={(e) => setCurrentBarcode(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'barcode')}
                    className="flex-1"
                  />
                  <Input
                    ref={qtyInputRef}
                    type="number"
                    placeholder="Qty"
                    value={currentQty}
                    onChange={(e) => setCurrentQty(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'qty')}
                    className="w-24"
                  />
                  <Button onClick={handleAddCount}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                  <ScanBarcode className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-muted-foreground mb-2">
                Scan → Enter quantity → Press Enter (auto-advances)
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-3">
                  {countItems.size === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>No items counted yet</p>
                      <p className="text-xs mt-1">Scan a barcode or type to start</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(countItems.values()).map(({ medication, countedQty, systemQty, variance }) => (
                        <div
                          key={medication.id}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            variance !== 0 ? 'border-warning bg-warning/5' : 'border-border'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{medication.name}</div>
                            <div className="text-xs text-muted-foreground">
                              System: {systemQty} → Counted: {countedQty}
                              {variance !== 0 && (
                                <span className={`ml-2 font-medium ${variance > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                  ({variance > 0 ? '+' : ''}{variance})
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(medication.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {countItems.size > 0 && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-medium">{countItems.size} items counted</span>
                    {totalVariance > 0 && (
                      <span className="text-muted-foreground ml-2">
                        • {totalVariance} total variance
                      </span>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Bulk Import Tab */}
            <TabsContent value="import" className="flex-1 flex flex-col mt-4">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground">
                  Paste data in format: <code className="bg-muted px-1 rounded">barcode,quantity</code> (one per line)
                </p>
              </div>
              <Textarea
                placeholder="6001234567890,25&#10;6009876543210,12&#10;Paracetamol 500mg,100"
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button 
                className="mt-3 w-full" 
                onClick={handleBulkImport}
                disabled={!bulkImportText.trim()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </TabsContent>

            {/* Print Sheet Tab */}
            <TabsContent value="print" className="flex-1 flex flex-col mt-4">
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-lg border-dashed">
                <Printer className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Print Count Sheet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Generate a printable checklist of all medications for manual counting. 
                  After counting, you can enter the values using the Scan Count tab.
                </p>
                <Button onClick={handlePrintCountSheet}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Stock Count Sheet
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCounts}
              disabled={countItems.size === 0 || isProcessing}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {isProcessing ? 'Updating...' : `Update ${countItems.size} Items`}
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
