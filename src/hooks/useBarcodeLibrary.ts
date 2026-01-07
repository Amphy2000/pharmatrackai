import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface MasterBarcodeEntry {
  id: string;
  product_name: string;
  barcode: string;
  category: string | null;
  manufacturer: string | null;
}

export const useBarcodeLibrary = () => {
  const { data: barcodeLibrary = [], isLoading } = useQuery({
    queryKey: ['master-barcode-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_barcode_library')
        .select('*')
        .order('product_name');

      if (error) throw error;
      return data as MasterBarcodeEntry[];
    },
  });

  /**
   * Search for a barcode by product name using fuzzy matching
   */
  const findBarcodeByName = (productName: string): string | null => {
    if (!productName || barcodeLibrary.length === 0) return null;

    const normalizedName = productName.toLowerCase().trim();
    
    // Exact match first
    const exactMatch = barcodeLibrary.find(
      entry => entry.product_name.toLowerCase() === normalizedName
    );
    if (exactMatch) return exactMatch.barcode;

    // Contains match
    const containsMatch = barcodeLibrary.find(
      entry => entry.product_name.toLowerCase().includes(normalizedName) ||
               normalizedName.includes(entry.product_name.toLowerCase())
    );
    if (containsMatch) return containsMatch.barcode;

    // Word-based fuzzy match
    const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 2);
    if (nameWords.length === 0) return null;

    const fuzzyMatch = barcodeLibrary.find(entry => {
      const entryWords = entry.product_name.toLowerCase().split(/\s+/);
      const matchingWords = nameWords.filter(word => 
        entryWords.some(ew => ew.includes(word) || word.includes(ew))
      );
      // At least 50% of words should match
      return matchingWords.length >= Math.ceil(nameWords.length / 2);
    });

    return fuzzyMatch?.barcode || null;
  };

  /**
   * Search for product info by barcode
   */
  const findProductByBarcode = (barcode: string): MasterBarcodeEntry | null => {
    if (!barcode) return null;
    return barcodeLibrary.find(entry => entry.barcode === barcode) || null;
  };

  return {
    barcodeLibrary,
    isLoading,
    findBarcodeByName,
    findProductByBarcode,
  };
};
