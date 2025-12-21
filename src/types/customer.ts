export interface Customer {
  id: string;
  pharmacy_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  notes: string | null;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  pharmacy_id: string;
  customer_id: string;
  prescription_number: string;
  prescriber_name: string | null;
  prescriber_phone: string | null;
  diagnosis: string | null;
  notes: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  refill_count: number;
  max_refills: number;
  last_refill_date: string | null;
  next_refill_reminder: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  quantity: number;
  instructions: string | null;
  created_at: string;
}
