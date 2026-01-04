import { useState, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Sparkles, ArrowRight, X, CheckCircle2, XCircle, Edit3, Eye } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface SmartCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (importedCount: number) => void;
}

interface ColumnMapping {
  name: string;
  generic_name: string;
  category: string;
  batch_number: string;
  current_stock: string;
  reorder_level: string;
  expiry_date: string;
  unit_price: string;
  selling_price: string;
  wholesale_price: string;
  barcode_id: string;
  nafdac_reg_number: string;
  manufacturer: string;
  supplier: string;
  location: string;
}

type FieldKey = keyof ColumnMapping;

const fieldLabels: Record<FieldKey, string> = {
  name: 'Product Name',
  generic_name: 'Generic Name',
  category: 'Category / Type',
  batch_number: 'Batch Number',
  current_stock: 'Quantity / Stock',
  reorder_level: 'Reorder Level',
  expiry_date: 'Expiry Date',
  unit_price: 'Cost Price',
  selling_price: 'Retail Selling Price',
  wholesale_price: 'Wholesale Price',
  barcode_id: 'Barcode',
  nafdac_reg_number: 'NAFDAC No / Reg No',
  manufacturer: 'Manufacturer',
  supplier: 'Supplier',
  location: 'Shelf Location',
};

const requiredFields: FieldKey[] = ['name', 'current_stock', 'unit_price'];
const optionalFields: FieldKey[] = ['generic_name', 'manufacturer', 'category', 'batch_number', 'reorder_level', 'expiry_date', 'selling_price', 'wholesale_price', 'barcode_id', 'nafdac_reg_number', 'supplier', 'location'];
const NOT_MAPPED_VALUE = '__lovable_not_mapped__';

