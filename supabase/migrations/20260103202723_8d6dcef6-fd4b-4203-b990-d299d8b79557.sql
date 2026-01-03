-- Add shelf/store quantity columns to medications table
ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS shelf_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS wholesale_price numeric;

-- Migrate existing stock to shelf_quantity (as per user choice)
UPDATE public.medications
SET shelf_quantity = current_stock, store_quantity = 0
WHERE shelf_quantity = 0 AND store_quantity = 0;

-- Create pending_quick_items table for Express Sale items
CREATE TABLE public.pending_quick_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id),
  branch_id uuid REFERENCES public.branches(id),
  name text NOT NULL,
  selling_price numeric NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 1,
  sold_by uuid,
  sold_by_name text,
  sale_id uuid,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  linked_medication_id uuid REFERENCES public.medications(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on pending_quick_items
ALTER TABLE public.pending_quick_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_quick_items
CREATE POLICY "Staff can view pharmacy quick items"
ON public.pending_quick_items
FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert quick items"
ON public.pending_quick_items
FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can update quick items"
ON public.pending_quick_items
FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'::pharmacy_role));

CREATE POLICY "Managers can delete quick items"
ON public.pending_quick_items
FOR DELETE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'::pharmacy_role));

-- Create internal stock transfers table for shelf/store transfers
CREATE TABLE public.internal_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id),
  branch_id uuid REFERENCES public.branches(id),
  medication_id uuid NOT NULL REFERENCES public.medications(id),
  transfer_type text NOT NULL CHECK (transfer_type IN ('store_to_shelf', 'shelf_to_store')),
  quantity integer NOT NULL,
  performed_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on internal_transfers
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal_transfers
CREATE POLICY "Staff can view pharmacy internal transfers"
ON public.internal_transfers
FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can create internal transfers"
ON public.internal_transfers
FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Add sale_type column to sales table for retail/wholesale tracking
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS sale_type text DEFAULT 'retail' CHECK (sale_type IN ('retail', 'wholesale'));

-- Create updated_at trigger for pending_quick_items
CREATE TRIGGER update_pending_quick_items_updated_at
BEFORE UPDATE ON public.pending_quick_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();