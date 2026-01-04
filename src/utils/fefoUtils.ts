import { Medication, CartItem } from '@/types/medication';
import { isBefore, parseISO } from 'date-fns';

// Check if a medication batch is expired
export const isExpiredBatch = (expiryDate: string): boolean => {
  return isBefore(parseISO(expiryDate), new Date());
};

// Group medications by name for POS display
export interface GroupedProduct {
  name: string;
  category: string;
  totalStock: number;
  lowestPrice: number;
  highestPrice: number;
  displayPrice: number;
  earliestExpiry: string;
  batches: Medication[];
  hasMultipleBatches: boolean;
  hasExpiredBatch: boolean;
  hasLowStock: boolean;
  earliestBatch: Medication;
  barcode_id?: string;
}

export const groupMedicationsByName = (medications: Medication[]): GroupedProduct[] => {
  const groups = new Map<string, Medication[]>();
  
  medications.forEach(med => {
    const key = med.name.toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(med);
  });
  
  return Array.from(groups.entries()).map(([, batches]) => {
    // Sort batches by expiry date (earliest first) - FEFO
    const sortedBatches = [...batches].sort((a, b) => 
      new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );
    
    // Filter out expired batches for stock calculation
    const validBatches = sortedBatches.filter(b => !isExpiredBatch(b.expiry_date));
    const earliestValidBatch = validBatches[0] || sortedBatches[0];
    
    // Calculate totals from valid batches only
    const totalStock = validBatches.reduce((sum, b) => sum + b.current_stock, 0);
    
    // Get price range
    const prices = validBatches
      .map(b => b.selling_price || b.unit_price)
      .filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    // Display price is from the earliest expiring valid batch (what we'll sell first)
    const displayPrice = earliestValidBatch?.selling_price || earliestValidBatch?.unit_price || 0;
    
    // Check for low stock across all valid batches
    const totalReorderLevel = validBatches.reduce((sum, b) => sum + b.reorder_level, 0) / validBatches.length || 10;
    
    return {
      name: earliestValidBatch?.name || sortedBatches[0].name,
      category: earliestValidBatch?.category || sortedBatches[0].category,
      totalStock,
      lowestPrice,
      highestPrice,
      displayPrice,
      earliestExpiry: earliestValidBatch?.expiry_date || sortedBatches[0].expiry_date,
      batches: sortedBatches,
      hasMultipleBatches: validBatches.length > 1,
      hasExpiredBatch: sortedBatches.some(b => isExpiredBatch(b.expiry_date)),
      hasLowStock: totalStock <= totalReorderLevel,
      earliestBatch: earliestValidBatch || sortedBatches[0],
      barcode_id: earliestValidBatch?.barcode_id || sortedBatches.find(b => b.barcode_id)?.barcode_id,
    };
  });
};

// FEFO deduction result
export interface FEFODeductionResult {
  batchDeductions: Array<{
    medication: Medication;
    quantityDeducted: number;
  }>;
  totalDeducted: number;
  usedMultipleBatches: boolean;
  batchExpiryInfo: string[];
}

// Calculate FEFO deductions for a sale (determines which batches to deduct from)
export const calculateFEFODeductions = (
  medications: Medication[],
  productName: string,
  quantityNeeded: number
): FEFODeductionResult => {
  // Get all valid batches sorted by expiry (earliest first)
  const validBatches = medications
    .filter(med => 
      med.name.toLowerCase().trim() === productName.toLowerCase().trim() && 
      med.current_stock > 0 && 
      !isExpiredBatch(med.expiry_date)
    )
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  
  const batchDeductions: FEFODeductionResult['batchDeductions'] = [];
  const batchExpiryInfo: string[] = [];
  let remainingQuantity = quantityNeeded;
  
  for (const batch of validBatches) {
    if (remainingQuantity <= 0) break;
    
    const deductAmount = Math.min(remainingQuantity, batch.current_stock);
    batchDeductions.push({
      medication: batch,
      quantityDeducted: deductAmount,
    });
    
    // Format expiry info for receipt
    const expiryDate = new Date(batch.expiry_date).toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit'
    });
    batchExpiryInfo.push(`${deductAmount}x exp ${expiryDate}`);
    
    remainingQuantity -= deductAmount;
  }
  
  return {
    batchDeductions,
    totalDeducted: quantityNeeded - remainingQuantity,
    usedMultipleBatches: batchDeductions.length > 1,
    batchExpiryInfo,
  };
};

// Check if adding quantity to cart would use multiple batches
export const wouldUseMultipleBatches = (
  medications: Medication[],
  productName: string,
  quantity: number
): boolean => {
  const result = calculateFEFODeductions(medications, productName, quantity);
  return result.usedMultipleBatches;
};

// Find all existing products by name (for import duplicate detection)
export const findExistingProductsByName = (
  medications: Medication[],
  productName: string
): Medication[] => {
  const normalizedName = productName.toLowerCase().trim();
  return medications.filter(med => 
    med.name.toLowerCase().trim() === normalizedName
  );
};
