-- Create a security definer function to safely check if user is pharmacy staff
-- This prevents infinite recursion when pharmacy_staff table has policies

CREATE OR REPLACE FUNCTION public.user_is_pharmacy_staff(_user_id uuid, _pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND pharmacy_id = _pharmacy_id
    AND is_active = true
  )
$$;

-- Create function to get user's pharmacy_id
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  AND is_active = true
$$;

-- Update medications policies to use security definer functions
DROP POLICY IF EXISTS "Staff can view pharmacy medications" ON public.medications;
DROP POLICY IF EXISTS "Staff can insert pharmacy medications" ON public.medications;
DROP POLICY IF EXISTS "Staff can update pharmacy medications" ON public.medications;
DROP POLICY IF EXISTS "Managers can delete pharmacy medications" ON public.medications;

CREATE POLICY "Staff can view pharmacy medications"
ON public.medications FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert pharmacy medications"
ON public.medications FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update pharmacy medications"
ON public.medications FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can delete pharmacy medications"
ON public.medications FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

-- Update pharmacies policies
DROP POLICY IF EXISTS "pharmacy_staff_select_policy" ON public.pharmacies;

CREATE POLICY "pharmacy_staff_select_policy"
ON public.pharmacies FOR SELECT
USING (id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Update branches policies
DROP POLICY IF EXISTS "Staff can view pharmacy branches" ON public.branches;
DROP POLICY IF EXISTS "Managers can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Managers can update branches" ON public.branches;
DROP POLICY IF EXISTS "Managers can delete branches" ON public.branches;

CREATE POLICY "Staff can view pharmacy branches"
ON public.branches FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can insert branches"
ON public.branches FOR INSERT
WITH CHECK (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

CREATE POLICY "Managers can update branches"
ON public.branches FOR UPDATE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

CREATE POLICY "Managers can delete branches"
ON public.branches FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

-- Update sales policies
DROP POLICY IF EXISTS "Staff can view pharmacy sales" ON public.sales;
DROP POLICY IF EXISTS "Staff can create sales" ON public.sales;

CREATE POLICY "Staff can view pharmacy sales"
ON public.sales FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can create sales"
ON public.sales FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Update stock_transfers policies
DROP POLICY IF EXISTS "Staff can view pharmacy transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Staff can create transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Staff can update transfers" ON public.stock_transfers;

CREATE POLICY "Staff can view pharmacy transfers"
ON public.stock_transfers FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can create transfers"
ON public.stock_transfers FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update transfers"
ON public.stock_transfers FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Update staff_shifts policies
DROP POLICY IF EXISTS "Staff can view own shifts" ON public.staff_shifts;
DROP POLICY IF EXISTS "Staff can clock in" ON public.staff_shifts;
DROP POLICY IF EXISTS "Staff can update own shifts" ON public.staff_shifts;
DROP POLICY IF EXISTS "Managers can view all shifts" ON public.staff_shifts;

CREATE POLICY "Staff can view own shifts"
ON public.staff_shifts FOR SELECT
USING (staff_id IN (
  SELECT id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can clock in"
ON public.staff_shifts FOR INSERT
WITH CHECK (staff_id IN (
  SELECT id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can update own shifts"
ON public.staff_shifts FOR UPDATE
USING (staff_id IN (
  SELECT id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Managers can view all shifts"
ON public.staff_shifts FOR SELECT
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);