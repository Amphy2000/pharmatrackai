export type ImportEntityType = 'medication' | 'customer' | 'doctor';

export interface FieldMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  isAutoMapped: boolean;
}

export interface UnmappedColumn {
  sourceColumn: string;
  sampleValues: string[];
}

export interface ImportPreviewRow {
  rowIndex: number;
  data: Record<string, any>;
  metadata: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  metadataColumnsPreserved: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ImportConfig {
  entityType: ImportEntityType;
  fields: {
    required: string[];
    optional: string[];
  };
  labels: Record<string, string>;
}

export const IMPORT_CONFIGS: Record<ImportEntityType, ImportConfig> = {
  medication: {
    entityType: 'medication',
    fields: {
      required: ['name', 'expiry_date', 'unit_price'],
      optional: [
        'category', 'batch_number', 'current_stock', 'reorder_level',
        'selling_price', 'barcode_id', 'nafdac_reg_number', 'supplier',
        'location', 'manufacturing_date'
      ],
    },
    labels: {
      name: 'Product Name',
      category: 'Category',
      batch_number: 'Batch Number',
      current_stock: 'Stock Level',
      reorder_level: 'Reorder Level',
      expiry_date: 'Expiry Date',
      manufacturing_date: 'Manufacturing Date',
      unit_price: 'Purchase Price',
      selling_price: 'Selling Price',
      barcode_id: 'Barcode',
      nafdac_reg_number: 'NAFDAC Reg No',
      supplier: 'Supplier',
      location: 'Location',
    },
  },
  customer: {
    entityType: 'customer',
    fields: {
      required: ['full_name'],
      optional: ['phone', 'email', 'date_of_birth', 'address', 'notes'],
    },
    labels: {
      full_name: 'Patient Name',
      phone: 'Phone Number',
      email: 'Email',
      date_of_birth: 'Date of Birth',
      address: 'Address',
      notes: 'Notes',
    },
  },
  doctor: {
    entityType: 'doctor',
    fields: {
      required: ['full_name'],
      optional: ['phone', 'email', 'hospital_clinic', 'specialty', 'license_number', 'address', 'notes'],
    },
    labels: {
      full_name: 'Doctor Name',
      phone: 'Phone Number',
      email: 'Email',
      hospital_clinic: 'Hospital/Clinic',
      specialty: 'Specialty',
      license_number: 'License Number',
      address: 'Address',
      notes: 'Notes',
    },
  },
};
