-- Fix the medications RLS policy that exposes data with NULL pharmacy_id
DROP POLICY IF EXISTS "Staff can view pharmacy medications" ON public.medications;

CREATE POLICY "Staff can view pharmacy medications" 
ON public.medications 
FOR SELECT 
USING (pharmacy_id IN ( 
  SELECT pharmacy_staff.pharmacy_id
  FROM pharmacy_staff
  WHERE pharmacy_staff.user_id = auth.uid() 
  AND pharmacy_staff.is_active = true
));