// Smart column name matching patterns
const columnPatterns: Record<FieldKey, RegExp[]> = {
  name: [/^(product|drug|medication|item|medicine)[\s_-]?name$/i, /^name$/i, /^product$/i, /^drug$/i, /^description$/i, /^item$/i, /^brand[\s_-]?name$/i],
  generic_name: [/^generic[\s_-]?name$/i, /^generic$/i, /^inn$/i, /^active[\s_-]?ingredient$/i, /^ingredient$/i],
  category: [/^(category|type|form|class|group)$/i, /^drug[\s_-]?(type|form|class)$/i, /^dosage[\s_-]?form$/i],
  batch_number: [/^batch[\s_-]?(number|no|#)?$/i, /^lot[\s_-]?(number|no|#)?$/i, /^batch$/i],
  current_stock: [/^(current[\s_-]?)?(stock|quantity|qty|units?)$/i, /^on[\s_-]?hand$/i, /^available$/i, /^count$/i, /^balance$/i],
  reorder_level: [/^(reorder|minimum|min)[\s_-]?(level|qty|stock|point)?$/i, /^rop$/i, /^min[\s_-]?stock$/i, /^alert[\s_-]?level$/i],
  expiry_date: [/^expir(y|ation)?[\s_-]?date$/i, /^exp[\s_-]?date$/i, /^best[\s_-]?before$/i, /^exp$/i],
  unit_price: [/^(cost|purchase|buy|unit)[\s_-]?price$/i, /^cost$/i, /^cp$/i, /^purchase[\s_-]?price$/i, /^price$/i],
  selling_price: [/^(sell(ing)?|retail|sale)[\s_-]?price$/i, /^sp$/i, /^retail$/i, /^mrp$/i],
  wholesale_price: [/^wholesale[\s_-]?price$/i, /^bulk[\s_-]?price$/i, /^trade[\s_-]?price$/i, /^wp$/i, /^distributor[\s_-]?price$/i],
  barcode_id: [/^bar[\s_-]?code$/i, /^upc$/i, /^ean$/i, /^gtin$/i, /^sku$/i],
  nafdac_reg_number: [/^nafdac[\s_-]?(reg|registration)?[\s_-]?(no|number|#)?$/i, /^reg[\s_-]?(no|number|#)?$/i, /^registration$/i, /^fda[\s_-]?number$/i],
  manufacturer: [/^manufacturer$/i, /^mfg$/i, /^brand$/i, /^company$/i, /^make$/i, /^made[\s_-]?by$/i],
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
  analgesic: 'Tablet', analgesics: 'Tablet', painkiller: 'Tablet', painkillers: 'Tablet',
  antibiotic: 'Capsule', antibiotics: 'Capsule',
  antimalarial: 'Tablet', 'anti-malarial': 'Tablet', antimalaria: 'Tablet',
  antidiabetic: 'Tablet', 'anti-diabetic': 'Tablet', diabetes: 'Tablet',
  cardiovascular: 'Tablet', antihypertensive: 'Tablet',
  vitamin: 'Tablet', vitamins: 'Tablet', supplement: 'Tablet', supplements: 'Tablet',
  gastrointestinal: 'Syrup', antacid: 'Syrup',
  other: 'Other',
};

// Editable row type for review step
interface EditableRow {
  id: number;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  batch_number: string;
  current_stock: string;
  reorder_level: string;
  expiry_date: string;
  unit_price: string;
  selling_price: string;
  wholesale_price: string;
  barcode_id: string;
  nafdac_reg_number: string;
  isValid: boolean;
  errorMsg?: string;
}

export const SmartCSVImportModal = ({ open, onOpenChange, onComplete }: SmartCSVImportModalProps) => {
  const { addMedication } = useMedications();
  const { findBarcodeByName } = useBarcodeLibrary();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'review' | 'importing' | 'complete'>('upload');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '', generic_name: '', category: '', batch_number: '', current_stock: '',
    reorder_level: '', expiry_date: '', unit_price: '', selling_price: '', wholesale_price: '',
    barcode_id: '', nafdac_reg_number: '', manufacturer: '', supplier: '', location: '',
  });
  const [editableRows, setEditableRows] = useState<EditableRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkReorderLevel, setBulkReorderLevel] = useState('10');

  // Auto-detect column mappings
  const autoMapColumns = useCallback((hdrs: string[], sampleRow?: Record<string, string>): ColumnMapping => {
    const result: ColumnMapping = {
      name: '', generic_name: '', category: '', batch_number: '', current_stock: '',
      reorder_level: '', expiry_date: '', unit_price: '', selling_price: '', wholesale_price: '',
      barcode_id: '', nafdac_reg_number: '', manufacturer: '', supplier: '', location: '',
    };

    hdrs.forEach((header) => {
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

    // Light heuristic for stock column
    if (!result.current_stock && sampleRow) {
      const numericHeaders = hdrs.filter((h) => {
        const v = sampleRow[h];
        const n = Number(String(v ?? '').replace(/[₦$£€,%\s,]/g, ''));
        return Number.isFinite(n);
      });
      const qtyCandidate = numericHeaders.find((h) => /qty|quant|stock|units?|onhand|balance|count/i.test(h));
      if (qtyCandidate) result.current_stock = qtyCandidate;
    }

    return result;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    try {
      const isCsv =
        file.name.toLowerCase().endsWith('.csv') ||
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel';

      if (!isCsv) {
        toast({ title: 'Invalid file', description: 'Please upload a CSV file.', variant: 'destructive' });
        return;
      }

      const maxSizeMb = 15;
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast({ title: 'File too large', description: `Please upload a CSV smaller than ${maxSizeMb}MB.`, variant: 'destructive' });
        return;
      }

      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => (h ?? '').toString().trim(),
        transform: (value) => (value ?? '').toString().trim(),
        complete: (results) => {
          try {
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
              toast({ title: 'Empty File', description: 'The CSV file appears to be empty or has no readable headers.', variant: 'destructive' });
              return;
            }

            setCsvData(rows);
            setHeaders(cleanedHeaders);

            const autoMapping = autoMapColumns(cleanedHeaders, rows[0]);
            setMapping(autoMapping);
            setStep('mapping');
          } catch (err) {
            console.error('CSV import: parse complete handler failed', err);
            toast({ title: 'Import Error', description: 'We could not read that CSV file. Please try another export format.', variant: 'destructive' });
          }
        },
        error: (error) => {
          console.error('CSV import: parse error', error);
          toast({ title: 'Parse Error', description: `Failed to parse CSV: ${error.message}`, variant: 'destructive' });
        },
      });
    } catch (err) {
      console.error('CSV import: file select failed', err);
      toast({ title: 'Import Error', description: 'Something went wrong while reading the file. Please try again.', variant: 'destructive' });
    }
  }, [autoMapColumns, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFileSelect(file);
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file.', variant: 'destructive' });
    }
  }, [handleFileSelect, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleFileSelect(file);
  };

  // Validate required fields
  const missingFields = useMemo(() => requiredFields.filter(f => !mapping[f]), [mapping]);
  const mappedCount = useMemo(() => Object.values(mapping).filter(v => v).length, [mapping]);

  // Parse helpers
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    const cleaned = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
    const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
      let [, first, second, year] = slashMatch;
      if (year.length === 2) year = `20${year}`;
      const day = parseInt(first) > 12 ? first : second;
      const month = parseInt(first) > 12 ? second : first;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return null;
  };

  const parsePrice = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.toString().replace(/[₦$£€,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const normalizeCategory = (value: string): MedicationFormData['category'] => {
    if (!value) return 'Other';
    const key = value.toLowerCase().replace(/[\s\-_]/g, '');
    return categoryMap[key] || 'Other';
  };

  // Smart reorder level calculation based on stock quantity
  const calculateSmartReorderLevel = (stock: number): number => {
    if (stock <= 5) return Math.max(1, Math.ceil(stock * 0.5)); // 50% of stock
    if (stock <= 20) return Math.ceil(stock * 0.3); // 30% of stock
    if (stock <= 50) return Math.ceil(stock * 0.25); // 25% of stock
    if (stock <= 100) return Math.ceil(stock * 0.2); // 20% of stock
    if (stock <= 500) return Math.ceil(stock * 0.15); // 15% of stock
    return Math.ceil(stock * 0.1); // 10% for large stock
  };

  // Build editable rows from CSV + mapping
  const buildEditableRows = useCallback((): EditableRow[] => {
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    const defaultExpiry = twoYearsFromNow.toISOString().split('T')[0];

    return csvData.map((row, idx) => {
      const rawName = mapping.name ? row[mapping.name] : '';
      const productName = typeof rawName === 'string' ? rawName.trim() : '';
      const costPrice = mapping.unit_price ? String(parsePrice(row[mapping.unit_price])) : '0';
      const wholesalePrice = mapping.wholesale_price ? String(parsePrice(row[mapping.wholesale_price])) : '';
      const sellingPrice = mapping.selling_price ? String(parsePrice(row[mapping.selling_price])) : '';
      const rawStock = mapping.current_stock ? row[mapping.current_stock] : '';
      const stock = Math.max(0, parseInt(String(rawStock).replace(/[^0-9.-]/g, ''), 10) || 0);
      
      // Use mapped reorder level or calculate smart default
      let reorderLevel: number;
      if (mapping.reorder_level && row[mapping.reorder_level]) {
        reorderLevel = parseInt(String(row[mapping.reorder_level]).replace(/[^0-9.-]/g, ''), 10) || calculateSmartReorderLevel(stock);
      } else {
        reorderLevel = calculateSmartReorderLevel(stock);
      }
      
      let expiryDate = mapping.expiry_date ? parseDate(row[mapping.expiry_date] ?? '') : null;
      if (!expiryDate) expiryDate = defaultExpiry;
      const rawBatch = mapping.batch_number ? row[mapping.batch_number] : '';
      const batchNumber = typeof rawBatch === 'string' && rawBatch.trim() ? rawBatch.trim() : `BATCH-${Date.now()}-${idx}`;
      const rawBarcode = mapping.barcode_id ? row[mapping.barcode_id] : '';
      let barcodeId = typeof rawBarcode === 'string' && rawBarcode.trim() ? rawBarcode.trim() : '';
      if (!barcodeId && productName) barcodeId = findBarcodeByName(productName) || '';
      const rawNafdac = mapping.nafdac_reg_number ? row[mapping.nafdac_reg_number] : '';
      const nafdacReg = typeof rawNafdac === 'string' && rawNafdac.trim() ? rawNafdac.trim() : '';
      const rawCategory = mapping.category ? row[mapping.category] ?? '' : '';
      const category = rawCategory || 'Other';
      
      // Extract manufacturer if mapped
      const rawManufacturer = mapping.manufacturer ? row[mapping.manufacturer] : '';
      const manufacturer = typeof rawManufacturer === 'string' ? rawManufacturer.trim() : '';
      
      // Generic name - try to extract from product name if not mapped
      const genericName = '';

      const isValid = !!productName;
      return {
        id: idx,
        name: productName,
        generic_name: genericName,
        manufacturer,
        category,
        batch_number: batchNumber,
        current_stock: String(stock),
        reorder_level: String(reorderLevel),
        expiry_date: expiryDate,
        unit_price: costPrice,
        selling_price: sellingPrice,
        wholesale_price: wholesalePrice,
        barcode_id: barcodeId,
        nafdac_reg_number: nafdacReg,
        isValid,
        errorMsg: isValid ? undefined : 'Product name is required',
      };
    });
  }, [csvData, mapping, findBarcodeByName]);

  // Apply smart reorder levels based on each product's stock
  const applySmartReorderLevels = () => {
    setEditableRows((prev) =>
      prev.map((r) => {
        const stock = parseInt(r.current_stock, 10) || 0;
        return { ...r, reorder_level: String(calculateSmartReorderLevel(stock)) };
      })
    );
    toast({
      title: 'Smart Reorder Levels Applied',
      description: `Calculated optimal reorder levels for ${editableRows.length} products based on stock.`,
    });
  };

  // Apply fixed bulk reorder level to all rows
  const applyBulkReorderLevel = () => {
    const level = parseInt(bulkReorderLevel, 10);
    if (isNaN(level) || level < 0) return;
    setEditableRows((prev) =>
      prev.map((r) => ({ ...r, reorder_level: String(level) }))
    );
    toast({
      title: 'Bulk Reorder Level Applied',
      description: `Set reorder level to ${level} for all ${editableRows.length} products.`,
    });
  };

  const proceedToReview = () => {
    const rows = buildEditableRows();
    setEditableRows(rows);
    setStep('review');
  };

  const updateEditableRow = (id: number, field: keyof EditableRow, value: string) => {
    setEditableRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        updated.isValid = !!updated.name.trim();
        updated.errorMsg = updated.isValid ? undefined : 'Product name is required';
        return updated;
      })
    );
  };

  const removeRow = (id: number) => {
    setEditableRows((prev) => prev.filter((r) => r.id !== id));
  };

  const validRowCount = useMemo(() => editableRows.filter((r) => r.isValid).length, [editableRows]);

  const handleImport = async () => {
    try {
      const rowsToImport = editableRows.filter((r) => r.isValid);
      if (rowsToImport.length === 0) {
        toast({ title: 'No valid rows', description: 'Please fix or add product names before importing.', variant: 'destructive' });
        return;
      }

      setStep('importing');
      setImportProgress(0);
      setImportedCount(0);
      setErrors([]);

      const importErrors: string[] = [];
      let successCount = 0;
      const totalRows = rowsToImport.length;

      for (let i = 0; i < totalRows; i++) {
        const row = rowsToImport[i];
        try {
          const medication: MedicationFormData & { wholesale_price?: number } = {
            name: row.name,
            category: normalizeCategory(row.category),
            batch_number: row.batch_number,
            current_stock: parseInt(row.current_stock, 10) || 0,
            reorder_level: parseInt(row.reorder_level, 10) || 10,
            expiry_date: row.expiry_date,
            unit_price: parseFloat(row.unit_price) || 0,
            selling_price: row.selling_price ? parseFloat(row.selling_price) : undefined,
            wholesale_price: row.wholesale_price ? parseFloat(row.wholesale_price) : undefined,
            barcode_id: row.barcode_id || undefined,
            nafdac_reg_number: row.nafdac_reg_number || undefined,
          };

          await addMedication.mutateAsync(medication);
          successCount++;
        } catch (error) {
          console.error(`CSV import row ${row.id + 2} error:`, error);
          importErrors.push(`Row ${row.id + 2} (${row.name || 'No Name'}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setImportProgress(Math.round(((i + 1) / totalRows) * 100));
        setImportedCount(successCount);
      }

      setErrors(importErrors);
      setStep('complete');

      if (successCount > 0) {
        toast({
          title: importErrors.length === 0 ? 'Import Complete!' : 'Partial Import',
          description: `Successfully imported ${successCount} of ${totalRows} products.`,
          variant: importErrors.length === 0 ? 'default' : 'destructive',
        });
      } else {
        toast({ title: 'Import Failed', description: importErrors[0] || 'No products could be imported.', variant: 'destructive' });
      }

      onComplete?.(successCount);
    } catch (err) {
      console.error('CSV import fatal error:', err);
      toast({ title: 'Import Error', description: 'Something went wrong during import. Please try again.', variant: 'destructive' });
      setStep('review');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping({
      name: '', generic_name: '', category: '', batch_number: '', current_stock: '',
      reorder_level: '', expiry_date: '', unit_price: '', selling_price: '', wholesale_price: '',
      barcode_id: '', nafdac_reg_number: '', manufacturer: '', supplier: '', location: '',
    });
    setEditableRows([]);
    setImportProgress(0);
    setImportedCount(0);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-3xl h-[90dvh] min-h-0 overflow-hidden flex flex-col">
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
            {step === 'upload' && "Upload any CSV file - we'll automatically detect your columns"}
            {step === 'mapping' && `Found ${headers.length} columns. Review the auto-detected mappings below.`}
            {step === 'review' && `Review & edit ${editableRows.length} products before importing.`}
            {step === 'importing' && `Importing ${validRowCount} products...`}
            {step === 'complete' && `Import complete! ${importedCount} products added.`}
          </DialogDescription>
        </DialogHeader>

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col py-4 min-h-0">
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleInputChange} className="hidden" />
            <div
              className={`flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
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

        {/* MAPPING STEP */}
        {step === 'mapping' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2 min-h-0">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={missingFields.length === 0 ? 'default' : 'destructive'} className="gap-1">
                {missingFields.length === 0 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {missingFields.length === 0 ? 'All required fields mapped' : `${missingFields.length} required fields missing`}
              </Badge>
              <Badge variant="secondary">{mappedCount} / {Object.keys(mapping).length} mapped</Badge>
              <Badge variant="outline">{csvData.length} rows</Badge>
            </div>

            <ScrollArea className="flex-1 min-h-0 pr-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground mb-2">Required Fields</div>
                {requiredFields.map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <div className="w-36 flex items-center gap-2">
                      <span className="text-sm font-medium">{fieldLabels[field]}</span>
                      <span className="text-destructive">*</span>
                    </div>
                    <Select
                      value={mapping[field] || NOT_MAPPED_VALUE}
                      onValueChange={(value) => setMapping((prev) => ({ ...prev, [field]: value === NOT_MAPPED_VALUE ? '' : value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_MAPPED_VALUE}>— Not mapped —</SelectItem>
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
                      value={mapping[field] || NOT_MAPPED_VALUE}
                      onValueChange={(value) => setMapping((prev) => ({ ...prev, [field]: value === NOT_MAPPED_VALUE ? '' : value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_MAPPED_VALUE}>— Not mapped —</SelectItem>
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

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={proceedToReview} disabled={missingFields.length > 0} className="gap-2 bg-gradient-primary hover:opacity-90">
                <Eye className="h-4 w-4" />
                Review & Edit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* REVIEW & EDIT STEP */}
        {step === 'review' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2 min-h-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1">
                <Edit3 className="h-3 w-3" />
                Editable Preview
              </Badge>
              <Badge variant={validRowCount === editableRows.length ? 'default' : 'destructive'}>
                {validRowCount} / {editableRows.length} valid
              </Badge>
            </div>
            
            {/* Reorder Level Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg border">
              <span className="text-xs font-medium text-muted-foreground">Reorder Levels:</span>
              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={applySmartReorderLevels}>
                <Sparkles className="h-3 w-3" />
                Auto-Calculate (Smart)
              </Button>
              <span className="text-xs text-muted-foreground">or</span>
              <Input
                value={bulkReorderLevel}
                onChange={(e) => setBulkReorderLevel(e.target.value)}
                className="h-7 w-14 text-xs"
                type="number"
                min="0"
                placeholder="10"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applyBulkReorderLevel}>
                Set All
              </Button>
            </div>

            {/* Scrollable Table Container - Fixed Scrolling */}
            <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
              <div className="h-full overflow-auto">
                <div className="min-w-[950px]">
                  {/* Header Row */}
                  <div className="grid grid-cols-[32px_1fr_100px_60px_65px_70px_70px_60px_90px_80px_32px] gap-1 p-2 bg-muted text-xs font-medium sticky top-0 z-10 border-b">
                    <span>#</span>
                    <span>Product Name *</span>
                    <span>Manufacturer</span>
                    <span>Stock *</span>
                    <span>Cost *</span>
                    <span>Retail</span>
                    <span>Wholesale</span>
                    <span>Reorder</span>
                    <span>Expiry</span>
                    <span>Category</span>
                    <span></span>
                  </div>

                  {/* Data Rows */}
                  {editableRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className={`grid grid-cols-[32px_1fr_100px_60px_65px_70px_70px_60px_90px_80px_32px] gap-1 p-1.5 border-b items-center text-sm ${!row.isValid ? 'bg-destructive/10' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                    >
                      <span className="text-muted-foreground text-xs">{idx + 1}</span>
                      <Input
                        value={row.name}
                        onChange={(e) => updateEditableRow(row.id, 'name', e.target.value)}
                        className={`h-7 text-xs ${!row.isValid ? 'border-destructive' : ''}`}
                        placeholder="Product name"
                      />
                      <Input
                        value={row.manufacturer}
                        onChange={(e) => updateEditableRow(row.id, 'manufacturer', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Manufacturer"
                      />
                      <Input
                        value={row.current_stock}
                        onChange={(e) => updateEditableRow(row.id, 'current_stock', e.target.value)}
                        className="h-7 text-xs"
                        type="number"
                      />
                      <Input
                        value={row.unit_price}
                        onChange={(e) => updateEditableRow(row.id, 'unit_price', e.target.value)}
                        className="h-7 text-xs"
                        type="number"
                      />
                      <Input
                        value={row.selling_price}
                        onChange={(e) => updateEditableRow(row.id, 'selling_price', e.target.value)}
                        className="h-7 text-xs"
                        type="number"
                        placeholder="—"
                      />
                      <Input
                        value={row.wholesale_price}
                        onChange={(e) => updateEditableRow(row.id, 'wholesale_price', e.target.value)}
                        className="h-7 text-xs"
                        type="number"
                        placeholder="—"
                      />
                      <Input
                        value={row.reorder_level}
                        onChange={(e) => updateEditableRow(row.id, 'reorder_level', e.target.value)}
                        className="h-7 text-xs"
                        type="number"
                        min="0"
                      />
                      <Input
                        value={row.expiry_date}
                        onChange={(e) => updateEditableRow(row.id, 'expiry_date', e.target.value)}
                        className="h-7 text-xs"
                        type="date"
                      />
                      <Input
                        value={row.category}
                        onChange={(e) => updateEditableRow(row.id, 'category', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Category"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeRow(row.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {editableRows.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No products to import. Go back and check your column mappings.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-2 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
              <Button onClick={handleImport} disabled={validRowCount === 0} className="gap-2 bg-gradient-primary hover:opacity-90">
                <Upload className="h-4 w-4" />
                Import {validRowCount} Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* IMPORTING STEP */}
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
                {importedCount} of {validRowCount} products imported
              </p>
            </div>
          </div>
        )}

        {/* COMPLETE STEP */}
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
              <ScrollArea className="w-full max-h-32 border rounded-lg p-2 min-h-0">
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
