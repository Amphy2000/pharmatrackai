-- Create security definer function to check if user is staff at a pharmacy
CREATE OR REPLACE FUNCTION public.is_pharmacy_staff(check_user_id uuid, check_pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = check_user_id
    AND pharmacy_id = check_pharmacy_id
    AND is_active = true
  )
$$;

-- Create security definer function to check if user is owner of a pharmacy
CREATE OR REPLACE FUNCTION public.is_pharmacy_owner(check_user_id uuid, check_pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacies
    WHERE id = check_pharmacy_id
    AND owner_id = check_user_id
  )
$$;

-- Drop existing problematic policies on pharmacy_staff
DROP POLICY IF EXISTS "Staff can view their pharmacy members" ON public.pharmacy_staff;
DROP POLICY IF EXISTS "Owners can manage staff" ON public.pharmacy_staff;

-- Create new non-recursive policies for pharmacy_staff

-- Users can view their own staff record
CREATE POLICY "Users can view own staff record"
ON public.pharmacy_staff
FOR SELECT
USING (user_id = auth.uid());

-- Owners can manage staff (using pharmacies table directly)
CREATE POLICY "Owners can manage pharmacy staff"
ON public.pharmacy_staff
FOR ALL
USING (public.is_pharmacy_owner(auth.uid(), pharmacy_id))
WITH CHECK (public.is_pharmacy_owner(auth.uid(), pharmacy_id));

-- Users can insert their own staff record (for onboarding)
CREATE POLICY "Users can insert own staff record"
ON public.pharmacy_staff
FOR INSERT
WITH CHECK (user_id = auth.uid());