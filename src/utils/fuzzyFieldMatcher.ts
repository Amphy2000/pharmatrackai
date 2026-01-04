// Keyword mapping dictionary for intelligent field matching
export const FIELD_SYNONYMS: Record<string, string[]> = {
  // Product/Medication fields
  name: ['item', 'description', 'drug name', 'product', 'sku name', 'product name', 'drug', 'medicine', 'medication', 'item name', 'article'],
  unit_price: ['p.price', 'cost', 'unit cost', 'rate', 'w-sale', 'land cost', 'purchase price', 'buy price', 'cost price', 'wholesale'],
  selling_price: ['s.price', 'retail', 'msrp', 'unit price', 'dispense price', 'sale price', 'sell price', 'retail price', 'selling'],
  batch_number: ['bn', 'b/n', 'batch', 'lot', 'lot no', 'control no', 'batch no', 'batch number', 'lot number'],
  expiry_date: ['exp', 'expiry', 'best before', 'valid to', 'e.date', 'expiration', 'exp date', 'expiry date', 'expires'],
  manufacturing_date: ['mfg', 'mfg date', 'manufacturing', 'mfd', 'production date', 'manufactured'],
  current_stock: ['qty', 'in stock', 'balance', 'soh', 'stock on hand', 'count', 'quantity', 'stock', 'stock level', 'available'],
  category: ['type', 'form', 'dosage form', 'category', 'classification', 'class'],
  barcode_id: ['barcode', 'upc', 'ean', 'sku', 'code', 'product code', 'item code'],
  nafdac_reg_number: ['nafdac', 'reg no', 'registration', 'nafdac no', 'reg number'],
  reorder_level: ['reorder', 'minimum', 'min stock', 'min qty', 'threshold', 'alert level'],
  supplier: ['vendor', 'manufacturer', 'supplier', 'source', 'distributor'],
  location: ['shelf', 'bin', 'location', 'storage', 'rack', 'position'],
  
  // Patient/Customer fields
  full_name: ['patient', 'customer', 'name', 'patient name', 'customer name', 'client', 'client name', 'full name'],
  phone: ['mobile', 'gsm', 'contact', 'tel', 'phone no', 'phone number', 'cell', 'telephone', 'mobile no'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  date_of_birth: ['dob', 'birth date', 'birthday', 'date of birth', 'age', 'born'],
  address: ['address', 'location', 'residence', 'home address', 'street'],
  
  // Doctor fields
  hospital_clinic: ['hospital', 'clinic', 'facility', 'workplace', 'practice', 'institution'],
  specialty: ['specialty', 'specialization', 'department', 'field', 'discipline'],
  license_number: ['license', 'license no', 'medical license', 'practitioner no', 'reg no', 'mdcn'],
};

// Normalize a string for matching
function normalize(str: string): string {
  return str.toLowerCase().replace(/[_\-\s.\/]+/g, ' ').trim();
}

// Calculate similarity score between two strings
function similarity(str1: string, str2: string): number {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Exact match
  if (s1 === s2) return 1;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Check word overlap
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0) {
    return 0.7 * (commonWords.length / Math.max(words1.length, words2.length));
  }
  
  return 0;
}

