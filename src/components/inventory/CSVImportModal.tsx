import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useBarcodeLibrary } from '@/hooks/useBarcodeLibrary';
import { MedicationFormData } from '@/types/medication';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColumnMapping {
  name: string;
  category: string;
  batch_number: string;
  current_stock: string;
  reorder_level: string;
  expiry_date: string;
  unit_price: string;
  barcode_id: string;
}

const requiredFields = ['name', 'category', 'batch_number', 'current_stock', 'expiry_date', 'unit_price'] as const;
const optionalFields = ['reorder_level', 'barcode_id'] as const;
const allFields = [...requiredFields, ...optionalFields] as const;

const categoryMap: Record<string, MedicationFormData['category']> = {
  tablet: 'Tablet',
  tablets: 'Tablet',
  syrup: 'Syrup',
  syrups: 'Syrup',
  capsule: 'Capsule',
  capsules: 'Capsule',
  injection: 'Injection',
  injections: 'Injection',
  cream: 'Cream',
  creams: 'Cream',
  drops: 'Drops',
  drop: 'Drops',
  inhaler: 'Inhaler',
  inhalers: 'Inhaler',
  powder: 'Powder',
  powders: 'Powder',
  other: 'Other',
};

export const CSVImportModal = ({ open, onOpenChange }: CSVImportModalProps) => {
  const { addMedication } = useMedications();
  const { findBarcodeByName } = useBarcodeLibrary();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    category: '',
    batch_number: '',
    current_stock: '',
    reorder_level: '',
    expiry_date: '',
    unit_price: '',
    barcode_id: '',
  });
  const [importProgress, setImportProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast({
            title: 'Empty File',
            description: 'The CSV file appears to be empty.',
            variant: 'destructive',
          });
          return;
        }

        const data = results.data as Record<string, string>[];
        const headers = Object.keys(data[0]);
        
        setCsvData(data);
        setHeaders(headers);
        
        // Auto-map columns with matching names
        const autoMapping: ColumnMapping = {
          name: '',
          category: '',
          batch_number: '',
          current_stock: '',
          reorder_level: '',
          expiry_date: '',
          unit_price: '',
          barcode_id: '',
        };

        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase().replace(/[_\s-]/g, '');
          
          if (lowerHeader.includes('name') || lowerHeader.includes('product') || lowerHeader.includes('drug')) {
            autoMapping.name = header;
          } else if (lowerHeader.includes('category') || lowerHeader.includes('type') || lowerHeader.includes('form')) {
            autoMapping.category = header;
          } else if (lowerHeader.includes('batch') || lowerHeader.includes('lot')) {
            autoMapping.batch_number = header;
          } else if (lowerHeader.includes('stock') || lowerHeader.includes('quantity') || lowerHeader.includes('qty')) {
            autoMapping.current_stock = header;
          } else if (lowerHeader.includes('reorder') || lowerHeader.includes('minimum') || lowerHeader.includes('min')) {
            autoMapping.reorder_level = header;
          } else if (lowerHeader.includes('expir') || lowerHeader.includes('exp')) {
            autoMapping.expiry_date = header;
          } else if (lowerHeader.includes('price') || lowerHeader.includes('cost') || lowerHeader.includes('amount')) {
            autoMapping.unit_price = header;
          } else if (lowerHeader.includes('barcode') || lowerHeader.includes('upc') || lowerHeader.includes('ean')) {
            autoMapping.barcode_id = header;
          }
        });

        setMapping(autoMapping);
        setStep('mapping');
      },
      error: (error) => {
        toast({
          title: 'Parse Error',
          description: `Failed to parse CSV: ${error.message}`,
          variant: 'destructive',
        });
      },
    });
  }, [toast]);

  const validateMapping = (): boolean => {
    const missingRequired = requiredFields.filter((field) => !mapping[field]);
    if (missingRequired.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please map: ${missingRequired.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const parseDate = (dateStr: string): string => {
    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY or DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return dateStr;
        }
        // Assume DD/MM/YYYY for other formats
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }

    // Try native Date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    throw new Error(`Invalid date format: ${dateStr}`);
  };

  const handleImport = async () => {
    if (!validateMapping()) return;

    setStep('importing');
    setImportProgress(0);
    setErrors([]);

    const importErrors: string[] = [];
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        const categoryValue = row[mapping.category]?.toLowerCase().trim();
        const category = categoryMap[categoryValue] || 'Other';
        const productName = row[mapping.name]?.trim() || '';
        
        // Try to get barcode from CSV first, then fallback to master library
        let barcodeId = mapping.barcode_id ? row[mapping.barcode_id]?.trim() : undefined;
        if (!barcodeId && productName) {
          // Auto-match from master barcode library
          barcodeId = findBarcodeByName(productName) || undefined;
        }

        const medication: MedicationFormData = {
          name: productName,
          category,
          batch_number: row[mapping.batch_number]?.trim() || `BATCH-${Date.now()}`,
          current_stock: parseInt(row[mapping.current_stock]) || 0,
          reorder_level: mapping.reorder_level ? parseInt(row[mapping.reorder_level]) || 10 : 10,
          expiry_date: parseDate(row[mapping.expiry_date]),
          unit_price: parseFloat(row[mapping.unit_price]?.replace(/[^0-9.]/g, '')) || 0,
          barcode_id: barcodeId,
        };

        if (!medication.name) {
          throw new Error('Name is required');
        }

        await addMedication.mutateAsync(medication);
      } catch (error) {
        importErrors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setImportProgress(Math.round(((i + 1) / csvData.length) * 100));
    }

    setErrors(importErrors);
    
    if (importErrors.length === 0) {
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${csvData.length} medications.`,
      });
      handleClose();
    } else if (importErrors.length < csvData.length) {
      toast({
        title: 'Partial Import',
        description: `Imported ${csvData.length - importErrors.length} of ${csvData.length} medications.`,
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping({
      name: '',
      category: '',
      batch_number: '',
      current_stock: '',
      reorder_level: '',
      expiry_date: '',
      unit_price: '',
      barcode_id: '',
    });
    setImportProgress(0);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Medications from CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to bulk import medications'}
            {step === 'mapping' && 'Map your CSV columns to medication fields'}
            {step === 'preview' && 'Review the data before importing'}
            {step === 'importing' && 'Importing medications...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-border/50 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4"
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">
                  or drag and drop
                </p>
              </div>
            </button>

            <div className="mt-6 p-4 rounded-xl bg-muted/30">
              <h4 className="font-medium mb-2">CSV Format Tips:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Include columns: Name, Category, Batch Number, Stock, Expiry Date, Price</li>
                <li>• Categories: Tablet, Capsule, Syrup, Injection, Cream, Drops, Inhaler, Powder</li>
                <li>• Date formats: YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY</li>
                <li>• Optional: Barcode ID, Reorder Level</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="py-4">
            <div className="mb-4">
              <Badge variant="secondary">{csvData.length} rows found</Badge>
            </div>

            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {allFields.map((field) => (
                  <div key={field} className="flex items-center gap-4">
                    <div className="w-40">
                      <span className="text-sm font-medium capitalize">
                        {field.replace('_', ' ')}
                      </span>
                      {requiredFields.includes(field as any) && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </div>
                    <Select
                      value={mapping[field as keyof ColumnMapping]}
                      onValueChange={(value) =>
                        setMapping((prev) => ({ ...prev, [field]: value }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not mapped --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[field as keyof ColumnMapping] && (
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} className="gap-2 bg-gradient-primary hover:opacity-90">
                <Upload className="h-4 w-4" />
                Import {csvData.length} Items
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center gap-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              
              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span>Importing...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>

              {errors.length > 0 && (
                <ScrollArea className="w-full max-h-40 mt-4">
                  <div className="space-y-2">
                    {errors.map((error, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {importProgress === 100 && errors.length > 0 && (
              <DialogFooter className="mt-6">
                <Button onClick={handleClose}>Close</Button>
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
