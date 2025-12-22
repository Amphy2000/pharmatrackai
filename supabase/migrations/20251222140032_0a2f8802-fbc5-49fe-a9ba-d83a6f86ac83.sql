-- Add receipt_id and sold_by_name columns to sales table for unified tracking
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS receipt_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS sold_by_name TEXT;

-- Create index for faster lookups by receipt_id
CREATE INDEX IF NOT EXISTS idx_sales_receipt_id ON public.sales(receipt_id);

-- Create function to generate short receipt IDs
CREATE OR REPLACE FUNCTION public.generate_receipt_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'PH-';
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;