// Detect field type from sample values
export function detectFieldTypeFromValues(values: string[]): string | null {
  const sampleValues = values.slice(0, 10).filter(v => v && v.trim());
  
  if (sampleValues.length === 0) return null;
  
  // Check for date patterns (expiry/manufacturing dates)
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{2}\/\d{4}$/, // MM/YYYY (expiry format)
    /^\d{2}-\d{4}$/, // MM-YYYY
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // Month name
  ];
  
  const dateMatches = sampleValues.filter(v => 
    datePatterns.some(p => p.test(v.trim()))
  );
  
  if (dateMatches.length >= sampleValues.length * 0.7) {
    // Check if it looks like future dates (expiry) or past dates (manufacturing)
    const hasFutureYear = sampleValues.some(v => {
      const yearMatch = v.match(/20[2-9]\d/);
      return yearMatch && parseInt(yearMatch[0]) > new Date().getFullYear();
    });
    return hasFutureYear ? 'expiry_date' : 'date';
  }
  
  // Check for batch number patterns
  const batchPatterns = [
    /^[A-Z]{2,}\d+$/i, // Letters followed by numbers
    /^BN?\d+$/i, // BN prefix
    /^[A-Z0-9]{6,}$/i, // Alphanumeric 6+ chars
  ];
  
  const batchMatches = sampleValues.filter(v => 
    batchPatterns.some(p => p.test(v.trim()))
  );
  
  if (batchMatches.length >= sampleValues.length * 0.5) {
    return 'batch_number';
  }
  
  // Check for phone number patterns
  const phonePatterns = [
    /^0[789]\d{9}$/, // Nigerian mobile
    /^\+234\d{10}$/, // Nigerian with code
    /^\d{10,11}$/, // Generic phone
  ];
  
  const phoneMatches = sampleValues.filter(v => 
    phonePatterns.some(p => p.test(v.replace(/[\s\-()]/g, '')))
  );
  
  if (phoneMatches.length >= sampleValues.length * 0.5) {
    return 'phone';
  }
  
  // Check for email patterns
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailMatches = sampleValues.filter(v => emailPattern.test(v.trim()));
  
  if (emailMatches.length >= sampleValues.length * 0.5) {
    return 'email';
  }
  
  // Check for numeric values (stock/price)
  const numericMatches = sampleValues.filter(v => 
    /^[\d,]+\.?\d*$/.test(v.replace(/[₦$,\s]/g, ''))
  );
  
  if (numericMatches.length >= sampleValues.length * 0.7) {
    // Check if they look like prices (decimals, currency symbols)
    const hasCurrency = sampleValues.some(v => /[₦$]/.test(v));
    const hasDecimals = sampleValues.some(v => /\.\d{2}$/.test(v));
    return hasCurrency || hasDecimals ? 'price' : 'numeric';
  }
  
  return null;
}

// Match a header to a field using fuzzy logic
export function matchHeaderToField(
  header: string,
  targetFields: string[],
  columnValues?: string[]
): { field: string; confidence: number } | null {
  const normalizedHeader = normalize(header);
  let bestMatch: { field: string; confidence: number } | null = null;
  
  for (const field of targetFields) {
    const synonyms = FIELD_SYNONYMS[field] || [field];
    
    for (const synonym of synonyms) {
      const score = similarity(normalizedHeader, synonym);
      
      if (score > 0 && (!bestMatch || score > bestMatch.confidence)) {
        bestMatch = { field, confidence: score };
      }
    }
    
    // Also check direct field name match
    const directScore = similarity(normalizedHeader, field.replace(/_/g, ' '));
    if (directScore > 0 && (!bestMatch || directScore > bestMatch.confidence)) {
      bestMatch = { field, confidence: directScore };
    }
  }
  
  // If no match from header, try to detect from values
  if (!bestMatch && columnValues) {
    const detectedType = detectFieldTypeFromValues(columnValues);
    
    if (detectedType) {
      const matchingField = targetFields.find(f => {
        if (detectedType === 'price') return f.includes('price');
        if (detectedType === 'numeric') return f.includes('stock') || f.includes('quantity');
        if (detectedType === 'date') return f.includes('date');
        return f === detectedType;
      });
      
      if (matchingField) {
        bestMatch = { field: matchingField, confidence: 0.5 };
      }
    }
  }
  
  return bestMatch && bestMatch.confidence >= 0.3 ? bestMatch : null;
}

