-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  address TEXT,
  notes TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  prescription_number TEXT NOT NULL,
  prescriber_name TEXT,
  prescriber_phone TEXT,
  diagnosis TEXT,
  notes TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  refill_count INTEGER DEFAULT 0,
  max_refills INTEGER DEFAULT 0,
  last_refill_date TIMESTAMP WITH TIME ZONE,
  next_refill_reminder DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_items table (medications in each prescription)
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Staff can view pharmacy customers"
ON public.customers FOR SELECT
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can insert pharmacy customers"
ON public.customers FOR INSERT
WITH CHECK (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can update pharmacy customers"
ON public.customers FOR UPDATE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Managers can delete pharmacy customers"
ON public.customers FOR DELETE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager')
));

-- RLS policies for prescriptions
CREATE POLICY "Staff can view pharmacy prescriptions"
ON public.prescriptions FOR SELECT
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can insert pharmacy prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can update pharmacy prescriptions"
ON public.prescriptions FOR UPDATE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Managers can delete pharmacy prescriptions"
ON public.prescriptions FOR DELETE
USING (pharmacy_id IN (
  SELECT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager')
));

-- RLS policies for prescription_items
CREATE POLICY "Staff can view prescription items"
ON public.prescription_items FOR SELECT
USING (prescription_id IN (
  SELECT id FROM public.prescriptions WHERE pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
));

CREATE POLICY "Staff can insert prescription items"
ON public.prescription_items FOR INSERT
WITH CHECK (prescription_id IN (
  SELECT id FROM public.prescriptions WHERE pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
));

CREATE POLICY "Staff can update prescription items"
ON public.prescription_items FOR UPDATE
USING (prescription_id IN (
  SELECT id FROM public.prescriptions WHERE pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
));

CREATE POLICY "Managers can delete prescription items"
ON public.prescription_items FOR DELETE
USING (prescription_id IN (
  SELECT id FROM public.prescriptions WHERE pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager')
  )
));

-- Add indexes for performance
CREATE INDEX idx_customers_pharmacy ON public.customers(pharmacy_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_prescriptions_pharmacy ON public.prescriptions(pharmacy_id);
CREATE INDEX idx_prescriptions_customer ON public.prescriptions(customer_id);
CREATE INDEX idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX idx_prescription_items_prescription ON public.prescription_items(prescription_id);

-- Add trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();