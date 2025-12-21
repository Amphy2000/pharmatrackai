-- Drop the existing INSERT policy on pharmacies
DROP POLICY IF EXISTS "Authenticated users can create pharmacy" ON public.pharmacies;

-- Create a new INSERT policy that properly checks authenticated users can create pharmacies
-- The WITH CHECK ensures owner_id matches the authenticated user
CREATE POLICY "Authenticated users can create their own pharmacy"
ON public.pharmacies
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Also ensure there's a SELECT policy that allows viewing your own pharmacy as owner
DROP POLICY IF EXISTS "Owners can view their pharmacy" ON public.pharmacies;
CREATE POLICY "Owners can view their own pharmacy"
ON public.pharmacies
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Keep the existing staff-based view policy but make them both work (PERMISSIVE = OR logic)
-- The existing "Users can view their pharmacy" policy for staff should remain