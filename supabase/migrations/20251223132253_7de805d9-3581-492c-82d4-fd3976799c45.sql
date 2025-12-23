-- Add prescription_images column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS prescription_images text[] DEFAULT NULL;

-- Add customer_id column to sales table for linking to patients
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) DEFAULT NULL;

-- Create index for customer lookups on sales
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);

-- Create GIN index on customers metadata for global search
CREATE INDEX IF NOT EXISTS idx_customers_metadata ON public.customers USING GIN (metadata jsonb_path_ops);

-- Create GIN index on medications metadata for global search
CREATE INDEX IF NOT EXISTS idx_medications_metadata ON public.medications USING GIN (metadata jsonb_path_ops);

-- Create GIN index on doctors metadata for global search
CREATE INDEX IF NOT EXISTS idx_doctors_metadata ON public.doctors USING GIN (metadata jsonb_path_ops);