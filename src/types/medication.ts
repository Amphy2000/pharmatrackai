// Product type groupings
export type ProductType = 'Pharmaceuticals' | 'Health & Wellness' | 'Beauty & Personal Care' | 'General Provisions';

// Pharmaceutical categories
export type PharmaceuticalCategory = 'Tablet' | 'Syrup' | 'Capsule' | 'Injection' | 'Cream' | 'Drops' | 'Inhaler' | 'Powder';

// Health & Wellness categories
export type HealthWellnessCategory = 'Vitamins' | 'Supplements' | 'First Aid' | 'Medical Devices' | 'Baby Care' | 'Herbal Products';

// Beauty & Personal Care categories
export type BeautyCategory = 'Skincare' | 'Cosmetics' | 'Toiletries' | 'Hygiene' | 'Hair Care' | 'Oral Care';

// General Provisions categories  
export type ProvisionsCategory = 'Beverages' | 'Snacks' | 'Household' | 'Pet Care' | 'Stationery';

// All categories combined
export type MedicationCategory = 
  | PharmaceuticalCategory 
  | HealthWellnessCategory 
  | BeautyCategory 
  | ProvisionsCategory 
  | 'Other';

// Category groupings for UI
export const CATEGORY_GROUPS: Record<ProductType, MedicationCategory[]> = {
  'Pharmaceuticals': ['Tablet', 'Syrup', 'Capsule', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Powder'],
  'Health & Wellness': ['Vitamins', 'Supplements', 'First Aid', 'Medical Devices', 'Baby Care', 'Herbal Products'],
  'Beauty & Personal Care': ['Skincare', 'Cosmetics', 'Toiletries', 'Hygiene', 'Hair Care', 'Oral Care'],
  'General Provisions': ['Beverages', 'Snacks', 'Household', 'Pet Care', 'Stationery'],
};

export const ALL_CATEGORIES: MedicationCategory[] = [
  ...CATEGORY_GROUPS['Pharmaceuticals'],
  ...CATEGORY_GROUPS['Health & Wellness'],
  ...CATEGORY_GROUPS['Beauty & Personal Care'],
  ...CATEGORY_GROUPS['General Provisions'],
  'Other',
];

// Dispensing units for products
export type DispensingUnit = 'unit' | 'pack' | 'tab' | 'bottle';

export const DISPENSING_UNITS: { value: DispensingUnit; label: string }[] = [
  { value: 'unit', label: 'Unit' },
  { value: 'pack', label: 'Pack' },
  { value: 'tab', label: 'Tab' },
  { value: 'bottle', label: 'Bottle' },
];

export interface Medication {
  id: string;
  name: string;
  category: MedicationCategory;
  batch_number: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  manufacturing_date?: string;
  unit_price: number;
  selling_price?: number;
  wholesale_price?: number;
  shelf_quantity?: number;
  store_quantity?: number;
  barcode_id?: string;
  pharmacy_id?: string;
  supplier?: string;
  location?: string;
  min_stock_alert?: number;
  is_shelved?: boolean;
  is_controlled?: boolean;
  is_public?: boolean;
  is_featured?: boolean;
  featured_until?: string | null;
  nafdac_reg_number?: string;
  dispensing_unit?: DispensingUnit;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationFormData {
  name: string;
  category: MedicationCategory;
  batch_number: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  manufacturing_date?: string;
  unit_price: number;
  selling_price?: number | null;
  wholesale_price?: number | null;
  barcode_id?: string;
  is_controlled?: boolean;
  nafdac_reg_number?: string;
  dispensing_unit?: DispensingUnit;
  active_ingredients?: string[];
}

export interface DashboardMetrics {
  totalSKUs: number;
  lowStockItems: number;
  expiredItems: number;
  expiringWithin30Days: number;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'suggestion' | 'info';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CartItem {
  medication: Medication;
  quantity: number;
  isQuickItem?: boolean; // For Express Sale items
  quickItemPrice?: number; // Price for quick items
}

export interface Sale {
  id: string;
  medication_id: string;
  pharmacy_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_name?: string;
  sold_by?: string;
  sale_date: string;
  created_at: string;
}
