import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface DemoMedication {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  branch_stock: number;
  reorder_level: number;
  unit_price: number;
  selling_price: number;
  expiry_date: string;
  batch_number: string;
  supplier: string;
  dispensing_unit: string;
  is_controlled: boolean;
  is_shelved: boolean;
  location: string;
  nafdac_reg_number: string;
  barcode_id: string;
}

interface DemoSale {
  id: string;
  medication_id: string;
  medication_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  sale_date: string;
  customer_name: string;
  sold_by_name: string;
}

interface DemoCustomer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  address: string;
  date_of_birth: string;
}

interface DemoSupplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  is_active: boolean;
}

interface DemoStaff {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  branch: string;
  is_active: boolean;
  total_sales: number;
  transactions: number;
}

interface DemoBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_main_branch: boolean;
  is_active: boolean;
}

interface DemoPharmacy {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  license_number: string;
  subscription_plan: string;
  subscription_status: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  demoPharmacy: DemoPharmacy;
  demoMedications: DemoMedication[];
  demoSales: DemoSale[];
  demoCustomers: DemoCustomer[];
  demoSuppliers: DemoSupplier[];
  demoStaff: DemoStaff[];
  demoBranches: DemoBranch[];
  demoMetrics: {
    totalStock: number;
    lowStock: number;
    expiringSoon: number;
    expired: number;
    todaySales: number;
    weekSales: number;
    monthSales: number;
    totalInventoryValue: number;
    protectedValue: number;
  };
  demoUser: {
    id: string;
    email: string;
    full_name: string;
  };
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};

// Check if demo mode is active from localStorage
export const isDemoModeActive = () => {
  return localStorage.getItem('pharmatrack_demo_mode') === 'true';
};

// Sample pharmacy data
const demoPharmacy: DemoPharmacy = {
  id: 'demo-pharmacy-001',
  name: 'PharmaTrack Demo Pharmacy',
  email: 'demo@pharmatrack.ng',
  phone: '+234 801 234 5678',
  address: '123 Health Street, Victoria Island, Lagos, Nigeria',
  license_number: 'PCN/REG/2024/DEMO',
  subscription_plan: 'pro',
  subscription_status: 'active',
};

// Sample branches
const demoBranches: DemoBranch[] = [
  {
    id: 'demo-branch-main',
    name: 'Main Branch (VI)',
    address: '123 Health Street, Victoria Island, Lagos',
    phone: '+234 801 234 5678',
    is_main_branch: true,
    is_active: true,
  },
  {
    id: 'demo-branch-ikeja',
    name: 'Ikeja Branch',
    address: '45 Medical Road, Ikeja GRA, Lagos',
    phone: '+234 802 345 6789',
    is_main_branch: false,
    is_active: true,
  },
  {
    id: 'demo-branch-lekki',
    name: 'Lekki Branch',
    address: '78 Wellness Avenue, Lekki Phase 1, Lagos',
    phone: '+234 803 456 7890',
    is_main_branch: false,
    is_active: true,
  },
];

