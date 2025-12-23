-- Create master barcode library table for smart matching
CREATE TABLE public.master_barcode_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_barcode UNIQUE (barcode)
);

-- Create index for fast product name lookups
CREATE INDEX idx_master_barcode_product_name ON public.master_barcode_library USING gin (to_tsvector('english', product_name));
CREATE INDEX idx_master_barcode_barcode ON public.master_barcode_library (barcode);

-- Enable RLS
ALTER TABLE public.master_barcode_library ENABLE ROW LEVEL SECURITY;

-- Everyone can read from master library (it's reference data)
CREATE POLICY "Anyone can view master barcode library"
ON public.master_barcode_library
FOR SELECT
USING (true);

-- Only platform admins can manage the master library
CREATE POLICY "Platform admins can manage master barcode library"
ON public.master_barcode_library
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_master_barcode_library_updated_at
BEFORE UPDATE ON public.master_barcode_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a sequence for internal codes
CREATE SEQUENCE IF NOT EXISTS internal_barcode_seq START 1000;

-- Create function to generate unique internal barcode
CREATE OR REPLACE FUNCTION public.generate_internal_barcode()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '#' || LPAD(nextval('internal_barcode_seq')::TEXT, 4, '0');
END;
$$;