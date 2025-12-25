-- Fix remaining policies that reference pharmacy_staff to prevent infinite recursion

-- Notifications policies
DROP POLICY IF EXISTS "Staff can view pharmacy notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can delete notifications" ON public.notifications;

CREATE POLICY "Staff can view pharmacy notifications"
ON public.notifications FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update notifications"
ON public.notifications FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can delete notifications"
ON public.notifications FOR DELETE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Customers policies
DROP POLICY IF EXISTS "Staff can view pharmacy customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can insert pharmacy customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update pharmacy customers" ON public.customers;
DROP POLICY IF EXISTS "Managers can delete pharmacy customers" ON public.customers;

CREATE POLICY "Staff can view pharmacy customers"
ON public.customers FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert pharmacy customers"
ON public.customers FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update pharmacy customers"
ON public.customers FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can delete pharmacy customers"
ON public.customers FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

-- Suppliers policies
DROP POLICY IF EXISTS "Staff can view pharmacy suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Staff can insert pharmacy suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Staff can update pharmacy suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can delete pharmacy suppliers" ON public.suppliers;

CREATE POLICY "Staff can view pharmacy suppliers"
ON public.suppliers FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert pharmacy suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update pharmacy suppliers"
ON public.suppliers FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can delete pharmacy suppliers"
ON public.suppliers FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

-- Doctors policies
DROP POLICY IF EXISTS "Staff can view pharmacy doctors" ON public.doctors;
DROP POLICY IF EXISTS "Staff can insert pharmacy doctors" ON public.doctors;
DROP POLICY IF EXISTS "Staff can update pharmacy doctors" ON public.doctors;
DROP POLICY IF EXISTS "Managers can delete pharmacy doctors" ON public.doctors;

CREATE POLICY "Staff can view pharmacy doctors"
ON public.doctors FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert pharmacy doctors"
ON public.doctors FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update pharmacy doctors"
ON public.doctors FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can delete pharmacy doctors"
ON public.doctors FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

-- Pending transactions policies
DROP POLICY IF EXISTS "Staff can view pharmacy pending transactions" ON public.pending_transactions;
DROP POLICY IF EXISTS "Staff can create pending transactions" ON public.pending_transactions;
DROP POLICY IF EXISTS "Staff can update pending transactions" ON public.pending_transactions;

CREATE POLICY "Staff can view pharmacy pending transactions"
ON public.pending_transactions FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can create pending transactions"
ON public.pending_transactions FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update pending transactions"
ON public.pending_transactions FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Prescriptions policies
DROP POLICY IF EXISTS "Staff can view pharmacy prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can insert pharmacy prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can update pharmacy prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Managers can delete pharmacy prescriptions" ON public.prescriptions;

CREATE POLICY "Staff can view pharmacy prescriptions"
ON public.prescriptions FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can insert pharmacy prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update pharmacy prescriptions"
ON public.prescriptions FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can delete pharmacy prescriptions"
ON public.prescriptions FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);

-- Branch inventory policies
DROP POLICY IF EXISTS "Staff can view branch inventory" ON public.branch_inventory;
DROP POLICY IF EXISTS "Staff can insert branch inventory" ON public.branch_inventory;
DROP POLICY IF EXISTS "Staff can update branch inventory" ON public.branch_inventory;

CREATE POLICY "Staff can view branch inventory"
ON public.branch_inventory FOR SELECT
USING (
  branch_id IN (
    SELECT id FROM public.branches 
    WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  )
);

CREATE POLICY "Staff can insert branch inventory"
ON public.branch_inventory FOR INSERT
WITH CHECK (
  branch_id IN (
    SELECT id FROM public.branches 
    WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  )
);

CREATE POLICY "Staff can update branch inventory"
ON public.branch_inventory FOR UPDATE
USING (
  branch_id IN (
    SELECT id FROM public.branches 
    WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  )
);

-- Reorder requests policies
DROP POLICY IF EXISTS "Staff can view pharmacy reorders" ON public.reorder_requests;
DROP POLICY IF EXISTS "Staff can create reorders" ON public.reorder_requests;
DROP POLICY IF EXISTS "Staff can update reorders" ON public.reorder_requests;
DROP POLICY IF EXISTS "Managers can delete reorders" ON public.reorder_requests;

CREATE POLICY "Staff can view pharmacy reorders"
ON public.reorder_requests FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can create reorders"
ON public.reorder_requests FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Staff can update reorders"
ON public.reorder_requests FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

CREATE POLICY "Managers can delete reorders"
ON public.reorder_requests FOR DELETE
USING (
  pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))
  AND has_pharmacy_role(auth.uid(), 'manager')
);