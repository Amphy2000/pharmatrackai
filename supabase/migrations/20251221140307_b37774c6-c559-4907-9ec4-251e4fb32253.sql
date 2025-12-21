-- First, let's clean up all existing policies on pharmacies and recreate them properly
DROP POLICY IF EXISTS "Authenticated users can create pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Authenticated users can create their own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Owners can update their pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Users can view their pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Owners can view their own pharmacy" ON public.pharmacies;

-- Create PERMISSIVE INSERT policy for authenticated users
CREATE POLICY "pharmacy_insert_policy"
ON public.pharmacies
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Create PERMISSIVE SELECT policy - owners can always view
CREATE POLICY "pharmacy_owner_select_policy"
ON public.pharmacies
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Create PERMISSIVE SELECT policy - staff members can view their pharmacy
CREATE POLICY "pharmacy_staff_select_policy"
ON public.pharmacies
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create PERMISSIVE UPDATE policy for owners
CREATE POLICY "pharmacy_owner_update_policy"
ON public.pharmacies
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());