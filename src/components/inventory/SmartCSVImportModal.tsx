import { useState, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Sparkles, ArrowRight, X, CheckCircle2, XCircle } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface SmartCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (importedCount: number) => void;
}

interface ColumnMapping {
  name: string;
  category: string;
  batch_number: string;
  current_stock: string;
  reorder_level: string;
  expiry_date: string;
  unit_price: string;
  selling_price: string;
  barcode_id: string;
  nafdac_reg_number: string;
  manufacturer: string;
  supplier: string;
  location: string;
}

type FieldKey = keyof ColumnMapping;

const fieldLabels: Record<FieldKey, string> = {
  name: 'Product Name',
  category: 'Category / Type',
  batch_number: 'Batch Number',
  current_stock: 'Quantity / Stock',
  reorder_level: 'Reorder Level',
  expiry_date: 'Expiry Date',
  unit_price: 'Cost Price',
  selling_price: 'Selling Price',
  barcode_id: 'Barcode',
  nafdac_reg_number: 'NAFDAC No / Reg No',
  manufacturer: 'Manufacturer',
  supplier: 'Supplier',
  location: 'Shelf Location',
};

const requiredFields: FieldKey[] = ['name', 'current_stock', 'unit_price'];
const optionalFields: FieldKey[] = ['category', 'batch_number', 'reorder_level', 'expiry_date', 'selling_price', 'barcode_id', 'nafdac_reg_number', 'manufacturer', 'supplier', 'location'];

