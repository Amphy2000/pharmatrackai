-- Fix the pharmacy_custom_features policy that exposes data to public
-- The "Service role can manage all features" policy should only work for service role, not anon

DROP POLICY IF EXISTS "Service role can manage all features" ON public.pharmacy_custom_features;

-- Add proper staff viewing policy for pharmacy_custom_features
CREATE POLICY "Staff can view pharmacy custom features" 
ON public.pharmacy_custom_features 
FOR SELECT 
USING (pharmacy_id IN ( 
  SELECT pharmacy_staff.pharmacy_id
  FROM pharmacy_staff
  WHERE pharmacy_staff.user_id = auth.uid() 
  AND pharmacy_staff.is_active = true
));