// Sample medications with realistic pharmacy data
const demoMedications: DemoMedication[] = [
  {
    id: 'med-001',
    name: 'Amoxicillin 500mg Capsules',
    category: 'Antibiotics',
    current_stock: 250,
    branch_stock: 250,
    reorder_level: 50,
    unit_price: 1200,
    selling_price: 1800,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'AMX-2024-001',
    supplier: 'Emzor Pharmaceuticals',
    dispensing_unit: 'Capsule',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf A1',
    nafdac_reg_number: 'A4-1234',
    barcode_id: '8901234567890',
  },
  {
    id: 'med-002',
    name: 'Paracetamol 500mg Tablets',
    category: 'Analgesics',
    current_stock: 500,
    branch_stock: 500,
    reorder_level: 100,
    unit_price: 250,
    selling_price: 400,
    expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'PCM-2024-015',
    supplier: 'May & Baker Nigeria',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf B2',
    nafdac_reg_number: 'A4-2345',
    barcode_id: '8901234567891',
  },
  {
    id: 'med-003',
    name: 'Metformin 500mg Tablets',
    category: 'Antidiabetics',
    current_stock: 180,
    branch_stock: 180,
    reorder_level: 40,
    unit_price: 800,
    selling_price: 1200,
    expiry_date: new Date(Date.now() + 545 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'MET-2024-008',
    supplier: 'Swiss Pharma',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf C1',
    nafdac_reg_number: 'A4-3456',
    barcode_id: '8901234567892',
  },
  {
    id: 'med-004',
    name: 'Omeprazole 20mg Capsules',
    category: 'Gastrointestinal',
    current_stock: 120,
    branch_stock: 120,
    reorder_level: 30,
    unit_price: 1500,
    selling_price: 2200,
    expiry_date: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'OMP-2024-003',
    supplier: 'GSK Nigeria',
    dispensing_unit: 'Capsule',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf D3',
    nafdac_reg_number: 'A4-4567',
    barcode_id: '8901234567893',
  },
  {
    id: 'med-005',
    name: 'Lisinopril 10mg Tablets',
    category: 'Antihypertensives',
    current_stock: 90,
    branch_stock: 90,
    reorder_level: 25,
    unit_price: 2000,
    selling_price: 2800,
    expiry_date: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'LSP-2024-012',
    supplier: 'Fidson Healthcare',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf A3',
    nafdac_reg_number: 'A4-5678',
    barcode_id: '8901234567894',
  },
  {
    id: 'med-006',
    name: 'Tramadol 50mg Capsules',
    category: 'Analgesics',
    current_stock: 45,
    branch_stock: 45,
    reorder_level: 20,
    unit_price: 3500,
    selling_price: 5000,
    expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'TRM-2024-007',
    supplier: 'Neimeth Pharmaceuticals',
    dispensing_unit: 'Capsule',
    is_controlled: true,
    is_shelved: true,
    location: 'Controlled Cabinet',
    nafdac_reg_number: 'A4-6789',
    barcode_id: '8901234567895',
  },
  {
    id: 'med-007',
    name: 'Ciprofloxacin 500mg Tablets',
    category: 'Antibiotics',
    current_stock: 15,
    branch_stock: 15,
    reorder_level: 30,
    unit_price: 1800,
    selling_price: 2500,
    expiry_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'CPX-2024-019',
    supplier: 'Chi Pharmaceuticals',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf A2',
    nafdac_reg_number: 'A4-7890',
    barcode_id: '8901234567896',
  },
  {
    id: 'med-008',
    name: 'Vitamin C 1000mg Tablets',
    category: 'Vitamins',
    current_stock: 8,
    branch_stock: 8,
    reorder_level: 50,
    unit_price: 500,
    selling_price: 800,
    expiry_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'VTC-2023-045',
    supplier: 'Dana Pharmaceuticals',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf E1',
    nafdac_reg_number: 'A4-8901',
    barcode_id: '8901234567897',
  },
  {
    id: 'med-009',
    name: 'Ibuprofen 400mg Tablets',
    category: 'Analgesics',
    current_stock: 320,
    branch_stock: 320,
    reorder_level: 60,
    unit_price: 350,
    selling_price: 550,
    expiry_date: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'IBU-2024-022',
    supplier: 'Evans Pharmaceuticals',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf B1',
    nafdac_reg_number: 'A4-9012',
    barcode_id: '8901234567898',
  },
  {
    id: 'med-010',
    name: 'Amlodipine 5mg Tablets',
    category: 'Antihypertensives',
    current_stock: 150,
    branch_stock: 150,
    reorder_level: 35,
    unit_price: 1100,
    selling_price: 1600,
    expiry_date: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000).toISOString(),
    batch_number: 'AML-2024-011',
    supplier: 'Sanofi Nigeria',
    dispensing_unit: 'Tablet',
    is_controlled: false,
    is_shelved: true,
    location: 'Shelf C2',
    nafdac_reg_number: 'A4-0123',
    barcode_id: '8901234567899',
  },
];

