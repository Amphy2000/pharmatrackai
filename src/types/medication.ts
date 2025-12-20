export interface Medication {
  id: string;
  name: string;
  category: 'Tablet' | 'Syrup' | 'Capsule' | 'Injection' | 'Cream' | 'Drops' | 'Inhaler' | 'Powder' | 'Other';
  batch_number: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  unit_price: number;
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