// Smart column name matching patterns
const columnPatterns: Record<FieldKey, RegExp[]> = {
  name: [/^(product|drug|medication|item|medicine)[\s_-]?name$/i, /^name$/i, /^product$/i, /^drug$/i, /^description$/i, /^item$/i],
  category: [/^(category|type|form|class|group)$/i, /^drug[\s_-]?(type|form|class)$/i, /^dosage[\s_-]?form$/i],
  batch_number: [/^batch[\s_-]?(number|no|#)?$/i, /^lot[\s_-]?(number|no|#)?$/i, /^batch$/i],
  current_stock: [/^(current[\s_-]?)?(stock|quantity|qty|units?)$/i, /^on[\s_-]?hand$/i, /^available$/i, /^count$/i, /^balance$/i],
  reorder_level: [/^(reorder|minimum|min)[\s_-]?(level|qty|stock|point)?$/i, /^rop$/i],
  expiry_date: [/^expir(y|ation)?[\s_-]?date$/i, /^exp[\s_-]?date$/i, /^best[\s_-]?before$/i, /^exp$/i],
  unit_price: [/^(cost|purchase|buy|unit)[\s_-]?price$/i, /^cost$/i, /^cp$/i, /^purchase[\s_-]?price$/i, /^price$/i],
  selling_price: [/^(sell(ing)?|retail|sale)[\s_-]?price$/i, /^sp$/i, /^retail$/i, /^mrp$/i],
  barcode_id: [/^bar[\s_-]?code$/i, /^upc$/i, /^ean$/i, /^gtin$/i, /^sku$/i],
  nafdac_reg_number: [/^nafdac[\s_-]?(reg|registration)?[\s_-]?(no|number|#)?$/i, /^reg[\s_-]?(no|number|#)?$/i, /^registration$/i, /^fda[\s_-]?number$/i],
  manufacturer: [/^manufacturer$/i, /^mfg$/i, /^brand$/i, /^company$/i, /^make$/i],
  supplier: [/^supplier$/i, /^vendor$/i, /^distributor$/i],
  location: [/^(shelf|bin|rack)[\s_-]?location$/i, /^location$/i, /^shelf$/i, /^storage$/i],
};

// Category normalization
const categoryMap: Record<string, MedicationFormData['category']> = {
  tablet: 'Tablet', tablets: 'Tablet', tab: 'Tablet', tabs: 'Tablet',
  capsule: 'Capsule', capsules: 'Capsule', cap: 'Capsule', caps: 'Capsule',
  syrup: 'Syrup', syrups: 'Syrup', suspension: 'Syrup', liquid: 'Syrup', oral: 'Syrup', solution: 'Syrup',
  injection: 'Injection', injections: 'Injection', inj: 'Injection', injectable: 'Injection', iv: 'Injection', infusion: 'Injection',
  cream: 'Cream', creams: 'Cream', ointment: 'Cream', ointments: 'Cream', topical: 'Cream', gel: 'Cream', gels: 'Cream',
  drops: 'Drops', drop: 'Drops', eye: 'Drops', ear: 'Drops',
  inhaler: 'Inhaler', inhalers: 'Inhaler', respiratory: 'Inhaler', spray: 'Inhaler',
  powder: 'Powder', powders: 'Powder', sachet: 'Powder', sachets: 'Powder',
  // Common drug category names
  analgesic: 'Tablet', analgesics: 'Tablet', painkiller: 'Tablet', painkillers: 'Tablet',
  antibiotic: 'Capsule', antibiotics: 'Capsule',
  antimalarial: 'Tablet', 'anti-malarial': 'Tablet', antimalaria: 'Tablet',
  antidiabetic: 'Tablet', 'anti-diabetic': 'Tablet', diabetes: 'Tablet',
  cardiovascular: 'Tablet', antihypertensive: 'Tablet',
  vitamin: 'Tablet', vitamins: 'Tablet', supplement: 'Tablet', supplements: 'Tablet',
  gastrointestinal: 'Syrup', antacid: 'Syrup',
  other: 'Other',
};

export const SmartCSVImportModal = ({ open, onOpenChange, onComplete }: SmartCSVImportModalProps) => {
  const { addMedication } = useMedications();
  const { findBarcodeByName } = useBarcodeLibrary();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '', category: '', batch_number: '', current_stock: '',
    reorder_level: '', expiry_date: '', unit_price: '', selling_price: '',
    barcode_id: '', nafdac_reg_number: '', manufacturer: '', supplier: '', location: '',
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-detect column mappings
  const autoMapColumns = useCallback((headers: string[], sampleRow?: Record<string, string>): ColumnMapping => {
    const result: ColumnMapping = {
      name: '', category: '', batch_number: '', current_stock: '',
      reorder_level: '', expiry_date: '', unit_price: '', selling_price: '',
      barcode_id: '', nafdac_reg_number: '', manufacturer: '', supplier: '', location: '',
    };

    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[\s_-]+/g, '');

      (Object.keys(columnPatterns) as FieldKey[]).forEach((field) => {
        if (!result[field]) {
          const patterns = columnPatterns[field];
          for (const pattern of patterns) {
            if (pattern.test(header) || pattern.test(normalizedHeader)) {
              result[field] = header;
              break;
            }
          }
        }
      });
    });

    // Light heuristic: if we still didn't find a stock column, try to guess from the first row
    if (!result.current_stock) {
      const row = sampleRow ?? csvData[0];
      if (row) {
        const numericHeaders = headers.filter((h) => {
          const v = row[h];
          const n = Number(String(v ?? '').replace(/[₦$£€,%\s,]/g, ''));
          return Number.isFinite(n);
        });

        // Prefer quantity-ish names first
        const qtyCandidate = numericHeaders.find((h) => /qty|quant|stock|units?|onhand|balance|count/i.test(h));
        if (qtyCandidate) result.current_stock = qtyCandidate;
      }
    }

    return result;
  }, [csvData]);

  const handleFileSelect = useCallback((file: File) => {
    try {
      const isCsv =
        file.name.toLowerCase().endsWith('.csv') ||
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel';

      if (!isCsv) {
        toast({
          title: 'Invalid file',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
        return;
      }

      const maxSizeMb = 15;
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `Please upload a CSV smaller than ${maxSizeMb}MB.`,
          variant: 'destructive',
        });
        return;
      }

      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => (h ?? '').toString().trim(),
        transform: (value) => (value ?? '').toString().trim(),
        complete: (results) => {
          try {
            if (results.errors?.length) {
              const first = results.errors[0];
              toast({
                title: 'CSV parse warning',
                description: `Row ${first.row ?? '—'}: ${first.message}`,
                variant: 'destructive',
              });
              // Continue anyway; many CSVs still import fine.
            }

            const raw = Array.isArray(results.data) ? results.data : [];
            const rows = raw
              .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
              .map((row) => {
                const cleaned: Record<string, string> = {};
                Object.entries(row).forEach(([k, v]) => {
                  const key = String(k ?? '').trim();
                  if (!key) return;
                  cleaned[key] = String(v ?? '').trim();
                });
                return cleaned;
              })
              .filter((row) => Object.values(row).some((v) => String(v).trim() !== ''));

            const inferredHeaders =
              (results.meta?.fields?.filter(Boolean) as string[] | undefined)?.map((h) => h.trim()) ??
              Object.keys(rows[0] ?? {});

            const cleanedHeaders = Array.from(new Set(inferredHeaders)).filter(Boolean);

            if (rows.length === 0 || cleanedHeaders.length === 0) {
              toast({
                title: 'Empty File',
                description: 'The CSV file appears to be empty or has no readable headers.',
                variant: 'destructive',
              });
              return;
            }

            setCsvData(rows);
            setHeaders(cleanedHeaders);

            const autoMapping = autoMapColumns(cleanedHeaders, rows[0]);
            setMapping(autoMapping);
            setStep('mapping');
          } catch (err) {
            console.error('CSV import: parse complete handler failed', err);
            toast({
              title: 'Import Error',
              description: 'We could not read that CSV file. Please try another export format.',
              variant: 'destructive',
            });
          }
        },
        error: (error) => {
          console.error('CSV import: parse error', error);
          toast({
            title: 'Parse Error',
            description: `Failed to parse CSV: ${error.message}`,
            variant: 'destructive',
          });
        },
      });
    } catch (err) {
      console.error('CSV import: file select failed', err);
      toast({
        title: 'Import Error',
        description: 'Something went wrong while reading the file. Please try again.',
        variant: 'destructive',
      });
    }
  }, [autoMapColumns, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFileSelect(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
    }
  }, [handleFileSelect, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // allow re-uploading the same file
    e.target.value = '';
    if (file) handleFileSelect(file);
  };

  // Validate required fields
  const missingFields = useMemo(() => {
    return requiredFields.filter(f => !mapping[f]);
  }, [mapping]);

  const mappedCount = useMemo(() => {
    return Object.values(mapping).filter(v => v).length;
  }, [mapping]);

  // Preview data with transformations
  const previewData = useMemo(() => {
    return csvData.slice(0, 5).map((row, idx) => ({
      rowNum: idx + 2,
      name: row[mapping.name] || '—',
      stock: row[mapping.current_stock] || '0',
      price: row[mapping.unit_price] || '—',
      category: row[mapping.category] || 'Other',
      expiry: row[mapping.expiry_date] || 'Not set',
    }));
  }, [csvData, mapping]);

  // Parse various date formats
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const cleaned = dateStr.trim();
    
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
    
    // DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
      let [, first, second, year] = slashMatch;
      if (year.length === 2) year = `20${year}`;
      // Assume DD/MM/YYYY for international format
      const day = parseInt(first) > 12 ? first : second;
      const month = parseInt(first) > 12 ? second : first;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try native parsing
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  // Parse price values (handle currency symbols)
  const parsePrice = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.toString().replace(/[₦$£€,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Normalize category
  const normalizeCategory = (value: string): MedicationFormData['category'] => {
    if (!value) return 'Other';
    const key = value.toLowerCase().replace(/[\s\-_]/g, '');
    return categoryMap[key] || 'Other';
  };

  const handleImport = async () => {
    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please map: ${missingFields.map(f => fieldLabels[f]).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    setImportProgress(0);
    setImportedCount(0);
    setErrors([]);

    const importErrors: string[] = [];
    let successCount = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        const productName = row[mapping.name]?.trim();
        if (!productName) {
          importErrors.push(`Row ${i + 2}: Product name is empty`);
          continue;
        }

        // Parse values with smart defaults
        const costPrice = parsePrice(row[mapping.unit_price]);
        const sellingPrice = mapping.selling_price ? parsePrice(row[mapping.selling_price]) : undefined;
        const stock = parseInt(row[mapping.current_stock]) || 0;
        const reorderLevel = mapping.reorder_level ? parseInt(row[mapping.reorder_level]) || 10 : 10;
        
        // Parse expiry date or use default (2 years from now)
        let expiryDate = mapping.expiry_date ? parseDate(row[mapping.expiry_date]) : null;
        if (!expiryDate) {
          const twoYearsFromNow = new Date();
          twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
          expiryDate = twoYearsFromNow.toISOString().split('T')[0];
        }

        // Generate batch number if not provided
        const batchNumber = mapping.batch_number && row[mapping.batch_number]?.trim() 
          ? row[mapping.batch_number].trim() 
          : `BATCH-${Date.now()}-${i}`;

        // Try to find barcode from library
        let barcodeId = mapping.barcode_id ? row[mapping.barcode_id]?.trim() : undefined;
        if (!barcodeId && productName) {
          barcodeId = findBarcodeByName(productName) || undefined;
        }

        const medication: MedicationFormData = {
          name: productName,
          category: normalizeCategory(row[mapping.category]),
          batch_number: batchNumber,
          current_stock: stock,
          reorder_level: reorderLevel,
          expiry_date: expiryDate,
          unit_price: costPrice,
          selling_price: sellingPrice,
          barcode_id: barcodeId,
          nafdac_reg_number: mapping.nafdac_reg_number ? row[mapping.nafdac_reg_number]?.trim() : undefined,
        };

        await addMedication.mutateAsync(medication);
        successCount++;
      } catch (error) {
        importErrors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setImportProgress(Math.round(((i + 1) / csvData.length) * 100));
      setImportedCount(successCount);
    }

    setErrors(importErrors);
    setStep('complete');
    
    if (successCount > 0) {
      toast({
        title: importErrors.length === 0 ? 'Import Complete!' : 'Partial Import',
        description: `Successfully imported ${successCount} of ${csvData.length} products.`,
        variant: importErrors.length === 0 ? 'default' : 'destructive',
      });
    }

    onComplete?.(successCount);
  };

  const handleClose = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping({
      name: '', category: '', batch_number: '', current_stock: '',
      reorder_level: '', expiry_date: '', unit_price: '', selling_price: '',
      barcode_id: '', nafdac_reg_number: '', manufacturer: '', supplier: '', location: '',
    });
    setImportProgress(0);
    setImportedCount(0);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Products from CSV
            <Badge variant="secondary" className="ml-2 gap-1">
              <Sparkles className="h-3 w-3" />
              Smart Import
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload any CSV file - we\'ll automatically detect your columns'}
            {step === 'mapping' && `Found ${headers.length} columns. Review the auto-detected mappings below.`}
            {step === 'preview' && 'Review the first few rows before importing'}
            {step === 'importing' && `Importing ${csvData.length} products...`}
            {step === 'complete' && `Import complete! ${importedCount} products added.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleInputChange}
              className="hidden"
            />
            <div
              className={`flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => fileInputRef.current?.click()}
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
            </div>

            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Smart Detection Supports:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 grid grid-cols-2 gap-x-4">
                <li>• Product Name / Drug Name</li>
                <li>• Quantity / Stock / Units</li>
                <li>• Cost Price / Purchase Price</li>
                <li>• Selling Price / Retail Price</li>
                <li>• Expiry Date (any format)</li>
                <li>• Batch Number / Lot Number</li>
                <li>• Category / Drug Type</li>
                <li>• Barcode / SKU / UPC</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={missingFields.length === 0 ? 'default' : 'destructive'} className="gap-1">
                {missingFields.length === 0 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {missingFields.length === 0 ? 'All required fields mapped' : `${missingFields.length} required fields missing`}
              </Badge>
              <Badge variant="secondary">{mappedCount} / {Object.keys(mapping).length} mapped</Badge>
              <Badge variant="outline">{csvData.length} rows</Badge>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground mb-2">Required Fields</div>
                {requiredFields.map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <div className="w-36 flex items-center gap-2">
                      <span className="text-sm font-medium">{fieldLabels[field]}</span>
                      <span className="text-destructive">*</span>
                    </div>
                    <Select
                      value={mapping[field]}
                      onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Not mapped —</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[field] && <Check className="h-4 w-4 text-success flex-shrink-0" />}
                  </div>
                ))}
                
                <div className="text-sm font-medium text-muted-foreground mt-4 mb-2">Optional Fields</div>
                {optionalFields.map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <div className="w-36">
                      <span className="text-sm">{fieldLabels[field]}</span>
                    </div>
                    <Select
                      value={mapping[field]}
                      onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Not mapped —</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[field] && <Check className="h-4 w-4 text-success flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Preview section */}
            {missingFields.length === 0 && previewData.length > 0 && (
              <div className="mt-4 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview (first 5 rows):</p>
                <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                  {previewData.map((row) => (
                    <div key={row.rowNum} className="flex gap-4 text-muted-foreground">
                      <span className="font-medium text-foreground truncate flex-1">{row.name}</span>
                      <span>Stock: {row.stock}</span>
                      <span>Price: {row.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleImport} 
                disabled={missingFields.length > 0}
                className="gap-2 bg-gradient-primary hover:opacity-90"
              >
                <Upload className="h-4 w-4" />
                Import {csvData.length} Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span>Importing products...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-3" />
              <p className="text-sm text-muted-foreground text-center mt-2">
                {importedCount} of {csvData.length} products imported
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div className={`p-4 rounded-full ${errors.length === 0 ? 'bg-success/20' : 'bg-warning/20'}`}>
              {errors.length === 0 ? (
                <CheckCircle2 className="h-12 w-12 text-success" />
              ) : (
                <AlertCircle className="h-12 w-12 text-warning" />
              )}
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">
                {errors.length === 0 ? 'Import Successful!' : 'Import Complete with Warnings'}
              </h3>
              <p className="text-muted-foreground">
                Successfully imported <span className="font-bold text-foreground">{importedCount}</span> products
              </p>
            </div>

            {errors.length > 0 && (
              <ScrollArea className="w-full max-h-32 border rounded-lg p-2">
                <div className="space-y-1">
                  {errors.slice(0, 10).map((error, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                      <X className="h-3 w-3 flex-shrink-0" />
                      {error}
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-sm text-muted-foreground">...and {errors.length - 10} more errors</p>
                  )}
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="w-full">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