// Generate realistic sales data for the past 30 days
const generateDemoSales = (): DemoSale[] => {
  const sales: DemoSale[] = [];
  const staffNames = ['Adaeze Okonkwo', 'Chidi Nnamdi', 'Fatima Yusuf', 'David Adeleke'];
  const customerNames = ['Walk-in Customer', 'Ngozi Okafor', 'Emeka Uche', 'Aisha Mohammed', 'Tunde Bakare'];
  const paymentMethods = ['cash', 'card', 'transfer'];
  
  for (let i = 0; i < 150; i++) {
    const medication = demoMedications[Math.floor(Math.random() * demoMedications.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const quantity = Math.floor(Math.random() * 5) + 1;
    
    sales.push({
      id: `sale-${i + 1}`,
      medication_id: medication.id,
      medication_name: medication.name,
      quantity,
      unit_price: medication.selling_price,
      total_price: medication.selling_price * quantity,
      payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      sale_date: saleDate.toISOString(),
      customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
      sold_by_name: staffNames[Math.floor(Math.random() * staffNames.length)],
    });
  }
  
  return sales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
};

// Sample customers
const demoCustomers: DemoCustomer[] = [
  {
    id: 'cust-001',
    full_name: 'Ngozi Okafor',
    email: 'ngozi.okafor@gmail.com',
    phone: '+234 802 111 2222',
    loyalty_points: 1250,
    address: '15 Marina Street, Lagos Island',
    date_of_birth: '1985-03-15',
  },
  {
    id: 'cust-002',
    full_name: 'Emeka Uche',
    email: 'emeka.uche@yahoo.com',
    phone: '+234 803 222 3333',
    loyalty_points: 890,
    address: '24 Adeniran Ogunsanya, Surulere',
    date_of_birth: '1978-07-22',
  },
  {
    id: 'cust-003',
    full_name: 'Aisha Mohammed',
    email: 'aisha.m@outlook.com',
    phone: '+234 805 333 4444',
    loyalty_points: 2100,
    address: '8 Ahmadu Bello Way, Kaduna',
    date_of_birth: '1990-11-08',
  },
  {
    id: 'cust-004',
    full_name: 'Tunde Bakare',
    email: 'tunde.b@gmail.com',
    phone: '+234 806 444 5555',
    loyalty_points: 560,
    address: '42 Awolowo Road, Ikoyi',
    date_of_birth: '1982-01-30',
  },
  {
    id: 'cust-005',
    full_name: 'Chidinma Eze',
    email: 'chidinma.e@gmail.com',
    phone: '+234 807 555 6666',
    loyalty_points: 3200,
    address: '67 Adeola Odeku, Victoria Island',
    date_of_birth: '1995-06-12',
  },
];

// Sample suppliers
const demoSuppliers: DemoSupplier[] = [
  {
    id: 'sup-001',
    name: 'Emzor Pharmaceuticals',
    contact_person: 'Dr. Stella Okoli',
    email: 'orders@emzor.com',
    phone: '+234 1 234 5678',
    address: '3/5 Town Planning Way, Ilupeju, Lagos',
    payment_terms: 'Net 30',
    is_active: true,
  },
  {
    id: 'sup-002',
    name: 'May & Baker Nigeria',
    contact_person: 'Mr. Kunle Ajayi',
    email: 'sales@maybaker.ng',
    phone: '+234 1 345 6789',
    address: '21/23 Acme Road, Ogba, Lagos',
    payment_terms: 'Net 45',
    is_active: true,
  },
  {
    id: 'sup-003',
    name: 'Fidson Healthcare',
    contact_person: 'Mrs. Amaka Nwosu',
    email: 'procurement@fidson.com',
    phone: '+234 1 456 7890',
    address: '268 Ikorodu Road, Obanikoro, Lagos',
    payment_terms: 'Net 30',
    is_active: true,
  },
  {
    id: 'sup-004',
    name: 'Swiss Pharma Nigeria',
    contact_person: 'Dr. Yusuf Abdullahi',
    email: 'orders@swisspharma.ng',
    phone: '+234 1 567 8901',
    address: '5 Sapara Street, Ikeja GRA, Lagos',
    payment_terms: 'Net 60',
    is_active: true,
  },
  {
    id: 'sup-005',
    name: 'Chi Pharmaceuticals',
    contact_person: 'Ms. Blessing Obi',
    email: 'sales@chipharma.com',
    phone: '+234 1 678 9012',
    address: '14 Industrial Avenue, Apapa, Lagos',
    payment_terms: 'Net 30',
    is_active: true,
  },
];

// Sample staff
const demoStaff: DemoStaff[] = [
  {
    id: 'staff-001',
    name: 'Dr. Adaeze Okonkwo',
    email: 'adaeze@pharmatrack.ng',
    role: 'owner',
    branch: 'Main Branch (VI)',
    is_active: true,
    total_sales: 2500000,
    transactions: 342,
  },
  {
    id: 'staff-002',
    name: 'Chidi Nnamdi',
    email: 'chidi@pharmatrack.ng',
    role: 'manager',
    branch: 'Ikeja Branch',
    is_active: true,
    total_sales: 1800000,
    transactions: 256,
  },
  {
    id: 'staff-003',
    name: 'Fatima Yusuf',
    email: 'fatima@pharmatrack.ng',
    role: 'staff',
    branch: 'Main Branch (VI)',
    is_active: true,
    total_sales: 950000,
    transactions: 128,
  },
  {
    id: 'staff-004',
    name: 'David Adeleke',
    email: 'david@pharmatrack.ng',
    role: 'staff',
    branch: 'Lekki Branch',
    is_active: true,
    total_sales: 720000,
    transactions: 98,
  },
];

const demoUser = {
  id: 'demo-user-001',
  email: 'demo@pharmatrack.ng',
  full_name: 'Demo User',
};

interface DemoProviderProps {
  children: ReactNode;
}

export const DemoProvider = ({ children }: DemoProviderProps) => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('pharmatrack_demo_mode') === 'true';
  });

  const demoSales = useMemo(() => generateDemoSales(), []);

  const demoMetrics = useMemo(() => {
    const today = new Date();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const todaySales = demoSales
      .filter(s => new Date(s.sale_date).toDateString() === today.toDateString())
      .reduce((sum, s) => sum + s.total_price, 0);

    const weekSales = demoSales
      .filter(s => new Date(s.sale_date) >= weekAgo)
      .reduce((sum, s) => sum + s.total_price, 0);

    const monthSales = demoSales
      .filter(s => new Date(s.sale_date) >= monthAgo)
      .reduce((sum, s) => sum + s.total_price, 0);

    const lowStock = demoMedications.filter(m => m.current_stock <= m.reorder_level).length;
    const expiringSoon = demoMedications.filter(m => {
      const expiryDate = new Date(m.expiry_date);
      const daysUntil = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 30;
    }).length;
    const expired = demoMedications.filter(m => new Date(m.expiry_date) < today).length;

    const totalInventoryValue = demoMedications.reduce((sum, m) => sum + (m.current_stock * m.unit_price), 0);
    const protectedValue = demoMedications
      .filter(m => {
        const expiryDate = new Date(m.expiry_date);
        const daysUntil = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntil <= 30 && m.current_stock > 0;
      })
      .reduce((sum, m) => sum + (m.current_stock * m.unit_price), 0);

    return {
      totalStock: demoMedications.reduce((sum, m) => sum + m.current_stock, 0),
      lowStock,
      expiringSoon,
      expired,
      todaySales,
      weekSales,
      monthSales,
      totalInventoryValue,
      protectedValue,
    };
  }, [demoSales]);

  const enableDemoMode = () => {
    localStorage.setItem('pharmatrack_demo_mode', 'true');
    setIsDemoMode(true);
  };

  const disableDemoMode = () => {
    localStorage.removeItem('pharmatrack_demo_mode');
    setIsDemoMode(false);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        enableDemoMode,
        disableDemoMode,
        demoPharmacy,
        demoMedications,
        demoSales,
        demoCustomers,
        demoSuppliers,
        demoStaff,
        demoBranches,
        demoMetrics,
        demoUser,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};
