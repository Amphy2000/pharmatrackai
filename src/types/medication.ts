export interface Medication {
  id: string;
  name: string;
  category: 'Tablet' | 'Syrup' | 'Capsule' | 'Injection' | 'Cream' | 'Drops' | 'Inhaler' | 'Powder' | 'Other';
  batch_number: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  unit_price: number;
  selling_price?: number;
  barcode_id?: string;
  pharmacy_id?: string;
  supplier?: string;
  location?: string;
  min_stock_alert?: number;
  created_at: string;
  updated_at: string;
}

export type MedicationCategory = Medication['category'];

export interface MedicationFormData {
  name: string;
  category: MedicationCategory;
  batch_number: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  unit_price: number;
  selling_price?: number;
  barcode_id?: string;
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
