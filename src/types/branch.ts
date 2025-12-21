export interface Branch {
  id: string;
  pharmacy_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_main_branch: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchInventory {
  id: string;
  branch_id: string;
  medication_id: string;
  current_stock: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
  medications?: {
    name: string;
    category: string;
    unit_price: number;
    selling_price: number | null;
    expiry_date: string;
  };
  branches?: {
    name: string;
  };
}

export interface StockTransfer {
  id: string;
  pharmacy_id: string;
  from_branch_id: string;
  to_branch_id: string;
  medication_id: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  notes: string | null;
  requested_by: string | null;
  approved_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  from_branch?: { name: string };
  to_branch?: { name: string };
  medications?: { name: string };
}
