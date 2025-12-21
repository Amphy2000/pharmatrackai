-- Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_main_branch BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create branch_inventory table to track stock per branch
CREATE TABLE public.branch_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, medication_id)
);

-- Create stock_transfers table
CREATE TABLE public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branches
CREATE POLICY "Staff can view pharmacy branches"
ON public.branches FOR SELECT
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Managers can insert branches"
ON public.branches FOR INSERT
WITH CHECK (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
  AND role IN ('owner', 'manager')
));

CREATE POLICY "Managers can update branches"
ON public.branches FOR UPDATE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
  AND role IN ('owner', 'manager')
));

CREATE POLICY "Managers can delete branches"
ON public.branches FOR DELETE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
  AND role IN ('owner', 'manager')
));

-- RLS Policies for branch_inventory
CREATE POLICY "Staff can view branch inventory"
ON public.branch_inventory FOR SELECT
USING (branch_id IN (
  SELECT b.id FROM branches b
  JOIN pharmacy_staff ps ON ps.pharmacy_id = b.pharmacy_id
  WHERE ps.user_id = auth.uid() AND ps.is_active = true
));

CREATE POLICY "Staff can insert branch inventory"
ON public.branch_inventory FOR INSERT
WITH CHECK (branch_id IN (
  SELECT b.id FROM branches b
  JOIN pharmacy_staff ps ON ps.pharmacy_id = b.pharmacy_id
  WHERE ps.user_id = auth.uid() AND ps.is_active = true
));

CREATE POLICY "Staff can update branch inventory"
ON public.branch_inventory FOR UPDATE
USING (branch_id IN (
  SELECT b.id FROM branches b
  JOIN pharmacy_staff ps ON ps.pharmacy_id = b.pharmacy_id
  WHERE ps.user_id = auth.uid() AND ps.is_active = true
));

-- RLS Policies for stock_transfers
CREATE POLICY "Staff can view pharmacy transfers"
ON public.stock_transfers FOR SELECT
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can create transfers"
ON public.stock_transfers FOR INSERT
WITH CHECK (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can update transfers"
ON public.stock_transfers FOR UPDATE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

-- Indexes
CREATE INDEX idx_branches_pharmacy_id ON public.branches(pharmacy_id);
CREATE INDEX idx_branch_inventory_branch_id ON public.branch_inventory(branch_id);
CREATE INDEX idx_branch_inventory_medication_id ON public.branch_inventory(medication_id);
CREATE INDEX idx_stock_transfers_pharmacy_id ON public.stock_transfers(pharmacy_id);
CREATE INDEX idx_stock_transfers_status ON public.stock_transfers(status);

-- Update triggers
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branch_inventory_updated_at
  BEFORE UPDATE ON public.branch_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at
  BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();