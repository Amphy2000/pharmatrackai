export interface Supplier {
  id: string;
  pharmacy_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  medication_id: string | null;
  product_name: string;
  sku: string | null;
  unit_price: number;
  min_order_quantity: number;
  lead_time_days: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  suppliers?: { name: string };
  medications?: { name: string; current_stock: number; reorder_level: number };
}

export interface ReorderRequest {
  id: string;
  pharmacy_id: string;
  supplier_id: string;
  medication_id: string | null;
  supplier_product_id: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  requested_by: string | null;
  approved_by: string | null;
  notes: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: { name: string };
  medications?: { name: string };
}
