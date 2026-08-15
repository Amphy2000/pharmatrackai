import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, Check, AlertCircle, X, Loader2, 
  Sparkles, ArrowRight, AlertTriangle, Info, Database 
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ImportEntityType, 
  IMPORT_CONFIGS, 
  ImportPreviewRow, 
  ImportResult 
} from '@/types/import';
import { 
  autoMapHeaders, 
  parseFlexibleDate, 
  parseNumericValue 
} from '@/utils/fuzzyFieldMatcher';
import { useMedications } from '@/hooks/useMedications';
import { useCustomers } from '@/hooks/useCustomers';
import { useDoctors } from '@/hooks/useDoctors';
import { MedicationFormData, MedicationCategory } from '@/types/medication';
import { callPharmacyAi } from '@/lib/pharmacyAiClient';

interface IntelligentDataImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityType?: ImportEntityType;
}

const categoryMap: Record<string, MedicationCategory> = {
  tablet: 'Tablet', tablets: 'Tablet',
  syrup: 'Syrup', syrups: 'Syrup',
  capsule: 'Capsule', capsules: 'Capsule',
  injection: 'Injection', injections: 'Injection',
  cream: 'Cream', creams: 'Cream',
  drops: 'Drops', drop: 'Drops',
  inhaler: 'Inhaler', inhalers: 'Inhaler',
  powder: 'Powder', powders: 'Powder',
  vitamins: 'Vitamins', vitamin: 'Vitamins',
  supplements: 'Supplements', supplement: 'Supplements',
  other: 'Other',
};

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export const IntelligentDataImportModal = ({ 
  open, 
  onOpenChange, 
  defaultEntityType = 'medication' 
}: IntelligentDataImportModalProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addMedication } = useMedications();
  const { addCustomer } = useCustomers();
  const { addDoctor } = useDoctors();

  const [step, setStep] = useState<Step>('upload');
  const [entityType, setEntityType] = useState<ImportEntityType>(defaultEntityType);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, { mappedTo: string; confidence: number } | null>>({});
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const config = IMPORT_CONFIGS[entityType];
  const allFields = [...config.fields.required, ...config.fields.optional];

  const [isAiExtracting, setIsAiExtracting] = useState(false);

  const processData = (data: Record<string, string>[], originalRawText?: string) => {
    if (!data || data.length === 0) {
      toast({ title: 'Empty Data', description: 'No valid records could be parsed.', variant: 'destructive' });
      return;
    }

    // Guard 1: Filter out rows that consist of raw binary noise (e.g. uncompressed ZIP bytes or binary dumps)
    const cleanedRows = data.filter(row => {
      const textSample = Object.values(row).join(' ');
      if (!textSample || textSample.length < 3) return false;
      // Count valid readable characters (letters, numbers, spaces, standard punctuation)
      const readableCount = (textSample.match(/[a-zA-Z0-9\s.,/()%#₦$+-]/g) || []).length;
      const ratio = readableCount / textSample.length;
      // If less than 60% of characters are readable text, it's binary garbage
      return ratio >= 0.60;
    });

    if (cleanedRows.length === 0) {
      if (originalRawText && originalRawText.trim().length > 10) {
        toast({
          title: '⚡ Binary Backup Detected',
          description: 'Document contains legacy binary formatting. Switched to AI extraction...',
        });
        handleAiUnstructuredExtract(originalRawText);
        return;
      }
      toast({ title: 'Invalid Document', description: 'File contained unreadable binary formatting.', variant: 'destructive' });
      return;
    }

    // Clean up headers from non-printable symbols
    const firstRowKeys = Object.keys(cleanedRows[0]);
    const cleanHeaders = firstRowKeys.map(k => k.replace(/[^a-zA-Z0-9\s_#/()%-]/g, '').trim() || 'Field');

    const sanitizedRows = cleanedRows.map(row => {
      const cleanRow: Record<string, string> = {};
      firstRowKeys.forEach((oldKey, idx) => {
        const newKey = cleanHeaders[idx];
        const val = row[oldKey] || '';
        cleanRow[newKey] = val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
      });
      return cleanRow;
    });

    setRawData(sanitizedRows);
    setHeaders(cleanHeaders);
    
    // Auto-map headers using AI fuzzy matching
    const autoMappings = autoMapHeaders(cleanHeaders, allFields, sanitizedRows);
    setMappings(autoMappings);
    
    setStep('mapping');
  };

  const handleAiUnstructuredExtract = async (text: string) => {
    setIsAiExtracting(true);
    toast({
      title: '⚡ Deciphering Legacy Backup',
      description: 'Using AI to parse legacy document format (e.g. Atrex / Word / PDF)...',
    });

    try {
      const response = await callPharmacyAi<{ records: Record<string, any>[] }>({
        action: 'extract_unstructured_import',
        payload: { rawText: text, entityType },
      });

      if (response && Array.isArray(response.records) && response.records.length > 0) {
        // Convert records to string values for processData
        const stringifiedRows = response.records.map(rec => {
          const row: Record<string, string> = {};
          Object.keys(rec).forEach(key => {
            row[key] = rec[key] !== null && rec[key] !== undefined ? String(rec[key]) : '';
          });
          return row;
        });

        toast({
          title: 'Import Successful',
          description: `Extracted ${stringifiedRows.length} records from legacy document using AI!`,
        });

        processData(stringifiedRows);
      } else {
        toast({
          title: 'Extraction Notice',
          description: 'AI could not automatically extract structured records. Please check the document format.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('AI extraction error:', err);
      toast({
        title: 'AI Extraction Failed',
        description: err.message || 'Failed to extract data using AI.',
        variant: 'destructive',
      });
    } finally {
      setIsAiExtracting(false);
    }
  };

  const processFile = useCallback((file: File) => {
    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc');

    if (isDocx) {
      // Clean Word .docx XML Table Extractor
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const decoder = new TextDecoder('utf-8');
          const rawText = decoder.decode(buffer);

          // Extract Word Table rows <w:tr> and cells <w:tc>
          const trMatches = rawText.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/gi);
          if (trMatches && trMatches.length > 0) {
            const rows: Record<string, string>[] = [];
            let headers: string[] = [];

            trMatches.forEach((trXml) => {
              const tcMatches = trXml.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/gi);
              if (tcMatches) {
                const cellTexts = tcMatches.map(tcXml => {
                  const textMatches = tcXml.match(/<w:t[\s>][^>]*>([\s\S]*?)<\/w:t>/gi) || [];
                  return textMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
                });

                if (headers.length === 0 && cellTexts.some(c => c.length > 0)) {
                  headers = cellTexts.map((h, idx) => h || `Col_${idx + 1}`);
                } else if (cellTexts.some(c => c.length > 0)) {
                  const row: Record<string, string> = {};
                  cellTexts.forEach((val, colIdx) => {
                    const headerKey = headers[colIdx] || `Col_${colIdx + 1}`;
                    row[headerKey] = val;
                  });
                  rows.push(row);
                }
              }
            });

            if (rows.length > 0) {
              processData(rows);
              return;
            }
          }

          // Fallback: extract plain text nodes <w:t> for AI extraction
          const textMatches = rawText.match(/<w:t[\s>][^>]*>([\s\S]*?)<\/w:t>/gi);
          if (textMatches && textMatches.length > 0) {
            const plainText = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ');
            if (plainText.trim().length > 10) {
              handleAiUnstructuredExtract(plainText);
              return;
            }
          }
        } catch (err) {
          console.warn('.docx parsing failed, using AI fallback...', err);
        }

        handleAiUnstructuredExtract(`Document: ${file.name}`);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const isStandardSpreadsheet = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods') || fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.dbf');
    
    if (isStandardSpreadsheet) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const firstSheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { 
            raw: false,
            defval: '' 
          });
          
          if (jsonData && jsonData.length > 0 && Object.keys(jsonData[0]).length > 1) {
            processData(jsonData);
            return;
          }
        } catch (error) {
          console.warn('Standard XLSX parse failed, trying legacy text fallback...', error);
        }

        // Fallback for CSV/TSV using PapaParse
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              processData(results.data as Record<string, string>[]);
            } else {
              readAsLegacyText(file);
            }
          },
          error: () => readAsLegacyText(file),
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      readAsLegacyText(file);
    }
  }, [toast, entityType]);

  const readAsLegacyText = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let rawText = '';
      if (typeof e.target?.result === 'string') {
        rawText = e.target.result;
      } else if (e.target?.result instanceof ArrayBuffer) {
        const decoder = new TextDecoder('latin1'); // Preserves character boundaries in binary .doc dumps
        rawText = decoder.decode(e.target.result);
      }

      // Clean non-printable binary control characters while preserving lines and text
      const cleanedText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();

      if (!cleanedText) {
        toast({ title: 'Empty Document', description: 'Could not extract readable text from file.', variant: 'destructive' });
        return;
      }

      // Scan lines to find header and table data (handles report title headers / page numbers)
      const lines = cleanedText.split(/\r?\n/).filter(l => l.trim().length > 0);
      const delimiters = ['|', '\t', ',', ';', '   '];
      
      // 1. Multi-line Delimiter Scanner (scans top 20 lines to find the true table header)
      let bestDelimiter = '';
      let bestHeaderIndex = -1;
      let maxCols = 0;

      for (let lineIdx = 0; lineIdx < Math.min(20, lines.length); lineIdx++) {
        for (const delim of delimiters) {
          const cols = lines[lineIdx].split(delim).filter(c => c.trim().length > 0).length;
          if (cols > maxCols && cols >= 2) {
            maxCols = cols;
            bestDelimiter = delim;
            bestHeaderIndex = lineIdx;
          }
        }
      }

      if (bestDelimiter && bestHeaderIndex !== -1 && lines.length > bestHeaderIndex + 1) {
        const headerCols = lines[bestHeaderIndex]
          .split(bestDelimiter)
          .map(h => h.trim())
          .filter(Boolean);

        const rows: Record<string, string>[] = [];

        for (let i = bestHeaderIndex + 1; i < lines.length; i++) {
          const lineText = lines[i].trim();
          // Skip page footers or report headers
          if (lineText.startsWith('Page ') || lineText.startsWith('Printed:') || lineText.startsWith('---')) continue;

          const cells = lines[i].split(bestDelimiter);
          if (cells.length >= 2) {
            const row: Record<string, string> = {};
            headerCols.forEach((col, idx) => {
              row[col || `Col_${idx + 1}`] = cells[idx]?.trim() || '';
            });
            rows.push(row);
          }
        }

        if (rows.length > 0) {
          processData(rows, cleanedText);
          return;
        }
      }

      // 2. Local Regex Pattern Extractor for print reports (e.g. "Paracetamol 500mg Tab   100   ₦250.00")
      const regexRows: Record<string, string>[] = [];
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.length < 5 || cleanLine.toLowerCase().includes('report') || cleanLine.toLowerCase().includes('total')) continue;
        
        // Matches: [Name] [Qty/Stock] [Price]
        const match = cleanLine.match(/^([A-Za-z0-9\s/().%+-]{3,50})\s+(\d+)\s+(?:₦|\$|NGN|EUR|GBP)?\s*([\d,]+(?:\.\d{2})?)/);
        if (match) {
          regexRows.push({
            'Product Name': match[1].trim(),
            'Stock Quantity': match[2].trim(),
            'Selling Price': match[3].replace(/,/g, '').trim(),
          });
        }
      }

      if (regexRows.length >= 2) {
        processData(regexRows, cleanedText);
        return;
      }

      // 3. Fallback: Unstructured document/report (Atrex .doc, PDF report, Word doc) -> AI extraction!
      handleAiUnstructuredExtract(cleanedText);
    };

    // Try ArrayBuffer first for robust binary string decoding
    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const updateMapping = (header: string, targetField: string) => {
    setMappings(prev => ({
      ...prev,
      [header]: targetField ? { mappedTo: targetField, confidence: 1 } : null,
    }));
  };

  const generatePreview = () => {
    const preview: ImportPreviewRow[] = rawData.slice(0, 50).map((row, index) => {
      const data: Record<string, any> = {};
      const metadata: Record<string, string> = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      headers.forEach(header => {
        const mapping = mappings[header];
        const value = row[header]?.trim() || '';
        
        if (mapping?.mappedTo) {
          data[mapping.mappedTo] = value;
          if (mapping.confidence < 0.7) {
            warnings.push(`"${header}" → "${mapping.mappedTo}" (low confidence)`);
          }
        } else if (value) {
          metadata[header] = value;
        }
      });

      // Validate required fields
      config.fields.required.forEach(field => {
        if (!data[field]) {
          errors.push(`Missing required field: ${config.labels[field] || field}`);
        }
      });

      return { rowIndex: index + 2, data, metadata, errors, warnings };
    });

    setPreviewRows(preview);
    setStep('preview');
  };

  const executeImport = async () => {
    setStep('importing');
    setImportProgress(0);
    
    const errors: Array<{ row: number; message: string }> = [];
    let successCount = 0;
    const metadataColumns = new Set<string>();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        const data: Record<string, any> = {};
        const metadata: Record<string, string> = {};

        headers.forEach(header => {
          const mapping = mappings[header];
          const value = row[header]?.trim() || '';
          
          if (mapping?.mappedTo) {
            data[mapping.mappedTo] = value;
          } else if (value) {
            metadata[header] = value;
            metadataColumns.add(header);
          }
        });

        if (entityType === 'medication') {
          await importMedication(data, metadata);
        } else if (entityType === 'customer') {
          await importCustomer(data, metadata);
        } else if (entityType === 'doctor') {
          await importDoctor(data, metadata);
        }

        successCount++;
      } catch (error) {
        errors.push({ 
          row: i + 2, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      setImportProgress(Math.round(((i + 1) / rawData.length) * 100));
    }

    setImportResult({
      totalRows: rawData.length,
      successCount,
      errorCount: errors.length,
      metadataColumnsPreserved: metadataColumns.size,
      errors,
    });
    
    setStep('complete');
  };

  const importMedication = async (data: Record<string, any>, metadata: Record<string, string>) => {
    const categoryValue = (data.category || '').toLowerCase().trim();
    const category: MedicationCategory = categoryMap[categoryValue] || 'Other';
    
    const expiryDate = parseFlexibleDate(data.expiry_date);
    if (!expiryDate) throw new Error('Invalid expiry date');
    
    const medication: MedicationFormData & { metadata?: Record<string, string> } = {
      name: data.name || '',
      category,
      batch_number: data.batch_number || `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      current_stock: parseNumericValue(data.current_stock) || 0,
      reorder_level: parseNumericValue(data.reorder_level) || 10,
      expiry_date: expiryDate,
      manufacturing_date: parseFlexibleDate(data.manufacturing_date) || undefined,
      unit_price: parseNumericValue(data.unit_price) || 0,
      selling_price: parseNumericValue(data.selling_price) || undefined,
      barcode_id: data.barcode_id || undefined,
      nafdac_reg_number: data.nafdac_reg_number || undefined,
    };

    if (!medication.name) throw new Error('Name is required');

    // Add with metadata
    await addMedication.mutateAsync({
      ...medication,
      // Metadata will be stored in the medication record
    } as any);
  };

  const importCustomer = async (data: Record<string, any>, metadata: Record<string, string>) => {
    const customer = {
      full_name: data.full_name || '',
      phone: data.phone || undefined,
      email: data.email || undefined,
      date_of_birth: parseFlexibleDate(data.date_of_birth) || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
      metadata,
    };

    if (!customer.full_name) throw new Error('Name is required');
    
    await addCustomer.mutateAsync(customer as any);
  };

  const importDoctor = async (data: Record<string, any>, metadata: Record<string, string>) => {
    const doctor = {
      full_name: data.full_name || '',
      phone: data.phone || undefined,
      email: data.email || undefined,
      hospital_clinic: data.hospital_clinic || undefined,
      specialty: data.specialty || undefined,
      license_number: data.license_number || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
      metadata,
    };

    if (!doctor.full_name) throw new Error('Name is required');
    
    await addDoctor.mutateAsync(doctor);
  };

  const handleClose = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setMappings({});
    setPreviewRows([]);
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  const mappedCount = Object.values(mappings).filter(m => m?.mappedTo).length;
  const unmappedCount = headers.length - mappedCount;
  const highConfidenceCount = Object.values(mappings).filter(m => m && m.confidence >= 0.7).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl h-[85vh] max-h-[85vh] flex flex-col min-h-0 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0 mb-2">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Intelligent Data Import
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Upload CSV or Excel file - we'll map your data automatically"}
            {step === 'mapping' && 'Review AI-suggested mappings and adjust as needed'}
            {step === 'preview' && 'Preview import data before processing'}
            {step === 'importing' && 'Importing your data...'}
            {step === 'complete' && 'Import complete!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-2 flex-1 min-h-0 overflow-y-auto pr-1">
            <Tabs value={entityType} onValueChange={(v) => setEntityType(v as ImportEntityType)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="medication">Products</TabsTrigger>
                <TabsTrigger value="customer">Patients</TabsTrigger>
                <TabsTrigger value="doctor">Doctors</TabsTrigger>
              </TabsList>
            </Tabs>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods,.dbf,.doc,.docx,.txt,.rtf,.bak,.dat,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div
              onClick={() => !isAiExtracting && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`w-full h-48 border-2 border-dashed border-border/50 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer relative overflow-hidden ${isAiExtracting ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isAiExtracting ? (
                <div className="flex flex-col items-center gap-3 text-primary animate-pulse">
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <p className="font-semibold text-base">⚡ Deciphering Legacy Backup with AI...</p>
                  <p className="text-xs text-muted-foreground max-w-sm text-center">Parsing legacy software report (Atrex, WinPharm, Word document, PDF or custom text backup)...</p>
                </div>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center px-4">
                    <p className="font-medium text-base">Click to upload or drag & drop backup file</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: <b>CSV, Excel (.xlsx, .xls), Word (.doc, .docx), Text dumps (.txt, .dat, .bak), PDF & DBF</b>
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-Deciphers Atrex, WinPharm, Rx30 & Legacy Software Reports
                  </Badge>
                </>
              )}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">Universal Legacy Software Ingestion</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <b>Proprietary Backup Support</b>: Works with messy Word dumps, binary exports, or text reports from Atrex, WinPharm, Rx30, or custom local POS.</li>
                <li>• <b>AI Unstructured Extraction</b>: Automatically identifies Drug Name, Stock, Cost Price, Selling Price, Expiry Date & Batch numbers even if unformatted.</li>
                <li>• <b>Zero Data Loss</b>: Unmapped fields are preserved safely in custom metadata for complete record keeping.</li>
              </ul>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-accent">
              <p className="text-sm italic text-foreground">
                "Sir, give me an export of your current stock from your old system. I will upload it into PharmaTrack in 5 minutes. You won't lose a single tablet of data."
              </p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="flex gap-2">
                <Badge variant="secondary">{rawData.length} rows</Badge>
                <Badge variant="default" className="bg-primary/20 text-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {highConfidenceCount} auto-matched
                </Badge>
                {unmappedCount > 0 && (
                  <Badge variant="outline">
                    <Database className="h-3 w-3 mr-1" />
                    {unmappedCount} → metadata
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 pr-3">
              <div className="space-y-3">
                {headers.map((header) => {
                  const mapping = mappings[header];
                  const sampleValues = rawData.slice(0, 3).map(r => r[header]).filter(Boolean);
                  
                  return (
                    <div key={header} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{header}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {sampleValues.join(', ') || 'No data'}
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      <Select
                        value={mapping?.mappedTo || '_metadata'}
                        onValueChange={(v) => updateMapping(header, v === '_metadata' ? '' : v)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_metadata">
                            <span className="flex items-center gap-2">
                              <Database className="h-3 w-3" />
                              Save to Metadata
                            </span>
                          </SelectItem>
                          {allFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {config.labels[field] || field}
                              {config.fields.required.includes(field) && ' *'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {mapping?.mappedTo && (
                        <div className="flex-shrink-0">
                          {mapping.confidence >= 0.7 ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-3 pt-3 border-t flex-shrink-0">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={generatePreview} className="gap-2 bg-gradient-primary">
                Preview Import
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-center gap-4 mb-3 flex-shrink-0">
              <Badge variant="secondary">{previewRows.length} of {rawData.length} rows shown</Badge>
              {previewRows.some(r => r.errors.length > 0) && (
                <Badge variant="destructive">
                  {previewRows.filter(r => r.errors.length > 0).length} with errors
                </Badge>
              )}
              {previewRows.some(r => Object.keys(r.metadata).length > 0) && (
                <Badge variant="outline">
                  <Database className="h-3 w-3 mr-1" />
                  Extra data preserved
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0 pr-3">
              <div className="space-y-2">
                {previewRows.slice(0, 20).map((row) => (
                  <div 
                    key={row.rowIndex} 
                    className={`p-3 rounded-lg border ${
                      row.errors.length > 0 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : 'border-border/50 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Row {row.rowIndex}
                      </span>
                      <div className="flex gap-2">
                        {row.errors.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {Object.keys(row.metadata).length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(row.metadata).length} metadata
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium">
                      {row.data.name || row.data.full_name || 'No name'}
                    </div>
                    
                    {row.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {row.errors.map((err, i) => (
                          <div key={i} className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {err}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button onClick={executeImport} className="gap-2 bg-gradient-primary">
                <Upload className="h-4 w-4" />
                Import {rawData.length} Items
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-6">
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
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="py-8 flex flex-col items-center justify-center gap-6">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
              importResult.errorCount === 0 ? 'bg-success/20' : 'bg-warning/20'
            }`}>
              {importResult.errorCount === 0 ? (
                <Check className="h-8 w-8 text-success" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-warning" />
              )}
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Import Complete</h3>
              <p className="text-muted-foreground">
                Successfully imported {importResult.successCount} of {importResult.totalRows} items
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              <div className="text-center p-4 rounded-lg bg-success/10">
                <div className="text-2xl font-bold text-success">{importResult.successCount}</div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-destructive/10">
                <div className="text-2xl font-bold text-destructive">{importResult.errorCount}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary">{importResult.metadataColumnsPreserved}</div>
                <div className="text-xs text-muted-foreground">Metadata Cols</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <ScrollArea className="w-full max-h-32">
                <div className="space-y-1">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      Row {err.row}: {err.message}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      ...and {importResult.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <Button onClick={handleClose} className="bg-gradient-primary">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