// Auto-map all headers to fields
export function autoMapHeaders(
  headers: string[],
  targetFields: string[],
  data: Record<string, string>[]
): Record<string, { mappedTo: string; confidence: number } | null> {
  const mappings: Record<string, { mappedTo: string; confidence: number } | null> = {};
  const usedFields = new Set<string>();
  
  // First pass: high confidence matches
  for (const header of headers) {
    const columnValues = data.map(row => row[header] || '');
    const match = matchHeaderToField(header, targetFields, columnValues);
    
    if (match && match.confidence >= 0.7 && !usedFields.has(match.field)) {
      mappings[header] = { mappedTo: match.field, confidence: match.confidence };
      usedFields.add(match.field);
    }
  }
  
  // Second pass: lower confidence matches
  for (const header of headers) {
    if (mappings[header]) continue;
    
    const columnValues = data.map(row => row[header] || '');
    const match = matchHeaderToField(
      header, 
      targetFields.filter(f => !usedFields.has(f)), 
      columnValues
    );
    
    if (match && !usedFields.has(match.field)) {
      mappings[header] = { mappedTo: match.field, confidence: match.confidence };
      usedFields.add(match.field);
    } else {
      mappings[header] = null; // Will go to metadata
    }
  }
  
  return mappings;
}

// Parse various date formats
export function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  const cleaned = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    // Assume DD/MM/YYYY (common in Nigeria)
    const day = parseInt(a) > 12 ? a : b;
    const month = parseInt(a) > 12 ? b : a;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // MM/YYYY (expiry format)
  const mmyyyyMatch = cleaned.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyyMatch) {
    const [, month, year] = mmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-01`;
  }
  
  // DD-MM-YYYY
  const dashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try native Date parsing
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// Parse numeric value (handles currency symbols, commas)
export function parseNumericValue(value: string): number {
  if (!value || !value.trim()) return 0;
  
  const cleaned = value.replace(/[₦$,\s]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

// Parse a compound product line that contains multiple data points in a single string
// Examples:
// "Paracetamol 500mg Tab x100 @₦1500 exp 03/26"
// "Amoxicillin 250mg Caps - 50pcs N2000 B/N: ABC123"
// "Vitamin C 1000mg (30 tablets) - ₦3,500"
export interface ParsedProductLine {
  name: string;
  quantity?: number;
  price?: number;
  expiry?: string;
  batchNumber?: string;
  category?: string;
}

export function parseCompoundProductLine(text: string): ParsedProductLine {
  if (!text || !text.trim()) {
    return { name: '' };
  }
  
  let remaining = text.trim();
  const result: ParsedProductLine = { name: '' };
  
  // Extract quantity patterns: x100, 100pcs, 100 units, (30 tablets), qty:50
  const qtyPatterns = [
    /\bx(\d+)\b/i,
    /\b(\d+)\s*(pcs|pieces|units?|tabs?|tablets?|caps?|capsules?|bottles?|packs?|boxes?|cartons?)\b/i,
    /\((\d+)\s*(tablets?|caps?|pieces?|pcs|units?)?\)/i,
    /\bqty[:\s]*(\d+)/i,
    /\bstock[:\s]*(\d+)/i,
  ];
  
  for (const pattern of qtyPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      result.quantity = parseInt(match[1], 10);
      remaining = remaining.replace(match[0], ' ');
      break;
    }
  }
  
  // Extract price patterns: ₦1500, N2000, @₦1,500, NGN 3500, price: 2000
  const pricePatterns = [
    /[₦N]\s*([\d,]+(?:\.\d{2})?)/i,
    /@\s*[₦N]?\s*([\d,]+(?:\.\d{2})?)/i,
    /\bNGN\s*([\d,]+(?:\.\d{2})?)/i,
    /\bprice[:\s]*[₦N]?\s*([\d,]+(?:\.\d{2})?)/i,
    /\bcost[:\s]*[₦N]?\s*([\d,]+(?:\.\d{2})?)/i,
    /\b([\d,]+(?:\.\d{2})?)\s*(?:naira|ngn)\b/i,
  ];
  
  for (const pattern of pricePatterns) {
    const match = remaining.match(pattern);
    if (match) {
      result.price = parseFloat(match[1].replace(/,/g, ''));
      remaining = remaining.replace(match[0], ' ');
      break;
    }
  }
  
  // Extract expiry patterns: exp 03/26, expiry: 2026-03-01, exp. Mar 2026, best before 03/2026
  const expiryPatterns = [
    /\b(?:exp(?:iry)?|best\s*before|bb)[:\s.]*(\d{1,2})[\/\-](\d{2,4})\b/i,
    /\b(?:exp(?:iry)?|best\s*before|bb)[:\s.]*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/i,
    /\b(?:exp(?:iry)?|best\s*before|bb)[:\s.]*([a-z]{3})\s*(\d{4})\b/i,
  ];
  
  for (const pattern of expiryPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      if (match[3]) {
        // YYYY-MM-DD format
        result.expiry = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else if (/^[a-z]{3}$/i.test(match[1])) {
        // Month name format
        const months: Record<string, string> = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const monthNum = months[match[1].toLowerCase()];
        if (monthNum) {
          result.expiry = `${match[2]}-${monthNum}-01`;
        }
      } else {
        // MM/YY or MM/YYYY format
        let year = match[2];
        if (year.length === 2) year = `20${year}`;
        result.expiry = `${year}-${match[1].padStart(2, '0')}-01`;
      }
      remaining = remaining.replace(match[0], ' ');
      break;
    }
  }
  
  // Extract batch number patterns: B/N: ABC123, batch: XYZ789, lot: 12345
  const batchPatterns = [
    /\b(?:b\/n|batch|lot|bn)[:\s]*([A-Z0-9\-]+)/i,
  ];
  
  for (const pattern of batchPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      result.batchNumber = match[1].trim();
      remaining = remaining.replace(match[0], ' ');
      break;
    }
  }
  
  // Detect category from common keywords
  const categoryKeywords: Record<string, string> = {
    'tab': 'Tablet', 'tablet': 'Tablet', 'tablets': 'Tablet',
    'cap': 'Capsule', 'caps': 'Capsule', 'capsule': 'Capsule', 'capsules': 'Capsule',
    'syrup': 'Syrup', 'syr': 'Syrup', 'suspension': 'Syrup', 'susp': 'Syrup',
    'inj': 'Injection', 'injection': 'Injection', 'vial': 'Injection',
    'cream': 'Cream', 'ointment': 'Cream', 'gel': 'Cream', 'topical': 'Cream',
    'drop': 'Drops', 'drops': 'Drops', 'eye': 'Drops', 'ear': 'Drops',
    'inhaler': 'Inhaler', 'spray': 'Inhaler', 'nasal': 'Inhaler',
    'powder': 'Powder', 'sachet': 'Powder',
  };
  
  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    const regex = new RegExp(`\\b${keyword}s?\\b`, 'i');
    if (regex.test(remaining)) {
      result.category = category;
      break;
    }
  }
  
  // Clean up the remaining text to get the product name
  result.name = remaining
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, '')
    .trim();
  
  // If name is empty or too short, use original text
  if (result.name.length < 2) {
    result.name = text.trim().substring(0, 100);
  }
  
  return result;
}

// Check if a text line likely contains compound data (multiple fields in one)
export function isCompoundLine(text: string): boolean {
  if (!text || text.length < 5) return false;
  
  const indicators = [
    /[₦N]\s*[\d,]+/i, // Price
    /\bx\d+\b/i, // Quantity like x100
    /\d+\s*(?:pcs|pieces|units?|tabs?|caps?)\b/i, // Quantity with unit
    /\bexp(?:iry)?[:\s]/i, // Expiry
    /\b(?:b\/n|batch|lot)[:\s]/i, // Batch
  ];
  
  let matchCount = 0;
  for (const pattern of indicators) {
    if (pattern.test(text)) matchCount++;
  }
  
  return matchCount >= 1;
}
