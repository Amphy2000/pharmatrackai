-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier_products table (products each supplier offers)
CREATE TABLE public.supplier_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  unit_price NUMERIC NOT NULL,
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  lead_time_days INTEGER DEFAULT 3,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reorder_requests table
CREATE TABLE public.reorder_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  supplier_product_id UUID REFERENCES public.supplier_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, ordered, shipped, delivered, cancelled
  requested_by UUID,
  approved_by UUID,
  notes TEXT,
  expected_delivery DATE,
  actual_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_requests ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Staff can view pharmacy suppliers"
  ON public.suppliers FOR SELECT
  USING (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Managers can insert suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can delete suppliers"
  ON public.suppliers FOR DELETE
  USING (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('owner', 'manager')
  ));

-- Supplier products policies
CREATE POLICY "Staff can view supplier products"
  ON public.supplier_products FOR SELECT
  USING (supplier_id IN (
    SELECT s.id FROM public.suppliers s
    JOIN public.pharmacy_staff ps ON ps.pharmacy_id = s.pharmacy_id
    WHERE ps.user_id = auth.uid() AND ps.is_active = true
  ));

CREATE POLICY "Managers can insert supplier products"
  ON public.supplier_products FOR INSERT
  WITH CHECK (supplier_id IN (
    SELECT s.id FROM public.suppliers s
    JOIN public.pharmacy_staff ps ON ps.pharmacy_id = s.pharmacy_id
    WHERE ps.user_id = auth.uid() AND ps.is_active = true
    AND ps.role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can update supplier products"
  ON public.supplier_products FOR UPDATE
  USING (supplier_id IN (
    SELECT s.id FROM public.suppliers s
    JOIN public.pharmacy_staff ps ON ps.pharmacy_id = s.pharmacy_id
    WHERE ps.user_id = auth.uid() AND ps.is_active = true
    AND ps.role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can delete supplier products"
  ON public.supplier_products FOR DELETE
  USING (supplier_id IN (
    SELECT s.id FROM public.suppliers s
    JOIN public.pharmacy_staff ps ON ps.pharmacy_id = s.pharmacy_id
    WHERE ps.user_id = auth.uid() AND ps.is_active = true
    AND ps.role IN ('owner', 'manager')
  ));

-- Reorder requests policies
CREATE POLICY "Staff can view pharmacy reorders"
  ON public.reorder_requests FOR SELECT
  USING (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Staff can create reorders"
  ON public.reorder_requests FOR INSERT
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Staff can update reorders"
  ON public.reorder_requests FOR UPDATE
  USING (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Managers can delete reorders"
  ON public.reorder_requests FOR DELETE
  USING (pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('owner', 'manager')
  ));

-- Add updated_at triggers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reorder_requests_updated_at
  BEFORE UPDATE ON public.reorder_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_suppliers_pharmacy_id ON public.suppliers(pharmacy_id);
CREATE INDEX idx_supplier_products_supplier_id ON public.supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_medication_id ON public.supplier_products(medication_id);
CREATE INDEX idx_reorder_requests_pharmacy_id ON public.reorder_requests(pharmacy_id);
CREATE INDEX idx_reorder_requests_supplier_id ON public.reorder_requests(supplier_id);
CREATE INDEX idx_reorder_requests_status ON public.reorder_requests(status);