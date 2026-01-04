import { useState, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Sparkles, ArrowRight, X, CheckCircle2, XCircle, Edit3, Eye, Layers, AlertTriangle, Wand2, Settings2, Trash2, Calendar, Package } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useBarcodeLibrary } from '@/hooks/useBarcodeLibrary';
import { MedicationFormData, Medication } from '@/types/medication';
import { findExistingProductsByName } from '@/utils/fefoUtils';
import { parseCompoundProductLine, isCompoundLine } from '@/utils/fuzzyFieldMatcher';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

// No required fields anymore - everything is optional with smart defaults
const allFields: FieldKey[] = ['name', 'current_stock', 'unit_price', 'generic_name', 'manufacturer', 'category', 'batch_number', 'reorder_level', 'expiry_date', 'selling_price', 'wholesale_price', 'barcode_id', 'nafdac_reg_number', 'supplier', 'location'];
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
  warningMsg?: string;
  existingBatches?: Medication[];
  isNewBatch?: boolean;
  isParsedFromCompound?: boolean;
}

// Smart defaults configuration
interface SmartDefaults {
  defaultExpiryMonths: number;
  defaultStock: number;
  defaultCostPrice: number;
}

export const SmartCSVImportModal = ({ open, onOpenChange, onComplete }: SmartCSVImportModalProps) => {
  const { addMedication, medications } = useMedications();
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
  const [smartDefaults, setSmartDefaults] = useState<SmartDefaults>({
    defaultExpiryMonths: 24,
    defaultStock: 1,
    defaultCostPrice: 0,
  });
  const [bulkExpiry, setBulkExpiry] = useState('');
  const [hasCompoundData, setHasCompoundData] = useState(false);

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

    // If no name column found, try to use first text column
    if (!result.name && hdrs.length > 0 && sampleRow) {
      const textColumn = hdrs.find((h) => {
        const v = sampleRow[h];
        return v && v.length > 2 && isNaN(Number(v.replace(/[₦$£€,\s]/g, '')));
      });
      if (textColumn) result.name = textColumn;
    }

    return result;
  }, []);

  // Check if data looks like single-column compound format
  const detectCompoundData = useCallback((rows: Record<string, string>[], hdrs: string[]): boolean => {
    if (hdrs.length > 3) return false; // Multi-column data
    
    const sampleRows = rows.slice(0, 5);
    const compoundCount = sampleRows.filter(row => {
      const values = Object.values(row).filter(v => v && v.trim());
      return values.some(v => isCompoundLine(v));
    }).length;
    
    return compoundCount >= sampleRows.length * 0.5;
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
            
            // Detect if data is in compound format
            const isCompound = detectCompoundData(rows, cleanedHeaders);
            setHasCompoundData(isCompound);

            // Calculate auto-mapping confidence
            const mappedFieldsCount = Object.values(autoMapping).filter(v => v).length;
            const confidence = mappedFieldsCount / 5; // Base confidence on key fields

            // If high confidence OR single column (compound), skip to review
            if (confidence >= 0.6 || isCompound) {
              const editRows = buildEditableRowsFromData(rows, autoMapping, isCompound);
              setEditableRows(editRows);
              setStep('review');
              toast({
                title: isCompound ? 'Smart parsing detected' : 'Auto-mapped columns',
                description: isCompound 
                  ? `Extracted product data from ${rows.length} lines. Review below.`
                  : `Found ${mappedFieldsCount} matching columns. Review your data below.`,
              });
            } else {
              setStep('mapping');
            }
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
  }, [autoMapColumns, detectCompoundData, toast]);

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

  // Count how many fields are mapped (for UI display only)
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
    // MM/YYYY format
    const mmyyyyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (mmyyyyMatch) {
      const [, month, year] = mmyyyyMatch;
      return `${year}-${month.padStart(2, '0')}-01`;
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
    if (stock <= 5) return Math.max(1, Math.ceil(stock * 0.5));
    if (stock <= 20) return Math.ceil(stock * 0.3);
    if (stock <= 50) return Math.ceil(stock * 0.25);
    if (stock <= 100) return Math.ceil(stock * 0.2);
    if (stock <= 500) return Math.ceil(stock * 0.15);
    return Math.ceil(stock * 0.1);
  };

  // Get default expiry date based on settings
  const getDefaultExpiry = useCallback((): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + smartDefaults.defaultExpiryMonths);
    return date.toISOString().split('T')[0];
  }, [smartDefaults.defaultExpiryMonths]);

  // Build editable rows - handles both mapped columns and compound parsing
  const buildEditableRowsFromData = useCallback((
    data: Record<string, string>[],
    currentMapping: ColumnMapping,
    isCompound: boolean
  ): EditableRow[] => {
    const defaultExpiry = getDefaultExpiry();

    return data.map((row, idx) => {
      let productName = '';
      let stock = smartDefaults.defaultStock;
      let costPrice = smartDefaults.defaultCostPrice;
      let expiryDate = defaultExpiry;
      let batchNumber = `BATCH-${Date.now()}-${idx}`;
      let category = 'Other';
      let isParsedFromCompound = false;

      // Try compound parsing first if detected
      if (isCompound) {
        const textValue = Object.values(row).find(v => v && v.trim()) || '';
        if (isCompoundLine(textValue)) {
          const parsed = parseCompoundProductLine(textValue);
          productName = parsed.name;
          if (parsed.quantity) stock = parsed.quantity;
          if (parsed.price) costPrice = parsed.price;
          if (parsed.expiry) expiryDate = parsed.expiry;
          if (parsed.batchNumber) batchNumber = parsed.batchNumber;
          if (parsed.category) category = parsed.category;
          isParsedFromCompound = true;
        } else {
          productName = textValue;
        }
      }
      
      // If not compound or parsing failed, use column mapping
      if (!isParsedFromCompound) {
        const rawName = currentMapping.name ? row[currentMapping.name] : '';
        productName = typeof rawName === 'string' ? rawName.trim() : '';
        
        // If still no name, use first non-empty column
        if (!productName) {
          const firstValue = Object.values(row).find(v => v && v.trim());
          productName = firstValue || '';
        }
        
        costPrice = currentMapping.unit_price ? parsePrice(row[currentMapping.unit_price]) : smartDefaults.defaultCostPrice;
        const rawStock = currentMapping.current_stock ? row[currentMapping.current_stock] : '';
        stock = rawStock ? Math.max(0, parseInt(String(rawStock).replace(/[^0-9.-]/g, ''), 10) || smartDefaults.defaultStock) : smartDefaults.defaultStock;
        
        const rawExpiry = currentMapping.expiry_date ? row[currentMapping.expiry_date] : '';
        expiryDate = parseDate(rawExpiry) || defaultExpiry;
        
        const rawBatch = currentMapping.batch_number ? row[currentMapping.batch_number] : '';
        batchNumber = rawBatch && rawBatch.trim() ? rawBatch.trim() : batchNumber;
        
        const rawCategory = currentMapping.category ? row[currentMapping.category] ?? '' : '';
        category = rawCategory || 'Other';
      }

      const wholesalePrice = currentMapping.wholesale_price ? String(parsePrice(row[currentMapping.wholesale_price])) : '';
      const sellingPrice = currentMapping.selling_price ? String(parsePrice(row[currentMapping.selling_price])) : '';
      
      // Calculate reorder level
      let reorderLevel: number;
      if (currentMapping.reorder_level && row[currentMapping.reorder_level]) {
        reorderLevel = parseInt(String(row[currentMapping.reorder_level]).replace(/[^0-9.-]/g, ''), 10) || calculateSmartReorderLevel(stock);
      } else {
        reorderLevel = calculateSmartReorderLevel(stock);
      }

      // Barcode lookup
      const rawBarcode = currentMapping.barcode_id ? row[currentMapping.barcode_id] : '';
      let barcodeId = typeof rawBarcode === 'string' && rawBarcode.trim() ? rawBarcode.trim() : '';
      if (!barcodeId && productName) barcodeId = findBarcodeByName(productName) || '';
      
      const rawNafdac = currentMapping.nafdac_reg_number ? row[currentMapping.nafdac_reg_number] : '';
      const nafdacReg = typeof rawNafdac === 'string' && rawNafdac.trim() ? rawNafdac.trim() : '';
      
      const rawManufacturer = currentMapping.manufacturer ? row[currentMapping.manufacturer] : '';
      const manufacturer = typeof rawManufacturer === 'string' ? rawManufacturer.trim() : '';

      // Check for existing products
      const existingBatches = productName ? findExistingProductsByName(medications, productName) : [];
      const isNewBatch = existingBatches.length > 0;

      // Determine validity and warnings
      const isValid = !!productName;
      let warningMsg: string | undefined;
      if (!productName) {
        warningMsg = 'No product name - will be skipped';
      } else if (costPrice === 0) {
        warningMsg = 'No cost price set';
      } else if (expiryDate === defaultExpiry && !isParsedFromCompound) {
        warningMsg = 'Using default expiry date';
      }

      return {
        id: idx,
        name: productName,
        generic_name: '',
        manufacturer,
        category,
        batch_number: batchNumber,
        current_stock: String(stock),
        reorder_level: String(reorderLevel),
        expiry_date: expiryDate,
        unit_price: String(costPrice),
        selling_price: sellingPrice,
        wholesale_price: wholesalePrice,
        barcode_id: barcodeId,
        nafdac_reg_number: nafdacReg,
        isValid,
        warningMsg,
        existingBatches,
        isNewBatch,
        isParsedFromCompound,
      };
    });
  }, [findBarcodeByName, medications, getDefaultExpiry, smartDefaults]);

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
      description: `Calculated optimal reorder levels for ${editableRows.length} products.`,
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
      description: `Set reorder level to ${level} for all products.`,
    });
  };

  // Apply bulk expiry date
  const applyBulkExpiry = () => {
    if (!bulkExpiry) return;
    setEditableRows((prev) =>
      prev.map((r) => ({ ...r, expiry_date: bulkExpiry, warningMsg: undefined }))
    );
    toast({
      title: 'Bulk Expiry Applied',
      description: `Set expiry date to ${bulkExpiry} for all products.`,
    });
  };

  // Set all empty stocks to 1
  const applyDefaultStock = () => {
    setEditableRows((prev) =>
      prev.map((r) => {
        const stock = parseInt(r.current_stock, 10) || 0;
        if (stock === 0) {
          return { ...r, current_stock: '1', reorder_level: '1' };
        }
        return r;
      })
    );
    toast({
      title: 'Default Stock Applied',
      description: 'Set stock to 1 for items with zero quantity.',
    });
  };

  const proceedToReview = () => {
    const rows = buildEditableRowsFromData(csvData, mapping, hasCompoundData);
    setEditableRows(rows);
    setStep('review');
  };

  const updateEditableRow = (id: number, field: keyof EditableRow, value: string) => {
    setEditableRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        updated.isValid = !!updated.name.trim();
        updated.warningMsg = updated.isValid ? undefined : 'No product name';
        return updated;
      })
    );
  };

  const removeRow = (id: number) => {
    setEditableRows((prev) => prev.filter((r) => r.id !== id));
  };

  const validRowCount = useMemo(() => editableRows.filter((r) => r.isValid).length, [editableRows]);
  const warningRowCount = useMemo(() => editableRows.filter((r) => r.isValid && r.warningMsg).length, [editableRows]);

  const handleImport = async () => {
    try {
      const rowsToImport = editableRows.filter((r) => r.isValid);
      if (rowsToImport.length === 0) {
        toast({ title: 'No valid rows', description: 'Add product names to import.', variant: 'destructive' });
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
            current_stock: parseInt(row.current_stock, 10) || 1,
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
      toast({ title: 'Import Error', description: 'Something went wrong during import.', variant: 'destructive' });
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
    setHasCompoundData(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-4xl h-[90dvh] min-h-0 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Products
            <Badge variant="secondary" className="ml-2 gap-1">
              <Sparkles className="h-3 w-3" />
              Zero-Friction
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Upload any file - we'll figure out the rest"}
            {step === 'mapping' && `Found ${headers.length} columns. Adjust mappings if needed.`}
            {step === 'review' && `Review ${editableRows.length} products. Edit anything before importing.`}
            {step === 'importing' && `Importing ${validRowCount} products...`}
            {step === 'complete' && `Done! ${importedCount} products added.`}
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
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Works with ANY format:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <span className="font-medium">Multi-column:</span> Separate columns for name, price, quantity, etc.</li>
                <li>• <span className="font-medium">Single-column:</span> "Paracetamol 500mg x100 @₦1500 exp 03/26"</li>
                <li>• <span className="font-medium">Mixed formats:</span> We'll parse what we can, you edit the rest</li>
              </ul>
            </div>

            {/* Smart Defaults Settings */}
            <div className="mt-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Default Values
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Default Expiry</Label>
                  <Select
                    value={String(smartDefaults.defaultExpiryMonths)}
                    onValueChange={(v) => setSmartDefaults(prev => ({ ...prev, defaultExpiryMonths: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">1 year</SelectItem>
                      <SelectItem value="24">2 years</SelectItem>
                      <SelectItem value="36">3 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Default Stock</Label>
                  <Select
                    value={String(smartDefaults.defaultStock)}
                    onValueChange={(v) => setSmartDefaults(prev => ({ ...prev, defaultStock: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Default Price</Label>
                  <Select
                    value={String(smartDefaults.defaultCostPrice)}
                    onValueChange={(v) => setSmartDefaults(prev => ({ ...prev, defaultCostPrice: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">₦0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAPPING STEP */}
        {step === 'mapping' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2 min-h-0">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{mappedCount} columns mapped</Badge>
              <Badge variant="outline">{csvData.length} rows</Badge>
              {hasCompoundData && (
                <Badge variant="secondary" className="gap-1">
                  <Wand2 className="h-3 w-3" />
                  Smart parsing enabled
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0 pr-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground mb-2">Map Your Columns (all optional)</div>
                {allFields.map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <div className="w-40 flex items-center gap-2">
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
              <Button onClick={proceedToReview} className="gap-2 bg-gradient-primary hover:opacity-90">
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
            {/* Status badges and bulk actions */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1">
                <Edit3 className="h-3 w-3" />
                Click to edit
              </Badge>
              <Badge variant={validRowCount === editableRows.length ? 'default' : 'outline'}>
                {validRowCount} valid
              </Badge>
              {warningRowCount > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/50">
                  <AlertTriangle className="h-3 w-3" />
                  {warningRowCount} with warnings
                </Badge>
              )}
              {editableRows.some(r => r.isNewBatch) && (
                <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-600">
                  <Layers className="h-3 w-3" />
                  {editableRows.filter(r => r.isNewBatch).length} existing
                </Badge>
              )}
              {hasCompoundData && (
                <Badge variant="secondary" className="gap-1">
                  <Wand2 className="h-3 w-3" />
                  AI parsed
                </Badge>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground mr-2">Bulk:</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Calendar className="h-3 w-3" />
                    Set Expiry
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs">Set expiry for all products</Label>
                    <Input
                      type="date"
                      value={bulkExpiry}
                      onChange={(e) => setBulkExpiry(e.target.value)}
                      className="h-8"
                    />
                    <Button size="sm" onClick={applyBulkExpiry} disabled={!bulkExpiry} className="w-full">
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Package className="h-3 w-3" />
                    Set Reorder Level
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs">Fixed reorder level</Label>
                    <Input
                      type="number"
                      value={bulkReorderLevel}
                      onChange={(e) => setBulkReorderLevel(e.target.value)}
                      className="h-8 w-20"
                      min={0}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={applyBulkReorderLevel} className="flex-1">
                        Apply
                      </Button>
                      <Button size="sm" variant="outline" onClick={applySmartReorderLevels}>
                        Smart
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={applyDefaultStock}>
                Set Zero Stock → 1
              </Button>
            </div>

            {/* Editable Table */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_80px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-2 py-1 bg-muted/50 rounded sticky top-0">
                  <span>Product Name</span>
                  <span>Stock</span>
                  <span>Cost</span>
                  <span>Expiry</span>
                  <span></span>
                </div>
                
                {editableRows.map((row) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1fr_80px_80px_100px_40px] gap-2 items-center px-2 py-1.5 rounded border ${
                      !row.isValid ? 'border-destructive/30 bg-destructive/5' :
                      row.warningMsg ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20' :
                      row.isNewBatch ? 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20' :
                      'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Input
                        value={row.name}
                        onChange={(e) => updateEditableRow(row.id, 'name', e.target.value)}
                        placeholder="Product name..."
                        className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                      />
                      {row.isParsedFromCompound && (
                        <Wand2 className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                      {row.isNewBatch && (
                        <Layers className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <Input
                      value={row.current_stock}
                      onChange={(e) => updateEditableRow(row.id, 'current_stock', e.target.value)}
                      className="h-7 text-sm text-center"
                      type="number"
                      min={0}
                    />
                    <Input
                      value={row.unit_price}
                      onChange={(e) => updateEditableRow(row.id, 'unit_price', e.target.value)}
                      className="h-7 text-sm text-center"
                      type="number"
                      min={0}
                    />
                    <Input
                      value={row.expiry_date}
                      onChange={(e) => updateEditableRow(row.id, 'expiry_date', e.target.value)}
                      className="h-7 text-sm"
                      type="date"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
              <div className="flex-1 text-sm text-muted-foreground">
                {validRowCount} products ready to import
                {warningRowCount > 0 && ` (${warningRowCount} with warnings)`}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back to Mapping
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validRowCount === 0}
                  className="gap-2 bg-gradient-primary hover:opacity-90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Import {validRowCount} Products
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {/* IMPORTING STEP */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Importing Products...</p>
              <p className="text-muted-foreground">{importedCount} of {validRowCount} complete</p>
            </div>
            <Progress value={importProgress} className="w-64" />
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === 'complete' && (
          <div className="flex-1 flex flex-col py-4 min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${errors.length === 0 ? 'bg-success/10' : 'bg-amber-500/10'}`}>
                {errors.length === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-success" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-amber-500" />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold">
                  {errors.length === 0 ? 'Import Complete!' : 'Import Complete with Errors'}
                </p>
                <p className="text-muted-foreground">
                  Successfully imported {importedCount} products
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2 text-destructive">
                  {errors.length} errors occurred:
                </p>
                <ScrollArea className="h-32 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <ul className="text-sm space-y-1">
                    {errors.map((err, i) => (
                      <li key={i} className="text-destructive">{err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
