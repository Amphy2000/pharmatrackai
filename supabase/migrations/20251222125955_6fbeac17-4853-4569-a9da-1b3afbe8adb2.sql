-- Create pending_transactions table for pharmacist-to-cashier workflow
CREATE TABLE public.pending_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  short_code TEXT NOT NULL,
  barcode TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'pos')),
  notes TEXT
);

-- Create unique constraint on short_code per pharmacy
CREATE UNIQUE INDEX idx_pending_transactions_short_code ON public.pending_transactions(pharmacy_id, short_code);

-- Create index for barcode lookups
CREATE INDEX idx_pending_transactions_barcode ON public.pending_transactions(barcode);

-- Enable RLS
ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view pharmacy pending transactions"
ON public.pending_transactions
FOR SELECT
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can create pending transactions"
ON public.pending_transactions
FOR INSERT
WITH CHECK (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can update pending transactions"
ON public.pending_transactions
FOR UPDATE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

-- Enable realtime for pending_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_transactions;

-- Enable realtime for sales table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;