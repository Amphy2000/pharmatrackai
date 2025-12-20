-- Add barcode_id column to medications table for barcode scanning
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS barcode_id TEXT;

-- Create index for faster barcode lookups
CREATE INDEX IF NOT EXISTS idx_medications_barcode ON public.medications (barcode_id);

-- Enable realtime for medications table to get stock updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;