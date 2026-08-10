import { Medication } from '@/types/medication';

// Normalize string for comparison (removes spaces, special characters, lowercases)
export function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s\-_.,()\/]+/g, ' ')
    .trim();
}

// Calculate similarity score between two strings (0.0 to 1.0)
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return Math.max(0.75, ratio);
  }

  // Word token overlap
  const words1 = s1.split(' ').filter((w) => w.length > 1);
  const words2 = s2.split(' ').filter((w) => w.length > 1);

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter((w) => words2.includes(w));
  if (commonWords.length === 0) return 0;

  const score = (commonWords.length * 2) / (words1.length + words2.length);
  return score;
}

export interface InventoryDuplicateAnalysis {
  exactBatchMatch: Medication | null;
  sameNameBatches: Medication[];
  similarNameProducts: {
    name: string;
    category: string;
    totalStock: number;
    batchCount: number;
    similarityScore: number;
    sampleMedication: Medication;
  }[];
}

export function analyzeInventoryDuplicates(
  medications: Medication[],
  inputName: string,
  inputBatchNumber?: string,
  excludeId?: string
): InventoryDuplicateAnalysis {
  const normInputName = normalizeName(inputName);
  const normInputBatch = inputBatchNumber ? normalizeName(inputBatchNumber) : '';

  if (!normInputName) {
    return { exactBatchMatch: null, sameNameBatches: [], similarNameProducts: [] };
  }

  const pool = excludeId
    ? medications.filter((m) => m.id !== excludeId)
    : medications;

  // 1. Exact batch match
  let exactBatchMatch: Medication | null = null;
  if (normInputBatch) {
    exactBatchMatch =
      pool.find(
        (m) =>
          normalizeName(m.name) === normInputName &&
          normalizeName(m.batch_number) === normInputBatch
      ) || null;
  }

  // 2. Same product name batches
  const sameNameBatches = pool.filter(
    (m) => normalizeName(m.name) === normInputName
  );

  // 3. Similar product names (only if no exact name match was found)
  const similarMap = new Map<
    string,
    {
      name: string;
      category: string;
      totalStock: number;
      batchCount: number;
      similarityScore: number;
      sampleMedication: Medication;
    }
  >();

  if (sameNameBatches.length === 0 && normInputName.length >= 3) {
    pool.forEach((m) => {
      const sim = calculateSimilarity(inputName, m.name);
      if (sim >= 0.65) {
        const key = normalizeName(m.name);
        if (!similarMap.has(key)) {
          similarMap.set(key, {
            name: m.name,
            category: m.category,
            totalStock: m.current_stock,
            batchCount: 1,
            similarityScore: sim,
            sampleMedication: m,
          });
        } else {
          const item = similarMap.get(key)!;
          item.totalStock += m.current_stock;
          item.batchCount += 1;
        }
      }
    });
  }

  const similarNameProducts = Array.from(similarMap.values()).sort(
    (a, b) => b.similarityScore - a.similarityScore
  );

  return {
    exactBatchMatch,
    sameNameBatches,
    similarNameProducts,
  };
}
