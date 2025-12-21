import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { FileUp, Upload, CheckCircle2, AlertCircle, X, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMedications } from '@/hooks/useMedications';
import { useToast } from '@/hooks/use-toast';
import { Medication } from '@/types/medication';

interface StockCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StockCountRow {
  barcode?: string;
  name?: string;
  batch_number?: string;
  counted_qty: number;
  medication?: Medication;
  status: 'matched' | 'not_found' | 'error';
  errorMessage?: string;
}

export const StockCSVImportModal = ({ open, onOpenChange }: StockCSVImportModalProps) => {
  const { medications, updateMedication } = useMedications();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [parsedRows, setParsedRows] = useState<StockCountRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const matchMedication = useCallback((row: any): StockCountRow => {
    const barcode = row.barcode?.toString().trim() || row.barcode_id?.toString().trim();
    const name = row.name?.toString().trim() || row.medication_name?.toString().trim() || row.product_name?.toString().trim();
    const batchNumber = row.batch_number?.toString().trim() || row.batch?.toString().trim();
    const countedQty = parseInt(row.counted_qty || row.count || row.quantity || row.stock || '0', 10);

    if (isNaN(countedQty) || countedQty < 0) {
      return {
        barcode,
        name,
        batch_number: batchNumber,
        counted_qty: 0,
        status: 'error',
        errorMessage: 'Invalid quantity',
      };
    }

    // Try to match by barcode first
    let match: Medication | undefined;
    if (barcode) {
      match = medications.find(m => m.barcode_id === barcode);
    }

    // Try to match by name + batch if no barcode match
    if (!match && name && batchNumber) {
      match = medications.find(m => 
        m.name.toLowerCase() === name.toLowerCase() && 
        m.batch_number.toLowerCase() === batchNumber.toLowerCase()
      );
    }

    // Try to match by name only (first match)
    if (!match && name) {
      match = medications.find(m => m.name.toLowerCase() === name.toLowerCase());
    }

    if (match) {
      return {
        barcode,
        name: match.name,
        batch_number: match.batch_number,
        counted_qty: countedQty,
        medication: match,
        status: 'matched',
      };
    }

    return {
      barcode,
      name,
      batch_number: batchNumber,
      counted_qty: countedQty,
      status: 'not_found',
      errorMessage: 'Product not found in inventory',
    };
  }, [medications]);

  const handleFileSelect = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any) => matchMedication(row));
        setParsedRows(rows);
        setStep('preview');
      },
      error: () => {
        toast({
          title: 'Error parsing CSV',
          description: 'Please check your file format and try again.',
          variant: 'destructive',
        });
      },
    });
  }, [matchMedication, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
    }
  }, [handleFileSelect, toast]);

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.status === 'matched' && r.medication);
    if (validRows.length === 0) {
      toast({
        title: 'No valid items',
        description: 'No items could be matched to inventory.',
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    setImportProgress(0);
    setImportedCount(0);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await updateMedication.mutateAsync({
          id: row.medication!.id,
          current_stock: row.counted_qty,
        });
        setImportedCount(prev => prev + 1);
      } catch (error) {
        // Continue with other items
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    toast({
      title: 'Stock count imported',
      description: `Updated ${importedCount + 1} items successfully.`,
    });
    
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setParsedRows([]);
    setImportProgress(0);
    setImportedCount(0);
    onOpenChange(false);
  };

  const matchedCount = parsedRows.filter(r => r.status === 'matched').length;
  const notFoundCount = parsedRows.filter(r => r.status === 'not_found').length;
  const errorCount = parsedRows.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Stock Count from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with barcode/name and counted quantities to bulk update stock levels.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col">
            <div
              className={`flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Drag & drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium mb-2">Expected CSV format:</p>
              <code className="text-xs text-muted-foreground block">
                barcode,name,batch_number,counted_qty<br/>
                1234567890,Paracetamol 500mg,BATCH-001,150<br/>
                9876543210,Amoxicillin 250mg,BATCH-002,75
              </code>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-3 mb-4">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {matchedCount} matched
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {notFoundCount} not found
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  {errorCount} errors
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                      row.status === 'matched' 
                        ? 'bg-success/10 border border-success/30' 
                        : row.status === 'not_found'
                        ? 'bg-muted/50 border border-border'
                        : 'bg-destructive/10 border border-destructive/30'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{row.name || row.barcode || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.batch_number && `Batch: ${row.batch_number} • `}
                        {row.barcode && `Barcode: ${row.barcode}`}
                      </p>
                    </div>
                    <div className="text-right">
                      {row.status === 'matched' ? (
                        <>
                          <p className="font-bold">{row.counted_qty}</p>
                          <p className="text-xs text-muted-foreground">
                            was: {row.medication?.current_stock}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">{row.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="w-full max-w-sm">
              <Progress value={importProgress} className="h-3" />
            </div>
            <p className="text-muted-foreground">
              Updating stock levels... {importProgress}%
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={matchedCount === 0}>
              <FileUp className="h-4 w-4 mr-2" />
              Update {matchedCount} Items
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
